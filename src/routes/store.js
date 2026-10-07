/**
 * src/routes/store.js
 * مسیرهای API اختصاصی فروشگاه گل‌ها و ثبت سفارش جهت ساخت جلسه چت
 */

const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const SessionLog = require('../models/SessionLog');
const Teacher = require('../models/Teacher');

// محصولات جعلی فروشگاه گلها
const PRODUCTS = [
  { id: 1, name: 'دسته‌گل رز سرخ', price: 180000, image: '/golha/assets/images/rose.png', description: 'رزهای سرخ با برگ‌های سبز و بسته‌بندی دست‌ساز' },
  { id: 2, name: 'ارکیده بنفش', price: 650000, image: '/golha/assets/images/orchid.png', description: 'دو شاخه ارکیده در گلدان سرامیکی روشن' },
  { id: 3, name: 'سانسوریا بافته‌شده', price: 340000, image: '/golha/assets/images/sansevieria.png', description: 'برگ‌های کشیده در گلدان زغالی مات' },
  { id: 4, name: 'باکس گل «شب‌بو»', price: 890000, image: '/golha/assets/images/box.png', description: 'رز، آلسترومریا و داوودی در باکس گرد' },
  { id: 5, name: 'بنسای جنسینگ', price: 520000, image: '/golha/assets/images/bonsai.png', description: 'درختچه‌ای کوچک در گلدان دست‌ساز' },
  { id: 6, name: 'دسته‌گل سفید', price: 420000, image: '/golha/assets/images/lily.png', description: 'ترکیب لیلیوم و مریم با روبان کتان' },
];

/**
 * GET /api/store/products
 * دریافت کاتالوگ محصولات فروشگاه گلها
 */
router.get('/products', (req, res) => {
  return res.json({
    success: true,
    data: PRODUCTS,
  });
});

/**
 * POST /api/store/validate-discount
 * بررسی اعتبار کد تخفیف جهت صفر کردن سبد خرید (تخفیف ۱۰۰٪)
 */
router.post('/validate-discount', async (req, res) => {
  try {
    const { discountCode } = req.body;
    if (!discountCode) {
      return res.status(400).json({ success: false, message: 'کد تخفیف را وارد کنید.' });
    }
    const session = await Session.findByOrderCode(String(discountCode).trim());
    if (!session) {
      return res.status(404).json({ success: false, message: 'کد تخفیف نامعتبر یا اشتباه است.' });
    }
    return res.json({
      success: true,
      message: 'کد تخفیف ۱۰۰ درصدی با موفقیت اعمال شد.',
      data: {
        discountPercent: 100,
        sessionName: session.name,
        valid: true,
      },
    });
  } catch (error) {
    console.error('Error validating discount:', error);
    return res.status(500).json({ success: false, message: 'خطا در بررسی کد تخفیف' });
  }
});

/**
 * POST /api/store/order
 * ثبت سفارش در فروشگاه گلها با کد تخفیف (order_code) جهت یافتن جلسه از قبل ساخته شده
 */
router.post('/order', async (req, res) => {
  try {
    const { customerName, phone, address, items, notes, discountCode } = req.body;

    if (!customerName || !discountCode) {
      return res.status(400).json({
        success: false,
        message: 'نام خریدار و کد تخفیف الزامی است.',
      });
    }

    // یافتن جلسه موجود بر اساس order_code (کد تخفیف)
    const existingSession = await Session.findByOrderCode(discountCode.trim());

    if (!existingSession) {
      return res.status(400).json({
        success: false,
        message: 'کد تخفیف نامعتبر است.',
      });
    }

    // بررسی قفل سفارش تکراری در صورت وجود تایمر فعال برای همین کد سفارش
    const claimed = await Session.claimOrder(existingSession.id);
    if (!claimed) {
      return res.status(400).json({
        success: false,
        message: 'سفارش این کد قبلاً ثبت شده است و پیک در راه است.',
      });
    }

    // ثبت لاگ سفارش در همان جلسه
    const orderDetails = JSON.stringify({
      customerName,
      phone,
      address,
      notes: notes || '',
    });

    await SessionLog.log(existingSession.id, 'store_order_created', `سفارش گل توسط ${customerName} ثبت شد. مشخصات: ${orderDetails}`);

    // ثبت شماره مدرس و اتصال مستقیم به جلسه
    if (phone) {
      const cleanPhone = String(phone).trim().replace(/[^0-9]/g, '');
      await Teacher.registerOrUpdate({
        phone: cleanPhone,
        full_name: customerName,
        session_id: existingSession.id,
      });
      await Session.bindTeacherPhone(existingSession.id, cleanPhone);
    }

    // اطلاع‌رسانی همزمان (Realtime) به ادمین‌ها با شمارش معکوس زنده
    const io = req.app.get('io');
    if (io) {
      io.to('admins').emit('new_store_order', {
        sessionId: existingSession.id,
        session: existingSession,
        customerName,
        phone,
        address,
        createdAt: existingSession.created_at,
        secondsLeft: 30,
      });

      // اجرای لایو تایمر معکوس ۳۰ ثانیه‌ای برای داشبورد ادمین
      let countdown = 30;
      const timerInterval = setInterval(() => {
        countdown--;
        io.to('admins').emit('order_countdown_tick', {
          sessionId: existingSession.id,
          secondsLeft: countdown,
          sessionName: existingSession.name,
          customerName,
        });

        if (countdown <= 0) {
          clearInterval(timerInterval);
        }
      }, 1000);
      if (typeof timerInterval.unref === 'function') timerInterval.unref();
    }

    return res.status(200).json({
      success: true,
      message: 'سفارش شما با موفقیت ثبت شد و پیک در راه است.',
      data: {
        orderId: existingSession.id,
        customerName,
        countdownStartedAt: Date.now(),
      },
    });
  } catch (error) {
    console.error('Error processing store order:', error);
    return res.status(500).json({
      success: false,
      message: 'خطای سرور هنگام ثبت سفارش گل',
    });
  }
});

module.exports = router;
