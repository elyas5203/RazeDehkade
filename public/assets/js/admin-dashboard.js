/**
 * public/assets/js/admin-dashboard.js
 * منطق داشبورد مدیریت ادمین و نمایش لیست جلسات
 */

const adminToken = localStorage.getItem('adminToken');
const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

if (!adminToken) {
  window.location.href = '/admin/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('admin-name-display').innerText = `> ADMIN: ${adminUser.display_name || adminUser.username}`;
  loadSessions();
});

async function loadSessions() {
  try {
    const res = await fetch('/api/sessions', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    });

    const data = await res.json();
    if (!data.success) {
      if (res.status === 401 || res.status === 403) {
        logoutAdmin();
      }
      return;
    }

    renderSessions(data.data);
  } catch (err) {
    console.error('Error fetching sessions:', err);
  }
}

function renderSessions(sessions) {
  const grid = document.getElementById('sessions-grid');
  grid.innerHTML = '';

  if (sessions.length === 0) {
    grid.innerHTML = '<div style="color:var(--text-muted); grid-column: 1/-1; text-align:center;">هیچ جلسه‌ای یافت نشد. برای شروع روی ساخت جلسه جدید کلیک کنید.</div>';
    return;
  }

  sessions.forEach(s => {
    const card = document.createElement('div');
    card.className = 'cyber-card session-card';
    card.onclick = () => selectSession(s.id);

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <h3 style="font-size:15px; color:#fff;">${s.name}</h3>
        <span class="session-code-badge">${s.code}</span>
      </div>
      <div style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">
        وضعیت: <span style="color:var(--neon-cyan);">${s.status}</span> |
        ادمین مسئول: <span>${s.assigned_admin_name || 'تخصیص‌نیافته'}</span>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:11px; color:#475569;">آخرین فعالیت: ${new Date(s.last_activity_at).toLocaleTimeString('fa-IR')}</span>
        ${s.unread_count > 0 ? `<span class="unread-badge">${s.unread_count} پیام جدید</span>` : ''}
      </div>
    `;

    grid.appendChild(card);
  });
}

async function openCreateModal() {
  const name = prompt('نام جلسه جدید را وارد کنید (مثال: دستیاران کارآگاه - جلسه ۴):', 'دستیاران کارآگاه - جلسه جدید');
  if (!name) return;

  try {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name, codeLength: 6 }),
    });

    const data = await res.json();
    if (data.success) {
      alert(`جلسه با کد عددی ${data.data.code} با موفقیت ایجاد شد.`);
      loadSessions();
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error('Error creating session:', err);
  }
}

function selectSession(sessionId) {
  sessionStorage.setItem('activeAdminSessionId', sessionId);
  window.location.href = '/admin/chat.html';
}

function logoutAdmin() {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  window.location.href = '/admin/login.html';
}
