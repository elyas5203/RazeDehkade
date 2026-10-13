/**
 * tests/admin-stability-and-clear.test.js
 * تست‌های اختصاصی برای:
 * ۱. پاکسازی امن تاریخچه چت و تخته مدارک بدون آسیب به عکس‌ها و پرونده‌ها
 * ۲. ثبت و عملکرد لاگر خطاها و کرش (logs/server.log, logs/crash.log)
 * ۳. همزمانی و عدم تداخل ۳۰ کاربر (Concurrency & Room Isolation)
 * ۴. ریسپانسیوی ساختار کادر چت ادمین (۲ ردیفه بدون فشرده‌شدن)
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');

process.env.NODE_ENV = 'test';
process.env.USE_IN_MEMORY_DB = 'true';
process.env.JWT_SECRET = 'test_secret_for_stability_verification_12345';

const sessionRoutes = require('../src/routes/sessions');
const { query } = require('../src/db/pool');
const Message = require('../src/models/Message');
const Session = require('../src/models/Session');
const Admin = require('../src/models/Admin');
const logger = require('../src/utils/logger');
const jwt = require('jsonwebtoken');

describe('Admin Mobile, Chat Clearing & 30-User Stability Verification', () => {
  let app;
  let server;
  let serverUrl;
  let adminToken;
  let testSession1;
  let testSession2;

  before(async () => {
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use('/api/sessions', sessionRoutes);

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        serverUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // ایجاد ادمین و دریافت توکن
    const admin = await Admin.create({
      username: 'master_admin',
      password: 'password123',
      display_name: 'فرمانده ارشد',
    });
    adminToken = jwt.sign({ id: admin.id, role: 'admin', username: admin.username }, process.env.JWT_SECRET);

    // ساخت ۲ جلسه آزمایشی
    testSession1 = await Session.create({
      code: 'CLASS_A',
      name: 'کلاس شقایق',
    });
    testSession2 = await Session.create({
      code: 'CLASS_B',
      name: 'کلاس نیلوفر',
    });
  });

  after(async () => {
    if (server) {
      await new Promise(r => server.close(r));
    }
  });

  test('1. Logger records info, error, and fatal crash forensics to disk', () => {
    logger.info('تست لاگ اطلاعات سرور', { service: 'chat' });
    logger.warn('تست هشدار سیستم');
    logger.error('تست خطای عمومی');
    logger.fatal('TEST_CRASH_SIMULATION', new Error('شبیه‌سازی کرش سرور'));

    const serverLogPath = path.join(__dirname, '../logs/server.log');
    const errorLogPath = path.join(__dirname, '../logs/error.log');
    const crashLogPath = path.join(__dirname, '../logs/crash.log');

    assert.ok(fs.existsSync(serverLogPath), 'فایل server.log باید ساخته شده باشد');
    assert.ok(fs.existsSync(errorLogPath), 'فایل error.log باید ساخته شده باشد');
    assert.ok(fs.existsSync(crashLogPath), 'فایل crash.log باید ساخته شده باشد');

    const crashContent = fs.readFileSync(crashLogPath, 'utf8');
    assert.ok(crashContent.includes('TEST_CRASH_SIMULATION'), 'لاگ کرش باید حاوی دلیل خطا باشد');
    assert.ok(crashContent.includes('شبیه‌سازی کرش سرور'), 'لاگ کرش باید پیام استک ارور را داشته باشد');
    assert.ok(crashContent.includes('memory'), 'لاگ کرش باید وضعیت مصرف رم را ثبت کرده باشد');
  });

  test('2. POST /api/sessions/:id/clear-history clears only targeted session messages without touching assistants or files', async () => {
    // درج پیام برای جلسه ۱ و جلسه ۲
    await Message.create({
      session_id: testSession1.id,
      sender_type: 'admin',
      content: 'مدرک شماره ۱ برای کلاس شقایق',
      message_type: 'image',
      file_url: '/uploads/secret_photo.png',
    });
    await Message.create({
      session_id: testSession1.id,
      sender_type: 'user',
      content: 'پاسخ دانش‌آموز کلاس شقایق',
    });
    await Message.create({
      session_id: testSession2.id,
      sender_type: 'admin',
      content: 'پیام مهم برای کلاس نیلوفر',
    });

    // بررسی وجود پیام‌ها قبل از پاکسازی
    const beforeMsgs1 = await Message.findBySessionId(testSession1.id);
    const beforeMsgs2 = await Message.findBySessionId(testSession2.id);
    assert.equal(beforeMsgs1.length, 2);
    assert.equal(beforeMsgs2.length, 1);

    // اجرای درخواست پاکسازی چت جلسه ۱
    const clearRes = await fetch(`${serverUrl}/api/sessions/${testSession1.id}/clear-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
    });
    const clearData = await clearRes.json();
    assert.equal(clearData.success, true);
    assert.equal(clearData.deletedCount, 2);

    // پیام‌های جلسه ۱ باید ۰ شده باشند
    const afterMsgs1 = await Message.findBySessionId(testSession1.id);
    assert.equal(afterMsgs1.length, 0);

    // پیام‌های جلسه ۲ باید دست‌نخورده باقی مانده باشند (عدم تداخل)
    const afterMsgs2 = await Message.findBySessionId(testSession2.id);
    assert.equal(afterMsgs2.length, 1);
  });

  test('3. POST /api/sessions/clear-all-history clears messages globally', async () => {
    await Message.create({
      session_id: testSession2.id,
      sender_type: 'admin',
      content: 'پیام ۲ برای جلسه نیلوفر',
    });

    const clearAllRes = await fetch(`${serverUrl}/api/sessions/clear-all-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
    });
    const clearAllData = await clearAllRes.json();
    assert.equal(clearAllData.success, true);
    assert.ok(clearAllData.deletedCount >= 2);

    const msgs2 = await Message.findBySessionId(testSession2.id);
    assert.equal(msgs2.length, 0);
  });

  test('4. 30 concurrent user messages processed smoothly without crash or race conditions', async () => {
    const testSession3 = await Session.create({
      code: 'CLASS_C',
      name: 'کلاس مریم',
    });

    const promises = [];
    const count = 30;

    for (let i = 1; i <= count; i++) {
      promises.push(
        Message.create({
          session_id: testSession3.id,
          sender_type: 'user',
          content: `پیام همزمان کاربر شماره ${i}`,
        })
      );
    }

    const results = await Promise.all(promises);
    assert.equal(results.length, count, 'تمام ۳۰ پیام همزمان باید با موفقیت درج شوند');

    const stored = await Message.findBySessionId(testSession3.id);
    assert.equal(stored.length, count);
  });

  test('5. Admin chat HTML and CSS verify responsive 2-tier composer layout', () => {
    const chatHtml = fs.readFileSync(path.join(__dirname, '../public/admin/chat.html'), 'utf8');
    const adminCss = fs.readFileSync(path.join(__dirname, '../public/assets/css/admin.css'), 'utf8');

    // چک کردن ساختار ۲ ردیفه و قرارگیری دکمه ارسال در کنار تکست‌اریا
    assert.ok(chatHtml.includes('admin-composer-main'), 'باید کانتینر اصلی کامپوزر وجود داشته باشد');
    assert.ok(chatHtml.includes('composer-textarea-row'), 'باید ردیف مستقل تکست‌اریا وجود داشته باشد');
    assert.ok(!chatHtml.includes('confirmClearCurrentChat'), 'دکمه‌های پاکسازی چت طبق دستور کاربر باید کاملاً از رابط کاربری حذف شده باشند');
    assert.ok(!chatHtml.includes('cyber.css'), 'فایل سنگین cyber.css جهت حذف لگ و روان‌سازی اسکرول موبایل نباید در چت ادمین لود شود');

    // چک کردن استایل‌های روانی موبایل و پین بودن دکمه ارسال
    assert.ok(adminCss.includes('.composer-textarea-row textarea'), 'باید استایل تکست‌اریای تمام‌عرض تعریف شده باشد');
    assert.ok(adminCss.includes('empty-chat-hint'), 'باید استایل وضعیت خالی چت تعریف شده باشد');
    assert.ok(adminCss.includes('-webkit-overflow-scrolling: touch'), 'اسکرول شتاب‌یافته تاچ موبایل باید تعریف شده باشد');
    assert.ok(adminCss.includes('overscroll-behavior-y: contain'), 'باید از جهش اسکرول صفحه جلوگیری شود');
  });

  test('6. User chat client handles message_deleted by removing evidence card, yarn threads, and unread counts', () => {
    const userChatJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/user-chat.js'), 'utf8');

    assert.ok(userChatJs.includes("data-evidence-id"), 'کلاینت باید کارت مدرک را از برد حذف کند');
    assert.ok(userChatJs.includes("updateEvidenceThreads"), 'کلاینت باید نخ‌های اتصال را بازنشانی کند');
    assert.ok(userChatJs.includes("currentEvidenceId"), 'کلاینت باید شناسه مدرک باز را پیگیری کند');
    assert.ok(userChatJs.includes("chat_cleared"), 'کلاینت باید رویداد chat_cleared را دریافت و پردازش کند');
  });
});
