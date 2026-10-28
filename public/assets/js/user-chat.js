/**
 * public/assets/js/user-chat.js
 * منطق صفحه چت کاربر (دستیاران کارآگاه)
 */

let socket = null;
let userToken = sessionStorage.getItem('userToken');
let sessionData = JSON.parse(sessionStorage.getItem('userSession') || '{}');
let localStream = null;
let microphoneRequest = null;
let microphoneRecoveryTimer = null;
let microphoneRecoveryAttempts = 0;
let peerConnection = null;

const WIN1252_REVERSE_MAP = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
  0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
  0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
  0x017E: 0x9E, 0x0178: 0x9F,
};

function fixMojibakeText(value) {
  let str = String(value ?? '').trim();
  if (!str) return '';

  if (/%[0-9a-fA-F]{2}/.test(str)) {
    try {
      const decodedUri = decodeURIComponent(str);
      if (decodedUri && decodedUri !== str) str = decodedUri;
    } catch (_) {}
  }

  const hasMojibake = /[\u0080-\u00ff]/.test(str) || Object.keys(WIN1252_REVERSE_MAP).some(k => str.includes(String.fromCharCode(Number(k))));
  if (hasMojibake) {
    try {
      const bytes = [];
      let canDecode = true;
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code <= 0xff) {
          bytes.push(code);
        } else if (WIN1252_REVERSE_MAP[code]) {
          bytes.push(WIN1252_REVERSE_MAP[code]);
        } else {
          canDecode = false;
          break;
        }
      }
      if (canDecode && bytes.length > 0) {
        const decoded = (typeof TextDecoder !== 'undefined')
          ? new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes))
          : decodeURIComponent(escape(String.fromCharCode(...bytes)));
        if (decoded && !decoded.includes('\ufffd')) {
          return decoded;
        }
      }
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
  navigator.mediaDevices?.addEventListener?.('devicechange', () => {
    if (liveAudioRequested && !localStream?.getAudioTracks().some(track => track.readyState === 'live')) {
      microphoneRecoveryAttempts = 0;
      scheduleMicrophoneRecovery();
    }
  });
  initSocket();

  // راه‌اندازی پنل ایموجی، تقویم شمسی و مودال‌ها
  initUserEmojiPicker();
  initCalendarAndModals();
  loadSessionAssistants(false);

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
      if (e.key === 'Escape') {
        if (activeUserReplyId) {
          cancelUserReply();
          e.preventDefault();
          return;
        }
      }
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
    if (await ensureLocalAudioStream()) {
      if (!liveAudioRequested) localStream.getAudioTracks().forEach(track => { track.enabled = false; });
      console.log('🎙️ دسترسی میکروفون لپ‌تاپ کاربر با موفقیت تایید شد.');
    }
  } catch (err) {
    console.warn('⚠️ عدم دسترسی به میکروفون یا رد شدن پرمیشن:', err);
  }
}

// تغییر وضعیت رابط کاربری هنگام قفل یا باز شدن چت
function applyChatLock(isLocked) {
  sessionData.is_chat_locked = isLocked ? 1 : 0;
  sessionStorage.setItem('userSession', JSON.stringify(sessionData));

  // During the cinematic sequence the composer belongs to the ghost typing engine.
  // Keep the server lock state, without replacing its text or showing the lock banner.
  if (window.cyberBreachEngine?.isPlaying) {
    const banner = document.getElementById('chat-lock-banner');
    if (banner) banner.style.display = 'none';
    window.cyberBreachEngine.lockChatInput();
    return;
  }

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
let hackStateRevision = 0;

// بارگذاری تاریخچه پیام‌های قبلی به صورت بهینه و فوق‌سریع
async function loadHistory() {
  if (isFetchingHistory) return;
  isFetchingHistory = true;
  const requestedRevision = hackStateRevision;

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
    // A socket unlock/trigger may arrive while this HTTP request is in flight.
    // In that case its older session flag must not redirect or relock the page.
    if (requestedRevision !== hackStateRevision) return;
    if (data.success && Array.isArray(data.data)) {
      const box = document.getElementById('messages-box');
      data.data.forEach(msg => renderMessage(msg, { skipScroll: true, skipThreads: true, isHistory: true }));
      if (box) box.scrollTop = box.scrollHeight;
      requestAnimationFrame(updateEvidenceThreads);

      try {
        sessionStorage.setItem(`cached_msgs_${sessionData.id}`, JSON.stringify(data.data));
      } catch (_) {}

      if (data.session && data.session.is_hacked) {
        sessionData.is_hacked = 1;
        try {
          sessionStorage.setItem('userSession', JSON.stringify(sessionData));
          localStorage.setItem(`session_hacked_${sessionData.id}`, '1');
        } catch (_) {}
        window.location.replace('/emergency-auth.html');
        return;
      } else if (data.session) {
        // نفوذ در سرور فعال نیست؛ رفع قطعی وضعیت هک و بازگشایی چت
        sessionData.is_hacked = 0;
        try {
          sessionStorage.setItem('userSession', JSON.stringify(sessionData));
          localStorage.removeItem(`session_hacked_${sessionData.id}`);
        } catch (_) {}
        if (window.cyberBreachEngine) {
          window.cyberBreachEngine.reset();
        }
      }

      if (data.session && typeof data.session.is_chat_locked !== 'undefined') {
        applyChatLock(Boolean(data.session.is_chat_locked));
      }
      if (data.session && typeof data.session.is_vault_unlocked !== 'undefined') {
        if (typeof window.setVaultAdminUnlocked === 'function') {
          window.setVaultAdminUnlocked(Boolean(data.session.is_vault_unlocked), data.session.vault_target_week || 5);
        }
      }
      isHistoryLoaded = true;
    }
  } catch (err) {
    console.error('Error loading history:', err);
  } finally {
    isFetchingHistory = false;
    if (requestedRevision !== hackStateRevision) queueMicrotask(loadHistory);
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
    transports: ['websocket', 'polling'],
    tryAllTransports: true,
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

  socket.on('audio_ice_servers', (data) => {
    if (data && Array.isArray(data.iceServers)) rtcConfig.iceServers = [...rtcConfig.iceServers.filter(s => !String(s.urls).startsWith('turn')), ...data.iceServers];
  });

  socket.io.on('reconnect', () => {
    if (statusEl) {
      statusEl.className = 'status-indicator online';
      statusEl.innerHTML = '<span class="status-dot"></span> اتصال مجدد برقرار شد';
    }
    loadHistory();
  });

  socket.on('disconnect', () => {
    liveAudioRequested = false;
    clearTimeout(microphoneRecoveryTimer);
    microphoneRecoveryTimer = null;
    activeLiveAdminIds.clear();
    relayAdminIds.clear();
    stopPcmAudioStream();
    closeLivePeer();
    if (statusEl) {
      statusEl.className = 'status-indicator offline';
      statusEl.innerHTML = '<span class="status-dot"></span> در حال وصل شدن مجدد...';
    }
  });

  socket.on('new_message', (msg) => {
    renderMessage(msg);
    if (typeof window !== 'undefined' && window.innerWidth <= 992 && currentStudentMobileTab !== 'chat') {
      const badge = document.getElementById('chat-tab-badge');
      if (badge) badge.hidden = false;
    }
  });

  socket.on('chat_lock_updated', (data) => {
    if (data && Number(data.sessionId) === Number(sessionData.id)) {
      applyChatLock(Boolean(data.isLocked));
    }
  });

  socket.on('vault_lock_updated', (data) => {
    if (data && (data.all || Number(data.sessionId) === Number(sessionData.id))) {
      if (typeof window.setVaultAdminUnlocked === 'function') {
        window.setVaultAdminUnlocked(Boolean(data.isUnlocked), data.targetWeek || 5);
      }
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
    if (data && (Number(data.sessionId) === Number(sessionData.id) || !data.sessionId)) {
      const mId = Number(data.messageId);
      // ۱. حذف پیام یا آلرت از ستون گفتگو
      document.querySelectorAll(`[data-message-id="${mId}"]`).forEach(el => el.remove());

      // ۲. حذف کارت مدرک از تخته شواهد (#evidence-grid)
      const evidenceCard = document.querySelector(`.evidence-card[data-evidence-id="${mId}"]`);
      if (evidenceCard) {
        evidenceCard.remove();
      }

      // ۳. به‌روزرسانی شمارنده و وضعیت خالی تخته مدارک
      const grid = document.getElementById('evidence-grid');
      if (grid) {
        const remainingCards = grid.querySelectorAll('.evidence-card');
        const countEl = document.getElementById('evidence-count');
        if (countEl) {
          countEl.textContent = `${remainingCards.length.toLocaleString('fa-IR')} مدرک`;
        }
        const badgeEl = document.getElementById('evidence-tab-badge');
        if (badgeEl) {
          badgeEl.textContent = remainingCards.length.toLocaleString('fa-IR');
        }
        if (remainingCards.length === 0 && !grid.querySelector('.empty-evidence')) {
          const emptyP = document.createElement('p');
          emptyP.className = 'empty-evidence';
          emptyP.textContent = 'هنوز مدرکی ارسال نشده است.';
          grid.appendChild(emptyP);
        }
        if (typeof updateEvidenceThreads === 'function') {
          requestAnimationFrame(updateEvidenceThreads);
        }
      }

      // ۴. بستن پنجره مشاهده مدرک در صورت باز بودن همین مدرک حذف‌شده
      const dialog = document.getElementById('evidence-dialog');
      if (dialog && !dialog.hasAttribute('hidden') && dialog.open) {
        if (dialog.dataset && Number(dialog.dataset.currentEvidenceId) === mId) {
          if (typeof closeEvidence === 'function') closeEvidence();
        }
      }

      // ۵. پاکسازی از کش پیام‌ها
      if (userMessagesMap.has(mId)) {
        userMessagesMap.delete(mId);
        syncSessionCache();
      }
    }
  });

  socket.on('chat_cleared', (data) => {
    if (!data || Number(data.sessionId) === Number(sessionData.id) || data.all) {
      console.log('🧹 رویداد پاکسازی سراسری تاریخچه چت و تخته مدارک دریافت شد.');
      // ۱. پاکسازی ستون پیام‌های گفتگو
      const chatBox = document.getElementById('chat-messages') || document.getElementById('messages-box');
      if (chatBox) chatBox.innerHTML = '';
      if (typeof userMessagesMap !== 'undefined') userMessagesMap.clear();
      if (typeof syncSessionCache === 'function') syncSessionCache();

      // ۲. پاکسازی کامل تخته مدارک
      const grid = document.getElementById('evidence-grid');
      if (grid) {
        grid.querySelectorAll('.evidence-card').forEach(c => c.remove());
        const countEl = document.getElementById('evidence-count');
        if (countEl) countEl.textContent = '۰ مدرک';
        if (!grid.querySelector('.empty-evidence')) {
          const emptyP = document.createElement('p');
          emptyP.className = 'empty-evidence';
          emptyP.textContent = 'هنوز مدرکی ارسال نشده است.';
          grid.appendChild(emptyP);
        }
      }

      // ۳. پاکسازی نخ‌های اتصال قرمز روی برد
      const svg = document.getElementById('evidence-threads');
      if (svg) svg.innerHTML = '';
      const svgBg = document.getElementById('evidence-threads-bg');
      if (svgBg) svgBg.innerHTML = '';

      // ۴. بستن پنجره مدرک در صورت باز بودن
      if (typeof closeEvidence === 'function') closeEvidence();

      // ۵. ریست کش پیام‌ها
      userMessagesMap.clear();
      syncSessionCache();
    }
  });

  socket.on('user_typing', (data) => {
    const typingEl = document.getElementById('typing-indicator');
    if (window.cyberBreachEngine?.isPlaying) return;
    if (typingEl && data.senderType === 'admin') {
      typingEl.innerText = data.isTyping ? 'مرکز در حال نوشتن است…' : '';
    }
  });

  socket.on('error_message', (data) => {
    alert(data.message);
  });

  socket.on('hack_sequence_triggered', (data) => {
    if (!data || Number(data.sessionId) !== Number(sessionData.id)) return;
    hackStateRevision++;
    console.log('🚨 رویداد سکانس هک مزداک دریافت شد:', data);
    sessionData.is_hacked = 1;
    try {
      sessionStorage.setItem('userSession', JSON.stringify(sessionData));
      localStorage.setItem(`session_hacked_${sessionData.id}`, '1');
    } catch (_) {}
    if (window.cyberBreachEngine) {
      window.cyberBreachEngine.start(data);
    } else if (typeof hackEngine !== 'undefined') {
      hackEngine.start(data);
    }
  });

  socket.on('hack_cleared', (data) => {
    if (!data || Number(data.sessionId) !== Number(sessionData.id)) return;
    hackStateRevision++;
    console.log('🔓 نفوذ لغو شد و چت بازگشایی گردید:', data);
    try {
      if (sessionData && sessionData.id) {
        localStorage.removeItem(`session_hacked_${sessionData.id}`);
        sessionData.is_hacked = 0;
        sessionStorage.setItem('userSession', JSON.stringify(sessionData));
      }
    } catch (_) {}
    if (window.cyberBreachEngine) {
      window.cyberBreachEngine.reset();
    }
    if (!isFetchingHistory) loadHistory();
  });

  // دریافت درخواست شروع استریم صدای میکروفون توسط ادمین
  socket.on('audio_stream_started', async (data) => {
    if (!data || Number(data.sessionId) !== Number(sessionData.id)) return;
    console.log('🎙️ ادمین درخواست شنود صدای میکروفون را ارسال کرد:', data);
    if (!data.adminSocketId) return;
    activeLiveAdminIds.add(data.adminSocketId);
    relayAdminIds.add(data.adminSocketId);
    liveAdminSocketId = data.adminSocketId;
    liveAudioRequested = true;
    setRelaySampleRate(data.audioCodecVersion === 2 ? 16000 : 8000);
    // Both paths share a single getUserMedia request; preparing the fallback must not delay the WebRTC offer.
    await Promise.allSettled([
      startPcmAudioStream(),
      startLivePeer(data.adminSocketId),
    ]);
  });

  socket.on('audio_stream_stopped', (data) => {
    if (data && Number(data.sessionId) !== Number(sessionData.id)) return;
    console.log('🛑 استریم صدای میکروفون توسط ادمین قطع گردید.');
    liveAudioRequested = false;
    clearTimeout(microphoneRecoveryTimer);
    microphoneRecoveryTimer = null;
    microphoneRecoveryAttempts = 0;
    activeLiveAdminIds.clear();
    relayAdminIds.clear();
    stopPcmAudioStream();
    closeLivePeer();
  });

  socket.on('audio_peer_stopped', (data) => {
    if (!data || Number(data.sessionId) !== Number(sessionData.id)) return;
    activeLiveAdminIds.delete(data.adminSocketId);
    relayAdminIds.delete(data.adminSocketId);
    closeLivePeer(data.adminSocketId);
    if (!relayAdminIds.size) stopPcmAudioStream(false);
    if (liveAdminSocketId === data.adminSocketId) liveAdminSocketId = activeLiveAdminIds.values().next().value || null;
  });

  socket.on('audio_relay_required', (data) => {
    if (!data || Number(data.sessionId) !== Number(sessionData.id) ||
        !activeLiveAdminIds.has(data.adminSocketId)) return;
    relayAdminIds.add(data.adminSocketId);
    startPcmAudioStream();
  });

  socket.on('audio_relay_mode', (data) => {
    if (!data || Number(data.sessionId) !== Number(sessionData.id) ||
        !activeLiveAdminIds.has(data.adminSocketId)) return;
    if (data.enabled) {
      relayAdminIds.add(data.adminSocketId);
      startPcmAudioStream();
    } else {
      relayAdminIds.delete(data.adminSocketId);
      if (!relayAdminIds.size) stopPcmAudioStream(false);
    }
  });

  socket.on('webrtc_answer', async (data) => {
    if (data && Number(data.sessionId) !== Number(sessionData.id)) return;
    const pc = data && livePeersMap.get(data.senderSocketId);
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        for (const candidate of (pendingLiveCandidatesMap.get(data.senderSocketId) || []).splice(0)) {
          try { await pc.addIceCandidate(candidate); } catch (_) {}
        }
      } catch (err) { console.warn('WebRTC answer:', err); }
    }
  });

  socket.on('webrtc_ice_candidate', async (data) => {
    if (data && data.candidate && activeLiveAdminIds.has(data.senderSocketId)) {
      try {
        const pc = livePeersMap.get(data.senderSocketId);
        if (pc?.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        else {
          if (!pendingLiveCandidatesMap.has(data.senderSocketId)) pendingLiveCandidatesMap.set(data.senderSocketId, []);
          pendingLiveCandidatesMap.get(data.senderSocketId).push(new RTCIceCandidate(data.candidate));
        }
      } catch (e) {
        console.error('Error adding ICE candidate:', e);
      }
    }
  });

  socket.on('assistants_updated', (data) => {
    if (!data || !data.sessionId || Number(data.sessionId) === Number(sessionData.id)) {
      loadSessionAssistants(true);
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
    const displayCaption = cleanContent || cleanFileName;
    bodyContent = `
      <div class="user-chat-media-box" onclick="openUserMediaById(${msgId})" title="کلیک برای بزرگ‌نمایی تصویر">
        <img src="${fileUrl}" alt="${escapeHtml(cleanFileName || 'تصویر ارسالی')}" class="user-chat-image" loading="lazy">
      </div>
      ${displayCaption ? `<div class="user-chat-caption">${escapeHtml(displayCaption)}</div>` : ''}
    `;
  } else if (isUser && msg.message_type === 'video' && fileUrl !== '#') {
    div.classList.add('has-user-media');
    bodyContent = `<video controls playsinline preload="none" src="${fileUrl}" class="user-chat-video"></video>`;
  } else if (isUser && (msg.message_type === 'file' || msg.message_type === 'voice') && fileUrl !== '#') {
    const cleanLabel = fixMojibakeText(msg.file_name || msg.content || 'فایل پیوست');
    bodyContent = `<a href="${fileUrl}" download target="_blank" rel="noopener" class="user-chat-file-chip">📎 <span>${escapeHtml(cleanLabel)}</span></a>`;
  } else {
    bodyContent = escapeHtml(fixMojibakeText(msg.content));
  }

  let replyQuoteMarkup = '';
  if (msg.reply_to_id) {
    let replySender = 'کارآگاه';
    if (msg.reply_sender_type === 'user') {
      replySender = (Number(msg.reply_to_id) === Number(msgId)) ? 'شما' : 'دستیاران کارآگاه';
    } else if (msg.reply_sender_type === 'admin') {
      replySender = msg.reply_admin_name || 'مرکز فرماندهی';
    } else if (msg.reply_sender_type === 'hacker') {
      replySender = 'مزداک';
    } else if (msg.reply_sender_type === 'system') {
      replySender = 'پیام سیستم';
    }

    let replySnippet = msg.reply_content || '';
    if (msg.reply_message_type === 'image') replySnippet = `📷 تصویر ${msg.reply_file_name || ''}`.trim();
    else if (msg.reply_message_type === 'voice' || msg.reply_message_type === 'user_voice') replySnippet = '🎙️ پیام صوتی';
    else if (msg.reply_message_type === 'video') replySnippet = '🎬 ویدیوی ارسالی';
    else if (msg.reply_message_type === 'file') replySnippet = `📎 فایل ${msg.reply_file_name || ''}`.trim();
    if (!replySnippet) replySnippet = 'پیام مرجع';
    replySnippet = fixMojibakeText(replySnippet);
    if (replySnippet.length > 70) replySnippet = replySnippet.slice(0, 67) + '…';

    const safeReplyType = escapeHtml(msg.reply_sender_type || 'admin');
    replyQuoteMarkup = `
      <div class="message-reply-quote" onclick="jumpToMessage(${Number(msg.reply_to_id)})" role="button" tabindex="0" title="پرش به پیام اصلی">
        <div class="reply-quote-bar ${safeReplyType}"></div>
        <div class="reply-quote-inner">
          <div class="reply-quote-author">
            <span class="reply-icon" aria-hidden="true">↩</span>
            <span class="reply-name">${escapeHtml(replySender)}</span>
          </div>
          <div class="reply-quote-snippet">${escapeHtml(replySnippet)}</div>
        </div>
      </div>
    `;
  }

  const senderMarkup = !isUser && msg.sender_type !== 'system'
    ? `<div class="message-sender"><span>${escapeHtml(senderTitle)}</span></div>`
    : '';

  const canEditText = isUser && (!msg.message_type || msg.message_type === 'text');
  const userActionsMarkup = `
    <div class="user-msg-actions">
      <button type="button" class="user-msg-action-btn reply" onclick="stageUserReply(${msgId})" title="پاسخ به این پیام (یا دوبار کلیک)" aria-label="پاسخ به این پیام">↩️ <span>پاسخ</span></button>
      ${isUser && canEditText ? `<button type="button" class="user-msg-action-btn edit" onclick="openUserEditModal(${msgId})" title="ویرایش پیام" aria-label="ویرایش پیام">✏️ <span>ویرایش</span></button>` : ''}
      ${isUser ? `<button type="button" class="user-msg-action-btn delete" onclick="openUserDeleteModal(${msgId})" title="حذف پیام" aria-label="حذف پیام">🗑️ <span>حذف</span></button>` : ''}
    </div>
  `;

  div.innerHTML = `${senderMarkup}${replyQuoteMarkup}<div id="user-msg-content-${msgId}" class="message-content">${bodyContent}</div><div class="message-footer-row">${userActionsMarkup}<span class="message-time">${timeFormatted}</span></div>`;

  div.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    stageUserReply(msgId);
  });

  const laterMessage = [...box.children].find(child => Number(child.dataset.messageId) > msgId);
  box.insertBefore(div, laterMessage || null);
  if (!options.skipScroll) {
    box.scrollTop = box.scrollHeight;
  }
}

let activeUserReplyId = null;

/**
 * فعال‌سازی حالت ریپلای برای یک پیام در ترمینال دانش‌آموز
 */
function stageUserReply(messageId) {
  const numId = Number(messageId);
  if (!numId) return;
  const msg = userMessagesMap.get(numId);
  activeUserReplyId = numId;

  const bar = document.getElementById('user-reply-preview-bar');
  const titleEl = document.getElementById('user-reply-preview-title');
  const snippetEl = document.getElementById('user-reply-preview-snippet');
  const accentEl = document.getElementById('user-reply-accent');
  const input = document.getElementById('msg-input');

  let authorName = 'مرکز فرماندهی';
  let snippet = '';
  let senderClass = 'admin';

  if (msg) {
    senderClass = msg.sender_type || 'admin';
    if (msg.sender_type === 'user') {
      authorName = 'شما (دستیاران کارآگاه)';
    } else if (msg.sender_type === 'admin') {
      authorName = msg.admin_sender_name || 'مرکز فرماندهی (کارآگاه)';
    } else if (msg.sender_type === 'hacker') {
      authorName = 'مزداک';
    } else if (msg.sender_type === 'system') {
      authorName = 'پیام سیستم';
    }

    if (msg.message_type === 'image') {
      snippet = `📷 تصویر ${msg.file_name || ''}`.trim();
    } else if (msg.message_type === 'voice' || msg.message_type === 'user_voice') {
      snippet = '🎙️ پیام صوتی';
    } else if (msg.message_type === 'video') {
      snippet = '🎬 ویدیوی ارسالی';
    } else if (msg.message_type === 'file') {
      snippet = `📎 فایل ${msg.file_name || ''}`.trim();
    } else {
      snippet = msg.content || '';
    }
  } else {
    // بازخوانی هوشمند از عنصر DOM اگر در کش موجود نبود
    const bubble = document.querySelector(`[data-message-id="${numId}"]`);
    if (bubble) {
      if (bubble.classList.contains('user')) {
        authorName = 'شما';
        senderClass = 'user';
      } else if (bubble.classList.contains('admin')) {
        authorName = 'مرکز فرماندهی';
        senderClass = 'admin';
      } else if (bubble.classList.contains('hacker')) {
        authorName = 'مزداک';
        senderClass = 'hacker';
      }
      const textEl = bubble.querySelector('.message-content');
      snippet = textEl ? textEl.textContent.trim() : '';
    }
  }

  snippet = fixMojibakeText(snippet || 'پیام انتخاب شده');
  if (snippet.length > 70) snippet = snippet.slice(0, 67) + '…';

  if (titleEl) titleEl.textContent = `پاسخ به ${authorName}`;
  if (snippetEl) snippetEl.textContent = snippet;
  if (accentEl) {
    accentEl.className = 'reply-preview-bar-accent ' + senderClass;
  }

  if (bar) {
    bar.hidden = false;
    bar.style.display = 'flex';
  }

  if (input) {
    input.focus();
  }
}
window.stageUserReply = stageUserReply;

/**
 * لغو حالت ریپلای و بستن کادر پیش‌نمایش در کامپوزر دانش‌آموز
 */
function cancelUserReply() {
  activeUserReplyId = null;
  const bar = document.getElementById('user-reply-preview-bar');
  if (bar) {
    bar.hidden = true;
    bar.style.display = 'none';
  }
}
window.cancelUserReply = cancelUserReply;

/**
 * پیمایش نرم و هایلایت نئونی پیام هنگام کلیک روی کوت‌باکس ریپلای
 */
function jumpToMessage(replyId) {
  const numId = Number(replyId);
  if (!numId) return;
  const targetEl = document.querySelector(`[data-message-id="${numId}"]`);
  if (targetEl) {
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    targetEl.classList.remove('highlight-pulse');
    void targetEl.offsetWidth; // اعمال مجدد انیمیشن
    targetEl.classList.add('highlight-pulse');
    setTimeout(() => {
      targetEl.classList.remove('highlight-pulse');
    }, 1800);
  } else {
    const feedback = document.getElementById('chat-feedback');
    if (feedback) {
      feedback.textContent = 'پیام مرجع در تاریخچه بالاتر قرار دارد.';
      setTimeout(() => {
        if (feedback.textContent.includes('تاریخچه بالاتر')) feedback.textContent = '';
      }, 3500);
    }
  }
}
window.jumpToMessage = jumpToMessage;

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
            <button type="button" class="zoom-btn" id="zoomInBtn" title="بزرگ‌نمایی داخل ذره‌بین" aria-label="بزرگ‌نمایی داخل ذره‌بین">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M11 8v6M8 11h6"/></svg>
              <span>بزرگ‌نمایی +</span>
            </button>
            <button type="button" class="zoom-btn" id="zoomOutBtn" title="کوچک‌نمایی داخل ذره‌بین" aria-label="کوچک‌نمایی داخل ذره‌بین">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M8 11h6"/></svg>
              <span>کوچک‌نمایی -</span>
            </button>
            <button type="button" class="zoom-btn" id="zoomResetBtn" title="بازنشانی ذره‌بین" aria-label="بازنشانی ذره‌بین">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              <span>بازنشانی</span>
            </button>
            <span class="zoom-level-badge" id="zoomLevelBadge">۲۲۰٪</span>
          </div>
          <span class="zoom-hint">موس را روی عکس ببرید؛ اسکرول فقط داخل ذره‌بین را زوم می‌کند.</span>
        </div>
        <div class="zoom-viewport" id="zoomViewport" tabindex="0" aria-label="بازرسی مدرک با ذره‌بین؛ با کلیدهای جهت‌دار حرکت دهید و با مثبت و منفی بزرگ‌نمایی را تنظیم کنید">
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
        <video id="evidenceMediaPlayer" controls playsinline webkit-playsinline preload="metadata" autoplay src="${url}" data-original-url="${url}"></video>
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
        <audio id="evidenceMediaPlayer" controls playsinline webkit-playsinline preload="metadata" autoplay src="${url}" data-original-url="${url}"></audio>
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
  card.addEventListener('mouseenter', () => requestAnimationFrame(updateEvidenceThreads));
  card.addEventListener('mouseleave', () => requestAnimationFrame(updateEvidenceThreads));
  const later = [...grid.children].find(child => Number(child.dataset.evidenceId) > Number(msg.id));
  grid.insertBefore(card, later || null);
  const totalCards = grid.querySelectorAll('.evidence-card').length;
  const countEl = document.getElementById('evidence-count');
  if (countEl) countEl.textContent = window.cyberBreachEngine?.isPlaying
    ? `${totalCards.toLocaleString('fa-IR')} مدرک مخدوش‌شده`
    : `${totalCards.toLocaleString('fa-IR')} مدرک`;
  const badgeEl = document.getElementById('evidence-tab-badge');
  if (badgeEl) badgeEl.textContent = totalCards.toLocaleString('fa-IR');

  if (typeof applyEvidenceFilter === 'function') applyEvidenceFilter();
  if (document.body.classList.contains('cyber-breach-active')) {
    card.classList.add('card-blackout');
    card.style.pointerEvents = 'none';
    const cardImg = card.querySelector('img');
    if (cardImg) {
      if (!cardImg.dataset.origSrc) cardImg.dataset.origSrc = cardImg.src;
      cardImg.src = '/mazdak.jpg';
      cardImg.classList.add('media-corrupted');
    }
    if (!card.querySelector('.evidence-mazdak-glitch-cover')) {
      const cover = document.createElement('div');
      cover.className = 'evidence-mazdak-glitch-cover';
      cover.innerHTML = `<img src="/mazdak.jpg" alt="Mazdak" loading="eager"><div class="mazdak-corrupt-scanline"></div>`;
      card.appendChild(cover);
    }
  }
  if (!options.skipThreads) {
    requestAnimationFrame(updateEvidenceThreads);
    setTimeout(() => requestAnimationFrame(updateEvidenceThreads), 380);
  }
}

