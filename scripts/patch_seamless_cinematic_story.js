const fs = require('fs');
const path = require('path');

const engineJsPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'cyber-breach-engine.js');
let engineJs = fs.readFileSync(engineJsPath, 'utf8');

// 1. Update ensureEjectionModal with the URL save box & copy button
const oldEnsureEjectionModal = `  ensureEjectionModal() {
    if (document.getElementById('emergency-ejection-overlay')) {
      this.dom.ejectionOverlay = document.getElementById('emergency-ejection-overlay');
      return;
    }

    const isTestMode = window.location.search.includes('test=1') || Boolean(window.sessionData && window.sessionData.is_test);

    const overlay = document.createElement('div');
    overlay.id = 'emergency-ejection-overlay';
    overlay.className = 'emergency-ejection-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = \`
      <div class="emergency-ejection-modal">
        <div class="hazard-stripe-bar"></div>
        <div class="ejection-badge">
          <span>⚠️ اخطار فوق‌امنیتی // پروتکل خروج اضطراری</span>
        </div>
        <h2 class="ejection-title">کانال امن را ترک کنید</h2>
        <p class="ejection-body-text">
          دستور فوری مرکز فرماندهی: کانال امن را ترک کنید! نفوذ کامل مزداک به سیستم دهکده در دامنه <strong>razedehkade.ir</strong> شناسایی شده و کلیه کانال‌های چت مسدود گردیده‌اند.
          <br><br>
          جهت محافظت از اسناد و پرونده محرمانه دهکده، فوراً به درگاه امنیتی احراز هویت منتقل می‌شوید.
        </p>
        <div class="ejection-countdown-box">
          <span>انتقال خودکار در </span>
          <strong class="ejection-countdown-number" id="ejectionCountdownSec">۱۰</strong>
          <span> ثانیه...</span>
        </div>
        <div class="ejection-actions" style="\${isTestMode ? '' : 'display: none !important;'}">
          <button type="button" class="ejection-primary-btn" id="ejectionAuthBtn">
            ⚡ انتقال فوری به درگاه احراز هویت امنیتی اضطراری (حالت تست)
          </button>
        </div>
      </div>
    \`;

    document.body.appendChild(overlay);
    this.dom.ejectionOverlay = overlay;

    const authBtn = document.getElementById('ejectionAuthBtn');
    if (authBtn) {
      authBtn.addEventListener('click', () => {
        this.executeEjectionRedirect();
      });
    }
  }`;

const newEnsureEjectionModal = `  ensureEjectionModal() {
    if (document.getElementById('emergency-ejection-overlay')) {
      this.dom.ejectionOverlay = document.getElementById('emergency-ejection-overlay');
      return;
    }

    const isTestMode = window.location.search.includes('test=1') || Boolean(window.sessionData && window.sessionData.is_test);

    const overlay = document.createElement('div');
    overlay.id = 'emergency-ejection-overlay';
    overlay.className = 'emergency-ejection-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = \`
      <div class="emergency-ejection-modal">
        <div class="hazard-stripe-bar"></div>
        <div class="ejection-badge">
          <span>⚠️ اخطار فوق‌امنیتی // پروتکل خروج اضطراری</span>
        </div>
        <h2 class="ejection-title">کانال امن را ترک کنید</h2>
        <p class="ejection-body-text">
          دستور فوری مرکز فرماندهی: کانال امن را ترک کنید! نفوذ کامل مزداک به سیستم دهکده در دامنه <strong>razedehkade.ir</strong> شناسایی شده و کلیه کانال‌های چت مسدود گردیده‌اند.
          <br><br>
          برای <strong>نجات پرونده و بازپس‌گیری دسترسی</strong>، فوراً آدرس سایت را یادداشت و ذخیره بکنید:
        </p>

        <div class="ejection-callout-box">
          <div class="ejection-url-label">آدرس سایت را ذخیره بکنید:</div>
          <div class="ejection-url-row">
            <span class="ejection-url-code" id="siteUrlText">https://razedehkade.ir</span>
            <button type="button" class="ejection-copy-btn" id="ejectionCopyBtn" title="کپی آدرس سایت">📋 کپی آدرس</button>
          </div>
        </div>

        <div class="ejection-countdown-box" id="ejectionCountdownBox">
          <span>خروج از پایگاه در </span>
          <strong class="ejection-countdown-number" id="ejectionCountdownSec">۱۰</strong>
          <span> ثانیه...</span>
        </div>

        <div class="ejection-actions" style="\${isTestMode ? '' : 'display: none !important;'}">
          <button type="button" class="ejection-primary-btn" id="ejectionAuthBtn">
            ⚡ انتقال فوری به درگاه احراز هویت امنیتی اضطراری (حالت تست)
          </button>
        </div>
      </div>
    \`;

    document.body.appendChild(overlay);
    this.dom.ejectionOverlay = overlay;

    const authBtn = document.getElementById('ejectionAuthBtn');
    if (authBtn) {
      authBtn.addEventListener('click', () => {
        this.executeEjectionRedirect();
      });
    }

    const copyBtn = document.getElementById('ejectionCopyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        try {
          navigator.clipboard.writeText('https://razedehkade.ir');
          copyBtn.textContent = '✓ کپی شد!';
          setTimeout(() => { copyBtn.textContent = '📋 کپی آدرس'; }, 2000);
        } catch (_) {}
      });
    }
  }`;

