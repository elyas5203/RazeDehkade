const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/assets/js/cyber-breach-engine.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. In triggerEmergencyEjectionModal, remove the test mode auto-redirect so the user STAYS permanently on the eviction modal screen
const oldEjectionSnippet = `        const isTestMode = window.location.search.includes('test=1') || Boolean(window.sessionData && window.sessionData.is_test);
        if (isTestMode) {
          this.executeEjectionRedirect();
        }
        // کاربر روی همین صفحه قفل و ذخیره آدرس باقی می‌ماند و به صفحه سوالات احراز هویت هدایت نمی‌شود`;

const newEjectionSnippet = `        // انتقال خودکار طبق دستور صریح کاربر کاملاً غیرفعال است؛ کاربر روی همین صفحه قفل و ذخیره آدرس باقی می‌ماند
        // بعداً اگر کسی مجدداً وارد شود یا صفحه ریلود گردد، بر اساس وضعیت هک به صفحه سوالات هدایت خواهد شد`;

if (content.includes(oldEjectionSnippet)) {
  content = content.replace(oldEjectionSnippet, newEjectionSnippet);
  console.log('✓ Successfully removed automatic redirect from triggerEmergencyEjectionModal');
} else {
  console.warn('⚠ Old ejection snippet not found exactly, checking regex replacement');
  content = content.replace(
    /const isTestMode = window\.location\.search\.includes\('test=1'\)[\s\S]*?this\.executeEjectionRedirect\(\);\s*\}/,
    `// انتقال خودکار طبق دستور صریح کاربر کاملاً غیرفعال است؛ کاربر روی همین صفحه قفل و ذخیره آدرس باقی می‌ماند\n        // بعداً اگر کسی مجدداً وارد شود یا صفحه ریلود گردد، بر اساس وضعیت هک به صفحه سوالات هدایت خواهد شد`
  );
}

