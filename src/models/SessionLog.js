/**
 * src/models/SessionLog.js
 * مدل لاگ‌های رویدادهای جلسه
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
       VALUES ($1, $2, $3)
       RETURNING *`,
      [session_id, event_type, detailString]
    );
    return res.rows[0];
  }

  /**
   * دریافت لاگ‌های یک جلسه
   */
  static async findBySessionId(session_id) {
    const res = await query(
      `SELECT * FROM session_logs WHERE session_id = $1 ORDER BY created_at DESC`,
      [session_id]
    );
    return res.rows;
  }
}

module.exports = SessionLog;
