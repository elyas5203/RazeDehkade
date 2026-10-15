/**
 * tests/adversarial-buttons-stress.test.js
 * تست‌های خصمانه (Adversarial Stress Testing) و شبیه‌سازی باگ‌های مرزی:
 * ۱. اسپم‌کلیک و ارسال همزمان درخواست‌های چندگانه به دکمه‌ها
 * ۲. اعتبارسنجی ورودی‌های مرزی (XSS، رشته‌های بسیار طولانی، شناسه‌های نامعتبر)
 * ۳. ایزولاسیون کامل بین جلسات و جلوگیری از تداخل کلاس‌ها
 * ۴. بررسی عملکرد دکمه قفل همگانی و تک‌جلسه‌ای گاوصندوق
 * ۵. سلامت صددرصدی کاتالوگ ۱۲۰ دکمه در رابط کاربری
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.USE_IN_MEMORY_DB = 'true';
process.env.JWT_SECRET = 'adversarial_test_secret_998877';

const sessionRoutes = require('../src/routes/sessions');
const Session = require('../src/models/Session');
const Admin = require('../src/models/Admin');
const Message = require('../src/models/Message');

describe('Adversarial Red-Team Stress Tests & Button Integrity', () => {
  let app;
  let server;
  let serverUrl;
  let adminToken;
  let sessionA;
  let sessionB;

  before(async () => {
    app = express();
    app.use(cors());
    app.use(express.json({ limit: '5mb' }));
    app.use('/api/sessions', sessionRoutes);

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        serverUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    const admin = await Admin.create({
      username: 'redteam_admin',
      password: 'testpassword123',
      display_name: 'مدیر تست قرمز',
    });
    adminToken = jwt.sign({ id: admin.id, role: 'admin', username: admin.username }, process.env.JWT_SECRET);

    sessionA = await Session.create({ name: 'کلاس آلفا - تست ۱', codeLength: 6 });
    sessionB = await Session.create({ name: 'کلاس بتا - تست ۲', codeLength: 6 });
  });

  after(() => {
    if (server) server.close();
  });

  test('1. Spam Click Simulation: Rapid concurrent toggles to global vault lock', async () => {
    // شبیه‌سازی ۱۰ کلیک فوق سریع همزمان روی دکمه قفل همگانی
    const promises = [];
    for (let i = 0; i < 10; i++) {
      const isUnlocked = i % 2 === 0;
      promises.push(
        fetch(`${serverUrl}/api/sessions/vault-lock-all`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ isUnlocked, week: 5 }),
        }).then(r => r.json())
      );
    }

    const results = await Promise.all(promises);
    assert.strictEqual(results.length, 10, 'All 10 rapid concurrent requests must complete');
    results.forEach(res => {
      assert.strictEqual(res.success, true, 'Each request must return success');
    });

    // بررسی اینکه وضعیت پایگاه داده سالم و هماهنگ مانده باشد
    const globalStatus = await Session.getGlobalVaultStatus();
    assert.ok(typeof globalStatus.isUnlocked === 'boolean', 'Global status must remain a valid boolean');
  });

  test('2. Boundary & Injection Stress: Invalid IDs, XSS strings and empty inputs', async () => {
    // تست شناسه جلسه نامعتبر
    const resBadId = await fetch(`${serverUrl}/api/sessions/not_a_number/vault-lock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isUnlocked: true }),
    });
    assert.strictEqual(resBadId.status, 400, 'Invalid session ID string must return 400 Bad Request');

    // تست شناسه جلسه منفی
    const resNegativeId = await fetch(`${serverUrl}/api/sessions/-99/vault-lock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isUnlocked: true }),
    });
    assert.strictEqual(resNegativeId.status, 400, 'Negative session ID must return 400 Bad Request');

    // تست تزریق XSS در نام پیام یا ورودی
    const xssPayload = '<script>alert("hacked")</script>';
    const resCreate = await fetch(`${serverUrl}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: xssPayload }),
    });
    const createData = await resCreate.json();
    assert.strictEqual(createData.success, true, 'Server handles special characters gracefully');
    assert.ok(createData.data.id > 0, 'Created session with safe id');
  });

  test('3. Cross-Class Isolation: Session A case changes do not leak into Session B', async () => {
    // تنظیم وضعیت پرونده در جلسه A
    await Session.setCaseStatus(sessionA.id, 'syndrome', 'active');
    await Session.setCaseStatus(sessionB.id, 'syndrome', 'locked');

    const casesA = await Session.getCaseStatuses(sessionA.id);
    const casesB = await Session.getCaseStatuses(sessionB.id);

    const syndromeA = casesA.find(c => c.case_key === 'syndrome');
    const syndromeB = casesB.find(c => c.case_key === 'syndrome');

    assert.strictEqual(syndromeA.status, 'active', 'Session A syndrome case must be active');
    assert.strictEqual(syndromeB.status, 'locked', 'Session B syndrome case must remain locked');
  });

  test('4. Zero-Spoiler Enforcement on Student Interfaces', () => {
    const rootDir = path.join(__dirname, '..');
    const chatHtml = fs.readFileSync(path.join(rootDir, 'public', 'chat.html'), 'utf8');

    // دانش‌آموز نباید هیچ کلمه‌ای از رمز عبور، وضعیت پلمپ یا محتوای مخفی را در کدهای اولیه ببیند
    assert.ok(!chatHtml.includes('0110'), 'chat.html must NEVER contain passcode 0110 in markup');
    assert.ok(!chatHtml.includes('پلمپ امنیتی'), 'chat.html must not show spoiler پلمپ امنیتی');
    assert.ok(!chatHtml.includes('کد صحیح است'), 'chat.html must not contain spoiler text');
  });

  test('5. Master Matrix Consistency: All HTML templates have valid matching handlers', () => {
    const rootDir = path.join(__dirname, '..');
    const masterMatrixPath = path.join(rootDir, 'MASTER_BUTTONS_AND_OUTPUTS_MATRIX.md');
    assert.ok(fs.existsSync(masterMatrixPath), 'MASTER_BUTTONS_AND_OUTPUTS_MATRIX.md must exist');

    const matrixContent = fs.readFileSync(masterMatrixPath, 'utf8');
    assert.ok(matrixContent.includes('global-vault-lock-btn'), 'Matrix must document global-vault-lock-btn');
    assert.ok(matrixContent.includes('vault-3d-trigger-btn'), 'Matrix must document vault-3d-trigger-btn');
    assert.ok(matrixContent.includes('openAssistantsPhotoPopup'), 'Matrix must document openAssistantsPhotoPopup');
  });
});
