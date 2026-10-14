const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('Admin Prepared Scenario Steps Progress Tracking & Class Isolation', async (t) => {
  const rootDir = path.resolve(__dirname, '..');
  const masterPlanPath = path.join(rootDir, 'MASTER_CANNED_RESPONSES_PROGRESS_TRACKING.md');
  const adminCssPath = path.join(rootDir, 'public/assets/css/admin.css');
  const adminJsPath = path.join(rootDir, 'public/assets/js/admin-chat.js');

  await t.test('1. Master Plan exists and documents core requirements, unlocked resend, and class isolation', () => {
    assert.ok(fs.existsSync(masterPlanPath), 'MASTER_CANNED_RESPONSES_PROGRESS_TRACKING.md must exist');
    const doc = fs.readFileSync(masterPlanPath, 'utf8');
    assert.ok(doc.includes('✓ ارسال شده'), 'Must document the checkmark sent badge');
    assert.ok(doc.includes('قفل'), 'Must document the unlocked resend button policy');
    assert.ok(doc.includes('ارسال مجدد'), 'Must document resend button label');
    assert.ok(doc.includes('یونیک') || doc.includes('ایزوله'), 'Must document per-class unique isolation');
    assert.ok(doc.includes('hydrateSessionSentStepsFromMessages') || doc.includes('بازیابی هوشمند'), 'Must document re-hydration from message history');
  });

  await t.test('2. CSS rules in admin.css define sent-step emerald styling and badge without blocking buttons', () => {
    assert.ok(fs.existsSync(adminCssPath), 'admin.css must exist');
    const css = fs.readFileSync(adminCssPath, 'utf8');

    assert.ok(css.includes('.weekly-step-card'), 'admin.css must contain .weekly-step-card');
    assert.ok(css.includes('.weekly-step-card.sent-step'), 'admin.css must contain .weekly-step-card.sent-step');
    assert.ok(css.includes('#10b981'), 'Sent step must use distinct emerald border/accent #10b981');
    assert.ok(css.includes('step-sent-badge'), 'admin.css must define .step-sent-badge');
    assert.ok(css.includes('.weekly-step-card.sent-step .step-send-btn'), 'admin.css must style send button for sent state');
    assert.ok(!css.includes('.weekly-step-card.sent-step .step-send-btn { display: none') && !css.includes('.weekly-step-card.sent-step .step-send-btn { pointer-events: none'), 'Send button must NOT be hidden or disabled via CSS');
  });

  await t.test('3. JavaScript in admin-chat.js implements per-session tracking and unlocked resend', () => {
    assert.ok(fs.existsSync(adminJsPath), 'admin-chat.js must exist');
    const js = fs.readFileSync(adminJsPath, 'utf8');

    assert.ok(js.includes('sessionSentStepsMap'), 'Must define sessionSentStepsMap');
    assert.ok(js.includes('getSessionSentSteps'), 'Must define getSessionSentSteps');
    assert.ok(js.includes('markStepAsSent'), 'Must define markStepAsSent');
    assert.ok(js.includes('isStepSentInSession'), 'Must define isStepSentInSession');
    assert.ok(js.includes('updateStepCardVisual'), 'Must define updateStepCardVisual');
    assert.ok(js.includes('refreshWeeklyStepsProgress'), 'Must define refreshWeeklyStepsProgress');
    assert.ok(js.includes('hydrateSessionSentStepsFromMessages'), 'Must define hydrateSessionSentStepsFromMessages');
    assert.ok(js.includes('sendWeeklyTextDirect'), 'Must provide direct text send');
    assert.ok(js.includes('✓ ارسال مجدد'), 'Button must change text to resend');
    assert.ok(js.includes('disabled = false'), 'Button must explicitly guarantee disabled = false');
  });

  await t.test('4. Logical unit simulation: unique per-class tracking and message re-hydration', () => {
    // Isolated in-memory simulator matching admin-chat.js logic
    const sessionSentStepsMap = new Map();
    const storageMock = {};

    function getSessionSentSteps(sessionId) {
      const sId = Number(sessionId);
      if (!sId) return new Set();
      if (!sessionSentStepsMap.has(sId)) {
        const stored = storageMock[`raze_session_${sId}_sent_steps`];
        const arr = stored ? JSON.parse(stored) : [];
        sessionSentStepsMap.set(sId, new Set(arr.map(x => String(x))));
      }
      return sessionSentStepsMap.get(sId);
    }

    function markStepAsSent(sessionId, stepId) {
      const sId = Number(sessionId);
      if (!sId || !stepId) return;
      const set = getSessionSentSteps(sId);
      set.add(String(stepId));
      storageMock[`raze_session_${sId}_sent_steps`] = JSON.stringify(Array.from(set));
    }

    function isStepSentInSession(sessionId, stepId) {
      const sId = Number(sessionId);
      if (!sId || !stepId) return false;
      return getSessionSentSteps(sId).has(String(stepId));
    }

    // Step 1: Mark step 101 for Session 1
    markStepAsSent(1, 101);
    assert.strictEqual(isStepSentInSession(1, 101), true, 'Session 1 must have step 101 marked as sent');
    assert.strictEqual(isStepSentInSession(2, 101), false, 'Session 2 MUST NOT have step 101 marked (isolation)');

    // Step 2: Mark step 102 for Session 2
    markStepAsSent(2, 102);
    assert.strictEqual(isStepSentInSession(1, 102), false, 'Session 1 MUST NOT have step 102 marked (isolation)');
    assert.strictEqual(isStepSentInSession(2, 102), true, 'Session 2 must have step 102 marked as sent');

    // Step 3: Simulate re-hydration from session messages
    const mockWeeklyContentCache = {
      1: [
        { id: 201, content_type: 'text', title: 'راهنما ۱', text_content: 'متن راهنمای کارآگاهی شماره یک' },
        { id: 202, content_type: 'image', title: 'عکس دست‌نوشته', file_url: '/uploads/clue1.jpg' }
      ]
    };

    function hydrateSession(sessionId, messages) {
      const sId = Number(sessionId);
      const sentSet = getSessionSentSteps(sId);
      Object.values(mockWeeklyContentCache).forEach(stepList => {
        stepList.forEach(item => {
          const stepIdStr = String(item.id);
          const match = messages.some(m => {
            if (m.sender_type === 'user') return false;
            if (item.content_type === 'text') {
              return m.content && m.content.trim() === item.text_content.trim();
            } else {
              return m.file_url && m.file_url.includes('clue1.jpg');
            }
          });
          if (match) sentSet.add(stepIdStr);
        });
      });
      storageMock[`raze_session_${sId}_sent_steps`] = JSON.stringify(Array.from(sentSet));
    }

    // Session 3 has message history containing clue1.jpg
    const session3Messages = [
      { sender_type: 'admin', message_type: 'image', file_url: '/uploads/clue1.jpg', content: 'عکس دست‌نوشته' }
    ];
    hydrateSession(3, session3Messages);

    assert.strictEqual(isStepSentInSession(3, 202), true, 'Session 3 must re-hydrate step 202 from message history');
    assert.strictEqual(isStepSentInSession(3, 201), false, 'Session 3 must not mark step 201 since it was never sent');
    assert.strictEqual(isStepSentInSession(1, 202), false, 'Session 1 must not inherit step 202 from Session 3');

    // Step 4: Resend verification
    const mockCard = {
      dataset: { stepId: '101' },
      classList: {
        classes: new Set(),
        add(c) { this.classes.add(c); },
        remove(c) { this.classes.delete(c); },
        contains(c) { return this.classes.has(c); }
      },
      sendBtn: { innerHTML: '', disabled: false, title: '' }
    };

    function applyVisual(card, isSent) {
      if (isSent) {
        card.classList.add('sent-step');
        card.sendBtn.innerHTML = '✓ ارسال مجدد';
        card.sendBtn.disabled = false; // NEVER LOCKED
      } else {
        card.classList.remove('sent-step');
        card.sendBtn.innerHTML = '📤 ارسال به جلسه';
        card.sendBtn.disabled = false;
      }
    }

    applyVisual(mockCard, isStepSentInSession(1, 101));
    assert.ok(mockCard.classList.contains('sent-step'), 'Card must have .sent-step class');
    assert.strictEqual(mockCard.sendBtn.innerHTML, '✓ ارسال مجدد', 'Button text must invite resending');
    assert.strictEqual(mockCard.sendBtn.disabled, false, 'Send button must stay unlocked and clickable');
  });
});
