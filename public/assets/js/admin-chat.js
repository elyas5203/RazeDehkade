/**
 * public/assets/js/admin-chat.js
 * منطق چت ادمین با قابلیت سوئیچ بین چند جلسه و پیام‌های آماده
 */

let socket = null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function safeFileUrl(value) {
  let url = String(value || '').trim().replace(/\\/g, '/');
  if (!url || url.includes('..') || url.includes('\0') || /^(?:https?:|\/\/)/i.test(url) || /[<>:"|?*]/.test(url)) {
    return '#';
  }
  if (/^(?:images|videos|audio|files)\//i.test(url)) {
    url = '/media-library/' + url;
  }
  if (/^\/(uploads|media-library|assets)\//i.test(url)) {
    return url;
  }
  return '#';
}
const adminToken = localStorage.getItem('adminToken');
const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
const requestedSessionId = parseInt(new URLSearchParams(window.location.search).get('session'), 10) || null;
let activeSessionId = requestedSessionId || parseInt(sessionStorage.getItem('activeAdminSessionId'), 10) || null;
let sessionsMap = {};
const sessionDrafts = new Map();
let historyLoadedFor = null;

let adminPeerConnection = null;
let isAudioListening = false;
let audioKeepAliveTimer = null;
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

if (!adminToken) {
  window.location.href = '/admin/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  loadAdminSessions();
  loadWeeklyContent(1);
  initAdminSocket();

  const adminMsgInput = document.getElementById('admin-msg-input');
  if (adminMsgInput) {
    adminMsgInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (!e.shiftKey) {
          e.preventDefault();
          if (e.isComposing || e.keyCode === 229) {
            return;
          }
          sendAdminMessage();
        }
        // Shift+Enter creates a new line
      }
    });

    adminMsgInput.addEventListener('input', () => {
      handleAdminTyping();
      adminMsgInput.style.height = 'auto';
      adminMsgInput.style.height = Math.min(adminMsgInput.scrollHeight, 160) + 'px';
    });
  }
});

function initAdminSocket() {
  socket = io({
    auth: { token: adminToken },
  });

  const statusEl = document.getElementById('admin-socket-status');

  socket.on('connect', () => {
    statusEl.className = 'status-indicator online';
    statusEl.innerHTML = '<span class="status-dot"></span> مرکز متصل است';
    if (activeSessionId) {
      socket.emit('join_session', { sessionId: activeSessionId });
      switchSession(activeSessionId);
    }
  });

  socket.io.on('reconnect', () => {
    statusEl.className = 'status-indicator online';
    statusEl.innerHTML = '<span class="status-dot"></span> اتصال مجدد برقرار شد';
    if (activeSessionId) {
      socket.emit('join_session', { sessionId: activeSessionId });
    }
  });

  socket.on('disconnect', () => {
    statusEl.className = 'status-indicator offline';
    statusEl.innerHTML = '<span class="status-dot"></span> در حال وصل شدن مجدد...';
  });

  socket.on('new_message', (msg) => {
    if (Number(msg.session_id) === Number(activeSessionId)) {
      renderAdminMessage(msg);
    }
    if (sessionsMap[msg.session_id]) {
      sessionsMap[msg.session_id].last_activity_at = new Date().toISOString();
      if (Number(msg.session_id) !== Number(activeSessionId) && msg.sender_type === 'user') {
        sessionsMap[msg.session_id].unread_count = (sessionsMap[msg.session_id].unread_count || 0) + 1;
      }
    }
    loadAdminSessions();
  });

  socket.on('session_updated', (data) => {
    if (data && data.sessionId && sessionsMap[data.sessionId]) {
      sessionsMap[data.sessionId].last_activity_at = new Date().toISOString();
    }
    loadAdminSessions();
  });

  socket.on('user_typing', (data) => {
    if (data.sessionId === activeSessionId && data.senderType === 'user') {
      const indicator = document.getElementById('admin-typing-indicator');
      indicator.innerText = data.isTyping ? 'کاربر جلسه در حال تایپ است...' : '';
    }
  });

  // دریافت Offer لایو از سمت کاربر جلسه
  socket.on('webrtc_offer', async (data) => {
    if (data.sessionId === activeSessionId && isAudioListening) {
      await handleUserOffer(data.offer, data.senderSocketId);
    }
  });

  socket.on('webrtc_ice_candidate', async (data) => {
    if (adminPeerConnection && data.candidate && isAudioListening) {
      try {
        await adminPeerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.error('Error adding ICE candidate on admin:', e);
      }
    }
  });

  socket.on('message_edited', (data) => {
    if (Number(data.sessionId) === Number(activeSessionId)) {
      const contentEl = document.getElementById(`msg-content-${data.messageId}`);
      if (contentEl) {
        contentEl.textContent = data.content;
      }
    }
  });

  socket.on('message_deleted', (data) => {
    if (Number(data.sessionId) === Number(activeSessionId)) {
      const msgEl = document.querySelector(`[data-message-id="${data.messageId}"]`);
      if (msgEl) msgEl.remove();
    }
  });

  socket.on('audio_stream_stopped', (data) => {
    if (data.sessionId === activeSessionId) {
      stopAdminAudioListening();
    }
  });

  socket.on('chat_lock_updated', (data) => {
    if (data) {
      if (sessionsMap[data.sessionId]) {
        sessionsMap[data.sessionId].is_chat_locked = data.isLocked;
      }
      if (Number(data.sessionId) === Number(activeSessionId)) {
        updateChatLockBtnUI(Boolean(data.isLocked));
      }
    }
  });

  socket.on('session_updated', (data) => {
    if (data && sessionsMap[data.sessionId]) {
      if (typeof data.isChatLocked !== 'undefined') {
        sessionsMap[data.sessionId].is_chat_locked = data.isChatLocked;
        if (Number(data.sessionId) === Number(activeSessionId)) {
          updateChatLockBtnUI(Boolean(data.isChatLocked));
        }
      }
    }
  });
}

