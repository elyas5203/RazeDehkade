const { execSync } = require('child_process');
const path = require('path');

const cmd = process.argv.slice(2).join(' ') || 'ss -tulpn';

const env = {
  ...process.env,
  SSH_ASKPASS: path.resolve(__dirname, 'askpass.bat'),
  SSH_ASKPASS_REQUIRE: 'force',
  DISPLAY: '1'
};

try {
  const out = execSync(`ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "${cmd.replace(/"/g, '\\"')}"`, { env }).toString();
  console.log(out);
} catch (err) {
  console.error('Error:', err.message);
  if (err.stdout) console.log(err.stdout.toString());
  if (err.stderr) console.error(err.stderr.toString());
}
