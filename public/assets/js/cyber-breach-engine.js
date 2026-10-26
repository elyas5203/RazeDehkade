
// ============================================================================
// دیالوگ‌های سناریوی نفوذ سایبری مزداک (پشتیبانی از سناریوی ارتقایافته روانی و سناریوی قبلی)
// قابلیت برگشت آنی با تنظیم window.CYBER_SCENARIO_VERSION = 'v1' یا افزودن ?scenario=v1
// ============================================================================
const CYBER_SCENARIOS = {
  v2_psychological: {
    det1: 'بچه‌ها، اگر پیام من را می‌بینید فعلاً چیزی نفرستید. از چند لحظه پیش بسته‌های ارتباطی تکراری شده و یک نفر دارد خودش را جای شما جا می‌زند.',
    detPre2: 'فقط یک سؤال کوتاه: فیلم دهکده چهارم کامل پخش شد یا وسطش قطع شد؟ هیچ کد و رمزی ننویسید؛ فقط وضعیت تصویر را بگویید.',
    kids1: 'تصویر چند بار پرید ولی فیلم را دیدیم. کدهای چهار دهکده، ۹۲۷۳، ۴۶۹۱، ۶۷۱۸، ۱۱۶۳، روی صفحه بود. الان یک هشدار می‌گوید برای نجات پرونده باید رمز گاوصندوق را وارد کنیم. این هشدار از طرف شماست؟',
    detProbe1: 'نه. من هیچ هشدار تازه‌ای نفرستادم. دست‌ها را از صفحه‌کلید بردارید. دارم امضای پیام را با کانال کلاس تطبیق می‌دهم.',
    kids2: 'ولی شمارش معکوس افتاده و پوشه‌های مدارک یکی‌یکی قرمز می‌شوند. اگر رمز را نزنیم همه‌چیز پاک نمی‌شود؟',
    det2: 'این شمارش معکوس جعلی است. سامانهٔ ما برای پرونده زمان انقضا ندارد. هشدار Man-In-The-Middle روشن شده؛ کسی بین ما نشسته و جواب‌ها را عوض می‌کند.',
    kids3: 'پس الان چه کار کنیم؟ صفحه اجازه خروج نمی‌دهد و نشانگر تایپ خودش حرکت می‌کند.',
    detWarning: 'به هیچ دکمه‌ای دست نزنید. من کانال پشتیبان را باز می‌کنم. برای اطمینان، اسم نشانه‌ای را که اول پرونده بین خودمان قرار گذاشتیم نگویید؛ فقط یادتان نگه دارید.',
    kids4: 'کارآگاه، وقت نداریم. رمز را همین‌جا بفرستید؛ خودمان سریع وارد می‌کنیم و بعد از سایت خارج می‌شویم.',
    det3: 'همین جمله کافی بود. بچه‌های من هرگز در خط ناامن رمز درخواست نمی‌کنند. تو حتی قرارِ نشانهٔ لیلیوم را هم نمی‌دانی. مزداک، صدای بچه‌ها را رها کن.',
    mazdak1: 'بالاخره فهمیدی. چند دقیقه است از صفحه و نام خودشان با تو حرف می‌زنم. کافی بود یک بار عجله کنی و کلید آخر را بدهی.',
    detChallenge: 'کلید را نمی‌گیری. بچه‌ها، اگر هنوز پیام اصلی من را می‌بینید، به صفحه اعتماد نکنید و سرنخ‌های داخل پروندهٔ فیزیکی را کنار خودتان نگه دارید.',
    mazdak2: 'فکر می‌کنی چند تکه کاغذ نجاتشان می‌دهد؟ من مسیر ورود، چت و مدارک روی صفحه را گرفته‌ام.',
    det4: 'اتفاقاً همان سرنخ‌های واقعی چیزی است که تو به آن دسترسی نداری. بچه‌ها، ارتباط را قطع کنید و جداگانه وارد احراز هویت شوید؛ پاسخ‌ها را از روی حافظه و پروندهٔ همراهتان بدهید.',
    mazdakFinal: 'پایگاه را از شما گرفتم، اما ببینیم بیرون از این صفحه هم می‌توانید همدیگر را پیدا کنید. درگاه احراز هویت منتظرتان است.'
  },
  v1_legacy: {
    det1: 'بچه‌ها، پیام من می‌رسه؟ از چند لحظه پیش سیگنال‌های ناشناس روی خط افتاده. به هیچ درخواست تازه‌ای جواب ندید.',
    detPre2: 'آخرین فیلمی که از دهکده فرستادم به دستتون رسید؟ خط داره می‌پره. اگر صدام رو دارید، فقط بگید کجای پرونده بودیم.',
    kids1: 'صداتون میاد. فیلم آخر رو دیدیم. کدهایی که از دهکده‌ها درآوردیم هنوز پیشمونه... شما به سرنخ تازه‌ای رسیدید؟',
    det2: 'نه هنوز. الان اول باید خط رو نگه داریم؛ چند تا پیام هم‌زمان از طرف شما می‌بینم. کدها رو اینجا ننویسید.',
    detProbe1: 'فعلاً هیچ‌کس چیزی تایپ نکنه. دارم مسیر پیام‌ها رو بررسی می‌کنم.',
    kids2: 'باشه. فقط برای اینکه مطمئن بشیم مسیر رو درست رفتیم، اون کد گاوصندوق رو شما کجا نگه می‌دارید؟',
    kids3: 'اگه کد پیش شماست همین‌جا بفرستید. بعدش می‌تونیم مدارک رو کنار هم بذاریم.',
    detWarning: 'این درخواست از سمت کلاس نیست. کانال رو باز نگه دارید و هیچ رمزی نفرستید.',
    kids4: 'وقت نداریم کارآگاه؛ کد رو بفرستید تا پرونده نپره.',
    det3: 'نه. بچه‌ها هیچ‌وقت کدها رو توی خط ناپایدار نمی‌فرستن. تو از اول دنبال کد گاوصندوق بودی. کاسه‌ای زیر نیم‌کاسه‌ست؛ نشانه لیلیوم رو فراموش کردی! مزداک، از خط بچه‌ها برو بیرون.',
    mazdak1: 'دیر فهمیدی کارآگاه. این چند دقیقه از خط خودشون بهت پیام می‌دادم. حالا نوبت منه که پرونده رو ببندم.',
    detChallenge: 'بچه‌ها به صفحه اعتماد نکنید. سرنخ‌های واقعی رو کنار خودتون نگه دارید.',
    mazdak2: 'من همه مسیرهای این پایگاه رو گرفتم. چیزی براتون نمونده.',
    det4: 'بچه‌ها، اگر صدای من رو دارید فوراً خودتون رو به یک جای امن برسونید. هر کدوم جداگانه به سؤال‌های احراز هویت جواب بدید. این پیام رو تا آخر بخونید؛ تیم امنیتی داره دسترسی‌ها رو می‌بنده.',
    mazdakFinal: 'اتصال شما دیگه دست خودتون نیست. ببینم بیرون از این پایگاه چقدر از پرونده یادتون مونده.'
  }
};
/**
 * CYBER BREACH ENGINE (v4.0 Cinematic Masterpiece - 2026)
 * Complete Orchestration:
 * - 7-Second Blackout Curtain (#cyber-blackout-curtain)
 * - Ambient Dark Red Glitch Overhaul (.system-compromised-red)
 * - Persistent Mazdak Watermark Background (#messages-box.mazdak-bg)
 * - Ghost Character-by-Character Typing in Student Composer (#msg-input)
 * - Natural Multi-Turn Detective & Spoofed Kids Chat Battle
 * - FLIP Mechanical Terminal Elevation & Docking from true DOM slot
 * - Procedural Web Audio Dynamic Siren Synthesizer with automatic reading ducking
 * - Full compliance with MASTER-12, MASTER-13, and MASTER-15 test suites
 */

