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

    // اعتبارسنجی دقیق سبد خرید: باید دقیقاً شامل هر ۵ قلم کالای فاکتور رسمی (شناسه‌های ۱ تا ۵) هر کدام دقیقاً ۱ عدد باشد
    const REQUIRED_INVOICE_IDS = [1, 2, 3, 4, 5];
    const itemsList = Array.isArray(items) ? items : [];
    const itemIds = itemsList.map(it => Number(it.id));

    // ۱. بررسی کالاهای غیرموجود در انبار (خارج از ۵ قلم فاکتور)
    const unavailableItems = itemsList.filter(it => !REQUIRED_INVOICE_IDS.includes(Number(it.id)));
    if (unavailableItems.length > 0) {
      const names = unavailableItems.map(it => {
        const found = PRODUCTS.find(p => Number(p.id) === Number(it.id));
        return found ? found.name : (it.name || `کالای #${it.id}`);
      });
      return res.status(400).json({
        success: false,
        message: `عدم موجودی: محصول «${names.join('، ')}» در انبار موجود نیست. لطفاً آن را از سبد خرید کم کنید.`,
        unavailableIds: unavailableItems.map(it => Number(it.id)),
      });
    }

    // ۲. بررسی تعداد بیش از ۱ عدد برای کالاهای موجود
    const excessItems = itemsList.filter(it => Number(it.quantity || it.qty || 1) > 1);
    if (excessItems.length > 0) {
      const names = excessItems.map(it => {
        const found = PRODUCTS.find(p => Number(p.id) === Number(it.id));
        return found ? found.name : (it.name || `کالای #${it.id}`);
      });
      return res.status(400).json({
        success: false,
        message: `عدم موجودی: از محصول «${names.join('، ')}» تنها ۱ عدد در انبار موجود است. لطفاً تعداد اضافی را در سبد خرید کم کنید.`,
        excessIds: excessItems.map(it => Number(it.id)),
      });
    }

    const allRequiredPresent = REQUIRED_INVOICE_IDS.every(id => itemIds.includes(id));
    const noDisallowed = itemIds.every(id => REQUIRED_INVOICE_IDS.includes(id));
    const allQuantitiesOne = itemsList.every(it => Number(it.quantity || it.qty || 1) === 1);
    const exactInvoiceMatch = (itemsList.length === 5) && allRequiredPresent && noDisallowed && allQuantitiesOne;

    if (!exactInvoiceMatch) {
      return res.status(400).json({
        success: false,
        message: 'عدم موجودی: اقلام سبد خرید با فاکتور سفارش مطابقت ندارد (هر ۵ قلم فاکتور باید در سبد باشد).',
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

    // اطلاع‌رسانی همزمان (Realtime) به ادمین‌ها با شمارش معکوس ۳۰ ثانیه‌ای پیک و ۵ دقیقه‌ای بلک‌اوت
    const io = req.app.get('io');
    const isTestOrder = (
      String(discountCode).trim() === '542810' ||
      String(phone || '').replace(/\D/g, '') === '09151234567'
    );
    const courierSeconds = isTestOrder ? 10 : 30; // ۳۰ ثانیه برای کاربر عادی طبق نیازمندی
    const blackoutTotalSeconds = isTestOrder ? 15 : 300; // ۵ دقیقه بلک‌اوت کامل (۱ دقیقه تاریک + ۴ دقیقه رادار سبز)
    const blackoutPhase1Seconds = isTestOrder ? 5 : 60; // ۱ دقیقه اول: تاریکی مطلق
    const totalSecondsToGate = courierSeconds + blackoutTotalSeconds;

    if (io) {
      io.to('admins').emit('new_store_order', {
        sessionId: existingSession.id,
        sessionName: existingSession.name,
        session: existingSession,
        customerName,
        phone,
        address,
        createdAt: existingSession.created_at,
        secondsLeft: courierSeconds,
        totalSecondsToLogin: totalSecondsToGate,
      });

      const isDroneClass = (existingSession.id === 17 || String(existingSession.order_code).trim() === '590019' || String(existingSession.name || '').includes('زارع'));
      const initialPhaseLabel = isDroneClass 
        ? `🛸 ریزپرنده در پرواز // بسته با ریزپرنده ارسال شد (${courierSeconds} ثانیه)`
        : `🛵 پیک در راه است // ${courierSeconds} ثانیه تا تحویل`;

      if (typeof io.updateSessionPhase === 'function') {
        io.updateSessionPhase(existingSession.id, {
          phase: 'countdown',
          secondsLeft: courierSeconds,
          totalSecondsToLogin: totalSecondsToGate,
          sessionName: existingSession.name,
          phaseLabel: initialPhaseLabel,
        });
      }

      // اجرای لایو تایمر معکوس برای داشبورد ادمین تا لحظه ورود به درگاه کد چت
      let currentStage = 'courier'; // 'courier' -> 'blackout_phase1' -> 'blackout_phase2' -> 'cyber_scanning' -> 'portal_login'
      let courierRemaining = courierSeconds;
      let blackoutRemaining = blackoutTotalSeconds;

      const timerInterval = setInterval(() => {
        if (currentStage === 'courier') {
          courierRemaining--;
          const totalLeft = courierRemaining + blackoutTotalSeconds;

          io.to('admins').emit('order_countdown_tick', {
            sessionId: existingSession.id,
            sessionName: existingSession.name,
            secondsLeft: courierRemaining,
            totalSecondsToLogin: totalLeft,
            stage: isDroneClass ? 'drone' : 'courier',
          });

          if (typeof io.updateSessionPhase === 'function') {
            let tickPhaseLabel = `🛵 پیک در راه است // ${courierRemaining} ثانیه تا تحویل`;
            if (isDroneClass) {
              if (courierRemaining > 20) {
                tickPhaseLabel = `🛸 ریزپرنده در پرواز // بسته با ریزپرنده ارسال شد (${courierRemaining} ثانیه)`;
              } else if (courierRemaining > 8) {
                tickPhaseLabel = `🛸 ناوبری هوایی // ریزپرنده در حال حرکت به سمت مقصد (${courierRemaining} ثانیه)`;
              } else {
                tickPhaseLabel = `📦 فرود روی پشت‌بوم // ریزپرنده بسته انداخت روی پشت‌بوم (${courierRemaining} ثانیه)`;
              }
            }

            io.updateSessionPhase(existingSession.id, {
              phase: 'countdown',
              secondsLeft: courierRemaining,
              totalSecondsToLogin: totalLeft,
              sessionName: existingSession.name,
              phaseLabel: tickPhaseLabel,
            });
          }

          if (courierRemaining <= 0) {
            currentStage = 'blackout_phase1';
          }
        } else if (currentStage === 'blackout_phase1' || currentStage === 'blackout_phase2') {
          blackoutRemaining--;
          const isPhase2 = (blackoutTotalSeconds - blackoutRemaining) >= blackoutPhase1Seconds;
          currentStage = isPhase2 ? 'blackout_phase2' : 'blackout_phase1';

          io.to('admins').emit('order_countdown_tick', {
            sessionId: existingSession.id,
            sessionName: existingSession.name,
            secondsLeft: blackoutRemaining,
            totalSecondsToLogin: blackoutRemaining,
            stage: currentStage,
          });

          if (typeof io.updateSessionPhase === 'function') {
            io.updateSessionPhase(existingSession.id, {
              phase: currentStage,
              secondsLeft: blackoutRemaining,
              totalSecondsToLogin: blackoutRemaining,
              sessionName: existingSession.name,
            });
          }

          if (blackoutRemaining <= 0) {
            currentStage = 'cyber_scanning';
            if (typeof io.updateSessionPhase === 'function') {
              io.updateSessionPhase(existingSession.id, {
                phase: 'cyber_scanning',
                secondsLeft: 14,
                totalSecondsToLogin: 14,
                sessionName: existingSession.name,
              });
            }

            // پس از ۱۴ ثانیه اسکن، ورود به درگاه
            setTimeout(() => {
              if (typeof io.updateSessionPhase === 'function') {
                io.updateSessionPhase(existingSession.id, {
                  phase: 'portal_login',
                  secondsLeft: 0,
                  totalSecondsToLogin: 0,
                  sessionName: existingSession.name,
                });
              }

              // پس از ورود کامل، حذف فاز فعال تا کارت کاملاً تمیز بماند
              setTimeout(() => {
                if (typeof io.clearSessionPhase === 'function') {
                  io.clearSessionPhase(existingSession.id);
                } else if (typeof io.updateSessionPhase === 'function') {
                  io.updateSessionPhase(existingSession.id, { phase: 'idle' });
                }
              }, 45000);
            }, 14000);

            clearInterval(timerInterval);
          }
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
        phone: phone ? String(phone).trim().replace(/[^0-9]/g, '') : '',
        discountCode: discountCode.trim(),
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
