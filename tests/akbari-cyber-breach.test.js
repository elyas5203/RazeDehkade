'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');

test('Akbari Cyber Breach & Mazdak Intrusion Engine Verification', async (t) => {
  await t.test('1. MASTER_MAZDAK_CYBER_BREACH.md documents requirements, R01-R50 matrix, and 9 design perspectives', () => {
    const masterPath = path.join(rootDir, 'MASTER_MAZDAK_CYBER_BREACH.md');
    assert.ok(fs.existsSync(masterPath), 'Root MASTER file must exist');
    const content = fs.readFileSync(masterPath, 'utf8');

    assert.match(content, /کلاسه ۱۴/);
    assert.match(content, /اکبری/);
    assert.match(content, /واحدی/);
    assert.match(content, /انتظامی/);
    assert.match(content, /SUBAGENT_SWARM_50/);
    assert.match(content, /R01/);
    assert.match(content, /R50/);
    assert.match(content, /پژوهش تجربه کاربری/);
    assert.match(content, /طراحی تعامل/);
    assert.match(content, /نویسندگی تجربه کاربری/);

    const mirrorPath = path.join(rootDir, 'docs', 'ai', 'masters', 'MASTER_09_MAZDAK_CYBER_BREACH_ENGINE.md');
    assert.ok(fs.existsSync(mirrorPath), 'Mirror docs master must exist');
  });

  await t.test('2. akbari-hack-preview.html contains all required staging elements, 3D Vault, and Class 14 portraits', () => {
    const htmlPath = path.join(rootDir, 'public', 'akbari-hack-preview.html');
    assert.ok(fs.existsSync(htmlPath), 'akbari-hack-preview.html must exist');
    const html = fs.readFileSync(htmlPath, 'utf8');

    assert.match(html, /director-hud/, 'Director HUD must be present');
    assert.match(html, /hud-scrubber/, 'Timeline scrubber must exist');
    assert.match(html, /terminal-backdrop-dimmer/, 'Dimmer backdrop must exist');
    assert.match(html, /terminal-ghost-slot/, 'Ghost slot placeholder must exist');
    assert.match(html, /security-terminal/, 'Security terminal must exist');
    assert.match(html, /override-segmented-bar/, 'Segmented LED progress bar container must exist');
    assert.match(html, /quad-vault-card/, '3D Vault card must exist in slot 4');
    assert.match(html, /vault-3d-handle/, '3D Chrome vault handle must exist');
    assert.match(html, /mazdak-stream-target/, 'Mazdak chat target must exist');

    // Class 14 student verification
    assert.match(html, /امیرعلی اکبری/, 'Akbari nameplate must be present');
    assert.match(html, /یاسین واحدی/, 'Vahedi nameplate must be present');
    assert.match(html, /محمد انتظامی/, 'Entezami nameplate must be present');
    assert.match(html, /assistant_10_1791745435544_36915\.webp/, 'Session 10 Akbari portrait must be mapped');
  });

  await t.test('3. akbari-breach-master.css implements AAA cyber tokens, FLIP elevation, and corruption effects', () => {
    const cssPath = path.join(rootDir, 'public', 'assets', 'css', 'akbari-breach-master.css');
    assert.ok(fs.existsSync(cssPath), 'CSS file must exist');
    const css = fs.readFileSync(cssPath, 'utf8');

    assert.match(css, /--hack-red:\s*#ff003c/, 'High-impact hacker red token defined');
    assert.match(css, /--hack-mono/, 'Monospace tech token defined');
    assert.match(css, /\.security-terminal\.is-elevated/, 'Terminal liftoff elevated rule defined');
    assert.match(css, /\.hud-corner-bracket/, 'Holographic HUD corner brackets defined');
    assert.match(css, /\.override-segmented-bar/, 'Segmented cyber progress bar defined');
    assert.match(css, /\.segment-cell/, 'LED progress cells defined');
    assert.match(css, /\.assistant-mini-frame\.is-corrupted-portrait/, 'Triple RGB split corruption rule defined');
    assert.match(css, /\.evidence-card\.card-blackout/, 'Document total blackout rule defined');
    assert.match(css, /\.thread-main\.electric-arc/, 'Electric arc clue threads rule defined');
    assert.match(css, /\.input-locked-cyber/, 'Composer lockdown barrier defined');
    assert.match(css, /\.mazdak-chat-msg/, 'Custom Mazdak antagonist rogue bubble defined');
  });

  await t.test('4. akbari-breach-master.js contains complete choreography, Web Audio synthesizer, and Mazdak script', () => {
    const jsPath = path.join(rootDir, 'public', 'assets', 'js', 'akbari-breach-master.js');
    assert.ok(fs.existsSync(jsPath), 'JS file must exist');
    const js = fs.readFileSync(jsPath, 'utf8');

    assert.match(js, /class AkbariMasterBreachEngine/, 'Engine class defined');
    assert.match(js, /this\.duration = 120/, '120-second sequence configured');
    assert.match(js, /cyber-intro\.wav/, 'Epic bass drop asset integrated');
    assert.match(js, /tactical-alarm\.wav/, 'Tactical alarm asset integrated');
    assert.match(js, /tactical-scan\.wav/, 'Tactical lock scan asset integrated');
    assert.match(js, /initAudio/, 'Web Audio initializer defined');
    assert.match(js, /elevateTerminal/, 'FLIP mechanical elevation defined');
    assert.match(js, /dockTerminal/, 'FLIP mechanical docking defined');
    assert.match(js, /startAmbientDrone/, 'Sub-bass ambient drone generator defined');
    assert.match(js, /playLiftoffSound/, 'Terminal liftoff servo synthesizer defined');
    assert.match(js, /playDockSound/, 'Hydraulic dock synthesizer defined');
    assert.match(js, /playMazdakChime/, 'Sinister tritone chime synthesizer defined');
    assert.match(js, /اکبری.*واحدی.*انتظامی/, 'Mazdak script explicitly targets Class 14');
  });

  await t.test('5. 1:1 Production Chat Fidelity: chat.html structures, bubble models, reply quotes, media & neon clock', () => {
    const htmlPath = path.join(rootDir, 'public', 'akbari-hack-preview.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // 1:1 chat container and header elements
    assert.match(html, /messages-list/, 'messages-list container must exist');
    assert.match(html, /neon-digital-clock/, 'Live digital neon clock must exist in chat header');
    assert.match(html, /channel-notice/, 'Channel notice strip must exist');

    // 1:1 message bubble models
    assert.match(html, /message-bubble admin/, 'Admin detective bubble must exist');
    assert.match(html, /message-bubble evidence-alert-card/, 'Evidence alert card bubble must exist');
    assert.match(html, /message-bubble user/, 'User student bubble must exist');
    assert.match(html, /message-reply-quote/, 'Two-way reply quote card must exist in bubble');
    assert.match(html, /reply-quote-bar admin/, 'Admin reply quote accent bar must exist');
    assert.match(html, /user-chat-media-box/, 'User media container must exist');
    assert.match(html, /user-chat-image/, 'User chat image element must exist');

    // 1:1 composer form and reply staging
    assert.match(html, /composer-reply-preview/, 'Composer reply preview bar must exist');
    assert.match(html, /class="composer" id="message-form"/, 'Real production composer form must exist');
    assert.match(html, /attach-button/, 'Attach button must exist');
    assert.match(html, /emoji-button/, 'Emoji button must exist');

    // Verify JS live chat methods
    const jsPath = path.join(rootDir, 'public', 'assets', 'js', 'akbari-breach-master.js');
    const js = fs.readFileSync(jsPath, 'utf8');
    assert.match(js, /initLiveChatExperience/, 'Live chat experience initializer must exist');
    assert.match(js, /stageReply/, 'Two-way reply staging method must exist');
    assert.match(js, /handleUserSend/, 'User send handler must exist');
    assert.match(js, /appendUserMessage/, 'Authentic user bubble generator must exist');
    assert.match(js, /message-bubble hacker/, 'Mazdak incoming bubble must use hacker class');
  });
});