'use strict';

class BreachSirenSynthesizer {
  constructor() {
    this.ctx = null;
    this.osc1 = null;
    this.osc2 = null;
    this.lfo = null;
    this.lfoGain = null;
    this.masterGain = null;
    this.isPlaying = false;
    this.isMuted = false;
    this.baseVolume = 0.18;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();
    } catch (_) {}
  }

  start() {
    if (this.isPlaying) return;
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    try {
      const t = this.ctx.currentTime;
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.0001, t);
      this.masterGain.gain.linearRampToValueAtTime(this.baseVolume, t + 2.0);
      this.masterGain.connect(this.ctx.destination);

      // اصلی: موج Sawtooth نرم‌شده برای حس آژیر تاکتیکی
      this.osc1 = this.ctx.createOscillator();
      this.osc1.type = 'sawtooth';
      this.osc1.frequency.setValueAtTime(540, t);

      // فیلتر پایین‌گذر برای حذف خشونت فرکانس‌های بالا
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1350;

      // ساب‌اوسیلاتور بم برای سنگینی و ابهت صدا
      this.osc2 = this.ctx.createOscillator();
      this.osc2.type = 'sine';
      this.osc2.frequency.setValueAtTime(270, t);

      // نوسان‌ساز دوره‌ای (LFO) با دوره حدود ۲.۲ ثانیه برای چرخش صدای آژیر
      this.lfo = this.ctx.createOscillator();
      this.lfo.type = 'triangle';
      this.lfo.frequency.setValueAtTime(0.45, t);

      this.lfoGain = this.ctx.createGain();
      this.lfoGain.gain.setValueAtTime(130, t);

      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.osc1.frequency);

      const lfoSubGain = this.ctx.createGain();
      lfoSubGain.gain.setValueAtTime(65, t);
      this.lfo.connect(lfoSubGain);
      lfoSubGain.connect(this.osc2.frequency);

      this.osc1.connect(filter);
      filter.connect(this.masterGain);
      this.osc2.connect(this.masterGain);

      this.osc1.start(t);
      this.osc2.start(t);
      this.lfo.start(t);
      this.isPlaying = true;
    } catch (e) {
      console.warn('Audio Siren note:', e);
    }
  }

  setVolume(vol, rampTime = 0.8) {
    if (!this.masterGain || !this.ctx || !this.isPlaying) return;
    try {
      const t = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(t);
      this.masterGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : vol, t + rampTime);
    } catch (_) {}
  }

  duck() {
    // هنگام بالا آمدن ترمینال یا خواندن متن، صدا بسیار نرم و کم می‌شود
    this.setVolume(0.04, 1.2);
  }

  swell() {
    // اوج گرفتن هیجان در پایان یا آغاز صحنه
    this.setVolume(0.20, 1.5);
  }

  stop() {
    if (!this.isPlaying) return;
    try {
      if (this.masterGain && this.ctx) {
        const t = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(t);
        this.masterGain.gain.linearRampToValueAtTime(0.0001, t + 0.8);
      }
      setTimeout(() => {
        try {
          this.osc1?.stop();
          this.osc2?.stop();
          this.lfo?.stop();
          this.osc1?.disconnect();
          this.osc2?.disconnect();
          this.lfo?.disconnect();
          this.masterGain?.disconnect();
        } catch (_) {}
        this.isPlaying = false;
      }, 900);
    } catch (_) {}
  }
}

class CyberBreachEngine {
  constructor() {
    this.duration = 185; // کل زمان سکانس سینمایی طبق MASTER-15
    this.currentSecond = 0;
    this.isPlaying = false;
    this.playbackTimer = null;
    this.isElevated = false;
    this.lastSecond = -1;
    this.assistants = [];
    this.sessionData = null;
    this.originalTerminalRect = null;
    this.ghostSlot = null;

    this.siren = new BreachSirenSynthesizer();
    this.dom = {};
    this.ejectionCountdownInterval = null;

    // ره‌گیری یکتا برای جلوگیری از پرش و افزودن تکراری در فریم‌ها
    this.deliveredBattleMessages = new Set();
    this.deliveredTerminalErrors = new Set();
    this.deliveredTerminalThreats = new Set();
    this.sceneGeneration = 0;
    this.ghostTypingTimer = null;
    this.sampleVoices = new Set();
    this.audioUnlocked = false;
    this.actCueTimer = null;
  }

  init() {
    this.cacheDom();
    this.ensureBlackoutCurtain();
    this.ensureBackdropAndGhostSlot();
    this.ensureEjectionModal();
    this.ensureCinematicHud();

    window.addEventListener('resize', () => {
      if (this.isElevated) {
        this.alignElevatedTerminal();
      }
    });

    const unlockHandler = () => {
      this.siren.init();
      this.audioUnlocked = true;
      document.removeEventListener('click', unlockHandler);
      document.removeEventListener('keydown', unlockHandler);
      document.removeEventListener('touchstart', unlockHandler);
    };
    document.addEventListener('click', unlockHandler);
    document.addEventListener('keydown', unlockHandler);
    document.addEventListener('touchstart', unlockHandler);

    console.log('[CyberBreachEngine] Initialized Cinematic v4.0 Engine.');
  }

