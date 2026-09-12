/**
 * public/assets/js/hack-sequence.js
 * سکانس سینمایی، صوتی و گرافیکی هک سیستم توسط مزداک (مدت زمان حدود ۴۵-۵۰ ثانیه)
 */

class HackSequenceEngine {
  constructor() {
    this.audioCtx = null;
    this.canvas = null;
    this.ctx = null;
    this.animFrame = null;
    this.isRunning = false;
  }

  // ایجاد Web Audio Context برای افکت‌های صوتی بیپ و گلیچ
  initAudio() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // ایجاد فرکانس‌های صدای گلیچ و آلارم
  playBeep(freq = 880, type = 'sawtooth', duration = 0.1, gainVal = 0.1) {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      console.error(e);
    }
  }

  playAlarmSound() {
    let count = 0;
    const interval = setInterval(() => {
      if (!this.isRunning || count > 20) {
        clearInterval(interval);
        return;
      }
      this.playBeep(count % 2 === 0 ? 1200 : 700, 'square', 0.18, 0.15);
      count++;
    }, 250);
  }

  playStaticNoise() {
    if (!this.audioCtx) return;
    try {
      const bufferSize = this.audioCtx.sampleRate * 0.2;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.audioCtx.createBufferSource();
      noise.buffer = buffer;
      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      noise.connect(gain);
      gain.connect(this.audioCtx.destination);
      noise.start();
    } catch (e) {
      console.error(e);
    }
  }

  // اجرای کل سکانس
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.initAudio();

    // ۱. ایجاد المان‌های Overlay
    this.createOverlayElements();

    // سکانس چند مرحله‌ای:
    this.phase1Glitch(); // ثانیه ۰ تا ۵
  }

  createOverlayElements() {
    // کانواس باران کدهای ماتریسی
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'hack-canvas';
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 99990;
      pointer-events: none;
      opacity: 0;
      transition: opacity 1s ease;
    `;
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // کانتینر پیام‌های هشدار و ترمینال
    const hud = document.createElement('div');
    hud.id = 'hack-hud';
    hud.innerHTML = `
      <div id="hack-alert-box" class="hack-alert-hidden">
        <div class="hack-alert-title">🚨 SYSTEM BREACH DETECTED 🚨</div>
        <div class="hack-alert-body" id="hack-alert-text">FATAL: UNAUTHORIZED OVERRIDE IN PROGRESS</div>
      </div>
      <div id="hack-terminal-box" class="hack-terminal-hidden">
        <div class="hack-terminal-header">> MAZDAK_OS v6.6.6 // KERNEL OVERRIDE</div>
        <div class="hack-terminal-body" id="hack-terminal-logs"></div>
        <div class="hack-progress-bar-wrap">
          <div class="hack-progress-bar" id="hack-progress-fill"></div>
        </div>
      </div>
    `;
    document.body.appendChild(hud);
  }

  resizeCanvas() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  }

  // فاز ۱: گلیچ سنگین + لرزش + بیپ‌های صوتی (۰-۵ ثانیه)
  phase1Glitch() {
    document.body.classList.add('hack-glitch-active');

    let glitchInterval = setInterval(() => {
      this.playBeep(200 + Math.random() * 800, 'sawtooth', 0.05, 0.08);
      if (Math.random() > 0.5) this.playStaticNoise();
    }, 150);

    setTimeout(() => {
      clearInterval(glitchInterval);
      this.phase2MatrixRain(); // ورود به فاز ۲ در ثانیه ۵
    }, 5000);
  }

  // فاز ۲: باران کدهای ماتریس + هشدارهای قرمز سنگین (۵-۱۸ ثانیه)
  phase2MatrixRain() {
    this.canvas.style.opacity = '0.9';
    this.startMatrixRainAnimation();

    const alertBox = document.getElementById('hack-alert-box');
    alertBox.className = 'hack-alert-visible';

    this.playAlarmSound();

    const alertTexts = [
      'WARNING: FIREWALL CRACKED AT IP 192.168.1.104',
      'ALERT: ADMIN PRIVILEGES REVOKED',
      'SYSTEM WARNING: DETECTIVE DATA EXFILTRATED',
      'BYPASSING SECURITY PROTOCOLS... 100%',
      'WELCOME MAZDAK: SYSTEM CONTROL GRANTED'
    ];

    let idx = 0;
    let textInterval = setInterval(() => {
      idx++;
      if (idx < alertTexts.length) {
        document.getElementById('hack-alert-text').innerText = alertTexts[idx];
        this.playBeep(1400, 'square', 0.15, 0.2);
      } else {
        clearInterval(textInterval);
      }
    }, 2500);

    setTimeout(() => {
      alertBox.className = 'hack-alert-hidden';
      this.phase3BlackoutTerminal(); // ورود به فاز ۳ در ثانیه ۱۸
    }, 14000);
  }

  startMatrixRainAnimation() {
    const chars = '01010101010101MAZDAK_HACK_DETECTIVE_NET_BYPASS_99990000#$@%&*';
    const fontSize = 16;
    const columns = Math.floor(this.canvas.width / fontSize);
    const drops = new Array(columns).fill(1);

    const draw = () => {
      if (!this.isRunning) return;
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // رنگ سرخ/ارغوانی برای هک مزداک
      this.ctx.fillStyle = '#ff0055';
      this.ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars.charAt(Math.floor(Math.random() * chars.length));
        this.ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > this.canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      this.animFrame = requestAnimationFrame(draw);
    };
    draw();
  }

  // فاز ۳: بلک‌اوت صفحه و اسکن ترمینال (۱۸-۳۸ ثانیه)
  phase3BlackoutTerminal() {
    document.body.classList.add('hack-blackout');
    const termBox = document.getElementById('hack-terminal-box');
    termBox.className = 'hack-terminal-visible';

    const logsContainer = document.getElementById('hack-terminal-logs');
    const progressFill = document.getElementById('hack-progress-fill');

    const logs = [
      '[+] Initializing Mazdak Kernel Exploit...',
      '[+] Scanning active chat sessions...',
      '[+] Extracting detective secret keys...',
      '[+] Disabling admin fallback triggers...',
      '[+] Overriding frontend user interfaces...',
      '[+] Encrypting response channels...',
      '[+] Injecting Hacker Payload v4.2...',
      '[!] MAZDAK PROTOCOL FULLY LOADED.'
    ];

    let logIdx = 0;
    let logInterval = setInterval(() => {
      if (logIdx < logs.length) {
        const line = document.createElement('div');
        line.className = 'term-line';
        line.innerText = logs[logIdx];
        logsContainer.appendChild(line);
        logsContainer.scrollTop = logsContainer.scrollHeight;

        progressFill.style.width = `${((logIdx + 1) / logs.length) * 100}%`;
        this.playBeep(600 + logIdx * 80, 'sine', 0.05, 0.1);
        logIdx++;
      } else {
        clearInterval(logInterval);
      }
    }, 2200);

    setTimeout(() => {
      this.phase4HackedState(); // ورود به فاز ۴ نهایی (ثانیه ۳۸+)
    }, 20000);
  }

  // فاز ۴: تغییر ظاهر پایدار چت به حالت هک‌شده مزداک
  phase4HackedState() {
    cancelAnimationFrame(this.animFrame);
    if (this.canvas) this.canvas.style.opacity = '0';

    document.body.classList.remove('hack-glitch-active', 'hack-blackout');
    document.body.classList.add('hacked-theme');

    const hud = document.getElementById('hack-hud');
    if (hud) hud.remove();
    if (this.canvas) this.canvas.remove();

    this.playBeep(300, 'sawtooth', 0.8, 0.3);

    // افزودن پیام خوش‌آمدگویی هکر در باکس چت
    const box = document.getElementById('messages-box');
    if (box) {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'message-bubble hacker glitch-bounce';
      msgDiv.innerHTML = `
        <div class="message-sender">
          <span>☠️ مزداک (کنترل‌کننده سیستم)</span>
          <span>${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div><strong>سلام دستیاران کارآگاه...</strong><br>سیستم شما کاملاً تحت کنترل من است. دیگر ادمین پیام‌های شما را نمی‌بیند. تمام ارتباطات شما از این لحظه تحت نظارت من است!</div>
      `;
      box.appendChild(msgDiv);
      box.scrollTop = box.scrollHeight;
    }

    this.isRunning = false;
  }
}

const hackEngine = new HackSequenceEngine();
