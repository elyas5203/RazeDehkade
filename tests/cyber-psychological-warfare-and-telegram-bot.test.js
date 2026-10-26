'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const engineJs = fs.readFileSync(path.join(root, 'public/assets/js/cyber-breach-engine.js'), 'utf8');
const engineCss = fs.readFileSync(path.join(root, 'public/assets/css/cyber-breach-engine.css'), 'utf8');
const botJs = fs.readFileSync(path.join(root, 'MohtavaTelBot/bot.js'), 'utf8');
const queueJs = fs.readFileSync(path.join(root, 'src/services/emergencyVideoQueue.js'), 'utf8');

test('MASTER-23: Psychological Cyber Warfare, Ejection Modal Cleanup & Telegram Video Integration', async t => {
  await t.test('1. Spinning square with red dot (.breach-reticle) is completely hidden', () => {
    assert.match(engineCss, /\.breach-reticle\s*\{\s*display:\s*none\s*!important;\s*\}/);
    assert.match(engineJs, /<div class="breach-reticle"[^>]*display:\s*none\s*!important/);
  });

  await t.test('2. Ejection modal has NO auto-redirect countdown line and NO 5-min timer', () => {
    assert.doesNotMatch(engineJs, /<div class="ejection-countdown-line"/);
    assert.doesNotMatch(engineJs, /انتقال خودکار تا ۰/);
    assert.match(engineJs, /لغو هرگونه شمارش معکوس و انتقال خودکار طبق خواسته صریح کاربر/);
  });

  await t.test('3. Cyber dialogue supports V2 Psychological Warfare and V1 Reversibility', () => {
    assert.match(engineJs, /CYBER_SCENARIOS/);
    assert.match(engineJs, /v2_psychological/);
    assert.match(engineJs, /v1_legacy/);
    assert.match(engineJs, /Man-In-The-Middle/);
    assert.match(engineJs, /۹۲۷۳، ۴۶۹۱، ۶۷۱۸، ۱۱۶۳/);
    assert.match(engineJs, /CYBER_SCENARIO_VERSION === 'v1'/);
  });

  await t.test('4. Emergency video queue includes class name and supports fallback credentials', () => {
    assert.match(queueJs, /5490508090/);
    assert.match(queueJs, /8018971290:AAFcCPC8VjIMZeLVr7q989rASim1NQ8di64/);
    assert.match(queueJs, /کلاس: \${className}/);
    assert.match(queueJs, /sendDocument/);
  });

  await t.test('5. MohtavaTelBot integrates emergency videos button and commands', () => {
    assert.match(botJs, /BTN_EMERGENCY_VIDEOS = '📹 ویدیوهای احراز هویت'/);
    assert.match(botJs, /BTN_EMERGENCY_VIDEOS/);
    assert.match(botJs, /\/videos/);
    assert.match(botJs, /\/resend_videos/);
    assert.match(botJs, /handleEmergencyVideosMenu/);
    assert.match(botJs, /handleResendLatestVideos/);
  });
});
