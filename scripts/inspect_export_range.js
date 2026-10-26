const fs = require('fs');
const msgs = JSON.parse(fs.readFileSync('scripts/parsed_export2.json', 'utf8'));
for (let i = 70; i <= 107; i++) {
  console.log(`\n=== Message ${i} ===\n${msgs[i-1]}\n`);
}
