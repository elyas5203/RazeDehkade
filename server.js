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

// ساخت اپلیکیشن Express و سرور HTTP
const app = express();
const server = http.createServer(app);

// پیکربندی Middlewareها
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// سرو کردن فایل‌های استاتیک پوشه public برای تست موقت
app.use(express.static(path.join(__dirname, 'public')));

// مسیرهای API
const authRoutes = require('./src/routes/auth');
const sessionRoutes = require('./src/routes/sessions');
const cannedResponseRoutes = require('./src/routes/cannedResponses');

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/canned-responses', cannedResponseRoutes);

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
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

setupSocketIO(io);

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
    });
  } catch (err) {
    console.error('❌ خطا در راه‌اندازی سرور:', err);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };
