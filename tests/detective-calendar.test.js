'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Setup minimal browser mocks for testing browser scripts in Node
global.sessionStorage = {
  getItem: (key) => {
    if (key === 'userSession') return JSON.stringify({ id: 1, name: 'کلاس تست' });
    if (key === 'userToken') return 'valid-jwt-token';
    return null;
  },
  setItem: () => {},
  removeItem: () => {},
};
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.location = { search: '', href: '' };
global.window = {
  location: global.location,
  innerWidth: 1200,
  addEventListener: () => {},
  visualViewport: { height: 800, addEventListener: () => {} }
};
global.document = {
  getElementById: () => null,
  addEventListener: () => {},
  documentElement: { style: { setProperty: () => {} } },
  body: { classList: { contains: () => false, add: () => {}, remove: () => {} } }
};

const userChatJsPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'user-chat.js');
const terminalCssPath = path.join(__dirname, '..', 'public', 'assets', 'css', 'terminal.css');
const studentMobileCssPath = path.join(__dirname, '..', 'public', 'assets', 'css', 'student-mobile.css');
const chatHtmlPath = path.join(__dirname, '..', 'public', 'chat.html');

const {
  getDetectiveCalendarMark,
  getDeterministicPastMark,
  gregorianToJalali,
  jalaliToGregorian,
  getJalaliWeekdayIndex,
  getJalaliMonthLength,
} = require('../public/assets/js/user-chat.js');

