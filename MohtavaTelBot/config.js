/**
 * MohtavaTelBot/config.js
 * تنظیمات بات تلگرامی مدیریت پیام‌های آماده و محتوای ۵ هفته سناریو
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

module.exports = {
  // توکن بات تلگرام
  BOT_TOKEN:
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.BOT_TOKEN ||
    '8018971290:AAG383z9DcC3d34s7UJCX-ezjaCvkYrmVgY',

  // آیدی عددی مجاز ادمین در تلگرام
  AUTHORIZED_ADMIN_ID: Number(process.env.TELEGRAM_ADMIN_ID || 5490508090),

  // مسیر ذخیره‌سازی فایل‌های دانلودشده در پوشه سرور اصلی پروژه
  UPLOAD_DIR: path.resolve(__dirname, '..', 'public', 'uploads', 'weekly'),

  // پیشوند URL قابل دسترس در پنل ادمین و چت کاربران
  PUBLIC_URL_PREFIX: '/uploads/weekly',

  // نام فارسی هفته‌ها
  WEEK_NAMES: {
    1: 'هفته اول',
    2: 'هفته دوم',
    3: 'هفته سوم',
    4: 'هفته چهارم',
    5: 'هفته پنجم',
  },
};