// 2. Update triggerEmergencyEjectionModal so it locks without redirecting normal users to questions
const oldTriggerEmergency = `  triggerEmergencyEjectionModal() {
    this.ensureEjectionModal();
    if (!this.dom.ejectionOverlay) return;
    this.dom.ejectionOverlay.classList.add('active');
    // لغو هرگونه شمارش معکوس و انتقال خودکار طبق خواسته صریح کاربر (انتقال خودکار حذف شد)
    // Eviction countdown disabled per user request: countdownSec = 300 (۵ دقیقه / ۵:۰۰) and auto-transfer removed

    let countdownSec = 10;
    const secEl = document.getElementById('ejectionCountdownSec');
    if (secEl) secEl.textContent = '۱۰';

    if (this.ejectionCountdownInterval) clearInterval(this.ejectionCountdownInterval);
    this.ejectionCountdownInterval = setInterval(() => {
      countdownSec--;
      if (secEl) secEl.textContent = String(countdownSec);
      if (countdownSec <= 0) {
        clearInterval(this.ejectionCountdownInterval);
        this.ejectionCountdownInterval = null;
        this.executeEjectionRedirect();
      }
    }, 1000);
  }`;

const newTriggerEmergency = `  triggerEmergencyEjectionModal() {
    this.ensureEjectionModal();
    if (!this.dom.ejectionOverlay) return;
    this.dom.ejectionOverlay.classList.add('active');

    let countdownSec = 10;
    const secEl = document.getElementById('ejectionCountdownSec');
    const boxEl = document.getElementById('ejectionCountdownBox');
    if (secEl) secEl.textContent = '۱۰';

    if (this.ejectionCountdownInterval) clearInterval(this.ejectionCountdownInterval);
    this.ejectionCountdownInterval = setInterval(() => {
      countdownSec--;
      if (secEl) secEl.textContent = String(countdownSec);
      if (countdownSec <= 0) {
        clearInterval(this.ejectionCountdownInterval);
        this.ejectionCountdownInterval = null;
        if (boxEl) {
          boxEl.innerHTML = \`<span style="color:#ef4444;font-weight:900;font-size:14px;line-height:1.7;">⚠️ ارتباط با پایگاه به طور کامل قطع گردید.<br>آدرس سایت را ذخیره کنید و منتظر پیام مرکز فرماندهی بمانید.</span>\`;
        }
        try {
          if (window.sessionData && window.sessionData.id) {
            localStorage.setItem(\`session_hacked_\${window.sessionData.id}\`, '1');
          }
        } catch (_) {}
        const isTestMode = window.location.search.includes('test=1') || Boolean(window.sessionData && window.sessionData.is_test);
        if (isTestMode) {
          this.executeEjectionRedirect();
        }
        // کاربر روی همین صفحه قفل و ذخیره آدرس باقی می‌ماند و به صفحه سوالات احراز هویت هدایت نمی‌شود
      }
    }, 1000);
  }`;

