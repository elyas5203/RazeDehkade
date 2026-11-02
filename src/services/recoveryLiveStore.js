'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pool, query, isMemoryDb } = require('../db/pool');
const Session = require('../models/Session');
const SessionAssistant = require('../models/SessionAssistant');

const videoRoot = path.resolve(__dirname, '..', '..', 'storage', 'emergency-selfies');
const activePhases = new Set(['WAITING_FOR_CLASS', 'MATCHING', 'RUNNING', 'PAUSED', 'RESTORING']);
const numberId = value => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const sameId = (a, b) => Number(a) === Number(b);

function videoFile(video, preferOptimized = true) {
  if (!video) return null;
  if (preferOptimized) {
    if (video.file_path) {
      const cardPath = video.file_path.replace(/\.[a-zA-Z0-9]+$/, '.card.mp4');
      try { if (fs.statSync(cardPath).isFile()) return cardPath; } catch (_) {}
    }
    if (video.id) {
      const cardNamed = path.join(videoRoot, `emergency-video-${video.id}.card.mp4`);
      try { if (fs.statSync(cardNamed).isFile()) return cardNamed; } catch (_) {}
    }
  }
  if (video.file_path) {
    const target = path.resolve(video.file_path);
    if (target.startsWith(videoRoot + path.sep)) {
      try {
        if (fs.statSync(target).isFile()) return target;
      } catch (_) {}
    }
  }
  if (video.id) {
    for (const ext of ['.mp4', '.webm']) {
      const fallback = path.join(videoRoot, `emergency-video-${video.id}${ext}`);
      try {
        if (fs.statSync(fallback).isFile()) return fallback;
      } catch (_) {}
    }
  }
  return null;
}
function available(video) {
  return Boolean(videoFile(video));
}
function publicRun(run) {
  if (!run) return { phase: 'DORMANT', revision: 0, serverTime: new Date().toISOString() };
  return {
    id: Number(run.id), sessionId: Number(run.session_id), runNo: Number(run.run_no),
    phase: run.phase, previousPhase: run.previous_phase || null,
    revision: Number(run.revision), latitude: run.class_latitude,
    longitude: run.class_longitude, mapLabel: run.map_label || '',
    startedAt: run.started_at, pausedAt: run.paused_at,
    pausedMs: Number(run.paused_ms || 0), serverTime: new Date().toISOString()
  };
}
async function active(sessionId) {
  const id = numberId(sessionId);
  if (!id) return null;
  if (isMemoryDb) return pool.tables.recovery_runs.find(run => sameId(run.session_id, id) && run.active_slot === 1) || null;
  const result = await query('SELECT * FROM recovery_runs WHERE session_id = ? AND active_slot = 1 LIMIT 1', [id]);
  return result.rows[0] || null;
}
async function latest(sessionId) {
  const id = numberId(sessionId);
  if (!id) return null;
  if (isMemoryDb) return pool.tables.recovery_runs.filter(run => sameId(run.session_id, id))
    .sort((a, b) => Number(b.run_no) - Number(a.run_no))[0] || null;
  const result = await query('SELECT * FROM recovery_runs WHERE session_id = ? ORDER BY run_no DESC LIMIT 1', [id]);
  return result.rows[0] || null;
}
async function pauseForOffline(sessionId) {
  const run = await active(sessionId);
  if (!run || !['RUNNING', 'RESTORING'].includes(run.phase)) return null;
  if (isMemoryDb) {
    run.previous_phase = run.phase;
    run.phase = 'PAUSED';
    run.paused_at = new Date();
    run.revision++;
    return run;
  }
  const changed = await query(`UPDATE recovery_runs
    SET previous_phase = phase, phase = 'PAUSED', paused_at = CURRENT_TIMESTAMP, revision = revision + 1
    WHERE id = ? AND revision = ? AND phase = ? AND active_slot = 1`,
    [run.id, run.revision, run.phase]);
  return changed.affectedRows ? active(sessionId) : null;
}
async function messagesForLatestRun(sessionId, run, messages) {
  if (!run || Number(run.run_no) <= 1 || !messages?.length) return messages;
  const cues = isMemoryDb
    ? pool.tables.recovery_cues.filter(cue => pool.tables.recovery_runs.some(item => sameId(item.id, cue.run_id) && sameId(item.session_id, sessionId)))
    : (await query(`SELECT cue.run_id, cue.message_id FROM recovery_cues cue
        JOIN recovery_runs r ON r.id = cue.run_id WHERE r.session_id = ? AND cue.message_id IS NOT NULL`, [sessionId])).rows;
  const olderMessageIds = new Set(cues.filter(cue => !sameId(cue.run_id, run.id) && cue.message_id != null)
    .map(cue => Number(cue.message_id)));
  return messages.filter(message => !olderMessageIds.has(Number(message.id)));
}
async function activate(sessionId, adminId) {
  const id = numberId(sessionId);
  if (!id) throw Object.assign(new Error('کلاس نامعتبر است.'), { status: 400 });
  if (isMemoryDb) {
    const existing = await active(id);
    if (existing) return existing;
    const session = await Session.findById(id);
    if (!session?.is_hacked) throw Object.assign(new Error('این کلاس در وضعیت نفوذ نیست.'), { status: 409 });
    const runNo = 1 + Math.max(0, ...pool.tables.recovery_runs.filter(x => sameId(x.session_id, id)).map(x => Number(x.run_no)));
    const run = { id: pool.autoIds.recovery_runs++, session_id: id, run_no: runNo, active_slot: 1,
      phase: 'WAITING_FOR_CLASS', revision: 1, class_latitude: null, class_longitude: null,
      map_label: '', activated_at: new Date(), started_at: null, paused_at: null,
      paused_ms: 0, completed_at: null, updated_by: adminId };
    pool.tables.recovery_runs.push(run);
    return run;
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [sessions] = await conn.query('SELECT id, is_hacked FROM sessions WHERE id = ? FOR UPDATE', [id]);
    if (!sessions[0]?.is_hacked) throw Object.assign(new Error('این کلاس در وضعیت نفوذ نیست.'), { status: 409 });
    const [current] = await conn.query('SELECT * FROM recovery_runs WHERE session_id = ? AND active_slot = 1 LIMIT 1', [id]);
    if (current[0]) { await conn.commit(); return current[0]; }
    const [last] = await conn.query('SELECT COALESCE(MAX(run_no), 0) AS value FROM recovery_runs WHERE session_id = ?', [id]);
    const runNo = Number(last[0].value) + 1;
    const [insert] = await conn.query('INSERT INTO recovery_runs (session_id, run_no, active_slot, phase, revision, updated_by) VALUES (?, ?, 1, \'WAITING_FOR_CLASS\', 1, ?)', [id, runNo, adminId || null]);
    const [created] = await conn.query('SELECT * FROM recovery_runs WHERE id = ?', [insert.insertId]);
    await conn.commit();
    return created[0];
  } catch (error) { await conn.rollback(); throw error; }
  finally { conn.release(); }
}
async function links(runId) {
  if (isMemoryDb) return pool.tables.recovery_video_links.filter(x => sameId(x.run_id, runId));
  const result = await query('SELECT * FROM recovery_video_links WHERE run_id = ?', [runId]);
  return result.rows;
}
async function roster(sessionId) {
  const run = await active(sessionId);
  const portraits = await SessionAssistant.findBySessionId(sessionId);
  const selected = run ? await links(run.id) : [];
  return portraits.map(item => {
    const link = selected.find(x => sameId(x.assistant_id, item.id));
    return { id: Number(item.id), name: item.student_name, photoUrl: item.file_url,
      order: Number(item.display_order), videoId: link ? Number(link.emergency_video_id) : null };
  });
}
async function candidateRows(sessionId) {
  if (isMemoryDb) {
    return pool.tables.emergency_auth_videos.filter(x => sameId(x.session_id, sessionId))
      .map(video => ({ ...video, answers_json: pool.tables.emergency_auth_submissions.find(x => x.reference_code === video.reference_code)?.answers_json || null }));
  }
  const result = await query(`SELECT v.*, s.answers_json FROM emergency_auth_videos v
    LEFT JOIN emergency_auth_submissions s ON s.reference_code = v.reference_code AND s.session_id = v.session_id
    WHERE v.session_id = ? ORDER BY v.id DESC LIMIT 1000`, [sessionId]);
  return result.rows;
}
function candidateName(value) {
  try {
    const answers = typeof value === 'string' ? JSON.parse(value) : value;
    return String(answers?.q_student_name || 'نام ثبت نشده').trim().slice(0, 190);
  } catch (_) { return 'نام ثبت نشده'; }
}
async function candidates(sessionId) {
  const rows = await candidateRows(sessionId);
  return rows.map(row => ({ id: Number(row.id), name: candidateName(row.answers_json),
    reference: row.reference_code, createdAt: row.created_at, available: available(row),
    phoneHint: String(row.phone || '').replace(/\d(?=\d{4})/g, '•') }));
}
async function candidate(sessionId, videoId) {
  const rows = await candidateRows(sessionId);
  return rows.find(row => sameId(row.id, videoId)) || null;
}
async function setLink(sessionId, assistantId, videoId, revision, adminId) {
  const id = numberId(sessionId), aid = numberId(assistantId), vid = numberId(videoId);
  const run = await active(id);
  if (!run || !['WAITING_FOR_CLASS', 'MATCHING'].includes(run.phase) || Number(revision) !== Number(run.revision))
    throw Object.assign(new Error('وضعیت کلاس تغییر کرده است؛ فهرست را تازه کنید.'), { status: 409 });
  const [portraits, video] = await Promise.all([SessionAssistant.findBySessionId(id), candidate(id, vid)]);
  if (!portraits.some(x => sameId(x.id, aid)) || !video) throw Object.assign(new Error('عکس یا ویدیو متعلق به این کلاس نیست.'), { status: 403 });
  if (!available(video)) throw Object.assign(new Error('فایل این ویدیو روی سرور موجود نیست.'), { status: 409 });
  if (isMemoryDb) {
    const prior = pool.tables.recovery_video_links.find(x => sameId(x.run_id, run.id) && sameId(x.emergency_video_id, vid) && !sameId(x.assistant_id, aid));
    if (prior) throw Object.assign(new Error('این ویدیو برای عکس دیگری ثبت شده است.'), { status: 409 });
    pool.tables.recovery_video_links = pool.tables.recovery_video_links.filter(x => !(sameId(x.run_id, run.id) && sameId(x.assistant_id, aid)));
    pool.tables.recovery_video_links.push({ run_id: run.id, session_id: id, assistant_id: aid, emergency_video_id: vid, linked_by: adminId, linked_at: new Date() });
    run.phase = 'MATCHING'; run.revision++;
    return run;
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [locked] = await conn.query('SELECT * FROM recovery_runs WHERE id = ? FOR UPDATE', [run.id]);
    if (!locked[0] || Number(locked[0].revision) !== Number(revision) || !['WAITING_FOR_CLASS', 'MATCHING'].includes(locked[0].phase))
      throw Object.assign(new Error('وضعیت کلاس تغییر کرده است؛ فهرست را تازه کنید.'), { status: 409 });
    const [prior] = await conn.query('SELECT assistant_id FROM recovery_video_links WHERE run_id = ? AND emergency_video_id = ?', [run.id, vid]);
    if (prior[0] && !sameId(prior[0].assistant_id, aid)) throw Object.assign(new Error('این ویدیو برای عکس دیگری ثبت شده است.'), { status: 409 });
    await conn.query('DELETE FROM recovery_video_links WHERE run_id = ? AND assistant_id = ?', [run.id, aid]);
    await conn.query('INSERT INTO recovery_video_links (run_id, session_id, assistant_id, emergency_video_id, linked_by) VALUES (?, ?, ?, ?, ?)', [run.id, id, aid, vid, adminId || null]);
    await conn.query("UPDATE recovery_runs SET phase = 'MATCHING', revision = revision + 1, updated_by = ? WHERE id = ?", [adminId || null, run.id]);
    const [updated] = await conn.query('SELECT * FROM recovery_runs WHERE id = ?', [run.id]);
    await conn.commit(); return updated[0];
  } catch (error) { await conn.rollback(); throw error; }
  finally { conn.release(); }
}

