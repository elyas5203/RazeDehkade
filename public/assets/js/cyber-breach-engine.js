/**
 * CYBER BREACH ENGINE (v3.0 AAA Studio Edition — MASTER-15)
 * Live Class Isolation, Dynamic Student Assistant Glitch, Mazdak In-Terminal Threats,
 * Fake Battle in Chat, Quad-Slot Tamper Lockdown, Mazdak Media Stamping & 5-Minute Emergency Modal
 * Operates safely within public/chat.html with Zero Regressions
 */

'use strict';

class CyberBreachEngine {
  constructor() {
    this.duration = 125; // Timeline choreography
    this.currentSecond = 0;
    this.isPlaying = false;
    this.playbackTimer = null;
    this.soundEnabled = true;
    this.audioInitialized = false;
    this.isElevated = false;
    this.lastSecond = -1;
    this.assistants = [];
    this.sessionData = null;

    // Web Audio Synthesizer Nodes
    this.audioCtx = null;
    this.droneGain = null;
    this.droneOsc1 = null;
    this.droneOsc2 = null;

    // SFX Audio Elements
    this.sfx = {
      intro: new Audio('/assets/sounds/cyber-intro.wav'),
      alarm: new Audio('/assets/sounds/tactical-alarm.wav'),
      scan: new Audio('/assets/sounds/tactical-scan.wav'),
      tick: new Audio('/assets/sounds/clock-tick.wav')
    };

    // Configure SFX Volumes
    if (this.sfx.intro) this.sfx.intro.volume = 0.85;
    if (this.sfx.alarm) this.sfx.alarm.volume = 0.65;
    if (this.sfx.scan) this.sfx.scan.volume = 0.75;
    if (this.sfx.tick) this.sfx.tick.volume = 0.35;

    this.dom = {};
    this.ejectionCountdownInterval = null;

    // ID Tracking Sets (Prevents DOM wiping, flicker, and chaotic refreshes)
    this.deliveredBattleMessages = new Set();
    this.deliveredTerminalErrors = new Set();
    this.deliveredTerminalThreats = new Set();
  }

  init() {
    this.cacheDom();
    this.ensureBackdropAndGhostSlot();
    this.ensureEjectionModal();

    window.addEventListener('resize', () => {
      if (this.isElevated) {
        this.alignElevatedTerminal();
      }
    });

    const unlockHandler = () => {
      this.initAudioContext();
      document.removeEventListener('click', unlockHandler);
      document.removeEventListener('keydown', unlockHandler);
      document.removeEventListener('touchstart', unlockHandler);
    };
    document.addEventListener('click', unlockHandler);
    document.addEventListener('keydown', unlockHandler);
    document.addEventListener('touchstart', unlockHandler);

    console.log('[CyberBreachEngine] Initialized AAA Engine (MASTER-15) successfully.');
  }

  cacheDom() {
    const d = this.dom;
    // Security Terminal
    d.terminal = document.getElementById('security-terminal') || document.querySelector('.security-terminal');
    d.terminalTitle = document.getElementById('terminal-title');
    d.terminalStatus = document.getElementById('terminal-status-text');
    d.terminalLogs = document.getElementById('live-terminal-content');
    d.terminalSubline = document.querySelector('.terminal-controls-bar .technical');
    d.termCursor = document.querySelector('.term-blink-cursor');

    // Evidence Board
    d.evidenceBoard = document.getElementById('evidence-board') || document.querySelector('.evidence-board');
    d.evidenceCount = document.getElementById('evidence-count');
    d.evidenceGrid = document.getElementById('evidence-grid');
    d.threadsSvg = document.getElementById('evidence-threads');

    // Assistants Stage
    d.assistantsStage = document.getElementById('assistants-card-trio-stage');
    d.assistantsLiveDot = document.querySelector('.assistants-live-dot');

    // 3D Vault Card
    d.vaultCard = document.getElementById('quad-vault-card');
    d.vaultStatusLabel = document.querySelector('.vault-status-text');

    // Chat Elements
    d.chatSection = document.getElementById('field-chat-section') || document.querySelector('.field-chat');
    d.messagesBox = document.getElementById('messages-box');
    d.chatComposer = document.getElementById('message-form');
    d.msgInput = document.getElementById('msg-input');
    d.neonClock = document.getElementById('neon-digital-clock');
    d.channelNoticeText = document.getElementById('channel-notice-text');
    d.typingIndicator = document.getElementById('typing-indicator');
  }

  ensureBackdropAndGhostSlot() {
    // 1. Dimmer Backdrop
    if (!document.getElementById('terminal-backdrop-dimmer')) {
      const dimmer = document.createElement('div');
      dimmer.id = 'terminal-backdrop-dimmer';
      dimmer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(dimmer);
    }
    this.dom.dimmer = document.getElementById('terminal-backdrop-dimmer');

    // 2. Terminal Ghost Slot
    if (!document.getElementById('terminal-ghost-slot') && this.dom.terminal && this.dom.terminal.parentNode) {
      const ghost = document.createElement('div');
      ghost.id = 'terminal-ghost-slot';
      ghost.className = 'terminal-slot-ghost quad-card';
      ghost.style.display = 'none';
      ghost.innerHTML = `
        <div style="font-size: 22px; margin-bottom: 6px;">⚡</div>
        <div style="font-weight: 800; color: #ff003c; letter-spacing: 1px;">[SYSTEM TERMINAL SEIZED]</div>
        <div style="color: #94a3b8; font-size: 10px; margin-top: 4px;">STATUS: PHYSICAL_ELEVATION // CORE OVERRIDE ACTIVE</div>
      `;
      this.dom.terminal.parentNode.insertBefore(ghost, this.dom.terminal);
    }
    this.dom.ghostSlot = document.getElementById('terminal-ghost-slot');

    // 3. Segmented Override Box inside terminal
    if (!document.getElementById('terminal-override-box') && this.dom.terminal) {
      const overrideBox = document.createElement('div');
      overrideBox.id = 'terminal-override-box';
      overrideBox.className = 'terminal-override-progress-box';
      overrideBox.style.display = 'none';
      overrideBox.innerHTML = `
        <div class="override-progress-header">
          <span class="override-label">⚡ OVERRIDE PROGRESSION // نفوذ به هسته پردازش پایگاه</span>
          <span class="override-percent" id="override-percent-num">0%</span>
        </div>
        <div class="override-segmented-bar" id="override-segmented-bar"></div>
        <div class="override-vector-status" id="override-vector-status">
          TARGET: CLASS_NODE // INJECTING MAZDAK_SIG PAYLOAD
        </div>
      `;
      const termBody = this.dom.terminalLogs || this.dom.terminal;
      termBody.parentNode.insertBefore(overrideBox, termBody.nextSibling);

      const bar = document.getElementById('override-segmented-bar');
      if (bar) {
        for (let i = 0; i < 20; i++) {
          const led = document.createElement('div');
          led.className = 'seg-led';
          bar.appendChild(led);
        }
      }
    }
    this.dom.overrideBox = document.getElementById('terminal-override-box');
    this.dom.overridePercent = document.getElementById('override-percent-num');
    this.dom.segmentedBar = document.getElementById('override-segmented-bar');
    this.dom.overrideVector = document.getElementById('override-vector-status');

    // 4. Ensure 4 HUD Corner Brackets on Terminal
    if (this.dom.terminal) {
      ['bracket-tl', 'bracket-tr', 'bracket-bl', 'bracket-br'].forEach(pos => {
        if (!this.dom.terminal.querySelector(`.${pos}`)) {
          const bracket = document.createElement('div');
          bracket.className = `hud-corner-bracket ${pos}`;
          bracket.setAttribute('aria-hidden', 'true');
          this.dom.terminal.appendChild(bracket);
        }
      });
    }
  }

