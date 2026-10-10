/**
 * public/assets/js/vault-3d.js
 * منطق کامل گاوصندوق سه‌بعدی تمام‌قد اسلات ۴ و سیستم دعوت‌نامه «موزه اسرارآمیز»
 * پیاده‌سازی‌شده طبق مرجع VAULT_SLOT4_MASTER.md
 * - ۱۰۰٪ فضای اسلات چهارم فقط خود گاوصندوق سه‌بعدی است (بدون هیچ متن لو دهنده)
 * - با هر بار رفرش شدن صفحه، گاوصندوق مجدداً بسته و قفل می‌شود (عدم ذخیره وضعیت باز در localStorage)
 */

(function () {
  'use strict';

  /**
   * جدول تنظیمات رمزها (فلگ‌های هر جلسه و فلگ نهایی دعوت‌نامه «موزه اسرارآمیز»)
   * هر رمز (codes) می‌تواند یک عکس یا چند عکس مجزا در آرایه images داشته باشد.
   */
  const DEFAULT_VAULT_FLAGS = [
    {
      id: 'mysterious-museum-finale',
      codes: ['1405', '6062', 'museum', 'موزه', 'موزه اسرارآمیز', 'موزه اسرار امیز'],
      badge: 'دعوت‌نامه رسمی // موزه اسرارآمیز',
      title: '🏛️ دعوت‌نامه ویژه نمایش حضوری «موزه اسرارآمیز»',
      subtitle: 'تبریک! قفل گاوصندوق باز شد و شما به برنامه حضوری «موزه اسرارآمیز» دعوت شدید.',
      images: [
        '/assets/vault/mysterious-museum-poster.svg',
        '/assets/vault/mysterious-museum-vip-pass.svg'
      ]
    },
    {
      id: 'session-flag-1',
      codes: ['1001', 'flag1', 'فلگ ۱', 'فلگ 1'],
      badge: 'فایل محرمانه // مرحله اول',
      title: '🔍 سند آزادشده از گاوصندوق (مرحله اول)',
      subtitle: 'قفل مرحله اول بازگشایی شد.',
      images: [
        '/assets/vault/mysterious-museum-poster.svg'
      ]
    },
    {
      id: 'session-flag-2',
      codes: ['2002', 'flag2', 'فلگ ۲', 'فلگ 2'],
      badge: 'گالری محرمانه // مرحله دوم',
      title: '📂 اسناد آزادشده از گاوصندوق (مرحله دوم)',
      subtitle: 'قفل مرحله دوم بازگشایی شد. از دکمه‌های چپ و راست برای ورق زدن تصاویر استفاده کنید.',
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
  // سیاست سکوت مکانیکی و حذف قطعی صداهای بازی/دیدیدینگ طبق VAULT_SLOT4_MASTER.md
  // ============================================================================
  function playVaultKeyClick() {
    /* Silent: تمام صداهای مصنوعی کلیک طبق دستور حذف شدند */
  }

  function playVaultErrorSound() {
    /* Silent: آلارم‌های الکترونیکی حذف شدند */
  }

  function playVaultSlowHandleTurnSound() {
    /* Silent: صداهای تکراری چرخ‌دنده‌ها حذف شدند */
  }

  function playVaultDoorOpenAndRevealSound() {
    /* Silent: صدای پیروزی دیدیدینگ و آکوردهای بازی طبق دستور کاربر به کلی حذف شدند */
  }

  // ============================================================================
  // کنترل پاپ‌آپ رمز و انیمیشن ۴ مرحله‌ای باز شدن گاوصندوق سه‌بعدی
  // ============================================================================
  function openVaultInteraction() {
    if (isUnlockAnimationRunning) return;

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

    if (banner) {
      banner.hidden = true;
      banner.textContent = '';
      banner.className = 'vault-feedback-banner';
    }
    if (input) {
      input.classList.remove('is-error');
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
    input.classList.remove('is-error');
    if (banner && !banner.hidden) {
      banner.hidden = true;
    }
    if (input.value.length < 32) {
      input.value += String(char);
      input.focus();
    }
  }

  function clearVaultCodeInput() {
    playVaultKeyClick();
    const input = document.getElementById('vault-code-input');
    const banner = document.getElementById('vault-feedback-banner');
    if (input) {
      input.classList.remove('is-error');
      input.value = '';
      input.focus();
    }
    if (banner) {
      banner.hidden = true;
    }
  }

  function triggerVaultWrongPasswordError(customMsg) {
    playVaultErrorSound();
    const banner = document.getElementById('vault-feedback-banner');
    const input = document.getElementById('vault-code-input');

    if (input) {
      input.classList.remove('is-error');
      void input.offsetWidth;
      input.classList.add('is-error');
      input.select();
    }

    if (banner) {
      banner.className = 'vault-feedback-banner error';
      banner.textContent = customMsg || '⛔ دسترسی غیرمجاز! رمز گاوصندوق اسناد محرمانه نادرست است.';
      banner.hidden = false;
    }
  }

  /**
   * اجرای دقیق توالی سینمایی پس از وارد کردن رمز صحیح طبق VAULT_SLOT4_MASTER.md:
   * ۱. بسته شدن فوری پاپ‌آپ رمز
   * ۲. چرخش آرام و با سرعت پایین فلکه ۶ پره گاوصندوق + چرخش معکوس چرخ‌دنده‌ها و جمع شدن پیستون‌ها (۳.۵ ثانیه)
   * ۳. باز شدن سه‌بعدی کل درب گاوصندوق در اسلات ۴ (۱.۴۵ ثانیه)
   * ۴. باز شدن پاپ‌آپ دعوت‌نامه «موزه اسرارآمیز» (تک‌عکس یا چندعکس)
   */
  function runVaultUnlockChoreography(matchedFlag) {
    isUnlockAnimationRunning = true;
    activeRewardFlag = matchedFlag;

    // ۱. بستن فوری پاپ‌آپ رمز تا چشم کاربر به گاوصندوق سه‌بعدی در اسلات ۴ دوخته شود
    closeVaultPasswordModal();

    const card = document.getElementById('quad-vault-card');
    const qMark = document.getElementById('vault-question-mark');

    if (card) {
      card.classList.remove('is-unlocked', 'is-unlocking-wheel');
      void card.offsetWidth;
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (qMark) {
      qMark.textContent = '؟';
    }

    // ۲. شروع چرخش آرام فلکه ۶ پره با سرعت پایین (۳.۵ ثانیه) + چرخش معکوس چرخ‌دنده برنجی + جمع شدن ۴ پیستون قفل
    setTimeout(() => {
      if (card) {
        card.classList.add('is-unlocking-wheel');
      }
      playVaultSlowHandleTurnSound();
    }, 100);

    // ۳. باز شدن سه‌بعدی کل درب گاوصندوق پس از تکمیل چرخش آرام دستگیره
    setTimeout(() => {
      if (card) {
        card.classList.add('is-unlocked');
      }
      if (qMark) {
        qMark.textContent = '✓';
      }
      playVaultDoorOpenAndRevealSound();
    }, 3650);

    // ۴. نمایش پوستر / گالری چندعکسی دعوت‌نامه «موزه اسرارآمیز»
    setTimeout(() => {
      isUnlockAnimationRunning = false;
      if (card) {
        card.classList.remove('is-unlocking-wheel');
      }
      openVaultRewardModal(matchedFlag, 0);
    }, 5050);
  }

  function submitVaultPassword(event) {
    if (event) event.preventDefault();
    if (isUnlockAnimationRunning) return;

    const input = document.getElementById('vault-code-input');
    const rawCode = input ? input.value.trim() : '';

    if (!rawCode) {
      triggerVaultWrongPasswordError('⚠️ لطفاً ابتدا رمز عبور اسناد محرمانه را وارد کنید.');
      return;
    }

    const matchedFlag = findMatchingVaultFlag(rawCode);
    if (!matchedFlag) {
      triggerVaultWrongPasswordError('⛔ دسترسی غیرمجاز! رمز گاوصندوق اسناد محرمانه نادرست است.');
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

    if (eyebrowEl) eyebrowEl.textContent = flagItem.badge || 'موزه اسرارآمیز';
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
          <button type="button" class="vault-thumb-btn${idx === activeSlideIndex ? ' active' : ''}" onclick="selectVaultGallerySlide(${idx})" aria-label="تصویر ${idx + 1}">
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

  /**
   * قانون قطعی VAULT_SLOT4_MASTER.md:
   * با هر بار رفرش شدن صفحه، گاوصندوق حتماً باید بسته و قفل شود (پاک‌سازی کامل کلیدهای قدیمی localStorage).
   */
  function resetVaultToLockedOnRefresh() {
    activeRewardFlag = null;
    activeSlideIndex = 0;
    isUnlockAnimationRunning = false;

    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('raze_vault_unlocked')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (_) {}

    const card = document.getElementById('quad-vault-card');
    const qMark = document.getElementById('vault-question-mark');
    if (card) {
      card.classList.remove('is-unlocked', 'is-unlocking-wheel');
    }
    if (qMark) {
      qMark.textContent = '؟';
    }
  }

  document.addEventListener('DOMContentLoaded', resetVaultToLockedOnRefresh);

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
  window.resetVaultToLockedOnRefresh = resetVaultToLockedOnRefresh;
  window.VAULT_FLAGS_CONFIG = DEFAULT_VAULT_FLAGS;
})();
