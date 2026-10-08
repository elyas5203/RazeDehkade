/**
 * src/routes/store.js
 * مسیرهای API اختصاصی فروشگاه گل‌ها و ثبت سفارش جهت ساخت جلسه چت
 */

const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const SessionLog = require('../models/SessionLog');
const Teacher = require('../models/Teacher');

// محصولات فروشگاه (مبالغ به ریال و ۵ محصول درخواستی پخش‌شده در میان محصولات)
const PRODUCTS = [
  { id: 6, name: 'دسته‌گل رز هلندی سرخ', price: 12000000, image: '/golha/assets/images/red_roses_bouquet.webp', imageUrl: '/golha/assets/images/red_roses_bouquet.webp', description: 'رزهای سرخ ممتاز با تزیین برگ‌های اکالیپتوس و بسته‌بندی لوکس' },
  { id: 1, name: 'بیلچه', price: 1500000, image: '/golha/assets/images/garden_trowel.webp', imageUrl: '/golha/assets/images/garden_trowel.webp', description: 'بیلچه باغبانی دسته‌چوبی مقاوم و سبک مناسب کاشت و تعویض گلدان' },
  { id: 10, name: 'گلدان زامیفولیا بلک', price: 9500000, image: '/golha/assets/images/black_zz_plant.webp', imageUrl: '/golha/assets/images/black_zz_plant.webp', description: 'گیاه فوق‌العاده مقاوم و کم‌توقع با برگ‌های براق و تیره' },
  { id: 2, name: 'سانسوریا پاکوتاه', price: 10500000, image: '/golha/assets/images/dwarf_sansevieria.webp', imageUrl: '/golha/assets/images/dwarf_sansevieria.webp', description: 'گیاه آپارتمانی مقاوم و تصفیه‌کننده هوا در گلدان سرامیکی' },
  { id: 9, name: 'باکس گل لوکس شب‌بو', price: 14000000, image: '/golha/assets/images/luxury_flower_box.webp', imageUrl: '/golha/assets/images/luxury_flower_box.webp', description: 'ترکیب رز، آلسترومریا و داوودی در باکس گرد هدیه' },
  { id: 14, name: 'اسپری آبپاش و غبارپاش شیشه‌ای', price: 2200000, image: '/golha/assets/images/glass_water_spray.webp', imageUrl: '/golha/assets/images/glass_water_spray.webp', description: 'آبپاش مه‌پاش طرح آنتیک با نازل برنجی جهت حفظ رطوبت برگ‌ها' },
  { id: 3, name: 'لیلیوم صورتی', price: 8000000, image: '/golha/assets/images/pink_lily.webp', imageUrl: '/golha/assets/images/pink_lily.webp', description: 'شاخه گل لیلیوم اورینتال با عطر دلنشین و شکوفه‌های درشت' },
  { id: 7, name: 'ارکیده فالانوپسیس بنفش', price: 15500000, image: '/golha/assets/images/purple_orchid.webp', imageUrl: '/golha/assets/images/purple_orchid.webp', description: 'دو شاخه ارکیده با گل‌های مخملی در گلدان سرامیکی روشن' },
  { id: 13, name: 'خاک پرلیت و پیت‌ماس مخصوص (۵ لیتری)', price: 1800000, image: '/golha/assets/images/potting_soil_bag.webp', imageUrl: '/golha/assets/images/potting_soil_bag.webp', description: 'بستر کشت غنی‌شده با زهکشی عالی مناسب انواع گیاهان آپارتمانی' },
  { id: 4, name: 'کاکتوس ساکولنت', price: 7000000, image: '/golha/assets/images/succulent_cactus.webp', imageUrl: '/golha/assets/images/succulent_cactus.webp', description: 'مجموعه ساکولنت شاداب در گلدان سفالی دکوراتیو' },
  { id: 8, name: 'بسای جنسینگ مینیاتوری', price: 18000000, image: '/golha/assets/images/ginseng_bonsai.webp', imageUrl: '/golha/assets/images/ginseng_bonsai.webp', description: 'درختچه بنسای ریشه‌دار مقاوم و شاداب در گلدان دست‌ساز' },
  { id: 15, name: 'اسپری تقویت رشد ریشه', price: 3500000, image: '/golha/assets/images/root_booster_fertilizer.webp', imageUrl: '/golha/assets/images/root_booster_fertilizer.webp', description: 'کود مایع کامل حاوی ریزمغذی‌ها و اسید هیومیک برای رشد برگ و ساقه' },
  { id: 5, name: 'کود تراریم پروتکت', price: 3000000, image: '/golha/assets/images/terrarium_fertilizer.webp', imageUrl: '/golha/assets/images/terrarium_fertilizer.webp', description: 'محلول تخصصی تقویت ریشه و محافظت از رطوبت بستر تراریوم' },
  { id: 11, name: 'دسته‌گل آلسترومریا رنگارنگ', price: 6500000, image: '/golha/assets/images/alstroemeria_bouquet.webp', imageUrl: '/golha/assets/images/alstroemeria_bouquet.webp', description: 'دسته گل شاداب با تنوع رنگی بالا و ماندگاری طولانی' },
  { id: 12, name: 'گلدان فیکوس لیراتا', price: 11000000, image: '/golha/assets/images/ficus_lyrata.webp', imageUrl: '/golha/assets/images/ficus_lyrata.webp', description: 'گیاه برگ ویولنی جذاب و دکوراتیو مناسب فضاهای روشن' },
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
