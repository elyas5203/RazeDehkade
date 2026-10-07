/**
 * src/utils/codeGenerator.js
 * ابزار تولید کد عددی ۶ یا ۸ رقمی یونیک برای ورود کاربر به جلسه
 */

const { query } = require('../db/pool');

/**
 * تولید یک کد عددی تصادفی به طول مشخص (۶ یا ۸ رقم)
 * @param {number} length - طول کد (۶ یا ۸)
 * @returns {string} - کد عددی
 */
function generateRandomCode(length = 6) {
  const digits = '0123456789';
  let code = '';
  // اولین رقم ترجیحاً غیرصفر باشد تا طول کد ثابت بماند
  code += Math.floor(Math.random() * 9 + 1).toString();
  for (let i = 1; i < length; i++) {
    code += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return code;
}

/**
 * تولید کد عددی یونیک ۶ یا ۸ رقمی که در جدول sessions وجود نداشته باشد
 * @param {number} length - طول کد (۶ یا ۸ رقم)
 * @returns {Promise<string>}
 */
async function generateUniqueSessionCode(length = 6) {
  let isUnique = false;
  let code = '';
  let attempts = 0;
  const maxAttempts = 50;

  while (!isUnique && attempts < maxAttempts) {
    attempts++;
    code = generateRandomCode(length);
    const existing = await query('SELECT id FROM sessions WHERE code = ? OR order_code = ? OR chat_code = ?', [code, code, code]);
    if (existing.rows.length === 0) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    // اگر بعد ۵۰ بار کد ۶ رقمی پیدا نشد، به کد ۸ رقمی سوییچ می‌کنیم
    return generateUniqueSessionCode(8);
  }

  return code;
}

module.exports = {
  generateRandomCode,
  generateUniqueSessionCode,
};
