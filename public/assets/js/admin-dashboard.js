async function unlockHackDashboard(id) {
  if (!confirm('آیا مایلید وضعیت نفوذ سایبری این جلسه را لغو کرده و دسترسی ورود دانش‌آموزان را بازگشایی کنید؟')) return;
  try {
    const res = await fetch(`/api/sessions/${id}/unlock-hack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + adminToken
      }
    });
    const result = await res.json();
    if (result && result.success) {
      await loadSessions();
    } else {
      alert((result && result.message) || 'خطا در لغو وضعیت نفوذ');
    }
  } catch (err) {
    alert('خطا در برقراری ارتباط با سرور.');
  }
}

/**
 * admin-dashboard.js
 * کنترلر مدرن داشبورد و مرکز مدیریت جلسات راز دهکده
 */

const adminToken = localStorage.getItem('adminToken');
const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

if (!adminToken) {
  window.location.href = '/admin/login.html';
}

let dashboardSocket = null;
let allSessions = [];
let loadedSessionsMap = {};
const sessionPhasesMap = {};

function toPersianDigits(value) {
  return String(value ?? '').replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}

function getCleanClassTitle(session, index) {
  const rawName = String(session?.name || '').trim();
  if (!rawName) {
    const num = toPersianDigits(session?.id || (index + 1));
    return `کلاس شماره ${num}`;
  }
  if (/^کلاس\s+/i.test(rawName)) {
    return rawName;
  }
  if (rawName.includes('تست سرور') || rawName.includes('تست')) {
    return 'کلاس تست سرور';
  }
  return `کلاس ${rawName}`;
}

function updateCardLivePhase(sessionId, data) {
  const badge = document.getElementById(`live-phase-badge-${sessionId}`);
  const textEl = document.getElementById(`live-phase-text-${sessionId}`);
  if (!badge || !textEl || !data) return;

  // طبق نیازمندی صریح: فاز پایانی اتاق چت حذف شده و اگر سناریوی ورودی در جریان نباشد، نوار مخفی است
  if (!data.phase || data.phase === 'idle' || data.phase === 'chat_active' || data.phase === 'completed') {
    badge.style.display = 'none';
    return;
  }

  let text = '';
  let cls = 'phase-waiting';
  badge.style.display = 'flex';

  if (data.phase === 'portal_login') {
    text = '🔐 درگاه ورود محرمانه // دانش‌آموزان در صفحه ثبت کد هستند';
    cls = 'phase-portal';
  } else if (data.phase === 'cyber_scanning') {
    text = '⚡ اسکن سایبری و رمزگشایی مدارک // در حال انتقال به درگاه ورود...';
    cls = 'phase-scanning';
  } else if (data.phase === 'blackout_phase2') {
    const left = Number(data.secondsLeft || 240);
    const m = Math.floor(left / 60);
    const s = left % 60;
    text = `🟢 بلک‌اوت (رادار سبز) // ${toPersianDigits(m)} دقیقه و ${toPersianDigits(s)} ثانیه تا ورود به درگاه`;
    cls = 'phase-blackout-2';
  } else if (data.phase === 'blackout_phase1') {
    const left = Number(data.secondsLeft || 300);
    const m = Math.floor(left / 60);
    const s = left % 60;
    text = `🌑 بلک‌اوت (تاریکی مطلق) // ${toPersianDigits(m)} دقیقه و ${toPersianDigits(s)} ثانیه تا ورود به درگاه`;
    cls = 'phase-blackout-1';
  } else if (data.phase === 'countdown') {
    const courierSec = Number(data.secondsLeft || 0);
    const totalGateSec = Number(data.totalSecondsToLogin || (courierSec + 300));
    const totalM = Math.floor(totalGateSec / 60);
    const totalS = totalGateSec % 60;
    text = `🛵 پیک در راه است // ${toPersianDigits(courierSec)} ثانیه تا تحویل (${toPersianDigits(totalM)} دقیقه و ${toPersianDigits(totalS)} ثانیه تا ورود به گیت)`;
    cls = 'phase-countdown';
  } else {
    badge.style.display = 'none';
    return;
  }

  badge.className = `live-phase-strip ${cls}`;
  textEl.textContent = text;
}

const CASE_DEFS = [
  { key: 'village', title: 'راز دهکده' },
  { key: 'syndrome', title: 'سندروم فراموشی' },
  { key: 'court', title: 'دادگاه عدالت' }
];

document.addEventListener('DOMContentLoaded', () => {
  const nameEl = document.getElementById('admin-name-display');
  if (nameEl) nameEl.textContent = adminUser.display_name || adminUser.username || 'ادمین';
  
  const newForm = document.getElementById('new-session-form');
  if (newForm) newForm.addEventListener('submit', createNewSession);

  loadSessions();
  initDashboardSocket();
});

function initDashboardSocket() {
  if (typeof io !== 'undefined') {
    dashboardSocket = io({ auth: { token: adminToken } });

    dashboardSocket.on('connect', () => {
      const sockEl = document.getElementById('stat-socket');
      if (sockEl) {
        sockEl.textContent = 'متصل';
        sockEl.style.color = 'var(--emerald)';
      }
      dashboardSocket.emit('get_online_sessions');
    });

    dashboardSocket.on('disconnect', () => {
      const sockEl = document.getElementById('stat-socket');
      if (sockEl) {
        sockEl.textContent = 'قطع اتصال';
        sockEl.style.color = 'var(--danger)';
      }
    });

    dashboardSocket.on('sessions_lifecycle_snapshot', (snapshot) => {
      if (snapshot && typeof snapshot === 'object') {
        Object.assign(sessionPhasesMap, snapshot);
        Object.keys(snapshot).forEach(sId => {
          updateCardLivePhase(sId, snapshot[sId]);
        });
      }
    });

    dashboardSocket.on('session_phase_update', (data) => {
      if (!data || !data.sessionId) return;
      sessionPhasesMap[data.sessionId] = data;
      updateCardLivePhase(data.sessionId, data);
    });

    dashboardSocket.on('new_store_order', (data) => {
      const notifEl = document.getElementById('notifications');
      if (notifEl) {
        const rawTeacher = data.sessionName || loadedSessionsMap[data.sessionId]?.name;
        let displayName = '';
        if (rawTeacher) {
          displayName = rawTeacher.startsWith('کلاس') ? rawTeacher : `کلاس ${rawTeacher}`;
        } else {
          displayName = `جلسه #${toPersianDigits(data.sessionId)}`;
        }
        notifEl.innerHTML = `🛒 <strong>سفارش تازه!</strong> برای «${escapeHtml(displayName)}» سفارش گل ثبت شد؛ بسته را برای تحویل آماده فرمایید.`;
      }
      loadSessions();
    });

    dashboardSocket.on('session_hack_updated', () => {
      loadSessions();
    });

    dashboardSocket.on('order_countdown_tick', (data) => {
      if (!data || !data.sessionId) return;
      const existing = sessionPhasesMap[data.sessionId] || {};
      existing.phase = data.stage || (data.secondsLeft > 0 ? 'countdown' : 'blackout_phase1');
      existing.secondsLeft = data.secondsLeft;
      existing.totalSecondsToLogin = data.totalSecondsToLogin;
      existing.sessionName = data.sessionName;
      sessionPhasesMap[data.sessionId] = existing;
      updateCardLivePhase(data.sessionId, existing);
    });

    dashboardSocket.on('session_presence_changed', (data) => {
      // حضور کاربر آنلاین ثبت می‌شود بدون اینکه نوار مزاحم فاز ۶ در کارت‌ها فعال گردد
      if (!data || !data.sessionId) return;
      const card = document.getElementById(`session-card-${data.sessionId}`);
      if (card) {
        card.classList.toggle('user-is-online', Boolean(data.isOnline));
      }
    });

    dashboardSocket.on('session_updated', () => loadSessions());

    dashboardSocket.on('global_vault_lock_updated', (data) => {
      if (!data) return;
      const isUn = Boolean(data.isUnlocked);
      if (Array.isArray(allSessions)) {
        allSessions.forEach(s => s.is_vault_unlocked = isUn ? 1 : 0);
      }
      updateGlobalVaultBtnUI(isUn, isUn);
    });

    dashboardSocket.on('vault_lock_updated', (data) => {
      if (data && data.all) {
        const isUn = Boolean(data.isUnlocked);
        if (Array.isArray(allSessions)) {
          allSessions.forEach(s => s.is_vault_unlocked = isUn ? 1 : 0);
        }
        updateGlobalVaultBtnUI(isUn, isUn);
      } else if (data && data.sessionId) {
        if (Array.isArray(allSessions)) {
          const target = allSessions.find(s => Number(s.id) === Number(data.sessionId));
          if (target) target.is_vault_unlocked = Boolean(data.isUnlocked);
        }
        updateGlobalVaultBtnUI();
      }
    });
  }
}

let isGlobalVaultUnlocked = false;

function updateGlobalVaultBtnUI(explicitUnlocked, explicitAnyUnlocked) {
  const btn = document.getElementById('global-vault-lock-btn');
  if (!btn) return;

  let allUnlocked = false;
  let anyUnlocked = false;

  if (typeof explicitUnlocked !== 'undefined') {
    allUnlocked = Boolean(explicitUnlocked);
    anyUnlocked = Boolean(explicitAnyUnlocked || explicitUnlocked);
  } else if (Array.isArray(allSessions) && allSessions.length > 0) {
    allUnlocked = allSessions.every(s => Boolean(s.is_vault_unlocked));
    anyUnlocked = allSessions.some(s => Boolean(s.is_vault_unlocked));
  }

  isGlobalVaultUnlocked = allUnlocked;

  if (allUnlocked) {
    btn.innerHTML = '🔓 گاوصندوق: باز (همه جلسات)';
    btn.className = 'dashboard-button vault-unlocked';
    btn.title = 'گاوصندوق در تمامی جلسات بازگشایی شده است — برای پلمپ همگانی کلیک کنید';
  } else if (anyUnlocked) {
    btn.innerHTML = '⚠️ گاوصندوق: باز در برخی (کلیک برای پلمپ)';
    btn.className = 'dashboard-button vault-locked';
    btn.title = 'گاوصندوق در برخی جلسات باز است — برای پلمپ همگانی کلیک کنید';
  } else {
    btn.innerHTML = '🔒 گاوصندوق: پلمپ (همه جلسات)';
    btn.className = 'dashboard-button vault-locked';
    btn.title = 'گاوصندوق در تمامی جلسات پلمپ امنیتی است — برای بازگشایی همگانی کلیک کنید';
  }
}

async function toggleGlobalVaultLock() {
  const btn = document.getElementById('global-vault-lock-btn');
  const anyUnlocked = Array.isArray(allSessions) ? allSessions.some(s => Boolean(s.is_vault_unlocked)) : isGlobalVaultUnlocked;
  const nextUnlocked = !anyUnlocked;

  // به‌روزرسانی فوری ظاهر دکمه جهت UX سریع و آنی
  updateGlobalVaultBtnUI(nextUnlocked, nextUnlocked);
  if (Array.isArray(allSessions)) {
    allSessions.forEach(s => s.is_vault_unlocked = nextUnlocked ? 1 : 0);
  }

  try {
    if (dashboardSocket && dashboardSocket.connected) {
      dashboardSocket.emit('toggle_global_vault_lock', { isUnlocked: nextUnlocked, week: 5 });
    }

    const res = await fetch('/api/sessions/vault-lock-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + adminToken
      },
      body: JSON.stringify({ isUnlocked: nextUnlocked, week: 5 })
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || 'تغییر وضعیت قفل گاوصندوق انجام نشد.');
    }

    const notifEl = document.getElementById('notifications');
    if (notifEl) {
      notifEl.className = 'dashboard-notifications visible';
      notifEl.innerHTML = nextUnlocked
        ? `🔓 <strong>گاوصندوق اسناد محرمانه:</strong> قفل گاوصندوق برای تمامی جلسات با موفقیت <b>بازگشایی شد</b>.`
        : `🛡️ <strong>گاوصندوق اسناد محرمانه:</strong> قفل گاوصندوق برای تمامی جلسات با موفقیت <b>پلمپ امنیتی</b> شد.`;
      setTimeout(() => {
        notifEl.className = 'dashboard-notifications';
      }, 5000);
    }
  } catch (err) {
    console.error('Error toggling global vault lock:', err);
    alert('خطا در تغییر وضعیت همگانی قفل گاوصندوق: ' + (err.message || err));
    loadSessions();
  }
}