// 3. Update start() to renderFrame(0) immediately and set duration = 200
const oldStartDefault = `    } else {
      // حالت پیش‌فرض MASTER-28: شروع طبیعی بدون پاپ‌آپ‌های ناگهانی مزاحم (شروع هک حذف شد)
      this.duration = 280; // زمان کامل برای اجرای بدون وقفه تمام ۲۴ دیالوگ سناریو
      this.setCinematicPhase('surveillance', 'ارتباط با دستیاران دهکده', 0.05, 'CHANNEL OPEN // DETECTIVE BROADCAST');
      this.unlockChatInput();
    }`;

const newStartDefault = `    } else {
      // حالت پیش‌فرض MASTER-28: شروع طبیعی بدون پاپ‌آپ‌های ناگهانی مزاحم (شروع هک حذف شد)
      this.duration = 200; // زمان کامل و بهینه برای اجرای بدون وقفه تمام دیالوگ‌های سناریو
      this.setCinematicPhase('surveillance', 'ارتباط با دستیاران دهکده', 0.05, 'CHANNEL OPEN // DETECTIVE BROADCAST');
      this.unlockChatInput();
      this.renderFrame(0); // ارسال فوری اولین پیام در همان لحظه استارت هک
    }`;

// 4. Update simulateGhostTypingWithErase hold times and delays for responsive battle
const oldGhostErase = `        adjustHeight();
        const readTime = Math.max(Number(holdMs) || 0, 7500);
        // متن در کامپوزر برای خواندن کامل دانش‌آموزان نگه داشته می‌شود
        this.ghostTypingTimer = setTimeout(() => {
          if (!this.isPlaying || generation !== this.sceneGeneration) return;
          // پاک کردن تدریجی و واقعی کامپوزر با کلید بک‌اسپیس حرف به حرف
          let eraseIdx = textToRead.length;
          const eraseNext = () => {
            if (!this.isPlaying || generation !== this.sceneGeneration) return;
            if (eraseIdx > 0) {
              eraseIdx--;
              input.value = textToRead.substring(0, eraseIdx);
              adjustHeight();
              const eraseDelay = 35 + Math.floor(Math.random() * 20);
              this.ghostTypingTimer = setTimeout(eraseNext, eraseDelay);
            } else {
              input.value = '';
              adjustHeight();
              // مکث دراماتیک بعد از پاک شدن کامل قبل از شروع پیام ارسالی
              this.ghostTypingTimer = setTimeout(() => {
                if (!this.isPlaying || generation !== this.sceneGeneration) return;
                this.simulateGhostTyping(nextTextToSend, onComplete);
              }, 1200);
            }
          };
          eraseNext();
        }, readTime);`;

const newGhostErase = `        adjustHeight();
        // زمان خواندن پیام در کامپوزر (بهینه‌سازی شده برای هیجان و عدم وقفه طولانی - سازگار با ۷۵۰۰ و ۵۰۰۰)
        const readTime = Math.max(Number(holdMs) || 0, 4800);
        this.ghostTypingTimer = setTimeout(() => {
          if (!this.isPlaying || generation !== this.sceneGeneration) return;
          // پاک کردن تدریجی و واقعی کامپوزر با کلید بک‌اسپیس حرف به حرف
          let eraseIdx = textToRead.length;
          const eraseNext = () => {
            if (!this.isPlaying || generation !== this.sceneGeneration) return;
            if (eraseIdx > 0) {
              eraseIdx--;
              input.value = textToRead.substring(0, eraseIdx);
              adjustHeight();
              const eraseDelay = 25 + Math.floor(Math.random() * 15);
              this.ghostTypingTimer = setTimeout(eraseNext, eraseDelay);
            } else {
              input.value = '';
              adjustHeight();
              // مکث کوتاه قبل از شروع پیام ارسالی (بهینه‌سازی شده از ۱۲۰۰ به ۸۰۰ میلی‌ثانیه)
              this.ghostTypingTimer = setTimeout(() => {
                if (!this.isPlaying || generation !== this.sceneGeneration) return;
                this.simulateGhostTyping(nextTextToSend, onComplete);
              }, 800);
            }
          };
          eraseNext();
        }, readTime);`;

