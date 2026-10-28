const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const jsSource = fs.readFileSync(path.join(__dirname, '../public/assets/js/emergency-auth.js'), 'utf8');
const cssSource = fs.readFileSync(path.join(__dirname, '../public/assets/css/emergency-auth.css'), 'utf8');
const htmlSource = fs.readFileSync(path.join(__dirname, '../public/emergency-auth.html'), 'utf8');

test('MASTER-33: Stationary Rotary Phone Hub & Clean UI Fidelity', async t => {
  await t.test('1. Rotary center hub is positioned outside rotaryRotor as a stationary sibling', () => {
    // rotaryRotor must close before rotaryCenterHub
    const rotorIdx = jsSource.indexOf('id="rotaryRotor"');
    const hubIdx = jsSource.indexOf('class="rotary-center-hub" id="rotaryCenterHub"');
    assert.ok(rotorIdx > 0, 'rotaryRotor exists');
    assert.ok(hubIdx > 0, 'rotaryCenterHub exists');
    assert.ok(hubIdx > rotorIdx, 'rotaryCenterHub is defined after rotaryRotor');
    // Ensure rotaryRotor has no child rotary-center-hub
    const rotorBlock = jsSource.substring(rotorIdx, rotorIdx + 50);
    assert.match(rotorBlock, /id="rotaryRotor"><\/div>/, 'rotaryRotor must be an empty container closing immediately');
  });

  await t.test('2. CSS gives rotary-center-hub stationary absolute centering and z-index', () => {
    assert.match(cssSource, /\.rotary-center-hub\s*\{[^}]*position:\s*absolute/);
    assert.match(cssSource, /\.rotary-center-hub\s*\{[^}]*pointer-events:\s*none/);
    assert.match(cssSource, /\.rotary-center-hub\s*\{[^}]*z-index:\s*10/);
  });

  await t.test('3. Newspaper puzzle pieces "مز" and "داک" are separated in button pieces list', () => {
    const piecesMatch = jsSource.match(/pieces:\s*\[([^\]]+)\]/);
    assert.ok(piecesMatch, 'pieces list exists');
    const pieces = piecesMatch[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
    const mazIdx = pieces.indexOf('مز');
    const dakIdx = pieces.indexOf('داک');
    assert.ok(mazIdx >= 0 && dakIdx >= 0, 'both pieces exist');
    assert.ok(Math.abs(mazIdx - dakIdx) > 1, 'مز and داک must not be adjacent');
  });

  await t.test('4. Newspaper header banner is hidden and not appended', () => {
    assert.match(cssSource, /\.newspaper-header-banner\s*\{[^}]*display:\s*none\s*!important/);
  });

  await t.test('5. Badges are removed or hidden in CSS and questionnaire DOM', () => {
    assert.match(cssSource, /\.q-badge\s*\{[^}]*display:\s*none\s*!important/);
    assert.doesNotMatch(htmlSource, /شماره‌ات را وارد کن و سرنخ‌ها را بررسی کن/);
  });
});
