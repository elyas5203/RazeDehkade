const { execSync } = require('child_process');
const path = require('path');

const env = {
  ...process.env,
  SSH_ASKPASS: path.resolve(__dirname, 'askpass.bat'),
  SSH_ASKPASS_REQUIRE: 'force',
  DISPLAY: '1'
};

try {
  const out = execSync('ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "cd /home/user615/RazeDehkade && git push origin main"', { env, timeout: 10000 }).toString();
  console.log(out);
} catch (e) {
  console.log('VPS push output/error:', e.message);
  if (e.stderr) console.log('stderr:', e.stderr.toString());
  if (e.stdout) console.log('stdout:', e.stdout.toString());
}