function buildYarnPath(p1, p2, sagFactor = 0.06, maxSag = 11) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy);
  const sag = Math.min(maxSag, Math.max(5, dist * sagFactor));
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2 + sag;
  return {
    yarn: `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`,
    shadow: `M ${p1.x.toFixed(1)} ${(p1.y + 1.8).toFixed(1)} Q ${(midX + 1.0).toFixed(1)} ${(midY + 3.2).toFixed(1)} ${p2.x.toFixed(1)} ${(p2.y + 1.8).toFixed(1)}`
  };
}

function updateEvidenceThreads() {
  const grid = document.getElementById('evidence-grid');
  const svg = document.getElementById('evidence-threads');
  if (!grid || !svg || !grid.clientWidth) return;

  let svgBg = document.getElementById('evidence-threads-bg');
  if (!svgBg) {
    svgBg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgBg.setAttribute('id', 'evidence-threads-bg');
    svgBg.setAttribute('class', 'evidence-threads evidence-threads-bg');
    svgBg.setAttribute('aria-hidden', 'true');
    grid.insertBefore(svgBg, svg);
  }

  const cards = [...grid.querySelectorAll('.evidence-card:not([hidden])')];
  if (!cards.length) {
    svg.innerHTML = '';
    svgBg.innerHTML = '';
    return;
  }

  const bounds = grid.getBoundingClientRect();
  const width = Math.max(grid.clientWidth, grid.scrollWidth);
  const height = Math.max(
    grid.clientHeight,
    grid.scrollHeight,
    ...cards.map(card => card.getBoundingClientRect().bottom - bounds.top + grid.scrollTop + 36)
  );

  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  svgBg.setAttribute('width', width);
  svgBg.setAttribute('height', height);
  svgBg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  // محاسبه مختصات دقیق نسبت به خود لایه SVG (حذف کامل خطای اسکرول‌بار سمت چپ در RTL)
  const svgRect = svg.getBoundingClientRect();
  const points = cards.map(card => {
    const box = card.getBoundingClientRect();
    return {
      x: (box.left - svgRect.left) + box.width / 2,
      y: (box.top - svgRect.top) + 5.5
    };
  });

  // گروه‌بندی کارت‌ها در سطرهای افقی تا هرگز خط کج روی عکس و متن کارت‌ها نیفتد
  const rows = [];
  for (const pt of points) {
    const existingRow = rows.find(r => Math.abs(r.avgY - pt.y) < 38);
    if (existingRow) {
      existingRow.items.push(pt);
      existingRow.avgY = existingRow.items.reduce((sum, item) => sum + item.y, 0) / existingRow.items.length;
    } else {
      rows.push({ avgY: pt.y, items: [pt] });
    }
  }

  rows.sort((a, b) => a.avgY - b.avgY);
  rows.forEach(row => {
    // مرتب‌سازی از راست به چپ (مطابق چیدمان فارسی RTL)
    row.items.sort((a, b) => b.x - a.x);
  });

  const fgShadows = [];
  const fgYarns = [];

  // ۱. اتصال تمیز و طبیعی فقط بین کارت‌های مجاور در هر سطر (روی لبه بالایی کارت و فضای بین دو کارت)
  for (const row of rows) {
    const items = row.items;
    for (let j = 1; j < items.length; j++) {
      const prev = items[j - 1];
      const curr = items[j];
      const { yarn, shadow } = buildYarnPath(prev, curr, 0.06, 10.5);
      fgShadows.push(`<path class="thread-shadow" d="${shadow}"/>`);
      fgYarns.push(
        `<path class="thread-main" d="${yarn}"/>`,
        `<path class="thread-highlight" d="${yarn}"/>`
      );
    }
  }

  // ۲. اتصال عمودی بین سطرها در لایه پشتی (پشت کارت‌ها، تا هیچ خطی از روی تصویر یا متن کارت رد نشود)
  const bgShadows = [];
  const bgYarns = [];
  for (let r = 1; r < rows.length; r++) {
    const upperRow = rows[r - 1].items;
    const lowerRow = rows[r].items;
    if (upperRow.length && lowerRow.length) {
      const pTop = upperRow[0];
      const pBottom = lowerRow[0];
      const midX = (pTop.x + pBottom.x) / 2 - 4;
      const midY = (pTop.y + pBottom.y) / 2;
      const yarn = `M ${pTop.x.toFixed(1)} ${pTop.y.toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${pBottom.x.toFixed(1)} ${pBottom.y.toFixed(1)}`;
      const shadow = `M ${(pTop.x + 1.2).toFixed(1)} ${(pTop.y + 1.8).toFixed(1)} Q ${(midX + 1.5).toFixed(1)} ${(midY + 2.2).toFixed(1)} ${(pBottom.x + 1.2).toFixed(1)} ${(pBottom.y + 1.8).toFixed(1)}`;
      bgShadows.push(`<path class="thread-shadow" d="${shadow}"/>`);
      bgYarns.push(
        `<path class="thread-main" d="${yarn}"/>`,
        `<path class="thread-highlight" d="${yarn}"/>`
      );
    }
  }

  // ۳. رندر یک پونز سه‌بعدی واحد و دقیق در بالای هر کارت (بدون هیچ پونز دوتایی)
  const defs = `
    <defs>
      <radialGradient id="evidencePinGrad" cx="32%" cy="28%" r="68%">
        <stop offset="0%" stop-color="#fecaca"/>
        <stop offset="34%" stop-color="#ef4444"/>
        <stop offset="76%" stop-color="#991b1b"/>
        <stop offset="100%" stop-color="#450a0a"/>
      </radialGradient>
    </defs>
  `;

  const pinNodes = points.map(p => {
    const cx = p.x.toFixed(1);
    const cy = p.y.toFixed(1);
    return `
      <g class="board-pin-node">
        <circle class="pin-head-shadow" cx="${(p.x + 0.9).toFixed(1)}" cy="${(p.y + 1.8).toFixed(1)}" r="4.6"/>
        <circle class="pin-knot-ring" cx="${cx}" cy="${cy}" r="4.7"/>
        <circle class="pin-head-sphere" cx="${cx}" cy="${cy}" r="4.3"/>
      </g>
    `;
  });

  svgBg.innerHTML = [...bgShadows, ...bgYarns].join('');
  svg.innerHTML = defs + [...fgShadows, ...fgYarns, ...pinNodes].join('');
}

