const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('initial chat load fetches visible vault images and defers hidden assets until unlock', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../public/assets/js/vault-3d.js'), 'utf8');
  const page = fs.readFileSync(path.join(__dirname, '../public/chat.html'), 'utf8');
  const requested = [];
  const idleTasks = [];
  let onReady;
  class FakeImage {
    set src(url) {
      requested.push(url);
      queueMicrotask(() => this.onload?.());
    }
  }
  const sandbox = {
    Image: FakeImage,
    window: { requestIdleCallback: callback => idleTasks.push(callback) },
    document: {
      addEventListener: (event, callback) => { if (event === 'DOMContentLoaded') onReady = callback; },
      getElementById: () => null,
    },
    localStorage: { length: 0 },
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(source, sandbox);
  onReady();
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(requested.length, 3);
  assert.ok(requested.every(url => !url.includes('kraft')));
  assert.doesNotMatch(page, /rel="preload" href="[^"]*real-kraft/);
  assert.equal(idleTasks.length, 0);

  sandbox.window.setVaultAdminUnlocked(true);
  assert.equal(idleTasks.length, 1);
  await idleTasks[0]();
  assert.ok(requested.some(url => url.includes('real-kraft-pocket-front')));
  assert.ok(requested.some(url => url.includes('real-vault-interior')));
  assert.equal(requested.length, new Set(requested).size);
});
