(() => {
  'use strict';
  const token = localStorage.getItem('adminToken');
  if (!token) return;
  let modal, targetId, state, roster = [], candidates = [], busy = false, lastFingerprint = '';
  const create = (tag, className = '', value = '') => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value) node.textContent = value;
    return node;
  };
  const base = () => `/api/recovery-live/sessions/${targetId}`;
  async function request(suffix = '', method = 'GET', body) {
    const response = await fetch(base() + suffix, { method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'ارتباط با مرکز برقرار نشد.');
    return data;
  }
  function status(text = '') { if (modal) modal.querySelector('.recovery-live-error').textContent = text; }
  const phaseLabels = { DORMANT: 'هنوز فعال نشده', WAITING_FOR_CLASS: 'در انتظار ورود کلاس', MATCHING: 'در حال اتصال ویدیوها',
    RUNNING: 'سکانس در حال اجرا', PAUSED: 'موقتاً متوقف', RESTORING: 'در حال بازیابی', RESTORED: 'پایان‌یافته' };
  function action(label, onClick, extraClass = '') {
    const button = create('button', `recovery-live-button ${extraClass}`, label);
    button.type = 'button';
    button.onclick = async () => {
      if (busy) return;
      busy = true; button.disabled = true; status();
      try { await onClick(); await draw(true); } catch (error) { status(error.message); }
      finally { busy = false; button.disabled = false; }
    };
    return button;
  }
  function runClock() {
    const el = modal?.querySelector('[data-recovery-clock]');
    if (!el || !state?.startedAt) return;
    const start = Date.parse(state.startedAt), paused = Number(state.pausedMs || 0);
    const end = state.phase === 'PAUSED' ? Date.parse(state.pausedAt) : Date.now();
    const remaining = Math.max(0, Number(state.plannedDurationSeconds || 420) * 1000 - Math.max(0, end - start - paused));
    const seconds = Math.ceil(remaining / 1000);
    el.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  async function draw(force = false) {
    if (!modal || modal.hidden || !targetId) return;
    const [snapshot, rosterData, candidateData] = await Promise.all([
      request(), request('/roster'), request('/candidates')]);
    state = snapshot.state; roster = rosterData.items; candidates = candidateData.items;
    const fingerprint = JSON.stringify([targetId, state.phase, state.revision,
      roster.map(x => [x.id, x.videoId]), candidates.map(x => [x.id, x.available])]);
    if (!force && fingerprint === lastFingerprint) return;
    lastFingerprint = fingerprint;
    const panel = modal.querySelector('.recovery-live-panel');
    panel.replaceChildren();
    const head = create('header', 'recovery-live-head'); panel.append(head);
    const title = create('div'); head.append(title);
    title.append(create('small', '', `پروندهٔ جلسه ${targetId}`), create('h2', '', 'بازپس‌گیری سایت'));
    const close = create('button', 'recovery-live-close', '×'); close.type = 'button';
    close.onclick = () => { modal.hidden = true; targetId = null; }; head.append(close);
    const error = create('p', 'recovery-live-error'); error.setAttribute('role', 'alert'); panel.append(error);
    const phase = create('p', 'recovery-live-phase', `مرحله: ${phaseLabels[state.phase] || state.phase}`); panel.append(phase);
    const online = typeof onlineSessionsSet !== 'undefined' && onlineSessionsSet.has(targetId);
    if (state.phase === 'DORMANT') {
      panel.append(create('p', '', 'برای این کلاس، ورود با شماره و کد جلسه را به پرده انتظار بازپس‌گیری وصل کنید.'));
      panel.append(action('فعال‌سازی برای همین کلاس', () => request('/activate', 'POST'), 'primary'));
      return;
    }
    if (state.phase === 'RUNNING' || state.phase === 'PAUSED' || state.phase === 'RESTORING') {
      const clock = create('div', 'recovery-live-clock'); clock.dataset.recoveryClock = ''; panel.append(clock); runClock();
      panel.append(create('p', '', 'سکانس پس از شروع به صورت خودکار برای لپ‌تاپ کلاس اجرا می‌شود.'));
      panel.append(create('p', online ? 'is-online' : 'is-offline', online
        ? 'لپ‌تاپ کلاس متصل است.' : state.phase === 'PAUSED'
          ? 'لپ‌تاپ کلاس قطع است؛ پس از اتصال دوباره، سکانس را ادامه دهید.'
          : 'ارتباط لپ‌تاپ کلاس قطع است؛ سکانس پس از چند ثانیه خودکار متوقف می‌شود.'));
      if (state.mediaStatus === 'sample') panel.append(create('p', 'recovery-live-sample-note', 'فیلم داستانی این پیش‌نمایش، نمونه موقت است.'));
      if (state.phase === 'PAUSED') panel.append(action('ادامه سکانس', () => request('/resume', 'POST', { expected_revision: state.revision })));
      else panel.append(action('توقف اضطراری', () => request('/pause', 'POST', { expected_revision: state.revision })));
      return;
    }
    const summary = create('div', 'recovery-live-summary'); panel.append(summary);
    summary.append(create('span', '', `${roster.length.toLocaleString('fa-IR')} پرتره`),
      create('span', '', `${candidates.length.toLocaleString('fa-IR')} ویدیوی هفتگی`),
      create('span', '', `${roster.filter(x => x.videoId).length.toLocaleString('fa-IR')} اتصال ثبت‌شده`));
    summary.append(create('span', online ? 'is-online' : 'is-offline', online ? 'لپ‌تاپ کلاس متصل است' : 'در انتظار اتصال لپ‌تاپ کلاس'));
    const place = create('div', 'recovery-live-location'); panel.append(place);
    place.append(create('h3', '', 'محل تجمع کلاس'));
    const lat = create('input'), lon = create('input'), label = create('input');
    lat.type = lon.type = 'number'; lat.step = lon.step = 'any';
    lat.placeholder = 'عرض جغرافیایی'; lon.placeholder = 'طول جغرافیایی'; label.placeholder = 'نام محل، اختیاری';
    lat.value = state.latitude ?? ''; lon.value = state.longitude ?? ''; label.value = state.mapLabel || '';
    place.append(lat, lon, label, action('ثبت موقعیت', () => request('/location', 'PUT', {
      latitude: lat.value, longitude: lon.value, mapLabel: label.value, expected_revision: state.revision })));
    const mediaSection = create('section', 'recovery-live-candidates'); panel.append(mediaSection);
    mediaSection.append(create('h3', '', 'ویدیوهای احراز هویت این کلاس'));
    const mediaList = create('div', 'recovery-live-candidate-list'); mediaSection.append(mediaList);
    if (!candidates.length) mediaList.append(create('p', '', 'ویدیویی برای این کلاس ثبت نشده است.'));
    for (const item of candidates) {
      const row = create('article', `recovery-live-candidate ${item.available ? '' : 'is-missing'}`); mediaList.append(row);
      row.append(create('strong', '', item.name));
      row.append(create('small', '', `شناسه ${item.id} · ${item.reference} · ${item.phoneHint}`));
      row.append(create('span', '', item.available ? 'آمادهٔ بررسی' : 'فایل ویدیو روی سرور موجود نیست'));
      if (item.mediaUrl) {
        const viewBtn = create('button', 'recovery-live-view-btn', '▶ مشاهده ویدیو');
        viewBtn.type = 'button';
        viewBtn.style.cssText = 'padding:4px 8px; font-size:11px; background:#1b382b; color:#a3f3c4; border:1px solid #3d7e5d; border-radius:5px; cursor:pointer; margin-top:4px; align-self:flex-start;';
        viewBtn.onclick = (e) => {
          e.preventDefault();
          const existing = row.querySelector('video');
          if (existing) {
            existing.remove();
            viewBtn.textContent = '▶ مشاهده ویدیو';
          } else {
            const preview = create('video');
            preview.controls = true;
            preview.autoplay = true;
            preview.src = item.mediaUrl;
            preview.style.cssText = 'width:100%; max-height:140px; border-radius:6px; margin-top:6px; background:#000;';
            row.append(preview);
            viewBtn.textContent = '⏹ بستن ویدیو';
          }
        };
        row.append(viewBtn);
      }
    }
    panel.append(create('h3', '', 'اتصال ویدیو به عکس دستیار'));
    const grid = create('div', 'recovery-live-grid'); panel.append(grid);
    for (const portrait of roster) {
      const card = create('article', 'recovery-live-portrait'); grid.append(card);
      const img = create('img'); img.src = portrait.photoUrl; img.alt = portrait.name; img.loading = 'lazy'; card.append(img);
      card.append(create('strong', '', `${portrait.order}. ${portrait.name}`));
      const select = create('select'); select.setAttribute('aria-label', `ویدیوی ${portrait.name}`); card.append(select);
      const empty = create('option', '', 'انتخاب ویدیو'); empty.value = ''; select.append(empty);
      for (const video of candidates) {
        const option = create('option', '', `${video.name} · ${video.reference}${video.available ? '' : ' · فایل موجود نیست'}`);
        option.value = String(video.id); option.disabled = !video.available;
        if (portrait.videoId === video.id) option.selected = true;
        select.append(option);
      }
      const selected = candidates.find(video => video.id === portrait.videoId);
      if (selected?.mediaUrl) {
        const viewBtn = create('button', 'recovery-live-view-btn', '▶ مشاهده / دانلود ویدیو');
        viewBtn.type = 'button';
        viewBtn.style.cssText = 'padding:5px 8px; font-size:11px; background:#1b382b; color:#a3f3c4; border:1px solid #3d7e5d; border-radius:5px; cursor:pointer; margin:4px 0;';
        viewBtn.onclick = (e) => {
          e.preventDefault();
          const existing = card.querySelector('video');
          if (existing) {
            existing.remove();
            viewBtn.textContent = '▶ مشاهده / دانلود ویدیو';
          } else {
            const preview = create('video');
            preview.controls = true;
            preview.autoplay = true;
            preview.src = selected.mediaUrl;
            preview.style.cssText = 'width:100%; max-height:150px; border-radius:6px; margin:6px 0; background:#000;';
            card.insertBefore(preview, viewBtn.nextSibling);
            viewBtn.textContent = '⏹ بستن پخش ویدیو';
          }
        };
        card.append(viewBtn);
      }
      card.append(action(portrait.videoId ? 'تغییر اتصال' : 'ثبت روی این عکس', async () => {
        if (!select.value) throw new Error('ابتدا یک ویدیو انتخاب کنید.');
        await request(`/links/${portrait.id}`, 'PUT', { videoId: Number(select.value), expected_revision: state.revision });
      }));
      if (portrait.videoId) card.append(action('لغو اتصال', () => request(`/links/${portrait.id}`, 'DELETE', { expected_revision: state.revision })));
    }
    const footer = create('footer', 'recovery-live-footer'); panel.append(footer);
    footer.append(create('p', '', 'پس از بررسی اتصال‌ها و موقعیت، این فرمان کل روایت را یک‌بار آغاز می‌کند.'));
    const btnRow = create('div', 'recovery-live-actions-row');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '12px';
    btnRow.style.alignItems = 'center';
    btnRow.append(action('شروع بازپس‌گیری', () => request('/start', 'POST', { expected_revision: state.revision }), 'primary'));
    btnRow.append(action('🔄 ریست کامل سناریو برای تست مجدد', async () => {
      if (!confirm('آیا می‌خواهید این سناریو را از اول ریست کنید تا بتوانید دوباره از صفر تست بگیرید؟')) return;
      await request('/reset', 'POST');
    }, 'danger'));
    footer.append(btnRow);
  }
  function open() {
    const id = Number(window.activeSessionId || (typeof activeSessionId !== 'undefined' && activeSessionId));
    if (!Number.isSafeInteger(id) || id <= 0) return alert('ابتدا یک کلاس را انتخاب کنید.');
    targetId = id;
    lastFingerprint = '';
    if (!modal) {
      modal = create('div', 'recovery-live-admin');
      const panel = create('section', 'recovery-live-panel'); modal.append(panel); document.body.append(modal);
      modal.onclick = event => { if (event.target === modal) { modal.hidden = true; targetId = null; } };
    }
    modal.hidden = false; draw().catch(error => status(error.message));
  }
  document.addEventListener('DOMContentLoaded', () => {
    for (const id of ['admin-trigger-hack-btn', 'mobile-admin-trigger-hack-btn']) {
      const anchor = document.getElementById(id);
      if (!anchor) continue;
      const button = create('button', 'command-button', 'بازپس‌گیری سایت');
      button.type = 'button'; button.onclick = open; anchor.after(button);
    }
    setInterval(runClock, 1000);
    setInterval(() => { if (modal && !modal.hidden && targetId && !busy) draw().catch(() => {}); }, 5000);
    const bind = () => window.socket ? window.socket.on('recovery_live_updated', event => {
      if (modal && !modal.hidden && Number(event.sessionId) === targetId && !busy) draw().catch(() => {});
    }) : setTimeout(bind, 250);
    bind();
    const presence = () => window.socket ? window.socket.on('session_presence_changed', event => {
      if (modal && !modal.hidden && Number(event.sessionId) === targetId) draw(true).catch(() => {});
    }) : setTimeout(presence, 250);
    presence();
  });
})();
