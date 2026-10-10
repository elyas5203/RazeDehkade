/**
 * public/assets/js/vault-3d.js
 * منطق کامل گاوصندوق سه‌بعدی اسلات ۴ و سیستم دعوت‌نامه «موزه اسرارآمیز»
 * پیاده‌سازی‌شده طبق مرجع VAULT_SLOT4_MASTER.md
 */

(function () {
  'use strict';

  /**
   * جدول تنظیمات رمزها (فلگ‌های هر جلسه و فلگ نهایی دعوت‌نامه «موزه اسرارآمیز»)
   * هر رمز (code) می‌تواند یک عکس یا چند عکس مجزا در آرایه images داشته باشد.
   * برای جایگزینی پوستر اصلی «موزه اسرارآمیز»، کافی است فایل پوستر خود را در
   * پوشه public/assets/vault/ قرار داده و مسیر آن را در آرایه images بگذارید.
   */
  const DEFAULT_VAULT_FLAGS = [
    {
      id: 'mysterious-museum-finale',
      codes: ['1405', '6062', 'museum', 'موزه', 'موزه اسرارآمیز', 'موزه اسرار امیز'],
      badge: 'دعوت‌نامه رسمی // پایان پرونده',
      title: '🏛️ دعوت‌نامه ویژه نمایش حضوری «موزه اسرارآمیز»',
      subtitle: 'تبریک دستیاران کارآگاه! شما تمام معماهای پرونده را حل کردید و به برنامه حضوری «موزه اسرارآمیز» دعوت شدید.',
      images: [
        '/assets/vault/mysterious-museum-poster.svg',
        '/assets/vault/mysterious-museum-vip-pass.svg'
      ]
    },
    {
      id: 'session-flag-1',
      codes: ['1001', 'flag1', 'فلگ ۱', 'فلگ 1'],
      badge: 'سرنخ ویژه // مرحله اول',
      title: '🔍 مدرک طبقه‌بندی‌شده گاوصندوق (جلسه اول)',
      subtitle: 'فلگ مرحله اول تایید شد! این تصویر محرمانه از داخل گاوصندوق برای گروه شما آزاد گردید.',
      images: [
        '/assets/vault/mysterious-museum-poster.svg'
      ]
    },
    {
      id: 'session-flag-2',
      codes: ['2002', 'flag2', 'فلگ ۲', 'فلگ 2'],
      badge: 'اسناد محرمانه // مرحله دوم',
      title: '📂 گالری اسناد ویژه گاوصندوق (جلسه دوم)',
      subtitle: 'فلگ مرحله دوم تایید شد! از دکمه‌های چپ و راست برای مشاهده تمام تصاویر داخل گاوصندوق استفاده کنید.',
      images: [
        '/assets/vault/mysterious-museum-poster.svg',
        '/assets/vault/mysterious-museum-vip-pass.svg'
      ]
    }
  ];

  let activeRewardFlag = null;
  let activeSlideIndex = 0;
  let isUnlockAnimationRunning = false;
  let vaultAudioCtx = null;

  /**
   * تبدیل ارقام فارسی و عربی به انگلیسی و یکسان‌سازی حروف برای مقایسه دقیق رمز/فلگ
   */
  function normalizeVaultCode(raw) {
    if (!raw) return '';
    const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
    const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
    let out = String(raw).trim();
    for (let i = 0; i < 10; i++) {
      out = out.replace(new RegExp(persianDigits[i], 'g'), String(i));
      out = out.replace(new RegExp(arabicDigits[i], 'g'), String(i));
    }
    return out.replace(/\s+/g, ' ').toLowerCase();
  }

  function getSessionStorageKey() {
    try {
      const sd = JSON.parse(localStorage.getItem('session_data') || '{}');
      return `raze_vault_unlocked_${sd.id || sd.code || 'guest'}`;
    } catch (_) {
      return 'raze_vault_unlocked_guest';
    }
  }

  function getAllConfiguredFlags() {
    const customList = Array.isArray(window.CUSTOM_VAULT_FLAGS) ? window.CUSTOM_VAULT_FLAGS : [];
    return [...customList, ...DEFAULT_VAULT_FLAGS];
  }

  function findMatchingVaultFlag(inputCode) {
    const cleanInput = normalizeVaultCode(inputCode);
    if (!cleanInput) return null;

    let currentSessionCode = '';
    let currentSessionId = '';
    try {
      const sd = JSON.parse(localStorage.getItem('session_data') || '{}');
      currentSessionCode = normalizeVaultCode(sd.code || sd.chat_code || '');
      currentSessionId = String(sd.id || '');
    } catch (_) {}

    const flags = getAllConfiguredFlags();
    for (const item of flags) {
      if (item.sessionId && String(item.sessionId) !== currentSessionId) continue;
      if (item.sessionCode && normalizeVaultCode(item.sessionCode) !== currentSessionCode) continue;

      const candidateCodes = Array.isArray(item.codes)
        ? item.codes
        : [item.code];

      for (const c of candidateCodes) {
        if (normalizeVaultCode(c) === cleanInput) {
          return item;
        }
      }
    }
    return null;
  }

  // ============================================================================
  // موتور تولید صدای مکانیکی گاوصندوق (Web Audio API — بدون نیاز به فایل خارجی)
  // ============================================================================
  function getAudioContext() {
    if (!vaultAudioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        vaultAudioCtx = new AudioCtx();
      }
    }
    if (vaultAudioCtx && vaultAudioCtx.state === 'suspended') {
      vaultAudioCtx.resume().catch(() => {});
    }
    return vaultAudioCtx;
  }

  function playVaultKeyClick() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(920, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 0.045);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (_) {}
  }

  function playVaultErrorSound() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      [0, 0.14].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(155, ctx.currentTime + offset);
        osc.frequency.setValueAtTime(115, ctx.currentTime + offset + 0.06);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.13);
      });
    } catch (_) {}
  }

  /**
   * صدای چرخش آرام و سنگین چرخ‌دنده‌های دستگیره گاوصندوق (طی ۳.۵ ثانیه)
   */
  function playVaultSlowHandleTurnSound() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      // فواصل زمانی تیک‌های مکانیکی متناسب با منحنی چرخش آرام دستگیره
      const clickTimes = [
        0.08, 0.24, 0.42, 0.62, 0.84, 1.08, 1.34, 1.62,
        1.92, 2.24, 2.58, 2.92, 3.25
      ];
      clickTimes.forEach((t, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const baseFreq = 320 + (idx % 3) * 45;
        osc.frequency.setValueAtTime(baseFreq, ctx.currentTime + t);
        osc.frequency.exponentialRampToValueAtTime(95, ctx.currentTime + t + 0.06);
        gain.gain.setValueAtTime(0.11, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.065);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.07);
      });

      // صدای آزاد شدن زبانه‌های فولادی در ثانیه ۳.۳
      const boltOsc = ctx.createOscillator();
      const boltGain = ctx.createGain();
      boltOsc.type = 'triangle';
      boltOsc.frequency.setValueAtTime(190, ctx.currentTime + 3.32);
      boltOsc.frequency.exponentialRampToValueAtTime(62, ctx.currentTime + 3.55);
      boltGain.gain.setValueAtTime(0.18, ctx.currentTime + 3.32);
      boltGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.56);
      boltOsc.connect(boltGain);
      boltGain.connect(ctx.destination);
      boltOsc.start(ctx.currentTime + 3.32);
      boltOsc.stop(ctx.currentTime + 3.58);
    } catch (_) {}
  }

  /**
   * صدای باز شدن درب سنگین گاوصندوق و آکورد طلایی کشف راز
   */
  function playVaultDoorOpenAndRevealSound() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const notes = [261.63, 329.63, 392.00, 523.25];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const start = ctx.currentTime + 0.25 + i * 0.11;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.95);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 1.0);
      });
    } catch (_) {}
  }

  // ============================================================================
  // کنترل پاپ‌آپ رمز و انیمیشن ۴ مرحله‌ای باز شدن گاوصندوق سه‌بعدی
  // ============================================================================
  function openVaultInteraction() {
    if (isUnlockAnimationRunning) return;

    // اگر قبلاً در این جلسه رمزی باز شده است، مستقیم گالری را نشان بده (با دکمه امکان وارد کردن رمز جدید)
    if (activeRewardFlag) {
      openVaultRewardModal(activeRewardFlag, 0);
      return;
    }

    openVaultPasswordModal();
  }

  function openVaultPasswordModal() {
    if (isUnlockAnimationRunning) return;
    const rewardDialog = document.getElementById('vault-reward-dialog');
    if (rewardDialog && rewardDialog.open) {
      rewardDialog.close();
    }

    const dialog = document.getElementById('vault-password-dialog');
    const input = document.getElementById('vault-code-input');
    const banner = document.getElementById('vault-feedback-banner');
    if (!dialog) return;

    dialog.classList.remove('is-error-shake');
    if (banner) {
      banner.hidden = true;
      banner.textContent = '';
      banner.className = 'vault-feedback-banner';
    }
    if (input) {
      input.value = '';
    }

    if (!dialog.open) {
      dialog.showModal();
    }
    setTimeout(() => input?.focus(), 60);
  }

  function closeVaultPasswordModal() {
    const dialog = document.getElementById('vault-password-dialog');
    if (dialog && dialog.open) {
      dialog.close();
    }
  }

  function appendVaultKeypadChar(char) {
    playVaultKeyClick();
    const input = document.getElementById('vault-code-input');
    const banner = document.getElementById('vault-feedback-banner');
    if (!input) return;
    if (banner && !banner.hidden) {
      banner.hidden = true;
    }
    if (input.value.length < 24) {
      input.value += String(char);
      input.focus();
    }
  }

  function clearVaultCodeInput() {
    playVaultKeyClick();
    const input = document.getElementById('vault-code-input');
    const banner = document.getElementById('vault-feedback-banner');
    if (input) {
      input.value = '';
      input.focus();
    }
    if (banner) {
      banner.hidden = true;
    }
  }

  function triggerVaultWrongPasswordError(customMsg) {
    playVaultErrorSound();
    const dialog = document.getElementById('vault-password-dialog');
    const card = document.getElementById('quad-vault-card');
    const banner = document.getElementById('vault-feedback-banner');
    const input = document.getElementById('vault-code-input');

    if (dialog) {
      dialog.classList.remove('is-error-shake');
      void dialog.offsetWidth;
      dialog.classList.add('is-error-shake');
    }

    if (card) {
      card.classList.add('is-error-flash');
      setTimeout(() => card.classList.remove('is-error-flash'), 900);
    }

    if (banner) {
      banner.className = 'vault-feedback-banner is-error';
      banner.textContent = customMsg || '⛔ رمز واردشده اشتباه است! قفل گاوصندوق باز نشد.';
      banner.hidden = false;
    }

    if (input) {
      input.select();
    }
  }

  /**
   * اجرای دقیق توالی سینمایی پس از وارد کردن رمز صحیح طبق VAULT_SLOT4_MASTER.md:
   * ۱. بسته شدن فوری پاپ‌آپ رمز
   * ۲. چرخش آرام و واضح دستگیره گاوصندوق (۳.۵ ثانیه)
   * ۳. باز شدن سه‌بعدی درب گاوصندوق (۱.۴ ثانیه)
   * ۴. باز شدن پاپ‌آپ دعوت‌نامه «موزه اسرارآمیز» (تک‌عکس یا چندعکس)
   */
  function runVaultUnlockChoreography(matchedFlag) {
    isUnlockAnimationRunning = true;
    activeRewardFlag = matchedFlag;

    try {
      localStorage.setItem(getSessionStorageKey(), JSON.stringify({
        flagId: matchedFlag.id,
        unlockedAt: Date.now()
      }));
    } catch (_) {}

    // ۱. بستن فوری پاپ‌آپ رمز تا چشم کاربر به گاوصندوق در اسلات ۴ دوخته شود
    closeVaultPasswordModal();

    const card = document.getElementById('quad-vault-card');
    const statusPill = document.getElementById('vault-status-pill');
    const hookHeading = document.getElementById('vault-hook-heading');
    const hookSub = document.getElementById('vault-hook-sub');
    const ctaChip = document.getElementById('vault-cta-chip');
    const qMark = document.getElementById('vault-question-mark');

    if (card) {
      // ریست وضعیت قبلی در صورتی که کاربر رمز مرحله جدیدی را وارد کرده باشد
      card.classList.remove('is-unlocked', 'is-door-open', 'is-bolts-retracted', 'is-turning-handle');
      void card.offsetWidth;

      card.classList.add('is-unlocking-spotlight');
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    if (statusPill) statusPill.textContent = 'GEAR // TURNING';
    if (hookHeading) hookHeading.textContent = 'در حال چرخش قفل...';
    if (hookSub) hookSub.textContent = 'چرخ‌دنده‌های گاوصندوق در حال آزادسازی هستند';
    if (ctaChip) ctaChip.textContent = '⏳ صبر کنید...';

    // ۲. شروع چرخش آرام دستگیره با سرعت پایین (۳.۵ ثانیه)
    setTimeout(() => {
      if (card) card.classList.add('is-turning-handle');
      playVaultSlowHandleTurnSound();
    }, 120);

    // عقب رفتن زبانه‌های فولادی در اواخر چرخش دستگیره
    setTimeout(() => {
      if (card) card.classList.add('is-bolts-retracted');
    }, 3150);

    // ۳. باز شدن سه‌بعدی درب گاوصندوق پس از تکمیل چرخش آرام دستگیره
    setTimeout(() => {
      if (card) card.classList.add('is-door-open');
      if (statusPill) statusPill.textContent = 'OPENING // 3D';
      if (hookHeading) hookHeading.textContent = 'گاوصندوق باز شد!';
      playVaultDoorOpenAndRevealSound();
    }, 3650);

    // ۴. نمایش پوستر / گالری چندعکسی دعوت‌نامه «موزه اسرارآمیز»
    setTimeout(() => {
      isUnlockAnimationRunning = false;
      applyUnlockedCardVisuals(matchedFlag);
      openVaultRewardModal(matchedFlag, 0);
    }, 5050);
  }

  function applyUnlockedCardVisuals(flagItem) {
    const card = document.getElementById('quad-vault-card');
    const statusPill = document.getElementById('vault-status-pill');
    const hookHeading = document.getElementById('vault-hook-heading');
    const hookSub = document.getElementById('vault-hook-sub');
    const ctaChip = document.getElementById('vault-cta-chip');
    const qMark = document.getElementById('vault-question-mark');

    if (card) {
      card.classList.remove('is-unlocking-spotlight');
      card.classList.add('is-turning-handle', 'is-bolts-retracted', 'is-door-open', 'is-unlocked');
    }
    if (statusPill) statusPill.textContent = 'UNLOCKED // باز';
    if (qMark) qMark.textContent = '✓';
    if (hookHeading) hookHeading.textContent = 'موزه اسرارآمیز';
    if (hookSub) hookSub.textContent = 'دعوت‌نامه ویژه شما داخل گاوصندوق آماده است';
    if (ctaChip) ctaChip.textContent = '🏛️ مشاهده دعوت‌نامه';
  }

  function submitVaultPassword(event) {
    if (event) event.preventDefault();
    if (isUnlockAnimationRunning) return;

    const input = document.getElementById('vault-code-input');
    const rawCode = input ? input.value.trim() : '';

    if (!rawCode) {
      triggerVaultWrongPasswordError('⚠️ لطفاً ابتدا رمز گاوصندوق را وارد کنید.');
      return;
    }

    const matchedFlag = findMatchingVaultFlag(rawCode);
    if (!matchedFlag) {
      triggerVaultWrongPasswordError('⛔ رمز واردشده اشتباه است! قفل گاوصندوق باز نشد.');
      return;
    }

    runVaultUnlockChoreography(matchedFlag);
  }

  // ============================================================================
  // کنترل گالری نمایش تک‌عکس یا چندعکس دعوت‌نامه (#vault-reward-dialog)
  // ============================================================================
  function openVaultRewardModal(flagItem, initialIndex = 0) {
    const dialog = document.getElementById('vault-reward-dialog');
    if (!dialog || !flagItem) return;

    activeRewardFlag = flagItem;
    const images = Array.isArray(flagItem.images) && flagItem.images.length > 0
      ? flagItem.images
      : ['/assets/vault/mysterious-museum-poster.svg'];

    activeSlideIndex = Math.max(0, Math.min(initialIndex, images.length - 1));

    const eyebrowEl = document.getElementById('vault-reward-eyebrow');
    const titleEl = document.getElementById('vault-reward-title');
    const subtitleEl = document.getElementById('vault-reward-subtitle');

    if (eyebrowEl) eyebrowEl.textContent = flagItem.badge || 'دعوت‌نامه رسمی // گاوصندوق اسرار';
    if (titleEl) titleEl.textContent = flagItem.title || '🏛️ دعوت‌نامه نمایش حضوری «موزه اسرارآمیز»';
    if (subtitleEl) subtitleEl.textContent = flagItem.subtitle || '';

    renderVaultGallerySlide();

    if (!dialog.open) {
      dialog.showModal();
    }
  }

  function renderVaultGallerySlide() {
    if (!activeRewardFlag) return;
    const images = Array.isArray(activeRewardFlag.images) && activeRewardFlag.images.length > 0
      ? activeRewardFlag.images
      : ['/assets/vault/mysterious-museum-poster.svg'];

    const currentUrl = images[activeSlideIndex] || images[0];
    const mainImg = document.getElementById('vault-reward-main-img');
    const prevBtn = document.getElementById('vault-gallery-prev');
    const nextBtn = document.getElementById('vault-gallery-next');
    const controlsBar = document.getElementById('vault-gallery-controls');
    const counterEl = document.getElementById('vault-slide-counter');
    const thumbsRow = document.getElementById('vault-thumbs-row');
    const downloadLink = document.getElementById('vault-reward-download-btn');

    if (mainImg) {
      mainImg.src = currentUrl;
      mainImg.alt = activeRewardFlag.title || 'دعوت‌نامه موزه اسرارآمیز';
    }

    if (downloadLink) {
      downloadLink.href = currentUrl;
    }

    const hasMultiple = images.length > 1;
    if (prevBtn) prevBtn.hidden = !hasMultiple;
    if (nextBtn) nextBtn.hidden = !hasMultiple;
    if (controlsBar) controlsBar.hidden = !hasMultiple;

    if (hasMultiple) {
      if (counterEl) {
        counterEl.textContent = `تصویر ${(activeSlideIndex + 1).toLocaleString('fa-IR')} از ${images.length.toLocaleString('fa-IR')}`;
      }
      if (thumbsRow) {
        thumbsRow.innerHTML = images.map((imgUrl, idx) => `
          <button type="button" class="vault-thumb-btn${idx === activeSlideIndex ? ' is-active' : ''}" onclick="selectVaultGallerySlide(${idx})" aria-label="تصویر ${idx + 1}">
            <img src="${imgUrl}" alt="">
          </button>
        `).join('');
      }
    }
  }

  function changeVaultGallerySlide(delta) {
    if (!activeRewardFlag || !Array.isArray(activeRewardFlag.images) || activeRewardFlag.images.length <= 1) return;
    const len = activeRewardFlag.images.length;
    activeSlideIndex = (activeSlideIndex + delta + len) % len;
    playVaultKeyClick();
    renderVaultGallerySlide();
  }

  function selectVaultGallerySlide(index) {
    if (!activeRewardFlag || !Array.isArray(activeRewardFlag.images)) return;
    activeSlideIndex = Math.max(0, Math.min(Number(index) || 0, activeRewardFlag.images.length - 1));
    playVaultKeyClick();
    renderVaultGallerySlide();
  }

  function closeVaultRewardModal() {
    const dialog = document.getElementById('vault-reward-dialog');
    if (dialog && dialog.open) {
      dialog.close();
    }
  }

  function restoreSavedVaultState() {
    try {
      const raw = localStorage.getItem(getSessionStorageKey());
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.flagId) return;
      const found = getAllConfiguredFlags().find(f => f.id === parsed.flagId);
      if (found) {
        activeRewardFlag = found;
        applyUnlockedCardVisuals(found);
      }
    } catch (_) {}
  }

  document.addEventListener('DOMContentLoaded', restoreSavedVaultState);

  // اتصال توابع به window برای فراخوانی از HTML
  window.openVaultInteraction = openVaultInteraction;
  window.openVaultPasswordModal = openVaultPasswordModal;
  window.closeVaultPasswordModal = closeVaultPasswordModal;
  window.appendVaultKeypadChar = appendVaultKeypadChar;
  window.clearVaultCodeInput = clearVaultCodeInput;
  window.submitVaultPassword = submitVaultPassword;
  window.changeVaultGallerySlide = changeVaultGallerySlide;
  window.selectVaultGallerySlide = selectVaultGallerySlide;
  window.closeVaultRewardModal = closeVaultRewardModal;
  window.VAULT_FLAGS_CONFIG = DEFAULT_VAULT_FLAGS;
})();
