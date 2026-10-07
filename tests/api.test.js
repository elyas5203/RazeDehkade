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
const fs = require('node:fs');
const path = require('node:path');

// تنظیم متغیرهای محیطی برای دیتابیس In-Memory در تست
process.env.NODE_ENV = 'test';
process.env.USE_IN_MEMORY_DB = 'true';
process.env.JWT_SECRET = 'test_secret_key_123';

const { runMigrations } = require('../src/db/migrate');
const authRoutes = require('../src/routes/auth');
const sessionRoutes = require('../src/routes/sessions');
const cannedResponseRoutes = require('../src/routes/cannedResponses');
const storeRoutes = require('../src/routes/store');
const uploadRoutes = require('../src/routes/upload');
const mediaLibraryRoutes = require('../src/routes/mediaLibrary');
const weeklyContentRoutes = require('../src/routes/weeklyContent');
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
    app.use('/api/store', storeRoutes);
    app.use('/api/upload', uploadRoutes);
    app.use('/api/media-library', mediaLibraryRoutes);
    app.use('/api/weekly-content', weeklyContentRoutes);

    server = http.createServer(app);
    io = new Server(server, { cors: { origin: '*' } });
    app.set('io', io);
    setupSocketIO(io);

    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        serverUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async function () {
    if (io) io.close();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  let adminToken = '';
  let sessionCode = '';
  let orderCode = '';
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
    assert.ok(data.data.order_code);
    assert.ok(data.data.chat_code);
    assert.strictEqual(data.data.active_case, 'village');
    assert.notStrictEqual(data.data.order_code, data.data.chat_code);
    sessionCode = data.data.code;
    orderCode = data.data.order_code;
    sessionId = data.data.id;
  });

  it('2b. Admin can update and delete a session via API', async function () {
    // 1. Create a dummy session to edit and delete
    const createRes = await fetch(`${serverUrl}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'جلسه آزمایشی برای ویرایش' }),
    });
    const createData = await createRes.json();
    assert.strictEqual(createRes.status, 201);
    const targetId = createData.data.id;

    // 2. Edit session name and status
    const updateRes = await fetch(`${serverUrl}/api/sessions/${targetId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'نام ویرایش شده جلسه', status: 'completed' }),
    });
    const updateData = await updateRes.json();
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateData.data.name, 'نام ویرایش شده جلسه');
    assert.strictEqual(updateData.data.status, 'completed');

    // 3. Delete session
    const deleteRes = await fetch(`${serverUrl}/api/sessions/${targetId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const deleteData = await deleteRes.json();
    assert.strictEqual(deleteRes.status, 200);
    assert.strictEqual(deleteData.success, true);
  });

  it('3a. Order code cannot open chat, and chat code cannot place an order', async function () {
    const wrongJoin = await fetch(`${serverUrl}/api/auth/user/join`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: orderCode }),
    });
    assert.strictEqual(wrongJoin.status, 404);
    assert.strictEqual((await wrongJoin.json()).message, 'کد روی بسته اشتباه است.');

    const wrongOrder = await fetch(`${serverUrl}/api/store/order`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'تست', discountCode: sessionCode, items: [] }),
    });
    assert.strictEqual(wrongOrder.status, 400);
    assert.strictEqual((await wrongOrder.json()).message, 'کد تخفیف نامعتبر است.');
  });

  it('3b. Existing session accepts one order and rejects a duplicate countdown', async function () {
    const body = { customerName: 'گروه تست', phone: '09120000000', address: 'کلاس', discountCode: orderCode, items: [{ id: 1, qty: 1 }] };
    const first = await fetch(`${serverUrl}/api/store/order`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const firstData = await first.json();
    assert.strictEqual(first.status, 200);
    assert.strictEqual(firstData.data.orderId, sessionId);
    assert.strictEqual(firstData.data.chatCode, undefined);

    const duplicate = await fetch(`${serverUrl}/api/store/order`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    assert.strictEqual(duplicate.status, 400);
  });

  it('3c. Authenticated media upload works and rejects executable files', async function () {
    const okForm = new FormData();
    okForm.append('file', new Blob(['evidence'], { type: 'text/plain' }), 'evidence.txt');
    const ok = await fetch(`${serverUrl}/api/upload`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${adminToken}` }, body: okForm,
    });
    const okData = await ok.json();
    assert.strictEqual(ok.status, 200);
    assert.strictEqual(okData.data.messageType, 'file');
    fs.unlinkSync(path.join(__dirname, '..', 'public', 'uploads', path.basename(okData.data.fileUrl)));

    const badForm = new FormData();
    badForm.append('file', new Blob(['bad']), 'payload.exe');
    const bad = await fetch(`${serverUrl}/api/upload`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${adminToken}` }, body: badForm,
    });
    assert.strictEqual(bad.status, 400);
  });

  it('3d. Media library is admin-only, rejects traversal, and stores video messages', async function () {
    const mediaPath = path.join(__dirname, '..', 'public', 'media-library', 'videos', 'test-progressive.mp4');
    fs.writeFileSync(mediaPath, 'test-video');
    try {
      const anonymous = await fetch(`${serverUrl}/api/media-library`);
      assert.strictEqual(anonymous.status, 401);

      await fetch(`${serverUrl}/api/media-library`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ name: 'videos/test-progressive.mp4', type: 'video', title: 'فیلم ورودی آسیاب' })
      });

      const list = await fetch(`${serverUrl}/api/media-library`, { headers: { Authorization: `Bearer ${adminToken}` } });
      const listData = await list.json();
      assert.ok(listData.data.some(file => file.name === 'videos/test-progressive.mp4' && file.type === 'video'));

      const traversal = await fetch(`${serverUrl}/api/media-library/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ sessionId, name: '../package.json' }),
      });
      assert.strictEqual(traversal.status, 400);

      const sent = await fetch(`${serverUrl}/api/media-library/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ sessionId, name: 'videos/test-progressive.mp4', title: 'فیلم ورودی آسیاب' }),
      });
      const sentData = await sent.json();
      assert.strictEqual(sent.status, 201);
      assert.strictEqual(sentData.data.message_type, 'video');
      assert.strictEqual(sentData.data.file_url, '/media-library/videos/test-progressive.mp4');
    } finally {
      fs.unlinkSync(mediaPath);
    }
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

  it('5b. Admin can edit and delete any chat message via Socket.io', async function () {
    const userClient = ioClient(serverUrl, { auth: { token: userToken } });
    const adminClient = ioClient(serverUrl, { auth: { token: adminToken } });

    await new Promise((resolve) => {
      let adminReady = false;
      let userReady = false;

      adminClient.on('connect', () => {
        adminClient.emit('join_session', { sessionId: sessionId });
      });

      adminClient.on('joined_session', () => {
        adminReady = true;
        if (userReady) startTest();
      });

      userClient.on('connect', () => {
        userReady = true;
        if (adminReady) startTest();
      });

      function startTest() {
        userClient.emit('send_message', {
          sessionId: sessionId,
          content: 'متن اولیه پیام کاربر',
          messageType: 'text',
        });
      }

      adminClient.on('new_message', (msg) => {
        if (msg.content === 'متن اولیه پیام کاربر') {
          // ویرایش پیام کاربر توسط ادمین
          adminClient.emit('edit_message', { messageId: msg.id, content: 'متن ویرایش‌شده کاربر توسط ادمین' }, (res) => {
            assert.strictEqual(res.success, true);
            assert.strictEqual(res.content, 'متن ویرایش‌شده کاربر توسط ادمین');

            // حذف پیام توسط ادمین
            adminClient.emit('delete_message', { messageId: msg.id }, (delRes) => {
              assert.strictEqual(delRes.success, true);
              userClient.disconnect();
              adminClient.disconnect();
              resolve();
            });
          });
        }
      });
    });
  });

  it('6. Separate sessions do not receive each other messages or hack events', async function () {
    const createRes = await fetch(`${serverUrl}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'جلسه ایزوله دوم', codeLength: 6 }),
    });
    const second = (await createRes.json()).data;
    const joinRes = await fetch(`${serverUrl}/api/auth/user/join`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: second.chat_code }),
    });
    const secondToken = (await joinRes.json()).data.token;

    const firstUser = ioClient(serverUrl, { auth: { token: userToken } });
    const secondUser = ioClient(serverUrl, { auth: { token: secondToken } });
    const admin = ioClient(serverUrl, { auth: { token: adminToken } });
    let leaked = false;
    secondUser.on('new_message', () => { leaked = true; });
    secondUser.on('hack_sequence_triggered', () => { leaked = true; });

    await Promise.all([
      new Promise(resolve => firstUser.on('connect', resolve)),
      new Promise(resolve => secondUser.on('connect', resolve)),
      new Promise(resolve => admin.on('connect', resolve)),
    ]);
    admin.emit('join_session', { sessionId });
    await new Promise(resolve => admin.once('joined_session', resolve));
    admin.emit('send_message', { sessionId, content: 'فقط جلسه اول', senderType: 'system' });
    admin.emit('trigger_hack_sequence', { sessionId });
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.strictEqual(leaked, false);

    firstUser.disconnect();
    secondUser.disconnect();
    admin.disconnect();
  });

  it('7. Order notifications remain admin-only and forged cross-session messages are rejected', async function () {
    const created = await fetch(`${serverUrl}/api/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ name: 'Isolation audit' }) });
    const target = (await created.json()).data;
    const joined = await fetch(`${serverUrl}/api/auth/user/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: target.chat_code }) });
    const targetToken = (await joined.json()).data.token;
    const first = ioClient(serverUrl, { auth: { token: userToken } });
    const other = ioClient(serverUrl, { auth: { token: targetToken } });
    const admin = ioClient(serverUrl, { auth: { token: adminToken } });
    const leaked = [];
    const forbidden = ['new_store_order', 'order_countdown_tick', 'session_updated'];
    forbidden.forEach(name => first.on(name, () => leaked.push(name)));
    other.on('new_message', () => leaked.push('cross-session message'));
    other.on('user_typing', () => leaked.push('cross-session typing'));
    try {
      await Promise.all([first, other, admin].map(client => new Promise((resolve, reject) => { client.once('connect', resolve); client.once('connect_error', reject); })));
      const notification = new Promise(resolve => admin.once('new_store_order', resolve));
      await fetch(`${serverUrl}/api/store/order`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerName: 'Audit', discountCode: target.order_code }) });
      assert.equal((await notification).sessionId, target.id);
      const rejection = new Promise(resolve => first.once('error_message', resolve));
      first.emit('send_message', { sessionId: target.id, content: 'forged' });
      first.emit('typing', { sessionId: target.id, isTyping: true });
      assert.ok((await rejection).message);
      await new Promise(resolve => setTimeout(resolve, 150));
      assert.deepEqual(leaked, []);
      const history = await fetch(`${serverUrl}/api/sessions/${target.id}/messages`, { headers: { Authorization: `Bearer ${targetToken}` } });
      assert.deepEqual((await history.json()).data, []);
    } finally { first.disconnect(); other.disconnect(); admin.disconnect(); }
  });

  it('8. Validate 100% discount code route', async function () {
    const validRes = await fetch(`${serverUrl}/api/store/validate-discount`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discountCode: orderCode }),
    });
    const validData = await validRes.json();
    assert.strictEqual(validRes.status, 200);
    assert.strictEqual(validData.success, true);
    assert.strictEqual(validData.data.discountPercent, 100);

    const invalidRes = await fetch(`${serverUrl}/api/store/validate-discount`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discountCode: '00000000' }),
    });
    assert.strictEqual(invalidRes.status, 404);
  });

  it('9. Teacher phone registration on order and teacher check endpoint', async function () {
    const testPhone = '09121112233';
    const checkBefore = await fetch(`${serverUrl}/api/auth/teacher/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone }),
    });
    assert.strictEqual(checkBefore.status, 404);

    const Teacher = require('../src/models/Teacher');
    await Teacher.registerOrUpdate({
      phone: testPhone,
      full_name: 'مدرس تست',
      session_id: sessionId,
    });

    const checkAfter = await fetch(`${serverUrl}/api/auth/teacher/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone }),
    });
    const checkAfterData = await checkAfter.json();
    assert.strictEqual(checkAfter.status, 200);
    assert.strictEqual(checkAfterData.registered, true);
    assert.strictEqual(checkAfterData.data.phone, testPhone);
  });

  it('10. Weekly scenario content API (5 Weeks)', async function () {
    const week1Res = await fetch(`${serverUrl}/api/weekly-content?week=1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const week1Data = await week1Res.json();
    assert.strictEqual(week1Res.status, 200);
    assert.strictEqual(week1Data.success, true);
    assert.ok(Array.isArray(week1Data.data));
    assert.ok(week1Data.data.length > 0);

    const createRes = await fetch(`${serverUrl}/api/weekly-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        week: 2,
        orderNum: 10,
        contentType: 'text',
        title: 'پیام تست سناریو هفته ۲',
        textContent: 'محتوای آزمایشی',
      }),
    });
    const createData = await createRes.json();
    assert.strictEqual(createRes.status, 201);
    assert.strictEqual(createData.success, true);
    const newId = createData.data.id;

    const delRes = await fetch(`${serverUrl}/api/weekly-content/${newId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(delRes.status, 200);
  });

  it('11. Chat lock toggle and student message rejection when locked', async function () {
    const Session = require('../src/models/Session');
    assert.strictEqual(await Session.isChatLocked(sessionId), false);

    await Session.setChatLock(sessionId, true);
    assert.strictEqual(await Session.isChatLocked(sessionId), true);

    const user = ioClient(serverUrl, { auth: { token: userToken } });
    try {
      await new Promise((resolve, reject) => {
        user.once('connect', resolve);
        user.once('connect_error', reject);
      });

      const rejection = await new Promise((resolve) => {
        user.once('error_message', resolve);
        user.emit('send_message', {
          sessionId,
          content: 'پیام در وضعیت قفل',
        });
      });
      assert.strictEqual(rejection.code, 'CHAT_LOCKED');
    } finally {
      user.disconnect();
      await Session.setChatLock(sessionId, false);
    }
  });

  it('12. Student voice message (user_voice) accepted and broadcasted', async function () {
    const user = ioClient(serverUrl, { auth: { token: userToken } });
    const admin = ioClient(serverUrl, { auth: { token: adminToken } });
    try {
      await Promise.all([user, admin].map(c => new Promise((resolve, reject) => {
        c.once('connect', resolve);
        c.once('connect_error', reject);
      })));

      await new Promise(resolve => {
        admin.emit('join_session', { sessionId });
        admin.once('joined_session', resolve);
      });

      const messagePromise = new Promise(resolve => {
        admin.on('new_message', (msg) => {
          if (msg.message_type === 'user_voice') resolve(msg);
        });
      });

      user.emit('send_message', {
        sessionId,
        content: 'voice-note.webm',
        senderType: 'user',
        messageType: 'user_voice',
        fileUrl: '/uploads/voice-123456.webm',
        fileName: 'voice-123456.webm',
      });

      const received = await messagePromise;
      assert.strictEqual(received.message_type, 'user_voice');
      assert.strictEqual(received.file_url, '/uploads/voice-123456.webm');
    } finally {
      user.disconnect();
      admin.disconnect();
    }
  });

  it('13. HTTP Session chat lock toggle endpoint (/api/sessions/:id/lock)', async function () {
    const Session = require('../src/models/Session');
    const lockRes = await fetch(`${serverUrl}/api/sessions/${sessionId}/lock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isLocked: true }),
    });
    const lockData = await lockRes.json();
    assert.strictEqual(lockRes.status, 200);
    assert.strictEqual(lockData.success, true);
    assert.strictEqual(lockData.isLocked, true);
    assert.strictEqual(await Session.isChatLocked(sessionId), true);

    const unlockRes = await fetch(`${serverUrl}/api/sessions/${sessionId}/lock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isLocked: false }),
    });
    const unlockData = await unlockRes.json();
    assert.strictEqual(unlockRes.status, 200);
    assert.strictEqual(unlockData.success, true);
    assert.strictEqual(unlockData.isLocked, false);
    assert.strictEqual(await Session.isChatLocked(sessionId), false);
  });

  it('14. Admin sends media (images, relative library paths) to user chat and traversal is rejected', async function () {
    const user = ioClient(serverUrl, { auth: { token: userToken } });
    const admin = ioClient(serverUrl, { auth: { token: adminToken } });
    try {
      await Promise.all([user, admin].map(c => new Promise((resolve, reject) => {
        c.once('connect', resolve);
        c.once('connect_error', reject);
      })));

      await new Promise(resolve => {
        admin.emit('join_session', { sessionId });
        admin.once('joined_session', resolve);
      });

      // 1. Send relative scenario image (e.g. images/photo1.jpg.png)
      const imagePromise = new Promise(resolve => {
        user.on('new_message', (msg) => {
          if (msg.message_type === 'image') resolve(msg);
        });
      });

      let ackResult = null;
      await new Promise(resolve => {
        admin.emit('send_message', {
          sessionId,
          content: 'عکس آسیاب قدیمی دهکده',
          senderType: 'admin',
          messageType: 'image',
          fileUrl: 'images/photo1.jpg.png',
          fileName: 'photo1.jpg.png',
        }, (res) => {
          ackResult = res;
          resolve();
        });
      });

      assert.strictEqual(ackResult.success, true);
      const receivedImage = await imagePromise;
      assert.strictEqual(receivedImage.message_type, 'image');
      assert.strictEqual(receivedImage.file_url, '/media-library/images/photo1.jpg.png');
      assert.strictEqual(receivedImage.content, 'عکس آسیاب قدیمی دهکده');

      // 2. Reject path traversal
      let rejectAck = null;
      await new Promise(resolve => {
        admin.emit('send_message', {
          sessionId,
          content: 'بدخواهانه',
          senderType: 'admin',
          messageType: 'file',
          fileUrl: '../../etc/passwd',
          fileName: 'passwd',
        }, (res) => {
          rejectAck = res;
          resolve();
        });
      });
      assert.strictEqual(rejectAck.success, false);
    } finally {
      user.disconnect();
      admin.disconnect();
    }
  });
});