async function loadAdminSessions() {
  try {
    const res = await fetch('/api/sessions', {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (data.success) {
      renderSessionsSidebar(data.data);

      if (!activeSessionId && data.data.length > 0) {
        switchSession(data.data[0].id);
      } else if (activeSessionId && sessionsMap[activeSessionId]) {
        updateActiveHeader();
        if (historyLoadedFor !== activeSessionId) switchSession(activeSessionId);
      }
    }
  } catch (err) {
    console.error('Error fetching admin sessions:', err);
  }
}

function renderSessionsSidebar(sessions) {
  const container = document.getElementById('admin-sessions-list');
  container.innerHTML = '';

  // سورت بلادرنگ جلسات بر اساس جدیدترین زمان فعالیت / پیام (last_activity_at)
  const sortedSessions = [...sessions].sort((a, b) => {
    const timeA = new Date(a.last_activity_at || a.updated_at || 0).getTime();
    const timeB = new Date(b.last_activity_at || b.updated_at || 0).getTime();
    return timeB - timeA;
  });

  sortedSessions.forEach(s => {
    sessionsMap[s.id] = s;
    const item = document.createElement('div');
    item.className = `session-card ${s.id === activeSessionId ? 'active' : ''}`;
    item.onclick = () => switchSession(s.id);

    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:13px; font-weight:bold;">${escapeHtml(s.name)}</span>
        <span class="session-code-badge">${s.code}</span>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
        <small style="color:var(--text-muted); font-size:11px;">وضعیت: ${s.status}</small>
        ${s.unread_count > 0 ? `<span class="unread-badge">${s.unread_count}</span>` : ''}
      </div>
    `;

    container.appendChild(item);
  });
}

async function switchSession(nextSessionId) {
  const prevSessionId = activeSessionId;
  const input = document.getElementById('admin-msg-input');
  if (prevSessionId) sessionDrafts.set(prevSessionId, input.value);
  stopAdminAudioListening();
  activeSessionId = nextSessionId;
  historyLoadedFor = nextSessionId;
  input.value = sessionDrafts.get(nextSessionId) || '';
  document.getElementById('admin-messages-box').innerHTML = '';
  sessionStorage.setItem('activeAdminSessionId', nextSessionId);

  updateActiveHeader();
  renderSessionsSidebar(Object.values(sessionsMap));

  // در گوشی موبایل با انتخاب یک جلسه، بلافاصله به تب اتاق گفتگو هدایت شود
  if (window.innerWidth <= 768) {
    switchMobileTab('chat');
  }

  if (socket) {
    socket.emit('admin_switch_session', {
      previousSessionId: prevSessionId,
      nextSessionId: activeSessionId,
    });
  }

  // دریافت پیام‌ها
  try {
    const res = await fetch(`/api/sessions/${activeSessionId}/messages`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    if (res.status === 401 || res.status === 403) {
      alert('نشست مدیریتی شما منقضی شده است. لطفا مجددا وارد شوید.');
      window.location.href = '/admin/login.html';
      return;
    }
    const data = await res.json();
    if (data.success && activeSessionId === nextSessionId) {
      const lockState = (data.session && typeof data.session.is_chat_locked !== 'undefined')
        ? data.session.is_chat_locked
        : (typeof data.is_chat_locked !== 'undefined' ? data.is_chat_locked : sessionsMap[activeSessionId]?.is_chat_locked);
      updateChatLockBtnUI(Boolean(lockState));
      if (sessionsMap[activeSessionId]) sessionsMap[activeSessionId].is_chat_locked = Boolean(lockState);

      const box = document.getElementById('admin-messages-box');
      data.data.forEach(renderAdminMessage);
    }
  } catch (err) {
    console.error('Error loading session messages:', err);
  }
}

function updateActiveHeader() {
  const s = sessionsMap[activeSessionId];
  if (s) {
    const titleText = `${s.name} (کد: ${s.code})`;
    document.getElementById('active-session-title').innerText = titleText;
    const mobileHeaderEl = document.getElementById('mobile-chat-session-title');
    if (mobileHeaderEl) mobileHeaderEl.innerText = titleText;
    updateChatLockBtnUI(s.is_chat_locked);
  }
}

function renderAdminMessage(msg) {
  const box = document.getElementById('admin-messages-box');
  if (Number(msg.session_id) !== Number(activeSessionId)) return;
  if (box.querySelector(`[data-message-id="${Number(msg.id)}"]`)) return;
  const div = document.createElement('div');
  div.dataset.messageId = Number(msg.id);
  div.className = `message-bubble ${msg.sender_type}`;

  let senderTitle = msg.admin_sender_name || 'ادمین';
  if (msg.sender_type === 'user') senderTitle = 'دستیاران کارآگاه';
  if (msg.sender_type === 'system') senderTitle = 'سیستم';
  if (msg.sender_type === 'hacker') senderTitle = 'شبکه مزداک';

  let bodyContent = escapeHtml(msg.content);
  if (msg.message_type === 'image') {
    const imageUrl = safeFileUrl(msg.file_url);
    const caption = msg.content && msg.content !== msg.file_name ? `<p style="margin:0 0 4px;font-size:12.5px;">${escapeHtml(msg.content)}</p>` : '';
    bodyContent = `${caption}<a href="${imageUrl}" target="_blank" rel="noopener" class="admin-media-thumb" title="مشاهده تصویر"><img src="${imageUrl}" alt="تصویر ارسالی" class="admin-thumb-img"></a>`;
  } else if (msg.message_type === 'voice' || msg.message_type === 'user_voice') {
    div.classList.add('has-voice-message');
    const voiceUrl = safeFileUrl(msg.file_url);
    const hasNote = msg.content && msg.content !== 'پیام صوتی' && msg.content !== msg.file_name;
    const noteMarkup = hasNote ? `<p style="margin:0 0 4px;font-size:12px;color:#cbd5e1;">${escapeHtml(msg.content)}</p>` : '';
    const voiceMarkup = window.createTelegramVoiceMarkup 
      ? window.createTelegramVoiceMarkup({ ...msg, file_url: voiceUrl }) 
      : `<audio controls preload="metadata" src="${voiceUrl}" style="height:32px;max-width:240px;"></audio>`;
    bodyContent = `${noteMarkup}${voiceMarkup}`;
  } else if (msg.message_type === 'video') {
    const videoUrl = safeFileUrl(msg.file_url);
    const caption = msg.content && msg.content !== msg.file_name ? `<p style="margin:0 0 4px;font-size:12.5px;">${escapeHtml(msg.content)}</p>` : '';
    bodyContent = `${caption}<video controls preload="metadata" src="${videoUrl}" class="admin-thumb-video"></video>`;
  } else if (msg.message_type === 'file') {
    const fileUrl = safeFileUrl(msg.file_url);
    bodyContent = `<a href="${fileUrl}" download target="_blank" rel="noopener" class="admin-file-badge"><span style="font-size:14px;">📁</span><span>${escapeHtml(msg.file_name || msg.content || 'دریافت فایل')}</span></a>`;
  }

  div.innerHTML = `
    <div class="message-sender">
      <span>${escapeHtml(senderTitle)}</span>
      <div style="display:flex;align-items:center;gap:6px;">
        <span class="msg-time-badge">${new Date(msg.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
        <div class="msg-actions">
          <button type="button" class="msg-action-btn" onclick="editChatMessage(${msg.id})" style="color:var(--command-amber);" title="ویرایش پیام">✏️</button>
          <button type="button" class="msg-action-btn" onclick="deleteChatMessage(${msg.id})" style="color:var(--command-red);" title="حذف پیام">🗑️</button>
        </div>
      </div>
    </div>
    <div id="msg-content-${msg.id}" class="message-content">${bodyContent}</div>
  `;

  const laterMessage = [...box.children].find(child => Number(child.dataset.messageId) > Number(msg.id));
  box.insertBefore(div, laterMessage || null);
  box.scrollTop = box.scrollHeight;
}

function editChatMessage(messageId) {
  const contentEl = document.getElementById(`msg-content-${messageId}`);
  const oldText = contentEl ? contentEl.textContent.trim() : '';
  const newText = prompt('متن جدید پیام را وارد کنید:', oldText);
  if (newText === null || !newText.trim()) return;

  if (socket) {
    socket.emit('edit_message', { messageId, content: newText.trim() }, (res) => {
      if (res && res.success) {
        if (contentEl) contentEl.textContent = newText.trim();
      } else {
        alert((res && res.message) || 'خطا در ویرایش پیام.');
      }
    });
  }
}

function deleteChatMessage(messageId) {
  if (!confirm('آیا از حذف این پیام اطمینان دارید؟ (این پیام برای کاربر هم پاک می‌شود)')) return;
  if (socket) {
    socket.emit('delete_message', { messageId }, (res) => {
      if (res && res.success) {
        const msgEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (msgEl) msgEl.remove();
      } else {
        alert((res && res.message) || 'خطا در حذف پیام.');
      }
    });
  }
}

function sendAdminMessage() {
  if (!activeSessionId) return;

  const input = document.getElementById('admin-msg-input');
  const senderTypeSelect = document.getElementById('admin-sender-type');
  const rawContent = input.value.trim();
  const content = rawContent.replace(/\n{3,}/g, '\n\n');

  if (!content) return;

  socket.emit('send_message', {
    sessionId: activeSessionId,
    content: content,
    senderType: senderTypeSelect.value,
    messageType: 'text',
  });

  input.value = '';
  input.style.height = 'auto';
  sendAdminTyping(false);
}

let adminTypingTimeout = null;
function handleAdminTyping() {
  sendAdminTyping(true);
  clearTimeout(adminTypingTimeout);
  adminTypingTimeout = setTimeout(() => {
    sendAdminTyping(false);
  }, 2500);
}

function sendAdminTyping(isTyping) {
  if (socket && activeSessionId) {
    socket.emit('typing', { sessionId: activeSessionId, isTyping });
  }
}

let cannedResponsesData = [];

function switchMobileTab(tabName) {
  document.body.className = `command-page mobile-tab-${tabName}`;
  document.querySelectorAll('.mobile-tab-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`tab-btn-${tabName}`);
  if (activeBtn) activeBtn.classList.add('active');
}

async function loadCannedResponses() {
  try {
    const res = await fetch('/api/canned-responses', {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (data.success) {
      cannedResponsesData = data.data;
      const container = document.getElementById('canned-responses-container');
      if (container) {
        container.innerHTML = '';
        data.data.forEach(item => {
          const chip = document.createElement('div');
          chip.className = 'canned-chip';
          chip.innerText = item.title;
          chip.title = item.content;
          chip.onclick = () => {
            insertTextToComposer(item.content);
          };
          container.appendChild(chip);
        });
      }
    }
  } catch (err) {
    console.error('Error fetching canned responses:', err);
  }
}

function openCannedResponsesManager() {
  const dialog = document.getElementById('canned-manager-dialog');
  const list = document.getElementById('canned-manager-list');
  if (!dialog || !list) return;
  list.innerHTML = '';

  if (cannedResponsesData.length === 0) {
    list.innerHTML = '<p style="color:#8d9699;font-size:12px;text-align:center;">پیام آماده‌ای وجود ندارد.</p>';
  } else {
    cannedResponsesData.forEach(item => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;background:#0e1214;padding:8px 12px;border:1px solid #34383a;border-radius:2px;';
      row.innerHTML = `
        <div style="flex:1;overflow:hidden;margin-left:10px;">
          <strong style="color:var(--command-amber);font-size:13px;display:block;">${escapeHtml(item.title)}</strong>
          <small style="color:#a8afa9;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;">${escapeHtml(item.content)}</small>
        </div>
        <div style="display:flex;gap:6px;">
          <button type="button" class="command-button" style="padding:4px 8px;font-size:11px;" onclick="editCannedResponse(${item.id})">✏️</button>
          <button type="button" class="command-button danger" style="padding:4px 8px;font-size:11px;" onclick="deleteCannedResponse(${item.id})">🗑️</button>
        </div>
      `;
      list.appendChild(row);
    });
  }

  dialog.showModal();
}

function closeCannedResponsesManager() {
  const dialog = document.getElementById('canned-manager-dialog');
  if (dialog) dialog.close();
}

async function editCannedResponse(id) {
  const item = cannedResponsesData.find(c => c.id === id);
  if (!item) return;
  const newTitle = prompt('عنوان پیام آماده:', item.title);
  if (newTitle === null) return;
  const newContent = prompt('متن کامل پیام آماده:', item.content);
  if (newContent === null) return;

  try {
    const res = await fetch(`/api/canned-responses/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ title: newTitle, content: newContent }),
    });

    const data = await res.json();
    if (data.success) {
      await loadCannedResponses();
      openCannedResponsesManager();
    }
  } catch (err) {
    console.error('Error updating canned response:', err);
  }
}

async function deleteCannedResponse(id) {
  if (!confirm('آیا از حذف این پیام آماده اطمینان دارید؟')) return;
  try {
    const res = await fetch(`/api/canned-responses/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (data.success) {
      await loadCannedResponses();
      openCannedResponsesManager();
    }
  } catch (err) {
    console.error('Error deleting canned response:', err);
  }
}

async function promptNewCanned() {
  const title = prompt('عنوان کوتاه پیام آماده:');
  if (!title) return;
  const content = prompt('متن کامل پیام آماده:');
  if (!content) return;

  try {
    const res = await fetch('/api/canned-responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ title, content }),
    });

    const data = await res.json();
    if (data.success) {
      await loadCannedResponses();
      if (document.getElementById('canned-manager-dialog')?.open) {
        openCannedResponsesManager();
      }
    }
  } catch (err) {
    console.error('Error creating canned response:', err);
  }
}

function updateAudioUI(status) {
  const btn = document.getElementById('admin-audio-toggle-btn');
  const mobileBtn = document.getElementById('mobile-admin-audio-toggle-btn');
  const badge = document.getElementById('audio-listening-indicator');
  const badgeText = document.getElementById('audio-listening-status-text');
  const mobileBadge = document.getElementById('mobile-audio-listening-indicator');
  const mobileBadgeText = document.getElementById('mobile-audio-listening-status-text');

  if (status === 'off') {
    if (btn) {
      btn.innerText = '🎙️ شروع شنود صدا';
      btn.className = 'command-button';
    }
    if (mobileBtn) {
      mobileBtn.innerText = '🎙️ شروع شنود صدا';
      mobileBtn.className = 'command-button wide';
    }
    if (badge) badge.style.display = 'none';
    if (mobileBadge) mobileBadge.style.display = 'none';
  } else if (status === 'connecting') {
    if (btn) {
      btn.innerText = '⏹️ قطع شنود صدا';
      btn.className = 'command-button danger';
    }
    if (mobileBtn) {
      mobileBtn.innerText = '⏹️ قطع شنود صدا';
      mobileBtn.className = 'command-button danger wide';
    }
    if (badge) {
      badge.style.display = 'inline-flex';
      badge.style.borderColor = '#f59e0b';
      badge.style.color = '#fbbf24';
      badge.style.background = 'rgba(245,158,11,0.15)';
    }
    if (badgeText) badgeText.innerText = '⏳ در حال اتصال به میکروفون…';
    if (mobileBadge) {
      mobileBadge.style.display = 'inline-flex';
      mobileBadge.style.borderColor = '#f59e0b';
      mobileBadge.style.color = '#fbbf24';
      mobileBadge.style.background = 'rgba(245,158,11,0.15)';
    }
    if (mobileBadgeText) mobileBadgeText.innerText = '⏳ در حال اتصال به میکروفون…';
  } else if (status === 'live') {
    if (btn) {
      btn.innerText = '⏹️ قطع شنود صدا';
      btn.className = 'command-button danger';
    }
    if (mobileBtn) {
      mobileBtn.innerText = '⏹️ قطع شنود صدا';
      mobileBtn.className = 'command-button danger wide';
    }
    if (badge) {
      badge.style.display = 'inline-flex';
      badge.style.borderColor = '#ef4444';
      badge.style.color = '#fca5a5';
      badge.style.background = 'rgba(239,68,68,0.2)';
    }
    if (badgeText) badgeText.innerText = '🔴 شنود زنده فعال است';
    if (mobileBadge) {
      mobileBadge.style.display = 'inline-flex';
      mobileBadge.style.borderColor = '#ef4444';
      mobileBadge.style.color = '#fca5a5';
      mobileBadge.style.background = 'rgba(239,68,68,0.2)';
    }
    if (mobileBadgeText) mobileBadgeText.innerText = '🔴 شنود زنده فعال است';
  } else if (status === 'reconnecting') {
    if (badge) {
      badge.style.display = 'inline-flex';
      badge.style.borderColor = '#f97316';
      badge.style.color = '#fdba74';
      badge.style.background = 'rgba(249,115,22,0.15)';
    }
    if (badgeText) badgeText.innerText = '⚠️ قطع موقت - در حال بازیابی اتصال…';
    if (mobileBadge) {
      mobileBadge.style.display = 'inline-flex';
      mobileBadge.style.borderColor = '#f97316';
      mobileBadge.style.color = '#fdba74';
      mobileBadge.style.background = 'rgba(249,115,22,0.15)';
    }
    if (mobileBadgeText) mobileBadgeText.innerText = '⚠️ قطع موقت - در حال بازیابی اتصال…';
  }
}

function toggleAdminAudioStream() {
  if (!activeSessionId) {
    alert('لطفا ابتدا یک جلسه را برای شنود انتخاب کنید.');
    return;
  }

  if (!isAudioListening) {
    startAdminAudioListening();
  } else {
    stopAdminAudioListening();
  }
}

function startAdminAudioListening() {
  isAudioListening = true;
  updateAudioUI('connecting');

  if (socket && activeSessionId) {
    socket.emit('start_audio_stream', { sessionId: activeSessionId });
  }

  // تایمر بازیابی و نگه‌داشت پایداری اتصال (هر ۶ ثانیه چک می‌کند)
  if (audioKeepAliveTimer) clearInterval(audioKeepAliveTimer);
  audioKeepAliveTimer = setInterval(() => {
    if (!isAudioListening || !activeSessionId) return;
    if (!adminPeerConnection || adminPeerConnection.connectionState !== 'connected') {
      updateAudioUI('reconnecting');
      if (socket) {
        socket.emit('start_audio_stream', { sessionId: activeSessionId });
      }
    }
  }, 6000);
}

function stopAdminAudioListening() {
  if (!isAudioListening && !adminPeerConnection && !audioKeepAliveTimer) {
    return;
  }

  isAudioListening = false;
  if (audioKeepAliveTimer) {
    clearInterval(audioKeepAliveTimer);
    audioKeepAliveTimer = null;
  }

  if (socket && activeSessionId) {
    socket.emit('stop_audio_stream', { sessionId: activeSessionId });
  }

  if (adminPeerConnection) {
    try { adminPeerConnection.close(); } catch (_) {}
    adminPeerConnection = null;
  }

  const audioPlayer = document.getElementById('remote-audio-player');
  if (audioPlayer) {
    audioPlayer.srcObject = null;
  }

  updateAudioUI('off');
}

async function handleUserOffer(offer, userSocketId) {
  if (adminPeerConnection) {
    try { adminPeerConnection.close(); } catch (_) {}
  }

  adminPeerConnection = new RTCPeerConnection(rtcConfig);

  // پایش وضعیت اتصال و وصل مجدد خودکار در صورت قطعی
  adminPeerConnection.onconnectionstatechange = () => {
    if (!adminPeerConnection) return;
    const state = adminPeerConnection.connectionState;
    console.log('WebRTC Connection state:', state);
    if (state === 'connected') {
      updateAudioUI('live');
    } else if (state === 'disconnected' || state === 'failed') {
      if (isAudioListening) {
        updateAudioUI('reconnecting');
        setTimeout(() => {
          if (isAudioListening && socket && activeSessionId) {
            socket.emit('start_audio_stream', { sessionId: activeSessionId });
          }
        }, 1500);
      }
    }
  };

  adminPeerConnection.oniceconnectionstatechange = () => {
    if (!adminPeerConnection) return;
    const ice = adminPeerConnection.iceConnectionState;
    if (ice === 'connected' || ice === 'completed') {
      updateAudioUI('live');
    }
  };

  // دریافت استریم صدای میکروفون کاربر
  adminPeerConnection.ontrack = (event) => {
    const audioPlayer = document.getElementById('remote-audio-player');
    if (audioPlayer && event.streams && event.streams[0]) {
      audioPlayer.srcObject = event.streams[0];
      audioPlayer.play().then(() => {
        updateAudioUI('live');
      }).catch(e => {
        console.log('Audio autoplay policy note:', e);
        updateAudioUI('live');
      });
    }
  };

  adminPeerConnection.onicecandidate = (event) => {
    if (event.candidate && socket && activeSessionId) {
      socket.emit('webrtc_ice_candidate', {
        sessionId: activeSessionId,
        candidate: event.candidate,
        targetSocketId: userSocketId,
      });
    }
  };

  try {
    await adminPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await adminPeerConnection.createAnswer();
    await adminPeerConnection.setLocalDescription(answer);

    if (socket && activeSessionId) {
      socket.emit('webrtc_answer', {
        sessionId: activeSessionId,
        answer: answer,
        targetSocketId: userSocketId,
      });
    }
  } catch (err) {
    console.error('Error handling WebRTC offer on admin:', err);
    if (isAudioListening) {
      updateAudioUI('reconnecting');
    }
  }
}

function triggerAdminFileInput(acceptType) {
  const fileInput = document.getElementById('admin-file-input');
  if (fileInput) {
    fileInput.accept = acceptType || '*';
    fileInput.click();
  }
}

async function handleAdminFileUpload(event) {
  if (!activeSessionId) {
    alert('لطفا ابتدا یک جلسه را انتخاب کنید.');
    return;
  }

  const file = event.target.files[0];
  if (!file) return;
  const uploadSessionId = activeSessionId;
  const uploadSenderType = document.getElementById('admin-sender-type').value;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (data.success) {
      const { fileUrl, fileName, messageType } = data.data;
      const senderTypeSelect = document.getElementById('admin-sender-type');

      socket.emit('send_message', {
        sessionId: uploadSessionId,
        content: fileName,
        senderType: uploadSenderType,
        messageType: messageType,
        fileUrl: fileUrl,
        fileName: fileName,
      }, (ack) => {
        if (ack && !ack.success) {
          alert(ack.message || 'خطا در ارسال فایل به چت');
        }
      });

      event.target.value = '';
    } else {
      alert('خطا در آپلود فایل: ' + data.message);
    }
  } catch (err) {
    console.error('Error uploading admin file:', err);
    alert('خطا در برقراری ارتباط با سرور هنگام آپلود.');
  }
}

function triggerHackSequence() {
  if (!activeSessionId || document.getElementById('hack-confirm-dialog')) return;
  const target = activeSessionId;
  const dialog = document.createElement('dialog');
  dialog.id = 'hack-confirm-dialog';
  dialog.style.cssText = 'margin:auto;padding:32px;background:#111b27;color:#ecf0f4;border:1px solid #785056;max-width:440px;width:90%;';
  const title = document.createElement('h2'); title.textContent = 'اجرای سکانس مزداک'; title.style.fontSize = '20px';
  const description = document.createElement('p'); description.textContent = `برای «${sessionsMap[target]?.name || target}» اجرا شود؟`; description.style.margin = '20px 0';
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  const confirmButton = document.createElement('button'); confirmButton.textContent = 'اجرای سکانس'; confirmButton.className = 'cyber-btn';
  const cancelButton = document.createElement('button'); cancelButton.textContent = 'انصراف'; cancelButton.className = 'cyber-btn'; cancelButton.style.margin = '12px';
  const close = () => { dialog.close(); dialog.remove(); };
  cancelButton.onclick = close;
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  confirmButton.onclick = () => {
    if (!socket?.connected) { status.textContent = 'اتصال برقرار نیست؛ دوباره امتحان کنید.'; return; }
    confirmButton.disabled = true; status.textContent = 'در حال ارسال…';
    socket.timeout(5000).emit('trigger_hack_sequence', { sessionId: target, hackerName: 'مزداک' }, (error, result) => {
      if (error || !result?.success) { status.textContent = result?.message || 'تأیید اجرا دریافت نشد.'; confirmButton.disabled = false; return; }
      status.textContent = 'سکانس اجرا شد.'; setTimeout(close, 900);
    });
  };
  dialog.append(title, description, status, confirmButton, cancelButton); document.body.append(dialog); dialog.showModal(); cancelButton.focus();
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function loadMediaLibrary() {
  const list = document.getElementById('media-library-list');
  const feedback = document.getElementById('media-library-feedback');
  if (!list) return;
  list.innerHTML = '';
  if (feedback) feedback.textContent = 'در حال دریافت فایل‌ها…';
  try {
    const response = await fetch('/api/media-library', { headers: { Authorization: `Bearer ${adminToken}` } });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message);
    if (feedback) feedback.textContent = result.data.length ? `${result.data.length} فایل آماده ارسال است.` : 'لیست فایل‌ها خالی است.';
    
    result.data.forEach(file => {
      const card = document.createElement('div');
      card.className = 'media-item-card';
      card.style.cssText = 'background:#14191c;border:1px solid #343c3e;padding:10px;border-radius:4px;cursor:pointer;display:flex;flex-direction:column;gap:4px;transition:border-color 0.2s;';
      
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="background:var(--command-amber);color:#0e1214;font-size:10px;font-weight:bold;padding:2px 6px;border-radius:3px;">${escapeHtml(file.type)}</span>
          <span style="font-size:11px;color:var(--command-amber);font-weight:bold;">📤 ارسال به جلسه</span>
        </div>
        <strong style="font-size:13px;color:#fff;direction:ltr;text-align:right;" dir="ltr">${escapeHtml(file.name)}</strong>
        ${file.title ? `<small style="color:#a8afa9;font-size:11px;">${escapeHtml(file.title)}</small>` : ''}
      `;

      card.onclick = () => sendQuickMedia(file);
      list.appendChild(card);
    });
  } catch (error) {
    if (feedback) feedback.textContent = 'خطا در دریافت لیست فایل‌ها.';
  }
}

