/**
 * src/routes/sessions.js
 * مسیرهای مربوط به مدیریت جلسات و پیام‌های جلسه
 */

const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Message = require('../models/Message');
const SessionLog = require('../models/SessionLog');
const SessionAssistant = require('../models/SessionAssistant');
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
        is_vault_unlocked: Boolean(session && session.is_vault_unlocked),
        vault_target_week: (session && session.vault_target_week) || 5,
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

    const io = req.app.get('io');
    if (io) {
      io.to(`session_${sessionId}`).emit('case_status_updated', {
        sessionId,
        active_case: session?.active_case,
        cases: caseStatuses,
      });
      io.to('admins').emit('case_status_updated', {
        sessionId,
        active_case: session?.active_case,
        cases: caseStatuses,
      });
      io.to('admins').emit('session_updated', {
        sessionId,
        active_case: session?.active_case,
        cases: caseStatuses,
      });
    }

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
    const { name, status, active_case, teacher_phone } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'شناسه جلسه معتبر نیست.' });
    }

    const updatedSession = await Session.update(sessionId, { name, status, active_case, teacher_phone });
    if (!updatedSession) {
      return res.status(404).json({ success: false, message: 'جلسه پیدا نشد.' });
    }

    if (teacher_phone !== undefined) {
      const cleanPhone = teacher_phone ? String(teacher_phone).trim().replace(/[^0-9]/g, '') : null;
      await Session.bindTeacherPhone(sessionId, cleanPhone);
      if (cleanPhone) {
        const Teacher = require('../models/Teacher');
        await Teacher.registerOrUpdate({
          phone: cleanPhone,
          full_name: updatedSession.name,
          session_id: sessionId,
        });
      }
    }

    const finalSession = await Session.findById(sessionId);

    const io = req.app.get('io');
    if (io) {
      io.to('admins').emit('session_updated', { sessionId, session: finalSession });
      io.to(`session_${sessionId}`).emit('session_details_updated', { sessionId, session: finalSession });
    }

    return res.json({
      success: true,
      message: 'جلسه با موفقیت ویرایش شد.',
      data: finalSession,
    });
  } catch (error) {
    console.error('Error updating session:', error);
    return res.status(500).json({ success: false, message: 'خطای سرور هنگام ویرایش جلسه' });
  }
});

/**
 * PUT /api/sessions/:id/phone
 * ثبت یا تغییر مستقیم شماره تماس ورود مدرس/کلاس
 */
