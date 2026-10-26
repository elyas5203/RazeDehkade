'use strict';

const accessForm = document.getElementById('access-form');
const accessInput = document.getElementById('access-code');
const gatewayCard = document.getElementById('gatewayCard');

const normalizeDigits = value => String(value || '')
  .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .replace(/[^0-9]/g, '');

if (accessInput) {
  accessInput.addEventListener('input', () => { 
    accessInput.value = normalizeDigits(accessInput.value); 
  });
}

const prefilled = sessionStorage.getItem('prefillCode');
if (prefilled && accessInput) {
  accessInput.value = prefilled;
  sessionStorage.removeItem('prefillCode');
}

if (accessForm) {
  accessForm.addEventListener('submit', async event => {
    event.preventDefault();
    const error = document.getElementById('access-error');
    const button = document.getElementById('access-submit');
    const code = normalizeDigits(accessInput.value);

    function triggerError(msg) {
      if (error) error.textContent = msg;
      if (button) button.disabled = false;
      if (gatewayCard) {
        gatewayCard.classList.remove('card-shake');
        void gatewayCard.offsetWidth;
        gatewayCard.classList.add('card-shake');
      }
    }

    if (!/^\d{6,8}$/.test(code)) { 
      triggerError('لطفاً کد ۶ تا ۸ رقمی روی کارت را کامل وارد فرمایید.'); 
      return; 
    }

    button.disabled = true; 
    if (error) error.textContent = '';

    try {
      const teacherPhone = sessionStorage.getItem('teacherPhone') || undefined;
      const response = await fetch('/api/auth/user/join', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ code, phone: teacherPhone }) 
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        if (result.isHacked) {
          if (result.data?.token) {
            sessionStorage.setItem('userToken', result.data.token);
          }
          if (result.data?.session) {
            sessionStorage.setItem('userSession', JSON.stringify(result.data.session));
          }
          if (teacherPhone) {
            sessionStorage.setItem('teacherPhone', teacherPhone);
            sessionStorage.setItem('emergency_user_phone', teacherPhone);
          }
          triggerError(result.message || '⚠️ هشدار فوق‌امنیتی: پایگاه تحت نفوذ سایبری است. در حال انتقال به درگاه اضطراری...');
          setTimeout(() => {
            location.replace(result.redirectUrl || '/emergency-auth.html');
          }, 1400);
          return;
        }
        throw new Error(result.message || 'کد واردشده صحیح نیست؛ لطفاً کارت بسته را بررسی کنید.');
      }
      sessionStorage.setItem('userToken', result.data.token);
      sessionStorage.setItem('userSession', JSON.stringify(result.data.session));
      document.body.classList.add('opening');
      accessInput.blur();
      setTimeout(() => {
        location.replace('/archive.html');
      }, matchMedia('(prefers-reduced-motion:reduce)').matches ? 200 : 1800);
    } catch (failure) { 
      const msg = failure instanceof TypeError ? 'ارتباط برقرار نشد؛ اتصال سرور را بررسی فرمایید.' : failure.message;
      triggerError(msg);
    }
  });
}
