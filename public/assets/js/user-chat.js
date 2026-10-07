/**
 * public/assets/js/user-chat.js
 * منطق صفحه چت کاربر (دستیاران کارآگاه)
 */

let socket = null;
let userToken = sessionStorage.getItem('userToken');
let sessionData = JSON.parse(sessionStorage.getItem('userSession') || '{}');
let localStream = null;
let peerConnection = null;

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

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

// اگر توکن یا اطلاعات جلسه وجود نداشت، هدایت به لندینگ
if (!userToken || !sessionData.id) {
  window.location.href = '/enter-code.html';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('session-title').innerText = sessionData.name || 'دستیاران کارآگاه';
  document.getElementById('session-code-display').innerText = sessionData.code;

  // درخواست یک‌باره دسترسی میکروفون قبل از شروع جلسه جهت جلوگیری از نمایش مجدد پرمپت در طول بازی
  initUserMicrophone();
  initSocket();

  // راه‌اندازی ضبط ویس صوتی دانش‌آموزان
  if (typeof VoiceRecorder !== 'undefined') {
    window.voiceRecorder = new VoiceRecorder();
  }

  // مدیریت فرم ارسال پیام و کلید Enter و Shift+Enter
  const msgForm = document.getElementById('message-form');
  const msgInput = document.getElementById('msg-input');

  if (msgForm) {
    msgForm.addEventListener('submit', (e) => {
      e.preventDefault();
      sendMessage();
    });
  }

  if (msgInput) {
    msgInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (!e.shiftKey) {
          e.preventDefault();
          if (e.isComposing || e.keyCode === 229) {
            return;
          }
          sendMessage();
        }
        // اگر Shift فشرده باشد، خط جدید به صورت خودکار درج می‌شود
      }
    });

    msgInput.addEventListener('input', () => {
      handleTyping();
      msgInput.style.height = 'auto';
      msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + 'px';
    });
  }
});

async function initUserMicrophone() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    console.log('🎙️ دسترسی میکروفون لپ‌تاپ کاربر با موفقیت تایید شد.');
  } catch (err) {
    console.warn('⚠️ عدم دسترسی به میکروفون یا رد شدن پرمیشن:', err);
  }
}

