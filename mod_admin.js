const fs = require('fs');

const dashboardHtml = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>داشبورد مدیریت | SYSTEM CONTROL</title>
  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/main.css">
  <link rel="stylesheet" href="/assets/css/cyber.css">
  <link rel="stylesheet" href="/assets/css/admin.css">
  <style>
    body { font-family: 'Vazirmatn', sans-serif; background: #080808; color: #eee; }
    .dashboard-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px; background: #111; border-bottom: 2px solid #00f3ff;
    }
    .grid-sessions {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px; padding: 20px;
    }
    .session-card {
      background: #1a1a1a; border: 1px solid #333; padding: 15px; border-radius: 8px;
    }
    .session-card h3 { margin-top: 0; color: #00f3ff; }
    .codes-box { background: #000; padding: 10px; margin: 10px 0; border-left: 3px solid #ff003c; }
    .cases-config { margin: 15px 0; padding: 10px; border: 1px solid #444; }
    .countdown-alert { background: #ff003c; color: white; padding: 10px; font-weight: bold; text-align: center; margin-top: 10px; animation: flash 1s infinite; display: none; }
    @keyframes flash { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
    .cyber-btn { cursor: pointer; padding: 8px 15px; border: none; background: #00f3ff; color: #000; font-weight: bold; border-radius: 4px; }
    .cyber-btn-red { background: #ff003c; color: #fff; }
    .case-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
  </style>
</head>
<body>

  <div class="dashboard-header">
    <div>
      <h1>مرکز فرماندهی SYSTEM</h1>
      <span id="admin-name-display"></span>
    </div>
    <div>
      <button onclick="createNewSession()" class="cyber-btn">ساخت جلسه جدید</button>
      <button onclick="logoutAdmin()" class="cyber-btn cyber-btn-red">خروج</button>
    </div>
  </div>

  <div id="notifications"></div>
  <div class="grid-sessions" id="sessions-grid"></div>

  <script src="/socket.io/socket.io.js"></script>
  <script src="/assets/js/admin-dashboard.js"></script>
</body>
</html>`;

const dashboardJs = `
const adminToken = localStorage.getItem('adminToken');
const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

if (!adminToken) {
  window.location.href = '/admin/login.html';
}

let dashboardSocket = null;
const CASE_DEFS = [
    { key: 'village', title: 'راز دهکده' },
    { key: 'syndrome', title: 'سندروم فراموشی' },
    { key: 'court', title: 'دادگاه عدالت' }
];

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('admin-name-display').innerText = 'ADMIN: ' + (adminUser.display_name || adminUser.username);
  loadSessions();
  initDashboardSocket();
});

function initDashboardSocket() {
  if (typeof io !== 'undefined') {
    dashboardSocket = io({ auth: { token: adminToken } });

    dashboardSocket.on('new_store_order', (data) => {
      alert('سفارش جدید ثبت شد! بدو برو دم در! جلسه: ' + data.sessionId);
      loadSessions();
    });

    dashboardSocket.on('order_countdown_tick', (data) => {
      const el = document.getElementById('countdown-' + data.sessionId);
      if (el) {
          el.style.display = 'block';
          el.innerText = 'زمان تا تحویل: ' + data.remaining + ' ثانیه - بدو برو دم در!';
          if (data.remaining <= 0) el.style.display = 'none';
      }
    });

    dashboardSocket.on('session_updated', () => loadSessions());
  }
}

async function loadSessions() {
  try {
    const res = await fetch('/api/sessions', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    const result = await res.json();
    if (result.success) renderSessions(result.data);
  } catch (err) { console.error(err); }
}

function renderSessions(sessions) {
  const grid = document.getElementById('sessions-grid');
  grid.innerHTML = '';
  
  sessions.forEach(s => {
    const card = document.createElement('div');
    card.className = 'session-card';
    
    // cases html
    let casesHtml = '<div class="cases-config"><strong>وضعیت پرونده‌ها:</strong><br>';
    CASE_DEFS.forEach(cDef => {
       const caseData = (s.cases || []).find(c => c.case_key === cDef.key);
       const status = caseData ? caseData.status : 'locked';
       const isActive = s.active_case === cDef.key;
       
       casesHtml += \`
         <div class="case-row">
           <span>\${cDef.title}</span>
           <select onchange="updateCase('\${s.id}', '\${cDef.key}', this.value)">
             <option value="locked" \${status === 'locked' && !isActive ? 'selected' : ''}>قفل</option>
             <option value="active" \${isActive ? 'selected' : ''}>باز (Active)</option>
             <option value="solved" \${status === 'solved' && !isActive ? 'selected' : ''}>حل شده</option>
           </select>
         </div>
       \`;
    });
    casesHtml += '</div>';

    card.innerHTML = \`
      <h3>\${s.name}</h3>
      <div class="codes-box">
        <div>کد سفارش (خرید گل): <strong>\${s.order_code}</strong></div>
        <div>کد چت (روی بسته): <strong>\${s.chat_code || s.code}</strong></div>
      </div>
      \${casesHtml}
      <div id="countdown-\${s.id}" class="countdown-alert"></div>
      <button class="cyber-btn" onclick="location.href='/admin/chat.html?session=\${s.id}'">ورود به چت جلسه</button>
    \`;
    grid.appendChild(card);
  });
}

async function updateCase(sessionId, caseKey, status) {
    let payload = { cases: [] };
    if (status === 'active') {
        payload.active_case = caseKey;
    } else {
        payload.cases.push({ case_key: caseKey, status: status });
    }
    
    try {
        await fetch('/api/sessions/' + sessionId + '/cases', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + adminToken
            },
            body: JSON.stringify(payload)
        });
        loadSessions();
    } catch(err) { console.error(err); }
}

async function createNewSession() {
    const name = prompt('نام جلسه جدید:');
    if (!name) return;
    try {
        await fetch('/api/sessions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + adminToken
            },
            body: JSON.stringify({ name, codeLength: 6 })
        });
        loadSessions();
    } catch(err) { console.error(err); }
}

function logoutAdmin() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = '/admin/login.html';
}
`;

fs.writeFileSync('public/admin/dashboard.html', dashboardHtml);
fs.writeFileSync('public/assets/js/admin-dashboard.js', dashboardJs);