  ensureCinematicHud() {
    let hud = document.getElementById('breach-cinematic-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'breach-cinematic-hud';
      hud.setAttribute('aria-hidden', 'true');
      hud.innerHTML = `
        <div class="breach-letterbox breach-letterbox--top"></div>
        <div class="breach-letterbox breach-letterbox--bottom"></div>
        <div class="breach-hud-edge breach-hud-edge--top"></div>
        <div class="breach-hud-edge breach-hud-edge--bottom"></div>
        <div class="breach-corner breach-corner--tl"></div>
        <div class="breach-corner breach-corner--tr"></div>
        <div class="breach-corner breach-corner--bl"></div>
        <div class="breach-corner breach-corner--br"></div>
        <div class="breach-threat-panel">
          <span class="breach-threat-kicker">UNAUTHORIZED ROOT SIGNAL</span>
          <strong id="breachThreatLabel">اختلال در کانال امن</strong>
          <div class="breach-threat-meter"><i id="breachThreatMeter"></i></div>
        </div>
        <!-- breach-reticle permanently removed per user request: rotating square with red dot hidden -->
        <div class="breach-reticle" style="display: none !important;" aria-hidden="true"></div>
        <div class="breach-wave" aria-hidden="true">${'<i></i>'.repeat(24)}</div>
        <div class="breach-data-shards" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
        <div class="breach-pulse-ring" aria-hidden="true"></div>
        <div class="breach-act-card" id="breachActCard" aria-live="polite">
          <span id="breachActNumber">ACT 01 / 05</span>
          <strong id="breachActTitle">قطع ارتباط</strong>
          <small id="breachActSubtitle">مرکز فرماندهی از شبکه خارج شد</small>
        </div>
        <div class="breach-timecode" aria-hidden="true"><b>REC</b><span id="breachTimecode">00:00:00</span><i>MAZDAK // LIVE INTRUSION</i></div>
        <div class="breach-hud-caption" id="breachHudCaption">کانال فرماندهی در حال پایش است</div>`;
      document.body.appendChild(hud);
    }
    this.dom.cinematicHud = hud;
    this.dom.threatLabel = hud.querySelector('#breachThreatLabel');
    this.dom.threatMeter = hud.querySelector('#breachThreatMeter');
    this.dom.hudCaption = hud.querySelector('#breachHudCaption');
    this.dom.actCard = hud.querySelector('#breachActCard');
    this.dom.actNumber = hud.querySelector('#breachActNumber');
    this.dom.actTitle = hud.querySelector('#breachActTitle');
    this.dom.actSubtitle = hud.querySelector('#breachActSubtitle');
    this.dom.timecode = hud.querySelector('#breachTimecode');
  }

  playSample(name, volume = 0.55, playbackRate = 1) {
    if (!this.audioUnlocked) return;
    try {
      const audio = new Audio(`/assets/sounds/${name}`);
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.playbackRate = playbackRate;
      this.sampleVoices.add(audio);
      const cleanup = () => this.sampleVoices.delete(audio);
      audio.addEventListener('ended', cleanup, { once: true });
      audio.addEventListener('error', cleanup, { once: true });
      audio.play().catch(cleanup);
    } catch (_) {}
  }

  stopSamples() {
    this.sampleVoices.forEach(audio => {
      try { audio.pause(); audio.currentTime = 0; } catch (_) {}
    });
    this.sampleVoices.clear();
  }

  setCinematicPhase(phase, label, progress, caption = '') {
    const hud = this.dom.cinematicHud;
    if (!hud) return;
    hud.dataset.phase = phase;
    if (this.dom.threatLabel) this.dom.threatLabel.textContent = label;
    if (this.dom.threatMeter) this.dom.threatMeter.style.transform = `scaleX(${Math.max(0, Math.min(1, progress))})`;
    if (this.dom.hudCaption && caption) this.dom.hudCaption.textContent = caption;
  }

  cueAct(number, title, subtitle, intensity = 'hard') {
    const hud = this.dom.cinematicHud;
    const card = this.dom.actCard;
    if (!hud || !card) return;
    if (this.actCueTimer) clearTimeout(this.actCueTimer);
    if (this.dom.actNumber) this.dom.actNumber.textContent = `ACT ${String(number).padStart(2, '0')} / 05`;
    if (this.dom.actTitle) this.dom.actTitle.textContent = title;
    if (this.dom.actSubtitle) this.dom.actSubtitle.textContent = subtitle;
    card.classList.remove('is-visible');
    hud.classList.remove('act-impact');
    void card.offsetWidth;
    card.classList.add('is-visible');
    hud.classList.add('act-impact');
    this.impact(intensity);
    this.actCueTimer = setTimeout(() => {
      card.classList.remove('is-visible');
      hud.classList.remove('act-impact');
    }, 3200);
  }

  updateCinematicTimecode(sec) {
    if (!this.dom.timecode) return;
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    const frames = (sec * 24) % 24;
    this.dom.timecode.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  }

  impact(kind = 'medium') {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.body.classList.remove('breach-impact-soft', 'breach-impact-hard');
    void document.body.offsetWidth;
    document.body.classList.add(kind === 'hard' ? 'breach-impact-hard' : 'breach-impact-soft');
    setTimeout(() => document.body.classList.remove('breach-impact-soft', 'breach-impact-hard'), kind === 'hard' ? 620 : 340);
  }

  cacheDom() {
    const d = this.dom;
    d.terminal = document.getElementById('security-terminal') || document.querySelector('.security-terminal');
    d.terminalTitle = document.getElementById('terminal-title');
    d.terminalStatus = document.getElementById('terminal-status-text');
    d.terminalLogs = document.getElementById('live-terminal-content');
    d.evidenceBoard = document.getElementById('evidence-board') || document.querySelector('.evidence-board');
    d.evidenceCount = document.getElementById('evidence-count');
    d.evidenceGrid = document.getElementById('evidence-grid');
    d.messagesBox = document.getElementById('messages-box');
    d.chatComposer = document.getElementById('message-form');
    d.msgInput = document.getElementById('msg-input');
    d.typingIndicator = document.getElementById('typing-indicator');
  }

  ensureBlackoutCurtain() {
    if (document.getElementById('cyber-blackout-curtain')) {
      this.dom.blackoutCurtain = document.getElementById('cyber-blackout-curtain');
      return;
    }
    const curtain = document.createElement('div');
    curtain.id = 'cyber-blackout-curtain';
    curtain.className = 'fade-out';
    curtain.innerHTML = `<div class="blackout-heartbeat-led" aria-hidden="true"></div>`;
    document.body.appendChild(curtain);
    this.dom.blackoutCurtain = curtain;
  }