async function sendQuickMedia(file) {
  if (!activeSessionId) {
    alert('لطفاً ابتدا یک جلسه را از لیست سمت راست/سایدبار انتخاب کنید.');
    return;
  }

  const sName = sessionsMap[activeSessionId]?.name || activeSessionId;
  const fileTitle = file.title || file.name;

  if (!confirm(`آیا از ارسال فایل «${fileTitle}» به جلسه «${sName}» اطمینان دارید؟`)) {
    return;
  }

  const feedback = document.getElementById('media-library-feedback');
  if (feedback) feedback.textContent = 'در حال ارسال فایل به جلسه…';

  try {
    const response = await fetch('/api/media-library/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ sessionId: activeSessionId, name: file.name, title: file.title || '' }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'ارسال انجام نشد.');
    if (feedback) feedback.textContent = '✅ فایل با موفقیت به جلسه ارسال شد.';
    if (result.data) renderAdminMessage(result.data);
    setTimeout(() => { if (feedback) feedback.textContent = ''; }, 3000);
  } catch (error) {
    if (feedback) feedback.textContent = error.message || 'خطا در ارسال فایل.';
  }
}

/* ==========================================================================
   مدیریت سناریوی ۵ هفته‌ای (هفته ۱ تا ۵) و قفل چت توسط پشتیبان
   ========================================================================== */

let currentSelectedWeek = 1;
let weeklyContentCache = {};

function selectWeek(week) {
  currentSelectedWeek = Number(week);
  document.querySelectorAll('.week-tab-btn').forEach(btn => {
    const isTarget = Number(btn.dataset.week) === currentSelectedWeek;
    btn.classList.toggle('active', isTarget);
    if (isTarget) {
      btn.style.background = 'var(--command-amber)';
      btn.style.color = '#0e1214';
      btn.style.fontWeight = 'bold';
    } else {
      btn.style.background = '#171c1f';
      btn.style.color = '#dbe1e2';
      btn.style.fontWeight = 'normal';
    }
  });
  loadWeeklyContent(currentSelectedWeek);
}

async function loadWeeklyContent(week = currentSelectedWeek) {
  const list = document.getElementById('weekly-content-list');
  const feedback = document.getElementById('weekly-content-feedback');
  if (!list) return;
  list.innerHTML = '';
  if (feedback) feedback.textContent = `در حال دریافت سناریوی هفته ${week}…`;

  try {
    const res = await fetch(`/api/weekly-content?week=${week}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.message || 'خطا در دریافت محتوا');

    weeklyContentCache[week] = result.data || [];
    if (feedback) {
      feedback.textContent = result.data.length
        ? `${result.data.length} مرحله برای هفته ${week} بارگذاری شد.`
        : `هیچ مرحله‌ای برای هفته ${week} ثبت نشده است.`;
    }

    result.data.forEach(item => {
      const card = document.createElement('div');
      card.className = 'weekly-step-card';
      card.style.cssText = 'background:#14191c;border:1px solid #343c3e;padding:10px;border-radius:4px;display:flex;flex-direction:column;gap:6px;transition:border-color 0.2s;';

      const stepOrder = item.order_num || item.step_order || 1;
      const stepWeek = item.week || item.week_number || week;
      const stepText = item.text_content || (item.content_type === 'text' ? item.payload : '');
      const stepFile = item.file_url || (item.content_type !== 'text' ? item.payload : '');

      let typeFa = 'متن';
      let typeColor = 'var(--command-amber)';
      let icon = '💬';

      if (item.content_type === 'image') { typeFa = 'عکس'; typeColor = '#38bdf8'; icon = '📷'; }
      else if (item.content_type === 'video') { typeFa = 'ویدیو'; typeColor = '#ec4899'; icon = '🎬'; }
      else if (item.content_type === 'voice') { typeFa = 'صوت پرونده'; typeColor = '#a855f7'; icon = '🎙️'; }
      else if (item.content_type === 'file') { typeFa = 'سند'; typeColor = '#10b981'; icon = '📁'; }

      const safeTitle = escapeHtml(item.title);
      const safeText = stepText ? escapeHtml(stepText) : '';
      const safeFile = stepFile ? escapeHtml(item.file_name || stepFile) : '';

      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:11px;font-weight:bold;color:${typeColor};">
            #${stepOrder} ${icon} ${typeFa}
          </span>
          <span style="font-size:10px;color:#8d9699;">هفته ${stepWeek}</span>
        </div>
        <strong style="font-size:13px;color:#f8fafc;">${safeTitle}</strong>
        ${safeText ? `<p style="font-size:11px;color:#94a3b8;line-height:1.6;margin:0;max-height:54px;overflow:hidden;text-overflow:ellipsis;">${safeText}</p>` : ''}
        ${safeFile ? `<small style="font-size:10px;color:#64748b;direction:ltr;text-align:right;">${safeFile}</small>` : ''}
        <div style="display:flex;gap:6px;margin-top:4px;">
          ${item.content_type === 'text'
            ? `<button type="button" class="command-button primary step-insert-btn" style="flex:1;padding:6px 8px;font-size:11px;">📝 درج در کادر چت</button>`
            : `<button type="button" class="command-button step-send-btn" style="flex:1;padding:6px 8px;font-size:11px;background:rgba(56,189,248,0.15);color:#38bdf8;border-color:#38bdf8;">📤 ارسال به جلسه</button>`
          }
          <button type="button" class="command-button danger step-del-btn" style="padding:4px 8px;font-size:10px;" title="حذف این مرحله">🗑️</button>
        </div>
      `;

      if (item.content_type === 'text') {
        card.querySelector('.step-insert-btn').onclick = () => insertTextToComposer(stepText);
      } else {
        card.querySelector('.step-send-btn').onclick = () => sendWeeklyMedia({ ...item, file_url: stepFile, payload: stepFile });
      }
      card.querySelector('.step-del-btn').onclick = () => deleteWeeklyStep(item.id, stepWeek);

      list.appendChild(card);
    });
  } catch (err) {
    console.error('Error loading weekly content:', err);
    if (feedback) feedback.textContent = 'خطا در بارگذاری سناریوی هفته ' + week;
  }
}

