import os
import sys
import paramiko

sys.stdout.reconfigure(encoding='utf-8')

SERVER_IP = '95.217.95.111'
USERNAME = 'user615'
PASSWORD = 'elyas5203'
REMOTE_BASE = '/home/user615/RazeDehkade'

FILES_TO_UPLOAD = [
    'MASTER_PLAN_DELIVERY_BLACKOUT_ADMIN_FLOW.md',
    'MASTER_ADMIN_UX_COUNTDOWN_BLACKOUT.md',
    'MASTER_ADMIN_MOBILE_AND_STABILITY.md',
    'MASTER_ADMIN_MOBILE_CHAT_COMPOSER.md',
    'MASTER_CANNED_RESPONSES_PROGRESS_TRACKING.md',
    'MASTER_VAULT_AND_PORTRAITS_V2.md',
    'server.js',
    'public/admin/chat.html',
    'public/assets/css/admin.css',
    'public/assets/js/admin-chat.js',
    'public/chat.html',
    'public/assets/css/vault-3d.css',
    'public/assets/js/vault-3d.js',
    'public/assets/js/user-chat.js',
    'public/admin/dashboard.html',
    'public/assets/css/admin-dashboard.css',
    'public/assets/js/admin-dashboard.js',
    'public/golha/index.html',
    'public/golha/checkout.html',
    'public/golha/order-status.html',
    'public/golha/order_status.html',
    'public/assets/css/delivery.css',
    'public/assets/js/delivery.js',
    'public/assets/js/audio-unlock.js',
    'public/assets/drone/drone-phase1-takeoff.jpg',
    'public/assets/drone/drone-phase2-transit.jpg',
    'public/assets/drone/drone-phase3-drop.jpg',
    'public/assets/drone/drone-phase4-landed.jpg',
    'public/assets/sounds/tactical-alarm.wav',
    'public/assets/sounds/cyber-intro.wav',
    'public/assets/sounds/tactical-scan.wav',
    'src/db/migrate.js',
    'src/db/pool.js',
    'src/db/migrations/003_vault_unlock_support.sql',
    'src/models/Session.js',
    'src/routes/sessions.js',
    'src/routes/store.js',
    'src/socket/index.js',
    'src/utils/logger.js',
    'tests/admin-ux-and-blackout.test.js',
    'tests/admin-stability-and-clear.test.js',
    'tests/admin-scenario-progress.test.js',
    'tests/vault-passcode-and-lock.test.js',
    'tests/drone-delivery-class17.test.js'
]

def main():
    print(f"Connecting to VPS {SERVER_IP}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(SERVER_IP, username=USERNAME, password=PASSWORD, timeout=15)
    sftp = ssh.open_sftp()
    print("SSH & SFTP Connected successfully.")

    for rel_path in FILES_TO_UPLOAD:
        local_path = os.path.normpath(os.path.join(os.getcwd(), rel_path))
        if not os.path.exists(local_path):
            print(f"Warning: Local file not found: {local_path}")
            continue

        remote_path = f"{REMOTE_BASE}/{rel_path.replace(os.sep, '/')}"
        remote_dir = os.path.dirname(remote_path)

        # Ensure remote directory exists
        dir_parts = remote_dir.split('/')
        accum = ''
        for part in dir_parts:
            if not part:
                continue
            accum += '/' + part
            try:
                sftp.stat(accum)
            except IOError:
                try:
                    sftp.mkdir(accum)
                except IOError:
                    pass

        print(f"Uploading {rel_path} -> {remote_path}...")
        sftp.put(local_path, remote_path)

    sftp.close()

    print("\nRunning database migrations on VPS...")
    stdin, stdout, stderr = ssh.exec_command('cd /home/user615/RazeDehkade && node src/db/migrate.js')
    m_out = stdout.read().decode('utf-8')
    m_err = stderr.read().decode('utf-8')
    print(m_out)
    if m_err:
        print("MIGRATE ERR:", m_err)

    print("\nRestarting raze-dehkade PM2 process on VPS...")
    stdin, stdout, stderr = ssh.exec_command('cd /home/user615/RazeDehkade && pm2 restart raze-dehkade && pm2 status')
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    print(out)
    if err:
        print("STDERR:", err)

    # Run tests on server
    print("\nRunning automated tests on VPS...")
    stdin, stdout, stderr = ssh.exec_command('cd /home/user615/RazeDehkade && node --test tests/drone-delivery-class17.test.js tests/vault-passcode-and-lock.test.js tests/admin-scenario-progress.test.js tests/admin-ux-and-blackout.test.js')
    test_out = stdout.read().decode('utf-8')
    test_err = stderr.read().decode('utf-8')
    print(test_out)
    if test_err:
        print("TEST ERR:", test_err)

    ssh.close()
    print("\nDeployment finished successfully!")

if __name__ == '__main__':
    main()
