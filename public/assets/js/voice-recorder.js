/**
 * public/assets/js/voice-recorder.js
 * سیستم پیشرفته ضبط و پخش ویس تلگرامی دانش‌آموزان درون چت
 * منطبق بر سلیقه کارفرما: سقف ۲ دقیقه، تایمر، پیش‌نمایش، لغو و ارسال
 */

class VoiceRecorder {
  constructor(options = {}) {
    this.maxDurationSeconds = options.maxDurationSeconds || 120; // سقف ۲ دقیقه
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.timerInterval = null;
    this.secondsRecorded = 0;
    this.recordedBlob = null;
    this.previewAudio = null;
    this.isPlayingPreview = false;

    this.composerEl = document.getElementById('message-form');
    this.controlsEl = document.querySelector('.composer-controls');
    this.msgInputEl = document.getElementById('msg-input');
    this.attachBtnEl = document.querySelector('.attach-button');
    this.sendBtnEl = document.querySelector('.send-button');

    this.initUI();
  }

  initUI() {
    if (!this.composerEl) return;

    // ایجاد دکمه میکروفون در کنار دکمه ارسال
    this.micBtn = document.createElement('button');
    this.micBtn.type = 'button';
    this.micBtn.id = 'voice-record-btn';
    this.micBtn.className = 'voice-record-btn';
    this.micBtn.setAttribute('aria-label', 'ضبط گزارش صوتی به مرکز فرماندهی');
    this.micBtn.title = 'مخابره گزارش صوتی به مرکز فرماندهی';
    this.micBtn.innerHTML = `
      <svg class="icon mic-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    `;
    this.micBtn.addEventListener('click', () => this.toggleRecord());

    // قرار دادن دکمه میکروفون داخل کادر کنترل پیام
    if (this.controlsEl && this.sendBtnEl) {
      this.controlsEl.insertBefore(this.micBtn, this.sendBtnEl);
    }

    // ایجاد نوار ضبط گزارش صوتی (پنهان به صورت پیش‌فرض)
    this.recordBar = document.createElement('div');
    this.recordBar.id = 'voice-record-bar';
    this.recordBar.className = 'voice-record-bar hidden';
    this.recordBar.innerHTML = `
      <div class="voice-status">
        <span class="rec-dot"></span>
        <span class="rec-timer" id="voice-timer">۰۰:۰۰</span>
        <div class="rec-wave">
          <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
        </div>
      </div>
      <div class="voice-actions">
        <button type="button" class="voice-act-btn cancel" id="voice-cancel-btn" title="حذف و انصراف">
          <svg class="icon" viewBox="0 0 24 24"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          <span>لغو</span>
        </button>
        <button type="button" class="voice-act-btn preview" id="voice-preview-btn" title="شنیدن گزارش ضبط‌شده">
          <svg class="icon" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          <span id="voice-preview-label">شنیدن</span>
        </button>
        <button type="button" class="voice-act-btn send" id="voice-send-btn" title="مخابره به مرکز فرماندهی">
          <svg class="icon" viewBox="0 0 24 24"><path d="m20 4-6 16-4-6-6-4 16-6ZM10 14 20 4"/></svg>
          <span>ارسال</span>
        </button>
      </div>
    `;

    this.composerEl.appendChild(this.recordBar);

    document.getElementById('voice-cancel-btn').addEventListener('click', () => this.cancelRecording());
    document.getElementById('voice-preview-btn').addEventListener('click', () => this.togglePreview());
    document.getElementById('voice-send-btn').addEventListener('click', () => this.sendRecording());
  }

  async toggleRecord() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  async startRecording() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.audioChunks = [];
      this.recordedBlob = null;
      this.secondsRecorded = 0;

