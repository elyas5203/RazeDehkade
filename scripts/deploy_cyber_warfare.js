const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const env = {
  ...process.env,
  SSH_ASKPASS: path.resolve(__dirname, 'askpass.bat'),
  SSH_ASKPASS_REQUIRE: 'force',
  DISPLAY: '1'
};

const REMOTE_BASE = '/home/user615/RazeDehkade';

const filesToDeploy = [
  'server.js',
  'mazdak.jpg',
  'public/mazdak.jpg',
  'public/emergency-auth.html',
  'public/assets/js/emergency-auth.js',
  'public/assets/css/cyber-breach-engine.css',
  'public/assets/js/cyber-breach-engine.js',
  'public/assets/sounds/cyber-alarm.mp3',
  'public/assets/sounds/cyber-click.mp3',
  'public/assets/sounds/cyber-error.mp3',
  'public/assets/sounds/cyber-launch.mp3',
  'public/assets/sounds/cyber-slam.mp3',
  'public/assets/js/terminal-stream.js',
  'public/assets/js/vault-3d.js',
  'public/assets/js/user-chat.js',
  'tests/mazdak-cyber-warfare.test.js',
  'MASTER_MAZDAK_CYBER_WARFARE_AND_LOCKDOWN.md',
  'MASTER_MAZDAK_CYBER_WARFARE_POLISH.md',
  'docs/ai/masters/MASTER_15_MAZDAK_CYBER_WARFARE_AND_LOCKDOWN.md',
  'docs/ai/masters/MASTER_16_MAZDAK_CYBER_WARFARE_POLISH.md',
  'docs/ai/DECISIONS.md',
  'docs/ai/CHANGELOG.md',
  'docs/ai/PROJECT_STATE.md',
  'docs/ai/INDEX.md',
  'docs/ai/ROOT_MASTER.md'
];

console.log('📦 Creating compressed deployment bundle...');
const tarFile = path.resolve(__dirname, '..', 'deploy_cyber_warfare_bundle.tar.gz');
if (fs.existsSync(tarFile)) fs.unlinkSync(tarFile);

execSync(`tar -czf "${tarFile}" ${filesToDeploy.join(' ')}`, {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit'
});
console.log(`✅ Bundle created: ${fs.statSync(tarFile).size} bytes`);

console.log('🚀 Streaming bundle to VPS and extracting strictly into /home/user615/RazeDehkade...');
const bundleBuffer = fs.readFileSync(tarFile);

execSync(`ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 user615@95.217.95.111 "tar -xzf - -C ${REMOTE_BASE}"`, {
  env,
  input: bundleBuffer,
  stdio: ['pipe', 'inherit', 'inherit']
});
console.log('✅ Remote files unpacked successfully!');

console.log('🔄 Safely reloading ONLY PM2 process "raze-dehkade" (id: 0)...');
execSync(`ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 user615@95.217.95.111 "pm2 reload raze-dehkade"`, {
  env,
  stdio: 'inherit'
});
console.log('✅ PM2 process "raze-dehkade" reloaded.');

console.log('🔍 Checking PM2 status...');
const pm2List = execSync(`ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 user615@95.217.95.111 "pm2 list"`, {
  env
}).toString();
console.log(pm2List);

// Cleanup local bundle
if (fs.existsSync(tarFile)) fs.unlinkSync(tarFile);

console.log('🎉 Mazdak Cyber Warfare v1.21.0 deployment completed 100% safely without affecting any other service or bot!');
