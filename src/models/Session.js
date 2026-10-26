/**
 * src/models/Session.js
 * مدل کار با دیتابیس برای جلسات (Sessions) در MySQL
 */

const { query } = require('../db/pool');
const { generateUniqueSessionCode } = require('../utils/codeGenerator');

class Session {
  /**
   * یافتن جلسه با شناسه
   * @param {number} id
   */
  static async findById(id) {
    const res = await query(
      `SELECT s.*, a.display_name as assigned_admin_name
       FROM sessions s
       LEFT JOIN admins a ON s.assigned_admin_id = a.id
       WHERE s.id = ?`,
      [id]
    );
    const session = res.rows[0] || null;
    if (session && !session.teacher_phone) {
      try {
        const tRes = await query('SELECT phone FROM teachers WHERE session_id = ? ORDER BY id DESC LIMIT 1', [session.id]);
        if (tRes.rows && tRes.rows.length > 0 && tRes.rows[0].phone) {
          session.teacher_phone = tRes.rows[0].phone;
        }
      } catch (_) {}
    }
    return session;
  }

  /**
   * یافتن جلسه با کد ورود چت (chat_code یا code قدیمی)
   * @param {string} code
   */
  static async findByCode(code) {
    const res = await query(
      `SELECT s.*, a.display_name as assigned_admin_name
       FROM sessions s
       LEFT JOIN admins a ON s.assigned_admin_id = a.id
       WHERE s.chat_code = ?`,
      [code]
    );
    const session = res.rows[0] || null;
    if (session && !session.teacher_phone) {
      try {
        const tRes = await query('SELECT phone FROM teachers WHERE session_id = ? ORDER BY id DESC LIMIT 1', [session.id]);
        if (tRes.rows && tRes.rows.length > 0 && tRes.rows[0].phone) {
          session.teacher_phone = tRes.rows[0].phone;
        }
      } catch (_) {}
    }
    return session;
  }

  /**
   * یافتن جلسه با کد سفارش/تخفیف (order_code)
   * @param {string} orderCode
   */
  static async findByOrderCode(orderCode) {
    const res = await query(
      `SELECT s.*, a.display_name as assigned_admin_name
       FROM sessions s
       LEFT JOIN admins a ON s.assigned_admin_id = a.id
       WHERE s.order_code = ?`,
      [orderCode]
    );
    return res.rows[0] || null;
  }

  static async claimOrder(id) {
    const res = await query(
      `UPDATE sessions
       SET order_started_at = CURRENT_TIMESTAMP,
           order_expires_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 45 SECOND),
           last_activity_at = CURRENT_TIMESTAMP
       WHERE id = ? AND (order_expires_at IS NULL OR order_expires_at <= CURRENT_TIMESTAMP)`,
      [id]
    );
    return res.affectedRows === 1;
  }

  /**
   * ساخت جلسه جدید
   * @param {Object} data
   * @param {string} [data.name]
   * @param {number} [data.codeLength=6]
   * @param {number} [data.assigned_admin_id]
   */
  static async create({ name, codeLength = 6, assigned_admin_id = null }) {
    // بررسی تعداد جلسات فعال جاری جهت رعایت سقف
    const envVal = parseInt(process.env.MAX_CONCURRENT_SESSIONS, 10);
    // اگر مقدار در .env کمتر از تعداد پیش‌فرض کلاس‌ها (۲۲) باشد یا تعریف نشده باشد، سقف را ۱۰۰ در نظر می‌گیریم
    const maxSessions = (!isNaN(envVal) && envVal > 25) ? envVal : 100;

    if (maxSessions > 0) {
      const activeCountRes = await query("SELECT COUNT(*) as count FROM sessions WHERE status IN ('waiting', 'active')");
      const activeCount = parseInt(activeCountRes.rows[0].count, 10);

      if (activeCount >= maxSessions) {
        const error = new Error(`حداکثر تعداد جلسات همزمان مجاز (${maxSessions}) تکمیل شده است.`);
        error.statusCode = 400;
        throw error;
      }
    }

    const orderCode = await generateUniqueSessionCode(codeLength);
    const chatCode = await generateUniqueSessionCode(codeLength);
    const sessionName = name || `دستیاران کارآگاه - جلسه ${orderCode}`;

    const res = await query(
      `INSERT INTO sessions (code, order_code, chat_code, name, status, assigned_admin_id, active_case)
       VALUES (?, ?, ?, ?, 'waiting', ?, 'village')`,
      [chatCode, orderCode, chatCode, sessionName, assigned_admin_id]
    );

    await Session.setCaseStatus(res.insertId, 'village', 'active');
    await Session.setCaseStatus(res.insertId, 'syndrome', 'locked');
    await Session.setCaseStatus(res.insertId, 'court', 'locked');

    return await Session.findById(res.insertId);
  }

