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
 * ثبت سفارش جدید در فروشگاه گلها و ساخت اتوماتیک Session و کد ۶ رقمی بسته
 */
router.post('/order', async (req, res) => {
  try {
    const { customerName, phone, address, items, notes } = req.body;

    if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'نام خریدار و اقلام سفارش الزامی است.',
      });
    }

    const sessionName = `سفارش گل - ${customerName.trim()}`;

    // ساخت یک جلسه جدید به صورت اتوماتیک با کد ۶ رقمی
    const newSession = await Session.create({
      name: sessionName,
      codeLength: 6,
    });

    // ثبت لاگ سفارش در سیستم
    const orderDetails = JSON.stringify({
      customerName,
      phone,
      address,
      itemsCount: items.length,
      notes: notes || '',
    });

    await SessionLog.log(newSession.id, 'store_order_created', `سفارش گل توسط ${customerName} ثبت شد. مشخصات: ${orderDetails}`);

    // پیام سیستم اولیه در جلسه
    await Message.create({
      session_id: newSession.id,
      sender_type: 'system',
      content: `📦 سفارش گل جدید ثبت شد.\nخریدار: ${customerName}\nتلفن: ${phone || 'ثبت نشده'}\nآدرس: ${address || 'تحویل حضوری'}\nکد محرمانه بسته: ${newSession.code}`,
      message_type: 'text',
    });

    // اطلاع‌رسانی همزمان (Realtime) به تمامی ادمین‌ها
    const io = req.app.get('io');
    if (io) {
      io.emit('new_store_order', {
        session: newSession,
        customerName,
        phone,
        address,
        createdAt: newSession.created_at,
      });
      io.emit('new_session_created', newSession);
    }

    return res.status(201).json({
      success: true,
      message: 'سفارش شما با موفقیت ثبت شد و بسته در حال آماده‌سازی است.',
      data: {
        orderId: newSession.id,
        packageCode: newSession.code, // کد ۶ رقمی محرمانه روی بسته
        customerName,
        createdAt: newSession.created_at,
        estimatedDeliveryMinutes: 5, // شمارش معکوس ۵ دقیقه‌ای برای تحویل بسته
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
