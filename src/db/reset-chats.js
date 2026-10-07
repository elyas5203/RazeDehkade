/**
 * src/db/reset-chats.js
 * اسکریپت پاکسازی کامل پیام‌های چت تستی و پیام‌ها/ویدیوهای آماده
 * اطلاعات جلسات (نام‌ها و کدها) و اکانت ادمین دست‌نخورده باقی می‌مانند.
 */

const fs = require('fs');
const path = require('path');
const { query, pool, isMemoryDb } = require('./pool');

async function resetTestData() {
  console.log('🧹 شروع پاکسازی پیام‌های چت و محتوای آماده...');

  try {
    // ۱. پاکسازی پیام‌های چت
    const msgRes = await query('DELETE FROM messages');
    console.log(`✅ پیام‌های چت پاک شدند (${msgRes.affectedRows || 0} پیام).`);

    // ۲. پاکسازی لاگ‌های جلسات
    const logRes = await query('DELETE FROM session_logs');
    console.log(`✅ لاگ‌های رویداد جلسات پاک شدند (${logRes.affectedRows || 0} لاگ).`);

    // ۳. پاکسازی پیام‌های آماده قدیمی
    const cannedRes = await query('DELETE FROM canned_responses');
    console.log(`✅ پیام‌های آماده قدیمی پاک شدند (${cannedRes.affectedRows || 0} مورد).`);

    // ۴. پاکسازی مراحل ۵ هفته سناریو (پیام‌ها، تصاویر و ویدیوهای آماده)
    const weeklyRes = await query('DELETE FROM weekly_content');
    console.log(`✅ پیام‌ها و ویدیوهای آماده سناریو پاک شدند (${weeklyRes.affectedRows || 0} مرحله).`);

    // ۵. پاکسازی فایل‌های صوتی و آپلودهای تستی در پوشه uploads (اختیاری)
    const uploadsDir = path.join(__dirname, '../../public/uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      let deletedFiles = 0;
      for (const file of files) {
        if (file !== '.gitkeep') {
          fs.unlinkSync(path.join(uploadsDir, file));
          deletedFiles++;
        }
      }
      console.log(`✅ فایل‌های آپلودی و ویس‌های تستی حذف شدند (${deletedFiles} فایل).`);
    }

    console.log('\n🎉 عملیات با موفقیت انجام شد! دیتابیس چت‌ها و محتوای آماده کاملاً تمیز و آماده استفاده واقعی است.');
  } catch (err) {
    console.error('❌ خطا در پاکسازی:', err);
  } finally {
    if (!isMemoryDb && pool && typeof pool.end === 'function') {
      await pool.end();
    }
    process.exit(0);
  }
}

resetTestData();
