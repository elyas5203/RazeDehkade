'use strict';

(() => {
  let order;
  try { 
    order = JSON.parse(localStorage.getItem('golha_last_order') || 'null'); 
  } catch (_) {}

  // مبدا زمانی شمارش معکوس
  let startedAt = Date.now();
  if (order && Number.isFinite(Number(order.countdownStartedAt))) {
    startedAt = Number(order.countdownStartedAt);
  }

  // اگر زمان قبلی منقضی شده یا وجود ندارد، زمان جدید ست کن تا شمارش معکوس از ابتدا اجرا شود
  if (Date.now() - startedAt >= TOTAL_DURATION_MS) {
    startedAt = Date.now();
    if (order) {
      order.countdownStartedAt = startedAt;
      localStorage.setItem('golha_last_order', JSON.stringify(order));
    }
  } else if (order && !order.countdownStartedAt) {
    order.countdownStartedAt = startedAt;
    localStorage.setItem('golha_last_order', JSON.stringify(order));
  }

  const numberFormat = new Intl.NumberFormat('fa-IR');
  const TOTAL_DURATION_MS = 30000; // 30 ثانیه برای تحویل
  const CIRCLE_CIRCUMFERENCE = 565.48; // 2 * PI * 90

  // مدت زمان بلک‌اوت (۲۰ ثانیه در حالت توسعه طبق دستور کاربر)
  // در حالت نهایی ۵ دقیقه خواهد بود: 5 * 60 * 1000
  const BLACKOUT_DURATION_MS = 20 * 1000;

  let isArrived = false;
  let timerId = null;
  let lastSeconds = null;

  const timerDisplay = document.getElementById('timerDisplay');
  const ring = document.getElementById('delivery-ring');
  const cyberOverlay = document.getElementById('cyberOverlay');
  const matrixCanvas = document.getElementById('matrixCanvas');
  const cyberTerminalText = document.getElementById('cyberTerminalText');
  const cyberProgressFill = document.getElementById('cyberProgressFill');

  // ==========================================
  // سیستم تولید صدای تیک‌تاک ساعت با Web Audio API
  // ==========================================
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // ایجاد صدای دقیق تیک و تاک مکانیکی ساعت
  function playClockTick(isTick) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      const now = ctx.currentTime;
      // تیک با فرکانس بالاتر، تاک با فرکانس گرم‌تر و چوبی‌تر
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isTick ? 1250 : 880, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.035);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(isTick ? 1400 : 950, now);
      filter.Q.setValueAtTime(5, now);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.038);
    } catch (_) {}
  }

  // صدای دیجیتال و سایبری روشن شدن و تبدیل سیستم
  function playCyberTransitionSound() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // ساب‌بیس سنگین پاورآپ
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(45, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 1.2);
      osc.frequency.exponentialRampToValueAtTime(80, now + 2.5);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(3500, now + 1.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 3.2);

      // نویز گلیچ دیجیتال
      const bufferSize = ctx.sampleRate * 0.4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18, now + 0.1);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now + 0.1);
    } catch (_) {}
  }

  // فعال‌سازی صدا با هر کلیک یا تعامل اولیه
  ['click', 'touchstart', 'keydown'].forEach(evt => {
    window.addEventListener(evt, () => getAudioContext(), { once: true });
  });

  // ==========================================
  // انیمیشن باران کدهای ماتریکس (Matrix Rain)
  // ==========================================
  function startMatrixRain() {
    if (!matrixCanvas) return;
    const ctx = matrixCanvas.getContext('2d');
    matrixCanvas.width = window.innerWidth;
    matrixCanvas.height = window.innerHeight;

    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノ101010#$@%*&=+XYZ89';
    const fontSize = 14;
    const columns = Math.floor(matrixCanvas.width / fontSize);
    const drops = Array(columns).fill(1);

    function draw() {
      ctx.fillStyle = 'rgba(3, 8, 6, 0.12)';
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
  // اجرای سکانس بلک‌اوت و ترنزیشن سایبری
  // ==========================================
  function triggerCyberTransformation() {
    if (!cyberOverlay) return;

    // ۱. صفحه کاملاً سیاه می‌شود (بلک‌اوت به مدت ۲۰ ثانیه در حالت دولوپ)
    cyberOverlay.classList.remove('active-cyber');
    cyberOverlay.classList.add('active-blackout');

    setTimeout(() => {
      // ۲. صفحه سیاه یهو روشن می‌شود با وایب سایبری / ترنسفورماتور
      cyberOverlay.classList.remove('active-blackout');
      cyberOverlay.classList.add('active-cyber');

      playCyberTransitionSound();
      startMatrixRain();

      // تایپ متن‌های هکری و افزایش لودینگ
      const steps = [
        { text: 'SYSTEM REBOOT // DECRYPTING ACCESS LINK...', progress: 25 },
        { text: 'SECURITY OVERRIDE DETECTED... TRANSFORMATION IN PROGRESS', progress: 55 },
        { text: 'ESTABLISHING SECURE PROTOCOL: RAZ-E-DEHKADE...', progress: 85 },
        { text: 'ACCESS GRANTED // REDIRECTING TO OPERATIVE PORTAL...', progress: 100 }
      ];

      steps.forEach((step, idx) => {
        setTimeout(() => {
          if (cyberTerminalText) cyberTerminalText.textContent = step.text;
          if (cyberProgressFill) cyberProgressFill.style.width = `${step.progress}%`;
        }, idx * 1000);
      });

      // ۳. انتقال نهایی به صفحه ورود کد بعد از انیمیشن سایبری
      setTimeout(() => {
        window.location.href = '/enter-code.html';
      }, 4500);

    }, BLACKOUT_DURATION_MS);
  }

  // تحویل سفارش
  window.triggerImmediateArrival = function() {
    if (isArrived) return;
    isArrived = true;
    if (timerId) clearInterval(timerId);

    document.body.dataset.phase = 'arrived';
    if (ring) ring.style.strokeDashoffset = '0';

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

  update();
  timerId = setInterval(update, 100);

  window.addEventListener('pagehide', () => {
    if (timerId) clearInterval(timerId);
  }, { once: true });
})();
