/**
 * src/db/pool.js
 * مدیریت اتصال به دیتابیس PostgreSQL
 * شامل پشتیبانی از pg-mem برای تست‌های اتوماتیک در صورتی که دیتابیس واقعی در دسترس نباشد
 */

const { Pool } = require('pg');
require('dotenv').config();

let pool;

// بررسی متغیرهای محیطی دیتابیس
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'detective_game',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// اگر محیط تست باشد یا USE_IN_MEMORY_DB تنظیم شده باشد، از pg-mem استفاده می‌کنیم
if (process.env.NODE_ENV === 'test' || process.env.USE_IN_MEMORY_DB === 'true') {
  const { newDb } = require('pg-mem');
  const memDb = newDb();

  const adapter = memDb.adapters.createPg();
  pool = new adapter.Pool();
  pool.isMemoryDb = true;
} else {
  pool = new Pool(dbConfig);
}

/**
 * اجرای کوئری در دیتابیس
 * @param {string} text - متن SQL
 * @param {Array} params - پارامترهای SQL
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (err) {
    console.error('Database Query Error:', err.message);
    throw err;
  }
};

module.exports = {
  pool,
  query,
};
