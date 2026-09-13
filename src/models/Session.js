/**
 * src/models/Session.js
 * مدل کار با دیتابیس برای جلسات (Sessions) در MySQL
 */

const { query } = require('../db/pool');
const { generateUniqueSessionCode } = require('../utils/codeGenerator');

class Session {
  /**
   * یافتن جلسه با شناسه
   * @param {number} id
   */
  static async findById(id) {
    const res = await query(
      `SELECT s.*, a.display_name as assigned_admin_name
       FROM sessions s
       LEFT JOIN admins a ON s.assigned_admin_id = a.id
       WHERE s.id = ?`,
      [id]
    );
    return res.rows[0] || null;
  }

  /**
   * یافتن جلسه با کد ورود ۶ یا ۸ رقمی
   * @param {string} code
   */
  static async findByCode(code) {
    const res = await query(
      `SELECT s.*, a.display_name as assigned_admin_name
       FROM sessions s
       LEFT JOIN admins a ON s.assigned_admin_id = a.id
       WHERE s.code = ?`,
      [code]
    );
    return res.rows[0] || null;
  }

  /**
   * ساخت جلسه جدید
   * @param {Object} data
   * @param {string} [data.name]
   * @param {number} [data.codeLength=6]
   * @param {number} [data.assigned_admin_id]
   */
  static async create({ name, codeLength = 6, assigned_admin_id = null }) {
    // بررسی تعداد جلسات فعال جاری جهت رعایت سقف
    const maxSessions = parseInt(process.env.MAX_CONCURRENT_SESSIONS || '10', 10);
    const activeCountRes = await query("SELECT COUNT(*) as count FROM sessions WHERE status IN ('waiting', 'active')");
    const activeCount = parseInt(activeCountRes.rows[0].count, 10);

    if (activeCount >= maxSessions) {
      const error = new Error(`حداکثر تعداد جلسات همزمان مجاز (${maxSessions}) تکمیل شده است.`);
      error.statusCode = 400;
      throw error;
    }

    const code = await generateUniqueSessionCode(codeLength);
    const sessionName = name || `دستیاران کارآگاه - جلسه ${code}`;

    const res = await query(
      `INSERT INTO sessions (code, name, status, assigned_admin_id)
       VALUES (?, ?, 'waiting', ?)`,
      [code, sessionName, assigned_admin_id]
    );

    return await Session.findById(res.insertId);
  }

  /**
   * دریافت تمامی جلسات (مخصوص ادمین)
   */
  static async findAll() {
    const res = await query(
      `SELECT s.*, a.display_name as assigned_admin_name,
              (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id AND m.is_read = 0 AND m.sender_type = 'user') as unread_count
       FROM sessions s
       LEFT JOIN admins a ON s.assigned_admin_id = a.id
       ORDER BY s.last_activity_at DESC`
    );
    return res.rows;
  }

  /**
   * بروزرسانی وضعیت جلسه
   * @param {number} id
   * @param {string} status ('waiting' | 'active' | 'completed' | 'archived')
   */
  static async updateStatus(id, status) {
    await query(
      `UPDATE sessions
       SET status = ?, updated_at = CURRENT_TIMESTAMP, last_activity_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, id]
    );
    return await Session.findById(id);
  }

  /**
   * بروزرسانی زمان آخرین فعالیت جلسه
   * @param {number} id
   */
  static async updateLastActivity(id) {
    await query(
      `UPDATE sessions
       SET last_activity_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [id]
    );
  }

  /**
   * تخصیص ادمین به جلسه
   * @param {number} sessionId
   * @param {number} adminId
   */
  static async assignAdmin(sessionId, adminId) {
    await query(
      `UPDATE sessions
       SET assigned_admin_id = ?, status = 'active', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [adminId, sessionId]
    );
    return await Session.findById(sessionId);
  }
}

module.exports = Session;
