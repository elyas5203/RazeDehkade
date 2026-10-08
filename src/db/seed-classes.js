/**
 * src/db/seed-classes.js
 * اسکریپت ساخت دسته‌ای ۲۲ گروه کلاس‌های چهارم، پنجم و ششم در دیتابیس
 */

const { query, pool, isMemoryDb } = require('./pool');
const { generateUniqueSessionCode } = require('../utils/codeGenerator');
const { runMigrations } = require('./migrate');

const GROUPS_CONFIG = [
  // پایه پنجم (۱۰ گروه) — پک ۱ (سندروم فراموشی) فعال، ۲ پرونده قفل
  { name: 'یاوری و ناصری', activeCase: 'syndrome', cases: { syndrome: 'active', village: 'locked', court: 'locked' } },
  { name: 'عطاران و رحمتی و سید زاده', activeCase: 'syndrome', cases: { syndrome: 'active', village: 'locked', court: 'locked' } },
  { name: 'نعمتی و مقامی', activeCase: 'syndrome', cases: { syndrome: 'active', village: 'locked', court: 'locked' } },
  { name: 'خرازی', activeCase: 'syndrome', cases: { syndrome: 'active', village: 'locked', court: 'locked' } },
  { name: 'خدادحسینی و خراسانی', activeCase: 'syndrome', cases: { syndrome: 'active', village: 'locked', court: 'locked' } },
  { name: 'محمدی پویا و باقرزاده و یوسف', activeCase: 'syndrome', cases: { syndrome: 'active', village: 'locked', court: 'locked' } },
  { name: 'محمدی پویا و باقرزاده و نوایی', activeCase: 'syndrome', cases: { syndrome: 'active', village: 'locked', court: 'locked' } },
  { name: 'شمسی و ملک', activeCase: 'syndrome', cases: { syndrome: 'active', village: 'locked', court: 'locked' } },
  { name: 'باقری و مسرت', activeCase: 'syndrome', cases: { syndrome: 'active', village: 'locked', court: 'locked' } },
  { name: 'بهمن ابادی و قانع منش و زمانیان', activeCase: 'syndrome', cases: { syndrome: 'active', village: 'locked', court: 'locked' } },

  // پایه چهارم (۳ گروه) — پک ۱ (سندروم فراموشی) فعال، ۲ پرونده قفل
  { name: 'حدادیان و رجب زاده', activeCase: 'syndrome', cases: { syndrome: 'active', village: 'locked', court: 'locked' } },
  { name: 'حسین هاشمی', activeCase: 'syndrome', cases: { syndrome: 'active', village: 'locked', court: 'locked' } },
  { name: 'سید جواد حسینی', activeCase: 'syndrome', cases: { syndrome: 'active', village: 'locked', court: 'locked' } },

  // پایه ششم (۹ گروه) — پک سندروم فراموشی حل‌شده (مهر شده)، راز دهکده فعال، دادگاه قفل
  { name: 'اکبری و واحدی و انتظامی', activeCase: 'village', cases: { syndrome: 'solved', village: 'active', court: 'locked' } },
  { name: 'شمسی و خوشباف', activeCase: 'village', cases: { syndrome: 'solved', village: 'active', court: 'locked' } },
  { name: 'خداد حسینی و منبتی', activeCase: 'village', cases: { syndrome: 'solved', village: 'active', court: 'locked' } },
  { name: 'زارع و احمدی', activeCase: 'village', cases: { syndrome: 'solved', village: 'active', court: 'locked' } },
  { name: 'وکیلیان و داوودپور', activeCase: 'village', cases: { syndrome: 'solved', village: 'active', court: 'locked' } },
  { name: 'عطاران و نجفیان و شیخ السلامی', activeCase: 'village', cases: { syndrome: 'solved', village: 'active', court: 'locked' } },
  { name: 'قانع منش و عطاران', activeCase: 'village', cases: { syndrome: 'solved', village: 'active', court: 'locked' } },
  { name: 'زادسر و مجتبوی', activeCase: 'village', cases: { syndrome: 'solved', village: 'active', court: 'locked' } },
  { name: 'سعادتمند و شعبانی', activeCase: 'village', cases: { syndrome: 'solved', village: 'active', court: 'locked' } },
  { name: 'حکیم زاده', activeCase: 'village', cases: { syndrome: 'solved', village: 'active', court: 'locked' } }
];

async function seedClasses() {
  console.log('🌱 شروع ایجاد دسته‌ای ۲۳ گروه کلاس‌های چهارم، پنجم و ششم...');
  try {
    await runMigrations();

    const createdGroups = [];

    for (const item of GROUPS_CONFIG) {
      // بررسی وجود گروه تکراری با همین نام
      const existing = await query('SELECT * FROM sessions WHERE name = ?', [item.name]);
      let sessionId;
      let orderCode;
      let chatCode;

      if (existing.rows && existing.rows.length > 0) {
        sessionId = existing.rows[0].id;
        orderCode = existing.rows[0].order_code;
        chatCode = existing.rows[0].chat_code || existing.rows[0].code;
        await query(
          'UPDATE sessions SET active_case = ?, status = "active", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [item.activeCase, sessionId]
        );
        console.log(`ℹ️ گروه «${item.name}» از قبل موجود بود (شناسه: ${sessionId}) — به روزرسانی شد.`);
      } else {
        orderCode = await generateUniqueSessionCode(6);
        chatCode = await generateUniqueSessionCode(6);

        const insertRes = await query(
          `INSERT INTO sessions (code, order_code, chat_code, name, status, active_case)
           VALUES (?, ?, ?, ?, 'active', ?)`,
          [chatCode, orderCode, chatCode, item.name, item.activeCase]
        );
        sessionId = insertRes.insertId;
        console.log(`✅ گروه «${item.name}» با موفقیت ساخته شد (شناسه: ${sessionId}).`);
      }

      // درج یا به روزرسانی وضعیت پرونده‌ها
      for (const [caseKey, status] of Object.entries(item.cases)) {
        await query(
          `INSERT INTO session_cases (session_id, case_key, status, started_at)
           VALUES (?, ?, ?, CURRENT_TIMESTAMP)
           ON DUPLICATE KEY UPDATE status = VALUES(status)`,
          [sessionId, caseKey, status]
        );
      }

      createdGroups.push({
        id: sessionId,
        name: item.name,
        orderCode,
        chatCode,
        activeCase: item.activeCase,
        syndromeStatus: item.cases.syndrome,
        villageStatus: item.cases.village,
        courtStatus: item.cases.court,
      });
    }

    console.log('\n========================================================================================');
    console.log('📋 جدول گروه‌ها و کدهای ورود ساخت‌شده (فقط مخصوص ادمین):');
    console.log('========================================================================================');
    console.table(createdGroups.map(g => ({
      'شناسه': g.id,
      'نام گروه (مخصوص ادمین)': g.name,
      'کد سفارش گل': g.orderCode,
      'کد روی بسته (چت)': g.chatCode,
      'پرونده فعال': g.activeCase,
      'سندروم': g.syndromeStatus,
      'دهکده': g.villageStatus,
      'دادگاه': g.courtStatus
    })));
    console.log('========================================================================================\n');

    console.log('🎉 عملیات Seed دیتابیس با موفقیت به پایان رسید.');
  } catch (error) {
    console.error('❌ خطا در اسکریپت Seed دیتابیس:', error);
  } finally {
    if (require.main === module && !isMemoryDb && pool && typeof pool.end === 'function') {
      await pool.end();
    }
  }
}

if (require.main === module) {
  seedClasses();
}

module.exports = { seedClasses, GROUPS_CONFIG };
