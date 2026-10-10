/**
 * public/assets/js/user-chat.js
 * منطق صفحه چت کاربر (دستیاران کارآگاه)
 */

let socket = null;
let userToken = sessionStorage.getItem('userToken');
let sessionData = JSON.parse(sessionStorage.getItem('userSession') || '{}');
let localStream = null;
let peerConnection = null;

function fixMojibakeText(value) {
  const str = String(value ?? '');
  if (!str) return '';
  if (/[\u0080-\u00ff]/.test(str) && !/[^\u0000-\u00ff]/.test(str)) {
    try {
      const bytes = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        bytes[i] = str.charCodeAt(i) & 0xff;
      }
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (decoded) return decoded;
    } catch (_) {}
  }
  return str;
}

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

const userMessagesMap = new Map();
let activeEditMessageId = null;
let activeDeleteMessageId = null;

function syncSessionCache() {
  try {
    const list = Array.from(userMessagesMap.values()).sort((a, b) => Number(a.id) - Number(b.id));
    sessionStorage.setItem(`cached_msgs_${sessionData.id}`, JSON.stringify(list));
  } catch (_) {}
}

document.addEventListener('DOMContentLoaded', () => {
  const sessionTitleEl = document.getElementById('session-title');
  if (sessionTitleEl) sessionTitleEl.innerText = sessionData.name || 'دستیاران کارآگاه';
  const sessionCodeEl = document.getElementById('session-code-display');
  if (sessionCodeEl) sessionCodeEl.innerText = sessionData.code;

  // راه‌اندازی ساعت دیجیتالی نئونی دقیق در هدر چت
  initNeonDigitalClock();

  // بارگذاری فوری از کش مرورگر برای نمایش آنی و بدون تاخیر پیام‌ها
  try {
    const cached = sessionStorage.getItem(`cached_msgs_${sessionData.id}`);
    if (cached) {
      const cachedList = JSON.parse(cached);
      if (Array.isArray(cachedList) && cachedList.length) {
        cachedList.forEach(m => renderMessage(m, { skipScroll: true, skipThreads: true, isHistory: true }));
        const box = document.getElementById('messages-box');
        if (box) box.scrollTop = box.scrollHeight;
        requestAnimationFrame(updateEvidenceThreads);
      }
    }
  } catch (_) {}

  // دریافت سریع پیام‌ها از سرور به صورت موازی (بدون انتظار برای اتصال سوکت)
  loadHistory();

  // درخواست یک‌باره دسترسی میکروفون قبل از شروع جلسه جهت شنود زنده ادمین (بدون دکمه ارسال ویس توسط کاربر)
  initUserMicrophone();
  initSocket();

  // راه‌اندازی پنل ایموجی، تقویم شمسی و مودال‌ها
  initUserEmojiPicker();
  initCalendarAndModals();

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
  const emojiBtn = document.getElementById('user-emoji-btn');
  const emojiPicker = document.getElementById('user-emoji-picker');
  let lockBanner = document.getElementById('chat-lock-banner');

  if (isLocked) {
    if (msgInput) {
      msgInput.disabled = true;
      msgInput.placeholder = '🔒 خط ارتباطی با مرکز فرماندهی موقتاً مسدود شده است.';
    }
    if (sendBtn) sendBtn.disabled = true;
    if (attachBtn) attachBtn.disabled = true;
    if (emojiBtn) emojiBtn.disabled = true;
    if (emojiPicker) emojiPicker.hidden = true;

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
    if (emojiBtn) emojiBtn.disabled = false;
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
      data.data.forEach(msg => renderMessage(msg, { skipScroll: true, skipThreads: true, isHistory: true }));
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

// ساعت دیجیتالی نئونی دقیق و زنده در هدر چت
function initNeonDigitalClock() {
  const clockEl = document.getElementById('neon-digital-clock');
  if (!clockEl) return;
  const tick = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    clockEl.textContent = `${hh}:${mm}:${ss}`;
  };
  tick();
  setInterval(tick, 1000);
}

// مقداردهی اولیه سوکت
function initSocket() {
  socket = io({
    auth: { token: userToken },
  });
  window.socket = socket;

  const statusEl = document.getElementById('socket-status');

  socket.on('connect', () => {
    if (statusEl) {
      statusEl.className = 'status-indicator online';
      statusEl.innerHTML = '<span class="status-dot"></span> متصل';
    }
    socket.emit('join_session', { sessionId: sessionData.id });
    if (!isHistoryLoaded) {
      loadHistory();
    }
  });

  socket.io.on('reconnect', () => {
    if (statusEl) {
      statusEl.className = 'status-indicator online';
      statusEl.innerHTML = '<span class="status-dot"></span> اتصال مجدد برقرار شد';
    }
    socket.emit('join_session', { sessionId: sessionData.id });
  });

  socket.on('disconnect', () => {
    if (statusEl) {
      statusEl.className = 'status-indicator offline';
      statusEl.innerHTML = '<span class="status-dot"></span> در حال وصل شدن مجدد...';
    }
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
      const mId = Number(data.messageId);
      const contentEl = document.getElementById(`user-msg-content-${mId}`);
      if (contentEl) {
        contentEl.textContent = data.content;
      }
      if (userMessagesMap.has(mId)) {
        const stored = userMessagesMap.get(mId);
        stored.content = data.content;
        userMessagesMap.set(mId, stored);
        syncSessionCache();
      }
    }
  });

  socket.on('message_deleted', (data) => {
    if (Number(data.sessionId) === Number(sessionData.id)) {
      const mId = Number(data.messageId);
      const msgEl = document.querySelector(`[data-message-id="${mId}"]`);
      if (msgEl) msgEl.remove();
      if (userMessagesMap.has(mId)) {
        userMessagesMap.delete(mId);
        syncSessionCache();
      }
    }
  });

  socket.on('user_typing', (data) => {
    const typingEl = document.getElementById('typing-indicator');
    if (typingEl && data.senderType === 'admin') {
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
  const msgId = Number(msg.id);
  userMessagesMap.set(msgId, { ...msg });

  const isUser = msg.sender_type === 'user';
  const isUserVoice = msg.message_type === 'user_voice';
  const fileUrl = safeFileUrl(msg.file_url);
  // فقط مدارک ارسالی از سمت کارآگاه/ادمین (غیر از کاربر) روی برد شواهد پین می‌شوند؛ عکس‌های ارسالی کاربر در خود چت می‌مانند
  const isEvidence = !isUser && !isUserVoice && ['image', 'voice', 'video', 'file'].includes(msg.message_type) && fileUrl !== '#';

  // ۱. اگر پیام از نوع مدرک کارآگاه/ادمین است: روی برد مدارک پین شود و کارت هشدار ۱۰ ثانیه‌ای نشان دهد
  if (isEvidence) {
    renderEvidence(msg, options);

    // اگر در حال بارگذاری تاریخچه قدیمی هستیم، کارت هشدار موقت دیگر نباید در چت بماند
    const createdTime = msg.created_at ? new Date(msg.created_at).getTime() : 0;
    const ageMs = createdTime ? (Date.now() - createdTime) : 0;
    if (options.isHistory && (!createdTime || ageMs > 10000)) {
      return;
    }

    if (box.querySelector(`[data-message-id="${msgId}"]`)) return;

    // نمایش کارت هشدار کوچک، شکیل و جمع‌وجور در چت که بعد از ۱۰ ثانیه خودکار حذف می‌شود
    // عناوین داخلی ادمین در بات تلگرام هرگز نباید به مخاطب نمایش داده شوند
    const alertDiv = document.createElement('div');
    alertDiv.dataset.messageId = msgId;
    alertDiv.className = 'message-bubble evidence-alert-card';
    const rawSub = `${getPublicEvidenceTitle(msg)} — در برد شواهد (سمت چپ) پین شد`;

    alertDiv.innerHTML = `
      <div class="evidence-alert-inner">
        <span class="evidence-alert-icon" aria-hidden="true">📌</span>
        <div class="evidence-alert-texts">
          <strong>کارآگاه مدرک جدیدی به برد اسناد اضافه کرد</strong>
          <small>${escapeHtml(rawSub)}</small>
        </div>
        <span class="evidence-alert-cta">مشاهده ↗</span>
      </div>
      <div class="evidence-alert-timer-bar"></div>
    `;
    alertDiv.title = 'کلیک برای باز کردن مدرک';
    alertDiv.addEventListener('click', () => openEvidence(msg));

    const laterMsg = [...box.children].find(child => Number(child.dataset.messageId) > msgId);
    box.insertBefore(alertDiv, laterMsg || null);
    if (!options.skipScroll) {
      box.scrollTop = box.scrollHeight;
      requestAnimationFrame(() => {
        box.scrollTop = box.scrollHeight;
      });
    }

    const remainingMs = (options.isHistory && ageMs > 0 && ageMs < 10000) ? (10000 - ageMs) : 10000;
    setTimeout(() => {
      alertDiv.classList.add('is-fading-out');
      setTimeout(() => {
        if (alertDiv.parentNode) alertDiv.remove();
      }, 350);
    }, remainingMs);

    return;
  }

  if (box.querySelector(`[data-message-id="${msgId}"]`)) return;

  const div = document.createElement('div');
  div.dataset.messageId = msgId;
  div.className = `message-bubble ${msg.sender_type}`;

  let senderTitle = 'دستیاران کارآگاه';
  if (msg.sender_type === 'admin') senderTitle = 'مرکز فرماندهی';
  if (msg.sender_type === 'system') senderTitle = 'پیام سیستم';
  if (msg.sender_type === 'hacker') senderTitle = 'مزداک';

  const timeFormatted = new Date(msg.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  let bodyContent = '';
  if (isUserVoice) {
    div.classList.add('has-user-voice');
    div.classList.add('has-voice-message');
    bodyContent = window.createTelegramVoiceMarkup ? window.createTelegramVoiceMarkup(msg, timeFormatted) : `<audio controls src="${fileUrl}"></audio>`;
  } else if (isUser && msg.message_type === 'image' && fileUrl !== '#') {
    div.classList.add('has-user-media');
    const cleanFileName = fixMojibakeText(msg.file_name || '');
    const cleanContent = fixMojibakeText(msg.content || '');
    const showCaption = cleanContent && cleanContent !== cleanFileName;
    bodyContent = `
      <div class="user-chat-media-box" onclick="openUserMediaById(${msgId})" title="کلیک برای بزرگ‌نمایی تصویر">
        <img src="${fileUrl}" alt="${escapeHtml(cleanFileName || 'تصویر ارسالی')}" class="user-chat-image" loading="lazy">
      </div>
      ${showCaption ? `<div class="user-chat-caption">${escapeHtml(cleanContent)}</div>` : ''}
    `;
  } else if (isUser && msg.message_type === 'video' && fileUrl !== '#') {
    div.classList.add('has-user-media');
    bodyContent = `<video controls playsinline preload="auto" src="${fileUrl}" class="user-chat-video"></video>`;
  } else if (isUser && (msg.message_type === 'file' || msg.message_type === 'voice') && fileUrl !== '#') {
    const cleanLabel = fixMojibakeText(msg.file_name || msg.content || 'فایل پیوست');
    bodyContent = `<a href="${fileUrl}" download target="_blank" rel="noopener" class="user-chat-file-chip">📎 <span>${escapeHtml(cleanLabel)}</span></a>`;
  } else {
    bodyContent = escapeHtml(fixMojibakeText(msg.content));
  }

  const senderMarkup = !isUser && msg.sender_type !== 'system'
    ? `<div class="message-sender"><span>${escapeHtml(senderTitle)}</span></div>`
    : '';

  const canEditText = isUser && (!msg.message_type || msg.message_type === 'text');
  const userActionsMarkup = isUser
    ? `<div class="user-msg-actions">
        ${canEditText ? `<button type="button" class="user-msg-action-btn edit" onclick="openUserEditModal(${msgId})" title="ویرایش پیام" aria-label="ویرایش پیام">✏️ <span>ویرایش</span></button>` : ''}
        <button type="button" class="user-msg-action-btn delete" onclick="openUserDeleteModal(${msgId})" title="حذف پیام" aria-label="حذف پیام">🗑️ <span>حذف</span></button>
      </div>`
    : '';

  div.innerHTML = `${senderMarkup}<div id="user-msg-content-${msgId}" class="message-content">${bodyContent}</div><div class="message-footer-row">${userActionsMarkup}<span class="message-time">${timeFormatted}</span></div>`;

  const laterMessage = [...box.children].find(child => Number(child.dataset.messageId) > msgId);
  box.insertBefore(div, laterMessage || null);
  if (!options.skipScroll) {
    box.scrollTop = box.scrollHeight;
  }
}

function openUserMediaById(messageId) {
  const msg = userMessagesMap.get(Number(messageId));
  if (msg) openEvidence(msg);
}
window.openUserMediaById = openUserMediaById;

/**
 * تولید عنوان استاندارد و داستانی برای نمایش به مخاطب/دانش‌آموز
 * عناوینی که ادمین در بات تلگرام (MohtavaTelBot) وارد می‌کند (مثل «بعد از 5 دقیقه...»)
 * صرفاً راهنمای داخلی ادمین هستند و هرگز نباید به مخاطب نمایش داده شوند.
 */
function getPublicEvidenceTitle(msg) {
  if (!msg) return 'مدرک پرونده';
  if (msg.sender_type === 'user') {
    return fixMojibakeText(msg.content || msg.file_name || 'تصویر ارسالی');
  }
  switch (msg.message_type) {
    case 'voice':
      return 'فایل صوتی محرمانه';
    case 'video':
      return 'ویدیوی ضبط‌شده پرونده';
    case 'image':
      return 'تصویر مدرک پرونده';
    case 'file':
      return 'سند پیوست پرونده';
    default:
      return 'مدرک محرمانه پرونده';
  }
}
window.getPublicEvidenceTitle = getPublicEvidenceTitle;

/**
 * محاسبه دقیق درصد بافر استریم آنلاین (HTTP 206 Byte-Range)
 * با حذف بازه کوچک Tail-Probe انتهای فایل در مرورگر کروم تا هرگز در ثانیه اول به اشتباه ۱۰۰٪ نشان ندهد.
 */
function getRealStreamBufferStats(player) {
  try {
    const dur = Number(player?.duration);
    if (!dur || !Number.isFinite(dur) || dur <= 0 || !player.buffered || player.buffered.length === 0) {
      return { percent: 0, contiguousEnd: 0, isComplete: false };
    }
    const current = Number(player.currentTime) || 0;
    let totalBufferedSec = 0;
    let contiguousEnd = current;

    const ranges = [];
    for (let i = 0; i < player.buffered.length; i++) {
      const start = Math.max(0, player.buffered.start(i));
      const end = Math.min(dur, player.buffered.end(i));
      if (end <= start) continue;

      // کروم هنگام باز کردن استریم صوت/ویدیو، چند کیلوبایت انتهای فایل را هم برای متادیتا می‌خواند.
      // اگر بازه‌ای در انتهای فایل باشد که به بازه اول وصل نیست و طولش کوتاه است، نباید ۱۰۰٪ حساب شود!
      const isDetachedTailProbe =
        i > 0 &&
        start > current + 4 &&
        end >= dur - 2.5 &&
        (end - start) < Math.min(6, Math.max(2.5, dur * 0.04));

      if (isDetachedTailProbe) continue;

      if (ranges.length > 0 && start <= ranges[ranges.length - 1].end + 0.25) {
        ranges[ranges.length - 1].end = Math.max(ranges[ranges.length - 1].end, end);
      } else {
        ranges.push({ start, end });
      }
    }

    for (const r of ranges) {
      totalBufferedSec += (r.end - r.start);
      if (r.start <= current + 1.5 && r.end > contiguousEnd) {
        contiguousEnd = r.end;
      }
    }

    const rawPct = Math.round((totalBufferedSec / dur) * 100);
    const isFullyCovered = ranges.length === 1 && ranges[0].start <= 0.5 && ranges[0].end >= dur - 0.5;
    const isComplete = Boolean(player.ended || isFullyCovered || rawPct >= 99);
    const percent = isComplete ? 100 : Math.min(99, Math.max(0, rawPct));

    return { percent, contiguousEnd, isComplete };
  } catch (_) {
    return { percent: 0, contiguousEnd: 0, isComplete: false };
  }
}
window.getRealStreamBufferStats = getRealStreamBufferStats;

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
  const publicTitle = getPublicEvidenceTitle(msg);
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
          <img id="zoomTargetImage" src="${url}" alt="${escapeHtml(publicTitle)}" draggable="false">
        </div>
      </div>
    `;
  }
  if (msg.message_type === 'video') {
    if (!expanded) return evidenceFileIcon('video', 'فیلم ضبط‌شده');
    return `
      <div class="evidence-media-stage" id="evidenceMediaStage" data-media-kind="video">
        <div class="media-loading" id="mediaLoadingOverlay">
          <span class="media-loading-spinner"></span>
          <span id="mediaLoadingText">در حال اتصال آنی به استریم ویدیو…</span>
        </div>
        <video id="evidenceMediaPlayer" controls playsinline webkit-playsinline preload="auto" autoplay src="${url}" data-original-url="${url}"></video>
        <div class="media-stream-bar" id="mediaStreamBar">
          <div class="media-stream-info">
            <span class="media-stream-status" id="mediaBufferStatus">⚡ پخش آنلاین (استریم زنده) — در حال دریافت و بافر هم‌زمان…</span>
            <span class="media-stream-percent" id="mediaBufferPercent">۰٪</span>
          </div>
          <div class="media-stream-track">
            <div class="media-stream-fill" id="mediaBufferFill" style="width: 0%"></div>
          </div>
        </div>
      </div>
    `;
  }
  if (msg.message_type === 'voice') {
    if (!expanded) return evidenceFileIcon('voice', 'صدای ضبط‌شده');
    return `
      <div class="evidence-media-stage is-voice" id="evidenceMediaStage" data-media-kind="voice">
        <div class="media-loading is-ready" id="mediaLoadingOverlay" hidden>
          <span class="media-loading-spinner"></span>
          <span id="mediaLoadingText">در حال اتصال آنی به استریم صوتی…</span>
        </div>
        <audio id="evidenceMediaPlayer" controls playsinline webkit-playsinline preload="auto" autoplay src="${url}" data-original-url="${url}"></audio>
        <div class="media-stream-bar" id="mediaStreamBar">
          <div class="media-stream-info">
            <span class="media-stream-status" id="mediaBufferStatus">⚡ پخش آنلاین (استریم زنده) — در حال دریافت و بافر هم‌زمان…</span>
            <span class="media-stream-percent" id="mediaBufferPercent">۰٪</span>
          </div>
          <div class="media-stream-track">
            <div class="media-stream-fill" id="mediaBufferFill" style="width: 0%"></div>
          </div>
        </div>
      </div>
    `;
  }
  return expanded ? `<div class="evidence-file-icon">سند</div><a class="download-evidence" href="${url}" download>دریافت ${escapeHtml(publicTitle)}</a>` : evidenceFileIcon('file', 'سند پرونده');
}

function renderEvidence(msg, options = {}) {
  // عکس‌ها و فایل‌های ارسالی خود کاربر هرگز نباید وارد برد شواهد شوند
  if (!msg || msg.sender_type === 'user') return;
  const grid = document.getElementById('evidence-grid');
  if (!grid || grid.querySelector(`[data-evidence-id="${Number(msg.id)}"]`)) return;
  grid.querySelector('.empty-evidence')?.remove();
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'evidence-card';
  card.dataset.evidenceId = Number(msg.id);
  card.dataset.kind = msg.message_type;
  const cleanTitle = getPublicEvidenceTitle(msg);
  card.innerHTML = `${evidenceMediaMarkup(msg)}<h3>${escapeHtml(cleanTitle)}</h3><small><span>مدرک ${Number(msg.id).toLocaleString('fa-IR')}</span><span>${new Date(msg.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span></small>`;
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

let activeMediaCleanup = null;

function initEvidenceMediaPlayer(msg) {
  if (typeof activeMediaCleanup === 'function') {
    activeMediaCleanup();
    activeMediaCleanup = null;
  }

  const player = document.getElementById('evidenceMediaPlayer');
  const loadingEl = document.getElementById('mediaLoadingOverlay');
  const statusEl = document.getElementById('mediaBufferStatus');
  const percentEl = document.getElementById('mediaBufferPercent');
  const fillEl = document.getElementById('mediaBufferFill');

  if (!player) return;

  const isVoice = msg.message_type === 'voice';
  let maxObservedPct = 0;

  const hideLoading = () => {
    if (loadingEl && !loadingEl.classList.contains('is-ready')) {
      loadingEl.classList.add('is-ready');
      loadingEl.hidden = true;
    }
  };

  if (isVoice || player.readyState >= 1) {
    hideLoading();
  }

  const updateStreamUi = () => {
    const stats = getRealStreamBufferStats(player);
    const isComplete = stats.isComplete;
    if (stats.percent > maxObservedPct) {
      maxObservedPct = stats.percent;
    }
    const effectivePct = isComplete ? 100 : maxObservedPct;

    if (fillEl) {
      fillEl.style.width = `${effectivePct}%`;
      fillEl.classList.toggle('is-complete', isComplete);
    }
    if (percentEl) {
      percentEl.textContent = `${effectivePct.toLocaleString('fa-IR')}٪`;
    }
    if (statusEl) {
      if (isComplete) {
        statusEl.textContent = isVoice
          ? '✅ پخش آنلاین صوتی — کل فایل در حین پخش کامل بافر شد (۱۰۰٪)'
          : '✅ پخش آنلاین ویدیو — کل ویدیو در حین پخش کامل بافر شد (۱۰۰٪)';
      } else if (!player.paused && player.currentTime > 0) {
        statusEl.textContent = isVoice
          ? `🟢 در حال پخش آنلاین صوت و دانلود هم‌زمان در پس‌زمینه (${effectivePct.toLocaleString('fa-IR')}٪ بافر شده)`
          : `🟢 در حال پخش آنلاین ویدیو و دانلود هم‌زمان در پس‌زمینه (${effectivePct.toLocaleString('fa-IR')}٪ بافر شده)`;
      } else if (effectivePct > 0) {
        statusEl.textContent = isVoice
          ? `⚡ آماده پخش آنلاین صوت (${effectivePct.toLocaleString('fa-IR')}٪ بافر شده — ادامه دانلود حین پخش)`
          : `⚡ آماده پخش آنلاین ویدیو (${effectivePct.toLocaleString('fa-IR')}٪ بافر شده — ادامه دانلود حین پخش)`;
      } else {
        statusEl.textContent = isVoice
          ? '⚡ در حال اتصال آنی به استریم صوتی و شروع پخش آنلاین…'
          : '⚡ در حال اتصال آنی به استریم ویدیو و شروع پخش آنلاین…';
      }
    }
  };

  const onReadyEvent = () => {
    hideLoading();
    updateStreamUi();
  };

  const onWaiting = () => {
    updateStreamUi();
    if (statusEl && !player.paused) {
      const pctText = maxObservedPct > 0 ? ` (${maxObservedPct.toLocaleString('fa-IR')}٪)` : '';
      statusEl.textContent = isVoice
        ? `⏳ در حال بافر ادامه استریم آنلاین صوتی${pctText}…`
        : `⏳ در حال بافر ادامه استریم آنلاین ویدیو${pctText}…`;
    }
  };

  player.addEventListener('loadedmetadata', onReadyEvent);
  player.addEventListener('loadeddata', onReadyEvent);
  player.addEventListener('canplay', onReadyEvent);
  player.addEventListener('canplaythrough', onReadyEvent);
  player.addEventListener('playing', onReadyEvent);
  player.addEventListener('progress', updateStreamUi);
  player.addEventListener('timeupdate', onReadyEvent);
  player.addEventListener('seeking', updateStreamUi);
  player.addEventListener('seeked', onReadyEvent);
  player.addEventListener('ended', onReadyEvent);
  player.addEventListener('waiting', onWaiting);
  player.addEventListener('stalled', onWaiting);
  player.addEventListener('error', () => {
    if (statusEl) {
      statusEl.textContent = '⚠️ اختلال موقت در ارتباط شبکه؛ لطفاً روی دکمه پخش کلیک کنید.';
    }
    hideLoading();
  });

  updateStreamUi();

  // شروع درجا و آنی پخش به محض کلیک کاربر روی مدرک (استریم مستقیم HTTP 206)
  const playPromise = player.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {
      hideLoading();
      updateStreamUi();
    });
  }

  const bufferPollTimer = setInterval(() => {
    if (!document.body.contains(player)) {
      clearInterval(bufferPollTimer);
      return;
    }
    if (player.readyState >= 1 || player.duration > 0) {
      hideLoading();
    }
    updateStreamUi();
  }, 250);

  activeMediaCleanup = () => {
    clearInterval(bufferPollTimer);
    try {
      player.pause();
      player.removeAttribute('src');
      player.load();
    } catch (_) {}
  };
}

function openEvidence(msg) {
  const dialog = document.getElementById('evidence-dialog');
  const titleText = getPublicEvidenceTitle(msg);
  const subtitleText = msg.sender_type === 'user'
    ? 'تصویر ارسالی توسط گروه شما در گفتگوی پرونده.'
    : 'ارسال‌شده از مرکز فرماندهی برای بررسی گروه.';
  document.getElementById('evidence-dialog-content').innerHTML = `${evidenceMediaMarkup(msg, true)}<h2>${escapeHtml(titleText)}</h2><p>${subtitleText}</p>`;
  dialog.showModal();
  if (msg.message_type === 'image') {
    initEvidenceZoom();
  } else if (msg.message_type === 'video' || msg.message_type === 'voice') {
    initEvidenceMediaPlayer(msg);
  }
}

function closeEvidence() {
  if (typeof activeMediaCleanup === 'function') {
    activeMediaCleanup();
    activeMediaCleanup = null;
  }
  const dialog = document.getElementById('evidence-dialog');
  if (dialog) dialog.close();
  const img = document.getElementById('zoomTargetImage');
  if (img) img.style.transform = '';
}

document.getElementById('evidence-dialog')?.addEventListener('close', () => {
  if (typeof activeMediaCleanup === 'function') {
    activeMediaCleanup();
    activeMediaCleanup = null;
  }
});

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

let activeUserUpload = null;

function formatFileSizeFa(bytes) {
  const num = Number(bytes) || 0;
  if (num < 1024) return `${num.toLocaleString('fa-IR')} بایت`;
  if (num < 1024 * 1024) return `${Math.max(1, Math.round(num / 1024)).toLocaleString('fa-IR')} کیلوبایت`;
  return `${(num / (1024 * 1024)).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} مگابایت`;
}

function renderUploadProgressUI(fileName, fileSize, percent = 0, statusLabel = 'در حال آپلود فایل...') {
  const feedbackEl = document.getElementById('chat-feedback');
  if (!feedbackEl) return;
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  const cleanName = fixMojibakeText(fileName || 'فایل پیوست');
  feedbackEl.innerHTML = `
    <div class="upload-progress-card" id="user-upload-progress-card">
      <div class="upload-progress-top">
        <div class="upload-file-meta">
          <span class="upload-file-icon" aria-hidden="true">📎</span>
          <div class="upload-file-texts">
            <strong class="upload-file-name" title="${escapeHtml(cleanName)}">${escapeHtml(cleanName)}</strong>
            <small class="upload-file-status" id="user-upload-status-label">${escapeHtml(statusLabel)} (${formatFileSizeFa(fileSize)})</small>
          </div>
        </div>
        <div class="upload-progress-actions">
          <span class="upload-percent-badge" id="user-upload-percent-badge">${clamped.toLocaleString('fa-IR')}٪</span>
          <button type="button" class="upload-cancel-btn" onclick="cancelCurrentUserUpload()" title="لغو ارسال فایل">
            <span>✕</span>
            <span>لغو ارسال</span>
          </button>
        </div>
      </div>
      <div class="upload-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${clamped}">
        <div class="upload-progress-fill" id="user-upload-progress-fill" style="width: ${clamped}%;"></div>
      </div>
    </div>
  `;
}

function updateUploadProgressUI(percent, statusLabel, fileSize) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  const badge = document.getElementById('user-upload-percent-badge');
  const fill = document.getElementById('user-upload-progress-fill');
  const label = document.getElementById('user-upload-status-label');
  if (badge) badge.textContent = `${clamped.toLocaleString('fa-IR')}٪`;
  if (fill) fill.style.width = `${clamped}%`;
  if (label && statusLabel) {
    label.textContent = fileSize ? `${statusLabel} (${formatFileSizeFa(fileSize)})` : statusLabel;
  }
}

function cancelCurrentUserUpload() {
  if (!activeUserUpload) return;
  const uploadToCancel = activeUserUpload;
  uploadToCancel.cancelled = true;
  activeUserUpload = null;

  if (uploadToCancel.xhr) {
    try { uploadToCancel.xhr.abort(); } catch (_) {}
  }

  if (uploadToCancel.uploadId) {
    fetch('/api/upload/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify({ uploadId: uploadToCancel.uploadId }),
    }).catch(() => {});

    if (socket && socket.connected) {
      socket.emit('cancel_file_upload', { uploadId: uploadToCancel.uploadId });
    }
  }

  const fileInput = document.getElementById('user-file-input');
  if (fileInput) fileInput.value = '';

  const feedbackEl = document.getElementById('chat-feedback');
  if (feedbackEl) {
    feedbackEl.innerHTML = `<div class="upload-cancelled-notice">⛔ ارسال فایل «${escapeHtml(fixMojibakeText(uploadToCancel.fileName || ''))}» لغو شد.</div>`;
    setTimeout(() => {
      if (!activeUserUpload && feedbackEl.querySelector('.upload-cancelled-notice')) {
        feedbackEl.innerHTML = '';
      }
    }, 2500);
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = String(reader.result || '');
      const commaIdx = res.indexOf(',');
      resolve(commaIdx >= 0 ? res.slice(commaIdx + 1) : res);
    };
    reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
    reader.readAsDataURL(blob);
  });
}

function sendChunkViaXhr(payload, uploadState, onProgressRatio) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    uploadState.xhr = xhr;
    xhr.open('POST', '/api/upload/chunk', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${userToken}`);
    xhr.timeout = 25000;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && typeof onProgressRatio === 'function') {
        onProgressRatio(Math.min(1, e.loaded / e.total));
      }
    };

    xhr.onload = () => {
      uploadState.xhr = null;
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          resolve(data);
        } else {
          const err = new Error(data.message || `HTTP ${xhr.status}`);
          err.isValidationError = xhr.status === 400 && Boolean(data.message);
          err.status = xhr.status;
          reject(err);
        }
      } catch (_) {
        const err = new Error(`خطای سرور (${xhr.status})`);
        err.status = xhr.status;
        reject(err);
      }
    };

    xhr.onerror = () => {
      uploadState.xhr = null;
      reject(new Error('NETWORK_ERROR'));
    };

    xhr.ontimeout = () => {
      uploadState.xhr = null;
      reject(new Error('TIMEOUT'));
    };

    xhr.onabort = () => {
      uploadState.xhr = null;
      reject(new Error('ABORTED'));
    };

    xhr.send(JSON.stringify(payload));
  });
}

