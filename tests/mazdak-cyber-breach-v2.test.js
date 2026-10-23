/**
 * tests/mazdak-cyber-breach-v2.test.js
 * Test Suite for Mazdak Cyber Breach v2 & Emergency Recovery Portal (MASTER-12)
 * Tests DB Schema, Per-Class Isolation, Gatekeeping, Sockets, and Frontend Integration
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');

process.env.NODE_ENV = 'test';
process.env.USE_IN_MEMORY_DB = 'true';
process.env.JWT_SECRET = 'breach_test_secret_12345';

const setupSocketIO = require('../src/socket');
const { query } = require('../src/db/pool');
const authRoutes = require('../src/routes/auth');
const sessionRoutes = require('../src/routes/sessions');
const Session = require('../src/models/Session');
const Admin = require('../src/models/Admin');
const SessionAssistant = require('../src/models/SessionAssistant');
const { generateToken } = require('../src/middleware/auth');

test('Mazdak Cyber Breach v2 & Emergency Recovery Portal (MASTER-12)', async (t) => {
  let app;
  let server;
  let ioServer;
  let port;
  let baseUrl;
  let adminToken;
  let adminRecord;
  let sessionA;
  let sessionB;

  t.before(async () => {
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api/sessions', sessionRoutes);

    server = http.createServer(app);
    ioServer = new Server(server, { cors: { origin: '*' } });
    app.set('io', ioServer);
    setupSocketIO(ioServer);

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // ایجاد ادمین تستی
    adminRecord = await Admin.findByUsername('test_admin_breach');
    if (!adminRecord) {
      adminRecord = await Admin.create({
        username: 'test_admin_breach',
        password: 'password123',
        display_name: 'سرکارآگاه رضوی (فرماندهی)',
        role: 'admin',
      });
    }
    adminToken = generateToken({
      id: adminRecord.id,
      username: adminRecord.username,
      role: 'admin',
      name: adminRecord.display_name,
    });

    // ایجاد دو جلسه مجزا جهت راستی‌آزمایی ایزوله‌سازی کلاسی
    sessionA = await Session.create({
      code: '888111',
      name: 'کلاس شهید چمران (کلاسه ۱۴)',
      assigned_admin_id: adminRecord.id,
    });

    sessionB = await Session.create({
      code: '888222',
      name: 'کلاس فردوسی (کلاسه ۱۵)',
      assigned_admin_id: adminRecord.id,
    });

    // افزودن دستیاران تستی برای جلسه A در دیتابیس
    await query(
      'INSERT INTO session_assistants (session_id, student_name, file_url, file_name, display_order) VALUES (?, ?, ?, ?, ?)',
      [sessionA.id, 'امیرعلی اکبری', '/uploads/assistants/test_akbari.webp', 'test_akbari.webp', 1]
    );
    await query(
      'INSERT INTO session_assistants (session_id, student_name, file_url, file_name, display_order) VALUES (?, ?, ?, ?, ?)',
      [sessionA.id, 'یاسین واحدی', '/uploads/assistants/test_vahedi.webp', 'test_vahedi.webp', 2]
    );
    await query(
      'INSERT INTO session_assistants (session_id, student_name, file_url, file_name, display_order) VALUES (?, ?, ?, ?, ?)',
      [sessionA.id, 'محمد انتظامی', '/uploads/assistants/test_entezami.webp', 'test_entezami.webp', 3]
    );
  });

  t.after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await t.test('1. Database Model & Per-Class Isolation: Session.setHackState operates per-session without cross-talk', async () => {
    assert.strictEqual(await Session.isHacked(sessionA.id), false, 'Session A must start normal');
    assert.strictEqual(await Session.isHacked(sessionB.id), false, 'Session B must start normal');

    // فعال‌سازی نفوذ فقط برای جلسه A
    await Session.setHackState(sessionA.id, true);

    assert.strictEqual(await Session.isHacked(sessionA.id), true, 'Session A must be marked hacked');
    assert.strictEqual(await Session.isHacked(sessionB.id), false, 'Session B must remain unaffected (Strict Isolation)');

    // لغو نفوذ جلسه A
    await Session.setHackState(sessionA.id, false);
    assert.strictEqual(await Session.isHacked(sessionA.id), false, 'Session A must be cleared');
  });

  await t.test('2. API Gatekeeping: Hacked session blocks join at /api/auth/user/join and redirects to /emergency-auth.html', async () => {
    // الف: ورود به جلسه در وضعیت نرمال باید 200 باشد
    const normalRes = await fetch(`${baseUrl}/api/auth/user/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: sessionA.code })
    });
    const normalData = await normalRes.json();
    assert.strictEqual(normalRes.status, 200);
    assert.strictEqual(normalData.success, true);
    assert.ok(normalData.data.token, 'Must return JWT token on normal session');

    // ب: نشان‌دار کردن جلسه به عنوان هک شده
    await Session.setHackState(sessionA.id, true);

    // پ: ورود به جلسه هک‌شده باید با خطای 403 مسدود و هدایت شود
    const hackedRes = await fetch(`${baseUrl}/api/auth/user/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: sessionA.code })
    });
    const hackedData = await hackedRes.json();
    assert.strictEqual(hackedRes.status, 403, 'Must return 403 Forbidden for hacked session');
    assert.strictEqual(hackedData.success, false);
    assert.strictEqual(hackedData.isHacked, true, 'isHacked flag must be true');
    assert.strictEqual(hackedData.redirectUrl, '/emergency-auth.html');
    assert.ok(hackedData.message.includes('نفوذ سایبری'), 'Message must warn about cyber breach');

    // ت: جلسه B هنوز هک نشده و ورود به آن باید 200 باشد
    const bRes = await fetch(`${baseUrl}/api/auth/user/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: sessionB.code })
    });
    assert.strictEqual(bRes.status, 200, 'Session B must remain accessible');

    // ث: بازگشایی قفل جلسه A توسط سرکارآگاه
    await Session.setHackState(sessionA.id, false);
    const unhackedRes = await fetch(`${baseUrl}/api/auth/user/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: sessionA.code })
    });
    assert.strictEqual(unhackedRes.status, 200, 'Session A must be accessible again after unlock');
  });

  await t.test('3. Admin REST Endpoints: trigger-hack and unlock-hack toggle state and return session assistants', async () => {
    // 3.1 Trigger Hack
    const triggerRes = await fetch(`${baseUrl}/api/sessions/${sessionA.id}/trigger-hack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });
    const triggerData = await triggerRes.json();
    assert.strictEqual(triggerRes.status, 200);
    assert.strictEqual(triggerData.success, true);
    assert.strictEqual(triggerData.data.is_hacked, 1);
    assert.ok(Array.isArray(triggerData.data.assistants), 'Must include dynamic assistants array');
    assert.strictEqual(triggerData.data.assistants.length, 3, 'Must have 3 test assistants');
    assert.strictEqual(triggerData.data.assistants[0].student_name, 'امیرعلی اکبری');

    // 3.2 Unlock Hack
    const unlockRes = await fetch(`${baseUrl}/api/sessions/${sessionA.id}/unlock-hack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });
    const unlockData = await unlockRes.json();
    assert.strictEqual(unlockRes.status, 200);
    assert.strictEqual(unlockData.success, true);
    assert.strictEqual(unlockData.data.is_hacked, 0);
  });

  await t.test('4. Realtime Socket.IO: trigger_hack_sequence and unlock_hack_sequence broadcast to room and notify admins', async () => {
    const userTokenA = generateToken({
      sessionId: sessionA.id,
      sessionCode: sessionA.code,
      role: 'user',
      name: 'دستیاران کارآگاه',
      activeCase: 'village',
    });

    const userSocket = ioClient(baseUrl, {
      auth: { token: userTokenA },
      transports: ['websocket'],
    });

    const adminSocket = ioClient(baseUrl, {
      auth: { token: adminToken },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise(r => userSocket.on('connect', r)),
      new Promise(r => adminSocket.on('connect', r)),
    ]);

    // تست trigger_hack_sequence
    const triggerPromise = new Promise((resolve) => {
      userSocket.on('hack_sequence_triggered', (payload) => {
        resolve(payload);
      });
    });

    const adminUpdatedPromise = new Promise((resolve) => {
      adminSocket.on('session_hack_updated', (payload) => {
        resolve(payload);
      });
    });

    adminSocket.emit('trigger_hack_sequence', { sessionId: sessionA.id });

    const receivedPayload = await triggerPromise;
    assert.strictEqual(Number(receivedPayload.sessionId), Number(sessionA.id));
    assert.strictEqual(receivedPayload.isHacked, true);
    assert.ok(Array.isArray(receivedPayload.assistants), 'Socket payload must include dynamic assistants');
    assert.strictEqual(receivedPayload.assistants[0].student_name, 'امیرعلی اکبری');

    const adminNotice = await adminUpdatedPromise;
    assert.strictEqual(Number(adminNotice.sessionId), Number(sessionA.id));
    assert.strictEqual(adminNotice.isHacked, true);

    // تست unlock_hack_sequence
    const unlockPromise = new Promise((resolve) => {
      userSocket.on('hack_cleared', (payload) => {
        resolve(payload);
      });
    });

    adminSocket.emit('unlock_hack_sequence', { sessionId: sessionA.id });

    const unlockPayload = await unlockPromise;
    assert.strictEqual(Number(unlockPayload.sessionId), Number(sessionA.id));
    assert.strictEqual(unlockPayload.isHacked, false);

    userSocket.disconnect();
    adminSocket.disconnect();
  });

  await t.test('5. Frontend Architecture & Static Assets: Emergency Portal and In-Chat Breach Engine files exist', () => {
    const emergencyHtmlPath = path.join(__dirname, '../public/emergency-auth.html');
    const emergencyCssPath = path.join(__dirname, '../public/assets/css/emergency-auth.css');
    const emergencyJsPath = path.join(__dirname, '../public/assets/js/emergency-auth.js');

    assert.ok(fs.existsSync(emergencyHtmlPath), 'public/emergency-auth.html must exist');
    assert.ok(fs.existsSync(emergencyCssPath), 'public/assets/css/emergency-auth.css must exist');
    assert.ok(fs.existsSync(emergencyJsPath), 'public/assets/js/emergency-auth.js must exist');

    const htmlContent = fs.readFileSync(emergencyHtmlPath, 'utf8');
    assert.ok(htmlContent.includes('emergencyPhone'), 'Must contain emergency phone input');
    assert.ok(htmlContent.includes('questionnaireForm'), 'Must contain security clearance questionnaire');
    assert.ok(htmlContent.includes('step3Section'), 'Must contain step 3 success confirmation');

    const engineCssPath = path.join(__dirname, '../public/assets/css/cyber-breach-engine.css');
    const engineJsPath = path.join(__dirname, '../public/assets/js/cyber-breach-engine.js');

    assert.ok(fs.existsSync(engineCssPath), 'public/assets/css/cyber-breach-engine.css must exist');
    assert.ok(fs.existsSync(engineJsPath), 'public/assets/js/cyber-breach-engine.js must exist');

    const cssContent = fs.readFileSync(engineCssPath, 'utf8');
    assert.ok(cssContent.includes('is-corrupted-portrait'), 'Must include chromatic aberration corrupted portrait styles');
    assert.ok(cssContent.includes('emergency-ejection-overlay'), 'Must include emergency ejection modal styles');
    assert.ok(cssContent.includes('electric-arc'), 'Must include evidence threads electric arc styles');

    const jsContent = fs.readFileSync(engineJsPath, 'utf8');
    assert.ok(jsContent.includes('class CyberBreachEngine'), 'Must define CyberBreachEngine');
    assert.ok(jsContent.includes('triggerEmergencyEjectionModal'), 'Must handle 120s ejection modal');
    assert.ok(jsContent.includes('razedehkade.ir'), 'Must prominently present razedehkade.ir domain');

    const chatHtmlPath = path.join(__dirname, '../public/chat.html');
    const chatContent = fs.readFileSync(chatHtmlPath, 'utf8');
    assert.ok(chatContent.includes('cyber-breach-engine.css'), 'chat.html must link cyber-breach-engine.css');
    assert.ok(chatContent.includes('cyber-breach-engine.js'), 'chat.html must load cyber-breach-engine.js');
  });

  await t.test('6. Terminal FLIP Mechanical Elevation, Procedural Sound Synthesizers, and Landing Slam Shockwave (MASTER-13)', () => {
    const chatHtmlPath = path.join(__dirname, '../public/chat.html');
    const chatContent = fs.readFileSync(chatHtmlPath, 'utf8');
    assert.ok(chatContent.includes('id="security-terminal"'), 'chat.html must explicitly provide id="security-terminal"');
    assert.ok(chatContent.includes('hud-corner-bracket bracket-tl'), 'chat.html must include HUD corner bracket TL');
    assert.ok(chatContent.includes('hud-corner-bracket bracket-tr'), 'chat.html must include HUD corner bracket TR');
    assert.ok(chatContent.includes('hud-corner-bracket bracket-bl'), 'chat.html must include HUD corner bracket BL');
    assert.ok(chatContent.includes('hud-corner-bracket bracket-br'), 'chat.html must include HUD corner bracket BR');

    const engineJsPath = path.join(__dirname, '../public/assets/js/cyber-breach-engine.js');
    const jsContent = fs.readFileSync(engineJsPath, 'utf8');
    assert.ok(jsContent.includes('alignElevatedTerminal'), 'Must implement alignElevatedTerminal for FLIP resize math');
    assert.ok(jsContent.includes('playPneumaticBuildupSFX'), 'Must implement playPneumaticBuildupSFX for anticipation');
    assert.ok(jsContent.includes('playHydraulicLaunchSFX'), 'Must implement playHydraulicLaunchSFX for launch hiss');
    assert.ok(jsContent.includes('playGeigerTickSFX'), 'Must implement playGeigerTickSFX for LED progress clicks');
    assert.ok(jsContent.includes('playHydraulicSlamSFX'), 'Must implement playHydraulicSlamSFX for heavy crash impact');
    assert.ok(jsContent.includes('playElectricArcZap'), 'Must implement playElectricArcZap for bracket sparking');
    assert.ok(jsContent.includes('triggerChassisLandingSlamVisuals'), 'Must implement triggerChassisLandingSlamVisuals');
    assert.ok(jsContent.includes('document.body.appendChild(term)'), 'Must portal terminal to document.body during flight');
    assert.ok(jsContent.includes('restoreToGrid'), 'Must cleanly restore terminal back to grid DOM slot');

    const engineCssPath = path.join(__dirname, '../public/assets/css/cyber-breach-engine.css');
    const cssContent = fs.readFileSync(engineCssPath, 'utf8');
    assert.ok(cssContent.includes('screen-slam-earthquake') || cssContent.includes('screen-earthquake-slam'), 'Must define viewport earthquake animation');
    assert.ok(cssContent.includes('pre-liftoff-lock') || cssContent.includes('terminal-pneumatic-vibrate'), 'Must define pre-liftoff vibration keyframes');
    assert.ok(cssContent.includes('hud-corner-bracket'), 'Must define holographic corner brackets');
    assert.ok(cssContent.includes('ghost-impact-spark'), 'Must define ghost slot spark impact');
    assert.ok(cssContent.includes('is-docked-corrupted'), 'Must define docked corrupted lock state');
  });
});
