'use strict';

(() => {
  const TOTAL_DURATION_MS = 30000; // 30 ثانیه برای تحویل
  const CIRCLE_CIRCUMFERENCE = 565.48; // 2 * PI * 90
  
  // =========================================================================
  // مدت‌زمان خاموشی صفحه (بلک‌اوت) پس از تحویل:
  // در حالت نهایی و پروداکشن: ۵ دقیقه کامل = 5 * 60 * 1000 (300000 میلی‌ثانیه)
  // در حالت توسعه (Development): ۱۵ ثانیه = 15 * 1000
  // =========================================================================
  const IS_DEV_MODE = true; 
  const BLACKOUT_DURATION_MS = IS_DEV_MODE ? (15 * 1000) : (5 * 60 * 1000);

  // بررسی ورود کاربر از طریق فرم لاگین (بدون سفارش جدید گل)
  const urlParams = new URLSearchParams(window.location.search);
  const isFromLogin = urlParams.has('from') || urlParams.get('mode') === 'intro';
  // در حالت لاگین، معطلی ۳۰ ثانیه‌ای پیک و معطلی ۵ دقیقه‌ای تحویل فیزیکی بسته حذف می‌شود.
  // یک خاموشی ناگهانی تعلیقی (۲ ثانیه) داده شده و سپس اینتروی سایبری آغاز می‌گردد
  const LOGIN_BLACKOUT_MS = 2000;

  const numberFormat = new Intl.NumberFormat('fa-IR');

  let order;
  try { 
    order = JSON.parse(localStorage.getItem('golha_last_order') || 'null'); 
  } catch (_) {}

  // مبدا زمانی شمارش معکوس
  let startedAt = Date.now();
  if (order && Number.isFinite(Number(order.countdownStartedAt))) {
    const elapsed = Date.now() - Number(order.countdownStartedAt);
    if (elapsed < TOTAL_DURATION_MS) {
      startedAt = Number(order.countdownStartedAt);
    } else {
      // اگر قبلاً منقضی شده، ریست کن تا شمارش معکوس مجدداً از ۳۰ ثانیه برای تست کاربر شروع شود
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
  // موتور پخش فایل‌های صوتی واقعی و استودیویی
  // ==========================================
  let currentIntroAudio = null;

  // ۱. صدای تیک‌تاک ساعت شمارش معکوس از فایل صوتی واقعی
  function playClockTick() {
    try {
      // فایل صوتی تیک ساعت واقعی (بدون بیپ مصنوعی)
      const tick = new Audio('/assets/sounds/clock-tick.wav');
      tick.volume = 0.7;
      tick.play().catch(() => {});
    } catch (_) {}
  }

  // ۲. پخش ساندترک سینمایی و سایبری اینترو ترنسفورماتور
  function playCyberIntroSound() {
    try {
      // اگر کاربر فایل mp3 دلخواه گذاشته باشد آن را می‌خواند، در غیر اینصورت wav پیش‌فرض
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

  // فعال‌سازی دسترسی صدا در مرورگر با اولین کلیک
  ['click', 'touchstart', 'keydown', 'pointerdown'].forEach(evt => {
    window.addEventListener(evt, () => {
      // Unmute trigger
      if (currentIntroAudio && currentIntroAudio.paused) {
        currentIntroAudio.play().catch(() => {});
      }
    }, { once: true });
  });

  // ==========================================
  // انیمیشن باران کدهای ماتریکس (Matrix Rain)
  // ==========================================
  function startMatrixRain() {
    if (!matrixCanvas) return null;
    const ctx = matrixCanvas.getContext('2d');
    matrixCanvas.width = window.innerWidth;
    matrixCanvas.height = window.innerHeight;

    const chars = '0101アイウエオカキクケコサシスセソタチツテトナニヌネノ1010#$@%*&=+XYZ89';
    const fontSize = 14;
    const columns = Math.floor(matrixCanvas.width / fontSize);
    const drops = Array(columns).fill(1);

    function draw() {
      ctx.fillStyle = 'rgba(2, 7, 5, 0.12)';
      ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);

      ctx.fillStyle = '#00ff88';
      ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars.charAt(Math.floor(Math.random() * chars.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > matrixCanvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }

    const interval = setInterval(draw, 33);
    window.addEventListener('resize', () => {
      matrixCanvas.width = window.innerWidth;
      matrixCanvas.height = window.innerHeight;
    });
    return interval;
  }

  // ==========================================
  // سکانس پیشرفته ترنسفورماتور و ترنزیشن سایبری
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

    const actualBlackoutDuration = typeof customBlackoutMs === 'number' ? customBlackoutMs : BLACKOUT_DURATION_MS;

    // ۱. فاز اول: بلک‌اوت کامل (۱۵ ثانیه در حالت توسعه | ۵ دقیقه در حالت پروداکشن | ۲ ثانیه در حالت لاگین)
    cyberOverlay.classList.remove('active-cyber');
    cyberOverlay.classList.add('active-blackout');

    cyberSequenceTimeout = setTimeout(() => {
      // ۲. فاز دوم: آغاز اینترو سینمایی ترنسفورماتور و باران ماتریکس
      cyberOverlay.classList.remove('active-blackout');
      cyberOverlay.classList.add('active-cyber');

      startMatrixRain();
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
        if (progPct) progPct.textContent = `${pct}%`;
        if (progFill) progFill.style.width = `${pct}%`;
        if (progLabel && labelText) progLabel.textContent = labelText;
      }

      // سناریوی ترنزیشن ۱۵ ثانیه‌ای خط‌به‌خط
      // T = 0.5s
      setTimeout(() => {
        addTerminalLine(isFromLogin ? '> RE-AUTHENTICATION OVERRIDE DETECTED...' : '> PROTOCOL OVERRIDE DETECTED...', false, true);
        updateProgress(10, 'INTERCEPTING SIGNAL...');
      }, 500);

      // T = 2.0s
      setTimeout(() => {
        addTerminalLine('> DECONSTRUCTING CIVILIAN STORE: "فروشگاه گل و گیاه"...', false);
        if (phaseBadge) phaseBadge.textContent = 'STAGE 01 // FREQUENCY INTERCEPTION';
        updateProgress(22, 'CRACKING TLS CIPHER...');
      }, 2000);

      // T = 4.2s
      setTimeout(() => {
        addTerminalLine('> EXTRACTION KEY: #GOLHA-TO-DETECTIVE-PORTAL', true);
        addTerminalLine('> BYPASSING RSA-4096 ENCRYPTION BLOCK...', false);
        if (subTitle) subTitle.textContent = 'QUANTUM CORE SPOOLING UP // SECTOR 7';
        updateProgress(38, 'BYPASSING SECURITY FIREWALL...');
      }, 4200);

      // T = 6.8s
      setTimeout(() => {
        if (phaseBadge) phaseBadge.textContent = 'STAGE 02 // MAINFRAME TRANSFORMATION';
        if (mainTitle) mainTitle.textContent = 'MORPHING';
        addTerminalLine('> MAINFRAME LOCATED: "RAZ-E-DEHKADE // SECRET DOSSIER"', true);
        addTerminalLine('> CIVILIAN COVER PERMANENTLY TERMINATED.', false, true);
        updateProgress(58, 'TRANSFORMING REALITY MATRIX...');
      }, 6800);

      // T = 9.2s
      setTimeout(() => {
        if (phaseBadge) phaseBadge.textContent = 'STAGE 03 // QUANTUM TUNNELING';
        if (mainTitle) mainTitle.textContent = 'PORTAL CHARGING';
        addTerminalLine('> CLEARANCE LEVEL 5 GRANTED: OPERATIVE / DETECTIVE', true);
        addTerminalLine('> PREPARING CLASSIFIED CODE ENTRY PORTAL...', false);
        updateProgress(78, 'STABILIZING QUANTUM WORMHOLE...');
      }, 9200);

      // T = 12.0s
      setTimeout(() => {
        addTerminalLine('>>> QUANTUM BRIDGE STABILIZED. PREPARE FOR WARP IN 3... 2... 1...', true);
        if (phaseBadge) phaseBadge.textContent = 'SYSTEM OVERDRIVE // READY';
        if (mainTitle) mainTitle.textContent = 'WARP READY';
        if (subTitle) subTitle.textContent = 'TRANSFERRING CONSCIOUSNESS TO AGENT TERMINAL';
        updateProgress(100, 'WARP PORTAL OPENED!');
      }, 12000);

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
    if (ring) ring.style.strokeDashoffset = '0';
    if (timerDisplay) timerDisplay.textContent = numberFormat.format(0);

    // ۲.۵ ثانیه سفارش تحویل شده نمایش داده می‌شود، سپس بلک‌اوت آغاز می‌گردد
    setTimeout(() => {
      triggerCyberTransformation();
    }, 2500);
  };

  function update() {
    if (isArrived) return;

    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, TOTAL_DURATION_MS - elapsed);
    const seconds = Math.ceil(remaining / 1000);

    if (seconds !== lastSeconds) {
      if (lastSeconds !== null) {
        // پخش صدای تیک‌تاک ساعت روی هر ثانیه
        playClockTick(seconds % 2 === 0);
      }
      lastSeconds = seconds;
      if (timerDisplay) {
        timerDisplay.textContent = numberFormat.format(seconds);
      }
    }

    if (ring) {
      const progress = Math.min(1, elapsed / TOTAL_DURATION_MS);
      ring.style.strokeDashoffset = String(CIRCLE_CIRCUMFERENCE * (1 - progress));
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

      // شروع فوری خاموشی تعلیقی (۲ ثانیه) و سپس سکانس اینترو سایبری ترنسفورماتور
      triggerCyberTransformation(LOGIN_BLACKOUT_MS);
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