// 2. Add delay, checkSceneAlive, simulateGhostTypingWithErasePromise, simulateGhostTypingPromise, and runPostBlackoutSequence
const helperMethods = `
  delay(ms) {
    return new Promise(resolve => {
      const gen = this.sceneGeneration;
      const timer = setTimeout(() => {
        if (this.isPlaying && gen === this.sceneGeneration) {
          resolve();
        }
      }, ms);
      this.storyTimers = this.storyTimers || [];
      this.storyTimers.push(timer);
    });
  }

  checkSceneAlive(gen) {
    return Boolean(this.isPlaying && gen === this.sceneGeneration);
  }

  simulateGhostTypingWithErasePromise(textToRead, holdMs, nextTextToSend) {
    return new Promise(resolve => {
      this.simulateGhostTypingWithErase(textToRead, holdMs, nextTextToSend, resolve);
    });
  }

  simulateGhostTypingPromise(text) {
    return new Promise(resolve => {
      this.simulateGhostTyping(text, resolve);
    });
  }

  async runPostBlackoutSequence() {
    const gen = this.sceneGeneration;
    const scn = CYBER_SCENARIOS.v3_cinematic_story;
    if (this.storylineActive) return;
    this.storylineActive = true;

    // ۱. مکث کوتاه پس از کنار رفتن پرده سیاه
    await this.delay(1000);
    if (!this.checkSceneAlive(gen)) return;

    // ۲. تایپ متن اعتراض مزداک در کامپوزر بچه‌ها، مکث برای خواندن، پاک کردن تدریجی و تایپ پیام نفوذ
    await this.simulateGhostTypingWithErasePromise(
      scn.mazdakGhostBoast1,
      3800,
      scn.mazdakSpoofedMsg1
    );
    if (!this.checkSceneAlive(gen)) return;

    // ارسال قطعی پیام نفوذی به چت (دستیاران کارآگاه)
    this.appendChatMessage({
      id: 'battle-kids-spoofed-infiltrator',
      senderType: 'user',
      content: scn.mazdakSpoofedMsg1
    });

    // ۳. فقط پس از ارسال پیام بچه‌ها: مکث کوتاه خواندن کارآگاه و ارسال پاسخ کارآگاه
    // سازگار با تأخیر 2200 میلی‌ثانیه برای پاسخ‌های کارآگاه
    await this.delay(2200);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-infiltrator-ack',
      senderType: 'admin',
      content: scn.detInfiltratorAck
    });

    // ۴. فقط پس از مشاهده پاسخ کارآگاه: شروع تایپ کری‌خوانی و درخواست رمز گاوصندوق
    await this.delay(2000);
    if (!this.checkSceneAlive(gen)) return;

    await this.simulateGhostTypingWithErasePromise(
      scn.mazdakGhostBoast2,
      3800,
      scn.mazdakSpoofedVaultReq
    );
    if (!this.checkSceneAlive(gen)) return;

    // ارسال قطعی درخواست رمز گاوصندوق به چت
    this.appendChatMessage({
      id: 'battle-kids-spoofed-vault-request',
      senderType: 'user',
      content: scn.mazdakSpoofedVaultReq
    });

    // ۵. فقط پس از ارسال پیام گاوصندوق: پاسخ‌های کارآگاه (امتناع از لو دادن رمز)
    await this.delay(2200);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-refuse-vault',
      senderType: 'admin',
      content: scn.detRefuseVault
    });

    await this.delay(2000);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-refuse-confidential',
      senderType: 'admin',
      content: scn.detRefuseConfidential
    });

    // ۶. فقط پس از پیام‌های کارآگاه: اصرار مزداک با هویت جعلی برای دریافت رمز
    await this.delay(1800);
    if (!this.checkSceneAlive(gen)) return;
    await this.simulateGhostTypingPromise(scn.mazdakSpoofedUrgent);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-kids-spoofed-urgent',
      senderType: 'user',
      content: scn.mazdakSpoofedUrgent
    });

    await this.delay(1800);
    if (!this.checkSceneAlive(gen)) return;
    await this.simulateGhostTypingPromise(scn.mazdakSpoofedDataWipe);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-kids-spoofed-data-wipe',
      senderType: 'user',
      content: scn.mazdakSpoofedDataWipe
    });

    // ۷. فقط پس از اصرار مزداک: شک کارآگاه و بررسی امنیت
    // کد شناسایی دستیار من 7500 هستش
    await this.delay(2400);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-voice-changed',
      senderType: 'admin',
      content: scn.detVoiceChanged
    });

    await this.delay(2000);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-unmask-infiltrator',
      senderType: 'admin',
      content: scn.detUnmaskInfiltrator
    });

    await this.delay(2000);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-protocol-check',
      senderType: 'admin',
      content: scn.detProtocolCheck
    });

    await this.delay(2000);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-not-my-assistant',
      senderType: 'admin',
      content: scn.detNotMyAssistant
    });

    // ۸. افشای هویت مزداک: لرزش شدید صفحه (Screen Jump) + صدای گلیچ + اعتراف مستقیم مزداک
    await this.delay(1500);
    if (!this.checkSceneAlive(gen)) return;
    this.triggerBreachScreenJump();
    this.appendChatMessage({
      id: 'battle-mazdak-unmasked-1',
      senderType: 'hacker',
      content: scn.mazdakUnmasked1
    });

    await this.delay(2000);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-mazdak-unmasked-2',
      senderType: 'hacker',
      content: scn.mazdakUnmasked2
    });

    // ۹. دیالوگ رودرروی کارآگاه
    await this.delay(2200);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-mazdak-identified',
      senderType: 'admin',
      content: scn.detMazdakIdentified
    });

    await this.delay(2000);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-how-infiltrated',
      senderType: 'admin',
      content: scn.detHowInfiltrated
    });

    // ۱۰. کری‌خوانی‌های مزداک
    await this.delay(2200);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-mazdak-boast-easy-bypass',
      senderType: 'hacker',
      content: scn.mazdakBoastEasyBypass
    });

    await this.delay(2200);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-mazdak-warning-history',
      senderType: 'hacker',
      content: scn.mazdakWarningHistory
    });

    await this.delay(2200);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-mazdak-all-clues-accessed',
      senderType: 'hacker',
      content: scn.mazdakAllCluesAccessed
    });

    // ۱۱. پاتک کارآگاه و قفل کردن سیستم
    await this.delay(2400);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-lockdown-declaration',
      senderType: 'admin',
      content: scn.detLockdownDeclaration
    });

    await this.delay(2200);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-ejection-warning',
      senderType: 'admin',
      content: scn.detEjectionWarning
    });

    // ۱۲. شمارش معکوس اخراج (۵، ۴، رجزخوانی مزداک، ۳، ۲، ۱)
    await this.delay(1500);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-count-5',
      senderType: 'admin',
      content: scn.detCount5
    });

    await this.delay(1400);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-count-4',
      senderType: 'admin',
      content: scn.detCount4
    });

    await this.delay(1200);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-mazdak-interruption',
      senderType: 'hacker',
      content: scn.mazdakInterruption
    });

    await this.delay(1200);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-count-3',
      senderType: 'admin',
      content: scn.detCount3
    });

    await this.delay(1200);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-count-2',
      senderType: 'admin',
      content: scn.detCount2
    });

    await this.delay(1200);
    if (!this.checkSceneAlive(gen)) return;
    this.appendChatMessage({
      id: 'battle-det-count-1',
      senderType: 'admin',
      content: scn.detCount1
    });

    // ۱۳. سر یک ثانیه: بالا آمدن مودال اخراج اضطراری
    await this.delay(1000);
    if (!this.checkSceneAlive(gen)) return;
    this.triggerEmergencyEjectionModal();
  }
`;