router.put('/:id/phone', requireAdmin, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'شناسه جلسه معتبر نیست.' });
    }

    const { phone } = req.body;
    const cleanPhone = phone ? String(phone).trim().replace(/[^0-9]/g, '') : null;

    if (cleanPhone && cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'فرمت شماره همراه واردشده صحیح نیست (حداقل ۱۰ رقم).'
      });
    }

    await Session.bindTeacherPhone(sessionId, cleanPhone);
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'جلسه پیدا نشد.' });
    }

    if (cleanPhone) {
      const Teacher = require('../models/Teacher');
      await Teacher.registerOrUpdate({
        phone: cleanPhone,
        full_name: session.name,
        session_id: sessionId,
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to('admins').emit('session_updated', { sessionId, session });
    }

    return res.json({
      success: true,
      message: cleanPhone ? `شماره همراه ${cleanPhone} با موفقیت ثبت شد.` : 'شماره همراه با موفقیت حذف شد.',
      data: {
        sessionId,
        teacher_phone: cleanPhone,
        session,
      },
    });
  } catch (error) {
    console.error('Error updating session phone:', error);
    return res.status(500).json({ success: false, message: 'خطای سرور هنگام ویرایش شماره همراه' });
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

    const io = req.app.get('io');
    if (io) {
      io.to('admins').emit('session_deleted', { sessionId });
      io.to(`session_${sessionId}`).emit('session_terminated', { sessionId });
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
    if (!sessionId || sessionId <= 0) {
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

/**
 * GET /api/sessions/vault-status-all
 * دریافت وضعیت کلی قفل گاوصندوق برای تمامی جلسات (مخصوص ادمین)
 */
/**
 * POST /api/sessions/:id/trigger-hack
 * اجرای سکانس نفوذ سایبری مزداک و قفل کلاس (فقط ادمین)
 */
router.post('/:id/trigger-hack', requireAdmin, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    if (!sessionId || sessionId <= 0) {
      return res.status(400).json({ success: false, message: 'شناسه جلسه معتبر نیست.' });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'جلسه پیدا نشد.' });
    }

    let assistants = [];
    try {
      const SessionAssistant = require('../models/SessionAssistant');
      assistants = await SessionAssistant.findBySessionId(sessionId);
    } catch (_) {}

    await Session.setHackState(sessionId, true);

    await SessionLog.log(
      sessionId,
      'cyber_hack_triggered',
      `سکانس نفوذ سایبری مزداک توسط ${req.user.display_name || req.user.username} فعال شد.`
    );

    const io = req.app.get('io');
    if (io) {
      const payload = {
        sessionId,
        sessionName: session.name,
        triggeredAt: Date.now(),
        hackerName: 'مزداک',
        assistants: assistants.map(a => ({
          name: a.student_name,
          photoUrl: a.file_url,
        })),
      };
      io.to(`session_${sessionId}`).emit('hack_sequence_triggered', payload);
      io.to('admins').emit('session_hack_updated', { sessionId, isHacked: true, sessionName: session.name });
    }

    return res.json({
      success: true,
      message: `سکانس نفوذ سایبری مزداک برای کلاس «${session.name}» با موفقیت فعال گردید.`,
      isHacked: true,
      sessionId,
      data: {
        sessionId,
        is_hacked: 1,
        assistants,
      },
    });
  } catch (error) {
    console.error('Error triggering cyber hack:', error);
    return res.status(500).json({ success: false, message: 'خطای سرور هنگام اجرای نفوذ سایبری' });
  }
});

/**
 * POST /api/sessions/:id/unlock-hack
 * لغو نفوذ و بازگشایی دسترسی عادی کلاس (فقط ادمین)
 */
router.post('/:id/unlock-hack', requireAdmin, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    if (!sessionId || sessionId <= 0) {
      return res.status(400).json({ success: false, message: 'شناسه جلسه معتبر نیست.' });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'جلسه پیدا نشد.' });
    }

    await Session.setHackState(sessionId, false);

    await SessionLog.log(
      sessionId,
      'cyber_hack_unlocked',
      `وضعیت نفوذ سایبری کلاس توسط ${req.user.display_name || req.user.username} لغو و دسترسی آزاد شد.`
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`session_${sessionId}`).emit('hack_cleared', { sessionId });
      io.to('admins').emit('session_hack_updated', { sessionId, isHacked: false, sessionName: session.name });
    }

    return res.json({
      success: true,
      message: `وضعیت نفوذ کلاس «${session.name}» لغو گردید و دسترسی عادی برقرار شد.`,
      isHacked: false,
      sessionId,
      data: {
        sessionId,
        is_hacked: 0,
      },
    });
  } catch (error) {
    console.error('Error unlocking cyber hack:', error);
    return res.status(500).json({ success: false, message: 'خطای سرور هنگام لغو نفوذ سایبری' });
  }
});

router.get('/vault-status-all', requireAdmin, async (req, res) => {
  try {
    const status = await Session.getGlobalVaultStatus();
    return res.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error('Error fetching global vault status:', error);
    return res.status(500).json({ success: false, message: 'خطای سرور هنگام دریافت وضعیت سراسری گاوصندوق.' });
  }
});

/**
 * POST /api/sessions/vault-lock-all
 * بازگشایی یا پلمپ همگانی گاوصندوق برای تمامی جلسات (مخصوص ادمین)
 */
