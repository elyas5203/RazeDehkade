/**
 * src/models/Message.js
 * مدل کار با دیتابیس برای پیام‌ها (Messages) در MySQL
 */

const { query } = require('../db/pool');
const Session = require('./Session');

class Message {
  /**
   * ساخت پیام جدید در دیتابیس
   * @param {Object} data
   * @param {number} data.session_id
   * @param {string} data.sender_type ('admin' | 'user' | 'system' | 'hacker')
   * @param {number} [data.sender_id]
   * @param {string} data.content
   * @param {string} [data.message_type='text'] ('text' | 'image' | 'voice' | 'file')
   * @param {string} [data.file_url]
   * @param {string} [data.file_name]
   */
  static async create({ session_id, sender_type, sender_id = null, content, message_type = 'text', file_url = null, file_name = null }) {
    const res = await query(
      `INSERT INTO messages (session_id, sender_type, sender_id, content, message_type, file_url, file_name, is_read)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [session_id, sender_type, sender_id, content, message_type, file_url, file_name]
    );

    // بروزرسانی زمان آخرین فعالیت جلسه
    await Session.updateLastActivity(session_id);

    // دریافت پیام ساخته شده
    const createdMsgRes = await query(
      `SELECT m.*, a.display_name as admin_sender_name
       FROM messages m
       LEFT JOIN admins a ON m.sender_id = a.id
       WHERE m.id = ?`,
      [res.insertId]
    );

    return createdMsgRes.rows[0];
  }

  /**
   * دریافت تاریخچه پیام‌های یک جلسه
   * @param {number} session_id
   * @param {number} [limit=100]
   */
  static async findBySessionId(session_id, limit = 100) {
    const res = await query(
      `SELECT m.*, a.display_name as admin_sender_name
       FROM messages m
       LEFT JOIN admins a ON m.sender_id = a.id
       WHERE m.session_id = ?
       ORDER BY m.created_at ASC
       LIMIT ?`,
      [session_id, limit]
    );
    return res.rows;
  }

  /**
   * علامت‌گذاری پیام‌های جلسه به عنوان خوانده شده
   * @param {number} session_id
   * @param {string} sender_type_to_read
   */
  static async markAsRead(session_id, sender_type_to_read = 'user') {
    const res = await query(
      `UPDATE messages
       SET is_read = 1
       WHERE session_id = ? AND sender_type = ? AND is_read = 0`,
      [session_id, sender_type_to_read]
    );
    return res.affectedRows;
  }
}

module.exports = Message;