window.toggleGlobalVaultLock = toggleGlobalVaultLock;
window.updateGlobalVaultBtnUI = updateGlobalVaultBtnUI;

async function loadSessions() {
  try {
    const res = await fetch('/api/sessions', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    const result = await res.json();
    if (result.success && Array.isArray(result.data)) {
      allSessions = result.data;
      updateStats(allSessions);
      updateGlobalVaultBtnUI();
      const searchInput = document.getElementById('sessionSearchInput');
      const currentQuery = searchInput ? searchInput.value : '';
      if (currentQuery && currentQuery.trim()) {
        handleSearch(currentQuery);
      } else {
        renderSessions(allSessions);
      }
    }
  } catch (err) {
    console.error('Failed to load sessions:', err);
  }
}

function updateStats(sessions) {
  const totalEl = document.getElementById('stat-total');
  const activeEl = document.getElementById('stat-active');
  const waitEl = document.getElementById('stat-waiting');

  if (totalEl) totalEl.textContent = sessions.length.toLocaleString('fa-IR');
  if (activeEl) activeEl.textContent = sessions.filter(s => s.status === 'active').length.toLocaleString('fa-IR');
  if (waitEl) waitEl.textContent = sessions.filter(s => s.status === 'waiting').length.toLocaleString('fa-IR');
}

function handleSearch(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) {
    renderSessions(allSessions);
    return;
  }
  const filtered = allSessions.filter(s => {
    const nameMatch = String(s.name || '').toLowerCase().includes(q);
    const orderMatch = String(s.order_code || '').includes(q);
    const chatMatch = String(s.chat_code || s.code || '').includes(q);
    const phoneMatch = String(s.teacher_phone || '').includes(q);
    return nameMatch || orderMatch || chatMatch || phoneMatch;
  });
  renderSessions(filtered);
}