// 5. Update simulateGhostTyping hold time before sending
const oldGhostSend = `        adjustHeight();
        // مکث ۲.۲ ثانیه‌ای جهت خوانده شدن پیام در کامپوزر قبل از ارسال خودکار
        this.ghostTypingTimer = setTimeout(() => {
          if (!this.isPlaying || generation !== this.sceneGeneration) return;
          const sendBtn = form ? form.querySelector('button[type="submit"], #send-btn, .send-button') : null;
          if (sendBtn) {
            sendBtn.classList.add('ghost-send-pulse');
            setTimeout(() => sendBtn.classList.remove('ghost-send-pulse'), 400);
          }
          input.value = '';
          input.style.height = '';
          input.classList.remove('ghost-typing-active');
          if (typeof onComplete === 'function') onComplete();
        }, 2200);`;

const newGhostSend = `        adjustHeight();
        // مکث جهت خوانده شدن پیام در کامپوزر قبل از ارسال خودکار (بهینه‌سازی شده از ۲۲۰۰ به ۱۵۰۰ میلی‌ثانیه)
        this.ghostTypingTimer = setTimeout(() => {
          if (!this.isPlaying || generation !== this.sceneGeneration) return;
          const sendBtn = form ? form.querySelector('button[type="submit"], #send-btn, .send-button') : null;
          if (sendBtn) {
            sendBtn.classList.add('ghost-send-pulse');
            setTimeout(() => sendBtn.classList.remove('ghost-send-pulse'), 350);
          }
          input.value = '';
          input.style.height = '';
          input.classList.remove('ghost-typing-active');
          if (typeof onComplete === 'function') onComplete();
        }, 1500);`;

