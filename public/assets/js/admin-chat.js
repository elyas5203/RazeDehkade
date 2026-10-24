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
const adminMessagesMap = new Map();
let activeAdminReplyId = null;
let historyLoadedFor = null;
let composerMediaPending = false;
let adminTextPending = false;

function setAdminSendFeedback(message) {
  const feedback = document.getElementById('admin-send-feedback');
  if (feedback) feedback.textContent = message || '';
}

let adminPeerConnection = null;
let isAudioListening = false;
let audioKeepAliveTimer = null;
let lastAudioPacketAt = 0;
let forceAudioRelay = false;
let lastRelayRequestAt = 0;
let audioStatsTimer = null;
let lastInboundBytes = null;
let lastInboundProgressAt = 0;
let lastInboundAudioEnergy = null;
let lastInboundSamplesDuration = null;
let currentAudioUserSocketId = null;
let relayPacketTiming = null;

function resetRelayPacketTiming() {
  relayPacketTiming = {
    senderSocketId: null, lastSequence: -1, baseline: null,
    lastSentAt: null, lastArrivalAt: null, recoverySince: null,
  };
}

function shouldPlayRelayPacket(data, arrivalAt = performance.now()) {
  // Older clients have no timing fields and continue to use the bounded playback queue.
  if (!Number.isSafeInteger(data?.sequence) || !Number.isFinite(data?.sentAt)) return true;
  if (!relayPacketTiming) resetRelayPacketTiming();
  if (data.senderSocketId && data.senderSocketId !== relayPacketTiming.senderSocketId) {
    resetRelayPacketTiming();
    relayPacketTiming.senderSocketId = data.senderSocketId;
  }
  if (data.sequence <= relayPacketTiming.lastSequence) return false;

  const previousSentAt = relayPacketTiming.lastSentAt;
  const previousArrivalAt = relayPacketTiming.lastArrivalAt;
  relayPacketTiming.lastSequence = data.sequence;
  relayPacketTiming.lastSentAt = data.sentAt;
  relayPacketTiming.lastArrivalAt = arrivalAt;
  const transit = arrivalAt - data.sentAt;
  if (relayPacketTiming.baseline === null || transit < relayPacketTiming.baseline) {
    relayPacketTiming.baseline = transit;
  }
  if (transit - relayPacketTiming.baseline <= 400) {
    relayPacketTiming.recoverySince = null;
    return true;
  }

  // A burst of old TCP/WebSocket frames has short arrival gaps. A sustained route change
  // has normal frame pacing and is accepted after a short recovery window.
  const sentGap = data.sentAt - previousSentAt;
  const arrivalGap = arrivalAt - previousArrivalAt;
  const steady = previousSentAt !== null && previousArrivalAt !== null &&
    sentGap >= 20 && sentGap <= 200 && arrivalGap >= 20 && arrivalGap <= 200 &&
    Math.abs(sentGap - arrivalGap) <= 80;
  if (!steady) relayPacketTiming.recoverySince = null;
  else if (relayPacketTiming.recoverySince === null) relayPacketTiming.recoverySince = arrivalAt;
  else if (arrivalAt - relayPacketTiming.recoverySince >= 800) {
    relayPacketTiming.baseline = transit;
    relayPacketTiming.recoverySince = null;
    return true;
  }
  return false;
}

const onlineSessionsSet = new Set();
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
  // هماهنگ‌سازی دقیق ارتفاع بدنه با visualViewport در گوشی برای جلوگیری از بریده شدن کادر چت
  if (window.visualViewport) {
    const syncViewport = () => {
      if (window.innerWidth <= 900) {
        document.body.style.setProperty('--admin-visible-height', `${window.visualViewport.height}px`);
      } else {
        document.body.style.removeProperty('--admin-visible-height');
      }
    };
    window.visualViewport.addEventListener('resize', syncViewport);
    window.visualViewport.addEventListener('scroll', syncViewport);
    window.addEventListener('orientationchange', syncViewport);
    syncViewport();
  }

  loadAdminSessions();
  loadWeeklyContent(1);
  initAdminSocket();
  initAdminEmojiPicker();
});

function handleAdminComposerKeydown(e) {
  if (e.key === 'Escape') {
    if (activeAdminReplyId) {
      cancelAdminReply();
      e.preventDefault();
      return;
    }
  }
  // بر اساس نیازمندی صریح: کلید اینتر پیام را ارسال نمی‌کند و فقط به خط بعدی می‌رود.
  // ارسال پیام تنها با کلیک روی دکمه «ارسال پیام» انجام می‌گردد.
  if (e.key === 'Enter' || e.keyCode === 13) {
    setTimeout(() => {
      handleAdminComposerInput(e.target);
    }, 0);
  }
}

function handleAdminComposerInput(el) {
  const input = el || document.getElementById('admin-msg-input');
  if (!input) return;
  handleAdminTyping();
  input.style.height = '42px';
  input.style.height = Math.min(Math.max(input.scrollHeight, 42), 96) + 'px';
}

