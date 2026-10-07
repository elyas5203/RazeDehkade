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

    return res.json({
      success: true,
      registered: true,
      message: 'شماره مدرس تایید شد.',
      data: {
        phone: cleanPhone,
        sessionName: session ? session.name : (teacher ? teacher.session_name : null),
        chatCode: session ? (session.chat_code || session.code) : (teacher ? teacher.chat_code : null),
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

