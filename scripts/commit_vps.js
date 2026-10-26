const { execSync } = require('child_process');
const path = require('path');

const env = {
  ...process.env,
  SSH_ASKPASS: path.resolve(__dirname, 'askpass.bat'),
  SSH_ASKPASS_REQUIRE: 'force',
  DISPLAY: '1'
};

try {
  const out = execSync('ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "cd /home/user615/RazeDehkade && git add -A && git commit -m \\"feat: sync v1.26.0 overhaul on vps\\""', { env }).toString();
  console.log(out);
} catch (e) {
  console.log('VPS commit:', e.message);
}
