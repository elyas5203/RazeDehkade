/**
 * scripts/export-codes.js
 * استخراج و چاپ فرمت‌شده کدهای ورود و تخفیف تمام جلسات دیتابیس
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query, pool, isMemoryDb } = require('../src/db/pool');

function toPersianDigits(num) {
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/[0-9]/g, w => farsiDigits[+w]);
}

async function exportCodes() {
  try {
    const res = await query(`
      SELECT id, name, order_code, code, chat_code, status, active_case 
      FROM sessions 
      ORDER BY id ASC
    `);

    const sessions = res.rows || [];

    if (sessions.length === 0) {
      console.log('⚠️ هیچ جلسه‌ای در دیتابیس یافت نشد.');
      return;
    }

    const lines = [];

    sessions.forEach((s, idx) => {
      const num = toPersianDigits(idx + 1);
      const name = s.name || `جلسه ${s.id}`;
      const orderCode = s.order_code || '---';
      const chatCode = s.chat_code || s.code || '---';

      lines.push(`${num}. جلسه: ${name}`);
      lines.push(`کد تخفیف (سفارش گل): ${orderCode}`);
      lines.push(`کد روی بسته (ورود به چت): ${chatCode}`);
      if (idx < sessions.length - 1) {
        lines.push('─────────────────────────────');
      }
    });

    const outputText = lines.join('\n');

    console.log('\n' + outputText + '\n');
    console.log(`📊 مجموع: ${sessions.length} جلسه با موفقیت استخراج شد.`);

    // همچنین در یک فایل متنی ذخیره می‌شود تا همیشه در سرور در دسترس باشد
    const outFilePath = path.join(__dirname, '../session-codes.txt');
    fs.writeFileSync(outFilePath, outputText, 'utf8');
    console.log(`💾 فایل متنی نیز در مسیر مقابل ذخیره شد: session-codes.txt\n`);

  } catch (err) {
    console.error('❌ خطا در استخراج کدهای جلسات:', err);
  } finally {
    if (!isMemoryDb && pool && typeof pool.end === 'function') {
      await pool.end();
    }
  }
}

exportCodes();
