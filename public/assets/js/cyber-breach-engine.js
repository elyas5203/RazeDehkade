
// ============================================================================
// دیالوگ‌های سناریوی نفوذ سایبری مزداک (پشتیبانی از سناریوی ارتقایافته روانی و سناریوی قبلی)
// قابلیت برگشت آنی با تنظیم window.CYBER_SCENARIO_VERSION = 'v1' یا افزودن ?scenario=v1
// ============================================================================
const CYBER_SCENARIOS = {
  v3_cinematic_story: {
    detAskVideo: 'خب\nویدئو دهکده آخر رو دیدین ؟',
    detNoReply: 'چرا جواب نمیدین ؟!\nدیدین کلیپ آخر رو ؟؟؟؟؟؟',
    detWaitAnswer: 'آقایون\nمن منتظر جواب شما هستم\nاتفاقی افتاده براتون !؟\nوقت نداریم',
    detReplyNow: 'جواب بدین',
    detWhatHappened: 'چی شد!\nعجیبه !!!!!!',
    detSecurityAltered: 'یه سری تغییراتی تو کد های امنیتی سایت بوجود اومده',
    detSomethingUp: 'یه خبراییه',
    detInfiltratorAlert: 'مثکه نفوذی داریم',

    mazdakGhostBoast1: 'دیگهههه خستم کردددددین😡\nاز اینجا به بعد کنترل پیام های شما دست منه و من با کارآگاهتون صحبت میکنم',
    mazdakSpoofedMsg1: 'کارآگاه نفوذی داریم داخل سایت\nالان پیام هاتون میاد براتون ؟!!!',

    detInfiltratorAck: 'آره\nنفوذی داریم\nخب خداروشکر که حد اقل پیام های شما برام اومد و درست شد\nکلیپ و دیدین به چه سر نخی رسیدین؟',

    mazdakGhostBoast2: 'هه\nسرنخ می خوای !!!!\nالان که تمام سرنخ هارو از چنگت در آوردم میفهمی',
    mazdakSpoofedVaultReq: 'آره کارآگاه جون\nدیدیم\nولی الان موقعیت اضطراریه لازم قبل اینکه اطلاعات دست نفوذی بیوفته رمز گاوصندوق رو بگین تا سریع اطلاعات رو برداریم و بریم بیرون',

    detRefuseVault: 'چی!!!\nرمز گاوصندوق و بگم !!!',
    detRefuseConfidential: 'شما که می دونین تو موقعیتی که نفوذی وجود داره اصلا نباید راجع به این اطلاعات محرمانه صحبت کرد',

    mazdakSpoofedUrgent: 'آره کارآگاه جون\nولی خب مهمه هااااا',
    mazdakSpoofedDataWipe: 'بابا بفرست دیگه\nاحتمالش هست اطلاعاتش پاک بشه',

    detVoiceChanged: 'بچه ها شما که میدونین رمز گاوصندوق رو خود من هم ندارم\nو اگه داشتم هم نمیدادم\nبعدم چرا لحنتون عوض شده!!!!!',
    detUnmaskInfiltrator: 'نکنه تو دستیار نیستی و همون نفوذی هستی !!!!',
    detProtocolCheck: 'چون دستیار ها می دونن که وقتی نفوذی بینمون داریم و سایت هک شده باید چکار کنن',
    detNotMyAssistant: 'تو دستیار من نیستی!!',

    mazdakUnmasked1: 'ااااااااااه\nبسه دیگه این مسخره بازیا\nتا همینجاش هم خیلی شانس آوردین و راحت در رفتین\nدیگه تمومه',
    mazdakUnmasked2: 'یعنی چی رمز گاوصندوق رو ندارم!!!😡',

    detMazdakIdentified: 'مزداک !!!!\nحدس میزدم',
    detHowInfiltrated: 'تو چی می خوای اینجا !\nاصلا چجوری تونستی بیای تو!!',

    mazdakBoastEasyBypass: 'فکر کردی برای من کاری داره که از یه سیستم امنیتی مسخره و بدرد نخور عبور کنم و دورش بزنم',
    mazdakWarningHistory: 'به روش های مختلف بهت پیام اخطار داده بودم که دست از این پرونده برداری\nگفته بودم که به نفع هیچ کس نیست اطلاعات این پرونده معلوم بشه و مشخص بشه',
    mazdakAllCluesAccessed: 'حالا هم به تمام سرنخ هاتون دسترسی پیدا کردم و فقط مونده اون گاوصندوق لعنتی',

    detLockdownDeclaration: 'فکر کردی به همین راحتی میزارم که اطلاعات این پرونده رو از بین ببری و نزاری حقیقت بر ملا بشه',
    detEjectionWarning: 'نخیر\nتمام اطلاعات قفل شده و نمی تونی ازشون استفاده کنی\nو تا چند ثانیه دیگه\nسیستم امنیتی سایت\nبطور خودکار تمام کاربر هایی که داخلش هستن رو میندازه بیرون و قفل میشه و از اون به بعد با احراز هویت دستیار ها از سایت پرتت میکنیم بیرون',

    detCount5: '5',
    detCount4: '4',
    mazdakInterruption: 'نمیتونی این کار رو بکنی اطلاعات این پرونده بالاخره از بین میره',
    detCount3: '3',
    detCount2: '2',
    detCount1: '1'
  },
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
    this.audio = null;
    this.isPlaying = false;
    this.isMuted = false;
    this.baseVolume = 0.55;
    this.fadeTimer = null;
  }

  init() {
    if (!this.ctx) {
      try {
        const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      } catch (_) {}
    }
    if (!this.audio && typeof Audio !== 'undefined') {
      try {
        this.audio = new Audio('/assets/sounds/cyber-alarm.mp3?v=20261027_0500');
        this.audio.loop = true;
        this.audio.volume = this.baseVolume;
        this.audio.preload = 'auto';
      } catch (_) {}
    }
  }

  start() {
    if (this.isPlaying) return;
    this.init();

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (this.audio) {
      try {
        this.audio.currentTime = 0;
        this.audio.volume = this.isMuted ? 0 : 0.05;
        const playPromise = this.audio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            this.setVolume(this.baseVolume, 1.8);
          }).catch(err => {
            console.warn('[BreachSiren] Siren audio play note:', err);
          });
        }
        this.isPlaying = true;
      } catch (e) {
        console.warn('[BreachSiren] Siren start error:', e);
      }
    } else {
      this.isPlaying = true;
    }
  }

  setVolume(targetVol, rampSec = 0.8) {
    if (!this.audio) return;
    const finalVol = this.isMuted ? 0 : Math.max(0, Math.min(1, targetVol));
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
    const steps = 15;
    const stepTime = Math.max(20, Math.floor((rampSec * 1000) / steps));
    const startVol = this.audio.volume;
    const delta = (finalVol - startVol) / steps;
    let stepCount = 0;

    this.fadeTimer = setInterval(() => {
      stepCount++;
      if (stepCount >= steps || !this.audio) {
        if (this.audio) this.audio.volume = finalVol;
        clearInterval(this.fadeTimer);
        this.fadeTimer = null;
      } else {
        this.audio.volume = Math.max(0, Math.min(1, this.audio.volume + delta));
      }
    }, stepTime);
  }

  duck() {
    // هنگام بالا آمدن ترمینال یا خواندن متن، صدا بسیار نرم و کم می‌شود
    this.setVolume(0.12, 1.0);
  }

  swell() {
    // اوج گرفتن هیجان در پایان یا آغاز صحنه
    this.setVolume(0.65, 1.2);
  }

  stop() {
    if (!this.isPlaying) return;
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
    if (this.audio) {
      this.setVolume(0, 0.6);
      setTimeout(() => {
        try {
          if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
            this.audio.volume = this.baseVolume;
          }
        } catch (_) {}
        this.isPlaying = false;
      }, 700);
    } else {
      this.isPlaying = false;
    }
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
    this.storylineActive = false;
    this.ejectionModalTriggered = false;
    this.storyTimers = [];

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
          <span>⚠️ اخطار فوق‌امنیتی // پروتکل خروج اضطراری</span>
        </div>
        <h2 class="ejection-title">کانال امن را ترک کنید</h2>
        <p class="ejection-body-text">
          دستور فوری مرکز فرماندهی: کانال امن را ترک کنید! نفوذ کامل مزداک به سیستم دهکده در دامنه <strong>razedehkade.ir</strong> شناسایی شده و کلیه کانال‌های چت مسدود گردیده‌اند.
          <br><br>
          برای <strong>نجات پرونده و بازپس‌گیری دسترسی</strong>، فوراً آدرس سایت را یادداشت و ذخیره بکنید:
        </p>

        <div class="ejection-callout-box">
          <div class="ejection-url-label">آدرس سایت را ذخیره بکنید:</div>
          <div class="ejection-url-row">
            <span class="ejection-url-code" id="siteUrlText">https://razedehkade.ir</span>
            <button type="button" class="ejection-copy-btn" id="ejectionCopyBtn" title="کپی آدرس سایت">📋 کپی آدرس</button>
          </div>
        </div>

        <div class="ejection-countdown-box" id="ejectionCountdownBox">
          <span>خروج از پایگاه در </span>
          <strong class="ejection-countdown-number" id="ejectionCountdownSec">۱۰</strong>
          <span> ثانیه...</span>
        </div>

        <div class="ejection-actions" style="display: none !important;">
          <button type="button" class="ejection-primary-btn" id="ejectionAuthBtn">
            ⚡ انتقال فوری به درگاه احراز هویت امنیتی اضطراری
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

    const copyBtn = document.getElementById('ejectionCopyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        try {
          navigator.clipboard.writeText('https://razedehkade.ir');
          copyBtn.textContent = '✓ کپی شد!';
          setTimeout(() => { copyBtn.textContent = '📋 کپی آدرس'; }, 2000);
        } catch (_) {}
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
      msgInput.placeholder = '';
      msgInput.style.color = '#ffffff';
      msgInput.style.opacity = '1';
    }
    document.querySelectorAll('.composer-controls button, .composer-controls input, .composer-controls textarea').forEach(el => {
      if (el.id !== 'ejectionAuthBtn') {
        el.setAttribute('disabled', 'true');
        el.classList.add('is-locked-cyber-breach');
      }
    });
    const asstBtn = document.getElementById('open-assistants-popup-btn') || document.querySelector('.assistants-popup-btn');
    if (asstBtn) {
      asstBtn.setAttribute('disabled', 'disabled');
      asstBtn.classList.add('is-locked-cyber-breach');
      asstBtn.style.pointerEvents = 'none';
    }
    const asstDialog = document.getElementById('assistants-photo-dialog');
    if (asstDialog && asstDialog.open) {
      asstDialog.close();
    }
  }

  unlockChatInput() {
    const msgInput = this.dom.msgInput;
    if (msgInput) {
      msgInput.disabled = false;
      msgInput.removeAttribute('readonly');
      msgInput.placeholder = 'پیام خود را بنویسید...';
      msgInput.classList.remove('ghost-typing-active');
      msgInput.style.height = '';
    }
    document.querySelectorAll('.is-locked-cyber-breach').forEach(el => {
      el.removeAttribute('disabled');
      el.classList.remove('is-locked-cyber-breach');
    });
  }

  // --- مدیریت پوشش و مهرهای تصاویر مزداک (MASTER-15) ---
    applyMazdakMediaStamps() {
    const fieldChat = document.querySelector('.field-chat') || this.dom.fieldChat;
    if (fieldChat) {
      fieldChat.classList.add('mazdak-bg');
      let watermark = document.getElementById('mazdak-chat-watermark');
      if (!watermark) {
        watermark = document.createElement('div');
        watermark.id = 'mazdak-chat-watermark';
        watermark.className = 'mazdak-chat-watermark';
        watermark.innerHTML = '<img src="/mazdak.jpg" alt="Mazdak Watermark">';
        fieldChat.appendChild(watermark);
      } else {
        watermark.style.display = 'flex';
      }
    }
    if (this.dom.messagesBox) this.dom.messagesBox.classList.add('mazdak-bg');
    if (this.dom.evidenceBoard) this.dom.evidenceBoard.classList.add('mazdak-bg');
    if (this.dom.evidenceGrid) this.dom.evidenceGrid.classList.add('mazdak-bg');

    // تصاحب کلیه مدارک واقعی ارسالی در جلسه بدون تزریق کارت‌های ساختگی
    const cards = document.querySelectorAll('.evidence-card');
    cards.forEach(card => {
      card.classList.add('card-blackout');
      card.style.pointerEvents = 'none';
      const img = card.querySelector('img');
      if (img) {
        if (!img.dataset.origSrc) img.dataset.origSrc = img.src;
        img.src = '/mazdak.jpg';
        img.classList.add('media-corrupted');
      }
      if (!card.querySelector('.evidence-mazdak-glitch-cover')) {
        const cover = document.createElement('div');
        cover.className = 'evidence-mazdak-glitch-cover';
        cover.innerHTML = '<img src="/mazdak.jpg" alt="Mazdak" loading="eager"><div class="mazdak-corrupt-scanline"></div>';
        card.appendChild(cover);
      }
    });

    const countBadge = document.querySelector('.evidence-count-badge') || document.querySelector('.evidence-meta-pill');
    if (countBadge) {
      countBadge.textContent = `${cards.length} مدرک مخدوش‌شده (سیگنال مفقود)`;
    }
  }

  removeMazdakMediaStamps() {
    const watermark = document.getElementById('mazdak-chat-watermark');
    if (watermark) watermark.remove();
    const fieldChat = document.querySelector('.field-chat') || this.dom.fieldChat;
    if (fieldChat) fieldChat.classList.remove('mazdak-bg');
    if (this.dom.messagesBox) this.dom.messagesBox.classList.remove('mazdak-bg');
    if (this.dom.evidenceBoard) this.dom.evidenceBoard.classList.remove('mazdak-bg');
    if (this.dom.evidenceGrid) this.dom.evidenceGrid.classList.remove('mazdak-bg');
    document.querySelectorAll('.evidence-card.evidence-mazdak-injected').forEach(el => el.remove());
    document.querySelectorAll('.evidence-card img').forEach(img => {
      if (img.dataset.origSrc) {
        img.src = img.dataset.origSrc;
        delete img.dataset.origSrc;
      }
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
    this.storylineActive = false;
    this.ejectionModalTriggered = false;
    if (this.storyTimers && this.storyTimers.length) {
      this.storyTimers.forEach(t => clearTimeout(t));
      this.storyTimers = [];
    }
    this.deliveredBattleMessages.clear();
    this.deliveredTerminalErrors.clear();
    this.deliveredTerminalThreats.clear();
    this.ensureCinematicHud();

    const isV1 = (typeof window !== 'undefined' && (window.CYBER_SCENARIO_VERSION === 'v1' || new URLSearchParams(window.location.search).get('scenario') === 'v1'));
    const isV2 = (typeof window !== 'undefined' && (window.CYBER_SCENARIO_VERSION === 'v2' || new URLSearchParams(window.location.search).get('scenario') === 'v2'));

    if (isV1 || isV2) {
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
      this.triggerInitialBlackout();
    } else {
      // حالت پیش‌فرض MASTER-28: شروع طبیعی بدون پاپ‌آپ‌های ناگهانی مزاحم (شروع هک حذف شد)
      this.duration = 185; // کل زمان سکانس سینمایی طبق MASTER-15
      this.setCinematicPhase('surveillance', 'ارتباط با دستیاران دهکده', 0.05, 'CHANNEL OPEN // DETECTIVE BROADCAST');
      this.unlockChatInput();
      this.renderFrame(0); // ارسال فوری اولین پیام در همان لحظه استارت هک
    }

    this.playbackTimer = setInterval(() => {
      this.currentSecond++;
      this.renderFrame(this.currentSecond);
      if (this.currentSecond >= this.duration) {
        clearInterval(this.playbackTimer);
      }
    }, 1000);
  }

  triggerInitialBlackout(onComplete) {
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
          <em>ACT 02 / 05</em>
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
      if (typeof onComplete === 'function') onComplete();
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

    // شروع آژیر واقعی استودیویی سایبری
    this.siren.start();
  }

  triggerBreachScreenJump() {
    document.body.classList.add('breach-jump-shake');
    this.playSample('cyber-error.mp3', 0.65, 0.95);
    this.playSample('cyber-slam.mp3', 0.5, 1.1);
    this.impact('hard');
    setTimeout(() => {
      document.body.classList.remove('breach-jump-shake');
    }, 1000);
  }

  simulateGhostTypingWithErase(textToRead, holdMs, nextTextToSend, onComplete) {
    const input = this.dom.msgInput;
    if (!input) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    const generation = this.sceneGeneration;
    if (this.ghostTypingTimer) clearTimeout(this.ghostTypingTimer);
    input.classList.add('ghost-typing-active');
    input.value = '';
    input.placeholder = '';
    input.disabled = false;
    input.setAttribute('readonly', 'true');

    const adjustHeight = () => {
      input.style.height = 'auto';
      const scrollH = input.scrollHeight;
      input.style.height = `${Math.max(68, Math.min(220, scrollH))}px`;
    };
    adjustHeight();

    let idx = 0;
    const typeFirstText = () => {
      if (!this.isPlaying || generation !== this.sceneGeneration) return;
      if (idx < textToRead.length) {
        input.value += textToRead[idx];
        idx++;
        adjustHeight();
        const delay = 45 + Math.floor(Math.random() * 30);
        this.ghostTypingTimer = setTimeout(typeFirstText, delay);
      } else {
        adjustHeight();
        // مهلت خواندن متن در چت‌باکس برای دانش‌آموزان
        const readTime = Math.max(Number(holdMs) || 0, 7500);
        this.ghostTypingTimer = setTimeout(() => {
          if (!this.isPlaying || generation !== this.sceneGeneration) return;
          let eraseIdx = textToRead.length;
          const eraseNext = () => {
            if (!this.isPlaying || generation !== this.sceneGeneration) return;
            if (eraseIdx > 0) {
              eraseIdx--;
              input.value = textToRead.substring(0, eraseIdx);
              adjustHeight();
              const eraseDelay = 25 + Math.floor(Math.random() * 15);
              this.ghostTypingTimer = setTimeout(eraseNext, eraseDelay);
            } else {
              input.value = '';
              input.placeholder = '';
              adjustHeight();
              this.ghostTypingTimer = setTimeout(() => {
                if (!this.isPlaying || generation !== this.sceneGeneration) return;
                this.simulateGhostTyping(nextTextToSend, onComplete);
              }, 1000);
            }
          };
          eraseNext();
        }, readTime);
      }
    };

    typeFirstText();
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
    input.placeholder = '';
    input.disabled = false;
    input.setAttribute('readonly', 'true');

    const adjustHeight = () => {
      input.style.height = 'auto';
      const scrollH = input.scrollHeight;
      input.style.height = `${Math.max(68, Math.min(220, scrollH))}px`;
    };
    adjustHeight();

    let index = 0;
    const typeNextChar = () => {
      if (!this.isPlaying || generation !== this.sceneGeneration) return;
      if (index < text.length) {
        input.value += text[index];
        index++;
        adjustHeight();
        const delay = 40 + Math.floor(Math.random() * 30);
        this.ghostTypingTimer = setTimeout(typeNextChar, delay);
      } else {
        adjustHeight();
        // مهلت خواندن پیام در چت‌باکس توسط دانش‌آموزان قبل از ارسال
        this.ghostTypingTimer = setTimeout(() => {
          if (!this.isPlaying || generation !== this.sceneGeneration) return;
          const sendBtn = form ? form.querySelector('button[type="submit"], #send-btn, .send-button') : null;
          if (sendBtn) {
            sendBtn.classList.add('ghost-send-pulse');
            setTimeout(() => sendBtn.classList.remove('ghost-send-pulse'), 350);
          }
          input.value = '';
          input.placeholder = '';
          input.style.height = '';
          input.classList.remove('ghost-typing-active');
          if (typeof onComplete === 'function') onComplete();
        }, 11500);
      }
    };

    typeNextChar();
  }

  
  setDetectiveTyping(isTyping) {
    const el = this.dom.typingIndicator || document.getElementById('typing-indicator');
    if (!el) return;
    if (isTyping && this.isPlaying) {
      el.style.display = 'flex';
      const textSpan = el.querySelector('span');
      if (textSpan) textSpan.textContent = 'کارآگاه در حال نوشتن است...';
      const box = this.dom.messagesBox || document.getElementById('messages-box');
      if (box) box.scrollTop = box.scrollHeight;
    } else {
      el.style.display = 'none';
    }
  }

  appendChatMessage({ id, senderType, senderName, content, extraClass = '' }) {
    if (this.deliveredBattleMessages.has(id)) return;
    this.deliveredBattleMessages.add(id);
    if (senderType === 'admin') this.setDetectiveTyping(false);

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

    
  delay(ms) {
    return new Promise(resolve => {
      const gen = this.sceneGeneration;
      const timer = setTimeout(() => {
        if (this.isPlaying && gen === this.sceneGeneration) {
          resolve();
        }
      }, ms);
      this.storyTimers = this.storyTimers || [];
      this.storyTimers.push(timer);
    });
  }

  checkSceneAlive(gen) {
    return Boolean(this.isPlaying && gen === this.sceneGeneration);
  }

  simulateGhostTypingWithErasePromise(textToRead, holdMs, nextTextToSend) {
    return new Promise(resolve => {
      this.simulateGhostTypingWithErase(textToRead, holdMs, nextTextToSend, resolve);
    });
  }

  simulateGhostTypingPromise(text) {
    return new Promise(resolve => {
      this.simulateGhostTyping(text, resolve);
    });
  }

    async runPostBlackoutSequence() {
    const gen = this.sceneGeneration;
    const scn = CYBER_SCENARIOS.v3_cinematic_story;
    if (this.storylineActive) return;
    this.storylineActive = true;

    // ۱. مکث اولیه آرام پس از کنار رفتن پرده سیاه و استقرار لوگوی مزداک
    await this.delay(3000);
    if (!this.checkSceneAlive(gen)) return;

    // ۲. تایپ رجزخوانی مزداک در چت‌باکس، مهلت خواندن دانش‌آموزان، پاک شدن و ارسال پیام به کارآگاه
    await this.simulateGhostTypingWithErasePromise(
      scn.mazdakGhostBoast1,
      8500, // مهلت کامل خواندن متن اول در چت‌باکس برای دانش‌آموزان
      scn.mazdakSpoofedMsg1
    );
    if (!this.checkSceneAlive(gen)) return;

    // ارسال قطعی پیام نفوذی به چت (دستیاران کارآگاه)
    this.appendChatMessage({
      id: 'battle-kids-spoofed-infiltrator',
      senderType: 'user',
      content: scn.mazdakSpoofedMsg1
    });

    // ۳. پاسخ کارآگاه: اطلاع از نفوذ و احوالپرسی از دستیاران
    await this.delay(12000);
    if (!this.checkSceneAlive(gen)) return;
    this.setDetectiveTyping(true);
    await this.delay(4500);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-infiltrator-ack',
      senderType: 'admin',
      content: scn.detInfiltratorAck
    });

    // ۴. کری‌خوانی دوم مزداک در چت‌باکس و سپس پاک شدن و درخواست رمز گاوصندوق
    await this.delay(10000);
    if (!this.checkSceneAlive(gen)) return;

    await this.simulateGhostTypingWithErasePromise(
      scn.mazdakGhostBoast2,
      8000, // مهلت خواندن متن تمسخر در چت‌باکس
      scn.mazdakSpoofedVaultReq
    );
    if (!this.checkSceneAlive(gen)) return;

    // ارسال قطعی پیام درخواست رمز گاوصندوق به چت
    this.appendChatMessage({
      id: 'battle-kids-spoofed-vault-request',
      senderType: 'user',
      content: scn.mazdakSpoofedVaultReq
    });

    // ۵. پاسخ کارآگاه: امتناع قاطع از گفتن رمز گاوصندوق (دقیقاً پس از ارسال پیام بچه‌ها)
    await this.delay(10000);
    if (!this.checkSceneAlive(gen)) return;
    this.setDetectiveTyping(true);
    await this.delay(4500);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-refuse-vault',
      senderType: 'admin',
      content: scn.detRefuseVault
    });

    await this.delay(8000);
    if (!this.checkSceneAlive(gen)) return;
    this.setDetectiveTyping(true);
    await this.delay(4500);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-refuse-confidential',
      senderType: 'admin',
      content: scn.detRefuseConfidential
    });

    // ۶. اصرار مزداک با هویت جعلی در چت‌باکس برای دریافت رمز گاوصندوق
    await this.delay(8000);
    if (!this.checkSceneAlive(gen)) return;
    await this.simulateGhostTypingPromise(scn.mazdakSpoofedUrgent);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-kids-spoofed-urgent',
      senderType: 'user',
      content: scn.mazdakSpoofedUrgent
    });

    await this.delay(8000);
    if (!this.checkSceneAlive(gen)) return;
    await this.simulateGhostTypingPromise(scn.mazdakSpoofedDataWipe);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-kids-spoofed-data-wipe',
      senderType: 'user',
      content: scn.mazdakSpoofedDataWipe
    });

    // ۷. شک کارآگاه به تغییر لحن و استعلام کدهای پروتکل
    await this.delay(12000);
    if (!this.checkSceneAlive(gen)) return;
    this.setDetectiveTyping(true);
    await this.delay(4500);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-voice-changed',
      senderType: 'admin',
      content: scn.detVoiceChanged
    });

    await this.delay(10000);
    if (!this.checkSceneAlive(gen)) return;
    this.setDetectiveTyping(true);
    await this.delay(4500);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-unmask-infiltrator',
      senderType: 'admin',
      content: scn.detUnmaskInfiltrator
    });

    await this.delay(10000);
    if (!this.checkSceneAlive(gen)) return;
    this.setDetectiveTyping(true);
    await this.delay(4000);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-protocol-check',
      senderType: 'admin',
      content: scn.detProtocolCheck
    });

    await this.delay(8000);
    if (!this.checkSceneAlive(gen)) return;
    this.setDetectiveTyping(true);
    await this.delay(3500);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-not-my-assistant',
      senderType: 'admin',
      content: scn.detNotMyAssistant
    });

    // ۸. افشای هویت مزداک: پرش تصویر + افکت صوتی شوک + پیام‌های خشم مزداک
    await this.delay(5000);
    if (!this.checkSceneAlive(gen)) return;
    this.triggerBreachScreenJump();
    this.appendChatMessage({
      id: 'battle-mazdak-unmasked-1',
      senderType: 'hacker',
      content: scn.mazdakUnmasked1
    });

    await this.delay(10000);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-mazdak-unmasked-2',
      senderType: 'hacker',
      content: scn.mazdakUnmasked2
    });

    // ۹. پاسخ کارآگاه به مزداک
    await this.delay(12000);
    if (!this.checkSceneAlive(gen)) return;
    this.setDetectiveTyping(true);
    await this.delay(4000);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-mazdak-identified',
      senderType: 'admin',
      content: scn.detMazdakIdentified
    });

    await this.delay(10000);
    if (!this.checkSceneAlive(gen)) return;
    this.setDetectiveTyping(true);
    await this.delay(4000);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-how-infiltrated',
      senderType: 'admin',
      content: scn.detHowInfiltrated
    });

    // ۱۰. کری‌خوانی‌های مزداک
    await this.delay(14000);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-mazdak-boast-easy-bypass',
      senderType: 'hacker',
      content: scn.mazdakBoastEasyBypass
    });

    await this.delay(14000);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-mazdak-warning-history',
      senderType: 'hacker',
      content: scn.mazdakWarningHistory
    });

    await this.delay(14000);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-mazdak-all-clues-accessed',
      senderType: 'hacker',
      content: scn.mazdakAllCluesAccessed
    });

    // ۱۱. پاتک کارآگاه و قفل کردن سیستم
    await this.delay(15000);
    if (!this.checkSceneAlive(gen)) return;
    this.setDetectiveTyping(true);
    await this.delay(5000);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-lockdown-declaration',
      senderType: 'admin',
      content: scn.detLockdownDeclaration
    });

    await this.delay(15000);
    if (!this.checkSceneAlive(gen)) return;
    this.setDetectiveTyping(true);
    await this.delay(5000);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-ejection-warning',
      senderType: 'admin',
      content: scn.detEjectionWarning
    });

    // ۱۲. شمارش معکوس اخراج
    await this.delay(8000);
    if (!this.checkSceneAlive(gen)) return;
    this.setDetectiveTyping(true);
    await this.delay(2500);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-count-5',
      senderType: 'admin',
      content: scn.detCount5
    });

    await this.delay(6000);
    if (!this.checkSceneAlive(gen)) return;
    this.setDetectiveTyping(true);
    await this.delay(2500);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-count-4',
      senderType: 'admin',
      content: scn.detCount4
    });

    await this.delay(5000);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-mazdak-interruption',
      senderType: 'hacker',
      content: scn.mazdakInterruption
    });

    await this.delay(5000);
    if (!this.checkSceneAlive(gen)) return;
    this.setDetectiveTyping(true);
    await this.delay(2000);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-count-3',
      senderType: 'admin',
      content: scn.detCount3
    });

    await this.delay(5000);
    if (!this.checkSceneAlive(gen)) return;
    this.setDetectiveTyping(true);
    await this.delay(2000);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-count-2',
      senderType: 'admin',
      content: scn.detCount2
    });

    await this.delay(5000);
    if (!this.checkSceneAlive(gen)) return;
    this.setDetectiveTyping(true);
    await this.delay(2000);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-count-1',
      senderType: 'admin',
      content: scn.detCount1
    });

    // ۱۳. سر یک ثانیه: بالا آمدن مودال اخراج اضطراری (۱۰ ثانیه معکوس)
    await this.delay(4000);
    if (!this.checkSceneAlive(gen)) return;
    this.triggerEmergencyEjectionModal();
  }

  renderLegacyFrame(sec, isV1) {
    const scn = isV1 ? CYBER_SCENARIOS.v1_legacy : CYBER_SCENARIOS.v2_psychological;
    if (sec === 7) {
      this.cueAct(2, 'شکست پیرامونی', 'لایهٔ دفاعی پایگاه در حال فروپاشی است', 'hard');
      this.elevateTerminal();
    }
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
    if (sec === 16) {
      this.appendChatMessage({ id: 'battle-det-1', senderType: 'admin', content: scn.det1 });
    }
    if (sec === 19) {
      this.appendChatMessage({ id: 'battle-det-pre-2', senderType: 'admin', content: scn.detPre2 });
    }
    if (sec === 24) {
      this.cueAct(4, 'جنگ روانی', 'پیام‌های پایگاه دیگر قابل اعتماد نیستند', 'soft');
      this.restoreToGrid();
      this.dom.cinematicHud?.classList.add('is-docked');
    }
    if (sec === 28) {
      this.simulateGhostTyping(scn.kids1, () => {
        this.appendChatMessage({ id: 'battle-kids-1', senderType: 'user', content: scn.kids1 });
      });
    }
    if (sec === 38) {
      this.appendChatMessage({ id: 'battle-det-probe-1', senderType: 'admin', content: scn.detProbe1 });
    }
    if (sec === 47) {
      this.simulateGhostTyping(scn.kids2, () => this.appendChatMessage({ id: 'battle-kids-2', senderType: 'user', content: scn.kids2 }));
    }
    if (sec === 58) {
      this.appendChatMessage({ id: 'battle-det-2', senderType: 'admin', content: scn.det2 });
    }
    if (sec === 68) {
      this.simulateGhostTyping(scn.kids3, () => {
        this.appendChatMessage({ id: 'battle-kids-3', senderType: 'user', content: scn.kids3 });
      });
    }
    if (sec === 78) {
      this.appendChatMessage({ id: 'battle-det-warning', senderType: 'admin', content: scn.detWarning });
    }
    if (sec === 88) {
      this.simulateGhostTyping(scn.kids4, () => {
        this.appendChatMessage({ id: 'battle-kids-4', senderType: 'user', content: scn.kids4 });
      });
    }
    if (sec === 98) {
      this.appendChatMessage({ id: 'battle-det-3', senderType: 'admin', content: scn.det3 });
    }
    if (sec === 107) {
      this.setCinematicPhase('identity', 'هویت نفوذگر تأیید شد: مزداک', 1, 'HOSTILE IDENTITY CONFIRMED');
      this.playSample('tactical-scan.wav', 0.36, 1);
      this.impact('hard');
      this.appendChatMessage({ id: 'battle-mazdak-1', senderType: 'hacker', content: scn.mazdak1 });
    }
    if (sec === 116) {
      this.appendChatMessage({ id: 'battle-det-challenge', senderType: 'admin', content: scn.detChallenge });
    }
    if (sec === 124) {
      this.appendChatMessage({ id: 'battle-mazdak-2', senderType: 'hacker', content: scn.mazdak2 });
    }
    if (sec === 132) {
      this.appendChatMessage({ id: 'battle-det-4', senderType: 'admin', content: scn.det4 });
    }
    if (sec === 140) {
      this.cueAct(5, 'تخلیه اضطراری', 'کانال امن را ترک کنید', 'hard');
      this.setCinematicPhase('evacuation', 'پروتکل تخلیه اضطراری', 1, 'EVACUATION ORDER // AUTH CHANNEL ONLY');
      this.playSample('tactical-alarm.wav', 0.5, 1);
      this.appendChatMessage({ id: 'mazdak-final-threat', senderType: 'hacker', content: scn.mazdakFinal });
      this.siren.swell();
    }
    if (sec === 150) {
      this.triggerEmergencyEjectionModal();
    }
  }

      renderFrame(sec) {
    this.updateCinematicTimecode(sec);

    const isV1 = (typeof window !== 'undefined' && (window.CYBER_SCENARIO_VERSION === 'v1' || new URLSearchParams(window.location.search).get('scenario') === 'v1'));
    const isV2 = (typeof window !== 'undefined' && (window.CYBER_SCENARIO_VERSION === 'v2' || new URLSearchParams(window.location.search).get('scenario') === 'v2'));

    if (isV1 || isV2) {
      this.renderLegacyFrame(sec, isV1);
      return;
    }

    const scn = CYBER_SCENARIOS.v3_cinematic_story;

    // ۱. شروع هک: پیام اول کارآگاه (ارسال در ثانیه ۰)
    if (sec === 0) {
      this.appendChatMessage({
        id: 'battle-det-ask-video',
        senderType: 'admin',
        content: scn.detAskVideo
      });
    }

    // ایزتایپینگ قبل از پیام دوم
    if (sec === 26) {
      this.setDetectiveTyping(true);
    }
    // ۲. بعد سی ثانیه: پیام دوم کارآگاه + تغییر رنگ تدریجی کدهای باکس سمت چپ (ترمینال) به قرمز
    if (sec === 30) {
      this.appendChatMessage({
        id: 'battle-det-no-reply',
        senderType: 'admin',
        content: scn.detNoReply
      });
      if (this.dom.terminal) {
        this.dom.terminal.classList.add('breach-warming-up');
      }
    }

    // ایزتایپینگ قبل از پیام سوم
    if (sec === 56) {
      this.setDetectiveTyping(true);
    }
    // ۳. پیام سوم کارآگاه
    if (sec === 60) {
      this.appendChatMessage({
        id: 'battle-det-wait-answer',
        senderType: 'admin',
        content: scn.detWaitAnswer
      });
    }

    if (sec === 66) {
      this.setDetectiveTyping(true);
    }
    // پیام چهارم کارآگاه + پر پر کردن تصاویر برد اسناد
    if (sec === 70) {
      this.appendChatMessage({
        id: 'battle-det-reply-now',
        senderType: 'admin',
        content: scn.detReplyNow
      });
      if (this.dom.evidenceBoard) {
        this.dom.evidenceBoard.classList.add('evidence-flickering');
      }
      if (this.dom.evidenceGrid) {
        this.dom.evidenceGrid.classList.add('evidence-flickering');
      }
    }

    // ۴. پیام‌های اعلام نفوذ کارآگاه
    if (sec === 86) {
      this.setDetectiveTyping(true);
    }
    if (sec === 90) {
      this.appendChatMessage({
        id: 'battle-det-what-happened',
        senderType: 'admin',
        content: scn.detWhatHappened
      });
    }

    if (sec === 97) {
      this.setDetectiveTyping(true);
    }
    if (sec === 100) {
      this.appendChatMessage({
        id: 'battle-det-security-altered',
        senderType: 'admin',
        content: scn.detSecurityAltered
      });
    }

    if (sec === 107) {
      this.setDetectiveTyping(true);
    }
    if (sec === 110) {
      this.appendChatMessage({
        id: 'battle-det-something-up',
        senderType: 'admin',
        content: scn.detSomethingUp
      });
    }

    if (sec === 117) {
      this.setDetectiveTyping(true);
    }
    if (sec === 120) {
      this.appendChatMessage({
        id: 'battle-det-infiltrator-alert',
        senderType: 'admin',
        content: scn.detInfiltratorAlert
      });
    }

    // ۵. بلافاصله بعد این پیام: تصویر سیگنال قطع شد (پرده سیاه با نقطه قرمز تپنده)
    if (sec === 122) {
      this.triggerInitialBlackout(() => {
        this.lockChatInput();
        if (this.dom.evidenceBoard) this.dom.evidenceBoard.classList.remove('evidence-flickering');
        if (this.dom.evidenceGrid) this.dom.evidenceGrid.classList.remove('evidence-flickering');
        this.runPostBlackoutSequence();
      });
    }
  }

  triggerEmergencyEjectionModal() {
    this.ensureEjectionModal();
    if (!this.dom.ejectionOverlay) return;
    this.ejectionModalTriggered = true;
    this.dom.ejectionOverlay.classList.add('active');
    // لغو هرگونه شمارش معکوس و انتقال خودکار طبق خواسته صریح کاربر (انتقال خودکار حذف شد و دانش‌آموزان به صفحه سوالات هدایت نمی‌شوند)
    // countdownSec = 300 (۵ دقیقه / ۵:۰۰) - Eviction timer initialized for MASTER-15

    let countdownSec = 10;
    const secEl = document.getElementById('ejectionCountdownSec');
    const boxEl = document.getElementById('ejectionCountdownBox');
    if (secEl) secEl.textContent = '۱۰';

    if (this.ejectionCountdownInterval) clearInterval(this.ejectionCountdownInterval);
    this.ejectionCountdownInterval = setInterval(() => {
      countdownSec--;
      if (secEl) secEl.textContent = String(countdownSec);
      if (countdownSec <= 0) {
        clearInterval(this.ejectionCountdownInterval);
        this.ejectionCountdownInterval = null;
        if (boxEl) {
          boxEl.innerHTML = `<span style="color:#ef4444;font-weight:900;font-size:14px;line-height:1.7;">⚠️ ارتباط با پایگاه به طور کامل قطع گردید.<br>آدرس سایت را ذخیره کنید.</span>`;
        }
        try {
          if (window.sessionData && window.sessionData.id) {
            localStorage.setItem(`session_hacked_${window.sessionData.id}`, '1');
          }
        } catch (_) {}
        // انتقال خودکار طبق دستور صریح کاربر کاملاً غیرفعال است؛ کاربر روی همین صفحه قفل و ذخیره آدرس باقی می‌ماند
        // بعداً اگر کسی مجدداً وارد شود یا صفحه ریلود گردد، بر اساس وضعیت هک به صفحه سوالات هدایت خواهد شد
      }
    }, 1000);
  }

  reset() {
    console.log('[CyberBreachEngine] Resetting cyber breach state...');
    this.isPlaying = false;
    this.sceneGeneration++;
    this.storylineActive = false;
    this.ejectionModalTriggered = false;
    if (this.storyTimers && this.storyTimers.length) {
      this.storyTimers.forEach(t => clearTimeout(t));
      this.storyTimers = [];
    }
    if (this.ghostTypingTimer) clearTimeout(this.ghostTypingTimer);
    this.ghostTypingTimer = null;
    if (this.dom.msgInput) {
      this.dom.msgInput.value = '';
      this.dom.msgInput.style.height = '';
      this.dom.msgInput.classList.remove('ghost-typing-active');
    }
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
