/**
 * scripts/deploy_telegram_admin_auth.js
 * اسکریپت استقرار امن ویژگی احراز هویت ادمین تلگرام و ارسال همگانی ویدیوها به تمام ادمین‌ها روی سرور لینوکس (VPS)
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

const REMOTE_BASE = '/home/user615/RazeDehkade';

const filesToDeploy = [
  'MohtavaTelBot/bot.js',
  'MohtavaTelBot/config.js',
  'src/services/emergencyVideoQueue.js',
  'src/utils/videoTranscoder.js',
  'src/db/migrate.js',
  'src/db/pool.js',
  'tests/telegram-bot-admin-auth.test.js',
  'MASTER_TELEGRAM_ADMIN_AUTH_KEY.md',
  'scripts/rollback_bot_admin.js',
  'storage/telegram_authorized_admins.json',
];

console.log('1. Checking local files existence...');
filesToDeploy.forEach(f => {
  if (!fs.existsSync(f)) {
    throw new Error(`Local file missing: ${f}`);
  }
  const stat = fs.statSync(f);
  console.log(`  ✓ ${f} (${stat.size} bytes)`);
});

console.log('\n2. Verifying remote stable backup on VPS...');
execSync(
  `ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "cd ${REMOTE_BASE} && if [ ! -f MohtavaTelBot/bot.js.stable_backup ]; then cp MohtavaTelBot/bot.js MohtavaTelBot/bot.js.stable_backup; fi && if [ ! -f MohtavaTelBot/config.js.stable_backup ]; then cp MohtavaTelBot/config.js MohtavaTelBot/config.js.stable_backup; fi && if [ ! -f src/services/emergencyVideoQueue.js.stable_backup ]; then cp src/services/emergencyVideoQueue.js src/services/emergencyVideoQueue.js.stable_backup; fi && if [ ! -f src/utils/videoTranscoder.js.stable_backup ]; then cp src/utils/videoTranscoder.js src/utils/videoTranscoder.js.stable_backup; fi && ls -lh MohtavaTelBot/*.stable_backup src/services/*.stable_backup src/utils/*.stable_backup"`,
  { env, stdio: 'inherit' }
);

console.log('\n3. Creating tar bundle...');
const tarFile = path.resolve(__dirname, '..', 'deploy_telegram_admin_auth.tar.gz');
if (fs.existsSync(tarFile)) fs.unlinkSync(tarFile);

execSync(`tar -czf "${tarFile}" ${filesToDeploy.join(' ')}`, {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
});
console.log(`Bundle created: ${tarFile} (${fs.statSync(tarFile).size} bytes).`);

console.log('\n4. Transferring bundle to remote VPS (95.217.95.111)...');
execSync(`scp -o StrictHostKeyChecking=no "${tarFile}" user615@95.217.95.111:${REMOTE_BASE}/deploy_telegram_admin_auth.tar.gz`, {
  env,
  stdio: 'inherit',
});
console.log('Transfer complete.');

console.log('\n5. Extracting bundle on VPS...');
const out1 = execSync(
  `ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "cd ${REMOTE_BASE} && tar -xzf deploy_telegram_admin_auth.tar.gz && rm -f deploy_telegram_admin_auth.tar.gz"`,
  { env }
);
console.log('Extraction complete.', out1.toString());

console.log('\n6. Running tests on VPS...');
try {
  const out2 = execSync(
    `ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "cd ${REMOTE_BASE} && node --test tests/telegram-bot-admin-auth.test.js tests/cyber-psychological-warfare-and-telegram-bot.test.js tests/streamable-mp4-and-submission-answers.test.js"`,
    { env }
  );
  console.log(out2.toString());
} catch (testErr) {
  console.error('Remote test error:\n', testErr.stdout ? testErr.stdout.toString() : testErr.message);
  throw testErr;
}

console.log('\n7. Reloading PM2 raze-dehkade gracefully...');
const out3 = execSync(`ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "pm2 reload raze-dehkade"`, { env });
console.log(out3.toString());

console.log('\n8. Checking PM2 status...');
const status = execSync(`ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "pm2 status raze-dehkade"`, { env }).toString();
console.log(status);

console.log('\n9. Probing server HTTP response...');
const curlOutput = execSync(`ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "curl -s -I http://127.0.0.1:3000/chat.html | head -n 5"`, {
  env,
}).toString();
console.log(curlOutput);

console.log('\n✅ Deployment of Telegram Admin Auth & Multi-Admin Video Broadcast completed successfully!');
