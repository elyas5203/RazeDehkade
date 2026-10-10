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
    // ایجاد خودکار دیتابیس در صورت عدم وجود (اگر به MySQL واقعی متصل باشد)
    if (!isMemoryDb) {
      const mysql = require('mysql2/promise');
      const tempConn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
      });
      const dbName = process.env.DB_NAME || 'detective_game';
      await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      await tempConn.end();
      console.log(`📦 دیتابیس '${dbName}' بررسی/ایجاد گردید.`);
    }

    const migrationFiles = ['001_initial_schema.sql', '002_features_update.sql'];
    for (const fileName of migrationFiles) {
      const filePath = path.join(__dirname, 'migrations', fileName);
      if (fs.existsSync(filePath)) {
        const sql = fs.readFileSync(filePath, 'utf8');
        const stmts = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
        for (const stmt of stmts) {
          await query(stmt);
        }
      }
    }
    console.log('✅ جدول‌های دیتابیس با موفقیت در MySQL ساخته/بروزرسانی شدند.');

    // بررسی و اضافه کردن ستون‌های order_code و chat_code و ستون‌های جدید
    if (!isMemoryDb) {
      const ensureColumn = async (name, definition) => {
        const existing = await query(`SHOW COLUMNS FROM sessions LIKE ?`, [name]);
        if (existing.rows.length === 0) await query(`ALTER TABLE sessions ADD COLUMN ${definition}`);
      };

      await ensureColumn('order_code', 'order_code VARCHAR(10) UNIQUE NULL AFTER code');
      await ensureColumn('chat_code', 'chat_code VARCHAR(10) UNIQUE NULL AFTER order_code');

      // مقداردهی جلساتی که order_code یا chat_code آن‌ها نال است با مقدار code
      await query(`UPDATE sessions SET order_code = code WHERE order_code IS NULL`);
      await query(`UPDATE sessions SET chat_code = code WHERE chat_code IS NULL`);

      await ensureColumn('order_started_at', 'order_started_at DATETIME NULL AFTER last_activity_at');
      await ensureColumn('order_expires_at', 'order_expires_at DATETIME NULL AFTER order_started_at');
      await ensureColumn('active_case', 'active_case VARCHAR(50) NULL AFTER order_expires_at');
      await ensureColumn('is_chat_locked', 'is_chat_locked TINYINT(1) DEFAULT 0 AFTER active_case');
      await ensureColumn('teacher_phone', 'teacher_phone VARCHAR(20) NULL AFTER is_chat_locked');
    }

    // ساخت جدول ردیابی مایگریشن‌های یک‌بار مصرف و پاکسازی پیام‌های آماده قدیمی
    await query(`
      CREATE TABLE IF NOT EXISTS app_migrations (
        migration_key VARCHAR(100) PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const legacyClearKey = 'clear_legacy_canned_and_weekly_v2';
    const existingMigration = await query('SELECT * FROM app_migrations WHERE migration_key = ?', [legacyClearKey]);
    if (!existingMigration.rows || existingMigration.rows.length === 0) {
      await query('DELETE FROM weekly_content');
      await query('DELETE FROM canned_responses');
      await query('INSERT INTO app_migrations (migration_key) VALUES (?)', [legacyClearKey]);
      console.log('🧹 تمام پیام‌های آماده و مراحل پیش‌فرض قبلی به طور کامل پاکسازی شدند.');
    }

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
    // هنگام اجرای مستقل اسکریپت مایگریشن اتصال را می‌بندیم
    if (require.main === module && !isMemoryDb && pool && typeof pool.end === 'function') {
      await pool.end();
    }
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
