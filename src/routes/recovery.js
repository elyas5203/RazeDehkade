const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { execFile } = require('child_process');
const ffprobe = require('ffprobe-static');
const ffmpeg = require('ffmpeg-static');
const { authenticateToken } = require('../middleware/auth');
const { query, pool, isMemoryDb } = require('../db/pool');
const Session = require('../models/Session');

const router = express.Router();
const mediaDir = path.resolve(__dirname, '..', '..', 'storage', 'collective-auth');
fs.mkdirSync(mediaDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, mediaDir),
    filename: (_req, file, cb) => cb(null, `${crypto.randomBytes(20).toString('hex')}${file.mimetype === 'video/mp4' ? '.mp4' : file.mimetype === 'video/quicktime' ? '.mov' : '.webm'}`)
  }),
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.mimetype))
});
const admin = user => ['admin', 'super_admin'].includes(user?.role);
const sid = req => Number(req.params.id);
const room = id => `session_${id}`;
const cleanPhone = value => String(value || '').replace(/\D/g, '');
const validSessionId = id => Number.isSafeInteger(id) && id > 0;

router.use(authenticateToken);
router.param('id', (req, res, next, value) => {
  const id = Number(value);
  if (!validSessionId(id)) return res.status(400).json({ success: false, message: 'جلسه نامعتبر است.' });
  if (!admin(req.user) && !(req.user.role === 'user' && Number(req.user.sessionId) === id)) {
    return res.status(403).json({ success: false, message: 'دسترسی به این جلسه مجاز نیست.' });
  }
  next();
});

async function snapshot(id) {
  const result = await query('SELECT * FROM session_recovery WHERE session_id = ?', [id]);
  return result.rows[0] || { session_id: id, phase: 'DORMANT', revision: 0 };
}
function publicSnapshot(row, isAdmin) {
  const data = { sessionId: row.session_id, phase: row.phase, revision: row.revision,
    authMode: row.phase === 'DORMANT' ? 'individual' : 'collective',
    latitude: row.latitude, longitude: row.longitude, mapLabel: row.map_label,
    sequenceStartedAt: row.sequence_started_at, serverTime: new Date().toISOString() };
  if (isAdmin) Object.assign(data, { previousPhase: row.previous_phase, startedAt: row.started_at, releasedAt: row.released_at, completedAt: row.completed_at });
  return data;
}
function notify(req, id, row) {
  const io = req.app.get('io');
  if (io) {
    const event = { sessionId: id, phase: row.phase, revision: row.revision, serverTime: new Date().toISOString() };
    io.to(room(id)).emit('recovery_updated', event);
    io.to('admins').emit('recovery_updated', event);
  }
}
function expected(req, row) { return Number(req.body?.expected_revision) === Number(row.revision); }
function conflict(res, row) { return res.status(409).json({ success: false, message: 'وضعیت جلسه تغییر کرده است؛ صفحه را به‌روز کنید.', state: publicSnapshot(row, true) }); }
function forbidden(res) { return res.status(403).json({ success: false, message: 'فقط مدیر می‌تواند این مرحله را کنترل کند.' }); }

router.get('/sessions/:id', async (req, res) => {
  try { res.json({ success: true, state: publicSnapshot(await snapshot(sid(req)), admin(req.user)) }); }
  catch (_) { res.status(500).json({ success: false, message: 'دریافت وضعیت ممکن نشد.' }); }
});

router.post('/sessions/:id/activate', async (req, res) => {
  if (!admin(req.user)) return forbidden(res);
  try {
    const id = sid(req), current = await snapshot(id);
    if (current.phase !== 'DORMANT') return conflict(res, current);
    if (!expected(req, current)) return conflict(res, current);
    const session = await Session.findById(id);
    if (!session || !session.is_hacked) return res.status(409).json({ success: false, message: 'ابتدا باید نفوذ این جلسه فعال باشد.' });
    await query('INSERT INTO session_recovery (session_id, phase, revision, updated_by) VALUES (?, ?, 1, ?)', [id, 'COLLECTING', req.user.id || null]);
    const row = await snapshot(id); notify(req, id, row);
    res.json({ success: true, state: publicSnapshot(row, true) });
  } catch (e) { res.status(500).json({ success: false, message: 'شروع مرحله جمعی ممکن نشد.' }); }
});

