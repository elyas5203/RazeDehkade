'use strict';

const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { pool, query, isMemoryDb } = require('../db/pool');
const store = require('../services/recoveryLiveStore');
const Message = require('../models/Message');

const router = express.Router();
const mediaManifest = require('../../public/assets/recovery/manifest.json');
const filmDurationSeconds = mediaManifest.segments.reduce((sum, clip) => sum + Number(clip.durationSeconds || 0), 0);
const filmEndSeconds = Number(mediaManifest.preFilmSeconds) + filmDurationSeconds;
const totalDurationSeconds = filmEndSeconds + Number(mediaManifest.restorationSeconds);
const admin = user => ['admin', 'super_admin'].includes(user?.role);
const validId = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;
const mediaToken = (sessionId, runId, videoId, issuer = 'student') => jwt.sign({ role: 'recovery_media', sessionId, runId, videoId, issuer }, JWT_SECRET, { expiresIn: '12h' });
const fail = (res, error) => {
  console.error('[RECOVERY_LIVE_ERROR]', error);
  res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'عملیات بازیابی انجام نشد.' });
};

router.use((req, res, next) => {
  if (req.path.includes('/media') && req.query.ticket) {
    try { req.user = jwt.verify(String(req.query.ticket), JWT_SECRET); return next(); }
    catch (_) { return res.status(403).end(); }
  }
  authenticateToken(req, res, next);
});
router.param('id', async (req, res, next, value) => {
  if (!validId(value)) return res.status(400).json({ success: false, message: 'کلاس نامعتبر است.' });
  if (!admin(req.user) && Number(req.user?.sessionId) !== Number(value)) return res.status(403).json({ success: false, message: 'دسترسی به این کلاس مجاز نیست.' });
  next();
});
const sid = req => Number(req.params.id);
function notify(req, run) {
  const io = req.app.get('io');
  if (!io) return;
  const event = { sessionId: Number(run.session_id), runId: Number(run.id), revision: Number(run.revision), phase: run.phase };
  io.to(`session_${run.session_id}`).emit('recovery_live_updated', event);
  io.to('admins').emit('recovery_live_updated', event);
}
async function updateRun(run, revision, allowed, updateSql, params, memoryUpdate) {
  if (!run || !allowed.includes(run.phase) || Number(revision) !== Number(run.revision))
    throw Object.assign(new Error('وضعیت کلاس تغییر کرده است؛ صفحه را تازه کنید.'), { status: 409 });
  if (isMemoryDb) { memoryUpdate(run); run.revision++; return run; }
  const result = await query(`UPDATE recovery_runs SET ${updateSql}, revision = revision + 1 WHERE id = ? AND revision = ? AND phase = ?`, [...params, run.id, revision, run.phase]);
  if (!result.affectedRows) throw Object.assign(new Error('وضعیت کلاس تغییر کرده است؛ صفحه را تازه کنید.'), { status: 409 });
  return store.active(run.session_id);
}

