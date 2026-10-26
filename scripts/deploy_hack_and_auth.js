const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const env = {
  ...process.env,
  SSH_ASKPASS: path.resolve(__dirname, 'askpass.bat'),
  SSH_ASKPASS_REQUIRE: 'force',
  DISPLAY: '1'
};

const REMOTE_BASE = '/home/user615/RazeDehkade';

const filesToDeploy = [
  'server.js',
  'package.json',
  '.gitignore',
  'src/db/migrate.js',
  'src/db/pool.js',
  'src/routes/emergencyAuth.js',
  'src/services/emergencyVideoQueue.js',
  'src/utils/videoTranscoder.js',
  'src/socket/index.js',
  'src/models/Session.js',
  'src/routes/sessions.js',
  'public/emergency-auth.html',
  'public/chat.html',
  'public/assets/css/emergency-auth.css',
  'public/assets/js/emergency-auth.js',
  'public/assets/images/telephone/real-rotary-phone-body.jpg',
  'public/assets/css/cyber-breach-engine.css',
  'public/assets/js/cyber-breach-engine.js',
  'public/assets/js/user-chat.js',
  'public/assets/js/admin-chat.js',
  'public/assets/js/admin-dashboard.js',
  'MohtavaTelBot/bot.js',
  'tests/emergency-auth-submissions.test.js',
  'tests/emergency-question-fidelity.test.js',
  'tests/mazdak-cyber-warfare.test.js',
  'tests/breach-sensory-overhaul.test.js',
  'tests/rotary-telephone-3d.test.js',
  'tests/cyber-psychological-warfare-and-telegram-bot.test.js',
  'tests/streamable-mp4-and-submission-answers.test.js',
  'docs/ai/masters/MASTER_21_CINEMATIC_BREACH_SENSORY_OVERHAUL.md',
  'docs/ai/masters/MASTER_22_ROTARY_TELEPHONE_3D_MINIGAME.md',
  'docs/ai/masters/MASTER_23_CYBER_BREACH_PSYCHOLOGICAL_WARFARE_AND_TELEGRAM_QUEUE.md',
  'docs/ai/masters/MASTER_24_STREAMABLE_MP4_AND_SUBMISSION_ANSWERS_DISPATCH.md',
  'ai-kit/tasks/TASK-007-ROTARY-TELEPHONE-3D.md',
  'ai-kit/tasks/TASK-008-PSYCHOLOGICAL-WARFARE-AND-TELEGRAM-BOT.md',
  'ai-kit/tasks/TASK-009-STREAMABLE-MP4-AND-SUBMISSION-ANSWERS.md',
  'ai-kit/memory/STATE.md',
  'scripts/test-runner.js'
];

console.log('1. Checking modified files...');
filesToDeploy.forEach(f => {
  if (!fs.existsSync(f)) {
    throw new Error(`File not found: ${f}`);
  }
});
console.log(`All ${filesToDeploy.length} files exist locally.`);

console.log('2. Creating tar bundle...');
const tarFile = path.resolve(__dirname, '..', 'deploy_hack_auth.tar.gz');
if (fs.existsSync(tarFile)) fs.unlinkSync(tarFile);

execSync(`tar -czf "${tarFile}" ${filesToDeploy.join(' ')}`, {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit'
});
console.log(`Bundle created (${fs.statSync(tarFile).size} bytes).`);

console.log('3. Streaming tar bundle to VPS...');
const bundleBuffer = fs.readFileSync(tarFile);
execSync(`ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 user615@95.217.95.111 "tar -xzf - -C ${REMOTE_BASE}"`, {
  env,
  input: bundleBuffer,
  stdio: ['pipe', 'inherit', 'inherit']
});
console.log('Files unpacked successfully on VPS.');

console.log('4. Running database migration on VPS...');
execSync(`ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 user615@95.217.95.111 "cd ${REMOTE_BASE} && node src/db/migrate.js"`, {
  env,
  stdio: 'inherit'
});

console.log('5. Reloading PM2 process raze-dehkade...');
execSync(`ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 user615@95.217.95.111 "pm2 reload raze-dehkade"`, {
  env,
  stdio: 'inherit'
});

console.log('6. Checking PM2 status...');
const listOutput = execSync(`ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 user615@95.217.95.111 "pm2 list"`, {
  env
}).toString();
console.log(listOutput);

// Cleanup
if (fs.existsSync(tarFile)) fs.unlinkSync(tarFile);
console.log('🎉 Deployment to VPS completed successfully!');
