const { execSync } = require('child_process');
const path = require('path');
const env = {
  ...process.env,
  SSH_ASKPASS: path.resolve(__dirname, 'askpass.bat'),
  SSH_ASKPASS_REQUIRE: 'force',
  DISPLAY: '1'
};

try {
  const gitStatus = execSync('ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "cd /home/user615/RazeDehkade && git status --short"', { env }).toString();
  console.log('VPS Git Status:\n', gitStatus);
} catch (e) {
  console.error('Git status error:', e.message);
}

try {
  const diff = execSync('ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "cd /home/user615/RazeDehkade && git diff --name-only"', { env }).toString();
  console.log('VPS Modified Files:\n', diff);
} catch (e) {
  console.error('Diff error:', e.message);
}

try {
  const pm2 = execSync('ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "pm2 status"', { env }).toString();
  console.log('VPS PM2 Status:\n', pm2);
} catch (e) {
  console.error('PM2 error:', e.message);
}
