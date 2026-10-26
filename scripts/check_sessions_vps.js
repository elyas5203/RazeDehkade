const { execSync } = require('child_process');
const path = require('path');

const env = {
  ...process.env,
  SSH_ASKPASS: path.resolve(__dirname, 'askpass.bat'),
  SSH_ASKPASS_REQUIRE: 'force',
  DISPLAY: '1'
};

try {
  console.log('Querying sessions table on VPS...');
  const remoteCmd = `node -e \\"const { query } = require('./src/db/pool'); query('SELECT * FROM teachers LIMIT 5').then(function(res){ console.log(JSON.stringify(res.rows, null, 2)); process.exit(0); }).catch(function(err){ console.error(err); process.exit(1); });\\"`;
  const out = execSync(`ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "cd /home/user615/RazeDehkade && ${remoteCmd}"`, { env }).toString();
  console.log('VPS SESSIONS:\n', out);
} catch (err) {
  console.error('Error:', err.message);
  if (err.stdout) console.log(err.stdout.toString());
  if (err.stderr) console.error(err.stderr.toString());
}
