/**
 * scripts/import-assistants.js
 * اسکریپت خط فرمان برای ایمپورت خودکار فایل فشرده (ZIP/RAR) یا پوشه عکس‌های دستیاران کارآگاه به ۲۴ کلاس
 *
 * نحوه اجرا:
 *   npm run import-assistants -- "/path/to/archive.zip"
 *   npm run import-assistants -- "/path/to/extracted_folder"
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db/pool');
const { runMigrations } = require('../src/db/migrate');
const SessionAssistant = require('../src/models/SessionAssistant');

async function run() {
  const targetPath = process.argv[2];
  if (!targetPath) {
    console.error('❌ لطفاً مسیر فایل فشرده (.zip/.rar) یا پوشه عکس‌ها را وارد کنید:');
    console.error('   مثال: npm run import-assistants -- "./assistants.zip"');
    process.exit(1);
  }

  const resolvedPath = path.resolve(targetPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ مسیر یافت نشد: ${resolvedPath}`);
    process.exit(1);
  }

  await runMigrations();
  const stat = fs.statSync(resolvedPath);

  console.log(`⏳ در حال پردازش و تطبیق خودکار عکس‌های دستیاران از مسیر:\n   ${resolvedPath}`);

  let summary;
  if (stat.isDirectory()) {
    summary = await SessionAssistant.importExtractedDirectory({
      extractedDir: resolvedPath,
      originalArchiveName: path.basename(resolvedPath),
    });
  } else {
    summary = await SessionAssistant.importArchiveToSessions({
      archivePath: resolvedPath,
      originalArchiveName: path.basename(resolvedPath),
    });
  }

  console.log('\n🎉 عملیات با موفقیت به پایان رسید:');
  console.log(`📸 کل فایل‌های تصویری یافت‌شده: ${summary.totalFilesFound}`);
  console.log(`✅ عکس‌های جدید ثبت‌شده: ${summary.importedCount}`);
  console.log(`🔄 عکس‌های بروزرسانی‌شده: ${summary.updatedCount}`);
  console.log(`⏭ فرمت‌های تکراری ردشده (PNG/WEBP هم‌نام): ${summary.skippedDuplicatesCount}`);

  const perSessionList = Object.values(summary.perSession || {});
  if (perSessionList.length > 0) {
    console.log('\n🏫 تفکیک کلاس‌ها:');
    perSessionList.forEach((s) => {
      console.log(`  • ${s.session_name}: +${s.added} جدید | ${s.updated} ویرایش`);
    });
  }

  if (summary.unmatchedFolders && summary.unmatchedFolders.length > 0) {
    console.warn('\n⚠️ پوشه‌های بدون تطبیق:', summary.unmatchedFolders.join(' ، '));
  }

  await pool.end();
}

run().catch(async (err) => {
  console.error('❌ خطا در ایمپورت عکس‌های دستیاران:', err.message);
  try {
    await pool.end();
  } catch (_) {}
  process.exit(1);
});
