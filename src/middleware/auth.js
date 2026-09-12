/**
 * src/middleware/auth.js
 * میدلورهای احراز هویت با JWT
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_detective_game_2025';

/**
 * تولید توکن JWT برای ادمین یا کاربر جلسه
 * @param {Object} payload
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
}

/**
 * بررسی توکن و احراز هویت عمومی
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'توکن احراز هویت ارسال نشده است.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'توکن نامعتبر یا منقضی شده است.' });
    }
    req.user = user;
    next();
  });
}

/**
 * میدلور مخصوص بررسی دسترسی ادمین
 */
function requireAdmin(req, res, next) {
  authenticateToken(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ success: false, message: 'دسترسی غیرمجاز. فقط ادمین اجازه دسترسی دارد.' });
    }
  });
}

module.exports = {
  generateToken,
  authenticateToken,
  requireAdmin,
  JWT_SECRET,
};
