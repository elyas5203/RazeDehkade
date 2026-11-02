/* A continuous terminal surface fractures into irregular glass pieces. */
(() => {
  const edge = [
    [0, 0], [17, 0], [36, 0], [58, 0], [78, 0], [100, 0],
    [100, 27], [100, 60], [100, 100], [73, 100], [48, 100],
    [24, 100], [0, 100], [0, 67], [0, 32]
  ];
  const center = [48, 46];
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  function sound() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const start = ctx.currentTime + .02;
      const buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * .32), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * .055));
      const noise = ctx.createBufferSource(); noise.buffer = buffer;
      const highpass = ctx.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = 1200;
      const gain = ctx.createGain(); gain.gain.value = .18;
      noise.connect(highpass).connect(gain).connect(ctx.destination); noise.start(start);
      for (const [frequency, level] of [[920,.08],[1470,.055],[2330,.04],[3610,.025]]) {
        const osc = ctx.createOscillator(), envelope = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(frequency, start);
        osc.frequency.exponentialRampToValueAtTime(frequency * .72, start + .4);
        envelope.gain.setValueAtTime(level, start);
        envelope.gain.exponentialRampToValueAtTime(.0001, start + .55);
        osc.connect(envelope).connect(ctx.destination); osc.start(start); osc.stop(start + .56);
      }
      setTimeout(() => ctx.close().catch(() => {}), 1300);
    } catch (_) {}
  }

  async function shatter(card) {
    const terminal = card.querySelector('.recovery-terminal');
    if (!terminal) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      terminal.style.opacity = '0';
      await delay(250);
      return;
    }
    const bounds = terminal.getBoundingClientRect();
    const stage = document.createElement('div'); stage.className = 'recovery-shatter';
    stage.style.height = `${Math.max(bounds.height, 280)}px`;
    const pieces = document.createElement('div'); pieces.className = 'recovery-shatter-pieces';
    for (let i = 0; i < edge.length; i++) {
      const a = edge[i], b = edge[(i + 1) % edge.length];
      const shard = document.createElement('div'); shard.className = 'recovery-shatter-shard';
      shard.style.clipPath = `polygon(${center[0]}% ${center[1]}%,${a[0]}% ${a[1]}%,${b[0]}% ${b[1]}%)`;
      const midpoint = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const dx = midpoint[0] - center[0], dy = midpoint[1] - center[1];
      const radius = Math.hypot(dx, dy) || 1;
      const distance = 270 + (i % 4) * 46;
      shard.style.setProperty('--shard-x', `${Math.round(dx / radius * distance)}px`);
      shard.style.setProperty('--shard-y', `${Math.round(dy / radius * distance * .72 + 115)}px`);
      shard.style.setProperty('--shard-rotate', `${(i % 2 ? -1 : 1) * (14 + (i * 19) % 38)}deg`);
      shard.style.setProperty('--shard-flip', `${(i % 2 ? -1 : 1) * (18 + (i * 11) % 42)}deg`);
      shard.style.setProperty('--shard-delay', `${(i % 5) * 28}ms`);
      shard.append(terminal.cloneNode(true)); pieces.append(shard);
    }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'recovery-shatter-cracks'); svg.setAttribute('viewBox', '0 0 1000 600'); svg.setAttribute('preserveAspectRatio', 'none');
    const cx = center[0] * 10, cy = center[1] * 6;
    for (let i = 0; i < edge.length; i++) {
      const [x, y] = edge[i], px = x * 10, py = y * 6;
      const midx = cx + (px - cx) * (.44 + (i % 3) * .06) + ((i % 2) ? 26 : -24);
      const midy = cy + (py - cy) * .48 + ((i % 3) - 1) * 18;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${cx} ${cy} L ${midx} ${midy} L ${px} ${py}`);
      svg.append(path);
    }
    const flash = document.createElement('div'); flash.className = 'recovery-shatter-flash';
    stage.append(pieces, svg, flash);
    card.replaceChildren(stage); card.classList.add('is-shattering');
    await delay(300);
    stage.classList.add('is-cracked'); sound();
    await delay(700);
    stage.classList.add('is-shattered');
    await delay(2700);
    card.classList.remove('is-shattering');
  }

  window.recoveryShatter = { shatter };
})();