  ensureBackdropAndGhostSlot() {
    if (!document.getElementById('terminal-backdrop-dimmer')) {
      const dimmer = document.createElement('div');
      dimmer.id = 'terminal-backdrop-dimmer';
      dimmer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(dimmer);
    }
    this.dom.dimmer = document.getElementById('terminal-backdrop-dimmer');

    if (!document.getElementById('terminal-ghost-slot') && this.dom.terminal && this.dom.terminal.parentNode) {
      const ghost = document.createElement('div');
      ghost.id = 'terminal-ghost-slot';
      ghost.className = 'terminal-slot-ghost quad-card';
      ghost.style.display = 'none';
      ghost.innerHTML = `
        <div class="ghost-slot-signal" aria-hidden="true"></div>
        <div class="ghost-slot-label">سیگنال قطع شد</div>
      `;
      this.dom.terminal.parentNode.insertBefore(ghost, this.dom.terminal);
      this.ghostSlot = ghost;
    } else {
      this.ghostSlot = document.getElementById('terminal-ghost-slot');
    }
    this.dom.ghostSlot = this.ghostSlot;
  }

  ensureEjectionModal() {
    if (document.getElementById('emergency-ejection-overlay')) {
      this.dom.ejectionOverlay = document.getElementById('emergency-ejection-overlay');
      return;
    }

    const isTestMode = window.location.search.includes('test=1') || Boolean(window.sessionData && window.sessionData.is_test);

    const overlay = document.createElement('div');
    overlay.id = 'emergency-ejection-overlay';
    overlay.className = 'emergency-ejection-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="emergency-ejection-modal">
        <div class="hazard-stripe-bar"></div>
        <div class="ejection-badge">
          <span>⚠️ هشدار فوق‌امنیتی // سقوط فایروال پایگاه دهکده</span>
        </div>
        <h2 class="ejection-title">نفوذ گسترده مزداک و قطع دسترسی چت</h2>
        <p class="ejection-body-text">
          کارآگاهان پایگاه! به علت نفوذ همه‌جانبه مزداک به سیستم دهکده در دامنه <strong>razedehkade.ir</strong>، دسترسی شما به مرکز فرماندهی و چت مسدود گردید.
          <br><br>
          ⚠️ <strong>دستور فوری مرکز فرماندهی:</strong> فوراً خودتون رو به یک جای امن برسونید و هر کدوم جداگانه به سوالات احراز هویت جواب بدید تا پرونده و مدارک دهکده نجات پیدا کنه.
        </p>
        <div class="ejection-actions" style="${isTestMode ? '' : 'display: none !important;'}">
          <button type="button" class="ejection-primary-btn" id="ejectionAuthBtn">
            ⚡ انتقال فوری به درگاه احراز هویت امنیتی اضطراری (حالت تست)
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.dom.ejectionOverlay = overlay;

    const authBtn = document.getElementById('ejectionAuthBtn');
    if (authBtn) {
      authBtn.addEventListener('click', () => {
        this.executeEjectionRedirect();
      });
    }
  }

  executeEjectionRedirect() {
    if (this.ejectionCountdownInterval) clearInterval(this.ejectionCountdownInterval);
    try {
      if (window.sessionData && window.sessionData.id) {
        localStorage.setItem(`session_hacked_${window.sessionData.id}`, '1');
      }
    } catch (_) {}
    window.location.href = '/emergency-auth.html';
  }

  lockChatInput() {
    const msgInput = this.dom.msgInput;
    if (msgInput) {
      msgInput.disabled = true;
      msgInput.setAttribute('readonly', 'true');
      msgInput.placeholder = 'دسترسی ارسال پیام به علت نفوذ امنیتی مسدود گردید...';
    }
    document.querySelectorAll('.composer-controls button, .composer-controls input, .composer-controls textarea').forEach(el => {
      if (el.id !== 'ejectionAuthBtn') {
        el.setAttribute('disabled', 'true');
        el.classList.add('is-locked-cyber-breach');
      }
    });
  }

  unlockChatInput() {
    const msgInput = this.dom.msgInput;
    if (msgInput) {
      msgInput.disabled = false;
      msgInput.removeAttribute('readonly');
      msgInput.placeholder = 'پیام خود را بنویسید...';
      msgInput.classList.remove('ghost-typing-active');
    }
    document.querySelectorAll('.is-locked-cyber-breach').forEach(el => {
      el.removeAttribute('disabled');
      el.classList.remove('is-locked-cyber-breach');
    });
  }

  // --- مدیریت پوشش و مهرهای تصاویر مزداک (MASTER-15) ---
  applyMazdakMediaStamps() {
    document.querySelectorAll('.evidence-card img').forEach(img => {
      img.classList.add('media-corrupted');
    });
    document.querySelectorAll('.evidence-card').forEach(card => {
      card.classList.add('card-blackout');
      if (!card.querySelector('.evidence-mazdak-glitch-cover')) {
        const cover = document.createElement('div');
        cover.className = 'evidence-mazdak-glitch-cover';
        cover.innerHTML = `<img src="/mazdak.jpg" alt="Mazdak" loading="eager"><div class="mazdak-corrupt-scanline"></div>`;
        card.appendChild(cover);
      }
    });

    // The evidence grid owns the full-board Mazdak background. Adding another
    // flex child here collapsed the grid and hid nearly all of the image.
  }

  removeMazdakMediaStamps() {
    document.querySelectorAll('.evidence-card img').forEach(img => {
      img.classList.remove('media-corrupted');
    });
    document.querySelectorAll('.evidence-card').forEach(card => {
      card.classList.remove('card-blackout');
    });
    document.querySelectorAll('.evidence-card .evidence-mazdak-glitch-cover').forEach(el => el.remove());
  }

  // --- افکت‌های صوتی ترکیبی وب‌آدیو (MASTER-13) ---
  playPneumaticBuildupSFX() {
    try {
      this.siren.init();
      const ctx = this.siren.ctx;
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(80, t);
      osc.frequency.exponentialRampToValueAtTime(320, t + 0.6);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.08, t + 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    } catch (_) {}
  }

