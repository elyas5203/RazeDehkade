const { execSync } = require('child_process');
const path = require('path');

const env = {
  ...process.env,
  SSH_ASKPASS: path.resolve(__dirname, 'askpass.bat'),
  SSH_ASKPASS_REQUIRE: 'force',
  DISPLAY: '1'
};

try {
  console.log('Checking messages table columns on VPS...');
  const cmd = `cd /home/user615/RazeDehkade && node -e "const pool = require('./src/db/pool'); pool.query('DESCRIBE messages').then(([rows]) => { console.log(rows.map(r => r.Field)); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });"`;
  const out = execSync(`ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "${cmd}"`, { env }).toString();
  console.log('Columns:', out);
} catch (err) {
  console.error('Error:', err.message);
}
