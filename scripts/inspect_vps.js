const { execSync } = require('child_process');
const path = require('path');
const env = {
  ...process.env,
  SSH_ASKPASS: path.resolve(__dirname, 'askpass.bat'),
  SSH_ASKPASS_REQUIRE: 'force',
  DISPLAY: '1'
};

const cmd = process.argv[2] || 'git status --porcelain | grep -v "^ M"';
try {
  const out = execSync(`ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "cd /home/user615/RazeDehkade; ${cmd}"`, { env }).toString();
  console.log(out);
} catch (e) {
  console.error('Error:', e.message);
}


