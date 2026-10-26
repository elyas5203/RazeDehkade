const { execSync } = require('child_process');
const path = require('path');

const env = {
  ...process.env,
  SSH_ASKPASS: path.resolve(__dirname, 'askpass.bat'),
  SSH_ASKPASS_REQUIRE: 'force',
  DISPLAY: '1'
};

try {
  const statusOut = execSync('ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "cd /home/user615/RazeDehkade && git status"', { env }).toString();
  console.log('=== VPS GIT STATUS ===\n' + statusOut);

  const remoteOut = execSync('ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "cd /home/user615/RazeDehkade && git remote -v"', { env }).toString();
  console.log('=== VPS GIT REMOTE ===\n' + remoteOut);
} catch (e) {
  console.error('Error checking VPS git:', e.message);
}
