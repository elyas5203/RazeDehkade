'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const engine = read('public/assets/js/cyber-breach-engine.js');
const authJs = read('public/assets/js/emergency-auth.js');
const authHtml = read('public/emergency-auth.html');
const authCss = read('public/assets/css/emergency-auth.css');
const landing = read('public/index.html');
const golhaLanding = read('public/golha/index.html');

test('MASTER-27 natural breach dialogue and zero-repeat auth handoff', async t => {
  await t.test('dialogue has a believable multi-turn escalation', () => {
    for (const marker of ['detProbe1', 'detWarning', 'kids4', 'detChallenge', 'mazdak2']) {
      assert.match(engine, new RegExp(marker));
    }
    const ids = [...engine.matchAll(/id: 'battle-[^']+'/g)].map(match => match[0]);
    assert.ok(new Set(ids).size >= 14, 'breach needs at least 14 distinct dialogue turns');
    assert.match(engine, /هشدار Man-In-The-Middle/);
    assert.match(engine, /هیچ‌وقت در خط ناامن رمز درخواست نمی‌کنند|هیچ رمزی نفرستید/);
  });

  await t.test('trusted landing handoff bypasses the duplicate phone step', () => {
    for (const page of [landing, golhaLanding]) {
      assert.match(page, /sessionStorage\.setItem\('emergency_user_phone', phone\)/);
      assert.match(page, /sessionStorage\.setItem\('userToken', data\.data\.token\)/);
      assert.match(page, /رخنهٔ امنیتی شناسایی شد/);
      assert.match(page, /مستقیم به سؤال اول منتقل می‌شوید/);
    }
    assert.match(authJs, /attemptTrustedHandoff\(\)/);
    assert.match(authJs, /verifyPhoneAndEnter\(savedPhone, \{ trustedHandoff: true \}\)/);
    assert.match(authJs, /step1Section\.style\.display = 'none'/);
    assert.match(authJs, /enterQuestionnaire\(phone, verificationResult\)/);
  });

  await t.test('redesigned portal is responsive and keeps a safe manual fallback', () => {
    assert.match(authHtml, /class="emergency-rail"/);
    assert.match(authHtml, /id="securityBriefing"/);
    assert.match(authHtml, /id="authPhoneForm"/);
    assert.match(authCss, /MASTER-27/);
    assert.match(authCss, /grid-template-columns: minmax\(210px, 260px\) minmax\(0, 1fr\)/);
    for (const width of ['900', '600', '380']) assert.match(authCss, new RegExp(`max-width: ${width}px`));
    assert.match(authCss, /env\(safe-area-inset-bottom\)/);
    assert.match(authCss, /prefers-reduced-motion: reduce/);
  });
});
