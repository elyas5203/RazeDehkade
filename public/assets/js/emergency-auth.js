/**
 * public/assets/js/emergency-auth.js
 * Logic for the Emergency Cyber Recovery Portal & Questionnaire
 */

'use strict';

(function() {
  const normalizeDigits = value => String(value || '')
    .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[^0-9]/g, '');

  const step1Section = document.getElementById('step1Section');
  const step2Section = document.getElementById('step2Section');
  const step3Section = document.getElementById('step3Section');

  const stepIndicator1 = document.getElementById('stepIndicator1');
  const stepIndicator2 = document.getElementById('stepIndicator2');
  const stepIndicator3 = document.getElementById('stepIndicator3');

  const statusAlert = document.getElementById('statusAlert');
  const authPhoneForm = document.getElementById('authPhoneForm');
  const emergencyPhone = document.getElementById('emergencyPhone');
  const submitStep1Btn = document.getElementById('submitStep1Btn');

  const questionnaireForm = document.getElementById('questionnaireForm');
  const submitStep2Btn = document.getElementById('submitStep2Btn');
  const trackingIdDisplay = document.getElementById('trackingIdDisplay');

  function showAlert(msg, type = 'error') {
    if (!statusAlert) return;
    statusAlert.textContent = msg;
    statusAlert.className = `status-msg ${type}`;
    statusAlert.style.display = 'flex';
  }

  function clearAlert() {
    if (!statusAlert) return;
    statusAlert.textContent = '';
    statusAlert.style.display = 'none';
  }

  // Radio button styling on select
  document.querySelectorAll('.option-label input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const name = radio.getAttribute('name');
      document.querySelectorAll(`input[name="${name}"]`).forEach(r => {
        r.closest('.option-label')?.classList.remove('selected');
      });
      radio.closest('.option-label')?.classList.add('selected');
    });
  });

  // Step 1: Submit Phone / Verification
  if (authPhoneForm) {
    authPhoneForm.addEventListener('submit', async event => {
      event.preventDefault();
      clearAlert();

      const phone = normalizeDigits(emergencyPhone ? emergencyPhone.value : '');

      if (!phone || phone.length < 10) {
        showAlert('لطفاً شماره موبایل معتبر (حداقل ۱۰ رقم) وارد نمایید.');
        return;
      }

      submitStep1Btn.disabled = true;
      submitStep1Btn.innerHTML = '<span>در حال بررسی وضعیت امنیتی پرونده...</span>';

      try {
        // Save phone in sessionStorage for recovery reference
        sessionStorage.setItem('emergency_user_phone', phone);

        // Simulation delay for cyber scanning effect
        await new Promise(r => setTimeout(r, 1200));

        // Transition to Step 2
        step1Section.style.display = 'none';
        step2Section.style.display = 'block';

        stepIndicator1.classList.remove('active');
        stepIndicator1.classList.add('done');
        stepIndicator2.classList.add('active');

        showAlert('هویت شما در پایگاه شناسایی شد. لطفاً به سوالات امنیتی زیر پاسخ دهید.', 'success');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        showAlert('خطا در برقراری ارتباط با سامانه امنیتی. لطفاً مجدداً تلاش کنید.');
        submitStep1Btn.disabled = false;
        submitStep1Btn.innerHTML = '<span>⚡ تایید هویت و ورود به پرسشنامه امنیتی</span>';
      }
    });
  }

  // Step 2: Submit Questionnaire
  if (questionnaireForm) {
    questionnaireForm.addEventListener('submit', async event => {
      event.preventDefault();
      clearAlert();

      const q1 = document.querySelector('input[name="q1"]:checked');
      const q2 = document.querySelector('input[name="q2"]:checked');
      const q3 = document.getElementById('q3Answer')?.value.trim();

      if (!q1 || !q2) {
        showAlert('لطفاً به تمامی گزینه‌های سوال ۱ و ۲ پاسخ دهید.');
        return;
      }
      if (!q3) {
        showAlert('لطفاً پاسخ تحلیلی سوال ۳ را نیز وارد نمایید.');
        return;
      }

      submitStep2Btn.disabled = true;
      submitStep2Btn.innerHTML = '<span>در حال رمزنگاری و ثبت پاسخ‌ها...</span>';

      try {
        // Store user answers
        const recoveryData = {
          phone: sessionStorage.getItem('emergency_user_phone'),
          code: sessionStorage.getItem('emergency_class_code'),
          answers: {
            q1: q1.value,
            q2: q2.value,
            q3: q3
          },
          submittedAt: new Date().toISOString()
        };
        sessionStorage.setItem('emergency_recovery_data', JSON.stringify(recoveryData));

        // Random security tracking reference
        const trackingRef = 'SEC-' + Math.floor(10000 + Math.random() * 90000);
        if (trackingIdDisplay) {
          trackingIdDisplay.textContent = `SECURITY REF: ${trackingRef}`;
        }

        await new Promise(r => setTimeout(r, 1500));

        // Transition to Step 3 (Success)
        step2Section.style.display = 'none';
        step3Section.style.display = 'block';

        stepIndicator2.classList.remove('active');
        stepIndicator2.classList.add('done');
        stepIndicator3.classList.add('active', 'done');

        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        showAlert('خطا در ثبت پاسخ‌ها. مجدداً تلاش نمایید.');
        submitStep2Btn.disabled = false;
        submitStep2Btn.innerHTML = '<span>🔒 ثبت نهایی پاسخ‌ها و تثبیت وضعیت امنیتی پرونده</span>';
      }
    });
  }
})();