      let mimeType = '';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          mimeType = 'audio/ogg;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        }
      }

      this.mediaRecorder = mimeType
        ? new MediaRecorder(this.stream, { mimeType })
        : new MediaRecorder(this.stream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const type = this.mediaRecorder.mimeType || (this.audioChunks[0] && this.audioChunks[0].type) || 'audio/webm';
        this.recordedBlob = new Blob(this.audioChunks, { type });
        this.showPreviewState();
      };

      this.mediaRecorder.start(200);

      // به‌روزرسانی UI
      this.showRecordingState();
      this.startTimer();
    } catch (err) {
      console.error('Error starting voice recording:', err);
      alert('دسترسی به میکروفون داده نشد یا میکروفون در دسترس نیست.');
    }
  }

  startTimer() {
    this.updateTimerDisplay(0);
    this.timerInterval = setInterval(() => {
      this.secondsRecorded++;
      this.updateTimerDisplay(this.secondsRecorded);

      if (this.secondsRecorded >= this.maxDurationSeconds) {
        this.stopRecording();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateTimerDisplay(seconds) {
    const timerEl = document.getElementById('voice-timer');
    if (!timerEl) return;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  stopRecording() {
    this.stopTimer();
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try { this.mediaRecorder.requestData(); } catch (_) {}
      try { this.mediaRecorder.stop(); } catch (_) {}
    }
    if (this.stream) {
      try { this.stream.getTracks().forEach(track => track.stop()); } catch (_) {}
    }
  }

  stopRecordingAsync() {
    return new Promise((resolve) => {
      this.stopTimer();

      if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
        if (this.stream) {
          try { this.stream.getTracks().forEach(track => track.stop()); } catch (_) {}
        }
        return resolve(this.recordedBlob);
      }

      this.mediaRecorder.onstop = () => {
        const type = this.mediaRecorder.mimeType || (this.audioChunks[0] && this.audioChunks[0].type) || 'audio/webm';
        this.recordedBlob = new Blob(this.audioChunks, { type });
        this.showPreviewState();
        if (this.stream) {
          try { this.stream.getTracks().forEach(track => track.stop()); } catch (_) {}
        }
        resolve(this.recordedBlob);
      };

      try {
        if (typeof this.mediaRecorder.requestData === 'function') {
          this.mediaRecorder.requestData();
        }
        this.mediaRecorder.stop();
      } catch (err) {
        console.error('Error stopping recorder async:', err);
        resolve(this.recordedBlob);
      }
    });
  }

  showRecordingState() {
    this.controlsEl.style.display = 'none';
    this.recordBar.classList.remove('hidden');
    this.recordBar.classList.add('recording');
    this.recordBar.classList.remove('preview-mode');
    document.getElementById('voice-preview-btn').style.display = 'none';
  }

  showPreviewState() {
    this.recordBar.classList.remove('recording');
    this.recordBar.classList.add('preview-mode');
    const previewBtn = document.getElementById('voice-preview-btn');
    previewBtn.style.display = 'inline-flex';
    document.getElementById('voice-preview-label').textContent = 'گوش دادن';
  }

  togglePreview() {
    if (!this.recordedBlob) return;

    if (this.previewAudio && !this.previewAudio.paused) {
      this.previewAudio.pause();
      this.previewAudio.currentTime = 0;
      document.getElementById('voice-preview-label').textContent = 'گوش دادن';
      return;
    }

    if (this.previewAudio) {
      this.previewAudio.pause();
    }

    const audioUrl = URL.createObjectURL(this.recordedBlob);
    this.previewAudio = new Audio(audioUrl);
    this.previewAudio.play();
    document.getElementById('voice-preview-label').textContent = 'توقف';

    this.previewAudio.onended = () => {
      document.getElementById('voice-preview-label').textContent = 'گوش دادن';
    };
  }

  cancelRecording() {
    this.stopRecording();
    if (this.previewAudio) {
      this.previewAudio.pause();
      this.previewAudio = null;
    }
    this.audioChunks = [];
    this.recordedBlob = null;
    this.resetUI();
  }

  resetUI() {
    this.recordBar.classList.add('hidden');
    this.recordBar.classList.remove('recording', 'preview-mode');
    this.controlsEl.style.display = 'flex';
    this.updateTimerDisplay(0);
  }

  async sendRecording() {
    if (this.previewAudio) {
      try { this.previewAudio.pause(); } catch (_) {}
    }

    const token = sessionStorage.getItem('userToken') || sessionStorage.getItem('adminToken');
    const sessionData = JSON.parse(sessionStorage.getItem('userSession') || '{}');
    const sessionId = sessionData.id || window.activeSessionId || sessionStorage.getItem('activeAdminSessionId');

    if (!token || !sessionId) {
      alert('اتصال جلسه نامعتبر است. لطفاً صفحه را بازنشانی فرمایید.');
      return;
    }

    const sendBtn = document.getElementById('voice-send-btn');
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = '<span>در حال ارسال…</span>';
    }

    try {
      // اگر هنوز ضبط در حال انجام است، متوقف کن و منتظر تکمیل کامل ساخت Blob بمان
      if (!this.recordedBlob || this.recordedBlob.size === 0) {
        await this.stopRecordingAsync();
      }

      if (!this.recordedBlob || this.recordedBlob.size === 0) {
        throw new Error('فایل صوتی ضبط نشد یا بسیار کوتاه است.');
      }

      let ext = 'webm';
      const blobType = (this.recordedBlob.type || '').toLowerCase();
      if (blobType.includes('ogg')) {
        ext = 'ogg';
      } else if (blobType.includes('mp4') || blobType.includes('m4a')) {
        ext = 'm4a';
      } else if (blobType.includes('aac')) {
        ext = 'aac';
      } else if (blobType.includes('wav')) {
        ext = 'wav';
      } else if (blobType.includes('mp3') || blobType.includes('mpeg')) {
        ext = 'mp3';
      }

      const filename = `voice-user-${Date.now()}.${ext}`;
      const formData = new FormData();
      // استفاده مستقیم از Blob جهت سازگاری کامل با تمامی مرورگرها (به‌ویژه سافاری iOS)
      formData.append('file', this.recordedBlob, filename);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errJson = await uploadRes.json().catch(() => ({}));
        throw new Error(errJson.message || `خطای سرور (${uploadRes.status}) هنگام آپلود ویس`);
      }

      const uploadData = await uploadRes.json();
      if (!uploadData.success || !uploadData.data || !uploadData.data.fileUrl) {
        throw new Error((uploadData && uploadData.message) || 'خطا در دریافت نشانی ویس از سرور');
      }

      const fileUrl = uploadData.data.fileUrl;
      const originalName = uploadData.data.fileName || uploadData.data.originalName || filename;

      // ارسال رویداد سوکت با نوع user_voice
      if (typeof window.sendUserVoiceMessage === 'function') {
        window.sendUserVoiceMessage(fileUrl, originalName);
      } else if (window.socket && window.socket.connected) {
        window.socket.emit('send_message', {
          sessionId: sessionId,
          content: 'پیام صوتی',
          messageType: 'user_voice',
          fileUrl: fileUrl,
          fileName: originalName,
        });
      } else {
        throw new Error('ارتباط سوکت با سرور برقرار نیست.');
      }

      this.cancelRecording();
    } catch (err) {
      console.error('Error sending voice:', err);
      alert(err.message || 'ارسال ویس با خطا مواجه شد. لطفاً دوباره امتحان کنید.');
    } finally {
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = `
          <svg class="icon" viewBox="0 0 24 24"><path d="m20 4-6 16-4-6-6-4 16-6ZM10 14 20 4"/></svg>
          <span>ارسال</span>
        `;
      }
    }
  }
}