function sendChunkViaSocket(payload) {
  return new Promise((resolve, reject) => {
    if (!socket || !socket.connected) {
      return reject(new Error('SOCKET_DISCONNECTED'));
    }
    socket.timeout(20000).emit('upload_file_chunk', payload, (err, response) => {
      if (err) return reject(new Error('SOCKET_TIMEOUT'));
      if (response && response.success) {
        resolve(response);
      } else {
        const error = new Error((response && response.message) || 'خطا در آپلود سوکتی');
        error.isValidationError = Boolean(response && response.message);
        reject(error);
      }
    });
  });
}

async function compressImageIfNeededForLegacyFallback(file) {
  if (!file || !String(file.type || '').startsWith('image/') || file.size <= 750 * 1024) {
    return file;
  }
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const maxDim = 1600;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob && blob.size < file.size) {
            const safeName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
            resolve(new File([blob], safeName, { type: 'image/jpeg' }));
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.84);
      } catch (_) {
        resolve(file);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

function uploadLegacyMultipartWithXhr(fileToUpload, uploadState, originalSize) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    uploadState.xhr = xhr;
    const formData = new FormData();
    formData.append('file', fileToUpload);

    xhr.open('POST', '/api/upload', true);
    xhr.setRequestHeader('Authorization', `Bearer ${userToken}`);
    xhr.timeout = 45000;

    xhr.upload.onprogress = (e) => {
      if (uploadState.cancelled) return;
      if (e.lengthComputable) {
        const pct = Math.min(99, Math.round((e.loaded / e.total) * 100));
        updateUploadProgressUI(pct, 'در حال ارسال فایل...', originalSize);
      }
    };

    xhr.onload = () => {
      uploadState.xhr = null;
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          resolve(data);
        } else {
          reject(new Error(data.message || `خطای سرور (${xhr.status})`));
        }
      } catch (_) {
        reject(new Error(xhr.status === 413 ? 'حجم فایل بیش از محدودیت سرور است.' : `خطا در پاسخ سرور (${xhr.status})`));
      }
    };

    xhr.onerror = () => {
      uploadState.xhr = null;
      reject(new Error('خطا در شبکه هنگام ارسال فایل.'));
    };

    xhr.ontimeout = () => {
      uploadState.xhr = null;
      reject(new Error('زمان ارسال فایل به پایان رسید.'));
    };

    xhr.onabort = () => {
      uploadState.xhr = null;
      reject(new Error('ABORTED'));
    };

    xhr.send(formData);
  });
}

