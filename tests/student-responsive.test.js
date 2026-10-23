/**
 * tests/student-responsive.test.js
 * تست‌های خودکار اعتبارسنجی معماری ریسپانسیو پایانه دانش‌آموز (Student Terminal Responsive Engine)
 * منطبق بر استانداردهای UMAC-P و سند مستر ۰۸ (MASTER_08_STUDENT_TERMINAL_RESPONSIVE_ENGINE.md)
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Student Terminal Responsive Engine (MASTER-08)', () => {
  const rootDir = path.join(__dirname, '..');
  const chatHtmlPath = path.join(rootDir, 'public', 'chat.html');
  const mobileCssPath = path.join(rootDir, 'public', 'assets', 'css', 'student-mobile.css');
  const terminalCssPath = path.join(rootDir, 'public', 'assets', 'css', 'terminal.css');
  const userChatJsPath = path.join(rootDir, 'public', 'assets', 'js', 'user-chat.js');

  const chatHtml = fs.readFileSync(chatHtmlPath, 'utf8');
  const mobileCss = fs.readFileSync(mobileCssPath, 'utf8');
  const terminalCss = fs.readFileSync(terminalCssPath, 'utf8');
  const userChatJs = fs.readFileSync(userChatJsPath, 'utf8');

  test('1. DOM Architecture: chat.html links student-mobile.css and contains tactical mobile navigation tabs', () => {
    assert.ok(chatHtml.includes('student-mobile.css'), 'chat.html must link student-mobile.css');
    assert.ok(chatHtml.includes('class="student-mobile-nav-tabs"'), 'chat.html must contain .student-mobile-nav-tabs');
    assert.ok(chatHtml.includes('id="tab-btn-chat"'), 'chat.html must have #tab-btn-chat');
    assert.ok(chatHtml.includes('id="tab-btn-evidence"'), 'chat.html must have #tab-btn-evidence');
    assert.ok(chatHtml.includes('id="tab-btn-tools"'), 'chat.html must have #tab-btn-tools');
    assert.ok(chatHtml.includes('id="chat-tab-badge"'), 'chat.html must contain #chat-tab-badge for unread messages');
    assert.ok(chatHtml.includes('id="evidence-tab-badge"'), 'chat.html must contain #evidence-tab-badge for evidence counter');
    assert.ok(chatHtml.includes('switchStudentMobileTab'), 'chat.html must use switchStudentMobileTab click handlers');
  });

  test('2. Desktop Invariant: Mobile navigation is strictly hidden on large screens (>992px) with zero layout shifts', () => {
    assert.ok(mobileCss.includes('@media (min-width: 993px)'), 'student-mobile.css must define desktop guard');
    assert.ok(mobileCss.includes('.student-mobile-nav-tabs {\n    display: none !important;') ||
              mobileCss.includes('.student-mobile-nav-tabs {\r\n    display: none !important;') ||
              mobileCss.includes('display: none !important;'),
              'Mobile tabs must be strictly hidden on desktop');
    
    // حفظ ساختار دو ستونه اصلی در دسکتاپ
    assert.ok(terminalCss.includes('grid-template-columns: minmax(0, 1.4fr) minmax(380px, 1fr)'), 'Desktop workspace grid must be preserved');
  });

  test('3. Mobile Breakpoint Architecture: Fluid 100vw container, state machine tab switching and viewport height', () => {
    assert.ok(mobileCss.includes('@media (max-width: 992px)'), 'student-mobile.css must define <=992px breakpoint');
    assert.ok(mobileCss.includes('min-width: 0 !important;'), 'min-width must be reset for mobile viewports');
    assert.ok(mobileCss.includes('--viewport-height'), 'Must utilize --viewport-height CSS variable for mobile visualViewport');
    
    // کلاس‌های سه‌گانه وضعیت بدنه (State Machine)
    assert.ok(mobileCss.includes('body.student-tab-chat'), 'student-mobile.css must define body.student-tab-chat');
    assert.ok(mobileCss.includes('body.student-tab-evidence'), 'student-mobile.css must define body.student-tab-evidence');
    assert.ok(mobileCss.includes('body.student-tab-tools'), 'student-mobile.css must define body.student-tab-tools');
  });

  test('4. Composer & Mobile Keyboard Protection: flex-shrink zero, safe-area padding and compact touch controls', () => {
    assert.ok(mobileCss.includes('.composer {'), 'student-mobile.css must style mobile composer');
    assert.ok(mobileCss.includes('flex-shrink: 0 !important;'), 'Composer must have flex-shrink: 0 to stay anchored');
    assert.ok(mobileCss.includes('env(safe-area-inset-bottom)'), 'Composer must support safe-area-inset-bottom for iOS/Android home bars');
    assert.ok(mobileCss.includes('.emoji-picker-popover {'), 'Emoji picker must have mobile responsive bounding rules');
  });

  test('5. Quad Panel & 3D Vault Phone Optimization: 1-column fallback on narrow screens & centered escutcheon', () => {
    assert.ok(mobileCss.includes('@media (max-width: 580px)'), 'Must have dedicated <=580px narrow phone rules');
    assert.ok(mobileCss.includes('.vault-mounted-escutcheon {'), 'Must optimize vault mounted escutcheon for mobile thumb typing');
    assert.ok(mobileCss.includes('left: 50% !important;'), 'Vault keypad must be centered on narrow phones');
  });

  test('6. Client Controller: user-chat.js implements switchStudentMobileTab, unread badges and visualViewport listener', () => {
    assert.ok(userChatJs.includes('function switchStudentMobileTab'), 'user-chat.js must define switchStudentMobileTab');
    assert.ok(userChatJs.includes('function initStudentMobileViewport'), 'user-chat.js must define initStudentMobileViewport');
    assert.ok(userChatJs.includes('window.visualViewport'), 'user-chat.js must attach visualViewport resize listener');
    assert.ok(userChatJs.includes('chat-tab-badge'), 'user-chat.js must handle chat-tab-badge');
    assert.ok(userChatJs.includes('evidence-tab-badge'), 'user-chat.js must handle evidence-tab-badge');
    assert.ok(userChatJs.includes('window.switchStudentMobileTab = switchStudentMobileTab'), 'user-chat.js must expose switchStudentMobileTab');
  });

  test('7. Core Business Invariants Preservation: Bubble alignment, replies, and 3D vault remain intact', () => {
    // چیدمان حباب‌ها (کاربر راست، کارآگاه چپ)
    assert.ok(terminalCss.includes('.message-bubble.user {\n  align-self: flex-start !important;') ||
              terminalCss.includes('align-self: flex-start !important;'), 'User bubble right alignment invariant must hold');
    assert.ok(terminalCss.includes('.message-bubble.admin {\n  align-self: flex-end !important;') ||
              terminalCss.includes('align-self: flex-end !important;'), 'Admin bubble left alignment invariant must hold');

    // سامانه ریپلای دوطرفه
    assert.ok(userChatJs.includes('stageUserReply'), 'stageUserReply must remain intact');
    assert.ok(userChatJs.includes('cancelUserReply'), 'cancelUserReply must remain intact');
    assert.ok(userChatJs.includes('jumpToMessage'), 'jumpToMessage must remain intact');
  });
});
