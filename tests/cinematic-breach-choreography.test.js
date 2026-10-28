'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(rootDir, file), 'utf8');

const engineJs = read('public/assets/js/cyber-breach-engine.js');
const engineCss = read('public/assets/css/cyber-breach-engine.css');
const chatHtml = read('public/chat.html');

test('MASTER-28: Choreographed Cyber Breach Cinematics & Storyline Verification', async (t) => {
  await t.test('1. Exact user narrative script exists in CYBER_SCENARIOS.v3_cinematic_story', () => {
    assert.match(engineJs, /v3_cinematic_story:\s*\{/);
    assert.match(engineJs, /ویدئو دهکده آخر رو دیدین ؟/);
    assert.match(engineJs, /چرا جواب نمیدین ؟!/);
    assert.match(engineJs, /من منتظر جواب شما هستم/);
    assert.match(engineJs, /جواب بدین/);
    assert.match(engineJs, /چی شد!/);
    assert.match(engineJs, /یه سری تغییراتی تو کد های امنیتی سایت بوجود اومده/);
    assert.match(engineJs, /یه خبراییه/);
    assert.match(engineJs, /مثکه نفوذی داریم/);
    assert.match(engineJs, /دیگهههه خستم کردددددین😡/);
    assert.match(engineJs, /از اینجا به بعد کنترل پیام های شما دست منه/);
    assert.match(engineJs, /کارآگاه نفوذی داریم داخل سایت/);
    assert.match(engineJs, /سرنخ می خوای !!!!/);
    assert.match(engineJs, /رمز گاوصندوق رو بگین تا سریع اطلاعات رو برداریم و بریم بیرون/);
    assert.match(engineJs, /شما که می دونین تو موقعیتی که نفوذی وجود داره اصلا نباید راجع به این اطلاعات محرمانه صحبت کرد/);
    assert.match(engineJs, /بابا بفرست دیگه/);
    assert.match(engineJs, /نکنه تو دستیار نیستی و همون نفوذی هستی !!!!/);
    assert.match(engineJs, /تو دستیار من نیستی!!/);
    assert.match(engineJs, /ااااااااااه/);
    assert.match(engineJs, /یعنی چی رمز گاوصندوق رو ندارم!!!😡/);
    assert.match(engineJs, /مزداک !!!!/);
    assert.match(engineJs, /به روش های مختلف بهت پیام اخطار داده بودم که دست از این پرونده برداری/);
    assert.match(engineJs, /بطور خودکار تمام کاربر هایی که داخلش هستن رو میندازه بیرون/);
    assert.match(engineJs, /نمیتونی این کار رو بکنی اطلاعات این پرونده بالاخره از بین میره/);
  });

  await t.test('2. Dynamic visual cues: Left terminal red warming and evidence board flickering', () => {
    assert.match(engineJs, /terminal\.classList\.add\('breach-warming-up'\)/);
    assert.match(engineCss, /#security-terminal\.breach-warming-up/);
    assert.match(engineCss, /transition:\s*color 4s ease/);

    assert.match(engineJs, /evidenceBoard\.classList\.add\('evidence-flickering'\)/);
    assert.match(engineCss, /\.evidence-flickering/);
    assert.match(engineCss, /@keyframes evidenceFlickerGlitch/);
  });

  await t.test('3. Signal Lost Blackout with pulsating red LED dot triggers immediately after infiltrator alert', () => {
    assert.match(engineJs, /if \(sec === 60\) \{[\s\S]*?triggerInitialBlackout/);
    assert.match(engineJs, /blackout-heartbeat-led/);
    assert.match(engineCss, /\.blackout-heartbeat-led/);
    assert.match(engineCss, /@keyframes ledPulseHeartbeat/);
  });

  await t.test('4. Mazdak watermark on messages box and evidence board with corrupted image covers', () => {
    assert.match(engineJs, /applyMazdakMediaStamps\(\)/);
    assert.match(engineCss, /#messages-box\.mazdak-bg/);
    assert.match(engineCss, /\.evidence-board\.mazdak-bg/);
    assert.match(engineCss, /#evidence-grid\.mazdak-bg/);
    assert.match(engineCss, /\.evidence-card \.evidence-mazdak-glitch-cover/);
    assert.match(engineCss, /\.evidence-card\.evidence-mazdak-injected/);
    assert.match(engineCss, /z-index:\s*100\s*!important/);
    assert.match(engineCss, /object-fit:\s*cover/);
  });

  await t.test('5. Ghost typing with read & erase simulation in kids composer', () => {
    assert.match(engineJs, /simulateGhostTypingWithErase\(textToRead, holdMs, nextTextToSend, onComplete\)/);
    assert.match(engineJs, /ghost-typing-active/);
    assert.match(engineJs, /battle-kids-spoofed-infiltrator/);
    assert.match(engineJs, /battle-kids-spoofed-vault-request/);
    assert.match(engineJs, /battle-kids-spoofed-urgent/);
    assert.match(engineJs, /battle-kids-spoofed-data-wipe/);
    assert.match(engineJs, /eraseIdx--/);
    assert.match(engineJs, /(7500|10000|12000)/);
    assert.match(engineJs, /(2200|11500)/);
    assert.match(engineCss, /min-height:\s*68px/);
  });

  await t.test('6. Mazdak unmasking screen jump and audio blast', () => {
    assert.match(engineJs, /triggerBreachScreenJump\(\)/);
    assert.match(engineCss, /@keyframes breachJumpShake/);
    assert.match(engineCss, /body\.breach-jump-shake/);
    assert.match(engineJs, /playSample\('cyber-error\.mp3'/);
    assert.match(engineJs, /playSample\('cyber-slam\.mp3'/);
  });

  await t.test('7. Evacuation protocol at countdown 1: "کانال امن را ترک کنید" with 10-second countdown', () => {
    assert.match(engineJs, /triggerEmergencyEjectionModal\(\)/);
    assert.match(engineJs, /کانال امن را ترک کنید/);
    assert.match(engineJs, /ejectionCountdownSec/);
    assert.match(engineCss, /\.ejection-countdown-box/);
    assert.match(engineCss, /\.ejection-countdown-number/);
    assert.match(engineJs, /executeEjectionRedirect\(\)/);
    assert.match(engineJs, /window\.location\.href = '\/emergency-auth\.html'/);
  });

  await t.test('8. Revertible scenarios support (scenario=v2 or scenario=v1 URL or window toggle)', () => {
    assert.match(engineJs, /CYBER_SCENARIO_VERSION/);
    assert.match(engineJs, /new URLSearchParams\(window\.location\.search\)\.get\('scenario'\)/);
    assert.match(engineJs, /renderLegacyFrame\(sec, isV1\)/);
    assert.match(engineJs, /v2_psychological:/);
    assert.match(engineJs, /v1_legacy:/);
  });

  await t.test('9. chat.html links fresh cache-busted assets', () => {
    assert.match(chatHtml, /cyber-breach-engine\.css\?v=20261028_1050/);
    assert.match(chatHtml, /cyber-breach-engine\.js\?v=20261028_1050/);
  });
});
