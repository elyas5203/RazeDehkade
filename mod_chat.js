const fs = require('fs'); 
let c = fs.readFileSync('public/chat.html', 'utf8'); 
c = c.replace('<button id="sound-toggle"', '<button class="quiet-button" type="button" onclick="window.location.href=\'/archive.html\'">بازگشت به بایگانی</button><button id="sound-toggle"'); 
fs.writeFileSync('public/chat.html', c);
