'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');

process.env.NODE_ENV = 'test';
process.env.USE_IN_MEMORY_DB = 'true';
process.env.JWT_SECRET = 'test_secret_key_hacked_routing_2026';

const { pool } = require('../src/db/pool');
const authRoutes = require('../src/routes/auth');
const emergencyAuthRoutes = require('../src/routes/emergencyAuth');
const { generateToken } = require('../src/middleware/auth');

const root = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const emergencyJs = fs.readFileSync(path.join(root, 'public/assets/js/emergency-auth.js'), 'utf8');
const gatewayJs = fs.readFileSync(path.join(root, 'public/assets/js/gateway.js'), 'utf8');

test('MASTER-25: Hacked Class Direct Routing to Emergency Auth & Self-Healing Phone Verification', async t => {
  // آماده‌سازی دو جلسه آزمایشی در پایگاه داده تست
  // جلسه ۱: کلاس نرمال (هک نشده)
  // جلسه ۲: کلاس تحت نفوذ سایبری (هک شده)
  pool.tables.sessions = pool.tables.sessions || [];
  pool.tables.teachers = pool.tables.teachers || [];
  pool.tables.session_logs = pool.tables.session_logs || [];

  const normalSession = {
    id: 91,
    name: 'کلاس کارآگاهان عادی',
    code: 'CODE91',
    chat_code: '333444',
    status: 'active',
    teacher_phone: '09121111111',
    is_hacked: 0,
    active_case: 1
  };

  const hackedSession = {
    id: 92,
    name: 'کلاس کارآگاهان هک‌شده',
    code: 'CODE92',
    chat_code: '555666',
    status: 'active',
    teacher_phone: '09122222222',
    is_hacked: 1,
    active_case: 1
  };

  pool.tables.sessions.push(normalSession);
  pool.tables.sessions.push(hackedSession);

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/emergency-auth', emergencyAuthRoutes);

  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    await t.test('1. POST /api/auth/teacher/check routes normal class to regular flow and hacked class to emergency-auth with token', async () => {
      // الف: بررسی شماره کلاس عادی
      const normalRes = await fetch(`${baseUrl}/api/auth/teacher/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '09121111111' })
      });
      const normalData = await normalRes.json();
      assert.equal(normalRes.status, 200);
      assert.equal(normalData.registered, true);
      assert.equal(normalData.isHacked, false);
      assert.equal(normalData.data.chatCode, '333444');

      // ب: بررسی شماره کلاس هک‌شده
      const hackedRes = await fetch(`${baseUrl}/api/auth/teacher/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '09122222222' })
      });
      const hackedData = await hackedRes.json();
      assert.equal(hackedRes.status, 200);
      assert.equal(hackedData.registered, true);
      assert.equal(hackedData.isHacked, true, 'isHacked must be true for hacked class');
      assert.equal(hackedData.redirectUrl, '/emergency-auth.html');
      assert.ok(hackedData.data.token, 'Must return JWT token for direct emergency login');
      assert.equal(hackedData.data.session.id, 92);
    });

    await t.test('2. POST /api/auth/user/join returns 403 with isHacked and attaches valid JWT token for emergency portal', async () => {
      const joinRes = await fetch(`${baseUrl}/api/auth/user/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: '555666' })
      });
      const joinData = await joinRes.json();
      assert.equal(joinRes.status, 403);
      assert.equal(joinData.isHacked, true);
      assert.equal(joinData.redirectUrl, '/emergency-auth.html');
      assert.ok(joinData.data?.token, 'Must provide token in 403 response data');
      assert.equal(joinData.data?.session?.id, 92);
    });

    await t.test('3. POST /api/emergency-auth/verify-phone succeeds WITHOUT token and issues fresh JWT', async () => {
      // درخواست بدون هدر Authorization با شماره صحیح کلاس
      const verifyRes = await fetch(`${baseUrl}/api/emergency-auth/verify-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '09122222222' })
      });
      const verifyData = await verifyRes.json();
      assert.equal(verifyRes.status, 200);
      assert.equal(verifyData.success, true);
      assert.ok(verifyData.token, 'Must generate and return fresh JWT token');
      assert.equal(verifyData.session.id, 92);
    });

    await t.test('4. POST /api/emergency-auth/verify-phone rejects unknown / unregistered phones with 403', async () => {
      const badRes = await fetch(`${baseUrl}/api/emergency-auth/verify-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '09999999999' })
      });
      const badData = await badRes.json();
      assert.equal(badRes.status, 403);
      assert.equal(badData.success, false);
      assert.match(badData.message, /ثبت نشده/);
    });

    await t.test('5. POST /api/emergency-auth/verify-phone succeeds WITH valid user token', async () => {
      const token = generateToken({ role: 'user', sessionId: 92 });
      const verifyWithToken = await fetch(`${baseUrl}/api/emergency-auth/verify-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ phone: '09122222222' })
      });
      const resData = await verifyWithToken.json();
      assert.equal(verifyWithToken.status, 200);
      assert.equal(resData.success, true);
      assert.ok(resData.token);
    });

    await t.test('6. Client-side integration checks in index.html, gateway.js, and emergency-auth.js', () => {
      // index.html redirects directly to emergency-auth.html on isHacked
      assert.match(indexHtml, /if\s*\(data\.isHacked\)/);
      assert.match(indexHtml, /emergency-auth\.html/);
      assert.match(indexHtml, /sessionStorage\.setItem\('userToken',\s*data\.data\.token\)/);

      // gateway.js captures token and redirects
      assert.match(gatewayJs, /sessionStorage\.setItem\('userToken',\s*result\.data\.token\)/);

      // emergency-auth.js pre-fills phone and does not throw premature "دوباره وارد کلاس شوید"
      assert.match(emergencyJs, /sessionStorage\.getItem\('emergency_user_phone'\)\s*\|\|\s*sessionStorage\.getItem\('teacherPhone'\)/);
      assert.doesNotMatch(emergencyJs, /if\s*\(!token\)\s*throw new Error\('برای ادامه، دوباره وارد کلاس شوید\.'\);/);
      assert.match(emergencyJs, /sessionStorage\.setItem\('userToken',\s*verificationResult\.token\)/);
    });

    await t.test('7. Master 25 and Task 010 documentation exist', () => {
      const masterPath = path.join(root, 'docs/ai/masters/MASTER_25_HACKED_CLASS_DIRECT_EMERGENCY_ROUTING_AND_PHONE_AUTH.md');
      const taskPath = path.join(root, 'ai-kit/tasks/TASK-010-HACKED-CLASS-DIRECT-EMERGENCY-ROUTING.md');
      assert.ok(fs.existsSync(masterPath), 'Master 25 must exist');
      assert.ok(fs.existsSync(taskPath), 'Task 010 must exist');
    });
  } finally {
    server.close();
  }
});
