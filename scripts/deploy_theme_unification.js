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
  'public/assets/css/cyber-breach-engine.css',
  'MASTER_THEME_UNIFICATION_AND_EMERGENCY_PORTAL.md',
  'docs/ai/masters/MASTER_14_VISUAL_THEME_UNIFICATION_AND_PORTAL_POLISH.md',
  'docs/ai/DECISIONS.md',
  'docs/ai/CHANGELOG.md'
];

console.log('📦 Creating compressed deployment bundle...');
const tarFile = path.resolve(__dirname, '..', 'deploy_bundle.tar.gz');
if (fs.existsSync(tarFile)) fs.unlinkSync(tarFile);

execSync(`tar -czf "${tarFile}" ${filesToDeploy.join(' ')}`, {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit'
});
console.log(`✅ Bundle created: ${fs.statSync(tarFile).size} bytes`);

console.log('🚀 Streaming bundle to VPS and extracting in single operation...');
const bundleBuffer = fs.readFileSync(tarFile);

execSync(`ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 user615@95.217.95.111 "tar -xzf - -C ${REMOTE_BASE}"`, {
  env,
  input: bundleBuffer,
  stdio: ['pipe', 'inherit', 'inherit']
});
console.log('✅ Remote files unpacked successfully!');

console.log('🔄 Reloading PM2 process raze-dehkade (id 0)...');
execSync(`ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 user615@95.217.95.111 "pm2 reload raze-dehkade"`, {
  env,
  stdio: 'inherit'
});
console.log('✅ PM2 process 0 reloaded.');

// Cleanup local bundle
if (fs.existsSync(tarFile)) fs.unlinkSync(tarFile);

console.log('🎉 Visual Theme Unification deployment completed 100%!');