router.get('/sessions/:id', async (req, res) => {
  try { res.json({ success: true, state: { ...store.publicRun(await store.active(sid(req))),
    plannedDurationSeconds: totalDurationSeconds, filmEndSeconds, mediaStatus: mediaManifest.status } }); }
  catch (error) { fail(res, error); }
});
router.post('/sessions/:id/activate', async (req, res) => {
  if (!admin(req.user)) return res.status(403).json({ success: false, message: 'فقط مدیر می‌تواند این مرحله را فعال کند.' });
  try { const run = await store.activate(sid(req), req.user.id); notify(req, run); res.json({ success: true, state: store.publicRun(run) }); }
  catch (error) { fail(res, error); }
});
router.get('/sessions/:id/roster', async (req, res) => {
  try {
    const run = await store.active(sid(req));
    const portraits = await store.roster(sid(req));
    const items = portraits.map(item => ({ ...item,
      mediaUrl: item.videoId && run ? `/api/recovery-live/sessions/${sid(req)}/candidates/${item.videoId}/media?ticket=${encodeURIComponent(mediaToken(sid(req), run.id, item.videoId))}` : null }));
    res.json({ success: true, runId: run?.id || null, items });
  } catch (error) { fail(res, error); }
});
router.get('/sessions/:id/candidates', async (req, res) => {
  if (!admin(req.user)) return res.status(403).end();
  try {
    const run = await store.active(sid(req));
    const items = (await store.candidates(sid(req))).map(item => ({ ...item,
      mediaUrl: item.available && run ? `/api/recovery-live/sessions/${sid(req)}/candidates/${item.id}/media?ticket=${encodeURIComponent(mediaToken(sid(req), run.id, item.id, 'admin'))}` : null }));
    res.json({ success: true, items });
  } catch (error) { fail(res, error); }
});
router.put('/sessions/:id/links/:assistantId', async (req, res) => {
  if (!admin(req.user)) return res.status(403).end();
  try {
    const run = await store.setLink(sid(req), req.params.assistantId, req.body.videoId, req.body.expected_revision, req.user.id);
    notify(req, run);
    res.json({ success: true, state: store.publicRun(run) });
  } catch (error) { fail(res, error); }
});
router.delete('/sessions/:id/links/:assistantId', async (req, res) => {
  if (!admin(req.user)) return res.status(403).end();
  try {
    const run = await store.removeLink(sid(req), req.params.assistantId, req.body.expected_revision, req.user.id);
    notify(req, run);
    res.json({ success: true, state: store.publicRun(run) });
  } catch (error) { fail(res, error); }
});
router.put('/sessions/:id/location', async (req, res) => {
  if (!admin(req.user)) return res.status(403).end();
  const lat = Number(req.body.latitude), lon = Number(req.body.longitude);
  if (req.body.latitude == null || req.body.longitude == null || req.body.latitude === '' || req.body.longitude === '' ||
    !Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180)
    return res.status(400).json({ success: false, message: 'مختصات معتبر نیست.' });
  try {
    const run = await store.active(sid(req));
    const next = await updateRun(run, req.body.expected_revision, ['WAITING_FOR_CLASS', 'MATCHING'],
      'class_latitude = ?, class_longitude = ?, map_label = ?, updated_by = ?',
      [lat, lon, String(req.body.mapLabel || '').slice(0, 150), req.user.id || null],
      row => { row.class_latitude = lat; row.class_longitude = lon; row.map_label = String(req.body.mapLabel || '').slice(0, 150); });
    notify(req, next); res.json({ success: true, state: store.publicRun(next) });
  } catch (error) { fail(res, error); }
});
router.post('/sessions/:id/start', async (req, res) => {
  if (!admin(req.user)) return res.status(403).end();
  try {
    const run = await store.active(sid(req));
    if (!run || !['WAITING_FOR_CLASS', 'MATCHING'].includes(run.phase) || Number(req.body.expected_revision) !== Number(run.revision))
      throw Object.assign(new Error('وضعیت کلاس تغییر کرده است؛ صفحه را تازه کنید.'), { status: 409 });
    if (run.class_latitude == null || run.class_longitude == null) throw Object.assign(new Error('مختصات محل کلاس را ثبت کنید.'), { status: 409 });
    for (const clip of mediaManifest.segments) {
      const relative = String(clip.src || '').split(/[?#]/, 1)[0].replace(/^\/+/, '');
      const target = path.resolve(__dirname, '..', '..', 'public', relative);
      if (!target.startsWith(path.resolve(__dirname, '..', '..', 'public', 'assets', 'recovery') + path.sep) || !fs.existsSync(target))
        throw Object.assign(new Error('فیلم داستانی هنوز برای پخش آماده نیست.'), { status: 409 });
    }
    const selected = await store.links(run.id);
    if (!selected.length) throw Object.assign(new Error('دست‌کم یک ویدیو را به عکس وصل کنید.'), { status: 409 });
    for (const link of selected) if (!store.available(await store.candidate(sid(req), link.emergency_video_id)))
      throw Object.assign(new Error('یکی از ویدیوهای انتخاب‌شده در دسترس نیست.'), { status: 409 });
    if (req.app.get('io')?.isSessionOnline && !req.app.get('io').isSessionOnline(sid(req)))
      throw Object.assign(new Error('لپ‌تاپ کلاس هنوز به جلسه وصل نشده است.'), { status: 409 });
    const next = await updateRun(run, req.body.expected_revision, ['WAITING_FOR_CLASS', 'MATCHING'],
      "phase = 'RUNNING', started_at = CURRENT_TIMESTAMP, updated_by = ?", [req.user.id || null],
      row => { row.phase = 'RUNNING'; row.started_at = new Date(); });
    notify(req, next); res.json({ success: true, state: store.publicRun(next) });
  } catch (error) { fail(res, error); }
});
router.post('/sessions/:id/pause', async (req, res) => {
  if (!admin(req.user)) return res.status(403).end();
  try {
    const run = await store.active(sid(req));
    const next = await updateRun(run, req.body.expected_revision, ['WAITING_FOR_CLASS', 'MATCHING', 'RUNNING', 'RESTORING'],
      "previous_phase = phase, phase = 'PAUSED', paused_at = CURRENT_TIMESTAMP", [],
      row => { row.previous_phase = row.phase; row.phase = 'PAUSED'; row.paused_at = new Date(); });
    notify(req, next); res.json({ success: true, state: store.publicRun(next) });
  } catch (error) { fail(res, error); }
});
router.post('/sessions/:id/resume', async (req, res) => {
  if (!admin(req.user)) return res.status(403).end();
  try {
    const run = await store.active(sid(req));
    if (!run?.previous_phase) throw Object.assign(new Error('مرحله قابل ادامه نیست.'), { status: 409 });
    if (['RUNNING', 'RESTORING'].includes(run.previous_phase) && req.app.get('io')?.isSessionOnline && !req.app.get('io').isSessionOnline(sid(req)))
      throw Object.assign(new Error('ابتدا لپ‌تاپ کلاس را دوباره به جلسه وصل کنید.'), { status: 409 });
    const next = await updateRun(run, req.body.expected_revision, ['PAUSED'],
      'phase = previous_phase, previous_phase = NULL, paused_ms = paused_ms + TIMESTAMPDIFF(MICROSECOND, paused_at, CURRENT_TIMESTAMP) DIV 1000, paused_at = NULL', [],
      row => { row.paused_ms += Date.now() - new Date(row.paused_at).getTime(); row.phase = row.previous_phase; row.previous_phase = null; row.paused_at = null; });
    notify(req, next); res.json({ success: true, state: store.publicRun(next) });
  } catch (error) { fail(res, error); }
});
function getManifest() {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../public/assets/recovery/manifest.json'), 'utf8'));
  } catch (_) {
    return mediaManifest;
  }
}

function getCueConfig(key) {
  const m = getManifest();
  const filmDuration = (m.segments || []).reduce((n, c) => n + Number(c.durationSeconds || 0), 0);
  const filmEnd = Number(m.preFilmSeconds) + filmDuration;
  const cues = {
    mazdak1: { at: Number(m.cueSeconds?.mazdak1 ?? 12), sender: 'hacker', text: 'شما خیلی پرو هستین فکر میکردم دیگه این پرونده لعنتی رو ول میکنید و دیگه برنمیگردین' },
    mazdak2: { at: Number(m.cueSeconds?.mazdak2 ?? 19), sender: 'hacker', text: 'بهتر که برگشتین، حالا خودتون میتونین شاهد این باشین که پرونده ای که تا اینجا اومدین جلو رو میخوام چطوری نابود بکنم' },
    mazdak3: { at: Number(m.cueSeconds?.mazdak3 ?? 26), sender: 'hacker', text: 'بعد از اینکه این پرونده لعنتی رو نابود کردم برای همیشه این جواهر از یاد ها پاک میشه و به هدف اصلیم میرسم' },
    mazdak4: { at: Number(m.cueSeconds?.mazdak4 ?? 34), sender: 'hacker', text: 'خوبه 96 درصد رفته جلو و تا چند لحظه دیگه به خواسته ام میرسم' },
    mazdak5: { at: Number(m.cueSeconds?.mazdak5 ?? 42), sender: 'hacker', text: 'و از دست شما هیچ کاری برنمیاد' },
    bot1: { at: filmEnd, sender: 'system', text: 'بات امنیتی سایت: ارتباط متخاصم به صورت کامل از بین رفت و اطلاعات درحال بازیابی هست' },
    bot2: { at: filmEnd + 8, sender: 'system', text: 'بات امنیتی سایت: ارتباط امن برقرار شد' }
  };
  return cues[key] || null;
}

router.post('/sessions/:id/cues/:cueKey', async (req, res) => {
  try {
    const id = sid(req), run = await store.active(id), key = req.params.cueKey, cue = getCueConfig(key);
    if (!cue || !run || !['RUNNING', 'RESTORING'].includes(run.phase)) return res.status(409).json({ success: false, message: 'این پیام در مرحله فعلی مجاز نیست.' });
    const elapsed = (Date.now() - new Date(run.started_at).getTime() - Number(run.paused_ms || 0)) / 1000;
    if (elapsed < cue.at - 2) return res.status(409).json({ success: false, message: 'زمان این پیام هنوز نرسیده است.' });
    let message;
    if (isMemoryDb) {
      if (pool.tables.recovery_cues.some(x => Number(x.run_id) === Number(run.id) && x.cue_key === key)) {
        const existingCue = pool.tables.recovery_cues.find(x => Number(x.run_id) === Number(run.id) && x.cue_key === key);
        const existingMsg = existingCue?.message_id ? pool.tables.messages.find(m => m.id == existingCue.message_id) : null;
        return res.json({ success: true, repeated: true, message: existingMsg });
      }
      const cueRecord = { run_id: run.id, cue_key: key, fired_at: new Date(), message_id: null };
      pool.tables.recovery_cues.push(cueRecord);
      message = await Message.create({ session_id: id, sender_type: cue.sender, content: cue.text });
      cueRecord.message_id = message.id;
    } else {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [insert] = await conn.query('INSERT IGNORE INTO recovery_cues (run_id, cue_key) VALUES (?, ?)', [run.id, key]);
        if (!insert.affectedRows) {
          const [existingRows] = await conn.query('SELECT m.* FROM recovery_cues rc JOIN messages m ON m.id = rc.message_id WHERE rc.run_id = ? AND rc.cue_key = ?', [run.id, key]);
          await conn.commit();
          return res.json({ success: true, repeated: true, message: existingRows[0] || null });
        }
        const [created] = await conn.query('INSERT INTO messages (session_id, sender_type, sender_id, content, message_type, is_read) VALUES (?, ?, NULL, ?, ?, 0)', [id, cue.sender, cue.text, 'text']);
        await conn.query('UPDATE recovery_cues SET message_id = ? WHERE run_id = ? AND cue_key = ?', [created.insertId, run.id, key]);
        await conn.commit();
        message = { id: created.insertId, session_id: id, sender_type: cue.sender, sender_id: null, content: cue.text, message_type: 'text', created_at: new Date() };
      } catch (error) { await conn.rollback(); throw error; }
      finally { conn.release(); }
    }
    const io = req.app.get('io');
    if (io) {
      io.to(`session_${id}`).emit('new_message', message);
      io.to('admins').emit('new_message', message);
      io.to('admins').emit('session_updated', { sessionId: id, lastMessage: message });
    }
    res.json({ success: true, message });
  } catch (error) { fail(res, error); }
});
router.post('/sessions/:id/complete', async (req, res) => {
  try {
    const id = sid(req), run = await store.active(id);
    if (!run || run.phase !== 'RUNNING') return res.status(409).json({ success: false, message: 'سکانس در حال اجرا نیست.' });
    const m = getManifest();
    const filmDuration = (m.segments || []).reduce((sum, clip) => sum + Number(clip.durationSeconds || 0), 0);
    const filmEnd = Number(m.preFilmSeconds) + filmDuration;
    const totalDuration = filmEnd + Number(m.restorationSeconds || 20);
    const elapsed = (Date.now() - new Date(run.started_at).getTime() - Number(run.paused_ms || 0)) / 1000;
    if (!Number.isFinite(elapsed) || elapsed < totalDuration - 2) return res.status(409).json({ success: false, message: 'سکانس هنوز کامل نشده است.' });
    const finalCue = isMemoryDb
      ? pool.tables.recovery_cues.some(x => Number(x.run_id) === Number(run.id) && x.cue_key === 'bot2')
      : (await query('SELECT cue_key FROM recovery_cues WHERE run_id = ? AND cue_key = ?', [run.id, 'bot2'])).rows.length > 0;
    if (!finalCue) return res.status(409).json({ success: false, message: 'مرحله ارتباط امن هنوز ثبت نشده است.' });
    if (isMemoryDb) {
      run.phase = 'RESTORED'; run.active_slot = null; run.completed_at = new Date(); run.revision++;
      const session = pool.tables.sessions.find(x => Number(x.id) === id); if (session) session.is_hacked = 0;
    } else {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [changed] = await conn.query("UPDATE recovery_runs SET phase = 'RESTORED', active_slot = NULL, completed_at = CURRENT_TIMESTAMP, revision = revision + 1 WHERE id = ? AND revision = ? AND phase = 'RUNNING'", [run.id, run.revision]);
        if (!changed.affectedRows) throw Object.assign(new Error('وضعیت کلاس تغییر کرده است.'), { status: 409 });
        await conn.query('UPDATE sessions SET is_hacked = 0, hacked_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
        await conn.commit();
      } catch (error) { await conn.rollback(); throw error; }
      finally { conn.release(); }
    }
    req.app.get('io')?.to(`session_${id}`).emit('hack_cleared', { sessionId: id, isHacked: false });
    req.app.get('io')?.to('admins').emit('recovery_live_updated', { sessionId: id, phase: 'RESTORED' });
    res.json({ success: true });
  } catch (error) { fail(res, error); }
});
router.post('/sessions/:id/reset', async (req, res) => {
  if (!admin(req.user)) return res.status(403).json({ success: false, message: 'فقط مدیر مجاز به ریست کردن سناریو است.' });
  try {
    const id = sid(req);
    const newRun = await store.resetSessionForTesting(id, req.user.id);
    const io = req.app.get('io');
    if (io) {
      io.to(`session_${id}`).emit('recovery:reset', { sessionId: id, runId: Number(newRun.id), phase: newRun.phase });
      io.to(`session_${id}`).emit('hack_status_changed', { sessionId: id, isHacked: true });
      io.to('admins').emit('recovery_live_updated', { sessionId: id, runId: Number(newRun.id), phase: newRun.phase });
    }
    res.json({ success: true, message: 'کلاس برای آزمون مجدد با موفقیت ریست شد.', run: store.publicRun(newRun) });
  } catch (error) {
    fail(res, error);
  }
});

