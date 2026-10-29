const fs = require('fs');
const https = require('https');
const path = require('path');
const crypto = require('crypto');
const { query } = require('../db/pool');
const { formatAnswersReport, ensureStreamableVideo } = require('../utils/videoTranscoder');

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

/**
 * ارسال پیام متنی به تلگرام (برای ارسال گزارش‌های تکمیلی طولانی یا پیام‌های بات)
 */
function sendTelegramTextMessage(text, replyToId = null, config = telegramConfig()) {
  if (!config) return Promise.reject(new Error('Telegram destination is not configured'));
  const payload = JSON.stringify({
    chat_id: config.chatId,
    text,
    reply_to_message_id: replyToId || undefined
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${config.token}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 30000
    }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (res.statusCode !== 200 || !data.ok) {
            return reject(new Error(data.description || `Telegram HTTP ${res.statusCode}`));
          }
          resolve(data.result?.message_id);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Telegram message timed out')));
    req.write(payload);
    req.end();
  });
}


/**
 * دریافت لیست تمام شناسه‌های تلگرام ادمین‌های مجاز سامانه
 */
async function getAllAuthorizedAdminChatIds(primaryFallbackId = null) {
  const ids = new Set();
  const primary = primaryFallbackId || process.env.TELEGRAM_ADMIN_ID || '5490508090';
  if (primary && /^\d+$/.test(String(primary))) {
    ids.add(String(primary));
  }

  // ۱. خواندن از فایل محلی پایدار
  try {
    const jsonPath = path.resolve(__dirname, '..', '..', 'storage', 'telegram_authorized_admins.json');
    if (fs.existsSync(jsonPath)) {
      const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const cid = typeof item === 'object' ? item.chatId || item.userId || item.adminId : item;
          if (cid && /^\d+$/.test(String(cid))) {
            ids.add(String(cid));
          }
        }
      }
    }
  } catch (_) {}

  // ۲. خواندن از جدول MySQL ادمین‌ها
  try {
    const res = await query('SELECT admin_id FROM bot_authorized_admins');
    if (res && res.rows && Array.isArray(res.rows)) {
      for (const row of res.rows) {
        if (row.admin_id && /^\d+$/.test(String(row.admin_id))) {
          ids.add(String(row.admin_id));
        }
      }
    }
  } catch (_) {}

  return Array.from(ids);
}

/**
 * ارسال سریع ویدیوی آپلودشده به سایر ادمین‌ها با استفاده از شناسه تلگرامی فایل
 */
function sendExistingTelegramMedia(token, chatId, method, fileId, captionText, isMp4) {
  const payload = JSON.stringify({
    chat_id: String(chatId),
    [isMp4 ? 'video' : 'document']: fileId,
    caption: captionText || undefined,
    supports_streaming: isMp4 ? true : undefined
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${token}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 30000
    }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (res.statusCode !== 200 || !data.ok || !data.result?.message_id) {
            return reject(new Error(data.description || `Telegram HTTP ${res.statusCode}`));
          }
          resolve(data.result.message_id);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Telegram sendExistingTelegramMedia timed out')));
    req.write(payload);
    req.end();
  });
}

