const fs = require('fs');

let html = fs.readFileSync('public/chat.html', 'utf8');
html = html.replace(/0840/g, '0900');
fs.writeFileSync('public/chat.html', html, 'utf8');

let testJs = fs.readFileSync('tests/cinematic-breach-choreography.test.js', 'utf8');
testJs = testJs.replace(/0840/g, '0900');
fs.writeFileSync('tests/cinematic-breach-choreography.test.js', testJs, 'utf8');

console.log('Successfully updated 0840 to 0900');