async function removeLink(sessionId, assistantId, revision, adminId) {
  const id = numberId(sessionId), aid = numberId(assistantId);
  const run = await active(id);
  if (!run || !['WAITING_FOR_CLASS', 'MATCHING'].includes(run.phase) || Number(revision) !== Number(run.revision))
    throw Object.assign(new Error('وضعیت کلاس تغییر کرده است؛ فهرست را تازه کنید.'), { status: 409 });
  const portraits = await SessionAssistant.findBySessionId(id);
  if (!portraits.some(x => sameId(x.id, aid))) throw Object.assign(new Error('عکس متعلق به این کلاس نیست.'), { status: 403 });
  if (isMemoryDb) {
    pool.tables.recovery_video_links = pool.tables.recovery_video_links.filter(x => !(sameId(x.run_id, run.id) && sameId(x.assistant_id, aid)));
    run.revision++;
    return run;
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [locked] = await conn.query('SELECT * FROM recovery_runs WHERE id = ? FOR UPDATE', [run.id]);
    if (!locked[0] || Number(locked[0].revision) !== Number(revision) || !['WAITING_FOR_CLASS', 'MATCHING'].includes(locked[0].phase))
      throw Object.assign(new Error('وضعیت کلاس تغییر کرده است؛ فهرست را تازه کنید.'), { status: 409 });
    await conn.query('DELETE FROM recovery_video_links WHERE run_id = ? AND assistant_id = ?', [run.id, aid]);
    await conn.query('UPDATE recovery_runs SET revision = revision + 1, updated_by = ? WHERE id = ?', [adminId || null, run.id]);
    const [updated] = await conn.query('SELECT * FROM recovery_runs WHERE id = ?', [run.id]);
    await conn.commit(); return updated[0];
  } catch (error) { await conn.rollback(); throw error; }
  finally { conn.release(); }
}

