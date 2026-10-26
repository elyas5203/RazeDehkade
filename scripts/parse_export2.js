const fs = require('fs');
const content = fs.readFileSync('c:/Users/kingk/Downloads/Telegram Desktop/ChatExport_2026-10-26 (2)/messages.html', 'utf8');

const matches = [];
const regex = /<div class="text">([\s\S]*?)<\/div>/g;
let m;
while ((m = regex.exec(content)) !== null) {
  const text = m[1].replace(/<br\s*[\/]?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
  if (text && text.length > 5) matches.push(text);
}
console.log('Total extracted messages:', matches.length);
fs.writeFileSync('scripts/parsed_export2.json', JSON.stringify(matches, null, 2), 'utf8');
console.log('Saved to scripts/parsed_export2.json');
