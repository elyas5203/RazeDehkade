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

    const session = await Session.findById(sessionId);

    return res.json({
      success: true,
      data: req.user.role === 'admin' ? messages : messages.filter(message => !(message.sender_type === 'system' && message.sender_id == null && message.content.startsWith('📦 سفارش گل جدید ثبت شد.'))),
      session: {
        id: sessionId,
        is_chat_locked: Boolean(session && session.is_chat_locked),
      },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({
      success: false,
      message: 'خطای سرور هنگام دریافت پیام‌ها',
    });
  }
});


/**
 * PUT /api/sessions/:id/cases
 * Update active case and case statuses
 */
router.put('/:id/cases', requireAdmin, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    const { active_case, cases } = req.body;
    const validCases = new Set(['village', 'syndrome', 'court']);
    const validStatuses = new Set(['locked', 'active', 'solved']);
    if (!sessionId || (active_case !== undefined && !validCases.has(active_case))) {
      return res.status(400).json({ success: false, message: 'پرونده انتخاب‌شده معتبر نیست.' });
    }
    
    if (active_case !== undefined) {
      await Session.setActiveCase(sessionId, active_case);
      await Session.setCaseStatus(sessionId, active_case, 'active');
    }
    
    if (cases && Array.isArray(cases)) {
      for (const c of cases) {
        if (validCases.has(c.case_key) && validStatuses.has(c.status)) {
          await Session.setCaseStatus(sessionId, c.case_key, c.status);
        }
      }
    }
    
    const session = await Session.findById(sessionId);
    const caseStatuses = await Session.getCaseStatuses(sessionId);
    
    return res.json({
      success: true,
      message: 'Cases updated successfully',
      data: {
        ...session,
        cases: caseStatuses
      }
    });
  } catch (error) {
    console.error('Error updating cases:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * PUT /api/sessions/:id
 * ویرایش اطلاعات جلسه (نام، وضعیت، پرونده)
 */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    const { name, status, active_case } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'شناسه جلسه معتبر نیست.' });
    }

    const updatedSession = await Session.update(sessionId, { name, status, active_case });
    if (!updatedSession) {
      return res.status(404).json({ success: false, message: 'جلسه پیدا نشد.' });
    }

    return res.json({
      success: true,
      message: 'جلسه با موفقیت ویرایش شد.',
      data: updatedSession,
    });
  } catch (error) {
    console.error('Error updating session:', error);
    return res.status(500).json({ success: false, message: 'خطای سرور هنگام ویرایش جلسه' });
  }
});

/**
 * DELETE /api/sessions/:id
 * حذف کامل جلسه
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'شناسه جلسه معتبر نیست.' });
    }

    const deleted = await Session.delete(sessionId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'جلسه پیدا نشد.' });
    }

    return res.json({
      success: true,
      message: 'جلسه با موفقیت حذف شد.',
      data: deleted,
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    return res.status(500).json({ success: false, message: 'خطای سرور هنگام حذف جلسه' });
  }
});

/**
 * POST /api/sessions/:id/lock
 * تغییر وضعیت قفل بودن چت جلسه (ادمین)
 */
router.post('/:id/lock', requireAdmin, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'شناسه جلسه معتبر نیست.' });
    }

    let isLocked = req.body.isLocked;
    if (typeof isLocked === 'undefined') {
      const current = await Session.isChatLocked(sessionId);
      isLocked = !current;
    } else {
      isLocked = Boolean(isLocked);
    }

    const session = await Session.setChatLock(sessionId, isLocked);
    if (!session) {
      return res.status(404).json({ success: false, message: 'جلسه پیدا نشد.' });
    }

    await SessionLog.log(
      sessionId,
      'chat_lock_toggled',
      `چت جلسه توسط ${req.user.display_name || req.user.username} ${isLocked ? '🔒 قفل شد' : '🔓 باز شد'}.`
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`session_${sessionId}`).emit('chat_lock_updated', { sessionId, isLocked });
      io.to('admins').emit('chat_lock_updated', { sessionId, isLocked });
      io.to('admins').emit('session_updated', { sessionId, isChatLocked: isLocked });
    }

    return res.json({
      success: true,
      message: isLocked ? 'چت جلسه با موفقیت قفل شد.' : 'چت جلسه با موفقیت باز شد.',
      isLocked,
      session,
    });
  } catch (error) {
    console.error('Error toggling chat lock:', error);
    return res.status(500).json({ success: false, message: 'خطای سرور هنگام تغییر وضعیت قفل چت' });
  }
});

module.exports = router;