// Insert helperMethods right before renderLegacyFrame
if (!content.includes('runPostBlackoutSequence()')) {
  content = content.replace('renderLegacyFrame(sec, isV1) {', `${helperMethods}\n  renderLegacyFrame(sec, isV1) {`);
  console.log('✓ Injected helperMethods and runPostBlackoutSequence');
}

// 3. Now update renderFrame to trigger runPostBlackoutSequence on blackout completion
const oldBlackoutTrigger = `    if (sec === 60) {
      this.triggerInitialBlackout(() => {
        // بعد از کنار رفتن پرده سیاه:
        // - قفل شدن چت بچه‌ها
        this.lockChatInput();
        // - توقف گلیچ برد و اعمال تصاویر و پس‌زمینه مزداک
        if (this.dom.evidenceBoard) this.dom.evidenceBoard.classList.remove('evidence-flickering');
        if (this.dom.evidenceGrid) this.dom.evidenceGrid.classList.remove('evidence-flickering');
      });
    }`;

const newBlackoutTrigger = `    if (sec === 60) {
      this.triggerInitialBlackout(() => {
        // بعد از کنار رفتن پرده سیاه:
        // - قفل شدن چت بچه‌ها
        this.lockChatInput();
        // - توقف گلیچ برد و اعمال تصاویر و پس‌زمینه مزداک
        if (this.dom.evidenceBoard) this.dom.evidenceBoard.classList.remove('evidence-flickering');
        if (this.dom.evidenceGrid) this.dom.evidenceGrid.classList.remove('evidence-flickering');
        // اجرای زنجیره روایی دقیقاً به صورت متوالی (تا هر پیام ارسال نشود پیام بعدی هرگز ارسال نخواهد شد)
        this.runPostBlackoutSequence();
      });
    }`;

if (content.includes(oldBlackoutTrigger)) {
  content = content.replace(oldBlackoutTrigger, newBlackoutTrigger);
  console.log('✓ Updated sec === 60 blackout trigger');
}

// 4. In renderFrame, replace the independent sec === 68 ... 173 triggers with an explanation and fallback check for sec === 173
const oldPostBlackoutBlockRegex = /\/\/ ۶\. تایپ حروف‌به‌حروف مزداک در کامپوزر بچه‌ها[\s\S]*?if \(sec === 173\) \{[\s\S]*?this\.triggerEmergencyEjectionModal\(\);\s*\}/;

const newPostBlackoutBlock = `    // تمام پیام‌ها و دیالوگ‌های پس از بلک‌اوت در تابع runPostBlackoutSequence به صورت زنجیره‌ای
    // و Promise متوالی اجرا می‌شوند تا تحت هیچ شرایطی پاسخ کارآگاه یا مزداک قبل از ارسال پیام قبلی ظاهر نشود.

    if (sec === 173) {
      // پشتیبان فراخوانی تخلیه اضطراری در ثانیه ۱۷۳
      if (!this.ejectionModalTriggered) {
        this.triggerEmergencyEjectionModal();
      }
    }`;

if (oldPostBlackoutBlockRegex.test(content)) {
  content = content.replace(oldPostBlackoutBlockRegex, newPostBlackoutBlock);
  console.log('✓ Replaced asynchronous sec triggers in renderFrame with strictly sequenced architecture');
} else {
  console.warn('⚠ Could not match oldPostBlackoutBlockRegex');
}

// 5. In reset(), clear story timers and reset flags
if (!content.includes('this.storylineActive = false;')) {
  content = content.replace(
    'this.isPlaying = false;',
    `this.isPlaying = false;
    this.storylineActive = false;
    this.ejectionModalTriggered = false;
    if (this.storyTimers && this.storyTimers.length) {
      this.storyTimers.forEach(t => clearTimeout(t));
      this.storyTimers = [];
    }`
  );
  console.log('✓ Added reset cleanups for storyTimers and flags');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Finished patching public/assets/js/cyber-breach-engine.js');
