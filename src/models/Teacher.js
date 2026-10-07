/**
 * src/models/Teacher.js
 * مدل کار با دیتابیس برای مدرسان (Teachers)
 */

const { query } = require('../db/pool');

class Teacher {
  /**
   * یافتن مدرس با شماره تلفن
   * @param {string} phone
   */
  static async findByPhone(phone) {
    const cleanPhone = String(phone || '').trim().replace(/[^0-9]/g, '');
    const res = await query(
      `SELECT t.*, s.chat_code, s.order_code, s.name as session_name
       FROM teachers t
       LEFT JOIN sessions s ON t.session_id = s.id
       WHERE t.phone = ?`,
      [cleanPhone]
    );
    return res.rows[0] || null;
  }

  /**
   * ایجاد یا به‌روزرسانی مدرس
   * @param {Object} data
   * @param {string} data.phone
   * @param {string} [data.full_name]
   * @param {number} [data.session_id]
   */
  static async registerOrUpdate({ phone, full_name = null, session_id = null }) {
    const cleanPhone = String(phone || '').trim().replace(/[^0-9]/g, '');
    const existing = await Teacher.findByPhone(cleanPhone);
    if (existing) {
      await query(
        `UPDATE teachers
         SET session_id = COALESCE(?, session_id),
             full_name = COALESCE(?, full_name)
         WHERE id = ?`,
        [session_id, full_name, existing.id]
      );
      return await Teacher.findByPhone(cleanPhone);
    }

    const res = await query(
      `INSERT INTO teachers (phone, full_name, session_id)
       VALUES (?, ?, ?)`,
      [cleanPhone, full_name, session_id]
    );

    return await Teacher.findByPhone(cleanPhone);
  }

  /**
   * دریافت تمامی مدرسان
   */
  static async findAll() {
    const res = await query(
      `SELECT t.*, s.chat_code, s.name as session_name
       FROM teachers t
       LEFT JOIN sessions s ON t.session_id = s.id
       ORDER BY t.created_at DESC`
    );
    return res.rows;
  }
}

module.exports = Teacher;
