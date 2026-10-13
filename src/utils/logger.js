/**
 * src/utils/logger.js
 * سیستم ثبت دائمی و تفکیک‌شده لاگ‌های سرور، خطاها و عیب‌یابی کرش
 * قابلیت ثبت بلادرنگ در فایل‌های logs/server.log، logs/error.log و logs/crash.log
 */

const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '../../logs');

// اطمینان از وجود پوشه logs
if (!fs.existsSync(LOGS_DIR)) {
  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create logs directory:', err);
  }
}

const SERVER_LOG_FILE = path.join(LOGS_DIR, 'server.log');
const ERROR_LOG_FILE = path.join(LOGS_DIR, 'error.log');
const CRASH_LOG_FILE = path.join(LOGS_DIR, 'crash.log');

// حداکثر حجم فایل لاگ قبل از چرخش (۱۰ مگابایت)
const MAX_LOG_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * بررسی و چرخش فایل‌های لاگ بزرگ
 */
function rotateIfTooLarge(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.size > MAX_LOG_SIZE_BYTES) {
        const backupPath = `${filePath}.${Date.now()}.bak`;
        fs.renameSync(filePath, backupPath);
      }
    }
  } catch (_) {}
}

/**
 * قالب‌بندی زمان به صورت استاندارد محلی
 */
function formatTimestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}.${ms}`;
}

/**
 * ساخت رشته خروجی استاندارد لاگ
 */
function formatLogEntry(level, message, meta = null) {
  const ts = formatTimestamp();
  let metaStr = '';
  if (meta !== null && meta !== undefined) {
    if (meta instanceof Error) {
      metaStr = ` | Stack: ${meta.stack || meta.message}`;
    } else if (typeof meta === 'object') {
      try {
        metaStr = ` | Meta: ${JSON.stringify(meta)}`;
      } catch (_) {
        metaStr = ` | Meta: [Circular/Unserializable]`;
      }
    } else {
      metaStr = ` | Meta: ${String(meta)}`;
    }
  }
  return `[${ts}] [${level}] ${message}${metaStr}\n`;
}

/**
 * نوشتن در فایل به صورت امن
 */
function appendToFile(filePath, content, sync = false) {
  try {
    rotateIfTooLarge(filePath);
    if (sync) {
      fs.appendFileSync(filePath, content, 'utf8');
    } else {
      fs.appendFile(filePath, content, 'utf8', () => {});
    }
  } catch (err) {
    console.error(`Logger error writing to ${filePath}:`, err.message);
  }
}

const logger = {
  info(message, meta = null) {
    const entry = formatLogEntry('INFO', message, meta);
    console.log(`[INFO] ${message}`, meta ? meta : '');
    appendToFile(SERVER_LOG_FILE, entry);
  },

  warn(message, meta = null) {
    const entry = formatLogEntry('WARN', message, meta);
    console.warn(`[WARN] ${message}`, meta ? meta : '');
    appendToFile(SERVER_LOG_FILE, entry);
    appendToFile(ERROR_LOG_FILE, entry);
  },

  error(message, meta = null) {
    const entry = formatLogEntry('ERROR', message, meta);
    console.error(`[ERROR] ${message}`, meta ? meta : '');
    appendToFile(SERVER_LOG_FILE, entry);
    appendToFile(ERROR_LOG_FILE, entry);
  },

  /**
   * لاگ فوریت‌دار و بحرانی (کرش، UncaughtException، UnhandledRejection)
   * برای تضمین تخلیه در دیسک به صورت کاملاً همگام (Sync) ثبت می‌شود.
   */
  fatal(reason, errOrMeta = null) {
    const mem = process.memoryUsage();
    const crashMeta = {
      reason,
      pid: process.pid,
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        rssMB: Math.round(mem.rss / 1024 / 1024),
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      },
      error: errOrMeta instanceof Error ? {
        message: errOrMeta.message,
        stack: errOrMeta.stack,
        code: errOrMeta.code,
      } : errOrMeta,
    };

    const entry = formatLogEntry('CRASH', `🔥 SERVER CRITICAL EVENT: ${reason}`, crashMeta);
    console.error('🔥 CRITICAL CRASH LOGGED:', entry);
    
    // ثبت فوری و سنکرون در تمام فایل‌ها تا قبل از بسته شدن پروسس ذخیره شود
    appendToFile(CRASH_LOG_FILE, entry, true);
    appendToFile(ERROR_LOG_FILE, entry, true);
    appendToFile(SERVER_LOG_FILE, entry, true);
  },

  /**
   * میدلور Express برای ثبت درخواست‌های HTTP و مدت پاسخ‌دهی
   */
  httpMiddleware(req, res, next) {
    const start = Date.now();
    const url = req.originalUrl || req.url;
    
    // برای استاتیک‌های پرحجم یا فایل‌های صوتی/تصویری مکرر لاگ مختصر بنویسیم تا فایل لاگ منفجر نشود
    const isStaticAsset = /\.(png|jpg|jpeg|gif|svg|webp|mp4|webm|mp3|wav|ogg|ico|css|js|woff2)$/i.test(url);

    res.on('finish', () => {
      const duration = Date.now() - start;
      const status = res.statusCode;
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      // خطاها (4xx و 5xx) همیشه لاگ می‌شوند
      if (status >= 400) {
        logger.warn(`HTTP ${req.method} ${url} ${status} - ${duration}ms (${ip})`);
      } else if (!isStaticAsset) {
        // درخواست‌های API و صفحات اصلی
        const entry = formatLogEntry('HTTP', `${req.method} ${url} ${status} - ${duration}ms (${ip})`);
        appendToFile(SERVER_LOG_FILE, entry);
      }
    });

    next();
  },
};

module.exports = logger;
