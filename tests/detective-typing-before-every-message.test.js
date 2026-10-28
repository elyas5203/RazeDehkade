const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'public/assets/js/cyber-breach-engine.js'), 'utf8');
const chatSource = fs.readFileSync(path.join(root, 'public/assets/js/user-chat.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'public/chat.html'), 'utf8');
const methods = source.match(/  setDetectiveTyping\(isTyping\) \{[\s\S]*?(?=  typewriterInTerminal\()/)?.[0];

test('every scripted detective message displays typing before delivery', () => {
  assert.ok(methods, 'typing and message methods are present');
  const scheduled = [];
  const messages = [];
  const indicator = {
    textContent: '',
    style: { display: '', removeProperty(key) { if (key === 'display') this.display = ''; } },
  };
  const box = { scrollHeight: 100, scrollTop: 0, appendChild(node) { messages.push(node); } };
  const sandbox = {
    document: { getElementById: () => null, createElement: () => ({ dataset: {} }) },
    window: {},
    setTimeout: (callback, wait) => { scheduled.push({ callback, wait }); },
    Date,
  };
  const engine = vm.runInNewContext(`new (class {${methods}})()`, sandbox);
  Object.assign(engine, {
    isPlaying: true,
    sceneGeneration: 1,
    dom: { typingIndicator: indicator, messagesBox: box },
    deliveredBattleMessages: new Set(),
    pendingDetectiveMessages: new Set(),
    detectiveTypingStartedAt: 0,
  });

  engine.appendChatMessage({ id: 'first', senderType: 'admin', content: 'پیام اول' });
  assert.match(indicator.textContent, /کارآگاه در حال نوشتن است/);
  assert.equal(messages.length, 0, 'message must wait while typing is visible');
  assert.ok(scheduled[0].wait >= 2000);
  engine.appendChatMessage({ id: 'first', senderType: 'admin', content: 'پیام اول' });
  assert.equal(scheduled.length, 1, 'duplicate event cannot schedule a duplicate message');
  scheduled.shift().callback();
  assert.equal(messages.length, 1);
  assert.equal(indicator.textContent, '');

  engine.setDetectiveTyping(true);
  engine.detectiveTypingStartedAt = Date.now() - 3000;
  engine.appendChatMessage({ id: 'second', senderType: 'admin', content: 'پیام دوم' });
  assert.equal(messages.length, 2, 'existing typing interval is reused');
  assert.equal(indicator.textContent, '');
});

test('student page has no microphone warning or activation button', () => {
  assert.doesNotMatch(page, /microphone-help|microphone-enable-btn|فعال‌سازی میکروفون/);
  assert.doesNotMatch(chatSource, /updateMicrophoneHelp|microphone-enable-btn/);
  assert.match(page, /cyber-breach-engine\.js\?v=20261028_typing_fix/);
  assert.match(page, /user-chat\.js\?v=20261028_typing_fix/);
});
