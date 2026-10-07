'use strict';
// Absolute-time choreography also recovers correctly after a background tab.
class HackSequenceEngine {
  constructor() {
    this.isRunning = false;
    this.soundEnabled = false;
    this.audioCtx = null;
    this.nodes = new Set();
    this.duration = 53500;
    this.transmission = 'منتظر جواب مرکز نباشید.\nاز این لحظه…\nپیام‌هاتون اول به من می‌رسه.';
    this.phases = [
      { at: 0, name: 'interference', label: 'ارتباط دچار اختلال شد', detail: 'در حال بازیابی…' },
      { at: 4500, name: 'fracture', label: 'نفوذ شناسایی شد', detail: 'تلاش برای مسدود کردن ارتباط ناشناس' },
      { at: 12500, name: 'collapse', label: 'ارتباط از کنترل خارج شد', detail: 'بازیابی ناموفق' },
      { at: 19500, name: 'silence', label: '', detail: '' },
      { at: 23000, name: 'presence', label: 'هنوز منتظرید؟', detail: '' },
      { at: 30500, name: 'identity', label: 'مرکز صداتون رو نمی‌شنوه.', detail: 'ولی من می‌شنوم.' },
      { at: 37500, name: 'transmission', label: 'مزداک', detail: '' },
      { at: 50500, name: 'release', label: '', detail: '' },
    ];
  }
  updateSoundControl() {
    if (this.muteButton) {
      this.muteButton.textContent = this.soundEnabled ? 'قطع صدا' : 'پخش صدا';
      this.muteButton.setAttribute('aria-pressed', String(this.soundEnabled));
    }
    const terminalButton = document.getElementById('sound-toggle');
    if (terminalButton) {
      terminalButton.textContent = this.soundEnabled ? 'صدا روشن' : 'صدا خاموش';
      terminalButton.setAttribute('aria-pressed', String(this.soundEnabled));
    }
    const previewSound = document.getElementById('preview-sound');
    if (previewSound) previewSound.checked = this.soundEnabled;
  }
  setSound(enabled) {
    this.soundEnabled = enabled;
    this.updateSoundControl();
    if (!enabled) { this.silence(); return; }
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (Audio) {
      this.audioCtx ||= new Audio();
      this.audioCtx.resume().then(() => { if (this.isRunning) this.soundtrack(this.phases[this.phaseIndex]?.name); }).catch(() => {});
    }
  }
  tone(frequency, duration, volume = .035, end = frequency, type = 'sine', pulse = 0) {
    if (!this.soundEnabled || !this.audioCtx || this.audioCtx.state !== 'running') return;
    const ctx = this.audioCtx, oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), ctx.currentTime + duration);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + .12);
    gain.gain.linearRampToValueAtTime(volume * .8, ctx.currentTime + duration * .8);
    gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + duration);
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1800;
    oscillator.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    if (pulse) {
      const modulation = ctx.createOscillator(), depth = ctx.createGain();
      modulation.frequency.value = pulse; depth.gain.value = frequency * .35;
      modulation.connect(depth); depth.connect(oscillator.frequency);
      modulation.start(); modulation.stop(ctx.currentTime + duration);
      modulation.onended = () => { modulation.disconnect(); depth.disconnect(); this.nodes.delete(modulation); };
      this.nodes.add(modulation);
    }
    this.nodes.add(oscillator);
    oscillator.onended = () => { this.nodes.delete(oscillator); oscillator.disconnect(); gain.disconnect(); filter.disconnect(); };
    oscillator.start(); oscillator.stop(ctx.currentTime + duration);
  }
  noise(duration, volume = .018) {
    if (!this.soundEnabled || !this.audioCtx || this.audioCtx.state !== 'running') return;
    const ctx = this.audioCtx, source = ctx.createBufferSource(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
    if (!this.noiseBuffer) {
      this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      let seed = 1847;
      for (let i = 0; i < data.length; i++) { seed = (seed * 16807) % 2147483647; data[i] = (seed / 2147483647) * 2 - 1; }
    }
    source.buffer = this.noiseBuffer; source.loop = true;
    filter.type = 'bandpass'; filter.frequency.setValueAtTime(280, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + duration); filter.Q.value = .8;
    gain.gain.setValueAtTime(0, ctx.currentTime); gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + duration * .7);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    source.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    this.nodes.add(source);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); this.nodes.delete(source); };
    source.start(); source.stop(ctx.currentTime + duration);
  }
  soundtrack(phase) {
    this.silence();
    if (phase === 'interference') { this.tone(115, 4.5, .045, 48, 'triangle'); this.tone(119, 4.5, .025, 53); }
    if (phase === 'fracture') { this.tone(360, 8, .035, 520, 'triangle', .65); this.tone(48, 8, .055, 44, 'sawtooth'); }
    if (phase === 'collapse') { this.tone(520, 7, .04, 180, 'triangle', 1.3); this.tone(58, 7, .06, 28, 'sawtooth'); }
    if (phase === 'presence') { this.tone(33, 7.5, .065, 62, 'triangle'); this.tone(70, 7.5, .03, 127); }
    if (phase === 'identity') { this.tone(150, 6, .07, 25, 'sawtooth'); this.tone(53, 7, .045, 39); }
    if (phase === 'transmission') { this.tone(42, 13, .04, 35, 'triangle'); this.tone(85, 13, .015, 70); }
    if (phase === 'fracture' || phase === 'collapse') this.noise(7, .026);
    if (phase === 'presence') this.noise(7.5, .012);
  }
  silence() { for (const node of this.nodes) { try { node.stop(); } catch (_) {} } this.nodes.clear(); }
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.previousFocus = document.activeElement;
    this.phaseIndex = -1;
    this.startedAt = performance.now();
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.overlay = document.createElement('section');
    this.overlay.className = 'breach-scene';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-modal', 'true');
    this.overlay.setAttribute('aria-label', 'سکانس مزداک؛ با کلید Escape می‌توانید رد کنید');
    this.overlay.tabIndex = -1;
    this.overlay.innerHTML = `<div class="breach-scanlines" aria-hidden="true"></div><div class="breach-vignette" aria-hidden="true"></div><div class="breach-tears" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div class="breach-edge" dir="ltr"><span>SYSTEM <b>//</b> <span class="breach-channel">CONNECTION FAILURE</span></span><span class="breach-counter">00:00</span></div><div class="breach-alarm" aria-hidden="true"><div class="alarm-symbol">☠︎</div><div class="alarm-word">DANGER</div><div class="alarm-line"></div></div><div class="breach-center"><div class="breach-eyebrow">هشدار</div><h2 class="breach-title" aria-live="polite"></h2><p class="breach-detail"></p><p class="breach-transmission"></p></div><div class="breach-diagnostics" aria-hidden="true"><div class="diagnostic-row"><span>ارتباط با مرکز</span><b class="breach-response">در حال بررسی</b></div><div class="diagnostic-row"><span>تلاش برای بازیابی</span><b class="breach-paths">۱۲ / ۱۲</b></div><div class="diagnostic-row"><span>مسدودسازی ارتباط ناشناس</span><b>ناموفق</b></div><div class="breach-meter"><i></i></div></div><div class="breach-incoming" aria-hidden="true"><span class="incoming-line"></span><span class="incoming-line"></span><span class="incoming-line"></span><span class="incoming-line"></span><span class="incoming-line"></span><span class="incoming-line"></span><span class="incoming-line"></span></div><div class="breach-signature">MAZDAK<span>ارتباط برقرار شد</span></div><div class="breach-bottom"><span class="breach-bottom-status">تلاش برای حفظ ارتباط</span><div class="breach-controls"><button class="breach-mute" type="button">صدا</button><button class="breach-skip" type="button">رد کردن · ESC</button></div></div>`;
    this.backgrounds = [...document.body.children].filter(el => ['MAIN', 'HEADER', 'FOOTER'].includes(el.tagName));
    this.inertStates = this.backgrounds.map(el => el.inert);
    this.backgrounds.forEach(el => { el.inert = true; });
    document.body.append(this.overlay);
    this.overlay.focus({ preventScroll: true });
    document.body.classList.add('breach-running');
    this.skipButton = this.overlay.querySelector('.breach-skip');
    this.muteButton = this.overlay.querySelector('.breach-mute');
    this.skipButton.onclick = () => this.finish();
    this.updateSoundControl();
    this.muteButton.onclick = () => this.setSound(!this.soundEnabled);
    this.onKey = event => {
      if (event.key === 'Escape') this.finish();
      if (event.key === 'Tab') {
        event.preventDefault();
        (document.activeElement === this.muteButton ? this.skipButton : this.muteButton).focus();
      }
    };
    window.addEventListener('keydown', this.onKey);
    this.frame = requestAnimationFrame(now => this.tick(now));
  }
  tick(now) {
    if (!this.isRunning) return;
    const elapsed = now - this.startedAt;
    if (elapsed >= this.duration) { this.finish(); return; }
    let index = this.phases.length - 1;
    while (index > 0 && elapsed < this.phases[index].at) index--;
    if (index !== this.phaseIndex) this.setPhase(index);
    this.overlay.querySelector('.breach-counter').textContent = `00:${String(Math.floor(elapsed / 1000)).padStart(2, '0')}`;
    if (index <= 2) {
      const surviving = Math.max(0, 12 - Math.floor(Math.max(0, elapsed - 4500) / 1150));
      this.overlay.querySelector('.breach-paths').textContent = `${surviving.toLocaleString('fa-IR')} / ۱۲`;
    }
    if (index === 6) {
      const count = this.reducedMotion ? this.transmission.length : Math.max(0, Math.floor((elapsed - 38200) / 100));
      this.overlay.querySelector('.breach-transmission').textContent = this.transmission.slice(0, count);
    }
    this.frame = requestAnimationFrame(time => this.tick(time));
  }
  setPhase(index) {
    this.phaseIndex = index;
    const phase = this.phases[index];
    this.overlay.dataset.phase = phase.name;
    this.overlay.querySelector('.breach-title').textContent = phase.label;
    this.overlay.querySelector('.breach-detail').textContent = phase.detail;
    this.overlay.querySelector('.breach-response').textContent = index > 0 ? 'بدون پاسخ' : 'با تأخیر';
    this.overlay.querySelector('.breach-channel').textContent = index >= 4 ? 'UNKNOWN SOURCE' : 'CONNECTION FAILURE';
    this.overlay.querySelector('.breach-bottom-status').textContent = index >= 4 ? 'فرستنده ناشناس' : index === 2 ? 'ارتباط با مرکز قطع شد' : 'تلاش برای حفظ ارتباط';
    this.soundtrack(phase.name);
    if (phase.name === 'release') document.body.classList.add('hacked-theme');
  }
  finish() {
    if (!this.isRunning) return;
    document.body.classList.add('hacked-theme');
    const core = document.querySelector('.signal-core');
    if (core) core.textContent = 'M';
    const state = document.getElementById('terminal-state');
    if (state) state.textContent = 'مزداک وارد شد';
    this.stop();
  }
  stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.frame);
    this.silence();
    this.overlay?.remove(); this.overlay = null;
    this.muteButton = null; this.skipButton = null;
    document.body.classList.remove('breach-running');
    window.removeEventListener('keydown', this.onKey);
    this.backgrounds?.forEach((el, index) => { el.inert = this.inertStates[index]; });
    if (this.previousFocus?.isConnected) this.previousFocus.focus({ preventScroll: true });
  }
}
const hackEngine = new HackSequenceEngine();
