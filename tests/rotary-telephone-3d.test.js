'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'public/assets/css/emergency-auth.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/assets/js/emergency-auth.js'), 'utf8');
const master = fs.readFileSync(path.join(root, 'docs/ai/masters/MASTER_22_ROTARY_TELEPHONE_3D_MINIGAME.md'), 'utf8');

test('MASTER-22 Vintage Rotary Telephone & Dual Interaction (Click & Drag)', async t => {
  await t.test('1. Master specification documents vintage casing, zero-clipping and dual support', () => {
    assert.match(master, /MASTER-22/);
    assert.match(master, /کفش[ ‌]?فروشی تنها/);
    assert.match(master, /Clipping Bug/);
    assert.match(master, /Click/);
    assert.match(master, /Drag/);
  });

  await t.test('2. CSS defines rotary phone container, handset, display and zero z-clipping', () => {
    assert.match(css, /\.rotary-phone-container/);
    assert.match(css, /\.rotary-handset/);
    assert.match(css, /\.phone-display-screen/);
    assert.match(css, /\.phone-display-digits/);
    assert.match(css, /\.rotary-wheel-wrapper/);
    assert.match(css, /\.rotary-base-plate/);
    assert.match(css, /\.rotary-dial-rotor/);
    assert.match(css, /\.rotary-center-hub/);
    assert.match(css, /\.rotary-finger-stop/);
    assert.match(css, /\.rotary-hole/);
    assert.match(css, /\.rotary-actions/);
    assert.match(css, /\.rotary-clear-btn/);
    assert.match(css, /\.rotary-call-btn/);
    // Ensure no broken rotateX / preserve-3d intersection clipping on container
    assert.doesNotMatch(css, /\.rotary-phone-container\s*\{[^}]*perspective:\s*900px/);
  });

  await t.test('3. JavaScript implements dual support (Click automated rotation & Drag pointer tracking)', () => {
    assert.match(js, /rotaryRotor/);
    assert.match(js, /phoneDisplayDigits/);
    assert.match(js, /کفش فروشی تنها/);
    assert.match(js, /pointerdown/);
    assert.match(js, /pointermove/);
    assert.match(js, /pointerup/);
    assert.match(js, /addEventListener\('click'/);
    assert.match(js, /springBack/);
    assert.match(js, /playTickSFX/);
    assert.match(js, /rotaryClearBtn/);
    assert.match(js, /rotaryCallBtn/);
  });
});