async function handleUserFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (activeUserUpload) {
    cancelCurrentUserUpload();
  }

  const cleanOriginalName = fixMojibakeText(file.name || 'فایل ارسالی');
  const uploadState = {
    uploadId: `up_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    cancelled: false,
    xhr: null,
    fileName: cleanOriginalName,
  };
  activeUserUpload = uploadState;

  renderUploadProgressUI(cleanOriginalName, file.size, 0, 'در حال آماده‌سازی و ارسال...');

  const CHUNK_SIZE = 160 * 1024; // قطعات ۱۶۰ کیلوبایتی برای عبور تضمینی از Nginx/Cloudflare و نمایش دقیق درصد
  const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
  let finalResult = null;
  let useSocketTransport = false;

  try {
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      if (uploadState.cancelled) return;

      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const blobSlice = file.slice(start, end);
      const chunkBase64 = await blobToBase64(blobSlice);

      if (uploadState.cancelled) return;

      const payload = {
        uploadId: uploadState.uploadId,
        chunkIndex,
        totalChunks,
        chunkBase64,
        fileName: cleanOriginalName,
        mimeType: file.type || 'application/octet-stream',
      };

      let chunkResponse = null;

      if (!useSocketTransport) {
        try {
          chunkResponse = await sendChunkViaXhr(payload, uploadState, (chunkRatio) => {
            if (uploadState.cancelled) return;
            const overallPct = ((chunkIndex + chunkRatio) / totalChunks) * 100;
            updateUploadProgressUI(overallPct, 'در حال ارسال فایل در گفتگو...', file.size);
          });
        } catch (xhrErr) {
          if (uploadState.cancelled || xhrErr.message === 'ABORTED') return;
          if (xhrErr.isValidationError) throw xhrErr;
          // در صورت خطای پروکسی یا مسدود بودن مسیر HTTP، سوییچ خودکار روی سوکت
          useSocketTransport = true;
        }
      }

      if (useSocketTransport && !chunkResponse) {
        chunkResponse = await sendChunkViaSocket(payload);
        if (uploadState.cancelled) return;
        const overallPct = ((chunkIndex + 1) / totalChunks) * 100;
        updateUploadProgressUI(overallPct, 'در حال ارسال امن فایل...', file.size);
      }

      if (chunkResponse && chunkResponse.completed && chunkResponse.data) {
        finalResult = chunkResponse;
      }
    }
  } catch (chunkFlowErr) {
    if (uploadState.cancelled || chunkFlowErr.message === 'ABORTED') return;
    if (chunkFlowErr.isValidationError) {
      activeUserUpload = null;
      const feedbackEl = document.getElementById('chat-feedback');
      if (feedbackEl) feedbackEl.innerHTML = '';
      alert('خطا در آپلود فایل: ' + chunkFlowErr.message);
      event.target.value = '';
      return;
    }

    // فال‌بک نهایی به مسیر استاندارد /api/upload همراه با بهینه‌سازی حجم تصویر
    try {
      updateUploadProgressUI(10, 'در حال بهینه‌سازی و ارسال تصویر...', file.size);
      const optimizedFile = await compressImageIfNeededForLegacyFallback(file);
      if (uploadState.cancelled) return;
      finalResult = await uploadLegacyMultipartWithXhr(optimizedFile, uploadState, file.size);
    } catch (legacyErr) {
      if (uploadState.cancelled || legacyErr.message === 'ABORTED') return;
      activeUserUpload = null;
      const feedbackEl = document.getElementById('chat-feedback');
      if (feedbackEl) feedbackEl.innerHTML = '';
      console.error('Error uploading file:', legacyErr);
      alert('خطا در آپلود فایل: ' + (legacyErr.message || 'ارتباط با سرور برقرار نشد.'));
      event.target.value = '';
      return;
    }
  }

  if (uploadState.cancelled) return;

  if (finalResult && finalResult.success && finalResult.data) {
    updateUploadProgressUI(100, 'تکمیل شد — ثبت در گفتگو...', file.size);
    const { fileUrl, fileName, messageType } = finalResult.data;
    const cleanName = fixMojibakeText(fileName || cleanOriginalName);

    socket.emit('send_message', {
      sessionId: sessionData.id,
      content: cleanName,
      messageType: messageType,
      fileUrl: fileUrl,
      fileName: cleanName,
    }, (ack) => {
      if (activeUserUpload === uploadState) {
        activeUserUpload = null;
      }
      const feedbackEl = document.getElementById('chat-feedback');
      if (feedbackEl) feedbackEl.innerHTML = '';
      if (ack && ack.success && ack.message) {
        renderMessage(ack.message);
      }
    });

    event.target.value = '';
  } else {
    activeUserUpload = null;
    const feedbackEl = document.getElementById('chat-feedback');
    if (feedbackEl) feedbackEl.innerHTML = '';
    event.target.value = '';
  }
}

function logoutUser() {
  sessionStorage.removeItem('userToken');
  sessionStorage.removeItem('userSession');
  window.location.href = '/enter-code.html';
}

/* ==========================================================================
   سیستم ایموجی (Emoji Picker) در ترمینال دانش‌آموز
   ========================================================================== */
const USER_EMOJI_CATEGORIES = [
  {
    id: 'detective',
    label: '🕵️ کارآگاهی',
    emojis: ['🕵️‍♂️', '🔍', '🔎', '🧩', '📌', '📁', '🗂️', '📜', '🗝️', '🔒', '🔓', '⚠️', '🚨', '💡', '🎯', '🩸', '👣', '🕰️', '🕯️', '🏚️', '🌲', '📡', '💻', '🛡️', '☠️', '👁️', '🤫', '🤔', '🧐', '😎']
  },
  {
    id: 'faces',
    label: '😊 صورتک‌ها',
    emojis: ['😀', '😄', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🤩', '🥳', '😏', '😒', '😔', '😟', '😕', '🙁', '😣', '😫', '🥺', '😢', '😭', '😤', '😡', '🤯', '😳', '😱', '😨', '🤗', '🫡', '🤝', '👍', '👎', '👏', '🙌', '🙏', '💪', '✌️', '👌', '✋']
  },
  {
    id: 'symbols',
    label: '⚡ علائم',
    emojis: ['✅', '❌', '❓', '❗', '‼️', '💯', '🔥', '⚡', '✨', '⭐', '🌟', '💥', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⏳', '⌛', '🔔', '📢', '💬', '💭', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔']
  }
];

function initUserEmojiPicker() {
  const picker = document.getElementById('user-emoji-picker');
  if (!picker) return;

  const tabsHtml = USER_EMOJI_CATEGORIES.map((cat, idx) =>
    `<button type="button" class="emoji-tab-btn ${idx === 0 ? 'active' : ''}" data-cat="${cat.id}" onclick="switchUserEmojiTab('${cat.id}')">${cat.label}</button>`
  ).join('');

  const gridsHtml = USER_EMOJI_CATEGORIES.map((cat, idx) =>
    `<div class="emoji-cat-grid ${idx === 0 ? 'active' : ''}" data-cat-grid="${cat.id}">
      ${cat.emojis.map(em => `<button type="button" class="emoji-item-btn" onclick="insertUserEmoji('${em}')">${em}</button>`).join('')}
    </div>`
  ).join('');

  picker.innerHTML = `
    <div class="emoji-picker-header">
      <div class="emoji-tabs-row">${tabsHtml}</div>
      <button type="button" class="emoji-close-btn" onclick="closeUserEmojiPicker()" aria-label="بستن">×</button>
    </div>
    <div class="emoji-picker-body">${gridsHtml}</div>
  `;

  document.addEventListener('click', (e) => {
    if (picker.hidden) return;
    const btn = document.getElementById('user-emoji-btn');
    if (!picker.contains(e.target) && (!btn || !btn.contains(e.target))) {
      picker.hidden = true;
    }
  });
}

function toggleUserEmojiPicker(e) {
  if (e) e.stopPropagation();
  const picker = document.getElementById('user-emoji-picker');
  if (!picker) return;
  if (sessionData.is_chat_locked) return;
  picker.hidden = !picker.hidden;
}

function closeUserEmojiPicker() {
  const picker = document.getElementById('user-emoji-picker');
  if (picker) picker.hidden = true;
}

function switchUserEmojiTab(catId) {
  const picker = document.getElementById('user-emoji-picker');
  if (!picker) return;
  picker.querySelectorAll('.emoji-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === catId);
  });
  picker.querySelectorAll('.emoji-cat-grid').forEach(grid => {
    grid.classList.toggle('active', grid.dataset.catGrid === catId);
  });
}

function insertUserEmoji(emoji) {
  const input = document.getElementById('msg-input');
  if (!input || input.disabled) return;
  const start = typeof input.selectionStart === 'number' ? input.selectionStart : input.value.length;
  const end = typeof input.selectionEnd === 'number' ? input.selectionEnd : input.value.length;
  const before = input.value.slice(0, start);
  const after = input.value.slice(end);
  input.value = before + emoji + after;
  const nextPos = start + emoji.length;
  input.focus();
  try {
    input.setSelectionRange(nextPos, nextPos);
  } catch (_) {}
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  handleTyping();
}

/* ==========================================================================
   تقویم واقعی شمسی (جلالی) با ماه‌های واقعی (مهر، آبان و...) و روزهای واقعی هفته
   ========================================================================== */
const SHAMSI_MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

const SHAMSI_WEEKDAY_NAMES = [
  'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'
];

function toPersianDigits(val) {
  return String(val ?? '').replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  let jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return { jy, jm, jd };
}

function jalaliToGregorian(jy, jm, jd) {
  const jy1 = jy + 1595;
  let days = -355668 + (365 * jy1) + (Math.floor(jy1 / 33) * 8) + Math.floor(((jy1 % 33) + 3) / 4) + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm;
  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) {
    gd -= sal_a[gm];
  }
  return { gy, gm, gd };
}

function isJalaliLeapYear(jy) {
  const g1 = jalaliToGregorian(jy, 12, 30);
  const back = gregorianToJalali(g1.gy, g1.gm, g1.gd);
  return back.jy === jy && back.jm === 12 && back.jd === 30;
}

function getJalaliMonthLength(jy, jm) {
  if (jm >= 1 && jm <= 6) return 31;
  if (jm >= 7 && jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

// بازگشت ایندکس روز هفته شمسی: شنبه = 0، یکشنبه = 1، ...، جمعه = 6
function getJalaliWeekdayIndex(jy, jm, jd) {
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  const jsDay = new Date(gy, gm - 1, gd).getDay(); // یکشنبه = 0 ... شنبه = 6
  return (jsDay + 1) % 7;
}

let shamsiState = {
  todayJy: 1405,
  todayJm: 7,
  todayJd: 18,
  viewJy: 1405,
  viewJm: 7,
  selectedJy: 1405,
  selectedJm: 7,
  selectedJd: 18,
};

function initCalendarAndModals() {
  const now = new Date();
  const realToday = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  shamsiState = {
    todayJy: realToday.jy,
    todayJm: realToday.jm,
    todayJd: realToday.jd,
    viewJy: realToday.jy,
    viewJm: realToday.jm,
    selectedJy: realToday.jy,
    selectedJm: realToday.jm,
    selectedJd: realToday.jd,
  };
  renderShamsiCalendar();

  // بستن مودال‌ها با کلیک روی بک‌دراپ
  ['assistants-photo-dialog', 'user-edit-msg-dialog', 'user-delete-msg-dialog'].forEach(dialogId => {
    const dlg = document.getElementById(dialogId);
    if (dlg) {
      dlg.addEventListener('click', (e) => {
        if (e.target === dlg) dlg.close();
      });
    }
  });
}

function changeShamsiMonth(delta) {
  let nextMonth = shamsiState.viewJm + delta;
  let nextYear = shamsiState.viewJy;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  } else if (nextMonth < 1) {
    nextMonth = 12;
    nextYear--;
  }
  shamsiState.viewJm = nextMonth;
  shamsiState.viewJy = nextYear;
  renderShamsiCalendar();
}

function goToTodayShamsi() {
  shamsiState.viewJy = shamsiState.todayJy;
  shamsiState.viewJm = shamsiState.todayJm;
  shamsiState.selectedJy = shamsiState.todayJy;
  shamsiState.selectedJm = shamsiState.todayJm;
  shamsiState.selectedJd = shamsiState.todayJd;
  renderShamsiCalendar();
}

function selectShamsiDay(jy, jm, jd) {
  shamsiState.selectedJy = jy;
  shamsiState.selectedJm = jm;
  shamsiState.selectedJd = jd;
  if (jy !== shamsiState.viewJy || jm !== shamsiState.viewJm) {
    shamsiState.viewJy = jy;
    shamsiState.viewJm = jm;
  }
  renderShamsiCalendar();
}

function renderShamsiCalendar() {
  const titleEl = document.getElementById('shamsi-calendar-title');
  const badgeEl = document.getElementById('shamsi-today-badge');
  const gridEl = document.getElementById('shamsi-days-grid');
  if (!gridEl) return;

  const { viewJy, viewJm, todayJy, todayJm, todayJd, selectedJy, selectedJm, selectedJd } = shamsiState;
  const monthName = SHAMSI_MONTH_NAMES[viewJm - 1] || 'مهر';

  if (titleEl) {
    titleEl.textContent = `${monthName} ${toPersianDigits(viewJy)}`;
  }

  if (badgeEl) {
    const selMonthName = SHAMSI_MONTH_NAMES[selectedJm - 1] || monthName;
    const selWeekday = SHAMSI_WEEKDAY_NAMES[getJalaliWeekdayIndex(selectedJy, selectedJm, selectedJd)];
    badgeEl.textContent = `${selWeekday} ${toPersianDigits(selectedJd)} ${selMonthName}`;
  }

  const daysInMonth = getJalaliMonthLength(viewJy, viewJm);
  const firstDayOffset = getJalaliWeekdayIndex(viewJy, viewJm, 1); // 0=شنبه ... 6=جمعه

  const prevJm = viewJm === 1 ? 12 : viewJm - 1;
  const prevJy = viewJm === 1 ? viewJy - 1 : viewJy;
  const prevMonthDays = getJalaliMonthLength(prevJy, prevJm);

  const cells = [];

  // روزهای پایانی ماه قبل (کمرنگ) برای تراز دقیق روز اول ماه با روز واقعی هفته
  for (let i = firstDayOffset - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    cells.push(
      `<button type="button" class="cal-day-cell is-outside" onclick="selectShamsiDay(${prevJy}, ${prevJm}, ${d})" title="${toPersianDigits(d)} ${SHAMSI_MONTH_NAMES[prevJm - 1]}">${toPersianDigits(d)}</button>`
    );
  }

  // روزهای واقعی ماه جاری
  for (let d = 1; d <= daysInMonth; d++) {
    const colIdx = (firstDayOffset + d - 1) % 7;
    const isFriday = colIdx === 6;
    const isToday = (viewJy === todayJy && viewJm === todayJm && d === todayJd);
    const isSelected = (viewJy === selectedJy && viewJm === selectedJm && d === selectedJd);
    const classes = [
      'cal-day-cell',
      isFriday ? 'is-friday' : '',
      isToday ? 'is-today' : '',
      isSelected ? 'is-selected' : '',
    ].filter(Boolean).join(' ');

    const weekdayName = SHAMSI_WEEKDAY_NAMES[colIdx];
    cells.push(
      `<button type="button" class="${classes}" data-day="${d}" onclick="selectShamsiDay(${viewJy}, ${viewJm}, ${d})" title="${weekdayName} ${toPersianDigits(d)} ${monthName} ${toPersianDigits(viewJy)}">${toPersianDigits(d)}</button>`
    );
  }

  // پر کردن انتهای جدول با روزهای ابتدایی ماه بعد (مثلاً آبان بعد از مهر)
  const totalSlots = cells.length <= 35 ? 35 : 42;
  const nextJm = viewJm === 12 ? 1 : viewJm + 1;
  const nextJy = viewJm === 12 ? viewJy + 1 : viewJy;
  const remaining = totalSlots - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push(
      `<button type="button" class="cal-day-cell is-outside" onclick="selectShamsiDay(${nextJy}, ${nextJm}, ${d})" title="${toPersianDigits(d)} ${SHAMSI_MONTH_NAMES[nextJm - 1]}">${toPersianDigits(d)}</button>`
    );
  }

  gridEl.style.gridTemplateRows = `repeat(${totalSlots / 7}, minmax(0, 1fr))`;
  gridEl.innerHTML = cells.join('');
}

function openAssistantsPhotoPopup() {
  const dlg = document.getElementById('assistants-photo-dialog');
  if (dlg) dlg.showModal();
}

function closeAssistantsPhotoPopup() {
  const dlg = document.getElementById('assistants-photo-dialog');
  if (dlg) dlg.close();
}

/* ==========================================================================
   پاپ‌آپ خوشگل ویرایش و حذف پیام‌های خود دانش‌آموز
   ========================================================================== */
function openUserEditModal(messageId) {
  if (sessionData.is_chat_locked) {
    alert('خط ارتباطی با مرکز فرماندهی موقتاً مسدود شده است.');
    return;
  }
  const mId = Number(messageId);
  const stored = userMessagesMap.get(mId);
  const domEl = document.getElementById(`user-msg-content-${mId}`);
  const currentText = (stored && typeof stored.content === 'string')
    ? stored.content
    : (domEl ? domEl.textContent : '');

  activeEditMessageId = mId;
  const textarea = document.getElementById('user-edit-msg-textarea');
  const dlg = document.getElementById('user-edit-msg-dialog');
  if (!textarea || !dlg) return;

  textarea.value = currentText;
  dlg.showModal();
  setTimeout(() => {
    textarea.focus();
    try {
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    } catch (_) {}
  }, 40);
}

function closeUserEditModal() {
  activeEditMessageId = null;
  const dlg = document.getElementById('user-edit-msg-dialog');
  if (dlg) dlg.close();
}

function insertEmojiIntoEdit(emoji) {
  const textarea = document.getElementById('user-edit-msg-textarea');
  if (!textarea) return;
  const start = typeof textarea.selectionStart === 'number' ? textarea.selectionStart : textarea.value.length;
  const end = typeof textarea.selectionEnd === 'number' ? textarea.selectionEnd : textarea.value.length;
  textarea.value = textarea.value.slice(0, start) + emoji + textarea.value.slice(end);
  const pos = start + emoji.length;
  textarea.focus();
  try {
    textarea.setSelectionRange(pos, pos);
  } catch (_) {}
}

function submitUserEditMessage(e) {
  if (e) e.preventDefault();
  if (!activeEditMessageId) return;

  const textarea = document.getElementById('user-edit-msg-textarea');
  const saveBtn = document.getElementById('user-edit-save-btn');
  const newContent = textarea ? textarea.value.trim() : '';
  if (!newContent) return;

  if (!socket || !socket.connected) {
    alert('ارتباط با سرور برقرار نیست. لطفاً چند لحظه دیگر تلاش کنید.');
    return;
  }

  const targetId = activeEditMessageId;
  if (saveBtn) saveBtn.disabled = true;

  socket.emit('edit_message', { messageId: targetId, content: newContent }, (res) => {
    if (saveBtn) saveBtn.disabled = false;
    if (res && res.success) {
      const contentEl = document.getElementById(`user-msg-content-${targetId}`);
      if (contentEl) contentEl.textContent = res.content || newContent;
      if (userMessagesMap.has(targetId)) {
        const msgObj = userMessagesMap.get(targetId);
        msgObj.content = res.content || newContent;
        userMessagesMap.set(targetId, msgObj);
        syncSessionCache();
      }
      closeUserEditModal();
    } else {
      alert((res && res.message) || 'خطا در ویرایش پیام.');
    }
  });
}

function openUserDeleteModal(messageId) {
  if (sessionData.is_chat_locked) {
    alert('خط ارتباطی با مرکز فرماندهی موقتاً مسدود شده است.');
    return;
  }
  const mId = Number(messageId);
  activeDeleteMessageId = mId;

  const stored = userMessagesMap.get(mId);
  const domEl = document.getElementById(`user-msg-content-${mId}`);
  const previewText = (stored && stored.content) ? stored.content : (domEl ? domEl.textContent : 'پیام ارسالی');

  const previewEl = document.getElementById('user-delete-msg-preview');
  if (previewEl) {
    previewEl.textContent = previewText.length > 140 ? previewText.slice(0, 140) + '…' : previewText;
  }

  const dlg = document.getElementById('user-delete-msg-dialog');
  if (dlg) dlg.showModal();
}

function closeUserDeleteModal() {
  activeDeleteMessageId = null;
  const dlg = document.getElementById('user-delete-msg-dialog');
  if (dlg) dlg.close();
}

function confirmUserDeleteMessage() {
  if (!activeDeleteMessageId) return;
  if (!socket || !socket.connected) {
    alert('ارتباط با سرور برقرار نیست. لطفاً چند لحظه دیگر تلاش کنید.');
    return;
  }

  const targetId = activeDeleteMessageId;
  const confirmBtn = document.getElementById('user-delete-confirm-btn');
  if (confirmBtn) confirmBtn.disabled = true;

  socket.emit('delete_message', { messageId: targetId }, (res) => {
    if (confirmBtn) confirmBtn.disabled = false;
    if (res && res.success) {
      const msgEl = document.querySelector(`[data-message-id="${targetId}"]`);
      if (msgEl) msgEl.remove();
      if (userMessagesMap.has(targetId)) {
        userMessagesMap.delete(targetId);
        syncSessionCache();
      }
      closeUserDeleteModal();
    } else {
      alert((res && res.message) || 'خطا در حذف پیام.');
    }
  });
}