async function resetSessionForTesting(sessionId, adminId) {
  const id = numberId(sessionId);
  if (!id) throw Object.assign(new Error('شناسه کلاس نامعتبر است.'), { status: 400 });
  
  if (isMemoryDb) {
    const session = pool.tables.sessions.find(x => sameId(x.id, id));
    if (!session) throw Object.assign(new Error('کلاس یافت نشد.'), { status: 404 });
    session.is_hacked = 1;
    session.hacked_at = new Date();
    
    // Archive any active runs
    for (const run of pool.tables.recovery_runs.filter(r => sameId(r.session_id, id))) {
      run.active_slot = null;
      if (['WAITING_FOR_CLASS', 'MATCHING', 'RUNNING', 'PAUSED', 'RESTORING'].includes(run.phase)) {
        run.phase = 'ARCHIVED';
      }
    }
    
    // Get next run number
    const existing = pool.tables.recovery_runs.filter(r => sameId(r.session_id, id));
    const nextRunNo = existing.length ? Math.max(...existing.map(r => Number(r.run_no))) + 1 : 1;
    const newRun = {
      id: pool.tables.recovery_runs.length ? Math.max(...pool.tables.recovery_runs.map(r => Number(r.id))) + 1 : 1,
      session_id: id,
      run_no: nextRunNo,
      phase: 'WAITING_FOR_CLASS',
      revision: 1,
      active_slot: 1,
      created_by: adminId || null,
      created_at: new Date()
    };
    pool.tables.recovery_runs.push(newRun);
    return newRun;
  }
  
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [sessRows] = await conn.query('SELECT * FROM sessions WHERE id = ? FOR UPDATE', [id]);
    if (!sessRows[0]) throw Object.assign(new Error('کلاس یافت نشد.'), { status: 404 });
    
    await conn.query("UPDATE sessions SET is_hacked = 1, hacked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);
    await conn.query("UPDATE recovery_runs SET active_slot = NULL, phase = 'ARCHIVED', updated_at = CURRENT_TIMESTAMP WHERE session_id = ? AND active_slot = 1", [id]);
    
    const [numRows] = await conn.query('SELECT COALESCE(MAX(run_no), 0) + 1 AS next_run_no FROM recovery_runs WHERE session_id = ?', [id]);
    const nextRunNo = numRows[0].next_run_no;
    
    const [insertResult] = await conn.query(`
      INSERT INTO recovery_runs (session_id, run_no, phase, revision, active_slot, created_by)
      VALUES (?, ?, 'WAITING_FOR_CLASS', 1, 1, ?)
    `, [id, nextRunNo, adminId || null]);
    
    const [newRunRows] = await conn.query('SELECT * FROM recovery_runs WHERE id = ?', [insertResult.insertId]);
    await conn.commit();
    return newRunRows[0];
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { active, latest, pauseForOffline, messagesForLatestRun, activate, roster, candidates, candidate, setLink, removeLink, links, publicRun, videoFile, available, activePhases, resetSessionForTesting };