function renderSessions(sessions) {
  const grid = document.getElementById('sessions-grid');
  if (!grid) return;
  grid.innerHTML = '';
  loadedSessionsMap = {};

  if (sessions.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:48px 20px;background:var(--surface);border:1px dashed var(--border-subtle);border-radius:12px;color:var(--text-muted);">
        <p style="font-size:15px;margin-bottom:12px;">هیچ جلسه‌ای یافت نشد.</p>
        <button type="button" class="dashboard-button primary" onclick="openSessionDialog()">＋ ساخت جلسه جدید</button>
      </div>
    `;
    return;
  }

  sessions.forEach((s, index) => {
    loadedSessionsMap[s.id] = s;
    const card = document.createElement('article');
    card.className = 'session-card';
    card.id = `session-card-${s.id}`;

    // تعیین عنوان کلاس طبق درخواست صریح: «بجای شماره کلاس بنویسه کلاس فلان»
    const classTitle = getCleanClassTitle(s, index);

    // وضعیت جلسه
    let statusPill = '';
    if (s.status === 'active') {
      statusPill = `<span class="status-pill status-active"><span class="pulse-dot"></span> فعال</span>`;
    } else if (s.status === 'completed') {
      statusPill = `<span class="status-pill status-completed">🏁 پایان‌یافته</span>`;
    } else {
      statusPill = `<span class="status-pill status-waiting">⏳ در انتظار</span>`;
    }

    // استخراج وضعیت پرونده‌های این جلسه
    const casesMap = {};
    if (Array.isArray(s.cases)) {
      s.cases.forEach(item => {
        casesMap[item.case_key] = item.status;
      });
    }

    const activeCaseKey = s.active_case || 'village';
    const activeCaseDef = CASE_DEFS.find(c => c.key === activeCaseKey) || CASE_DEFS[0];

    const casesHtml = CASE_DEFS.map(c => {
      const status = casesMap[c.key] || (c.key === activeCaseKey ? 'active' : 'locked');
      const isActive = c.key === activeCaseKey;
      let statusIcon = '🔒';
      if (status === 'solved') statusIcon = '🏆';
      else if (status === 'active') statusIcon = '🟢';

      return `
        <div class="case-item-row status-${status} ${isActive ? 'is-active-case' : ''}">
          <div class="case-item-info">
            <span class="case-dot-icon">${statusIcon}</span>
            <div class="case-title-wrap">
              <strong class="case-name">${escapeHtml(c.title)}</strong>
              ${isActive ? '<span class="current-case-tag">جاری</span>' : ''}
            </div>
          </div>
          <div class="case-item-actions">
            <select class="case-status-select status-${status}" 
                    aria-label="وضعیت پرونده ${escapeHtml(c.title)}"
                    onchange="changeCaseStatus(${s.id}, '${c.key}', this.value)">
              <option value="locked" ${status === 'locked' ? 'selected' : ''}>🔒 قفل</option>
              <option value="active" ${status === 'active' ? 'selected' : ''}>🟢 فعال</option>
              <option value="solved" ${status === 'solved' ? 'selected' : ''}>🏆 حل شده</option>
            </select>
            ${!isActive ? `
              <button type="button" class="set-active-btn" 
                      onclick="setActiveCase(${s.id}, '${c.key}')" 
                      title="تنظیم به عنوان پرونده فعال">
                ⚡
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // محاسبه وضعیت لحظه‌ای و زنده کلاس در چرخه حیات سناریوی یک‌باره ورود
    const lifecycle = sessionPhasesMap[s.id] || {};
    let liveStatusText = '';
    let liveStatusClass = 'phase-waiting';
    let isLiveActive = false;

    if (lifecycle.phase === 'portal_login') {
      liveStatusText = '🔐 درگاه ورود محرمانه // دانش‌آموزان در صفحه ثبت کد هستند';
      liveStatusClass = 'phase-portal';
      isLiveActive = true;
    } else if (lifecycle.phase === 'cyber_scanning') {
      liveStatusText = '⚡ اسکن سایبری و رمزگشایی مدارک // در حال انتقال به درگاه...';
      liveStatusClass = 'phase-scanning';
      isLiveActive = true;
    } else if (lifecycle.phase === 'blackout_phase2') {
      const left = Number(lifecycle.secondsLeft || 240);
      const m = Math.floor(left / 60);
      const s = left % 60;
      liveStatusText = `🟢 بلک‌اوت (رادار سبز) // ${toPersianDigits(m)} دقیقه و ${toPersianDigits(s)} ثانیه تا ورود به درگاه`;
      liveStatusClass = 'phase-blackout-2';
      isLiveActive = true;
    } else if (lifecycle.phase === 'blackout_phase1') {
      const left = Number(lifecycle.secondsLeft || 300);
      const m = Math.floor(left / 60);
      const s = left % 60;
      liveStatusText = `🌑 بلک‌اوت (تاریکی مطلق) // ${toPersianDigits(m)} دقیقه و ${toPersianDigits(s)} ثانیه تا ورود به درگاه`;
      liveStatusClass = 'phase-blackout-1';
      isLiveActive = true;
    } else if (lifecycle.phase === 'countdown' && lifecycle.secondsLeft > 0) {
      const courierSec = Number(lifecycle.secondsLeft || 0);
      const totalGateSec = Number(lifecycle.totalSecondsToLogin || (courierSec + 300));
      const totalM = Math.floor(totalGateSec / 60);
      const totalS = totalGateSec % 60;
      liveStatusText = `🛵 پیک در راه است // ${toPersianDigits(courierSec)} ثانیه تا تحویل (${toPersianDigits(totalM)} دقیقه و ${toPersianDigits(totalS)} ثانیه تا ورود به گیت)`;
      liveStatusClass = 'phase-countdown';
      isLiveActive = true;
    }

    card.innerHTML = `
      <div class="card-header-row">
        ${statusPill}
        <div class="card-quick-actions">
          <button type="button" class="card-icon-btn" onclick="openEditSessionDialog(${s.id})" title="ویرایش جلسه" aria-label="ویرایش جلسه ${escapeHtml(s.name)}">✏️</button>
          <button type="button" class="card-icon-btn danger" onclick="deleteSession(${s.id}, '${escapeHtml(s.name)}')" title="حذف جلسه" aria-label="حذف جلسه ${escapeHtml(s.name)}">🗑️</button>
        </div>
      </div>

      <div class="session-card-title">
        <span class="class-title-text">${escapeHtml(classTitle)}</span>
        <span class="class-sub-badge">جلسه #${toPersianDigits(s.id)}</span>
      </div>

      <!-- بنر رهگیری زنده وضعیت کلاس (تنها در صورت فعال بودن سناریوی ورود نمایش داده می‌شود) -->
      <div class="live-phase-strip ${liveStatusClass}" id="live-phase-badge-${s.id}" style="${isLiveActive ? '' : 'display:none;'}">
        <span class="phase-dot-indicator"></span>
        <span class="phase-text" id="live-phase-text-${s.id}">${liveStatusText}</span>
      </div>

      ${s.is_hacked ? `
        <div class="hacked-status-badge" style="background:rgba(255,0,60,0.15);border:1px solid #ff003c;color:#ff4d6d;font-size:11px;font-weight:800;padding:5px 10px;border-radius:6px;margin:8px 0;display:flex;align-items:center;justify-content:space-between;">
          <span>🚨 نفوذ سایبری مزداک فعال است</span>
          <button type="button" onclick="event.preventDefault();unlockHackDashboard(${s.id})" style="background:#10b981;border:none;color:#fff;font-size:11px;font-weight:800;padding:3px 10px;border-radius:4px;cursor:pointer;">🔓 بازگشایی</button>
        </div>
      ` : ''}

      <div class="codes-chips-grid">
        <div class="code-chip">
          <div class="code-chip-header">
            <span>🌸</span>
            <span>کد سفارش گل</span>
          </div>
          <div class="code-chip-val-row">
            <strong class="code-chip-val">${s.order_code}</strong>
            <button type="button" class="copy-mini-btn" onclick="copyCode('${s.order_code}', this)" title="کپی کد سفارش گل" aria-label="کپی کد سفارش ${s.order_code}">📋</button>
          </div>
        </div>

        <div class="code-chip">
          <div class="code-chip-header">
            <span>📦</span>
            <span>کد روی بسته (چت)</span>
          </div>
          <div class="code-chip-val-row">
            <strong class="code-chip-val alt">${s.chat_code || s.code}</strong>
            <button type="button" class="copy-mini-btn" onclick="copyCode('${s.chat_code || s.code}', this)" title="کپی کد بسته" aria-label="کپی کد بسته ${s.chat_code || s.code}">📋</button>
          </div>
        </div>
      </div>

      <!-- فیلد شماره همراه ثبت‌شده برای ورود خودکار -->
      <div class="session-phone-chip" id="phone-chip-${s.id}">
        <div class="phone-chip-header">
          <span class="phone-chip-icon">📱</span>
          <span class="phone-chip-title">شماره همراه ورود (ورود خودکار به چت):</span>
        </div>
        <div class="phone-chip-body">
          <div class="phone-chip-val-wrap">
            ${s.teacher_phone ? `
              <strong class="phone-chip-number" dir="ltr">${escapeHtml(s.teacher_phone)}</strong>
            ` : `
              <span class="phone-chip-empty">ثبت نشده</span>
            `}
          </div>
          <button type="button" class="phone-action-btn" onclick="openQuickPhoneDialog(${s.id})" title="مشاهده یا تغییر شماره همراه">
            ✏️ ${s.teacher_phone ? 'تغییر شماره' : 'ثبت شماره'}
          </button>
        </div>
      </div>

      <div class="session-cases-block">
        <div class="cases-block-header">
          <span class="cases-block-title">📁 پرونده‌ها:</span>
          <span class="cases-block-active-badge">جاری: ${escapeHtml(activeCaseDef.title)}</span>
        </div>
        <div class="cases-table-list">
          ${casesHtml}
        </div>
      </div>

      <div id="countdown-${s.id}" class="countdown-alert"></div>

      <a class="launch-session-btn" href="/admin/chat.html?session=${s.id}">
        <span>⚡ ورود به اتاق فرمان</span>
        <span class="arrow" aria-hidden="true">➔</span>
      </a>
    `;

    grid.appendChild(card);
  });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function openEditSessionDialog(id) {
  const s = loadedSessionsMap[id];
  if (!s) return;
  document.getElementById('edit-session-id').value = s.id;
  document.getElementById('edit-session-name').value = s.name;
  const phoneInput = document.getElementById('edit-session-phone');
  if (phoneInput) phoneInput.value = s.teacher_phone || '';
  document.getElementById('edit-session-status').value = s.status || 'waiting';
  document.getElementById('edit-session-error').textContent = '';
  document.getElementById('edit-session-dialog').showModal();
}