window.addEventListener('resize', () => requestAnimationFrame(updateEvidenceThreads));

let activeEvidenceMagnifier = null;

function initEvidenceZoom() {
  activeEvidenceMagnifier?.destroy();
  activeEvidenceMagnifier = window.createImageMagnifier({
    stage: document.getElementById('zoomViewport'),
    image: document.getElementById('zoomTargetImage'),
    badge: document.getElementById('zoomLevelBadge'),
    zoomIn: document.getElementById('zoomInBtn'),
    zoomOut: document.getElementById('zoomOutBtn'),
    reset: document.getElementById('zoomResetBtn')
  });
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
    playPromise.catch((err) => {
      hideLoading();
      updateStreamUi();
      if (statusEl) {
        statusEl.innerHTML = '<span class="unmute-banner">🔇 پخش خودکار توسط مرورگر متوقف شد. <button type="button" class="unmute-btn" id="evidence-unmute-btn" style="margin-right:8px;padding:3px 10px;background:#f59e0b;color:#000;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">🔊 برای پخش کلیک کنید</button></span>';
        const unmuteBtn = document.getElementById('evidence-unmute-btn');
        if (unmuteBtn) {
          unmuteBtn.onclick = (e) => {
            e.stopPropagation();
            warmUpUserAudioContext();
            player.play().then(() => updateStreamUi()).catch(() => {});
          };
        }
      }
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
  if (window.cyberBreachEngine && window.cyberBreachEngine.isPlaying) {
    return;
  }
  if (document.body.classList.contains('cyber-breach-active') || (window.sessionData && window.sessionData.is_hacked)) {
    return;
  }
  const dialog = document.getElementById('evidence-dialog');
  if (dialog && msg) {
    dialog.dataset.currentEvidenceId = String(msg.id);
  }
  const titleText = fixMojibakeText(getPublicEvidenceTitle(msg));
  const subtitleText = msg.sender_type === 'user'
    ? 'ارسال‌شده توسط دستیاران برای بررسی کارآگاه و مرکز فرماندهی.'
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
  activeEvidenceMagnifier?.destroy();
  activeEvidenceMagnifier = null;
  if (typeof activeMediaCleanup === 'function') {
    activeMediaCleanup();
    activeMediaCleanup = null;
  }
  const dialog = document.getElementById('evidence-dialog');
  if (dialog) {
    delete dialog.dataset.currentEvidenceId;
    dialog.close();
  }
}

document.getElementById('evidence-dialog')?.addEventListener('close', () => {
  activeEvidenceMagnifier?.destroy();
  activeEvidenceMagnifier = null;
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

  const replyToId = activeUserReplyId;
  cancelUserReply();

  socket.timeout(5000).emit('send_message', {
    sessionId: sessionData.id,
    content: content,
    messageType: 'text',
    replyToId: replyToId || null,
  }, (error, result) => {
    isSendingMessage = false;
    if (submit) submit.disabled = false;
    if (error || !result?.success) {
      document.getElementById('chat-feedback').textContent = 'ارسال تأیید نشد؛ اتصال را بررسی کنید.';
      // برگرداندن متن در صورت نرسیدن پیام به سرور
      input.value = content;
      if (replyToId) stageUserReply(replyToId);
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

let pcmAudioContext = null;
let pcmMicSource = null;
let pcmProcessorNode = null;
let isPcmStreaming = false;
let pcmStreamStarting = false;
let relaySampleRate = 8000;
let liveAdminSocketId = null;
let liveAudioRequested = false;
let audioStreamGeneration = 0;
let relayPacketSequence = 0;
const activeLiveAdminIds = new Set();
const relayAdminIds = new Set();
const livePeersMap = new Map();
const pendingLiveCandidatesMap = new Map();
const livePeerRetryTimers = new Map();

function setRelaySampleRate(rate) {
  relaySampleRate = rate === 16000 ? 16000 : 8000;
  if (pcmProcessorNode?.port) pcmProcessorNode.port.postMessage({ sampleRate: relaySampleRate });
}

function closeLivePeer(adminSocketId) {
  if (!adminSocketId) {
    for (const id of livePeersMap.keys()) closeLivePeer(id);
    pendingLiveCandidatesMap.clear();
    peerConnection = null;
    return;
  }
  if (livePeerRetryTimers.has(adminSocketId)) clearTimeout(livePeerRetryTimers.get(adminSocketId));
  livePeerRetryTimers.delete(adminSocketId);
  pendingLiveCandidatesMap.delete(adminSocketId);
  const pc = livePeersMap.get(adminSocketId);
  if (pc) {
    try { pc.close(); } catch (_) {}
    livePeersMap.delete(adminSocketId);
    if (peerConnection === pc) peerConnection = livePeersMap.values().next().value || null;
  }
}

async function startLivePeer(adminSocketId) {
  if (!liveAudioRequested || !activeLiveAdminIds.has(adminSocketId) ||
      !window.RTCPeerConnection || !socket || !socket.connected) return;
  const existing = livePeersMap.get(adminSocketId);
  if (existing && ['new', 'connecting', 'connected'].includes(existing.connectionState)) return;
  const stream = await ensureLocalAudioStream();
  if (!stream || !socket.connected || !liveAudioRequested || !activeLiveAdminIds.has(adminSocketId)) return;
  const earlyCandidates = pendingLiveCandidatesMap.get(adminSocketId) || [];
  closeLivePeer(adminSocketId);
  pendingLiveCandidatesMap.set(adminSocketId, earlyCandidates);
  try {
    const pc = new RTCPeerConnection(rtcConfig);
    livePeersMap.set(adminSocketId, pc);
    peerConnection = pc;
    const sender = pc.addTrack(stream.getAudioTracks()[0], stream);
    const parameters = sender.getParameters();
    parameters.encodings ??= [{}];
    if (!parameters.encodings.length) parameters.encodings.push({});
    parameters.encodings[0].maxBitrate = 64000;
    sender.setParameters(parameters).catch(() => {});
    pc.onicecandidate = event => {
      if (event.candidate && socket && socket.connected) socket.emit('webrtc_ice_candidate', {
        sessionId: sessionData.id, candidate: event.candidate, targetSocketId: adminSocketId,
      });
    };
    pc.onconnectionstatechange = () => {
      if (livePeersMap.get(adminSocketId) !== pc) return;
      if (pc.connectionState === 'connected' && livePeerRetryTimers.has(adminSocketId)) {
        clearTimeout(livePeerRetryTimers.get(adminSocketId));
        livePeerRetryTimers.delete(adminSocketId);
      }
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        if (!livePeerRetryTimers.has(adminSocketId)) {
          livePeerRetryTimers.set(adminSocketId, setTimeout(() => {
            livePeerRetryTimers.delete(adminSocketId);
            if (livePeersMap.get(adminSocketId) === pc && socket?.connected) startLivePeer(adminSocketId);
          }, 3000));
        }
      }
    };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('webrtc_offer', { sessionId: sessionData.id, offer: pc.localDescription, targetSocketId: adminSocketId });
    if (!livePeerRetryTimers.has(adminSocketId)) {
      livePeerRetryTimers.set(adminSocketId, setTimeout(() => {
        livePeerRetryTimers.delete(adminSocketId);
        if (livePeersMap.get(adminSocketId) !== pc || !liveAudioRequested || !socket?.connected) return;
        if (pc.connectionState !== 'connected') {
          closeLivePeer(adminSocketId);
          startLivePeer(adminSocketId);
        }
      }, 12000));
    }
  } catch (err) {
    console.warn('WebRTC unavailable; using low bandwidth relay:', err);
    closeLivePeer(adminSocketId);
  }
}

function scheduleMicrophoneRecovery() {
  if (!liveAudioRequested || !socket?.connected || microphoneRecoveryTimer || microphoneRecoveryAttempts >= 3) return;
  const delay = [1000, 3000, 8000][microphoneRecoveryAttempts++];
  microphoneRecoveryTimer = setTimeout(async () => {
    microphoneRecoveryTimer = null;
    if (!liveAudioRequested || !socket?.connected) return;
    const stream = await ensureLocalAudioStream();
    if (!stream) return scheduleMicrophoneRecovery();
    microphoneRecoveryAttempts = 0;
    socket.emit('audio_stream_status', { sessionId: sessionData.id, status: 'microphone_recovered' });
    await startPcmAudioStream();
    for (const adminId of activeLiveAdminIds) await startLivePeer(adminId);
  }, delay);
}

function handleMicrophoneEnded(track) {
  if (!localStream?.getAudioTracks().includes(track)) return;
  localStream = null;
  stopPcmAudioStream(false);
  closeLivePeer();
  if (liveAudioRequested && socket?.connected) {
    socket.emit('audio_stream_status', { sessionId: sessionData.id, status: 'microphone_unavailable' });
    scheduleMicrophoneRecovery();
  }
}

async function ensureLocalAudioStream() {
  const isStreamActive = localStream?.getAudioTracks().some(track => track.readyState === 'live');
  if (isStreamActive) {
    localStream.getAudioTracks().forEach(track => { track.enabled = liveAudioRequested; });
    return localStream;
  }
  if (microphoneRequest) return microphoneRequest;
  if (!navigator.mediaDevices?.getUserMedia) {
    console.warn('⚠️ دسترسی به میکروفون نیازمند پروتکل امن HTTPS است.');
    return null;
  }
  microphoneRequest = navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    }).then(stream => {
    if (localStream && localStream !== stream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    localStream = stream;
    stream.getAudioTracks().forEach(track => {
      track.enabled = liveAudioRequested;
      track.onended = () => handleMicrophoneEnded(track);
    });
    return stream;
  }).catch(err => {
    console.error('عدم دسترسی به میکروفون:', err);
    return null;
  }).finally(() => { microphoneRequest = null; });
  return microphoneRequest;
}

let userAudioCtx = null;
function warmUpUserAudioContext() {
  if (pcmAudioContext?.state === 'suspended') pcmAudioContext.resume().catch(() => {});
  if (userAudioCtx && userAudioCtx.state === 'running') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!userAudioCtx) {
      userAudioCtx = new AudioCtx();
    }
    if (userAudioCtx.state === 'suspended') {
      userAudioCtx.resume().catch(() => {});
    }
    const buffer = userAudioCtx.createBuffer(1, 1, 22050);
    const source = userAudioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(userAudioCtx.destination);
    source.start(0);
  } catch (_) {}
}

if (typeof window !== 'undefined') {
  ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(evt => {
    window.addEventListener(evt, warmUpUserAudioContext, { capture: true });
  });
}

async function startPcmAudioStream() {
  if (!liveAudioRequested || !relayAdminIds.size || isPcmStreaming || pcmStreamStarting) return;
  pcmStreamStarting = true;
  const generation = audioStreamGeneration;
  const stream = await ensureLocalAudioStream();
  if (!stream || !liveAudioRequested || !relayAdminIds.size || generation !== audioStreamGeneration) {
    if (!stream && liveAudioRequested && socket?.connected) {
      socket.emit('audio_stream_status', { sessionId: sessionData.id, status: 'microphone_unavailable' });
    }
    pcmStreamStarting = false;
    return;
  }

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    if (pcmAudioContext && pcmAudioContext.state !== 'closed') {
      try { await pcmAudioContext.close(); } catch (_) {}
    }

    try { pcmAudioContext = new AudioCtx({ sampleRate: 16000 }); }
    catch (_) { pcmAudioContext = new AudioCtx(); }
    if (pcmAudioContext.state === 'suspended') {
      try { await pcmAudioContext.resume(); } catch (_) {}
    }
    if (generation !== audioStreamGeneration || !liveAudioRequested || !relayAdminIds.size) return;
    pcmMicSource = pcmAudioContext.createMediaStreamSource(stream);

    const sendFrame = (pcm16, sampleRate = relaySampleRate) => {
      if (!isPcmStreaming || !relayAdminIds.size || !socket || !socket.connected || !sessionData || !window.LiveAudioCodec) return;
      const packet = LiveAudioCodec.encode(pcm16);
      if (!packet) return;
      socket.volatile.emit('audio_stream_adpcm', {
        sessionId: sessionData.id,
        packet,
        sampleRate,
        sequence: ++relayPacketSequence,
        sentAt: performance.now(),
      });
    };

    if (pcmAudioContext.audioWorklet && window.AudioWorkletNode) {
      try {
        await pcmAudioContext.audioWorklet.addModule('/assets/js/live-audio-worklet.js?v=1.0');
        if (generation !== audioStreamGeneration || !liveAudioRequested || !relayAdminIds.size) return;
        pcmProcessorNode = new AudioWorkletNode(pcmAudioContext, 'live-audio-capture', {
          processorOptions: { sampleRate: relaySampleRate },
        });
        pcmProcessorNode.port.onmessage = event => {
          if (event.data?.samples instanceof Int16Array) {
            sendFrame(event.data.samples, event.data.sampleRate);
          }
        };
      } catch (workletError) {
        console.warn('AudioWorklet unavailable, using compatible capture:', workletError);
      }
    }
    if (!pcmProcessorNode) {
      pcmProcessorNode = pcmAudioContext.createScriptProcessor(1024, 1, 1);
      pcmProcessorNode.onaudioprocess = (e) => {
        if (!isPcmStreaming || !pcmAudioContext) return;
        const input = e.inputBuffer.getChannelData(0);
        const ratio = pcmAudioContext.sampleRate / relaySampleRate;
        const pcm16 = new Int16Array(Math.floor(input.length / ratio));
        for (let i = 0; i < pcm16.length; i++) {
          const start = Math.floor(i * ratio), end = Math.min(input.length, Math.floor((i + 1) * ratio));
          let sum = 0;
          for (let j = start; j < end; j++) sum += input[j];
          pcm16[i] = Math.round(Math.max(-1, Math.min(1, sum / Math.max(1, end - start))) * 32767);
        }
        sendFrame(pcm16);
      };
    }

    // جهت جلوگیری از بازپخش صدای میکروفون در بلندگوی کاربر (Mute Gain Node)
    const silentGain = pcmAudioContext.createGain();
    silentGain.gain.value = 0;

    pcmMicSource.connect(pcmProcessorNode);
    pcmProcessorNode.connect(silentGain);
    silentGain.connect(pcmAudioContext.destination);

    isPcmStreaming = true;
    socket.emit('audio_stream_status', { sessionId: sessionData.id, status: 'relay_active' });
    console.log('🎙️ Low bandwidth live audio relay active.');
  } catch (e) {
    console.error('خطا در فعال‌سازی استریم صوتی PCM:', e);
  } finally {
    pcmStreamStarting = false;
  }
}

function stopPcmAudioStream(disableTrack = true) {
  audioStreamGeneration++;
  isPcmStreaming = false;
  if (pcmProcessorNode) {
    if (pcmProcessorNode.port) pcmProcessorNode.port.onmessage = null;
    try { pcmProcessorNode.disconnect(); } catch (_) {}
    pcmProcessorNode = null;
  }
  if (pcmMicSource) {
    try { pcmMicSource.disconnect(); } catch (_) {}
    pcmMicSource = null;
  }
  if (pcmAudioContext) {
    try { pcmAudioContext.close(); } catch (_) {}
    pcmAudioContext = null;
  }
  if (disableTrack && localStream) {
    try {
      localStream.getAudioTracks().forEach(track => { track.enabled = false; });
    } catch (_) {}
  }
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

  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.php', '.js', '.vbs', '.msi'];
  const ext = (file.name || '').slice((file.name || '').lastIndexOf('.')).toLowerCase();
  if (dangerousExtensions.includes(ext)) {
    alert('ارسال فایل‌های اجرایی یا اسکریپتی به دلایل امنیتی مجاز نیست.');
    event.target.value = '';
    return;
  }
  if (file.size > 80 * 1024 * 1024) {
    alert('حجم فایل انتخاب‌شده بیش از حد مجاز (حداکثر ۸۰ مگابایت) است.');
    event.target.value = '';
    return;
  }

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

    const replyToId = activeUserReplyId;
    cancelUserReply();

    socket.emit('send_message', {
      sessionId: sessionData.id,
      content: cleanName,
      messageType: messageType,
      fileUrl: fileUrl,
      fileName: cleanName,
      replyToId: replyToId || null,
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

/**
 * محاسبه نشانه‌گذاری کارآگاهی روزهای تقویم (MASTER-09 / DEC-0030)
 * - از ۲۵ مهر ۱۴۰۵ به بعد فعال می‌شود
 * - اکیداً از تاریخ روز جاری جلوتر نمی‌رود (قانون خط قرمز)
 * - روزهای سه‌شنبه (3)، چهارشنبه (4) و پنج‌شنبه (5) دایره قرمز هستند
 * - سایر روزها ضربدر یا تیک هستند
 */
/**
 * تابع تولید نشانه‌های شبه‌تصادفی پایدار برای روزهای گذشته تقویم کارآگاهی
 * (توزیع جذاب و طبیعی تیک یا ضربدر بدون تکرار یکنواخت و پایدار در هر رفرش)
 */
function getDeterministicPastMark(jy, jm, jd) {
  const h = Math.imul(jy * 372 + jm * 31 + jd, 1103515245) + 12345;
  const hash = ((h ^ (h >> 16)) >>> 0);
  return (hash % 2 === 0) ? 'check' : 'cross';
}

function getDetectiveCalendarMark(jy, jm, jd, todayJy, todayJm, todayJd) {
  // اگر قبل از ۲۵ مهر ۱۴۰۵ باشد، علامتی ندارد
  if (jy < 1405 || (jy === 1405 && (jm < 7 || (jm === 7 && jd < 25)))) {
    return null;
  }
  // اگر بعد از تاریخ روز باشد، اکیداً هیچ علامتی نباید بخورد (قانون خط قرمز)
  if (jy > todayJy || (jy === todayJy && (jm > todayJm || (jm === todayJm && jd > todayJd)))) {
    return null;
  }

  const isToday = (jy === todayJy && jm === todayJm && jd === todayJd);
  const weekday = getJalaliWeekdayIndex(jy, jm, jd);

  // دایره قرمز کارآگاهی فقط و فقط متعلق به «همان روز جاری» است (در روزهای کلاس: سه‌شنبه، چهارشنبه و پنج‌شنبه)
  // روزهای گذشته دایره را نگه نمی‌دارند و تبدیل به تیک یا ضربدر می‌شوند (دستور مستقیم کارفرما)
  if (isToday && (weekday === 3 || weekday === 4 || weekday === 5)) {
    return 'circle';
  }

  // سایر روزهای گذشته: طبق دستور کارفرما به صورت رندوم و ارگانیک تیک یا ضربدر می‌خورند
  // از هش پایدار تاریخ استفاده می‌شود تا رندوم جذاب و طبیعی باشد و در رندرها نپرد
  return getDeterministicPastMark(jy, jm, jd);
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
  ['assistants-photo-dialog', 'user-edit-msg-dialog', 'user-delete-msg-dialog', 'evidence-dialog'].forEach(dialogId => {
    const dlg = document.getElementById(dialogId);
    if (dlg) {
      dlg.addEventListener('click', (e) => {
        if (e.target === dlg) {
          if (dialogId === 'evidence-dialog' && typeof closeEvidence === 'function') {
            closeEvidence();
          } else {
            dlg.close();
          }
        }
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
    badgeEl.textContent = 'امروز';
    badgeEl.title = `${selWeekday} ${toPersianDigits(selectedJd)} ${selMonthName}`;
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
      `<button type="button" class="cal-day-cell is-outside" onclick="selectShamsiDay(${prevJy}, ${prevJm}, ${d})" title="${toPersianDigits(d)} ${SHAMSI_MONTH_NAMES[prevJm - 1]}"><span class="cal-day-num">${toPersianDigits(d)}</span></button>`
    );
  }

  // روزهای واقعی ماه جاری
  for (let d = 1; d <= daysInMonth; d++) {
    const colIdx = (firstDayOffset + d - 1) % 7;
    const isFriday = colIdx === 6;
    const isToday = (viewJy === todayJy && viewJm === todayJm && d === todayJd);
    const isSelected = (viewJy === selectedJy && viewJm === selectedJm && d === selectedJd);
    const mark = getDetectiveCalendarMark(viewJy, viewJm, d, todayJy, todayJm, todayJd);
    const classes = [
      'cal-day-cell',
      isFriday ? 'is-friday' : '',
      isToday ? 'is-today' : '',
      isSelected ? 'is-selected' : '',
      mark ? `has-mark has-mark-${mark}` : '',
    ].filter(Boolean).join(' ');

    let markTitleNote = '';
    if (mark === 'circle') markTitleNote = ' (سرنخ حساس پرونده - دایره قرمز)';
    else if (mark === 'check') markTitleNote = ' (اقدام تأییدشده ✓)';
    else if (mark === 'cross') markTitleNote = ' (رد پیگیری ✕)';

    const weekdayName = SHAMSI_WEEKDAY_NAMES[colIdx];
    cells.push(
      `<button type="button" class="${classes}" data-day="${d}" ${mark ? `data-mark="${mark}"` : ''} onclick="selectShamsiDay(${viewJy}, ${viewJm}, ${d})" title="${weekdayName} ${toPersianDigits(d)} ${monthName} ${toPersianDigits(viewJy)}${markTitleNote}"><span class="cal-day-num">${toPersianDigits(d)}</span></button>`
    );
  }

  // پر کردن انتهای جدول با روزهای ابتدایی ماه بعد (مثلاً آبان بعد از مهر)
  const totalSlots = cells.length <= 35 ? 35 : 42;
  const nextJm = viewJm === 12 ? 1 : viewJm + 1;
  const nextJy = viewJm === 12 ? viewJy + 1 : viewJy;
  const remaining = totalSlots - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push(
      `<button type="button" class="cal-day-cell is-outside" onclick="selectShamsiDay(${nextJy}, ${nextJm}, ${d})" title="${toPersianDigits(d)} ${SHAMSI_MONTH_NAMES[nextJm - 1]}"><span class="cal-day-num">${toPersianDigits(d)}</span></button>`
    );
  }

  gridEl.style.gridTemplateRows = `repeat(${totalSlots / 7}, minmax(0, 1fr))`;
  gridEl.innerHTML = cells.join('');
}

/* ==========================================================================
   گالری «عکس دستیاران کارآگاه» (کارت‌های پرسنلی هر کلاس + ویترین ۳ قابه با لوپ ۱ دقیقه‌ای)
   ========================================================================== */
let sessionAssistantsList = [];
let assistantsChromaEnabled = true; // به صورت پیش‌فرض حذف بک‌گراند سبز فعال است (اپشن مجزا و قابل تغییر)
let activeAssistantLightboxIndex = -1;
const assistantsChromaCache = new Map(); // fileUrl -> Promise<string (blobUrl/dataUrl)>
const ASSISTANTS_CARD_ROTATION_MS = 60000; // تعویض خودکار ۳ عکس هر ۱ دقیقه (۶۰,۰۰۰ میلی‌ثانیه)
let assistantsCardLoopOffset = 0;
let assistantsCardLoopTimer = null;

function preloadNextAssistantsTrio() {
  const total = sessionAssistantsList ? sessionAssistantsList.length : 0;
  if (total === 0) return;
  const nextOffset = (assistantsCardLoopOffset + 3) % total;
  for (let i = 0; i < 3; i++) {
    const item = sessionAssistantsList[(nextOffset + i) % total];
    if (item && item.file_url) {
      const safeUrl = safeFileUrl(item.file_url);
      if (safeUrl && safeUrl !== '#') {
        const img = new Image();
        img.decoding = 'async';
        img.src = safeUrl;
      }
    }
  }
}

function renderAssistantsCardTrio(animateTransition = false) {
  const stageEl = document.getElementById('assistants-card-trio-stage');
  if (!stageEl) return;

  const total = sessionAssistantsList ? sessionAssistantsList.length : 0;
  if (total === 0) {
    stageEl.innerHTML = [1, 2, 3].map((n) => `
      <div class="assistant-mini-frame">
        <div class="assistant-mini-photo-box">
          <span class="assistant-mini-badge">#${toPersianDigits(n)}</span>
        </div>
        <div class="assistant-mini-nameplate">
          <span class="assistant-mini-name">دستیار کارآگاه</span>
        </div>
      </div>
    `).join('');
    return;
  }

  if (assistantsCardLoopOffset >= total || assistantsCardLoopOffset < 0) {
    assistantsCardLoopOffset = 0;
  }

  const buildFramesMarkup = () => {
    const frames = [];
    const slotsCount = 3;
    for (let slot = 0; slot < slotsCount; slot++) {
      const idx = (assistantsCardLoopOffset + slot) % total;
      const item = sessionAssistantsList[idx];
      const safeUrl = safeFileUrl(item ? item.file_url : '');
      const rawName = item && item.student_name ? fixMojibakeText(item.student_name) : `دستیار ${idx + 1}`;
      const name = escapeHtml(rawName);
      const badgeNum = toPersianDigits(idx + 1);

      frames.push(`
        <div class="assistant-mini-frame" data-assistant-idx="${idx}">
          <div class="assistant-mini-photo-box">
            <span class="assistant-mini-badge">#${badgeNum}</span>
            <img
              class="assistant-mini-img"
              src="${safeUrl}"
              data-raw-url="${safeUrl}"
              alt="${name}"
              loading="eager"
              fetchpriority="high"
              decoding="async"
            >
          </div>
          <div class="assistant-mini-nameplate">
            <span class="assistant-mini-name" title="${name}">${name}</span>
          </div>
        </div>
      `);
    }
    return frames.join('');
  };

  const applyMiniChromaIfNeeded = () => {
    const miniImgs = stageEl.querySelectorAll('img.assistant-mini-img[data-raw-url]');
    miniImgs.forEach((imgEl) => {
      const rawUrl = imgEl.getAttribute('data-raw-url');
      if (!rawUrl || /\.webp(\?.*)?$/i.test(rawUrl)) return;
      getChromaKeyedImageUrl(rawUrl).then((processedUrl) => {
        if (imgEl.isConnected && imgEl.src !== processedUrl) {
          imgEl.src = processedUrl;
        }
      });
    });
  };

  if (animateTransition) {
    stageEl.classList.remove('is-rotating-in');
    stageEl.classList.add('is-rotating-out');
    setTimeout(() => {
      stageEl.innerHTML = buildFramesMarkup();
      applyMiniChromaIfNeeded();
      stageEl.classList.remove('is-rotating-out');
      stageEl.classList.add('is-rotating-in');
      preloadNextAssistantsTrio();
    }, 220);
  } else {
    stageEl.classList.remove('is-rotating-out', 'is-rotating-in');
    stageEl.innerHTML = buildFramesMarkup();
    applyMiniChromaIfNeeded();
    preloadNextAssistantsTrio();
  }
}

function startAssistantsCardRotationLoop() {
  if (assistantsCardLoopTimer) {
    clearInterval(assistantsCardLoopTimer);
    assistantsCardLoopTimer = null;
  }
  const total = sessionAssistantsList ? sessionAssistantsList.length : 0;
  if (total <= 1) return;

  assistantsCardLoopTimer = setInterval(() => {
    const currentTotal = sessionAssistantsList ? sessionAssistantsList.length : 0;
    if (currentTotal <= 1) return;
    assistantsCardLoopOffset = (assistantsCardLoopOffset + 3) % currentTotal;
    renderAssistantsCardTrio(true);
  }, ASSISTANTS_CARD_ROTATION_MS);
}

async function loadSessionAssistants(forceRender = false) {
  if (!sessionData || !sessionData.id || !userToken) return;
  try {
    const res = await fetch(`/api/sessions/${sessionData.id}/assistants`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
      },
    });
    if (!res.ok) return;
    const payload = await res.json();
    if (!payload || !payload.success || !Array.isArray(payload.data)) return;

    sessionAssistantsList = payload.data;
    assistantsCardLoopOffset = 0;

    // بروزرسانی زیرنویس دکمه «عکس دستیاران» در گرید ۴تایی زیر برد
    const subEl = document.getElementById('assistants-btn-sub');
    if (subEl) {
      if (sessionAssistantsList.length > 0) {
        subEl.textContent = `${toPersianDigits(sessionAssistantsList.length)} دستیار ↗`;
      } else {
        subEl.textContent = 'گالری کامل ↗';
      }
    }

    // رندر اولیه ۳ قاب پرتره روی کارت اسلات ۲ و شروع لوپ چرخشی ۱ دقیقه‌ای
    renderAssistantsCardTrio(false);
    startAssistantsCardRotationLoop();

    const eyebrowEl = document.getElementById('assistants-modal-eyebrow');
    if (eyebrowEl) {
      eyebrowEl.textContent = 'پرونده ویژه کارآگاهی // پایگاه تحقیقاتی کارآگاهان';
    }

    const badgeEl = document.getElementById('assistants-count-badge');
    if (badgeEl) {
      badgeEl.textContent = `${toPersianDigits(sessionAssistantsList.length)} نفر`;
    }

    const dlg = document.getElementById('assistants-photo-dialog');
    if (forceRender || (dlg && dlg.open)) {
      renderAssistantsGallery();
    }
  } catch (err) {
    console.warn('Error loading session assistants:', err);
  }
}

/**
 * /**
 * تحویل فوری تصاویر بدون بک‌گراند (Pre-Cutout WebP سرور) بدون درگیر کردن CPU مرورگر؛
 * و در صورت وجود تصویر خام قدیمی با پرده سبز، حذف فقط پرده سبز خالص بدون دست زدن به لباس‌های کرم/طوسی.
 */
function getChromaKeyedImageUrl(rawUrl) {
  const safeUrl = safeFileUrl(rawUrl);
  if (!safeUrl || safeUrl === '#') return Promise.resolve('#');

  // تصاویر .webp و _hd.png روی سرور با هوش مصنوعی (rembg u2net_human_seg) با دقت ۱۰۰٪ دوربری و شفاف شده‌اند
  if (/\.webp(\?.*)?$/i.test(safeUrl) || /_hd\.png(\?.*)?$/i.test(safeUrl)) {
    return Promise.resolve(safeUrl);
  }

  if (assistantsChromaCache.has(safeUrl)) {
    return assistantsChromaCache.get(safeUrl);
  }

  const job = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) {
          resolve(safeUrl);
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        const getRGB = (x, y) => {
          const cx = Math.max(0, Math.min(w - 1, Math.round(x)));
          const cy = Math.max(0, Math.min(h - 1, Math.round(y)));
          const idx = (cy * w + cx) * 4;
          return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
        };

        const tl = getRGB(8, 8);
        const tr = getRGB(w - 9, 8);
        // اگر تصویر قبلاً در گوشه‌ها شفاف شده است، بدون تغییر برگردان
        if (tl[3] < 20 && tr[3] < 20) {
          resolve(safeUrl);
          return;
        }

        const isGreenCorner = (c) => c[1] > 65 && (c[1] - Math.max(c[0], c[2])) > 30;
        if (!isGreenCorner(tl) && !isGreenCorner(tr)) {
          // عدم اجرای Flood-Fill مخرب روی عکس‌های غیرسبز در سمت مرورگر (چون سرور با AI دوربری می‌کند)
          resolve(safeUrl);
          return;
        }

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a === 0) continue;

          const maxRB = r > b ? r : b;
          const greenExcess = g - maxRB;
          const greenVsRed = g - r;
          const greenVsBlue = g - b;

          if (g > 70 && greenVsRed > 48 && greenVsBlue > 28 && greenExcess > 38) {
            data[i + 3] = 0;
            continue;
          }

          if (g > 55 && greenVsRed > 20 && greenVsBlue > 12 && greenExcess > 12) {
            const ratio = (greenExcess - 12) / (38 - 12);
            const newAlpha = Math.round(a * Math.max(0, Math.min(1, 1 - ratio)));
            data[i + 3] = newAlpha;
            data[i + 1] = Math.round(maxRB * 0.92 + g * 0.08);
            continue;
          }

          if (greenExcess > 4 && g > r * 1.08) {
            data[i + 1] = Math.round(maxRB * 0.96 + g * 0.04);
          }
        }

        ctx.putImageData(imgData, 0, 0);
        if (typeof canvas.toBlob === 'function') {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(URL.createObjectURL(blob));
            } else {
              resolve(canvas.toDataURL('image/png'));
            }
          }, 'image/png');
        } else {
          resolve(canvas.toDataURL('image/png'));
        }
      } catch (err) {
        resolve(safeUrl);
      }
    };
    img.onerror = () => resolve(safeUrl);
    img.src = safeUrl;
  });

  assistantsChromaCache.set(safeUrl, job);
  return job;
}

