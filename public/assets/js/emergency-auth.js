/**
 * public/assets/js/emergency-auth.js
 * Comprehensive interactive logic for Emergency Cyber Recovery Portal
 * Includes:
 * 1. Mobile-friendly Rotary Dial phone mini-game (vintage rotary dialer)
 * 2. Newspaper headline puzzle mini-game (Maz + Dak assemble)
 * 3. 10 Multiple choice detective riddles with respectful design for sacred questions
 * 4. Shuffle algorithm for randomized question ordering per student
 * 5. Instant forgiving acceptance (all answers advance smoothly with encouraging feedback)
 * 6. Live Socket.io + Polling unhack detector (auto-redirects when admin clears breach)
 */

'use strict';

(function() {
  const normalizeDigits = value => String(value || '')
    .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[^0-9]/g, '');

  // DOM Elements
  const step1Section = document.getElementById('step1Section');
  const step2Section = document.getElementById('step2Section');
  const step3Section = document.getElementById('step3Section');

  const stepIndicator1 = document.getElementById('stepIndicator1');
  const stepIndicator2 = document.getElementById('stepIndicator2');
  const stepIndicator3 = document.getElementById('stepIndicator3');

  const statusAlert = document.getElementById('statusAlert');
  const unhackBanner = document.getElementById('unhackBanner');
  const authPhoneForm = document.getElementById('authPhoneForm');
  const emergencyPhone = document.getElementById('emergencyPhone');
  const submitStep1Btn = document.getElementById('submitStep1Btn');

  const currentQNumEl = document.getElementById('currentQNum');
  const totalQNumEl = document.getElementById('totalQNum');
  const quizPercentText = document.getElementById('quizPercentText');
  const quizProgressBar = document.getElementById('quizProgressBar');
  const dynamicQuestionSlot = document.getElementById('dynamicQuestionSlot');
  const prevQuestionBtn = document.getElementById('prevQuestionBtn');
  const nextQuestionBtn = document.getElementById('nextQuestionBtn');
  const trackingIdDisplay = document.getElementById('trackingIdDisplay');

  // =========================================================================
  // Question Bank (12 Specialized Questions + Mini-Games)
  // =========================================================================
  const QUESTIONS_DATABASE = [
    {
      id: 'q_shoe_rotary',
      type: 'rotary_phone',
      title: 'شماره کفش‌فروشی تنها چند است؟',
      subtitle: 'شماره را بگیر و تماس را برقرار کن.'
    },
    {
      id: 'q_terrorist_newspaper',
      type: 'newspaper_puzzle',
      title: 'اسم گروه تروریستی که به دهکده مرموز حمله کرده بود چه بود؟',
      subtitle: 'دو تکه نام را از روزنامه پیدا کن.',
      pieces: ['مز', 'داک', 'ده', 'کده', 'کار', 'آگاه']
    },
    {
      id: 'q_hajj',
      type: 'choice',
      title: 'چجوری روزی صد بار به حج قبول شده بریم ولی از مشهد خارج نشیم؟',
      options: [
        { letter: 'الف', text: 'تلویزیون رو بزنیم شبکه مسجدالحرام' },
        { letter: 'ب', text: 'از روی رحمت به پدر و مادر نگاه کنیم' },
        { letter: 'پ', text: 'هر روز صد بار بلیط هواپیما بگیریم بریم حج' },
        { letter: 'د', text: 'برو عمو گرفتی منو، خود مردم مکه هم نمی‌تونن!' }
      ]
    },
    {
      id: 'q_padari',
      type: 'scene_choice',
      scene: 'family',
      title: 'آقای پادری گوینده اخبار چه نسبتی با آقایان پادری‌ها که به دهکده‌های مرموز رفتن داشت؟',
      options: [
        { letter: 'الف', text: 'عمه' },
        { letter: 'ب', text: 'ارواح عمه‌اش، خاله‌اش بود بابا!' },
        { letter: 'ج', text: 'آخه عمه و خاله که زن‌ان، داداش بودن' },
        { letter: 'د', text: 'بابا این پادری حموم بود اون‌ها پادری دستشویی، نسبتی نداشتن' }
      ]
    },
    {
      id: 'q_invest_2026',
      type: 'scene_choice',
      scene: 'ledger',
      title: 'بهترین سرمایه‌گذاری مالی در سال ۲۰۲۶ چیست؟ چرا؟',
      options: [
        { letter: 'الف', text: 'خرید قابلمه چنگیز چون توش راحت می‌شه خوابید' },
        { letter: 'ب', text: 'یه شونه تخم‌مرغ چون به جای جواهر رنگش کنیم بدیم مزداک' },
        { letter: 'ج', text: '۱۲ تا مگس‌کش پرویز چون که زیرا' },
        { letter: 'د', text: 'نیکی به پدر و مادر چون طبق فرموده امام صادق (ع) هرگز در زندگی فقیر نمی‌شویم' }
      ]
    },
    {
      id: 'q_oil_painting',
      type: 'easel_puzzle',
      title: 'چرا باید سه نفری رفت کلاس رنگ روغن؟',
      subtitle: 'با لمس پایه‌های بوم نقاشی، سه‌پایه را برپا کنید:',
      options: [
        { letter: 'الف', text: 'نامردیه ما روغنی بشیم اونا نشن' },
        { letter: 'ب', text: 'چون باید سه پایه داشته باشیم، حالا تو بگو کی پایه‌تر از ما! 😎' },
        { letter: 'ج', text: 'بیکاریم' },
        { letter: 'د', text: 'اینجوری بیشتر حال میده' }
      ]
    },
    {
      id: 'q_letter_translators',
      type: 'scene_choice',
      scene: 'letter',
      title: 'چه کسانی نامه پیدا شده را ترجمه کردند؟',
      options: [
        { letter: 'الف', text: 'تاریخ‌شناسان و باستان‌شناسان' },
        { letter: 'ب', text: 'گروه تبهکاران' },
        { letter: 'ج', text: 'کسانی که جواهر را پیدا کردند' },
        { letter: 'د', text: 'اهالی بومی روستا' }
      ]
    },
    {
      id: 'q_migration_reason',
      type: 'scene_choice',
      scene: 'climate',
      title: 'علت اصلی مهاجرت اهالی دهکده به شهر پیش از کشف جواهر چه بود؟',
      options: [
        { letter: 'الف', text: 'جنگ و درگیری با گروه‌های تبهکار' },
        { letter: 'ب', text: 'خشکسالی و کمبود غذا و آب آشامیدنی' },
        { letter: 'ج', text: 'ناامنی و افزایش جرم و جنایت در دهکده' },
        { letter: 'د', text: 'پیدا شدن یک معدن قدیمی در اعماق زمین' }
      ]
    },
    {
      id: 'q_gem_feature',
      type: 'scene_choice',
      scene: 'gem',
      title: 'ویژگی خاص این جواهر از نظر تاریخ‌شناسان چه بود؟',
      options: [
        { letter: 'الف', text: 'هر کس آن را داشته باشد، همیشه ثروتمند می‌ماند.' },
        { letter: 'ب', text: 'این جواهر می‌تواند بیماری‌های جسمی را درمان کند.' },
        { letter: 'ج', text: 'هر کس از آن جواهر داشته باشد، خوشبخت می‌شود.' },
        { letter: 'د', text: 'این جواهر می‌تواند حافظه انسان‌ها را تغییر دهد.' }
      ]
    },
    {
      id: 'q_police_shoe_store',
      type: 'scene_choice',
      scene: 'crime',
      title: 'وقتی رئیس پلیس به کفش‌فروشی رسید، با چه وضعیتی روبرو شد؟',
      options: [
        { letter: 'الف', text: 'صاحب مغازه در حال فرار از دست تبهکاران بود.' },
        { letter: 'ب', text: 'در مغازه بسته بود و صاحب آن به دلیل گاز سمی بیهوش شده بود.' },
        { letter: 'ج', text: 'مغازه غارت شده بود و صاحب آن توسط تبهکاران کشته شده بود.' },
        { letter: 'د', text: 'صاحب مغازه در حال پنهان کردن جواهر بود.' }
      ]
    },
    {
      id: 'q_last_village_city',
      type: 'choice',
      sacred: true,
      title: 'طبق اطلاعات بدست آمده، دهکده آخر کدام شهر بود؟',
      options: [
        { letter: 'الف', text: 'مکه' },
        { letter: 'ب', text: 'مدینه' },
        { letter: 'ج', text: 'مشهد' }
      ]
    },
    {
      id: 'q_precious_gem',
      type: 'choice',
      sacred: true,
      title: 'جواهر ارزشمند داخل پرونده چه بود؟',
      options: [
        { letter: 'الف', text: 'محبت و ولایت امیرالمومنین حضرت علی علیه السلام و فرزندانشان' },
        { letter: 'ب', text: 'قرآن' },
        { letter: 'ج', text: 'پیامبر' },
        { letter: 'د', text: 'امام زمان' }
      ]
    }
  ];

  // Web Audio Synthesizer for tactile feedback
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function playTickSFX() {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, t);
      g.gain.setValueAtTime(0.04, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.04);
    } catch (_) {}
  }

  function playChimeSFX() {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.15);
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    } catch (_) {}
  }

  // Runtime State
  let activeQuestions = [];
  let currentQuestionIndex = 0;
  const userAnswers = {};
  let dialedPhoneDigits = '';
  let submitting = false;
  let questionRevision = 0;

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

  // Shuffle Array (Fisher-Yates)
  function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // =========================================================================
  // Unhack Detection (Live Socket + Polling)
  // =========================================================================
  function initUnhackDetector() {
    let sessionData = {};
    try {
      sessionData = JSON.parse(sessionStorage.getItem('userSession') || '{}');
    } catch (_) {}

    const sessionId = sessionData.id;
    if (!sessionId) return;

    // 1. Socket.io Listener
    if (typeof io !== 'undefined') {
      try {
        const socket = io();
        socket.on('hack_cleared', data => {
          if (data && Number(data.sessionId) === Number(sessionId)) {
            handleUnhackSuccess();
          }
        });
      } catch (_) {}
    }

    // 2. Periodic Polling check (every 5 seconds)
    setInterval(async () => {
      try {
        const token = sessionStorage.getItem('userToken');
        if (!token) return;
        const res = await fetch(`/api/sessions/${sessionId}/messages`, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.session && !data.session.is_hacked) {
            handleUnhackSuccess();
          }
        }
      } catch (_) {}
    }, 5000);
  }

  function handleUnhackSuccess() {
    try {
      const sessionData = JSON.parse(sessionStorage.getItem('userSession') || '{}');
      if (sessionData && sessionData.id) {
        localStorage.removeItem(`session_hacked_${sessionData.id}`);
        sessionData.is_hacked = 0;
        sessionStorage.setItem('userSession', JSON.stringify(sessionData));
      }
    } catch (_) {}

    if (unhackBanner) {
      unhackBanner.style.display = 'flex';
    }
    showAlert('مرکز فرماندهی نفوذ مزداک را لغو کرد! می‌توانید به چت کلاس بازگردید.', 'success');
  }

  // =========================================================================
  // Step 1: Phone Submission
  // =========================================================================
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
      submitStep1Btn.innerHTML = '<span>در حال بررسی هویت و استعلام وضعیت پرونده...</span>';

      try {
        sessionStorage.setItem('emergency_user_phone', phone);
        await new Promise(r => setTimeout(r, 900));

        // تصادفی‌سازی سوالات برای هر کاربر
        activeQuestions = shuffleArray(QUESTIONS_DATABASE);
        currentQuestionIndex = 0;

        step1Section.style.display = 'none';
        step2Section.style.display = 'block';

        stepIndicator1.classList.remove('active');
        stepIndicator1.classList.add('done');
        stepIndicator2.classList.add('active');

        renderActiveQuestion();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        showAlert('خطا در برقراری ارتباط با سامانه. مجدداً تلاش کنید.');
        submitStep1Btn.disabled = false;
        submitStep1Btn.innerHTML = '<span>تایید هویت و ورود به حل معماها ➔</span>';
      }
    });
  }

  // =========================================================================
  // Step 2: Dynamic Questions & Mini-Games Rendering
  // =========================================================================
  function renderActiveQuestion() {
    if (!dynamicQuestionSlot) return;
    clearAlert();

    const total = activeQuestions.length;
    const currentNum = currentQuestionIndex + 1;
    const q = activeQuestions[currentQuestionIndex];
    questionRevision++;

    if (currentQNumEl) currentQNumEl.textContent = String(currentNum);
    if (totalQNumEl) totalQNumEl.textContent = String(total);
    const percent = Math.round((currentNum / total) * 100);
    if (quizPercentText) quizPercentText.textContent = `${percent}%`;
    if (quizProgressBar) quizProgressBar.style.width = `${percent}%`;

    // دکمه بازگشت به سوال قبل
    if (prevQuestionBtn) {
      prevQuestionBtn.style.display = currentQuestionIndex > 0 ? 'inline-flex' : 'none';
    }

    if (nextQuestionBtn) {
      nextQuestionBtn.textContent = (currentNum === total) ? 'ثبت نهایی و نجات پرونده 🔒' : 'ثبت و گام بعد ❮';
    }

    dynamicQuestionSlot.innerHTML = '';

    if (q.type === 'rotary_phone') {
      renderRotaryPhoneGame(q);
    } else if (q.type === 'newspaper_puzzle') {
      renderNewspaperPuzzleGame(q);
    } else if (q.type === 'easel_puzzle') {
      renderEaselGame(q);
    } else if (q.type === 'scene_choice') {
      renderSceneChoice(q);
    } else {
      renderChoiceQuestion(q);
    }
  }

  function queueAdvance(delay) {
    const revision = questionRevision;
    setTimeout(() => {
      if (revision === questionRevision && !submitting) advanceToNextQuestion();
    }, delay);
  }

  function renderSceneChoice(q) {
    const scenes = {
      family: ['پرونده نسبت‌ها', 'رد نسبت را در کارت‌های پرونده پیدا کن.'],
      ledger: ['دفتر سرمایه‌گذاری', 'یکی از یادداشت‌های دفتر را انتخاب کن.'],
      letter: ['برگه ترجمه', 'امضای مترجم نامه را مشخص کن.'],
      climate: ['نقشه مهاجرت', 'علت ترک دهکده را روی پرونده ثبت کن.'],
      gem: ['گزارش جواهر', 'یکی از ویژگی‌های ثبت‌شده را انتخاب کن.'],
      crime: ['صحنه کفش‌فروشی', 'گزارش رسیدن رئیس پلیس را بازسازی کن.']
    };
    const [label, instruction] = scenes[q.scene];
    const header = document.createElement('div');
    header.className = 'q-card-header';
    header.innerHTML = `<div class="q-badge">${label}</div><h2 class="q-title-text">${q.title}</h2><p class="scene-instruction">${instruction}</p>`;
    const scene = document.createElement('div');
    scene.className = `clue-scene clue-scene--${q.scene}`;
    scene.innerHTML = `<div class="clue-scene__seal" aria-hidden="true">${({family:'◇',ledger:'⌁',letter:'✉',climate:'◈',gem:'✦',crime:'⌖'})[q.scene]}</div><span>${label}</span>`;
    const grid = document.createElement('div');
    grid.className = 'clue-scene__choices';
    const interaction = document.createElement('div');
    interaction.className = 'clue-interaction';
    const unlock = () => {
      grid.hidden = false;
      interaction.classList.add('completed');
      playChimeSFX();
    };
    const makeControl = text => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'clue-interaction__control';
      button.textContent = text;
      interaction.appendChild(button);
      return button;
    };
    if (q.scene === 'family') {
      let opened = 0;
      ['گوینده اخبار', 'اعضای سفر'].forEach(text => {
        const button = makeControl(text);
        button.addEventListener('click', () => {
          if (button.disabled) return;
          button.disabled = true;
          button.classList.add('active');
          opened++;
          playTickSFX();
          if (opened === 2) unlock();
        });
      });
    } else if (q.scene === 'ledger') {
      let counted = 0;
      const button = makeControl('ورق زدن دفتر ۰/۳');
      button.addEventListener('click', () => {
        counted++;
        button.textContent = `ورق زدن دفتر ${Math.min(counted, 3)}/۳`;
        playTickSFX();
        if (counted === 3) { button.disabled = true; unlock(); }
      });
    } else if (q.scene === 'letter') {
      let stamps = 0;
      ['مهر ۱', 'مهر ۲', 'مهر ۳'].forEach(text => {
        const button = makeControl(text);
        button.addEventListener('click', () => {
          if (button.disabled) return;
          button.disabled = true;
          button.classList.add('active');
          stamps++;
          playTickSFX();
          if (stamps === 3) unlock();
        });
      });
    } else if (q.scene === 'climate') {
      const range = document.createElement('input');
      range.type = 'range'; range.min = '0'; range.max = '100'; range.value = '0';
      range.setAttribute('aria-label', 'بررسی نقشه مهاجرت');
      interaction.appendChild(range);
      range.addEventListener('input', () => { if (Number(range.value) >= 75) { range.disabled = true; unlock(); } });
      makeControl('بررسی نقشه').addEventListener('click', unlock);
    } else if (q.scene === 'gem') {
      let inspected = 0;
      ['روی جواهر', 'پشت جواهر'].forEach(text => {
        const button = makeControl(text);
        button.addEventListener('click', () => {
          if (button.disabled) return;
          button.disabled = true;
          button.classList.add('active');
          inspected++;
          playTickSFX();
          if (inspected === 2) unlock();
        });
      });
    } else if (q.scene === 'crime') {
      const sequence = ['رسیدن', 'بازرسی', 'گزارش'];
      let step = 0;
      sequence.forEach((text, index) => {
        const button = makeControl(text);
        button.addEventListener('click', () => {
          if (index !== step) return showAlert('صحنه را به ترتیب بررسی کن.');
          clearAlert(); button.disabled = true; button.classList.add('active');
          playTickSFX(); step++;
          if (step === sequence.length) unlock();
        });
      });
    }
    grid.hidden = !userAnswers[q.id];
    q.options.forEach(opt => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `clue-scene__choice ${userAnswers[q.id] === opt.text ? 'selected' : ''}`;
      button.innerHTML = `<span class="choice-letter-badge">${opt.letter}</span><span>${opt.text}</span>`;
      button.addEventListener('click', () => {
        grid.querySelectorAll('button').forEach(item => item.classList.remove('selected'));
        button.classList.add('selected');
        userAnswers[q.id] = opt.text;
        playTickSFX();
        queueAdvance(450);
      });
      grid.appendChild(button);
    });
    dynamicQuestionSlot.append(header, scene, interaction, grid);
  }

  // -------------------------------------------------------------------------
  // Mini-Game 1: Rotary Phone Dialer
  // -------------------------------------------------------------------------
  function renderRotaryPhoneGame(q) {
    dialedPhoneDigits = userAnswers[q.id] || '';

    const wrap = document.createElement('div');
    wrap.className = 'q-card-header';
    wrap.innerHTML = `
      <div class="q-badge">📞 مینی‌گیم شماره‌گیر چرخشی</div>
      <h2 class="q-title-text">${q.title}</h2>
      <p style="font-size: 13px; color: var(--muted); margin-top: 6px; line-height: 1.6;">${q.subtitle}</p>
    `;

    const phoneContainer = document.createElement('div');
    phoneContainer.className = 'rotary-phone-container';

    // Display
    const display = document.createElement('div');
    display.className = 'phone-display-screen';
    display.innerHTML = `
      <div class="phone-display-label">شماره تلفن شماره‌گیری شده:</div>
      <div class="phone-display-digits ${dialedPhoneDigits ? '' : 'placeholder'}" id="phoneDisplayDigits">
        ${dialedPhoneDigits || 'شماره بگیرید...'}
      </div>
    `;

    // Rotary Wheel
    const wheelWrap = document.createElement('div');
    wheelWrap.className = 'rotary-wheel-wrapper';
    wheelWrap.innerHTML = `
      <div class="rotary-base-plate">
        <div class="rotary-center-hub" id="rotaryCenterHub">
          <span>کفش</span>
          <span style="font-size: 8.5px; opacity: 0.85;">تنها</span>
        </div>
      </div>
      <div class="rotary-finger-stop" aria-hidden="true"></div>
      <div class="rotary-dial-rotor" id="rotaryRotor"></div>
    `;

    phoneContainer.appendChild(display);
    phoneContainer.appendChild(wheelWrap);

    // Controls
    const actions = document.createElement('div');
    actions.className = 'rotary-actions';
    actions.innerHTML = `
      <button type="button" class="rotary-action-btn rotary-clear-btn" id="rotaryClearBtn">
        <span>پاک کردن</span>
      </button>
      <button type="button" class="rotary-action-btn rotary-call-btn" id="rotaryCallBtn">
        <span>برقراری تماس 📞</span>
      </button>
    `;
    phoneContainer.appendChild(actions);

    dynamicQuestionSlot.appendChild(wrap);
    dynamicQuestionSlot.appendChild(phoneContainer);

    // Render Digits inside Rotor around a circle
    const rotor = document.getElementById('rotaryRotor');
    if (rotor) {
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
      const startAngle = 30; // deg
      const stepAngle = 28;  // deg
      const radius = 86;     // px

      numbers.forEach((num, idx) => {
        const hole = document.createElement('button');
        hole.type = 'button';
        hole.className = 'rotary-hole';
        hole.dataset.num = num;
        hole.textContent = String(num);

        const angleDeg = startAngle + (idx * stepAngle);
        const angleRad = (angleDeg * Math.PI) / 180;
        const x = 125 + radius * Math.cos(angleRad) - 22;
        const y = 125 + radius * Math.sin(angleRad) - 22;

        hole.style.left = `${x}px`;
        hole.style.top = `${y}px`;

        // Click / Touch to dial
        hole.addEventListener('click', () => dialDigit(num, angleDeg));
        rotor.appendChild(hole);
      });
    }

    function dialDigit(digit, angle) {
      playTickSFX();
      const rotorEl = document.getElementById('rotaryRotor');
      if (rotorEl) {
        // انیمیشن چرخش مکانیکی تا براکت استاپ و بازگشت
        const targetRotation = Math.max(40, 240 - angle);
        rotorEl.style.transform = `rotate(${targetRotation}deg)`;
        setTimeout(() => {
          rotorEl.style.transform = 'rotate(0deg)';
        }, 320);
      }

      dialedPhoneDigits += String(digit);
      userAnswers[q.id] = dialedPhoneDigits;
      const digitsEl = document.getElementById('phoneDisplayDigits');
      if (digitsEl) {
        digitsEl.classList.remove('placeholder');
        digitsEl.textContent = dialedPhoneDigits;
      }
    }

    document.getElementById('rotaryClearBtn')?.addEventListener('click', () => {
      playTickSFX();
      dialedPhoneDigits = '';
      userAnswers[q.id] = '';
      const digitsEl = document.getElementById('phoneDisplayDigits');
      if (digitsEl) {
        digitsEl.classList.add('placeholder');
        digitsEl.textContent = 'شماره بگیرید...';
      }
    });

    document.getElementById('rotaryCallBtn')?.addEventListener('click', () => {
      playChimeSFX();
      if (!dialedPhoneDigits) return showAlert('اول شماره را بگیر.');
      showAlert('تماس ثبت شد.', 'success');
      queueAdvance(700);
    });
  }

  // -------------------------------------------------------------------------
  // Mini-Game 2: Newspaper Puzzle Scramble (مز + داک)
  // -------------------------------------------------------------------------
  function renderNewspaperPuzzleGame(q) {
    const wrap = document.createElement('div');
    wrap.className = 'q-card-header';
    wrap.innerHTML = `
      <div class="q-badge">📰 مینی‌گیم پازل روزنامه</div>
      <h2 class="q-title-text">${q.title}</h2>
      <p style="font-size: 13px; color: var(--muted); margin-top: 6px; line-height: 1.6;">${q.subtitle}</p>
    `;

    const container = document.createElement('div');
    container.className = 'newspaper-puzzle-wrap';

    // Banner
    const banner = document.createElement('div');
    banner.className = 'newspaper-header-banner';
    banner.innerHTML = `
      <p class="newspaper-clue-quote">
        «... گزارش‌ها حاکی از آن است که حمله شبانه به آسیاب و انبار توسط یک تشکیلات مخوف دو حرفی تحت عنوان گروه تروریستی هدایت شده که ردپای آنان در اسناد بایگانی مشاهده شد...»
      </p>
    `;

    // Target Slots
    const slots = document.createElement('div');
    slots.className = 'puzzle-slots-container';
    slots.innerHTML = `
      <div class="puzzle-slot" id="puzzleSlot1" data-slot="0">
        <span class="puzzle-slot-label">[ قطعه اول ]</span>
      </div>
      <div style="font-size: 24px; font-weight: 800; color: var(--gold); display: flex; align-items: center;">+</div>
      <div class="puzzle-slot" id="puzzleSlot2" data-slot="1">
        <span class="puzzle-slot-label">[ قطعه دوم ]</span>
      </div>
    `;

    // Result banner
    const resultBanner = document.createElement('div');
    resultBanner.className = 'puzzle-result-banner';
    resultBanner.id = 'puzzleResultBanner';

    // Pieces Bank
    const bank = document.createElement('div');
    bank.className = 'puzzle-pieces-bank';
    q.pieces.forEach((piece, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'puzzle-piece-btn';
      btn.dataset.piece = piece;
      btn.dataset.idx = idx;
      btn.textContent = piece;
      btn.addEventListener('click', () => handlePieceClick(piece, btn));
      bank.appendChild(btn);
    });

    container.appendChild(banner);
    container.appendChild(slots);
    container.appendChild(resultBanner);
    container.appendChild(bank);

    dynamicQuestionSlot.appendChild(wrap);
    dynamicQuestionSlot.appendChild(container);

    let selectedPieces = [];

    function handlePieceClick(piece, btn) {
      if (selectedPieces.length >= 2) return;
      playTickSFX();
      selectedPieces.push({ piece, btn });
      btn.classList.add('selected');
      updateSlots();
    }

    function updateSlots() {
      const s1 = document.getElementById('puzzleSlot1');
      const s2 = document.getElementById('puzzleSlot2');
      const res = document.getElementById('puzzleResultBanner');

      if (s1) {
        if (selectedPieces[0]) {
          s1.classList.add('filled');
          s1.textContent = selectedPieces[0].piece;
        } else {
          s1.classList.remove('filled');
          s1.innerHTML = '<span class="puzzle-slot-label">[ قطعه اول ]</span>';
        }
      }

      if (s2) {
        if (selectedPieces[1]) {
          s2.classList.add('filled');
          s2.textContent = selectedPieces[1].piece;
        } else {
          s2.classList.remove('filled');
          s2.innerHTML = '<span class="puzzle-slot-label">[ قطعه دوم ]</span>';
        }
      }

      if (selectedPieces.length === 2) {
        playChimeSFX();
        const assembled = selectedPieces[0].piece + selectedPieces[1].piece;
        userAnswers[q.id] = assembled;
        if (res) {
          res.className = 'puzzle-result-banner success';
          res.textContent = `✓ کلمه «${assembled}» با موفقیت ساخته شد و در سامانه به ثبت رسید.`;
        }
        queueAdvance(900);
      }
    }

    // Tap slot to undo
    document.getElementById('puzzleSlot1')?.addEventListener('click', () => {
      playTickSFX();
      if (selectedPieces[0]) {
        selectedPieces[0].btn.classList.remove('selected');
        selectedPieces.splice(0, 1);
        updateSlots();
      }
    });

    document.getElementById('puzzleSlot2')?.addEventListener('click', () => {
      playTickSFX();
      if (selectedPieces[1]) {
        selectedPieces[1].btn.classList.remove('selected');
        selectedPieces.splice(1, 1);
        updateSlots();
      }
    });
  }

  // -------------------------------------------------------------------------
  // Mini-Game 3: Easel & 3-Legged Stand Puzzle (کلاس رنگ روغن)
  // -------------------------------------------------------------------------
  function renderEaselGame(q) {
    const wrap = document.createElement('div');
    wrap.className = 'q-card-header';
    wrap.innerHTML = `
      <div class="q-badge">🎨 مینی‌گیم بوم و سه‌پایه نقاشی</div>
      <h2 class="q-title-text">${q.title}</h2>
      <p style="font-size: 13px; color: var(--muted); margin-top: 6px; line-height: 1.6;">${q.subtitle}</p>
    `;

    const container = document.createElement('div');
    container.className = 'easel-mini-game-wrap';

    const frame = document.createElement('div');
    frame.className = 'easel-stand-frame';
    frame.innerHTML = `
      <div class="easel-tripod-pins">
        <button type="button" class="tripod-pin-btn" id="tripodPin1" data-pin="1"><span>📍 پایه ۱</span></button>
        <button type="button" class="tripod-pin-btn" id="tripodPin2" data-pin="2"><span>📍 پایه ۲</span></button>
        <button type="button" class="tripod-pin-btn" id="tripodPin3" data-pin="3"><span>📍 پایه ۳</span></button>
      </div>
      <div id="easelCanvasSlot" style="width: 100%; text-align: center; color: var(--muted); font-size: 12.5px;">
        برای برپا کردن بوم، هر سه پایه را لمس کنید
      </div>
    `;

    container.appendChild(frame);

    const optionsGrid = document.createElement('div');
    optionsGrid.className = 'modern-options-grid';
    optionsGrid.style.marginTop = '14px';

    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `choice-card-btn ${userAnswers[q.id] === opt.text ? 'selected' : ''}`;
      btn.innerHTML = `
        <span class="choice-letter-badge">${opt.letter}</span>
        <span class="choice-text">${opt.text}</span>
      `;
      btn.addEventListener('click', () => {
        playTickSFX();
        optionsGrid.querySelectorAll('.choice-card-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        userAnswers[q.id] = opt.text;
        queueAdvance(400);
      });
      optionsGrid.appendChild(btn);
    });

    container.appendChild(optionsGrid);
    dynamicQuestionSlot.appendChild(wrap);
    dynamicQuestionSlot.appendChild(container);

    let anchoredPins = 0;
    ['tripodPin1', 'tripodPin2', 'tripodPin3'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', function() {
        if (!this.classList.contains('anchored')) {
          this.classList.add('anchored');
          playTickSFX();
          anchoredPins++;
          if (anchoredPins === 3) {
            playChimeSFX();
            const slot = document.getElementById('easelCanvasSlot');
            if (slot) {
              slot.innerHTML = `<div class="easel-canvas-reveal">🖼️ بوم نقاشی برپا شد!<br><strong>«چون باید سه پایه داشته باشیم، حالا تو بگو کی پایه‌تر از ما! 😎»</strong></div>`;
            }
            userAnswers[q.id] = 'چون باید سه پایه داشته باشیم، حالا تو بگو کی پایه‌تر از ما! 😎';
            queueAdvance(1100);
          }
        }
      });
    });
  }

  // -------------------------------------------------------------------------
  // Mini-Game 4: Tactical Map (دهکده آخر)
  // -------------------------------------------------------------------------
  function renderTacticalMapGame(q) {
    const wrap = document.createElement('div');
    wrap.className = 'q-card-header q-sacred';
    wrap.innerHTML = `
      <div class="q-badge">🗺️ مینی‌گیم نقشه تاکتیکی پایگاه</div>
      <h2 class="q-title-text">${q.title}</h2>
      <p style="font-size: 13px; color: var(--muted); margin-top: 6px; line-height: 1.6;">${q.subtitle}</p>
    `;

    const grid = document.createElement('div');
    grid.className = 'tactical-map-grid';

    q.cities.forEach(city => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `city-beacon-card ${userAnswers[q.id] === city.name ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="city-beacon-pin">${city.icon}</div>
        <div class="city-beacon-title">${city.name}</div>
      `;
      card.addEventListener('click', () => {
        playTickSFX();
        grid.querySelectorAll('.city-beacon-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        userAnswers[q.id] = city.name;
        playChimeSFX();
        setTimeout(() => advanceToNextQuestion(), 500);
      });
      grid.appendChild(card);
    });

    dynamicQuestionSlot.appendChild(wrap);
    dynamicQuestionSlot.appendChild(grid);
  }

  // -------------------------------------------------------------------------
  // Mini-Game 5: Golden Chest Revelation (جواهر ارزشمند)
  // -------------------------------------------------------------------------
  function renderGoldenChestGame(q) {
    const wrap = document.createElement('div');
    wrap.className = 'q-card-header q-sacred';
    wrap.innerHTML = `
      <div class="q-badge">✨ گشایش صندوقچه اسرار پرونده</div>
      <h2 class="q-title-text">${q.title}</h2>
      <p style="font-size: 13px; color: var(--muted); margin-top: 6px; line-height: 1.6;">${q.subtitle}</p>
    `;

    const grid = document.createElement('div');
    grid.className = 'sacred-chest-grid';

    q.gems.forEach(gem => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `sacred-card-item ${userAnswers[q.id] === gem.text ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="sacred-icon-aura">${gem.icon}</div>
        <div style="font-size: 14.5px; font-weight: 700; line-height: 1.6;">${gem.text}</div>
      `;
      card.addEventListener('click', () => {
        playTickSFX();
        grid.querySelectorAll('.sacred-card-item').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        userAnswers[q.id] = gem.text;
        playChimeSFX();
        setTimeout(() => advanceToNextQuestion(), 500);
      });
      grid.appendChild(card);
    });

    dynamicQuestionSlot.appendChild(wrap);
    dynamicQuestionSlot.appendChild(grid);
  }

  // -------------------------------------------------------------------------
  // Multiple Choice Questions
  // -------------------------------------------------------------------------
  function renderChoiceQuestion(q) {
    const wrap = document.createElement('div');
    wrap.className = `q-card-header ${q.sacred ? 'q-sacred' : ''}`;
    wrap.innerHTML = `
      <div class="q-badge">${q.sacred ? '✨ سوال ویژه پرونده' : '🔍 پرسش کارآگاهی'}</div>
      <h2 class="q-title-text">${q.title}</h2>
    `;

    const grid = document.createElement('div');
    grid.className = 'modern-options-grid';

    const currentAnswer = userAnswers[q.id];

    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `choice-card-btn ${currentAnswer === opt.text ? 'selected' : ''}`;
      btn.innerHTML = `
        <span class="choice-letter-badge">${opt.letter}</span>
        <span class="choice-text">${opt.text}</span>
      `;

      btn.addEventListener('click', () => {
        playTickSFX();
        grid.querySelectorAll('.choice-card-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        userAnswers[q.id] = opt.text;

        // انتقال خودکار نرم به سوال بعدی پس از کلیک گزینه
        queueAdvance(400);
      });

      grid.appendChild(btn);
    });

    dynamicQuestionSlot.appendChild(wrap);
    dynamicQuestionSlot.appendChild(grid);
  }

  // -------------------------------------------------------------------------
  // Navigation: Next & Prev
  // -------------------------------------------------------------------------
  function advanceToNextQuestion() {
    clearAlert();
    const q = activeQuestions[currentQuestionIndex];
    if (!userAnswers[q.id]) {
      showAlert('برای ادامه، یک پاسخ ثبت کن.');
      return;
    }

    if (currentQuestionIndex < activeQuestions.length - 1) {
      currentQuestionIndex++;
      renderActiveQuestion();
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } else {
      finishQuiz();
    }
  }

  function goToPreviousQuestion() {
    clearAlert();
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      renderActiveQuestion();
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  }

  if (nextQuestionBtn) {
    nextQuestionBtn.addEventListener('click', () => advanceToNextQuestion());
  }

  if (prevQuestionBtn) {
    prevQuestionBtn.addEventListener('click', () => goToPreviousQuestion());
  }

  // -------------------------------------------------------------------------
  // Finish Quiz & Transition to Step 3
  // -------------------------------------------------------------------------
  async function finishQuiz() {
    if (submitting) return;
    submitting = true;
    if (nextQuestionBtn) nextQuestionBtn.disabled = true;
    try {
      const phone = sessionStorage.getItem('emergency_user_phone');
      const token = sessionStorage.getItem('userToken');
      if (!token) throw new Error('برای ثبت پاسخ‌ها دوباره وارد کلاس شوید.');
      const response = await fetch('/api/emergency-auth/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone, answers: userAnswers })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'ثبت پاسخ‌ها انجام نشد.');
      if (trackingIdDisplay) trackingIdDisplay.textContent = result.reference;
      step2Section.style.display = 'none';
      step3Section.style.display = 'block';
      stepIndicator2.classList.remove('active');
      stepIndicator2.classList.add('done');
      stepIndicator3.classList.add('active', 'done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      showAlert(error.message || 'ثبت پاسخ‌ها انجام نشد. دوباره تلاش کنید.');
    } finally {
      submitting = false;
      if (nextQuestionBtn) nextQuestionBtn.disabled = false;
    }
  }

  // Initialize Unhack Listener on load
  initUnhackDetector();

})();
