/**
 * src/db/migrate.js
 * اسکریپت اجرای مایگریشن‌های دیتابیس MySQL و ایجاد ادمین پیش‌فرض
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool, query, isMemoryDb } = require('./pool');

async function runMigrations() {
  console.log('🚀 شروع اجرای مایگریشن‌های دیتابیس MySQL...');

  try {
    const migrationFilePath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
    const sqlContent = fs.readFileSync(migrationFilePath, 'utf8');

    // جداسازی دستورات با سمیکالن
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      await query(statement);
    }
    console.log('✅ جدول‌های دیتابیس با موفقیت در MySQL ساخته شدند.');

    // ساخت ادمین اولیه در صورت عدم وجود
    const defaultAdminUsername = process.env.ADMIN_USERNAME || 'admin';
    const defaultAdminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const defaultDisplayName = process.env.ADMIN_DISPLAY_NAME || 'مدیر سیستم';

    const existingAdmin = await query('SELECT * FROM admins WHERE username = ?', [defaultAdminUsername]);

    if (existingAdmin.rows.length === 0) {
      const passwordHash = await bcrypt.hash(defaultAdminPassword, 10);
      await query(
        `INSERT INTO admins (username, password_hash, display_name, is_active)
         VALUES (?, ?, ?, 1)`,
        [defaultAdminUsername, passwordHash, defaultDisplayName]
      );
      console.log(`👤 ادمین پیش‌فرض ساخت شد: یوزرنیم = ${defaultAdminUsername} / پسورد = ${defaultAdminPassword}`);
    } else {
      console.log('ℹ️ ادمین از قبل موجود است.');
    }

    console.log('🎉 مایگریشن‌ها با موفقیت تکمیل شد.');
  } catch (error) {
    console.error('❌ خطا در اجرای مایگریشن‌ها:', error);
    process.exit(1);
  } finally {
    if (!isMemoryDb && pool && typeof pool.end === 'function') {
      await pool.end();
    }
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