function updateChromaToggleButtonUI() {
  assistantsChromaEnabled = true;
}

function toggleAssistantsChromaKey() {
  assistantsChromaEnabled = true;
}

function applyAssistantsImagesDisplayMode() {
  const container = document.getElementById('assistants-photo-modal-content');
  if (!container) return;

  const imgs = container.querySelectorAll('img.assistant-portrait-img[data-raw-url]');
  imgs.forEach((imgEl) => {
    const rawUrl = imgEl.getAttribute('data-raw-url');
    if (/\.webp(\?.*)?$/i.test(rawUrl)) return; // از قبل دوربری و بهینه شده است
    getChromaKeyedImageUrl(rawUrl).then((processedUrl) => {
      if (imgEl.isConnected && imgEl.src !== processedUrl) {
        imgEl.src = processedUrl;
      }
    });
  });
}

function renderAssistantsGallery() {
  const container = document.getElementById('assistants-photo-modal-content');
  const badgeEl = document.getElementById('assistants-count-badge');
  if (!container) return;

  if (badgeEl) {
    badgeEl.textContent = `${toPersianDigits(sessionAssistantsList.length)} نفر`;
  }

  if (!sessionAssistantsList || sessionAssistantsList.length === 0) {
    container.innerHTML = `
      <div class="assistants-placeholder-stage">
        <div class="assistants-placeholder-icon">🕵️‍♂️</div>
        <h4>هنوز تصویری برای دستیاران این کلاس ثبت نشده است</h4>
        <p>به محض بارگذاری تصاویر کلاس «${escapeHtml(sessionData.name || 'شما')}» توسط مرکز فرماندهی، کارت‌های کارآگاهی اینجا نمایش داده می‌شوند.</p>
      </div>
    `;
    return;
  }

  const cardsHtml = sessionAssistantsList.map((item, idx) => {
    const safeUrl = safeFileUrl(item.file_url);
    const name = escapeHtml(fixMojibakeText(item.student_name || `دستیار کارآگاه ${idx + 1}`));
    const numFa = toPersianDigits(idx + 1);
    const loadingAttr = idx < 8 ? 'eager' : 'lazy';
    const priorityAttr = idx < 8 ? ' fetchpriority="high"' : '';
    return `
      <article class="assistant-id-card" onclick="openAssistantLightbox(${idx})" title="مشاهده تصویر بزرگ‌تر و دریافت تصویر کارآگاهی — ${name}">
        <div class="assistant-card-portrait-wrap">
          <span class="assistant-card-num">#${numFa}</span>
          <img
            class="assistant-portrait-img"
            src="${safeUrl}"
            data-raw-url="${safeUrl}"
            alt="${name}"
            loading="${loadingAttr}"${priorityAttr}
            decoding="async"
          >
        </div>
        <div class="assistant-card-info">
          <strong class="assistant-card-name">${name}</strong>
          <span class="assistant-card-role">🕵️‍♂️ دستیار ویژه کارآگاه</span>
        </div>
      </article>
    `;
  }).join('');

  container.innerHTML = `<div class="assistants-gallery-grid">${cardsHtml}</div>`;
  applyAssistantsImagesDisplayMode();
}

