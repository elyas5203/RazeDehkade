const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function setup(options = {}) {
  const classes = new Set();
  const labels = new Map();
  const background = { tagName: 'MAIN', inert: false };
  const listeners = new Map();
  let scheduled;
  let removed = 0;
  const focus = { isConnected: true, focus() { this.focused = true; } };
  const overlay = { dataset: {}, setAttribute() {}, focus() {}, querySelector(selector) { if (!labels.has(selector)) labels.set(selector, { setAttribute() {}, focus() {} }); return labels.get(selector); }, remove() { removed++; } };
  const body = { children: [background], append() {}, classList: { add(...names) { names.forEach(n => classes.add(n)); }, remove(...names) { names.forEach(n => classes.delete(n)); } } };
  const context = vm.createContext({ document: { body, activeElement: focus, createElement() { return overlay; }, querySelector() { return null; }, getElementById(id) { return options.elements?.[id] || null; } }, window: { AudioContext: options.AudioContext, addEventListener(name, fn) { listeners.set(name, fn); }, removeEventListener(name) { listeners.delete(name); } }, performance: { now: () => 0 }, matchMedia: () => ({ matches: false }), requestAnimationFrame(fn) { scheduled = fn; return 1; }, cancelAnimationFrame() {}, Set });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/assets/js/hack-sequence.js'), 'utf8'), context);
  const engine = vm.runInContext('hackEngine', context);
  return { engine, overlay, background, classes, listeners, focus, tick: time => scheduled(time), removed: () => removed };
}

test('Cinematic sequence follows phases and always restores input at the end', () => {
  const scene = setup();
  scene.engine.start();
  assert.equal(scene.background.inert, true);
  for (const [time, phase] of [[0, 'interference'], [5000, 'fracture'], [13000, 'collapse'], [20000, 'silence'], [25000, 'presence'], [32000, 'identity'], [40000, 'transmission'], [51000, 'release']]) {
    scene.tick(time);
    assert.equal(scene.overlay.dataset.phase, phase);
  }
  scene.tick(54000);
  assert.equal(scene.engine.isRunning, false);
  assert.equal(scene.background.inert, false);
  assert.equal(scene.removed(), 1);
  assert.equal(scene.listeners.size, 0);
  assert.ok(scene.classes.has('hacked-theme'));
  assert.ok(scene.focus.focused);
});

test('Background-tab recovery skips stale phases and ends on the wall clock', () => {
  const scene = setup(); scene.engine.start(); scene.tick(60000);
  assert.equal(scene.engine.isRunning, false);
  assert.equal(scene.background.inert, false);
});

test('Duplicate triggers do not stack overlays; Escape recovers control', () => {
  const scene = setup(); scene.engine.start(); scene.engine.start();
  scene.listeners.get('keydown')({ key: 'Escape' });
  assert.equal(scene.removed(), 1);
  assert.equal(scene.background.inert, false);
  scene.engine.start(); scene.tick(32000);
  assert.equal(scene.overlay.dataset.phase, 'identity');
  scene.engine.stop(); assert.equal(scene.removed(), 2);
});

test('Sequence runs for 53.5 seconds and never loads a face or skull photograph', () => {
  const scene = setup(); scene.engine.start();
  assert.ok(scene.overlay.innerHTML.includes('☠'));
  assert.ok(scene.overlay.innerHTML.includes('DANGER'));
  assert.ok(!scene.overlay.innerHTML.includes('<img'));
  scene.tick(53499); assert.equal(scene.engine.isRunning, true);
  scene.tick(53500); assert.equal(scene.engine.isRunning, false);
});

test('Reduced motion shows the full transmission and skip restores prior inert state', () => {
  const scene = setup(); scene.background.inert = true; scene.engine.start();
  scene.engine.reducedMotion = true; scene.tick(38000);
  assert.equal(scene.overlay.querySelector('.breach-transmission').textContent, scene.engine.transmission);
  scene.overlay.querySelector('.breach-skip').onclick();
  assert.equal(scene.engine.isRunning, false);
  assert.equal(scene.background.inert, true);
});

test('Mute stops every sound source and cleanup permits another run', () => {
  const scene = setup(); scene.engine.start(); let stopped = 0;
  scene.engine.nodes.add({ stop() { stopped++; } });
  scene.engine.nodes.add({ stop() { stopped++; } });
  scene.engine.setSound(false);
  assert.equal(stopped, 2); assert.equal(scene.engine.nodes.size, 0);
  scene.engine.stop(); scene.engine.start(); assert.equal(scene.engine.isRunning, true);
  scene.engine.stop();
});

test('In-scene mute keeps the terminal button and preview checkbox synchronized', () => {
  const button = { setAttribute(name, value) { this[name] = value; } };
  const checkbox = { checked: true };
  const scene = setup({ elements: { 'sound-toggle': button, 'preview-sound': checkbox } });
  scene.engine.start(); scene.engine.setSound(true);
  assert.equal(button['aria-pressed'], 'true');
  scene.overlay.querySelector('.breach-mute').onclick();
  assert.equal(button['aria-pressed'], 'false');
  assert.equal(button.textContent, 'صدا خاموش');
  assert.equal(checkbox.checked, false);
  assert.equal(scene.overlay.querySelector('.breach-mute').textContent, 'پخش صدا');
  scene.engine.stop();
});

test('Actual audio graph construction and teardown includes modulators, filters and noise', async () => {
  const graph = [];
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = (source = false) => {
    const n = { frequency: param(), gain: param(), Q: param(), connect() {}, disconnect() { this.disconnected = true; }, start() {}, stop(at) { if (at !== undefined) { this.scheduledStop = at; return; } this.stopped = true; this.onended?.(); }, source };
    graph.push(n); return n;
  };
  class AudioContext {
    constructor() { this.currentTime = 0; this.sampleRate = 100; this.state = 'running'; this.destination = {}; }
    resume() { return Promise.resolve(); }
    createOscillator() { return node(true); }
    createBufferSource() { return node(true); }
    createGain() { return node(); }
    createBiquadFilter() { return node(); }
    createBuffer(_channels, size) { const data = new Float32Array(size); return { getChannelData() { return data; } }; }
  }
  const scene = setup({ AudioContext }); scene.engine.start(); scene.engine.setSound(true);
  await Promise.resolve(); scene.tick(5000);
  assert.equal(scene.engine.nodes.size, 4); // Two voices, a siren modulator, one noise source.
  assert.ok(graph.some(n => n.buffer));
  scene.engine.stop();
  assert.equal(scene.engine.nodes.size, 0);
  assert.ok(graph.every(n => n.disconnected));
  assert.ok(graph.filter(n => n.source).every(n => n.stopped));
});
