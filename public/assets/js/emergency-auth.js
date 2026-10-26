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
      title: 'اسم گروه تروریستی چه بود؟',
      subtitle: 'تکه‌های نام را کنار هم بگذار.',
      pieces: ['مز', 'داک', 'ده', 'کده', 'کار', 'آگاه']
    },
    {
      id: 'q_hajj',
      type: 'choice',
      title: 'چجوری روزی صد بار به حج قبول شده بریم ولی از مشهد خارج نشیم؟',
      options: [
        { letter: 'الف', text: 'تلویزین رو بزنیم شبکه مسجدالحرام' },
        { letter: 'ب', text: 'از روی رحمت به پدر و مادر نگاه کنیم' },
        { letter: 'پ', text: 'هر روز صد بار بلیط هواپیما بگیریم بریم حج' },
        { letter: 'د', text: 'برو عمو گرفتی منو خود مردم مکه، هم نمی تونن' }
      ]
    },
    {
      id: 'q_padari',
      type: 'scene_choice',
      scene: 'family',
      title: 'آقای پادری گوینده اخبار چه نسبتی با اقایان پادری‌ها که به دهکده های مرموز رفتن داشت؟',
      options: [
        { letter: 'الف', text: 'عمه' },
        { letter: 'ب', text: 'ارواح عمه اش ، خالش بود بابا' },
        { letter: 'ج', text: 'اخه عمه و خاله که زن ان، داداش بودن' },
        { letter: 'د', text: 'بابا این پادری حموم بود اونها پادری دستشویی، نسبتی نداشتن' }
      ]
    },
    {
      id: 'q_invest_2026',
      type: 'scene_choice',
      scene: 'ledger',
      title: 'بهترین سرمایه گذاری مالی در سال ۲۰۲۶ چیست؟چرا؟',
      options: [
        { letter: 'الف', text: 'خرید قابلمه چنگیز چون توش راحت می شه خوابید' },
        { letter: 'ب', text: 'یه شونه تخم مرغ چون به جای جواهر رنگش کنیم بدیم مزداک' },
        { letter: 'ج', text: '۱۲ تا مگس کش پرویز چون که زیرا' },
        { letter: 'د', text: 'نیکی به پدر مادر چون طبق گفته امام صادق هرگز در زندگی فقیر نمی شویم' }
      ]
    },
    {
      id: 'q_oil_painting',
      type: 'easel_puzzle',
      title: 'چرا باید سه نفری رفت کلاس رنگ روغن؟',
      subtitle: 'سه پایه را برپا کن.',
      options: [
        { letter: 'الف', text: 'نامردیه ما روغنی بشیم اونا نشن' },
        { letter: 'ب', text: 'چون باید سه پایه داشته باشیم، حالا تو بگو کی پایه تر از ما😎' },
        { letter: 'ج', text: 'بیکاریم' },
        { letter: 'د', text: 'اینجوری بیشتر حال میده' }
      ]
    },
    {
      id: 'q_letter_translators',
      type: 'scene_choice',
      scene: 'letter',
      title: 'چه کسانی نامه پیدا شده را ترجمه کردند ؟',
      options: [
        { letter: 'الف', text: 'تاریخ شناسان' },
        { letter: 'ب', text: 'تبهکاران' },
        { letter: 'ج', text: 'کسانی که جواهر را پیدا کردند' },
        { letter: 'د', text: 'اهالی روستا' }
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
      title: 'طبق اطلاعات بدست آمده دهکده آخر کدام شهر بود؟',
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
      title: 'جواهر ارزشمند داخل پرونده چه بود ؟',
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
  const newspaperSelections = {};
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

      if (!/^0?9\d{9}$/.test(phone)) {
        showAlert('شماره موبایل را کامل وارد کن.');
        return;
      }

      submitStep1Btn.disabled = true;
      submitStep1Btn.innerHTML = '<span>در حال آماده‌سازی سرنخ‌ها...</span>';

      try {
        sessionStorage.setItem('emergency_user_phone', phone);
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
        submitStep1Btn.innerHTML = '<span>شروع بررسی سرنخ‌ها</span>';
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
      family: ['پرونده پادری‌ها', 'دو پرونده را ببین و نسبت را مشخص کن.'],
      ledger: ['دفتر سرمایه‌گذاری', 'برگه‌ها را ورق بزن و انتخابت را ثبت کن.'],
      letter: ['نامه پیدا شده', 'مهر نامه را باز کن و مترجم را مشخص کن.'],
      climate: ['نقشه کوچ اهالی', 'مسیر را بررسی کن و دلیل مهاجرت را ثبت کن.'],
      gem: ['جواهر پرونده', 'جواهر را بچرخان و ویژگی‌اش را انتخاب کن.'],
      crime: ['کفش‌فروشی', 'سه بخش صحنه را بررسی کن، بعد گزارش را ثبت کن.']
    };
    const [label, instruction] = scenes[q.scene];
    const header = document.createElement('div');
    header.className = 'q-card-header';
    header.innerHTML = `<div class="q-badge">${label}</div><h2 class="q-title-text">${q.title}</h2><p class="scene-instruction">${instruction}</p>`;
    const scene = document.createElement('div');
    scene.className = `clue-scene clue-scene--${q.scene}`;
    const art = {
      family: '<div class="scene-portraits"><span>گوینده اخبار</span><span>مسافران دهکده</span></div><div class="scene-result" aria-live="polite">؟</div>',
      ledger: '<div class="scene-book"><span>دفتر ۲۰۲۶</span><span class="scene-result" aria-live="polite">ورق بزن</span></div>',
      letter: '<div class="scene-envelope"><span>نامه</span><span class="scene-result" aria-live="polite">مهر بسته است</span></div>',
      climate: '<div class="scene-route"><span>دهکده</span><i></i><span>شهر</span></div><div class="scene-result" aria-live="polite">رد مهاجرت</div>',
      gem: '<div class="scene-gem-stone" role="img" aria-label="جواهر پرونده">◆</div><div class="scene-result" aria-live="polite">جواهر را لمس کن</div>',
      crime: '<div class="scene-store"><div class="scene-store__sign">کفش‌فروشی تنها</div><div class="scene-store__door"></div></div><div class="scene-result" aria-live="polite">صحنه بررسی نشده</div>'
    };
    scene.innerHTML = art[q.scene];
    const grid = document.createElement('div');
    grid.className = 'clue-scene__choices';
    const interaction = document.createElement('div');
    interaction.className = 'clue-interaction';
    const result = scene.querySelector('.scene-result');
    const makeControl = (text, callback) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'clue-interaction__control';
      button.textContent = text;
      button.addEventListener('click', callback);
      interaction.appendChild(button);
      return button;
    };
    if (q.scene === 'family') {
      makeControl('ورق زدن پرونده‌ها', () => {
        scene.classList.toggle('is-open');
        result.textContent = scene.classList.contains('is-open') ? 'نسبت را ثبت کن' : '؟';
        playTickSFX();
      });
    } else if (q.scene === 'ledger') {
      let page = 0;
      makeControl('ورق بعد', () => {
        page = (page + 1) % q.options.length;
        scene.style.setProperty('--page-tilt', `${page * 3 - 5}deg`);
        result.textContent = `${page + 1} / ${q.options.length}`;
        grid.querySelectorAll('button')[page]?.focus();
        playTickSFX();
      });
    } else if (q.scene === 'letter') {
      makeControl('باز کردن مهر', () => {
        scene.classList.toggle('is-open');
        result.textContent = scene.classList.contains('is-open') ? 'مترجم را انتخاب کن' : 'مهر بسته است';
        playTickSFX();
      });
    } else if (q.scene === 'climate') {
      const range = document.createElement('input');
      range.type = 'range'; range.min = '0'; range.max = '100'; range.value = '0';
      range.setAttribute('aria-label', 'بررسی نقشه مهاجرت');
      interaction.appendChild(range);
      range.addEventListener('input', () => {
        scene.style.setProperty('--route-progress', `${range.value}%`);
        result.textContent = `مسیر بررسی شده: ${range.value}٪`;
      });
    } else if (q.scene === 'gem') {
      let turns = 0;
      makeControl('چرخاندن جواهر', () => {
        turns++;
        scene.style.setProperty('--gem-turn', `${turns * 90}deg`);
        result.textContent = turns % 2 ? 'پشت جواهر' : 'روی جواهر';
        playTickSFX();
      });
    } else if (q.scene === 'crime') {
      const sequence = ['ورودی', 'مغازه', 'صاحب مغازه'];
      let step = 0;
      sequence.forEach((text, index) => {
        const button = makeControl(text, () => {
          if (index !== step) return showAlert('صحنه را به ترتیب بررسی کن.');
          clearAlert(); button.disabled = true; button.classList.add('active');
          playTickSFX(); step++; scene.classList.add(`scene-step-${step}`);
          result.textContent = `${step} از ${sequence.length} بخش بررسی شد`;
          if (step === sequence.length) grid.hidden = false;
        });
      });
    }
    grid.hidden = q.scene === 'crime' && !userAnswers[q.id];
    q.options.forEach(opt => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `clue-scene__choice ${userAnswers[q.id] === opt.text ? 'selected' : ''}`;
      button.innerHTML = `<span class="choice-letter-badge">${opt.letter}</span><span>${opt.text}</span>`;
      button.addEventListener('click', () => {
        grid.querySelectorAll('button').forEach(item => item.classList.remove('selected'));
        button.classList.add('selected');
        userAnswers[q.id] = opt.text;
        result.textContent = `${opt.letter} ثبت شد`;
        playTickSFX();
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
      <div class="q-badge">کفش‌فروشی تنها</div>
      <h2 class="q-title-text">${q.title}</h2>
      <p class="rotary-help">انگشتت را روی عدد بگذار، صفحه را تا گیره بچرخان و رها کن. لمس کوتاه عدد هم کار می‌کند.</p>
    `;

    const phoneContainer = document.createElement('div');
    phoneContainer.className = 'rotary-phone-container';

    const display = document.createElement('div');
    display.className = 'phone-display-screen';
    display.innerHTML = `
      <div class="phone-display-label">شماره گرفته‌شده</div>
      <div class="phone-display-digits ${dialedPhoneDigits ? '' : 'placeholder'}" id="phoneDisplayDigits" aria-live="polite">
        ${dialedPhoneDigits || '—'}
      </div>
    `;

    const wheelWrap = document.createElement('div');
    wheelWrap.className = 'rotary-wheel-wrapper';
    wheelWrap.innerHTML = `
      <div class="rotary-handset" aria-hidden="true"><span></span><span></span></div>
      <div class="rotary-base-plate"></div>
      <div class="rotary-finger-stop" aria-hidden="true"></div>
      <div class="rotary-dial-rotor" id="rotaryRotor">
        <div class="rotary-center-hub" aria-hidden="true"><span>تــنها</span><small>کفش‌فروشی</small></div>
      </div>
    `;

    phoneContainer.appendChild(display);
    phoneContainer.appendChild(wheelWrap);

    const actions = document.createElement('div');
    actions.className = 'rotary-actions';
    actions.innerHTML = `
      <button type="button" class="rotary-action-btn rotary-clear-btn" id="rotaryClearBtn">
        <span>پاک کردن</span>
      </button>
      <button type="button" class="rotary-action-btn rotary-call-btn" id="rotaryCallBtn">
        <span>تماس</span>
      </button>
    `;
    phoneContainer.appendChild(actions);

    dynamicQuestionSlot.appendChild(wrap);
    dynamicQuestionSlot.appendChild(phoneContainer);

    const rotor = document.getElementById('rotaryRotor');
    if (rotor) {
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
      const startAngle = -115;
      const stepAngle = 29;
      numbers.forEach((num, idx) => {
        const hole = document.createElement('button');
        hole.type = 'button';
        hole.className = 'rotary-hole';
        hole.dataset.num = num;
        hole.dataset.travel = String(42 + idx * 28);
        hole.textContent = String(num);
        const angleDeg = startAngle + (idx * stepAngle);
        const angleRad = (angleDeg * Math.PI) / 180;
        hole.style.left = `${50 + 36 * Math.cos(angleRad)}%`;
        hole.style.top = `${50 + 36 * Math.sin(angleRad)}%`;
        hole.setAttribute('aria-label', `شماره‌گیری ${num}`);
        rotor.appendChild(hole);
      });
    }

    let busy = false;
    let gesture = null;
    let suppressClick = false;
    const angleAt = event => {
      const rect = rotor.getBoundingClientRect();
      return Math.atan2(event.clientY - rect.top - rect.height / 2, event.clientX - rect.left - rect.width / 2) * 180 / Math.PI;
    };
    const appendDigit = digit => {
      if (dialedPhoneDigits.length >= 16) return;
      dialedPhoneDigits += String(digit);
      userAnswers[q.id] = dialedPhoneDigits;
      const digitsEl = document.getElementById('phoneDisplayDigits');
      if (digitsEl) {
        digitsEl.classList.remove('placeholder');
        digitsEl.textContent = dialedPhoneDigits;
      }
      playTickSFX();
    };
    const springBack = (digit, travel) => {
      busy = true;
      rotor.style.transition = 'transform .62s cubic-bezier(.15,.72,.18,1)';
      rotor.style.transform = 'rotate(0deg)';
      const timer = setTimeout(() => {
        if (rotor.isConnected) {
          appendDigit(digit);
          rotor.style.transition = '';
        }
        busy = false;
      }, Math.max(340, Math.min(650, 300 + travel)));
      return timer;
    };
    rotor.querySelectorAll('.rotary-hole').forEach(hole => {
      hole.addEventListener('pointerdown', event => {
        if (busy) return;
        gesture = { pointerId: event.pointerId, digit: hole.dataset.num,
          max: Number(hole.dataset.travel), start: angleAt(event), last: angleAt(event), turn: 0 };
        hole.setPointerCapture(event.pointerId);
        rotor.style.transition = 'none';
      });
      hole.addEventListener('pointermove', event => {
        if (!gesture || gesture.pointerId !== event.pointerId) return;
        const current = angleAt(event);
        let delta = current - gesture.last;
        if (delta < -180) delta += 360;
        if (delta > 180) delta -= 360;
        gesture.turn = Math.min(gesture.max, Math.max(0, gesture.turn + delta));
        gesture.last = current;
        rotor.style.transform = `rotate(${gesture.turn}deg)`;
      });
      const finish = event => {
        if (!gesture || gesture.pointerId !== event.pointerId) return;
        const { digit, turn, max } = gesture;
        gesture = null;
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, 80);
        if (turn >= max * .8) springBack(digit, turn);
        else if (turn < 5) {
          busy = true;
          rotor.style.transition = 'transform .38s ease-out';
          rotor.style.transform = `rotate(${max}deg)`;
          setTimeout(() => springBack(digit, max), 390);
        } else {
          rotor.style.transition = 'transform .25s ease-out';
          rotor.style.transform = 'rotate(0deg)';
        }
      };
      hole.addEventListener('pointerup', finish);
      hole.addEventListener('pointercancel', event => {
        if (!gesture || gesture.pointerId !== event.pointerId) return;
        gesture = null;
        rotor.style.transition = 'transform .25s ease-out';
        rotor.style.transform = 'rotate(0deg)';
      });
      hole.addEventListener('click', event => {
        if (busy || suppressClick || event.detail > 0 && gesture) return;
        busy = true;
        rotor.style.transition = 'transform .38s ease-out';
        rotor.style.transform = `rotate(${hole.dataset.travel}deg)`;
        setTimeout(() => springBack(hole.dataset.num, Number(hole.dataset.travel)), 390);
      });
    });

    document.getElementById('rotaryClearBtn')?.addEventListener('click', () => {
      playTickSFX();
      dialedPhoneDigits = '';
      userAnswers[q.id] = '';
      const digitsEl = document.getElementById('phoneDisplayDigits');
      if (digitsEl) {
        digitsEl.classList.add('placeholder');
        digitsEl.textContent = '—';
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
      <div class="q-badge">بریده روزنامه</div>
      <h2 class="q-title-text">${q.title}</h2>
      <p class="scene-instruction">${q.subtitle}</p>
    `;

    const container = document.createElement('div');
    container.className = 'newspaper-puzzle-wrap';

    // Banner
    const banner = document.createElement('div');
    banner.className = 'newspaper-header-banner';
    banner.innerHTML = `
      <p class="newspaper-clue-quote">گزارش حمله به دهکده</p>
    `;

    // Target Slots
    const slots = document.createElement('div');
    slots.className = 'puzzle-slots-container';
    slots.innerHTML = `
      <button type="button" class="puzzle-slot" id="puzzleSlot1" data-slot="0" aria-label="حذف قطعه اول">
        <span class="puzzle-slot-label">[ قطعه اول ]</span>
      </button>
      <div style="font-size: 24px; font-weight: 800; color: var(--gold); display: flex; align-items: center;">+</div>
      <button type="button" class="puzzle-slot" id="puzzleSlot2" data-slot="1" aria-label="حذف قطعه دوم">
        <span class="puzzle-slot-label">[ قطعه دوم ]</span>
      </button>
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

    let selectedPieces = (newspaperSelections[q.id] || []).map(index => ({
      piece: q.pieces[index], btn: bank.querySelector(`[data-idx="${index}"]`)
    }));
    selectedPieces.forEach(item => item.btn?.classList.add('selected'));
    updateSlots();

    function handlePieceClick(piece, btn) {
      if (selectedPieces.length >= 2 || selectedPieces.some(item => item.btn === btn)) return;
      playTickSFX();
      selectedPieces.push({ piece, btn });
      newspaperSelections[q.id] = selectedPieces.map(item => Number(item.btn.dataset.idx));
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
          res.className = 'puzzle-result-banner';
          res.textContent = `نام انتخاب‌شده: ${assembled}`;
        }
      } else {
        delete userAnswers[q.id];
        if (res) res.textContent = '';
      }
      newspaperSelections[q.id] = selectedPieces.map(item => Number(item.btn.dataset.idx));
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
      <div class="q-badge">کارگاه رنگ روغن</div>
      <h2 class="q-title-text">${q.title}</h2>
      <p style="font-size: 13px; color: var(--muted); margin-top: 6px; line-height: 1.6;">${q.subtitle}</p>
    `;

    const container = document.createElement('div');
    container.className = 'easel-mini-game-wrap';

    const frame = document.createElement('div');
    frame.className = 'easel-stand-frame';
    frame.innerHTML = `
      <div class="easel-art" aria-hidden="true">
        <div class="easel-art__canvas"><span>کارگاه رنگ روغن</span><i></i><i></i><i></i></div>
        <div class="easel-art__beam"></div>
        <div class="easel-art__leg easel-art__leg--1"></div>
        <div class="easel-art__leg easel-art__leg--2"></div>
        <div class="easel-art__leg easel-art__leg--3"></div>
      </div>
      <div class="easel-tripod-pins">
        <button type="button" class="tripod-pin-btn" id="tripodPin1" data-pin="1"><span>پایه ۱</span></button>
        <button type="button" class="tripod-pin-btn" id="tripodPin2" data-pin="2"><span>پایه ۲</span></button>
        <button type="button" class="tripod-pin-btn" id="tripodPin3" data-pin="3"><span>پایه ۳</span></button>
      </div>
      <div id="easelCanvasSlot" style="width: 100%; text-align: center; color: var(--muted); font-size: 12.5px;">
        برای برپا کردن بوم، هر سه پایه را لمس کنید
      </div>
    `;

    container.appendChild(frame);

    const optionsGrid = document.createElement('div');
    optionsGrid.className = 'modern-options-grid';
    optionsGrid.style.marginTop = '14px';
    optionsGrid.hidden = !userAnswers[q.id];

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
          frame.classList.add(`has-leg-${this.dataset.pin}`);
          playTickSFX();
          anchoredPins++;
          if (anchoredPins === 3) {
            playChimeSFX();
            const slot = document.getElementById('easelCanvasSlot');
            if (slot) {
              slot.innerHTML = '<div class="easel-canvas-reveal">بوم آماده است. پاسخت را انتخاب کن.</div>';
            }
            optionsGrid.hidden = false;
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

        // Keep the student's selection visible until they choose to continue.
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
