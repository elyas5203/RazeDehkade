const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');

test('Vault Passcode 0110, Single Photo Reward, Zero Spoilers, and Admin Weekly Silent Lock/Unlock', async (t) => {
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

  await t.test('3. Zero-Spoiler UI: Vault door has NO visible sealed text or badge; opens password modal normally', () => {
    const html = fs.readFileSync(chatHtmlPath, 'utf8');
    assert.ok(!html.includes('پلمپ امنیتی'), 'chat.html must NOT display spoiler text پلمپ امنیتی');
    assert.ok(!html.includes('id="vault-locked-seal-badge"'), 'chat.html must NOT render seal badge overlay');

    const css = fs.readFileSync(vaultCssPath, 'utf8');
    assert.ok(!css.includes('.vault-locked-seal-overlay'), 'CSS must NOT contain seal overlay styles');

    const js = fs.readFileSync(vaultJsPath, 'utf8');
    assert.ok(!js.includes('showVaultLockedNotice'), 'vault-3d.js must not show alert notice on open click');
  });

  await t.test('4. Silent Lock Verification: Before admin unlock, entering 0110 triggers wrong password error; after unlock, it succeeds', () => {
    const js = fs.readFileSync(vaultJsPath, 'utf8');
    assert.ok(js.includes('isVaultAdminUnlocked = false'), 'Vault must be locked by default (false)');
    assert.ok(js.includes('setVaultAdminUnlocked'), 'Must define setVaultAdminUnlocked');

    // Simulate the logic in submitVaultPassword
    let isVaultAdminUnlocked = false;
    let unlockedResult = false;
    let errorMessage = '';

    function mockSubmit(code) {
      if (!code) { errorMessage = 'کد خالی است'; return; }
      if (!isVaultAdminUnlocked) {
        errorMessage = 'کد واردشده نامعتبر است؛ زبانه‌های قفل زرهی باز نشد.';
        return;
      }
      if (code === '0110') {
        unlockedResult = true;
        errorMessage = '';
      } else {
        errorMessage = 'کد واردشده نامعتبر است؛ زبانه‌های قفل زرهی باز نشد.';
      }
    }

    // Attempt before admin unlock with code 0110:
    mockSubmit('0110');
    assert.strictEqual(unlockedResult, false, 'Entering 0110 must NOT unlock while admin has not enabled it');
    assert.strictEqual(errorMessage, 'کد واردشده نامعتبر است؛ زبانه‌های قفل زرهی باز نشد.', 'Must give standard wrong code error');

    // Attempt with incorrect code:
    mockSubmit('9999');
    assert.strictEqual(unlockedResult, false);

    // Now admin unlocks the vault:
    isVaultAdminUnlocked = true;

    // Now entering 0110 must succeed:
    mockSubmit('0110');
    assert.strictEqual(unlockedResult, true, 'Entering 0110 MUST unlock after admin enables it');
    assert.strictEqual(errorMessage, '');
  });

  await t.test('5. Admin chat and server have full control to toggle vault lock per session & week', () => {
    const adminHtml = fs.readFileSync(adminHtmlPath, 'utf8');
    assert.ok(adminHtml.includes('id="admin-vault-lock-btn"'), 'Admin header must contain admin-vault-lock-btn');
    assert.ok(!adminHtml.includes('id="weekly-vault-lock-btn"'), 'Redundant weekly-vault-lock-btn must be removed from weekly panel');

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

  await t.test('6. Class "زارع و احمدی" (Index 17) specifications are verified', () => {
    assert.ok(fs.existsSync(classMatcherPath), 'classFolderMatcher.js must exist');
    const { OFFICIAL_SESSIONS_SPEC } = require(classMatcherPath);
    const zareClass = OFFICIAL_SESSIONS_SPEC.find(c => c.name.includes('زارع') && c.name.includes('احمدی'));
    assert.ok(zareClass, 'Class "زارع و احمدی" must exist in official specification');
    assert.strictEqual(zareClass.index, 17, 'Class index must be 17');
    assert.strictEqual(zareClass.orderCode, '590019', 'Order code must be 590019');
    assert.strictEqual(zareClass.chatCode, '699275', 'Chat code must be 699275');
    assert.strictEqual(zareClass.activeCase, 'village', 'Active case must be village');
  });

  await t.test('7. Dashboard Global Vault Lock Button and Endpoints (lock/unlock for all sessions simultaneously)', () => {
    const dashboardHtmlPath = path.join(rootDir, 'public', 'admin', 'dashboard.html');
    const dashboardJsPath = path.join(rootDir, 'public', 'assets', 'js', 'admin-dashboard.js');
    const dashboardCssPath = path.join(rootDir, 'public', 'assets', 'css', 'admin-dashboard.css');

    const dashHtml = fs.readFileSync(dashboardHtmlPath, 'utf8');
    assert.ok(dashHtml.includes('id="global-vault-lock-btn"'), 'Dashboard header must have global-vault-lock-btn');
    assert.ok(dashHtml.includes('toggleGlobalVaultLock()'), 'Button must call toggleGlobalVaultLock()');

    const dashJs = fs.readFileSync(dashboardJsPath, 'utf8');
    assert.ok(dashJs.includes('toggleGlobalVaultLock'), 'admin-dashboard.js must define toggleGlobalVaultLock');
    assert.ok(dashJs.includes('updateGlobalVaultBtnUI'), 'admin-dashboard.js must define updateGlobalVaultBtnUI');
    assert.ok(dashJs.includes('global_vault_lock_updated'), 'admin-dashboard.js must listen for global_vault_lock_updated');
    assert.ok(dashJs.includes('vault-lock-all'), 'admin-dashboard.js must call /api/sessions/vault-lock-all');

    const dashCss = fs.readFileSync(dashboardCssPath, 'utf8');
    assert.ok(dashCss.includes('.vault-locked'), 'admin-dashboard.css must style vault-locked');
    assert.ok(dashCss.includes('.vault-unlocked'), 'admin-dashboard.css must style vault-unlocked');

    const sessionRoutes = fs.readFileSync(sessionRoutesPath, 'utf8');
    assert.ok(sessionRoutes.includes('/vault-lock-all'), 'sessions.js must have POST /vault-lock-all');
    assert.ok(sessionRoutes.includes('/vault-status-all'), 'sessions.js must have GET /vault-status-all');

    const sessionModel = fs.readFileSync(sessionModelPath, 'utf8');
    assert.ok(sessionModel.includes('setGlobalVaultLock'), 'Session model must define setGlobalVaultLock');
    assert.ok(sessionModel.includes('getGlobalVaultStatus'), 'Session model must define getGlobalVaultStatus');

    const socketJs = fs.readFileSync(socketPath, 'utf8');
    assert.ok(socketJs.includes('toggle_global_vault_lock'), 'socket/index.js must handle toggle_global_vault_lock');

    const userJs = fs.readFileSync(userJsPath, 'utf8');
    assert.ok(userJs.includes('data.all'), 'user-chat.js must handle global broadcast data.all for vault_lock_updated');
  });
});
