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
  'public/assets/css/emergency-auth.css',
  'public/assets/js/emergency-auth.js',
  'public/assets/js/user-chat.js',
  'public/emergency-auth.html',
  'server.js',
  'src/routes/emergencyAuth.js',
  'src/routes/sessions.js',
  'src/utils/videoTranscoder.js',
  'tests/emergency-auth-submissions.test.js',
  'tests/emergency-question-fidelity.test.js',
  'tests/natural-breach-and-auth-handoff.test.js',
  'tests/streamable-mp4-and-submission-answers.test.js',
  'tests/stationary-rotary-dial.test.js',
  'docs/ai/masters/MASTER_33_EMERGENCY_AUTH_QUESTIONS_OVERHAUL_AND_STABILITY.md',
  'MASTER_EMERGENCY_AUTH_QUESTIONS_OVERHAUL_AND_STABILITY.md'
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
const tarFile = path.resolve(__dirname, '..', 'deploy_master33.tar.gz');
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
  `ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 user615@95.217.95.111 "cd ${REMOTE_BASE} && node --test tests/stationary-rotary-dial.test.js tests/emergency-question-fidelity.test.js tests/emergency-auth-submissions.test.js tests/streamable-mp4-and-submission-answers.test.js"`,
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

console.log('🎉 Deployment of MASTER-33 to VPS completed successfully!');
