'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Admin UX, Clear Buttons Purge, Dashboard Live Status, and 5-Minute Blackout Tests', () => {

  test('1. Admin composer: Enter inserts newline without sending, and explicit Send button is present', () => {
    const adminChatJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/admin-chat.js'), 'utf8');
    const adminChatHtml = fs.readFileSync(path.join(__dirname, '../public/admin/chat.html'), 'utf8');

    // تابع handleAdminComposerKeydown نباید sendAdminMessage را صدا بزند
    assert.ok(adminChatJs.includes('handleAdminComposerKeydown'), 'تابع handleAdminComposerKeydown باید تعریف شده باشد');
    assert.ok(!adminChatJs.includes("if (!e.shiftKey) {\n      e.preventDefault();\n      if (e.isComposing || e.keyCode === 229) {\n        return;\n      }\n      sendAdminMessage();"), 'اینتر نباید پیام را ارسال کند');

    // دکمه صریح ارسال پیام باید موجود باشد
    assert.ok(adminChatHtml.includes('sendAdminMessage()'), 'دکمه ارسال پیام با کلیک مستقیم باید در HTML موجود باشد');
    assert.ok(adminChatHtml.includes('ارسال پیام'), 'متن دکمه ارسال پیام باید در کامپوزر وجود داشته باشد');
    assert.ok(adminChatHtml.includes('ارسال با دکمه ارسال پیام'), 'پلیس‌هولدر باید راهنمایی کند که ارسال با دکمه است');
  });

  test('2. Total removal of clear chat buttons from Admin UI', () => {
    const adminChatHtml = fs.readFileSync(path.join(__dirname, '../public/admin/chat.html'), 'utf8');

    // هیچ دکمه پاکسازی نباید در UI وجود داشته باشد
    assert.ok(!adminChatHtml.includes('admin-clear-chat-btn'), 'دکمه پاکسازی هدر دسکتاپ باید حذف شده باشد');
    assert.ok(!adminChatHtml.includes('mobile-clear-btn'), 'دکمه پاکسازی هدر موبایل باید حذف شده باشد');
    assert.ok(!adminChatHtml.includes('confirmClearCurrentChat'), 'هیچ فراخوانی confirmClearCurrentChat نباید در HTML باشد');
    assert.ok(!adminChatHtml.includes('confirmClearAllChats'), 'هیچ فراخوانی confirmClearAllChats نباید در HTML باشد');
  });

  test('3. Privacy & dossier modal cleanup: No teacher/class names, footer hint removed', () => {
    const chatHtml = fs.readFileSync(path.join(__dirname, '../public/chat.html'), 'utf8');
    const userChatJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/user-chat.js'), 'utf8');

    // متن راهنمای پاورقی حذف شده است
    assert.ok(!chatHtml.includes('💡 با کلیک روی هر کارت، تصویر بزرگ‌تر و گزینه دریافت تصویر کارآگاهی نمایش داده می‌شود'), 'متن راهنمای پاورقی باید حذف شده باشد');
    assert.ok(!chatHtml.includes('بازگشت به لیست کلاس'), 'دکمه بازگشت به لیست کلاس باید به بازگشت به گالری دستیاران تغییر یافته باشد');
    assert.ok(chatHtml.includes('بازگشت به گالری دستیاران'), 'دکمه بازگشت به گالری دستیاران باید موجود باشد');

    // نام معلمان نباید در پرونده کارآگاهی کاربر نمایش داده شود
    assert.ok(!userChatJs.includes('eyebrowEl.textContent = `پرونده ویژه کارآگاهی // کلاس ${payload.sessionName}`'), 'نام معلم نباید در ابروی مودال درج شود');
    assert.ok(userChatJs.includes('پرونده ویژه کارآگاهی // پایگاه تحقیقاتی کارآگاهان'), 'عنوان خنثی و بدون نام معلم باید درج شود');
  });

  test('4. Dashboard cards: Compact UI/UX, clean class naming, total removal of Phase 6, and teacher name in notifications', () => {
    const dashboardJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/admin-dashboard.js'), 'utf8');
    const dashboardCss = fs.readFileSync(path.join(__dirname, '../public/assets/css/admin-dashboard.css'), 'utf8');
    const socketIndexJs = fs.readFileSync(path.join(__dirname, '../src/socket/index.js'), 'utf8');

    // توابع تبدیل عنوان کلاس و استایل‌های زنده
    assert.ok(dashboardJs.includes('getCleanClassTitle'), 'تابع getCleanClassTitle برای نام‌گذاری کلاس فلان باید وجود داشته باشد');
    assert.ok(dashboardJs.includes('updateCardLivePhase'), 'تابع updateCardLivePhase برای رهگیری زنده وضعیت کلاس باید وجود داشته باشد');
    assert.ok(dashboardJs.includes('live-phase-strip'), 'المان نوار وضعیت زنده کلاس باید در کارت‌ها رندر شود');

    // حذف قطعی و کامل مرحله ۶ طبق درخواست کاربر
    assert.ok(!dashboardJs.includes('مرحله ۶'), 'متن مرحله ۶ باید به طور کامل از داشبورد ادمین حذف شده باشد');
    assert.ok(!socketIndexJs.includes("phase: 'chat_active'"), 'سوکت نباید فاز chat_active ایجاد کند');
    assert.ok(dashboardJs.includes("style=\"${isLiveActive ? '' : 'display:none;'}\""), 'نوار وضعیت برای کلاس‌های غیرفعال باید کاملاً مخفی بماند');

    // نمایش نام مدرس در اعلان سفارش گل
    assert.ok(dashboardJs.includes('data.sessionName || loadedSessionsMap'), 'اعلان سفارش تازه باید نام مدرسا و کلاس را نمایش دهد');

    // استایل‌های فشرده‌سازی و بنر وضعیت زنده
    assert.ok(dashboardCss.includes('.live-phase-strip'), 'استایل نوار وضعیت زنده کلاس باید تعریف شده باشد');
    assert.ok(dashboardCss.includes('.phase-countdown'), 'استایل فاز شمارش معکوس باید تعریف شده باشد');
    assert.ok(dashboardCss.includes('.phase-blackout-2'), 'استایل فاز دایره سبز بلک‌اوت باید تعریف شده باشد');
  });

  test('5. 30s Courier Countdown, 5-Minute Blackout (1m dark + 4m green dot), and Shock Transition', () => {
    const deliveryJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/delivery.js'), 'utf8');
    const deliveryCss = fs.readFileSync(path.join(__dirname, '../public/assets/css/delivery.css'), 'utf8');
    const storeJs = fs.readFileSync(path.join(__dirname, '../src/routes/store.js'), 'utf8');

    // مدت‌زمان‌ها طبق نیازمندی دقیق کاربر
    assert.ok(deliveryJs.includes('TOTAL_DURATION_MS = isTest ? 10000 : 30000'), 'شمارش معکوس تحویل سمت کاربر باید ۳۰ ثانیه باشد');
    assert.ok(storeJs.includes('courierSeconds = isTestOrder ? 10 : 30'), 'شمارش معکوس سمت سرور باید ۳۰ ثانیه باشد');
    assert.ok(deliveryJs.includes('DEFAULT_BLACKOUT_MS = 5 * 60 * 1000'), 'بلک‌اوت کامل باید ۵ دقیقه (۳۰۰ ثانیه) باشد');
    assert.ok(deliveryJs.includes('BLACKOUT_PHASE1_MS = isTest ? 5000 : 60 * 1000'), 'فاز اول تاریکی باید ۱ دقیقه (۶۰ ثانیه) باشد');

    // دایره سبز تپنده تاکتیکال به مدت ۴ دقیقه و حذف قطعی آن به محض شروع اسکن سایبری
    assert.ok(deliveryJs.includes('blackoutPulsingRadarDot'), 'المان دایره سبز تپنده باید در بلک‌اوت پیاده‌سازی شده باشد');
    assert.ok(deliveryJs.includes('removeGreenBeacon'), 'تابع removeGreenBeacon برای حذف کامل نقطه سبز باید پیاده‌سازی شده باشد');
    assert.ok(deliveryCss.includes('.blackout-radar-beacon'), 'استایل بیکن دایره سبز تپنده باید در delivery.css باشد');
    assert.ok(deliveryCss.includes('body.is-blackout .blackout-radar-beacon.active'), 'دایره سبز فقط باید در زمان فعال بودن بلک‌اوت نمایش داده شود');
    assert.ok(deliveryCss.includes('body:not(.is-blackout) .blackout-radar-beacon'), 'دایره سبز باید به محض اتمام بلک‌اوت و شروع اسکن سایبری مخفی/حذف شود');
    assert.ok(deliveryCss.includes('tacticalDotBreathe'), 'انیمیشن تنفس نئونی دایره سبز باید تعریف شده باشد');

    // ترنزیشن شوک ناگهانی، صداها و ضربه ساب‌بیس براام سینمایی
    assert.ok(deliveryJs.includes('triggerShockTransition'), 'تابع شوک ناگهانی باید پیاده‌سازی شده باشد');
    assert.ok(deliveryCss.includes('.cyber-shock-flash'), 'استایل فلش شوک ناگهانی باید در delivery.css باشد');
    assert.ok(deliveryCss.includes('shock-screen-shake'), 'انیمیشن لرزش شوک ناگهانی باید در delivery.css باشد');
    assert.ok(deliveryJs.includes('tactical-alarm.wav'), 'فایل صوتی ضربه براام سینمایی باید در ترنزیشن فراخوانی شود');
    assert.ok(fs.existsSync(path.join(__dirname, '../public/assets/sounds/tactical-alarm.wav')), 'فایل صوتی tactical-alarm.wav باید روی دیسک موجود باشد');
    assert.ok(fs.statSync(path.join(__dirname, '../public/assets/sounds/tactical-alarm.wav')).size > 500000, 'فایل صوتی باید حجم استودیویی معتبر داشته باشد');
    assert.ok(fs.existsSync(path.join(__dirname, '../public/assets/sounds/cyber-intro.wav')), 'فایل صوتی cyber-intro.wav باید روی دیسک موجود باشد');
    assert.ok(fs.statSync(path.join(__dirname, '../public/assets/sounds/cyber-intro.wav')).size > 1000000, 'فایل موسیقی سایبری باید حجم استودیویی معتبر داشته باشد');
  });

  test('6. Audio Autoplay Unlocker script exists and is linked on all entry pages', () => {
    assert.ok(fs.existsSync(path.join(__dirname, '../public/assets/js/audio-unlock.js')), 'فایل audio-unlock.js باید موجود باشد');
    const indexHtml = fs.readFileSync(path.join(__dirname, '../public/golha/index.html'), 'utf8');
    const checkoutHtml = fs.readFileSync(path.join(__dirname, '../public/golha/checkout.html'), 'utf8');
    const orderStatusHtml = fs.readFileSync(path.join(__dirname, '../public/golha/order-status.html'), 'utf8');

    assert.ok(indexHtml.includes('audio-unlock.js'), 'صفحه index.html گل‌ها باید اسکریپت audio-unlock.js را داشته باشد');
    assert.ok(checkoutHtml.includes('audio-unlock.js'), 'صفحه checkout.html باید اسکریپت audio-unlock.js را داشته باشد');
    assert.ok(orderStatusHtml.includes('audio-unlock.js'), 'صفحه order-status.html باید اسکریپت audio-unlock.js را داشته باشد');
  });

});
