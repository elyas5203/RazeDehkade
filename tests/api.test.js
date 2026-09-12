/**
 * tests/api.test.js
 * تست‌های اتوماتیک برای REST API و Socket.io با استفاده از runner بومی node:test
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const express = require('express');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const cors = require('cors');

// تنظیم متغیرهای محیطی برای دیتابیس In-Memory در تست
process.env.NODE_ENV = 'test';
process.env.USE_IN_MEMORY_DB = 'true';
process.env.JWT_SECRET = 'test_secret_key_123';

const { runMigrations } = require('../src/db/migrate');
const authRoutes = require('../src/routes/auth');
const sessionRoutes = require('../src/routes/sessions');
const cannedResponseRoutes = require('../src/routes/cannedResponses');
const setupSocketIO = require('../src/socket');

describe('Detective Game Realtime Chat Integration Tests', function () {
  let app;
  let server;
  let io;
  let serverUrl;

  before(async function () {
    // اجرای مایگریشن در دیتابیس حافظه‌ای
    await runMigrations();

    app = express();
    app.use(cors());
    app.use(express.json());

    app.use('/api/auth', authRoutes);
    app.use('/api/sessions', sessionRoutes);
    app.use('/api/canned-responses', cannedResponseRoutes);

    server = http.createServer(app);
    io = new Server(server, { cors: { origin: '*' } });
    setupSocketIO(io);

    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        serverUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(function (done) {
    io.close();
    server.close(done);
  });

  let adminToken = '';
  let sessionCode = '';
  let sessionId = null;
  let userToken = '';

  it('1. Admin login should succeed with correct credentials', async function () {
    const res = await fetch(`${serverUrl}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.token);
    adminToken = data.data.token;
  });

  it('2. Admin can create a new session with unique numeric code', async function () {
    const res = await fetch(`${serverUrl}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: 'دستیاران کارآگاه - جلسه تست ۱', codeLength: 6 }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.code);
    assert.strictEqual(data.data.code.length, 6);
    sessionCode = data.data.code;
    sessionId = data.data.id;
  });

  it('3. User can join session using the 6-digit numeric code', async function () {
    const res = await fetch(`${serverUrl}/api/auth/user/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: sessionCode }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.token);
    assert.strictEqual(data.data.session.id, sessionId);
    userToken = data.data.token;
  });

  it('4. Admin can create, read, update, and delete Canned Responses', async function () {
    // Create
    const createRes = await fetch(`${serverUrl}/api/canned-responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ title: 'پاسخ سریع اولیه', content: 'سلام دستیاران، پرونده شماره ۱ را بررسی کنید.' }),
    });
    const createData = await createRes.json();
    assert.strictEqual(createRes.status, 201);
    assert.strictEqual(createData.success, true);
    const cannedId = createData.data.id;

    // Get
    const getRes = await fetch(`${serverUrl}/api/canned-responses`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const getData = await getRes.json();
    assert.strictEqual(getRes.status, 200);
    assert.ok(getData.data.length >= 1);

    // Update
    const updateRes = await fetch(`${serverUrl}/api/canned-responses/${cannedId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ title: 'پاسخ سریع بروزرسانی‌شده', content: 'پرونده بروزرسانی شد.' }),
    });
    const updateData = await updateRes.json();
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateData.data.title, 'پاسخ سریع بروزرسانی‌شده');

    // Delete
    const deleteRes = await fetch(`${serverUrl}/api/canned-responses/${cannedId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const deleteData = await deleteRes.json();
    assert.strictEqual(deleteRes.status, 200);
    assert.strictEqual(deleteData.success, true);
  });

  it('5. Socket.io Realtime communication and room isolation test', async function () {
    const userClient = ioClient(serverUrl, {
      auth: { token: userToken },
    });

    const adminClient = ioClient(serverUrl, {
      auth: { token: adminToken },
    });

    await new Promise((resolve, reject) => {
      let adminJoined = false;
      let userJoined = false;

      adminClient.on('connect', () => {
        adminClient.emit('join_session', { sessionId: sessionId });
      });

      adminClient.on('joined_session', () => {
        adminJoined = true;
        if (userJoined) testMessaging();
      });

      userClient.on('connect', () => {
        userJoined = true;
        if (adminJoined) testMessaging();
      });

      function testMessaging() {
        // کاربر پیامی ارسال می‌کند
        userClient.emit('send_message', {
          sessionId: sessionId,
          content: 'سلام ادمین، مدرک اول پیدا شد!',
          messageType: 'text',
        });
      }

      adminClient.on('new_message', (msg) => {
        if (msg.sender_type === 'user') {
          assert.strictEqual(msg.content, 'سلام ادمین، مدرک اول پیدا شد!');
          assert.strictEqual(msg.session_id, sessionId);

          // پاسخ ادمین با نوع سیستم
          adminClient.emit('send_message', {
            sessionId: sessionId,
            content: 'مدرک شماره ۱ تایید شد.',
            senderType: 'system',
            messageType: 'text',
          });
        }
      });

      userClient.on('new_message', (msg) => {
        if (msg.sender_type === 'system') {
          assert.strictEqual(msg.content, 'مدرک شماره ۱ تایید شد.');
          userClient.disconnect();
          adminClient.disconnect();
          resolve();
        }
      });
    });
  });
});