let assistantMagnifier = null;

function openAssistantLightbox(index) {
  if (!sessionAssistantsList.length) return;
  activeAssistantLightboxIndex = (index + sessionAssistantsList.length) % sessionAssistantsList.length;

  const gridBody = document.getElementById('assistants-photo-modal-content');
  const lbView = document.getElementById('assistants-lightbox-view');
  if (gridBody) {
    gridBody.hidden = true;
    gridBody.style.display = 'none';
  }
  if (lbView) {
    lbView.hidden = false;
    lbView.style.display = 'flex';
  }

  updateAssistantLightboxContent();
  if (!assistantMagnifier) {
    assistantMagnifier = window.createImageMagnifier({
      stage: document.getElementById('assistants-lb-portrait-box'),
      image: document.getElementById('assistants-lb-img'),
      badge: document.getElementById('assistantsLensLevel'),
      zoomIn: document.getElementById('assistantsLensZoomIn'),
      zoomOut: document.getElementById('assistantsLensZoomOut'),
      reset: document.getElementById('assistantsLensReset')
    });
  }
  assistantMagnifier?.reset();
}

function closeAssistantLightbox() {
  assistantMagnifier?.hide();
  activeAssistantLightboxIndex = -1;
  const gridBody = document.getElementById('assistants-photo-modal-content');
  const lbView = document.getElementById('assistants-lightbox-view');
  if (lbView) {
    lbView.hidden = true;
    lbView.style.display = 'none';
  }
  if (gridBody) {
    gridBody.hidden = false;
    gridBody.style.display = '';
  }
}