// تابع کمکی تبدیل ثانیه به فرمت دقیقه و ثانیه با ارقام فارسی (۰۰:۰۰)
window.formatAudioTime = function(seconds) {
  if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '۰۰:۰۰';
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  const enStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return enStr.replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
};

// مقداردهی اولیه مدت زمان ویس بلافاصله پس از بارگذاری متادیتا
window.initTelegramVoiceAudio = function(containerId) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const audio = wrap.querySelector('.hidden-voice-audio');
  const timeEl = wrap.querySelector('.tg-voice-time');
  if (!audio || !timeEl) return;

  const updateDuration = () => {
    if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
      timeEl.textContent = window.formatAudioTime(audio.duration);
    }
  };

  if (audio.readyState >= 1) {
    updateDuration();
  } else {
    audio.addEventListener('loadedmetadata', updateDuration, { once: true });
    audio.addEventListener('durationchange', updateDuration, { once: true });
  }
};

// کامپوننت پلیر تلگرامی برای نمایش ویس‌ها درون حباب چت (تک‌خطی و فوق‌العاده باریک)
window.createTelegramVoiceMarkup = function(msg, timeStamp) {
  const url = msg.file_url;
  const id = `voice-player-${msg.id}`;
  const stamp = timeStamp || (msg.created_at ? new Date(msg.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : '');

  // ۱۸ ارتفاع متفاوت موج‌های صدا مطابق الگوی گفتار طبیعی
  const barHeights = [35, 65, 40, 85, 55, 100, 45, 75, 60, 90, 50, 80, 35, 70, 90, 50, 65, 40];
  const barsHtml = barHeights.map(h => `<span style="height:${h}%"></span>`).join('');

  // استخراج خودکار طول ویس پس از قرارگیری در DOM
  setTimeout(() => {
    if (typeof window.initTelegramVoiceAudio === 'function') {
      window.initTelegramVoiceAudio(id);
    }
  }, 0);

  return `<div class="tg-voice-bubble" id="${id}" data-src="${url}"><button type="button" class="tg-voice-play-btn" onclick="toggleTelegramVoicePlay('${id}')" aria-label="پخش صدا"><svg class="icon play-icon" viewBox="0 0 24 24"><polygon points="6 4 18 12 6 20 6 4"/></svg><svg class="icon pause-icon hidden" viewBox="0 0 24 24"><rect x="5" y="4" width="4" height="16" rx="1"/><rect x="15" y="4" width="4" height="16" rx="1"/></svg></button><div class="tg-voice-waveform-wrap"><div class="tg-voice-waves" onclick="seekTelegramVoice(event, '${id}')">${barsHtml}<div class="tg-voice-progress" style="width: 0%;"></div></div><div class="tg-voice-meta"><span class="tg-voice-time">۰۰:۰۰</span><span class="tg-voice-stamp">${stamp}</span></div></div><audio preload="metadata" src="${url}" class="hidden-voice-audio"></audio></div>`;
};

window.toggleTelegramVoicePlay = function(containerId) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const audio = wrap.querySelector('.hidden-voice-audio');
  const playBtn = wrap.querySelector('.tg-voice-play-btn');
  if (!audio || !playBtn) return;
  const playIcon = playBtn.querySelector('.play-icon');
  const pauseIcon = playBtn.querySelector('.pause-icon');
  const progress = wrap.querySelector('.tg-voice-progress');
  const timeEl = wrap.querySelector('.tg-voice-time');

  if (audio.paused) {
    // متوقف کردن سایر ویس‌های در حال پخش
    document.querySelectorAll('.hidden-voice-audio').forEach(a => {
      if (a !== audio && !a.paused) {
        a.pause();
        const otherWrap = a.closest('.tg-voice-bubble');
        if (otherWrap) {
          const otherPlay = otherWrap.querySelector('.tg-voice-play-btn .play-icon');
          const otherPause = otherWrap.querySelector('.tg-voice-play-btn .pause-icon');
          if (otherPlay && otherPause) {
            otherPlay.classList.remove('hidden');
            otherPause.classList.add('hidden');
          }
        }
      }
    });

    audio.play().catch(err => console.warn('Audio playback error:', err));
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
  } else {
    audio.pause();
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
  }

  audio.ontimeupdate = () => {
    if (!audio.duration || isNaN(audio.duration)) return;
    const pct = Math.min(100, Math.max(0, (audio.currentTime / audio.duration) * 100));
    if (progress) progress.style.width = `${pct}%`;
    if (timeEl) {
      timeEl.textContent = window.formatAudioTime(audio.currentTime);
    }
  };

  audio.onended = () => {
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    if (progress) progress.style.width = '0%';
    if (timeEl && audio.duration) {
      timeEl.textContent = window.formatAudioTime(audio.duration);
    }
  };

  audio.onpause = () => {
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
  };
};

window.seekTelegramVoice = function(e, containerId) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const audio = wrap.querySelector('.hidden-voice-audio');
  const waves = wrap.querySelector('.tg-voice-waves');
  if (!audio || !audio.duration || isNaN(audio.duration)) return;
  const rect = waves.getBoundingClientRect();
  const isRTL = document.dir === 'rtl' || (document.body && getComputedStyle(document.body).direction === 'rtl');
  const ratio = isRTL 
    ? (rect.right - e.clientX) / rect.width 
    : (e.clientX - rect.left) / rect.width;
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  audio.currentTime = clampedRatio * audio.duration;
  const progress = wrap.querySelector('.tg-voice-progress');
  if (progress) progress.style.width = `${clampedRatio * 100}%`;
  const timeEl = wrap.querySelector('.tg-voice-time');
  if (timeEl) timeEl.textContent = window.formatAudioTime(audio.currentTime);
};
