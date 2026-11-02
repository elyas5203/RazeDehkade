(() => {
  let targetId = null, state = null, modal = null, lastFingerprint = '';
  const token = localStorage.getItem('adminToken');
  if (!token) return;
  const el = (tag, text) => { const x = document.createElement(tag); if (text != null) x.textContent = text; return x; };
  const base = () => `/api/recovery/sessions/${targetId}`;
  async function api(url, method = 'GET', body) {
    const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'ارتباط برقرار نشد.');
    return data;
  }
  function message(panel, text) { panel.querySelector('.recovery-error').textContent = text || ''; }
  function button(panel, label, fn, disabled = false) {
    const b = el('button', label); b.type = 'button'; b.disabled = disabled;
    b.onclick = async () => { b.disabled = true; try { await fn(); await draw(); } catch (e) { message(panel, e.message); b.disabled = false; } };
    panel.append(b); return b;
  }
  async function renderVideos(panel) {
    const result = await api(`${base()}/submissions`);
    lastFingerprint = `${state.phase}:${state.revision}:${result.items.map(item => `${item.id}-${item.status}`).join(',')}`;
    if (!result.items.length) { panel.append(el('p', 'هنوز ویدیویی از این کلاس نرسیده است.')); return; }
    for (const item of result.items) {
      const row = el('div'); row.className = 'recovery-admin-row'; panel.append(row);
      row.append(el('p', `ویدیو ${item.id} | ${item.phone_normalized} | ${Number(item.duration_seconds).toFixed(1)} ثانیه | ${item.status} | تلگرام: ${item.telegram_status}`));
      const video = el('video'); video.controls = true; video.preload = 'metadata'; row.append(video);
      fetch(`${base()}/submissions/${item.id}/media`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => { if (!r.ok) throw new Error(); return r.blob(); }).then(blob => { video.src = URL.createObjectURL(blob); }).catch(() => { row.append(el('p', 'پیش‌نمایش در دسترس نیست.')); });
      if (item.status === 'pending') {
        button(row, '✓ تأیید و نمایش برای کلاس', () => api(`${base()}/submissions/${item.id}/decision`, 'POST', { status: 'approved' }));
        button(row, 'رد این ویدیو', () => api(`${base()}/submissions/${item.id}/decision`, 'POST', { status: 'rejected' }));
      }
    }
  }
  let isDrawing = false;
  async function draw() {
    if (!modal || !targetId || isDrawing) return;
    isDrawing = true;
    try {
      state = (await api(base())).state;
      const panel = modal.querySelector('.recovery-admin-panel'); panel.replaceChildren();
      const className = typeof sessionsMap !== 'undefined' ? sessionsMap[targetId]?.name : null;
      const title = el('h2', `کنترل بازگشت ${className || `کلاس ${targetId}`} · ${targetId}`); panel.append(title);
      button(panel, 'بستن', async () => { modal.hidden = true; targetId = null; });
      panel.append(el('p', `روش این کلاس: ${state.authMode === 'individual' ? 'تک‌به‌تک' : 'جمعی'} | مرحله: ${state.phase}`));
      const error = el('p'); error.className = 'recovery-error'; panel.append(error);
      if (state.phase === 'DORMANT') {
        lastFingerprint = `${state.phase}:${state.revision}:`;
        panel.append(el('p', 'این کلاس در مسیر تک‌به‌تک باقی می‌ماند. فقط اگر قرار است احراز جمعی در کلاس اجرا شود، دکمهٔ زیر را بزنید. اطلاعات احرازهای فردی قبلی حذف نمی‌شوند.'));
        button(panel, `فعال‌سازی احراز جمعی فقط برای کلاس ${targetId}`, () => api(`${base()}/activate`, 'POST', { expected_revision: state.revision }));
      }
      else if (state.phase !== 'RESTORED') {
        if (state.phase === 'PAUSED') {
          panel.append(el('p', `توقف موقت از مرحلهٔ ${state.previousPhase || 'نامشخص'}`));
          button(panel, 'ادامهٔ همین جلسه', () => api(`${base()}/resume`, 'POST', { expected_revision: state.revision }));
        } else {
          button(panel, 'توقف موقت این جلسه', () => api(`${base()}/pause`, 'POST', { expected_revision: state.revision }));
        }
        const coordinates = el('div'); panel.append(coordinates);
        coordinates.append(el('label', 'مختصات کلاس، عرض و طول جغرافیایی: '));
        const lat = el('input'), lon = el('input'); lat.type = lon.type = 'number'; lat.step = lon.step = 'any'; lat.placeholder = 'عرض'; lon.placeholder = 'طول';
        lat.value = state.latitude ?? ''; lon.value = state.longitude ?? ''; coordinates.append(lat, lon);
        button(coordinates, 'ذخیره مختصات', () => api(`${base()}/location`, 'PUT', { latitude: Number(lat.value), longitude: Number(lon.value), expected_revision: state.revision }));
        await renderVideos(panel);
        if (['COLLECTING', 'REVIEWING'].includes(state.phase)) button(panel, 'تأیید مرحله و آماده ورود', () => api(`${base()}/ready`, 'POST', { expected_revision: state.revision }));
        if (state.phase === 'READY') button(panel, 'ورود کلاس به چت هک‌شده', () => api(`${base()}/release`, 'POST', { expected_revision: state.revision }));
        if (state.phase === 'HACKED_CHAT') button(panel, 'شروع سکانس بازپس‌گیری', () => api(`${base()}/start`, 'POST', { expected_revision: state.revision }));
      }
    } finally {
      isDrawing = false;
    }
  }
  function open() {
    const id = Number(window.activeSessionId || activeSessionId);
    if (!Number.isSafeInteger(id) || id <= 0) return alert('ابتدا یک کلاس را انتخاب کنید.');
    targetId = id;
    if (!modal) {
      modal = el('div'); modal.className = 'recovery-admin';
      const panel = el('section'); panel.className = 'recovery-admin-panel'; modal.append(panel); document.body.append(modal);
      modal.onclick = e => { if (e.target === modal) { modal.hidden = true; targetId = null; } };
    }
    modal.hidden = false; draw().catch(e => message(modal, e.message));
  }
  document.addEventListener('DOMContentLoaded', () => {
    const anchor = document.getElementById('admin-trigger-hack-btn');
    if (anchor) { const b = el('button', '🎬 بازپس‌گیری کلاس'); b.className = 'command-button'; b.onclick = open; anchor.after(b); }
    const mobile = document.getElementById('mobile-admin-trigger-hack-btn');
    if (mobile) { const b = el('button', '🎬 بازپس‌گیری کلاس'); b.className = 'command-button wide'; b.onclick = open; mobile.after(b); }
    const bind = () => {
      if (window.socket) {
        window.socket.on('recovery_updated', e => {
          if (modal && !modal.hidden && Number(e.sessionId) === Number(targetId)) draw().catch(() => {});
        });
        window.socket.on('collective_submission_received', e => {
          if (modal && !modal.hidden) {
            if (Number(e.sessionId) === Number(targetId)) {
              draw().catch(() => {});
            } else {
              const info = modal.querySelector('.recovery-error');
              if (info) info.textContent = `توجه: یک ویدیوی جدید برای کلاس ${e.sessionId} دریافت شد (کلاس انتخابی فعلی شما: ${targetId}).`;
            }
          }
        });
      } else {
        setTimeout(bind, 200);
      }
    };
    bind();
    setInterval(async () => {
      if (!modal || modal.hidden || !targetId) return;
      try {
        const [latest, media] = await Promise.all([api(base()), api(`${base()}/submissions`)]);
        const fingerprint = `${latest.state.phase}:${latest.state.revision}:${(media.items || []).map(item => `${item.id}-${item.status}`).join(',')}`;
        if (fingerprint !== lastFingerprint) await draw();
      } catch (_) { /* اتصال بعدی دوباره تلاش می‌کند. */ }
    }, 1500);
  });
})();
