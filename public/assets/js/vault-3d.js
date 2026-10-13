/**
 * public/assets/js/vault-3d.js
 * منطق کامل گاوصندوق سه‌بعدی تمام‌قد اسلات ۴، قفل تمام‌صفحه با چرخش ۳ دور دستگیره و جمع‌شدن زبانه‌های سمت راست،
 * پاکت کاهی فتو-رئالیستیک استودیویی با خروج کاملاً نرم کاغذ و قرار گرفتن آن روی پوشه کاهی،
 * و سیستم پیش‌بارگذاری و کش خودکار تصاویر در اولین ورود به سایت (نسخه V10.0)
 */

(function () {
  'use strict';

  const ASSET_VERSION = '10.0';
  const CACHE_STORAGE_NAME = 'raze-dehkade-assets-v10';

  const CRITICAL_VAULT_AND_KRAFT_ASSETS = [
    `/assets/vault/real-vault-door-body.jpg?v=${ASSET_VERSION}`,
    `/assets/vault/real-vault-bolts-strip.png?v=${ASSET_VERSION}`,
    `/assets/vault/real-chrome-handle.png?v=${ASSET_VERSION}`,
    `/assets/vault/real-vault-interior.jpg?v=${ASSET_VERSION}`,
    `/assets/vault/real-kraft-closed-top.png?v=${ASSET_VERSION}`,
    `/assets/vault/real-kraft-pocket-front.png?v=${ASSET_VERSION}`,
    `/assets/vault/real-kraft-flap.png?v=${ASSET_VERSION}`,
    `/assets/vault/real-kraft-back-inside.png?v=${ASSET_VERSION}`,
    `/assets/vault/mysterious-museum-poster.svg?v=${ASSET_VERSION}`,
    `/assets/vault/mysterious-museum-vip-pass.svg?v=${ASSET_VERSION}`
  ];

  const DEFAULT_VAULT_FLAGS = [
    {
      id: 'mysterious-museum-finale',
      codes: ['1405', '6062', 'museum', 'موزه'],
      badge: 'خیلی محرمانه',
      title: 'دعوت‌نامه رسمی موزه اسرارآمیز',
      subtitle: '',
      images: [
        `/assets/vault/mysterious-museum-poster.svg?v=${ASSET_VERSION}`,
        `/assets/vault/mysterious-museum-vip-pass.svg?v=${ASSET_VERSION}`
      ]
    },
    {
      id: 'session-flag-1',
      codes: ['1001', 'flag1'],
      badge: 'خیلی محرمانه',
      title: 'دعوت‌نامه رسمی موزه اسرارآمیز',
      subtitle: '',
      images: [
        `/assets/vault/mysterious-museum-poster.svg?v=${ASSET_VERSION}`
      ]
    },
    {
      id: 'session-flag-2',
      codes: ['2002', 'flag2'],
      badge: 'خیلی محرمانه',
      title: 'دعوت‌نامه رسمی موزه اسرارآمیز',
      subtitle: '',
      images: [
        `/assets/vault/mysterious-museum-poster.svg?v=${ASSET_VERSION}`,
        `/assets/vault/mysterious-museum-vip-pass.svg?v=${ASSET_VERSION}`
      ]
    }
  ];

  const MAX_VAULT_CODE_LENGTH = 4;

  // نگهداری رفرنس تصاویر در حافظه مرورگر تا هرگز Garbage Collect نشوند و در لحظه رندر شوند
  const preloadedMemoryImages = [];

  let activeRewardFlag = null;
  let activeSlideIndex = 0;
  let isUnlockAnimationRunning = false;
  let unlockTimers = [];
  let kraftTimers = [];

  function clearUnlockTimers() {
    unlockTimers.forEach((t) => clearTimeout(t));
    unlockTimers = [];
  }

  function clearKraftTimers() {
    kraftTimers.forEach((t) => clearTimeout(t));
    kraftTimers = [];
  }

  /**
   * پیش‌بارگذاری و ذخیره خودکار تصاویر در کش مرورگر (Memory + HTTP Cache + CacheStorage)
   * در اولین ورود کاربر به سایت، تا باز شدن گاوصندوق، پاکت کاهی و تصاویر دستیاران کاملاً آنی باشد.
   */
  function preloadSingleImageIntoMemory(url) {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
          if (typeof img.decode === 'function') {
            img.decode().catch(() => {}).finally(() => resolve(img));
          } else {
            resolve(img);
          }
        };
        img.onerror = () => resolve(null);
        img.src = url;
        preloadedMemoryImages.push(img);
      } catch (_) {
        resolve(null);
      }
    });
  }

  async function warmBrowserAssetCacheOnFirstVisit() {
    // ۱. پیش‌بارگذاری فوری تمام تصاویر گاوصندوق، دستگیره، زبانه‌ها، پاکت کاهی و دعوت‌نامه در حافظه و کش مرورگر
    await Promise.all(CRITICAL_VAULT_AND_KRAFT_ASSETS.map(preloadSingleImageIntoMemory));

    // ۲. ذخیره در CacheStorage مرورگر (در صورت پشتیبانی) برای ماندگاری کامل در کش دیسک
    if ('caches' in window) {
      try {
        const cache = await window.caches.open(CACHE_STORAGE_NAME);
        await Promise.all(
          CRITICAL_VAULT_AND_KRAFT_ASSETS.map(async (url) => {
            const match = await cache.match(url);
            if (!match) {
              await cache.add(url).catch(() => {});
            }
          })
        );
      } catch (_) {}
    }

    // ۳. پیش‌بارگذاری تدریجی تصاویر WebP دستیاران در پس‌زمینه (Idle Batching) تا گالری دستیاران هم از کش باز شود
    const scheduleIdle = window.requestIdleCallback || ((cb) => setTimeout(cb, 250));
    scheduleIdle(async () => {
      try {
        const res = await fetch('/assets/assistants/portraits-manifest.json');
        if (!res.ok) return;
        const manifest = await res.json();
        const classes = manifest && manifest.classes ? Object.values(manifest.classes) : [];
        const allWebpUrls = [];
        for (const cls of classes) {
          if (cls && Array.isArray(cls.students)) {
            for (const st of cls.students) {
              if (st && st.url) {
                allWebpUrls.push(st.url);
              }
            }
          }
        }
        // دانلود دسته‌ای (۴ تصویر در هر نوبت) در پس‌زمینه تا پهنای باند چت اشغال نشود ولی همه در کش مرورگر ذخیره شوند
        const batchSize = 4;
        for (let i = 0; i < allWebpUrls.length; i += batchSize) {
          const batch = allWebpUrls.slice(i, i + batchSize);
          await Promise.all(batch.map(preloadSingleImageIntoMemory));
          await new Promise((r) => setTimeout(r, 90));
        }
      } catch (_) {}
    });
  }

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

      const candidateCodes = Array.isArray(item.codes) ? item.codes : [item.code];
      for (const c of candidateCodes) {
        if (normalizeVaultCode(c) === cleanInput) {
          return item;
        }
      }
    }
    return null;
  }

  function resetFullscreenDialogState() {
    const dialog = document.getElementById('vault-password-dialog');
    if (dialog) {
      dialog.classList.remove('is-unlocking-fullscreen', 'is-shrinking-to-slot');
    }
  }

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

    resetFullscreenDialogState();

    if (banner) {
      banner.hidden = true;
      banner.textContent = '';
      banner.className = 'vault-feedback-banner';
    }
    if (input) {
      input.classList.remove('is-error');
      input.value = '';
      input.setAttribute('maxlength', String(MAX_VAULT_CODE_LENGTH));
    }

    if (!dialog.open) {
      dialog.showModal();
    }
    setTimeout(() => input?.focus(), 60);
  }

  function closeVaultPasswordModal() {
    if (isUnlockAnimationRunning) return;
    const dialog = document.getElementById('vault-password-dialog');
    resetFullscreenDialogState();
    if (dialog && dialog.open) {
      dialog.close();
    }
  }

  /**
   * محدودیت قطعی حداکثر ۴ رقم برای ورود کد گاوصندوق
   */
  function appendVaultKeypadChar(char) {
    if (isUnlockAnimationRunning) return;
    const input = document.getElementById('vault-code-input');
    const banner = document.getElementById('vault-feedback-banner');
    if (!input) return;

    input.classList.remove('is-error');
    if (banner && !banner.hidden) {
      banner.hidden = true;
    }

    if (input.value.length >= MAX_VAULT_CODE_LENGTH) {
      input.focus();
      return;
    }

    input.value = (input.value + String(char)).slice(0, MAX_VAULT_CODE_LENGTH);
    input.focus();
  }

  function clearVaultCodeInput() {
    if (isUnlockAnimationRunning) return;
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

  function backspaceVaultCodeInput() {
    if (isUnlockAnimationRunning) return;
    const input = document.getElementById('vault-code-input');
    const banner = document.getElementById('vault-feedback-banner');
    if (input) {
      input.classList.remove('is-error');
      input.value = input.value.slice(0, -1);
      input.focus();
    }
    if (banner) {
      banner.hidden = true;
    }
  }

  function triggerVaultWrongPasswordError(customMsg) {
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
      banner.textContent = customMsg || '⛔ دسترسی غیرمجاز! رمز ۴ رقمی گاوصندوق نادرست است.';
      banner.hidden = false;
    }
  }

  /**
   * کوریوگرافی باز شدن قفل گاوصندوق در نسخه V10.0 (بدون هیچ نوشته سبز اضافی روی پنل):
   * ۱. در همان صفحه قفل تمام‌صفحه (#vault-password-dialog)، دستگیره سه‌پر در مرکز شافت سمت راست ۳ دور کامل (1080deg) می‌چرخد
   *    و همزمان ۵ زبانه فولادی سمت راست تصویر به داخل شکاف درب فرو می‌روند (0ms تا 3400ms).
   * ۲. سپس کل نمای تمام‌صفحه درب گاوصندوق کوچک شده (Zoom-Out Shrink) و به درون کارت گاوصندوق اسلات ۴ برمی‌گردد (3400ms تا 4050ms).
   * ۳. بلافاصله درب سه‌بعدی کارت گاوصندوق در اسلات ۴ از کادر بیرون می‌زند (4050ms تا 6700ms)
   *    و پاکت کاهی فتو-رئالیستیک اسناد محرمانه باز می‌شود.
   */
  function runVaultUnlockChoreography(matchedFlag) {
    isUnlockAnimationRunning = true;
    activeRewardFlag = matchedFlag;
    clearUnlockTimers();

    const dialog = document.getElementById('vault-password-dialog');
    const banner = document.getElementById('vault-feedback-banner');
    const card = document.getElementById('quad-vault-card');
    const qMark = document.getElementById('vault-question-mark');

    // طبق دستور کاربر، هیچ کادر/نوشته سبزی روی پنل نمایش داده نمی‌شود
    if (banner) {
      banner.hidden = true;
      banner.textContent = '';
    }

    if (card) {
      card.classList.remove('is-unlocked', 'is-unlocking-wheel');
      void card.offsetWidth;
    }
    if (qMark) {
      qMark.textContent = '';
    }

    // مرحله ۱: چرخش ۳ دور کامل دستگیره سه‌پر (1080deg) و فرو رفتن ۵ زبانه سمت راست به داخل درب در نمای تمام‌صفحه
    if (dialog && dialog.open) {
      dialog.classList.remove('is-unlocking-fullscreen', 'is-shrinking-to-slot');
      void dialog.offsetWidth;
      dialog.classList.add('is-unlocking-fullscreen');
    }

    // مرحله ۲: کوچک شدن صفحه تمام‌صفحه (Zoom-Out) و بازگشت به اسلات ۴
    unlockTimers.push(
      setTimeout(() => {
        if (dialog && dialog.open) {
          dialog.classList.add('is-shrinking-to-slot');
        }
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          card.classList.add('is-unlocking-wheel');
        }
      }, 3400)
    );

    // مرحله ۳: بستن دیالوگ تمام‌صفحه و باز شدن سه‌بعدی درب گاوصندوق در اسلات ۴
    unlockTimers.push(
      setTimeout(() => {
        if (dialog && dialog.open) {
          dialog.close();
        }
        resetFullscreenDialogState();

        if (card) {
          card.classList.add('is-unlocked');
        }
        if (qMark) {
          qMark.textContent = '✓';
        }
      }, 4050)
    );

    // مرحله ۴: نمایش پاکت کاهی واقعی اسناد محرمانه
    unlockTimers.push(
      setTimeout(() => {
        isUnlockAnimationRunning = false;
        if (card) {
          card.classList.remove('is-unlocking-wheel');
        }
        openVaultRewardModal(matchedFlag, 0);
      }, 6750)
    );
  }

  function submitVaultPassword(event) {
    if (event) event.preventDefault();
    if (isUnlockAnimationRunning) return;

    const input = document.getElementById('vault-code-input');
    const rawCode = input ? input.value.trim().slice(0, MAX_VAULT_CODE_LENGTH) : '';

    if (!rawCode) {
      triggerVaultWrongPasswordError('ابتدا کد ۴ رقمی قفل گاوصندوق را وارد نمایید.');
      return;
    }

    const matchedFlag = findMatchingVaultFlag(rawCode);
    if (!matchedFlag) {
      triggerVaultWrongPasswordError('کد واردشده نامعتبر است؛ زبانه‌های قفل زرهی باز نشد.');
      return;
    }

    runVaultUnlockChoreography(matchedFlag);
  }

  // ============================================================================
  // کنترل پاکت کاهی فتو-رئالیستیک و خروج نرم کاغذ و قرار گرفتن آن روی پوشه کاهی (V10.0)
  // ============================================================================
  function setKraftEnvelopeState(state) {
    const scene = document.getElementById('kraft-printer-scene');
    const sheet = document.getElementById('kraft-emerging-sheet');
    if (scene) {
      scene.setAttribute('data-envelope-state', state);
    }
    if (sheet && state !== 'complete') {
      sheet.classList.remove('is-zoomed');
    }
  }

  function triggerKraftEnvelopeOpen() {
    const scene = document.getElementById('kraft-printer-scene');
    if (!scene) return;
    const currentState = scene.getAttribute('data-envelope-state') || 'closed';

    if (currentState === 'complete') {
      clearKraftTimers();
      setKraftEnvelopeState('closed');
      return;
    }

    if (currentState !== 'closed') return;

    clearKraftTimers();

    // ۱. باز شدن درِ بالای پوشه کاهی به سمت بالا (rotateX(176deg))
    setKraftEnvelopeState('opening');

    // ۲. سر خوردن کاملاً نرم برگه دعوت‌نامه از داخل شکاف پاکت به بالا و سپس قرار گرفتن روی پوشه کاهی (2.1s)
    kraftTimers.push(
      setTimeout(() => {
        setKraftEnvelopeState('printing');
      }, 300)
    );

    // ۳. تثبیت دعوت‌نامه بر روی (در جلوی) پوشه کاهی
    kraftTimers.push(
      setTimeout(() => {
        setKraftEnvelopeState('complete');
      }, 2400)
    );
  }

  function replayKraftEnvelopeAnimation() {
    clearKraftTimers();
    setKraftEnvelopeState('closed');
    kraftTimers.push(
      setTimeout(() => {
        triggerKraftEnvelopeOpen();
      }, 280)
    );
  }

  function toggleKraftSheetZoom(event) {
    if (event) event.stopPropagation();
    const scene = document.getElementById('kraft-printer-scene');
    const sheet = document.getElementById('kraft-emerging-sheet');
    if (!scene || !sheet) return;
    if (scene.getAttribute('data-envelope-state') !== 'complete') return;
    sheet.classList.toggle('is-zoomed');
  }

  function handleKraftBackdropClick(event) {
    if (!event) return;
    if (event.target && event.target.classList && event.target.classList.contains('kraft-stage-backdrop')) {
      const sheet = document.getElementById('kraft-emerging-sheet');
      if (sheet && sheet.classList.contains('is-zoomed')) {
        sheet.classList.remove('is-zoomed');
      }
    }
  }

  function openVaultRewardModal(flagItem, initialIndex = 0) {
    const dialog = document.getElementById('vault-reward-dialog');
    if (!dialog || !flagItem) return;

    activeRewardFlag = flagItem;
    const images = Array.isArray(flagItem.images) && flagItem.images.length > 0
      ? flagItem.images
      : [`/assets/vault/mysterious-museum-poster.svg?v=${ASSET_VERSION}`];

    activeSlideIndex = Math.max(0, Math.min(initialIndex, images.length - 1));

    clearKraftTimers();
    setKraftEnvelopeState('closed');
    renderVaultGallerySlide();

    if (!dialog.open) {
      dialog.showModal();
    }
  }

  function renderVaultGallerySlide() {
    if (!activeRewardFlag) return;
    const images = Array.isArray(activeRewardFlag.images) && activeRewardFlag.images.length > 0
      ? activeRewardFlag.images
      : [`/assets/vault/mysterious-museum-poster.svg?v=${ASSET_VERSION}`];

    const currentUrl = images[activeSlideIndex] || images[0];
    const mainImg = document.getElementById('vault-reward-main-img');
    const prevBtn = document.getElementById('vault-gallery-prev');
    const nextBtn = document.getElementById('vault-gallery-next');

    if (mainImg) {
      mainImg.src = currentUrl;
      mainImg.alt = activeRewardFlag.title || 'دعوت‌نامه موزه اسرارآمیز';
    }

    const hasMultiple = images.length > 1;
    if (prevBtn) prevBtn.hidden = !hasMultiple;
    if (nextBtn) nextBtn.hidden = !hasMultiple;
  }

  function changeVaultGallerySlide(delta) {
    if (!activeRewardFlag || !Array.isArray(activeRewardFlag.images) || activeRewardFlag.images.length <= 1) return;
    const len = activeRewardFlag.images.length;
    activeSlideIndex = (activeSlideIndex + delta + len) % len;
    renderVaultGallerySlide();
  }

  function selectVaultGallerySlide(index) {
    if (!activeRewardFlag || !Array.isArray(activeRewardFlag.images)) return;
    activeSlideIndex = Math.max(0, Math.min(Number(index) || 0, activeRewardFlag.images.length - 1));
    renderVaultGallerySlide();
  }

  function closeVaultRewardModal() {
    clearKraftTimers();
    const dialog = document.getElementById('vault-reward-dialog');
    if (dialog && dialog.open) {
      dialog.close();
    }
  }

  function resetVaultToLockedOnRefresh() {
    activeRewardFlag = null;
    activeSlideIndex = 0;
    isUnlockAnimationRunning = false;
    clearUnlockTimers();
    clearKraftTimers();
    resetFullscreenDialogState();

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
      qMark.textContent = '';
    }

    const codeInput = document.getElementById('vault-code-input');
    if (codeInput) {
      codeInput.setAttribute('maxlength', String(MAX_VAULT_CODE_LENGTH));
      codeInput.addEventListener('input', function () {
        if (this.value.length > MAX_VAULT_CODE_LENGTH) {
          this.value = this.value.slice(0, MAX_VAULT_CODE_LENGTH);
        }
      });
    }

    // شروع پیش‌بارگذاری و کش خودکار تصاویر به محض باز شدن سایت
    warmBrowserAssetCacheOnFirstVisit();
  }

  document.addEventListener('DOMContentLoaded', resetVaultToLockedOnRefresh);

  window.openVaultInteraction = openVaultInteraction;
  window.openVaultPasswordModal = openVaultPasswordModal;
  window.closeVaultPasswordModal = closeVaultPasswordModal;
  window.appendVaultKeypadChar = appendVaultKeypadChar;
  window.clearVaultCodeInput = clearVaultCodeInput;
  window.backspaceVaultCodeInput = backspaceVaultCodeInput;
  window.submitVaultPassword = submitVaultPassword;
  window.triggerKraftEnvelopeOpen = triggerKraftEnvelopeOpen;
  window.replayKraftEnvelopeAnimation = replayKraftEnvelopeAnimation;
  window.toggleKraftSheetZoom = toggleKraftSheetZoom;
  window.handleKraftBackdropClick = handleKraftBackdropClick;
  window.changeVaultGallerySlide = changeVaultGallerySlide;
  window.selectVaultGallerySlide = selectVaultGallerySlide;
  window.closeVaultRewardModal = closeVaultRewardModal;
  window.resetVaultToLockedOnRefresh = resetVaultToLockedOnRefresh;
  window.VAULT_FLAGS_CONFIG = DEFAULT_VAULT_FLAGS;
})();
