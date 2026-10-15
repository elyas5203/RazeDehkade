import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.217.95.111', username='user615', password='elyas5203', timeout=15)

cmd = """cd /home/user615/RazeDehkade && node -e "
const { query, pool } = require('./src/db/pool');
async function main() {
  const s = await query('SELECT * FROM sessions WHERE id = 17');
  console.log(JSON.stringify(s.rows || s, null, 2));
  if (pool && pool.end) await pool.end();
}
main();
" """

stdin, stdout, stderr = ssh.exec_command(cmd)
print(stdout.read().decode('utf-8'))
ssh.close()