function insertTextToComposer(text) {
  const input = document.getElementById('admin-msg-input');
  if (input) {
    input.value = text;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 160) + 'px';
    input.focus();
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const feedback = document.getElementById('weekly-content-feedback');
    if (feedback) {
      feedback.textContent = '✅ متن در کادر چت قرار گرفت. برای ارسال کلید Enter را بزنید.';
      setTimeout(() => { if (feedback) feedback.textContent = ''; }, 3000);
    }
  }
}

async function sendWeeklyMedia(item) {
  if (!activeSessionId) {
    alert('لطفاً ابتدا یک جلسه را از لیست جلسه‌ها انتخاب کنید.');
    return;
  }

  const sName = sessionsMap[activeSessionId]?.name || activeSessionId;
  if (!confirm(`آیا از ارسال فایل «${item.title}» به جلسه «${sName}» اطمینان دارید؟`)) {
    return;
  }

  const feedback = document.getElementById('weekly-content-feedback');
  if (feedback) feedback.textContent = 'در حال ارسال فایل به جلسه…';

  try {
    let rawFile = item.file_url || item.payload || '';
    let resolvedUrl = safeFileUrl(rawFile);
    if (resolvedUrl === '#') {
      alert('آدرس فایل معتبر نیست.');
      if (feedback) feedback.textContent = 'خطا: آدرس فایل معتبر نیست.';
      return;
    }

    socket.emit('send_message', {
      sessionId: activeSessionId,
      content: item.title,
      senderType: 'admin',
      messageType: item.content_type,
      fileUrl: resolvedUrl,
      fileName: item.file_name || item.title,
    }, (res) => {
      if (res && !res.success) {
        alert(res.message || 'خطا در ارسال فایل');
        if (feedback) feedback.textContent = res.message || 'خطا در ارسال فایل';
      }
    });

    if (feedback) {
      feedback.textContent = `✅ فایل «${item.title}» با موفقیت به جلسه ارسال شد.`;
      setTimeout(() => { if (feedback) feedback.textContent = ''; }, 3500);
    }
  } catch (err) {
    console.error('Error sending weekly media:', err);
    if (feedback) feedback.textContent = 'خطا در ارسال فایل به جلسه.';
  }
}

