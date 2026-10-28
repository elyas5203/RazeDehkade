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

    const migrationFiles = ['001_initial_schema.sql', '002_features_update.sql', '003_vault_unlock_support.sql', '004_add_reply_to_messages.sql', '005_add_session_hack_status.sql'];
    for (const fileName of migrationFiles) {
      if (!isMemoryDb && fileName === '004_add_reply_to_messages.sql') {
        // Older installations applied this migration before migration tracking existed.
        // Avoid issuing duplicate ALTER/INDEX statements on every process start.
        const [column, index, constraint] = await Promise.all([
          query("SHOW COLUMNS FROM messages LIKE 'reply_to_id'"),
          query("SHOW INDEX FROM messages WHERE Key_name = 'idx_messages_reply_to'"),
          query("SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND CONSTRAINT_NAME = 'fk_messages_reply_to'"),
        ]);
        if (column.rows.length && index.rows.length && constraint.rows.length) continue;
      }
      const filePath = path.join(__dirname, 'migrations', fileName);
      if (fs.existsSync(filePath)) {
        const sql = fs.readFileSync(filePath, 'utf8');
        const stmts = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
        for (const stmt of stmts) {
          try {
            await query(stmt);
          } catch (mErr) {
            // چشم‌پوشی در صورت وجود ستون یا کلید از قبل
            if (!mErr.message.includes('Duplicate column') && !mErr.message.includes('already exists')) {
              console.warn(`Migration statement note (${fileName}):`, mErr.message);
            }
          }
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
      await ensureColumn('is_vault_unlocked', 'is_vault_unlocked TINYINT(1) DEFAULT 0 AFTER teacher_phone');
      await ensureColumn('vault_target_week', 'vault_target_week TINYINT DEFAULT 5 AFTER is_vault_unlocked');
      await ensureColumn('is_hacked', 'is_hacked TINYINT(1) DEFAULT 0 AFTER vault_target_week');
      await ensureColumn('hacked_at', 'hacked_at DATETIME NULL AFTER is_hacked');

      // تضمین وجود ستون reply_to_id در جدول messages
      const existingReplyCol = await query(`SHOW COLUMNS FROM messages LIKE 'reply_to_id'`);
      if (existingReplyCol.rows.length === 0) {
        try {
          await query(`ALTER TABLE messages ADD COLUMN reply_to_id INT NULL DEFAULT NULL AFTER sender_id`);
          await query(`ALTER TABLE messages ADD CONSTRAINT fk_messages_reply_to FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL`);
        } catch (colErr) {
          console.warn('Note ensuring reply_to_id column:', colErr.message);
        }
      }

      // همگام‌سازی و بازیابی خودکار شماره‌های ثبت شده در جدول معلمان به جدول جلسات
      try {
        await query(`
          UPDATE sessions s 
          JOIN teachers t ON t.session_id = s.id 
          SET s.teacher_phone = t.phone 
          WHERE (s.teacher_phone IS NULL OR s.teacher_phone = '') 
            AND t.phone IS NOT NULL AND t.phone != ''
        `);
      } catch (syncErr) {
        console.warn('Note syncing teacher phones:', syncErr.message);
      }
    }

    // ساخت جدول ذخیره وضعیت بات تلگرام در دیتابیس و پاکسازی موارد تست قبلی
    await query(`
      CREATE TABLE IF NOT EXISTS bot_state (
        admin_id BIGINT PRIMARY KEY,
        mode VARCHAR(50) NOT NULL DEFAULT 'IDLE',
        active_week TINYINT NULL,
        base_title VARCHAR(150) NULL,
        title_counter INT NOT NULL DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ساخت جدول نگهداری عکس‌های کارآگاهی دستیاران هر کلاس/جلسه
    await query(`
      CREATE TABLE IF NOT EXISTS session_assistants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        student_name VARCHAR(190) NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        display_order INT NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_session_assistants_session (session_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS emergency_auth_submissions (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        reference_code VARCHAR(32) NOT NULL UNIQUE,
        session_id INT NOT NULL,
        phone VARCHAR(20) NOT NULL,
        answers_json JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_emergency_auth_session (session_id),
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS emergency_auth_videos (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        reference_code VARCHAR(32) NOT NULL UNIQUE,
        client_submission_id VARCHAR(64) NOT NULL UNIQUE,
        session_id INT NOT NULL,
        phone VARCHAR(20) NOT NULL,
        file_path VARCHAR(700) NOT NULL,
        mime_type VARCHAR(80) NOT NULL,
        file_size BIGINT NOT NULL,
        status ENUM('pending','sending','sent','failed') NOT NULL DEFAULT 'pending',
        attempt_count INT NOT NULL DEFAULT 0,
        next_attempt_at DATETIME NULL,
        last_error VARCHAR(500) NULL,
        telegram_message_id BIGINT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sent_at DATETIME NULL,
        INDEX idx_emergency_video_queue (status, next_attempt_at, id),
        INDEX idx_emergency_video_session (session_id, id),
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS app_migrations (
        migration_key VARCHAR(100) PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const legacyClearKey = 'clear_legacy_canned_and_weekly_v3';
    const existingMigration = await query('SELECT * FROM app_migrations WHERE migration_key = ?', [legacyClearKey]);
    if (!existingMigration.rows || existingMigration.rows.length === 0) {
      await query('DELETE FROM weekly_content');
      await query('DELETE FROM canned_responses');
      await query('INSERT INTO app_migrations (migration_key) VALUES (?)', [legacyClearKey]);
      console.log('🧹 تمام پیام‌های آماده و مراحل تست قبلی به طور کامل پاکسازی شدند.');
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