function closeEditSessionDialog() {
  document.getElementById('edit-session-dialog').close();
}

async function saveEditSession(event) {
  event.preventDefault();
  const id = document.getElementById('edit-session-id').value;
  const name = document.getElementById('edit-session-name').value.trim();
  const status = document.getElementById('edit-session-status').value;
  const phoneInput = document.getElementById('edit-session-phone');
  const teacher_phone = phoneInput ? phoneInput.value.trim() : undefined;
  const error = document.getElementById('edit-session-error');
  if (!name) { error.textContent = 'نام جلسه را وارد کنید.'; return; }
  try {
    const res = await fetch(`/api/sessions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + adminToken
      },
      body: JSON.stringify({ name, status, teacher_phone })
    });
    const result = await res.json();
    if (!res.ok || !result.success) { 
      error.textContent = result.message || 'ویرایش انجام نشد.'; 
      return; 
    }
    closeEditSessionDialog();
    loadSessions();
  } catch(err) { 
    error.textContent = 'خطا در ارتباط با سرور.'; 
  }
}

function openQuickPhoneDialog(id) {
  const s = loadedSessionsMap[id];
  if (!s) return;
  document.getElementById('quick-phone-session-id').value = s.id;
  const titleEl = document.getElementById('quick-phone-title');
  if (titleEl) titleEl.textContent = `شماره همراه: ${getCleanClassTitle(s)}`;
  const input = document.getElementById('quick-phone-input');
  input.value = s.teacher_phone || '';
  document.getElementById('quick-phone-error').textContent = '';
  const clearBtn = document.getElementById('quick-phone-clear-btn');
  if (clearBtn) {
    clearBtn.style.display = s.teacher_phone ? 'inline-block' : 'none';
  }
  document.getElementById('quick-phone-dialog').showModal();
  setTimeout(() => input.focus(), 60);
}

function closeQuickPhoneDialog() {
  const diag = document.getElementById('quick-phone-dialog');
  if (diag && diag.open) diag.close();
}

async function saveQuickPhone(event) {
  event.preventDefault();
  const id = document.getElementById('quick-phone-session-id').value;
  const phone = document.getElementById('quick-phone-input').value.trim();
  const error = document.getElementById('quick-phone-error');
  const submitBtn = document.getElementById('quick-phone-submit-btn');

  error.textContent = '';
  if (submitBtn) submitBtn.disabled = true;

  try {
    const res = await fetch(`/api/sessions/${id}/phone`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + adminToken
      },
      body: JSON.stringify({ phone })
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      error.textContent = result.message || 'خطا در ثبت شماره همراه.';
      return;
    }
    closeQuickPhoneDialog();
    await loadSessions();
  } catch (err) {
    console.error('Error saving phone:', err);
    error.textContent = 'خطا در برقراری ارتباط با سرور.';
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function clearSessionPhone() {
  const id = document.getElementById('quick-phone-session-id').value;
  if (!confirm('آیا از حذف شماره همراه این جلسه اطمینان دارید؟')) return;
  const error = document.getElementById('quick-phone-error');
  try {
    const res = await fetch(`/api/sessions/${id}/phone`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + adminToken
      },
      body: JSON.stringify({ phone: '' })
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      error.textContent = result.message || 'خطا در حذف شماره همراه.';
      return;
    }
    closeQuickPhoneDialog();
    await loadSessions();
  } catch (err) {
    console.error('Error clearing phone:', err);
    error.textContent = 'خطا در برقراری ارتباط با سرور.';
  }
}

window.openQuickPhoneDialog = openQuickPhoneDialog;
window.closeQuickPhoneDialog = closeQuickPhoneDialog;
window.saveQuickPhone = saveQuickPhone;
window.clearSessionPhone = clearSessionPhone;

async function deleteSession(id, name) {
  if (!confirm(`آیا از حذف کامل جلسه «${name}» اطمینان دارید؟ تمام پیام‌ها و اطلاعات جلسه حذف خواهد شد.`)) return;
  try {
    const res = await fetch(`/api/sessions/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + adminToken
      }
    });
    const result = await res.json();
    if (result.success) {
      loadSessions();
    } else {
      alert(result.message || 'حذف جلسه انجام نشد.');
    }
  } catch(err) { 
    alert('خطا در ارتباط با سرور هنگام حذف.'); 
  }
}

