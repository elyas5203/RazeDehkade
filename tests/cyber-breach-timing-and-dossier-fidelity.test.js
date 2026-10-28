const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const engineJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/cyber-breach-engine.js'), 'utf8');
const engineCss = fs.readFileSync(path.join(__dirname, '../public/assets/css/cyber-breach-engine.css'), 'utf8');
const authJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/emergency-auth.js'), 'utf8');
const userChatJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/user-chat.js'), 'utf8');

test('MASTER-34: Cyber Breach Typing Indicator, Timing Expansion, Dossier Lockout & Questions Fidelity', async t => {

  await t.test('1. CyberBreachEngine defines setDetectiveTyping and hides indicator on admin message delivery', () => {
    assert.match(engineJs, /setDetectiveTyping\s*\(\s*isTyping\s*\)/, 'setDetectiveTyping method exists');
    assert.match(engineJs, /if\s*\(senderType === 'admin'\)\s*this\.setDetectiveTyping\(false\)/, 'hides indicator on admin message');
  });

  await t.test('2. Strict sequential order in runPostBlackoutSequence: SpoofedMsg1 -> InfiltratorAck -> VaultReq -> RefuseVault', () => {
    const seqMatch = engineJs.match(/async runPostBlackoutSequence\(\) \{([\s\S]*?)\n  \}/);
    assert.ok(seqMatch, 'runPostBlackoutSequence found');
    const seqBody = seqMatch[1];

    const idxMsg1 = seqBody.indexOf("'battle-kids-spoofed-infiltrator'");
    const idxAck = seqBody.indexOf("'battle-det-infiltrator-ack'");
    const idxVaultReq = seqBody.indexOf("'battle-kids-spoofed-vault-request'");
    const idxRefuseVault = seqBody.indexOf("'battle-det-refuse-vault'");
    const idxRefuseConf = seqBody.indexOf("'battle-det-refuse-confidential'");
    const idxUrgent = seqBody.indexOf("'battle-kids-spoofed-urgent'");

    assert.ok(idxMsg1 > 0, 'kids-spoofed-infiltrator exists');
    assert.ok(idxAck > 0, 'det-infiltrator-ack exists');
    assert.ok(idxVaultReq > 0, 'kids-spoofed-vault-request exists');
    assert.ok(idxRefuseVault > 0, 'det-refuse-vault exists');
    assert.ok(idxRefuseConf > 0, 'det-refuse-confidential exists');
    assert.ok(idxUrgent > 0, 'kids-spoofed-urgent exists');

    assert.ok(idxMsg1 < idxAck, 'First spoofed message must be delivered BEFORE Detective ack response');
    assert.ok(idxAck < idxVaultReq, 'Detective ack must be delivered BEFORE second spoofed vault request');
    assert.ok(idxVaultReq < idxRefuseVault, 'Vault request must be delivered BEFORE detective refuses code');
    assert.ok(idxRefuseVault < idxRefuseConf, 'Refuse vault must precede confidential reminder');
    assert.ok(idxRefuseConf < idxUrgent, 'Detective refusal must precede urgent insistence');
  });

  await t.test('3. simulateGhostTyping holds for 11500ms (+10s delay) before submitting to chat', () => {
    assert.match(engineJs, /11500\s*\);/, 'Composer hold time must be at least 11500ms for thorough reading');
  });

  await t.test('4. lockChatInput disables assistants popup and closes dialog', () => {
    assert.match(engineJs, /open-assistants-popup-btn[\s\S]*?pointerEvents\s*=\s*'none'/, 'disables assistants button');
    assert.match(engineJs, /assistants-photo-dialog[\s\S]*?close\(\)/, 'closes assistants photo dialog');
  });

  await t.test('5. CSS applies glitch-photo-breach distortion and blocks pointer events on assistants button', () => {
    assert.match(engineCss, /@keyframes\s+glitch-photo-breach/, 'glitch-photo-breach keyframes exist');
    assert.match(engineCss, /body\.cyber-breach-active\s+\.assistants-popup-btn[^}]*pointer-events:\s*none\s*!important/);
    assert.match(engineCss, /body\.cyber-breach-active\s+\.assistant-mini-photo-box\s+img[^}]*filter:[^}]*drop-shadow/);
  });

  await t.test('6. Evidence board corrupts real cards without injecting 3 fake cards', () => {
    assert.doesNotMatch(engineJs, /for\s*\(\s*let\s+i\s*=\s*1;\s*i\s*<=\s*3;\s*i\+\+\s*\)\s*\{[\s\S]*?fakeCard/, 'Must NOT inject fake cards into evidence board');
    assert.match(engineJs, /card\.classList\.add\('card-blackout'\)/, 'Stamps real cards with blackout');
  });

  await t.test('7. user-chat.js blocks openAssistantsPhotoPopup and openEvidence during breach', () => {
    assert.match(userChatJs, /async function openAssistantsPhotoPopup\(\)\s*\{[\s\S]*?cyber-breach-active/, 'blocks openAssistantsPhotoPopup during breach');
    assert.match(userChatJs, /function openEvidence\(msg\)\s*\{[\s\S]*?cyber-breach-active/, 'blocks openEvidence during breach');
  });

  await t.test('8. Emergency Auth q_padari question replacement fidelity', () => {
    assert.match(authJs, /آقای پادری گوینده اخبار چه نسبتی با اقایان پادری‌ها که به دهکده های مرموز رفتن داشت؟/);
    assert.match(authJs, /ارواح عمه اش ، خالش بود بابا/);
    assert.match(authJs, /بابا این پادری حموم بود اونها پادری دستشویی، نسبتی نداشتن/);
  });

  await t.test('9. Emergency Auth q_gem_feature options fidelity', () => {
    assert.match(authJs, /برامون صبح‌ها نون می‌گیره/);
    assert.match(authJs, /موقع امتحان بهمون تقلب می‌رسونه/);
    assert.match(authJs, /هر کس از آن جواهر داشته باشد، خوشبخت می‌شود\./);
    assert.match(authJs, /تو دنیا خیلی ازش زیاد هست/);
  });

  await t.test('10. Emergency Auth q_terrorist_newspaper separates مز and داک', () => {
    const piecesMatch = authJs.match(/id:\s*'q_terrorist_newspaper'[\s\S]*?pieces:\s*\[([^\]]+)\]/);
    assert.ok(piecesMatch, 'newspaper pieces found');
    const pieces = piecesMatch[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
    const mazIdx = pieces.indexOf('مز');
    const dakIdx = pieces.indexOf('داک');
    assert.ok(Math.abs(mazIdx - dakIdx) > 1, 'مز and داک must NOT be adjacent');
  });
});