  /**
   * دریافت تمامی جلسات (مخصوص ادمین)
   */
  static async findAll() {
    const res = await query(
      `SELECT s.*, a.display_name as assigned_admin_name,
              (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id AND m.is_read = 0 AND m.sender_type = 'user') as unread_count
       FROM sessions s
       LEFT JOIN admins a ON s.assigned_admin_id = a.id
       ORDER BY s.last_activity_at DESC`
    );
    const sessions = res.rows;
    for (let s of sessions) {
      if (!s.teacher_phone) {
        try {
          const tRes = await query('SELECT phone FROM teachers WHERE session_id = ? ORDER BY id DESC LIMIT 1', [s.id]);
          if (tRes.rows && tRes.rows.length > 0 && tRes.rows[0].phone) {
            s.teacher_phone = tRes.rows[0].phone;
          }
        } catch (_) {}
      }
      const c = await query(`SELECT * FROM session_cases WHERE session_id = ?`, [s.id]);
      s.cases = c.rows;
    }
    return sessions;
  }

    /**
   * ویرایش کلی جلسه (نام، وضعیت، پرونده فعال)
   * @param {number} id
   * @param {Object} data
   */
  static async update(id, { name, status, active_case, teacher_phone }) {
    await query(
      `UPDATE sessions
       SET name = COALESCE(?, name),
           status = COALESCE(?, status),
           active_case = COALESCE(?, active_case),
           updated_at = CURRENT_TIMESTAMP,
           last_activity_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name || null, status || null, active_case || null, id]
    );
    if (teacher_phone !== undefined && teacher_phone !== null) {
      const cleanPhone = String(teacher_phone).trim().replace(/[^0-9]/g, '');
      if (cleanPhone.length >= 10) {
        await Session.bindTeacherPhone(id, cleanPhone);
      }
    }
    return await Session.findById(id);
  }

/**
   * حذف کامل جلسه و تمامی داده‌های مرتبط (پیام‌ها، لاگ‌ها، پرونده‌ها)
   * @param {number} id
   */
  static async delete(id) {
    const session = await Session.findById(id);
    if (!session) return null;
    await query(`DELETE FROM messages WHERE session_id = ?`, [id]);
    await query(`DELETE FROM session_logs WHERE session_id = ?`, [id]);
    await query(`DELETE FROM session_cases WHERE session_id = ?`, [id]);
    await query(`DELETE FROM session_assistants WHERE session_id = ?`, [id]);
    await query(`DELETE FROM sessions WHERE id = ?`, [id]);
    return session;
  }

  /**
   * بروزرسانی وضعیت جلسه
   * @param {number} id
   * @param {string} status ('waiting' | 'active' | 'completed' | 'archived')
   */
  static async updateStatus(id, status) {
    await query(
      `UPDATE sessions
       SET status = ?, updated_at = CURRENT_TIMESTAMP, last_activity_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, id]
    );
    return await Session.findById(id);
  }

  /**
   * بروزرسانی زمان آخرین فعالیت جلسه
   * @param {number} id
   */
  static async updateLastActivity(id) {
    await query(
      `UPDATE sessions
       SET last_activity_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [id]
    );
  }

  /**
   * تخصیص ادمین به جلسه
   * @param {number} sessionId
   * @param {number} adminId
   */
  static async assignAdmin(sessionId, adminId) {
    await query(
      `UPDATE sessions
       SET assigned_admin_id = ?, status = 'active', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [adminId, sessionId]
    );
    return await Session.findById(sessionId);
  }

  static async setActiveCase(sessionId, caseKey) {
    await query(
      `UPDATE sessions
       SET active_case = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [caseKey, sessionId]
    );
    return await Session.findById(sessionId);
  }

  static async getCaseStatuses(sessionId) {
    const res = await query(
      `SELECT * FROM session_cases WHERE session_id = ?`,
      [sessionId]
    );
    return res.rows;
  }

  static async setCaseStatus(sessionId, caseKey, status) {
    await query(
      `INSERT INTO session_cases (session_id, case_key, status, started_at) 
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE status = VALUES(status), completed_at = IF(VALUES(status) = 'solved', CURRENT_TIMESTAMP, completed_at)`,
      [sessionId, caseKey, status]
    );
  }

  /**
   * تغییر وضعیت قفل بودن چت جلسه توسط پشتیبان
   * @param {number} sessionId
   * @param {boolean} isLocked
   */
  static async setChatLock(sessionId, isLocked) {
    const lockVal = isLocked ? 1 : 0;
    await query(
      `UPDATE sessions
       SET is_chat_locked = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [lockVal, sessionId]
    );
    return await Session.findById(sessionId);
  }

  /**
   * بررسی قفل بودن چت
   * @param {number} sessionId
   */
  static async isChatLocked(sessionId) {
    const res = await query(
      `SELECT is_chat_locked FROM sessions WHERE id = ?`,
      [sessionId]
    );
    return Boolean(res.rows[0] && res.rows[0].is_chat_locked);
  }

  /**
   * متصل کردن شماره همراه مدرس به جلسه
   * @param {number} sessionId
   * @param {string} phone
   */
  static async bindTeacherPhone(sessionId, phone) {
    const cleanPhone = String(phone || '').trim().replace(/[^0-9]/g, '');
    await query(
      `UPDATE sessions
       SET teacher_phone = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [cleanPhone, sessionId]
    );
    return await Session.findById(sessionId);
  }

  /**
   * یافتن جلسه فعال بر اساس شماره تلفن مدرس
   * @param {string} phone
   */
  static async findByTeacherPhone(phone) {
    const cleanPhone = String(phone || '').trim().replace(/[^0-9]/g, '');
    const res = await query(
      `SELECT * FROM sessions
       WHERE teacher_phone = ? AND status IN ('waiting', 'active')
       ORDER BY last_activity_at DESC
       LIMIT 1`,
      [cleanPhone]
    );
    return res.rows[0] || null;
  }

  /**
   * تغییر وضعیت قفل گاوصندوق جلسه و تعیین هفته هدف
   * @param {number} sessionId
   * @param {boolean} isUnlocked
   * @param {number} [targetWeek=5]
   */
  static async setVaultLock(sessionId, isUnlocked, targetWeek = 5) {
    const lockVal = isUnlocked ? 1 : 0;
    const weekVal = parseInt(targetWeek, 10) || 5;
    await query(
      `UPDATE sessions
       SET is_vault_unlocked = ?, vault_target_week = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [lockVal, weekVal, sessionId]
    );
    return await Session.findById(sessionId);
  }

  /**
   * بررسی وضعیت قفل گاوصندوق جلسه
   * @param {number} sessionId
   */
  static async getVaultStatus(sessionId) {
    const res = await query(
      `SELECT is_vault_unlocked, vault_target_week FROM sessions WHERE id = ?`,
      [sessionId]
    );
    if (!res.rows[0]) return { isUnlocked: false, targetWeek: 5 };
    return {
      isUnlocked: Boolean(res.rows[0].is_vault_unlocked),
      targetWeek: res.rows[0].vault_target_week || 5,
    };
  }

  /**
   * تغییر وضعیت قفل گاوصندوق به صورت همگانی برای تمامی جلسات
   * @param {boolean} isUnlocked
   * @param {number} [targetWeek=5]
   */
  static async setGlobalVaultLock(isUnlocked, targetWeek = 5) {
    const lockVal = isUnlocked ? 1 : 0;
    const weekVal = parseInt(targetWeek, 10) || 5;
    await query(
      `UPDATE sessions
       SET is_vault_unlocked = ?, vault_target_week = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id > 0`,
      [lockVal, weekVal]
    );
    return { isUnlocked: Boolean(lockVal), targetWeek: weekVal };
  }

  /**
   * بررسی وضعیت کلی قفل گاوصندوق برای تمامی جلسات
   */
  static async getGlobalVaultStatus() {
    const res = await query(
      `SELECT id, is_vault_unlocked, vault_target_week FROM sessions`
    );
    const sessions = res.rows || [];
    const total = sessions.length;
    const unlockedCount = sessions.filter(s => Boolean(s.is_vault_unlocked)).length;
    const isUnlocked = total > 0 && unlockedCount === total;
    return {
      isUnlocked,
      total,
      unlockedCount,
      hasAnyUnlocked: unlockedCount > 0,
      targetWeek: sessions[0]?.vault_target_week || 5,
    };
  }
}

/**
 * تغییر وضعیت نفوذ سایبری مزداک برای یک جلسه (کلاس)
 * @param {number} sessionId
 * @param {boolean} isHacked
 */
Session.setHackState = async function(sessionId, isHacked) {
  const hackVal = isHacked ? 1 : 0;
  const hackedAt = isHacked ? new Date() : null;
  await query(
    `UPDATE sessions
     SET is_hacked = ?, hacked_at = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [hackVal, hackedAt, sessionId]
  );
  return await Session.findById(sessionId);
};

/**
 * بررسی وضعیت نفوذ سایبری جلسه
 * @param {number} sessionId
 */
Session.isHacked = async function(sessionId) {
  const res = await query(
    `SELECT is_hacked, hacked_at FROM sessions WHERE id = ?`,
    [sessionId]
  );
  if (!res.rows[0]) return false;
  return Boolean(res.rows[0].is_hacked);
};

module.exports = Session;