async function changeCaseStatus(sessionId, caseKey, newStatus) {
  let payload = {
    cases: [{ case_key: caseKey, status: newStatus }]
  };
  if (newStatus === 'active') {
    payload.active_case = caseKey;
  }
  try {
    const res = await fetch('/api/sessions/' + sessionId + '/cases', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + adminToken
      },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result && result.success) {
      await loadSessions();
    } else {
      alert((result && result.message) || 'خطا در تغییر وضعیت پرونده.');
    }
  } catch(err) { 
    console.error('Error changing case status:', err); 
    alert('خطا در برقراری ارتباط با سرور.');
  }
}

async function setActiveCase(sessionId, caseKey) {
  try {
    const res = await fetch('/api/sessions/' + sessionId + '/cases', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + adminToken
      },
      body: JSON.stringify({
        active_case: caseKey,
        cases: [{ case_key: caseKey, status: 'active' }]
      })
    });
    const result = await res.json();
    if (result && result.success) {
      await loadSessions();
    } else {
      alert((result && result.message) || 'خطا در فعال‌سازی پرونده.');
    }
  } catch(err) { 
    console.error('Error setting active case:', err); 
    alert('خطا در برقراری ارتباط با سرور.');
  }
}

async function updateCase(sessionId, caseKey, status) {
  return changeCaseStatus(sessionId, caseKey, status);
}

