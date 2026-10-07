/**
 * src/models/SessionLog.js
 * مدل لاگ‌های رویدادهای جلسه در MySQL
 */

const { query } = require('../db/pool');

class SessionLog {
  /**
   * ثبت یک لاگ رویداد برای جلسه
   * @param {number} session_id
   * @param {string} event_type
   * @param {string|Object} details
   */
  static async log(session_id, event_type, details = '') {
    const detailString = typeof details === 'object' ? JSON.stringify(details) : String(details);
    const res = await query(
      `INSERT INTO session_logs (session_id, event_type, details)
       VALUES (?, ?, ?)`,
      [session_id, event_type, detailString]
    );

    const createdRes = await query('SELECT * FROM session_logs WHERE id = ?', [res.insertId]);
    return createdRes.rows[0];
  }

  /**
   * دریافت لاگ‌های یک جلسه
   */
  static async findBySessionId(session_id) {
    const res = await query(
      `SELECT * FROM session_logs WHERE session_id = ? ORDER BY created_at DESC`,
      [session_id]
    );
    return res.rows;
  }
}

module.exports = SessionLog;
