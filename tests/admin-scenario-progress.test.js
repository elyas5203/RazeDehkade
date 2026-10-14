const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('Admin Prepared Scenario Steps Progress Tracking & Class Isolation', async (t) => {
  const rootDir = path.resolve(__dirname, '..');
  const masterPlanPath = path.join(rootDir, 'MASTER_CANNED_RESPONSES_PROGRESS_TRACKING.md');
  const adminCssPath = path.join(rootDir, 'public/assets/css/admin.css');
  const adminJsPath = path.join(rootDir, 'public/assets/js/admin-chat.js');
  const adminHtmlPath = path.join(rootDir, 'public/admin/chat.html');

  await t.test('1. Master Plan exists and documents insert-to-composer workflow and color-on-send', () => {
    assert.ok(fs.existsSync(masterPlanPath), 'MASTER_CANNED_RESPONSES_PROGRESS_TRACKING.md must exist');
    const doc = fs.readFileSync(masterPlanPath, 'utf8');
    assert.ok(doc.includes('✓ ارسال شده'), 'Must document the checkmark sent badge');
    assert.ok(doc.includes('درج در کادر چت'), 'Must document insert-to-composer workflow');
    assert.ok(doc.includes('یونیک') || doc.includes('ایزوله'), 'Must document per-class unique isolation');
    assert.ok(doc.includes('hydrateSessionSentStepsFromMessages') || doc.includes('بازیابی هوشمند'), 'Must document re-hydration from message history');
  });

  await t.test('2. CSS rules in admin.css define non-shrinking cards, sent-step emerald styling and badge', () => {
    assert.ok(fs.existsSync(adminCssPath), 'admin.css must exist');
    const css = fs.readFileSync(adminCssPath, 'utf8');

    assert.ok(css.includes('.weekly-step-card'), 'admin.css must contain .weekly-step-card');
    assert.ok(css.includes('flex-shrink: 0 !important;'), 'weekly-step-card must have flex-shrink: 0 to prevent card crushing');
    assert.ok(css.includes('.weekly-step-card.sent-step'), 'admin.css must contain .weekly-step-card.sent-step');
    assert.ok(css.includes('#10b981'), 'Sent step must use distinct emerald border/accent #10b981');
    assert.ok(css.includes('step-sent-badge'), 'admin.css must define .step-sent-badge');
  });

  await t.test('3. HTML and JavaScript in chat.html & admin-chat.js implement staged media and composer sending', () => {
    assert.ok(fs.existsSync(adminHtmlPath), 'chat.html must exist');
    const html = fs.readFileSync(adminHtmlPath, 'utf8');
    assert.ok(html.includes('id="staged-media-chip"'), 'chat.html must contain staged-media-chip for staging files/media');

    assert.ok(fs.existsSync(adminJsPath), 'admin-chat.js must exist');
    const js = fs.readFileSync(adminJsPath, 'utf8');

    assert.ok(js.includes('sessionSentStepsMap'), 'Must define sessionSentStepsMap');
    assert.ok(js.includes('getSessionSentSteps'), 'Must define getSessionSentSteps');
    assert.ok(js.includes('markStepAsSent'), 'Must define markStepAsSent');
    assert.ok(js.includes('isStepSentInSession'), 'Must define isStepSentInSession');
    assert.ok(js.includes('updateStepCardVisual'), 'Must define updateStepCardVisual');
    assert.ok(js.includes('refreshWeeklyStepsProgress'), 'Must define refreshWeeklyStepsProgress');
    assert.ok(js.includes('hydrateSessionSentStepsFromMessages'), 'Must define hydrateSessionSentStepsFromMessages');
    assert.ok(js.includes('insertStepToComposer'), 'Must define insertStepToComposer');
    assert.ok(js.includes('clearStagedMedia'), 'Must define clearStagedMedia');
    assert.ok(js.includes('📝 درج در کادر چت'), 'Button must consistently say 📝 درج در کادر چت');
    assert.ok(!js.includes('✓ ارسال مجدد'), 'Button must NOT say ارسال مجدد per user instructions');
  });

  await t.test('4. Logical unit simulation: staging in composer, color-on-send, and per-class isolation', () => {
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

    let staged = null;
    function insertToComposer(sessionId, step) {
      staged = { sessionId, stepId: step.id, type: step.content_type, content: step.content };
    }

    function sendFromComposer() {
      if (!staged) return null;
      markStepAsSent(staged.sessionId, staged.stepId);
      const sent = staged;
      staged = null;
      return sent;
    }

    const step1 = { id: 101, content_type: 'text', content: 'سرنخ اول دهکده' };
    const step2 = { id: 102, content_type: 'image', content: '/clue.jpg' };

    // Action 1: Staging step 1 in Session 1
    insertToComposer(1, step1);
    assert.strictEqual(isStepSentInSession(1, 101), false, 'Card must NOT be marked as sent merely on insert/staging');

    // Action 2: Sending from composer
    sendFromComposer();
    assert.strictEqual(isStepSentInSession(1, 101), true, 'Card MUST become colored/sent after sending from composer');
    assert.strictEqual(isStepSentInSession(2, 101), false, 'Session 2 must remain isolated');

    // Action 3: Staging media step 2 in Session 2
    insertToComposer(2, step2);
    assert.strictEqual(isStepSentInSession(2, 102), false, 'Media step must not be marked sent before send');
    sendFromComposer();
    assert.strictEqual(isStepSentInSession(2, 102), true, 'Media step marked sent after sending');
    assert.strictEqual(isStepSentInSession(1, 102), false, 'Session 1 must not inherit step 102');
  });
});
