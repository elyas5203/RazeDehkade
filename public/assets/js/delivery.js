'use strict';

(() => {
  let order;
  try { 
    order = JSON.parse(localStorage.getItem('golha_last_order') || 'null'); 
  } catch (_) {}

  // اگر زمان شروع ثبت نشده بود، زمان فعلی را به عنوان مبدا قرار بده
  let startedAt = Date.now();
  if (order && Number.isFinite(Number(order.countdownStartedAt))) {
    startedAt = Number(order.countdownStartedAt);
  } else if (order) {
    order.countdownStartedAt = startedAt;
    localStorage.setItem('golha_last_order', JSON.stringify(order));
  }

  const numberFormat = new Intl.NumberFormat('fa-IR');
  const TOTAL_DURATION_MS = 25000; // 25 ثانیه برای تحویل
  const CIRCLE_CIRCUMFERENCE = 565.48; // 2 * PI * 90

  let isArrived = false;
  let animFrame;

  window.triggerImmediateArrival = function() {
    if (isArrived) return;
    isArrived = true;
    cancelAnimationFrame(animFrame);
    document.body.dataset.phase = 'arrived';
    const ring = document.getElementById('delivery-ring');
    if (ring) ring.style.strokeDashoffset = '0';
  };

  function update() {
    if (isArrived) return;

    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, TOTAL_DURATION_MS - elapsed);
    const seconds = Math.ceil(remaining / 1000);

    const timerDisplay = document.getElementById('timerDisplay');
    const ring = document.getElementById('delivery-ring');

    if (timerDisplay) {
      timerDisplay.textContent = numberFormat.format(seconds);
    }

    if (ring) {
      const progress = Math.min(1, elapsed / TOTAL_DURATION_MS);
      ring.style.strokeDashoffset = String(CIRCLE_CIRCUMFERENCE * (1 - progress));
    }

    if (remaining <= 0) {
      window.triggerImmediateArrival();
      return;
    }

    animFrame = requestAnimationFrame(update);
  }

  update();

  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(animFrame);
  }, { once: true });
})();