const mediaFileCache = new Map();
function mediaMime(target) {
  const handle = fs.openSync(target, 'r');
  try {
    const signature = Buffer.alloc(12);
    fs.readSync(handle, signature, 0, signature.length, 0);
    if (signature.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return 'video/webm';
    return 'video/mp4';
  } finally { fs.closeSync(handle); }
}

router.get('/sessions/:id/candidates/:videoId/media', async (req, res) => {
  try {
    const sessionId = sid(req), videoId = Number(req.params.videoId);
    if (!validId(videoId)) return res.status(404).end();

    const run = await store.active(sessionId);
    if (!run) return res.status(404).end();
    const ticket = req.user.role === 'recovery_media';
    if (ticket && (Number(req.user.sessionId) !== sessionId || Number(req.user.runId) !== Number(run.id) || Number(req.user.videoId) !== videoId)) {
      return res.status(403).end();
    }
    const isLinked = (await store.links(run.id)).some(x => Number(x.emergency_video_id) === videoId);
    if (!admin(req.user) && !isLinked && !(ticket && req.user.issuer === 'admin')) return res.status(403).end();

    const cacheKey = `${sessionId}:${videoId}`;
    let cached = mediaFileCache.get(cacheKey);

    if (!cached || Date.now() - cached.ts > 300000 || !fs.existsSync(cached.target)) {
      const video = await store.candidate(sessionId, videoId);
      const target = store.videoFile(video);
      if (!target || !fs.existsSync(target)) return res.status(404).end();

      cached = {
        target,
        mime: mediaMime(target),
        ts: Date.now()
      };
      mediaFileCache.set(cacheKey, cached);
    }

    res.set({
      'Cache-Control': 'public, max-age=86400',
      'Accept-Ranges': 'bytes'
    });

    res.sendFile(cached.target, {
      maxAge: '1d',
      acceptRanges: true,
      headers: {
        'Content-Type': cached.mime,
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (_) {
    res.status(404).end();
  }
});

module.exports = router;
