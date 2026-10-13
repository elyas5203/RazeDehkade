/**
 * scripts/clear-chats.js
 * اسکریپت امن و اختصاصی پاکسازی تاریخچه گفتگو و تخته مدارک
 * بدون حذف فایل‌های آپلودی، سناریو، پیام‌های آماده یا پرونده دستیاران
 *
 * راهنمای استفاده:
 *   node scripts/clear-chats.js --all
 *   node scripts/clear-chats.js --session 3
 */

const { query, pool, isMemoryDb } = require('../src/db/pool');

async function runClearChats() {
  const args = process.argv.slice(2);
  let clearAll = false;
  let targetSessionId = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--all') {
      clearAll = true;
    } else if (args[i] === '--session' && args[i + 1]) {
      targetSessionId = parseInt(args[i + 1], 10);
      i++;
    }
  }

  if (!clearAll && !targetSessionId) {
    // در صورت اجرا بدون پارامتر، به طور پیش‌فرض کل پیام‌های چت را پاک می‌کند
    clearAll = true;
  }

  console.log('==================================================');
  console.log('🧹 شروع پاکسازی امن تاریخچه گفتگو و تخته مدارک...');
  console.log('🔒 توجه: هیچ فایل ویدیویی، صوتی یا عکس پرونده‌ای حذف نخواهد شد.');
  console.log('==================================================');

  try {
    if (targetSessionId) {
      console.log(`📌 پاکسازی پیام‌های جلسه شماره ${targetSessionId}...`);
      const resMsg = await query('DELETE FROM messages WHERE session_id = ?', [targetSessionId]);
      const resLog = await query("DELETE FROM session_logs WHERE session_id = ? AND event_type IN ('message_sent', 'chat_cleared')", [targetSessionId]);
      console.log(`✅ ${resMsg.affectedRows || 0} پیام از جلسه ${targetSessionId} حذف شد.`);
      console.log(`✅ ${resLog.affectedRows || 0} لاگ چت جلسه پاک شد.`);
    } else if (clearAll) {
      console.log('📌 پاکسازی تمامی پیام‌های چت در همه جلسه‌ها...');
      const resMsg = await query('DELETE FROM messages');
      const resLog = await query("DELETE FROM session_logs WHERE event_type IN ('message_sent', 'chat_cleared')");
      console.log(`✅ مجموعاً ${resMsg.affectedRows || 0} پیام چت در سراسر سیستم حذف شد.`);
      console.log(`✅ مجموعاً ${resLog.affectedRows || 0} لاگ چت پاک شد.`);
    }

    console.log('\n🎉 تاریخچه چت و تخته مدارک با موفقیت پاکسازی شد.');
    console.log('🛡️ فایل‌های آپلودی و عکس‌های پرونده دستیاران کاملاً سالم و دست‌نخورده باقی ماندند.');
  } catch (err) {
    console.error('❌ خطا در پاکسازی پیام‌ها:', err.message);
  } finally {
    if (!isMemoryDb && pool && typeof pool.end === 'function') {
      await pool.end();
    }
    process.exit(0);
  }
}

runClearChats();