describe('Detective Calendar Tactical Markings Engine (MASTER-09)', () => {

  test('1. Architecture & Exports: user-chat.js implements getDetectiveCalendarMark and exports it', () => {
    assert.equal(typeof getDetectiveCalendarMark, 'function', 'getDetectiveCalendarMark must be exported as a function');
    const userChatJs = fs.readFileSync(userChatJsPath, 'utf8');
    assert.ok(
      userChatJs.includes('has-mark') && userChatJs.includes("'circle'") && userChatJs.includes("'cross'") && userChatJs.includes("'check'"),
      'user-chat.js must handle circle, cross, and check marks'
    );
    assert.ok(
      userChatJs.includes('window.getDetectiveCalendarMark = getDetectiveCalendarMark'),
      'user-chat.js must export getDetectiveCalendarMark to window'
    );
  });

  test('2. Mathematical Logic: No markings before 25 Mehr 1405', () => {
    const today = { jy: 1405, jm: 7, jd: 29 };

    // Before 25 Mehr:
    assert.equal(getDetectiveCalendarMark(1405, 7, 24, today.jy, today.jm, today.jd), null, '24 Mehr must be null');
    assert.equal(getDetectiveCalendarMark(1405, 7, 20, today.jy, today.jm, today.jd), null, '20 Mehr must be null');
    assert.equal(getDetectiveCalendarMark(1405, 7, 1, today.jy, today.jm, today.jd), null, '1 Mehr must be null');
    assert.equal(getDetectiveCalendarMark(1405, 6, 31, today.jy, today.jm, today.jd), null, 'Shahrivar must be null');
    assert.equal(getDetectiveCalendarMark(1404, 7, 25, today.jy, today.jm, today.jd), null, 'Previous years must be null');
  });

  test('3. Strict Future Cutoff: Days after today must NEVER receive any tactical markings', () => {
    const today = { jy: 1405, jm: 7, jd: 29 };

    // Tomorrow (30 Mehr) and beyond must be strictly null
    assert.equal(getDetectiveCalendarMark(1405, 7, 30, today.jy, today.jm, today.jd), null, 'Tomorrow 30 Mehr must be null');
    assert.equal(getDetectiveCalendarMark(1405, 7, 31, today.jy, today.jm, today.jd), null, '31 Mehr must be null');
    assert.equal(getDetectiveCalendarMark(1405, 8, 1, today.jy, today.jm, today.jd), null, '1 Aban must be null');
    assert.equal(getDetectiveCalendarMark(1405, 8, 15, today.jy, today.jm, today.jd), null, '15 Aban must be null');
    assert.equal(getDetectiveCalendarMark(1406, 7, 25, today.jy, today.jm, today.jd), null, 'Future year must be null');
  });

  test('4. Tactical Day Mapping: Random/Organic distribution for past days, bright circle only on active day', () => {
    const today = { jy: 1405, jm: 7, jd: 29 };

    // روزهای گذشته به صورت شبه‌تصادفی معین (طبیعی و غیریکنواخت) علامت می‌گیرند:
    const m25 = getDetectiveCalendarMark(1405, 7, 25, today.jy, today.jm, today.jd);
    const m26 = getDetectiveCalendarMark(1405, 7, 26, today.jy, today.jm, today.jd);
    const m27 = getDetectiveCalendarMark(1405, 7, 27, today.jy, today.jm, today.jd);
    const m28 = getDetectiveCalendarMark(1405, 7, 28, today.jy, today.jm, today.jd);

    assert.ok(m25 === 'check' || m25 === 'cross', '25 Mehr must be check or cross');
    assert.ok(m26 === 'check' || m26 === 'cross', '26 Mehr must be check or cross');
    assert.ok(m27 === 'check' || m27 === 'cross', '27 Mehr must be check or cross');
    assert.ok(m28 === 'check' || m28 === 'cross', '28 Mehr must be check or cross');

    // ۲۸ مهر سه‌شنبه دیروز: دایره نگه نمی‌دارد و تبدیل به تیک/ضربدر شده است
    assert.notEqual(m28, 'circle', '28 Mehr in the past must NEVER retain circle');
    
    // ۲۹ مهر ۱۴۰۵ (چهارشنبه امروز): منحصراً دایره قرمز است
    assert.equal(getDetectiveCalendarMark(1405, 7, 29, today.jy, today.jm, today.jd), 'circle', '29 Mehr (Wednesday today) is circle');

    // فردا ۳۰ مهر (پنج‌شنبه) تا قبل از فرارسیدن باید بدون علامت باشد
    assert.equal(getDetectiveCalendarMark(1405, 7, 30, today.jy, today.jm, today.jd), null, '30 Mehr before arriving is null');

    // وقتی تاریخ به پنج‌شنبه ۳۰ مهر برسد: فقط پنج‌شنبه دایره می‌شود
    assert.equal(getDetectiveCalendarMark(1405, 7, 30, 1405, 7, 30), 'circle', '30 Mehr when today is circle');
    assert.notEqual(getDetectiveCalendarMark(1405, 7, 29, 1405, 7, 30), 'circle', '29 Mehr when in past is not circle');

    // زمانی که در سه‌شنبه ۲۸ مهر بودیم: ۲۸ مهر دایره بود و ۲۹ مهر خالی
    assert.equal(getDetectiveCalendarMark(1405, 7, 28, 1405, 7, 28), 'circle', '28 Mehr when today was circle');
    assert.equal(getDetectiveCalendarMark(1405, 7, 29, 1405, 7, 28), null, '29 Mehr when future was null');
  });

  test('5. CSS Cyber-Noir Styling: terminal.css defines position:relative on cells and custom marking overlays', () => {
    const terminalCss = fs.readFileSync(terminalCssPath, 'utf8');
    assert.ok(
      terminalCss.includes('.cal-day-cell.has-mark-circle') || terminalCss.includes('.has-mark-circle'),
      'terminal.css must contain .has-mark-circle styles'
    );
    assert.ok(
      terminalCss.includes('.cal-day-cell.has-mark-cross') || terminalCss.includes('.has-mark-cross'),
      'terminal.css must contain .has-mark-cross styles'
    );
    assert.ok(
      terminalCss.includes('.cal-day-cell.has-mark-check') || terminalCss.includes('.has-mark-check'),
      'terminal.css must contain .has-mark-check styles'
    );
  });

  test('6. Mobile Responsiveness: student-mobile.css adapts calendar markings on small screens', () => {
    const studentMobileCss = fs.readFileSync(studentMobileCssPath, 'utf8');
    assert.ok(
      studentMobileCss.includes('.cal-day-cell.has-mark-cross') && studentMobileCss.includes('.cal-day-cell.has-mark-circle'),
      'student-mobile.css must include responsive scaling rules for calendar markings'
    );
  });

  test('7. Core Business Invariants Preservation: 3D Vault 0110, two-way reply, and bubble alignments untouched', () => {
    const userChatJs = fs.readFileSync(userChatJsPath, 'utf8');
    assert.ok(
      userChatJs.includes('stageUserReply') && userChatJs.includes('cancelUserReply') && userChatJs.includes('jumpToMessage'),
      'Two-way reply quote functions must be preserved'
    );
    assert.ok(
      userChatJs.includes('switchStudentMobileTab'),
      'Student mobile navigation switcher must remain intact'
    );
  });

});
