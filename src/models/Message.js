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
   * @param {string} [data.message_type='text'] ('text' | 'image' | 'voice' | 'video' | 'file')
   * @param {string} [data.file_url]
   * @param {string} [data.file_name]
   * @param {number|null} [data.reply_to_id=null]
   */
  static async create({ session_id, sender_type, sender_id = null, content, message_type = 'text', file_url = null, file_name = null, reply_to_id = null }) {
    const res = await query(
      `INSERT INTO messages (session_id, sender_type, sender_id, content, message_type, file_url, file_name, is_read, reply_to_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [session_id, sender_type, sender_id, content, message_type, file_url, file_name, reply_to_id || null]
    );

    // بروزرسانی زمان آخرین فعالیت جلسه
    await Session.updateLastActivity(session_id);

    // دریافت پیام ساخته شده به همراه اطلاعات ریپلای و نام ادمین
    const createdMsgRes = await query(
      `SELECT m.*, a.display_name as admin_sender_name,
              rm.content as reply_content,
              rm.sender_type as reply_sender_type,
              rm.message_type as reply_message_type,
              rm.file_url as reply_file_url,
              rm.file_name as reply_file_name,
              ra.display_name as reply_admin_name
       FROM messages m
       LEFT JOIN admins a ON m.sender_id = a.id
       LEFT JOIN messages rm ON m.reply_to_id = rm.id
       LEFT JOIN admins ra ON rm.sender_id = ra.id
       WHERE m.id = ?`,
      [res.insertId]
    );

    return createdMsgRes.rows[0];
  }

  /**
   * دریافت تاریخچه پیام‌های یک جلسه با جزئیات کامل ریپلای
   * @param {number} session_id
   * @param {number} [limit=100]
   */
  static async findBySessionId(session_id, limit = 100) {
    const res = await query(
      `SELECT m.*, a.display_name as admin_sender_name,
              rm.content as reply_content,
              rm.sender_type as reply_sender_type,
              rm.message_type as reply_message_type,
              rm.file_url as reply_file_url,
              rm.file_name as reply_file_name,
              ra.display_name as reply_admin_name
       FROM messages m
       LEFT JOIN admins a ON m.sender_id = a.id
       LEFT JOIN messages rm ON m.reply_to_id = rm.id
       LEFT JOIN admins ra ON rm.sender_id = ra.id
       WHERE m.session_id = ?
       ORDER BY m.id ASC`,
      [session_id]
    );
    return res.rows;
  }

  /**
   * یافتن پیام با شناسه به همراه فراداده ریپلای
   * @param {number} id
   */
  static async findById(id) {
    const res = await query(
      `SELECT m.*, a.display_name as admin_sender_name,
              rm.content as reply_content,
              rm.sender_type as reply_sender_type,
              rm.message_type as reply_message_type,
              rm.file_url as reply_file_url,
              rm.file_name as reply_file_name,
              ra.display_name as reply_admin_name
       FROM messages m
       LEFT JOIN admins a ON m.sender_id = a.id
       LEFT JOIN messages rm ON m.reply_to_id = rm.id
       LEFT JOIN admins ra ON rm.sender_id = ra.id
       WHERE m.id = ?`,
      [id]
    );
    return res.rows[0] || null;
  }

  /**
   * ویرایش متن پیام
   * @param {number} id
   * @param {string} newContent
   */
  static async updateContent(id, newContent) {
    const res = await query(
      `UPDATE messages SET content = ? WHERE id = ?`,
      [newContent, id]
    );
    return res.affectedRows > 0;
  }

  /**
   * حذف پیام
   * @param {number} id
   */
  static async delete(id) {
    const res = await query(
      `DELETE FROM messages WHERE id = ?`,
      [id]
    );
    return res.affectedRows > 0;
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

  /**
   * پاکسازی تمامی پیام‌های یک جلسه (بدون دستکاری سایر جداول یا فایل‌ها)
   * @param {number} session_id
   */
  static async clearBySessionId(session_id) {
    const res = await query(
      `DELETE FROM messages WHERE session_id = ?`,
      [session_id]
    );
    return res.affectedRows || 0;
  }

  /**
   * پاکسازی تمامی پیام‌های چت همه جلسات به صورت سراسری
   */
  static async clearAll() {
    const res = await query(`DELETE FROM messages`);
    return res.affectedRows || 0;
  }
}

module.exports = Message;
