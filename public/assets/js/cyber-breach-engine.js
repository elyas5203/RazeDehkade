/**
 * CYBER BREACH ENGINE (v2.0 AAA Studio Edition)
 * Live Class Isolation, Dynamic Student Assistant Glitch, Mazdak Takeover & Emergency Ejection Modal
 * Operates safely within public/chat.html with Zero Regressions
 */

'use strict';

class CyberBreachEngine {
  constructor() {
    this.duration = 120; // 2 minutes choreography
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

    console.log('[CyberBreachEngine] Initialized AAA Engine successfully.');
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
            خروج و انتقال خودکار تا ۱۵ ثانیه دیگر...
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

    document.body.classList.remove('cyber-breach-active', 'screen-quake-launch', 'screen-slam-earthquake');
    this.dockTerminal(true);

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
    }

    // Reset Evidence Board
    document.querySelectorAll('.evidence-card').forEach(c => c.classList.remove('card-blackout'));
    document.querySelectorAll('.thread-main').forEach(t => t.classList.remove('electric-arc'));
    if (d.evidenceCount) d.evidenceCount.textContent = '۴ مدرک کشف‌شده';

    // Reset Assistants Stage
    document.querySelectorAll('.assistant-mini-frame').forEach(f => f.classList.remove('is-corrupted-portrait'));
    document.querySelectorAll('.assistant-mini-nameplate').forEach(n => n.classList.remove('corrupted-nameplate'));
    if (d.assistantsLiveDot) d.assistantsLiveDot.style.background = '';

    // Reset Vault
    if (d.vaultCard) d.vaultCard.classList.remove('vault-tamper-lockdown');

    // Reset Chat
    if (d.chatSection) d.chatSection.classList.remove('is-channel-hijacked');
    if (d.chatComposer) d.chatComposer.classList.remove('input-locked-cyber');
    if (d.msgInput) {
      d.msgInput.disabled = false;
      d.msgInput.placeholder = 'گزارش یا سرنخ خود را به مرکز فرماندهی مخابره کنید…';
    }
    if (d.typingIndicator) d.typingIndicator.style.display = 'none';
    if (d.mazdakStreamTarget) d.mazdakStreamTarget.innerHTML = '';
    if (d.ejectionOverlay) d.ejectionOverlay.classList.remove('active');

    this.stopAmbientDrone();
    console.log('[CyberBreachEngine] 🔓 Breach state reset to normal.');
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
    // Phase 1: Alarm & Initial Terminal Intrusion (Sec 18 to 37)
    // ------------------------------------------------------------------
    if (sec >= 18 && sec < 38) {
      this.startAmbientDrone();
      if (sec === 18 && sec !== this.lastSecond) {
        this.playAudioFile('alarm');
      }

      if (d.terminalTitle) d.terminalTitle.textContent = 'N-LOG // [BREACH DETECTED]';
      if (d.terminalStatus) {
        d.terminalStatus.textContent = 'ALERT';
        d.terminalStatus.style.color = '#ff003c';
      }

      let lines = `
        <div class="term-breach-line"><span>> [ALERT] UNEXPECTED PACKET BURST ON PORT 8088</span> <span class="term-tag-warn">WARN</span></div>
      `;
      if (sec >= 24) {
        lines += `<div class="term-breach-line"><span>> [WARN] KERNEL TRAP: UNAUTHORIZED RING-0 PROBE</span> <span class="term-tag-warn">TRAP</span></div>`;
      }
      if (sec >= 30) {
        lines += `<div class="term-breach-line"><span>> [ALERT] FORGED CERTIFICATE DETECTED: APT-MAZDAK</span> <span class="term-tag-crit">ROGUE</span></div>`;
      }
      if (sec >= 35) {
        lines += `<div class="term-breach-line"><span>> [FIREWALL] TAMPER ATTEMPT: DEFENSE COLLAPSED</span> <span class="term-tag-crit">FAIL</span></div>`;
      }
      if (d.terminalLogs) d.terminalLogs.innerHTML = lines;
    }

    // ------------------------------------------------------------------
    // Phase 2: Evidence Blackout & Real Assistant Portraits Glitch (Sec 38 to 57)
    // ------------------------------------------------------------------
    if (sec >= 38) {
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
      if (d.vaultCard) d.vaultCard.classList.add('vault-tamper-lockdown');
      if (d.vaultStatusLabel) d.vaultStatusLabel.textContent = 'هشدار نفوذ: قفل هیدرولیک مسدود شد';

      if (sec === 38 && sec !== this.lastSecond) {
        this.playAudioFile('scan');
      }
    }

    // ------------------------------------------------------------------
    // Phase 2.5: Pre-liftoff Anticipation & Pressure Buildup (Sec 56 to 57)
    // ------------------------------------------------------------------
    if (sec >= 56 && sec < 58) {
      if (d.terminal) {
        d.terminal.classList.add('pre-liftoff-lock');
        if (d.terminalStatus) {
          d.terminalStatus.textContent = 'PRESSURE // OVERLOAD';
          d.terminalStatus.style.color = '#ff003c';
        }
      }
      if (sec === 56 && sec !== this.lastSecond) {
        this.playPneumaticBuildupSFX();
      }
    }

    // ------------------------------------------------------------------
    // Phase 3: Terminal Elevation to Center & Progress 0% -> 100% (Sec 58 to 79)
    // ------------------------------------------------------------------
    if (sec >= 58 && sec < 80) {
      if (d.terminal) d.terminal.classList.remove('pre-liftoff-lock');
      if (!this.isElevated) {
        this.elevateTerminal();
        this.playHydraulicLaunchSFX();
      }
      if (window.liveTerminal) window.liveTerminal.isPaused = true;

      if (d.overrideBox) d.overrideBox.style.display = 'block';

      const progressRatio = Math.min(1, Math.max(0, (sec - 58) / 21));
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

      let matrixLogs = `
        <div class="term-breach-line"><span>> [TARGET] SESSION_NODE // IDENTIFIED</span> <span class="term-tag-crit">LOCKED</span></div>
        <div class="term-breach-line"><span>> [CRYPTO] HARVESTING RECOVERY CODES</span> <span class="term-tag-crit">CAPTURED</span></div>
      `;
      if (percent >= 30) {
        matrixLogs += `<div class="term-breach-line"><span>> [BYPASS] REPLACING SESSION INTEGRITY KEY WITH MAZDAK_SIG</span> <span class="term-tag-warn">OVERRIDE</span></div>`;
      }
      if (percent >= 60) {
        matrixLogs += `<div class="term-breach-line"><span>> [HIJACK] INJECTING ROGUE SOCKET DISPATCHER PID: 9942</span> <span class="term-tag-crit">INJECTED</span></div>`;
      }
      if (percent >= 90) {
        matrixLogs += `<div class="term-breach-line"><span>> [COMPLETE] 100% TAKEOVER: NODE COMPLETELY SUBJUGATED!</span> <span class="term-tag-crit">MAZDAK</span></div>`;
      }
      if (d.terminalLogs) d.terminalLogs.innerHTML = matrixLogs;
    }

    // ------------------------------------------------------------------
    // Phase 4: Docking Terminal Back (Sec 80 to 81)
    // ------------------------------------------------------------------
    if (sec >= 80) {
      if (this.isElevated) {
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
    // Phase 5: Live Chat Channel Takeover & Hostile Mazdak Messages (Sec 82 to 119)
    // ------------------------------------------------------------------
    if (sec >= 82 && sec < 120) {
      if (d.chatSection) d.chatSection.classList.add('is-channel-hijacked');
      if (d.channelNoticeText) d.channelNoticeText.textContent = '⚠️ هشدار امنیتی: فرکانس ناشناس شناسایی شد — ارتباط پایگاه قطع گردید';
      if (d.chatComposer) d.chatComposer.classList.add('input-locked-cyber');
      if (d.msgInput) {
        d.msgInput.disabled = true;
        d.msgInput.placeholder = '🔒 دسترسی مسدود است — کانال توسط مزداک توقیف گردید';
      }

      // Dynamic student names list
      const namesList = this.assistants.map(a => a.student_name).filter(Boolean).join('، ') || 'کارآگاهان پایگاه';

      let mazdakHtml = '';

      // Message 1 (Sec 84)
      if (sec >= 84) {
        mazdakHtml += `
          <div class="message-bubble hacker mazdak-chat-msg" data-message-id="mazdak-1">
            <div class="message-sender" style="color: #ef4444; font-weight: 800; margin-bottom: 6px;">
              <span class="mazdak-badge">⚡ مــزداک // نفوذ مرکزی</span>
              <span>فرماندهی شبکه قطع شد</span>
            </div>
            <div class="message-content" style="font-size: 14px; line-height: 1.7;">«${namesList}»... صدای من رو واضح می‌شنوید؟</div>
            <div class="message-footer-row" style="margin-top: 6px; font-size: 11px; color: #94a3b8;">
              <span class="message-time">۱۰:۲۱</span>
            </div>
          </div>
        `;
        if (sec === 84 && sec !== this.lastSecond) this.playAudioFile('tick');
      }

      // Message 2 (Sec 94)
      if (sec >= 94) {
        mazdakHtml += `
          <div class="message-bubble hacker mazdak-chat-msg" data-message-id="mazdak-2">
            <div class="message-sender" style="color: #ef4444; font-weight: 800; margin-bottom: 6px;">
              <span class="mazdak-badge">⚡ مــزداک // نفوذ مرکزی</span>
              <span>دسترسی مستقیم</span>
            </div>
            <div class="message-content" style="font-size: 14px; line-height: 1.7;">فکر کردید کارآگاه‌بازی‌های شما توی دهکده از چشم من پنهان می‌مونه؟ تمام اسناد میز شواهدتون، دسترسی ترمینال و ارتباطتون با مرکز حالا توی مشت منه.</div>
            <div class="message-footer-row" style="margin-top: 6px; font-size: 11px; color: #94a3b8;">
              <span class="message-time">۱۰:۲۲</span>
            </div>
          </div>
        `;
        if (sec === 94 && sec !== this.lastSecond) this.playAudioFile('tick');
      }

      // Message 3 (Sec 106)
      if (sec >= 106) {
        mazdakHtml += `
          <div class="message-bubble hacker mazdak-chat-msg" data-message-id="mazdak-3">
            <div class="message-sender" style="color: #ef4444; font-weight: 800; margin-bottom: 6px;">
              <span class="mazdak-badge">⚡ مــزداک // نفوذ مرکزی</span>
              <span>کنترل کامل سامانه</span>
            </div>
            <div class="message-content" style="font-size: 14px; line-height: 1.7;">دیگه منتظر جواب مرکز نباشید. از این لحظه به بعد، ارتباط مستقیم شما با مرکز فرماندهی قطع شد و پایگاه سقوط کرد...</div>
            <div class="message-footer-row" style="margin-top: 6px; font-size: 11px; color: #94a3b8;">
              <span class="message-time">۱۰:۲۳</span>
            </div>
          </div>
        `;
        if (sec === 106 && sec !== this.lastSecond) this.playAudioFile('tick');
      }

      if (d.mazdakStreamTarget) {
        d.mazdakStreamTarget.innerHTML = mazdakHtml;
      }
      if (d.messagesBox) {
        d.messagesBox.scrollTop = d.messagesBox.scrollHeight;
      }

      // Typing Indicator
      if ((sec >= 82 && sec < 84) || (sec >= 88 && sec < 94) || (sec >= 100 && sec < 106)) {
        if (d.typingIndicator) {
          d.typingIndicator.style.display = 'flex';
          d.typingIndicator.className = 'typing-line mazdak-typing-line';
          d.typingIndicator.innerHTML = `
            <span class="mazdak-pulse-dot"></span>
            <span>مزداک در حال نفوذ به کانال و مخابره فرکانس خصمانه است...</span>
          `;
        }
      } else {
        if (d.typingIndicator) d.typingIndicator.style.display = 'none';
      }
    }

    // ------------------------------------------------------------------
    // Phase 6: Ejection Modal (Second 120 / End of Hack)
    // ------------------------------------------------------------------
    if (sec >= 120) {
      if (sec === 120 && sec !== this.lastSecond) {
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

    // 15 seconds countdown to automatic ejection
    let countdownSec = 15;
    const countdownEl = document.getElementById('ejectionCountdownText');
    if (countdownEl) {
      countdownEl.textContent = `خروج و انتقال خودکار تا ${countdownSec} ثانیه دیگر...`;
    }

    if (this.ejectionCountdownInterval) clearInterval(this.ejectionCountdownInterval);
    this.ejectionCountdownInterval = setInterval(() => {
      countdownSec--;
      if (countdownEl) {
        countdownEl.textContent = `خروج و انتقال خودکار تا ${countdownSec} ثانیه دیگر...`;
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
