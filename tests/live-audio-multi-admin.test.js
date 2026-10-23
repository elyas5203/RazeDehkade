/**
 * tests/live-audio-multi-admin.test.js
 * تست‌های جامع و اعتبارسنجی:
 * ۱. شنود پیش‌فرض صدای کلاس با ورود دانش‌آموز (Default Audio Streaming)
 * ۲. شنود هم‌زمان چند ادمین بدون قطعی یا تداخل (Multi-Admin Non-Colliding Listening)
 * ۳. ایزولاسیون کامل توقف شنود (Stop Admin 1 does NOT stop Admin 2)
 * ۴. رله باینری ADPCM و عدم نشت صدا میان کلاس‌های مختلف
 * ۵. تاب‌آوری ۵۰ کاربر فعال هم‌زمان (50 Concurrent Sockets Stress & Memory Stability)
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const cors = require('cors');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.USE_IN_MEMORY_DB = 'true';
process.env.JWT_SECRET = 'test_secret_for_multi_admin_audio_123';

const { runMigrations } = require('../src/db/migrate');
const setupSocketIO = require('../src/socket');
const Session = require('../src/models/Session');
const Admin = require('../src/models/Admin');

describe('Live Audio Broadcast, Multi-Admin Non-Collision & 50-User Concurrency Tests', function () {
  let app;
  let server;
  let io;
  let serverUrl;
  let adminToken1;
  let adminToken2;
  let adminToken3;
  let session1;
  let session2;
  let studentToken1;
  let studentToken2;

  before(async function () {
    await runMigrations();

    app = express();
    app.use(cors());
    app.use(express.json());

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

    // ایجاد کلاس‌های آزمایشی
    session1 = await Session.create({
      class_name: 'کلاس شهید چمران',
      order_code: 'TEST-AUD-01',
      access_code: '111111',
    });

    session2 = await Session.create({
      class_name: 'کلاس دکتر حسابی',
      order_code: 'TEST-AUD-02',
      access_code: '222222',
    });

    // ایجاد ادمین‌ها و توکن‌ها
    const admin1 = await Admin.create({ username: 'audio_admin_1', password: 'password', display_name: 'کارآگاه ۱' });
    const admin2 = await Admin.create({ username: 'audio_admin_2', password: 'password', display_name: 'کارآگاه ۲' });
    const admin3 = await Admin.create({ username: 'audio_admin_3', password: 'password', display_name: 'کارآگاه ۳' });

    adminToken1 = jwt.sign({ id: admin1.id, role: 'admin', username: admin1.username }, process.env.JWT_SECRET);
    adminToken2 = jwt.sign({ id: admin2.id, role: 'admin', username: admin2.username }, process.env.JWT_SECRET);
    adminToken3 = jwt.sign({ id: admin3.id, role: 'admin', username: admin3.username }, process.env.JWT_SECRET);

    studentToken1 = jwt.sign({ id: 101, role: 'user', sessionId: session1.id, orderCode: session1.order_code }, process.env.JWT_SECRET);
    studentToken2 = jwt.sign({ id: 102, role: 'user', sessionId: session2.id, orderCode: session2.order_code }, process.env.JWT_SECRET);
  });

  after(async function () {
    if (io) io.close();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  function createSocket(token) {
    return ioClient(serverUrl, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });
  }

  it('1. Multi-Admin Simultaneous Listening: Admin 1 and Admin 2 receive audio packets concurrently without collision', async function () {
    const studentSocket = createSocket(studentToken1);
    const admin1Socket = createSocket(adminToken1);
    const admin2Socket = createSocket(adminToken2);

    await Promise.all([
      new Promise(r => studentSocket.on('connect', r)),
      new Promise(r => admin1Socket.on('connect', r)),
      new Promise(r => admin2Socket.on('connect', r)),
    ]);

    // دانش‌آموز به روم جلسه جوین می‌شود
    studentSocket.emit('join_session', { sessionId: session1.id });

    // ادمین ۱ شروع به شنود جلسه ۱ می‌کند
    const admin1StartedPromise = new Promise(r => admin1Socket.on('admin_audio_stream_started_ack', r));
    admin1Socket.emit('start_audio_stream', { sessionId: session1.id });
    const ack1 = await admin1StartedPromise;
    assert.strictEqual(ack1.sessionId, Number(session1.id));
    assert.strictEqual(ack1.listenerCount, 1);

    // ادمین ۲ نیز به شنود همان جلسه ۱ می‌پیوندد (کلیدسناریوی تسک کارفرما)
    const admin2StartedPromise = new Promise(r => admin2Socket.on('admin_audio_stream_started_ack', r));
    admin2Socket.emit('start_audio_stream', { sessionId: session1.id });
    const ack2 = await admin2StartedPromise;
    assert.strictEqual(ack2.sessionId, Number(session1.id));
    assert.strictEqual(ack2.listenerCount, 2);

    // هر دو ادمین هنوز متصل و آنلاین هستند
    assert.strictEqual(admin1Socket.connected, true, 'ادمین ۱ نباید قطع شود');
    assert.strictEqual(admin2Socket.connected, true, 'ادمین ۲ نباید قطع شود');

    // دانش‌آموز بسته صوتی ۸ کیلوهرتز ADPCM ارسال می‌کند
    const samplePacket = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A]);

    const admin1PacketPromise = new Promise(r => admin1Socket.once('admin_audio_stream_adpcm', r));
    const admin2PacketPromise = new Promise(r => admin2Socket.once('admin_audio_stream_adpcm', r));

    studentSocket.emit('audio_stream_adpcm', {
      sessionId: session1.id,
      packet: samplePacket,
    });

    const [admin1Recv, admin2Recv] = await Promise.all([admin1PacketPromise, admin2PacketPromise]);

    assert.strictEqual(admin1Recv.sessionId, Number(session1.id));
    assert.strictEqual(admin2Recv.sessionId, Number(session1.id));
    assert.strictEqual(Buffer.compare(Buffer.from(admin1Recv.packet), samplePacket), 0);
    assert.strictEqual(Buffer.compare(Buffer.from(admin2Recv.packet), samplePacket), 0);

    // پاکسازی
    studentSocket.disconnect();
    admin1Socket.disconnect();
    admin2Socket.disconnect();
  });

  it('2. Isolated Stop Stream: Stopping Admin 1 does NOT stop audio for Admin 2; only when all admins stop is audio_stream_stopped emitted', async function () {
    const studentSocket = createSocket(studentToken1);
    const admin1Socket = createSocket(adminToken1);
    const admin2Socket = createSocket(adminToken2);

    await Promise.all([
      new Promise(r => studentSocket.on('connect', r)),
      new Promise(r => admin1Socket.on('connect', r)),
      new Promise(r => admin2Socket.on('connect', r)),
    ]);

    studentSocket.emit('join_session', { sessionId: session1.id });

    // ثبت شنود برای هر دو ادمین
    const a1AckPromise = new Promise(r => admin1Socket.on('admin_audio_stream_started_ack', r));
    admin1Socket.emit('start_audio_stream', { sessionId: session1.id });
    await a1AckPromise;

    const a2AckPromise = new Promise(r => admin2Socket.on('admin_audio_stream_started_ack', r));
    admin2Socket.emit('start_audio_stream', { sessionId: session1.id });
    await a2AckPromise;

    let studentStoppedReceived = false;
    studentSocket.on('audio_stream_stopped', () => {
      studentStoppedReceived = true;
    });

    // ادمین ۱ روی توقف شنود کلیک می‌کند
    const a1StopPromise = new Promise(r => admin1Socket.on('admin_audio_stream_stopped_ack', r));
    admin1Socket.emit('stop_audio_stream', { sessionId: session1.id });
    const stopAck1 = await a1StopPromise;
    assert.strictEqual(stopAck1.remainingCount, 1, 'هنوز ۱ ادمین باقی مانده است');

    // کمی صبر می‌کنیم تا مطمئن شویم پیام stop به دانش‌آموز نرفته است
    await new Promise(r => setTimeout(r, 80));
    assert.strictEqual(studentStoppedReceived, false, 'کلاس نباید استریم را قطع کند زیرا ادمین ۲ هنوز در حال شنود است!');

    // ارسال مجدد بسته توسط دانش‌آموز: ادمین ۲ باید دریافت کند اما ادمین ۱ نباید دریافت کند
    let admin1GotLatePacket = false;
    admin1Socket.on('admin_audio_stream_adpcm', () => { admin1GotLatePacket = true; });

    const admin2RecvPromise = new Promise(r => admin2Socket.once('admin_audio_stream_adpcm', r));

    studentSocket.emit('audio_stream_adpcm', {
      sessionId: session1.id,
      packet: Buffer.from([0xAA, 0xBB, 0xCC, 0xDD, 0xEE]),
    });

    const admin2Recv = await admin2RecvPromise;
    assert.ok(admin2Recv, 'ادمین ۲ بسته را بدون وقفه دریافت کرد');
    assert.strictEqual(admin1GotLatePacket, false, 'ادمین ۱ پس از توقف نباید بسته جدید دریافت کند');

    // حالا ادمین ۲ نیز متوقف می‌شود
    const a2StopPromise = new Promise(r => admin2Socket.on('admin_audio_stream_stopped_ack', r));
    const studentStopPromise = new Promise(r => studentSocket.on('audio_stream_stopped', r));

    admin2Socket.emit('stop_audio_stream', { sessionId: session1.id });
    const [stopAck2, studentStopEvent] = await Promise.all([a2StopPromise, studentStopPromise]);

    assert.strictEqual(stopAck2.remainingCount, 0);
    assert.strictEqual(studentStopEvent.sessionId, Number(session1.id));
    assert.strictEqual(studentStopEvent.listenerCount, 0);

    studentSocket.disconnect();
    admin1Socket.disconnect();
    admin2Socket.disconnect();
  });

  it('3. Audio Session Isolation: Admin listening to Session 2 never receives Session 1 audio', async function () {
    const student1 = createSocket(studentToken1);
    const adminOther = createSocket(adminToken3);

    await Promise.all([
      new Promise(r => student1.on('connect', r)),
      new Promise(r => adminOther.on('connect', r)),
    ]);

    student1.emit('join_session', { sessionId: session1.id });

    // ادمین ۳ به جلسه ۲ گوش می‌دهد
    const a3Ack = new Promise(r => adminOther.on('admin_audio_stream_started_ack', r));
    adminOther.emit('start_audio_stream', { sessionId: session2.id });
    await a3Ack;

    let admin3ReceivedLeakedPacket = false;
    adminOther.on('admin_audio_stream_adpcm', () => {
      admin3ReceivedLeakedPacket = true;
    });

    // دانش‌آموز جلسه ۱ استریم می‌فرستد
    student1.emit('audio_stream_adpcm', {
      sessionId: session1.id,
      packet: Buffer.from([0x11, 0x22, 0x33, 0x44, 0x55]),
    });

    await new Promise(r => setTimeout(r, 100));
    assert.strictEqual(admin3ReceivedLeakedPacket, false, 'صدای کلاس ۱ هرگز نباید به ادمین شنودگر کلاس ۲ نشت کند');

    student1.disconnect();
    adminOther.disconnect();
  });

  it('4. High Concurrency Capacity: 50 active concurrent sockets exchange messages and audio smoothly without crash or race conditions', async function () {
    const TOTAL_USERS = 50;
    const sockets = [];
    const connectPromises = [];

    const memBefore = process.memoryUsage().heapUsed;

    // ایجاد ۵۰ کلاینت سوکت همزمان (۴۰ دانش‌آموز و ۱۰ ادمین)
    for (let i = 0; i < TOTAL_USERS; i++) {
      const isAdm = i >= 40;
      let token;
      if (isAdm) {
        token = jwt.sign({ id: 900 + i, role: 'admin', username: `stress_admin_${i}` }, process.env.JWT_SECRET);
      } else {
        token = jwt.sign({ id: 200 + i, role: 'user', sessionId: session1.id }, process.env.JWT_SECRET);
      }

      const s = createSocket(token);
      sockets.push(s);
      connectPromises.push(new Promise((resolve) => s.on('connect', resolve)));
    }

    await Promise.all(connectPromises);
    assert.strictEqual(sockets.length, 50);

    // همه دانش‌آموزان به روم جلسه ۱ جوین می‌شوند
    for (let i = 0; i < 40; i++) {
      sockets[i].emit('join_session', { sessionId: session1.id });
    }

    // ۱۰ ادمین به عنوان شنودگر جلسه ۱ ثبت‌نام می‌کنند
    const adminStartPromises = [];
    for (let i = 40; i < 50; i++) {
      adminStartPromises.push(new Promise((resolve) => {
        sockets[i].once('admin_audio_stream_started_ack', resolve);
        sockets[i].emit('start_audio_stream', { sessionId: session1.id });
      }));
    }
    const adminAcks = await Promise.all(adminStartPromises);
    assert.strictEqual(adminAcks.length, 10);
    // آخرین ادمین باید تعداد ۱۰ شنودگر فعال را گزارش کند
    const lastAck = adminAcks[adminAcks.length - 1];
    assert.ok(lastAck.listenerCount >= 10);

    // استریم همزمان پکت‌های صوتی از چندین دانش‌آموز به سرور و توزیع به ۱۰ ادمین
    const audioPacketsCount = 20;
    const packetDeliveries = [];

    // ادمین ۴۵ بسته‌های دریافتی را می‌شمارد
    let receivedByAdmin45 = 0;
    sockets[45].on('admin_audio_stream_adpcm', () => {
      receivedByAdmin45++;
    });

    for (let p = 0; p < audioPacketsCount; p++) {
      const senderIdx = p % 40;
      sockets[senderIdx].emit('audio_stream_adpcm', {
        sessionId: session1.id,
        packet: Buffer.from([p, p + 1, p + 2, p + 3, p + 4, p + 5]),
      });
    }

    await new Promise(r => setTimeout(r, 200));
    assert.ok(receivedByAdmin45 > 0, 'ادمین شنودگر پکت‌های صوتی را در بار سنگین همزمانی دریافت کرد');

    // ارسال همزمان پیام چت توسط ۱۰ کاربر مختلف
    const messagePromises = [];
    for (let i = 0; i < 10; i++) {
      messagePromises.push(new Promise((resolve) => {
        sockets[i].emit('send_message', {
          sessionId: session1.id,
          content: `پیام تست پایداری همزمانی ۵۰ کاربر شماره ${i}`,
          senderType: 'user',
        }, (ack) => {
          resolve(ack);
        });
      }));
    }

    const acks = await Promise.all(messagePromises);
    for (const ack of acks) {
      assert.strictEqual(ack.success, true);
      assert.ok(ack.message && ack.message.id > 0);
    }

    // بررسی سلامت حافظه پس از ۵۰ کاربر همزمان
    const memAfter = process.memoryUsage().heapUsed;
    const memDiffMB = (memAfter - memBefore) / (1024 * 1024);
    // مصرف حافظه نباید رشد نامتعارف (مثلاً بالای ۱۰۰ مگابایت) داشته باشد
    assert.ok(memDiffMB < 100, `Memory delta should be minimal under load (was ${memDiffMB.toFixed(2)} MB)`);

    // قطع ارتباط امن تمام ۵۰ سوکت
    for (const s of sockets) {
      s.disconnect();
    }
  });

  it('5. Source Code Verification: user-chat.js default streaming and multi-peer RTCPeerConnection Map exist', function () {
    const fs = require('fs');
    const path = require('path');
    const userChatCode = fs.readFileSync(path.join(__dirname, '../public/assets/js/user-chat.js'), 'utf8');

    // ۱. بررسی آغاز خودکار استریم در initUserMicrophone
    assert.ok(userChatCode.includes('startPcmAudioStream()'), 'user-chat.js باید استریم پیش‌فرض را آغاز کند');
    assert.ok(userChatCode.includes('آغاز استریم پیش‌فرض'), 'لاگ فعال‌سازی استریم پیش‌فرض وجود دارد');

    // ۲. بررسی وجود ساختار چندپیر livePeersMap و عدم قطع اتصال سایر ادمین‌ها
    assert.ok(userChatCode.includes('const livePeersMap = new Map()'), 'livePeersMap برای مدیریت مستقل ارتباط هر ادمین تعریف شده است');
    assert.ok(userChatCode.includes('closeAllLivePeers'), 'تابع پاکسازی کامل peerها تعریف شده است');
    assert.ok(!userChatCode.includes('if (pc.connectionState === \'connected\') stopPcmAudioStream(false);'), 'نباید استریم سوکت ADPCM با اتصال وب‌آرتی‌سی قطع گردد');

    // ۳. بررسی admin-chat.js
    const adminChatCode = fs.readFileSync(path.join(__dirname, '../public/assets/js/admin-chat.js'), 'utf8');
    assert.ok(adminChatCode.includes('admin_audio_stream_started_ack'), 'admin-chat.js تاییدیه اتصال شنود را دریافت می‌کند');
    assert.ok(adminChatCode.includes('admin_audio_stream_stopped_ack'), 'admin-chat.js تاییدیه توقف شنود را دریافت می‌کند');
    assert.ok(adminChatCode.includes('nextPcmPlayTime > now + 0.35'), 'بافر جیتر صوتی پویا و روان در ادمین فعال است');
  });
});
