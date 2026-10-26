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
  'public/emergency-auth.html',
  'public/assets/css/emergency-auth.css',
  'public/assets/js/emergency-auth.js',
  'public/assets/css/cyber-breach-engine.css',
  'public/assets/js/cyber-breach-engine.js',
  'public/assets/js/user-chat.js',
  'public/assets/js/admin-chat.js',
  'public/assets/js/admin-dashboard.js',
  'src/socket/index.js',
  'src/models/Session.js',
  'src/routes/sessions.js',
  'src/db/migrate.js'
];

console.log('1. Checking modified files...');
filesToDeploy.forEach(f => {
  if (!fs.existsSync(f)) {
    throw new Error(`File not found: ${f}`);
  }
});
console.log(`All ${filesToDeploy.length} files exist locally.`);

console.log('2. Creating tar bundle...');
const tarFile = path.resolve(__dirname, '..', 'deploy_hack_auth.tar.gz');
if (fs.existsSync(tarFile)) fs.unlinkSync(tarFile);

execSync(`tar -czf "${tarFile}" ${filesToDeploy.join(' ')}`, {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit'
});
console.log(`Bundle created (${fs.statSync(tarFile).size} bytes).`);

console.log('3. Streaming tar bundle to VPS...');
const bundleBuffer = fs.readFileSync(tarFile);
execSync(`ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 user615@95.217.95.111 "tar -xzf - -C ${REMOTE_BASE}"`, {
  env,
  input: bundleBuffer,
  stdio: ['pipe', 'inherit', 'inherit']
});
console.log('Files unpacked successfully on VPS.');

console.log('4. Running database migration on VPS...');
execSync(`ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 user615@95.217.95.111 "cd ${REMOTE_BASE} && node src/db/migrate.js"`, {
  env,
  stdio: 'inherit'
});

console.log('5. Reloading PM2 process raze-dehkade...');
execSync(`ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 user615@95.217.95.111 "pm2 reload raze-dehkade"`, {
  env,
  stdio: 'inherit'
});

console.log('6. Checking PM2 status...');
const listOutput = execSync(`ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 user615@95.217.95.111 "pm2 list"`, {
  env
}).toString();
console.log(listOutput);

// Cleanup
if (fs.existsSync(tarFile)) fs.unlinkSync(tarFile);
console.log('🎉 Deployment to VPS completed successfully!');