  ensureEjectionModal() {
    if (document.getElementById('emergency-ejection-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'emergency-ejection-overlay';
    overlay.className = 'emergency-ejection-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="emergency-ejection-modal">
        <div class="hazard-stripe-bar"></div>
        
        <div class="ejection-badge">
          <span>⚠️ پروتکل اضطراری سطح ۵ // قطع ارتباط پایگاه</span>
        </div>

        <h2 class="ejection-title">سقوط خط امنیتی و خروج اضطراری</h2>

        <p class="ejection-body-text">
          کارآگاهان پایگاه! به علت نفوذ همه‌جانبه مزداک به سیستم، دسترسی به مرکز فرماندهی و چت مسدود گردید.
          <br>
          برای <strong>نجات پرونده و بازپس‌گیری دسترسی</strong>، فوراً آدرس سایت را یادداشت کنید و از طریق درگاه احراز هویت امنیتی وارد شوید:
        </p>

        <div class="ejection-callout-box">
          <div class="ejection-url-label">آدرس رسمی جهت ورود مجدد و احراز هویت:</div>
          <div class="ejection-url-row">
            <span class="ejection-url-code" id="siteUrlText">https://razedehkade.ir</span>
            <button type="button" class="ejection-copy-btn" id="ejectionCopyBtn" title="کپی آدرس سایت">📋 کپی آدرس</button>
          </div>
        </div>

        <div class="ejection-actions">
          <button type="button" class="ejection-primary-btn" id="ejectionAuthBtn">
            ⚡ انتقال فوری به درگاه احراز هویت امنیتی اضطراری
          </button>
          <div class="ejection-countdown-bar" id="ejectionCountdownText">
            خروج و انتقال خودکار تا ۵:۰۰ دقیقه دیگر...
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.dom.ejectionOverlay = overlay;

    // Copy URL handler
    const copyBtn = document.getElementById('ejectionCopyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText('https://razedehkade.ir').then(() => {
          copyBtn.textContent = '✓ کپی شد!';
          setTimeout(() => { copyBtn.textContent = '📋 کپی آدرس'; }, 2000);
        }).catch(() => {});
      });
    }

    // Auth Button handler
    const authBtn = document.getElementById('ejectionAuthBtn');
    if (authBtn) {
      authBtn.addEventListener('click', () => {
        this.executeEjectionRedirect();
      });
    }
  }

  executeEjectionRedirect() {
    if (this.ejectionCountdownInterval) clearInterval(this.ejectionCountdownInterval);
    // Clear token & session to enforce emergency portal re-auth
    try {
      sessionStorage.removeItem('userToken');
      sessionStorage.removeItem('userSession');
    } catch (_) {}

    window.location.href = '/emergency-auth.html';
  }

  start(payload = {}) {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.currentSecond = 0;
    this.lastSecond = -1;

    this.deliveredBattleMessages.clear();
    this.deliveredTerminalErrors.clear();
    this.deliveredTerminalThreats.clear();

    // Load Assistants from payload or window.sessionAssistantsList
    if (payload.assistants && Array.isArray(payload.assistants) && payload.assistants.length > 0) {
      this.assistants = payload.assistants;
    } else if (window.sessionAssistantsList && Array.isArray(window.sessionAssistantsList) && window.sessionAssistantsList.length > 0) {
      this.assistants = window.sessionAssistantsList;
    } else {
      this.assistants = [
        { student_name: 'دستیار کارآگاه (۱)' },
        { student_name: 'دستیار کارآگاه (۲)' },
        { student_name: 'دستیار کارآگاه (۳)' }
      ];
    }

    document.body.classList.add('cyber-breach-active');
    this.initAudioContext();
    this.playAudioFile('intro');

    // Immediate initial lockdown of tools and media stamping
    this.applyTamperLockdown();
    this.applyMazdakMediaStamps();

    // Create Mazdak live chat container if missing
    if (!document.getElementById('mazdak-stream-target') && this.dom.messagesBox) {
      const target = document.createElement('div');
      target.id = 'mazdak-stream-target';
      this.dom.messagesBox.appendChild(target);
    }
    this.dom.mazdakStreamTarget = document.getElementById('mazdak-stream-target');

    this.playbackTimer = setInterval(() => {
      this.currentSecond++;
      this.renderFrame(this.currentSecond);

      if (this.currentSecond >= this.duration) {
        clearInterval(this.playbackTimer);
      }
    }, 1000);

    this.renderFrame(0);
    console.log('[CyberBreachEngine] ☠️ Mazdak Cyber Breach timeline started for class.');
  }

  stop() {
    if (this.playbackTimer) clearInterval(this.playbackTimer);
    this.isPlaying = false;
    this.reset();
  }

  reset() {
    if (this.playbackTimer) clearInterval(this.playbackTimer);
    if (this.ejectionCountdownInterval) clearInterval(this.ejectionCountdownInterval);
    this.isPlaying = false;
    this.currentSecond = 0;
    this.lastSecond = -1;

    document.body.classList.remove('cyber-breach-active', 'screen-quake-launch', 'screen-slam-earthquake', 'screen-intense-quake', 'screen-cyber-tremor');
    this.dockTerminal(true);

    // Remove Mazdak media stamps
    this.removeMazdakMediaStamps();

    // Remove slot lockdowns
    const calCard = document.querySelector('.quad-calendar-card');
    if (calCard) calCard.classList.remove('calendar-locked-breakdown');
    document.querySelectorAll('.cal-nav-btn, #shamsi-today-badge, .shamsi-days-grid span').forEach(el => {
      el.removeAttribute('disabled');
      el.classList.remove('is-locked-cyber-breach');
    });

    const astCard = document.querySelector('.quad-assistants-card');
    if (astCard) astCard.classList.remove('slot-corrupted-breakdown');
    const astBtn = document.getElementById('open-assistants-popup-btn');
    if (astBtn) astBtn.removeAttribute('disabled');

    const vaultCard = document.getElementById('quad-vault-card');
    if (vaultCard) vaultCard.classList.remove('vault-corrupted-breakdown', 'vault-tamper-lockdown');
    const vaultBtn = document.getElementById('vault-3d-trigger-btn');
    if (vaultBtn) vaultBtn.removeAttribute('disabled');

    // Remove fake battle messages
    document.querySelectorAll('.fake-battle-msg').forEach(m => m.remove());

    const d = this.dom;
    // Reset Terminal
    if (d.terminal) {
      d.terminal.classList.remove('is-elevated', 'pre-liftoff-lock', 'is-docked-corrupted');
      if (d.terminalTitle) d.terminalTitle.textContent = 'N-LOG // TERMINAL';
      if (d.terminalStatus) {
        d.terminalStatus.textContent = 'LIVE';
        d.terminalStatus.style.color = '';
      }
      if (d.overrideBox) d.overrideBox.style.display = 'none';
      if (d.terminalLogs) {
        d.terminalLogs.querySelectorAll('.term-breach-bilingual-line, .mazdak-terminal-threat-card').forEach(el => el.remove());
      }
    }

    // Reset Evidence Board
    document.querySelectorAll('.evidence-card').forEach(c => c.classList.remove('card-blackout'));
    document.querySelectorAll('.thread-main').forEach(t => t.classList.remove('electric-arc'));
    if (d.evidenceCount) d.evidenceCount.textContent = '۴ مدرک کشف‌شده';

    // Reset Assistants Stage
    document.querySelectorAll('.assistant-mini-frame').forEach(f => f.classList.remove('is-corrupted-portrait'));
    document.querySelectorAll('.assistant-mini-nameplate').forEach(n => n.classList.remove('corrupted-nameplate'));
    if (d.assistantsLiveDot) d.assistantsLiveDot.style.background = '';

    // Reset Chat
    if (d.chatSection) d.chatSection.classList.remove('is-channel-hijacked');
    if (d.chatComposer) d.chatComposer.classList.remove('input-locked-cyber');
    if (d.msgInput) {
      d.msgInput.disabled = false;
      d.msgInput.placeholder = 'گزارش یا سرنخ خود را به مرکز فرماندهی مخابره کنید…';
    }
    document.querySelectorAll('.composer-controls button, .composer-controls input, .composer-controls textarea').forEach(el => {
      el.removeAttribute('disabled');
      el.classList.remove('is-locked-cyber-breach');
    });

    if (d.typingIndicator) d.typingIndicator.style.display = 'none';
    if (d.mazdakStreamTarget) d.mazdakStreamTarget.innerHTML = '';
    if (d.ejectionOverlay) d.ejectionOverlay.classList.remove('active');

    this.deliveredBattleMessages.clear();
    this.deliveredTerminalErrors.clear();
    this.deliveredTerminalThreats.clear();

    this.stopAmbientDrone();
    console.log('[CyberBreachEngine] 🔓 Breach state reset to normal.');
  }

  applyTamperLockdown() {
    try {
      const astDlg = document.getElementById('assistants-photo-dialog');
      if (astDlg && astDlg.open) astDlg.close();
      const astLb = document.getElementById('assistants-lightbox-view');
      if (astLb) astLb.setAttribute('hidden', 'true');

      const vaultPwdDlg = document.getElementById('vault-password-dialog');
      if (vaultPwdDlg && vaultPwdDlg.open) vaultPwdDlg.close();
      const vaultRwdDlg = document.getElementById('vault-reward-dialog');
      if (vaultRwdDlg && vaultRwdDlg.open) vaultRwdDlg.close();

      const evDlg = document.getElementById('evidence-dialog');
      if (evDlg && evDlg.open) evDlg.close();

      if (typeof window.cancelUserReply === 'function') window.cancelUserReply();
    } catch (_) {}

    const calCard = document.querySelector('.quad-calendar-card');
    if (calCard) calCard.classList.add('calendar-locked-breakdown');
    document.querySelectorAll('.cal-nav-btn, #shamsi-today-badge, .shamsi-days-grid span').forEach(el => {
      el.setAttribute('disabled', 'true');
      el.classList.add('is-locked-cyber-breach');
    });

    const astCard = document.querySelector('.quad-assistants-card');
    if (astCard) astCard.classList.add('slot-corrupted-breakdown');
    const astBtn = document.getElementById('open-assistants-popup-btn');
    if (astBtn) astBtn.setAttribute('disabled', 'true');

    const vaultCard = document.getElementById('quad-vault-card');
    if (vaultCard) vaultCard.classList.add('vault-corrupted-breakdown', 'vault-tamper-lockdown');
    const vaultBtn = document.getElementById('vault-3d-trigger-btn');
    if (vaultBtn) vaultBtn.setAttribute('disabled', 'true');

    if (this.dom.chatComposer) this.dom.chatComposer.classList.add('input-locked-cyber');
    if (this.dom.msgInput) {
      this.dom.msgInput.disabled = true;
      this.dom.msgInput.placeholder = '🔒 کانال در وضعیت اضطراری است — ارسال پیام مسدود گردید';
    }
    document.querySelectorAll('.composer-controls button, .composer-controls input, .composer-controls textarea').forEach(el => {
      if (el.id !== 'ejectionAuthBtn' && el.id !== 'ejectionCopyBtn') {
        el.setAttribute('disabled', 'true');
        el.classList.add('is-locked-cyber-breach');
      }
    });

    document.querySelectorAll('.board-toolbar, .board-footer').forEach(el => {
      el.classList.add('is-locked-cyber-breach');
    });
  }

  applyMazdakMediaStamps() {
    document.querySelectorAll('audio, video').forEach(media => {
      try { media.pause(); } catch (_) {}
    });

    const mediaSelectors = [
      '.evidence-card',
      '.chat-media-image',
      '.has-user-media .msg-image-thumb',
      '.has-user-voice',
      '.has-voice-message',
      '.briefing-photo',
      '.evidence-photo',
      '.telegram-voice-card',
      '.chat-media-video'
    ];

    document.querySelectorAll(mediaSelectors.join(', ')).forEach(el => {
      if (el.querySelector('.mazdak-media-stamp')) return;
      const stamp = document.createElement('div');
      stamp.className = 'mazdak-media-stamp';
      stamp.setAttribute('aria-hidden', 'true');
      stamp.innerHTML = `
        <div class="mazdak-stamp-badge">
          <img src="/mazdak.jpg" alt="نشان مزداک" class="mazdak-stamp-img" onerror="this.src='/mazdak-danger-review.jpg'">
          <span class="mazdak-stamp-text">توقیف شد // SEIZED BY MAZDAK</span>
        </div>
      `;
      el.appendChild(stamp);
    });
  }

  removeMazdakMediaStamps() {
    document.querySelectorAll('.mazdak-media-stamp').forEach(s => s.remove());
  }

  appendChatMessage(msgData) {
    if (this.deliveredBattleMessages.has(msgData.id)) return;
    this.deliveredBattleMessages.add(msgData.id);

    const box = this.dom.messagesBox;
    if (!box) return;

    const div = document.createElement('div');
    div.dataset.messageId = msgData.id;
    div.className = `message-bubble ${msgData.senderType} fake-battle-msg ${msgData.extraClass || ''}`;

    div.innerHTML = `
      <div class="message-sender">
        <span class="sender-badge">${msgData.senderBadge}</span>
        ${msgData.senderSub ? `<span style="font-size: 11px; opacity: 0.8; margin-inline-start: 6px;">${msgData.senderSub}</span>` : ''}
      </div>
      <div class="message-content" style="font-size: 14.5px; line-height: 1.7;">${msgData.content}</div>
      <div class="message-footer-row" style="margin-top: 6px; font-size: 11px; color: #94a3b8;">
        <span class="message-time">${msgData.time || '۱۰:۲۲'}</span>
      </div>
    `;

    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    this.playAudioFile('tick');
  }

  appendTerminalBilingualLine(key, faText, enText, isWarn = false) {
    if (this.deliveredTerminalErrors.has(key)) return;
    this.deliveredTerminalErrors.add(key);

    const logs = this.dom.terminalLogs;
    if (!logs) return;

    const row = document.createElement('div');
    row.className = `term-breach-bilingual-line ${isWarn ? 'warn' : 'crit'}`;
    row.innerHTML = `
      <div class="term-breach-fa-text">> ${faText}</div>
      <div class="term-breach-en-text">// ${enText}</div>
    `;
    logs.appendChild(row);
    logs.scrollTop = logs.scrollHeight;
  }

  appendTerminalMazdakThreat(key, faText, enText) {
    if (this.deliveredTerminalThreats.has(key)) return;
    this.deliveredTerminalThreats.add(key);

    const logs = this.dom.terminalLogs;
    if (!logs) return;

    const card = document.createElement('div');
    card.className = 'mazdak-terminal-threat-card';
    card.innerHTML = `
      <div class="mazdak-threat-header">
        <div class="mazdak-threat-badge">⚡ مــزداک // تسخیر هسته پردازش</div>
        <span class="mazdak-threat-time">INTRUSION ACTIVE</span>
      </div>
      <div class="mazdak-threat-body-fa">«${faText}»</div>
      <div class="mazdak-threat-sub-en">// ${enText}</div>
    `;
    logs.appendChild(card);
    logs.scrollTop = logs.scrollHeight;
    this.playAudioFile('tick');
  }

  /* ==========================================================================
     PROCEDURAL WEB AUDIO SYNTHESIZERS (PNEUMATICS, IMPACT, GEIGER TICKS)
     ========================================================================== */
  playPneumaticBuildupSFX() {
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      const ctx = this.audioCtx;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const now = ctx.currentTime;

      // Compressor whine rising from 120Hz to 680Hz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 1.8);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.09, now + 1.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.9);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.95);
    } catch (_) {}
  }

  playHydraulicLaunchSFX() {
    this.playAudioFile('scan');
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      const ctx = this.audioCtx;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const now = ctx.currentTime;

      // 1. High-pressure white noise gas release sweep
      const bufferSize = Math.floor(ctx.sampleRate * 0.6);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(3200, now + 0.45);
      filter.Q.value = 3;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.02, now);
      noiseGain.gain.linearRampToValueAtTime(0.25, now + 0.08);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.6);

      // 2. Sub-bass launch kick
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(110, now);
      sub.frequency.exponentialRampToValueAtTime(30, now + 0.5);

      subGain.gain.setValueAtTime(0.4, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      sub.connect(subGain);
      subGain.connect(ctx.destination);
      sub.start(now);
      sub.stop(now + 0.55);
    } catch (_) {}
  }

  playGeigerTickSFX(percent) {
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      const ctx = this.audioCtx;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800 + (percent * 8), now);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch (_) {}
  }

  playHydraulicSlamSFX() {
    this.playAudioFile('scan');
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      const ctx = this.audioCtx;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const now = ctx.currentTime;

      // 1. Heavy Metallic Clank (FM Synthesis)
      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      const carrierGain = ctx.createGain();

      carrier.type = 'triangle';
      carrier.frequency.setValueAtTime(180, now);
      carrier.frequency.exponentialRampToValueAtTime(32, now + 0.38);

      modulator.type = 'sawtooth';
      modulator.frequency.setValueAtTime(340, now);
      modGain.gain.setValueAtTime(600, now);
      modGain.gain.exponentialRampToValueAtTime(10, now + 0.3);

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);

      carrierGain.gain.setValueAtTime(0.65, now);
      carrierGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      carrier.connect(carrierGain);
      carrierGain.connect(ctx.destination);

      modulator.start(now);
      carrier.start(now);
      modulator.stop(now + 0.5);
      carrier.stop(now + 0.55);

      // 2. Sub-Bass Impact Thud (Massive 30Hz boom)
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(95, now);
      sub.frequency.exponentialRampToValueAtTime(22, now + 0.65);

      subGain.gain.setValueAtTime(0.85, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      sub.connect(subGain);
      subGain.connect(ctx.destination);
      sub.start(now);
      sub.stop(now + 0.75);

      // 3. Pneumatic Gas Compression Burst
      const bufferSize = Math.floor(ctx.sampleRate * 0.35);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.linearRampToValueAtTime(120, now + 0.3);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.35);
    } catch (_) {}
  }

  playElectricArcZap() {
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      const ctx = this.audioCtx;
      const now = ctx.currentTime;
      const zapDuration = 0.12;

      // 120Hz-modulated FM arc sizzle
      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      const carrierGain = ctx.createGain();

      carrier.type = 'sawtooth';
      carrier.frequency.setValueAtTime(1150, now);
      carrier.frequency.linearRampToValueAtTime(750, now + zapDuration);

      modulator.type = 'sawtooth';
      modulator.frequency.setValueAtTime(120, now);

      modGain.gain.setValueAtTime(650, now);
      modGain.gain.exponentialRampToValueAtTime(10, now + zapDuration);

      carrierGain.gain.setValueAtTime(0.15, now);
      carrierGain.gain.exponentialRampToValueAtTime(0.0001, now + zapDuration);

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(carrierGain);
      carrierGain.connect(ctx.destination);

      modulator.start(now);
      carrier.start(now);
      modulator.stop(now + zapDuration);
      carrier.stop(now + zapDuration);
    } catch (_) {}
  }

  triggerBracketArcFlash() {
    if (!this.dom.terminal) return;
    this.dom.terminal.classList.add('hud-bracket-zap');
    setTimeout(() => {
      this.dom.terminal?.classList.remove('hud-bracket-zap');
    }, 260);
  }

  triggerChassisLandingSlamVisuals() {
    // 1. Screen Earthquake (applied to body and under-board grid)
    document.body.classList.add('screen-slam-earthquake', 'screen-earthquake-slam');
    const grid = document.querySelector('.under-board-quad-grid');
    if (grid) grid.classList.add('screen-earthquake-slam');

    // 2. Chassis Ghost Slot Electrical Spark Flare
    if (this.dom.ghostSlot) {
      this.dom.ghostSlot.classList.add('ghost-impact-spark');
    }

    // 3. CRT Slam Flash
    const flash = document.createElement('div');
    flash.className = 'crt-slam-flash';
    document.body.appendChild(flash);

    setTimeout(() => {
      document.body.classList.remove('screen-slam-earthquake', 'screen-earthquake-slam');
      if (grid) grid.classList.remove('screen-earthquake-slam');
      if (this.dom.ghostSlot) {
        this.dom.ghostSlot.classList.remove('ghost-impact-spark');
      }
      flash.remove();
    }, 680);
  }

  /* ==========================================================================
     TRUE ROOT-PORTALED FLIP MECHANICAL ELEVATION & DOCKING LOGIC
     ========================================================================== */
  alignElevatedTerminal() {
    const term = this.dom.terminal;
    if (!term || !this.isElevated) return;
    const targetW = Math.min(880, window.innerWidth * 0.94);
    const targetH = Math.min(500, window.innerHeight * 0.80);
    const targetL = (window.innerWidth - targetW) / 2;
    const targetT = (window.innerHeight - targetH) / 2;

    term.style.left = `${targetL}px`;
    term.style.top = `${targetT}px`;
    term.style.width = `${targetW}px`;
    term.style.height = `${targetH}px`;
  }

  elevateTerminal(instant = false) {
    const d = this.dom;
    if (!d.terminal || this.isElevated) return;
    this.isElevated = true;

    const term = d.terminal;
    const ghost = d.ghostSlot;
    const dimmer = d.dimmer;

    if (dimmer) dimmer.classList.add('active');
    if (ghost) {
      ghost.style.display = 'flex';
      ghost.classList.add('is-active');
    }

    // Step 1: Calculate initial bounding box before detaching
    const firstRect = term.getBoundingClientRect();
    const targetW = Math.min(880, window.innerWidth * 0.94);
    const targetH = Math.min(500, window.innerHeight * 0.80);
    const targetL = (window.innerWidth - targetW) / 2;
    const targetT = (window.innerHeight - targetH) / 2;

    // Step 2: Portal terminal directly into document.body to break free from any ancestor overflow/contain/grid stacking context!
    if (term.parentNode !== document.body) {
      document.body.appendChild(term);
    }

    if (instant) {
      term.classList.add('is-elevated');
      term.style.position = 'fixed';
      term.style.left = `${targetL}px`;
      term.style.top = `${targetT}px`;
      term.style.width = `${targetW}px`;
      term.style.height = `${targetH}px`;
      term.style.zIndex = '99999';
      term.style.transform = 'none';
      term.style.transition = 'none';
      return;
    }

    // Step 3: Lock to initial slot bounding box
    term.classList.add('is-elevated');
    term.style.position = 'fixed';
    term.style.left = `${firstRect.left}px`;
    term.style.top = `${firstRect.top}px`;
    term.style.width = `${firstRect.width}px`;
    term.style.height = `${firstRect.height}px`;
    term.style.zIndex = '99999';
    term.style.transform = 'none';
    term.style.transition = 'none';

    // Step 4: Force layout reflow
    void term.offsetHeight;

    // Step 5: Smoothly elevate to center with custom high-tension cubic-bezier
    term.style.transition = 'all 0.75s cubic-bezier(0.16, 1, 0.3, 1)';
    term.style.left = `${targetL}px`;
    term.style.top = `${targetT}px`;
    term.style.width = `${targetW}px`;
    term.style.height = `${targetH}px`;
    term.style.transform = 'scale(1.02)';

    // Trigger launch earthquake shudder on the viewport
    document.body.classList.add('screen-quake-launch');
    setTimeout(() => {
      document.body.classList.remove('screen-quake-launch');
    }, 500);
  }

  dockTerminal(instant = false) {
    const d = this.dom;
    if (!this.isElevated && (!d.terminal || d.terminal.parentNode !== document.body)) return;
    this.isElevated = false;

    const term = d.terminal;
    const ghost = d.ghostSlot;
    const dimmer = d.dimmer;

    if (dimmer) dimmer.classList.remove('active');

    const restoreToGrid = () => {
      if (ghost && ghost.parentNode && term && term.parentNode === document.body) {
        ghost.parentNode.insertBefore(term, ghost);
      }
      if (ghost) {
        ghost.classList.remove('is-active');
        ghost.style.display = 'none';
      }
      if (term) {
        term.classList.remove('is-elevated');
        term.classList.add('is-docked-corrupted');
        term.style.position = '';
        term.style.left = '';
        term.style.top = '';
        term.style.width = '';
        term.style.height = '';
        term.style.zIndex = '';
        term.style.transform = '';
        term.style.transition = '';
      }
    };

    if (instant || !ghost || !term) {
      restoreToGrid();
      return;
    }

    // FLIP animate back to ghost slot position with gravitational acceleration
    const ghostRect = ghost.getBoundingClientRect();
    term.style.transition = 'all 0.65s cubic-bezier(0.55, 0.085, 0.68, 0.53)';
    term.style.left = `${ghostRect.left}px`;
    term.style.top = `${ghostRect.top}px`;
    term.style.width = `${ghostRect.width}px`;
    term.style.height = `${ghostRect.height}px`;
    term.style.transform = 'none';

    setTimeout(() => {
      if (!this.isElevated) {
        restoreToGrid();

        // 💥 TRIGGER CATASTROPHIC SLAM IMPACT & VISUALS
        this.playHydraulicSlamSFX();
        this.triggerChassisLandingSlamVisuals();
      }
    }, 660);
  }

  renderFrame(sec) {
    const d = this.dom;

    // ------------------------------------------------------------------
    // Phase 0: Immediate Initial Lockdown & Detective Anxious Messages (Sec 0 to 17)
    // ------------------------------------------------------------------
    if (sec === 0) {
      this.applyTamperLockdown();
      this.applyMazdakMediaStamps();
    }

    if (sec >= 2 && sec < 6) {
      this.appendChatMessage({
        id: 'detective-1',
        senderType: 'admin',
        extraClass: 'detective-msg',
        senderBadge: '🔍 سرکارآگاه (مرکز فرماندهی)',
        content: 'بچه‌ها! پیام من رو دریافت می‌کنید؟ صدای من رو دارید؟'
      });
    }

    if (sec >= 6 && sec < 11) {
      this.appendChatMessage({
        id: 'detective-2',
        senderType: 'admin',
        extraClass: 'detective-msg',
        senderBadge: '🔍 سرکارآگاه (مرکز فرماندهی)',
        content: 'یه سری تغییرات و نوسان شدید دارم تو سامانه‌ها می‌بینم... سیستم ناپایدار شده!'
      });
    }

    if (sec >= 11 && sec < 16) {
      this.appendChatMessage({
        id: 'detective-3',
        senderType: 'admin',
        extraClass: 'detective-msg',
        senderBadge: '🔍 سرکارآگاه (مرکز فرماندهی)',
        content: 'هشدار امنیتی اومده روی مانیتورم... دارن به سایت پایگاه حمله می‌کنن! بچه‌ها پیامم میاددددد؟'
      });
    }

    if (sec >= 16 && sec < 20) {
      this.appendChatMessage({
        id: 'detective-4',
        senderType: 'admin',
        extraClass: 'detective-msg',
        senderBadge: '🔍 سرکارآگاه (مرکز فرماندهی)',
        content: 'چرا جوابمو نمی‌دین؟! ارسال پیام شما قطع شده؟ دارم به شدت نگران می‌شم...'
      });
    }

    // ------------------------------------------------------------------
    // Phase 1: Alarm & Large Bilingual Terminal Intrusion (Sec 18 to 27)
    // ------------------------------------------------------------------
    if (sec >= 18) {
      this.startAmbientDrone();
      if (sec === 18 && sec !== this.lastSecond) {
        this.playAudioFile('alarm');
      }

      if (d.terminalTitle) d.terminalTitle.textContent = 'N-LOG // [BREACH DETECTED]';
      if (d.terminalStatus) {
        d.terminalStatus.textContent = 'ALERT';
        d.terminalStatus.style.color = '#ff003c';
      }

      this.appendTerminalBilingualLine(
        'err-port-8088',
        'خطای امنیتی بحرانی: پکت‌های مشکوک در پورت ۸۰۸۸ شناسایی شد',
        'CRITICAL ALERT: UNEXPECTED PACKET BURST ON PORT 8088',
        true
      );

      if (sec >= 22) {
        this.appendTerminalBilingualLine(
          'err-kernel-ring0',
          'تله کرنل رینگ-۰: بدافزار نفوذگر APT-MAZDAK در سطح سیستمی شناسایی شد',
          'KERNEL TRAP: APT-MAZDAK RING-0 INTRUSION PROBE DETECTED',
          false
        );
      }

      if (sec >= 25) {
        this.appendTerminalBilingualLine(
          'err-firewall-fail',
          'سقوط فایروال: دور زدن گواهی‌های امنیتی و محاصره پروتکل‌ها',
          'FIREWALL BREACH: DEFENSE GRID COLLAPSED // ROGUE CERT',
          false
        );
      }

      // Glitch Student Assistant Mini Frames
      const frames = document.querySelectorAll('.assistant-mini-frame');
      frames.forEach((f, idx) => {
        f.classList.add('is-corrupted-portrait');
        if (!f.querySelector('.corrupted-noise-overlay')) {
          const noise = document.createElement('div');
          noise.className = 'corrupted-noise-overlay';
          f.appendChild(noise);
        }
        if (!f.querySelector('.biometric-hud-reticle')) {
          const reticle = document.createElement('div');
          reticle.className = 'biometric-hud-reticle';
          f.appendChild(reticle);
        }

        const nameEl = f.querySelector('.assistant-mini-name');
        if (nameEl) {
          const ast = this.assistants[idx % this.assistants.length];
          const realName = ast ? ast.student_name : `دستیار #${idx + 1}`;
          nameEl.textContent = `ERR_0x${(idx + 41).toString(16)} [${realName}]`;
          nameEl.parentElement?.classList.add('corrupted-nameplate');
        }
      });

      if (d.assistantsLiveDot) d.assistantsLiveDot.style.background = '#ff003c';

      // Evidence Board Blackout & Sparks
      document.querySelectorAll('.evidence-card').forEach(c => c.classList.add('card-blackout'));
      document.querySelectorAll('.thread-main').forEach(t => t.classList.add('electric-arc'));
      if (d.evidenceCount) d.evidenceCount.textContent = '۰ مدرک در دسترس (سیگنال مفقود)';

      // Vault Lockdown
      if (d.vaultCard) d.vaultCard.classList.add('vault-tamper-lockdown', 'vault-corrupted-breakdown');
      if (d.vaultStatusLabel) d.vaultStatusLabel.textContent = 'هشدار نفوذ: قفل هیدرولیک مسدود شد';
    }

    // ------------------------------------------------------------------
    // Phase 2.5: Pre-liftoff Anticipation & Pressure Buildup (Sec 26 to 27)
    // ------------------------------------------------------------------
    if (sec >= 26 && sec < 28) {
      if (d.terminal) {
        d.terminal.classList.add('pre-liftoff-lock');
        if (d.terminalStatus) {
          d.terminalStatus.textContent = 'PRESSURE // OVERLOAD';
          d.terminalStatus.style.color = '#ff003c';
        }
      }
      if (sec === 26 && sec !== this.lastSecond) {
        this.playPneumaticBuildupSFX();
      }
    }

    // ------------------------------------------------------------------
    // Phase 3: Terminal Elevation to Center & Mazdak In-Terminal Threats (Sec 28 to 57)
    // ------------------------------------------------------------------
    if (sec >= 28 && sec < 58) {
      if (d.terminal) d.terminal.classList.remove('pre-liftoff-lock');
      if (!this.isElevated) {
        this.elevateTerminal();
        this.playHydraulicLaunchSFX();
        document.body.classList.add('screen-intense-quake', 'screen-cyber-tremor');
      }
      if (window.liveTerminal) window.liveTerminal.isPaused = true;

      if (d.overrideBox) d.overrideBox.style.display = 'block';

      const progressRatio = Math.min(1, Math.max(0, (sec - 28) / 30));
      const percent = Math.round(progressRatio * 100);

      // Geiger / Relay Tech Clack on milestone progress
      if (sec !== this.lastSecond) {
        if (percent > 0 && percent % 10 <= 4) {
          this.playGeigerTickSFX(percent);
        }
        if (sec % 3 === 0 || percent === 25 || percent === 50 || percent === 75 || percent === 90) {
          this.playElectricArcZap();
          this.triggerBracketArcFlash();
        }
      }

      if (d.overridePercent) d.overridePercent.textContent = `${percent}%`;
      if (d.terminalTitle) d.terminalTitle.textContent = `⚡ TERMINAL TAKEOVER // تسخیر هسته کلاس`;
      if (d.terminalStatus) {
        d.terminalStatus.textContent = `${percent}%`;
        d.terminalStatus.style.color = percent >= 75 ? '#ff003c' : '#00f0ff';
      }

      // Update 20 LED segments
      if (d.segmentedBar) {
        const leds = d.segmentedBar.querySelectorAll('.seg-led');
        const activeCount = Math.floor((percent / 100) * leds.length);
        leds.forEach((led, idx) => {
          if (idx < activeCount) {
            led.classList.add('active');
            if (percent >= 75) led.classList.add('danger');
          } else {
            led.classList.remove('active', 'danger');
          }
        });
      }

      if (percent >= 15) {
        this.appendTerminalBilingualLine(
          'over-bypass-sig',
          'تسخیر گره پردازش کلاس: شناسایی هویت نشست و تزریق امضای مخرب',
          'SESSION_NODE IDENTIFIED // INJECTING MAZDAK_SIG PAYLOAD',
          false
        );
      }

      if (percent >= 40) {
        this.appendTerminalBilingualLine(
          'over-crypto-harvest',
          'تاراج کدهای بازیابی: مصادره کلیدهای امنیتی و پروتکل ارتباطی',
          'CRYPTO HARVESTING: ALL RECOVERY CODES SEIZED',
          true
        );
      }

      // Mazdak In-Terminal Threat Messages (Stable Append, No Flicker)
      if (sec >= 34) {
        this.appendTerminalMazdakThreat(
          'term-threat-1',
          'تمام اطلاعات و کدهای شما رو گرفتم... فکر کردید نفهمیدم دارید چیکار می‌کنید؟',
          'MAZDAK: I intercepted all your session data... You thought you were hidden?'
        );
      }

      if (sec >= 42) {
        this.appendTerminalMazdakThreat(
          'term-threat-2',
          'نمی‌ذارم این پرونده رو حل کنید! کنترل خط تحقیقات کامل دست منه...',
          'MAZDAK: I will never let you solve this case! Full investigation line seized.'
        );
      }

      if (sec >= 50) {
        this.appendTerminalMazdakThreat(
          'term-threat-3',
          'ارتباطتون با مرکز قطع شد؛ کارتون تمومه!',
          'MAZDAK: Command link severed. Game over for you detectives!'
        );
      }
    }

    // ------------------------------------------------------------------
    // Phase 4: Docking Terminal Back (Sec 58 to 62)
    // ------------------------------------------------------------------
    if (sec >= 58) {
      if (this.isElevated) {
        document.body.classList.remove('screen-intense-quake', 'screen-cyber-tremor');
        this.dockTerminal();
      }
      if (window.liveTerminal) window.liveTerminal.isPaused = false;
      if (d.overrideBox) d.overrideBox.style.display = 'none';
      if (d.terminalTitle) d.terminalTitle.textContent = 'TAKEN OVER // تحت کنترل مزداک';
      if (d.terminalStatus) {
        d.terminalStatus.textContent = 'MAZDAK';
        d.terminalStatus.style.color = '#ff003c';
      }
    }

    // ------------------------------------------------------------------
    // Phase 5: Fake Battle in Chat (Sec 63 to 107)
    // ------------------------------------------------------------------
    if (sec >= 63 && sec < 108) {
      if (d.chatSection) d.chatSection.classList.add('is-channel-hijacked');
      if (d.channelNoticeText) d.channelNoticeText.textContent = '⚠️ هشدار امنیتی: فرکانس ناشناس شناسایی شد — ارتباط پایگاه قطع گردید';
      if (d.chatComposer) d.chatComposer.classList.add('input-locked-cyber');
      if (d.msgInput) {
        d.msgInput.disabled = true;
        d.msgInput.placeholder = '🔒 دسترسی مسدود است — کانال توسط مزداک توقیف گردید';
      }

      // 1. Mazdak impersonating kids (Sec 63)
      if (sec >= 63) {
        this.appendChatMessage({
          id: 'battle-kids-1',
          senderType: 'user',
          extraClass: 'kids-impersonated-msg',
          senderBadge: '👥 دستیاران کارآگاه',
          senderSub: 'ارتباط میدانی',
          content: 'کارآگاه نگران نباشید ما اینجاییم! ارتباط یه لحظه قطع شد ولی الان کنترل دست خودمونه...'
        });
      }

      // 2. Detective relieved response (Sec 70)
      if (sec >= 70) {
        this.appendChatMessage({
          id: 'battle-det-1',
          senderType: 'admin',
          extraClass: 'detective-msg',
          senderBadge: '🔍 سرکارآگاه (مرکز فرماندهی)',
          senderSub: 'پاسخ مستقیم',
          content: 'خدا رو شکر پیامتون اومد! بچه‌ها سریع گزارش بدید اونجا چه خبره؟ پیام‌های خطای نفوذ از کجا دارن تزریق می‌شن؟'
        });
      }

      // 3. Mazdak drops disguise from kids side (Sec 77)
      if (sec >= 77) {
        this.appendChatMessage({
          id: 'battle-kids-2',
          senderType: 'user',
          extraClass: 'kids-impersonated-msg',
          senderBadge: '👥 دستیاران کارآگاه',
          senderSub: 'جعل فرکانس',
          content: 'هاهاها... دلت به چی خوشه کارآگاه؟ بچه‌ها کین؟! اطلاعاتشون کامل دست منه و حتی نمی‌تونن یک کلمه تایپ کنن!'
        });
      }

      // 4. Detective shock and realization (Sec 84)
      if (sec >= 84) {
        this.appendChatMessage({
          id: 'battle-det-2',
          senderType: 'admin',
          extraClass: 'detective-msg',
          senderBadge: '🔍 سرکارآگاه (مرکز فرماندهی)',
          senderSub: 'کشف فریب',
          content: 'صبر کن... شما بچه‌ها نیستید! این لحن کثیف... مزداک؟! چطور تونستی فرکانس بچه‌ها رو جعل کنی؟!'
        });
      }

      // 5. Mazdak unmasked with Mazdak badge (Sec 91)
      if (sec >= 91) {
        this.appendChatMessage({
          id: 'battle-mazdak-1',
          senderType: 'hacker',
          extraClass: 'mazdak-unmasked-msg',
          senderBadge: '⚡ مــزداک // نفوذ مرکزی',
          senderSub: 'سیطره کامل',
          content: 'خیلی دیر فهمیدی سرکارآگاه! این پایگاه و تمام پرونده‌های دهکده حالا متعلق به منه. هیچ راه نجاتی برای تیمت نذاشتم!'
        });
      }

      // 6. Detective final emergency broadcast (Sec 98)
      if (sec >= 98) {
        this.appendChatMessage({
          id: 'battle-det-3',
          senderType: 'admin',
          extraClass: 'detective-msg',
          senderBadge: '🔍 سرکارآگاه (مرکز فرماندهی)',
          senderSub: 'پروتکل اضطراری',
          content: 'من الان سیستم احراز هویت امنیتی رو فعال می‌کنم و همه از سایت می‌افتید بیرون! بچه‌ها خیلی حواستون به لیلیوم باشه و سرنخ‌هایی که داده بودم برای برگشتن به راه ارتباطی امن رو دنبال کنین... ارتباط داره قطع میشه!'
        });
      }

      // Typing Indicator
      if ((sec >= 68 && sec < 70) || (sec >= 75 && sec < 77) || (sec >= 82 && sec < 84) || (sec >= 89 && sec < 91) || (sec >= 96 && sec < 98)) {
        if (d.typingIndicator) {
          d.typingIndicator.style.display = 'flex';
          d.typingIndicator.className = 'typing-line mazdak-typing-line';
          d.typingIndicator.innerHTML = `
            <span class="mazdak-pulse-dot"></span>
            <span>در حال مخابره پیام در فرکانس کانال...</span>
          `;
        }
      } else {
        if (d.typingIndicator) d.typingIndicator.style.display = 'none';
      }
    }

    // ------------------------------------------------------------------
    // Phase 6: Ejection Modal (Second 108 / End of Hack)
    // ------------------------------------------------------------------
    if (sec >= 108) {
      if (sec === 108 && sec !== this.lastSecond) {
        this.playAudioFile('alarm');
        this.triggerEmergencyEjectionModal();
      }
    }

    this.lastSecond = sec;
  }

  triggerEmergencyEjectionModal() {
    this.ensureEjectionModal();
    if (!this.dom.ejectionOverlay) return;

    this.dom.ejectionOverlay.classList.add('active');

    // 5 minutes (300 seconds) countdown to automatic ejection
    let countdownSec = 300;
    const countdownEl = document.getElementById('ejectionCountdownText');

    const formatCountdown = (totalSec) => {
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      const fMins = String(mins).padStart(2, '0');
      const fSecs = String(secs).padStart(2, '0');
      return `${fMins}:${fSecs}`;
    };

    if (countdownEl) {
      countdownEl.textContent = `خروج و انتقال خودکار تا ۵:۰۰ دقیقه دیگر...`;
    }

    if (this.ejectionCountdownInterval) clearInterval(this.ejectionCountdownInterval);
    this.ejectionCountdownInterval = setInterval(() => {
      countdownSec--;
      if (countdownEl) {
        countdownEl.textContent = `خروج و انتقال خودکار تا ${formatCountdown(countdownSec)} دقیقه دیگر...`;
      }
      if (countdownSec <= 0) {
        clearInterval(this.ejectionCountdownInterval);
        this.executeEjectionRedirect();
      }
    }, 1000);
  }

  // Audio helper
  initAudioContext() {
    if (this.audioInitialized) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        this.audioInitialized = true;
      }
    } catch (_) {}
  }

  startAmbientDrone() {
    if (!this.soundEnabled || !this.audioCtx || this.droneOsc1) return;
    try {
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      this.droneGain = this.audioCtx.createGain();
      this.droneGain.gain.setValueAtTime(0.001, this.audioCtx.currentTime);
      this.droneGain.gain.linearRampToValueAtTime(0.04, this.audioCtx.currentTime + 2);

      this.droneOsc1 = this.audioCtx.createOscillator();
      this.droneOsc1.type = 'sawtooth';
      this.droneOsc1.frequency.setValueAtTime(48, this.audioCtx.currentTime);

      this.droneOsc2 = this.audioCtx.createOscillator();
      this.droneOsc2.type = 'triangle';
      this.droneOsc2.frequency.setValueAtTime(51.5, this.audioCtx.currentTime);

      this.droneOsc1.connect(this.droneGain);
      this.droneOsc2.connect(this.droneGain);
      this.droneGain.connect(this.audioCtx.destination);

      this.droneOsc1.start();
      this.droneOsc2.start();
    } catch (_) {}
  }

  stopAmbientDrone() {
    try {
      if (this.droneGain && this.audioCtx) {
        this.droneGain.gain.linearRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.5);
      }
      setTimeout(() => {
        if (this.droneOsc1) { this.droneOsc1.stop(); this.droneOsc1.disconnect(); this.droneOsc1 = null; }
        if (this.droneOsc2) { this.droneOsc2.stop(); this.droneOsc2.disconnect(); this.droneOsc2 = null; }
      }, 600);
    } catch (_) {}
  }

  playAudioFile(key) {
    if (!this.soundEnabled) return;
    const audio = this.sfx[key];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  }
}

// Global engine instance
window.cyberBreachEngine = new CyberBreachEngine();
window.hackEngine = window.cyberBreachEngine; // Backward-compatible alias for existing code

document.addEventListener('DOMContentLoaded', () => {
  window.cyberBreachEngine.init();
});
