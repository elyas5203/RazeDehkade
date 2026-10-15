const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');

test('Slot 4 Full-Bleed 3D Vault, Zero-Spoiler Policy, and Reset-on-Refresh Verification', async (t) => {
  await t.test('VAULT_SLOT4_MASTER.md and UI/UX 3D Vault skill enforce full-bleed, zero-spoiler, and reset-on-refresh', () => {
    const masterPath = path.join(rootDir, 'VAULT_SLOT4_MASTER.md');
    const skillPath = path.join(rootDir, '.agents', 'skills', 'ui-ux-3d-vault-design', 'SKILL.md');
    assert.ok(fs.existsSync(masterPath), 'VAULT_SLOT4_MASTER.md must exist');
    assert.ok(fs.existsSync(skillPath), 'ui-ux-3d-vault-design SKILL.md must exist');
    const masterContent = fs.readFileSync(masterPath, 'utf8');
    assert.ok(masterContent.includes('گاوصندوق سه‌بعدی'), 'Master doc must enforce 3D vault');
    assert.ok(masterContent.includes('قفل تمام‌صفحه'), 'Master doc must enforce full-screen / full-bleed vault');
    assert.ok(masterContent.includes('دستگیره ۳ دور'), 'Master doc must enforce 3-turn handle rotation');
  });

  await t.test('chat.html Slot 4 is 100% full-bleed 3D vault with zero text clutter and zero spoilers in password modal', () => {
    const html = fs.readFileSync(path.join(rootDir, 'public', 'chat.html'), 'utf8');
    assert.ok(html.includes('id="quad-vault-card"'), 'chat.html must render #quad-vault-card in Slot 4');
    assert.ok(html.includes('id="vault-3d-handle"'), 'chat.html must render #vault-3d-handle');
    assert.ok(html.includes('class="vault-piston'), 'chat.html must render retracting steel pistons');
    assert.ok(!html.includes('class="vault-card-topbar"'), 'Slot 4 must NOT contain any topbar text');
    assert.ok(!html.includes('class="vault-hook-info"'), 'Slot 4 must NOT contain any side text column');

    const pwdModalStart = html.indexOf('id="vault-password-dialog"');
    const pwdModalEnd = html.indexOf('</dialog>', pwdModalStart);
    const pwdModalHtml = html.slice(pwdModalStart, pwdModalEnd);
    assert.ok(pwdModalHtml.includes('گاوصندوق'), 'Password modal must title as vault');
    assert.ok(!pwdModalHtml.includes('کارآگاه'), 'Password modal must NOT mention detective (spoiler)');
    assert.ok(!pwdModalHtml.includes('پایان پرونده'), 'Password modal must NOT mention end of case (spoiler)');
    assert.ok(!pwdModalHtml.includes('آخرین جلسه'), 'Password modal must NOT mention final session (spoiler)');
  });

  await t.test('vault-3d.css defines full-bleed 100% dimensions, 1080deg handle rotation, and 3D door swing', () => {
    const css = fs.readFileSync(path.join(rootDir, 'public', 'assets', 'css', 'vault-3d.css'), 'utf8');
    assert.ok(css.includes('padding: 0 !important'), 'vault-3d.css must remove padding on .quad-vault-card');
    assert.ok(css.includes('1080deg'), 'vault-3d.css must rotate handle wheel 3 full turns (1080deg)');
    assert.ok(css.includes('rotateY(-118deg)') || css.includes('rotateY(-106deg)'), 'vault-3d.css must swing 3D vault door open');
  });

  await t.test('vault-3d.js resets vault to locked on refresh and runs unlock choreography', () => {
    const js = fs.readFileSync(path.join(rootDir, 'public', 'assets', 'js', 'vault-3d.js'), 'utf8');
    assert.ok(js.includes('resetVaultToLockedOnRefresh'), 'vault-3d.js must reset vault to locked on every page load/refresh');
    assert.ok(!js.includes('localStorage.setItem("isVaultUnlocked"'), 'vault-3d.js must NOT persist unlocked state across refreshes');
    assert.ok(js.includes('closeVaultPasswordModal()'), 'vault-3d.js must close password popup before turning handle');
    assert.ok(js.includes('is-unlocking-wheel'), 'vault-3d.js must trigger wheel rotation class');
    assert.ok(js.includes('is-unlocked'), 'vault-3d.js must trigger 3D door open class');
    assert.ok(js.includes('0110'), 'vault-3d.js must use passcode 0110');
  });
});
