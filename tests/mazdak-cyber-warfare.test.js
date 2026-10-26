/**
 * tests/mazdak-cyber-warfare.test.js
 * Comprehensive Test Suite for Mazdak Cyber Warfare, Tamper Lockdown,
 * Media Stamps, Fake Chat Battle, 5-Minute Eviction, and Single-Field Emergency Auth.
 * 
 * Corresponds to MASTER_MAZDAK_CYBER_WARFARE_AND_LOCKDOWN.md (MASTER-15)
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('Mazdak Cyber Warfare, Tamper Lockdown & Emergency Recovery (MASTER-15)', async (t) => {

  await t.test('1. Architecture & Master Plan: MASTER-15 exists and specifies full swarm & UI/UX requirements', () => {
    const masterPath = path.join(ROOT_DIR, 'MASTER_MAZDAK_CYBER_WARFARE_AND_LOCKDOWN.md');
    const mirrorMasterPath = path.join(ROOT_DIR, 'docs', 'ai', 'masters', 'MASTER_15_MAZDAK_CYBER_WARFARE_AND_LOCKDOWN.md');

    assert.ok(fs.existsSync(masterPath), 'Root MASTER_MAZDAK_CYBER_WARFARE_AND_LOCKDOWN.md must exist');
    assert.ok(fs.existsSync(mirrorMasterPath), 'Mirror MASTER_15 in docs/ai/masters must exist');

    const content = fs.readFileSync(masterPath, 'utf8');
    assert.ok(content.includes('R01'), 'Master must include R01 swarm role');
    assert.ok(content.includes('R50'), 'Master must include R50 swarm role');
    assert.ok(content.includes('لیلیوم'), 'Master must reference Lilium plot element');
    assert.ok(content.includes('۳۰۰') || content.includes('300') || content.includes('۵ دقیقه'), 'Master must reference 5-minute / 300-second countdown');
  });

  await t.test('2. Tamper Lockdown & Corrupted breakdown CSS: Toolbars, Slots 2 & 4 lock with glitch visuals', () => {
    const cssPath = path.join(ROOT_DIR, 'public', 'assets', 'css', 'cyber-breach-engine.css');
    assert.ok(fs.existsSync(cssPath), 'cyber-breach-engine.css must exist');
    const css = fs.readFileSync(cssPath, 'utf8');

    // Slot 2 / 4 corrupted breakdown
    assert.ok(css.includes('.slot-corrupted-breakdown'), 'Must define .slot-corrupted-breakdown');
    assert.ok(css.includes('.vault-corrupted-breakdown'), 'Must define .vault-corrupted-breakdown');
    assert.ok(css.includes('.calendar-locked-breakdown'), 'Must define .calendar-locked-breakdown');
    assert.ok(css.includes('.is-locked-cyber-breach'), 'Must define .is-locked-cyber-breach for toolbars');

    // Intense earthquake & quake animations
    assert.ok(css.includes('screen-intense-quake'), 'Must define screen-intense-quake for elevated shaking');
    assert.ok(css.includes('screen-cyber-tremor'), 'Must define screen-cyber-tremor');

    // Bilingual high-contrast terminal lines
    assert.ok(css.includes('.term-breach-bilingual-line'), 'Must define .term-breach-bilingual-line');
    assert.ok(css.includes('.term-breach-en-text'), 'Must define .term-breach-en-text');
    assert.ok(css.includes('.term-breach-fa-text'), 'Must define .term-breach-fa-text');

    // Media stamp overlay
    assert.ok(css.includes('.mazdak-media-stamp'), 'Must define .mazdak-media-stamp');
    assert.ok(css.includes('.mazdak-stamp-badge'), 'Must define .mazdak-stamp-badge');

    // Fake battle styles
    assert.ok(css.includes('.fake-battle-msg'), 'Must define .fake-battle-msg');
    assert.ok(css.includes('.fake-battle-msg.kids-impersonated-msg'), 'Must define .fake-battle-msg.kids-impersonated-msg');
  });

  await t.test('3. Media Protection & Mazdak Stamp: mazdak.jpg served and media overlay logic in place', () => {
    const rootMazdak = path.join(ROOT_DIR, 'mazdak.jpg');
    const publicMazdak = path.join(ROOT_DIR, 'public', 'mazdak.jpg');

    assert.ok(fs.existsSync(rootMazdak), 'Root mazdak.jpg must exist');
    assert.ok(fs.existsSync(publicMazdak), 'public/mazdak.jpg must exist');

    const serverJs = fs.readFileSync(path.join(ROOT_DIR, 'server.js'), 'utf8');
    assert.ok(serverJs.includes('/mazdak.jpg'), 'server.js must expose route for /mazdak.jpg');

    const engineJs = fs.readFileSync(path.join(ROOT_DIR, 'public', 'assets', 'js', 'cyber-breach-engine.js'), 'utf8');
    assert.ok(engineJs.includes('applyMazdakMediaStamps'), 'cyber-breach-engine.js must have applyMazdakMediaStamps method');
    assert.ok(engineJs.includes('removeMazdakMediaStamps'), 'cyber-breach-engine.js must have removeMazdakMediaStamps method');

    const css = fs.readFileSync(path.join(ROOT_DIR, 'public', 'assets', 'css', 'cyber-breach-engine.css'), 'utf8');
    assert.ok(css.includes('.mazdak-media-stamp') && css.includes('pointer-events'), 'CSS must define pointer-events behavior on media stamp');
  });

  await t.test('4. Interactive Guards during Hack: Slots 2, 4, photos and media blocked when breach is active', () => {
    const vaultJs = fs.readFileSync(path.join(ROOT_DIR, 'public', 'assets', 'js', 'vault-3d.js'), 'utf8');
    assert.ok(
      vaultJs.includes('if (window.cyberBreachEngine && window.cyberBreachEngine.isPlaying) return;'),
      'vault-3d.js must guard openVaultInteraction and openVaultPasswordModal against breach'
    );

    const userChatJs = fs.readFileSync(path.join(ROOT_DIR, 'public', 'assets', 'js', 'user-chat.js'), 'utf8');
    assert.ok(
      userChatJs.includes('if (window.cyberBreachEngine && window.cyberBreachEngine.isPlaying)'),
      'user-chat.js must guard openEvidence and openAssistantsPhotoPopup against breach'
    );
  });

  await t.test('5. Terminal & Chat: Stable append-only, Detective auto-messages, Mazdak threats, and Fake Battle', () => {
    const engineJs = fs.readFileSync(path.join(ROOT_DIR, 'public', 'assets', 'js', 'cyber-breach-engine.js'), 'utf8');

    // Set tracking for stable non-flicker append
    assert.ok(engineJs.includes('deliveredBattleMessages = new Set()'), 'Must track deliveredBattleMessages with Set');
    assert.ok(engineJs.includes('deliveredTerminalErrors = new Set()'), 'Must track deliveredTerminalErrors with Set');
    assert.ok(engineJs.includes('deliveredTerminalThreats = new Set()'), 'Must track deliveredTerminalThreats with Set');
    assert.ok(engineJs.includes('appendTerminalBilingualLine'), 'Must have appendTerminalBilingualLine method');
    assert.ok(engineJs.includes('appendChatMessage'), 'Must have appendChatMessage method');

    // The detective's first two messages arrive while the terminal is raised,
    // then the impersonated student asks for the vault code in the chat.
    assert.ok(engineJs.includes("id: 'battle-det-1'"), 'Must show the first detective message');
    assert.ok(engineJs.includes("id: 'battle-det-pre-2'"), 'Must show the second detective message');
    assert.ok(engineJs.indexOf("id: 'battle-det-1'") < engineJs.indexOf('if (sec === 24)'), 'Detective message must precede terminal docking');
    assert.ok(engineJs.includes('کد گاوصندوق رو شما کجا نگه می‌دارید؟'), 'Impersonator must seek the vault code');

    // Mazdak terminal threats
    assert.ok(engineJs.includes('تمام اطلاعات و کدهای شما رو گرفتم'), 'Must contain Mazdak terminal threat 1');
    assert.ok(engineJs.includes('نمی‌ذارم این پرونده رو حل کنید'), 'Must contain Mazdak terminal threat 2');

    // Fake battle in chat post-landing
    assert.ok(engineJs.includes('battle-kids-1'), 'Must contain fake spoofed student message 1');
    assert.ok(engineJs.includes('battle-kids-2'), 'Must contain fake spoofed student message 2');
    assert.ok(engineJs.includes('لیلیوم'), 'Detective final message must mention Lilium clue');
    assert.ok(engineJs.includes('احراز هویت'), 'Detective final message must instruct to use emergency authentication');

    // Student input locked
    assert.ok(engineJs.includes('msgInput.disabled = true'), 'Must lock student composer input');
  });

  await t.test('6. Emergency Authentication Portal: Single-input (Mobile only, NO Class Code)', () => {
    const htmlPath = path.join(ROOT_DIR, 'public', 'emergency-auth.html');
    assert.ok(fs.existsSync(htmlPath), 'emergency-auth.html must exist');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // NO class code field
    assert.strictEqual(html.includes('emergencyClassCode'), false, 'emergency-auth.html must NOT contain emergencyClassCode');
    assert.strictEqual(html.includes('کد کلاس'), false, 'emergency-auth.html must NOT contain "کد کلاس" text');

    // Contains mobile input
    assert.ok(html.includes('id="emergencyPhone"'), 'Must have emergencyPhone input');
    assert.ok(html.includes('شماره موبایل'), 'Must have Persian label for mobile');

    // JS validation
    const jsPath = path.join(ROOT_DIR, 'public', 'assets', 'js', 'emergency-auth.js');
    assert.ok(fs.existsSync(jsPath), 'emergency-auth.js must exist');
    const js = fs.readFileSync(jsPath, 'utf8');

    assert.strictEqual(js.includes('emergencyClassCode'), false, 'emergency-auth.js must NOT reference emergencyClassCode');
    assert.ok(js.includes('emergencyPhone'), 'emergency-auth.js must reference emergencyPhone');
  });

  await t.test('7. Emergency Eviction Modal: 5-Minute (300 Seconds) Countdown Timer', () => {
    const engineJs = fs.readFileSync(path.join(ROOT_DIR, 'public', 'assets', 'js', 'cyber-breach-engine.js'), 'utf8');

    assert.ok(engineJs.includes('countdownSec = 300'), 'Eviction countdown timer must be initialized to 300 seconds');
    assert.ok(engineJs.includes('razedehkade.ir'), 'Modal must prominently display the site address for students to note');
    assert.ok(engineJs.includes('۵ دقیقه') || engineJs.includes('۵:۰۰'), 'Persian copy must state 5 minutes duration');
  });

  await t.test('8. Terminal Routine Stream Stop & Shaking Removal (Polish Requirements)', () => {
    const streamJs = fs.readFileSync(path.join(ROOT_DIR, 'public', 'assets', 'js', 'terminal-stream.js'), 'utf8');
    assert.ok(streamJs.includes('stop()'), 'LiveTerminal must implement stop() to kill background routine logs');
    assert.ok(streamJs.includes('start()'), 'LiveTerminal must implement start() to resume logs');

    const engineJs = fs.readFileSync(path.join(ROOT_DIR, 'public', 'assets', 'js', 'cyber-breach-engine.js'), 'utf8');
    assert.ok(engineJs.includes('liveTerminal.stop()'), 'cyber-breach-engine must invoke liveTerminal.stop() on breach start');
    assert.ok(engineJs.includes("terminalLogs.innerHTML = ''"), 'cyber-breach-engine must clear routine logs so breach stream takes over');

    const css = fs.readFileSync(path.join(ROOT_DIR, 'public', 'assets', 'css', 'cyber-breach-engine.css'), 'utf8');
    assert.ok(css.includes('#security-terminal.is-elevated') && css.includes('animation: none !important'), 'Elevated terminal must have animation disabled to eliminate text shaking');
  });

  await t.test('9. Evidence Photos Stay Visible with Corrupted Filter & Disabled Click', () => {
    const css = fs.readFileSync(path.join(ROOT_DIR, 'public', 'assets', 'css', 'cyber-breach-engine.css'), 'utf8');
    assert.ok(css.includes('body.cyber-breach-active .evidence-card img') && css.includes('filter:'), 'Evidence photos must have visual corruption filter without being removed');
    assert.ok(css.includes('pointer-events: none !important'), 'Evidence cards must have pointer-events none to disable opening');

    const engineJs = fs.readFileSync(path.join(ROOT_DIR, 'public', 'assets', 'js', 'cyber-breach-engine.js'), 'utf8');
    assert.ok(engineJs.includes("classList.add('media-corrupted')"), 'applyMazdakMediaStamps must add media-corrupted class');
  });

  await t.test('10. Multi-Turn Realistic Chat Battle with Detective Impostor Realization', () => {
    const engineJs = fs.readFileSync(path.join(ROOT_DIR, 'public', 'assets', 'js', 'cyber-breach-engine.js'), 'utf8');
    assert.ok(engineJs.includes('battle-kids-1'), 'Must have first kids impersonation turn');
    assert.ok(engineJs.includes('battle-kids-2'), 'Must have second kids impersonation asking for codes');
    assert.ok(engineJs.includes('battle-kids-3'), 'Must have third kids impersonation pressuring detective');
    assert.ok(engineJs.includes('کاسه‌ای زیر نیم‌کاسه‌ست') || engineJs.includes('کاسه'), 'Detective must realize impostor with idiom phrase');
    assert.ok(engineJs.includes('battle-mazdak-1'), 'Mazdak unmasks after realization');
    assert.ok(engineJs.includes('battle-det-4'), 'Detective broadcasts final evacuation');
  });

  await t.test('11. Cinematic Audio Assets, Full-Height Board Background, and No "توقیف" wording', () => {
    const soundsDir = path.join(ROOT_DIR, 'public', 'assets', 'sounds');
    const audioFiles = ['cyber-alarm.mp3', 'cyber-error.mp3', 'cyber-launch.mp3', 'cyber-slam.mp3', 'cyber-click.mp3'];
    audioFiles.forEach(file => {
      assert.ok(fs.existsSync(path.join(soundsDir, file)), `Sound asset ${file} must exist in public/assets/sounds`);
    });

    const engineJs = fs.readFileSync(path.join(ROOT_DIR, 'public', 'assets', 'js', 'cyber-breach-engine.js'), 'utf8');
    assert.strictEqual(engineJs.includes("cover.id = 'mazdak-board-cover'"), false,
      'Engine must not append a flex child that collapses the evidence grid');
    assert.strictEqual(engineJs.includes('توقیف'), false, 'cyber-breach-engine.js must NOT use the deprecated word "توقیف"');

    const css = fs.readFileSync(path.join(ROOT_DIR, 'public', 'assets', 'css', 'cyber-breach-engine.css'), 'utf8');
    assert.ok(css.includes("url('/mazdak.jpg') center / cover no-repeat"),
      'Evidence grid must use the Mazdak image as its full-area background');
    assert.strictEqual(css.includes('توقیف'), false, 'cyber-breach-engine.css must NOT use the deprecated word "توقیف"');
  });

  await t.test('12. Zero Sub-Tags in Chat Bubbles and Suspense Pacing (185s duration, 10-14s intervals)', () => {
    const engineJs = fs.readFileSync(path.join(ROOT_DIR, 'public', 'assets', 'js', 'cyber-breach-engine.js'), 'utf8');
    assert.ok(engineJs.includes('this.duration = 185;'), 'Timeline duration must be 185 seconds for extended realistic battle');
    // Ensure senderSub is completely absent from appendChatMessage
    assert.strictEqual(engineJs.includes('senderSub'), false, 'appendChatMessage must not render or reference senderSub tags');
    assert.strictEqual(engineJs.includes('پاسخ مستقیم'), false, 'Chat bubbles must not contain "پاسخ مستقیم" tag');
    assert.strictEqual(engineJs.includes('جعل فرکانس'), false, 'Chat bubbles must not contain "جعل فرکانس" tag');
  });

  await t.test('13. Zero False-Positive Errors in Pre-Hack Terminal Stream (Clean Operational Telemetry)', () => {
    const streamJs = fs.readFileSync(path.join(ROOT_DIR, 'public', 'assets', 'js', 'terminal-stream.js'), 'utf8');
    const forbiddenPatterns = ['SQLi', 'XSS', 'APT-44', 'SYN flood', 'BLOCKED', 'هشدار امنیتی', 'تلاش برای نفوذ', 'ZERO-DAY', 'INTRUSION'];
    forbiddenPatterns.forEach(pattern => {
      assert.strictEqual(streamJs.includes(pattern), false, 'Routine terminal stream must not contain alarmist pattern: ' + pattern);
    });

    const termCss = fs.readFileSync(path.join(ROOT_DIR, 'public', 'assets', 'css', 'terminal.css'), 'utf8');
    assert.ok(termCss.includes('.term-sec .term-badge') && termCss.includes('#38bdf8'), 'terminal.css must style term-sec badge with calm cyan color (#38bdf8)');
  });

  await t.test('14. Silent Chat Messages, Headquarters Badge, Pure Persian Threats & Hack Persistence on Refresh', () => {
    const engineJs = fs.readFileSync(path.join(ROOT_DIR, 'public', 'assets', 'js', 'cyber-breach-engine.js'), 'utf8');
    // 1. Silent chat messages (no clicks)
    assert.strictEqual(engineJs.includes("this.playAudioFile('click')"), false, 'appendChatMessage must NOT play click audio');
    // 2. Headquarters badge
    assert.ok(engineJs.includes('🎙️ مرکز فرماندهی'), 'Detective messages must be labeled as Headquarters (مرکز فرماندهی)');
    // 3. Mazdak in-terminal threats: purely Persian (no English translation sublines and no tick SFX)
    assert.strictEqual(engineJs.includes("this.playAudioFile('tick')"), false, 'Mazdak in-terminal threat lines must not play tick sound');
    assert.strictEqual(engineJs.includes('term-mazdak-sub-en'), false, 'appendTerminalMazdakThreat must not render English sub-en translation line');
    // 4. Zero white noise / static buffers (no Math.random() audio generators)
    assert.strictEqual(engineJs.includes('Math.random() * 2 - 1'), false, 'cyber-breach-engine must not generate scratchy white noise buffers');

    // 5. Hack persistence across browser refresh
    const routesJs = fs.readFileSync(path.join(ROOT_DIR, 'src', 'routes', 'sessions.js'), 'utf8');
    assert.ok(routesJs.includes('is_hacked: Boolean(session && session.is_hacked)'), 'GET /api/sessions/:id/messages must return is_hacked in session object');
    const userChatJs = fs.readFileSync(path.join(ROOT_DIR, 'public', 'assets', 'js', 'user-chat.js'), 'utf8');
    assert.ok(userChatJs.includes('session_hacked_'), 'user-chat.js must check and persist session_hacked flag in storage');
    assert.ok(userChatJs.includes('/emergency-auth.html'), 'user-chat.js must redirect to emergency-auth upon detecting hacked state');

    // 6. Permanent Mazdak cover in CSS for evidence cards
    const breachCss = fs.readFileSync(path.join(ROOT_DIR, 'public', 'assets', 'css', 'cyber-breach-engine.css'), 'utf8');
    assert.ok(breachCss.includes('body.cyber-breach-active .evidence-board .evidence-card::after'), 'CSS must enforce ::after cover on evidence cards');
    assert.ok(breachCss.includes('/mazdak.jpg'), 'Evidence card ::after must load mazdak.jpg');
  });

});
