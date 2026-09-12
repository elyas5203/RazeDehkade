/**
 * src/routes/sessions.js
 * مسیرهای مربوط به مدیریت جلسات و پیام‌های جلسه
 */

const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Message = require('../models/Message');
const SessionLog = require('../models/SessionLog');
const { requireAdmin, authenticateToken } = require('../middleware/auth');

/**
 * GET /api/sessions
 * دریافت لیست تمامی جلسات (فقط مخصوص ادمین)
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const sessions = await Session.findAll();
    return res.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return res.status(500).json({
      success: false,
      message: 'خطای سرور هنگام دریافت لیست جلسات',
    });
  }
});

/**
 * POST /api/sessions
 * ساخت جلسه جدید و تولید کد ۶ یا ۸ رقمی یونیک (فقط ادمین)
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, codeLength } = req.body;
    const adminId = req.user.id;

    const newSession = await Session.create({
      name,
      codeLength: codeLength ? parseInt(codeLength, 10) : 6,
      assigned_admin_id: adminId,
    });

    // ثبت لاگ ایجاد جلسه
    await SessionLog.log(newSession.id, 'session_created', `جلسه توسط ادمین ${req.user.username} ساخته شد.`);

    return res.status(201).json({
      success: true,
      message: 'جلسه جدید با موفقیت ساخته شد.',
      data: newSession,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'خطای سرور هنگام ساخت جلسه جدید',
    });
  }
});

/**
 * GET /api/sessions/:id/messages
 * دریافت تاریخچه پیام‌های یک جلسه (ادمین یا کاربر همان جلسه)
 */
router.get('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);

    // اگر کاربر ادمین نباشد، فقط به پیام‌های جلسه خودش دسترسی دارد
    if (req.user.role !== 'admin' && req.user.sessionId !== sessionId) {
      return res.status(403).json({
        success: false,
        message: 'دسترسی غیرمجاز به پیام‌های این جلسه.',
      });
    }

    const messages = await Message.findBySessionId(sessionId);

    // اگر ادمین پیام‌ها را دریافت کرد، پیام‌های کاربر علامت خوانده شده بخورند
    if (req.user.role === 'admin') {
      await Message.markAsRead(sessionId, 'user');
    }

    return res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({
      success: false,
      message: 'خطای سرور هنگام دریافت پیام‌ها',
    });
  }
});

module.exports = router;
