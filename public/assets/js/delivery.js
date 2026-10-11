'use strict';

(() => {
  const TOTAL_DURATION_MS = 30000; // 30 ثانیه برای تحویل
  const CIRCLE_CIRCUMFERENCE = 565.48; // 2 * PI * 90
  
  // =========================================================================
  // مدت‌زمان خاموشی صفحه (بلک‌اوت) پس از تحویل بسته:
  // طبق مشخصات پروژه:
  // - برای تمام کاربران عادی: ۳ دقیقه کامل = 3 * 60 * 1000 (180000 میلی‌ثانیه)
  // - برای اکانت تست اختصاصی: ۱۵ ثانیه = 15 * 1000
  //   کد تخفیف: 542810 | کد ورود: 371717 | شماره ثبت‌شده: 09151234567
  // =========================================================================
  const urlParams = new URLSearchParams(window.location.search);
  const isFromLogin = urlParams.has('from') || urlParams.get('mode') === 'intro';

  let order;
  try { 
    order = JSON.parse(localStorage.getItem('golha_last_order') || 'null'); 
  } catch (_) {}

  function checkIsTestUser() {
    const cleanDigits = (v) => String(v || '').replace(/\D/g, '');
    const orderPhone = cleanDigits(order?.phone);
    const sessionPhone = cleanDigits(sessionStorage.getItem('teacherPhone'));
    const discount = String(order?.discountCode || order?.order_code || urlParams.get('discount') || '').trim();
    const chatCode = String(order?.chat_code || sessionStorage.getItem('prefillCode') || '').trim();

    return (
      discount === '542810' ||
      chatCode === '371717' ||
      orderPhone === '09151234567' ||
      sessionPhone === '09151234567'
    );
  }

  const isTest = checkIsTestUser();
  const DEFAULT_BLACKOUT_MS = 3 * 60 * 1000; // ۳ دقیقه (180 ثانیه)
  const TEST_USER_BLACKOUT_MS = 15 * 1000;    // ۱۵ ثانیه
  const BLACKOUT_DURATION_MS = isTest ? TEST_USER_BLACKOUT_MS : DEFAULT_BLACKOUT_MS;

  // در حالت لاگین با شماره ثبت‌شده، مستقیماً وارد اینتروی سایبری با ترنزیشن کوتاه ۱.۲ ثانیه‌ای می‌شود
  const LOGIN_BLACKOUT_MS = 1200;

  const numberFormat = new Intl.NumberFormat('fa-IR');

  // مبدا زمانی شمارش معکوس ۳۰ ثانیه‌ای
  let startedAt = Date.now();
  if (order && Number.isFinite(Number(order.countdownStartedAt))) {
    const elapsed = Date.now() - Number(order.countdownStartedAt);
    if (elapsed > 0 && elapsed < TOTAL_DURATION_MS) {
      // اگر تازه از ثبت سفارش ریدایرکت شده، از ۳۰ ثانیه کامل شروع شود تا هیچ پرشی ایجاد نشود
      if (elapsed < 4000) {
        startedAt = Date.now();
        order.countdownStartedAt = startedAt;
        try { localStorage.setItem('golha_last_order', JSON.stringify(order)); } catch (_) {}
      } else {
        startedAt = Number(order.countdownStartedAt);
      }
    } else {
      startedAt = Date.now();
      order.countdownStartedAt = startedAt;
      try { localStorage.setItem('golha_last_order', JSON.stringify(order)); } catch (_) {}
    }
  } else {
    startedAt = Date.now();
    if (order) {
      order.countdownStartedAt = startedAt;
      try { localStorage.setItem('golha_last_order', JSON.stringify(order)); } catch (_) {}
    }
  }

  let isArrived = false;
  let timerId = null;
  let lastSeconds = null;

  const timerDisplay = document.getElementById('timerDisplay');
  const ring = document.getElementById('delivery-ring');
  const cyberOverlay = document.getElementById('cyberOverlay');
  const matrixCanvas = document.getElementById('matrixCanvas');

  // ==========================================
  // موتور افکت صوتی تیک‌تیک ساعت شمارش معکوس ۳۰ ثانیه‌ای
  // ==========================================
  let tickAudioCtx = null;
  let tickAudioBuffer = null;

  function initTickAudioEngine() {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;
      if (!tickAudioCtx) tickAudioCtx = new AudioCtxClass();

      fetch('/assets/sounds/clock-tick.wav')
        .then(res => res.arrayBuffer())
        .then(data => tickAudioCtx.decodeAudioData(data))
        .then(buffer => {
          tickAudioBuffer = buffer;
        })
        .catch(() => {});
    } catch (_) {}
  }

  function playSyntheticTick() {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;
      if (!tickAudioCtx) tickAudioCtx = new AudioCtxClass();
      if (tickAudioCtx.state === 'suspended') {
        tickAudioCtx.resume().catch(() => {});
      }
      const osc = tickAudioCtx.createOscillator();
      const gain = tickAudioCtx.createGain();
      const now = tickAudioCtx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1050, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.022);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);

      osc.connect(gain);
      gain.connect(tickAudioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.022);
    } catch (_) {}
  }

  function playTickSound() {
    try {
      if (tickAudioCtx && tickAudioCtx.state === 'suspended') {
        tickAudioCtx.resume().catch(() => {});
      }
      if (tickAudioCtx && tickAudioBuffer) {
        const source = tickAudioCtx.createBufferSource();
        source.buffer = tickAudioBuffer;
        const gain = tickAudioCtx.createGain();
        gain.gain.value = 0.55;
        source.connect(gain);
        gain.connect(tickAudioCtx.destination);
        source.start(0);
        return;
      }
      const audio = new Audio('/assets/sounds/clock-tick.wav');
      audio.volume = 0.55;
      audio.play().catch(() => {
        playSyntheticTick();
      });
    } catch (_) {
      playSyntheticTick();
    }
  }

  initTickAudioEngine();

  // ==========================================
  // موتور پخش ساندترک سینمایی و استودیویی
  // ==========================================
  let currentIntroAudio = null;

  // پخش ساندترک سینمایی ساب‌بیس دارک تریلر بدون بیپ یا صداهای آزاردهنده
  function playCyberIntroSound() {
    try {
      const mp3 = new Audio('/assets/sounds/cyber-intro.mp3');
      mp3.volume = 0.95;
      mp3.play().then(() => {
        currentIntroAudio = mp3;
      }).catch(() => {
        const wav = new Audio('/assets/sounds/cyber-intro.wav');
        wav.volume = 0.95;
        wav.play().catch(() => {});
        currentIntroAudio = wav;
      });
    } catch (_) {}
  }

  // فعال‌سازی دسترسی صدا در مرورگر با اولین کلیک یا لمس
  ['click', 'touchstart', 'keydown', 'pointerdown'].forEach(evt => {
    window.addEventListener(evt, () => {
      if (tickAudioCtx && tickAudioCtx.state === 'suspended') {
        tickAudioCtx.resume().catch(() => {});
      }
      if (currentIntroAudio && currentIntroAudio.paused) {
        currentIntroAudio.play().catch(() => {});
      }
    }, { once: true });
  });

  // ==========================================
  // جریان تلمتری و رصد داده‌های رمزنگاری‌شده (Forensic Telemetry Stream)
  // ==========================================
  function startTelemetryStream() {
    if (!matrixCanvas) return null;
    const ctx = matrixCanvas.getContext('2d');
    matrixCanvas.width = window.innerWidth;
    matrixCanvas.height = window.innerHeight;

    const tokens = [
      '0x7FFE4B90', 'SHA256:8f2a1b9', 'TCP/IP_SYN', 'SIGINT:714', 'TLS_AES_256', 
      'CURVE25519', 'PACKET_IN_OK', 'BGP_ROUTING', 'MEM_DUMP:0xA0', 'HASH_VALID', 
      'RSA_SIG:4096', 'SEC_CLEAR:L5', 'DIFFIE_HELLMAN', 'ACK_NODE_714', 'ENCR_CIPHER',
      '45 00 00 3c 1c', 'PORT_RELAY:714', 'FORENSIC_STREAM', 'GEO_LOCK:VALID'
    ];
    const fontSize = 12;
    const columns = Math.floor(matrixCanvas.width / 95);
    const drops = Array(columns).fill(1).map(() => Math.floor(Math.random() * -30));

    function draw() {
      ctx.fillStyle = 'rgba(5, 8, 14, 0.18)';
      ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);

      ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;

      for (let i = 0; i < drops.length; i++) {
        if (drops[i] > 0) {
          const text = tokens[Math.floor(Math.random() * tokens.length)];
          ctx.fillStyle = Math.random() > 0.85 ? 'rgba(56, 189, 248, 0.55)' : 'rgba(100, 116, 139, 0.28)';
          ctx.fillText(text, i * 95, drops[i] * fontSize);
        }

        if (drops[i] * fontSize > matrixCanvas.height && Math.random() > 0.96) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }

    const interval = setInterval(draw, 45);
    window.addEventListener('resize', () => {
      matrixCanvas.width = window.innerWidth;
      matrixCanvas.height = window.innerHeight;
    });
    return interval;
  }

  // ==========================================
  // سکانس ترنزیشن سینمایی و رمزگشایی اسناد پرونده
  // ==========================================
  let cyberSequenceTimeout = null;
  let hasRedirected = false;

  function doFinalWarpRedirect() {
    if (hasRedirected) return;
    hasRedirected = true;
    if (cyberSequenceTimeout) clearTimeout(cyberSequenceTimeout);
    if (currentIntroAudio) {
      try { currentIntroAudio.pause(); } catch (_) {}
    }

    const flare = document.getElementById('cyberFlashFlare');
    if (flare) flare.classList.add('flaring');

    setTimeout(() => {
      window.location.href = '/enter-code.html';
    }, 600);
  }

  function triggerCyberTransformation(customBlackoutMs) {
    if (!cyberOverlay) return;

    let actualBlackoutDuration;
    if (typeof customBlackoutMs === 'number') {
      actualBlackoutDuration = customBlackoutMs;
    } else {
      const targetBlackout = BLACKOUT_DURATION_MS;
      const now = Date.now();
      let blackoutStart = Number(sessionStorage.getItem('delivery_blackout_at') || 0);
      if (!blackoutStart || (now - blackoutStart) > (5 * 60 * 1000)) {
        blackoutStart = now;
        sessionStorage.setItem('delivery_blackout_at', String(blackoutStart));
      }
      const elapsedSoFar = now - blackoutStart;
      actualBlackoutDuration = Math.max(0, targetBlackout - elapsedSoFar);
    }

    // ۱. فاز اول: بلک‌اوت ۱۰۰٪ مطلق و خاموشی کامل نمایشگر (بدون متن، بدون کادر، بدون صدا، بدون نشانگر موس)
    document.body.classList.add('is-blackout');
    document.body.style.cursor = 'none';
    cyberOverlay.classList.remove('active-cyber');
    cyberOverlay.classList.add('active-blackout');

    cyberSequenceTimeout = setTimeout(() => {
      sessionStorage.removeItem('delivery_blackout_at');

      // ۲. فاز دوم: پایان بلک‌اوت و آغاز سکانس پیشرفته و حرفه‌ای اطلاعاتی و رمزگشایی پرونده
      document.body.classList.remove('is-blackout');
      document.body.style.cursor = '';
      cyberOverlay.classList.remove('active-blackout');
      cyberOverlay.classList.add('active-cyber');

      startTelemetryStream();
      playCyberIntroSound();

      const phaseBadge = document.getElementById('cyberPhaseBadge');
      const mainTitle = document.getElementById('cyberMainTitle');
      const subTitle = document.getElementById('cyberSubTitle');
      const termBody = document.getElementById('cyberTerminalBody');
      const progLabel = document.getElementById('cyberProgressLabel');
      const progPct = document.getElementById('cyberProgressPercent');
      const progFill = document.getElementById('cyberProgressFill');

      function addTerminalLine(text, isHighlight = false, isWarning = false) {
        if (!termBody) return;
        const line = document.createElement('div');
        line.className = 'term-line' + (isHighlight ? ' highlight' : '') + (isWarning ? ' warning' : '');
        line.textContent = text;
        termBody.appendChild(line);
        if (termBody.children.length > 5) {
          termBody.removeChild(termBody.children[0]);
        }
      }

      function updateProgress(pct, labelText) {
        if (progPct) progPct.textContent = `${numberFormat.format(pct)}٪`;
        if (progFill) progFill.style.width = `${pct}%`;
        if (progLabel && labelText) progLabel.textContent = labelText;
      }

      // سناریوی ترنزیشن ۱۴.۵ ثانیه‌ای عملیات اطلاعاتی، رمزگشایی اسناد و اتصال به درگاه
      // T = 0.5s
      setTimeout(() => {
        addTerminalLine('> [تلمتری شبکه] برقراری پیوند امن با سرور اسناد محرمانه [پروتکل TLS 1.3]...', false, false);
        updateProgress(15, 'برقراری پیوند امن با پایگاه اسناد محرمانه...');
      }, 500);

      // T = 2.2s
      setTimeout(() => {
        addTerminalLine('> [رمزنگاری] تبادل کلید امنیتی Diffie-Hellman (Curve25519) و تأیید یکپارچگی گواهی‌نامه...', true);
        if (phaseBadge) phaseBadge.textContent = 'مرحله ۰۱ // اعتبارسنجی هویت و تبادل کلید امنیتی';
        updateProgress(35, 'تأیید هویت کارآگاه و اعتبارسنجی امضای دیجیتال...');
      }, 2200);

      // T = 4.8s
      setTimeout(() => {
        addTerminalLine('> [ضداطلاعات] احراز هویت کارآگاه پرونده با موفقیت تأیید شد // کانال امنیتی پایدار گردید.', false);
        addTerminalLine('> [شنود و گزارشات] استخراج بسته‌های داده و سوابق طبقه‌بندی‌شده از بایگانی مرکزی...', true);
        if (subTitle) subTitle.textContent = 'پایگاه اسناد محرمانه پرونده ۷۱۴ متصل شد // وضعیت: فعال و ایمن';
        updateProgress(58, 'استخراج اسناد طبقه‌بندی‌شده و فایل‌های پرونده...');
      }, 4800);

      // T = 7.5s
      setTimeout(() => {
        if (phaseBadge) phaseBadge.textContent = 'مرحله ۰۲ // صدور مجوز دسترسی ارشد (CLEARANCE LEVEL 5)';
        if (mainTitle) mainTitle.textContent = 'دسترسی به پرونده تأیید شد';
        addTerminalLine('> [حفاظت اسناد] مجوز دسترسی سطح ارشد به کنسول اطلاعات و مدارک جنایی صادر شد.', true);
        addTerminalLine('> [امنیت نشست] یکپارچگی شواهد دیجیتال، گزارشات بازجویی و نوارها تأیید گردید.', false, false);
        updateProgress(78, 'بازگشایی گزارشات بازجویی و اسناد توقیف‌شده...');
      }, 7500);

      // T = 10.2s
      setTimeout(() => {
        if (phaseBadge) phaseBadge.textContent = 'مرحله ۰۳ // برقراری پایانه احراز هویت کارآگاهان';
        addTerminalLine('> [ارتباط مستقیم] پایانه رمزگشایی مدارک با موفقیت به مرکز فرماندهی متصل گردید.', true);
        addTerminalLine('> [آماده‌سازی] درگاه ورود امن کارآگاهان در حال بارگذاری نهایی روی کنسول عملیات...', false);
        updateProgress(92, 'پایدارسازی کانال امن ارتباطی با مرکز فرماندهی...');
      }, 10200);

      // T = 12.8s
      setTimeout(() => {
        addTerminalLine('>>> عملیات بارگذاری تکمیل شد. انتقال به درگاه احراز هویت در ۳... ۲... ۱...', true);
        if (phaseBadge) phaseBadge.textContent = 'پیوند امن برقرار شد // آماده انتقال';
        if (mainTitle) mainTitle.textContent = 'انتقال به درگاه ورود محرمانه';
        if (subTitle) subTitle.textContent = 'در حال بازگشایی کنسول دسترسی کارآگاهان...';
        updateProgress(100, 'درگاه امن آماده دسترسی شد.');
      }, 12800);

      // T = 14.5s
      setTimeout(() => {
        doFinalWarpRedirect();
      }, 14500);

    }, actualBlackoutDuration);
  }

  // تحویل سفارش
  window.triggerImmediateArrival = function() {
    if (isArrived) return;
    isArrived = true;
    if (timerId) clearInterval(timerId);

    document.body.dataset.phase = 'arrived';
    if (ring) ring.style.strokeDashoffset = String(CIRCLE_CIRCUMFERENCE);
    if (timerDisplay) timerDisplay.textContent = numberFormat.format(0);

    // ۱.۵ ثانیه سفارش تحویل شده نمایش داده می‌شود، سپس بلک‌اوت کامل آغاز می‌گردد
    setTimeout(() => {
      triggerCyberTransformation();
    }, 1500);
  };

  function update() {
    if (isArrived) return;

    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, TOTAL_DURATION_MS - elapsed);
    const seconds = Math.ceil(remaining / 1000);

    if (seconds !== lastSeconds) {
      if (lastSeconds !== null && seconds > 0) {
        playTickSound();
      }
      lastSeconds = seconds;
      if (timerDisplay) {
        timerDisplay.textContent = numberFormat.format(seconds);
      }
    }

    if (ring) {
      // نوار پیشرفت دایره‌ای (SVG Progress) دقیقا هماهنگ با ثانیه‌شمار از پر (۰) تا خالی (۵۶۵.۴۸) به صورت نرم کاهش می‌یابد
      const fractionRemaining = Math.max(0, Math.min(1, remaining / TOTAL_DURATION_MS));
      const offset = CIRCLE_CIRCUMFERENCE * (1 - fractionRemaining);
      ring.style.strokeDashoffset = String(offset.toFixed(2));
    }

    if (remaining <= 0) {
      window.triggerImmediateArrival();
    }
  }

  function startFlow() {
    if (isFromLogin) {
      isArrived = true;
      document.body.dataset.phase = 'intro';
      const stage = document.querySelector('.delivery-stage');
      if (stage) stage.style.display = 'none';
      const brand = document.querySelector('.delivery-brand');
      if (brand) brand.style.display = 'none';
      const footer = document.querySelector('.delivery-footer');
      if (footer) footer.style.display = 'none';

      // ورود با شماره همراه ثبت‌شده: مستقیماً بدون معطلی وارد سکانس سایبری می‌شود
      triggerCyberTransformation(200);
      return;
    }

    update();
    timerId = setInterval(update, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startFlow);
  } else {
    startFlow();
  }

  window.addEventListener('pagehide', () => {
    if (timerId) clearInterval(timerId);
  }, { once: true });
})();