router.put('/sessions/:id/location', async (req, res) => {
  if (!admin(req.user)) return forbidden(res);
  const lat = Number(req.body.latitude), lon = Number(req.body.longitude);
  if (req.body.latitude === '' || req.body.longitude === '' || req.body.latitude == null || req.body.longitude == null ||
      !Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180)
    return res.status(400).json({ success: false, message: 'مختصات معتبر نیست.' });
  try {
    const id = sid(req), row = await snapshot(id);
    if (row.phase === 'DORMANT' || row.phase === 'RESTORED' || !expected(req, row)) return conflict(res, row);
    const result = await query(`UPDATE session_recovery SET latitude = ?, longitude = ?, map_label = ?, revision = revision + 1, updated_by = ?
      WHERE session_id = ? AND revision = ?`, [lat, lon, String(req.body.map_label || '').slice(0, 150), req.user.id || null, id, row.revision]);
    if (!result.affectedRows) return conflict(res, await snapshot(id));
    const next = await snapshot(id); notify(req, id, next);
    res.json({ success: true, state: publicSnapshot(next, true) });
  } catch (_) { res.status(500).json({ success: false, message: 'ذخیره مختصات ممکن نشد.' }); }
});

async function transition(req, res, from, to, extraSql = '', extraParams = []) {
  if (!admin(req.user)) return forbidden(res);
  try {
    const id = sid(req), row = await snapshot(id);
    if (!from.includes(row.phase) || !expected(req, row)) return conflict(res, row);
    if (to === 'READY') {
      const count = await query("SELECT COUNT(*) AS count FROM collective_submissions WHERE session_id = ? AND status = 'approved'", [id]);
      if (!Number(count.rows[0]?.count)) return res.status(409).json({ success: false, message: 'ابتدا دست‌کم یک ویدیو را تأیید کنید.' });
    }
    if (to === 'CINEMATIC' && (row.latitude == null || row.longitude == null))
      return res.status(409).json({ success: false, message: 'مختصات این کلاس را ثبت کنید.' });
    const result = await query(`UPDATE session_recovery SET phase = ?, revision = revision + 1, updated_by = ? ${extraSql}
      WHERE session_id = ? AND revision = ? AND phase = ?`, [to, req.user.id || null, ...extraParams, id, row.revision, row.phase]);
    if (!result.affectedRows) return conflict(res, await snapshot(id));
    const next = await snapshot(id); notify(req, id, next);
    res.json({ success: true, state: publicSnapshot(next, true) });
  } catch (_) { res.status(500).json({ success: false, message: 'تغییر مرحله ممکن نشد.' }); }
}
router.post('/sessions/:id/ready', (req, res) => transition(req, res, ['REVIEWING', 'COLLECTING'], 'READY'));
router.post('/sessions/:id/release', (req, res) => transition(req, res, ['READY'], 'HACKED_CHAT', ', released_at = CURRENT_TIMESTAMP'));
router.post('/sessions/:id/start', (req, res) => transition(req, res, ['HACKED_CHAT'], 'CINEMATIC', ', sequence_started_at = CURRENT_TIMESTAMP'));
router.post('/sessions/:id/pause', async (req, res) => {
  if (!admin(req.user)) return forbidden(res);
  try {
    const id = sid(req), row = await snapshot(id);
    if (!['COLLECTING', 'REVIEWING', 'READY', 'HACKED_CHAT', 'CINEMATIC'].includes(row.phase) || !expected(req, row)) return conflict(res, row);
    const result = await query("UPDATE session_recovery SET previous_phase = phase, phase = 'PAUSED', revision = revision + 1 WHERE session_id = ? AND revision = ? AND phase = ?", [id, row.revision, row.phase]);
    if (!result.affectedRows) return conflict(res, await snapshot(id));
    const next = await snapshot(id); notify(req, id, next); res.json({ success: true, state: publicSnapshot(next, true) });
  } catch (_) { res.status(500).json({ success: false, message: 'توقف جلسه ممکن نشد.' }); }
});
router.post('/sessions/:id/resume', async (req, res) => {
  if (!admin(req.user)) return forbidden(res);
  try {
    const id = sid(req), row = await snapshot(id);
    if (row.phase !== 'PAUSED' || !expected(req, row) || !['COLLECTING','REVIEWING','READY','HACKED_CHAT','CINEMATIC'].includes(row.previous_phase)) return conflict(res, row);
    const result = await query("UPDATE session_recovery SET phase = previous_phase, previous_phase = NULL, revision = revision + 1 WHERE session_id = ? AND revision = ? AND phase = 'PAUSED'", [id, row.revision]);
    if (!result.affectedRows) return conflict(res, await snapshot(id));
    const next = await snapshot(id); notify(req, id, next); res.json({ success: true, state: publicSnapshot(next, true) });
  } catch (_) { res.status(500).json({ success: false, message: 'ادامه جلسه ممکن نشد.' }); }
});

