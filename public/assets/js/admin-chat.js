/**
 * public/assets/js/admin-chat.js
 * منطق چت ادمین با قابلیت سوئیچ بین چند جلسه و پیام‌های آماده
 */

let socket = null;
const adminToken = localStorage.getItem('adminToken');
const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
let activeSessionId = parseInt(sessionStorage.getItem('activeAdminSessionId'), 10) || null;
let sessionsMap = {};

let adminPeerConnection = null;
let isAudioListening = false;
const rtcConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

if (!adminToken) {
  window.location.href = '/admin/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  loadAdminSessions();
  loadCannedResponses();
  initAdminSocket();
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
    }
  });

  socket.on('disconnect', () => {
    statusEl.className = 'status-indicator offline';
    statusEl.innerHTML = '<span class="status-dot"></span> قطع اتصال';
  });

  socket.on('new_message', (msg) => {
    if (msg.session_id === activeSessionId) {
      renderAdminMessage(msg);
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

  socket.on('audio_stream_stopped', (data) => {
    if (data.sessionId === activeSessionId) {
      stopAdminAudioListening();
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
      }
    }
  } catch (err) {
    console.error('Error fetching admin sessions:', err);
  }
}

function renderSessionsSidebar(sessions) {
  const container = document.getElementById('admin-sessions-list');
  container.innerHTML = '';

  sessions.forEach(s => {
    sessionsMap[s.id] = s;
    const item = document.createElement('div');
    item.className = `session-card ${s.id === activeSessionId ? 'active' : ''}`;
    item.onclick = () => switchSession(s.id);

    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:13px; font-weight:bold;">${s.name}</span>
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
  activeSessionId = nextSessionId;
  sessionStorage.setItem('activeAdminSessionId', nextSessionId);

  // هنگام سوئیچ ادمین بین جلسات، استریم صدای جلسه قبلی حتماً قطع می‌شود
  stopAdminAudioListening();

  updateActiveHeader();
  renderSessionsSidebar(Object.values(sessionsMap));

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
    const data = await res.json();
    if (data.success) {
      const box = document.getElementById('admin-messages-box');
      box.innerHTML = '';
      data.data.forEach(renderAdminMessage);
    }
  } catch (err) {
    console.error('Error loading session messages:', err);
  }
}

function updateActiveHeader() {
  const s = sessionsMap[activeSessionId];
  if (s) {
    document.getElementById('active-session-title').innerText = `${s.name} (کد: ${s.code})`;
  }
}

function renderAdminMessage(msg) {
  const box = document.getElementById('admin-messages-box');
  const div = document.createElement('div');
  div.className = `message-bubble ${msg.sender_type}`;

  let senderTitle = msg.admin_sender_name || 'ادمین';
  if (msg.sender_type === 'user') senderTitle = 'دستیاران کارآگاه';
  if (msg.sender_type === 'system') senderTitle = 'سیستم';
  if (msg.sender_type === 'hacker') senderTitle = '☠️ شبکه هکر';

  let bodyContent = msg.content;
  if (msg.message_type === 'image') {
    const imageUrl = msg.file_url || msg.content;
    bodyContent = `${msg.content && msg.content !== imageUrl ? `<div>${msg.content}</div>` : ''}<a href="${imageUrl}" target="_blank"><img src="${imageUrl}" style="max-width:100%; max-height:250px; border-radius:6px; margin-top:8px; border:1px solid var(--neon-magenta); object-fit:cover;"></a>`;
  } else if (msg.message_type === 'voice') {
    const voiceUrl = msg.file_url || msg.content;
    bodyContent = `${msg.content && msg.content !== voiceUrl ? `<div>${msg.content}</div>` : ''}<audio controls src="${voiceUrl}" style="width:100%; margin-top:8px;"></audio>`;
  } else if (msg.message_type === 'file') {
    const fileUrl = msg.file_url || '#';
    bodyContent = `<div>📁 فایل پیوست: <a href="${fileUrl}" download target="_blank" style="color:var(--neon-magenta); font-weight:bold; text-decoration:underline;">${msg.file_name || 'دانلود فایل'}</a></div>${msg.content && msg.content !== fileUrl ? `<div style="margin-top:4px;">${msg.content}</div>` : ''}`;
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

function sendAdminMessage() {
  if (!activeSessionId) return;

  const input = document.getElementById('admin-msg-input');
  const senderTypeSelect = document.getElementById('admin-sender-type');
  const content = input.value.trim();

  if (!content) return;

  socket.emit('send_message', {
    sessionId: activeSessionId,
    content: content,
    senderType: senderTypeSelect.value,
    messageType: 'text',
  });

  input.value = '';
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

async function loadCannedResponses() {
  try {
    const res = await fetch('/api/canned-responses', {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (data.success) {
      const container = document.getElementById('canned-responses-container');
      container.innerHTML = '';
      data.data.forEach(item => {
        const chip = document.createElement('div');
        chip.className = 'canned-chip';
        chip.innerText = `📌 ${item.title}`;
        chip.onclick = () => {
          document.getElementById('admin-msg-input').value = item.content;
        };
        container.appendChild(chip);
      });
    }
  } catch (err) {
    console.error('Error fetching canned responses:', err);
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
      loadCannedResponses();
    }
  } catch (err) {
    console.error('Error creating canned response:', err);
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
  const btn = document.getElementById('admin-audio-toggle-btn');
  if (btn) {
    btn.innerText = '🛑 قطع شنود صدا';
    btn.className = 'cyber-btn cyber-btn-magenta';
  }

  if (socket && activeSessionId) {
    socket.emit('start_audio_stream', { sessionId: activeSessionId });
  }
}

function stopAdminAudioListening() {
  if (isAudioListening && socket && activeSessionId) {
    socket.emit('stop_audio_stream', { sessionId: activeSessionId });
  }

  isAudioListening = false;
  const btn = document.getElementById('admin-audio-toggle-btn');
  if (btn) {
    btn.innerText = '🎙️ شروع شنود صدا';
    btn.className = 'cyber-btn cyber-btn-cyan';
  }

  if (adminPeerConnection) {
    adminPeerConnection.close();
    adminPeerConnection = null;
  }

  const audioPlayer = document.getElementById('remote-audio-player');
  if (audioPlayer) {
    audioPlayer.srcObject = null;
  }
}

async function handleUserOffer(offer, userSocketId) {
  if (adminPeerConnection) {
    adminPeerConnection.close();
  }

  adminPeerConnection = new RTCPeerConnection(rtcConfig);

  // دریافت track صدای کاربر
  adminPeerConnection.ontrack = (event) => {
    const audioPlayer = document.getElementById('remote-audio-player');
    if (audioPlayer && event.streams && event.streams[0]) {
      audioPlayer.srcObject = event.streams[0];
      audioPlayer.play().catch(e => console.log('Audio autoplay prevented:', e));
    }
  };

  adminPeerConnection.onicecandidate = (event) => {
    if (event.candidate) {
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

    socket.emit('webrtc_answer', {
      sessionId: activeSessionId,
      answer: answer,
      targetSocketId: userSocketId,
    });
  } catch (err) {
    console.error('Error handling WebRTC offer on admin:', err);
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
        sessionId: activeSessionId,
        content: fileName,
        senderType: senderTypeSelect ? senderTypeSelect.value : 'admin',
        messageType: messageType,
        fileUrl: fileUrl,
        fileName: fileName,
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
  if (!activeSessionId) {
    alert('لطفاً ابتدا یک جلسه را انتخاب کنید.');
    return;
  }

  const confirmHack = confirm(`آیا مطمئن هستید که می‌خواهید سکانس هک سنگین مزداک را برای جلسه ${activeSessionId} تریگر کنید؟`);
  if (!confirmHack) return;

  if (socket) {
    socket.emit('trigger_hack_sequence', {
      sessionId: activeSessionId,
      hackerName: 'مزداک',
    });
    alert(`⚡ سکانس هک مزداک برای جلسه ${activeSessionId} با موفقیت ارسال گردید.`);
  }
}
