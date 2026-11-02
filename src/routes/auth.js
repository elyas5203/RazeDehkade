/**
 * src/routes/auth.js
 * مسیرهای مربوط به ورود ادمین و ورود کاربر با کد جلسه
 */

const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Session = require('../models/Session');
const SessionLog = require('../models/SessionLog');
const Teacher = require('../models/Teacher');
const { generateToken } = require('../middleware/auth');
const { query } = require('../db/pool');
const recoveryLive = require('../services/recoveryLiveStore');
const normalizedPhone = value => String(value || '').replace(/\D/g, '').replace(/^98(?=9\d{9}$)/, '0').replace(/^9(?=\d{9}$)/, '09');

/**
 * POST /api/auth/admin/login
 * ورود ادمین با نام کاربری و رمز عبور
 */
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'نام کاربری و رمز عبور الزامی است.',
      });
    }

    const admin = await Admin.findByUsername(username);
    if (!admin || !admin.is_active) {
      return res.status(401).json({
        success: false,
        message: 'نام کاربری یا رمز عبور اشتباه است.',
      });
    }

    const isValid = await Admin.verifyPassword(password, admin.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'نام کاربری یا رمز عبور اشتباه است.',
      });
    }

    // ساخت توکن ادمین
    const token = generateToken({
      id: admin.id,
      username: admin.username,
      role: 'admin',
    });

    return res.json({
      success: true,
      message: 'ورود موفقیت‌آمیز ادمین',
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          display_name: admin.display_name,
        },
      },
    });
  } catch (error) {
    console.error('Error in admin login:', error);
    return res.status(500).json({
      success: false,
      message: 'خطای سرور هنگام ورود ادمین',
    });
  }
});

/**
 * POST /api/auth/user/join
 * ورود کاربر (دستیاران کارآگاه) با کد ۶ یا ۸ رقمی جلسه
 */
router.post('/user/join', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'کد ورود جلسه الزامی است.',
      });
    }

    const normalizedCode = String(code).trim();
    const session = await Session.findByCode(normalizedCode);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'کد روی بسته اشتباه است.',
      });
    }

    if (session.status === 'completed' || session.status === 'archived') {
      return res.status(400).json({
        success: false,
        message: 'این جلسه به پایان رسیده یا آرشیو شده است.',
      });
    }

    const liveRun = await recoveryLive.active(session.id);
    if (liveRun) {
      const phone = normalizedPhone(req.body.phone);
      const registered = await Session.findByTeacherPhone(phone);
      if (!phone || Number(registered?.id) !== Number(session.id)) {
        return res.status(403).json({ success: false, message: 'شماره و کد به یک کلاس تعلق ندارند.' });
      }
      const token = generateToken({ sessionId: session.id, sessionCode: session.chat_code || session.code,
        role: 'user', name: 'دستیاران کارآگاه', activeCase: session.active_case, recoveryRunId: liveRun.id });
      return res.json({ success: true, redirectUrl: '/chat.html', recoveryLive: true,
        data: { token, session: { id: session.id, code: session.chat_code || session.code,
          name: session.name, is_hacked: session.is_hacked ? 1 : 0, recovery_phase: 'LIVE', recovery_run_id: liveRun.id } } });
    }

    // اگر کلاس مورد حمله سایبری مزداک قرار گرفته باشد، دسترسی به چت مسدود است و باید به درگاه احراز هویت اضطراری هدایت شوند
    if (session.is_hacked) {
      const recoveryResult = await query('SELECT phase FROM session_recovery WHERE session_id = ?', [session.id]);
      const recoveryPhase = recoveryResult.rows[0]?.phase || 'DORMANT';
      const token = generateToken({
        sessionId: session.id,
        sessionCode: session.chat_code || session.code,
        role: 'user',
        name: 'دستیاران کارآگاه',
        activeCase: session.active_case,
      });

      return res.status(403).json({
        success: false,
        isHacked: true,
        message: '⚠️ هشدار فوق‌امنیتی: این پایگاه تحت نفوذ سایبری دشمن قرار گرفته و تمام دسترسی‌ها مسدود است! برای نجات پرونده فوراً به درگاه احراز هویت امنیتی مراجعه کنید.',
        redirectUrl: recoveryPhase === 'DORMANT' ? '/emergency-auth.html' : '/chat.html',
        sessionName: session.name,
        data: {
          token,
          session: {
            id: session.id,
            code: session.chat_code || session.code,
            name: session.name,
            is_hacked: 1,
            recovery_phase: recoveryPhase
          }
        }
      });
    }

    // اگر وضعیت جلسه waiting بود، به active تغییر دهیم
    if (session.status === 'waiting') {
      await Session.updateStatus(session.id, 'active');
      session.status = 'active';
    }
    const caseStatuses = await Session.getCaseStatuses(session.id);

    // اگر شماره مدرس ارسال شده باشد، به این جلسه متصل شود
    if (req.body.phone) {
      const cleanPhone = String(req.body.phone).trim().replace(/[^0-9]/g, '');
      if (cleanPhone.length >= 10) {
        await Session.bindTeacherPhone(session.id, cleanPhone);
      }
    }

    // ثبت لاگ ورود کاربر
    await SessionLog.log(session.id, 'user_join', `کاربر با کد ${code} وارد جلسه شد.`);

    // ساخت توکن کاربر
    const token = generateToken({
      sessionId: session.id,
      sessionCode: session.chat_code || session.code,
      role: 'user',
      name: 'دستیاران کارآگاه',
      activeCase: session.active_case,
    });

    return res.json({
      success: true,
      message: 'ورود موفق به جلسه',
      data: {
        token,
        session: {
          id: session.id,
          code: session.chat_code || session.code,
          name: 'دستیاران کارآگاه',
          status: session.status,
          active_case: session.active_case,
          cases: caseStatuses,
        },
      },
    });
  } catch (error) {
    console.error('Error in user join:', error);
    return res.status(500).json({
      success: false,
      message: 'خطای سرور هنگام ورود به جلسه',
    });
  }
});