function probeDuration(filePath) {
  return new Promise((resolve, reject) => execFile(process.env.FFPROBE_PATH || ffprobe.path, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath], { timeout: 8000 }, (error, stdout) => {
    if (error) return reject(error);
    const seconds = Number(stdout.trim());
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 60.5) return reject(new Error('duration'));
    resolve(seconds);
  }));
}
function signature(file) {
  const fd = fs.openSync(file.path, 'r');
  try {
    const head = Buffer.alloc(12);
    if (fs.readSync(fd, head, 0, 12, 0) < 12) return false;
    return ['video/mp4', 'video/quicktime'].includes(file.mimetype) ? head.toString('ascii', 4, 8) === 'ftyp' : head.readUInt32BE(0) === 0x1A45DFA3;
  } finally { fs.closeSync(fd); }
}
function convertPhoneVideo(source, destination) {
  return new Promise((resolve, reject) => execFile(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', source,
    '-map', '0:v:0', '-map', '0:a:0?', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-y', destination],
  { timeout: 120000, maxBuffer: 1024 * 1024 }, error => error ? reject(error) : resolve()));
}
router.post('/sessions/:id/submissions', (req, res) => upload.single('video')(req, res, async error => {
  if (error) return res.status(400).json({ success: false, message: 'ویدیو نامعتبر یا بیش از حد بزرگ است.' });
  const file = req.file;
  let convertedPath = null;
  const fail = (status, message) => { if (file) fs.unlink(file.path, () => {}); if (convertedPath) fs.unlink(convertedPath, () => {}); return res.status(status).json({ success: false, message }); };
  if (req.user.role !== 'user') return fail(403, 'ارسال فقط از کلاس مجاز است.');
  if (!file) return fail(400, 'ویدیو انتخاب نشده است.');
  try {
    const id = sid(req), row = await snapshot(id);
    if (!['COLLECTING', 'REVIEWING'].includes(row.phase)) return fail(409, 'زمان ارسال ویدیو به پایان رسیده است.');
    const clientId = String(req.body.client_submission_id || '');
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(clientId) || !signature(file)) return fail(400, 'ویدیوی ارسالی معتبر نیست.');
    const session = await Session.findById(id);
    const phone = cleanPhone(session?.teacher_phone);
    if (!/^0?9\d{9}$/.test(phone)) return fail(409, 'شماره کلاس ثبت نشده است.');
    const duration = await probeDuration(file.path);
    if (file.mimetype === 'video/quicktime') {
      convertedPath = path.join(mediaDir, `${crypto.randomBytes(20).toString('hex')}.mp4`);
      await convertPhoneVideo(file.path, convertedPath);
      const output = await fs.promises.stat(convertedPath);
      if (!output.isFile() || !output.size) throw new Error('conversion');
      fs.unlink(file.path, () => {});
      file.path = convertedPath; file.mimetype = 'video/mp4'; file.size = output.size;
      convertedPath = null;
    }
    const result = await query(`INSERT INTO collective_submissions
      (session_id, phone_normalized, client_submission_id, file_path, mime_type, file_size, duration_seconds)
      VALUES (?, ?, ?, ?, ?, ?, ?)`, [id, phone, clientId, file.path, file.mimetype, file.size, duration]);
    if (row.phase === 'COLLECTING') {
      await query("UPDATE session_recovery SET phase = 'REVIEWING', revision = revision + 1 WHERE session_id = ? AND phase = 'COLLECTING'", [id]);
    } else {
      await query('UPDATE session_recovery SET revision = revision + 1 WHERE session_id = ?', [id]);
    }
    const updatedSnapshot = await snapshot(id);
    notify(req, id, updatedSnapshot);
    const io = req.app.get('io');
    if (io) {
      const submissionEvent = {
        sessionId: id,
        submissionId: result.insertId,
        phone: phone,
        duration: duration,
        status: 'pending',
        serverTime: new Date().toISOString()
      };
      io.to('admins').emit('collective_submission_received', submissionEvent);
      io.to(room(id)).emit('collective_submission_received', submissionEvent);
    }
    res.status(201).json({ success: true, id: result.insertId });
  } catch (e) { return fail(e.code === 'ER_DUP_ENTRY' ? 409 : 400, e.code === 'ER_DUP_ENTRY' ? 'این ویدیو قبلاً ارسال شده است.' : 'بررسی ویدیو ممکن نشد؛ دوباره تلاش کنید.'); }
}));

