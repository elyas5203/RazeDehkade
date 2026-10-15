const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');

test('Vault Passcode 0110, Single Photo Reward, and Admin Weekly Lock/Unlock Control', async (t) => {
  const vaultJsPath = path.join(rootDir, 'public', 'assets', 'js', 'vault-3d.js');
  const vaultCssPath = path.join(rootDir, 'public', 'assets', 'css', 'vault-3d.css');
  const chatHtmlPath = path.join(rootDir, 'public', 'chat.html');
  const adminHtmlPath = path.join(rootDir, 'public', 'admin', 'chat.html');
  const adminJsPath = path.join(rootDir, 'public', 'assets', 'js', 'admin-chat.js');
  const userJsPath = path.join(rootDir, 'public', 'assets', 'js', 'user-chat.js');
  const sessionModelPath = path.join(rootDir, 'src', 'models', 'Session.js');
  const sessionRoutesPath = path.join(rootDir, 'src', 'routes', 'sessions.js');
  const socketPath = path.join(rootDir, 'src', 'socket', 'index.js');
  const classMatcherPath = path.join(rootDir, 'src', 'utils', 'classFolderMatcher.js');

  await t.test('1. Vault passcode in vault-3d.js must strictly and ONLY be 0110', () => {
    assert.ok(fs.existsSync(vaultJsPath), 'vault-3d.js must exist');
    const js = fs.readFileSync(vaultJsPath, 'utf8');

    // Must contain 0110
    assert.ok(js.includes("'0110'") || js.includes('"0110"'), 'Vault must contain passcode 0110');

    // Must NOT contain old codes
    assert.ok(!js.includes("'1405'"), 'Old code 1405 must be removed');
    assert.ok(!js.includes("'6062'"), 'Old code 6062 must be removed');
    assert.ok(!js.includes("'1001'"), 'Old code 1001 must be removed');
    assert.ok(!js.includes("'2002'"), 'Old code 2002 must be removed');
  });

  await t.test('2. Vault reward must contain only ONE single photo and no multi-slide buttons', () => {
    const js = fs.readFileSync(vaultJsPath, 'utf8');
    
    // In DEFAULT_VAULT_FLAGS, images array must have exactly 1 image
    const flagsMatch = js.match(/DEFAULT_VAULT_FLAGS\s*=\s*\[([\s\S]*?)\];/);
    assert.ok(flagsMatch, 'DEFAULT_VAULT_FLAGS must be defined');
    const flagsBlock = flagsMatch[1];
    
    // Check that vip-pass is removed from images
    assert.ok(!flagsBlock.includes('mysterious-museum-vip-pass.svg'), 'vip-pass must be removed so only 1 photo exists');
    assert.ok(flagsBlock.includes('mysterious-museum-poster.svg'), 'Must retain single poster photo');
  });

  await t.test('3. Vault is sealed/locked by default and requires admin unlock in a specific week', () => {
    const js = fs.readFileSync(vaultJsPath, 'utf8');
    assert.ok(js.includes('isVaultAdminUnlocked = false'), 'Vault must be locked by default (false)');
    assert.ok(js.includes('setVaultAdminUnlocked'), 'Must define setVaultAdminUnlocked');
    assert.ok(js.includes('showVaultLockedNotice'), 'Must define showVaultLockedNotice');
    assert.ok(js.includes('updateVaultLockUI'), 'Must define updateVaultLockUI');

    const css = fs.readFileSync(vaultCssPath, 'utf8');
    assert.ok(css.includes('.vault-locked-seal-overlay'), 'CSS must define .vault-locked-seal-overlay');
    assert.ok(css.includes('.is-vault-locked'), 'CSS must define .is-vault-locked');

    const html = fs.readFileSync(chatHtmlPath, 'utf8');
    assert.ok(html.includes('id="vault-locked-seal-badge"'), 'chat.html must render vault-locked-seal-badge');
  });

  await t.test('4. Admin chat and server have full control to toggle vault lock per session & week', () => {
    const adminHtml = fs.readFileSync(adminHtmlPath, 'utf8');
    assert.ok(adminHtml.includes('id="admin-vault-lock-btn"'), 'Admin header must contain admin-vault-lock-btn');
    assert.ok(adminHtml.includes('id="weekly-vault-lock-btn"'), 'Weekly panel must contain weekly-vault-lock-btn');

    const adminJs = fs.readFileSync(adminJsPath, 'utf8');
    assert.ok(adminJs.includes('toggleAdminVaultLock'), 'admin-chat.js must define toggleAdminVaultLock');
    assert.ok(adminJs.includes('updateVaultLockBtnUI'), 'admin-chat.js must define updateVaultLockBtnUI');
    assert.ok(adminJs.includes('vault_lock_updated'), 'admin-chat.js must listen for vault_lock_updated');

    const userJs = fs.readFileSync(userJsPath, 'utf8');
    assert.ok(userJs.includes('vault_lock_updated'), 'user-chat.js must listen for vault_lock_updated');
    assert.ok(userJs.includes('setVaultAdminUnlocked'), 'user-chat.js must call setVaultAdminUnlocked');

    const socketJs = fs.readFileSync(socketPath, 'utf8');
    assert.ok(socketJs.includes('toggle_vault_lock'), 'socket/index.js must handle toggle_vault_lock');
    assert.ok(socketJs.includes('vault_lock_updated'), 'socket/index.js must broadcast vault_lock_updated');

    const sessionModel = fs.readFileSync(sessionModelPath, 'utf8');
    assert.ok(sessionModel.includes('setVaultLock'), 'Session model must define setVaultLock');
    assert.ok(sessionModel.includes('getVaultStatus'), 'Session model must define getVaultStatus');

    const sessionRoutes = fs.readFileSync(sessionRoutesPath, 'utf8');
    assert.ok(sessionRoutes.includes('/:id/vault-lock'), 'sessions.js must have POST /:id/vault-lock endpoint');
  });

  await t.test('5. Class "زارع و احمدی" (Index 17) specifications are verified', () => {
    assert.ok(fs.existsSync(classMatcherPath), 'classFolderMatcher.js must exist');
    const { OFFICIAL_SESSIONS_SPEC } = require(classMatcherPath);
    const zareClass = OFFICIAL_SESSIONS_SPEC.find(c => c.name.includes('زارع') && c.name.includes('احمدی'));
    assert.ok(zareClass, 'Class "زارع و احمدی" must exist in official specification');
    assert.strictEqual(zareClass.index, 17, 'Class index must be 17');
    assert.strictEqual(zareClass.orderCode, '590019', 'Order code must be 590019');
    assert.strictEqual(zareClass.chatCode, '699275', 'Chat code must be 699275');
    assert.strictEqual(zareClass.activeCase, 'village', 'Active case must be village');
  });
});
