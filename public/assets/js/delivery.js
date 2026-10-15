'use strict';

(() => {
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
      sessionPhone === '09151234567' ||
      urlParams.get('fast') === '1'
    );
  }

  // بررسی اختصاصی کلاس ۱۷ (زارع و احمدی) با کد سفارش 590019 جهت فعال‌سازی تحویل با ریزپرنده
  function checkIsDroneSession() {
    const cleanDigits = (v) => String(v || '').replace(/\D/g, '');
    const discount = String(order?.discountCode || order?.order_code || urlParams.get('discount') || urlParams.get('order_code') || urlParams.get('code') || '').trim();
    const chatCode = String(order?.chat_code || sessionStorage.getItem('prefillCode') || urlParams.get('chat_code') || '').trim();
    const sessionId = Number(order?.orderId || order?.sessionId || order?.session_id || urlParams.get('session') || urlParams.get('sessionId') || sessionStorage.getItem('session_id') || 0);
    const sessionName = String(order?.sessionName || order?.name || order?.customerName || '').trim();

    let storedSession = null;
    try {
      storedSession = JSON.parse(sessionStorage.getItem('orderSession') || 'null');
    } catch (_) {}
    const storedId = Number(storedSession?.id || 0);
    const storedCode = String(storedSession?.order_code || storedSession?.chat_code || '').trim();
    const storedName = String(storedSession?.name || '').trim();

    return (
      discount === '590019' ||
      chatCode === '699275' ||
      sessionId === 17 ||
      sessionName.includes('زارع') ||
      sessionName.includes('احمدی') ||
      storedId === 17 ||
      storedCode === '590019' ||
      storedCode === '699275' ||
      storedName.includes('زارع') ||
      storedName.includes('احمدی') ||
      urlParams.get('drone') === '1'
    );
  }

  const isDroneDelivery = checkIsDroneSession();

  // در صورت مراجعه مستقیم با پارامترهای کلاس ۱۷، اطلاعات سفارش را در حافظه محلی ذخیره کنیم
  if (isDroneDelivery && !order) {
    order = {
      orderId: 17,
      discountCode: '590019',
      chat_code: '699275',
      customerName: 'زارع و احمدی',
      countdownStartedAt: Date.now(),
    };
    try { localStorage.setItem('golha_last_order', JSON.stringify(order)); } catch (_) {}
  }

  const isTest = checkIsTestUser();
  // مدت‌زمان شمارش معکوس تحویل سفارش پیک: ۳۰ ثانیه طبق نیازمندی دقیق
  const TOTAL_DURATION_MS = isTest ? 10000 : 30000;
  const CIRCLE_CIRCUMFERENCE = 565.48; // 2 * PI * 90

  // =========================================================================
  // مدت‌زمان خاموشی صفحه (بلک‌اوت) پس از تحویل بسته:
  // ۵ دقیقه کامل (۳۰۰ ثانیه)
  // - ۱ دقیقه اول (۰ تا ۶۰ ثانیه): تاریکی ۱۰۰٪ مطلق
  // - ۴ دقیقه بعدی (۶۰ تا ۳۰۰ ثانیه): دایره سبز نئونی تپنده تاکتیکال در مرکز صفحه
  // - پایان ۵ دقیقه: شوک صوتی و بصری ناگهانی و انتقال به اسکن مدارک
  // =========================================================================
  const DEFAULT_BLACKOUT_MS = 5 * 60 * 1000; // ۵ دقیقه (۳۰۰ ثانیه)
  const TEST_USER_BLACKOUT_MS = 15 * 1000;    // ۱۵ ثانیه برای اکانت تست
  const BLACKOUT_DURATION_MS = isTest ? TEST_USER_BLACKOUT_MS : DEFAULT_BLACKOUT_MS;
  const BLACKOUT_PHASE1_MS = isTest ? 5000 : 60 * 1000; // ۱ دقیقه اول: تاریکی مطلق (۶۰ ثانیه)

  // در حالت لاگین با شماره ثبت‌شده، مستقیماً وارد اینتروی سایبری با ترنزیشن کوتاه ۱.۲ ثانیه‌ای می‌شود
  const LOGIN_BLACKOUT_MS = 1200;

  const numberFormat = new Intl.NumberFormat('fa-IR');

  let deliverySocket = null;
  try {
    if (typeof io !== 'undefined') {
      deliverySocket = io();
    }
  } catch (_) {}

  function notifyLifecyclePhase(phase, phaseLabel, secondsLeft) {
    try {
      const sId = order?.orderId || order?.sessionId || order?.session_id;
      if (deliverySocket && sId) {
        deliverySocket.emit('update_order_phase', {
          sessionId: Number(sId),
          phase,
          phaseLabel,
          secondsLeft: Number(secondsLeft) || 0,
        });
      }
    } catch (_) {}
  }

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

  function playServoReleaseSound() {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;
      if (!tickAudioCtx) tickAudioCtx = new AudioCtxClass();
      if (tickAudioCtx.state === 'suspended') tickAudioCtx.resume().catch(() => {});
      const now = tickAudioCtx.currentTime;
      const osc = tickAudioCtx.createOscillator();
      const gain = tickAudioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.14);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(tickAudioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch (_) {}
  }

  function playImpactThud() {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;
      if (!tickAudioCtx) tickAudioCtx = new AudioCtxClass();
      if (tickAudioCtx.state === 'suspended') tickAudioCtx.resume().catch(() => {});
      const now = tickAudioCtx.currentTime;
      const osc = tickAudioCtx.createOscillator();
      const gain = tickAudioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.38);

      gain.gain.setValueAtTime(0.75, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

      osc.connect(gain);
      gain.connect(tickAudioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.42);
    } catch (_) {}
  }

  function activateDroneSlide(slideId) {
    try {
      const slides = document.querySelectorAll('.drone-cinema-slide');
      slides.forEach(slide => {
        if (slide.id === slideId) {
          slide.classList.add('active');
        } else {
          slide.classList.remove('active');
        }
      });
    } catch (_) {}
  }

  // ==========================================
  // موتور پخش ساندترک سینمایی و استودیویی و ترنزیشن شوک ناگهانی
  // ==========================================
  let currentIntroAudio = null;

  function triggerShockTransition() {
    try {
      let flash = document.getElementById('cyberShockFlash');
      if (!flash) {
        flash = document.createElement('div');
        flash.id = 'cyberShockFlash';
        flash.className = 'cyber-shock-flash';
        document.body.appendChild(flash);
      }
      flash.classList.remove('is-flashing');
      void flash.offsetWidth;
      flash.classList.add('is-flashing');

      document.body.classList.remove('shock-screen-shake');
      void document.body.offsetWidth;
      document.body.classList.add('shock-screen-shake');
      setTimeout(() => {
        document.body.classList.remove('shock-screen-shake');
      }, 700);
    } catch (_) {}
  }

  // پخش ضربه ساب‌بیس و براام سینمایی هالیوودی (Hollywood Braam & Sub-Impact) همراه با شوک نوری و لرزش تصویر
  function playCyberIntroSound() {
    try {
      triggerShockTransition();

      // 1. ضربه ساب‌بیس عمیق و براام سینمایی (بدون هیچ بیپ اسباب‌بازی یا آژیر خنک)
      const braamImpact = new Audio('/assets/sounds/tactical-alarm.wav');
      braamImpact.volume = 1.0;
      braamImpact.play().catch(() => {});

      // 2. ساندترک دارک دلهره‌آور جاسوسی/سایبری
      const wav = new Audio('/assets/sounds/cyber-intro.wav');
      wav.volume = 0.85;
      wav.play().then(() => {
        currentIntroAudio = wav;
      }).catch(() => {
        const mp3 = new Audio('/assets/sounds/cyber-intro.mp3');
        mp3.volume = 0.85;
        mp3.play().catch(() => {});
        currentIntroAudio = mp3;
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
  // موتور انیمیشن و تلمتری تاکتیکال کاک‌پیت (Cockpit Telemetry Engine)
  // ==========================================
  const telemetryIntervals = [];

  function initCockpitTelemetry() {
    // 1. ساعت نظامی UTC
    const clockEl = document.getElementById('hudClockDisplay');
    function updateClock() {
      if (!clockEl) return;
      const d = new Date();
      const h = String(d.getUTCHours()).padStart(2, '0');
      const m = String(d.getUTCMinutes()).padStart(2, '0');
      const s = String(d.getUTCSeconds()).padStart(2, '0');
      clockEl.textContent = `${h}:${m}:${s} UTC`;
    }
    updateClock();
    const clockTimer = setInterval(updateClock, 1000);
    telemetryIntervals.push(clockTimer);

    // 2. چرخش هش زنده SHA-256 و نانس
    const hashValEl = document.getElementById('rollingHashVal');
    const nonceEl = document.getElementById('rollingNonce');
    let nonceCounter = 0x90BFA;
    const hexChars = '0123456789abcdef';
    const hashTimer = setInterval(() => {
      if (hashValEl) {
        let fake = '';
        for (let i = 0; i < 12; i++) fake += hexChars[Math.floor(Math.random() * 16)];
        hashValEl.textContent = fake + '...';
      }
      if (nonceEl) {
        nonceCounter = (nonceCounter + Math.floor(Math.random() * 7) + 1) & 0xFFFFFF;
        nonceEl.textContent = '0x' + nonceCounter.toString(16).toUpperCase();
      }
    }, 150);
    telemetryIntervals.push(hashTimer);

    // 3. چرخش کلید عمومی موقت Curve25519
    const pubKeyEl = document.getElementById('pubKeyStream');
    if (pubKeyEl) {
      const pubTimer = setInterval(() => {
        let p = '';
        for (let i = 0; i < 4; i++) p += hexChars[Math.floor(Math.random() * 16)];
        p += '...';
        for (let i = 0; i < 4; i++) p += hexChars[Math.floor(Math.random() * 16)];
        pubKeyEl.textContent = p;
      }, 900);
      telemetryIntervals.push(pubTimer);
    }

    // 4. موتاسیون بایت‌های دامپ رم
    const hexMatrixEl = document.getElementById('hexDumpMatrix');
    if (hexMatrixEl) {
      const hexLines = [
        '0x7FFE00: 4A 6F 72 20 64 65 68 6B',
        '0x7FFE08: 61 64 65 20 53 49 47 49',
        '0x7FFE10: 4E 54 20 4E 4F 46 4F 52',
        '0x7FFE18: 4E 20 37 31 34 20 4F 4B',
        '0x7FFE20: 8F 2A 1B 9C 00 E4 18 90',
        '0x7FFE28: A1 7B 42 FF 8C 19 33 04',
      ];
      const hexTimer = setInterval(() => {
        const randomLineIdx = Math.floor(Math.random() * hexLines.length);
        const parts = hexLines[randomLineIdx].split(': ');
        if (!parts[1]) return;
        const bytes = parts[1].split(' ');
        const randomByteIdx = Math.floor(Math.random() * bytes.length);
        bytes[randomByteIdx] = hexChars[Math.floor(Math.random() * 16)].toUpperCase() + hexChars[Math.floor(Math.random() * 16)].toUpperCase();
        hexLines[randomLineIdx] = parts[0] + ': ' + bytes.join(' ');
        
        hexMatrixEl.innerHTML = hexLines.map(line => `<code>${line}</code>`).join('');
      }, 160);
      telemetryIntervals.push(hexTimer);
    }

    // 5. اسیلوسکوپ امواج شنود صوتی (Waveform Canvas)
    const waveCanvas = document.getElementById('waveformCanvas');
    if (waveCanvas) {
      const wCtx = waveCanvas.getContext('2d');
      let wavePhase = 0;
      function drawWave() {
        if (!cyberOverlay || !cyberOverlay.classList.contains('active-cyber')) return;
        const w = waveCanvas.width;
        const h = waveCanvas.height;
        wCtx.fillStyle = 'rgba(4, 7, 12, 0.4)';
        wCtx.fillRect(0, 0, w, h);

        wCtx.lineWidth = 1.5;
        wCtx.strokeStyle = '#38bdf8';
        wCtx.beginPath();

        const mid = h / 2;
        wavePhase += 0.08;

        for (let x = 0; x < w; x++) {
          const y = mid + Math.sin(x * 0.09 + wavePhase) * (h * 0.28) * Math.sin(x * 0.03 + wavePhase * 0.5);
          if (x === 0) wCtx.moveTo(x, y);
          else wCtx.lineTo(x, y);
        }
        wCtx.stroke();
        requestAnimationFrame(drawWave);
      }
      requestAnimationFrame(drawWave);
    }
  }

  // ==========================================
  // سکانس ترنزیشن سینمایی و رمزگشایی اسناد پرونده
  // ==========================================
  let cyberSequenceTimeout = null;
  let hasRedirected = false;

  function doFinalWarpRedirect() {
    if (hasRedirected) return;
    hasRedirected = true;
    removeGreenBeacon();
    if (cyberSequenceTimeout) clearTimeout(cyberSequenceTimeout);
    telemetryIntervals.forEach(clearInterval);
    if (currentIntroAudio) {
      try { currentIntroAudio.pause(); } catch (_) {}
    }

    const flare = document.getElementById('cyberFlashFlare');
    if (flare) flare.classList.add('flaring');

    notifyLifecyclePhase('portal_login', '🔐 درگاه ورود محرمانه // در انتظار کد بسته');

    setTimeout(() => {
      window.location.href = '/enter-code.html';
    }, 600);
  }

  let greenBeaconEl = null;
  let phase2Timeout = null;

  function removeGreenBeacon() {
    if (phase2Timeout) {
      clearTimeout(phase2Timeout);
      phase2Timeout = null;
    }
    const beacon = document.getElementById('blackoutPulsingRadarDot');
    if (beacon) {
      beacon.classList.remove('active');
      beacon.remove();
    }
    greenBeaconEl = null;
  }

  function ensureGreenBeacon() {
    let beacon = document.getElementById('blackoutPulsingRadarDot');
    if (!beacon) {
      beacon = document.createElement('div');
      beacon.id = 'blackoutPulsingRadarDot';
      beacon.className = 'blackout-radar-beacon';
      beacon.innerHTML = `
        <div class="radar-beacon-center">
          <div class="radar-ping-ring"></div>
          <div class="radar-core-dot"></div>
        </div>
      `;
      document.body.appendChild(beacon);
    }
    greenBeaconEl = beacon;
    return beacon;
  }

  function triggerCyberTransformation(customBlackoutMs) {
    if (!cyberOverlay) return;

    let actualBlackoutDuration;
    let targetBlackout = BLACKOUT_DURATION_MS;
    if (typeof customBlackoutMs === 'number') {
      actualBlackoutDuration = customBlackoutMs;
      targetBlackout = customBlackoutMs;
    } else {
      const now = Date.now();
      let blackoutStart = Number(sessionStorage.getItem('delivery_blackout_at') || 0);
      if (!blackoutStart || (now - blackoutStart) > (6 * 60 * 1000)) {
        blackoutStart = now;
        sessionStorage.setItem('delivery_blackout_at', String(blackoutStart));
      }
      const elapsedSoFar = now - blackoutStart;
      actualBlackoutDuration = Math.max(0, targetBlackout - elapsedSoFar);
    }

    // ۱. پاکسازی هرگونه بیکن یا دایره قبلی قبل از شروع فاز جدید
    removeGreenBeacon();

    // فاز اول: بلک‌اوت ۱۰۰٪ مطلق و خاموشی کامل نمایشگر (بدون متن، بدون کادر، بدون صدا، بدون نشانگر موس)
    document.body.classList.add('is-blackout');
    document.body.style.cursor = 'none';
    cyberOverlay.classList.remove('active-cyber');
    cyberOverlay.classList.add('active-blackout');
    notifyLifecyclePhase('blackout_phase1', '🌑 صفحه سیاه (بلک‌اوت فاز ۱ - تاریکی کامل)');

    // زمان‌بندی فعال‌سازی دایره سبز نئونی تپنده: ۱ دقیقه اول تاریکی کامل، سپس ۴ دقیقه بعد دایره سبز تپنده
    const currentElapsed = targetBlackout - actualBlackoutDuration;
    const timeUntilPhase2 = Math.max(0, BLACKOUT_PHASE1_MS - currentElapsed);

    let blackoutTicker = setInterval(() => {
      if (!document.body.classList.contains('is-blackout')) {
        clearInterval(blackoutTicker);
        return;
      }
      const curNow = Date.now();
      const bStart = Number(sessionStorage.getItem('delivery_blackout_at') || curNow);
      const passed = curNow - bStart;
      const leftSec = Math.max(0, Math.round((targetBlackout - passed) / 1000));
      const isPhase2 = passed >= BLACKOUT_PHASE1_MS;
      notifyLifecyclePhase(
        isPhase2 ? 'blackout_phase2' : 'blackout_phase1',
        isPhase2 ? '🟢 بلک‌اوت (رادار سبز)' : '🌑 بلک‌اوت (تاریکی کامل)',
        leftSec
      );
      if (leftSec <= 0) {
        clearInterval(blackoutTicker);
      }
    }, 1000);

    if (phase2Timeout) clearTimeout(phase2Timeout);

    // بررسی دقیق فعال‌سازی فاز ۲ (دایره سبز تپنده):
    if (actualBlackoutDuration > 0) {
      if (currentElapsed < BLACKOUT_PHASE1_MS) {
        // هنوز در ۱ دقیقه اول هستیم؛ پس از سپری شدن زمان باقی‌مانده فاز ۱، دایره سبز فعال شود
        if (actualBlackoutDuration > timeUntilPhase2) {
          phase2Timeout = setTimeout(() => {
            if (document.body.classList.contains('is-blackout')) {
              const beacon = ensureGreenBeacon();
              beacon.classList.add('active');
              notifyLifecyclePhase('blackout_phase2', '🟢 صفحه سیاه (بلک‌اوت فاز ۲ - دایره سبز تپنده)');
            }
          }, timeUntilPhase2);
        }
      } else if (currentElapsed < targetBlackout) {
        // بیش از ۱ دقیقه سپری شده؛ دایره سبز فوراً در فاز ۲ نمایش داده شود
        const beacon = ensureGreenBeacon();
        beacon.classList.add('active');
        notifyLifecyclePhase('blackout_phase2', '🟢 صفحه سیاه (بلک‌اوت فاز ۲ - دایره سبز تپنده)');
      }
    }

    cyberSequenceTimeout = setTimeout(() => {
      clearInterval(blackoutTicker);
      sessionStorage.removeItem('delivery_blackout_at');
      
      // حذف کامل، قطعی و آنی دایره سبز از صفحه به محض آغاز اسکن سایبری
      removeGreenBeacon();

      // ۲. فاز دوم: پایان ۵ دقیقه بلک‌اوت و آغاز سکانس اطلاعاتی با صدای رسا و اسکن سایبری
      document.body.classList.remove('is-blackout');
      document.body.style.cursor = '';
      cyberOverlay.classList.remove('active-blackout');
      cyberOverlay.classList.add('active-cyber');
      notifyLifecyclePhase('cyber_scanning', '⚡ اسکن سایبری و رمزگشایی مدارک');

      startTelemetryStream();
      initCockpitTelemetry();
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

  let currentDroneStage = null;
  let hasDroneDropped = false;
  let hasDroneLanded = false;

  // تحویل سفارش
  window.triggerImmediateArrival = function() {
    if (isArrived) return;
    isArrived = true;
    if (timerId) clearInterval(timerId);

    document.body.dataset.phase = 'arrived';
    if (ring) ring.style.strokeDashoffset = String(CIRCLE_CIRCUMFERENCE);
    if (timerDisplay) timerDisplay.textContent = numberFormat.format(0);

    if (isDroneDelivery) {
      const arrTitle = document.getElementById('arrivedTitle');
      const arrSub = document.getElementById('arrivedSub');
      const pkgIcon = document.getElementById('packageIconWrap');
      const flirArrivalBanner = document.getElementById('flirArrivalBanner');
      const flirCornerTimerDigits = document.getElementById('flirCornerTimerDigits');
      const flirCornerTimerFill = document.getElementById('flirCornerTimerFill');
      const flirCornerPhaseTag = document.getElementById('flirCornerPhaseTag');
      const arrivalBlackoutSec = document.getElementById('arrivalBlackoutSec');

      if (arrTitle) arrTitle.textContent = 'سفارش در محل تحویل تحویل داده شد!';
      if (arrSub) arrSub.textContent = 'مختصات محل تحویل بسته (کوچه شهید کاوه ۱۳ مشهد) تثبیت و سفارش با موفقیت تحویل گردید.';
      if (pkgIcon) {
        pkgIcon.innerHTML = '<span style="font-size: 32px; color: #10b981; font-weight: 900;">✓</span>';
      }

      // نمایش بنر اختصاصی و واضح تحویل در نمایشگر با تثبیت مختصات
      if (flirArrivalBanner) {
        flirArrivalBanner.style.display = 'flex';
      }
      if (flirCornerTimerDigits) {
        flirCornerTimerDigits.textContent = '00';
      }
      if (flirCornerTimerFill) {
        flirCornerTimerFill.style.width = '0%';
      }
      if (flirCornerPhaseTag) {
        flirCornerPhaseTag.textContent = 'DELIVERY CONFIRMED';
      }

      let bannerRemainingSec = 8;
      if (arrivalBlackoutSec) arrivalBlackoutSec.textContent = String(bannerRemainingSec);
      const bannerInterval = setInterval(() => {
        bannerRemainingSec--;
        if (arrivalBlackoutSec && bannerRemainingSec >= 0) {
          arrivalBlackoutSec.textContent = String(bannerRemainingSec);
        }
        if (bannerRemainingSec <= 0) {
          clearInterval(bannerInterval);
        }
      }, 1000);

      // ۸.۰ ثانیه سفارش تحویل شده و آدرس کامل کوچه کاوه ۱۳ نمایش داده می‌شود تا کاربر با آرامش بخواند
      setTimeout(() => {
        clearInterval(bannerInterval);
        triggerCyberTransformation();
      }, 8000);
      return;
    }

    // برای سایر کلاس‌های عادی:
    setTimeout(() => {
      triggerCyberTransformation();
    }, 2000);
  };

  // موتور رندر پیوسته و بدون پله زوم ماهواره‌ای (Continuous 60FPS Satellite Recon Zoom Engine)
  function renderContinuousReconZoom(ratio) {
    const s1 = document.getElementById('slideTakeoff');
    const s2 = document.getElementById('slideTransit');
    const s3 = document.getElementById('slideDrop');
    const s4 = document.getElementById('slideLanded');
    if (!s1 || !s2 || !s3 || !s4) return;

    // لایه ۱: کره زمین در فضا (نسبت ۰.۰۰ تا ۰.۳۲)
    if (ratio <= 0.32) {
      const p1 = ratio / 0.32;
      const scale1 = 1.0 + p1 * 1.55; // 1.0 -> 2.55
      s1.style.transform = `scale(${scale1.toFixed(3)})`;
      const op1 = ratio < 0.20 ? 1 : Math.max(0, 1 - (ratio - 0.20) / 0.12);
      s1.style.opacity = op1.toFixed(2);
    } else {
      s1.style.opacity = '0';
    }

    // لایه ۲: افق منطقه‌ای مشهد (نسبت ۰.۱۶ تا ۰.۶۶)
    if (ratio >= 0.16 && ratio <= 0.67) {
      const p2 = (ratio - 0.16) / (0.67 - 0.16);
      const scale2 = 0.95 + p2 * 1.55; // 0.95 -> 2.50
      s2.style.transform = `scale(${scale2.toFixed(3)})`;
      let op2 = 1;
      if (ratio < 0.28) {
        op2 = (ratio - 0.16) / 0.12;
      } else if (ratio > 0.52) {
        op2 = Math.max(0, 1 - (ratio - 0.52) / 0.15);
      }
      s2.style.opacity = Math.max(0, Math.min(1, op2)).toFixed(2);
    } else {
      s2.style.opacity = '0';
    }

    // لایه ۳: بافت ماهواره‌ای رضاشهر و بلوار کاوه (نسبت ۰.۴۶ تا ۰.۸۸)
    if (ratio >= 0.46 && ratio <= 0.88) {
      const p3 = (ratio - 0.46) / (0.88 - 0.46);
      const scale3 = 0.94 + p3 * 1.40; // 0.94 -> 2.34
      s3.style.transform = `translate(-65.95%, -71.73%) scale(${scale3.toFixed(3)})`;
      let op3 = 1;
      if (ratio < 0.58) {
        op3 = (ratio - 0.46) / 0.12;
      } else if (ratio > 0.74) {
        op3 = Math.max(0, 1 - (ratio - 0.74) / 0.14);
      }
      s3.style.opacity = Math.max(0, Math.min(1, op3)).toFixed(2);
    } else {
      s3.style.opacity = '0';
    }

    // لایه ۴: نقشه خیابانی شفاف با نام دقیق کوچه‌ها (نسبت ۰.۶۸ تا ۱.۰۰)
    if (ratio >= 0.68) {
      const p4 = Math.min(1, (ratio - 0.68) / 0.32);
      const scale4 = 0.88 + p4 * 0.20; // 0.88 -> 1.08
      s4.style.transform = `translate(-65.95%, -71.73%) scale(${scale4.toFixed(3)})`;
      const op4 = Math.min(1, (ratio - 0.68) / 0.12);
      s4.style.opacity = op4.toFixed(2);
    } else {
      s4.style.opacity = '0';
    }
  }

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

    // هدایت فازها، تیترها و تلمتری زوم ماهواره‌ای از فضا تا کوچه کاوه ۱۳ مشهد (کلاس ۱۷)
    if (isDroneDelivery) {
      const droneSection = document.getElementById('droneDeliverySection');
      const droneStatusTitle = document.getElementById('droneStatusTitle');
      const droneMissionNote = document.getElementById('droneMissionNote');
      const droneHeaderTimer = document.getElementById('droneTimerSec');
      const droneAltVal = document.getElementById('droneAltVal');
      const droneSpeedVal = document.getElementById('droneSpeedVal');
      const flirZoomVal = document.getElementById('flirZoomVal');
      const flirFovVal = document.getElementById('flirFovVal');
      const flirPitchVal = document.getElementById('flirPitchVal');
      const flirActuatorVal = document.getElementById('flirActuatorVal');
      const flirClockDisplay = document.getElementById('flirClockDisplay');
      const reticleLockStatus = document.getElementById('reticleLockStatus');

      const flirCornerTimerDigits = document.getElementById('flirCornerTimerDigits');
      const flirCornerTimerMs = document.getElementById('flirCornerTimerMs');
      const flirCornerTimerFill = document.getElementById('flirCornerTimerFill');
      const flirCornerPhaseTag = document.getElementById('flirCornerPhaseTag');

      if (flirCornerTimerDigits) {
        flirCornerTimerDigits.textContent = String(seconds).padStart(2, '0');
      }
      if (flirCornerTimerMs) {
        const sub = Math.floor((remaining % 1000) / 100);
        flirCornerTimerMs.textContent = `.${sub}`;
      }
      if (flirCornerTimerFill) {
        const pct = Math.max(0, Math.min(100, (remaining / TOTAL_DURATION_MS) * 100));
        flirCornerTimerFill.style.width = `${pct.toFixed(1)}%`;
      }

      if (droneHeaderTimer) {
        droneHeaderTimer.textContent = numberFormat.format(seconds);
      }

      if (flirClockDisplay) {
        const d = new Date();
        const hh = String(d.getUTCHours()).padStart(2, '0');
        const mm = String(d.getUTCMinutes()).padStart(2, '0');
        const ss = String(d.getUTCSeconds()).padStart(2, '0');
        const ms = Math.floor(d.getUTCMilliseconds() / 100);
        flirClockDisplay.textContent = `${hh}:${mm}:${ss}.${ms} UTC`;
      }

      if (droneSection) {
        const ratio = Math.min(1, Math.max(0, elapsed / TOTAL_DURATION_MS));
        renderContinuousReconZoom(ratio);

        let newStage = 'takeoff';
        if (ratio < 0.25) {
          newStage = 'takeoff'; // فاز ۱: مدار فضایی زمین
        } else if (ratio < 0.50) {
          newStage = 'transit'; // فاز ۲: ورود به جو ایران و افق مشهد
        } else if (ratio < 0.75) {
          newStage = 'kaveh';   // فاز ۳: بافت ماهواره‌ای رضاشهر و بلوار کاوه
        } else {
          newStage = 'airdrop'; // فاز ۴: نقشه خیابانی شفاف کوچه کاوه ۱۳ و فرود پین
        }

        if (newStage !== currentDroneStage) {
          currentDroneStage = newStage;
          droneSection.classList.remove('stage-takeoff', 'stage-transit', 'stage-kaveh', 'stage-airdrop');
          droneSection.classList.add(`stage-${newStage}`);

          if (newStage === 'takeoff') {
            activateDroneSlide('slideTakeoff');
            if (flirCornerPhaseTag) flirCornerPhaseTag.textContent = 'ORBITAL RECON';
            if (droneStatusTitle) droneStatusTitle.textContent = 'رهگیری ماهواره‌ای مختصات هدف // شناسایی محل تحویل بسته';
            if (droneMissionNote) droneMissionNote.textContent = 'ماهواره شناسایی در مدار زمین فعال شد // آغاز تقرب اپتیکال به مختصات محل تحویل بسته (۳۶.۲۸۳۸ , ۵۹.۵۴۵۸)';
            if (flirZoomVal) flirZoomVal.textContent = '1.0X GLOBE';
            if (flirFovVal) flirFovVal.textContent = '120° ORBIT';
            if (flirActuatorVal) flirActuatorVal.textContent = 'GPS: 36.2838N 59.5458E';
            if (reticleLockStatus) reticleLockStatus.textContent = 'ACQUIRING MASHHAD...';
            notifyLifecyclePhase('satellite_orbital', 'رهگیری ماهواره‌ای // شناسایی محل تحویل بسته', seconds);
          } else if (newStage === 'transit') {
            activateDroneSlide('slideTransit');
            if (flirCornerPhaseTag) flirCornerPhaseTag.textContent = 'ATMOSPHERIC RE-ENTRY';
            if (droneStatusTitle) droneStatusTitle.textContent = 'تقرب مداری به حریم هوایی مشهد // کاهش ارتفاع عملیاتی';
            if (droneMissionNote) droneMissionNote.textContent = 'ورود به جو و اسکن لایه‌های هوایی مشهد // تمرکز بر محور جنوب‌غربی و منطقه رضاشهر.';
            if (flirZoomVal) flirZoomVal.textContent = '12X REGIONAL';
            if (flirFovVal) flirFovVal.textContent = '45° MASHHAD';
            if (flirActuatorVal) flirActuatorVal.textContent = 'SENSOR: MULTISPECTRAL';
            if (reticleLockStatus) reticleLockStatus.textContent = 'TRACKING REZA SHAHR...';
            notifyLifecyclePhase('satellite_reentry', 'تقرب به مشهد // کاهش ارتفاع عملیاتی', seconds);
          } else if (newStage === 'kaveh') {
            activateDroneSlide('slideDrop');
            if (flirCornerPhaseTag) flirCornerPhaseTag.textContent = 'APPROACH KAVEH';
            if (droneStatusTitle) droneStatusTitle.textContent = 'تثبیت ماهواره‌ای روی منطقه ۹ و رضاشهر // تقرب به بلوار کاوه';
            if (droneMissionNote) droneMissionNote.textContent = 'تفکیک معابر و خیابان‌های فرعی در محور بلوار شهید کاوه و رودکی // آماده‌سازی تثبیت محل تحویل بسته.';
            if (flirZoomVal) flirZoomVal.textContent = '45X TACTICAL';
            if (flirFovVal) flirFovVal.textContent = '18° STREET';
            if (flirActuatorVal) flirActuatorVal.textContent = 'SECTOR: KAVEH BLVD';
            if (reticleLockStatus) reticleLockStatus.textContent = 'LOCKING KAVEH 13...';
            notifyLifecyclePhase('satellite_kaveh', 'بلوار کاوه // تقرب به کوچه ۱۳', seconds);
          } else if (newStage === 'airdrop') {
            activateDroneSlide('slideLanded');
            if (flirCornerPhaseTag) flirCornerPhaseTag.textContent = 'PINPOINT LOCKED';
            if (droneStatusTitle) droneStatusTitle.textContent = 'موقعیت مکانی محل تحویل بسته با موفقیت تثبیت شد';
            if (droneMissionNote) droneMissionNote.textContent = 'محل تحویل بسته: مشهد، بلوار شهید کاوه، کوچه شهید کاوه ۱۳ (رودکی ۲۰) // تحویل در این نقطه انجام شد.';
            if (flirZoomVal) flirZoomVal.textContent = '120X STREET';
            if (flirFovVal) flirFovVal.textContent = '05° KAVEH 13';
            if (flirActuatorVal) flirActuatorVal.textContent = 'CONFIRMED: ROUDAKI 20';
            if (reticleLockStatus) reticleLockStatus.textContent = 'TARGET LOCKED [100%]';
            notifyLifecyclePhase('satellite_locked', 'محل تحویل بسته // کوچه شهید کاوه ۱۳ (رودکی ۲۰)', seconds);
          }
        }

        // انیمیشن فرود آمدن پین هدف و کارت آدرس در فاز ۴:
        if (newStage === 'airdrop') {
          if (!hasDroneDropped) {
            hasDroneDropped = true;
            playServoReleaseSound();
          }
          if (!hasDroneLanded) {
            hasDroneLanded = true;
            playImpactThud();
            const screenFrame = document.getElementById('flirScreenFrame');
            if (screenFrame) {
              screenFrame.classList.remove('impact-screen-shake');
              void screenFrame.offsetWidth;
              screenFrame.classList.add('impact-screen-shake');
            }
          }
        }

        // تلمتری زنده متغیر بر اساس فاز زوم ماهواره
        if (newStage === 'takeoff') {
          const alt = Math.round(35420 - (ratio / 0.25) * 34220);
          if (droneAltVal) droneAltVal.textContent = `ALT: ${alt.toLocaleString('en-US')} km`;
          if (droneSpeedVal) droneSpeedVal.textContent = 'VEL: 7.8 km/s';
          if (flirPitchVal) flirPitchVal.textContent = '-89.4° (NADIR)';
        } else if (newStage === 'transit') {
          const alt = Math.round(18500 - ((ratio - 0.25) / 0.25) * 14000);
          if (droneAltVal) droneAltVal.textContent = `ALT: ${alt.toLocaleString('en-US')} m`;
          if (droneSpeedVal) droneSpeedVal.textContent = 'MACH 2.4';
          if (flirPitchVal) flirPitchVal.textContent = '-72.1° (DESCENT)';
        } else if (newStage === 'kaveh') {
          const alt = Math.round(4500 - ((ratio - 0.50) / 0.25) * 3850);
          if (droneAltVal) droneAltVal.textContent = `ALT: ${alt} m`;
          if (droneSpeedVal) droneSpeedVal.textContent = 'GS: 180 km/h';
          if (flirPitchVal) flirPitchVal.textContent = '-45.0° (OPTICAL)';
        } else {
          if (droneAltVal) droneAltVal.textContent = 'LAT: 36.2838°N  LON: 59.5458°E'; /* 36.28379888932916, 59.545839183469155 | ref: 36.2843, 59.5448 */
          if (droneSpeedVal) droneSpeedVal.textContent = 'PINPOINT LOCK [OK]';
          if (flirPitchVal) flirPitchVal.textContent = 'STREET ZOOM: 100%';
        }
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

    if (isDroneDelivery) {
      document.body.classList.add('is-drone-mode');
      const courierStepDot = document.getElementById('courierStepDot');
      const courierStepLabel = document.getElementById('courierStepLabel');
      if (courierStepDot) courierStepDot.textContent = '🎯';
      if (courierStepLabel) courierStepLabel.textContent = 'پایش هوایی و تحویل با ریزپرنده';
      const timerSubtitle = document.getElementById('timerSubtitle');
      if (timerSubtitle) timerSubtitle.textContent = 'ثانیه تا رهایش محموله روی پشت‌بوم';

      function smoothReconRaf() {
        if (!isArrived) {
          const el = Date.now() - startedAt;
          const r = Math.min(1, Math.max(0, el / TOTAL_DURATION_MS));
          renderContinuousReconZoom(r);
          requestAnimationFrame(smoothReconRaf);
        }
      }
      requestAnimationFrame(smoothReconRaf);
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
