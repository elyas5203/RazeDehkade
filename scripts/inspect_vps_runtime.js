const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const env = {
  ...process.env,
  SSH_ASKPASS: path.resolve(__dirname, 'askpass.bat'),
  SSH_ASKPASS_REQUIRE: 'force',
  DISPLAY: '1'
};

const remoteCode = `
const pool = require('./src/db/pool');
async function run() {
  const [sessions] = await pool.query('SELECT id, code, name, is_chat_locked FROM sessions ORDER BY id ASC LIMIT 10');
  console.log('Sessions:', sessions);
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
`;

execSync(`ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "cat > /home/user615/RazeDehkade/inspect_tmp.js"`, {
  env,
  input: remoteCode,
  stdio: ['pipe', 'inherit', 'inherit']
});

const out = execSync(`ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "cd /home/user615/RazeDehkade && node inspect_tmp.js"`, { env }).toString();
console.log(out);
