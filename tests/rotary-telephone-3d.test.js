'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'public/assets/css/emergency-auth.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/assets/js/emergency-auth.js'), 'utf8');
const master = fs.readFileSync(path.join(root, 'docs/ai/masters/MASTER_22_ROTARY_TELEPHONE_3D_MINIGAME.md'), 'utf8');

test('MASTER-22 3D Rotary Telephone & Zero-Clipping Contract', async t => {
  await t.test('1. Master specification documents 3D chassis, phone body asset and zero-clipping fix', () => {
    assert.match(master, /MASTER-22/);
    assert.match(master, /real-rotary-phone-body\.jpg/);
    assert.match(master, /کفش فروشی تنها/);
    assert.match(master, /Clipping Bug/);
  });

  await t.test('2. Photorealistic 3D telephone image asset exists on disk', () => {
    const assetPath = path.join(root, 'public/assets/images/telephone/real-rotary-phone-body.jpg');
    assert.ok(fs.existsSync(assetPath), 'real-rotary-phone-body.jpg must exist in public assets');
    const stat = fs.statSync(assetPath);
    assert.ok(stat.size > 50000, 'Image asset must be a valid high-resolution file');
  });

  await t.test('3. CSS defines 3D telephone chassis, display readout and zero z-clipping', () => {
    assert.match(css, /\.rotary-phone-chassis/);
    assert.match(css, /real-rotary-phone-body\.jpg/);
    assert.match(css, /\.phone-display-screen/);
    assert.match(css, /\.phone-display-digits/);
    assert.match(css, /\.rotary-wheel-wrapper/);
    assert.match(css, /\.rotary-base-plate/);
    assert.match(css, /\.rotary-dial-face/);
    assert.match(css, /\.rotary-face-num/);
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

  await t.test('4. JavaScript builds 3D telephone DOM, numbers 1-0 and accessibility click filtering', () => {
    assert.match(js, /rotary-phone-chassis/);
    assert.match(js, /rotaryDialFace/);
    assert.match(js, /rotaryRotor/);
    assert.match(js, /phoneDisplayDigits/);
    assert.match(js, /کفش فروشی تنها/);
    assert.match(js, /event\.detail !== 0/);
    assert.match(js, /playTickSFX/);
    assert.match(js, /rotaryClearBtn/);
    assert.match(js, /rotaryCallBtn/);
  });
});
