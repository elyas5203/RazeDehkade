const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { execFile } = require('child_process');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { query } = require('../db/pool');
const Session = require('../models/Session');

const router = express.Router();
const privateVideoDir = path.resolve(__dirname, '..', '..', 'storage', 'emergency-selfies');
fs.mkdirSync(privateVideoDir, { recursive: true });
const videoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, privateVideoDir),
    filename: (_req, file, cb) => {
      const ext = file.mimetype === 'video/mp4' ? '.mp4' : '.webm';
      cb(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`);
    }
  }),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, ['video/webm', 'video/mp4'].includes(file.mimetype))
});
const questionIds = new Set([
  'q_shoe_rotary', 'q_terrorist_newspaper', 'q_hajj', 'q_padari',
  'q_invest_2026', 'q_oil_painting', 'q_letter_translators',
  'q_migration_reason', 'q_gem_feature', 'q_police_shoe_store',
  'q_last_village_city', 'q_precious_gem'
]);

const normalizePhone = value => String(value || '').replace(/[^0-9]/g, '');
const requireStudent = (req, res, next) => {
  if (req.user?.role !== 'user' || !Number.isInteger(Number(req.user.sessionId))) {
    return res.status(403).json({ success: false, message: 'دسترسی این بخش برای شما فعال نیست.' });
  }
  next();
};

function validVideoSignature(file) {
  const fd = fs.openSync(file.path, 'r');
  try {
    const head = Buffer.alloc(12);
    const count = fs.readSync(fd, head, 0, head.length, 0);
    if (count < 12) return false;
    if (file.mimetype === 'video/webm') return head.readUInt32BE(0) === 0x1A45DFA3;
    if (file.mimetype === 'video/mp4') return head.toString('ascii', 4, 8) === 'ftyp';
    return false;
  } finally { fs.closeSync(fd); }
}

function videoDurationSeconds(filePath) {
  if (process.env.NODE_ENV === 'test') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    execFile('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', filePath], { timeout: 5000 }, (error, stdout) => {
      if (error?.code === 'ENOENT') return resolve(null); // Optional host tool; browser also caps recording.
      if (error) return reject(error);
      const seconds = Number(stdout.trim());
      if (!Number.isFinite(seconds) || seconds <= 0) return reject(new Error('Invalid video duration'));
      resolve(seconds);
    });
  });
}

async function phoneMatchesSession(sessionId, rawPhone) {
  const phone = normalizePhone(rawPhone);
  const session = await Session.findById(Number(sessionId));
  const registered = normalizePhone(session?.teacher_phone);
  return Boolean(/^0?9\d{9}$/.test(phone) && registered && phone === registered);
}

router.post('/verify-phone', authenticateToken, async (req, res) => {
  if (req.user?.role !== 'user' || !Number.isInteger(Number(req.user.sessionId))) {
    return res.status(403).json({ success: false, message: 'دسترسی این بخش برای شما فعال نیست.' });
  }
  try {
    if (!await phoneMatchesSession(req.user.sessionId, req.body?.phone)) {
      return res.status(403).json({ success: false, message: 'این شماره برای کلاس شما ثبت نشده است.' });
    }
    return res.json({ success: true });
  } catch (_) {
    return res.status(503).json({ success: false, message: 'بررسی شماره انجام نشد. دوباره تلاش کنید.' });
  }
});

router.post('/submissions', authenticateToken, requireStudent, videoUpload.single('video'), async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const clientSubmissionId = String(req.body?.clientSubmissionId || '');
  let answers;
  try { answers = typeof req.body?.answers === 'string' ? JSON.parse(req.body.answers) : req.body?.answers; } catch (_) {}
  if (!/^0?9\d{9}$/.test(phone) || !/^[A-Za-z0-9_-]{16,64}$/.test(clientSubmissionId) || !answers || typeof answers !== 'object' || Array.isArray(answers) ||
      Object.keys(answers).length !== questionIds.size ||
      ![...questionIds].every(id => typeof answers[id] === 'string' && answers[id].trim().length > 0 && answers[id].length <= 300) ||
      Object.keys(answers).some(id => !questionIds.has(id))) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ success: false, message: 'پاسخ‌ها کامل نیستند. دوباره بررسی کنید.' });
  }

  if (!req.file) return res.status(400).json({ success: false, message: 'ویدیوی سلفی پاسخ ثبت نشده است.' });

  let reference = null;
  try {
    if (!validVideoSignature(req.file)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ success: false, message: 'ویدیو معتبر نیست. دوباره ضبط کنید.' });
    }
    const duration = await videoDurationSeconds(req.file.path);
    if (duration !== null && duration > 45) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ success: false, message: 'ویدیو باید حداکثر ۴۵ ثانیه باشد.' });
    }
    if (!await phoneMatchesSession(req.user.sessionId, phone)) {
      fs.unlink(req.file.path, () => {});
      return res.status(403).json({ success: false, message: 'این شماره برای کلاس شما ثبت نشده است.' });
    }
    const duplicate = await query('SELECT reference_code FROM emergency_auth_videos WHERE client_submission_id = ? AND session_id = ?', [clientSubmissionId, Number(req.user.sessionId)]);
    if (duplicate.rows[0]) {
      fs.unlink(req.file.path, () => {});
      return res.status(200).json({ success: true, reference: duplicate.rows[0].reference_code });
    }
    reference = `SEC-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    await query(
      'INSERT INTO emergency_auth_submissions (reference_code, session_id, phone, answers_json) VALUES (?, ?, ?, ?)',
      [reference, Number(req.user.sessionId), phone, JSON.stringify(answers)]
    );
    await query(
      `INSERT INTO emergency_auth_videos
      (reference_code, client_submission_id, session_id, phone, file_path, mime_type, file_size, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [reference, clientSubmissionId, Number(req.user.sessionId), phone, req.file.path, req.file.mimetype, req.file.size]
    );
    return res.status(201).json({ success: true, reference });
  } catch (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    if (reference) await query('DELETE FROM emergency_auth_submissions WHERE reference_code = ?', [reference]).catch(() => {});
    if (/Duplicate entry/i.test(error.message)) {
      const existing = await query('SELECT reference_code FROM emergency_auth_videos WHERE client_submission_id = ? AND session_id = ?', [clientSubmissionId, Number(req.user.sessionId)]).catch(() => ({ rows: [] }));
      if (existing.rows[0]) return res.status(200).json({ success: true, reference: existing.rows[0].reference_code });
    }
    return res.status(503).json({ success: false, message: 'ثبت پاسخ‌ها انجام نشد. دوباره تلاش کنید.' });
  }
});

router.get('/videos', requireAdmin, async (req, res) => {
  const sessionId = Number(req.query.sessionId || 0);
  const params = [];
  let where = '';
  if (sessionId > 0) { where = ' WHERE v.session_id = ?'; params.push(sessionId); }
  const result = await query(
    `SELECT v.id, v.reference_code, v.session_id, s.name AS session_name, v.phone,
            v.status, v.attempt_count, v.last_error, v.created_at, v.sent_at
     FROM emergency_auth_videos v LEFT JOIN sessions s ON s.id = v.session_id
     ${where} ORDER BY v.id DESC LIMIT 500`, params
  );
  res.json({ success: true, data: result.rows || [] });
});

router.post('/videos/requeue', requireAdmin, async (req, res) => {
  const sessionId = Number(req.body?.sessionId || 0);
  if (!Number.isInteger(sessionId) || sessionId <= 0) return res.status(400).json({ success: false, message: 'کلاس نامعتبر است.' });
  await query(
    `UPDATE emergency_auth_videos SET status = 'pending', next_attempt_at = NULL, last_error = NULL, attempt_count = 0
     WHERE session_id = ? AND status IN ('failed', 'pending')`, [sessionId]
  );
  res.json({ success: true, message: 'ویدیوهای این کلاس در صف ارسال قرار گرفتند.' });
});

module.exports = router;