async function deleteWeeklyStep(stepId, week) {
  if (!confirm('آیا از حذف این مرحله از سناریو اطمینان دارید؟')) return;
  try {
    const res = await fetch(`/api/weekly-content/${stepId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (data.success) {
      loadWeeklyContent(week);
    } else {
      alert(data.message || 'خطا در حذف مرحله');
    }
  } catch (err) {
    alert('خطا در ارتباط با سرور هنگام حذف');
  }
}

function openAddStepDialog() {
  const dialog = document.getElementById('add-step-dialog');
  if (dialog) {
    document.getElementById('step-week-select').value = currentSelectedWeek;
    document.getElementById('step-order-input').value = (weeklyContentCache[currentSelectedWeek]?.length || 0) + 1;
    dialog.showModal();
  }
}

function closeAddStepDialog() {
  const dialog = document.getElementById('add-step-dialog');
  if (dialog) dialog.close();
}

function handleStepTypeChange() {
  const type = document.getElementById('step-type-select').value;
  const textGroup = document.getElementById('step-text-group');
  const fileGroup = document.getElementById('step-file-group');

  if (type === 'text') {
    textGroup.style.display = 'block';
    fileGroup.style.display = 'none';
  } else {
    textGroup.style.display = 'none';
    fileGroup.style.display = 'block';
  }
}

async function handleAddStepSubmit(e) {
  e.preventDefault();
  const week = parseInt(document.getElementById('step-week-select').value, 10);
  const orderNum = parseInt(document.getElementById('step-order-input').value, 10);
  const contentType = document.getElementById('step-type-select').value;
  const title = document.getElementById('step-title-input').value.trim();
  const textContent = document.getElementById('step-text-input').value.trim();
  const fileUrl = document.getElementById('step-file-url-input').value.trim();

  const chosenPayload = contentType === 'text' ? textContent : fileUrl;
  if (!title) {
    alert('لطفاً عنوان مرحله را وارد فرمایید.');
    return;
  }
  if (!chosenPayload) {
    alert(contentType === 'text' ? 'لطفاً متن پیام را وارد فرمایید.' : 'لطفاً مسیر یا آدرس فایل را وارد فرمایید.');
    return;
  }

  const payload = {
    week,
    week_number: week,
    orderNum,
    step_order: orderNum,
    contentType,
    content_type: contentType,
    title,
    payload: chosenPayload,
    textContent: contentType === 'text' ? textContent : null,
    text_content: contentType === 'text' ? textContent : null,
    fileUrl: contentType !== 'text' ? fileUrl : null,
    file_url: contentType !== 'text' ? fileUrl : null,
    fileName: contentType !== 'text' ? (fileUrl ? fileUrl.split('/').pop() : title) : null,
  };

  try {
    const res = await fetch('/api/weekly-content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (res.ok && result.success) {
      closeAddStepDialog();
      selectWeek(week);
      document.getElementById('step-title-input').value = '';
      document.getElementById('step-text-input').value = '';
      document.getElementById('step-file-url-input').value = '';
    } else {
      alert(result.message || 'خطا در ثبت مرحله');
    }
  } catch (err) {
    console.error('Error adding weekly step:', err);
    alert('خطا در ارتباط با سرور هنگام ثبت مرحله جدید');
  }
}

async function toggleAdminChatLock() {
  if (!activeSessionId) {
    alert('لطفاً ابتدا یک جلسه را از سایدبار انتخاب کنید.');
    return;
  }
  const currentLocked = sessionsMap[activeSessionId]?.is_chat_locked ? 1 : 0;
  const nextLockState = currentLocked ? 0 : 1;

  // تغییر فوری ظاهر دکمه جهت بازخورد بصری سریع
  updateChatLockBtnUI(nextLockState);
  if (sessionsMap[activeSessionId]) sessionsMap[activeSessionId].is_chat_locked = nextLockState;

  // ارسال از طریق سوکت
  if (socket && socket.connected) {
    socket.emit('toggle_chat_lock', { sessionId: activeSessionId, isLocked: Boolean(nextLockState) }, (res) => {
      if (res && typeof res.isLocked !== 'undefined') {
        updateChatLockBtnUI(res.isLocked);
        if (sessionsMap[activeSessionId]) sessionsMap[activeSessionId].is_chat_locked = res.isLocked;
      }
    });
  }

  // درخواست HTTP پشتیبان برای تضمین ذخیره قطعی
  try {
    const res = await fetch(`/api/sessions/${activeSessionId}/lock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ isLocked: Boolean(nextLockState) })
    });
    const data = await res.json();
    if (data.success && typeof data.isLocked !== 'undefined') {
      updateChatLockBtnUI(data.isLocked);
      if (sessionsMap[activeSessionId]) sessionsMap[activeSessionId].is_chat_locked = data.isLocked;
    }
  } catch (err) {
    console.warn('HTTP lock toggle fallback notice:', err);
  }
}

function updateChatLockBtnUI(isLocked) {
  const btn = document.getElementById('admin-chat-lock-btn');
  const mobileBtn = document.getElementById('mobile-admin-chat-lock-btn');
  const btns = [btn, mobileBtn].filter(Boolean);

  btns.forEach(b => {
    if (isLocked) {
      b.innerHTML = '🔓 باز کردن قفل چت';
      b.className = 'command-button danger';
      b.title = 'چت این جلسه هم‌اکنون قفل است؛ دانش‌آموزان امکان ارسال پیام ندارند.';
    } else {
      b.innerHTML = '🔒 قفل چت جلسه';
      b.className = 'command-button';
      b.title = 'چت این جلسه باز است؛ برای بستن امکان ارسال پیام کلیک کنید.';
    }
  });
}

