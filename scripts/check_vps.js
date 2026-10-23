const { execSync } = require('child_process');
const path = require('path');

const env = {
  ...process.env,
  SSH_ASKPASS: path.resolve(__dirname, 'askpass.bat'),
  SSH_ASKPASS_REQUIRE: 'force',
  DISPLAY: '1'
};

try {
  console.log('Fetching PM2 list from VPS...');
  const out = execSync('ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "pm2 list"', { env }).toString();
  console.log(out);
} catch (err) {
  console.error('Error fetching PM2:', err.message);
  if (err.stdout) console.log('Stdout:', err.stdout.toString());
  if (err.stderr) console.error('Stderr:', err.stderr.toString());
}
