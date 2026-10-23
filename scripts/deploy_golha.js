const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const filesToDeploy = [
  {
    local: 'public/index.html',
    remote: '/home/user615/RazeDehkade/public/index.html'
  },
  {
    local: 'public/golha/assets/css/golha-mobile.css',
    remote: '/home/user615/RazeDehkade/public/golha/assets/css/golha-mobile.css'
  },
  {
    local: 'public/golha/index.html',
    remote: '/home/user615/RazeDehkade/public/golha/index.html'
  },
  {
    local: 'public/golha/checkout.html',
    remote: '/home/user615/RazeDehkade/public/golha/checkout.html'
  },
  {
    local: 'public/golha/order-status.html',
    remote: '/home/user615/RazeDehkade/public/golha/order-status.html'
  },
  {
    local: 'public/golha/order_status.html',
    remote: '/home/user615/RazeDehkade/public/golha/order_status.html'
  },
  {
    local: 'public/assets/css/delivery.css',
    remote: '/home/user615/RazeDehkade/public/assets/css/delivery.css'
  }
];

const env = {
  ...process.env,
  SSH_ASKPASS: path.resolve(__dirname, 'askpass.bat'),
  SSH_ASKPASS_REQUIRE: 'force',
  DISPLAY: '1'
};

console.log('Connecting to VPS 95.217.95.111...');

// Ensure remote directories exist
execSync('ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "mkdir -p /home/user615/RazeDehkade/public/golha/assets/css"', { env, stdio: 'inherit' });

for (const item of filesToDeploy) {
  const localPath = path.resolve(__dirname, '..', item.local);
  if (!fs.existsSync(localPath)) {
    console.error(`Local file missing: ${localPath}`);
    process.exit(1);
  }
  console.log(`Deploying: ${item.local} -> ${item.remote}`);
  const content = fs.readFileSync(localPath);
  
  // Pipe content through ssh to remote cat
  execSync(`ssh -o StrictHostKeyChecking=no user615@95.217.95.111 "cat > ${item.remote}"`, {
    env,
    input: content,
    stdio: ['pipe', 'inherit', 'inherit']
  });
  console.log(`✓ Deployed ${item.local}`);
}

console.log('\nAll static flower store files deployed successfully without touching server process or ports.');