function stepAssistantLightbox(delta) {
  if (!sessionAssistantsList.length) return;
  activeAssistantLightboxIndex =
    (activeAssistantLightboxIndex + delta + sessionAssistantsList.length) % sessionAssistantsList.length;
  updateAssistantLightboxContent();
  assistantMagnifier?.hide();
  assistantMagnifier?.reset();
}

function updateAssistantLightboxContent() {
  const item = sessionAssistantsList[activeAssistantLightboxIndex];
  if (!item) return;

  const imgEl = document.getElementById('assistants-lb-img');
  const nameEl = document.getElementById('assistants-lb-name');
  const counterEl = document.getElementById('assistants-lb-counter');
  const dlBtn = document.getElementById('assistants-lb-download-btn');

  const cleanName = fixMojibakeText(item.student_name || 'دستیار کارآگاه');
  const rawUrl = safeFileUrl(item.file_url);
  const isWebp = /\.webp(\?.*)?$/i.test(rawUrl);
  const hdPngUrl = isWebp ? rawUrl.replace(/\.webp(\?.*)?$/i, '_hd.png') : rawUrl;

  if (nameEl) nameEl.textContent = `🕵️‍♂️ ${cleanName}`;
  if (counterEl) {
    counterEl.textContent = `نفر ${toPersianDigits(activeAssistantLightboxIndex + 1)} از ${toPersianDigits(sessionAssistantsList.length)}`;
  }

  if (imgEl) {
    imgEl.src = rawUrl;
    if (isWebp) {
      // بارگذاری نسخه باکیفیت HD در پس‌زمینه برای نمایش شفاف‌تر در لایت‌باکس
      const hdLoader = new Image();
      hdLoader.onload = () => {
        if (activeAssistantLightboxIndex >= 0 && sessionAssistantsList[activeAssistantLightboxIndex] === item && imgEl) {
          imgEl.src = hdPngUrl;
        }
      };
      hdLoader.src = hdPngUrl;
    }
  }

  if (dlBtn) {
    dlBtn.href = hdPngUrl;
    dlBtn.download = `کارآگاه-${cleanName}.png`;
    dlBtn.textContent = '📥 دریافت تصویر کارآگاهی';
  }

  if (!isWebp) {
    getChromaKeyedImageUrl(rawUrl).then((processedUrl) => {
      if (activeAssistantLightboxIndex >= 0 && sessionAssistantsList[activeAssistantLightboxIndex] === item) {
        if (imgEl) imgEl.src = processedUrl;
        if (dlBtn) {
          dlBtn.href = processedUrl;
          dlBtn.download = `کارآگاه-${cleanName}.png`;
          dlBtn.textContent = '📥 دریافت تصویر کارآگاهی';
        }
      }
    });
  }
}