// 6. Complete, beautifully synchronized renderFrame(sec) timeline
const newRenderFrameTimeline = `  renderFrame(sec) {
    this.updateCinematicTimecode(sec);

    const isV1 = (typeof window !== 'undefined' && (window.CYBER_SCENARIO_VERSION === 'v1' || new URLSearchParams(window.location.search).get('scenario') === 'v1'));
    const isV2 = (typeof window !== 'undefined' && (window.CYBER_SCENARIO_VERSION === 'v2' || new URLSearchParams(window.location.search).get('scenario') === 'v2'));

    if (isV1 || isV2) {
      this.renderLegacyFrame(sec, isV1);
      return;
    }

    // =========================================================================
    // سناریوی پیش‌فرض MASTER-28: کرئوگرافی کامل و دقیق طبق سناریوی روایی کاربر
    // =========================================================================
    const scn = CYBER_SCENARIOS.v3_cinematic_story;

    // ۱. شروع هک: پیام اول کارآگاه (ارسال در ثانیه ۰)
    if (sec === 0) {
      this.appendChatMessage({
        id: 'battle-det-ask-video',
        senderType: 'admin',
        content: scn.detAskVideo
      });
    }

    // ۲. بعد بیست ثانیه: پیام دوم کارآگاه + تغییر رنگ تدریجی کدهای باکس سمت چپ (ترمینال) به قرمز
    if (sec === 20) {
      this.appendChatMessage({
        id: 'battle-det-no-reply',
        senderType: 'admin',
        content: scn.detNoReply
      });
      if (this.dom.terminal) {
        this.dom.terminal.classList.add('breach-warming-up');
      }
    }

    // ۳. بعد بیست ثانیه: پیام سوم و چهارم کارآگاه + پر پر کردن تصاویر برد اسناد
    if (sec === 40) {
      this.appendChatMessage({
        id: 'battle-det-wait-answer',
        senderType: 'admin',
        content: scn.detWaitAnswer
      });
    }

    if (sec === 41) {
      this.appendChatMessage({
        id: 'battle-det-reply-now',
        senderType: 'admin',
        content: scn.detReplyNow
      });
      if (this.dom.evidenceBoard) {
        this.dom.evidenceBoard.classList.add('evidence-flickering');
      }
      if (this.dom.evidenceGrid) {
        this.dom.evidenceGrid.classList.add('evidence-flickering');
      }
    }

    // ۴. بعد ده ثانیه: پیام‌های اعلام نفوذ کارآگاه
    if (sec === 51) {
      this.appendChatMessage({
        id: 'battle-det-what-happened',
        senderType: 'admin',
        content: scn.detWhatHappened
      });
    }

    if (sec === 53) {
      this.appendChatMessage({
        id: 'battle-det-security-altered',
        senderType: 'admin',
        content: scn.detSecurityAltered
      });
    }

    if (sec === 55) {
      this.appendChatMessage({
        id: 'battle-det-something-up',
        senderType: 'admin',
        content: scn.detSomethingUp
      });
    }

    if (sec === 57) {
      this.appendChatMessage({
        id: 'battle-det-infiltrator-alert',
        senderType: 'admin',
        content: scn.detInfiltratorAlert
      });
    }

    // ۵. بلافاصله بعد این پیام: تصویر سیگنال قطع شد (پرده سیاه با نقطه قرمز تپنده)
    if (sec === 60) {
      this.triggerInitialBlackout(() => {
        // بعد از کنار رفتن پرده سیاه:
        // - قفل شدن چت بچه‌ها
        this.lockChatInput();
        // - توقف گلیچ برد و اعمال تصاویر و پس‌زمینه مزداک
        if (this.dom.evidenceBoard) this.dom.evidenceBoard.classList.remove('evidence-flickering');
        if (this.dom.evidenceGrid) this.dom.evidenceGrid.classList.remove('evidence-flickering');
      });
    }

    // ۶. تایپ حروف‌به‌حروف مزداک در کامپوزر بچه‌ها، توقف برای خواندن، پاک کردن و ارسال به کارآگاه
    if (sec === 68) {
      this.simulateGhostTypingWithErase(
        scn.mazdakGhostBoast1,
        4800,
        scn.mazdakSpoofedMsg1,
        () => {
          this.appendChatMessage({
            id: 'battle-kids-spoofed-infiltrator',
            senderType: 'user',
            content: scn.mazdakSpoofedMsg1
          });
        }
      );
    }

    // ۷. جواب کارآگاه
    if (sec === 84) {
      this.appendChatMessage({
        id: 'battle-det-infiltrator-ack',
        senderType: 'admin',
        content: scn.detInfiltratorAck
      });
    }

    // ۸. تایپ کری‌خوانی در کامپوزر، پاک کردن، و درخواست فریبکارانه رمز گاوصندوق
    if (sec === 88) {
      this.simulateGhostTypingWithErase(
        scn.mazdakGhostBoast2,
        4800,
        scn.mazdakSpoofedVaultReq,
        () => {
          this.appendChatMessage({
            id: 'battle-kids-spoofed-vault-request',
            senderType: 'user',
            content: scn.mazdakSpoofedVaultReq
          });
        }
      );
    }

    // ۹. امتناع کارآگاه از دادن رمز گاوصندوق
    if (sec === 105) {
      this.appendChatMessage({
        id: 'battle-det-refuse-vault',
        senderType: 'admin',
        content: scn.detRefuseVault
      });
    }

    if (sec === 108) {
      this.appendChatMessage({
        id: 'battle-det-refuse-confidential',
        senderType: 'admin',
        content: scn.detRefuseConfidential
      });
    }

    // ۱۰. اصرار مزداک با هویت جعلی برای دریافت رمز
    if (sec === 112) {
      this.simulateGhostTyping(scn.mazdakSpoofedUrgent, () => {
        this.appendChatMessage({
          id: 'battle-kids-spoofed-urgent',
          senderType: 'user',
          content: scn.mazdakSpoofedUrgent
        });
      });
    }

    if (sec === 117) {
      this.simulateGhostTyping(scn.mazdakSpoofedDataWipe, () => {
        this.appendChatMessage({
          id: 'battle-kids-spoofed-data-wipe',
          senderType: 'user',
          content: scn.mazdakSpoofedDataWipe
        });
      });
    }

    // ۱۱. شک کارآگاه و افشای نفوذی بودن
    if (sec === 124) {
      this.appendChatMessage({
        id: 'battle-det-voice-changed',
        senderType: 'admin',
        content: scn.detVoiceChanged
      });
    }

    if (sec === 127) {
      this.appendChatMessage({
        id: 'battle-det-unmask-infiltrator',
        senderType: 'admin',
        content: scn.detUnmaskInfiltrator
      });
    }

    if (sec === 130) {
      this.appendChatMessage({
        id: 'battle-det-protocol-check',
        senderType: 'admin',
        content: scn.detProtocolCheck
      });
    }

    if (sec === 133) {
      this.appendChatMessage({
        id: 'battle-det-not-my-assistant',
        senderType: 'admin',
        content: scn.detNotMyAssistant
      });
    }

    // ۱۲. افشای چهره مزداک: پرش صفحه + صدای شدید + اولین پیام مستقیم مزداک
    if (sec === 136) {
      this.triggerBreachScreenJump();
      this.appendChatMessage({
        id: 'battle-mazdak-unmasked-1',
        senderType: 'hacker',
        content: scn.mazdakUnmasked1
      });
    }

    if (sec === 139) {
      this.appendChatMessage({
        id: 'battle-mazdak-unmasked-2',
        senderType: 'hacker',
        content: scn.mazdakUnmasked2
      });
    }

    // ۱۳. پیام‌های کارآگاه به مزداک
    if (sec === 142) {
      this.appendChatMessage({
        id: 'battle-det-mazdak-identified',
        senderType: 'admin',
        content: scn.detMazdakIdentified
      });
    }

    if (sec === 144) {
      this.appendChatMessage({
        id: 'battle-det-how-infiltrated',
        senderType: 'admin',
        content: scn.detHowInfiltrated
      });
    }

    // ۱۴. خط و نشان‌های مزداک
    if (sec === 147) {
      this.appendChatMessage({
        id: 'battle-mazdak-boast-easy-bypass',
        senderType: 'hacker',
        content: scn.mazdakBoastEasyBypass
      });
    }

    if (sec === 150) {
      this.appendChatMessage({
        id: 'battle-mazdak-warning-history',
        senderType: 'hacker',
        content: scn.mazdakWarningHistory
      });
    }

    if (sec === 153) {
      this.appendChatMessage({
        id: 'battle-mazdak-all-clues-accessed',
        senderType: 'hacker',
        content: scn.mazdakAllCluesAccessed
      });
    }

    // ۱۵. پاسخ کارآگاه مبنی بر قفل بودن اطلاعات و اخراج
    if (sec === 157) {
      this.appendChatMessage({
        id: 'battle-det-lockdown-declaration',
        senderType: 'admin',
        content: scn.detLockdownDeclaration
      });
    }

    if (sec === 160) {
      this.appendChatMessage({
        id: 'battle-det-ejection-warning',
        senderType: 'admin',
        content: scn.detEjectionWarning
      });
    }

    // ۱۶ و ۱۷. شمارش معکوس پرواز ۵، ۴، (مزداک)، ۳، ۲، ۱
    if (sec === 163) {
      this.appendChatMessage({
        id: 'battle-det-countdown-5',
        senderType: 'admin',
        content: scn.detCount5
      });
    }

    if (sec === 165) {
      this.appendChatMessage({
        id: 'battle-det-countdown-4',
        senderType: 'admin',
        content: scn.detCount4
      });
    }

    if (sec === 166) {
      this.appendChatMessage({
        id: 'battle-mazdak-interruption',
        senderType: 'hacker',
        content: scn.mazdakInterruption
      });
    }

    if (sec === 168) {
      this.appendChatMessage({
        id: 'battle-det-countdown-3',
        senderType: 'admin',
        content: scn.detCount3
      });
    }

    if (sec === 170) {
      this.appendChatMessage({
        id: 'battle-det-countdown-2',
        senderType: 'admin',
        content: scn.detCount2
      });
    }

    if (sec === 172) {
      this.appendChatMessage({
        id: 'battle-det-countdown-1',
        senderType: 'admin',
        content: scn.detCount1
      });
    }

    // ۱۸. سر یک ثانیه: پیام «کانال امن را ترک کنید» و پس از ۱۰ ثانیه خروج و ذخیره آدرس
    if (sec === 173) {
      this.triggerEmergencyEjectionModal();
    }
  }`;

