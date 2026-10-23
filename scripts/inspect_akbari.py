import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('95.217.95.111', username='user615', password='elyas5203', timeout=15)

cmd = """cd /home/user615/RazeDehkade && node -e "
const { query, pool } = require('./src/db/pool');
async function main() {
  const s = await query('SELECT * FROM sessions WHERE name LIKE \\'%اکبری%\\' OR id = 14');
  console.log('=== SESSIONS ===');
  console.log(JSON.stringify(s.rows || s, null, 2));

  const sessId = (s.rows && s.rows[0]) ? s.rows[0].id : 14;
  const ast = await query('SELECT * FROM assistants WHERE session_id = ' + sessId);
  console.log('=== ASSISTANTS ===');
  console.log(JSON.stringify(ast.rows || ast, null, 2));

  const msgs = await query('SELECT id, sender_name, sender_type, text, created_at FROM messages WHERE session_id = ' + sessId + ' ORDER BY id DESC LIMIT 10');
  console.log('=== RECENT MESSAGES ===');
  console.log(JSON.stringify(msgs.rows || msgs, null, 2));

  if (pool && pool.end) await pool.end();
}
main().catch(err => { console.error(err); process.exit(1); });
" """

stdin, stdout, stderr = ssh.exec_command(cmd)
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))

cmd2 = 'ls -la /home/user615/RazeDehkade/public/uploads/assistants/session_14/ 2>/dev/null || ls -la /home/user615/RazeDehkade/public/uploads/assistants/'
stdin2, stdout2, stderr2 = ssh.exec_command(cmd2)
print('=== FILES IN UPLOADS ===')
print(stdout2.read().decode('utf-8'))

ssh.close()
