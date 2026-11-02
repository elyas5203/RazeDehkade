const fs = require('fs');
const https = require('https');
const path = require('path');
const crypto = require('crypto');
const { query } = require('../db/pool');
const { telegramConfig, getAllAuthorizedAdminChatIds, getAllAuthorizedGroupDestinations, sendExistingTelegramMedia } = require('./emergencyVideoQueue');

const privateDir = path.resolve(__dirname, '..', '..', 'storage', 'collective-auth');
let interval = null, busy = false;

async function send(job) {
  const config = telegramConfig();
  if (!config) throw new Error('Telegram is not configured');
  const file = path.resolve(job.file_path);
  if (!file.startsWith(privateDir + path.sep)) throw new Error('Invalid media path');
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size !== Number(job.file_size)) throw new Error('Video file changed');
  const s = await query('SELECT name FROM sessions WHERE id = ?', [job.session_id]);
  const caption = `📹 احراز هویت جمعی\n🏫 ${s.rows[0]?.name || `کلاس ${job.session_id}`}\n📞 ${job.phone_normalized}`;
  const mp4 = job.mime_type === 'video/mp4';
  const method = mp4 ? 'sendVideo' : 'sendDocument';
  const fieldName = mp4 ? 'video' : 'document';
  const boundary = `----Raze${crypto.randomBytes(12).toString('hex')}`;
  const field = (name, value) => Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`);
  const head = [field('chat_id', config.chatId), field('caption', caption)];
  if (mp4) head.push(field('supports_streaming', 'true'));
  head.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${path.basename(file)}"\r\nContent-Type: ${job.mime_type}\r\n\r\n`));
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const length = head.reduce((n, b) => n + b.length, 0) + stat.size + tail.length;
  const uploaded = await new Promise((resolve, reject) => {
    const req = https.request({ hostname: 'api.telegram.org', path: `/bot${config.token}/${method}`, method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': length }, timeout: 120000 }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; if (body.length > 1024 * 1024) req.destroy(new Error('Telegram response too large')); });
      res.on('end', () => { try { const data = JSON.parse(body); if (!data.ok || res.statusCode !== 200) throw new Error(data.description || 'Telegram failed');
        resolve({ messageId: data.result?.message_id, fileId: data.result?.video?.file_id || data.result?.document?.file_id }); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Telegram timed out')));
    head.forEach(part => req.write(part));
    const stream = fs.createReadStream(file);
    stream.on('error', e => req.destroy(e));
    stream.on('end', () => req.end(tail));
    stream.pipe(req, { end: false });
  });
  const others = await getAllAuthorizedAdminChatIds(config.chatId);
  const groups = await getAllAuthorizedGroupDestinations();
  if (uploaded.fileId) {
    for (const chatId of others.filter(id => String(id) !== String(config.chatId)))
      await sendExistingTelegramMedia(config.token, chatId, method, uploaded.fileId, caption, mp4).catch(() => {});
    for (const group of groups)
      await sendExistingTelegramMedia(config.token, group.chatId, method, uploaded.fileId, caption, mp4, group.threadId).catch(() => {});
  }
  return uploaded.messageId;
}

async function processOne() {
  if (busy || !telegramConfig()) return false;
  busy = true;
  try {
    const selected = await query(`SELECT * FROM collective_submissions WHERE telegram_status IN ('pending','failed')
      AND (telegram_next_attempt_at IS NULL OR telegram_next_attempt_at <= CURRENT_TIMESTAMP)
      AND telegram_attempt_count < 5 ORDER BY id ASC LIMIT 1`);
    const job = selected.rows[0];
    if (!job) return false;
    const claimed = await query(`UPDATE collective_submissions SET telegram_status = 'sending', telegram_attempt_count = telegram_attempt_count + 1
      WHERE id = ? AND telegram_status IN ('pending','failed')`, [job.id]);
    if (!claimed.affectedRows) return false;
    try {
      const messageId = await send(job);
      await query("UPDATE collective_submissions SET telegram_status = 'sent', telegram_message_id = ?, telegram_last_error = NULL WHERE id = ? AND telegram_status = 'sending'", [messageId, job.id]);
    } catch (error) {
      const attempt = Number(job.telegram_attempt_count || 0) + 1;
      const next = attempt >= 5 ? null : new Date(Date.now() + Math.min(900000, 15000 * 2 ** (attempt - 1)));
      await query("UPDATE collective_submissions SET telegram_status = 'failed', telegram_last_error = ?, telegram_next_attempt_at = ? WHERE id = ? AND telegram_status = 'sending'", [String(error.message).slice(0, 500), next, job.id]);
    }
    return true;
  } finally { busy = false; }
}

async function startQueue() {
  if (interval) return;
  await query("UPDATE collective_submissions SET telegram_status = 'pending' WHERE telegram_status = 'sending'");
  interval = setInterval(() => processOne().catch(error => console.error('Collective video queue:', error.message)), 15000);
  interval.unref?.();
  processOne().catch(error => console.error('Collective video queue:', error.message));
}
module.exports = { processOne, startQueue };
