/**
 * tests/chat-reply.test.js
 * تست‌های جامع و خودکار قابلیت ریپلای دوطرفه چت (Two-Way Reply Engine)
 * اعتبارسنجی سوکت بلادرنگ، پایگاه‌داده، ایزولاسیون جلسات، و سازگاری رابط کاربری
 * منطبق بر استانداردهای UMAC-P و MASTER-07
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { io: Client } = require('socket.io-client');

process.env.NODE_ENV = 'test';
process.env.USE_IN_MEMORY_DB = 'true';
process.env.JWT_SECRET = 'reply_test_secret_998877';

const setupSocketIO = require('../src/socket');
const Message = require('../src/models/Message');
const Session = require('../src/models/Session');
const Admin = require('../src/models/Admin');

describe('Two-Way Chat Reply & Quote Engine (MASTER-07)', () => {
  let app;
  let server;
  let ioServer;
  let serverPort;
  let sessionA;
  let sessionB;
  let adminRecord;
  let adminToken;
  let userTokenA;
  let userTokenB;

  before(async () => {
    app = express();
    app.use(cors());
    app.use(express.json());

    server = http.createServer(app);
    ioServer = new Server(server, { cors: { origin: '*' } });
    app.set('io', ioServer);
    setupSocketIO(ioServer);

    await new Promise((resolve) => {
      server.listen(0, () => {
        serverPort = server.address().port;
        resolve();
      });
    });

    // ساخت ادمین تست
    adminRecord = await Admin.create({
      username: 'reply_detective_admin',
      password: 'testpass123456',
      display_name: 'سرگرد پارسا (فرماندهی)',
    });
    adminToken = jwt.sign(
      { id: adminRecord.id, role: 'admin', username: adminRecord.username, display_name: adminRecord.display_name },
      process.env.JWT_SECRET
    );

    // ساخت دو جلسه مجزا جهت راستی‌آزمایی ایزولاسیون جلسات
    sessionA = await Session.create({ name: 'کلاس ۱۰۱ - کارآگاهان جوان', codeLength: 6 });
    sessionB = await Session.create({ name: 'کلاس ۱۰۲ - تیم کاوشگران', codeLength: 6 });

    userTokenA = jwt.sign({ sessionId: sessionA.id, role: 'user', name: 'دانش‌آموزان ۱۰۱' }, process.env.JWT_SECRET);
    userTokenB = jwt.sign({ sessionId: sessionB.id, role: 'user', name: 'دانش‌آموزان ۱۰۲' }, process.env.JWT_SECRET);
  });

  after(async () => {
    if (ioServer) ioServer.close();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('1. Database Model: Message.create with reply_to_id and findBySessionId includes reply metadata', async () => {
    // ایجاد پیام والد (پیام کارآگاه)
    const parentMsg = await Message.create({
      session_id: sessionA.id,
      sender_type: 'admin',
      sender_id: adminRecord.id,
      content: 'آیا سرنخ اول در زیر میز بررسی قرار داشت؟',
      message_type: 'text',
    });
    assert.ok(parentMsg.id > 0, 'Parent message must be created');

    // ایجاد پیام فرزند (ریپلای کاربر به کارآگاه)
    const replyMsg = await Message.create({
      session_id: sessionA.id,
      sender_type: 'user',
      content: 'بله کارآگاه، یک پاکت محرمانه پیدا کردیم!',
      message_type: 'text',
      reply_to_id: parentMsg.id,
    });
    assert.ok(replyMsg.id > 0, 'Reply message must be created');
    assert.strictEqual(Number(replyMsg.reply_to_id), Number(parentMsg.id));
    assert.strictEqual(replyMsg.reply_content, 'آیا سرنخ اول در زیر میز بررسی قرار داشت؟');
    assert.strictEqual(replyMsg.reply_sender_type, 'admin');
    assert.strictEqual(replyMsg.reply_admin_name, 'سرگرد پارسا (فرماندهی)');

    // دریافت تاریخچه جلسه و تایید پیوند
    const history = await Message.findBySessionId(sessionA.id);
    const foundReply = history.find(m => m.id === replyMsg.id);
    assert.ok(foundReply, 'Reply must exist in session history');
    assert.strictEqual(Number(foundReply.reply_to_id), Number(parentMsg.id));
    assert.strictEqual(foundReply.reply_content, parentMsg.content);
  });

  test('2. Realtime Socket: Student replies to Admin message and both receive enriched new_message', async () => {
    const userClient = Client(`http://127.0.0.1:${serverPort}`, { auth: { token: userTokenA } });
    const adminClient = Client(`http://127.0.0.1:${serverPort}`, { auth: { token: adminToken } });

    await Promise.all([
      new Promise(r => userClient.on('connect', r)),
      new Promise(r => adminClient.on('connect', r)),
    ]);

    userClient.emit('join_session', { sessionId: sessionA.id });
    adminClient.emit('join_session', { sessionId: sessionA.id });
    await new Promise(r => setTimeout(r, 60));

    // گام الف: ادمین پیامی ارسال می‌کند
    const origAdminMsg = await new Promise((resolve, reject) => {
      const tm = setTimeout(() => reject(new Error('Timeout waiting for admin msg')), 4000);
      userClient.once('new_message', (m) => {
        clearTimeout(tm);
        resolve(m);
      });
      adminClient.emit('send_message', {
        sessionId: sessionA.id,
        content: 'سند محرمانه گاوصندوق را تحویل گرفتید؟',
        senderType: 'admin',
        messageType: 'text',
      });
    });

    // گام ب: شنونده ریپلای روی adminClient برای پیام user با reply_to_id متناظر
    const userReplyPromise = new Promise((resolve, reject) => {
      const tm = setTimeout(() => reject(new Error('Timeout waiting for user reply')), 4000);
      const handler = (msg) => {
        if (msg.sender_type === 'user' && Number(msg.reply_to_id) === Number(origAdminMsg.id)) {
          clearTimeout(tm);
          adminClient.off('new_message', handler);
          resolve(msg);
        }
      };
      adminClient.on('new_message', handler);
    });

    userClient.emit('send_message', {
      sessionId: sessionA.id,
      content: 'بله کارآگاه، رمز چهار رقمی وارد شد.',
      messageType: 'text',
      replyToId: origAdminMsg.id,
    });

    const receivedReply = await userReplyPromise;
    assert.strictEqual(receivedReply.sender_type, 'user');
    assert.strictEqual(receivedReply.content, 'بله کارآگاه، رمز چهار رقمی وارد شد.');
    assert.strictEqual(Number(receivedReply.reply_to_id), Number(origAdminMsg.id));
    assert.strictEqual(receivedReply.reply_content, 'سند محرمانه گاوصندوق را تحویل گرفتید؟');
    assert.strictEqual(receivedReply.reply_sender_type, 'admin');

    userClient.disconnect();
    adminClient.disconnect();
  });

  test('3. Realtime Socket: Admin replies to Student message and both receive enriched new_message', async () => {
    const userClient = Client(`http://127.0.0.1:${serverPort}`, { auth: { token: userTokenA } });
    const adminClient = Client(`http://127.0.0.1:${serverPort}`, { auth: { token: adminToken } });

    await Promise.all([
      new Promise(r => userClient.on('connect', r)),
      new Promise(r => adminClient.on('connect', r)),
    ]);

    userClient.emit('join_session', { sessionId: sessionA.id });
    adminClient.emit('join_session', { sessionId: sessionA.id });
    await new Promise(r => setTimeout(r, 60));

    // پیام دانش‌آموز
    const origUserMsg = await new Promise((resolve, reject) => {
      const tm = setTimeout(() => reject(new Error('Timeout waiting for user orig msg')), 4000);
      adminClient.once('new_message', (m) => {
        clearTimeout(tm);
        resolve(m);
      });
      userClient.emit('send_message', {
        sessionId: sessionA.id,
        content: 'ما گام سوم سناریو را کامل کردیم.',
        messageType: 'text',
      });
    });

    // ریپلای ادمین/کارآگاه به دانش‌آموز
    const adminReplyPromise = new Promise((resolve, reject) => {
      const tm = setTimeout(() => reject(new Error('Timeout waiting for admin reply')), 4000);
      const handler = (msg) => {
        if (msg.sender_type === 'admin' && Number(msg.reply_to_id) === Number(origUserMsg.id)) {
          clearTimeout(tm);
          userClient.off('new_message', handler);
          resolve(msg);
        }
      };
      userClient.on('new_message', handler);
    });

    adminClient.emit('send_message', {
      sessionId: sessionA.id,
      content: 'عالی بود تیم تحقیقاتی؛ پرونده بعدی را بررسی کنید.',
      senderType: 'admin',
      messageType: 'text',
      replyToId: origUserMsg.id,
    });

    const receivedAdminReply = await adminReplyPromise;
    assert.strictEqual(receivedAdminReply.sender_type, 'admin');
    assert.strictEqual(receivedAdminReply.content, 'عالی بود تیم تحقیقاتی؛ پرونده بعدی را بررسی کنید.');
    assert.strictEqual(Number(receivedAdminReply.reply_to_id), Number(origUserMsg.id));
    assert.strictEqual(receivedAdminReply.reply_content, 'ما گام سوم سناریو را کامل کردیم.');
    assert.strictEqual(receivedAdminReply.reply_sender_type, 'user');

    userClient.disconnect();
    adminClient.disconnect();
  });

  test('4. Security & Session Isolation: Cross-session reply attempts are sanitized', async () => {
    // پیامی در جلسه B ایجاد می‌شود
    const foreignMsg = await Message.create({
      session_id: sessionB.id,
      sender_type: 'user',
      content: 'پیام محرمانه کلاس دیگر در جلسه B',
      message_type: 'text',
    });

    const userClientA = Client(`http://127.0.0.1:${serverPort}`, { auth: { token: userTokenA } });
    await new Promise(r => userClientA.on('connect', r));
    userClientA.emit('join_session', { sessionId: sessionA.id });

    // کاربر جلسه A تلاش می‌کند به پیام جلسه B ریپلای بزند (Cross-Session Spoofing)
    const ackRes = await new Promise(resolve => {
      userClientA.emit('send_message', {
        sessionId: sessionA.id,
        content: 'تلاش برای ارجاع به پیامی خارج از این کلاس',
        messageType: 'text',
        replyToId: foreignMsg.id,
      }, resolve);
    });

    assert.ok(ackRes.success, 'Message creation succeeds safely');
    // سرور باید متوجه شود که foreignMsg متعلق به sessionA نیست و ارجاع reply_to_id را نال کند
    assert.strictEqual(ackRes.message.reply_to_id, null, 'Cross-session reply must be sanitized to null');

    userClientA.disconnect();
  });

  test('5. DOM & UX Integrity: HTML files contain dedicated reply preview bars', () => {
    const rootDir = path.join(__dirname, '..');
    const userChatHtml = fs.readFileSync(path.join(rootDir, 'public', 'chat.html'), 'utf8');
    const adminChatHtml = fs.readFileSync(path.join(rootDir, 'public', 'admin', 'chat.html'), 'utf8');

    // کلاینت دانش‌آموز
    assert.ok(userChatHtml.includes('id="user-reply-preview-bar"'), 'chat.html must contain #user-reply-preview-bar');
    assert.ok(userChatHtml.includes('id="user-reply-preview-title"'), 'chat.html must contain #user-reply-preview-title');
    assert.ok(userChatHtml.includes('id="user-reply-preview-snippet"'), 'chat.html must contain #user-reply-preview-snippet');
    assert.ok(userChatHtml.includes('cancelUserReply()'), 'chat.html must have cancelUserReply button');

    // کلاینت ادمین
    assert.ok(adminChatHtml.includes('id="admin-reply-preview-bar"'), 'admin/chat.html must contain #admin-reply-preview-bar');
    assert.ok(adminChatHtml.includes('id="admin-reply-preview-title"'), 'admin/chat.html must contain #admin-reply-preview-title');
    assert.ok(adminChatHtml.includes('id="admin-reply-preview-snippet"'), 'admin/chat.html must contain #admin-reply-preview-snippet');
    assert.ok(adminChatHtml.includes('cancelAdminReply()'), 'admin/chat.html must have cancelAdminReply button');
  });

  test('6. CSS Architecture: Stylesheets define reply quote cards, neon pulses and previews', () => {
    const rootDir = path.join(__dirname, '..');
    const terminalCss = fs.readFileSync(path.join(rootDir, 'public', 'assets', 'css', 'terminal.css'), 'utf8');
    const adminCss = fs.readFileSync(path.join(rootDir, 'public', 'assets', 'css', 'admin.css'), 'utf8');

    // استایل‌های چت کاربر
    assert.ok(terminalCss.includes('.message-reply-quote'), 'terminal.css must define .message-reply-quote');
    assert.ok(terminalCss.includes('.composer-reply-preview'), 'terminal.css must define .composer-reply-preview');
    assert.ok(terminalCss.includes('.message-bubble.highlight-pulse'), 'terminal.css must define .highlight-pulse');
    assert.ok(terminalCss.includes('replyHighlightPulse'), 'terminal.css must define replyHighlightPulse keyframes');

    // استایل‌های چت ادمین
    assert.ok(adminCss.includes('.admin-reply-preview'), 'admin.css must define .admin-reply-preview');
    assert.ok(adminCss.includes('.command-page .message-reply-quote'), 'admin.css must define .message-reply-quote');
    assert.ok(adminCss.includes('replyHighlightPulse'), 'admin.css must define pulse keyframes');
  });

  test('7. Client Scripts: JavaScript files expose standard reply methods', () => {
    const rootDir = path.join(__dirname, '..');
    const userChatJs = fs.readFileSync(path.join(rootDir, 'public', 'assets', 'js', 'user-chat.js'), 'utf8');
    const adminChatJs = fs.readFileSync(path.join(rootDir, 'public', 'assets', 'js', 'admin-chat.js'), 'utf8');

    // متدهای فرانت‌اند کاربر
    assert.ok(userChatJs.includes('stageUserReply'), 'user-chat.js must define stageUserReply');
    assert.ok(userChatJs.includes('cancelUserReply'), 'user-chat.js must define cancelUserReply');
    assert.ok(userChatJs.includes('jumpToMessage'), 'user-chat.js must define jumpToMessage');
    assert.ok(userChatJs.includes('dblclick'), 'user-chat.js must attach double-click reply shortcut');

    // متدهای فرانت‌اند ادمین
    assert.ok(adminChatJs.includes('stageAdminReply'), 'admin-chat.js must define stageAdminReply');
    assert.ok(adminChatJs.includes('cancelAdminReply'), 'admin-chat.js must define cancelAdminReply');
    assert.ok(adminChatJs.includes('jumpToAdminMessage'), 'admin-chat.js must define jumpToAdminMessage');
    assert.ok(adminChatJs.includes('dblclick'), 'admin-chat.js must attach double-click reply shortcut');
  });
});
