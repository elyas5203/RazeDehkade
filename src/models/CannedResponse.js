/**
 * src/models/CannedResponse.js
 * مدل مدیریت پیام‌های آماده (Canned Responses) در MySQL
 */

const { query } = require('../db/pool');

class CannedResponse {
  /**
   * ساخت پیام آماده جدید
   */
  static async create({ admin_id, title, content, sort_order = 0 }) {
    const res = await query(
      `INSERT INTO canned_responses (admin_id, title, content, sort_order)
       VALUES (?, ?, ?, ?)`,
      [admin_id, title, content, sort_order]
    );

    const createdRes = await query('SELECT * FROM canned_responses WHERE id = ?', [res.insertId]);
    return createdRes.rows[0];
  }

  /**
   * دریافت تمام پیام‌های آماده
   * @param {number} [adminId]
   */
  static async findAll(adminId = null) {
    let sql = 'SELECT c.*, a.display_name as admin_name FROM canned_responses c LEFT JOIN admins a ON c.admin_id = a.id';
    const params = [];
    if (adminId) {
      sql += ' WHERE c.admin_id = ? OR c.admin_id IS NULL';
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
    await query(
      `UPDATE canned_responses
       SET title = COALESCE(?, title),
           content = COALESCE(?, content),
           sort_order = COALESCE(?, sort_order)
       WHERE id = ?`,
      [title, content, sort_order, id]
    );

    const res = await query('SELECT * FROM canned_responses WHERE id = ?', [id]);
    return res.rows[0] || null;
  }

  /**
   * حذف پیام آماده
   */
  static async delete(id) {
    const recordRes = await query('SELECT * FROM canned_responses WHERE id = ?', [id]);
    const record = recordRes.rows[0];
    if (!record) return null;

    await query('DELETE FROM canned_responses WHERE id = ?', [id]);
    return record;
  }
}

module.exports = CannedResponse;
