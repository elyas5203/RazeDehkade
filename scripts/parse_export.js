const fs = require('fs');
const path = require('path');

const filePath = 'c:/Users/kingk/Downloads/Telegram Desktop/ChatExport_2026-10-26 (1)/messages.html';
const content = fs.readFileSync(filePath, 'utf8');

const regex = /<div class="message[^"]*" id="([^"]*)">([\s\S]*?)(?=(?:<div class="message|<div class="page_footer|<\/body>))/g;
let match;
const results = [];

while ((match = regex.exec(content)) !== null) {
  const id = match[1];
  const block = match[2];
  const textMatch = /<div class="text[^"]*">([\s\S]*?)<\/div>/.exec(block);
  const fileMatch = /href="([^"]*files\/[^"]*)"/.exec(block);
  const titleMatch = /<div class="title bold">([\s\S]*?)<\/div>/.exec(block);
  
  if (textMatch || fileMatch || titleMatch) {
    let t = textMatch ? textMatch[1].replace(/<br\s*[\/]?>/gi, '\n').replace(/<[^>]+>/g, '').trim() : '';
    let f = fileMatch ? fileMatch[1] : '';
    let title = titleMatch ? titleMatch[1].trim() : '';
    results.push({ id, file: f, title, text: t });
  }
}

fs.writeFileSync('scripts/parsed_export.json', JSON.stringify(results, null, 2), 'utf8');
console.log(`Parsed ${results.length} items`);
