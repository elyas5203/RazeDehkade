const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');

test('Slot 4 3D Mystery Vault and Mysterious Museum invitation verification', async (t) => {
  await t.test('VAULT_SLOT4_MASTER.md and UI/UX 3D Vault skill exist', () => {
    const masterPath = path.join(rootDir, 'VAULT_SLOT4_MASTER.md');
    const skillPath = path.join(rootDir, '.agents', 'skills', 'ui-ux-3d-vault-design', 'SKILL.md');
    assert.ok(fs.existsSync(masterPath), 'VAULT_SLOT4_MASTER.md must exist');
    assert.ok(fs.existsSync(skillPath), 'ui-ux-3d-vault-design SKILL.md must exist');
    const masterContent = fs.readFileSync(masterPath, 'utf8');
    assert.ok(masterContent.includes('موزه اسرارآمیز'), 'Master doc must mention Mysterious Museum');
  });

  await t.test('chat.html includes 3D Vault Slot 4, password modal, and reward gallery modal', () => {
    const html = fs.readFileSync(path.join(rootDir, 'public', 'chat.html'), 'utf8');
    assert.ok(html.includes('id="quad-vault-card"'), 'chat.html must render #quad-vault-card in Slot 4');
    assert.ok(html.includes('id="vault-3d-handle"'), 'chat.html must render #vault-3d-handle');
    assert.ok(html.includes('id="vault-password-dialog"'), 'chat.html must include #vault-password-dialog');
    assert.ok(html.includes('id="vault-reward-dialog"'), 'chat.html must include #vault-reward-dialog');
    assert.ok(html.includes('/assets/css/vault-3d.css'), 'chat.html must link vault-3d.css');
    assert.ok(html.includes('/assets/js/vault-3d.js'), 'chat.html must link vault-3d.js');
  });

  await t.test('vault-3d.css defines slow 3.5s handle rotation and 3D door swing', () => {
    const css = fs.readFileSync(path.join(rootDir, 'public', 'assets', 'css', 'vault-3d.css'), 'utf8');
    assert.ok(css.includes('3.5s cubic-bezier'), 'vault-3d.css must animate handle slowly over 3.5s');
    assert.ok(css.includes('rotate(540deg)'), 'vault-3d.css must rotate handle wheel 540deg');
    assert.ok(css.includes('rotateY(-112deg)'), 'vault-3d.css must swing 3D vault door open');
  });

  await t.test('vault-3d.js defines flag config, wrong password error, and 4-stage unlock sequence', () => {
    const js = fs.readFileSync(path.join(rootDir, 'public', 'assets', 'js', 'vault-3d.js'), 'utf8');
    assert.ok(js.includes('DEFAULT_VAULT_FLAGS'), 'vault-3d.js must define flag/session config');
    assert.ok(js.includes('closeVaultPasswordModal()'), 'vault-3d.js must close password popup before turning handle');
    assert.ok(js.includes('is-turning-handle'), 'vault-3d.js must trigger slow handle rotation class');
    assert.ok(js.includes('is-door-open'), 'vault-3d.js must trigger 3D door open class');
    assert.ok(js.includes('changeVaultGallerySlide'), 'vault-3d.js must support multi-photo gallery navigation');
  });
});
