/**
 * src/models/WeeklyContent.js
 * مدل کار با دیتابیس برای سناریو و توالی مراحل هفته‌های ۱ تا ۵
 */

const { query } = require('../db/pool');

class WeeklyContent {
  /**
   * دریافت تمامی مراحل یک هفته مشخص
   * @param {number} weekNumber (1 to 5)
   */
  static async findByWeek(weekNumber) {
    const res = await query(
      `SELECT * FROM weekly_content
       WHERE week_number = ?
       ORDER BY step_order ASC, id ASC`,
      [parseInt(weekNumber, 10)]
    );
    return res.rows;
  }

  /**
   * ساخت یک مرحله جدید در هفته
   */
  static async create({ week_number, step_order, content_type, title, payload, file_name = null }) {
    const res = await query(
      `INSERT INTO weekly_content (week_number, step_order, content_type, title, payload, file_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        parseInt(week_number, 10),
        parseInt(step_order, 10) || 1,
        content_type,
        title,
        payload,
        file_name,
      ]
    );
    const created = await query(`SELECT * FROM weekly_content WHERE id = ?`, [res.insertId]);
    return created.rows[0];
  }

  /**
   * به‌روزرسانی یک مرحله
   */
  static async update(id, { week_number, step_order, content_type, title, payload, file_name }) {
    await query(
      `UPDATE weekly_content
       SET week_number = COALESCE(?, week_number),
           step_order = COALESCE(?, step_order),
           content_type = COALESCE(?, content_type),
           title = COALESCE(?, title),
           payload = COALESCE(?, payload),
           file_name = COALESCE(?, file_name)
       WHERE id = ?`,
      [week_number, step_order, content_type, title, payload, file_name, id]
    );
    const updated = await query(`SELECT * FROM weekly_content WHERE id = ?`, [id]);
    return updated.rows[0] || null;
  }

  /**
   * حذف یک مرحله
   */
  static async delete(id) {
    const recordRes = await query(`SELECT * FROM weekly_content WHERE id = ?`, [id]);
    const record = recordRes.rows[0];
    if (!record) return null;
    await query(`DELETE FROM weekly_content WHERE id = ?`, [id]);
    return record;
  }

  /**
   * دریافت شماره ترتیب بعدی برای یک هفته مشخص
   * @param {number} weekNumber
   */
  static async getNextStepOrder(weekNumber) {
    const items = await WeeklyContent.findByWeek(weekNumber);
    const maxOrder = (items || []).reduce((max, item) => Math.max(max, Number(item.step_order) || 0), 0);
    return maxOrder + 1;
  }

  /**
   * حذف تمام مراحل یک هفته مشخص
   * @param {number} weekNumber
   */
  static async deleteByWeek(weekNumber) {
    const items = await WeeklyContent.findByWeek(weekNumber);
    await query(`DELETE FROM weekly_content WHERE week_number = ?`, [parseInt(weekNumber, 10)]);
    return items;
  }

  /**
   * حذف تمام مراحل همه هفته‌ها
   */
  static async deleteAll() {
    const res = await query(`SELECT * FROM weekly_content`);
    await query(`DELETE FROM weekly_content`);
    return res.rows || [];
  }

  /**
   * غیرفعال‌سازی بارگذاری پیش‌فرض‌های قدیمی (طبق درخواست کاربر، فقط محتوای بات تلگرام نمایش داده شود)
   */
  static async seedDefaultsIfEmpty() {
    return;
  }
}

module.exports = WeeklyContent;

