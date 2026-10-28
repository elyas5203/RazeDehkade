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
  'public/assets/sounds/cyber-alarm.mp3',
  'public/assets/sounds/real-siren.mp3',
  'public/assets/sounds/cyber-alarm.old.mp3',
  'public/mazdak.jpg',
  'public/assets/js/cyber-breach-engine.js',
  'public/assets/js/user-chat.js',
  'public/assets/css/cyber-breach-engine.css',
  'public/assets/css/akbari-breach-master.css',
  'public/chat.html',
  'tests/cinematic-breach-choreography.test.js',
  'docs/ai/masters/MASTER_28_CINEMATIC_BREACH_CHOREOGRAPHY_AND_STORYLINE.md',
  'MASTER_CINEMATIC_BREACH_CHOREOGRAPHY_AND_STORYLINE.md',
  'ai-kit/tasks/TASK-011-CINEMATIC-BREACH-CHOREOGRAPHY-AND-STORYLINE.md',
  'ai-kit/memory/STATE.md',
  'scripts/test-runner.js'
];

console.log('1. Checking files existence locally...');
filesToDeploy.forEach(f => {
  if (!fs.existsSync(f)) {
    throw new Error(`Local file missing: ${f}`);
  }
  const stat = fs.statSync(f);
  console.log(`  ✓ ${f} (${stat.size} bytes)`);
});

console.log('\n2. Creating compressed tar bundle...');
const tarFile = path.resolve(__dirname, '..', 'deploy_cinematic_siren.tar.gz');
if (fs.existsSync(tarFile)) fs.unlinkSync(tarFile);

execSync(`tar -czf "${tarFile}" ${filesToDeploy.join(' ')}`, {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit'
});
console.log(`Bundle created: ${tarFile} (${fs.statSync(tarFile).size} bytes).`);

console.log('\n3. Uploading and extracting tar bundle on VPS...');
const bundleBuffer = fs.readFileSync(tarFile);
execSync(`ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 user615@95.217.95.111 "tar -xzf - -C ${REMOTE_BASE}"`, {
  env,
  input: bundleBuffer,
  stdio: ['pipe', 'inherit', 'inherit']
});
console.log('✓ Files successfully extracted to VPS!');

console.log('\n4. Reloading PM2 process raze-dehkade...');
execSync(`ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 user615@95.217.95.111 "pm2 reload raze-dehkade"`, {
  env,
  stdio: 'inherit'
});

console.log('\n5. Running tests on VPS...');
const testResult = execSync(
  `ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 user615@95.217.95.111 "cd ${REMOTE_BASE} && node --test tests/cinematic-breach-choreography.test.js"`,
  { env }
).toString();
console.log(testResult);

console.log('\n6. Checking PM2 status...');
const pm2Status = execSync(
  `ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 user615@95.217.95.111 "pm2 status"`,
  { env }
).toString();
console.log(pm2Status);

// Clean up local tar
if (fs.existsSync(tarFile)) fs.unlinkSync(tarFile);

console.log('🎉 Deployment to VPS completed successfully!');
