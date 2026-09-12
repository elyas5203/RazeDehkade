/**
 * src/routes/auth.js
 * مسیرهای مربوط به ورود ادمین و ورود کاربر با کد جلسه
 */

const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Session = require('../models/Session');
const SessionLog = require('../models/SessionLog');
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
      display_name: admin.display_name,
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

    const session = await Session.findByCode(String(code).trim());
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'جلسه‌ای با این کد یافت نشد.',
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
    }

    // ثبت لاگ ورود کاربر
    await SessionLog.log(session.id, 'user_join', `کاربر با کد ${code} وارد جلسه شد.`);

    // ساخت توکن کاربر
    const token = generateToken({
      sessionId: session.id,
      sessionCode: session.code,
      role: 'user',
      name: session.name,
    });

    return res.json({
      success: true,
      message: 'ورود موفق به جلسه',
      data: {
        token,
        session: {
          id: session.id,
          code: session.code,
          name: session.name,
          status: session.status,
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

module.exports = router;
