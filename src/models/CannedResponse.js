/**
 * src/models/CannedResponse.js
 * مدل مدیریت پیام‌های آماده (Canned Responses)
 */

const { query } = require('../db/pool');

class CannedResponse {
  /**
   * ساخت پیام آماده جدید
   */
  static async create({ admin_id, title, content, sort_order = 0 }) {
    const res = await query(
      `INSERT INTO canned_responses (admin_id, title, content, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [admin_id, title, content, sort_order]
    );
    return res.rows[0];
  }

  /**
   * دریافت تمام پیام‌های آماده
   * @param {number} [adminId] - اختیاری (پیام‌های ادمین خاص یا عمومی)
   */
  static async findAll(adminId = null) {
    let sql = 'SELECT c.*, a.display_name as admin_name FROM canned_responses c LEFT JOIN admins a ON c.admin_id = a.id';
    const params = [];
    if (adminId) {
      sql += ' WHERE c.admin_id = $1 OR c.admin_id IS NULL';
      params.push(adminId);
    }
    sql += ' ORDER BY c.sort_order ASC, c.created_at DESC';

    const res = await query(sql, params);
    return res.rows;
  }

  /**
   * بروزرسانی پیام آماده
   */
  static async update(id, { title, content, sort_order }) {
    const res = await query(
      `UPDATE canned_responses
       SET title = COALESCE($1, title),
           content = COALESCE($2, content),
           sort_order = COALESCE($3, sort_order)
       WHERE id = $4
       RETURNING *`,
      [title, content, sort_order, id]
    );
    return res.rows[0] || null;
  }

  /**
   * حذف پیام آماده
   */
  static async delete(id) {
    const res = await query('DELETE FROM canned_responses WHERE id = $1 RETURNING *', [id]);
    return res.rows[0] || null;
  }
}

module.exports = CannedResponse;
