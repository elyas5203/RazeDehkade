const express = require('express');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../db/pool');

const router = express.Router();
const questionIds = new Set([
  'q_shoe_rotary', 'q_terrorist_newspaper', 'q_hajj', 'q_padari',
  'q_invest_2026', 'q_oil_painting', 'q_letter_translators',
  'q_migration_reason', 'q_gem_feature', 'q_police_shoe_store',
  'q_last_village_city', 'q_precious_gem'
]);

router.post('/submissions', authenticateToken, async (req, res) => {
  if (req.user?.role !== 'user' || !Number.isInteger(Number(req.user.sessionId))) {
    return res.status(403).json({ success: false, message: 'دسترسی این بخش برای شما فعال نیست.' });
  }
  const phone = String(req.body?.phone || '').replace(/[^0-9]/g, '');
  const answers = req.body?.answers;
  if (!/^0?9\d{9}$/.test(phone) || !answers || typeof answers !== 'object' || Array.isArray(answers) ||
      Object.keys(answers).length !== questionIds.size ||
      ![...questionIds].every(id => typeof answers[id] === 'string' && answers[id].trim().length > 0 && answers[id].length <= 300) ||
      Object.keys(answers).some(id => !questionIds.has(id))) {
    return res.status(400).json({ success: false, message: 'پاسخ‌ها کامل نیستند. دوباره بررسی کنید.' });
  }

  try {
    const reference = `SEC-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    await query(
      'INSERT INTO emergency_auth_submissions (reference_code, session_id, phone, answers_json) VALUES (?, ?, ?, ?)',
      [reference, Number(req.user.sessionId), phone, JSON.stringify(answers)]
    );
    return res.status(201).json({ success: true, reference });
  } catch (error) {
    return res.status(503).json({ success: false, message: 'ثبت پاسخ‌ها انجام نشد. دوباره تلاش کنید.' });
  }
});

module.exports = router;
