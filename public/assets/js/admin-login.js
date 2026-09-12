/**
 * public/assets/js/admin-login.js
 * منطق ورود مخفی ادمین
 */

async function handleAdminLogin(event) {
  event.preventDefault();

  const usernameInput = document.getElementById('admin-username');
  const passwordInput = document.getElementById('admin-password');
  const errorDiv = document.getElementById('error-message');

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  errorDiv.innerText = '';

  if (!username || !password) {
    errorDiv.innerText = 'نام کاربری و رمز عبور الزامی است.';
    return;
  }

  try {
    const res = await fetch('/api/auth/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!data.success) {
      errorDiv.innerText = data.message || 'نام کاربری یا رمز عبور اشتباه است.';
      return;
    }

    // ذخیره توکن ادمین و اطلاعات در localStorage
    localStorage.setItem('adminToken', data.data.token);
    localStorage.setItem('adminUser', JSON.stringify(data.data.admin));

    // هدایت به داشبورد ادمین
    window.location.href = '/admin/dashboard.html';

  } catch (err) {
    console.error('Admin login error:', err);
    errorDiv.innerText = 'خطا در ارتباط با سرور.';
  }
}