function initAdminSocket() {
  socket = io({
    auth: { token: adminToken },
    transports: ['websocket', 'polling'],
    tryAllTransports: true,
  });

  const statusEl = document.getElementById('admin-socket-status');

  socket.on('connect', () => {
    statusEl.className = 'status-indicator online';
    statusEl.innerHTML = '<span class="status-dot"></span> مرکز متصل است';
    if (activeSessionId) {
      socket.emit('join_session', { sessionId: activeSessionId });
      if (historyLoadedFor !== activeSessionId) switchSession(activeSessionId);
    }
    if (isAudioListening && activeSessionId) requestAdminAudioStream();
  });

  socket.on('audio_ice_servers', (data) => {
    if (data && Array.isArray(data.iceServers)) rtcConfig.iceServers = [...rtcConfig.iceServers.filter(s => !String(s.urls).startsWith('turn')), ...data.iceServers];
  });

  socket.io.on('reconnect', () => {
    statusEl.className = 'status-indicator online';
    statusEl.innerHTML = '<span class="status-dot"></span> اتصال مجدد برقرار شد';
  });

  socket.on('disconnect', () => {
    if (adminPeerConnection) { adminPeerConnection.close(); adminPeerConnection = null; }
    if (isAudioListening) updateAudioUI('reconnecting');
    statusEl.className = 'status-indicator offline';
    statusEl.innerHTML = '<span class="status-dot"></span> در حال وصل شدن مجدد...';
  });

  let loadAdminSessionsTimer = null;
  function debouncedLoadAdminSessions(delay = 1200) {
    if (loadAdminSessionsTimer) clearTimeout(loadAdminSessionsTimer);
    loadAdminSessionsTimer = setTimeout(() => {
      loadAdminSessions();
    }, delay);
  }

  socket.on('new_message', (msg) => {
    if (Number(msg.session_id) === Number(activeSessionId)) {
      renderAdminMessage(msg, true);
      if (sessionsMap[msg.session_id]) {
        sessionsMap[msg.session_id].unread_count = 0;
      }
      if (socket) {
        socket.emit('mark_as_read', { sessionId: activeSessionId });
      }
      if (msg.sender_type !== 'user') {
        if (msg.message_type === 'text') {
          checkAndMarkMatchingTextStep(msg.session_id, msg.content);
        } else {
          checkAndMarkMatchingMediaStep(msg.session_id, msg);
        }
      }
    } else if (sessionsMap[msg.session_id] && msg.sender_type === 'user') {
      sessionsMap[msg.session_id].unread_count = (sessionsMap[msg.session_id].unread_count || 0) + 1;
    }
    if (sessionsMap[msg.session_id]) {
      sessionsMap[msg.session_id].last_activity_at = new Date().toISOString();
      renderSessionsSidebar(Object.values(sessionsMap));
    }
    debouncedLoadAdminSessions(1200);
  });

  socket.on('session_read', (data) => {
    if (data && data.sessionId && sessionsMap[data.sessionId]) {
      sessionsMap[data.sessionId].unread_count = 0;
      renderSessionsSidebar(Object.values(sessionsMap));
    }
  });

  socket.on('session_updated', (data) => {
    if (data && data.sessionId && sessionsMap[data.sessionId]) {
      sessionsMap[data.sessionId].last_activity_at = new Date().toISOString();
      renderSessionsSidebar(Object.values(sessionsMap));
    }
    debouncedLoadAdminSessions(1200);
  });

  socket.on('user_typing', (data) => {
    if (data.sessionId === activeSessionId && data.senderType === 'user') {
      const indicator = document.getElementById('admin-typing-indicator');
      indicator.innerText = data.isTyping ? 'کاربر جلسه در حال تایپ است...' : '';
    }
  });

  // دریافت لیست تمام جلسات آنلاین در بدو اتصال ادمین
  socket.on('online_sessions_list', (data) => {
    if (data && Array.isArray(data.onlineSessions)) {
      onlineSessionsSet.clear();
      data.onlineSessions.forEach(id => onlineSessionsSet.add(Number(id)));
      renderSessionsSidebar(Object.values(sessionsMap));
      updateActiveHeader();
    }
  });

  // تغییر وضعیت لحظه‌ای آنلاین/آفلاین شدن یک جلسه
  socket.on('session_presence_changed', (data) => {
    if (!data) return;
    const sId = Number(data.sessionId);
    if (data.isOnline) {
      onlineSessionsSet.add(sId);
    } else {
      onlineSessionsSet.delete(sId);
    }
    renderSessionsSidebar(Object.values(sessionsMap));
    if (Number(activeSessionId) === sId) {
      updateActiveHeader();
      if (isAudioListening) {
        if (data.isOnline) { updateAudioUI('connecting'); requestAdminAudioStream(); }
        else updateAudioUI('waiting_for_student');
      }
    }
  });

  socket.on('admin_audio_stream_started_ack', (data) => {
    if (isAudioListening && Number(data?.sessionId) === Number(activeSessionId) && !data.isStudentOnline) {
      updateAudioUI('waiting_for_student');
    }
  });

  // دریافت استریم فوق‌سبک صوتی باینری PCM کاربر از طریق سوکت (پایدار، بدون کدک و بدون قطعی)
  socket.on('admin_audio_stream_pcm', (data) => {
    if (!isAudioListening || !data || Number(data.sessionId) !== Number(activeSessionId)) return;
    if (adminPeerConnection && adminPeerConnection.connectionState === 'connected' && !forceAudioRelay) return;
    lastAudioPacketAt = Date.now();
    handleAdminPcmChunk(data.pcm, data.sessionId);
  });

  socket.on('admin_audio_stream_adpcm', (data) => {
    if (!isAudioListening || !data || Number(data.sessionId) !== Number(activeSessionId)) return;
    if (adminPeerConnection && adminPeerConnection.connectionState === 'connected' && !forceAudioRelay) return;
    if (currentAudioUserSocketId && data.senderSocketId && data.senderSocketId !== currentAudioUserSocketId) return;
    if (!shouldPlayRelayPacket(data)) return;
    if (!window.LiveAudioCodec) return;
    try {
      const samples = LiveAudioCodec.decode(data.packet);
      if (samples) {
        lastAudioPacketAt = Date.now();
        playAdminLiveSamples(samples, data.sampleRate === 16000 ? 16000 : 8000);
      }
    } catch (err) { console.warn('Invalid live audio packet:', err); }
  });

  socket.on('admin_audio_stream_status', (data) => {
    if (!isAudioListening || !data || Number(data.sessionId) !== Number(activeSessionId)) return;
    if (data.status === 'microphone_unavailable') updateAudioUI('mic-error');
    if (data.status === 'microphone_recovered') updateAudioUI('connecting');
  });

  // دریافت چانک‌های صوتی استریم کاربر از طریق سوکت (فال‌بک کمکی)
  socket.on('admin_audio_stream_chunk', (data) => {
    if (!isAudioListening || !data || Number(data.sessionId) !== Number(activeSessionId)) return;
    playSocketAudioChunk(data.chunk, data.mimeType);
  });

  // دریافت Offer لایو از سمت کاربر جلسه
  socket.on('webrtc_offer', async (data) => {
    if (data.sessionId === activeSessionId && isAudioListening) {
      await handleUserOffer(data.offer, data.senderSocketId);
    }
  });

  socket.on('webrtc_ice_candidate', async (data) => {
    if (data?.candidate && data.senderSocketId && isAudioListening &&
        Number(data.sessionId) === Number(activeSessionId)) {
      try {
        const candidate = new RTCIceCandidate(data.candidate);
        const pc = adminPeerConnection;
        if (pc && data.senderSocketId === currentAudioUserSocketId && pc.remoteDescription) {
          await pc.addIceCandidate(candidate);
        } else {
          const queued = pendingAdminCandidatesMap.get(data.senderSocketId) || [];
          if (queued.length < 64) queued.push(candidate);
          pendingAdminCandidatesMap.set(data.senderSocketId, queued);
          if (pendingAdminCandidatesMap.size > 4) {
            pendingAdminCandidatesMap.delete(pendingAdminCandidatesMap.keys().next().value);
          }
        }
      } catch (e) {
        console.error('Error adding ICE candidate on admin:', e);
      }
    }
  });

  socket.on('admin_audio_stream_stopped_ack', (data) => {
    if (data && Number(data.sessionId) === Number(activeSessionId)) {
      console.log('🛑 تایید توقف شنود جلسه:', data);
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

  socket.on('chat_cleared', (data) => {
    if (!data || Number(data.sessionId) === Number(activeSessionId) || data.all) {
      const box = document.getElementById('admin-messages-box');
      if (box) box.innerHTML = '';
      if (activeSessionId) sessionDrafts.delete(activeSessionId);
    }
  });

  socket.on('vault_lock_updated', (data) => {
    if (data && data.all) {
      Object.keys(sessionsMap).forEach(sId => {
        if (sessionsMap[sId]) {
          sessionsMap[sId].is_vault_unlocked = Boolean(data.isUnlocked);
          sessionsMap[sId].vault_target_week = data.targetWeek || currentSelectedWeek || 5;
        }
      });
      if (activeSessionId) {
        updateVaultLockBtnUI(Boolean(data.isUnlocked), data.targetWeek || currentSelectedWeek || 5);
      }
      return;
    }
    if (data && Number(data.sessionId) === Number(activeSessionId)) {
      updateVaultLockBtnUI(Boolean(data.isUnlocked), data.targetWeek || currentSelectedWeek || 5);
      if (sessionsMap[activeSessionId]) {
        sessionsMap[activeSessionId].is_vault_unlocked = Boolean(data.isUnlocked);
        sessionsMap[activeSessionId].vault_target_week = data.targetWeek || currentSelectedWeek || 5;
      }
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

  // بروزرسانی بلادرنگ پنل پیام‌های آماده ۵ هفته‌ای هنگام ثبت محتوا در بات تلگرام (MohtavaTelBot)
  socket.on('weekly_content_updated', (data) => {
    if (!data || !data.week || Number(data.week) === Number(currentSelectedWeek)) {
      loadWeeklyContent(currentSelectedWeek);
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
      if (activeSessionId) {
        data.data.forEach(s => {
          if (Number(s.id) === Number(activeSessionId)) {
            s.unread_count = 0;
          }
        });
      }
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
  if (!container) return;
  container.innerHTML = '';

  const mobileCountEl = document.getElementById('mobile-sessions-count');
  if (mobileCountEl) {
    mobileCountEl.textContent = sessions.length.toLocaleString('fa-IR');
  }

  // سورت بلادرنگ جلسات بر اساس جدیدترین زمان فعالیت / پیام (last_activity_at)
  const sortedSessions = [...sessions].sort((a, b) => {
    const timeA = new Date(a.last_activity_at || a.updated_at || 0).getTime();
    const timeB = new Date(b.last_activity_at || b.updated_at || 0).getTime();
    return timeB - timeA;
  });

  sortedSessions.forEach(s => {
    sessionsMap[s.id] = s;
    const isOnline = onlineSessionsSet.has(Number(s.id));
    const item = document.createElement('div');
    item.className = `session-card ${s.id === activeSessionId ? 'active' : ''} ${isOnline ? 'is-online' : ''}`;
    item.onclick = () => switchSession(s.id);

    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
        <div style="display:flex; align-items:center; gap:6px; min-width:0;">
          <span class="presence-indicator ${isOnline ? 'online' : 'offline'}" title="${isOnline ? 'کاربر هم‌اکنون آنلاین و حاضر در اتاق است' : 'کاربر آفلاین است'}"></span>
          <span style="font-size:13px; font-weight:bold; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(s.name)}</span>
        </div>
        <span class="session-code-badge" style="flex-shrink:0;">${s.code}</span>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
        <small style="color:${isOnline ? 'var(--emerald, #10b981)' : 'var(--text-muted)'}; font-size:11px; font-weight:${isOnline ? '600' : '400'};">
          ${isOnline ? '🟢 لایو و آنلاین' : 'وضعیت: ' + s.status}
        </small>
        ${s.unread_count > 0 ? `<span class="unread-badge">${s.unread_count}</span>` : ''}
      </div>
    `;

    container.appendChild(item);
  });
}

async function switchSession(nextSessionId) {
  const prevSessionId = activeSessionId;
  const isDifferentSession = prevSessionId != null && Number(prevSessionId) !== Number(nextSessionId);
  if (!isDifferentSession && Number(historyLoadedFor) === Number(nextSessionId)) {
    if (window.innerWidth <= 900) switchMobileTab('chat');
    return;
  }
  const input = document.getElementById('admin-msg-input');
  if (prevSessionId && input) sessionDrafts.set(prevSessionId, input.value);
  if (isDifferentSession) {
    stopAdminAudioListening();
    if (activeAdminUpload) cancelCurrentAdminUpload();
    clearStagedMedia();
    activeStagedStep = null;
  }
  activeSessionId = nextSessionId;
  historyLoadedFor = nextSessionId;
  if (input) {
    input.value = sessionDrafts.get(nextSessionId) || '';
    input.style.height = '42px';
    if (input.value) {
      input.style.height = Math.min(Math.max(input.scrollHeight, 42), 96) + 'px';
    }
  }
  document.getElementById('admin-messages-box').innerHTML = '';
  sessionStorage.setItem('activeAdminSessionId', nextSessionId);

  // پاک کردن فوری نشانگر پیام‌های ناخوانده در UI برای این جلسه
  if (sessionsMap[nextSessionId]) {
    sessionsMap[nextSessionId].unread_count = 0;
  }

  updateActiveHeader();
  renderSessionsSidebar(Object.values(sessionsMap));
  refreshWeeklyStepsProgress();

  // در تبلت و گوشی موبایل با انتخاب یک جلسه، بلافاصله به تب اتاق گفتگو هدایت شود
  if (window.innerWidth <= 900) {
    switchMobileTab('chat');
  }

  if (socket) {
    socket.emit('admin_switch_session', {
      previousSessionId: prevSessionId,
      nextSessionId: activeSessionId,
    });
    socket.emit('mark_as_read', { sessionId: activeSessionId });
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
      if (sessionsMap[activeSessionId]) {
        sessionsMap[activeSessionId].unread_count = 0;
      }
      renderSessionsSidebar(Object.values(sessionsMap));

      const lockState = (data.session && typeof data.session.is_chat_locked !== 'undefined')
        ? data.session.is_chat_locked
        : (typeof data.is_chat_locked !== 'undefined' ? data.is_chat_locked : sessionsMap[activeSessionId]?.is_chat_locked);
      updateChatLockBtnUI(Boolean(lockState));
      if (sessionsMap[activeSessionId]) sessionsMap[activeSessionId].is_chat_locked = Boolean(lockState);

      const vaultLockState = (data.session && typeof data.session.is_vault_unlocked !== 'undefined')
        ? data.session.is_vault_unlocked
        : sessionsMap[activeSessionId]?.is_vault_unlocked;
      const vaultWeek = (data.session && data.session.vault_target_week)
        || sessionsMap[activeSessionId]?.vault_target_week || currentSelectedWeek || 5;
      updateVaultLockBtnUI(Boolean(vaultLockState), vaultWeek);
      if (sessionsMap[activeSessionId]) {
        sessionsMap[activeSessionId].is_vault_unlocked = Boolean(vaultLockState);
        sessionsMap[activeSessionId].vault_target_week = vaultWeek;
      }

      const box = document.getElementById('admin-messages-box');
      if (box && Array.isArray(data.data)) {
        box.innerHTML = '';
        data.data.forEach(m => renderAdminMessage(m, false));
        box.scrollTop = box.scrollHeight;
        hydrateSessionSentStepsFromMessages(activeSessionId, data.data);
      }
      refreshWeeklyStepsProgress();
    }
  } catch (err) {
    console.error('Error loading session messages:', err);
  }
}

function updateActiveHeader() {
  const s = sessionsMap[activeSessionId];
  if (s) {
    const isOnline = onlineSessionsSet.has(Number(s.id));
    const statusText = isOnline ? '🟢 آنلاین (حاضر در اتاق تحقیقات)' : '⚪ آفلاین';
    const titleText = `${s.name} (کد: ${s.code}) - ${statusText}`;
    document.getElementById('active-session-title').innerText = titleText;
    const mobileHeaderEl = document.getElementById('mobile-chat-session-title');
    if (mobileHeaderEl) mobileHeaderEl.innerText = titleText;
    updateChatLockBtnUI(s.is_chat_locked);
  }
}

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

function renderAdminMessage(msg, autoScroll = true) {
  const box = document.getElementById('admin-messages-box');
  if (!box || Number(msg.session_id) !== Number(activeSessionId)) return;
  if (box.querySelector(`[data-message-id="${Number(msg.id)}"]`)) return;

  adminMessagesMap.set(Number(msg.id), { ...msg });

  const div = document.createElement('div');
  div.dataset.messageId = Number(msg.id);
  div.className = `message-bubble ${msg.sender_type}`;

  let senderTitle = msg.admin_sender_name || 'ادمین';
  if (msg.sender_type === 'user') senderTitle = 'دستیاران کارآگاه';
  if (msg.sender_type === 'system') senderTitle = 'سیستم';
  if (msg.sender_type === 'hacker') senderTitle = 'شبکه مزداک';

  const cleanContent = fixMojibakeText(msg.content);
  const cleanFileName = fixMojibakeText(msg.file_name);

  let bodyContent = escapeHtml(cleanContent);
  if (msg.message_type === 'image') {
    const imageUrl = safeFileUrl(msg.file_url);
    const captionText = cleanContent || cleanFileName;
    const caption = captionText ? `<p style="margin:0 0 4px;font-size:12.5px;">${escapeHtml(captionText)}</p>` : '';
    bodyContent = `${caption}<a href="${imageUrl}" target="_blank" rel="noopener" class="admin-media-thumb" title="مشاهده تصویر"><img src="${imageUrl}" alt="تصویر ارسالی" class="admin-thumb-img"></a>`;
  } else if (msg.message_type === 'voice' || msg.message_type === 'user_voice') {
    div.classList.add('has-voice-message');
    const voiceUrl = safeFileUrl(msg.file_url);
    const hasNote = cleanContent && cleanContent !== 'پیام صوتی' && cleanContent !== cleanFileName;
    const noteMarkup = hasNote ? `<p style="margin:0 0 4px;font-size:12px;color:#cbd5e1;">${escapeHtml(cleanContent)}</p>` : '';
    const voiceMarkup = window.createTelegramVoiceMarkup 
      ? window.createTelegramVoiceMarkup({ ...msg, file_url: voiceUrl }) 
      : `<audio controls preload="metadata" src="${voiceUrl}" style="height:32px;max-width:240px;"></audio>`;
    bodyContent = `${noteMarkup}${voiceMarkup}`;
  } else if (msg.message_type === 'video') {
    const videoUrl = safeFileUrl(msg.file_url);
    const caption = cleanContent && cleanContent !== cleanFileName ? `<p style="margin:0 0 4px;font-size:12.5px;">${escapeHtml(cleanContent)}</p>` : '';
    bodyContent = `${caption}<video controls preload="metadata" src="${videoUrl}" class="admin-thumb-video"></video>`;
  } else if (msg.message_type === 'file') {
    const fileUrl = safeFileUrl(msg.file_url);
    bodyContent = `<a href="${fileUrl}" download target="_blank" rel="noopener" class="admin-file-badge"><span style="font-size:14px;">📁</span><span>${escapeHtml(cleanFileName || cleanContent || 'دریافت فایل')}</span></a>`;
  }

  let replyQuoteMarkup = '';
  if (msg.reply_to_id) {
    let replySender = 'کارآگاه';
    if (msg.reply_sender_type === 'user') {
      replySender = 'دستیاران کارآگاه';
    } else if (msg.reply_sender_type === 'admin') {
      replySender = msg.reply_admin_name || 'مرکز فرماندهی (شما)';
    } else if (msg.reply_sender_type === 'hacker') {
      replySender = 'شبکه مزداک';
    } else if (msg.reply_sender_type === 'system') {
      replySender = 'پیام سیستم';
    }

    let replySnippet = msg.reply_content || '';
    if (msg.reply_message_type === 'image') replySnippet = `📷 تصویر ${msg.reply_file_name || ''}`.trim();
    else if (msg.reply_message_type === 'voice' || msg.reply_message_type === 'user_voice') replySnippet = '🎙️ پیام صوتی';
    else if (msg.reply_message_type === 'video') replySnippet = '🎬 ویدیوی ارسالی';
    else if (msg.reply_message_type === 'file') replySnippet = `📁 فایل ${msg.reply_file_name || ''}`.trim();
    if (!replySnippet) replySnippet = 'پیام مرجع';
    replySnippet = fixMojibakeText(replySnippet);
    if (replySnippet.length > 70) replySnippet = replySnippet.slice(0, 67) + '…';

    const safeReplyType = escapeHtml(msg.reply_sender_type || 'user');
    replyQuoteMarkup = `
      <div class="message-reply-quote" onclick="jumpToAdminMessage(${Number(msg.reply_to_id)})" role="button" tabindex="0" title="پرش به پیام اصلی">
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

  div.innerHTML = `
    <div class="message-sender">
      <span>${escapeHtml(senderTitle)}</span>
      <div style="display:flex;align-items:center;gap:6px;">
        <span class="msg-time-badge">${new Date(msg.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
        <div class="msg-actions">
          <button type="button" class="msg-action-btn reply" onclick="stageAdminReply(${msg.id})" style="color:var(--command-blue, #38bdf8);" title="پاسخ به این پیام (یا دوبار کلیک)">↩️</button>
          <button type="button" class="msg-action-btn" onclick="editChatMessage(${msg.id})" style="color:var(--command-amber);" title="ویرایش پیام">✏️</button>
          <button type="button" class="msg-action-btn" onclick="deleteChatMessage(${msg.id})" style="color:var(--command-red);" title="حذف پیام">🗑️</button>
        </div>
      </div>
    </div>
    ${replyQuoteMarkup}
    <div id="msg-content-${msg.id}" class="message-content">${bodyContent}</div>
  `;

  div.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    stageAdminReply(msg.id);
  });

  const laterMessage = [...box.children].find(child => Number(child.dataset.messageId) > Number(msg.id));
  box.insertBefore(div, laterMessage || null);
  if (autoScroll) {
    box.scrollTop = box.scrollHeight;
  }
}

/**
 * استیج کردن حالت پاسخ به یک پیام در اتاق فرمان ادمین
 */
function stageAdminReply(messageId) {
  const numId = Number(messageId);
  if (!numId) return;
  activeAdminReplyId = numId;
  const msg = adminMessagesMap.get(numId);

  const bar = document.getElementById('admin-reply-preview-bar');
  const titleEl = document.getElementById('admin-reply-preview-title');
  const snippetEl = document.getElementById('admin-reply-preview-snippet');
  const accentEl = document.getElementById('admin-reply-accent');
  const textarea = document.getElementById('admin-msg-input');

  let authorName = 'دستیاران کارآگاه';
  let snippet = '';
  let senderClass = 'user';

  if (msg) {
    senderClass = msg.sender_type || 'user';
    if (msg.sender_type === 'user') {
      authorName = 'دستیاران کارآگاه';
    } else if (msg.sender_type === 'admin') {
      authorName = msg.admin_sender_name || 'مرکز فرماندهی (شما)';
    } else if (msg.sender_type === 'hacker') {
      authorName = 'شبکه مزداک';
    } else if (msg.sender_type === 'system') {
      authorName = 'سیستم';
    }

    if (msg.message_type === 'image') {
      snippet = `📷 تصویر ${msg.file_name || ''}`.trim();
    } else if (msg.message_type === 'voice' || msg.message_type === 'user_voice') {
      snippet = '🎙️ پیام صوتی';
    } else if (msg.message_type === 'video') {
      snippet = '🎬 ویدیوی ارسالی';
    } else if (msg.message_type === 'file') {
      snippet = `📁 فایل ${msg.file_name || ''}`.trim();
    } else {
      snippet = msg.content || '';
    }
  } else {
    const bubble = document.querySelector(`[data-message-id="${numId}"]`);
    if (bubble) {
      if (bubble.classList.contains('user')) {
        authorName = 'دستیاران کارآگاه';
        senderClass = 'user';
      } else if (bubble.classList.contains('admin')) {
        authorName = 'مرکز فرماندهی';
        senderClass = 'admin';
      } else if (bubble.classList.contains('hacker')) {
        authorName = 'شبکه مزداک';
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

  if (textarea) {
    textarea.focus();
  }
}
window.stageAdminReply = stageAdminReply;

/**
 * لغو حالت پاسخ در کامپوزر ادمین
 */
function cancelAdminReply() {
  activeAdminReplyId = null;
  const bar = document.getElementById('admin-reply-preview-bar');
  if (bar) {
    bar.hidden = true;
    bar.style.display = 'none';
  }
}
window.cancelAdminReply = cancelAdminReply;

/**
 * پرش به پیام مرجع در چت ادمین با هایلایت نئونی طلایی
 */
function jumpToAdminMessage(replyId) {
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
    const feedback = document.getElementById('admin-send-feedback');
    if (feedback) {
      feedback.textContent = 'پیام مرجع در تاریخچه بالاتر قرار دارد.';
      setTimeout(() => {
        if (feedback.textContent.includes('تاریخچه بالاتر')) feedback.textContent = '';
      }, 3500);
    }
  }
}
window.jumpToAdminMessage = jumpToAdminMessage;

let pendingAdminEditMessageId = null;

function editChatMessage(messageId) {
  const contentEl = document.getElementById(`msg-content-${messageId}`);
  const oldText = contentEl ? contentEl.textContent.trim() : '';
  const dialog = document.getElementById('admin-edit-msg-dialog');
  const textarea = document.getElementById('admin-edit-msg-textarea');

  if (dialog && textarea) {
    pendingAdminEditMessageId = messageId;
    textarea.value = oldText;
    dialog.showModal();
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }, 30);
    return;
  }

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

function closeAdminEditDialog() {
  pendingAdminEditMessageId = null;
  const dialog = document.getElementById('admin-edit-msg-dialog');
  if (dialog && dialog.open) dialog.close();
}

function submitAdminEditMessage(event) {
  if (event) event.preventDefault();
  if (!pendingAdminEditMessageId) return;
  const messageId = pendingAdminEditMessageId;
  const textarea = document.getElementById('admin-edit-msg-textarea');
  const newText = textarea ? textarea.value.trim() : '';
  if (!newText) return;

  if (socket) {
    socket.emit('edit_message', { messageId, content: newText }, (res) => {
      if (res && res.success) {
        const contentEl = document.getElementById(`msg-content-${messageId}`);
        if (contentEl) contentEl.textContent = newText;
        closeAdminEditDialog();
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

async function sendAdminMessage() {
  if (adminTextPending) return;
  if (!activeSessionId) {
    alert('لطفاً ابتدا یک جلسه را از لیست جلسه‌ها انتخاب کنید.');
    return;
  }

  const input = document.getElementById('admin-msg-input');
  const senderTypeSelect = document.getElementById('admin-sender-type');
  const rawContent = input ? input.value.trim() : '';
  const content = rawContent.replace(/\n{3,}/g, '\n\n');
  const selectedSenderType = senderTypeSelect ? senderTypeSelect.value : 'admin';

  // ارسال رسانه آماده استیج‌شده (عکس، ویدیو، صوت، سند)
  if (activeStagedStep && activeStagedStep.type !== 'text') {
    if (composerMediaPending) return;
    composerMediaPending = true;
    const staged = activeStagedStep;
    const targetSessionId = Number(activeSessionId);
    if (Number(staged.sessionId) !== targetSessionId) {
      clearStagedMedia();
      alert('کلاس تغییر کرده است؛ فایل را دوباره انتخاب کنید.');
      composerMediaPending = false;
      return;
    }
    const approved = await confirmAdminMediaSend({
      type: staged.type, name: staged.title || staged.fileName,
      sessionId: targetSessionId,
    });
    if (!approved) { composerMediaPending = false; return; }
    if (!socket?.connected) {
      composerMediaPending = false;
      alert('اتصال چت برقرار نیست؛ دوباره تلاش کنید.');
      return;
    }
    const replyToId = activeAdminReplyId;
    cancelAdminReply();
    socket.timeout(10000).emit('send_message', {
      sessionId: targetSessionId,
      content: content || staged.title,
      senderType: selectedSenderType,
      messageType: staged.type,
      fileUrl: staged.fileUrl,
      fileName: staged.fileName,
      replyToId: replyToId || null,
    }, (error, ack) => {
      composerMediaPending = false;
      if (error || !ack?.success) {
        if (replyToId) stageAdminReply(replyToId);
        alert(ack?.message || 'ارسال فایل تأیید نشد؛ دوباره تلاش کنید.');
        return;
      }
      markStepAsSent(targetSessionId, staged.stepId);
      if (activeStagedStep === staged) clearStagedMedia();
      if (Number(activeSessionId) !== targetSessionId) return;
      if (sessionsMap[targetSessionId]) {
        sessionsMap[targetSessionId].unread_count = 0;
        renderSessionsSidebar(Object.values(sessionsMap));
      }
      socket.emit('mark_as_read', { sessionId: targetSessionId });
      if (input) {
        input.value = '';
        input.style.height = '42px';
      }
      sendAdminTyping(false);
    });
    return;
  }

  if (!content) {
    if (input) {
      input.value = '';
      input.style.height = '42px';
    }
    return;
  }

  if (!socket?.connected) {
    setAdminSendFeedback('اتصال چت قطع است؛ متن حفظ شد. پس از اتصال دوباره ارسال کنید.');
    return;
  }

  const targetSessionId = Number(activeSessionId);
  const stagedText = activeStagedStep;
  adminTextPending = true;
  const sendButton = document.getElementById('admin-send-btn');
  if (sendButton) sendButton.disabled = true;
  setAdminSendFeedback('در حال تأیید ارسال پیام…');

  const replyToId = activeAdminReplyId;
  cancelAdminReply();

  socket.timeout(10000).emit('send_message', {
    sessionId: targetSessionId,
    content: content,
    senderType: selectedSenderType,
    messageType: 'text',
    replyToId: replyToId || null,
  }, (error, ack) => {
    adminTextPending = false;
    if (sendButton) sendButton.disabled = false;
    if (error || !ack?.success) {
      if (replyToId) stageAdminReply(replyToId);
      setAdminSendFeedback(ack?.message || 'ارسال تأیید نشد؛ متن حفظ شد. اتصال را بررسی و دوباره ارسال کنید.');
      return;
    }
    setAdminSendFeedback('');

    if (sessionsMap[targetSessionId]) {
      sessionsMap[targetSessionId].unread_count = 0;
      renderSessionsSidebar(Object.values(sessionsMap));
    }
    if (socket.connected) socket.emit('mark_as_read', { sessionId: targetSessionId });

    if (stagedText && Number(stagedText.sessionId) === targetSessionId && stagedText.stepId) {
      markStepAsSent(targetSessionId, stagedText.stepId);
      if (activeStagedStep === stagedText) activeStagedStep = null;
    } else {
      checkAndMarkMatchingTextStep(targetSessionId, content);
    }

    if (Number(activeSessionId) === targetSessionId && input && input.value.trim() === rawContent) {
      input.value = '';
      input.style.height = '42px';
      sessionDrafts.delete(targetSessionId);
      sendAdminTyping(false);
    } else if (sessionDrafts.get(targetSessionId)?.trim() === rawContent) {
      sessionDrafts.delete(targetSessionId);
    }
  });
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

  if (tabName === 'chat' && !activeSessionId) {
    const box = document.getElementById('admin-messages-box');
    if (box && !box.children.length) {
      box.innerHTML = `
        <div class="empty-chat-hint">
          <div style="font-size:36px;margin-bottom:10px;">🕵️</div>
          <strong style="font-size:15px;color:#f1f5f9;">جلسه‌ای انتخاب نشده است</strong>
          <p style="color:#94a3b8;font-size:12.5px;margin:8px 0 16px;max-width:280px;line-height:1.6;">لطفاً برای مشاهده پیام‌ها، ارسال مدارک یا پاسخ به دانش‌آموزان، ابتدا یک کلاس را از لیست انتخاب نمایید.</p>
          <button type="button" class="command-button primary" onclick="switchMobileTab('sidebar')" style="padding:8px 18px;font-size:13px;">📋 انتخاب از لیست جلسه‌ها</button>
        </div>
      `;
    }
  }
}

async function confirmClearCurrentChat() {
  if (!activeSessionId) {
    alert('لطفاً ابتدا یک جلسه را از لیست انتخاب کنید.');
    return;
  }
  const s = sessionsMap[activeSessionId];
  const sName = s ? (s.name || `جلسه ${s.code}`) : `جلسه ${activeSessionId}`;
  const ok = confirm(`🧹 آیا مطمئن هستید که می‌خواهید تاریخچه گفتگو و تخته مدارک «${sName}» را پاکسازی کنید؟\n\n⚠️ تمام پیام‌ها و مدارک این کلاس بلادرنگ پاک خواهند شد، اما عکس‌ها و فایل‌های سرور باقی می‌مانند.`);
  if (!ok) return;

  try {
    const res = await fetch(`/api/sessions/${activeSessionId}/clear-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
    });
    const data = await res.json();
    if (data.success) {
      const box = document.getElementById('admin-messages-box');
      if (box) box.innerHTML = '';
      sessionDrafts.delete(activeSessionId);
      const input = document.getElementById('admin-msg-input');
      if (input) input.value = '';
      alert(`✅ تاریخچه چت و تخته مدارک «${sName}» با موفقیت پاکسازی شد (${data.deletedCount} پیام).`);
    } else {
      alert(`❌ خطا در پاکسازی: ${data.message || 'خطای نامشخص'}`);
    }
  } catch (err) {
    console.error('Error clearing chat history:', err);
    alert('خطا در برقراری ارتباط با سرور.');
  }
}
window.confirmClearCurrentChat = confirmClearCurrentChat;

async function confirmClearAllChats() {
  const ok1 = confirm('⚠️ هشدار مهم:\n\nآیا مطمئن هستید که می‌خواهید تاریخچه چت و تخته مدارک تمامی کلاس‌ها را پاکسازی کنید؟');
  if (!ok1) return;

  const ok2 = confirm('🚨 تایید نهایی:\n\nآیا ۱۰۰٪ مطمئن هستید؟ این عملیات قابل بازگشت نیست!');
  if (!ok2) return;

  try {
    const res = await fetch('/api/sessions/clear-all-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
    });
    const data = await res.json();
    if (data.success) {
      const box = document.getElementById('admin-messages-box');
      if (box) box.innerHTML = '';
      sessionDrafts.clear();
      const input = document.getElementById('admin-msg-input');
      if (input) input.value = '';
      alert(`✅ تمامی چت‌ها و تخته مدارک تمام جلسات با موفقیت پاکسازی شدند (${data.deletedCount} پیام).`);
    } else {
      alert(`❌ خطا در پاکسازی سراسری: ${data.message || 'خطای نامشخص'}`);
    }
  } catch (err) {
    console.error('Error clearing all chat history:', err);
    alert('خطا در برقراری ارتباط با سرور.');
  }
}
window.confirmClearAllChats = confirmClearAllChats;

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

let adminAudioCtx = null;
let adminPlaybackGainNode = null;
let adminMediaElementSource = null;
let adminListeningGain = 1;
let nextPcmPlayTime = 0;
let audioWatchdogTimer = null;
const pendingAdminCandidatesMap = new Map();
const scheduledAudioSources = new Set();

function clearScheduledAudio() {
  for (const source of scheduledAudioSources) {
    try { source.stop(); } catch (_) {}
  }
  scheduledAudioSources.clear();
  nextPcmPlayTime = adminAudioCtx ? adminAudioCtx.currentTime : 0;
}

function initAdminAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!adminAudioCtx || adminAudioCtx.state === 'closed') {
    // Output uses the device's native rate; 16 kHz is only the relay packet rate.
    adminAudioCtx = new AudioCtx();
    adminPlaybackGainNode = adminAudioCtx.createGain();
    adminPlaybackGainNode.gain.value = adminListeningGain;
    const limiter = adminAudioCtx.createDynamicsCompressor?.();
    if (limiter) {
      limiter.threshold.value = -3;
      limiter.knee.value = 0;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.2;
      adminPlaybackGainNode.connect(limiter);
      limiter.connect(adminAudioCtx.destination);
    } else {
      adminPlaybackGainNode.connect(adminAudioCtx.destination);
    }
  }
  if (adminAudioCtx.state === 'suspended') {
    adminAudioCtx.resume().catch(() => {});
  }
  return adminAudioCtx;
}

function setAdminListeningGain(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return;
  adminListeningGain = Math.max(1, Math.min(3, numeric));
  if (adminPlaybackGainNode && adminAudioCtx) {
    adminPlaybackGainNode.gain.setTargetAtTime(adminListeningGain, adminAudioCtx.currentTime, 0.03);
  }
  for (const prefix of ['', 'mobile-']) {
    const input = document.getElementById(`${prefix}admin-audio-gain`);
    const output = document.getElementById(`${prefix}admin-audio-gain-value`);
    if (input) input.value = String(adminListeningGain);
    if (output) output.textContent = `${adminListeningGain.toLocaleString('fa-IR')}×`;
  }
}

function handleAdminPcmChunk(pcmBuffer, sessionId) {
  if (!isAudioListening || Number(sessionId) !== Number(activeSessionId)) return;
  const ctx = initAdminAudioContext();
  if (!ctx) return;

  try {
    const pcm16 = new Int16Array(pcmBuffer);
    const float32 = new Float32Array(pcm16.length);
    let signalEnergy = 0;
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768.0;
      signalEnergy += float32[i] * float32[i];
    }
    if (float32.length) renderAudioSignalLevel(Math.sqrt(signalEnergy / float32.length));

    const audioBuffer = ctx.createBuffer(1, float32.length, 16000);
    audioBuffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(adminPlaybackGainNode || ctx.destination);

    const now = ctx.currentTime;
    if (nextPcmPlayTime < now) {
      nextPcmPlayTime = now + 0.04; // بافر ۴۰ میلی‌ثانیه‌ای برای پخش پیوسته و نرم
    }
    source.start(nextPcmPlayTime);
    nextPcmPlayTime += audioBuffer.duration;

    updateAudioUI('live');

    if (audioWatchdogTimer) clearTimeout(audioWatchdogTimer);
    audioWatchdogTimer = setTimeout(() => {
      if (isAudioListening) {
        updateAudioUI('connecting');
      }
    }, 10000);
  } catch (err) {
    console.error('خطا در پخش صدای استریم PCM:', err);
  }
}

function playAdminLiveSamples(samples, sampleRate) {
  const ctx = initAdminAudioContext();
  if (!ctx || !samples.length) return;
  const now = ctx.currentTime;
  if (nextPcmPlayTime > now + 0.45) clearScheduledAudio();
  if (nextPcmPlayTime < now + 0.06) nextPcmPlayTime = now + 0.10;
  const buffer = ctx.createBuffer(1, samples.length, sampleRate);
  const channel = buffer.getChannelData(0);
  let signalEnergy = 0;
  for (let i = 0; i < samples.length; i++) {
    const value = samples[i] / 32768;
    signalEnergy += value * value;
    channel[i] = Math.tanh(value * 1.8) / Math.tanh(1.8);
  }
  renderAudioSignalLevel(Math.sqrt(signalEnergy / samples.length));
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(adminPlaybackGainNode || ctx.destination);
  scheduledAudioSources.add(source);
  source.onended = () => scheduledAudioSources.delete(source);
  source.start(nextPcmPlayTime);
  nextPcmPlayTime += buffer.duration;
  updateAudioUI('live');

  if (audioWatchdogTimer) clearTimeout(audioWatchdogTimer);
  audioWatchdogTimer = setTimeout(() => {
    if (isAudioListening) {
      // فقط در صورتی که بیش از ۱۵ ثانیه هیچ بسته‌ای دریافت نشود وضعیت اتصال بازنشانی می‌شود
      updateAudioUI('connecting');
    }
  }, 15000);
}

let audioQueue = [];
let isAudioPlaying = false;

function playSocketAudioChunk(chunkData, mimeType) {
  audioQueue.push({ chunkData, mimeType });
  // Older open student pages may still send MediaRecorder chunks after a deployment.
  // Keep only the newest chunks so temporary congestion cannot turn live listening into delayed playback.
  if (audioQueue.length > 2) audioQueue.splice(0, audioQueue.length - 2);
  processAudioQueue();
}

function processAudioQueue() {
  if (isAudioPlaying || audioQueue.length === 0) return;
  const item = audioQueue.shift();
  isAudioPlaying = true;

  try {
    const audio = new Audio();
    audio.src = String(item.chunkData).startsWith('data:') ? item.chunkData : `data:${item.mimeType || 'audio/webm'};base64,${item.chunkData}`;

    const finish = () => {
      isAudioPlaying = false;
      processAudioQueue();
    };

    audio.onended = finish;
    audio.onerror = finish;

    audio.play().then(() => {
      updateAudioUI('live');
    }).catch(e => {
      console.log('Audio chunk autoplay policy note:', e);
      finish();
    });
  } catch (err) {
    console.error('Socket audio chunk error:', err);
    isAudioPlaying = false;
    processAudioQueue();
  }
}

function resetAudioSignalMeter() {
  for (const prefix of ['', 'mobile-']) {
    const meter = document.getElementById(`${prefix}audio-signal-meter`);
    const fill = document.getElementById(`${prefix}audio-signal-fill`);
    if (meter) {
      meter.setAttribute('aria-valuenow', '0');
      meter.title = 'سطح سیگنال هنوز اندازه‌گیری نشده است';
    }
    if (fill) fill.style.width = '0%';
  }
}

function renderAudioSignalLevel(level) {
  if (!isAudioListening || !Number.isFinite(level)) return;
  const dbfs = level > 0 ? 20 * Math.log10(Math.min(1, level)) : -Infinity;
  // The bar maps -60..0 dBFS to 0..100. It describes the received signal, not speaker volume.
  const value = Math.max(0, Math.min(100, Math.round((dbfs + 60) / 60 * 100)));
  for (const prefix of ['', 'mobile-']) {
    const meter = document.getElementById(`${prefix}audio-signal-meter`);
    const fill = document.getElementById(`${prefix}audio-signal-fill`);
    if (meter) {
      meter.setAttribute('aria-valuenow', String(value));
      meter.title = level > 0
        ? `سطح سیگنال دریافتی: ${Math.round(dbfs)} dBFS`
        : 'سیگنال دریافتی ساکت است';
    }
    if (fill) fill.style.width = `${value}%`;
  }
}

function updateAudioUI(status) {
  const btn = document.getElementById('admin-audio-toggle-btn');
  const mobileBtn = document.getElementById('mobile-admin-audio-toggle-btn');
  const badge = document.getElementById('audio-listening-indicator');
  const badgeText = document.getElementById('audio-listening-status-text');
  const mobileBadge = document.getElementById('mobile-audio-listening-indicator');
  const mobileBadgeText = document.getElementById('mobile-audio-listening-status-text');
  for (const id of ['audio-signal-meter', 'mobile-audio-signal-meter']) {
    const meter = document.getElementById(id);
    if (meter) meter.style.display = status === 'live' ? 'inline-block' : 'none';
  }

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
  } else if (status === 'waiting_for_student') {
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
      badge.style.borderColor = '#eab308';
      badge.style.color = '#fde047';
      badge.style.background = 'rgba(234,179,8,0.18)';
    }
    if (badgeText) badgeText.innerText = '⚠️ دانش‌آموز هنوز وارد چت نشده است';
    if (mobileBadge) {
      mobileBadge.style.display = 'inline-flex';
      mobileBadge.style.borderColor = '#eab308';
      mobileBadge.style.color = '#fde047';
      mobileBadge.style.background = 'rgba(234,179,8,0.18)';
    }
    if (mobileBadgeText) mobileBadgeText.innerText = '⚠️ دانش‌آموز هنوز وارد چت نشده است';
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
    if (badgeText) badgeText.innerText = '⏳ در حال برقراری ارتباط با میکروفون…';
    if (mobileBadge) {
      mobileBadge.style.display = 'inline-flex';
      mobileBadge.style.borderColor = '#f59e0b';
      mobileBadge.style.color = '#fbbf24';
      mobileBadge.style.background = 'rgba(245,158,11,0.15)';
    }
    if (mobileBadgeText) mobileBadgeText.innerText = '⏳ در حال برقراری ارتباط با میکروفون…';
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
    if (badgeText) badgeText.innerText = '🔴 شنود زنده میکروفون فعال است';
    if (mobileBadge) {
      mobileBadge.style.display = 'inline-flex';
      mobileBadge.style.borderColor = '#ef4444';
      mobileBadge.style.color = '#fca5a5';
      mobileBadge.style.background = 'rgba(239,68,68,0.2)';
    }
    if (mobileBadgeText) mobileBadgeText.innerText = '🔴 شنود زنده میکروفون فعال است';
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
  } else if (status === 'mic-error') {
    if (badge) badge.style.display = 'inline-flex';
    if (mobileBadge) mobileBadge.style.display = 'inline-flex';
    if (badgeText) badgeText.innerText = '⚠️ میکروفون طرف مقابل در دسترس نیست';
    if (mobileBadgeText) mobileBadgeText.innerText = '⚠️ میکروفون طرف مقابل در دسترس نیست';
  } else if (status === 'waiting_for_student') {
    if (badge) badge.style.display = 'inline-flex';
    if (mobileBadge) mobileBadge.style.display = 'inline-flex';
    if (badgeText) badgeText.innerText = '⏳ در انتظار ورود کاربر به چت';
    if (mobileBadgeText) mobileBadgeText.innerText = '⏳ در انتظار ورود کاربر به چت';
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

function requestAdminAudioStream() {
  if (socket && socket.connected && activeSessionId) {
    socket.emit('start_audio_stream', { sessionId: activeSessionId, audioCodecVersion: 2 });
  }
}

function requestAudioRelay(userSocketId) {
  if (!socket || !socket.connected || !activeSessionId || !userSocketId) return;
  if (forceAudioRelay && Date.now() - lastRelayRequestAt < 2000) return;
  forceAudioRelay = true;
  lastRelayRequestAt = Date.now();
  socket.emit('audio_relay_required', { sessionId: activeSessionId, targetSocketId: userSocketId });
}

function releaseAudioRelay(userSocketId) {
  if (!isAudioListening || !socket?.connected || !activeSessionId || !userSocketId) return;
  forceAudioRelay = false;
  lastRelayRequestAt = 0;
  clearScheduledAudio();
  socket.emit('audio_relay_mode', {
    sessionId: activeSessionId, targetSocketId: userSocketId, enabled: false,
  });
}

function reportWebRtcStall() {
  requestAudioRelay(currentAudioUserSocketId);
  if (!lastAudioPacketAt || Date.now() - lastAudioPacketAt > 3000) updateAudioUI('reconnecting');
}

async function inspectWebRtcAudio() {
  const pc = adminPeerConnection;
  if (!isAudioListening || !pc || pc.connectionState !== 'connected' || !currentAudioUserSocketId) return;
  try {
    const stats = await pc.getStats();
    if (pc !== adminPeerConnection) return;
    let bytes = null;
    let inboundAudio = null;
    stats.forEach(report => {
      if (report.type === 'inbound-rtp' && !report.isRemote &&
          (report.kind === 'audio' || report.mediaType === 'audio')) {
        bytes = Number(report.bytesReceived);
        inboundAudio = report;
      }
    });
    if (!Number.isFinite(bytes)) {
      if (Date.now() - lastInboundProgressAt > 5000) {
        reportWebRtcStall();
      }
      return;
    }
    const energy = Number(inboundAudio.totalAudioEnergy);
    const duration = Number(inboundAudio.totalSamplesDuration);
    let level = Number(inboundAudio.audioLevel);
    if (Number.isFinite(energy) && Number.isFinite(duration)) {
      if (lastInboundAudioEnergy !== null && lastInboundSamplesDuration !== null &&
          energy >= lastInboundAudioEnergy && duration > lastInboundSamplesDuration) {
        level = Math.sqrt(Math.max(0, (energy - lastInboundAudioEnergy) /
          (duration - lastInboundSamplesDuration)));
      }
      lastInboundAudioEnergy = energy;
      lastInboundSamplesDuration = duration;
    }
    if (bytes > (lastInboundBytes ?? -1) && !forceAudioRelay) renderAudioSignalLevel(level);
    if (bytes > (lastInboundBytes ?? 0)) {
      lastInboundProgressAt = Date.now();
      const player = document.getElementById('remote-audio-player');
      const track = player?.srcObject?.getAudioTracks?.()[0];
      if (forceAudioRelay && player && !player.paused && !player.muted && track && !track.muted &&
          (!adminMediaElementSource || adminAudioCtx?.state === 'running')) {
        releaseAudioRelay(currentAudioUserSocketId);
      }
      if (!forceAudioRelay) updateAudioUI('live');
    } else if (Date.now() - lastInboundProgressAt > 5000) {
      reportWebRtcStall();
    }
    lastInboundBytes = bytes;
  } catch (_) {
    if (pc === adminPeerConnection && Date.now() - lastInboundProgressAt > 5000) reportWebRtcStall();
  }
}

function startAdminAudioListening() {
  isAudioListening = true;
  resetRelayPacketTiming();
  resetAudioSignalMeter();
  forceAudioRelay = false;
  lastRelayRequestAt = 0;
  lastAudioPacketAt = 0;
  lastInboundBytes = null;
  lastInboundAudioEnergy = null;
  lastInboundSamplesDuration = null;
  lastInboundProgressAt = Date.now();
  initAdminAudioContext(); // فعال‌سازی فوری در تعامل کلیک کاربر جهت رفع محدودیت Autoplay مرورگر
  nextPcmPlayTime = adminAudioCtx ? adminAudioCtx.currentTime : 0;
  updateAudioUI('connecting');

  requestAdminAudioStream();

  // Retry the request if no media arrived, including after Socket.IO reconnects.
  if (audioKeepAliveTimer) clearInterval(audioKeepAliveTimer);
  audioKeepAliveTimer = setInterval(() => {
    if (!isAudioListening || !activeSessionId) return;
    if (socket && socket.connected) {
      if ((!adminPeerConnection || adminPeerConnection.connectionState !== 'connected') &&
          (!lastAudioPacketAt || Date.now() - lastAudioPacketAt > 4000)) {
        requestAdminAudioStream();
      }
    }
  }, 10000);
  if (audioStatsTimer) clearInterval(audioStatsTimer);
  audioStatsTimer = setInterval(inspectWebRtcAudio, 2000);
}

function stopAdminAudioListening() {
  audioQueue = [];
  isAudioPlaying = false;
  clearScheduledAudio();

  if (!isAudioListening && !adminPeerConnection && !audioKeepAliveTimer) {
    return;
  }

  isAudioListening = false;
  resetRelayPacketTiming();
  resetAudioSignalMeter();
  forceAudioRelay = false;
  lastRelayRequestAt = 0;
  lastAudioPacketAt = 0;
  currentAudioUserSocketId = null;
  lastInboundBytes = null;
  lastInboundAudioEnergy = null;
  lastInboundSamplesDuration = null;
  if (audioStatsTimer) { clearInterval(audioStatsTimer); audioStatsTimer = null; }
  if (audioKeepAliveTimer) {
    clearInterval(audioKeepAliveTimer);
    audioKeepAliveTimer = null;
  }
  if (audioWatchdogTimer) {
    clearTimeout(audioWatchdogTimer);
    audioWatchdogTimer = null;
  }

  if (socket && activeSessionId) {
    socket.emit('stop_audio_stream', { sessionId: activeSessionId });
  }

  if (adminAudioCtx && adminAudioCtx.state === 'running') {
    try { adminAudioCtx.suspend(); } catch (_) {}
  }
  nextPcmPlayTime = 0;
  pendingAdminCandidatesMap.clear();

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
  currentAudioUserSocketId = userSocketId;
  resetRelayPacketTiming();
  resetAudioSignalMeter();
  lastInboundBytes = null;
  lastRelayRequestAt = 0;
  lastInboundAudioEnergy = null;
  lastInboundSamplesDuration = null;
  lastInboundProgressAt = Date.now();
  requestAudioRelay(userSocketId);
  if (adminPeerConnection) {
    try { adminPeerConnection.close(); } catch (_) {}
  }

  const pc = new RTCPeerConnection(rtcConfig);
  adminPeerConnection = pc;

  // پایش وضعیت اتصال و وصل مجدد خودکار در صورت قطعی
  adminPeerConnection.onconnectionstatechange = () => {
    if (adminPeerConnection !== pc) return;
    const state = pc.connectionState;
    console.log('WebRTC Connection state:', state);
    if (state === 'connected') {
      inspectWebRtcAudio();
    } else if (state === 'disconnected' || state === 'failed') {
      if (isAudioListening) {
        requestAudioRelay(userSocketId);
        updateAudioUI('reconnecting');
        setTimeout(() => {
          if (isAudioListening && socket && activeSessionId) {
            requestAdminAudioStream();
          }
        }, 1500);
      }
    }
  };

  adminPeerConnection.oniceconnectionstatechange = () => {
    if (adminPeerConnection !== pc) return;
    const ice = pc.iceConnectionState;
    if (ice === 'connected' || ice === 'completed') {
      inspectWebRtcAudio();
    }
  };

  // دریافت استریم صدای میکروفون کاربر
  adminPeerConnection.ontrack = (event) => {
    const audioPlayer = document.getElementById('remote-audio-player');
    if (audioPlayer && event.streams && event.streams[0]) {
      const ctx = initAdminAudioContext();
      if (ctx && adminPlaybackGainNode && !adminMediaElementSource) {
        try {
          adminMediaElementSource = ctx.createMediaElementSource(audioPlayer);
          adminMediaElementSource.connect(adminPlaybackGainNode);
        } catch (error) {
          console.warn('Could not attach listening gain to WebRTC playback:', error);
        }
      }
      audioPlayer.srcObject = event.streams[0];
      audioPlayer.muted = false;
      audioPlayer.volume = 1;
      event.track.onmute = () => requestAudioRelay(userSocketId);
      event.track.onunmute = () => {
        if (adminPeerConnection === pc && pc.connectionState === 'connected') inspectWebRtcAudio();
      };
      audioPlayer.play().then(() => {
        if (event.track.muted) requestAudioRelay(userSocketId);
        else if (pc.connectionState === 'connected') inspectWebRtcAudio();
      }).catch(e => {
        console.log('Audio autoplay policy note:', e);
        requestAudioRelay(userSocketId);
        updateAudioUI('reconnecting');
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
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    if (pc !== adminPeerConnection || !isAudioListening) return;
    const queuedCandidates = pendingAdminCandidatesMap.get(userSocketId) || [];
    pendingAdminCandidatesMap.delete(userSocketId);
    for (const candidate of queuedCandidates) {
      try { await pc.addIceCandidate(candidate); } catch (_) {}
    }
    const answer = await pc.createAnswer();
    if (pc !== adminPeerConnection || !isAudioListening) return;
    await pc.setLocalDescription(answer);
    if (pc !== adminPeerConnection || !isAudioListening) return;

    if (socket && activeSessionId) {
      socket.emit('webrtc_answer', {
        sessionId: activeSessionId,
        answer: answer,
        targetSocketId: userSocketId,
      });
    }
  } catch (err) {
    console.error('Error handling WebRTC offer on admin:', err);
    if (isAudioListening && pc === adminPeerConnection) {
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

function confirmAdminMediaSend({ type, name, sessionId, size }) {
  const dialog = document.getElementById('admin-media-confirm-dialog');
  if (!dialog || dialog.open) return Promise.resolve(false);
  const kind = String(type || 'file').toLowerCase();
  const label = kind.startsWith('image') || kind === 'image' ? 'عکس'
    : kind.startsWith('video') || kind === 'video' ? 'ویدیو'
    : kind.startsWith('audio') || kind === 'voice' ? 'صوت' : 'فایل';
  const icon = label === 'عکس' ? '📷' : label === 'ویدیو' ? '🎬' : label === 'صوت' ? '🎙️' : '📎';
  document.getElementById('admin-media-confirm-icon').textContent = icon;
  document.getElementById('admin-media-confirm-title').textContent = `تأیید ارسال ${label}`;
  document.getElementById('admin-media-confirm-description').textContent = 'پس از تأیید، فایل به کلاس زیر ارسال می‌شود.';
  document.getElementById('admin-media-confirm-name').textContent = name || 'فایل انتخاب‌شده';
  document.getElementById('admin-media-confirm-session').textContent = sessionsMap[sessionId]?.name || `کلاس ${sessionId}`;
  const sizeRow = document.getElementById('admin-media-confirm-size-row');
  sizeRow.hidden = size == null;
  if (size != null) document.getElementById('admin-media-confirm-size').textContent = formatAdminFileSizeFa(size);
  const cancelButton = document.getElementById('admin-media-confirm-cancel');
  const sendButton = document.getElementById('admin-media-confirm-send');
  return new Promise(resolve => {
    let settled = false;
    const finish = approved => {
      if (settled) return;
      settled = true;
      cancelButton.removeEventListener('click', cancel);
      sendButton.removeEventListener('click', send);
      dialog.removeEventListener('cancel', escape);
      dialog.close();
      resolve(approved && Number(activeSessionId) === Number(sessionId));
    };
    const cancel = () => finish(false);
    const send = () => finish(true);
    const escape = event => { event.preventDefault(); finish(false); };
    cancelButton.addEventListener('click', cancel);
    sendButton.addEventListener('click', send);
    dialog.addEventListener('cancel', escape);
    dialog.showModal();
    cancelButton.focus();
  });
}

let activeAdminUpload = null;

function formatAdminFileSizeFa(bytes) {
  const num = Number(bytes) || 0;
  if (num < 1024) return `${num.toLocaleString('fa-IR')} بایت`;
  if (num < 1024 * 1024) return `${Math.max(1, Math.round(num / 1024)).toLocaleString('fa-IR')} کیلوبایت`;
  return `${(num / (1024 * 1024)).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} مگابایت`;
}

function getAdminUploadProgressContainer() {
  return document.getElementById('admin-upload-progress-container') || document.getElementById('admin-typing-indicator');
}

function renderAdminUploadProgress(fileName, fileSize, percent = 0, statusText = 'در حال آپلود فایل...') {
  const container = getAdminUploadProgressContainer();
  if (!container) return;
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  const cleanName = fixMojibakeText(fileName || 'فایل');
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px;padding:8px 12px;margin:4px 10px;border-radius:8px;background:rgba(14,24,38,0.96);border:1px solid rgba(56,189,248,0.45);">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1;">
          <span>📎</span>
          <strong style="font-size:12px;color:#f8fafc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(cleanName)}</strong>
          <small id="admin-upload-status-label" style="font-size:11px;color:#94a3b8;white-space:nowrap;">${escapeHtml(statusText)} (${formatAdminFileSizeFa(fileSize)})</small>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
          <span id="admin-upload-percent-badge" style="padding:2px 8px;border-radius:5px;background:rgba(56,189,248,0.18);border:1px solid rgba(56,189,248,0.45);color:#7dd3fc;font-size:11.5px;font-weight:800;">${clamped.toLocaleString('fa-IR')}٪</span>
          <button type="button" onclick="cancelCurrentAdminUpload()" style="padding:3px 9px;border-radius:5px;border:1px solid rgba(239,68,68,0.55);background:rgba(239,68,68,0.18);color:#fca5a5;font-family:inherit;font-size:11px;font-weight:800;cursor:pointer;">✕ لغو ارسال</button>
        </div>
      </div>
      <div style="width:100%;height:6px;border-radius:999px;background:rgba(255,255,255,0.08);overflow:hidden;">
        <div id="admin-upload-progress-fill" style="height:100%;width:${clamped}%;background:linear-gradient(90deg,#0ea5e9,#34d399);transition:width 0.15s ease-out;"></div>
      </div>
    </div>
  `;
}

function updateAdminUploadProgress(percent, statusText, fileSize) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  const badge = document.getElementById('admin-upload-percent-badge');
  const fill = document.getElementById('admin-upload-progress-fill');
  const label = document.getElementById('admin-upload-status-label');
  if (badge) badge.textContent = `${clamped.toLocaleString('fa-IR')}٪`;
  if (fill) fill.style.width = `${clamped}%`;
  if (label && statusText) label.textContent = fileSize ? `${statusText} (${formatAdminFileSizeFa(fileSize)})` : statusText;
}

function cancelCurrentAdminUpload() {
  if (!activeAdminUpload) return;
  const uploadToCancel = activeAdminUpload;
  uploadToCancel.cancelled = true;
  activeAdminUpload = null;

  if (uploadToCancel.xhr) {
    try { uploadToCancel.xhr.abort(); } catch (_) {}
  }

  if (uploadToCancel.uploadId) {
    fetch('/api/upload/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ uploadId: uploadToCancel.uploadId }),
    }).catch(() => {});

    if (socket && socket.connected) {
      socket.emit('cancel_file_upload', { uploadId: uploadToCancel.uploadId });
    }
  }

  const fileInput = document.getElementById('admin-file-input');
  if (fileInput) fileInput.value = '';

  const container = getAdminUploadProgressContainer();
  if (container) {
    container.innerHTML = `<span style="color:#fca5a5;font-size:11.5px;padding:4px 12px;">⛔ ارسال فایل لغو شد.</span>`;
    setTimeout(() => {
      if (!activeAdminUpload) container.innerHTML = '';
    }, 2200);
  }
}

function adminBlobToBase64(blob) {
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

function sendAdminChunkViaXhr(payload, uploadState, onProgressRatio) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    uploadState.xhr = xhr;
    xhr.open('POST', '/api/upload/chunk', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${adminToken}`);
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
          reject(err);
        }
      } catch (_) {
        reject(new Error(`HTTP ${xhr.status}`));
      }
    };

    xhr.onerror = () => { uploadState.xhr = null; reject(new Error('NETWORK_ERROR')); };
    xhr.ontimeout = () => { uploadState.xhr = null; reject(new Error('TIMEOUT')); };
    xhr.onabort = () => { uploadState.xhr = null; reject(new Error('ABORTED')); };

    xhr.send(JSON.stringify(payload));
  });
}

function sendAdminChunkViaSocket(payload) {
  return new Promise((resolve, reject) => {
    if (!socket || !socket.connected) return reject(new Error('SOCKET_DISCONNECTED'));
    socket.timeout(20000).emit('upload_file_chunk', payload, (err, response) => {
      if (err) return reject(new Error('SOCKET_TIMEOUT'));
      if (response && response.success) resolve(response);
      else {
        const error = new Error((response && response.message) || 'خطا در آپلود سوکتی');
        error.isValidationError = Boolean(response && response.message);
        reject(error);
      }
    });
  });
}

async function handleAdminFileUpload(event) {
  if (!activeSessionId) {
    alert('لطفا ابتدا یک جلسه را انتخاب کنید.');
    event.target.value = '';
    return;
  }

  const file = event.target.files[0];
  if (!file) return;

  const uploadSessionId = Number(activeSessionId);
  const cleanOriginalName = fixMojibakeText(file.name || 'فایل ارسالی');
  const approved = await confirmAdminMediaSend({
    type: file.type, name: cleanOriginalName, sessionId: uploadSessionId, size: file.size,
  });
  if (!approved) {
    event.target.value = '';
    return;
  }
  if (!socket?.connected) {
    alert('اتصال چت برقرار نیست؛ پس از اتصال دوباره فایل را انتخاب کنید.');
    event.target.value = '';
    return;
  }

  if (activeAdminUpload) {
    cancelCurrentAdminUpload();
  }

  const uploadSenderType = document.getElementById('admin-sender-type').value;

  const uploadState = {
    uploadId: `adm_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    cancelled: false,
    xhr: null,
    fileName: cleanOriginalName,
  };
  activeAdminUpload = uploadState;

  renderAdminUploadProgress(cleanOriginalName, file.size, 0, 'در حال ارسال...');

  const CHUNK_SIZE = 160 * 1024;
  const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
  let finalResult = null;
  let useSocketTransport = false;

  try {
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      if (uploadState.cancelled) return;
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const chunkBase64 = await adminBlobToBase64(file.slice(start, end));
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
          chunkResponse = await sendAdminChunkViaXhr(payload, uploadState, (chunkRatio) => {
            if (uploadState.cancelled) return;
            const pct = ((chunkIndex + chunkRatio) / totalChunks) * 100;
            updateAdminUploadProgress(pct, 'در حال آپلود فایل...', file.size);
          });
        } catch (xhrErr) {
          if (uploadState.cancelled || xhrErr.message === 'ABORTED') return;
          if (xhrErr.isValidationError) throw xhrErr;
          useSocketTransport = true;
        }
      }

      if (useSocketTransport && !chunkResponse) {
        chunkResponse = await sendAdminChunkViaSocket(payload);
        if (uploadState.cancelled) return;
        const pct = ((chunkIndex + 1) / totalChunks) * 100;
        updateAdminUploadProgress(pct, 'در حال ارسال امن فایل...', file.size);
      }

      if (chunkResponse && chunkResponse.completed && chunkResponse.data) {
        finalResult = chunkResponse;
      }
    }
  } catch (err) {
    if (uploadState.cancelled || err.message === 'ABORTED') return;
    activeAdminUpload = null;
    const container = getAdminUploadProgressContainer();
    if (container) container.innerHTML = '';
    alert('خطا در آپلود فایل: ' + (err.message || 'ارتباط با سرور برقرار نشد.'));
    event.target.value = '';
    return;
  }

  if (uploadState.cancelled) return;

  if (Number(activeSessionId) !== uploadSessionId) {
    activeAdminUpload = null;
    const container = getAdminUploadProgressContainer();
    if (container) container.innerHTML = '';
    event.target.value = '';
    alert('کلاس در زمان آپلود تغییر کرد؛ فایل به چت ارسال نشد.');
    return;
  }

  if (finalResult && finalResult.success && finalResult.data) {
    updateAdminUploadProgress(100, 'تکمیل شد — ارسال به جلسه...', file.size);
    const { fileUrl, fileName, messageType } = finalResult.data;
    const cleanName = fixMojibakeText(fileName || cleanOriginalName);

    if (!socket?.connected) {
      activeAdminUpload = null;
      setAdminSendFeedback('آپلود انجام شد، اما اتصال چت قطع شد؛ فایل به گروه فرستاده نشد. دوباره انتخاب کنید.');
      event.target.value = '';
      return;
    }
    const replyToId = activeAdminReplyId;
    cancelAdminReply();

    socket.timeout(10000).emit('send_message', {
      sessionId: uploadSessionId,
      content: cleanName,
      senderType: uploadSenderType,
      messageType: messageType,
      fileUrl: fileUrl,
      fileName: cleanName,
      replyToId: replyToId || null,
    }, (error, ack) => {
      if (activeAdminUpload === uploadState) activeAdminUpload = null;
      const container = getAdminUploadProgressContainer();
      if (container) container.innerHTML = '';
      if (error || !ack?.success) {
        if (replyToId) stageAdminReply(replyToId);
        setAdminSendFeedback(ack?.message || 'ارسال عکس یا فایل به گروه تأیید نشد؛ دوباره تلاش کنید.');
      } else {
        setAdminSendFeedback('');
      }
    });

    event.target.value = '';
  } else {
    activeAdminUpload = null;
    const container = getAdminUploadProgressContainer();
    if (container) container.innerHTML = '';
    setAdminSendFeedback('آپلود کامل نشد؛ فایل به گروه ارسال نشد. دوباره تلاش کنید.');
    event.target.value = '';
  }
}

function updateAdminHackButtons() {
  const isHacked = activeSessionId && sessionsMap[activeSessionId] && (Number(sessionsMap[activeSessionId].is_hacked) === 1);
  const triggerBtn = document.getElementById('admin-trigger-hack-btn');
  const unlockBtn = document.getElementById('admin-unlock-hack-btn');
  const mobTriggerBtn = document.getElementById('mobile-admin-trigger-hack-btn');
  const mobUnlockBtn = document.getElementById('mobile-admin-unlock-hack-btn');

  if (triggerBtn) triggerBtn.style.display = isHacked ? 'none' : 'inline-block';
  if (unlockBtn) unlockBtn.style.display = isHacked ? 'inline-block' : 'none';
  if (mobTriggerBtn) mobTriggerBtn.style.display = isHacked ? 'none' : 'block';
  if (mobUnlockBtn) mobUnlockBtn.style.display = isHacked ? 'block' : 'none';
}

function unlockHackSequence() {
  if (!activeSessionId) return;
  const target = activeSessionId;
  const sessionName = sessionsMap[target]?.name || target;
  if (!confirm(`آیا مطمئن هستید که می‌خواهید وضعیت نفوذ سایبری را برای «${sessionName}» لغو کرده و دسترسی چت را بازگشایی کنید؟`)) return;

  if (socket?.connected) {
    socket.emit('unlock_hack_sequence', { sessionId: target }, (res) => {
      if (res && res.success) {
        if (sessionsMap[target]) sessionsMap[target].is_hacked = 0;
        updateAdminHackButtons();
        alert('وضعیت نفوذ لغو شد و کلاس بازگشایی گردید.');
      } else {
        alert(res?.message || 'خطا در لغو وضعیت نفوذ');
      }
    });
  } else {
    fetch(`/api/sessions/${target}/unlock-hack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
    }).then(r => r.json()).then(res => {
      if (res && res.success) {
        if (sessionsMap[target]) sessionsMap[target].is_hacked = 0;
        updateAdminHackButtons();
        alert('وضعیت نفوذ لغو شد و کلاس بازگشایی گردید.');
      } else {
        alert(res?.message || 'خطا در لغو وضعیت نفوذ');
      }
    }).catch(() => alert('خطا در برقراری ارتباط با سرور'));
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

  const targetSessionId = Number(activeSessionId);
  if (!await confirmAdminMediaSend({
    type: file.type, name: file.title || file.name, sessionId: targetSessionId,
  })) return;

  const feedback = document.getElementById('media-library-feedback');
  if (feedback) feedback.textContent = 'در حال ارسال فایل به جلسه…';

  try {
    const response = await fetch('/api/media-library/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ sessionId: targetSessionId, name: file.name, title: file.title || '' }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'ارسال انجام نشد.');
    if (feedback) feedback.textContent = '✅ فایل با موفقیت به جلسه ارسال شد.';
    if (result.data && Number(activeSessionId) === targetSessionId) renderAdminMessage(result.data);
    setTimeout(() => { if (feedback) feedback.textContent = ''; }, 3000);
  } catch (error) {
    if (feedback) feedback.textContent = error.message || 'خطا در ارسال فایل.';
  }
}

/* ==========================================================================
   مدیریت سناریوی ۵ هفته‌ای (هفته ۱ تا ۵) و رهگیری پیشرفت ارسال به تفکیک کلاس
   ========================================================================== */

let currentSelectedWeek = 1;
let weeklyContentCache = {};
const sessionSentStepsMap = new Map(); // sessionId -> Set of stepIds
let activeStagedStep = null; // { sessionId, stepId, text }

function getSessionSentSteps(sessionId) {
  const sId = Number(sessionId);
  if (!sId) return new Set();
  if (!sessionSentStepsMap.has(sId)) {
    try {
      const stored = localStorage.getItem(`raze_session_${sId}_sent_steps`);
      const arr = stored ? JSON.parse(stored) : [];
      sessionSentStepsMap.set(sId, new Set(arr.map(x => String(x))));
    } catch (e) {
      sessionSentStepsMap.set(sId, new Set());
    }
  }
  return sessionSentStepsMap.get(sId);
}

function markStepAsSent(sessionId, stepId) {
  const sId = Number(sessionId);
  if (!sId || !stepId) return;
  const set = getSessionSentSteps(sId);
  set.add(String(stepId));
  try {
    localStorage.setItem(`raze_session_${sId}_sent_steps`, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('localStorage save failed:', e);
  }
  if (Number(activeSessionId) === sId) {
    updateStepCardVisual(stepId, true);
  }
}

function isStepSentInSession(sessionId, stepId) {
  const sId = Number(sessionId);
  if (!sId || !stepId) return false;
  return getSessionSentSteps(sId).has(String(stepId));
}

function updateStepCardVisual(stepId, isSent) {
  const card = document.querySelector(`.weekly-step-card[data-step-id="${stepId}"]`);
  if (!card) return;

  const headerRight = card.querySelector('.step-header-meta') || card.firstElementChild;
  let badge = card.querySelector('.step-sent-badge');

  if (isSent) {
    card.classList.add('sent-step');
    if (!badge && headerRight) {
      badge = document.createElement('span');
      badge.className = 'step-sent-badge';
      badge.innerHTML = '✓ ارسال شده';
      headerRight.insertBefore(badge, headerRight.firstChild);
    }
  } else {
    card.classList.remove('sent-step');
    if (badge) badge.remove();
  }
}

function refreshWeeklyStepsProgress() {
  const sId = Number(activeSessionId);
  const sentSet = getSessionSentSteps(sId);
  const cards = document.querySelectorAll('.weekly-step-card');
  cards.forEach(card => {
    const stepId = card.dataset.stepId;
    if (!stepId) return;
    const isSent = sId ? sentSet.has(String(stepId)) : false;
    updateStepCardVisual(stepId, isSent);
  });
}

function hydrateSessionSentStepsFromMessages(sessionId, messages) {
  if (!sessionId || !Array.isArray(messages)) return;
  const sId = Number(sessionId);
  const sentSet = getSessionSentSteps(sId);

  Object.values(weeklyContentCache).forEach(stepList => {
    if (!Array.isArray(stepList)) return;
    stepList.forEach(item => {
      const stepIdStr = String(item.id);
      if (sentSet.has(stepIdStr)) return;

      const stepText = (item.text_content || (item.content_type === 'text' ? item.payload : '') || '').trim();
      const stepFile = (item.file_url || (item.content_type !== 'text' ? item.payload : '') || '').trim();
      const stepTitle = (item.title || '').trim();

      const match = messages.some(m => {
        if (m.sender_type === 'user') return false;
        if (item.content_type === 'text') {
          const mContent = (m.content || '').trim();
          return stepText && (mContent === stepText || (stepText.length > 20 && mContent.includes(stepText.slice(0, 50))));
        } else {
          if (stepFile && m.file_url) {
            const cleanStepFile = stepFile.split('?')[0].split('/').pop();
            const cleanMsgFile = m.file_url.split('?')[0].split('/').pop();
            if (cleanStepFile && cleanMsgFile && cleanStepFile === cleanMsgFile) return true;
          }
          if (stepTitle && m.content && m.content.trim() === stepTitle) return true;
          return false;
        }
      });

      if (match) {
        sentSet.add(stepIdStr);
      }
    });
  });

  try {
    localStorage.setItem(`raze_session_${sId}_sent_steps`, JSON.stringify(Array.from(sentSet)));
  } catch (e) {}
}

function checkAndMarkMatchingTextStep(sessionId, text) {
  if (!sessionId || !text) return;
  const trimmed = text.trim();
  Object.values(weeklyContentCache).forEach(stepList => {
    if (!Array.isArray(stepList)) return;
    stepList.forEach(item => {
      if (item.content_type === 'text') {
        const stepText = (item.text_content || item.payload || '').trim();
        if (stepText && (stepText === trimmed || (stepText.length > 20 && trimmed.includes(stepText.slice(0, 50))))) {
          markStepAsSent(sessionId, item.id);
        }
      }
    });
  });
}

function checkAndMarkMatchingMediaStep(sessionId, msg) {
  if (!sessionId || !msg) return;
  const sId = Number(sessionId);
  Object.values(weeklyContentCache).forEach(stepList => {
    if (!Array.isArray(stepList)) return;
    stepList.forEach(item => {
      if (item.content_type !== 'text') {
        const stepFile = (item.file_url || item.payload || '').trim();
        const stepTitle = (item.title || '').trim();
        let match = false;
        if (stepFile && msg.file_url) {
          const cleanStepFile = stepFile.split('?')[0].split('/').pop();
          const cleanMsgFile = msg.file_url.split('?')[0].split('/').pop();
          if (cleanStepFile && cleanMsgFile && cleanStepFile === cleanMsgFile) match = true;
        }
        if (stepTitle && msg.content && msg.content.trim() === stepTitle) match = true;
        if (match) {
          markStepAsSent(sId, item.id);
        }
      }
    });
  });
}

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
  const isUnlocked = activeSessionId && sessionsMap[activeSessionId]?.is_vault_unlocked;
  const targetWeek = (activeSessionId && sessionsMap[activeSessionId]?.vault_target_week) || currentSelectedWeek;
  updateVaultLockBtnUI(Boolean(isUnlocked), targetWeek);
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
      const resolvedThumbUrl = item.content_type === 'image' ? safeFileUrl(stepFile) : '#';

      const isSent = isStepSentInSession(activeSessionId, item.id);
      card.className = `weekly-step-card${isSent ? ' sent-step' : ''}`;
      card.dataset.stepId = String(item.id);
      card.dataset.week = String(stepWeek);

      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:11px;font-weight:bold;color:${typeColor};">
            #${stepOrder} ${icon} ${typeFa}
          </span>
          <div class="step-header-meta" style="display:flex;align-items:center;gap:6px;">
            ${isSent ? `<span class="step-sent-badge">✓ ارسال شده</span>` : ''}
            <span style="font-size:10px;color:#8d9699;">هفته ${stepWeek}</span>
          </div>
        </div>
        <strong style="font-size:13px;color:#f8fafc;">${safeTitle}</strong>
        ${safeText ? `<p style="font-size:11px;color:#94a3b8;line-height:1.6;margin:0;max-height:54px;overflow:hidden;text-overflow:ellipsis;">${safeText}</p>` : ''}
        ${resolvedThumbUrl !== '#' ? `<img src="${resolvedThumbUrl}" alt="${safeTitle}" style="width:100%;max-height:95px;object-fit:cover;border-radius:4px;border:1px solid #2d3538;margin-top:2px;" loading="lazy">` : ''}
        ${safeFile ? `<small style="font-size:10px;color:#64748b;direction:ltr;text-align:right;">${safeFile}</small>` : ''}
        <div class="step-actions-row" style="display:flex;gap:6px;margin-top:6px;align-items:center;">
          <button type="button" class="command-button primary step-insert-btn" style="flex:1;padding:7px 10px;font-size:11.5px;font-weight:600;" title="${item.content_type === 'text' ? 'قرار دادن در کادر چت' : 'تأیید و ارسال رسانه'}">${item.content_type === 'text' ? '📝 درج در کادر چت' : '📤 تأیید و ارسال'}</button>
          <button type="button" class="command-button danger step-del-btn" style="padding:6px 8px;font-size:11px;flex-shrink:0;" title="حذف این مرحله">🗑️</button>
        </div>
      `;

      card.querySelector('.step-insert-btn').onclick = () => insertStepToComposer(item);
      card.querySelector('.step-del-btn').onclick = () => deleteWeeklyStep(item.id, stepWeek);

      list.appendChild(card);
    });
  } catch (err) {
    console.error('Error loading weekly content:', err);
    if (feedback) feedback.textContent = 'خطا در بارگذاری سناریوی هفته ' + week;
  }
}

function insertStepToComposer(item) {
  if (!item) return;
  if (item.content_type !== 'text') {
    sendConfirmedWeeklyMedia(item);
    return;
  }
  const input = document.getElementById('admin-msg-input');
  const chip = document.getElementById('staged-media-chip');
  const chipIcon = document.getElementById('staged-media-icon');
  const chipTitle = document.getElementById('staged-media-title');
  const feedback = document.getElementById('weekly-content-feedback');

  const stepOrder = item.order_num || item.step_order || 1;
  const stepText = item.text_content || (item.content_type === 'text' ? item.payload : '');
  const stepFile = item.file_url || (item.content_type !== 'text' ? item.payload : '');

  if (item.content_type === 'text') {
    clearStagedMedia();
    if (input) {
      input.value = stepText;
      input.style.height = '42px';
      input.style.height = Math.min(Math.max(input.scrollHeight, 42), 96) + 'px';
      input.focus();
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    activeStagedStep = {
      sessionId: activeSessionId,
      stepId: item.id,
      type: 'text',
      text: stepText,
    };
    if (feedback) {
      feedback.textContent = `✅ متن مرحله #${stepOrder} در کادر چت قرار گرفت. برای ارسال، دکمه «ارسال پیام» را بزنید.`;
      setTimeout(() => { if (feedback) feedback.textContent = ''; }, 3500);
    }
  } else {
    let resolvedUrl = safeFileUrl(stepFile);
    let icon = '📎';
    if (item.content_type === 'image') icon = '📷';
    else if (item.content_type === 'video') icon = '🎬';
    else if (item.content_type === 'voice') icon = '🎙️';
    else if (item.content_type === 'file') icon = '📁';

    activeStagedStep = {
      sessionId: activeSessionId,
      stepId: item.id,
      type: item.content_type,
      title: item.title,
      fileUrl: resolvedUrl,
      fileName: item.file_name || item.title,
    };

    if (chip && chipIcon && chipTitle) {
      chipIcon.textContent = icon;
      chipTitle.textContent = `#${stepOrder} ${item.title}`;
      chip.style.display = 'inline-flex';
    }

    if (input) {
      input.focus();
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (feedback) {
      feedback.textContent = `✅ فایل ${icon} «${item.title}» در کادر چت قرار گرفت. برای ارسال، دکمه «ارسال پیام» را بزنید.`;
      setTimeout(() => { if (feedback) feedback.textContent = ''; }, 3500);
    }
  }
}

const pendingWeeklyMedia = new Set();
async function sendConfirmedWeeklyMedia(item) {
  if (!activeSessionId) {
    alert('لطفاً ابتدا یک کلاس را انتخاب کنید.');
    return;
  }
  const targetSessionId = Number(activeSessionId);
  const pendingKey = `${targetSessionId}:${item.id}`;
  if (pendingWeeklyMedia.has(pendingKey)) return;
  pendingWeeklyMedia.add(pendingKey);
  const feedback = document.getElementById('weekly-content-feedback');
  try {
    const approved = await confirmAdminMediaSend({
      type: item.content_type, name: item.title || item.file_name, sessionId: targetSessionId,
    });
    if (!approved) return;
    if (!socket?.connected) throw new Error('اتصال چت برقرار نیست؛ دوباره تلاش کنید.');
    const fileUrl = safeFileUrl(item.file_url || item.payload || '');
    if (fileUrl === '#') throw new Error('مسیر فایل معتبر نیست.');
    if (feedback) feedback.textContent = 'در حال ارسال فایل به کلاس…';
    const senderType = document.getElementById('admin-sender-type')?.value || 'admin';
    await new Promise((resolve, reject) => {
      socket.timeout(10000).emit('send_message', {
        sessionId: targetSessionId,
        content: item.title || item.file_name || 'فایل',
        senderType,
        messageType: item.content_type,
        fileUrl,
        fileName: item.file_name || item.title,
      }, (error, ack) => {
        if (error || !ack?.success) reject(new Error(ack?.message || 'ارسال فایل تأیید نشد.'));
        else resolve();
      });
    });
    markStepAsSent(targetSessionId, item.id);
    if (feedback) feedback.textContent = 'فایل با موفقیت به کلاس ارسال شد.';
  } catch (error) {
    if (feedback) feedback.textContent = error.message || 'خطا در ارسال فایل.';
  } finally {
    pendingWeeklyMedia.delete(pendingKey);
  }
}

function clearStagedMedia() {
  const chip = document.getElementById('staged-media-chip');
  if (chip) chip.style.display = 'none';
  if (activeStagedStep && activeStagedStep.type !== 'text') {
    activeStagedStep = null;
  }
}
window.clearStagedMedia = clearStagedMedia;

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

async function toggleAdminVaultLock() {
  if (!activeSessionId) {
    alert('لطفاً ابتدا یک جلسه را از سایدبار انتخاب کنید.');
    return;
  }
  const currentUnlocked = sessionsMap[activeSessionId]?.is_vault_unlocked ? 1 : 0;
  const targetWeek = currentSelectedWeek || 5;
  const nextUnlockedState = currentUnlocked ? 0 : 1;

  // تغییر فوری ظاهر دکمه جهت بازخورد بصری سریع
  updateVaultLockBtnUI(nextUnlockedState, targetWeek);
  if (sessionsMap[activeSessionId]) {
    sessionsMap[activeSessionId].is_vault_unlocked = nextUnlockedState;
    sessionsMap[activeSessionId].vault_target_week = targetWeek;
  }

  // ارسال از طریق سوکت
  if (socket && socket.connected) {
    socket.emit('toggle_vault_lock', {
      sessionId: activeSessionId,
      isUnlocked: Boolean(nextUnlockedState),
      week: targetWeek
    }, (res) => {
      if (res && typeof res.isUnlocked !== 'undefined') {
        updateVaultLockBtnUI(res.isUnlocked, res.targetWeek || targetWeek);
        if (sessionsMap[activeSessionId]) {
          sessionsMap[activeSessionId].is_vault_unlocked = res.isUnlocked ? 1 : 0;
          sessionsMap[activeSessionId].vault_target_week = res.targetWeek || targetWeek;
        }
      }
    });
  }

  // درخواست HTTP پشتیبان برای تضمین ذخیره قطعی
  try {
    const res = await fetch(`/api/sessions/${activeSessionId}/vault-lock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ isUnlocked: Boolean(nextUnlockedState), week: targetWeek })
    });
    const data = await res.json();
    if (data.success && typeof data.isUnlocked !== 'undefined') {
      updateVaultLockBtnUI(data.isUnlocked, data.targetWeek || targetWeek);
      if (sessionsMap[activeSessionId]) {
        sessionsMap[activeSessionId].is_vault_unlocked = data.isUnlocked ? 1 : 0;
        sessionsMap[activeSessionId].vault_target_week = data.targetWeek || targetWeek;
      }
    }
  } catch (err) {
    console.warn('HTTP vault lock toggle fallback notice:', err);
  }
}

function updateVaultLockBtnUI(isUnlocked, week = currentSelectedWeek || 5) {
  const btn = document.getElementById('admin-vault-lock-btn');
  const mobileBtn = document.getElementById('mobile-admin-vault-lock-btn');
  const btns = [btn, mobileBtn].filter(Boolean);

  btns.forEach(b => {
    if (isUnlocked) {
      b.innerHTML = `🔓 گاوصندوق: باز (هفته ${week})`;
      b.className = 'command-button success';
      b.style.borderColor = '#10b981';
      b.style.color = '#34d399';
      b.title = `گاوصندوق برای هفته ${week} فعال و باز است. برای پلمپ کلیک کنید.`;
    } else {
      b.innerHTML = '🔒 پلمپ گاوصندوق';
      b.className = 'command-button';
      b.style.borderColor = '';
      b.style.color = '';
      b.title = 'گاوصندوق پلمپ و غیرفعال است؛ برای بازگشایی کلیک کنید.';
    }
  });
}

window.toggleAdminVaultLock = toggleAdminVaultLock;

/* ==========================================================================
   پنل انتخاب ایموجی (Emoji Picker) در ترمینال فرماندهی (ادمین)
   ========================================================================== */
const ADMIN_EMOJI_CATEGORIES = {
  faces: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😋', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐'],
  detective: ['🕵️', '🕵️‍♂️', '🕵️‍♀️', '🔍', '🔎', '🕯️', '🔦', '📜', '📃', '📄', '📁', '📂', '🗂️', '📌', '📍', '📎', '🗝️', '🔑', '🔒', '🔓', '🔐', '🛡️', '⚠️', '🚨', '🩸', '🧬', '🔬', '🔭', '📡', '💻', '🖥️', '⌨️', '📷', '📹', '🎙️', '☎️', '🕰️', '⏳', '⌛', '🗺️', '🧭', '🏚️', '🌲', '🌑', '🦉', '🐾', '👣', '💀', '☠️', '👻', '🎭', '🧩', '♟️', '🎯'],
  hands: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🙏', '🤝', '👏', '🙌', '👐', '🤲', '✍️', '👀', '👁️', '🧠', '🗣️', '👤', '👥'],
  symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤', '⚡', '🔥', '✨', '🌟', '⭐', '✅', '☑️', '✔️', '❌', '❎', '❓', '❔', '❕', '❗', '⭕', '🛑', '⛔', '📛', '🚫', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪']
};

function initAdminEmojiPicker() {
  switchAdminEmojiTab('faces');
  document.addEventListener('click', (e) => {
    const picker = document.getElementById('admin-emoji-picker');
    const btn = document.getElementById('admin-emoji-btn');
    if (!picker || picker.hidden) return;
    if (!picker.contains(e.target) && (!btn || !btn.contains(e.target))) {
      picker.hidden = true;
    }
  });
}

function toggleAdminEmojiPicker(event) {
  if (event) event.stopPropagation();
  const picker = document.getElementById('admin-emoji-picker');
  if (!picker) return;
  picker.hidden = !picker.hidden;
}

function switchAdminEmojiTab(category) {
  const grid = document.getElementById('admin-emoji-grid');
  const tabs = document.querySelectorAll('#admin-emoji-tabs .admin-emoji-tab');
  if (!grid) return;

  tabs.forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-cat') === category);
  });

  const list = ADMIN_EMOJI_CATEGORIES[category] || ADMIN_EMOJI_CATEGORIES.faces;
  grid.innerHTML = list.map(emoji =>
    `<button type="button" class="admin-emoji-item" onclick="insertAdminEmoji('${emoji}')">${emoji}</button>`
  ).join('');
}

function insertAdminEmoji(emoji) {
  const input = document.getElementById('admin-msg-input');
  if (!input) return;
  const start = typeof input.selectionStart === 'number' ? input.selectionStart : input.value.length;
  const end = typeof input.selectionEnd === 'number' ? input.selectionEnd : input.value.length;
  const text = input.value;
  input.value = text.slice(0, start) + emoji + text.slice(end);
  input.focus();
  const nextPos = start + emoji.length;
  if (input.setSelectionRange) {
    input.setSelectionRange(nextPos, nextPos);
  }
  input.dispatchEvent(new Event('input'));
}