// تغییر وضعیت رابط کاربری هنگام قفل یا باز شدن چت
function applyChatLock(isLocked) {
  sessionData.is_chat_locked = isLocked ? 1 : 0;
  sessionStorage.setItem('userSession', JSON.stringify(sessionData));

  const msgInput = document.getElementById('msg-input');
  const sendBtn = document.querySelector('.send-button');
  const attachBtn = document.querySelector('.attach-button');
  const micBtn = document.getElementById('voice-record-btn');
  let lockBanner = document.getElementById('chat-lock-banner');

  if (isLocked) {
    if (msgInput) {
      msgInput.disabled = true;
      msgInput.placeholder = '🔒 خط ارتباطی با مرکز فرماندهی موقتاً مسدود شده است.';
    }
    if (sendBtn) sendBtn.disabled = true;
    if (attachBtn) attachBtn.disabled = true;
    if (micBtn) micBtn.disabled = true;

    if (!lockBanner) {
      lockBanner = document.createElement('div');
      lockBanner.id = 'chat-lock-banner';
      lockBanner.className = 'chat-lock-banner';
      lockBanner.innerHTML = '<span>🔒 خط ارتباطی با مرکز فرماندهی موقتاً مسدود شده است. تا آغاز ماموریت جدید همراه ما باشید.</span>';
      const composer = document.getElementById('message-form');
      if (composer && composer.parentElement) {
        composer.parentElement.insertBefore(lockBanner, composer);
      }
    }
    lockBanner.style.display = 'flex';
  } else {
    if (msgInput) {
      msgInput.disabled = false;
      msgInput.placeholder = 'گزارش یا سرنخ خود را به مرکز فرماندهی مخابره کنید…';
    }
    if (sendBtn) sendBtn.disabled = false;
    if (attachBtn) attachBtn.disabled = false;
    if (micBtn) micBtn.disabled = false;
    if (lockBanner) lockBanner.style.display = 'none';
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
    if (res.status === 401 || res.status === 403) {
      alert('اعتبار ورود شما به پایان رسیده است. لطفا مجدداً کد روی بسته را وارد کنید.');
      logoutUser();
      return;
    }
    const data = await res.json();
    if (data.success) {
      const box = document.getElementById('messages-box');
      data.data.forEach(renderMessage);
      if (data.session && typeof data.session.is_chat_locked !== 'undefined') {
        applyChatLock(Boolean(data.session.is_chat_locked));
      }
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
  window.socket = socket;

  window.sendUserVoiceMessage = function(fileUrl, fileName) {
    if (!socket || !socket.connected) {
      alert('اتصال به سرور چت برقرار نیست. لطفاً چند لحظه دیگر امتحان کنید.');
      return;
    }
    socket.emit('send_message', {
      sessionId: sessionData.id,
      content: 'پیام صوتی',
      messageType: 'user_voice',
      fileUrl: fileUrl,
      fileName: fileName || 'voice.webm',
    });
  };

  const statusEl = document.getElementById('socket-status');

  socket.on('connect', () => {
    statusEl.className = 'status-indicator online';
    statusEl.innerHTML = '<span class="status-dot"></span> متصل';
    socket.emit('join_session', { sessionId: sessionData.id });
    loadHistory();
  });

  socket.io.on('reconnect', () => {
    statusEl.className = 'status-indicator online';
    statusEl.innerHTML = '<span class="status-dot"></span> اتصال مجدد برقرار شد';
    socket.emit('join_session', { sessionId: sessionData.id });
  });

  socket.on('disconnect', () => {
    statusEl.className = 'status-indicator offline';
    statusEl.innerHTML = '<span class="status-dot"></span> در حال وصل شدن مجدد...';
  });

  socket.on('new_message', (msg) => {
    renderMessage(msg);
  });

  socket.on('chat_lock_updated', (data) => {
    if (data && Number(data.sessionId) === Number(sessionData.id)) {
      applyChatLock(Boolean(data.isLocked));
    }
  });

  socket.on('message_edited', (data) => {
    if (Number(data.sessionId) === Number(sessionData.id)) {
      const contentEl = document.getElementById(`user-msg-content-${data.messageId}`);
      if (contentEl) contentEl.textContent = data.content;
    }
  });

  socket.on('message_deleted', (data) => {
    if (Number(data.sessionId) === Number(sessionData.id)) {
      const msgEl = document.querySelector(`[data-message-id="${data.messageId}"]`);
      if (msgEl) msgEl.remove();
    }
  });

  socket.on('user_typing', (data) => {
    const typingEl = document.getElementById('typing-indicator');
    if (data.senderType === 'admin') {
      typingEl.innerText = data.isTyping ? 'مرکز در حال نوشتن است…' : '';
    }
  });

  socket.on('error_message', (data) => {
    alert(data.message);
  });

  socket.on('hack_sequence_triggered', (data) => {
    if (!data || Number(data.sessionId) !== Number(sessionData.id)) return;
    console.log('🚨 رویداد سکانس هک مزداک دریافت شد:', data);
    if (typeof hackEngine !== 'undefined') {
      hackEngine.start();
    }
  });

  // دریافت درخواست شروع استریم صدای میکروفون توسط ادمین
  socket.on('audio_stream_started', async (data) => {
    if (!data || Number(data.sessionId) !== Number(sessionData.id)) return;
    console.log('🎙️ ادمین درخواست شنود صدای میکروفون را ارسال کرد:', data);
    await startPeerConnection(data.adminSocketId);
  });

  socket.on('audio_stream_stopped', (data) => {
    if (data && Number(data.sessionId) !== Number(sessionData.id)) return;
    console.log('🛑 استریم صدای میکروفون توسط ادمین قطع گردید.');
    stopPeerConnection();
  });

  socket.on('webrtc_answer', async (data) => {
    if (data && Number(data.sessionId) !== Number(sessionData.id)) return;
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
  if (Number(msg.session_id) !== Number(sessionData.id)) return;
  if (box.querySelector(`[data-message-id="${Number(msg.id)}"]`)) return;
  const div = document.createElement('div');
  div.dataset.messageId = Number(msg.id);
  div.className = `message-bubble ${msg.sender_type}`;

  let senderTitle = 'دستیاران کارآگاه';
  if (msg.sender_type === 'admin') senderTitle = 'مرکز فرماندهی';
  if (msg.sender_type === 'system') senderTitle = 'پیام سیستم';
  if (msg.sender_type === 'hacker') senderTitle = 'مزداک';

  const isUserVoice = msg.message_type === 'user_voice';
  const fileUrl = safeFileUrl(msg.file_url);
  const isEvidence = !isUserVoice && ['image', 'voice', 'video', 'file'].includes(msg.message_type) && fileUrl !== '#';

  if (isEvidence) {
    div.classList.add('evidence-receipt');
    renderEvidence(msg);
  }

  const timeFormatted = new Date(msg.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  let bodyContent = '';
  if (isUserVoice) {
    div.classList.add('has-user-voice');
    div.classList.add('has-voice-message');
    bodyContent = window.createTelegramVoiceMarkup ? window.createTelegramVoiceMarkup(msg, timeFormatted) : `<audio controls src="${fileUrl}"></audio>`;
  } else if (isEvidence) {
    const caption = msg.content && msg.content !== msg.file_name ? `<p class="message-caption">${escapeHtml(msg.content)}</p>` : '';
    if (msg.message_type === 'image') {
      bodyContent = `
        ${caption}
        <div class="chat-media-attachment chat-image-attachment">
          <a href="${fileUrl}" target="_blank" rel="noopener" class="chat-media-link" title="مشاهده اندازه کامل">
            <img src="${fileUrl}" alt="${escapeHtml(msg.content || msg.file_name || 'تصویر ارسالی')}" loading="lazy" class="chat-media-preview-img">
          </a>
          <div class="message-evidence-note">📌 این تصویر روی برد سرنخ‌ها سنجاق شد.</div>
        </div>
      `;
    } else if (msg.message_type === 'video') {
      bodyContent = `
        ${caption}
        <div class="chat-media-attachment chat-video-attachment">
          <video controls playsinline preload="metadata" src="${fileUrl}" class="chat-media-preview-video"></video>
          <div class="message-evidence-note">📌 این ویدیو روی برد سرنخ‌ها سنجاق شد.</div>
        </div>
      `;
    } else if (msg.message_type === 'voice') {
      div.classList.add('has-voice-message');
      const voiceMarkup = window.createTelegramVoiceMarkup 
        ? window.createTelegramVoiceMarkup(msg, timeFormatted) 
        : `<audio controls preload="metadata" src="${fileUrl}" class="chat-media-preview-audio"></audio>`;
      bodyContent = `
        ${caption}
        <div class="chat-media-attachment chat-voice-attachment">
          ${voiceMarkup}
          <div class="message-evidence-note">📌 این صوت روی برد سرنخ‌ها سنجاق شد.</div>
        </div>
      `;
    } else {
      bodyContent = `
        ${caption}
        <div class="chat-media-attachment chat-file-attachment">
          <a href="${fileUrl}" download target="_blank" rel="noopener" class="chat-download-btn">
            <span class="file-icon">📁</span>
            <span class="file-name">${escapeHtml(msg.file_name || msg.content || 'دریافت سند')}</span>
          </a>
          <div class="message-evidence-note">📌 این سند روی برد سرنخ‌ها سنجاق شد.</div>
        </div>
      `;
    }
  } else {
    bodyContent = escapeHtml(msg.content);
  }

  const isUser = msg.sender_type === 'user';
  const senderMarkup = !isUser && msg.sender_type !== 'system'
    ? `<div class="message-sender"><span>${escapeHtml(senderTitle)}</span></div>`
    : '';

  div.innerHTML = `${senderMarkup}<div id="user-msg-content-${msg.id}" class="message-content">${bodyContent}</div><span class="message-time">${timeFormatted}</span>`;

  const laterMessage = [...box.children].find(child => Number(child.dataset.messageId) > Number(msg.id));
  box.insertBefore(div, laterMessage || null);
  box.scrollTop = box.scrollHeight;
}

function evidenceFileIcon(type, label) {
  const paths = {
    video: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3Z"/>',
    voice: '<path d="M3 10v4m4-7v10m5-14v18m5-14v10m4-7v4"/>',
    file: '<path d="M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 12h8m-8 4h6"/>'
  };
  return `<div class="evidence-file-icon"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[type]}</svg><span>${label}</span></div>`;
}

function evidenceMediaMarkup(msg, expanded = false) {
  const url = safeFileUrl(msg.file_url);
  if (msg.message_type === 'image') return `<img src="${url}" alt="${expanded ? escapeHtml(msg.content || 'تصویر مدرک') : ''}" loading="lazy">`;
  if (msg.message_type === 'video') return expanded ? `<div class="media-loading">در حال بارگذاری اطلاعات فیلم…</div><video controls playsinline webkit-playsinline preload="metadata" src="${url}"></video>` : evidenceFileIcon('video', 'فیلم ضبط‌شده');
  if (msg.message_type === 'voice') return expanded ? `<div class="media-loading">در حال بارگذاری اطلاعات صدا…</div><audio controls playsinline webkit-playsinline preload="metadata" src="${url}"></audio>` : evidenceFileIcon('voice', 'صدای ضبط‌شده');
  return expanded ? `<div class="evidence-file-icon">سند</div><a class="download-evidence" href="${url}" download>دریافت ${escapeHtml(msg.file_name || 'فایل')}</a>` : evidenceFileIcon('file', 'سند پرونده');
}

function renderEvidence(msg) {
  const grid = document.getElementById('evidence-grid');
  if (!grid || grid.querySelector(`[data-evidence-id="${Number(msg.id)}"]`)) return;
  grid.querySelector('.empty-evidence')?.remove();
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'evidence-card';
  card.dataset.evidenceId = Number(msg.id);
  card.dataset.kind = msg.message_type;
  card.innerHTML = `${evidenceMediaMarkup(msg)}<h3>${escapeHtml(msg.content || msg.file_name || 'مدرک بدون عنوان')}</h3><small><span>مدرک ${Number(msg.id).toLocaleString('fa-IR')}</span><span>${new Date(msg.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span></small>`;
  card.addEventListener('click', () => openEvidence(msg));
  const later = [...grid.children].find(child => Number(child.dataset.evidenceId) > Number(msg.id));
  grid.insertBefore(card, later || null);
  document.getElementById('evidence-count').textContent = `${grid.querySelectorAll('.evidence-card').length.toLocaleString('fa-IR')} مدرک`;
  if (typeof applyEvidenceFilter === 'function') applyEvidenceFilter();
  requestAnimationFrame(updateEvidenceThreads);
}

function updateEvidenceThreads() {
  const grid = document.getElementById('evidence-grid');
  const svg = document.getElementById('evidence-threads');
  if (!grid || !svg || !grid.clientWidth) return;
  const bounds = grid.getBoundingClientRect();
  const cards = [...grid.querySelectorAll('.evidence-card:not([hidden])')];
  const points = cards.map(card => {
    const box = card.getBoundingClientRect();
    return { x: box.left - bounds.left + grid.scrollLeft + box.width / 2, y: box.top - bounds.top + grid.scrollTop + 3 };
  });
  const width = grid.clientWidth;
  const height = Math.max(grid.clientHeight, ...cards.map(card => card.getBoundingClientRect().bottom - bounds.top + grid.scrollTop + 55));
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.innerHTML = points.slice(1).map((point, i) => {
    const previous = points[i];
    return `<path d="M ${previous.x} ${previous.y} Q ${(previous.x + point.x) / 2} ${Math.max(previous.y, point.y) + 45} ${point.x} ${point.y}"/>`;
  }).join('');
}

window.addEventListener('resize', () => requestAnimationFrame(updateEvidenceThreads));

function openEvidence(msg) {
  const dialog = document.getElementById('evidence-dialog');
  document.getElementById('evidence-dialog-content').innerHTML = `${evidenceMediaMarkup(msg, true)}<h2>${escapeHtml(msg.content || msg.file_name || 'مدرک پرونده')}</h2><p>ارسال‌شده از مرکز فرماندهی برای بررسی گروه.</p>`;
  dialog.showModal();
}

function closeEvidence() {
  document.getElementById('evidence-dialog')?.close();
}

// ارسال پیام جدید
function sendMessage() {
  const input = document.getElementById('msg-input');
  const rawContent = input.value.trim();
  const content = rawContent.replace(/\n{3,}/g, '\n\n');

  if (!content) return;
  if (!socket?.connected) {
    document.getElementById('chat-feedback').textContent = 'ارتباط قطع است؛ بعد از اتصال دوباره ارسال کنید.';
    return;
  }
  document.getElementById('chat-feedback').textContent = '';

  const submit = document.querySelector('.send-button');
  submit.disabled = true;
  socket.timeout(5000).emit('send_message', {
    sessionId: sessionData.id,
    content: content,
    messageType: 'text',
  }, (error, result) => {
    submit.disabled = false;
    if (error || !result?.success) {
      document.getElementById('chat-feedback').textContent = 'ارسال تأیید نشد؛ اتصال را بررسی کنید.';
      return;
    }
    input.value = '';
    input.style.height = 'auto';
    renderMessage(result.message);
  });
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

let lastAdminSocketId = null;

// ایجاد اتصال WebRTC و ارسال استریم صدا بدون هیچ نشانگر یا تغییر در UI کاربر
async function startPeerConnection(adminSocketId) {
  if (adminSocketId) lastAdminSocketId = adminSocketId;
  const targetId = adminSocketId || lastAdminSocketId;

  if (peerConnection) {
    try { peerConnection.close(); } catch (_) {}
    peerConnection = null;
  }

  // بررسی زنده بودن ترک‌های میکروفون و دریافت مجدد در صورت نیاز
  const isStreamActive = localStream && localStream.getAudioTracks().some(t => t.readyState === 'live');
  if (!isStreamActive) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
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

  // پایش پایداری اتصال و بازسازی در صورت قطعی
  peerConnection.onconnectionstatechange = () => {
    if (!peerConnection) return;
    const state = peerConnection.connectionState;
    console.log('User WebRTC state:', state);
    if (state === 'failed' || state === 'disconnected') {
      setTimeout(() => {
        if (targetId) startPeerConnection(targetId);
      }, 2000);
    }
  };

  // ارسال ICE Candidates به ادمین
  peerConnection.onicecandidate = (event) => {
    if (event.candidate && socket && targetId) {
      socket.emit('webrtc_ice_candidate', {
        sessionId: sessionData.id,
        candidate: event.candidate,
        targetSocketId: targetId,
      });
    }
  };

  // ساخت Offer و ارسال به ادمین
  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    if (socket && targetId) {
      socket.emit('webrtc_offer', {
        sessionId: sessionData.id,
        offer: offer,
        targetSocketId: targetId,
      });
    }
  } catch (err) {
    console.error('خطا در ساخت WebRTC offer:', err);
  }
}

function stopPeerConnection() {
  if (peerConnection) {
    try { peerConnection.close(); } catch (_) {}
    peerConnection = null;
  }
  if (localStream) {
    try {
      localStream.getTracks().forEach(track => track.stop());
    } catch (_) {}
    localStream = null;
  }
  lastAdminSocketId = null;
}

function triggerFileInput(acceptType) {
  const fileInput = document.getElementById('user-file-input');
  if (fileInput) {
    fileInput.accept = acceptType || '*';
    fileInput.click();
  }
}

async function handleUserFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (data.success) {
      const { fileUrl, fileName, messageType } = data.data;

      // ارسال مستقیم پیام دارای مدیا از طریق سوکت
      socket.emit('send_message', {
        sessionId: sessionData.id,
        content: fileName,
        messageType: messageType,
        fileUrl: fileUrl,
        fileName: fileName,
      });

      // ریسِت ورودی فایل
      event.target.value = '';
    } else {
      alert('خطا در آپلود فایل: ' + data.message);
    }
  } catch (err) {
    console.error('Error uploading file:', err);
    alert('خطا در برقراری ارتباط با سرور هنگام آپلود.');
  }
}

function logoutUser() {
  sessionStorage.removeItem('userToken');
  sessionStorage.removeItem('userSession');
  window.location.href = '/enter-code.html';
}
