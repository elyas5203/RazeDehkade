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

// ساخت اپلیکیشن Express و سرور HTTP
const app = express();
const server = http.createServer(app);

// پیکربندی Middlewareها
app.disable('x-powered-by');
app.use(compression());
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// سرو کردن بهینه فایل‌های استاتیک پوشه public (کش بلندمدت برای عکس‌ها و فونت‌ها، نو-کش برای اسکریپت‌ها و استایل‌ها)
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.match(/\.(webp|jpg|jpeg|png|gif|svg|woff2|woff|ttf)$/i)) {
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
