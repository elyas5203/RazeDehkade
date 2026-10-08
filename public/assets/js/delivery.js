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

    const chars = '0101#$@%*&=+XYZ89';
    const fontSize = 14;
    const columns = Math.floor(matrixCanvas.width / fontSize);
    const drops = Array(columns).fill(1);

    function draw() {
      ctx.fillStyle = 'rgba(2, 7, 5, 0.12)';
      ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);

      ctx.fillStyle = 'rgba(0, 255, 136, 0.55)';
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
  // سکانس ترنزیشن سینمایی پرونده راز دهکده
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

    // ۱. فاز اول: بلک‌اوت ۱۰۰٪ مطلق و خاموشی کامل نمایشگر (بدون متن، بدون کادر، بدون صدا، بدون نشانگر موس)
    document.body.classList.add('is-blackout');
    document.body.style.cursor = 'none';
    cyberOverlay.classList.remove('active-cyber');
    cyberOverlay.classList.add('active-blackout');

    cyberSequenceTimeout = setTimeout(() => {
      // ۲. فاز دوم: پایان بلک‌اوت و آغاز سکانس سینمایی و رمزگشایی پرونده محرمانه
      document.body.classList.remove('is-blackout');
      document.body.style.cursor = '';
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
        if (progPct) progPct.textContent = `${numberFormat.format(pct)}٪`;
        if (progFill) progFill.style.width = `${pct}%`;
        if (progLabel && labelText) progLabel.textContent = labelText;
      }

      // سناریوی ترنزیشن ۱۵ ثانیه‌ای سایبری خالص و نفوذ به شبکه امنیتی
      // T = 0.5s
      setTimeout(() => {
        addTerminalLine('> [هشدار امنیتی] نفوذ به لایه شبکه شناسایی شد — دور زدن فایروال سرور...', false, true);
        updateProgress(15, 'شکستن دیواره آتشین (FIREWALL BYPASS)...');
      }, 500);

      // T = 2.2s
      setTimeout(() => {
        addTerminalLine('> استخراج بسته‌های داده و شنود فرکانس رمزنگاری‌شده TLS-4096...', true);
        if (phaseBadge) phaseBadge.textContent = 'مرحله ۰۱ // رهگیری سیگنال و تزریق اکسپلویت';
        updateProgress(35, 'شکستن کلیدهای رمزنگاری RSA/TLS...');
      }, 2200);

      // T = 4.8s
      setTimeout(() => {
        addTerminalLine('> تزریق کد نفوذ در هسته شبکه // پورت ارتباطی ۷۱۴ تسخیر گردید.', false);
        addTerminalLine('> ارتباط ماهواره‌ای تثبیت شد — دریافت تلمتری و بسته‌های محرمانه...', true);
        if (subTitle) subTitle.textContent = 'نفوذ به هسته پایگاه داده مرکزی // پورت ۷۱۴ فعال شد';
        updateProgress(58, 'استخراج تلمتری شبکه و کنترل پورت‌ها...');
      }, 4800);

      // T = 7.5s
      setTimeout(() => {
        if (phaseBadge) phaseBadge.textContent = 'مرحله ۰۲ // آزادسازی دسترسی ریشه (ROOT PRIVILEGES)';
        if (mainTitle) mainTitle.textContent = 'دسترسی سایبری تأیید شد';
        addTerminalLine('> سطح دسترسی ادمین/ریشه (ROOT) برای ترمینال صادر گردید.', true);
        addTerminalLine('> پروتکل رمزنگاری نظامی فعال — بایگانی داده‌ها در دسترس است.', false, true);
        updateProgress(78, 'آزادسازی دسترسی ریشه و پایگاه داده...');
      }, 7500);

      // T = 10.2s
      setTimeout(() => {
        if (phaseBadge) phaseBadge.textContent = 'مرحله ۰۳ // برقراری لینک مستقیم و درگاه ورودی';
        addTerminalLine('> کانال امن شنود و تبادل داده با موفقیت پیوند خورد.', true);
        addTerminalLine('> راه‌اندازی درگاه احراز هویت روی پورت اختصاصی کارآگاهان...', false);
        updateProgress(92, 'پایدارسازی لینک مستقیم با سرور مرکزی...');
      }, 10200);

      // T = 12.8s
      setTimeout(() => {
        addTerminalLine('>>> عملیات سایبری تکمیل شد. ورود به درگاه امن در ۳... ۲... ۱...', true);
        if (phaseBadge) phaseBadge.textContent = 'لینک امن برقرار شد // آماده انتقال';
        if (mainTitle) mainTitle.textContent = 'انتقال به درگاه امن';
        if (subTitle) subTitle.textContent = 'در حال بازگشایی کنسول احراز هویت...';
        updateProgress(100, 'درگاه امن آماده دسترسی شد!');
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
    if (ring) ring.style.strokeDashoffset = '0';
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