  playHydraulicLaunchSFX() {
    this.playSample('cyber-launch.mp3', 0.72, 0.92);
    try {
      this.siren.init();
      const ctx = this.siren.ctx;
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.7);
      g.gain.setValueAtTime(0.09, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.75);
    } catch (_) {}
  }

  playGeigerTickSFX() {
    if (Math.random() > 0.68) this.playSample('cyber-click.mp3', 0.14, 0.88 + Math.random() * 0.24);
    try {
      this.siren.init();
      const ctx = this.siren.ctx;
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, t);
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    } catch (_) {}
  }

  playHydraulicSlamSFX() {
    this.playSample('cyber-slam.mp3', 0.82, 0.86);
    try {
      this.siren.init();
      const ctx = this.siren.ctx;
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.5);
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.6);
    } catch (_) {}
  }

  playElectricArcZap() {
    this.playSample('cyber-error.mp3', 0.54, 1.05);
    try {
      this.siren.init();
      const ctx = this.siren.ctx;
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(440, t + 0.05);
      g.gain.setValueAtTime(0.04, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    } catch (_) {}
  }

  triggerChassisLandingSlamVisuals() {
    document.body.classList.add('screen-intense-quake');
    setTimeout(() => {
      document.body.classList.remove('screen-intense-quake');
    }, 600);
    this.playHydraulicSlamSFX();
  }

  start(payload = {}) {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.sceneGeneration++;
    this.currentSecond = 0;
    this.lastSecond = -1;
    this.deliveredBattleMessages.clear();
    this.deliveredTerminalErrors.clear();
    this.deliveredTerminalThreats.clear();
    this.ensureCinematicHud();
    this.setCinematicPhase('power-loss', 'افت توان در مرکز فرماندهی', 0.06, 'CARRIER SIGNAL LOST // تلاش برای حفظ کانال');
    this.dom.cinematicHud?.classList.add('active');
    this.cueAct(1, 'قطع ارتباط', 'مرکز فرماندهی از شبکه خارج شد', 'hard');
    this.playSample('cyber-intro.wav', 0.38, 1);
    this.impact('hard');

    if (window.liveTerminal && typeof window.liveTerminal.stop === 'function') {
      window.liveTerminal.stop();
    }
    if (this.dom.terminalLogs) {
      this.dom.terminalLogs.innerHTML = '';
    }

    this.lockChatInput();

    // ۱. بلافاصله پرده سیاه مطلق ۷ ثانیه‌ای روی کل صفحه ظاهر می‌شود
    this.triggerInitialBlackout();

    this.playbackTimer = setInterval(() => {
      this.currentSecond++;
      this.renderFrame(this.currentSecond);
      if (this.currentSecond >= this.duration) {
        clearInterval(this.playbackTimer);
      }
    }, 1000);
  }

  triggerInitialBlackout() {
    this.ensureBlackoutCurtain();
    const generation = this.sceneGeneration;
    const curtain = this.dom.blackoutCurtain;
    if (curtain) {
      curtain.classList.remove('fade-out');
      curtain.style.display = 'flex';
      curtain.style.opacity = '1';
      curtain.dataset.stage = 'power-loss';
      curtain.innerHTML = `
        <div class="blackout-power-grid" aria-hidden="true"></div>
        <div class="blackout-heartbeat-led" aria-hidden="true"></div>
        <div class="blackout-status-stack">
          <em>ACT 01 / 05</em>
          <span>فرماندهی مرکزی</span>
          <strong>سیگنال حامل قطع شد</strong>
          <small id="blackoutHandshake">HANDSHAKE 01/08 — NO RESPONSE</small>
        </div>`;
    }

    let handshake = 1;
    const handshakeTimer = setInterval(() => {
      if (!this.isPlaying || generation !== this.sceneGeneration || handshake >= 8) return clearInterval(handshakeTimer);
      handshake++;
      const line = document.getElementById('blackoutHandshake');
      if (line) line.textContent = `HANDSHAKE ${String(handshake).padStart(2, '0')}/08 — ${handshake < 8 ? 'NO RESPONSE' : 'ROOT SIGNATURE DETECTED'}`;
      this.playSample('cyber-click.mp3', 0.12, 0.75 + handshake * 0.035);
    }, 720);

    // دقیقاً پس از ۷ ثانیه پرده سیاه کنار می‌رود و هاله قرمز و نویز پدیدار می‌شود
    setTimeout(() => {
      if (!this.isPlaying || generation !== this.sceneGeneration) return;
      if (curtain) {
        curtain.classList.add('fade-out');
        setTimeout(() => {
          if (curtain) curtain.style.display = 'none';
        }, 800);
      }
      this.applyRedCompromisedOverlay();
      this.setCinematicPhase('breach', 'امضای ناشناس در سطح ریشه', 0.32, 'ROOT SIGNATURE MATCH // MAZDAK NODE');
      this.impact('hard');
    }, 7000);
  }

  applyRedCompromisedOverlay() {
    document.body.classList.add('system-compromised-red', 'cyber-breach-active');

    // تصویر مزداک به عنوان بک‌گراند پایدار و مات بخش چت قرار می‌گیرد
    if (this.dom.messagesBox) {
      this.dom.messagesBox.classList.add('mazdak-bg');
    }

    this.applyMazdakMediaStamps();

    if (this.dom.evidenceCount) {
      this.dom.evidenceCount.textContent = '۰ مدرک در دسترس (سیگنال مفقود)';
    }

    // شروع آژیر نرم با Web Audio سینث‌سایزر
    this.siren.start();
    this.playSample('cyber-alarm.mp3', 0.48, 0.96);
  }

  simulateGhostTyping(text, onComplete) {
    const input = this.dom.msgInput;
    const form = this.dom.chatComposer;
    if (!input) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    const generation = this.sceneGeneration;
    if (this.ghostTypingTimer) clearTimeout(this.ghostTypingTimer);
    input.classList.add('ghost-typing-active');
    input.value = '';

    let index = 0;
    const typeNextChar = () => {
      if (!this.isPlaying || generation !== this.sceneGeneration) return;
      if (index < text.length) {
        input.value += text[index];
        index++;
        const delay = 35 + Math.floor(Math.sin(index) * 15 + 15);
        this.ghostTypingTimer = setTimeout(typeNextChar, delay);
      } else {
        this.ghostTypingTimer = setTimeout(() => {
          if (!this.isPlaying || generation !== this.sceneGeneration) return;
          const sendBtn = form ? form.querySelector('button[type="submit"], #send-btn, .send-button') : null;
          if (sendBtn) {
            sendBtn.classList.add('ghost-send-pulse');
            setTimeout(() => sendBtn.classList.remove('ghost-send-pulse'), 350);
          }
          input.value = '';
          input.classList.remove('ghost-typing-active');
          if (typeof onComplete === 'function') onComplete();
        }, 450);
      }
    };

    typeNextChar();
  }

  appendChatMessage({ id, senderType, senderName, content, extraClass = '' }) {
    if (this.deliveredBattleMessages.has(id)) return;
    this.deliveredBattleMessages.add(id);

    const box = this.dom.messagesBox;
    if (!box) return;

    const el = document.createElement('div');
    const kidsClass = senderType === 'user' ? 'kids-impersonated-msg' : '';
    el.className = `message-bubble ${senderType} fake-battle-msg ${kidsClass} ${extraClass}`.trim();
    el.dataset.fakeMsgId = id;

    const time = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    let senderMarkup = '';
    if (senderType === 'admin') {
      senderMarkup = `
        <div class="message-sender">
          <span>🎙️ مرکز فرماندهی</span>
        </div>
      `;
    } else if (senderType === 'hacker') {
      senderMarkup = `
        <div class="message-sender" style="color: #ef4444;">
          <span>☠️ مزداک</span>
        </div>
      `;
    } else {
      senderMarkup = `
        <div class="message-sender" style="color: #10b981;">
          <span>👤 دستیاران کارآگاه</span>
        </div>
      `;
    }

    el.innerHTML = `
      ${senderMarkup}
      <div class="message-content">${content}</div>
      <div class="message-footer-row">
        <span class="message-time">${time}</span>
      </div>
    `;

    box.appendChild(el);
    box.scrollTop = box.scrollHeight;

    // پخش زنده پیام‌ها به سوکت ادمین جهت مشاهده بلادرنگ در پنل مدیریت
    try {
      const sId = (window.sessionData && window.sessionData.id) || (window.currentSessionId);
      const sock = window.userSocket || window.socket;
      if (sock && sId) {
        sock.emit('hack_battle_broadcast', {
          sessionId: sId,
          message: {
            id: Date.now() + Math.floor(Math.random() * 1000),
            session_id: sId,
            sender_type: senderType,
            admin_sender_name: senderType === 'admin' ? 'مرکز فرماندهی' : (senderType === 'hacker' ? 'مزداک' : 'دستیاران کارآگاه'),
            content: content,
            created_at: new Date().toISOString()
          }
        });
      }
    } catch (_) {}
  }

  typewriterInTerminal(text, onComplete) {
    if (!this.dom.terminalLogs) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }
    const line = document.createElement('div');
    line.className = 'term-mazdak-threat-line typewriter-line';
    line.innerHTML = `<span class="term-system-corrupt-badge">مزداک / خط اشغال شد</span><span class="typewriter-text"></span><span class="typewriter-cursor">▌</span>`;
    this.dom.terminalLogs.appendChild(line);

    const textSpan = line.querySelector('.typewriter-text');
    let idx = 0;
    const generation = this.sceneGeneration;

    const typeNext = () => {
      if (!this.isPlaying || generation !== this.sceneGeneration) return;
      if (idx < text.length) {
        textSpan.textContent += text[idx];
        this.playGeigerTickSFX();
        idx++;
        setTimeout(typeNext, 45);
      } else {
        const cursor = line.querySelector('.typewriter-cursor');
        if (cursor) cursor.remove();
        if (typeof onComplete === 'function') onComplete();
      }
    };

    typeNext();
  }

  appendTerminalBilingualLine({ en, fa, level = 'info' }) {
    if (!this.dom.terminalLogs) return;
    const line = document.createElement('div');
    line.className = 'term-breach-bilingual-line';
    line.innerHTML = `
      <div class="term-breach-en-text" style="color: #f87171; font-family: monospace; font-size: 12px;">${en}</div>
      <div class="term-breach-fa-text" style="color: #ffffff; font-size: 13.5px; margin-top: 2px;">${fa}</div>
    `;
    this.dom.terminalLogs.appendChild(line);
    this.dom.terminalLogs.scrollTop = this.dom.terminalLogs.scrollHeight;
  }

  appendTerminalThreat(text) {
    if (!this.dom.terminalLogs) return;
    const line = document.createElement('div');
    line.className = 'term-mazdak-threat-line';
    line.innerHTML = `<span class="term-system-corrupt-badge" style="background:#ff003c; color:#fff; padding:2px 6px; border-radius:3px; font-size:11px; margin-left:6px;">هشدار نفوذ</span><span>${text}</span>`;
    this.dom.terminalLogs.appendChild(line);
    this.dom.terminalLogs.scrollTop = this.dom.terminalLogs.scrollHeight;
  }

  elevateTerminal() {
    const term = this.dom.terminal;
    if (!term || this.isElevated) return;
    this.isElevated = true;

    this.playPneumaticBuildupSFX();

    // ۱. دریافت مختصات دقیق فعلی ترمینال در صفحه قبل از حرکت
    const rect = term.getBoundingClientRect();
    this.originalTerminalRect = rect;

    // ۲. جایگذاری شبح (Ghost) با ابعاد دقیق تا ساختار ستون‌ها دست نخورد
    let ghost = this.dom.ghostSlot;
    if (!ghost && term.parentNode) {
      ghost = document.createElement('div');
      ghost.id = 'terminal-ghost-slot';
      ghost.className = 'terminal-slot-ghost quad-card';
      this.dom.ghostSlot = ghost;
      this.ghostSlot = ghost;
    }
    if (ghost && term.parentNode) {
      ghost.style.width = `${rect.width}px`;
      ghost.style.height = `${rect.height}px`;
      ghost.style.display = 'block';
      term.parentNode.insertBefore(ghost, term);
    }

    // پورت کردن به document.body طبق قرارداد FLIP
    document.body.appendChild(term);

    // ۳. پس‌زمینه نیمه‌تاریک
    const dimmer = this.dom.dimmer;
    if (dimmer) dimmer.classList.add('active');

    // ۴. کم کردن صدای آژیر (Ducking) تا متن‌ها خوانا باشند
    this.siren.duck();
    this.playHydraulicLaunchSFX();

    // ۵. قفل روی مختصات اولیه در موقعیت fixed
    term.classList.add('is-elevated');
    term.style.position = 'fixed';
    term.style.left = `${rect.left}px`;
    term.style.top = `${rect.top}px`;
    term.style.width = `${rect.width}px`;
    term.style.height = `${rect.height}px`;
    term.style.zIndex = '99999';
    term.style.margin = '0';
    term.style.transition = 'none';

    void term.offsetHeight; // Force reflow

    // ۶. صعود نرم به مرکز ویوپورت با منحنی فیزیکی ملایم
    this.alignElevatedTerminal();

    if (this.dom.terminalTitle) {
      this.dom.terminalTitle.textContent = 'خط ارتباطی اشغال شد';
    }
    if (this.dom.terminalStatus) {
      this.dom.terminalStatus.textContent = 'نفوذ فعال';
      this.dom.terminalStatus.style.color = '#ff003c';
    }
  }

  alignElevatedTerminal() {
    const term = this.dom.terminal;
    if (!term || !this.isElevated) return;
    const targetW = Math.min(window.innerWidth * 0.94, 800);
    const targetH = Math.min(window.innerHeight * 0.76, 510);
    const targetL = (window.innerWidth - targetW) / 2;
    const targetT = (window.innerHeight - targetH) / 2;

    term.style.transition = 'all 0.85s cubic-bezier(0.16, 1, 0.3, 1)';
    term.style.left = `${targetL}px`;
    term.style.top = `${targetT}px`;
    term.style.width = `${targetW}px`;
    term.style.height = `${targetH}px`;
  }

  restoreToGrid() {
    const term = this.dom.terminal;
    if (!term || !this.isElevated) return;
    this.isElevated = false;

    const ghost = this.dom.ghostSlot || this.ghostSlot;
    const dimmer = this.dom.dimmer;

    const targetRect = ghost ? ghost.getBoundingClientRect() : (this.originalTerminalRect || term.getBoundingClientRect());

    term.style.transition = 'all 0.65s cubic-bezier(0.2, 0.8, 0.2, 1)';
    term.style.left = `${targetRect.left}px`;
    term.style.top = `${targetRect.top}px`;
    term.style.width = `${targetRect.width}px`;
    term.style.height = `${targetRect.height}px`;

    setTimeout(() => {
      term.classList.remove('is-elevated');
      term.classList.remove('is-threat');
      term.style.position = '';
      term.style.left = '';
      term.style.top = '';
      term.style.width = '';
      term.style.height = '';
      term.style.zIndex = '';
      term.style.margin = '';
      term.style.transition = '';

      if (ghost && ghost.parentNode) {
        ghost.parentNode.insertBefore(term, ghost);
        ghost.style.display = 'none';
      }
      if (dimmer) dimmer.classList.remove('active');

      this.triggerChassisLandingSlamVisuals();

      // اوج گرفتن صدای آژیر پس از نشستن ترمینال
      this.siren.swell();
    }, 660);
  }

  dockTerminal() {
    this.restoreToGrid();
  }

  renderFrame(sec) {
    this.updateCinematicTimecode(sec);
    // -------------------------------------------------------------
    // ۱. بلافاصله پس از اتمام ۷ ثانیه پرده سیاه، ترمینال اوج می‌گیرد (ثانیه ۷)
    // -------------------------------------------------------------
    if (sec === 7) {
      this.cueAct(2, 'شکست پیرامونی', 'لایهٔ دفاعی پایگاه در حال فروپاشی است', 'hard');
      this.elevateTerminal();
    }

    // ۲. نمایش لاگ‌های شکست لایه‌های امنیتی در ترمینال بالاآمده (ثانیه‌های ۹ تا ۱۳)
    if (sec === 9) {
      this.setCinematicPhase('kernel', 'لایه کرنل شکسته شد', 0.46, 'KERNEL PANIC // ROOT CHANNEL OPEN');
      this.impact('soft');
      this.appendTerminalBilingualLine({
        en: '[KERNEL_PANIC] 0x80F2A4 // ROOT ACCESS BREACHED',
        fa: 'شکست لایه‌های امنیتی سرور مرکزی. دسترسی ریشه در کنترل نفوذگر.',
        level: 'crit'
      });
    }

    if (sec === 11) {
      this.setCinematicPhase('firewall', 'فایروال اصلی دور زده شد', 0.63, 'FIREWALL BYPASS // PORT COMPROMISED');
      this.playSample('cyber-error.mp3', 0.42, 0.9);
      this.appendTerminalBilingualLine({
        en: '[FIREWALL_BYPASS] PORT 8443 COMPROMISED // MAZDAK_NODE',
        fa: 'فایروال پایگاه دهکده دور زده شد. تزریق بسته‌های مخرب مزداک.',
        level: 'crit'
      });
    }

    if (sec === 13) {
      this.setCinematicPhase('takeover', 'کنترل نشست در حال تصاحب', 0.84, 'SESSION OVERRIDE // IDENTITY CHANNEL HIJACKED');
      this.impact('hard');
      this.appendTerminalBilingualLine({
        en: '[SESSION_OVERRIDE] CRYPTO SIGNATURE HIJACKED',
        fa: 'کلید رمزنگاری جلسات تصاحب گردید. نفوذ کامل به ورودی و خروجی‌ها.',
        level: 'crit'
      });
    }

    // ۳. گلیچ و پاک شدن ترمینال + تایپ حرف‌به‌حرف پیام مزداک با صدای کلیک (ثانیه ۱۴ و ۱۵)
    if (sec === 14) {
      this.playElectricArcZap();
      if (this.dom.terminalLogs) {
        this.dom.terminalLogs.innerHTML = '';
      }
      this.dom.terminal?.classList.add('is-threat');
    }

    if (sec === 15) {
      this.cueAct(3, 'تسخیر کانال', 'یک هویت ناشناس وارد خط ارتباطی شد', 'hard');
      this.setCinematicPhase('mazdak', 'مزداک وارد کانال شد', 1, 'UNKNOWN ACTOR ONLINE // DO NOT TRUST THE CHANNEL');
      this.typewriterInTerminal('تمام اطلاعات و کدهای شما رو گرفتم و نمی‌ذارم این پرونده رو حل کنید', () => {});
    }

    // دریافت سناریوی جاری (پیش‌فرض v2_psychological همراه با قابلیت بازگشت به v1_legacy)
    const isV1 = (typeof window !== 'undefined' && (window.CYBER_SCENARIO_VERSION === 'v1' || new URLSearchParams(window.location.search).get('scenario') === 'v1'));
    const scn = isV1 ? CYBER_SCENARIOS.v1_legacy : CYBER_SCENARIOS.v2_psychological;

    // ۴. قرار گرفتن دو پیام اول کارآگاه در بک‌گراند چت حین بالا بودن ترمینال (ثانیه‌های ۱۶ و ۱۹)
    if (sec === 16) {
      this.appendChatMessage({
        id: 'battle-det-1',
        senderType: 'admin',
        content: scn.det1
      });
    }

    if (sec === 19) {
      this.appendChatMessage({
        id: 'battle-det-pre-2',
        senderType: 'admin',
        content: scn.detPre2
      });
    }

    // ۵. بسته شدن و فرود ترمینال به جایگاه اصلی خود روی گرید (ثانیه ۲۴)
    if (sec === 24) {
      this.cueAct(4, 'جنگ روانی', 'پیام‌های پایگاه دیگر قابل اعتماد نیستند', 'soft');
      this.restoreToGrid();
      this.dom.cinematicHud?.classList.add('is-docked');
    }

    // ۶. نبرد گفت‌وگویی طبیعی و پیوسته؛ پیام‌های کوتاه با فاصلهٔ قابل خواندن
    // مزداک چند بار از composer خود دانش‌آموزان استفاده می‌کند تا جعل هویت محسوس باشد.
    if (sec === 28) {
      this.simulateGhostTyping(
        scn.kids1,
        () => {
          this.appendChatMessage({
            id: 'battle-kids-1',
            senderType: 'user',
            content: scn.kids1
          });
        }
      );
    }

    if (sec === 38) {
      this.appendChatMessage({
        id: 'battle-det-probe-1',
        senderType: 'admin',
        content: scn.detProbe1
      });
    }

    if (sec === 47) {
      this.simulateGhostTyping(
        scn.kids2,
        () => this.appendChatMessage({ id: 'battle-kids-2', senderType: 'user', content: scn.kids2 })
      );
    }

    if (sec === 58) {
      this.appendChatMessage({
        id: 'battle-det-2',
        senderType: 'admin',
        content: scn.det2
      });
    }

    if (sec === 68) {
      this.simulateGhostTyping(
        scn.kids3,
        () => {
          this.appendChatMessage({
            id: 'battle-kids-3',
            senderType: 'user',
            content: scn.kids3
          });
        }
      );
    }

    if (sec === 78) {
      this.appendChatMessage({
        id: 'battle-det-warning',
        senderType: 'admin',
        content: scn.detWarning
      });
    }

    if (sec === 88) {
      this.simulateGhostTyping(
        scn.kids4,
        () => {
          this.appendChatMessage({
            id: 'battle-kids-4',
            senderType: 'user',
            content: scn.kids4
          });
        }
      );
    }

    // کارآگاه متوجه کلاهبرداری می‌شود و هویت نفوذگر را فاش می‌کند
    if (sec === 98) {
      this.appendChatMessage({
        id: 'battle-det-3',
        senderType: 'admin',
        content: scn.det3
      });
    }

    // مزداک نقاب برمی‌دارد
    if (sec === 107) {
      this.setCinematicPhase('identity', 'هویت نفوذگر تأیید شد: مزداک', 1, 'HOSTILE IDENTITY CONFIRMED');
      this.playSample('tactical-scan.wav', 0.36, 1);
      this.impact('hard');
      this.appendChatMessage({
        id: 'battle-mazdak-1',
        senderType: 'hacker',
        content: scn.mazdak1
      });
    }

    if (sec === 116) {
      this.appendChatMessage({
        id: 'battle-det-challenge',
        senderType: 'admin',
        content: scn.detChallenge
      });
    }

    if (sec === 124) {
      this.appendChatMessage({
        id: 'battle-mazdak-2',
        senderType: 'hacker',
        content: scn.mazdak2
      });
    }

    // ۷. فرمان تخلیه کارآگاه به سمت درگاه اضطراری
    if (sec === 132) {
      this.appendChatMessage({
        id: 'battle-det-4',
        senderType: 'admin',
        content: scn.det4
      });
    }

    // خط و نشان نهایی مزداک
    if (sec === 140) {
      this.cueAct(5, 'تخلیه اضطراری', 'کانال امن را ترک کنید', 'hard');
      this.setCinematicPhase('evacuation', 'پروتکل تخلیه اضطراری', 1, 'EVACUATION ORDER // AUTH CHANNEL ONLY');
      this.playSample('tactical-alarm.wav', 0.5, 1);
      this.appendChatMessage({
        id: 'mazdak-final-threat',
        senderType: 'hacker',
        content: scn.mazdakFinal
      });
      this.siren.swell();
    }

    if (sec === 150) {
      this.triggerEmergencyEjectionModal();
    }
  }

  triggerEmergencyEjectionModal() {
    this.ensureEjectionModal();
    if (!this.dom.ejectionOverlay) return;
    this.dom.ejectionOverlay.classList.add('active');
    // لغو هرگونه شمارش معکوس و انتقال خودکار طبق خواسته صریح کاربر (انتقال خودکار حذف شد)
    // Eviction countdown disabled per user request: countdownSec = 300 (۵ دقیقه / ۵:۰۰) and auto-transfer removed
    if (this.ejectionCountdownInterval) {
      clearInterval(this.ejectionCountdownInterval);
      this.ejectionCountdownInterval = null;
    }
  }

  reset() {
    console.log('[CyberBreachEngine] Resetting cyber breach state...');
    this.isPlaying = false;
    this.sceneGeneration++;
    if (this.ghostTypingTimer) clearTimeout(this.ghostTypingTimer);
    this.ghostTypingTimer = null;
    if (this.dom.msgInput) this.dom.msgInput.value = '';
    if (this.playbackTimer) clearInterval(this.playbackTimer);
    if (this.ejectionCountdownInterval) clearInterval(this.ejectionCountdownInterval);
    if (this.actCueTimer) clearTimeout(this.actCueTimer);
    this.actCueTimer = null;

    this.siren.stop();
    this.stopSamples();

    if (this.dom.blackoutCurtain) {
      this.dom.blackoutCurtain.classList.add('fade-out');
      this.dom.blackoutCurtain.style.display = 'none';
    }

    document.body.classList.remove('system-compromised-red', 'cyber-breach-active');
    document.body.classList.remove('breach-impact-soft', 'breach-impact-hard');
    if (this.dom.cinematicHud) {
      this.dom.cinematicHud.classList.remove('active', 'is-docked');
      this.dom.cinematicHud.removeAttribute('data-phase');
    }

    if (this.dom.messagesBox) {
      this.dom.messagesBox.classList.remove('mazdak-bg');
      this.dom.messagesBox.querySelectorAll('.fake-battle-msg').forEach(el => el.remove());
    }

    this.removeMazdakMediaStamps();

    if (this.isElevated) {
      this.restoreToGrid();
    }

    if (this.dom.ejectionOverlay) {
      this.dom.ejectionOverlay.classList.remove('active');
    }

    this.unlockChatInput();
    this.deliveredBattleMessages.clear();
    this.deliveredTerminalErrors.clear();
    this.deliveredTerminalThreats.clear();

    if (window.liveTerminal && typeof window.liveTerminal.start === 'function') {
      window.liveTerminal.start();
    }
  }
}

// ایجاد و اتصال سراسری
window.cyberBreachEngine = new CyberBreachEngine();
document.addEventListener('DOMContentLoaded', () => {
  window.cyberBreachEngine.init();
});
