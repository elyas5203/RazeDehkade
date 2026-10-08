'use strict';

(() => {
  const TOTAL_DURATION_MS = 30000; // 30 ثانیه برای تحویل
  const CIRCLE_CIRCUMFERENCE = 565.48; // 2 * PI * 90
  const BLACKOUT_DURATION_MS = 20 * 1000; // مدت زمان بلک‌اوت (۲۰ ثانیه در حالت توسعه طبق دستور کاربر)
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
  // موتور سنتز صداهای سینمایی و سایبری با Web Audio API
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

  // فعال‌سازی بیدرنگ کانتکست صدا با هرگونه تعامل کاربر
  ['click', 'touchstart', 'keydown', 'pointerdown'].forEach(evt => {
    window.addEventListener(evt, () => getAudioContext(), { once: true });
  });

  // ۱. صدای تیک‌تاک مکانیکی ساعت شمارش معکوس
  function playClockTick(isTick) {
    try {
      const ctx = getAudioContext();
      if (!ctx || ctx.state !== 'running') return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const now = ctx.currentTime;
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

  // ۲. صدای بیپ ترمینال هنگام تایپ خطوط رمزگشایی
  function playTerminalBeep(freq = 1900) {
    try {
      const ctx = getAudioContext();
      if (!ctx || ctx.state !== 'running') return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.04);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.045);
    } catch (_) {}
  }

  // ۳. صدای گلیچ دیجیتال و نویز شکستن داده‌ها
  function playGlitchBurst() {
    try {
      const ctx = getAudioContext();
      if (!ctx || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      const bufferSize = Math.floor(ctx.sampleRate * 0.16);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (i % 2 === 0 ? 1 : -0.7);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.frequency.exponentialRampToValueAtTime(400, now + 0.15);
      filter.Q.setValueAtTime(3, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    } catch (_) {}
  }

  // ۴. ساب‌بیس سنگین ۵۰ هرتزی و لرزش مکانیکی ترنسفورماتور
  function playSubBassDrone(duration = 15) {
    try {
      const ctx = getAudioContext();
      if (!ctx || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(48, now);
      osc.frequency.exponentialRampToValueAtTime(54, now + duration * 0.5);
      osc.frequency.exponentialRampToValueAtTime(42, now + duration);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(150, now);
      filter.frequency.linearRampToValueAtTime(360, now + duration * 0.7);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 1.2);
      gain.gain.setValueAtTime(0.3, now + duration - 1.5);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch (_) {}
  }

  // ۵. رایزر سینمایی پرهیجان و اوج‌گیرنده (Cinematic Tension Riser)
  function playCinematicRiser(duration = 4.5) {
    try {
      const ctx = getAudioContext();
      if (!ctx || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(70, now);
      osc.frequency.exponentialRampToValueAtTime(1450, now + duration);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(120, now);
      filter.frequency.exponentialRampToValueAtTime(2400, now + duration);
      filter.Q.setValueAtTime(4, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.exponentialRampToValueAtTime(0.38, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch (_) {}
  }

  // ۶. انفجار پرتال کوانتومی و پرش هایپراسپیس (Hyperspace Sonic Boom)
  function playHyperspaceExplosion() {
    try {
      const ctx = getAudioContext();
      if (!ctx || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      // ساب‌بیس ضربه‌ای
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(160, now);
      sub.frequency.exponentialRampToValueAtTime(22, now + 1.2);
      subGain.gain.setValueAtTime(0.75, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
      sub.connect(subGain);
      subGain.connect(ctx.destination);
      sub.start(now);
      sub.stop(now + 1.35);

      // انفجار نویز و امواج شوک
      const bufferSize = Math.floor(ctx.sampleRate * 1.1);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, now);
      filter.frequency.exponentialRampToValueAtTime(110, now + 0.95);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.5, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);
    } catch (_) {}
  }

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

    playHyperspaceExplosion();
    const flare = document.getElementById('cyberFlashFlare');
    if (flare) flare.classList.add('flaring');

    setTimeout(() => {
      window.location.href = '/enter-code.html';
    }, 600);
  }

  function triggerCyberTransformation() {
    if (!cyberOverlay) return;

    // ۱. فاز اول: بلک‌اوت کامل (۲۰ ثانیه در حالت توسعه طبق دستور کاربر)
    cyberOverlay.classList.remove('active-cyber');
    cyberOverlay.classList.add('active-blackout');

    cyberSequenceTimeout = setTimeout(() => {
      // ۲. فاز دوم: انفجار نوری و بیدار شدن سامانه سایبری (سکانس ۱۵ ثانیه‌ای پرهیجان)
      cyberOverlay.classList.remove('active-blackout');
      cyberOverlay.classList.add('active-cyber');

      startMatrixRain();
      playSubBassDrone(15);
      playGlitchBurst();

      const phaseBadge = document.getElementById('cyberPhaseBadge');
      const mainTitle = document.getElementById('cyberMainTitle');
      const subTitle = document.getElementById('cyberSubTitle');
      const termBody = document.getElementById('cyberTerminalBody');
      const progLabel = document.getElementById('cyberProgressLabel');
      const progPct = document.getElementById('cyberProgressPercent');
      const progFill = document.getElementById('cyberProgressFill');
      const skipBtn = document.getElementById('cyberSkipBtn');

      if (skipBtn) {
        skipBtn.addEventListener('click', (e) => {
          e.preventDefault();
          doFinalWarpRedirect();
        }, { once: true });
      }

      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Enter') {
          doFinalWarpRedirect();
        }
      }, { once: true });

      function addTerminalLine(text, isHighlight = false, isWarning = false) {
        if (!termBody) return;
        const line = document.createElement('div');
        line.className = 'term-line' + (isHighlight ? ' highlight' : '') + (isWarning ? ' warning' : '');
        line.textContent = text;
        termBody.appendChild(line);
        if (termBody.children.length > 5) {
          termBody.removeChild(termBody.children[0]);
        }
        playTerminalBeep(isHighlight ? 2400 : 1900);
      }

      function updateProgress(pct, labelText) {
        if (progPct) progPct.textContent = `${pct}%`;
        if (progFill) progFill.style.width = `${pct}%`;
        if (progLabel && labelText) progLabel.textContent = labelText;
      }

      // سناریوی ترنزیشن ۱۵ ثانیه‌ای خط‌به‌خط
      // T = 0.5s
      setTimeout(() => {
        addTerminalLine('> PROTOCOL OVERRIDE DETECTED...', false, true);
        updateProgress(10, 'INTERCEPTING SIGNAL...');
      }, 500);

      // T = 2.0s
      setTimeout(() => {
        playGlitchBurst();
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
        playGlitchBurst();
        if (phaseBadge) phaseBadge.textContent = 'STAGE 02 // MAINFRAME TRANSFORMATION';
        if (mainTitle) mainTitle.textContent = 'MORPHING';
        addTerminalLine('> MAINFRAME LOCATED: "RAZ-E-DEHKADE // SECRET DOSSIER"', true);
        addTerminalLine('> CIVILIAN COVER PERMANENTLY TERMINATED.', false, true);
        updateProgress(58, 'TRANSFORMING REALITY MATRIX...');
      }, 6800);

      // T = 9.2s
      setTimeout(() => {
        playCinematicRiser(5.0);
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

    }, BLACKOUT_DURATION_MS);
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

  update();
  timerId = setInterval(update, 100);

  window.addEventListener('pagehide', () => {
    if (timerId) clearInterval(timerId);
  }, { once: true });
})();
