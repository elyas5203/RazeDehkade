/**
 * server.js
 * فایل اصلی راه‌اندازی سرور Express و Socket.io
 */

const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { runMigrations } = require('./src/db/migrate');
const setupSocketIO = require('./src/socket');

const compression = require('compression');
const { ensureMp4FastStart, optimizeVideosInDirectories } = require('./src/utils/mp4FastStart');

// ساخت اپلیکیشن Express و سرور HTTP
const app = express();
const server = http.createServer(app);

const MEDIA_STREAM_REGEX = /\.(mp4|webm|mov|mkv|3gp|m4v|avi|mp3|wav|ogg|oga|m4a|aac|flac|opus)$/i;
const STATIC_CACHE_REGEX = /\.(webp|jpg|jpeg|jfif|png|apng|gif|svg|avif|bmp|ico|woff2|woff|ttf|mp4|webm|mov|mkv|3gp|m4v|avi|mp3|wav|ogg|oga|m4a|aac|flac|opus|pdf)$/i;
const checkedFastStartFiles = new Set();

// پیکربندی Middlewareها
app.disable('x-powered-by');
app.use(compression({
  filter: (req, res) => {
    if (req.headers.range) return false;
    if (req.path && (req.path.startsWith('/uploads/') || req.path.startsWith('/media-library/') || MEDIA_STREAM_REGEX.test(req.path))) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// بهینه‌سازی آنی FastStart (انتقال اتم moov به ابتدای ویدیو) پیش از استریم فایل‌های ویدیویی آپلودشده
app.use(['/uploads', '/media-library'], (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  try {
    const cleanRel = decodeURIComponent(req.path || '').replace(/^\/+/, '');
    if (/\.(mp4|mov|m4a|m4v)$/i.test(cleanRel)) {
      const baseFolder = req.baseUrl.includes('media-library') ? 'media-library' : 'uploads';
      // در محیط تست یا لوکال به فایل نمونه داخل گیت دست نزنیم تا git status تمیز بماند، اما در سرور و پوشه uploads همیشه بهینه شود
      const isTrackedSample = baseFolder === 'media-library' && cleanRel === 'videos/first.mp4' && process.platform === 'win32';
      const fullPath = path.join(__dirname, 'public', baseFolder, cleanRel);
      if (!isTrackedSample && !checkedFastStartFiles.has(fullPath)) {
        checkedFastStartFiles.add(fullPath);
        ensureMp4FastStart(fullPath);
      }
    }
  } catch (_) {}
  next();
});

// سرو کردن بهینه فایل‌های استاتیک پوشه public (کش بلندمدت و استریم بدون بافر Nginx برای ویدیو، صوت، عکس و فونت‌ها)
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  lastModified: true,
  acceptRanges: true,
  setHeaders: (res, filePath) => {
    if (MEDIA_STREAM_REGEX.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('X-Accel-Buffering', 'no');
    } else if (STATIC_CACHE_REGEX.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    } else {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));
app.get('/favicon.ico', (req, res) => res.status(204).end());

// مسیرهای مستقیم و میانبر برای صفحات فروشگاه و پیگیری سفارش
app.get(['/golha', '/golha/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'golha', 'index.html'));
});

app.get(['/order-status', '/order_status', '/golha/order-status', '/golha/order_status'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'golha', 'order-status.html'));
});

// مسیرهای API
const authRoutes = require('./src/routes/auth');
const sessionRoutes = require('./src/routes/sessions');
const cannedResponseRoutes = require('./src/routes/cannedResponses');
const storeRoutes = require('./src/routes/store');
const uploadRoutes = require('./src/routes/upload');
const mediaLibraryRoutes = require('./src/routes/mediaLibrary');
const weeklyContentRoutes = require('./src/routes/weeklyContent');

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/canned-responses', cannedResponseRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/media-library', mediaLibraryRoutes);
app.use('/api/weekly-content', weeklyContentRoutes);

// مسیر تست سلامت API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    service: 'Detective Game Realtime Chat API',
  });
});

// کانفیگ و راه‌اندازی Socket.io
const io = new Server(server, {
  maxHttpBufferSize: 5 * 1024 * 1024,
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);
setupSocketIO(io);

const { startMohtavaBot } = require('./MohtavaTelBot');

const PORT = process.env.PORT || 3000;

// اجرای مایگریشن‌ها و سپس شروع سرور
async function startServer() {
  try {
    await runMigrations();
    // بهینه‌سازی خودکار تمام ویدیوهای آپلودشده قبلی در پوشه uploads و weekly برای استریم آنی
    optimizeVideosInDirectories([path.join(__dirname, 'public', 'uploads')]);
    server.listen(PORT, () => {
      console.log(`==================================================`);
      console.log(`🚀 سرور با موفقیت روی پورت ${PORT} اجرا شد.`);
      console.log(`🌐 آدرس تست پنل: http://localhost:${PORT}`);
      console.log(`==================================================`);

      // فقط روی سرور لینوکس (VPS) یا در صورت فعال بودن صریح متغیر، بات تلگرام را خودکار روشن کن
      // تا اجرای محلی روی ویندوز هرگز پیام‌های تلگرام سرور اصلی را ندزدد!
      const shouldAutoStartBot =
        process.env.NODE_ENV !== 'test' &&
        process.env.DISABLE_TELEGRAM_BOT !== 'true' &&
        (process.platform === 'linux' || process.env.ENABLE_TELEGRAM_BOT === 'true');

      if (shouldAutoStartBot) {
        startMohtavaBot({ io }).catch(err => {
          console.error('⚠️ خطا در راه‌اندازی بات تلگرام MohtavaTelBot:', err.message);
        });
      }
    });
  } catch (err) {
    console.error('❌ خطا در راه‌اندازی سرور:', err);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };
