/**
 * AKBARI CYBER BREACH MASTER ENGINE (v4.0 AAA CINEMATIC EDITION)
 * Choreography, True Root-Portaled FLIP Mechanical Elevation, Audio Engine & Chat Hijack
 * Specifically configured for Class 14: Akbari, Vahedi, Entezami (Codes: 681352 / 113919)
 */

'use strict';

class AkbariMasterBreachEngine {
  constructor() {
    this.duration = 120; // 2 minutes choreography
    this.currentSecond = 0;
    this.isPlaying = false;
    this.playbackTimer = null;
    this.soundEnabled = true;
    this.audioInitialized = false;
    this.isElevated = false;
    this.lastSecond = -1;

    // Web Audio Synthesizer Nodes
    this.audioCtx = null;
    this.droneGain = null;
    this.droneOsc1 = null;
    this.droneOsc2 = null;

    // Real HTML5 Audio Files from /public/assets/sounds/
    this.sfx = {
      intro: new Audio('/assets/sounds/cyber-intro.wav'),
      alarm: new Audio('/assets/sounds/tactical-alarm.wav'),
      scan: new Audio('/assets/sounds/tactical-scan.wav'),
      tick: new Audio('/assets/sounds/clock-tick.wav')
    };

    // Configure SFX Volumes
    this.sfx.intro.volume = 0.85;
    this.sfx.alarm.volume = 0.65;
    this.sfx.scan.volume = 0.75;
    this.sfx.tick.volume = 0.35;

    // Cache DOM Elements
    this.dom = {};
  }

  init() {
    this.cacheDom();
    this.bindEvents();
    this.buildSegmentedProgressBar();
    this.initLiveChatExperience();
    this.renderFrame(0, true);
    console.log('[AkbariBreachEngine] Initialized AAA Engine v4.0 successfully.');
  }

  cacheDom() {
    const d = this.dom;
    // Director HUD
    d.hudScrubber = document.getElementById('hud-scrubber');
    d.hudPlayToggle = document.getElementById('hud-play-toggle');
    d.hudPlayIcon = document.getElementById('hud-play-icon');
    d.hudPlayLabel = document.getElementById('hud-play-label');
    d.hudTimeDisplay = document.getElementById('hud-time-display');
    d.hudSoundToggle = document.getElementById('hud-sound-toggle');
    d.hudPills = document.querySelectorAll('.hud-pill');

    // Backdrop Dimmer
    d.dimmer = document.getElementById('terminal-backdrop-dimmer');

    // Security Terminal
    d.terminal = document.getElementById('security-terminal');
    d.ghostSlot = document.getElementById('terminal-ghost-slot');
    d.terminalTitle = document.getElementById('terminal-title');
    d.terminalStatus = document.getElementById('terminal-status-text');
    d.terminalLogs = document.getElementById('live-terminal-content');
    d.terminalSubline = document.getElementById('terminal-subline');
    d.termCursor = document.getElementById('term-cursor');

    // Segmented Progress Bar
    d.overrideBox = document.getElementById('terminal-override-box');
    d.overridePercent = document.getElementById('override-percent-num');
    d.segmentedBar = document.getElementById('override-segmented-bar');
    d.overrideVector = document.getElementById('override-vector-status');

    // Evidence Board
    d.evidenceBoard = document.getElementById('evidence-board');
    d.evidenceCount = document.getElementById('evidence-count');
    d.boardHealth = document.getElementById('board-health-tag');
    d.boardStreamText = document.getElementById('board-stream-text');
    d.cards = [
      document.getElementById('card-1'),
      document.getElementById('card-2'),
      document.getElementById('card-3'),
      document.getElementById('card-4')
    ];
    d.threads = [
      document.getElementById('thread-1-2'),
      document.getElementById('thread-2-3'),
      document.getElementById('thread-3-4'),
      document.getElementById('thread-1-4')
    ];

    // Assistants Trio (Class 14)
    d.astFrames = [
      document.getElementById('ast-frame-1'),
      document.getElementById('ast-frame-2'),
      document.getElementById('ast-frame-3')
    ];
    d.astNames = [
      document.getElementById('ast-name-1'),
      document.getElementById('ast-name-2'),
      document.getElementById('ast-name-3')
    ];
    d.astLiveDot = document.getElementById('assistants-live-dot');

    // 3D Vault Card
    d.vaultCard = document.getElementById('quad-vault-card');
    d.vaultStatusTag = document.getElementById('vault-status-tag');
    d.vaultStatusLabel = document.getElementById('vault-status-label');

    // Field Chat & Live Messaging
    d.chatSection = document.getElementById('field-chat-section');
    d.chatHeader = document.getElementById('chat-header');
    d.neonClock = document.getElementById('neon-digital-clock');
    d.channelNotice = document.getElementById('channel-notice');
    d.channelNoticeText = document.getElementById('channel-notice-text');
    d.chatStatusText = document.getElementById('chat-status-text');
    d.chatStatusIndicator = document.getElementById('chat-status-indicator');
    d.messagesBox = document.getElementById('messages-box');
    d.chatComposer = document.getElementById('message-form') || document.getElementById('chat-composer');
    d.replyBar = document.getElementById('user-reply-preview-bar');
    d.replyTitle = document.getElementById('user-reply-preview-title');
    d.replySnippet = document.getElementById('user-reply-preview-snippet');
    d.replyAccent = document.getElementById('user-reply-accent');
    d.cancelReplyBtn = document.getElementById('cancel-reply-btn');
    d.fileInput = document.getElementById('user-file-input');
    d.attachBtn = document.getElementById('user-attach-btn') || document.getElementById('attach-btn');
    d.msgInput = document.getElementById('msg-input');
    d.sendBtn = document.getElementById('user-send-btn') || document.getElementById('send-btn');
    d.composerHint = document.getElementById('composer-hint');
    d.mazdakTypingNotice = document.getElementById('typing-indicator') || document.getElementById('mazdak-typing-notice');
    d.mazdakStreamTarget = document.getElementById('mazdak-stream-target');
  }

  bindEvents() {
    // Play/Pause Toggle
    this.dom.hudPlayToggle?.addEventListener('click', () => {
      this.initAudio();
      this.togglePlay();
    });

    // Timeline Scrubber Input
    this.dom.hudScrubber?.addEventListener('input', (e) => {
      this.initAudio();
      const sec = parseInt(e.target.value, 10);
      this.seek(sec);
    });

    // Sound Toggle
    this.dom.hudSoundToggle?.addEventListener('click', () => {
      this.initAudio();
      this.setSound(!this.soundEnabled);
    });

    // Window Resize Handler for FLIP Alignment
    window.addEventListener('resize', () => {
      if (this.isElevated) {
        this.alignElevatedTerminal();
      }
    });

    // Unlock Audio on First Click Anywhere
    const unlockHandler = () => {
      this.initAudio();
      document.removeEventListener('click', unlockHandler);
      document.removeEventListener('keydown', unlockHandler);
    };
    document.addEventListener('click', unlockHandler);
    document.addEventListener('keydown', unlockHandler);
  }

  buildSegmentedProgressBar() {
    if (!this.dom.segmentedBar) return;
    this.dom.segmentedBar.innerHTML = '';
    // Create 20 LED cells
    for (let i = 0; i < 20; i++) {
      const cell = document.createElement('div');
      cell.className = 'segment-cell';
      cell.id = `segment-cell-${i}`;
      this.dom.segmentedBar.appendChild(cell);
    }
  }

  updateSegmentedBar(percent) {
    const totalCells = 20;
    const activeCount = Math.round((percent / 100) * totalCells);
    for (let i = 0; i < totalCells; i++) {
      const cell = document.getElementById(`segment-cell-${i}`);
      if (!cell) continue;
      if (i < activeCount) {
        if (percent >= 75) {
          cell.className = 'segment-cell active-red';
        } else {
          cell.className = 'segment-cell active-cyan';
        }
      } else {
        cell.className = 'segment-cell';
      }
    }
    if (this.dom.overridePercent) {
      this.dom.overridePercent.textContent = `${percent}%`;
      this.dom.overridePercent.style.color = percent >= 75 ? '#ff003c' : '#00f0ff';
    }
  }

  /* ==========================================================================
     LIVE CHAT EXPERIENCE (شبیه‌ساز تعاملی و ۱:۱ چت زنده سامانه chat.html)
     ========================================================================== */
  initLiveChatExperience() {
    const d = this.dom;
    this.activeReplyData = null;

    // Start Live Clock
    const updateNeonClock = () => {
      if (!d.neonClock) return;
      if (this.currentSecond >= 82) {
        d.neonClock.style.color = '#ff003c';
        d.neonClock.style.textShadow = '0 0 10px #ff003c, 0 0 20px #ff003c';
      } else {
        d.neonClock.style.color = '#38bdf8';
        d.neonClock.style.textShadow = '0 0 6px rgba(56, 189, 248, 0.85), 0 0 14px rgba(56, 189, 248, 0.55)';
      }
      const now = new Date();
      const timeStr = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      d.neonClock.textContent = timeStr;
    };
    updateNeonClock();
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.clockInterval = setInterval(updateNeonClock, 1000);

    // Staging Replies via Click on Reply buttons
    d.messagesBox?.addEventListener('click', (e) => {
      const replyBtn = e.target.closest('[data-action="reply"]');
      if (replyBtn) {
        e.preventDefault();
        const id = replyBtn.dataset.id;
        const sender = replyBtn.dataset.sender || 'مرکز فرماندهی';
        const type = replyBtn.dataset.type || 'admin';
        const msgEl = replyBtn.closest('.message-bubble');
        const content = msgEl?.querySelector('.message-content')?.textContent?.trim() || 'متن پیام مرجع';
        this.stageReply({ id, sender, type, content });
        return;
      }

      // Evidence alert card click
      const alertCard = e.target.closest('.evidence-alert-card');
      if (alertCard) {
        const firstCard = document.getElementById('card-1');
        if (firstCard) {
          firstCard.style.outline = '3px solid #ff003c';
          firstCard.style.boxShadow = '0 0 20px #ff003c';
          firstCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          setTimeout(() => {
            firstCard.style.outline = '';
            firstCard.style.boxShadow = '';
          }, 1400);
        }
      }
    });

    // Cancel reply preview button
    d.cancelReplyBtn?.addEventListener('click', () => {
      this.cancelReply();
    });

    // File Input change for photo attachments
    d.fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          this.appendUserMessage({
            type: 'image',
            imageUrl: loadEvt.target.result,
            caption: `مدرک ارسالی امیرعلی اکبری: ${file.name}`,
            reply: this.activeReplyData ? { ...this.activeReplyData } : null
          });
          this.cancelReply();
        };
        reader.readAsDataURL(file);
      }
    });

    // Attach button triggers file input
    d.attachBtn?.addEventListener('click', () => {
      d.fileInput?.click();
    });

    // Form Submission for sending messages
    d.chatComposer?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleUserSend();
    });

    // Textarea Enter key handler
    d.msgInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleUserSend();
      } else if (e.key === 'Escape' && this.activeReplyData) {
        this.cancelReply();
      }
    });
  }

  stageReply(data) {
    this.activeReplyData = data;
    const d = this.dom;
    if (d.replyBar && d.replyTitle && d.replySnippet) {
      d.replyBar.hidden = false;
      d.replyTitle.textContent = `پاسخ به ${data.sender}`;
      d.replySnippet.textContent = data.content.length > 70 ? data.content.slice(0, 67) + '…' : data.content;
      if (d.replyAccent) {
        d.replyAccent.className = `reply-preview-bar-accent ${data.type}`;
      }
      d.msgInput?.focus();
    }
  }

  cancelReply() {
    this.activeReplyData = null;
    if (this.dom.replyBar) {
      this.dom.replyBar.hidden = true;
    }
  }

  handleUserSend() {
    const d = this.dom;
    if (!d.msgInput || d.msgInput.disabled) return;
    const text = d.msgInput.value.trim();
    if (!text) return;

    this.appendUserMessage({
      type: 'text',
      text: text,
      reply: this.activeReplyData ? { ...this.activeReplyData } : null
    });

    d.msgInput.value = '';
    d.msgInput.rows = 1;
    this.cancelReply();
  }

  appendUserMessage({ type, text, imageUrl, caption, reply }) {
    const d = this.dom;
    if (!d.messagesBox) return;

    const timeFormatted = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const newId = Date.now();

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble user';
    bubble.dataset.messageId = newId;

    let replyMarkup = '';
    if (reply) {
      replyMarkup = `
        <div class="message-reply-quote" data-target-id="${reply.id}" role="button" tabindex="0" title="پرش به پیام اصلی">
          <div class="reply-quote-bar ${reply.type || 'admin'}"></div>
          <div class="reply-quote-inner">
            <div class="reply-quote-author">
              <span class="reply-icon" aria-hidden="true">↩</span>
              <span class="reply-name">${reply.sender}</span>
            </div>
            <div class="reply-quote-snippet">${reply.content}</div>
          </div>
        </div>
      `;
    }

    let bodyMarkup = '';
    if (type === 'image') {
      bubble.classList.add('has-user-media');
      bodyMarkup = `
        <div class="user-chat-media-box" title="کلیک برای بزرگ‌نمایی تصویر">
          <img src="${imageUrl}" alt="مدرک ارسالی" class="user-chat-image" loading="lazy">
        </div>
        ${caption ? `<div class="user-chat-caption">${caption}</div>` : ''}
      `;
    } else {
      bodyMarkup = `<div class="message-content">${text}</div>`;
    }

    const actionsMarkup = `
      <div class="user-msg-actions">
        <button type="button" class="user-msg-action-btn reply" data-action="reply" data-id="${newId}" data-sender="امیرعلی اکبری" data-type="user" title="پاسخ به این پیام">↩️ <span>پاسخ</span></button>
        <button type="button" class="user-msg-action-btn delete" onclick="this.closest('.message-bubble').remove()" title="حذف پیام">🗑️ <span>حذف</span></button>
      </div>
    `;

    bubble.innerHTML = `
      ${replyMarkup}
      ${bodyMarkup}
      <div class="message-footer-row">
        ${actionsMarkup}
        <span class="message-time">${timeFormatted}</span>
      </div>
    `;

    // Insert before mazdak target if it exists, otherwise append
    if (d.mazdakStreamTarget && d.mazdakStreamTarget.parentNode === d.messagesBox) {
      d.messagesBox.insertBefore(bubble, d.mazdakStreamTarget);
    } else {
      d.messagesBox.appendChild(bubble);
    }

    d.messagesBox.scrollTop = d.messagesBox.scrollHeight;
  }

  /* ==========================================================================
     AUDIO SYNTHESIZER & REAL ASSET INTEGRATION
     ========================================================================== */
  initAudio() {
    if (this.audioInitialized) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
      }
      Object.values(this.sfx).forEach(snd => {
        snd.load();
      });
      this.audioInitialized = true;
      console.log('[AkbariBreachEngine] AudioContext & SFX Unlocked.');
    } catch (e) {
      console.warn('[AkbariBreachEngine] Audio init error:', e);
    }
  }

  setSound(enabled) {
    this.soundEnabled = enabled;
    if (this.dom.hudSoundToggle) {
      this.dom.hudSoundToggle.textContent = enabled ? '🔊 صدا: فعال' : '🔇 صدا: قطع';
      this.dom.hudSoundToggle.style.color = enabled ? '#00f0ff' : '#94a3b8';
    }
    if (!enabled) {
      this.stopAmbientDrone();
      Object.values(this.sfx).forEach(snd => {
        snd.pause();
        snd.currentTime = 0;
      });
    }
  }

  playAudioFile(key) {
    if (!this.soundEnabled || !this.audioInitialized) return;
    const snd = this.sfx[key];
    if (snd) {
      try {
        snd.currentTime = 0;
        snd.play().catch(() => {});
      } catch (_) {}
    }
  }

  startAmbientDrone() {
    if (!this.soundEnabled || !this.audioCtx || this.droneGain) return;
    try {
      const ctx = this.audioCtx;
      this.droneGain = ctx.createGain();
      this.droneGain.gain.setValueAtTime(0, ctx.currentTime);
      this.droneGain.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 1.5);

      this.droneOsc1 = ctx.createOscillator();
      this.droneOsc1.type = 'sawtooth';
      this.droneOsc1.frequency.setValueAtTime(48, ctx.currentTime);

      this.droneOsc2 = ctx.createOscillator();
      this.droneOsc2.type = 'sine';
      this.droneOsc2.frequency.setValueAtTime(52, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 240;

      this.droneOsc1.connect(filter);
      this.droneOsc2.connect(filter);
      filter.connect(this.droneGain);
      this.droneGain.connect(ctx.destination);

      this.droneOsc1.start();
      this.droneOsc2.start();
    } catch (_) {}
  }

  stopAmbientDrone() {
    if (!this.droneGain || !this.audioCtx) return;
    try {
      const ctx = this.audioCtx;
      this.droneGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      setTimeout(() => {
        try {
          this.droneOsc1?.stop();
          this.droneOsc2?.stop();
          this.droneOsc1?.disconnect();
          this.droneOsc2?.disconnect();
          this.droneGain?.disconnect();
        } catch (_) {}
        this.droneGain = null;
      }, 550);
    } catch (_) {
      this.droneGain = null;
    }
  }

  playErrorBlip() {
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(840, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (_) {}
  }

  playLiftoffSound() {
    this.playAudioFile('intro');
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(70, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.85);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.85);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.85);
    } catch (_) {}
  }

  playDockSound() {
    this.playAudioFile('scan');
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.28);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } catch (_) {}
  }

  playMazdakChime() {
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      const ctx = this.audioCtx;
      const notes = [440, 311.13, 220]; // Sinister diminished tritone
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.14);
        gain.gain.setValueAtTime(0.06, ctx.currentTime + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.14 + 0.65);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.14);
        osc.stop(ctx.currentTime + idx * 0.14 + 0.65);
      });
    } catch (_) {}
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
    if (this.isElevated) return;
    this.isElevated = true;

    const term = this.dom.terminal;
    const ghost = this.dom.ghostSlot;
    const dimmer = this.dom.dimmer;

    dimmer?.classList.add('is-active');
    ghost?.classList.add('is-active');

    // Calculate initial bounding box before detaching
    const firstRect = term.getBoundingClientRect();
    const targetW = Math.min(880, window.innerWidth * 0.94);
    const targetH = Math.min(500, window.innerHeight * 0.80);
    const targetL = (window.innerWidth - targetW) / 2;
    const targetT = (window.innerHeight - targetH) / 2;

    // Portal terminal directly into document.body to break free from any ancestor z-index/overflow stacking context!
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

    // Step 1: Lock to initial slot bounding box
    term.classList.add('is-elevated');
    term.style.position = 'fixed';
    term.style.left = `${firstRect.left}px`;
    term.style.top = `${firstRect.top}px`;
    term.style.width = `${firstRect.width}px`;
    term.style.height = `${firstRect.height}px`;
    term.style.zIndex = '99999';
    term.style.transform = 'none';
    term.style.transition = 'none';

    // Step 2: Force layout repaint
    void term.offsetHeight;

    // Step 3: Fly smoothly to center with high-tech ease
    term.style.transition = 'all 0.75s cubic-bezier(0.16, 1, 0.3, 1)';
    term.style.left = `${targetL}px`;
    term.style.top = `${targetT}px`;
    term.style.width = `${targetW}px`;
    term.style.height = `${targetH}px`;
    term.style.transform = 'scale(1.02)';
  }

  dockTerminal(instant = false) {
    if (!this.isElevated && this.dom.terminal.parentNode !== document.body) return;
    this.isElevated = false;

    const term = this.dom.terminal;
    const ghost = this.dom.ghostSlot;
    const dimmer = this.dom.dimmer;

    dimmer?.classList.remove('is-active');

    const restoreToGrid = () => {
      if (ghost && ghost.parentNode && term.parentNode === document.body) {
        ghost.parentNode.insertBefore(term, ghost);
      }
      ghost?.classList.remove('is-active');
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
    };

    if (instant || !ghost) {
      restoreToGrid();
      return;
    }

    // FLIP animate back to ghost slot position
    const ghostRect = ghost.getBoundingClientRect();
    term.style.transition = 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)';
    term.style.left = `${ghostRect.left}px`;
    term.style.top = `${ghostRect.top}px`;
    term.style.width = `${ghostRect.width}px`;
    term.style.height = `${ghostRect.height}px`;
    term.style.transform = 'none';

    setTimeout(() => {
      if (!this.isElevated) {
        restoreToGrid();
      }
    }, 710);
  }

  /* ==========================================================================
     TIMELINE PLAYBACK CONTROLS
     ========================================================================= */
  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    this.isPlaying = true;
    if (this.dom.hudPlayIcon) this.dom.hudPlayIcon.textContent = '⏸';
    if (this.dom.hudPlayLabel) this.dom.hudPlayLabel.textContent = 'توقف';

    if (this.currentSecond >= this.duration) {
      this.currentSecond = 0;
    }

    this.playbackTimer = setInterval(() => {
      this.currentSecond++;
      if (this.currentSecond > this.duration) {
        this.pause();
        return;
      }
      this.renderFrame(this.currentSecond);
    }, 1000);
  }

  pause() {
    this.isPlaying = false;
    if (this.dom.hudPlayIcon) this.dom.hudPlayIcon.textContent = '▶';
    if (this.dom.hudPlayLabel) this.dom.hudPlayLabel.textContent = 'پخش خودکار';
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  seek(sec) {
    this.currentSecond = Math.max(0, Math.min(this.duration, sec));
    this.renderFrame(this.currentSecond, true);
  }

  reset() {
    this.pause();
    this.seek(0);
  }

  /* ==========================================================================
     IDEMPOTENT FRAME RENDERER (CORE CHOREOGRAPHY)
     ========================================================================== */
  renderFrame(sec, instant = false) {
    const d = this.dom;

    // 1. Sync Scrubber & Time Display
    if (d.hudScrubber) d.hudScrubber.value = sec;
    if (d.hudTimeDisplay) {
      const mm = String(Math.floor(sec / 60)).padStart(2, '0');
      const ss = String(sec % 60).padStart(2, '0');
      d.hudTimeDisplay.textContent = `${mm}:${ss} / 02:00`;
    }

    // 2. Highlight Active Phase Pill in HUD
    const pills = d.hudPills;
    if (pills && pills.length) {
      pills.forEach(p => p.classList.remove('active'));
      if (sec < 18) pills[0]?.classList.add('active');
      else if (sec < 38) pills[1]?.classList.add('active');
      else if (sec < 54) pills[2]?.classList.add('active');
      else if (sec < 58) pills[3]?.classList.add('active');
      else if (sec < 80) pills[4]?.classList.add('active');
      else if (sec < 84) pills[5]?.classList.add('active');
      else pills[6]?.classList.add('active');
    }

    // ------------------------------------------------------------------
    // فاز ۰: حالت عادی، آرامش و تحقیق کلاسه ۱۴ (۰ تا ۱۷ ثانیه)
    // ------------------------------------------------------------------
    if (sec < 18) {
      this.stopAmbientDrone();
      if (this.isElevated || d.terminal.parentNode === document.body) {
        this.dockTerminal(true);
      }

      // ریست وضعیت ترمینال
      d.terminal.classList.remove('is-elevated', 'pre-liftoff-lock', 'is-docked-corrupted');
      d.terminalTitle.textContent = 'N-LOG // SECURE TERMINAL';
      d.terminalStatus.textContent = 'LIVE';
      d.terminalStatus.style.color = '#38bdf8';
      d.terminalSubline.textContent = 'STREAM: ACTIVE';
      d.termCursor.textContent = '■ RUNNING';
      d.termCursor.style.color = '#38bdf8';
      d.overrideBox.style.display = 'none';

      d.terminalLogs.innerHTML = `
        <div>> [SYS_INIT] NODE_14: AKBARI_SESSION_READY</div>
        <div>> [AUTH_PASS] CHAT_CODE: 681352 VERIFIED</div>
        <div>> [MONITOR] EVIDENCE_STREAM: 4 NODES SYNCED</div>
        <div>> [INFO] ENCRYPTION_LAYER: AES-256 ACTIVE</div>
      `;

      // ریست پرتره بچه‌ها
      d.astFrames.forEach(f => f?.classList.remove('is-corrupted-portrait'));
      if (d.astNames[0]) d.astNames[0].textContent = 'امیرعلی اکبری';
      if (d.astNames[1]) d.astNames[1].textContent = 'یاسین واحدی';
      if (d.astNames[2]) d.astNames[2].textContent = 'محمد انتظامی';
      d.astNames.forEach(n => n?.classList.remove('corrupted-nameplate'));
      if (d.astLiveDot) d.astLiveDot.style.background = '#10b981';

      // ریست میز شواهد
      d.cards.forEach(c => c?.classList.remove('card-blackout'));
      d.threads.forEach(t => t?.classList.remove('thread-blackout', 'electric-arc'));
      if (d.evidenceCount) d.evidenceCount.textContent = '۴ مدرک کشف‌شده';
      if (d.boardHealth) {
        d.boardHealth.textContent = 'INTEGRITY 100%';
        d.boardHealth.className = 'technical';
      }
      if (d.boardStreamText) {
        d.boardStreamText.textContent = 'اتصال یکپارچه شواهد با نخ‌های قرمز بررسی';
      }

      // ریست گاوصندوق فولادی
      d.vaultCard?.classList.remove('vault-tamper-lockdown');
      if (d.vaultStatusLabel) d.vaultStatusLabel.textContent = 'قفل هیدرولیک امن';

      // ریست چت
      d.chatSection?.classList.remove('is-channel-hijacked');
      if (d.chatStatusText) d.chatStatusText.textContent = 'برخط';
      if (d.chatStatusIndicator) d.chatStatusIndicator.className = 'status-indicator online';
      if (d.channelNoticeText) d.channelNoticeText.textContent = 'گزارش‌ها، کشفیات و گفتگوهای زنده تیم کارآگاهی';
      d.chatComposer?.classList.remove('input-locked-cyber');
      if (d.msgInput) {
        d.msgInput.disabled = false;
        d.msgInput.placeholder = 'گزارش یا سرنخ خود را به مرکز فرماندهی مخابره کنید…';
      }
      if (d.neonClock) {
        d.neonClock.style.color = '#38bdf8';
        d.neonClock.style.textShadow = '0 0 6px rgba(56, 189, 248, 0.85), 0 0 14px rgba(56, 189, 248, 0.55)';
      }
      if (d.mazdakTypingNotice) d.mazdakTypingNotice.style.display = 'none';
      if (d.mazdakStreamTarget) d.mazdakStreamTarget.innerHTML = '';
    }

    // ------------------------------------------------------------------
    // فاز ۱: آغاز هک و بارش ارورهای قرمز روی ترمینال (۱۸ تا ۳۷ ثانیه)
    // ------------------------------------------------------------------
    if (sec >= 18 && sec < 38) {
      this.startAmbientDrone();
      if (this.isElevated || d.terminal.parentNode === document.body) {
        this.dockTerminal(true);
      }

      if (sec === 18 && sec !== this.lastSecond) {
        this.playAudioFile('alarm');
      }

      d.terminal.classList.remove('is-elevated', 'pre-liftoff-lock', 'is-docked-corrupted');
      d.terminalTitle.textContent = 'N-LOG // [BREACH DETECTED]';
      d.terminalStatus.textContent = 'ALERT';
      d.terminalStatus.style.color = '#ff003c';
      d.terminalSubline.textContent = 'PORT_8088: COMPROMISED';
      d.termCursor.textContent = '⚠ INTRUSION';
      d.termCursor.style.color = '#ff003c';
      d.overrideBox.style.display = 'none';

      let lines = `
        <div class="term-breach-line"><span>> [ALERT] UNEXPECTED PACKET BURST ON PORT 8088</span> <span class="term-tag-warn">WARN</span></div>
      `;
      if (sec >= 22) {
        lines += `<div class="term-breach-line"><span>> [WARN] KERNEL TRAP: UNAUTHORIZED RING-0 PROBE</span> <span class="term-tag-warn">TRAP</span></div>`;
      }
      if (sec >= 26) {
        lines += `<div class="term-breach-line"><span>> [ALERT] FORGED CERTIFICATE DETECTED: APT-MAZDAK</span> <span class="term-tag-crit">ROUGE</span></div>`;
      }
      if (sec >= 31) {
        lines += `<div class="term-breach-line"><span>> [AUTH_FAIL] SESSION GUARD REJECTED ON NODE 14</span> <span class="term-tag-crit">BYPASS</span></div>`;
      }
      if (sec >= 35) {
        lines += `<div class="term-breach-line"><span>> [FIREWALL] TAMPER ATTEMPT: LAYERS 1-3 COLLAPSED</span> <span class="term-tag-crit">FAIL</span></div>`;
      }
      d.terminalLogs.innerHTML = lines;

      if (sec !== this.lastSecond && sec >= 22) {
        this.playErrorBlip();
      }
    }

    // ------------------------------------------------------------------
    // فاز ۲: تخریب شواهد، گلیچ کروماتیک چهره‌ها و قفل گاوصندوق (۳۸ تا ۵۳ ثانیه)
    // ------------------------------------------------------------------
    if (sec >= 38) {
      if (sec < 58 && (this.isElevated || d.terminal.parentNode === document.body)) {
        this.dockTerminal(true);
      }

      // مخدوش شدن پرتره بچه‌ها
      d.astFrames.forEach(f => f?.classList.add('is-corrupted-portrait'));
      if (d.astNames[0]) d.astNames[0].textContent = 'ERR_0x41 [اکبری] // MASKED';
      if (d.astNames[1]) d.astNames[1].textContent = 'ERR_0x56 [واحدی] // SEVERED';
      if (d.astNames[2]) d.astNames[2].textContent = 'ERR_0x45 [انتظامی] // HALT';
      d.astNames.forEach(n => n?.classList.add('corrupted-nameplate'));
      if (d.astLiveDot) d.astLiveDot.style.background = '#ff003c';

      // انحلال دیجیتال کارت‌های مدارک و جرقه الکتریکی نخ‌ها
      d.cards.forEach(c => c?.classList.add('card-blackout'));
      d.threads.forEach(t => {
        t?.classList.remove('thread-blackout');
        t?.classList.add('electric-arc');
      });
      if (d.evidenceCount) d.evidenceCount.textContent = '۰ مدرک در دسترس (سیگنال مفقود)';
      if (d.boardHealth) {
        d.boardHealth.textContent = 'CRITICAL FAILURE 0% // BREACHED';
        d.boardHealth.className = 'technical board-health-compromised';
      }
      if (d.boardStreamText) {
        d.boardStreamText.textContent = '⚠ اتصال شواهد گسسته شد — کانال‌های اطلاعاتی تحت کنترل مزداک است';
      }

      // وضعیت هشدار گاوصندوق فولادی
      d.vaultCard?.classList.add('vault-tamper-lockdown');
      if (d.vaultStatusLabel) d.vaultStatusLabel.textContent = 'هشدار نفوذ: قفل کامل زبانه';

      if (sec === 38 && sec !== this.lastSecond) {
        this.playAudioFile('scan');
      }
    }

    // ------------------------------------------------------------------
    // فاز ۳-الف: قفل رتیکل قبل از صعود (۵۴ تا ۵۷ ثانیه)
    // ------------------------------------------------------------------
    if (sec >= 54 && sec < 58) {
      if (this.isElevated || d.terminal.parentNode === document.body) {
        this.dockTerminal(true);
      }
      d.terminal.classList.add('pre-liftoff-lock');
      d.terminalTitle.textContent = '⚡ RETICLE LOCK // INITIATING ELEVATION';
      d.terminalStatus.textContent = 'LOCKED';
      d.terminalStatus.style.color = '#ff003c';

      if (sec === 54 && sec !== this.lastSecond) {
        this.playAudioFile('scan');
      }
    } else if (sec < 58) {
      d.terminal.classList.remove('pre-liftoff-lock');
    }

    // ------------------------------------------------------------------
    // فاز ۳-ب: صعود فیزیکی مکانیکی ترمینال به مرکز و پیشرفت ۰٪ تا ۱۰۰٪ (۵۸ تا ۷۹ ثانیه)
    // ------------------------------------------------------------------
    if (sec >= 58 && sec < 80) {
      d.terminal.classList.remove('pre-liftoff-lock');
      d.overrideBox.style.display = 'block';

      if (!this.isElevated) {
        this.elevateTerminal(instant);
        this.playLiftoffSound();
      }

      // محاسبه درصد پیشرفت در ۲۱ ثانیه (۵۸ تا ۷۹)
      const progressRatio = Math.min(1, Math.max(0, (sec - 58) / 21));
      const percent = Math.round(progressRatio * 100);

      this.updateSegmentedBar(percent);

      d.terminalTitle.textContent = `⚡ TERMINAL TAKEOVER // تسخیر هسته کلاسه ۱۴`;
      d.terminalStatus.textContent = `${percent}%`;
      d.terminalStatus.style.color = percent >= 75 ? '#ff003c' : '#00f0ff';
      d.terminalSubline.textContent = 'PHYSICAL_NODE: ELEVATED';

      // لاگ‌های زنده نفوذ هدفمند به کلاسه ۱۴
      let matrixLogs = `
        <div class="term-breach-line"><span>> [TARGET] NODE_14: AKBARI / VAHIDI / ENTEZAMI</span> <span class="term-tag-crit">LOCKED</span></div>
        <div class="term-breach-line"><span>> [CRYPTO] HARVESTING CHAT CODE: 681352</span> <span class="term-tag-crit">CAPTURED</span></div>
      `;
      if (percent >= 25) {
        matrixLogs += `<div class="term-breach-line"><span>> [BYPASS] REPLACING SESSION INTEGRITY KEY WITH MAZDAK_SIG</span> <span class="term-tag-warn">OVERRIDE</span></div>`;
      }
      if (percent >= 50) {
        matrixLogs += `<div class="term-breach-line"><span>> [HIJACK] INJECTING ROGUE SOCKET DISPATCHER PID: 9942</span> <span class="term-tag-crit">INJECTED</span></div>`;
      }
      if (percent >= 75) {
        matrixLogs += `<div class="term-breach-line"><span>> [ENCLAVE] SEIZING ROOT SECURITY CONTROLS... 89%</span> <span class="term-tag-warn">CRACKING</span></div>`;
      }
      if (percent >= 95) {
        matrixLogs += `<div class="term-breach-line"><span>> [COMPLETE] 100% TAKEOVER: NODE 14 COMPLETELY SUBJUGATED!</span> <span class="term-tag-crit">MAZDAK</span></div>`;
      }
      d.terminalLogs.innerHTML = matrixLogs;

      if (sec !== this.lastSecond && sec % 3 === 0) {
        this.playErrorBlip();
      }
    }

    // ------------------------------------------------------------------
    // فاز ۴: بازگشت نرم، قفل مکانیکی و نشستن ترمینال در اسلات خود (۸۰ ثانیه به بعد)
    // ------------------------------------------------------------------
    if (sec >= 80) {
      if (this.isElevated) {
        this.dockTerminal(instant);
        this.playDockSound();
      }

      d.overrideBox.style.display = 'none';
      d.terminalTitle.textContent = 'TAKEN OVER // تحت کنترل مزداک';
      d.terminalStatus.textContent = 'MAZDAK';
      d.terminalStatus.style.color = '#ff003c';
      d.terminalSubline.textContent = 'STATUS: LOCKED_BY_MAZDAK';
      d.termCursor.textContent = '🔒 TAKEN';
      d.termCursor.style.color = '#ff003c';

      d.terminalLogs.innerHTML = `
        <div class="term-breach-line"><span>> [DOCK_COMPLETE] TERMINAL RETURNED TO CHASSIS</span> <span class="term-tag-crit">LOCKED</span></div>
        <div class="term-breach-line"><span>> [DAEMON_ACTIVE] MAZDAK BROADCAST CHANNEL OPEN</span> <span class="term-tag-warn">BROADCAST</span></div>
        <div class="term-breach-line"><span>> [STUDENTS_BLOCKED] PERMISSIONS REVOKED</span> <span class="term-tag-crit">REVOKED</span></div>
      `;
    }

    // ------------------------------------------------------------------
    // فاز ۵: تسخیر زنده چت و ارسال پیام‌های مخوف مزداک (۸۲ ثانیه به بعد)
    // ------------------------------------------------------------------
    if (sec >= 82) {
      d.chatSection?.classList.add('is-channel-hijacked');
      if (d.chatStatusText) d.chatStatusText.textContent = 'نفوذیافته';
      if (d.chatStatusIndicator) d.chatStatusIndicator.className = 'status-indicator offline';
      if (d.channelNoticeText) d.channelNoticeText.textContent = '⚠️ هشدار امنیتی: فرکانس ناشناس شناسایی شد — ارتباط پایگاه قطع گردید';
      d.chatComposer?.classList.add('input-locked-cyber');
      if (d.msgInput) {
        d.msgInput.disabled = true;
        d.msgInput.placeholder = '🔒 دسترسی مسدود است — کانال توسط مزداک توقیف گردید';
      }

      let mazdakHtml = '';

      // پیام ۱ مزداک (۸۴ ثانیه)
      if (sec >= 84) {
        mazdakHtml += `
          <div class="message-bubble hacker mazdak-chat-msg" data-message-id="mazdak-1">
            <div class="message-sender" style="color: #ef4444;">
              <span class="mazdak-badge">⚡ مــزداک // نفوذ مرکزی</span>
              <span>فرماندهی شبکه قطع شد</span>
            </div>
            <div class="message-content">امیرعلی اکبری، یاسین واحدی و محمد انتظامی (تیم کلاسه ۱۴)... صدای من رو واضح می‌شنوید؟</div>
            <div class="message-footer-row">
              <span class="message-time">۱۰:۲۱</span>
            </div>
          </div>
        `;
        if (sec === 84 && sec !== this.lastSecond) {
          this.playMazdakChime();
        }
      }

      // پیام ۲ مزداک (۹۴ ثانیه)
      if (sec >= 94) {
        mazdakHtml += `
          <div class="message-bubble hacker mazdak-chat-msg" data-message-id="mazdak-2">
            <div class="message-sender" style="color: #ef4444;">
              <span class="mazdak-badge">⚡ مــزداک // نفوذ مرکزی</span>
              <span>دسترسی مستقیم</span>
            </div>
            <div class="message-content">فکر کردید کارآگاه‌بازی‌های شما توی دهکده از چشم من پنهان می‌مونه؟ تمام اسناد میز شواهدتون، دسترسی ترمینال و ارتباطتون با مرکز حالا توی مشت منه.</div>
            <div class="message-footer-row">
              <span class="message-time">۱۰:۲۲</span>
            </div>
          </div>
        `;
        if (sec === 94 && sec !== this.lastSecond) {
          this.playMazdakChime();
        }
      }

      // پیام ۳ مزداک (۱۰۶ ثانیه)
      if (sec >= 106) {
        mazdakHtml += `
          <div class="message-bubble hacker mazdak-chat-msg" data-message-id="mazdak-3">
            <div class="message-sender" style="color: #ef4444;">
              <span class="mazdak-badge">⚡ مــزداک // نفوذ مرکزی</span>
              <span>کنترل کامل سامانه</span>
            </div>
            <div class="message-content">دیگه منتظر جواب مرکز نباشید. از این لحظه به بعد، پیام‌هاتون اول به من می‌رسه. بازی تازه شروع شده...</div>
            <div class="message-footer-row">
              <span class="message-time">۱۰:۲۳</span>
            </div>
          </div>
        `;
        if (sec === 106 && sec !== this.lastSecond) {
          this.playMazdakChime();
        }
      }

      d.mazdakStreamTarget.innerHTML = mazdakHtml;
      if (d.messagesBox) {
        d.messagesBox.scrollTop = d.messagesBox.scrollHeight;
      }

      // اعلان تایپینگ بین فواصل پیام‌ها
      if ((sec >= 82 && sec < 84) || (sec >= 88 && sec < 94) || (sec >= 100 && sec < 106)) {
        if (d.mazdakTypingNotice) {
          d.mazdakTypingNotice.style.display = 'flex';
          d.mazdakTypingNotice.className = 'typing-line mazdak-typing-line';
          d.mazdakTypingNotice.innerHTML = `
            <span class="mazdak-pulse-dot"></span>
            <span>مزداک در حال نفوذ به کانال و مخابره فرکانس خصمانه است...</span>
          `;
        }
      } else {
        if (d.mazdakTypingNotice) d.mazdakTypingNotice.style.display = 'none';
      }
    }

    this.lastSecond = sec;
  }
}

// Instantiate engine when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.masterBreach = new AkbariMasterBreachEngine();
  window.masterBreach.init();
});
