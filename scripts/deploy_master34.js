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
  'public/assets/css/cyber-breach-engine.css',
  'public/assets/js/cyber-breach-engine.js',
  'public/assets/css/emergency-auth.css',
  'public/assets/js/emergency-auth.js',
  'public/assets/js/user-chat.js',
  'public/assets/js/vault-3d.js',
  'public/emergency-auth.html',
  'tests/cyber-breach-timing-and-dossier-fidelity.test.js',
  'tests/cinematic-breach-choreography.test.js',
  'tests/emergency-question-fidelity.test.js',
  'tests/stationary-rotary-dial.test.js',
  'tests/mazdak-cyber-warfare.test.js',
  'docs/ai/masters/MASTER_34_CYBER_BREACH_ENHANCEMENTS_AND_EVIDENCE_FIDELITY.md',
  'MASTER_CYBER_BREACH_ENHANCEMENTS_AND_EVIDENCE_FIDELITY.md'
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
const tarFile = path.resolve(__dirname, '..', 'deploy_master34.tar.gz');
if (fs.existsSync(tarFile)) fs.unlinkSync(tarFile);

execSync(`tar -czf "${tarFile}" ${filesToDeploy.join(' ')}`, {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit'
});
console.log(`Bundle created: ${tarFile} (${fs.statSync(tarFile).size} bytes).`);

console.log('\n3. Transferring bundle to remote server (95.217.95.111)...');
execSync(`scp -o StrictHostKeyChecking=no "${tarFile}" user615@95.217.95.111:${REMOTE_BASE}/deploy_master34.tar.gz`, {
  env,
  stdio: 'inherit'
});
console.log('Transfer complete.');

console.log('\n4. Extracting bundle on remote server...');
const out1 = execSync('ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "cd /home/user615/RazeDehkade && tar -xzf deploy_master34.tar.gz && rm -f deploy_master34.tar.gz"', { env });
console.log('Extraction complete.', out1.toString());

console.log('\n5. Running tests on remote server...');
try {
  const out2 = execSync('ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "cd /home/user615/RazeDehkade && node --test tests/cyber-breach-timing-and-dossier-fidelity.test.js tests/cinematic-breach-choreography.test.js tests/emergency-question-fidelity.test.js tests/stationary-rotary-dial.test.js tests/mazdak-cyber-warfare.test.js"', { env });
  console.log(out2.toString());
} catch (testErr) {
  console.log('Remote test error details:\n' + (testErr.stdout ? testErr.stdout.toString() : testErr.message));
  throw testErr;
}

console.log('\n6. Reloading PM2 raze-dehkade...');
const out3 = execSync('ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "pm2 reload raze-dehkade"', { env });
console.log(out3.toString());

console.log('\n7. Verifying remote PM2 status...');
const statusOutput = execSync(`ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "pm2 status raze-dehkade"`, {
  env
}).toString();
console.log(statusOutput);

console.log('\n8. Probing live server HTTP response...');
const curlOutput = execSync(`ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "curl -s -I http://127.0.0.1:3000/chat.html | head -n 5"`, {
  env
}).toString();
console.log(curlOutput);

console.log('\n✅ Deployment MASTER-34 successfully completed!');
