'use strict';

/**
 * audio-unlock.js
 * پروتکل آزادسازی بلادرنگ دسترسی صدای مرورگر (Browser Audio Autoplay Unlocker)
 * با اولین تعامل کاربر (لمس، کلیک، یا فشردن کلید)، موتور وب‌آدیو آنلاک می‌شود
 * تا در زمان ترنزیشن‌ها و آلارم‌های پایان بلک‌اوت هیچ بلاکی توسط مرورگر صورت نگیرد.
 */
(() => {
  let isUnlocked = false;
  window.__sharedAudioCtx = null;

  function unlockAudioEngine() {
    if (isUnlocked) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!window.__sharedAudioCtx) {
        window.__sharedAudioCtx = new AudioCtx();
      }

      if (window.__sharedAudioCtx.state === 'suspended') {
        window.__sharedAudioCtx.resume().catch(() => {});
      }

      // پخش بافر بی‌صدا برای باز کردن قطعی کانال صوتی سیستم‌عامل (به‌ویژه iOS Safari)
      const buffer = window.__sharedAudioCtx.createBuffer(1, 1, 22050);
      const source = window.__sharedAudioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(window.__sharedAudioCtx.destination);
      source.start(0);

      isUnlocked = true;
      try { sessionStorage.setItem('audio_unlocked', 'true'); } catch (_) {}
    } catch (_) {}
  }

  const events = ['pointerdown', 'touchstart', 'click', 'keydown'];
  events.forEach(evt => {
    window.addEventListener(evt, unlockAudioEngine, { capture: true, once: true });
  });

  // در صورتی که قبلاً آنلاک شده باشد
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      try {
        if (sessionStorage.getItem('audio_unlocked') === 'true') {
          unlockAudioEngine();
        }
      } catch (_) {}
    });
  }
})();
