/**
 * src/routes/weeklyContent.js
 * مسیرهای مدیریت محتوای سناریوی ۵ هفته برای پنل ادمین
 */

const express = require('express');
const router = express.Router();
const WeeklyContent = require('../models/WeeklyContent');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

/**
 * GET /api/weekly-content?week=1
 * دریافت مراحل و دکمه‌های مربوط به یک هفته
 */
router.get('/', async (req, res) => {
  try {
    const week = parseInt(req.query.week || '1', 10);
    // در صورت خالی بودن دیتابیس، داده‌های اولیه را پر کن
    await WeeklyContent.seedDefaultsIfEmpty();
    const items = await WeeklyContent.findByWeek(week);
    const normalized = (items || []).map(item => ({
      id: item.id,
      week: item.week_number,
      week_number: item.week_number,
      order_num: item.step_order,
      step_order: item.step_order,
      content_type: item.content_type,
      title: item.title,
      payload: item.payload,
      text_content: item.content_type === 'text' ? item.payload : null,
      file_url: item.content_type !== 'text' ? item.payload : null,
      file_name: item.file_name,
      created_at: item.created_at,
    }));
    res.json({ success: true, week, data: normalized });
  } catch (error) {
    console.error('Error fetching weekly content:', error);
    res.status(500).json({ success: false, message: 'خطا در بارگذاری محتوای هفته' });
  }
});

/**
 * POST /api/weekly-content
 * افزودن یک مرحله جدید به سناریوی یک هفته
 */
router.post('/', async (req, res) => {
  try {
    const week_number = parseInt(req.body.week_number || req.body.week, 10);
    const step_order = parseInt(req.body.step_order || req.body.orderNum || req.body.order_num || 1, 10);
    const content_type = String(req.body.content_type || req.body.contentType || 'text').trim().toLowerCase();
    const title = String(req.body.title || req.body.name || '').trim();
    const payload = String(
      req.body.payload ||
      req.body.textContent ||
      req.body.text_content ||
      req.body.content ||
      req.body.fileUrl ||
      req.body.file_url ||
      ''
    ).trim();
    const file_name = req.body.file_name || req.body.fileName || (content_type !== 'text' ? title : null);

    if (!week_number || !content_type || !title || !payload) {
      console.warn('Invalid weekly-content POST payload:', req.body);
      return res.status(400).json({
        success: false,
        message: 'اطلاعات ارسالی ناقص است. لطفاً عنوان و متن یا آدرس فایل را وارد فرمایید.',
      });
    }
    const item = await WeeklyContent.create({
      week_number,
      step_order,
      content_type,
      title,
      payload,
      file_name,
    });
    const normalizedItem = {
      id: item.id,
      week: item.week_number,
      week_number: item.week_number,
      order_num: item.step_order,
      step_order: item.step_order,
      content_type: item.content_type,
      title: item.title,
      payload: item.payload,
      text_content: item.content_type === 'text' ? item.payload : null,
      file_url: item.content_type !== 'text' ? item.payload : null,
      file_name: item.file_name,
      created_at: item.created_at,
    };
    const io = req.app.get('io');
    if (io) io.to('admins').emit('weekly_content_updated', { week: week_number });
    res.status(201).json({ success: true, data: normalizedItem });
  } catch (error) {
    console.error('Error creating weekly content item:', error);
    res.status(500).json({ success: false, message: 'خطا در ثبت مرحله جدید' });
  }
});

/**
 * PUT /api/weekly-content/:id
 * ویرایش مرحله
 */
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = await WeeklyContent.update(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'مرحله پیدا نشد.' });
    }
    const io = req.app.get('io');
    if (io) io.to('admins').emit('weekly_content_updated', { week: updated.week_number });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating weekly content item:', error);
    res.status(500).json({ success: false, message: 'خطا در ویرایش مرحله' });
  }
});

/**
 * DELETE /api/weekly-content/:id
 * حذف مرحله
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await WeeklyContent.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'مرحله پیدا نشد.' });
    }
    const io = req.app.get('io');
    if (io) io.to('admins').emit('weekly_content_updated', { week: deleted.week_number });
    res.json({ success: true, message: 'مرحله با موفقیت حذف شد.', data: deleted });
  } catch (error) {
    console.error('Error deleting weekly content item:', error);
    res.status(500).json({ success: false, message: 'خطا در حذف مرحله' });
  }
});

module.exports = router;