/**
 * ارسال ویدیوی استریم MP4 احراز هویت به همراه پاسخ کامل ۱۲ سؤال دانش‌آموز به ادمین در تلگرام
 */
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

  // دریافت پاسخ‌های ۱۲ معما از جدول ثبت‌نام
  let studentAnswers = null;
  try {
    const subRes = await query(
      'SELECT answers_json FROM emergency_auth_submissions WHERE reference_code = ? LIMIT 1',
      [job.reference_code]
    );
    if (subRes.rows && subRes.rows[0]?.answers_json) {
      studentAnswers = typeof subRes.rows[0].answers_json === 'string'
        ? JSON.parse(subRes.rows[0].answers_json)
        : subRes.rows[0].answers_json;
    }
  } catch (_) {}

  // تولید متن کامل مشخصات و پاسخ‌ها
  const fullAnswersReport = formatAnswersReport(studentAnswers, {
    className,
    phone: job.phone,
    referenceCode: job.reference_code
  });

  // محدودیت کپشن تلگرام ۱۰۲۴ نویسه است
  let captionText = fullAnswersReport;
  let followUpText = null;
  if (Buffer.byteLength(fullAnswersReport, 'utf8') > 1000 || fullAnswersReport.length > 950) {
    captionText = [
      '📹 پاسخ ویدیویی احراز هویت پرونده',
      `🏫 کلاس: ${className}`,
      `📞 شماره تماس: ${job.phone}`,
      `📂 کد پرونده: ${job.reference_code}`,
      '📋 متن کامل پاسخ‌های ۱۲ سؤال در پیام بعدی پیوست شد ⬇️'
    ].join('\n');
    followUpText = fullAnswersReport;
  }

  // تبدیل به MP4 استریم‌شونده (H.264/AAC با اتم FastStart در ابتدا) در صورت نیاز
  let streamable = null;
  try {
    streamable = await ensureStreamableVideo(filePath, job.mime_type);
  } catch (convErr) {
    console.warn('ensureStreamableVideo error:', convErr.message);
    streamable = {
      filePath,
      mimeType: job.mime_type,
      isMp4: job.mime_type === 'video/mp4',
      transcoded: false
    };
  }

  const targetPath = streamable.filePath;
  const targetMime = streamable.mimeType;
  const targetStat = fs.statSync(targetPath);
  const isMp4 = targetMime === 'video/mp4';
  const method = isMp4 ? 'sendVideo' : 'sendDocument';

  const allAdminChatIds = await getAllAuthorizedAdminChatIds(config?.chatId);
  const targetChatIds = Array.from(new Set([String(config?.chatId || '5490508090'), ...allAdminChatIds])).filter(id => /^\d+$/.test(id));
  const primaryChatId = targetChatIds[0] || String(config?.chatId || '5490508090');

  const boundary = `----Raze${crypto.randomBytes(12).toString('hex')}`;
  const field = (name, value) => Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`);

  const prelude = [
    field('chat_id', primaryChatId),
    field('caption', captionText)
  ];

  if (isMp4) {
    // فعال‌سازی پخش درجا و مستقیم ویدیو در تلگرام
    prelude.push(field('supports_streaming', 'true'));
  }

  prelude.push(
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${isMp4 ? 'video' : 'document'}"; filename="${path.basename(targetPath)}"\r\nContent-Type: ${targetMime}\r\n\r\n`)
  );

  const ending = Buffer.from(`\r\n--${boundary}--\r\n`);
  const contentLength = prelude.reduce((n, b) => n + b.length, 0) + targetStat.size + ending.length;

  try {
    const uploadResult = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.telegram.org',
        path: `/bot${config.token}/${method}`,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': contentLength
        },
        timeout: 120000
      }, res => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => {
          body += chunk;
          if (body.length > 1024 * 1024) req.destroy(new Error('Telegram response too large'));
        });
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (res.statusCode !== 200 || !data.ok || !data.result?.message_id) {
              throw new Error(data.description || `Telegram HTTP ${res.statusCode}`);
            }
            resolve({
              messageId: data.result.message_id,
              fileId: data.result.video?.file_id || data.result.document?.file_id || null
            });
          } catch (error) { reject(error); }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => req.destroy(new Error('Telegram upload timed out')));
      for (const part of prelude) req.write(part);
      const stream = fs.createReadStream(targetPath, { highWaterMark: 128 * 1024 });
      stream.on('error', error => req.destroy(error));
      stream.on('end', () => req.end(ending));
      stream.pipe(req, { end: false });
    });

    const messageId = typeof uploadResult === 'object' ? uploadResult.messageId : uploadResult;
    const fileId = typeof uploadResult === 'object' ? uploadResult.fileId : null;

    // ارسال متن تکمیلی برای ادمین اول در صورت نیاز
    if (followUpText && messageId) {
      try {
        await sendTelegramTextMessage(followUpText, messageId, { token: config.token, chatId: primaryChatId });
      } catch (txtErr) {
        console.warn('⚠️ ارسال متن تکمیلی پاسخ‌ها با خطا مواجه شد:', txtErr.message);
      }
    }

    // ارسال خودکار برای تمام ادمین‌های مجاز دیگر سامانه (با استفاده از شناسه فایل آپلودشده)
    const otherAdmins = targetChatIds.slice(1);
    for (const otherChatId of otherAdmins) {
      try {
        if (fileId) {
          const otherMsgId = await sendExistingTelegramMedia(
            config.token,
            otherChatId,
            method,
            fileId,
            captionText,
            isMp4
          );
          if (followUpText && otherMsgId) {
            await sendTelegramTextMessage(followUpText, otherMsgId, {
              token: config.token,
              chatId: otherChatId
            }).catch(() => {});
          }
        }
      } catch (adminErr) {
        console.warn(`⚠️ [emergencyVideoQueue] خطا در ارسال ویدیو به ادمین ${otherChatId}:`, adminErr.message);
      }
    }

    return messageId;
  } finally {
    // پاکسازی فایل MP4 موقت تبدیل‌شده در صورت وجود
    if (streamable && streamable.transcoded && streamable.filePath !== filePath) {
      fs.unlink(streamable.filePath, () => {});
    }
  }
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

module.exports = {
  getAllAuthorizedAdminChatIds,
  processOne,
  startQueue,
  stopQueue,
  sendTelegramVideo,
  sendTelegramTextMessage,
  telegramConfig
};