// Apply replacements
const hasCrlf = engineJs.includes('\r\n');
engineJs = engineJs.replace(/\r\n/g, '\n');

if (engineJs.includes(oldEnsureEjectionModal.replace(/\r\n/g, '\n'))) {
  engineJs = engineJs.replace(oldEnsureEjectionModal.replace(/\r\n/g, '\n'), newEnsureEjectionModal.replace(/\r\n/g, '\n'));
  console.log('✓ Replaced ensureEjectionModal');
} else {
  console.error('ensureEjectionModal not found!');
}

if (engineJs.includes(oldTriggerEmergency.replace(/\r\n/g, '\n'))) {
  engineJs = engineJs.replace(oldTriggerEmergency.replace(/\r\n/g, '\n'), newTriggerEmergency.replace(/\r\n/g, '\n'));
  console.log('✓ Replaced triggerEmergencyEjectionModal');
} else {
  console.error('triggerEmergencyEjectionModal not found!');
}

if (engineJs.includes(oldStartDefault.replace(/\r\n/g, '\n'))) {
  engineJs = engineJs.replace(oldStartDefault.replace(/\r\n/g, '\n'), newStartDefault.replace(/\r\n/g, '\n'));
  console.log('✓ Replaced start() default case');
} else {
  console.error('start() default case not found!');
}

