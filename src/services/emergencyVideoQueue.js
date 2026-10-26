const fs = require('fs');
const https = require('https');
const path = require('path');
const crypto = require('crypto');
const { query } = require('../db/pool');

const MAX_ATTEMPTS = 5;
const POLL_MS = 15000;
let interval = null;
let busy = false;

function telegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '8018971290:AAFcCPC8VjIMZeLVr7q989rASim1NQ8di64';
  const chatId = process.env.TELEGRAM_ADMIN_ID || '5490508090';
  if (!token || !chatId || !/^\d+$/.test(String(chatId))) return null;
  return { token, chatId: String(chatId) };
}

async function sendTelegramVideo(job, config = telegramConfig()) {
  if (!config) return Promise.reject(new Error('Telegram destination is not configured'));
  const filePath = path.resolve(job.file_path);
  const privateDir = path.resolve(__dirname, '..', '..', 'storage', 'emergency-selfies');
  if (!filePath.startsWith(privateDir + path.sep)) return Promise.reject(new Error('Video path is outside private storage'));
  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size !== Number(job.file_size)) return Promise.reject(new Error('Video file is missing or has changed'));

  let className = job.class_name;
  if (!className && job.session_id) {
    try {
      const sRes = await query('SELECT name FROM sessions WHERE id = ?', [job.session_id]);
      if (sRes.rows && sRes.rows[0]?.name) className = sRes.rows[0].name;
    } catch (_) {}
  }
  className = className || `کلاس ${job.session_id || 'نامشخص'}`;

  const captionText = [
    '📹 پاسخ ویدیویی احراز هویت پرونده',
    `🏫 کلاس: ${className}`,
    `📞 شماره تماس: ${job.phone}`,
    `📂 کد پرونده: ${job.reference_code}`
  ].join('\n');

  const boundary = `----Raze${crypto.randomBytes(12).toString('hex')}`;
  const field = (name, value) => Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`);
  const prelude = [
    field('chat_id', config.chatId),
    field('caption', captionText),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${job.mime_type === 'video/mp4' ? 'video' : 'document'}"; filename="${path.basename(filePath)}"\r\nContent-Type: ${job.mime_type}\r\n\r\n`)
  ];
  const ending = Buffer.from(`\r\n--${boundary}--\r\n`);
  const contentLength = prelude.reduce((n, b) => n + b.length, 0) + stat.size + ending.length;
  const method = job.mime_type === 'video/mp4' ? 'sendVideo' : 'sendDocument';
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: 'api.telegram.org', path: `/bot${config.token}/${method}`, method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': contentLength },
      timeout: 120000 }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => {
        body += chunk;
        if (body.length > 1024 * 1024) req.destroy(new Error('Telegram response too large'));
      });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (res.statusCode !== 200 || !data.ok || !data.result?.message_id) throw new Error(data.description || `Telegram HTTP ${res.statusCode}`);
          resolve(data.result.message_id);
        } catch (error) { reject(error); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Telegram upload timed out')));
    for (const part of prelude) req.write(part);
    const stream = fs.createReadStream(filePath, { highWaterMark: 128 * 1024 });
    stream.on('error', error => req.destroy(error));
    stream.on('end', () => req.end(ending));
    stream.pipe(req, { end: false });
  });
}

async function processOne(send = sendTelegramVideo) {
  if (busy || !telegramConfig()) return false;
  busy = true;
  try {
    const selected = await query(`SELECT * FROM emergency_auth_videos WHERE status IN ('pending','failed')
      AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP)
      AND attempt_count < ? ORDER BY id ASC LIMIT 1`, [MAX_ATTEMPTS]);
    const job = selected.rows[0];
    if (!job) return false;
    const claimed = await query(`UPDATE emergency_auth_videos SET status = 'sending',
      attempt_count = attempt_count + 1, last_error = NULL
      WHERE id = ? AND status IN ('pending','failed')
      AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP)`, [job.id]);
    if (!claimed.affectedRows) return false;
    try {
      const messageId = await send(job);
      await query(`UPDATE emergency_auth_videos SET status = 'sent', telegram_message_id = ?,
        sent_at = CURRENT_TIMESTAMP, next_attempt_at = NULL WHERE id = ? AND status = 'sending'`, [messageId, job.id]);
      fs.unlink(job.file_path, () => {});
    } catch (error) {
      const attempt = Number(job.attempt_count || 0) + 1;
      const retryAt = attempt >= MAX_ATTEMPTS ? null : new Date(Date.now() + Math.min(15 * 60_000, 15_000 * 2 ** (attempt - 1)));
      await query(`UPDATE emergency_auth_videos SET status = 'failed', last_error = ?,
        next_attempt_at = ? WHERE id = ? AND status = 'sending'`, [String(error.message).slice(0, 500), retryAt, job.id]);
    }
    return true;
  } finally { busy = false; }
}

async function startQueue() {
  if (interval || !telegramConfig()) return false;
  await query("UPDATE emergency_auth_videos SET status = 'pending' WHERE status = 'sending'");
  interval = setInterval(() => processOne().catch(error => console.error('Emergency video queue:', error.message)), POLL_MS);
  interval.unref?.();
  processOne().catch(error => console.error('Emergency video queue:', error.message));
  return true;
}

function stopQueue() {
  if (interval) clearInterval(interval);
  interval = null;
}

module.exports = { processOne, startQueue, stopQueue, sendTelegramVideo, telegramConfig };
