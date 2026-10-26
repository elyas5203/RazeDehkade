const fs = require('fs');
const msgs = JSON.parse(fs.readFileSync('scripts/parsed_export2.json', 'utf8'));
console.log('Total:', msgs.length);
msgs.slice(-25).forEach((m, i) => {
  console.log(`\n=== Message ${msgs.length - 25 + i + 1} ===\n${m}\n`);
});
