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
  'src/socket/index.js',
  'public/assets/js/admin-chat.js',
  'public/assets/js/user-chat.js'
];

console.log('🚀 Deploying fixed audio scripts to VPS (95.217.95.111)...');

for (const relPath of filesToDeploy) {
  const localFile = path.resolve(__dirname, '..', relPath);
  const remoteFile = `${REMOTE_BASE}/${relPath}`;
  const data = fs.readFileSync(localFile);
  console.log(`📤 Uploading: ${relPath} (${data.length} bytes)...`);
  execSync(`ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 user615@95.217.95.111 "cat > ${remoteFile}"`, {
    env,
    input: data,
    stdio: ['pipe', 'inherit', 'inherit']
  });
  console.log(`✅ Uploaded: ${relPath}`);
}

console.log('🔄 Reloading PM2 process raze-dehkade (id 0)...');
execSync(`ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 user615@95.217.95.111 "pm2 reload raze-dehkade"`, { env, stdio: 'inherit' });

console.log('🎉 Deployment completed successfully!');
