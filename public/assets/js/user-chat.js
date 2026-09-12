/**
 * public/assets/js/user-chat.js
 * منطق صفحه چت کاربر (دستیاران کارآگاه)
 */

let socket = null;
let userToken = sessionStorage.getItem('userToken');
let sessionData = JSON.parse(sessionStorage.getItem('userSession') || '{}');
let isAudioStreaming = false;

// اگر توکن یا اطلاعات جلسه وجود نداشت، هدایت به لندینگ
if (!userToken || !sessionData.id) {
  window.location.href = '/index.html';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('session-title').innerText = sessionData.name || 'دستیاران کارآگاه';
  document.getElementById('session-code-display').innerText = `> CODE: ${sessionData.code}`;

  loadHistory();
  initSocket();
});

// بارگذاری تاریخچه پیام‌های قبلی
async function loadHistory() {
  try {
    const res = await fetch(`/api/sessions/${sessionData.id}/messages`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
      },
    });
    const data = await res.json();
    if (data.success) {
      const box = document.getElementById('messages-box');
      box.innerHTML = '';
      data.data.forEach(renderMessage);
    }
  } catch (err) {
    console.error('Error loading history:', err);
  }
}

// مقداردهی اولیه سوکت
function initSocket() {
  socket = io({
    auth: { token: userToken },
  });

  const statusEl = document.getElementById('socket-status');

  socket.on('connect', () => {
    statusEl.className = 'status-indicator online';
    statusEl.innerHTML = '<span class="status-dot"></span> متصل به روم عملیاتی';
    socket.emit('join_session', { sessionId: sessionData.id });
  });

  socket.on('disconnect', () => {
    statusEl.className = 'status-indicator offline';
    statusEl.innerHTML = '<span class="status-dot"></span> قطع اتصال';
  });

  socket.on('new_message', (msg) => {
    renderMessage(msg);
  });

  socket.on('user_typing', (data) => {
    const typingEl = document.getElementById('typing-indicator');
    if (data.senderType === 'admin') {
      typingEl.innerText = data.isTyping ? 'ادمین مرکز در حال تایپ است...' : '';
    }
  });

  socket.on('error_message', (data) => {
    alert(data.message);
  });

  socket.on('hack_sequence_triggered', (data) => {
    console.log('🚨 رویداد سکانس هک مزداک دریافت شد:', data);
    if (typeof hackEngine !== 'undefined') {
      hackEngine.start();
    }
  });
}

// نمایش پیام در چت‌باکس
function renderMessage(msg) {
  const box = document.getElementById('messages-box');
  const div = document.createElement('div');
  div.className = `message-bubble ${msg.sender_type}`;

  let senderTitle = 'دستیاران کارآگاه';
  if (msg.sender_type === 'admin') senderTitle = msg.admin_sender_name || 'مرکز ادمین';
  if (msg.sender_type === 'system') senderTitle = 'پیام سیستم';
  if (msg.sender_type === 'hacker') senderTitle = '☠️ شبکه هکر';

  let bodyContent = msg.content;
  if (msg.message_type === 'image') {
    bodyContent = `<div>${msg.content}</div><img src="${msg.file_url || msg.content}" style="max-width:100%; border-radius:6px; margin-top:8px; border:1px solid var(--neon-cyan);">`;
  } else if (msg.message_type === 'voice') {
    bodyContent = `<div>🔊 فایل صوتی: ${msg.content}</div><audio controls src="${msg.file_url || msg.content}" style="width:100%; margin-top:8px;"></audio>`;
  } else if (msg.message_type === 'file') {
    bodyContent = `<div>📁 فایل پیوست: <a href="${msg.file_url || '#'}" target="_blank" style="color:var(--neon-cyan); font-weight:bold;">${msg.file_name || 'دانلود فایل'}</a></div><div>${msg.content}</div>`;
  }

  div.innerHTML = `
    <div class="message-sender">
      <span>${senderTitle}</span>
      <span>${new Date(msg.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
    <div>${bodyContent}</div>
  `;

  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

// ارسال پیام جدید
function sendMessage() {
  const input = document.getElementById('msg-input');
  const typeSelect = document.getElementById('msg-type-select');
  const content = input.value.trim();

  if (!content) return;

  socket.emit('send_message', {
    sessionId: sessionData.id,
    content: content,
    messageType: typeSelect.value,
    fileUrl: typeSelect.value !== 'text' ? content : null,
  });

  input.value = '';
  sendTypingStatus(false);
}

// مدیریت وضعیت تایپینگ
let typingTimeout = null;
function handleTyping() {
  sendTypingStatus(true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    sendTypingStatus(false);
  }, 2500);
}

function sendTypingStatus(isTyping) {
  if (socket) {
    socket.emit('typing', { sessionId: sessionData.id, isTyping });
  }
}

// اسکلت استریم صدای میکروفون
function toggleAudioStream() {
  const btn = document.getElementById('audio-btn');
  if (!isAudioStreaming) {
    isAudioStreaming = true;
    btn.innerText = '🔴 توقف استریم ویس';
    btn.className = 'cyber-btn cyber-btn-magenta';
    socket.emit('start_audio_stream', { sessionId: sessionData.id });
  } else {
    isAudioStreaming = false;
    btn.innerText = '🎙️ ویس لایو';
    btn.className = 'cyber-btn cyber-btn-green';
    socket.emit('stop_audio_stream', { sessionId: sessionData.id });
  }
}

function logoutUser() {
  sessionStorage.removeItem('userToken');
  sessionStorage.removeItem('userSession');
  window.location.href = '/index.html';
}