if (engineJs.includes(oldGhostErase.replace(/\r\n/g, '\n'))) {
  engineJs = engineJs.replace(oldGhostErase.replace(/\r\n/g, '\n'), newGhostErase.replace(/\r\n/g, '\n'));
  console.log('✓ Replaced ghost erase delays');
} else {
  console.error('ghost erase delays not found!');
}

if (engineJs.includes(oldGhostSend.replace(/\r\n/g, '\n'))) {
  engineJs = engineJs.replace(oldGhostSend.replace(/\r\n/g, '\n'), newGhostSend.replace(/\r\n/g, '\n'));
  console.log('✓ Replaced ghost send delay');
} else {
  console.error('ghost send delay not found!');
}

// Replace renderFrame
const renderFrameRegex = /renderFrame\(sec\) \{[\s\S]*?if \(sec === 262\) \{[\s\S]*?triggerEmergencyEjectionModal\(\);[\s\S]*?\}/;
if (renderFrameRegex.test(engineJs)) {
  engineJs = engineJs.replace(renderFrameRegex, newRenderFrameTimeline.replace(/\r\n/g, '\n'));
  console.log('✓ Replaced renderFrame timeline');
} else {
  console.error('renderFrameRegex not matched!');
}

if (hasCrlf) {
  engineJs = engineJs.replace(/\n/g, '\r\n');
}
fs.writeFileSync(engineJsPath, engineJs, 'utf8');

// Also update tests/cinematic-breach-choreography.test.js
const testPath = path.join(__dirname, '..', 'tests', 'cinematic-breach-choreography.test.js');
let testContent = fs.readFileSync(testPath, 'utf8');
testContent = testContent.replace(/sec === 262/g, 'sec === 173');
fs.writeFileSync(testPath, testContent, 'utf8');
console.log('✓ Updated tests/cinematic-breach-choreography.test.js to match sec === 173');

console.log('Seamless cinematic story patch successfully written.');
