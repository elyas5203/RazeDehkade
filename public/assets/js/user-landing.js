/**
 * public/assets/js/user-landing.js
 * منطق صفحه لندینگ کاربر (ورود با کد ۶ یا ۸ رقمی)
 */

async function handleJoin(event) {
  event.preventDefault();

  const codeInput = document.getElementById('session-code');
  const errorDiv = document.getElementById('error-message');
  const code = codeInput.value.trim();

  errorDiv.innerText = '';

  if (!code) {
    errorDiv.innerText = 'لطفاً کد ورود جلسه را وارد کنید.';
    return;
  }

  try {
    const res = await fetch('/api/auth/user/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    const data = await res.json();

    if (!data.success || !data.data) {
      const msg = data.message || '';
      if (res.status === 404 || msg.includes('یافت نشد')) {
        errorDiv.innerText = 'کد روی بسته اشتباه است.';
      } else if (msg.includes('پایان') || msg.includes('آرشیو')) {
        errorDiv.innerText = 'این جلسه تمام شده است.';
      } else {
        errorDiv.innerText = msg || 'کد روی بسته اشتباه است.';
      }
      return;
    }

    // ذخیره اطلاعات جلسه و توکن کاربر در sessionStorage با ساختار یکسان data.data
    sessionStorage.setItem('userToken', data.data.token);
    sessionStorage.setItem('userSession', JSON.stringify(data.data.session));

    // هدایت به صفحه اصلی چت کاربر
    window.location.href = '/chat.html';

  } catch (err) {
    console.error('Error during join:', err);
    errorDiv.innerText = 'ارتباط با سرور برقرار نشد.';
  }
}
