/**
 * src/routes/cannedResponses.js
 * مسیرهای مدیریت پیام‌های آماده (Canned Responses)
 */

const express = require('express');
const router = express.Router();
const CannedResponse = require('../models/CannedResponse');
const { requireAdmin } = require('../middleware/auth');

// تمامی این مسیرها نیاز به دسترسی ادمین دارند
router.use(requireAdmin);

/**
 * GET /api/canned-responses
 * دریافت لیست پیام‌های آماده
 */
router.get('/', async (req, res) => {
  try {
    const responses = await CannedResponse.findAll(req.user.id);
    return res.json({
      success: true,
      data: responses,
    });
  } catch (error) {
    console.error('Error fetching canned responses:', error);
    return res.status(500).json({
      success: false,
      message: 'خطای سرور هنگام دریافت پیام‌های آماده',
    });
  }
});

/**
 * POST /api/canned-responses
 * ایجاد پیام آماده جدید
 */
router.post('/', async (req, res) => {
  try {
    const { title, content, sort_order } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'عنوان و متن پیام آماده الزامی است.',
      });
    }

    const newResponse = await CannedResponse.create({
      admin_id: req.user.id,
      title,
      content,
      sort_order: sort_order || 0,
    });

    return res.status(201).json({
      success: true,
      message: 'پیام آماده با موفقیت ایجاد شد.',
      data: newResponse,
    });
  } catch (error) {
    console.error('Error creating canned response:', error);
    return res.status(500).json({
      success: false,
      message: 'خطای سرور هنگام ایجاد پیام آماده',
    });
  }
});

/**
 * PUT /api/canned-responses/:id
 * ویرایش پیام آماده
 */
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { title, content, sort_order } = req.body;

    const updated = await CannedResponse.update(id, { title, content, sort_order });
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'پیام آماده مورد نظر یافت نشد.',
      });
    }

    return res.json({
      success: true,
      message: 'پیام آماده با موفقیت بروزرسانی شد.',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating canned response:', error);
    return res.status(500).json({
      success: false,
      message: 'خطای سرور هنگام ویرایش پیام آماده',
    });
  }
});

/**
 * DELETE /api/canned-responses/:id
 * حذف پیام آماده
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await CannedResponse.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'پیام آماده مورد نظر یافت نشد.',
      });
    }

    return res.json({
      success: true,
      message: 'پیام آماده با موفقیت حذف شد.',
      data: deleted,
    });
  } catch (error) {
    console.error('Error deleting canned response:', error);
    return res.status(500).json({
      success: false,
      message: 'خطای سرور هنگام حذف پیام آماده',
    });
  }
});

module.exports = router;