function openSessionDialog() {
  const dialog = document.getElementById('new-session-dialog');
  dialog.showModal();
  document.getElementById('new-session-name').focus();
}

function closeSessionDialog() {
  document.getElementById('new-session-dialog').close();
  document.getElementById('new-session-error').textContent = '';
}

async function createNewSession(event) {
  event.preventDefault();
  const input = document.getElementById('new-session-name');
  const error = document.getElementById('new-session-error');
  const name = input.value.trim();
  if (!name) { error.textContent = 'نام جلسه را وارد کنید.'; return; }
  try {
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + adminToken
      },
      body: JSON.stringify({ name, codeLength: 6 })
    });
    const result = await response.json();
    if (!response.ok || !result.success) { 
      error.textContent = result.message || 'ساخت جلسه انجام نشد.'; 
      return; 
    }
    input.value = '';
    closeSessionDialog();
    loadSessions();
  } catch(err) { 
    error.textContent = 'ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.'; 
  }
}

async function copyCode(code, button) {
  try {
    await navigator.clipboard.writeText(code);
    const original = button.innerHTML;
    button.innerHTML = '✓';
    button.style.color = 'var(--emerald)';
    button.style.borderColor = 'var(--emerald)';
    setTimeout(() => { 
      button.innerHTML = original; 
      button.style.color = '';
      button.style.borderColor = '';
    }, 1400);
  } catch (_) {
    button.textContent = code;
  }
}