/**
 * POST /api/auth/teacher/check
 * بررسی شماره موبایل مدرس در هفته‌های بعدی جهت ورود مستقیم به جلسه
 */
router.post('/teacher/check', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'شماره تلفن همراه الزامی است.',
      });
    }

    const cleanPhone = String(phone).trim().replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'فرمت شماره تلفن واردشده صحیح نیست.',
      });
    }

    const teacher = await Teacher.findByPhone(cleanPhone);
    const session = await Session.findByTeacherPhone(cleanPhone);

    if (!teacher && !session) {
      return res.status(404).json({
        success: false,
        registered: false,
        message: 'این شماره تلفن ثبت‌نام نشده است. لطفاً ابتدا از طریق ثبت‌نام اقدام نمایید.',
      });
    }

    const targetSession = session || (teacher?.session_id ? await Session.findById(teacher.session_id) : null);
    const isHacked = Boolean(targetSession && targetSession.is_hacked);
    const recoveryResult = isHacked ? await query('SELECT phase FROM session_recovery WHERE session_id = ?', [targetSession.id]) : { rows: [] };
    const recoveryPhase = recoveryResult.rows[0]?.phase || 'DORMANT';

    const liveRun = targetSession ? await recoveryLive.active(targetSession.id) : null;
    if (liveRun) {
      const token = generateToken({
        sessionId: targetSession.id,
        sessionCode: targetSession.chat_code || targetSession.code,
        role: 'user',
        name: 'دستیاران کارآگاه',
        activeCase: targetSession.active_case,
        recoveryRunId: liveRun.id
      });
      return res.json({
        success: true,
        registered: true,
        isHacked: true,
        recoveryLive: true,
        redirectUrl: '/chat.html',
        message: 'شماره تأیید شد. در حال انتقال به خط بازپس‌گیری کلاس…',
        data: {
          token,
          phone: cleanPhone,
          sessionName: targetSession.name,
          chatCode: targetSession.chat_code || targetSession.code,
          session: {
            id: targetSession.id,
            code: targetSession.chat_code || targetSession.code,
            name: targetSession.name,
            is_hacked: 1,
            recovery_phase: 'LIVE',
            recovery_run_id: liveRun.id
          }
        }
      });
    }

    // اگر کلاس مورد حمله سایبری مزداک قرار گرفته باشد، مستقیم به درگاه احراز هویت اضطراری هدایت شوند
    if (isHacked && targetSession) {
      const token = generateToken({
        sessionId: targetSession.id,
        sessionCode: targetSession.chat_code || targetSession.code,
        role: 'user',
        name: 'دستیاران کارآگاه',
        activeCase: targetSession.active_case,
      });

      return res.json({
        success: true,
        registered: true,
        isHacked: true,
        recoveryLive: false,
        redirectUrl: '/emergency-auth.html',
        message: '⚠️ هشدار فوق‌امنیتی: کلاس شما تحت نفوذ سایبری است. در حال انتقال مستقیم به درگاه احراز هویت اضطراری...',
        data: {
          token,
          phone: cleanPhone,
          sessionName: targetSession.name,
          chatCode: targetSession.chat_code || targetSession.code,
          session: {
            id: targetSession.id,
            code: targetSession.chat_code || targetSession.code,
            name: targetSession.name,
            is_hacked: 1,
            recovery_phase: 'DORMANT'
          }
        }
      });
    }

    return res.json({
      success: true,
      registered: true,
      isHacked: false,
      message: 'شماره مدرس تایید شد.',
      data: {
        phone: cleanPhone,
        sessionName: targetSession ? targetSession.name : (teacher ? teacher.session_name : null),
        chatCode: targetSession ? (targetSession.chat_code || targetSession.code) : (teacher ? teacher.chat_code : null),
      },
    });
  } catch (error) {
    console.error('Error in teacher check:', error);
    return res.status(500).json({
      success: false,
      message: 'خطای سرور هنگام بررسی شماره مدرس',
    });
  }
});

module.exports = router;

