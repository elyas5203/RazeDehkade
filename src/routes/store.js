/**
 * src/routes/store.js
 * مسیرهای API اختصاصی فروشگاه گل‌ها و ثبت سفارش جهت ساخت جلسه چت
 */

const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Message = require('../models/Message');
const SessionLog = require('../models/SessionLog');

// محصولات جعلی فروشگاه گلها
const PRODUCTS = [
  { id: 1, name: 'رز سرخ هلندی (شاخه بریده)', price: 180000, image: '/golha/assets/images/rose.jpg', description: 'نماد عشق، اسرارآمیز و با ماندگاری بالا' },
  { id: 2, name: 'ارکیده بنفش در گلدان سرامیکی', price: 650000, image: '/golha/assets/images/orchid.jpg', description: 'گل نایاب و لوکس مناسب هدیه خاص' },
  { id: 3, name: 'گیاه سانسوریا بافته‌شده', price: 340000, image: '/golha/assets/images/sansevieria.jpg', description: 'تصفیه‌کننده قوی هوا و بسیار مقاوم' },
  { id: 4, name: 'باکس گل ترکیبی «رمز شب»', price: 890000, image: '/golha/assets/images/box.jpg', description: 'ترکیب گل‌های تیره، آلسترومریا و داوودی' },
  { id: 5, name: 'گلدان مینیاتوری بنسای جنسنگ', price: 520000, image: '/golha/assets/images/bonsai.jpg', description: 'مینیاتوری، خاص و نیازمند مراقبت هوشمندانه' },
  { id: 6, name: 'دسته گل مریم و زنبق سفید', price: 420000, image: '/golha/assets/images/lily.jpg', description: 'عطر بی‌نظیر مریم با ترکیب زنبق وحشی' },
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

    // ثبت لاگ سفارش در همان جلسه
    const orderDetails = JSON.stringify({
      customerName,
      phone,
      address,
      notes: notes || '',
    });

    await SessionLog.log(existingSession.id, 'store_order_created', `سفارش گل توسط ${customerName} ثبت شد. مشخصات: ${orderDetails}`);

    // پیام سیستم اولیه در همان جلسه
    await Message.create({
      session_id: existingSession.id,
      sender_type: 'system',
      content: `📦 سفارش گل جدید ثبت شد.\nخریدار: ${customerName}\nکد تخفیف: ${discountCode}\nکد ورود چت روی بسته: ${existingSession.chat_code || existingSession.code}`,
      message_type: 'text',
    });

    // اطلاع‌رسانی همزمان (Realtime) به ادمین‌ها با شمارش معکوس زنده
    const io = req.app.get('io');
    if (io) {
      io.emit('new_store_order', {
        session: existingSession,
        customerName,
        phone,
        address,
        createdAt: existingSession.created_at,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'سفارش شما با موفقیت ثبت شد و پیک در راه است.',
      data: {
        orderId: existingSession.id,
        chatCode: existingSession.chat_code || existingSession.code, // کد ورود به چت روی بسته فیزیکی
        customerName,
        createdAt: existingSession.created_at,
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