function logoutAdmin() {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  try {
    sessionStorage.removeItem('activeAdminSessionId');
    sessionStorage.clear();
  } catch (_) {}
  window.location.href = '/admin/login.html';
}

/* ==========================================================================
   مدیریت پیام‌های آماده (Canned Responses) در داشبورد
   ========================================================================== */
function openCannedResponsesManager() {
  const dialog = document.getElementById('canned-manager-dialog');
  if (dialog) {
    dialog.showModal();
    loadDashboardCannedResponses();
  }
}

function closeCannedResponsesManager() {
  const dialog = document.getElementById('canned-manager-dialog');
  if (dialog) dialog.close();
}

async function loadDashboardCannedResponses() {
  const listEl = document.getElementById('canned-manager-list');
  if (!listEl) return;
  try {
    const res = await fetch('/api/canned-responses', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      listEl.innerHTML = data.data.map(item => `
        <div style="display:flex;justify-content:space-between;align-items:center;background:var(--surface-2);border:1px solid var(--border-subtle);padding:12px;border-radius:8px;">
          <div>
            <strong style="color:var(--gold);display:block;font-size:13px;margin-bottom:3px;">${escapeHtml(item.title)}</strong>
            <span style="color:var(--text-muted);font-size:12px;line-height:1.6;">${escapeHtml(item.content)}</span>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;margin-right:12px;">
            <button type="button" class="dashboard-button primary" style="padding:4px 10px;font-size:11px;min-height:30px;" onclick="editCannedResponse(${item.id})">✏️ ویرایش</button>
            <button type="button" class="dashboard-button danger" style="padding:4px 10px;font-size:11px;min-height:30px;" onclick="deleteCannedResponse(${item.id})">🗑️ حذف</button>
          </div>
        </div>
      `).join('');
    }
  } catch(err) { console.error(err); }
}

