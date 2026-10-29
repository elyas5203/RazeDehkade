/**
 * scripts/rollback_bot_admin.js
 * اسکریپت بازگردانی فوری (Instant Rollback) بات تلگرام و صف ویدیو به حالت پایدار قبلی
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const env = {
  ...process.env,
  SSH_ASKPASS: path.resolve(__dirname, 'askpass.bat'),
  SSH_ASKPASS_REQUIRE: 'force',
  DISPLAY: '1',
};

console.log('🔄 [Rollback] در حال بازگردانی فایل‌های بات تلگرام، صف ویدیو و ترنسکودر به حالت پایدار قبلی...');

// ۱. بازگردانی فایل‌های محلی
try {
  const localBotBak = path.resolve(__dirname, '..', 'MohtavaTelBot', 'bot.js.stable_backup');
  const localConfigBak = path.resolve(__dirname, '..', 'MohtavaTelBot', 'config.js.stable_backup');
  const localQueueBak = path.resolve(__dirname, '..', 'src', 'services', 'emergencyVideoQueue.js.stable_backup');
  const localTranscoderBak = path.resolve(__dirname, '..', 'src', 'utils', 'videoTranscoder.js.stable_backup');

  if (fs.existsSync(localBotBak)) {
    fs.copyFileSync(localBotBak, path.resolve(__dirname, '..', 'MohtavaTelBot', 'bot.js'));
    console.log('  ✓ فایل محلی bot.js از بکاپ بازگردانی شد.');
  }
  if (fs.existsSync(localConfigBak)) {
    fs.copyFileSync(localConfigBak, path.resolve(__dirname, '..', 'MohtavaTelBot', 'config.js'));
    console.log('  ✓ فایل محلی config.js از بکاپ بازگردانی شد.');
  }
  if (fs.existsSync(localQueueBak)) {
    fs.copyFileSync(localQueueBak, path.resolve(__dirname, '..', 'src', 'services', 'emergencyVideoQueue.js'));
    console.log('  ✓ فایل محلی emergencyVideoQueue.js از بکاپ بازگردانی شد.');
  }
  if (fs.existsSync(localTranscoderBak)) {
    fs.copyFileSync(localTranscoderBak, path.resolve(__dirname, '..', 'src', 'utils', 'videoTranscoder.js'));
    console.log('  ✓ فایل محلی videoTranscoder.js از بکاپ بازگردانی شد.');
  }
} catch (e) {
  console.warn('  ⚠️ هشدار در بازگردانی فایل‌های محلی:', e.message);
}

// ۲. بازگردانی فایل‌های سرور VPS
try {
  const vpsCmd = [
    'cd /home/user615/RazeDehkade',
    'if [ -f MohtavaTelBot/bot.js.stable_backup ]; then cp MohtavaTelBot/bot.js.stable_backup MohtavaTelBot/bot.js; fi',
    'if [ -f MohtavaTelBot/config.js.stable_backup ]; then cp MohtavaTelBot/config.js.stable_backup MohtavaTelBot/config.js; fi',
    'if [ -f src/services/emergencyVideoQueue.js.stable_backup ]; then cp src/services/emergencyVideoQueue.js.stable_backup src/services/emergencyVideoQueue.js; fi',
    'if [ -f src/utils/videoTranscoder.js.stable_backup ]; then cp src/utils/videoTranscoder.js.stable_backup src/utils/videoTranscoder.js; fi',
    'pm2 reload raze-dehkade',
  ].join(' && ');

  console.log('  🚀 در حال ارسال دستور بازگردانی و ری‌لود PM2 روی سرور...');
  const out = execSync(`ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "${vpsCmd}"`, { env }).toString();
  console.log(out);

  // بررسی وضعیت نهایی PM2
  const status = execSync('ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "pm2 status raze-dehkade"', { env }).toString();
  console.log(status);

  console.log('✅ [Rollback Complete] سیستم با موفقیت به حالت پایدار و تست‌شده قبلی بازگردانی شد.');
} catch (e) {
  console.error('❌ خطا در فرآیند بازگردانی سرور:', e.message);
  process.exit(1);
}
