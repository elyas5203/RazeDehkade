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
   * ساخت نمونه‌های اولیه سناریو برای هفته‌های ۱ تا ۵ در صورت خالی بودن جدول
   */
  static async seedDefaultsIfEmpty() {
    const check = await query(`SELECT COUNT(*) as count FROM weekly_content`);
    const count = parseInt(check.rows[0] ? check.rows[0].count : 0, 10);
    if (count > 0) return;

    console.log('🌱 بارگذاری محتوای پیش‌فرض ۵ هفته سناریو در دیتابیس...');

    const defaults = [
      // هفته ۱: شروع تحقیقات و اولین تماس
      { week_number: 1, step_order: 1, content_type: 'text', title: 'پیام خوش‌آمدگویی و بریف ماموریت', payload: 'سلام به دستیاران کارآگاه. پرونده راز دهکده رسماً آغاز شد. تمام پیام‌ها و مدارک را با دقت بررسی کنید.' },
      { week_number: 1, step_order: 2, content_type: 'text', title: 'دستورالعمل بررسی شواهد', payload: 'نخستین سرنخ در محوطه آسیاب قدیمی پیدا شده است. گزارش اولیه به زودی ارسال می‌شود.' },
      { week_number: 1, step_order: 3, content_type: 'image', title: 'عکس آسیاب قدیمی دهکده', payload: 'images/photo1.jpg.png', file_name: 'photo1.jpg.png' },
      { week_number: 1, step_order: 4, content_type: 'text', title: 'پرسش از دستیاران', payload: 'آیا در تصویر آسیاب نکته مشکوکی در نزدیکی در ورودی مشاهده می‌کنید؟' },
      { week_number: 1, step_order: 5, content_type: 'voice', title: 'پیام صوتی ضبط‌شده بازپرس', payload: 'audio/voice.mp3', file_name: 'voice.mp3' },

      // هفته ۲: کشف مدارک جدید و ورود مضنونین
      { week_number: 2, step_order: 1, content_type: 'text', title: 'گزارش جلسه دوم', payload: 'سلام به تیم تحقیق. اطلاعات جدیدی از ردپای مظنون در دست است.' },
      { week_number: 2, step_order: 2, content_type: 'image', title: 'سند کشف‌شده در انبار', payload: 'images/photo2.jpg.png', file_name: 'photo2.jpg.png' },
      { week_number: 2, step_order: 3, content_type: 'text', title: 'تحلیل مهر محرمانه', payload: 'این سند دارای تاریخ دستکاری شده است. با شواهد هفته قبل تطبیق دهید.' },
      { week_number: 2, step_order: 4, content_type: 'video', title: 'فیلم ضبط‌شده دوربین مداربسته', payload: 'videos/gerogangiri.MP4', file_name: 'gerogangiri.MP4' },

      // هفته ۳: ورود مزداک و نفوذ سایبری
      { week_number: 3, step_order: 1, content_type: 'text', title: 'هشدار نفوذ امنیتی', payload: 'سیگنال‌های ناشناخته روی فرکانس ارتباطی ما دریافت می‌شود. هوشیار باشید.' },
      { week_number: 3, step_order: 2, content_type: 'image', title: 'تصویر ردپا در جنگل', payload: 'images/photo3.jpg', file_name: 'photo3.jpg' },
      { week_number: 3, step_order: 3, content_type: 'text', title: 'پیام مرموز مزداک', payload: 'فکر کردید به این راحتی پرونده بسته می‌شه؟ دهکده رازهای بزرگتری داره...' },

      // هفته ۴: شواهد کلیدی و گره‌گشایی
      { week_number: 4, step_order: 1, content_type: 'text', title: 'تحلیل نامه رمزنگاری‌شده', payload: 'کد ۶ رقمی پنهان در سند را رمزگشایی کنید.' },
      { week_number: 4, step_order: 2, content_type: 'image', title: 'نقشه زیرزمین عمارت', payload: 'images/photo4.jpg', file_name: 'photo4.jpg' },
      { week_number: 4, step_order: 3, content_type: 'text', title: 'پایان بازپرسی مقدماتی', payload: 'به زودی دادگاه رسیدگی به پرونده تشکیل خواهد شد.' },

      // هفته ۵: دادگاه عدالت و نتیجه‌گیری نهایی
      { week_number: 5, step_order: 1, content_type: 'text', title: 'آغاز جلسه دادگاه', payload: 'دستیاران گرامی، اکنون وقت جمع‌بندی تمام شواهد ۵ هفته گذشته است.' },
      { week_number: 5, step_order: 2, content_type: 'image', title: 'حکم نهایی بازپرس', payload: 'images/photo6.jpg', file_name: 'photo6.jpg' },
      { week_number: 5, step_order: 3, content_type: 'text', title: 'تبریک به تیم کارآگاهان', payload: 'پرونده با درایت شما حل شد! نشان کارآگاه برتر به همه شما تعلق گرفت.' },
    ];

    for (const item of defaults) {
      await WeeklyContent.create(item);
    }
    console.log('✅ ۲۱ مرحله پیش‌فرض برای ۵ هفته در دیتابیس ثبت شد.');
  }
}

module.exports = WeeklyContent;