async function editCannedResponse(id) {
  const newTitle = prompt('لطفا عنوان جدید پیام آماده را وارد کنید:');
  if (!newTitle) return;
  const newContent = prompt('لطفا متن جدید را وارد کنید:');
  if (!newContent) return;

  try {
    const res = await fetch(`/api/canned-responses/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + adminToken
      },
      body: JSON.stringify({ title: newTitle, content: newContent })
    });
    const data = await res.json();
    if (data.success) {
      loadDashboardCannedResponses();
    } else {
      alert(data.message || 'ویرایش پیام آماده با خطا مواجه شد.');
    }
  } catch(err) { console.error(err); }
}

async function submitNewCannedResponse() {
  const titleInput = document.getElementById('new-canned-title');
  const contentInput = document.getElementById('new-canned-content');
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  if (!title || !content) { alert('عنوان و متن پیام را وارد کنید.'); return; }
  try {
    const res = await fetch('/api/canned-responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + adminToken
      },
      body: JSON.stringify({ title, content })
    });
    const data = await res.json();
    if (data.success) {
      titleInput.value = '';
      contentInput.value = '';
      loadDashboardCannedResponses();
    } else {
      alert(data.message || 'خطا در ثبت پیام آماده.');
    }
  } catch(err) { alert('خطا در ارتباط با سرور.'); }
}

async function deleteCannedResponse(id) {
  if (!confirm('آیا از حذف این پیام آماده مطمئن هستید؟')) return;
  try {
    const res = await fetch(`/api/canned-responses/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    const data = await res.json();
    if (data.success) loadDashboardCannedResponses();
  } catch(err) { console.error(err); }
}

/* ==========================================================================
   مدیریت فایل‌های مدیا بدون آپلود در داشبورد
   ========================================================================== */
function openMediaManagerDialog() {
  const dialog = document.getElementById('media-manager-dialog');
  if (dialog) {
    dialog.showModal();
    loadDashboardMediaList();
  }
}

function closeMediaManagerDialog() {
  const dialog = document.getElementById('media-manager-dialog');
  if (dialog) dialog.close();
}

async function loadDashboardMediaList() {
  const listEl = document.getElementById('dashboard-media-list');
  if (!listEl) return;
  try {
    const res = await fetch('/api/media-library', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      listEl.innerHTML = data.data.map(item => `
        <div style="display:flex;justify-content:space-between;align-items:center;background:var(--surface-2);border:1px solid var(--border-subtle);padding:10px 14px;border-radius:8px;">
          <div>
            <span style="background:var(--gold-light);color:var(--gold);font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;margin-left:6px;">${item.type}</span>
            <strong style="color:#fff;font-family:var(--font-mono);font-size:13px;" dir="ltr">${escapeHtml(item.name)}</strong>
            ${item.title ? `<span style="display:block;color:var(--text-muted);font-size:11px;margin-top:3px;">${escapeHtml(item.title)}</span>` : ''}
          </div>
          <button type="button" class="dashboard-button danger" style="padding:4px 10px;font-size:11px;min-height:30px;" onclick="deleteMediaFile(${item.id})">🗑️ حذف</button>
        </div>
      `).join('');
    }
  } catch(err) { console.error(err); }
}

async function saveMediaFile(event) {
  event.preventDefault();
  const name = document.getElementById('db-media-path').value.trim();
  const type = document.getElementById('db-media-type').value;
  const title = document.getElementById('db-media-title').value.trim();
  if (!name) { alert('نام یا مسیر فایل روی سرور را وارد کنید.'); return; }

  try {
    const res = await fetch('/api/media-library', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + adminToken
      },
      body: JSON.stringify({ name, type, title })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('db-media-path').value = '';
      document.getElementById('db-media-title').value = '';
      loadDashboardMediaList();
    } else {
      alert(data.message || 'خطا در ثبت فایل رسانه‌ای.');
    }
  } catch(err) { alert('خطا در ارتباط با سرور.'); }
}

async function deleteMediaFile(id) {
  if (!confirm('آیا از حذف این فایل از لیست آماده اطمینان دارید؟ (فایل اصلی روی سرور پاک نخواهد شد)')) return;
  try {
    const res = await fetch(`/api/media-library/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    const data = await res.json();
    if (data.success) loadDashboardMediaList();
  } catch(err) { console.error(err); }
}
