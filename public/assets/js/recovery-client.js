/* One document owns chat, live audio, collective recording, and recovery. */
(() => {
  let state = null, overlay = null, recorder = null, camera = null, chunks = [], countdown = null;
  let started = false, sequenceAborted = false, busy = false, renderedKey = '';
  const id = Number(JSON.parse(sessionStorage.getItem('userSession') || '{}').id);
  const token = sessionStorage.getItem('userToken');
  if (!id || !token) return;
  const api = `/api/recovery/sessions/${id}`;
  const headers = { Authorization: `Bearer ${token}` };
  const $ = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text != null) el.textContent = text; return el; };
  const sleep = async ms => {
    for (let left = ms; left > 0; left -= 100) {
      await new Promise(resolve => setTimeout(resolve, Math.min(100, left)));
      if (sequenceAborted) throw new Error('sequence-paused');
    }
  };
  const request = async (url, options = {}) => {
    const res = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'ارتباط برقرار نشد. دوباره تلاش کنید.');
    return data;
  };
  function shell(className = '') {
    if (!overlay) { overlay = $('div', 'recovery-overlay'); document.body.append(overlay); }
    overlay.className = `recovery-overlay ${className}`;
    overlay.hidden = false;
    overlay.replaceChildren();
    const card = $('section', 'recovery-card'); overlay.append(card);
    return card;
  }
  function errorAt(card, message) { let el = card.querySelector('.recovery-error'); if (!el) { el = $('p', 'recovery-error'); card.append(el); } el.textContent = message; }
  function closeOverlay() { if (overlay) overlay.hidden = true; }
  async function mediaBlob(mediaId) {
    const res = await fetch(`${api}/submissions/${mediaId}/media`, { headers });
    if (!res.ok) throw new Error('پیش‌نمایش ویدیو دریافت نشد.');
    return URL.createObjectURL(await res.blob());
  }
  async function approved(card) {
    const data = await request(`${api}/submissions`);
    const wrap = $('div', 'recovery-approved'); card.append(wrap);
    for (const item of data.items) {
      const tile = $('div'); tile.append($('strong', '', '✓ تأیید شد'));
      const video = $('video'); video.controls = true; video.preload = 'metadata';
      mediaBlob(item.id).then(url => { video.src = url; }).catch(() => {});
      tile.append(video); wrap.append(tile);
    }
  }
  function prepareSubmission(card, file, filename) {
    card.querySelector('#recovery-send')?.remove();
    const send = $('button', '', 'ارسال ویدیو برای بررسی'); send.id = 'recovery-send'; card.append(send);
    const submissionId = crypto.randomUUID().replace(/-/g, '');
    send.onclick = async () => {
      if (busy) return; busy = true; send.disabled = true;
      const form = new FormData(); form.append('video', file, filename);
      form.append('client_submission_id', submissionId);
      try { await request(`${api}/submissions`, { method: 'POST', body: form }); await refresh(); }
      catch (e) { errorAt(card, e.message); send.disabled = false; } finally { busy = false; }
    };
  }
  async function record(card) {
    if (recorder || busy) return;
    try {
      const liveAudio = typeof localStream !== 'undefined' ? localStream?.getAudioTracks().find(t => t.readyState === 'live') : null;
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: !liveAudio });
      camera = videoStream;
      const tracks = [...videoStream.getVideoTracks()];
      // The live listening track remains owned by user-chat.js; recording gets a clone.
      if (liveAudio) tracks.push(liveAudio.clone());
      else tracks.push(...videoStream.getAudioTracks());
      const stream = new MediaStream(tracks.filter((t, i, a) => a.indexOf(t) === i));
      const mime = ['video/mp4', 'video/webm;codecs=vp8,opus', 'video/webm'].find(x => MediaRecorder.isTypeSupported(x));
      if (!mime) throw new Error('ضبط ویدیو در این مرورگر پشتیبانی نمی‌شود.');
      recorder = new MediaRecorder(stream, { mimeType: mime }); chunks = [];
      const preview = card.querySelector('video'); preview.hidden = false; preview.srcObject = stream; preview.muted = true; preview.play().catch(() => {});
      const timer = card.querySelector('.recovery-timer');
      timer.hidden = false;
      let remaining = 60; timer.textContent = remaining.toLocaleString('fa-IR');
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => {
        clearInterval(countdown); countdown = null;
        timer.hidden = true;
        camera?.getTracks().forEach(t => t.stop()); stream.getTracks().filter(t => t !== liveAudio).forEach(t => t.stop());
        camera = null; recorder = null;
        const blob = new Blob(chunks, { type: mime.split(';')[0] });
        if (!blob.size) return errorAt(card, 'ویدیو ضبط نشد؛ دوباره تلاش کنید.');
        preview.srcObject = null; preview.src = URL.createObjectURL(blob); preview.muted = false; preview.controls = true;
        prepareSubmission(card, blob, mime.includes('mp4') ? 'class.mp4' : 'class.webm');
      };
      recorder.start(1000);
      countdown = setInterval(() => { remaining--; timer.textContent = Math.max(remaining, 0).toLocaleString('fa-IR'); if (remaining <= 0) recorder?.stop(); }, 1000);
      card.querySelector('#recovery-record').textContent = 'پایان ضبط';
      card.querySelector('#recovery-record').onclick = () => recorder?.stop();
    } catch (e) { errorAt(card, e.message || 'دوربین در دسترس نیست.'); }
  }
  async function renderGate() {
    const card = shell();
    card.append($('h1', '', 'احراز هویت جمعی'));
    card.append($('p', '', 'همه اعضای کلاس کنار هم، روبه‌روی دوربین قرار بگیرید. ویدیو را با وب‌کم یا گوشی بگیرید و برای مرکز بفرستید.'));
    const video = $('video'); video.playsInline = true; video.hidden = true; card.append(video);
    const timer = $('div', 'recovery-timer', '۶۰'); timer.hidden = true; card.append(timer);
    const btn = $('button', '', 'شروع ضبط ویدیو'); btn.id = 'recovery-record'; card.append(btn);
    btn.onclick = () => record(card);
    const fileLabel = $('label', 'recovery-file-label', 'وب‌کم ندارید؟ ویدیوی گوشی را آپلود کنید');
    const fileInput = $('input'); fileInput.type = 'file'; fileInput.accept = '.mp4,.webm,.mov,video/mp4,video/webm,video/quicktime';
    fileLabel.append(fileInput); card.append(fileLabel);
    fileInput.onchange = () => {
      const file = fileInput.files?.[0]; if (!file) return;
      card.querySelector('#recovery-send')?.remove(); errorAt(card, '');
      if (!/\.(mp4|webm|mov)$/i.test(file.name) || file.size > 100 * 1024 * 1024 || !file.size) {
        errorAt(card, 'فقط ویدیوی MP4، WebM یا MOV تا حجم ۱۰۰ مگابایت انتخاب کنید.'); return;
      }
      const url = URL.createObjectURL(file);
      fileLabel.firstChild.textContent = `ویدیوی انتخاب‌شده: ${file.name}`;
      video.hidden = false; video.srcObject = null; video.src = url; video.controls = true; video.muted = false;
      video.onloadedmetadata = () => {
        if (Number.isFinite(video.duration) && video.duration > 60.5) {
          errorAt(card, 'مدت ویدیو باید حداکثر ۱ دقیقه باشد.'); card.querySelector('#recovery-send')?.remove(); return;
        }
        errorAt(card, ''); prepareSubmission(card, file, file.name);
      };
      video.onerror = () => { errorAt(card, 'پیش‌نمایش این فرمت در مرورگر باز نشد؛ سرور مدت ویدیو را هنگام ارسال بررسی می‌کند.'); prepareSubmission(card, file, file.name); };
    };
    if (state.phase === 'REVIEWING') { const back = $('button', '', 'بازگشت به انتظار'); card.append(back); back.onclick = showWaiting; }
    card.append($('p', '', 'ویدیو حداکثر ۱ دقیقه است. فایل را انتخاب کنید، پیش‌نمایش را ببینید و ارسال کنید.'));
  }
  async function showWaiting() {
    const card = shell('recovery-waiting'); card.append($('h1', '', 'در انتظار ارتباط امن'));
    card.append($('p', '', 'ویدیوی کلاس ثبت شد. مرکز فرماندهی در حال بررسی است؛ همین صفحه را باز نگه دارید.'));
    await approved(card).catch(() => {});
    if (state.phase === 'REVIEWING') { const again = $('button', '', 'ارسال ویدیوی دیگر'); card.append(again); again.onclick = renderGate; }
  }
  async function refresh() {
    try {
      state = (await request(api)).state;
      if (state.phase === 'PAUSED') {
        sequenceAborted = true;
        const playing = overlay?.querySelector('video');
        if (playing) { playing.pause(); playing._recoveryAbort?.(); }
        const card = shell('recovery-waiting');
        card.append($('h1', '', 'ارتباط موقتاً متوقف شد'));
        card.append($('p', '', 'لطفاً همین صفحه را باز نگه دارید. مرکز فرماندهی ادامه را فعال می‌کند.'));
        return;
      }
      const key = `${state.phase}:${state.revision}`;
      if (key === renderedKey && state.phase !== 'CINEMATIC') return;
      renderedKey = key;
      if (state.phase === 'COLLECTING') await renderGate();
      else if (['REVIEWING', 'READY'].includes(state.phase)) await showWaiting();
      else if (state.phase === 'HACKED_CHAT') { closeOverlay(); document.body.classList.add('hacked-theme', 'cyber-breach-active', 'system-compromised-red'); }
      else if (state.phase === 'CINEMATIC') { document.body.classList.add('hacked-theme', 'cyber-breach-active', 'system-compromised-red'); if (!started) runCinematic(); }
      else if (state.phase === 'RESTORED') { localStorage.removeItem(`recovery-cinematic:${id}`); closeOverlay(); document.body.classList.remove('hacked-theme', 'cyber-breach-active', 'system-compromised-red'); window.cyberBreachEngine?.reset?.(); }
    } catch (_) { /* Retry on reconnect or next poll. */ }
  }
  let audioCtx = null;
  function playKeyClick() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioCtx) audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400 + Math.random() * 400, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.035);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch (_) {}
  }

  async function cinematicText(card, lines, ms, isCommand = false) {
    card.classList.remove('recovery-video-scene');
    if (isCommand) {
      card.parentElement.classList.add('recovery-command');
    } else {
      card.parentElement.classList.remove('recovery-command');
    }
    const terminal = $('div', 'recovery-terminal');
    card.replaceChildren(terminal);

    // Typewriter effect character by character
    const text = String(lines || '');
    terminal.textContent = '';
    
    // Calculate typing speed (around 45ms per char, calibrated for natural teletype)
    const charDelay = 45;
    for (let i = 0; i < text.length; i++) {
      terminal.textContent += text[i];
      if (text[i] !== ' ' && text[i] !== '\n') {
        playKeyClick();
      }
      await sleep(charDelay);
    }

    const remainingPause = Math.max(ms - (text.length * charDelay), 1200);
    await sleep(remainingPause);
  }
  async function breakTerminal(card) {
    card.replaceChildren($('div', 'recovery-terminal', 'مزداک\nاین پرونده را برای همیشه از بین می‌برم.'));
    if (!window.recoveryShatter?.shatter) throw new Error('انیمیشن شکست آماده نیست.');
    await window.recoveryShatter.shatter(card);
  }
  async function desktopRescue(card) {
    card.classList.remove('recovery-video-scene');
    const terminal = $('div', 'recovery-security-intercept'); card.replaceChildren(terminal);
    
    // Top Military Tactical HUD
    const hudBar = $('div', 'recovery-intercept-hud');
    hudBar.innerHTML = `
      <div class="hud-tag"><span class="pulse-dot"></span> SECURE PROTOCOL: DEFCON-1</div>
      <div class="hud-center">DEFENSIVE OVERRIDE TERMINAL // RAZE DEHKADE COMMAND</div>
      <div class="hud-tag">NODE: MSHD-ALPHA-01</div>
    `;
    terminal.append(hudBar);

    // Body split: Live Breach Stream & Intercept Matrix
    const body = $('div', 'recovery-intercept-body'); terminal.append(body);
    
    const stream = $('div', 'recovery-intercept-stream');
    stream.innerHTML = `
      <div class="stream-header">THREAT INTELLIGENCE FEED [MAZDAK_EXPLOIT]</div>
      <div class="stream-logs" id="intercept-logs">
        <p class="crit">> REMOTE INTRUSION DETECTED ON PORT 8089...</p>
        <p class="warn">> TARGETING: RAZEDEHKADE/CORE/DATABASE/ARCHIVE_RECORDS</p>
        <p class="crit">> UNAUTHORIZED PURGE ROUTINE EXECUTION IN PROGRESS...</p>
      </div>
    `;
    body.append(stream);

    const matrix = $('div', 'recovery-intercept-matrix');
    matrix.innerHTML = `
      <div class="matrix-title">تلاش برای نابودی پرونده‌ها توسط نفوذگر</div>
      <div class="matrix-status" id="purge-status-label">در حال حذف دیتابیس محرمانه...</div>
      <div class="matrix-progress-wrap">
        <div class="matrix-progress-bar" id="purge-progress-fill" style="width: 80%"></div>
      </div>
      <div class="matrix-counter" id="purge-percent-val">۸۰٪</div>
      <div class="matrix-command-msg" id="purge-cmd-note">مرکز فرماندهی: سیگنال نفوذ ردیابی شد. در حال ارسال پکت‌های مسدودساز...</div>
    `;
    body.append(matrix);

    const logBox = stream.querySelector('#intercept-logs');
    const fill = matrix.querySelector('#purge-progress-fill');
    const pctLabel = matrix.querySelector('#purge-percent-val');
    const statusLabel = matrix.querySelector('#purge-status-label');
    const note = matrix.querySelector('#purge-cmd-note');

    // Escalation 80% -> 83%
    for (let pct = 80; pct <= 83; pct++) {
      fill.style.width = `${pct}%`;
      pctLabel.textContent = `${pct.toLocaleString('fa-IR')}٪`;
      const p = $('p', 'crit', `> WIPING DATA BLOCKS [SECTOR ${pct * 12}]...`);
      logBox.append(p); logBox.scrollTop = logBox.scrollHeight;
      await sleep(700);
    }

    // Intercept engagement
    terminal.classList.add('is-intercepting');
    statusLabel.textContent = 'مداخلهٔ تدافعی مرکز فرماندهی فعال شد';
    statusLabel.classList.add('intervened');
    note.textContent = 'سیستم ضد نفوذ: پکت‌های تزریقی مزداک خنثی شد. بازیابی بلوک‌های حذف‌شده...';
    
    const p1 = $('p', 'safe', '> COUNTERMEASURE DEPLOYED: PACKET INTERCEPT SUCCESSFUL');
    const p2 = $('p', 'safe', '> DISCONNECTING HOSTILE ROUTE: 198.51.100.24 (MAZDAK)');
    logBox.append(p1, p2); logBox.scrollTop = logBox.scrollHeight;

    // Rollback 83% -> 0%
    for (let pct = 83; pct >= 0; pct -= 9) {
      const cur = Math.max(pct, 0);
      fill.style.width = `${cur}%`;
      pctLabel.textContent = `${cur.toLocaleString('fa-IR')}٪`;
      await sleep(350);
    }

    fill.style.width = '0%';
    pctLabel.textContent = '۰٪ (خنثی شد)';
    terminal.classList.add('is-secured');
    statusLabel.textContent = 'نفوذ مزداک به طور کامل مهار شد';
    note.textContent = 'مرکز فرماندهی: تمام داده‌ها و اسناد کارآگاهی بازگردانی شدند.';
    const p3 = $('p', 'safe', '> PURGE PROTOCOL ABORTED. DATABASE INTEGRITY: 100% SECURE.');
    logBox.append(p3); logBox.scrollTop = logBox.scrollHeight;
    await sleep(2500);
  }
  async function playPart(card, url) {
    card.classList.add('recovery-video-scene'); card.replaceChildren();
    
    // WebCam CCTV Surveillance Overlay
    const cctvOverlay = $('div', 'recovery-cctv-hud');
    cctvOverlay.innerHTML = `
      <div class="cctv-top-bar">
        <div class="cctv-cam-tag"><span class="cctv-rec-dot"></span> LIVE // CAM-FEED: LAPTOP_INTERNAL</div>
        <div class="cctv-time" id="cctv-live-clock">REC 00:00:00</div>
      </div>
      <div class="cctv-corners">
        <span class="corner tl"></span><span class="corner tr"></span>
        <span class="corner bl"></span><span class="corner br"></span>
      </div>
      <div class="cctv-bottom-bar">
        <span>FPS: 30.0 | ISO: 800 | ENCRYPTED LINK</span>
        <span>SECURITY LEVEL: MAXIMUM OVERRIDE</span>
      </div>
    `;

    const video = $('video');
    video.controls = false; // Never show native media player controls to keep webcam illusion
    video.playsInline = true;
    video.autoplay = true;
    video.src = url;
    card.append(video, cctvOverlay);

    const clockEl = cctvOverlay.querySelector('#cctv-live-clock');
    const clockTimer = setInterval(() => {
      const now = new Date();
      clockEl.textContent = `REC ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(Math.floor(now.getMilliseconds() / 100))}`;
    }, 100);

    const progressKey = `recovery-video:${id}:${state.sequenceStartedAt}:${url}`;
    let lastStored = -1, finished = false;
    video.onloadedmetadata = () => {
      const saved = Number(localStorage.getItem(progressKey));
      if (saved > 0 && Number.isFinite(video.duration)) video.currentTime = Math.min(saved, Math.max(0, video.duration - 0.5));
    };
    video.ontimeupdate = () => {
      if (finished) return;
      const second = Math.floor(video.currentTime);
      if (second !== lastStored && second >= 0) { lastStored = second; localStorage.setItem(progressKey, String(video.currentTime)); }
    };
    await new Promise((resolve, reject) => {
      video.onended = () => {
        finished = true;
        clearInterval(clockTimer);
        localStorage.removeItem(progressKey);
        resolve();
      };
      video.onerror = () => {
        clearInterval(clockTimer);
        reject(new Error('ویدیوی این صحنه هنوز آماده نیست.'));
      };
      video._recoveryAbort = () => {
        clearInterval(clockTimer);
        localStorage.setItem(progressKey, String(video.currentTime));
        reject(new Error('sequence-paused'));
      };
      video.play().catch(() => {
        const prompt = $('p', '', 'ارتباط با دوربین لپ‌تاپ برقرار شد. برای تماشا لمس کنید:');
        const play = $('button', 'recovery-play-resume', '👁️ مشاهدهٔ تصویر زندهٔ دوربین');
        card.append(prompt, play);
        play.onclick = () => video.play().then(() => { prompt.remove(); play.remove(); }).catch(() => errorAt(card, 'پخش تصویر ممکن نشد. دوباره تلاش کنید.'));
      });
    });
  }
  async function restoreVisuals(card) {
    card.classList.remove('recovery-video-scene');
    overlay.classList.add('recovery-restoring');
    
    // Smooth step-by-step unhack of the actual chat room in background
    await sleep(800);
    document.body.classList.remove('system-compromised-red');
    await sleep(1400);
    document.body.classList.remove('cyber-breach-active');
    await sleep(1600);
    window.cyberBreachEngine?.reset?.();
    document.body.classList.remove('hacked-theme');
    await sleep(1500);
  }
  async function runCinematic() {
    started = true; sequenceAborted = false;
    const card = shell('recovery-cinematic red');
    const checkpointKey = `recovery-cinematic:${id}`;
    const sequenceId = String(state.sequenceStartedAt || '');
    let checkpoint;
    try { checkpoint = JSON.parse(localStorage.getItem(checkpointKey) || 'null'); } catch (_) { checkpoint = null; }
    let completed = checkpoint?.sequenceId === sequenceId ? Number(checkpoint.completed) || 0 : 0;
    const scene = async (number, action) => {
      if (completed >= number) return;
      await action();
      if (sequenceAborted) throw new Error('sequence-paused');
      completed = number;
      localStorage.setItem(checkpointKey, JSON.stringify({ sequenceId, completed }));
    };
    try {
      await scene(1, () => cinematicText(card, 'مزداک\nفکر نمی‌کردم جرئت کنید برگردید.', 5000));
      await scene(2, async () => {
        const lat = Number(state.latitude), lon = Number(state.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('مختصات این کلاس آماده نیست.');
        if (!window.L) throw new Error('موتور نقشه بارگذاری نشد.');
        
        const map = $('div', 'recovery-map'); card.replaceChildren(map);
        const canvas = $('div', 'recovery-map-canvas'); map.append(canvas);
        const orbital = $('img', 'orbital'); orbital.src = '/assets/map/earth-orbital-space.jpg'; orbital.alt = 'نمای مدار زمین';
        
        // Cyber Satellite Overlay with Full HUD
        const cyberHud = $('div', 'recovery-map-hud');
        cyberHud.innerHTML = `
          <div class="hud-top-left">
            <div class="hud-line"><span class="blink">●</span> SATELLITE RECON PROTOCOL // ORBITAL-LOCK</div>
            <div class="hud-sub">SYS_TRACK: IRN-KH-MSHD // TARGET TRACE</div>
          </div>
          <div class="hud-top-right">
            <div class="hud-badge" id="hud-lock-status">SEARCHING TARGET...</div>
            <div class="hud-coords" id="hud-live-coords">LAT: --.------ | LON: --.------</div>
          </div>
          <div class="hud-crosshair">
            <div class="reticle-ring"></div>
            <div class="reticle-cross"></div>
          </div>
          <div class="hud-bottom-bar">
            <div class="hud-telemetry" id="hud-altitude">ALT: 480,000 KM (ORBITAL)</div>
            <div class="hud-progress-wrap"><div class="hud-progress-bar" id="hud-recon-fill"></div></div>
          </div>
        `;
        map.append(orbital, cyberHud);

        const leaflet = L.map(canvas, {
          zoomControl: false, dragging: false, scrollWheelZoom: false,
          doubleClickZoom: false, touchZoom: false, keyboard: false
        }).setView([32.4279, 53.6880], 4); // Centered over Iran regional view initially

        // Multi-tier dark cyber tile provider with reliable fallback
        const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19, keepBuffer: 4, updateWhenZooming: true,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(leaflet);

        const hudLock = cyberHud.querySelector('#hud-lock-status');
        const hudCoords = cyberHud.querySelector('#hud-live-coords');
        const hudAlt = cyberHud.querySelector('#hud-altitude');
        const hudFill = cyberHud.querySelector('#hud-recon-fill');

        try {
          await sleep(1000);
          map.classList.add('is-zooming');
          
          // Phase 1: High Orbit Descent to Regional Mashhad (Zoom 11)
          hudLock.textContent = 'TARGET VECTOR DETECTED';
          hudLock.classList.add('tracking');
          hudAlt.textContent = 'ALT: 12,000 M (STRATOSPHERE)';
          hudFill.style.width = '45%';
          
          leaflet.flyTo([lat, lon], 12, { duration: 4.5, easeLinearity: 0.25 });
          await sleep(4800);

          // Phase 2: Tactical Micro-descent to Exact Block (Zoom 18)
          hudLock.textContent = 'ENGAGING SECTOR RESOLUTION';
          hudAlt.textContent = 'ALT: 450 M (TACTICAL URBAN)';
          hudFill.style.width = '85%';
          
          leaflet.flyTo([lat, lon], 18, { duration: 4.0, easeLinearity: 0.20 });
          await sleep(4500);

          // Final Lock: Coordinates and Pulsing Reticle
          hudLock.textContent = 'LOCATION CONFIRMED // TARGET LOCKED';
          hudLock.classList.add('locked');
          hudCoords.textContent = `LAT: ${lat.toFixed(6)} | LON: ${lon.toFixed(6)}`;
          hudAlt.textContent = 'ALT: 250 M (PRECISION LOCK)';
          hudFill.style.width = '100%';

          // Cyber Target Beacon
          L.circleMarker([lat, lon], {
            radius: 14, color: '#00ffaa', weight: 2, fillColor: '#00ffaa', fillOpacity: 0.35
          }).addTo(leaflet);

          L.circle([lat, lon], {
            radius: 40, color: '#ff2d55', weight: 1.5, fillColor: 'transparent', dashArray: '4, 4'
          }).addTo(leaflet);

          map.classList.add('is-locked');
          await sleep(5500);
        } finally {
          leaflet.remove();
        }
      });
      await scene(3, () => cinematicText(card, 'مزداک\nههه! دنبال فرصتی بودم که دوباره برگردید و آدرستان را پیدا کنم. این پرونده را برای همیشه از بین می‌برم.', 8000, false));
      await scene(4, async () => { for (let i = 0; i < 3; i++) for (let dots = 1; dots <= 3; dots++) await cinematicText(card, '.'.repeat(dots), 400, false); });
      await scene(5, async () => { await breakTerminal(card); card.parentElement.classList.remove('red'); });
      if (completed >= 5) card.parentElement.classList.remove('red');
      await scene(6, () => cinematicText(card, 'ارتباط رمزنگاری‌شدهٔ مرکز فرماندهی با دستیاران\n\nممنونم که به من اعتماد کردید و برگشتید. کمک شما نشانی مزداک را برای تیم امنیتی روشن کرد. تا ۵ ثانیه دیگر به دوربین او وصل می‌شویم.', 10000, true));
      await scene(7, async () => { for (let n = 5; n >= 1; n--) await cinematicText(card, `در حال برقراری ارتباط با دوربین… ${n}`, 1000, true); });
      await scene(8, () => playPart(card, '/assets/recovery/part1.mp4'));
      await scene(9, () => desktopRescue(card));
      await scene(10, () => playPart(card, '/assets/recovery/part2.mp4'));
      await scene(11, () => restoreVisuals(card));
      if (completed >= 11) {
        document.body.classList.remove('system-compromised-red', 'cyber-breach-active', 'hacked-theme');
        window.cyberBreachEngine?.reset?.();
      }
      await request(`${api}/complete`, { method: 'POST' });
      localStorage.removeItem(checkpointKey);
      await refresh();
    } catch (e) {
      if (e.message === 'sequence-paused') { started = false; return; }
      errorAt(card, e.message || 'این صحنه آماده نیست.');
      const retry = $('button', '', 'تلاش دوباره'); card.append(retry); retry.onclick = () => { started = false; runCinematic(); };
      started = false;
    }
  }
  window.recoveryClient = { refresh };
  document.addEventListener('DOMContentLoaded', () => {
    refresh(); setInterval(() => { if (!recorder) refresh(); }, 5000);
    const attach = () => { if (window.socket) window.socket.on('recovery_updated', event => { if (Number(event.sessionId) === id && !recorder) refresh(); }); else setTimeout(attach, 200); }; attach();
  });
})();
