'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const js = read('public/assets/js/cyber-breach-engine.js');
const css = read('public/assets/css/cyber-breach-engine.css');
const master = read('docs/ai/masters/MASTER_21_CINEMATIC_BREACH_SENSORY_OVERHAUL.md');

test('MASTER-21 cinematic breach sensory contract', async t => {
  await t.test('master fixes scope, safety and deployment isolation', () => {
    assert.match(master, /بدون پورت یا سرویس تازه/);
    assert.match(master, /کمتر از سه فلش در ثانیه/);
    assert.match(master, /prefers-reduced-motion/);
  });

  await t.test('live engine builds HUD, layered audio and narrative impacts', () => {
    for (const marker of ['breach-cinematic-hud', 'breach-threat-meter', 'breach-reticle',
      'breach-wave', 'breach-data-shards', 'blackoutHandshake', 'setCinematicPhase']) {
      assert.ok(js.includes(marker), `missing ${marker}`);
    }
    for (const asset of ['cyber-intro.wav', 'cyber-alarm.mp3', 'cyber-launch.mp3',
      'cyber-slam.mp3', 'cyber-error.mp3', 'tactical-scan.wav', 'tactical-alarm.wav']) {
      assert.ok(js.includes(asset), `missing audio cue ${asset}`);
      assert.ok(fs.existsSync(path.join(root, 'public/assets/sounds', asset)), `missing asset ${asset}`);
    }
    assert.match(js, /stopSamples\(\)/);
    assert.match(js, /classList\.remove\('active', 'is-docked'\)/);
  });

  await t.test('effects are GPU-friendly and reduced-motion aware', () => {
    assert.match(css, /MASTER-21/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(css, /transform:translate3d/);
    assert.match(css, /breachEdgeBreathe 1\.6s/);
    assert.doesNotMatch(css, /breachEdgeBreathe [0-9.]+ms/);
  });
});