router.post('/vault-lock-all', requireAdmin, async (req, res) => {
  try {
    const targetWeek = parseInt(req.body.week, 10) || 5;
    let isUnlocked = req.body.isUnlocked;
    if (typeof isUnlocked === 'undefined') {
      const current = await Session.getGlobalVaultStatus();
      isUnlocked = !current.isUnlocked;
    } else {
      isUnlocked = Boolean(isUnlocked);
    }

    await Session.setGlobalVaultLock(isUnlocked, targetWeek);

    await SessionLog.log(
      null,
      'global_vault_lock_toggled',
      `قفل همگانی گاوصندوق اسناد محرمانه (هفته ${targetWeek}) توسط ${req.user.display_name || req.user.username} برای تمامی جلسات ${isUnlocked ? '🔓 بازگشایی شد' : '🔒 پلمپ شد'}.`
    );

    const io = req.app.get('io');
    if (io) {
      // ارسال برای تمامی کلاینت‌های متصل، اتاق‌ها و ادمین‌ها
      io.emit('vault_lock_updated', { all: true, isUnlocked, targetWeek });
      io.to('admins').emit('global_vault_lock_updated', { isUnlocked, targetWeek });
      io.to('admins').emit('vault_lock_updated', { all: true, isUnlocked, targetWeek });
    }

    return res.json({
      success: true,
      message: isUnlocked ? 'گاوصندوق اسناد برای تمامی جلسات با موفقیت بازگشایی شد.' : 'گاوصندوق اسناد برای تمامی جلسات با موفقیت پلمپ شد.',
      isUnlocked,
      targetWeek,
    });
  } catch (error) {
    console.error('Error toggling global vault lock:', error);
    return res.status(500).json({ success: false, message: 'خطای سرور هنگام تغییر وضعیت همگانی گاوصندوق.' });
  }
});

/**
 * POST /api/sessions/:id/vault-lock
 * تغییر وضعیت قفل گاوصندوق برای جلسه مشخص (فقط ادمین)
 */
router.post('/:id/vault-lock', requireAdmin, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    if (!sessionId || sessionId <= 0) {
      return res.status(400).json({ success: false, message: 'شناسه جلسه معتبر نیست.' });
    }

    const targetWeek = parseInt(req.body.week, 10) || 5;
    let isUnlocked = req.body.isUnlocked;
    if (typeof isUnlocked === 'undefined') {
      const current = await Session.getVaultStatus(sessionId);
      isUnlocked = !current.isUnlocked;
    } else {
      isUnlocked = Boolean(isUnlocked);
    }

    const session = await Session.setVaultLock(sessionId, isUnlocked, targetWeek);
    if (!session) {
      return res.status(404).json({ success: false, message: 'جلسه پیدا نشد.' });
    }

    await SessionLog.log(
      sessionId,
      'vault_lock_toggled',
      `گاوصندوق اسناد محرمانه (هفته ${targetWeek}) توسط ${req.user.display_name || req.user.username} ${isUnlocked ? '🔓 بازگشایی شد' : '🔒 پلمپ شد'}.`
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`session_${sessionId}`).emit('vault_lock_updated', { sessionId, isUnlocked, targetWeek });
      io.to('admins').emit('vault_lock_updated', { sessionId, isUnlocked, targetWeek });
    }

    return res.json({
      success: true,
      message: isUnlocked ? `گاوصندوق برای هفته ${targetWeek} بازگشایی شد.` : 'گاوصندوق با موفقیت پلمپ شد.',
      isUnlocked,
      targetWeek,
      session,
    });
  } catch (error) {
    console.error('Error toggling vault lock:', error);
    return res.status(500).json({ success: false, message: 'خطای سرور هنگام تغییر وضعیت قفل گاوصندوق.' });
  }
});

/**
 * POST /api/sessions/clear-all-history
 * پاکسازی تاریخچه گفتگو و تخته مدارک تمامی جلسات در سراسر دیتابیس (ادمین)
 */
