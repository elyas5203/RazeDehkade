const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('an open chat updates only after hack and upload activity end', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../public/assets/js/user-chat.js'), 'utf8');
  const methods = source.match(/function clientAssetFingerprint\(doc\) \{[\s\S]*?(?=function initSocket\()/)?.[0];
  assert.ok(methods);
  const asset = value => ({ getAttribute: () => value });
  const loadedDoc = {
    hidden: true,
    querySelectorAll: selector => selector.includes('audio') ? [] : [asset('/assets/js/user-chat.js?v=old')],
    querySelector: () => null,
    getElementById: () => ({ value: '' }),
    addEventListener: () => {},
  };
  const latestDoc = {
    querySelectorAll: () => [asset('/assets/js/user-chat.js?v=new')],
  };
  let now = 40000;
  let intervalCallback;
  let reloads = 0;
  const sandbox = {
    document: loadedDoc,
    window: {
      cyberBreachEngine: { isPlaying: true },
      addEventListener: () => {},
      location: { reload: () => { reloads++; } },
    },
    sessionData: { is_hacked: 0 },
    activeUserUpload: null,
    liveAudioRequested: false,
    Date: { now: () => now },
    AbortController,
    DOMParser: class { parseFromString() { return latestDoc; } },
    fetch: async () => ({ ok: true, text: async () => '<html></html>' }),
    setInterval: callback => { intervalCallback = callback; },
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(`${methods}\ninitClientVersionGuard();`, sandbox);
  assert.equal(typeof intervalCallback, 'function');
  now = 80000;
  await intervalCallback();
  assert.equal(reloads, 0, 'hack in progress must keep the current page');

  sandbox.window.cyberBreachEngine.isPlaying = false;
  sandbox.activeUserUpload = {};
  await intervalCallback();
  assert.equal(reloads, 0, 'upload in progress must keep the current page');

  sandbox.activeUserUpload = null;
  await intervalCallback();
  assert.equal(reloads, 1, 'idle hidden page can safely receive the new version');
});