router.get('/sessions/:id/submissions', async (req, res) => {
  try {
    const isAdmin = admin(req.user), id = sid(req);
    const result = await query(`SELECT id, session_id, phone_normalized, mime_type, file_size, duration_seconds,
      status, telegram_status, created_at FROM collective_submissions WHERE session_id = ? ${isAdmin ? '' : "AND status = 'approved'"} ORDER BY id ASC`, [id]);
    res.json({ success: true, items: result.rows.map(x => isAdmin ? x : { id: x.id, status: x.status, created_at: x.created_at }) });
  } catch (_) { res.status(500).json({ success: false, message: 'دریافت ویدیوها ممکن نشد.' }); }
});

router.post('/sessions/:id/submissions/:mediaId/decision', async (req, res) => {
  if (!admin(req.user)) return forbidden(res);
  const status = req.body.status;
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ success: false, message: 'تصمیم نامعتبر است.' });
  try {
    const id = sid(req), row = await snapshot(id);
    if (!['COLLECTING', 'REVIEWING', 'READY'].includes(row.phase)) return conflict(res, row);
    const result = await query(`UPDATE collective_submissions SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP
      WHERE id = ? AND session_id = ? AND status = 'pending'`, [status, req.user.id || null, Number(req.params.mediaId), id]);
    if (!result.affectedRows) return res.status(409).json({ success: false, message: 'این ویدیو قبلاً بررسی شده است.' });
    await query('UPDATE session_recovery SET revision = revision + 1 WHERE session_id = ?', [id]);
    notify(req, id, await snapshot(id));
    res.json({ success: true });
  } catch (_) { res.status(500).json({ success: false, message: 'ثبت تصمیم ممکن نشد.' }); }
});

router.get('/sessions/:id/submissions/:mediaId/media', async (req, res) => {
  try {
    const id = sid(req);
    const result = await query('SELECT file_path, mime_type, file_size, status FROM collective_submissions WHERE id = ? AND session_id = ?', [Number(req.params.mediaId), id]);
    const item = result.rows[0];
    if (!item || (!admin(req.user) && item.status !== 'approved')) return res.status(404).end();
    const target = path.resolve(item.file_path);
    if (!target.startsWith(mediaDir + path.sep)) return res.status(404).end();
    const stat = await fs.promises.stat(target);
    res.type(item.mime_type);
    res.set('Cache-Control', 'private, no-store');
    res.set('Accept-Ranges', 'bytes');
    const range = req.headers.range;
    if (!range) { res.set('Content-Length', stat.size); return fs.createReadStream(target).pipe(res); }
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (!match) return res.status(416).end();
    const start = Number(match[1]), end = match[2] ? Number(match[2]) : stat.size - 1;
    if (start > end || end >= stat.size) return res.status(416).end();
    res.status(206).set({ 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1 });
    fs.createReadStream(target, { start, end }).pipe(res);
  } catch (_) { res.status(404).end(); }
});

router.post('/sessions/:id/complete', async (req, res) => {
  if (req.user.role !== 'user') return res.status(403).json({ success: false });
  try {
    const id = sid(req), row = await snapshot(id);
    if (row.phase !== 'CINEMATIC') return conflict(res, row);
    const elapsed = Date.now() - new Date(row.sequence_started_at).getTime();
    if (!Number.isFinite(elapsed) || elapsed < 45000) return res.status(409).json({ success: false, message: 'سکانس هنوز تمام نشده است.' });
    if (isMemoryDb) {
      const result = await query("UPDATE session_recovery SET phase = 'RESTORED', revision = revision + 1, completed_at = CURRENT_TIMESTAMP WHERE session_id = ? AND phase = 'CINEMATIC' AND revision = ?", [id, row.revision]);
      if (!result.affectedRows) return conflict(res, await snapshot(id));
      await Session.setHackState(id, false);
    } else {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [result] = await conn.query("UPDATE session_recovery SET phase = 'RESTORED', revision = revision + 1, completed_at = CURRENT_TIMESTAMP WHERE session_id = ? AND phase = 'CINEMATIC' AND revision = ?", [id, row.revision]);
        if (!result.affectedRows) { await conn.rollback(); return conflict(res, await snapshot(id)); }
        await conn.query('UPDATE sessions SET is_hacked = 0, hacked_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
        await conn.commit();
      } catch (error) { await conn.rollback(); throw error; }
      finally { conn.release(); }
    }
    const next = await snapshot(id); notify(req, id, next);
    req.app.get('io')?.to(room(id)).emit('hack_cleared', { sessionId: id, isHacked: false });
    res.json({ success: true, state: publicSnapshot(next, false) });
  } catch (_) { res.status(500).json({ success: false, message: 'پایان سکانس ثبت نشد.' }); }
});

module.exports = router;