router.post('/clear-all-history', requireAdmin, async (req, res) => {
  try {
    const deletedCount = await Message.clearAll();
    const io = req.app.get('io');
    if (io) {
      io.emit('chat_cleared', { all: true });
      io.to('admins').emit('chat_cleared', { all: true });
    }

    return res.json({
      success: true,
      message: `تمامی پیام‌های چت و تخته مدارک در تمام جلسات با موفقیت پاکسازی شدند (${deletedCount} پیام).`,
      deletedCount,
    });
  } catch (error) {
    console.error('Error clearing all chat history:', error);
    return res.status(500).json({ success: false, message: 'خطای سرور هنگام پاکسازی سراسری تاریخچه چت.' });
  }
});

/**
 * POST /api/sessions/:id/clear-history
 * پاکسازی کامل تاریخچه گفتگو و تخته مدارک یک جلسه مشخص (ادمین)
 */
router.post('/:id/clear-history', requireAdmin, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'شناسه جلسه معتبر نیست.' });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'جلسه مورد نظر یافت نشد.' });
    }

    const deletedCount = await Message.clearBySessionId(sessionId);
    await SessionLog.log(sessionId, 'chat_cleared', `تاریخچه چت جلسه توسط ${req.user.display_name || req.user.username} پاکسازی شد (${deletedCount} پیام).`);

    const io = req.app.get('io');
    if (io) {
      io.to(`session_${sessionId}`).emit('chat_cleared', { sessionId });
      io.to('admins').emit('chat_cleared', { sessionId });
      io.to('admins').emit('session_updated', { sessionId, unread_count: 0 });
    }

    return res.json({
      success: true,
      message: `تاریخچه گفتگو و تخته مدارک جلسه ${session.name || sessionId} با موفقیت پاکسازی شد (${deletedCount} پیام).`,
      deletedCount,
      sessionId,
    });
  } catch (error) {
    console.error('Error clearing session chat history:', error);
    return res.status(500).json({ success: false, message: 'خطای سرور هنگام پاکسازی تاریخچه چت.' });
  }
});

/**
 * GET /api/sessions/:id/assistants
 * دریافت لیست عکس‌های دستیاران کارآگاه یک جلسه (مخصوص کاربر همان جلسه یا ادمین)
 */
router.get('/:id/assistants', authenticateToken, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'شناسه جلسه معتبر نیست.' });
    }

    if (req.user.role !== 'admin' && Number(req.user.sessionId) !== sessionId) {
      return res.status(403).json({
        success: false,
        message: 'دسترسی غیرمجاز به لیست دستیاران این جلسه.',
      });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'جلسه پیدا نشد.' });
    }

    const assistants = await SessionAssistant.findBySessionId(sessionId);

    return res.json({
      success: true,
      sessionName: session.name,
      sessionId: session.id,
      count: assistants.length,
      data: assistants,
    });
  } catch (error) {
    console.error('Error fetching session assistants:', error);
    return res.status(500).json({
      success: false,
      message: 'خطای سرور هنگام دریافت عکس‌های دستیاران کارآگاه',
    });
  }
});

/**
 * DELETE /api/sessions/:id/assistants/:assistantId
 * حذف تصویر یک دستیار کارآگاه (فقط ادمین)
 */
router.delete('/:id/assistants/:assistantId', requireAdmin, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    const assistantId = parseInt(req.params.assistantId, 10);

    const existing = await SessionAssistant.findById(assistantId);
    if (!existing || Number(existing.session_id) !== sessionId) {
      return res.status(404).json({ success: false, message: 'تصویر دستیار پیدا نشد.' });
    }

    await SessionAssistant.deleteById(assistantId);

    const io = req.app.get('io');
    if (io) {
      io.to(`session_${sessionId}`).emit('assistants_updated', { sessionId });
      io.to('admins').emit('assistants_updated', { sessionId });
    }

    return res.json({
      success: true,
      message: 'تصویر دستیار کارآگاه حذف شد.',
      data: existing,
    });
  } catch (error) {
    console.error('Error deleting assistant photo:', error);
    return res.status(500).json({ success: false, message: 'خطای سرور هنگام حذف تصویر دستیار' });
  }
});

module.exports = router;