async function openAssistantsPhotoPopup() {
  if (window.cyberBreachEngine && window.cyberBreachEngine.isPlaying) {
    return;
  }
  if (document.body.classList.contains('cyber-breach-active') || (window.sessionData && window.sessionData.is_hacked)) {
    return;
  }
  const dlg = document.getElementById('assistants-photo-dialog');
  closeAssistantLightbox();
  if (dlg) dlg.showModal();
  await loadSessionAssistants(true);
}

function closeAssistantsPhotoPopup() {
  closeAssistantLightbox();
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

// Master matrix global aliases
window.sendUserMessage = sendMessage;
window.saveUserEditMessage = submitUserEditMessage;

/* ==========================================================================
   ناوبری تب‌های ریسپانسیو و مدیریت کیبورد مجازی موبایل (MASTER-08)
   ========================================================================== */
let currentStudentMobileTab = 'chat';

function switchStudentMobileTab(tabName) {
  if (!tabName) return;
  currentStudentMobileTab = tabName;
  document.body.classList.remove('student-tab-chat', 'student-tab-evidence', 'student-tab-tools');
  document.body.classList.add(`student-tab-${tabName}`);

  // به‌روزرسانی استایل دکمه‌های ناوبری
  document.querySelectorAll('.student-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.id === `tab-btn-${tabName}`);
  });

  if (tabName === 'chat') {
    const badge = document.getElementById('chat-tab-badge');
    if (badge) badge.hidden = true;
    const box = document.getElementById('messages-box');
    if (box) box.scrollTop = box.scrollHeight;
  } else if (tabName === 'evidence') {
    requestAnimationFrame(() => {
      if (typeof updateEvidenceThreads === 'function') updateEvidenceThreads();
    });
  }
}

function initStudentMobileViewport() {
  if (typeof window === 'undefined') return;

  if (window.visualViewport) {
    const updateViewportHeight = () => {
      document.documentElement.style.setProperty('--viewport-height', `${window.visualViewport.height}px`);
    };
    window.visualViewport.addEventListener('resize', updateViewportHeight);
    window.visualViewport.addEventListener('scroll', updateViewportHeight);
    updateViewportHeight();
  }

  // انتخاب تب اولیه بر اساس اندازه صفحه
  if (window.innerWidth <= 992) {
    switchStudentMobileTab('chat');
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth <= 992) {
      if (!document.body.classList.contains('student-tab-chat') &&
          !document.body.classList.contains('student-tab-evidence') &&
          !document.body.classList.contains('student-tab-tools')) {
        switchStudentMobileTab(currentStudentMobileTab || 'chat');
      }
    } else {
      document.body.classList.remove('student-tab-chat', 'student-tab-evidence', 'student-tab-tools');
    }
  });
}

// مقداردهی در هنگام لود صفحه
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStudentMobileViewport);
} else {
  initStudentMobileViewport();
}

window.switchStudentMobileTab = switchStudentMobileTab;
window.initStudentMobileViewport = initStudentMobileViewport;
window.getDetectiveCalendarMark = getDetectiveCalendarMark;
window.getDeterministicPastMark = getDeterministicPastMark;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getDetectiveCalendarMark,
    getDeterministicPastMark,
    gregorianToJalali,
    jalaliToGregorian,
    getJalaliWeekdayIndex,
    getJalaliMonthLength,
  };
}
