/**
 * src/models/Admin.js
 * مدل کار با دیتابیس برای ادمین‌ها
 */

const { query } = require('../db/pool');
const bcrypt = require('bcryptjs');

class Admin {
  /**
   * یافتن ادمین بر اساس یوزرنیم
   * @param {string} username
   */
  static async findByUsername(username) {
    const res = await query('SELECT * FROM admins WHERE username = $1', [username]);
    return res.rows[0] || null;
  }

  /**
   * یافتن ادمین بر اساس شناسه
   * @param {number} id
   */
  static async findById(id) {
    const res = await query('SELECT id, username, display_name, is_active, created_at FROM admins WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  /**
   * بررسی صحت رمز عبور ادمین
   * @param {string} password
   * @param {string} passwordHash
   */
  static async verifyPassword(password, passwordHash) {
    return await bcrypt.compare(password, passwordHash);
  }

  /**
   * ایجاد ادمین جدید
   */
  static async create({ username, password, display_name }) {
    const password_hash = await bcrypt.hash(password, 10);
    const res = await query(
      `INSERT INTO admins (username, password_hash, display_name, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING id, username, display_name, is_active, created_at`,
      [username, password_hash, display_name]
    );
    return res.rows[0];
  }
}

module.exports = Admin;
