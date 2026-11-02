(() => {
  'use strict';
  const session = JSON.parse(sessionStorage.getItem('userSession') || '{}');
  const token = sessionStorage.getItem('userToken');
  const id = Number(session.id);
  if (!id || !token) return;
  const base = `/api/recovery-live/sessions/${id}`;
  const headers = { Authorization: `Bearer ${token}` };
  const threat = [36.256351, 59.603964];
  let mediaManifest = {
    preFilmSeconds: 110,
    stageSeconds: { listEnd: 12, chatStart: 12, terminalStart: 62, mapStart: 76, countdownStart: 105 },
    cueSeconds: { mazdak1: 12, mazdak2: 22, mazdak3: 32, mazdak4: 42, mazdak5: 52 },
    segments: [{ src: '/assets/recovery/mazdak-playback.mp4?v=a55478d176a224a2', durationSeconds: 74.744, sizeBytes: 17442545 }],
    shrinkAtSeconds: 42, expandAtSeconds: 57, restorationSeconds: 15
  };
  const filmEnd = () => Number(mediaManifest.preFilmSeconds) + mediaManifest.segments.reduce((n, clip) => n + Number(clip.durationSeconds), 0);
  let state = null, stage = '', overlay = null, map = null, video = null, roster = [], rosterKey = '', mapPhase = '';
  let previewPlayers = [], previewQueue = [], previewActive = false;
  let serverOffset = 0, pending = false, loadedRunId = null, completed = false;
  let filmDone = false, filmDelay = 0, filmCompletedAt = 0, audioReady = false, restoredNotified = false;
  let filmMediaPromise = null, filmMediaUrls = [], filmMediaVersion = '', filmMediaError = null;
  let filmMediaProgress = { received: 0, expected: 0, ready: false };
  let audioCtx = null, mapLibrePromise = null;
  let boardRestoreStarted = false, restorationTimers = [];
  const sentCues = new Set();
  const cueRetryAt = new Map();
  const filmCheckpointKey = run => `recoveryFilmDone:${run.id}:${run.startedAt}`;
  const filmProgressKey = run => `recoveryFilmProgress:${run.id}:${run.startedAt}`;
  const make = (tag, cls = '', text = '') => { const node = document.createElement(tag); if (cls) node.className = cls; if (text) node.textContent = text; return node; };

  // Mount early overlay immediately if recovery is pre-active to ensure zero flash of chat room
  try {
    const isPreactive = sessionStorage.getItem('recovery_live_active') === '1' || session.recovery_phase === 'LIVE' || session.is_hacked;
    if (isPreactive) {
      overlay = make('div', 'recovery-live-overlay is-waiting');
      overlay.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:16px;color:#a3e7be;font-family:Estedad,sans-serif;"><div style="width:48px;height:48px;border:3px solid #2d6a4f;border-top-color:#52e59e;border-radius:50%;animation:recovery-spin 0.9s linear infinite;"></div><p style="font-size:15px;letter-spacing:0.5px;">در حال اتصال به کانال امن بازپس‌گیری…</p></div><style>@keyframes recovery-spin{to{transform:rotate(360deg)}}</style>';
      if (document.body) document.body.append(overlay);
      else document.addEventListener('DOMContentLoaded', () => { if (overlay && !overlay.isConnected) document.body.append(overlay); });
    }
  } catch (_) {}

  function playClockTick(pitch = 1) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1400 * pitch, now);
      osc1.frequency.exponentialRampToValueAtTime(160, now + 0.035);
      gain1.gain.setValueAtTime(0.5, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.04);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(320 * pitch, now);
      osc2.frequency.exponentialRampToValueAtTime(30, now + 0.05);
      gain2.gain.setValueAtTime(0.4, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now);
      osc2.stop(now + 0.055);
    } catch (_) {}
  }

  function playTypingKeys(count = 1) {
    if (!audioReady || !audioCtx || audioCtx.state !== 'running') return;
    try {
      const total = Math.min(4, Math.max(1, count));
      for (let index = 0; index < total; index++) {
        const at = audioCtx.currentTime + index * 0.022;
        const oscillator = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(880 + ((index * 137) % 260), at);
        gain.gain.setValueAtTime(0.018, at);
        gain.gain.exponentialRampToValueAtTime(0.001, at + 0.018);
        oscillator.connect(gain); gain.connect(audioCtx.destination);
        oscillator.start(at); oscillator.stop(at + 0.02);
      }
    } catch (_) {}
  }

  function loadMapLibre() {
    if (mapLibrePromise) return mapLibrePromise;
    if (!document.querySelector('link[data-recovery-maplibre]')) {
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = '/assets/vendor/maplibre/maplibre-gl.css?v=6.16.0';
      stylesheet.dataset.recoveryMaplibre = '1';
      document.head.append(stylesheet);
    }
    const loadScript = (src, marker) => new Promise((resolve, reject) => {
      if (window[marker]) return resolve(window[marker]);
      const script = document.createElement('script');
      script.src = src; script.async = true;
      script.onload = () => resolve(window[marker]);
      script.onerror = reject;
      document.head.append(script);
    });
    mapLibrePromise = Promise.all([
      import('/assets/vendor/maplibre/maplibre-gl.mjs?v=6.16.0'),
      loadScript('/assets/vendor/pmtiles/pmtiles.js?v=4.4.0', 'pmtiles'),
      loadScript('/assets/vendor/pmtiles/basemaps.js?v=5.6.0', 'basemaps')
    ]).then(([mapModule, pmtilesModule, basemapsModule]) => {
      const maplibregl = mapModule.default || mapModule;
      if (!window.__recoveryPmtilesProtocol) {
        window.__recoveryPmtilesProtocol = new pmtilesModule.Protocol();
        maplibregl.addProtocol('pmtiles', window.__recoveryPmtilesProtocol.tile);
      }
      return { maplibregl, basemaps: basemapsModule };
    });
    return mapLibrePromise;
  }

  async function request(path = '', options = {}) {
    const response = await fetch(base + path, { ...options,
      headers: { ...headers, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'ارتباط با بات امنیتی سایت برقرار نشد.');
    return data;
  }
  function shell(className = '') {
    document.getElementById('recovery-live-mini-terminal')?.remove();
    if (!overlay) { overlay = make('div', 'recovery-live-overlay'); document.body.append(overlay); }
    overlay.className = `recovery-live-overlay ${className}`;
    overlay.hidden = false;
    overlay.replaceChildren();
    if (map) { map.remove(); map = null; mapPhase = ''; }
    if (video) { video.pause(); video = null; }
    previewPlayers.forEach(player => { player.pause(); player.removeAttribute('src'); });
    previewPlayers = []; previewQueue = []; previewActive = false;
    return overlay;
  }
  function playNextPreview() {
    if (previewActive || stage !== 'waiting') return;
    while (previewQueue.length) {
      const player = previewQueue.shift();
      if (!player.isConnected) continue;
      previewActive = player;
      player.src = player.dataset.src;
      player.play().catch(() => { previewActive = false; playNextPreview(); });
      return;
    }
  }
  async function prepareFilmMedia(manifest, onProgress = () => {}) {
    const version = String(manifest.version || manifest.segments.map(item => item.src).join('|'));
    if (filmMediaPromise && filmMediaVersion === version) return filmMediaPromise;
    filmMediaUrls.forEach(url => URL.revokeObjectURL(url));
    filmMediaUrls = [];
    filmMediaVersion = version;
    filmMediaError = null;
    filmMediaProgress = { received: 0, expected: manifest.segments.reduce((sum, item) => sum + Number(item.sizeBytes || 0), 0), ready: false };
    const report = update => {
      filmMediaProgress = { ...filmMediaProgress, ...update };
      onProgress(filmMediaProgress);
    };
    filmMediaPromise = (async () => {
      const urls = [];
      const safeVersion = version.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'current';
      let root = null;
      try { if (navigator.storage?.getDirectory) root = await navigator.storage.getDirectory(); } catch (_) {}
      let folder = null;
      try { if (root) folder = await root.getDirectoryHandle('recovery-film', { create: true }); } catch (_) {}
      let totalReceived = 0;
      for (let index = 0; index < manifest.segments.length; index++) {
        const segment = manifest.segments[index];
        const declared = Number(segment.sizeBytes || 0);
        let file = null;
        let handle = null;
        if (folder) {
          handle = await folder.getFileHandle(`${safeVersion}-${index}.mp4`, { create: true });
          const existing = await handle.getFile();
          if (existing.size > 0 && (!declared || existing.size === declared)) file = existing;
        }
        if (!file) {
          const response = await fetch(segment.src, { cache: 'no-store' });
          if (!response.ok || !response.body) throw new Error(`دریافت بخش ${index + 1} فیلم کامل نشد.`);
          const headerSize = Number(response.headers.get('Content-Length'));
          const expected = declared || (Number.isFinite(headerSize) ? headerSize : 0);
          let received = 0;
          if (handle) {
            const writable = await handle.createWritable();
            try {
              const reader = response.body.getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                await writable.write(value);
                received += value.byteLength;
                report({ received: totalReceived + received, expected: filmMediaProgress.expected || expected });
              }
              if (expected && received !== expected) throw new Error('فایل فیلم ناقص دریافت شد.');
              await writable.close();
            } catch (error) { await writable.abort().catch(() => {}); throw error; }
            file = await handle.getFile();
          } else {
            const chunks = [];
            const reader = response.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              chunks.push(value);
              received += value.byteLength;
              report({ received: totalReceived + received, expected: filmMediaProgress.expected || expected });
            }
            if (expected && received !== expected) throw new Error('فایل فیلم ناقص دریافت شد.');
            file = new Blob(chunks, { type: 'video/mp4' });
          }
        }
        if (!file?.size || (declared && file.size !== declared)) throw new Error('نسخه کامل فیلم در حافظه محلی ثبت نشد.');
        totalReceived += file.size;
        report({ received: totalReceived });
        urls.push(URL.createObjectURL(file));
      }
      filmMediaUrls = urls;
      report({ ready: true, received: filmMediaProgress.expected || totalReceived, expected: filmMediaProgress.expected || totalReceived });
      return urls;
    })().catch(error => {
      filmMediaError = error;
      filmMediaUrls.forEach(url => URL.revokeObjectURL(url));
      filmMediaUrls = [];
      report({ ready: false });
      throw error;
    });
    return filmMediaPromise;
  }
  function updateFilmPreparationUi() {
    // Film preparation is intentionally silent and has no visible UI.
  }
  function syncCardVideo(card, item) {
    if (!item.videoId || !item.mediaUrl) {
      card.classList.remove('has-video');
      const existing = card.querySelector('video');
      if (existing) {
        existing.pause();
        existing.removeAttribute('src');
        existing.remove();
        previewQueue = previewQueue.filter(player => player !== existing);
        if (previewActive === existing) { previewActive = false; playNextPreview(); }
      }
      return;
    }
    card.classList.add('has-video');
    let player = card.querySelector('video');
    if (!player || player.dataset.videoId !== String(item.videoId)) {
      if (player) {
        player.pause();
        player.removeAttribute('src');
        player.remove();
        previewQueue = previewQueue.filter(item => item !== player);
        if (previewActive === player) previewActive = false;
      }
      player = make('video');
      player.muted = true;
      player.volume = 0;
      player.setAttribute('muted', '');
      player.playsInline = true;
      player.setAttribute('playsinline', '');
      player.muted = true;
      player.defaultMuted = true;
      player.playsInline = true;
      player.setAttribute('muted', '');
      player.setAttribute('playsinline', '');
      player.setAttribute('webkit-playsinline', '');
      player.autoplay = false;
      player.loop = false;
      player.preload = 'none';
      player.dataset.videoId = String(item.videoId);
      player.dataset.src = item.mediaUrl;

      player.addEventListener('playing', () => {
        player.classList.add('is-playing');
      });
      player.addEventListener('waiting', () => {
        player.classList.remove('is-playing');
      });
      player.addEventListener('error', () => {
        player.classList.remove('is-playing');
        if (previewActive === player) { previewActive = false; playNextPreview(); }
      });
      player.addEventListener('ended', () => {
        if (previewActive === player) { previewActive = false; playNextPreview(); }
      }, { once: true });
      card.append(player);
      previewPlayers.push(player);
      previewQueue.push(player);
      playNextPreview();
    }
  }
  const unlockAllVideos = () => {
    if (previewActive?.isConnected && previewActive.paused) previewActive.play().catch(() => {});
  };
  ['click', 'touchstart', 'keydown'].forEach(evt => window.addEventListener(evt, unlockAllVideos, { passive: true }));
  function waiting() {
    if (!overlay) {
      overlay = make('div', 'recovery-live-overlay is-waiting');
      document.body.append(overlay);
    } else {
      overlay.className = 'recovery-live-overlay is-waiting';
      overlay.hidden = false;
    }
    let grid = overlay.querySelector('.recovery-live-roster');
    if (!grid) {
      overlay.replaceChildren();
      const context = make('header', 'recovery-live-wait-context');
      context.append(make('div', 'recovery-live-wait-copy'));
      const copy = context.querySelector('.recovery-live-wait-copy');
      copy.append(make('small', '', 'کانال امن / دستیاران دهکده'),
        make('h1', '', 'تیم بازپس‌گیری آماده است'),
        make('p', '', 'ویدیوهای احراز هویت در حال تطبیق با پروندهٔ اعضای کلاس هستند.'));
      if (!overlay.dataset.audioUnlockBound) {
        overlay.dataset.audioUnlockBound = '1';
        overlay.addEventListener('pointerdown', () => {
        audioReady = true;
        try {
          audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
          audioCtx.resume().catch(() => {});
        } catch (_) {}
        }, { passive: true });
      }
      overlay.append(context);
      grid = make('div', 'recovery-live-roster');
      overlay.append(grid);
      overlay.append(make('p', 'recovery-live-wait-status'));
    }
    const waitStatus = overlay.querySelector('.recovery-live-wait-status');
    if (waitStatus) waitStatus.textContent = `${roster.filter(item => item.videoId).length} از ${roster.length} ویدیو متصل شد · در انتظار آغاز بازپس‌گیری`;
    updateFilmPreparationUi();
    prepareFilmMedia(mediaManifest, updateFilmPreparationUi).catch(updateFilmPreparationUi);
    grid.dataset.count = String(roster.length);
    grid.classList.toggle('is-dense', roster.length >= 9);
    const priorVideos = new Set(previewPlayers.map(player => player.dataset.videoId));
    for (const item of roster) {
      let card = grid.querySelector(`[data-assistant-id="${item.id}"]`);
      if (!card) {
        card = make('article', `recovery-live-card ${item.videoId ? 'has-video' : ''}`);
        card.dataset.assistantId = String(item.id);
        const picture = make('div', 'recovery-live-photo');
        const img = make('img'); img.src = item.photoUrl; img.alt = item.name; picture.append(img);
        card.append(picture);
        card.append(make('span', 'recovery-live-order', String(item.order).padStart(2, '0')));
        card.append(make('strong', '', item.name));
        grid.append(card);
      }
      syncCardVideo(card, item);
    }
    const newest = previewPlayers.filter(player => !priorVideos.has(player.dataset.videoId)).at(-1);
    if (priorVideos.size && newest && previewActive && previewActive !== newest) {
      previewActive.pause();
      previewActive.classList.remove('is-playing');
      previewQueue.unshift(previewActive);
      previewActive = false;
      previewQueue = previewQueue.filter(player => player !== newest);
      previewQueue.unshift(newest);
    }
    playNextPreview();
  }
  async function loadRoster() {
    const data = await request('/roster');
    const key = JSON.stringify(data.items.map(item => [item.id, item.videoId]));
    if (key !== rosterKey) { roster = data.items; rosterKey = key; if (state?.phase === 'WAITING_FOR_CLASS' || state?.phase === 'MATCHING') waiting(); }
  }
  function elapsed() {
    if (!state?.startedAt) return 0;
    const now = state.phase === 'PAUSED' && state.pausedAt ? Date.parse(state.pausedAt) : Date.now() + serverOffset;
    return Math.max(0, (now - Date.parse(state.startedAt) - Number(state.pausedMs || 0)) / 1000);
  }
  function listScene() {
    const screen = shell('is-threat-list');
    screen.append(make('small', 'recovery-live-kicker', 'سامانه شناسایی ارتباط‌های ناشناس // CYBER TRACE'));
    screen.append(make('h1', '', 'ردیابی و تطبیق هویت دستیاران'));
    const grid = make('div', 'recovery-live-ip-grid');
    screen.append(grid);

    const displayRoster = roster;
    grid.classList.toggle('is-dense', displayRoster.length >= 9);
    const cards = [];

    displayRoster.forEach((item, index) => {
      const card = make('article', 'recovery-live-ip-card is-analyzing');
      const ip = `10.72.${(index * 13 + 41) % 255}.${(index * 29 + 17) % 255}`;

      const head = make('div', 'recovery-live-ip-card-header');
      head.append(
        make('span', 'recovery-live-ip-badge', ip),
        make('span', 'recovery-live-ip-card-status', 'در حال اسکن…')
      );

      const body = make('div', 'recovery-live-ip-card-body');
      const avatar = make('img', 'recovery-live-ip-avatar is-scanning');
      avatar.src = item.photoUrl;
      avatar.alt = '';

      const meta = make('div', 'recovery-live-ip-meta');
      meta.append(
        make('span', 'recovery-live-ip-name', 'شناسایی نود شبکه…'),
        make('span', 'recovery-live-ip-sub', `تطبیق مختصات: ${Number(state.latitude || 36.3).toFixed(3)}, ${Number(state.longitude || 59.5).toFixed(3)}`)
      );

      body.append(avatar, meta);
      card.append(head, body);
      grid.append(card);

      cards.push({ card, item, head, meta, avatar });
    });

    const hostileCard = make('article', 'recovery-live-ip-card is-analyzing');
    const hostileHead = make('div', 'recovery-live-ip-card-header');
    hostileHead.append(
      make('span', 'recovery-live-ip-badge', '185.24.91.203'),
      make('span', 'recovery-live-ip-card-status', 'در حال بررسی شبکه…')
    );
    const hostileBody = make('div', 'recovery-live-ip-card-body');
    const hostileAvatar = make('div', 'recovery-live-ip-avatar is-scanning', '—');
    const hostileMeta = make('div', 'recovery-live-ip-meta');
    hostileMeta.append(
      make('span', 'recovery-live-ip-name', 'آی‌پی شناسایی‌نشده'),
      make('span', 'recovery-live-ip-sub', 'ردیابی موقعیت: 36.256351, 59.603964')
    );
    hostileBody.append(hostileAvatar, hostileMeta);
    hostileCard.append(hostileHead, hostileBody);
    grid.append(hostileCard);

    const alertBanner = make('p', 'recovery-live-alert', 'در حال پویش فرکانس‌های رادیویی و تطبیق هویت دستیاران با دیتابیس…');
    screen.append(alertBanner);

    const scanStep = Math.min(900, 6000 / Math.max(1, cards.length));
    cards.forEach((entry, idx) => {
      setTimeout(() => {
        if (stage !== 'list' || !entry.card.isConnected) return;
        playClockTick(1.2);
        entry.card.classList.remove('is-analyzing');
        entry.card.classList.add('is-verified');
        entry.avatar.classList.remove('is-scanning');
        entry.head.querySelector('.recovery-live-ip-card-status').textContent = '✓ هویت تأیید شد';
        entry.meta.querySelector('.recovery-live-ip-name').textContent = entry.item.name;
      }, 450 + idx * scanStep);
    });

    const hostileDelay = 450 + cards.length * scanStep + 300;
    setTimeout(() => {
      if (stage !== 'list' || !hostileCard.isConnected) return;
      playClockTick(0.6);
      hostileCard.classList.remove('is-analyzing');
      hostileCard.classList.add('is-hostile-threat');
      hostileAvatar.classList.remove('is-scanning');
      hostileAvatar.textContent = '!';
      hostileHead.querySelector('.recovery-live-ip-card-status').textContent = 'عدم تطبیق';
      hostileMeta.querySelector('.recovery-live-ip-name').textContent = 'متخاصم: مزداک';
      hostileMeta.querySelector('.recovery-live-ip-sub').textContent = 'دسترسی غیرمجاز شناسایی شد';
      alertBanner.textContent = 'آی‌پی متخاصم شناسایی شد. ردیابی و نفوذ به سیستم مزداک تا دقایقی دیگر آغاز می‌شود.';
      alertBanner.style.color = '#fca5a5';
      alertBanner.style.textShadow = '0 0 20px rgba(239, 68, 68, 0.7)';
    }, hostileDelay);
  }
  function calculatePurgeProgress(time) {
    const listEnd = Number(mediaManifest.stageSeconds.listEnd) || 10;
    if (time <= listEnd) return 90;
    if (time < 34) {
      return 90 + ((time - listEnd) / (34 - listEnd)) * 6; // 90% -> 96%
    }
    if (time < 50) {
      return 96 + ((time - 34) / 16) * 2; // 96% -> 98%
    }
    if (time < 81) {
      return 98 + Math.min(1, (time - 50) / 31); // 98% -> 99%
    }
    return 99;
  }
  function chatScene() {
    if (overlay) overlay.hidden = true;
    document.documentElement.classList.remove('recovery-live-preactive');
    document.documentElement.classList.add('recovery-live-in-chat');
    document.getElementById('recovery-live-mini-terminal')?.remove();
    document.body.classList.add('hacked-theme', 'cyber-breach-active', 'system-compromised-red');

    const chatTitle = document.getElementById('chat-title');
    if (chatTitle) chatTitle.textContent = 'مرکز فرماندهی (مورد نفوذ)';
    const msgInput = document.getElementById('msg-input');
    if (msgInput) {
      msgInput.setAttribute('readonly', 'true');
      msgInput.placeholder = 'خط ارتباطی توسط نفوذگر مسدود شده است…';
    }
    document.querySelectorAll('.composer-controls button, .composer-controls input').forEach(el => {
      el.setAttribute('disabled', 'disabled');
    });

    // فعال‌سازی المان‌های نفوذ مزداک روی بخش‌های صفحه چت:
    // ۱. پس‌زمینه نفوذ روی چت
    const fieldChat = document.querySelector('.field-chat');
    if (fieldChat) fieldChat.classList.add('mazdak-bg');
    const messagesBox = document.getElementById('messages-box');
    if (messagesBox) messagesBox.classList.add('mazdak-bg');

    // ۲. قفل اسلات دستیاران (اسلات ۲) با نشان رسمی
    const assistantsCard = document.querySelector('.quad-assistants-card');
    if (assistantsCard) {
      assistantsCard.classList.add('slot-corrupted-breakdown', 'is-locked-cyber-breach');
      assistantsCard.style.pointerEvents = 'none';
    }

    // ۳. قفل اسلات گاوصندوق ۳ بعدی (اسلات ۴)
    const vaultCard = document.getElementById('quad-vault-card');
    if (vaultCard) {
      vaultCard.classList.add('vault-corrupted-breakdown', 'is-locked-cyber-breach');
      vaultCard.style.pointerEvents = 'none';
    }

    // ۴. کاور و مخدوش‌سازی عکس‌های برد اسناد با تصویر مزداک
    const cards = document.querySelectorAll('.evidence-card, .briefing-photo');
    cards.forEach(card => {
      card.classList.add('card-blackout', 'media-corrupted');
      card.style.pointerEvents = 'none';
      const img = card.querySelector('img');
      if (img && !img.dataset.origSrc) {
        img.dataset.origSrc = img.src;
        img.src = '/mazdak.jpg';
        img.classList.add('media-corrupted');
      }
      if (!card.querySelector('.mazdak-board-cover')) {
        const cover = document.createElement('img');
        cover.className = 'mazdak-board-cover';
        cover.src = '/mazdak.jpg';
        cover.alt = 'Mazdak Glitch';
        cover.loading = 'eager';
        card.appendChild(cover);
      }
    });

    // ۵. استقرار نوار پیشرفت «حذف پرونده‌ها» مستقیماً روی بخش برد اسناد (.evidence-board)
    let purgeHud = document.getElementById('recovery-evidence-purge-hud');
    if (!purgeHud) {
      const evidenceBoard = document.querySelector('.evidence-board');
      if (evidenceBoard) {
        purgeHud = make('div', 'evidence-purge-hud');
        purgeHud.id = 'recovery-evidence-purge-hud';
        purgeHud.innerHTML = `
          <div class="evidence-purge-header">
            <span class="evidence-purge-title">
              <span class="purge-pulse-dot"></span>
              <b>⚠️ نفوذگر مزداک // در حال پاک‌سازی و حذف دائم پرونده‌ها…</b>
            </span>
            <span class="evidence-purge-percent" id="evidence-purge-percent">۹۰٪</span>
          </div>
          <div class="evidence-purge-track">
            <div class="evidence-purge-fill" id="evidence-purge-fill" style="width: 90%;"></div>
          </div>
        `;
        const header = evidenceBoard.querySelector('header');
        if (header && header.nextSibling) {
          evidenceBoard.insertBefore(purgeHud, header.nextSibling);
        } else {
          evidenceBoard.prepend(purgeHud);
        }
      }
    }
    if (purgeHud) purgeHud.hidden = false;

    let hud = document.getElementById('recovery-live-chat-hud');
    if (document.querySelector('.evidence-board')) {
      if (hud) { hud.remove(); hud = null; }
    } else {
      if (!hud) {
        hud = make('div', 'recovery-live-chat-hud'); hud.id = 'recovery-live-chat-hud';
        hud.append(make('span', '', 'حذف پرونده‌ها'), make('div', 'recovery-live-progress'), make('b', '', '۹۰٪'));
        document.body.append(hud);
      }
      if (hud) hud.hidden = false;
    }
    updateProgress(calculatePurgeProgress(elapsed() - filmDelay));
  }
  function updateProgress(value) {
    const clamped = Math.max(90, Math.min(99, value));
    const rounded = Math.round(clamped);
    const faPercent = `${rounded.toLocaleString('fa-IR')}٪`;

    const purgeFill = document.getElementById('evidence-purge-fill');
    const purgePercent = document.getElementById('evidence-purge-percent');
    if (purgeFill) purgeFill.style.width = `${clamped}%`;
    if (purgePercent) purgePercent.textContent = faPercent;

    const hud = document.getElementById('recovery-live-chat-hud');
    if (hud) {
      hud.querySelector('.recovery-live-progress')?.style.setProperty('--progress', `${clamped}%`);
      const b = hud.querySelector('b');
      if (b) b.textContent = faPercent;
    }
  }
  function terminalScene() {
    chatScene();
    const host = document.querySelector('.field-chat') || document.body;
    let panel = document.getElementById('recovery-live-mini-terminal');
    if (!panel) {
      panel = make('section', 'recovery-live-mini-terminal');
      panel.id = 'recovery-live-mini-terminal';
      panel.setAttribute('aria-label', 'پایانه بازپس‌گیری بات امنیتی سایت');
      document.body.append(panel);
    }
    const position = () => {
      const rect = host.getBoundingClientRect();
      panel.style.right = `${Math.max(14, innerWidth - rect.right + 14)}px`;
      panel.style.bottom = `${Math.max(14, innerHeight - rect.bottom + 175)}px`;
      panel.style.width = `${Math.min(490, rect.width - 28)}px`;
    };
    const head = make('header');
    head.append(
      make('span', '', '🟢 ارتباط رمزنگاری شده و خصوصی با دستیاران'),
      make('small', '', 'NEXUS // SECURE SHELL')
    );
    panel.replaceChildren(head);
    const lines = make('div', 'recovery-live-terminal-lines');
    panel.append(lines);
    const prompts = [
      'بات امنیتی سایت > پروسه باز پسگیری سایت شروع شد...',
      '$ nexus.crypto --init --handshake=verified',
      '[OK] کانال امن با تیم دستیاران برقرار شد',
      '$ tracking.locate --target=hostile-signature',
      '[OK] رهگیری موقعیت مکانی متخاصم آغاز می‌شود...'
    ];
    let typedCharacters = 0;
    const update = () => {
      if (stage !== 'terminal' || !panel.isConnected) return clearInterval(timer);
      position();
      const start = Number(mediaManifest.stageSeconds.terminalStart);
      const progress = Math.max(0, (elapsed() - start) * 12);
      lines.replaceChildren();
      let remaining = Math.floor(progress);
      for (const prompt of prompts) {
        if (remaining <= 0) break;
        const isPersian = /[\u0600-\u06ff]/.test(prompt);
        const classes = [prompt.startsWith('[OK]') || prompt.startsWith('بات امنیتی') ? 'is-success' : '', isPersian ? 'is-rtl' : 'is-ltr'].filter(Boolean).join(' ');
        const line = make('p', classes);
        line.textContent = prompt.slice(0, Math.min(prompt.length, remaining));
        lines.append(line);
        remaining -= prompt.length + 4;
      }
      const nextTypedCharacters = Math.floor(progress);
      if (nextTypedCharacters > typedCharacters) playTypingKeys(nextTypedCharacters - typedCharacters);
      typedCharacters = nextTypedCharacters;
      lines.scrollTop = lines.scrollHeight;
    };
    const timer = setInterval(update, 100);
    update();
  }
  function mapScene() {
    document.getElementById('recovery-evidence-purge-hud')?.setAttribute('hidden', '');
    document.getElementById('recovery-live-chat-hud')?.setAttribute('hidden', '');
    document.getElementById('recovery-live-mini-terminal')?.remove();
    const screen = shell('is-map');
    screen.append(make('small', 'recovery-live-kicker', 'ردیابی جغرافیایی / بات امنیتی سایت'));
    const mapBox = make('div', 'recovery-live-map'); screen.append(mapBox);
    const caption = make('h2', 'recovery-live-map-caption', 'در حال یافتن محل تجمع تیم دستیاران'); screen.append(caption);
    const offlineMap = make('div', 'recovery-live-map-offline');
    mapBox.append(offlineMap);
    const hud = make('div', 'recovery-live-map-hud'); screen.append(hud);
    const coordinates = make('span', '', `LAT ${Number(state.latitude || 0).toFixed(6)}  ·  LON ${Number(state.longitude || 0).toFixed(6)}`);
    hud.append(make('span', '', 'کانال ردیابی / فعال'), make('div', 'recovery-live-target-ring'), coordinates);
    const offset = Math.max(0, elapsed() - Number(mediaManifest.stageSeconds.mapStart));
    let classPin = null, hostilePin = null;
    const terminal = make('section', 'recovery-live-map-terminal'); screen.append(terminal);
    terminal.append(make('strong', '', 'ردیابی مسیر / کانال امن'), make('p', '', '$ geo.trace --focus=street'));
    const mapLines = make('div', 'recovery-live-map-lines'); terminal.append(mapLines);
    const telemetry = make('p'); terminal.append(telemetry);
    const mapMessages = [
      [0, '[SCAN] نقشه مشهد بارگذاری شد'], [1, '$ route.focus --team --depth=18'],
      [8, '[LOCK] کوچه محل کلاس تثبیت شد'], [12, '$ trace.backtrack --hop=05'],
      [18, '$ route.focus --hostile --depth=18'], [27, '[LOCK] مختصات متخاصم تثبیت شد'],
      [28, '[READY] مسیر اتصال دوربین باز است']
    ];
    const shownMapMessages = new Set();
    let moveMap = (latLng, zoom, seconds = 0) => {
      if (!map) return;
      const options = { center: [Number(latLng[1]), Number(latLng[0])], zoom, essential: true };
      if (seconds > 0) map.flyTo({ ...options, duration: seconds * 1000 });
      else map.jumpTo(options);
    };
    const update = () => {
      if (stage !== 'map') return clearInterval(timer);
      const t = Math.max(0, elapsed() - Number(mediaManifest.stageSeconds.mapStart));
      const phase = t < 8 ? 'classApproach' : t < 12 ? 'classHold' : t < 18 ? 'country' : t < 27 ? 'hostileApproach' : 'hostileHold';
      offlineMap.dataset.phase = phase;
      if (phase !== mapPhase) {
        mapPhase = phase;
        if (phase === 'classApproach') { moveMap([Number(state.latitude), Number(state.longitude)], 18, Math.max(1.5, 8 - t)); caption.textContent = 'در حال زوم روی محل تجمع تیم دستیاران…'; }
        if (phase === 'classHold') { moveMap([Number(state.latitude), Number(state.longitude)], 18); classPin?.addTo(map); caption.textContent = 'محل تجمع دستیاران / کوچه تثبیت شد'; }
        if (phase === 'country') { moveMap([36.28418, 59.58813], 10, Math.max(2, 18 - t)); caption.textContent = 'ردیابی مسیر داخل مشهد آغاز شد'; }
        if (phase === 'hostileApproach') { moveMap(threat, 18, Math.max(2, 27 - t)); caption.textContent = 'در حال نزدیک شدن به آخرین نشانی متخاصم…'; }
        if (phase === 'hostileHold') { moveMap(threat, 18); hostilePin?.addTo(map); caption.textContent = 'موقعیت مکانی فرد متخاصم تثبیت شد'; }
      }
      if (phase === 'classHold') caption.textContent = 'محل تجمع دستیاران / کوچه تثبیت شد';
      const hostileFocus = phase === 'hostileApproach' || phase === 'hostileHold';
      hud.classList.toggle('is-hostile', hostileFocus);
      coordinates.textContent = hostileFocus ? 'LAT 36.256351  ·  LON 59.603964'
        : `LAT ${Number(state.latitude).toFixed(6)}  ·  LON ${Number(state.longitude).toFixed(6)}`;
      telemetry.textContent = phase === 'classApproach' ? `[SCAN] CLASS // ZOOM ${Math.min(18, Math.round(10 + t))}`
        : phase === 'classHold' ? `[LOCK] ${Number(state.latitude).toFixed(6)}, ${Number(state.longitude).toFixed(6)}  // 18/18`
          : phase === 'country' ? '[TRACE] HOP 03/05 // نمای شهری مشهد'
            : phase === 'hostileApproach' ? `[SCAN] UNKNOWN // ZOOM ${Math.min(18, Math.round(10 + ((t - 18) / 9) * 8))}`
              : '[LOCK] 36.256351, 59.603964 // هدف متخاصم';
      for (const [second, message] of mapMessages) {
        if (t >= second && !shownMapMessages.has(second)) {
          shownMapMessages.add(second); mapLines.append(make('p', '', message));
          while (mapLines.children.length > 5) mapLines.firstChild.remove();
        }
      }
    };
    const timer = setInterval(update, 200);
    update();
    if (state.latitude != null && state.longitude != null) {
      loadMapLibre().then(({ maplibregl, basemaps }) => {
        if (stage !== 'map' || !mapBox.isConnected) return;
        const styleFor = archive => ({
          version: 8,
          glyphs: `${location.origin}/assets/recovery/maps/fonts/{fontstack}/{range}.pbf`,
          sprite: `${location.origin}/assets/recovery/maps/sprites/dark`,
          sources: {
            protomaps: {
              type: 'vector',
              url: `pmtiles://${location.origin}/assets/recovery/maps/pmtiles/${archive}`,
              attribution: 'Protomaps © OpenStreetMap contributors'
            }
          },
          layers: basemaps.layers('protomaps', basemaps.namedFlavor('dark'), { lang: 'en' })
        });
        const center = offset >= 24 ? [threat[1], threat[0]]
          : offset >= 8 && offset < 12 ? [Number(state.longitude), Number(state.latitude)] : [59.58813, 36.28418];
        map = new maplibregl.Map({
          container: mapBox,
          style: styleFor('mashhad-v2.pmtiles'),
          center,
          zoom: offset >= 24 || (offset >= 8 && offset < 12) ? 18 : 10,
          interactive: false,
          attributionControl: true,
          fadeDuration: 0
        });
        mapBox.__recoveryMap = map;
        map.on('load', () => {
          if (stage !== 'map') return;
          mapBox.classList.add('has-live-tiles');
          classPin = new maplibregl.Marker({ color: '#6ee7a8' }).setLngLat([Number(state.longitude), Number(state.latitude)]);
          hostilePin = new maplibregl.Marker({ color: '#f36a69' }).setLngLat([threat[1], threat[0]]);
          mapPhase = '';
          update();
        });
        map.on('error', event => {
          if (mapBox.classList.contains('has-live-tiles')) return;
          mapBox.classList.add('is-offline-map');
          if (event?.error) console.warn('[RECOVERY_MAP]', event.error.message);
        });
      }).catch(() => {
        mapBox.classList.add('is-offline-map');
      });
    }
  }
  function countdownScene() {
    const screen = shell('is-countdown');
    screen.append(make('p', '', 'اتصال به دوربین و سیستم فرد متخاصم تا'));
    const digit = make('strong'); screen.append(digit);
    let lastDigit = -1;
    const tick = () => {
      const raw = Math.max(1, Math.ceil(5 - (elapsed() - Number(mediaManifest.stageSeconds.countdownStart))));
      digit.textContent = raw.toLocaleString('fa-IR');
      if (raw !== lastDigit) {
        lastDigit = raw;
        digit.style.transform = 'scale(1.22)';
        setTimeout(() => { if (digit.isConnected) digit.style.transform = 'scale(1)'; }, 150);
        playClockTick(raw === 1 ? 1.35 : 1.0);
      }
    };
    tick(); const timer = setInterval(() => { if (stage !== 'countdown') clearInterval(timer); else tick(); }, 100);
  }
  function filmScene() {
    const screen = shell('is-film');
    const filmWrap = make('div', 'recovery-live-film');
    screen.append(filmWrap);

    // Live video feed of hostile system
    video = make('video', 'recovery-live-film-feed');
    video.poster = '/assets/recovery/mazdak-live-camera.jpg';
    video.playsInline = true; video.preload = 'auto'; video.muted = !audioReady;
    let savedProgress = null;
    try { savedProgress = JSON.parse(sessionStorage.getItem(filmProgressKey(state)) || 'null'); } catch (_) { /* Start at the beginning. */ }
    const savedIndex = Number(savedProgress?.index);
    const resume = Number.isInteger(savedIndex) && savedIndex >= 0 && savedIndex < mediaManifest.segments.length
      && Number.isFinite(Number(savedProgress?.time)) && Number(savedProgress.time) >= 0 ? savedProgress : null;
    let segmentIndex = resume ? savedIndex : 0;
    let segmentStart = mediaManifest.segments.slice(0, segmentIndex).reduce((sum, clip) => sum + Number(clip.durationSeconds), 0);
    let resumePending = Boolean(resume), lastSavedProgress = -1;
    video.autoplay = !resumePending;
    filmWrap.append(video);

    const cameraHud = make('div', 'recovery-live-camera-hud'); screen.append(cameraHud);
    cameraHud.append(make('span', 'recovery-live-camera-live', '●  LIVE / REMOTE CAM'));
    const cameraTime = make('span', 'recovery-live-camera-time', '00:00'); cameraHud.append(cameraTime);
    screen.append(make('div', 'recovery-live-camera-corners'));
    const status = make('div', 'recovery-live-film-status', 'در حال آماده‌سازی ارتباط تصویری…'); screen.append(status);
    const rescue = make('section', 'recovery-live-intercept'); screen.append(rescue);
    rescue.append(make('div', 'recovery-live-intercept-grid'));
    const desktopBar = make('div', 'recovery-live-desktop-bar'); rescue.append(desktopBar);
    desktopBar.append(make('span', 'recovery-live-desktop-mark', '▣  REMOTE DESKTOP / MAZDAK'), make('span', '', 'SESSION 04 · FILE SYSTEM ACTIVE'));
    const operation = make('header', 'recovery-live-operation'); rescue.append(operation);
    operation.append(make('small', '', 'SECURITY EVENT / LIVE INTERCEPT'));
    const operationTitle = make('h1', '', 'فرمان حذف فعال شد'); operation.append(operationTitle);
    const operationDetail = make('p', '', 'چهار مسیر پرونده هم‌زمان هدف قرار گرفتند.'); operation.append(operationDetail);
    const dossier = make('div', 'recovery-live-intercept-dossier'); rescue.append(dossier);
    const attack = make('div', 'recovery-live-intercept-attack'); dossier.append(attack);
    const attackBar = make('div', 'recovery-live-window-bar'); attack.append(attackBar);
    attackBar.append(make('span', '', '▣  پرونده‌ها / اسناد سامانه'), make('span', 'recovery-live-window-controls', '—  □  ×'));
    attack.append(make('small', '', 'MAZDAK / DELETE SEQUENCE'), make('h2', '', 'حذف پرونده‌های سامانه'));
    const targets = make('div', 'recovery-live-intercept-targets'); attack.append(targets);
    const vaultPod = make('div', 'recovery-live-vault-pod'); attack.append(vaultPod);
    for (const [label, filename] of [['پرونده راز دهکده', 'RAZE-DEHKADE.case'], ['تصاویر دستیاران', 'ASSISTANTS.img'],
      ['اسناد کشف‌شده', 'EVIDENCE.vault'], ['کانال ارتباطی', 'COMMAND.link']]) {
      const row = make('div', 'recovery-live-intercept-target');
      const fileMeta = make('div', 'recovery-live-file-meta');
      fileMeta.append(make('span', '', label), make('code', '', filename));
      row.append(make('span', 'recovery-live-file-icon', '▤'), fileMeta, make('b', '', 'در خطر')); targets.append(row);
    }
    const defense = make('div', 'recovery-live-intercept-defense'); dossier.append(defense);
    const defenseBar = make('div', 'recovery-live-window-bar'); defense.append(defenseBar);
    defenseBar.append(make('span', '', '●  NEXUS / SECURE SHELL'), make('span', 'recovery-live-window-controls', '—  □  ×'));
    defense.append(make('small', '', 'NEXUS / COUNTERMEASURE'), make('h2', '', 'ایزوله‌سازی مسیر حذف'));
    const defenseLog = make('div', 'recovery-live-intercept-log'); defense.append(defenseLog);
    const shield = make('div', 'recovery-live-intercept-shield', '◇'); defense.append(shield);
    const verdict = make('p', 'recovery-live-intercept-verdict', 'در حال شناسایی فرمان حذف…'); rescue.append(verdict);
    const taskbar = make('div', 'recovery-live-desktop-taskbar'); rescue.append(taskbar);
    taskbar.append(make('span', '', '▣   FILES    ◈   NETWORK    ◇   SECURE SHELL'), make('span', '', 'REMOTE SESSION  ·  NEXUS WATCHING'));
    const retry = make('button', 'recovery-live-play', 'فعال‌سازی صدا'); retry.hidden = true; screen.append(retry);
    retry.onclick = () => {
      retry.hidden = true;
      if (video.error) { video.src = mediaManifest.segments[segmentIndex].src; video.load(); }
      video.muted = false;
      audioReady = true;
      startFilm();
    };
    const startFilm = () => video.play().then(() => {
      retry.hidden = !video.muted;
      status.textContent = video.muted ? 'تصویر برقرار شد؛ برای صدا کلیک کنید' : 'اتصال تصویری و صوتی برقرار شد';
    }).catch(() => {
      video.muted = true;
      return video.play().then(() => {
        retry.hidden = false;
        retry.textContent = 'فعال‌سازی صدا';
        status.textContent = 'تصویر برقرار شد؛ برای صدا کلیک کنید';
      }).catch(() => {
        retry.hidden = false;
        retry.textContent = 'تلاش دوباره برای پخش تصویر';
        status.textContent = 'ارتباط تصویری برقرار نشد؛ دوباره تلاش کنید';
      });
    });
    video.addEventListener('waiting', () => { if (!video.error) status.textContent = 'در حال دریافت ارتباط تصویری…'; });
    video.addEventListener('stalled', () => { if (!video.error) status.textContent = 'در حال تکمیل اتصال تصویری…'; });
    video.addEventListener('playing', () => {
      retry.hidden = !video.muted;
      status.textContent = video.muted ? 'تصویر برقرار شد؛ برای صدا کلیک کنید' : 'اتصال تصویری و صوتی برقرار شد';
    });
    video.addEventListener('error', () => {
      status.textContent = 'اتصال تصویری برقرار شد';
    });
    const sync = () => {
      if (stage !== 'film') return;
      // The film and interception must follow decoded media time, including while buffering.
      const time = segmentStart + (Number.isFinite(video.currentTime) ? Math.max(0, video.currentTime) : 0);
      if (!resumePending && Number.isFinite(video.currentTime) && video.readyState > 0) {
        const progressBucket = Math.floor(time * 2);
        if (progressBucket !== lastSavedProgress) {
          lastSavedProgress = progressBucket;
          sessionStorage.setItem(filmProgressKey(state), JSON.stringify({ index: segmentIndex, time: video.currentTime }));
        }
      }
      const from = Number(mediaManifest.shrinkAtSeconds), to = Number(mediaManifest.expandAtSeconds);
      const intercepted = time >= from && time < to;
      filmWrap.classList.toggle('is-small', intercepted);
      cameraHud.classList.toggle('is-small', intercepted);
      cameraTime.textContent = `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}`;
      rescue.classList.toggle('is-active', intercepted);
      if (intercepted) {
        const ratio = Math.min(1, Math.max(0, (time - from) / (to - from)));
        rescue.style.setProperty('--intercept-progress', `${Math.round(ratio * 100)}%`);
        dossier.classList.toggle('is-countering', ratio >= .35);
        operation.classList.toggle('is-secure', ratio >= .8);
        operationTitle.textContent = ratio < .35 ? 'فرمان حذف فعال شد' : ratio < .8 ? 'مسیر حذف در حال قطع‌شدن است' : 'کنترل پرونده‌ها بازگشت';
        operationDetail.textContent = ratio < .35 ? 'چهار مسیر پرونده هم‌زمان هدف قرار گرفتند.'
          : ratio < .8 ? 'بات امنیتی سایت، دسترسی نوشتن مهاجم را از اسناد جدا می‌کند.'
            : 'نسخه‌های سالم بررسی و به بات امنیتی سایت بازگردانده شدند.';
        const steps = [
          '$ trace.command --origin=hostile',
          '[WARN] حذف هم‌زمان ۴ پرونده شناسایی شد',
          '$ isolate.channel --cut-write-access',
          '[OK] نسخه سالم اسناد در محفظه امن یافت شد',
          '$ restore.snapshot --verify-hash',
          '[LOCK] فرمان حذف از شبکه جدا شد'
        ];
        defenseLog.replaceChildren(...steps.slice(0, Math.max(1, Math.ceil(ratio * steps.length))).map(line => make('p', '', line)));
        targets.querySelectorAll('.recovery-live-intercept-target').forEach((row, index) => {
          const saved = ratio >= [.52, .64, .76, .88][index];
          row.style.setProperty('--risk', `${Math.round(Math.min(96, ratio / .36 * 96))}%`);
          row.classList.toggle('is-saved', saved);
          row.querySelector('b').textContent = saved ? 'ایمن شد' : 'در خطر';
        });
        verdict.textContent = ratio < .35 ? 'فرمان حذف به پرونده‌ها رسید' : ratio < .8 ? 'مسیر نوشتن قطع شد؛ نسخه‌های سالم در حال بازگردانی‌اند' : 'فرمان متخاصم مهار شد';
      }
    };
    video.addEventListener('timeupdate', sync);
    const fallbackTicker = setInterval(() => { if (stage === 'film') sync(); else clearInterval(fallbackTicker); }, 250);
    video.addEventListener('loadedmetadata', () => {
      if (resumePending) {
        const wanted = Math.min(Math.max(0, Number(resume.time)), Math.max(0, video.duration - 0.25));
        resumePending = false;
        video.currentTime = wanted;
        startFilm();
      }
      sync();
    });
    video.addEventListener('ended', () => {
      if (stage === 'film') {
        if (segmentIndex < mediaManifest.segments.length - 1) {
          segmentStart += Number(mediaManifest.segments[segmentIndex].durationSeconds); segmentIndex++;
          video.src = filmMediaUrls[segmentIndex] || mediaManifest.segments[segmentIndex].src;
          sessionStorage.setItem(filmProgressKey(state), JSON.stringify({ index: segmentIndex, time: 0 }));
          const small = segmentStart >= Number(mediaManifest.shrinkAtSeconds) && segmentStart < Number(mediaManifest.expandAtSeconds);
          filmWrap.classList.toggle('is-small', small); cameraHud.classList.toggle('is-small', small);
          rescue.classList.toggle('is-active', small);
          startFilm();
        } else {
          status.textContent = 'ارتباط دوربین قطع شد';
          filmDone = true;
          filmCompletedAt = Date.now();
          filmDelay = Math.max(0, elapsed() - filmEnd());
          sessionStorage.setItem(filmCheckpointKey(state), JSON.stringify({ delay: filmDelay, completedAt: filmCompletedAt }));
          sessionStorage.removeItem(filmProgressKey(state));
        }
      }
    });
    (async () => {
      try {
        status.textContent = 'در حال برقراری ارتباط تصویری…';
        await prepareFilmMedia(mediaManifest);
        video.src = filmMediaUrls[segmentIndex] || mediaManifest.segments[segmentIndex].src;
      } catch (_) {
        status.textContent = 'مسیر محلی آماده نشد؛ اتصال مستقیم در حال برقراری است…';
        video.src = mediaManifest.segments[segmentIndex].src;
      }
      if (!video.isConnected || stage !== 'film') return;
      if (!resumePending) startFilm();
    })();
  }
  function restoringScene() {
    const screen = shell('is-restoring');
    screen.append(make('small', 'recovery-live-kicker', 'بات امنیتی سایت / بازیابی کنترل'));
    screen.append(make('h1', '', 'ارتباط امن برقرار شد و دسترسی عامل نفوذی قطع شد'));
    screen.append(make('p', '', 'در حال پاک‌سازی آثار مزداک و بازگرداندن چت قبلی…'));
    document.body.classList.remove('system-compromised-red');
    document.getElementById('recovery-live-chat-hud')?.setAttribute('hidden', '');
    restorationTimers.push(setTimeout(() => {
      if (stage === 'restoring') restoreBoardScene();
    }, 2200));
  }
  function restoreBoardScene() {
    if (boardRestoreStarted) return;
    boardRestoreStarted = true;
    if (overlay) overlay.hidden = true;
    document.documentElement.classList.remove('recovery-live-in-chat', 'recovery-live-preactive');
    document.getElementById('recovery-evidence-purge-hud')?.remove();
    document.getElementById('recovery-live-chat-hud')?.setAttribute('hidden', '');
    document.getElementById('recovery-live-mini-terminal')?.remove();
    document.body.classList.add('recovery-live-restoring');

    const fieldChat = document.querySelector('.field-chat');
    if (fieldChat) fieldChat.classList.add('recovery-live-chat-returning');
    const messagesBox = document.getElementById('messages-box');

    const msgInput = document.getElementById('msg-input');
    if (msgInput) {
      msgInput.removeAttribute('readonly');
      msgInput.placeholder = 'گزارش یا سرنخ خود را به مرکز فرماندهی مخابره کنید…';
    }
    document.querySelectorAll('.composer-controls button, .composer-controls input').forEach(el => {
      el.removeAttribute('disabled');
    });

    const cards = [...document.querySelectorAll('.evidence-card, .briefing-photo')];
    cards.forEach((card, index) => restorationTimers.push(setTimeout(() => {
      card.classList.add('recovery-live-item-restoring');
      card.querySelectorAll('.mazdak-board-cover, .evidence-mazdak-glitch-cover').forEach(cover => cover.classList.add('recovery-live-mazdak-leaving'));
      restorationTimers.push(setTimeout(() => {
        card.querySelectorAll('.mazdak-board-cover, .evidence-mazdak-glitch-cover').forEach(cover => cover.remove());
        card.classList.remove('card-blackout', 'media-corrupted', 'recovery-live-item-restoring');
        card.style.pointerEvents = '';
        const img = card.querySelector('img');
        if (img && img.dataset.origSrc) { img.src = img.dataset.origSrc; delete img.dataset.origSrc; img.classList.remove('media-corrupted'); }
      }, 520));
    }, index * 520)));

    const unlockDelay = Math.min(7000, cards.length * 520 + 700);
    restorationTimers.push(setTimeout(() => {
      const assistantsCard = document.querySelector('.quad-assistants-card');
      if (assistantsCard) { assistantsCard.classList.remove('slot-corrupted-breakdown', 'is-locked-cyber-breach'); assistantsCard.style.pointerEvents = ''; }
      const vaultCard = document.getElementById('quad-vault-card');
      if (vaultCard) { vaultCard.classList.remove('vault-corrupted-breakdown', 'is-locked-cyber-breach'); vaultCard.style.pointerEvents = ''; }
      if (fieldChat) fieldChat.classList.remove('mazdak-bg', 'recovery-live-chat-returning');
      if (messagesBox) messagesBox.classList.remove('mazdak-bg');
      window.cyberBreachEngine?.reset?.();
      document.body.classList.remove('hacked-theme', 'cyber-breach-active', 'system-compromised-red');
    }, unlockDelay));

    const chatTitle = document.getElementById('chat-title');
    if (chatTitle) chatTitle.textContent = 'مرکز فرماندهی';
  }
  function stageFor(time) {
    if (time < Number(mediaManifest.stageSeconds.listEnd)) return 'list';
    if (time < Number(mediaManifest.stageSeconds.terminalStart)) return 'chat';
    if (time < Number(mediaManifest.stageSeconds.mapStart)) return 'terminal';
    if (time < Number(mediaManifest.stageSeconds.countdownStart)) return 'map';
    if (time < Number(mediaManifest.preFilmSeconds)) return 'countdown';
    if (time < filmEnd()) return 'film';
    if (time < filmEnd() + 15) return 'restoring';
    return 'restore-board';
  }
  async function tick() {
    if (!state || !['RUNNING', 'RESTORING'].includes(state.phase)) return;
    const rawTime = elapsed();
    const time = rawTime - filmDelay;
    const postFilmSeconds = filmDone && filmCompletedAt ? Math.max(0, (Date.now() - filmCompletedAt) / 1000) : 0;
    const next = filmDone
      ? (postFilmSeconds < Number(mediaManifest.restorationSeconds) ? 'restoring' : 'restore-board')
      : (rawTime >= Number(mediaManifest.preFilmSeconds) ? 'film' : stageFor(time));
    if (next !== stage) {
      stage = next;
      if (next === 'list') listScene();
      if (next === 'chat') chatScene();
      if (next === 'terminal') terminalScene();
      if (next === 'map') mapScene();
      if (next === 'countdown') countdownScene();
      if (next === 'film') filmScene();
      if (next === 'restoring') restoringScene();
      if (next === 'restore-board') restoreBoardScene();
    }
    if (next === 'chat' || next === 'terminal') updateProgress(calculatePurgeProgress(time));
    for (const [key, at] of Object.entries({ ...mediaManifest.cueSeconds, bot1: filmEnd(), bot2: filmEnd() + 8 })) {
      if ((key === 'bot1' || key === 'bot2') && !filmDone) continue;
      if (time >= at && !sentCues.has(key) && Date.now() >= (cueRetryAt.get(key) || 0)) {
        try {
          const res = await request(`/cues/${key}`, { method: 'POST' });
          sentCues.add(key);
          if (res && res.message && typeof renderMessage === 'function') {
            renderMessage(res.message);
            const box = document.getElementById('messages-box');
            if (box) box.scrollTop = box.scrollHeight;
          }
        }
        catch (_) { cueRetryAt.set(key, Date.now() + 3000); }
      }
    }
    if (filmDone && postFilmSeconds >= Number(mediaManifest.restorationSeconds) && !completed) {
      try { await request('/complete', { method: 'POST' }); completed = true; await refresh(); }
      catch (_) { /* The server guards the minimum duration. */ }
    }
  }
  async function refresh() {
    if (pending) return;
    pending = true;
    try {
      const result = await request(); state = result.state;
      serverOffset = Date.parse(state.serverTime) - Date.now();
      let currentSession = {};
      try { currentSession = JSON.parse(sessionStorage.getItem('userSession') || '{}'); } catch (_) {}
      const hackIsStillActive = Boolean(currentSession.is_hacked) || localStorage.getItem(`session_hacked_${id}`) === '1';
      // A newly-triggered legacy hack intentionally has no active recovery run yet. In that
      // window the API returns DORMANT; it is not a completed recovery and must not reset
      // the breach animation that has just started.
      if (state.phase === 'DORMANT' && hackIsStillActive) {
        if (overlay) overlay.hidden = true;
        return;
      }
      if (state.id && loadedRunId !== state.id) {
        restoredNotified = false;
        loadedRunId = state.id; filmDone = false; filmDelay = 0; filmCompletedAt = 0; completed = false; boardRestoreStarted = false; sentCues.clear(); cueRetryAt.clear();
        restorationTimers.forEach(clearTimeout); restorationTimers = [];
        try {
          const saved = JSON.parse(sessionStorage.getItem(filmCheckpointKey(state)) || 'null');
          if (saved) {
            filmDone = true;
            filmDelay = Math.max(0, Number(saved.delay) || 0);
            filmCompletedAt = Math.max(0, Number(saved.completedAt) || Date.now());
          }
        } catch (_) { /* The film will play if no valid progress was saved. */ }
      }
      if (state.phase === 'DORMANT' || state.phase === 'RESTORED') {
        document.documentElement.classList.remove('recovery-live-preactive', 'recovery-live-in-chat');
        if (overlay) overlay.hidden = true;
        document.getElementById('recovery-evidence-purge-hud')?.remove();
        document.getElementById('recovery-live-chat-hud')?.setAttribute('hidden', '');
        document.getElementById('recovery-live-mini-terminal')?.remove();
        document.body.classList.remove('recovery-live-restoring', 'hacked-theme', 'cyber-breach-active', 'system-compromised-red');
        window.cyberBreachEngine?.reset?.();
        const chatTitle = document.getElementById('chat-title');
        if (chatTitle) chatTitle.textContent = 'مرکز فرماندهی';
        if (!restoredNotified && loadedRunId) {
          restoredNotified = true;
          window.dispatchEvent(new Event('recovery_live_restored'));
        }
        return;
      }
      if (['WAITING_FOR_CLASS', 'MATCHING'].includes(state.phase)) {
        await loadRoster(); if (stage !== 'waiting') { stage = 'waiting'; waiting(); }
      } else if (state.phase === 'PAUSED') {
        stage = 'paused'; const screen = shell('is-paused');
        screen.append(make('h1', '', 'ارتباط موقتاً متوقف شد'), make('p', '', 'لطفاً همین صفحه را باز نگه دارید.'));
      } else { if (!roster.length) await loadRoster(); await tick(); }
    } catch (_) { /* A later socket event or poll retries. */ }
    finally { pending = false; }
  }
  window.recoveryClient = { refresh };
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const response = await fetch('/assets/recovery/manifest.json', { cache: 'no-cache' });
      if (response.ok) mediaManifest = await response.json();
    } catch (_) { /* Built-in sample manifest remains available offline. */ }
    refresh();
    setInterval(tick, 500);
    setInterval(refresh, 3500);
    const bind = () => window.socket ? window.socket.on('recovery_live_updated', event => {
      if (Number(event.sessionId) === id) refresh();
    }) : setTimeout(bind, 250);
    bind();
  });
})();
