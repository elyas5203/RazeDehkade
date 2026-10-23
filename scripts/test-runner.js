const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const testsDir = path.join(__dirname, '..', 'tests');
const files = fs.readdirSync(testsDir)
  .filter(f => f.endsWith('.test.js'))
  .map(f => path.join('tests', f));

let hasFailed = false;
let passedCount = 0;
console.log(`Executing ${files.length} test suites directly...`);

for (const file of files) {
  console.log(`\n========================================\n▶ Executing: ${file}\n========================================`);
  const result = spawnSync(process.execPath, [file], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: process.env
  });
  if (result.status !== 0) {
    console.error(`\n❌ FAILED: ${file} (exit code ${result.status})`);
    hasFailed = true;
    break;
  } else {
    passedCount++;
    console.log(`✅ PASSED: ${file}`);
  }
}

if (hasFailed) {
  console.error(`\n❌ Test suite failed. Passed: ${passedCount}/${files.length}`);
  process.exit(1);
} else {
  console.log(`\n🎉 All ${files.length} test suites passed 100% green!`);
  process.exit(0);
}
