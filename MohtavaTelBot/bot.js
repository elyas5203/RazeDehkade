/**
 * MohtavaTelBot/bot.js
 * سیستم یکپارچه و بازطراحی‌شده بات تلگرام مدیریت محتوا و پیام‌های آماده ۵ هفته سناریو
 * محدود به آیدی عددی ادمین: 5490508090
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const https = require('https');
const { execFile } = require('child_process');
const {
  BOT_TOKEN,
  AUTHORIZED_ADMIN_ID,
  ADMIN_SECRET_KEY,
  UPLOAD_DIR,
  PUBLIC_URL_PREFIX,
  WEEK_NAMES,
} = require('./config');

const WeeklyContent = require('../src/models/WeeklyContent');
const Session = require('../src/models/Session');
const SessionAssistant = require('../src/models/SessionAssistant');
const { matchFolderToSession, extractStudentNameFromFilename } = require('../src/utils/classFolderMatcher');
const { isArchiveFilename } = require('../src/utils/archiveExtractor');
const { query } = require('../src/db/pool');
const { ensureMp4FastStart } = require('../src/utils/mp4FastStart');
const { sendTelegramVideo, processOne } = require('../src/services/emergencyVideoQueue');

// اطمینان از وجود پوشه آپلود هفتگی در سرور
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const STORAGE_DIR = path.resolve(__dirname, '..', 'storage');
const ADMINS_FILE = path.join(STORAGE_DIR, 'telegram_authorized_admins.json');
const GROUPS_FILE = path.join(STORAGE_DIR, 'telegram_authorized_groups.json');

function normalizeAdminPasscode(str = '') {
  return String(str || '')
    .replace(/[۰٠]/g, '0')
    .replace(/[۱١]/g, '1')
    .replace(/[۲٢]/g, '2')
    .replace(/[۳٣]/g, '3')
    .replace(/[۴٤]/g, '4')
    .replace(/[۵٥]/g, '5')
    .replace(/[۶٦]/g, '6')
    .replace(/[۷٧]/g, '7')
    .replace(/[۸٨]/g, '8')
    .replace(/[۹٩]/g, '9')
    .trim()
    .toLowerCase();
}

function isMatchingAdminPasscode(text, secretKey = ADMIN_SECRET_KEY) {
  if (!text) return false;
  const norm = normalizeAdminPasscode(text);
  const secret = normalizeAdminPasscode(secretKey || 'admin_110_59');
  return (
    norm === secret ||
    norm === `/start ${secret}` ||
    norm === `/admin ${secret}`
  );
}

const PID_LOCK_FILE = path.join(__dirname, '.bot.pid');

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg', '.heic']);
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.mkv', '.webm', '.3gp', '.avi']);
const VOICE_EXTS = new Set(['.ogg', '.oga', '.mp3', '.wav', '.m4a', '.aac', '.flac', '.opus']);
const ARCHIVE_EXTS = new Set(['.zip', '.rar', '.7z']);

// کلیدهای کیبورد تلگرام
const BTN_WEEK_1 = '📅 هفته اول';
const BTN_WEEK_2 = '📅 هفته دوم';
const BTN_WEEK_3 = '📅 هفته سوم';
const BTN_WEEK_4 = '📅 هفته چهارم';
const BTN_WEEK_5 = '📅 هفته پنجم';

const BTN_END_WEEK = '✅ پایان هفته';
const BTN_CHANGE_TITLE = '✏️ تغییر عنوان';
const BTN_UNDO_LAST = '↩️ حذف آخرین مرحله';
const BTN_LIST_CURRENT_WEEK = '📋 مراحل این هفته';
const BTN_BACK_MAIN = '🔙 بازگشت به منوی اصلی';

const BTN_VIEW_ALL = '📋 مشاهده محتوای هفته‌ها';
const BTN_CLEAR_ONE_WEEK = '🧹 پاکسازی یک هفته';
const BTN_CLEAR_ALL = '🗑 پاکسازی کل پیام‌های آماده';
const BTN_CONFIRM_CLEAR_ALL = '⚠️ بله، همه پاک شوند';

// کلیدهای بخش عکس دستیاران کارآگاه (کلاس‌ها)
const BTN_ASSISTANTS_MENU = '🕵️‍♂️ عکس دستیاران (کلاس‌ها)';
const BTN_EMERGENCY_VIDEOS = '📹 ویدیوهای احراز هویت';
const BTN_AUTH_STUDENTS_LIST = '👥 اسامی احراز هویت کلاس‌ها';
const BTN_ASSISTANTS_ARCHIVE = '📦 ارسال فایل فشرده (ZIP/RAR) یا لینک';
const BTN_ASSISTANTS_SELECT_CLASS = '🏫 انتخاب کلاس و ارسال عکس‌ها';
const BTN_ASSISTANTS_STATS = '📊 آمار عکس‌های کلاس‌ها';
const BTN_ASSISTANTS_CLEAR_CLASS = '🧹 پاکسازی عکس‌های یک کلاس';
const BTN_ASSISTANTS_LIST_CLASS = '📋 لیست دستیاران این کلاس';
const BTN_ASSISTANTS_CHANGE_CLASS = '🔄 انتخاب کلاس دیگر';

const WEEK_BUTTON_TO_NUM = {
  [BTN_WEEK_1]: 1,
  'هفته اول': 1,
  'هفته ۱': 1,
  'هفته 1': 1,
  [BTN_WEEK_2]: 2,
  'هفته دوم': 2,
  'هفته ۲': 2,
  'هفته 2': 2,
  [BTN_WEEK_3]: 3,
  'هفته سوم': 3,
  'هفته ۳': 3,
  'هفته 3': 3,
  [BTN_WEEK_4]: 4,
  'هفته چهارم': 4,
  'هفته ۴': 4,
  'هفته 4': 4,
  [BTN_WEEK_5]: 5,
  'هفته پنجم': 5,
  'هفته ۵': 5,
  'هفته 5': 5,
};

function getMainMenuKeyboard() {
  return {
    keyboard: [
      [{ text: BTN_ASSISTANTS_MENU }, { text: BTN_EMERGENCY_VIDEOS }],
      [{ text: BTN_AUTH_STUDENTS_LIST }],
      [{ text: BTN_WEEK_1 }, { text: BTN_WEEK_2 }],
      [{ text: BTN_WEEK_3 }, { text: BTN_WEEK_4 }],
      [{ text: BTN_WEEK_5 }, { text: BTN_VIEW_ALL }],
      [{ text: BTN_CLEAR_ONE_WEEK }, { text: BTN_CLEAR_ALL }],
    ],
    resize_keyboard: true,
  };
}

function getAssistantsMenuKeyboard() {
  return {
    keyboard: [
      [{ text: BTN_ASSISTANTS_ARCHIVE }],
      [{ text: BTN_ASSISTANTS_SELECT_CLASS }, { text: BTN_ASSISTANTS_STATS }],
      [{ text: BTN_ASSISTANTS_CLEAR_CLASS }, { text: BTN_BACK_MAIN }],
    ],
    resize_keyboard: true,
  };
}

function getEmergencyVideosKeyboard() {
  return {
    keyboard: [
      [{ text: BTN_AUTH_STUDENTS_LIST }],
      [{ text: '🔄 ارسال مجدد ویدیوها' }],
      [{ text: BTN_BACK_MAIN }],
    ],
    resize_keyboard: true,
  };
}

function getAssistantsClassSelectKeyboard(sessions = [], prefix = '🏫 ') {
  const rows = [];
  const filtered = sessions.filter((s) => String(s.name).trim() !== 'تست سرور');
  for (let i = 0; i < filtered.length; i += 2) {
    const row = [{ text: `${prefix}${filtered[i].name}` }];
    if (filtered[i + 1]) {
      row.push({ text: `${prefix}${filtered[i + 1].name}` });
    }
    rows.push(row);
  }
  rows.push([{ text: BTN_ASSISTANTS_MENU }, { text: BTN_BACK_MAIN }]);
  return {
    keyboard: rows,
    resize_keyboard: true,
  };
}

function getAssistantsReceivingClassKeyboard() {
  return {
    keyboard: [
      [{ text: BTN_ASSISTANTS_LIST_CLASS }, { text: BTN_ASSISTANTS_CHANGE_CLASS }],
      [{ text: BTN_ASSISTANTS_MENU }, { text: BTN_BACK_MAIN }],
    ],
    resize_keyboard: true,
  };
}

function getTitleInputKeyboard() {
  return {
    keyboard: [[{ text: BTN_BACK_MAIN }]],
    resize_keyboard: true,
  };
}

function getReceivingContentKeyboard() {
  return {
    keyboard: [
      [{ text: BTN_CHANGE_TITLE }, { text: BTN_END_WEEK }],
      [{ text: BTN_UNDO_LAST }, { text: BTN_LIST_CURRENT_WEEK }],
    ],
    resize_keyboard: true,
  };
}

function getClearWeekSelectionKeyboard() {
  return {
    keyboard: [
      [{ text: '🧹 پاکسازی هفته اول' }, { text: '🧹 پاکسازی هفته دوم' }],
      [{ text: '🧹 پاکسازی هفته سوم' }, { text: '🧹 پاکسازی هفته چهارم' }],
      [{ text: '🧹 پاکسازی هفته پنجم' }, { text: BTN_BACK_MAIN }],
    ],
    resize_keyboard: true,
  };
}

function getConfirmClearAllKeyboard() {
  return {
    keyboard: [
      [{ text: BTN_CONFIRM_CLEAR_ALL }],
      [{ text: BTN_BACK_MAIN }],
    ],
    resize_keyboard: true,
  };
}

function formatTypeFa(contentType) {
  switch (contentType) {
    case 'text':
      return '💬 متن';
    case 'image':
      return '📷 عکس';
    case 'video':
      return '🎬 فیلم';
    case 'voice':
      return '🎙 صوت / ویس';
    default:
      return '📁 فایل';
  }
}

function defaultBaseTitleForType(contentType) {
  switch (contentType) {
    case 'image':
      return 'عکس';
    case 'video':
      return 'ویدیو';
    case 'voice':
      return 'ویس';
    case 'file':
      return 'فایل';
    default:
      return 'پیام';
  }
}

/**
 * نرمال‌سازی عنوان پایه تا هنگام افزودن شماره، عبارت‌هایی مثل «پیام 1»، «پیام 2» یا «ویدیو 1» ساخته شود
 */
function normalizeBaseTitle(rawTitle) {
  let t = String(rawTitle || '').trim();
  if (!t) return 'پیام';

  if (/^پیام[\s\u200c]*ها$/u.test(t)) return 'پیام';
  if (/^ویدیو[\s\u200c]*ها$/u.test(t)) return 'ویدیو';
  if (/^فیلم[\s\u200c]*ها$/u.test(t)) return 'فیلم';
  if (/^عکس[\s\u200c]*ها$/u.test(t)) return 'عکس';
  if (/^ویس[\s\u200c]*ها$/u.test(t)) return 'ویس';
  if (/^صوت[\s\u200c]*ها$/u.test(t)) return 'صوت';
  if (/^فایل[\s\u200c]*ها$/u.test(t)) return 'فایل';

  t = t.replace(/\s+[0-9۰-۹]+$/u, '').trim();
  return t || 'پیام';
}

/**
 * تشخیص اینکه آیا پیام ارسال‌شده یک «عنوان کوتاه» است یا خودش یک «پیام محتوا/فوروارد شده» است
 */
function isLikelyContentInsteadOfTitle(msg, text) {
  if (!msg) return false;
  if (msg.forward_date || msg.forward_origin || msg.forward_from || msg.forward_from_chat || msg.forward_sender_name) {
    return true;
  }
  if (text && (text.includes('\n') || text.length > 40)) {
    return true;
  }
  return false;
}

/**
 * بررسی اینکه آیا پروسه دیگری روی همین سرور در حال Polling بات تلگرام هست یا خیر
 */
function acquireProcessLock() {
  try {
    if (fs.existsSync(PID_LOCK_FILE)) {
      const existingPid = parseInt(fs.readFileSync(PID_LOCK_FILE, 'utf8').trim(), 10);
      if (existingPid && existingPid !== process.pid) {
        try {
          process.kill(existingPid, 0);
          // پروسه قبلی هنوز زنده است
          return false;
        } catch (_) {
          // پروسه قبلی بسته شده است؛ قفل را می‌گیریم
        }
      }
    }
    fs.writeFileSync(PID_LOCK_FILE, String(process.pid), 'utf8');
    const release = () => {
      try {
        if (fs.existsSync(PID_LOCK_FILE)) {
          const current = parseInt(fs.readFileSync(PID_LOCK_FILE, 'utf8').trim(), 10);
          if (current === process.pid) fs.unlinkSync(PID_LOCK_FILE);
        }
      } catch (_) {}
    };
    process.once('exit', release);
    process.once('SIGINT', () => { release(); process.exit(0); });
    process.once('SIGTERM', () => { release(); process.exit(0); });
    return true;
  } catch (_) {
    return true;
  }
}

class MohtavaTelegramBot {
  /**
   * @param {object} [options]
   * @param {string} [options.token]
   * @param {number} [options.adminId]
   * @param {any} [options.io] - نمونه Socket.io جهت بروزرسانی آنی پنل ادمین
   */
  constructor(options = {}) {
    this.token = options.token || BOT_TOKEN;
    this.adminId = Number(options.adminId || AUTHORIZED_ADMIN_ID);
    this.adminSecretKey = options.adminSecretKey || ADMIN_SECRET_KEY || 'admin_110_59';
    this.io = options.io || null;
    this.apiBase = `https://api.telegram.org/bot${this.token}`;
    this.fileBase = `https://api.telegram.org/file/bot${this.token}`;
    this.offset = 0;
    this.running = false;

    // مجموعه شناسه‌های عددی ادمین‌های مجاز سامانه
    this.authorizedAdminIds = new Set([this.adminId]);
    this.currentUserId = this.adminId;
    this.adminStates = new Map();

    // گروه‌های تلگرام مقصد ارسال مستقیم ویدیوهای احراز هویت
    this.authorizedGroupIds = new Set();
    this.authorizedGroups = new Map();
    this.botId = Number(this.token && this.token.includes(':') ? this.token.split(':')[0] : 8018971290);
    this.botUsername = 'ares_project_bot';

    // وضعیت مکالمه ادمین (همگام با دیتابیس MySQL)
    this.adminState = {
      mode: 'IDLE', // 'IDLE' | 'WAIT_TITLE' | 'WAIT_CONTENT' | 'WAIT_CLEAR_WEEK' | 'WAIT_CONFIRM_CLEAR_ALL'
      week: null,
      currentTitle: '',
      titleCounter: 0,
    };
  }

  /**
   * بارگذاری لیست ادمین‌های تایید شده از فایل JSON محلی و دیتابیس MySQL
   */
  async loadAuthorizedAdmins() {
    this.authorizedAdminIds.add(this.adminId);

    // ۱. بارگذاری از فایل لوکال جهت پایداری مستقل از دیتابیس
    try {
      if (fs.existsSync(ADMINS_FILE)) {
        const raw = fs.readFileSync(ADMINS_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const id = Number(typeof item === 'object' ? item.userId || item.adminId : item);
            if (id && !isNaN(id)) {
              this.authorizedAdminIds.add(id);
            }
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ [MohtavaTelBot] خطا در خواندن فایل ادمین‌ها:', e.message);
    }

    // ۲. بارگذاری از جدول ادمین‌های مجاز در MySQL
    try {
      const res = await query('SELECT admin_id FROM bot_authorized_admins');
      if (res && res.rows && Array.isArray(res.rows)) {
        for (const row of res.rows) {
          const id = Number(row.admin_id);
          if (id && !isNaN(id)) {
            this.authorizedAdminIds.add(id);
          }
        }
      }
    } catch (_) {}

    // ۳. بارگذاری از شناسه‌های موجود در bot_state
    try {
      const resState = await query('SELECT DISTINCT admin_id FROM bot_state');
      if (resState && resState.rows && Array.isArray(resState.rows)) {
        for (const row of resState.rows) {
          const id = Number(row.admin_id);
          if (id && !isNaN(id)) {
            this.authorizedAdminIds.add(id);
          }
        }
      }
    } catch (_) {}
  }

  /**
   * بررسی آیا یک کاربر ادمین مجاز است یا خیر
   */
  isAuthorizedAdmin(userId) {
    const id = Number(userId);
    if (!id || isNaN(id)) return false;
    return id === this.adminId || this.authorizedAdminIds.has(id);
  }

  /**
   * ارتقا و ثبت دائمی هویت کاربر به عنوان ادمین
   */
  async authorizeAdmin(userId, meta = {}) {
    const id = Number(userId);
    if (!id || isNaN(id)) return;

    this.authorizedAdminIds.add(id);

    // ۱. ذخیره در فایل JSON دیسک
    try {
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }
      let list = [];
      if (fs.existsSync(ADMINS_FILE)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8'));
          if (Array.isArray(parsed)) list = parsed;
        } catch (_) {}
      }
      const existing = list.find(item => Number(typeof item === 'object' ? item.userId || item.adminId : item) === id);
      if (!existing) {
        list.push({
          userId: id,
          username: meta.username || null,
          firstName: meta.firstName || '',
          chatId: meta.chatId || null,
          authorizedAt: new Date().toISOString(),
        });
        fs.writeFileSync(ADMINS_FILE, JSON.stringify(list, null, 2), 'utf8');
      }
    } catch (e) {
      console.warn('⚠️ [MohtavaTelBot] خطا در ذخیره فایل ادمین‌ها:', e.message);
    }

    // ۲. ذخیره در دیتابیس MySQL
    try {
      await query(
        `INSERT INTO bot_authorized_admins (admin_id, username, first_name)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE username = VALUES(username), first_name = VALUES(first_name)`,
        [id, meta.username || null, meta.firstName || '']
      );
    } catch (_) {}

    console.log(`🔑 [MohtavaTelBot] کاربر ${id} (${meta.firstName || meta.username || 'بدون نام'}) به عنوان ادمین تایید شد.`);
  }

  /**
   * اطمینان از وجود جدول bot_authorized_groups در دیتابیس
   */
  async ensureGroupsTable() {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS bot_authorized_groups (
          group_id VARCHAR(64) PRIMARY KEY,
          title VARCHAR(255) NULL,
          thread_id VARCHAR(64) NULL,
          registered_by VARCHAR(64) NULL,
          registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } catch (_) {}
  }

  /**
   * بارگذاری لیست گروه‌های مجاز از متغیر محیطی، فایل محلی و دیتابیس MySQL
   */
  async loadAuthorizedGroups() {
    await this.ensureGroupsTable();

    // ۰. متغیر محیطی در صورت وجود
    if (process.env.TELEGRAM_GROUP_ID) {
      const gid = String(process.env.TELEGRAM_GROUP_ID).trim();
      if (gid && /^-?\d+$/.test(gid)) {
        this.authorizedGroupIds.add(gid);
        this.authorizedGroups.set(gid, {
          groupId: gid,
          title: 'گروه متغیر محیطی',
          threadId: process.env.TELEGRAM_GROUP_THREAD_ID ? String(process.env.TELEGRAM_GROUP_THREAD_ID).trim() : null,
        });
      }
    }

    // ۱. خواندن از فایل محلی پایدار
    try {
      if (fs.existsSync(GROUPS_FILE)) {
        const raw = fs.readFileSync(GROUPS_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const gid = String(typeof item === 'object' ? item.groupId || item.chatId || item.id : item);
            if (gid && /^-?\d+$/.test(gid)) {
              this.authorizedGroupIds.add(gid);
              this.authorizedGroups.set(gid, typeof item === 'object' ? item : { groupId: gid });
            }
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ [MohtavaTelBot] خطا در خواندن فایل گروه‌ها:', e.message);
    }

    // ۲. بارگذاری از دیتابیس MySQL
    try {
      const res = await query('SELECT * FROM bot_authorized_groups');
      if (res && res.rows && Array.isArray(res.rows)) {
        for (const row of res.rows) {
          const gid = String(row.group_id);
          if (gid && /^-?\d+$/.test(gid)) {
            this.authorizedGroupIds.add(gid);
            this.authorizedGroups.set(gid, {
              groupId: gid,
              title: row.title || null,
              threadId: row.thread_id || null,
              registeredBy: row.registered_by || null,
              registeredAt: row.registered_at || null,
            });
          }
        }
      }
    } catch (_) {}
  }

  /**
   * بررسی آیا یک شناسه چت متعلق به یک گروه تاییدشده است یا خیر
   */
  isAuthorizedGroup(groupId) {
    const gid = String(groupId);
    return this.authorizedGroupIds.has(gid);
  }

  /**
   * ثبت و تایید دائمی یک گروه برای ارسال مستقیم ویدیوهای احراز هویت
   */
  async authorizeGroup(groupId, meta = {}) {
    const gid = String(groupId);
    if (!gid || !/^-?\d+$/.test(gid)) return;

    const groupRecord = {
      groupId: gid,
      title: meta.title || null,
      threadId: meta.threadId ? String(meta.threadId) : null,
      registeredBy: meta.registeredBy ? String(meta.registeredBy) : null,
      registeredAt: new Date().toISOString(),
    };

    this.authorizedGroupIds.add(gid);
    this.authorizedGroups.set(gid, groupRecord);

    // ۱. ذخیره در فایل JSON دیسک
    try {
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }
      let list = [];
      if (fs.existsSync(GROUPS_FILE)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(GROUPS_FILE, 'utf8'));
          if (Array.isArray(parsed)) list = parsed;
        } catch (_) {}
      }
      const idx = list.findIndex(item => String(typeof item === 'object' ? item.groupId || item.chatId || item.id : item) === gid);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...groupRecord };
      } else {
        list.push(groupRecord);
      }
      fs.writeFileSync(GROUPS_FILE, JSON.stringify(list, null, 2), 'utf8');
    } catch (e) {
      console.warn('⚠️ [MohtavaTelBot] خطا در ذخیره فایل گروه‌ها:', e.message);
    }

    // ۲. ذخیره در دیتابیس MySQL
    try {
      await this.ensureGroupsTable();
      await query(
        `INSERT INTO bot_authorized_groups (group_id, title, thread_id, registered_by)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title = VALUES(title), thread_id = VALUES(thread_id), registered_by = VALUES(registered_by)`,
        [gid, groupRecord.title, groupRecord.threadId, groupRecord.registeredBy]
      );
    } catch (_) {}

    console.log(`📌 [MohtavaTelBot] گروه «${meta.title || gid}» (${gid}) به عنوان مقصد ارسال مستقیم ویدیوها ثبت گردید.`);
  }

  async syncStateFromDb(targetUserId = null) {
    const uid = targetUserId ? Number(targetUserId) : (this.currentUserId || this.adminId);
    let loadedState = null;
    try {
      const res = await query('SELECT * FROM bot_state WHERE admin_id = ?', [uid]);
      if (res && res.rows && res.rows.length > 0) {
        const row = res.rows[0];
        loadedState = {
          mode: row.mode || 'IDLE',
          week: row.active_week ? Number(row.active_week) : null,
          currentTitle: row.base_title || '',
          titleCounter: Number(row.title_counter) || 0,
        };
      }
    } catch (_) {}

    if (loadedState) {
      this.adminState = loadedState;
      this.adminStates.set(uid, { ...loadedState });
    } else if (this.adminStates.has(uid)) {
      this.adminState = { ...this.adminStates.get(uid) };
    } else {
      this.adminState = {
        mode: 'IDLE',
        week: null,
        currentTitle: '',
        titleCounter: 0,
      };
      this.adminStates.set(uid, { ...this.adminState });
    }
    return this.adminState;
  }

  async setState(patch, targetUserId = null) {
    const uid = targetUserId ? Number(targetUserId) : (this.currentUserId || this.adminId);
    this.adminState = { ...this.adminState, ...patch };
    this.adminStates.set(uid, { ...this.adminState });
    try {
      await query(
        `INSERT INTO bot_state (admin_id, mode, active_week, base_title, title_counter)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           mode = VALUES(mode),
           active_week = VALUES(active_week),
           base_title = VALUES(base_title),
           title_counter = VALUES(title_counter)`,
        [
          uid,
          this.adminState.mode || 'IDLE',
          this.adminState.week || null,
          this.adminState.currentTitle || '',
          Number(this.adminState.titleCounter) || 0,
        ]
      );
    } catch (_) {}
  }

  setSocketIO(io) {
    this.io = io;
  }

  notifyAdminPanel(weekNumber = null) {
    if (this.io) {
      this.io.to('admins').emit('weekly_content_updated', { week: weekNumber });
    }
  }

  notifyAssistantsUpdated(sessionIds = []) {
    if (!this.io) return;
    const ids = Array.isArray(sessionIds) ? sessionIds : [sessionIds];
    for (const sid of ids) {
      if (sid) {
        this.io.to(`session_${sid}`).emit('assistants_updated', { sessionId: Number(sid) });
      }
    }
    this.io.to('admins').emit('assistants_updated', { sessionIds: ids });
  }

  /**
   * دانلود فایل از لینک مستقیم خارجی (HTTP/HTTPS) روی سرور (مخصوص فایل‌های حجیم بالای ۲۰ مگابایت)
   */
  async downloadExternalUrl(urlStr, destFilePath, redirectDepth = 0) {
    if (redirectDepth > 5) {
      throw new Error('تعداد ریدایرکت‌های لینک بیش از حد مجاز است.');
    }
    const client = urlStr.startsWith('https://') ? https : http;
    await new Promise((resolve, reject) => {
      const req = client.get(urlStr, { timeout: 600000 }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume();
          const nextUrl = new URL(res.headers.location, urlStr).toString();
          this.downloadExternalUrl(nextUrl, destFilePath, redirectDepth + 1)
            .then(resolve)
            .catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`خطا در دانلود از لینک مستقیم: HTTP ${res.statusCode}`));
        }
        const fileStream = fs.createWriteStream(destFilePath);
        res.pipe(fileStream);
        fileStream.on('finish', () => fileStream.close(resolve));
        fileStream.on('error', (err) => {
          fileStream.close();
          fs.unlink(destFilePath, () => {});
          reject(err);
        });
      });
      req.on('error', (err) => {
        fs.unlink(destFilePath, () => {});
        reject(err);
      });
      req.on('timeout', () => {
        req.destroy(new Error('تایم‌اوت دانلود از لینک مستقیم'));
      });
    });
  }

  /**
   * فراخوانی متدهای HTTP API تلگرام
   */
  async apiCall(method, body = {}, timeoutMs = 35000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.apiBase}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const data = await res.json();
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  async sendMessage(chatId, text, replyMarkup = null, threadId = null) {
    const payload = {
      chat_id: chatId,
      text,
    };
    if (threadId) {
      payload.message_thread_id = Number(threadId);
    }
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }
    try {
      return await this.apiCall('sendMessage', payload, 15000);
    } catch (err) {
      console.error('❌ [MohtavaTelBot] خطا در ارسال پیام تلگرام:', err.message);
      return null;
    }
  }

  /**
   * دانلود فایل‌های حجیم (بالای ۲۰ مگابایت تا سقف ۲ گیگابایت) مستقیماً از طریق پروتکل MTProto تلگرام
   */
  async downloadTelegramFileViaMtproto(chatId, messageId, destFilePath) {
    const scriptPath = path.join(__dirname, 'mtproto_download.py');
    const pythonCandidates = process.platform === 'win32' ? ['python', 'python3'] : ['python3', 'python'];

    let lastErr = null;
    for (const pyBin of pythonCandidates) {
      try {
        await new Promise((resolve, reject) => {
          execFile(
            pyBin,
            [
              scriptPath,
              '--token',
              String(this.token),
              '--chat-id',
              String(chatId),
              '--message-id',
              String(messageId),
              '--dest',
              String(destFilePath),
            ],
            { timeout: 900000, maxBuffer: 10 * 1024 * 1024 },
            (err, stdout, stderr) => {
              if (err) {
                return reject(new Error(stderr?.trim() || err.message));
              }
              resolve(stdout);
            }
          );
        });
        if (fs.existsSync(destFilePath) && fs.statSync(destFilePath).size > 0) {
          ensureMp4FastStart(destFilePath);
          return destFilePath;
        }
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('خطا در دانلود فایل حجیم از طریق MTProto');
  }

  /**
   * دانلود فایل از سرور تلگرام و ذخیره در پوشه public/uploads/weekly
   * (در صورت بزرگ بودن فایل بالای ۲۰ مگابایت، خودکار از MTProto استفاده می‌کند)
   */
  async downloadTelegramFile(fileId, destFilePath, meta = {}) {
    const { chatId, messageId, fileSize } = meta || {};

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    // اگر سایز فایل بیش از ۱۹.۵ مگابایت است و شناسه پیام را داریم، مستقیماً با MTProto دانلود کن
    if (Number(fileSize) > 19500000 && chatId && messageId) {
      return await this.downloadTelegramFileViaMtproto(chatId, messageId, destFilePath);
    }

    const fileInfoRes = await this.apiCall('getFile', { file_id: fileId }, 20000);
    if (!fileInfoRes || !fileInfoRes.ok || !fileInfoRes.result || !fileInfoRes.result.file_path) {
      const desc = fileInfoRes?.description || 'خطا در دریافت اطلاعات فایل از تلگرام (getFile)';
      if (/file is too big/i.test(desc) && chatId && messageId) {
        return await this.downloadTelegramFileViaMtproto(chatId, messageId, destFilePath);
      }
      throw new Error(desc);
    }

    const remotePath = fileInfoRes.result.file_path;
    const downloadUrl = `${this.fileBase}/${remotePath}`;

    await new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(destFilePath);
      const req = https.get(downloadUrl, { timeout: 60000 }, (res) => {
        if (res.statusCode !== 200) {
          fileStream.close();
          fs.unlink(destFilePath, () => {});
          return reject(new Error(`خطا در دانلود فایل از تلگرام: HTTP ${res.statusCode}`));
        }
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close(resolve);
        });
      });

      req.on('error', (err) => {
        fileStream.close();
        fs.unlink(destFilePath, () => {});
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy(new Error('تایم‌اوت دانلود فایل از سرور تلگرام'));
      });
    });

    ensureMp4FastStart(destFilePath);
    return remotePath;
  }

  /**
   * تشخیص نوع محتوا و مشخصات فایل از روی پیام تلگرام
   */
  extractMediaInfo(msg) {
    if (Array.isArray(msg.photo) && msg.photo.length > 0) {
      const largestPhoto = msg.photo[msg.photo.length - 1];
      return {
        contentType: 'image',
        fileId: largestPhoto.file_id,
        fileSize: Number(largestPhoto.file_size || 0),
        ext: '.jpg',
        originalName: 'photo.jpg',
      };
    }

    if (msg.video) {
      const origExt = path.extname(msg.video.file_name || '').toLowerCase() || '.mp4';
      return {
        contentType: 'video',
        fileId: msg.video.file_id,
        fileSize: Number(msg.video.file_size || 0),
        ext: VIDEO_EXTS.has(origExt) ? origExt : '.mp4',
        originalName: msg.video.file_name || `video${origExt}`,
      };
    }

    if (msg.video_note) {
      return {
        contentType: 'video',
        fileId: msg.video_note.file_id,
        fileSize: Number(msg.video_note.file_size || 0),
        ext: '.mp4',
        originalName: 'video_note.mp4',
      };
    }

    if (msg.animation) {
      return {
        contentType: 'video',
        fileId: msg.animation.file_id,
        fileSize: Number(msg.animation.file_size || 0),
        ext: '.mp4',
        originalName: msg.animation.file_name || 'animation.mp4',
      };
    }

    if (msg.voice) {
      return {
        contentType: 'voice',
        fileId: msg.voice.file_id,
        fileSize: Number(msg.voice.file_size || 0),
        ext: '.ogg',
        originalName: 'voice.ogg',
      };
    }

    if (msg.audio) {
      const origExt = path.extname(msg.audio.file_name || '').toLowerCase() || '.mp3';
      return {
        contentType: 'voice',
        fileId: msg.audio.file_id,
        fileSize: Number(msg.audio.file_size || 0),
        ext: VOICE_EXTS.has(origExt) ? origExt : '.mp3',
        originalName: msg.audio.file_name || msg.audio.title || `audio${origExt}`,
      };
    }

    if (msg.document) {
      const origName = msg.document.file_name || 'document';
      const origExt = path.extname(origName).toLowerCase();
      const mime = String(msg.document.mime_type || '').toLowerCase();

      let contentType = 'file';
      let ext = origExt || '.bin';

      if (ARCHIVE_EXTS.has(origExt) || isArchiveFilename(origName)) {
        contentType = 'archive';
      } else if (IMAGE_EXTS.has(origExt) || mime.startsWith('image/')) {
        contentType = 'image';
        if (!origExt) ext = '.jpg';
      } else if (VIDEO_EXTS.has(origExt) || mime.startsWith('video/')) {
        contentType = 'video';
        if (!origExt) ext = '.mp4';
      } else if (VOICE_EXTS.has(origExt) || mime.startsWith('audio/')) {
        contentType = 'voice';
        if (!origExt) ext = '.mp3';
      }

      return {
        contentType,
        fileId: msg.document.file_id,
        fileSize: Number(msg.document.file_size || 0),
        ext,
        originalName: origName,
      };
    }

    return null;
  }

  /**
   * پردازش رویداد افزوده‌شدن بات به گروه یا ارتقا به عنوان ادمین
   */
  async handleMyChatMember(update) {
    if (!update || !update.chat) return;
    const chat = update.chat;
    const isGroup = chat.type === 'group' || chat.type === 'supergroup';
    if (!isGroup) return;

    const newStatus = update.new_chat_member?.status;
    const fromUserId = Number(update.from?.id);
    const fromName = update.from?.first_name || 'ادمین';

    if (newStatus === 'administrator' || newStatus === 'member') {
      console.log(`🤖 [MohtavaTelBot] وضعیت بات در گروه «${chat.title}» (${chat.id}) تغییر یافت به: ${newStatus}`);

      // اگر کاربر اضافه کننده ادمین تاییدشده باشد، گروه مستقیماً ثبت می‌شود
      if (this.isAuthorizedAdmin(fromUserId)) {
        await this.authorizeGroup(chat.id, {
          title: chat.title || 'کارآگاه و راز دهکده متروک',
          registeredBy: fromUserId,
        });

        await this.sendMessage(
          chat.id,
          `👋 سلام به اعضای محترم گروه!\n🤖 ربات «راز دهکده» توسط ادمین گرامی (${fromName}) به گروه متصل شد.\n\n🎥 این گروه با موفقیت به عنوان مقصد اختصاصی و مستقیم ارسال ویدیوهای احراز هویت دانش‌آموزان ثبت گردید.\n\nاز این پس ویدیوهای ارسالی مستقیماً در این گروه قرار خواهند گرفت (پاسخ‌های ۱۲ معما فقط به پیوی ادمین‌ها ارسال می‌شود تا گروه خلوت بماند).`
        );
      } else {
        await this.sendMessage(
          chat.id,
          `👋 سلام به اعضای محترم گروه!\n🤖 ربات «راز دهکده» به گروه اضافه شد.\n\n🔑 برای ثبت رسمی این گروه جهت دریافت مستقیم ویدیوهای احراز هویت، یکی از ادمین‌ها لطفاً عبارت admin_110_59 (یا دستور /setgroup) را در این گروه ارسال فرماید.`
        );
      }
    }
  }

  /**
   * پردازش پیام دریافتی از تلگرام (به‌صورت ترتیبی و صف‌بندی‌شده)
   */
  async handleMessage(msg) {
    if (!msg || !msg.chat || !msg.from) return;

    const chatId = msg.chat.id;
    const userId = Number(msg.from.id);
    const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
    this.currentUserId = userId;

    const rawText = typeof msg.text === 'string' ? msg.text : '';
    const text = rawText.trim();
    const isSecretAdminCode = isMatchingAdminPasscode(text, this.adminSecretKey);

    // ۱. رسیدگی اختصاصی به پیام‌های داخل گروه
    if (isGroup) {
      const isSetGroupCmd = text.startsWith('/setgroup') || text.startsWith('/connect_group');
      const isGroupInfoCmd = text === '/group_info' || text === '/group_id' || text === '/status' || (this.botUsername && text === `/status@${this.botUsername}`);

      if (isSecretAdminCode || (isSetGroupCmd && this.isAuthorizedAdmin(userId))) {
        // اگر فرستنده کد مخفی را فرستاده و خودش هنوز در لیست ادمین‌ها نبود، ارتقا یابد
        if (isSecretAdminCode && !this.isAuthorizedAdmin(userId)) {
          await this.authorizeAdmin(userId, {
            username: msg.from.username || null,
            firstName: msg.from.first_name || '',
            chatId: userId,
          });
        }

        const threadId = msg.message_thread_id || null;
        await this.authorizeGroup(chatId, {
          title: msg.chat.title || 'کارآگاه و راز دهکده متروک',
          threadId,
          registeredBy: userId,
        });

        const topicNotice = threadId
          ? `\n\n📌 تاپیک اختصاصی با موفقیت ثبت شد! از این پس تمام ویدیوهای احراز هویت مستقیماً داخل همین تاپیک فرستاده می‌شوند.`
          : '\n\n📌 مقصد فعلی: تاپیک عمومی (General). اگر می‌خواهید ویدیوها به تاپیک خاصی بروند، کافی است همین دستور /setgroup را داخل همان تاپیک ارسال فرمایید.';

        await this.sendMessage(
          chatId,
          `✅ گروه «${msg.chat.title || 'کارآگاه و راز دهکده'}» با موفقیت برای ارسال مستقیم ویدیوهای احراز هویت ثبت شد!${topicNotice}\n\n🎥 از این پس ویدیوهای ارسالی دانش‌آموزان به صورت مستقیم و آنی در این بخش قرار می‌گیرند.\n\nℹ️ پاسخ‌های ۱۲ معما فقط به صورت خصوصی (پیوی) برای ادمین‌ها فرستاده می‌شود تا نظم و خلوتی گروه حفظ شود.`,
          null,
          threadId
        );
        return;
      }

      if (isGroupInfoCmd) {
        const isReg = this.isAuthorizedGroup(chatId);
        await this.sendMessage(
          chatId,
          `📊 وضعیت اتصال گروه به ربات «راز دهکده»:\n🏷 نام گروه: ${msg.chat.title || 'نامشخص'}\n🆔 شناسه گروه: ${chatId}\n${isReg ? '✅ وضعیت: متصل به سیستم ارسال خودکار ویدیوها' : '❌ وضعیت: هنوز ثبت نشده است (برای اتصال کد ادمین را بفرستید)'}`,
          null,
          msg.message_thread_id || null
        );
        return;
      }

      // دستور مشاهده لیست اسامی احراز هویت شده کلاس‌ها در گروه توسط ادمین
      const isAuthListCmd = text === BTN_AUTH_STUDENTS_LIST || text.startsWith('/students') || text.startsWith('/auth_list') || text.startsWith('/submissions') || text === 'کیا فرستادن' || text === 'لیست احراز هویت';
      if (isAuthListCmd && this.isAuthorizedAdmin(userId)) {
        const parts = text.split(/\s+/);
        const filter = (text.startsWith('/students') || text.startsWith('/auth_list') || text.startsWith('/submissions')) && parts.length > 1
          ? parts.slice(1).join(' ').trim()
          : '';
        await this.handleAuthStudentsList(chatId, msg.message_thread_id || null, filter);
        return;
      }

      // اگر اعضای جدید اضافه شدند و بات در میان آن‌هاست
      if (msg.new_chat_members && Array.isArray(msg.new_chat_members)) {
        const botAdded = msg.new_chat_members.some(
          m => m.is_bot && (Number(m.id) === Number(this.botId) || (this.botUsername && m.username === this.botUsername))
        );
        if (botAdded) {
          if (this.isAuthorizedAdmin(userId)) {
            await this.authorizeGroup(chatId, {
              title: msg.chat.title || 'کارآگاه و راز دهکده متروک',
              threadId: msg.message_thread_id || null,
              registeredBy: userId,
            });
            await this.sendMessage(
              chatId,
              `👋 سلام به اعضای محترم گروه!\n🤖 ربات «راز دهکده» توسط ادمین گرامی (${msg.from.first_name || 'ادمین'}) اضافه شد.\n\n✅ این گروه با موفقیت جهت ارسال مستقیم ویدیوهای احراز هویت ثبت گردید.`,
              null,
              msg.message_thread_id || null
            );
            return;
          } else {
            await this.sendMessage(
              chatId,
              `👋 سلام به اعضای محترم گروه!\n🤖 ربات «راز دهکده» به گروه اضافه شد.\n\n🔑 برای تایید و ثبت نهایی گروه، لطفاً یکی از ادمین‌ها کد امنیتی admin_110_59 را در گروه ارسال فرماید.`,
              null,
              msg.message_thread_id || null
            );
            return;
          }
        }
      }

      // پیام‌های عادی داخل گروه کاملاً نادیده گرفته می‌شوند تا مزاحمتی ایجاد نشود
      return;
    }

    // ۱. بررسی احراز هویت ادمین یا ورود با کد مخفی (admin_110_59)
    if (!this.isAuthorizedAdmin(userId)) {
      if (isSecretAdminCode) {
        await this.authorizeAdmin(userId, {
          username: msg.from.username || null,
          firstName: msg.from.first_name || '',
          chatId,
        });
        await this.setState({ mode: 'IDLE', week: null, currentTitle: '', titleCounter: 0 }, userId);
        await this.sendMessage(
          chatId,
          `✅ هویت شما به عنوان ادمین با موفقیت تایید شد!\nشناسه تلگرام شما (${userId}) به عنوان ادمین مجاز سامانه «راز دهکده» ثبت گردید.\n\nبه بات مدیریت خوش آمدید. لطفاً گزینه مورد نظر را انتخاب نمایید:`,
          getMainMenuKeyboard()
        );
        return;
      }

      await this.sendMessage(
        chatId,
        `⛔️ دسترسی غیرمجاز!\nاین بات ویژه ادمین‌های سامانه «راز دهکده» است.\nبرای ورود و دسترسی به امکانات مدیریت، لطفاً کد احراز هویت ادمین را ارسال فرمایید.`
      );
      return;
    }

    // اگر ادمین از قبل تایید شده و مجدداً کد را ارسال کند
    if (isSecretAdminCode) {
      await this.setState({ mode: 'IDLE', week: null, currentTitle: '', titleCounter: 0 }, userId);
      await this.sendMessage(
        chatId,
        `✅ شما به عنوان ادمین تایید شده‌اید.\nمنوی مدیریت «راز دهکده»:`,
        getMainMenuKeyboard()
      );
      return;
    }

    // همگام‌سازی وضعیت این ادمین با دیتابیس MySQL
    await this.syncStateFromDb(userId);

    // ۱. دستور شروع یا بازگشت به منوی اصلی
    if (text === '/start' || text === '/menu' || text === BTN_BACK_MAIN) {
      await this.setState({ mode: 'IDLE', week: null, currentTitle: '', titleCounter: 0 });
      await this.sendMessage(
        chatId,
        `👋 سلام ادمین عزیز!\nبه ربات مدیریت «راز دهکده» خوش آمدید.\n\n🕵️‍♂️ برای آپلود عکس‌های کارآگاهی متربیان هر کلاس (فایل ZIP/RAR، لینک مستقیم یا عکس تکی)، روی «${BTN_ASSISTANTS_MENU}» بزنید.\n📅 برای مدیریت سناریوی ۵ هفته‌ای، هفته مورد نظر را انتخاب کنید:`,
        getMainMenuKeyboard()
      );
      return;
    }

    // ۱-ب. منوی مدیریت عکس دستیاران کارآگاه (کلاس‌ها)
    if (text === BTN_EMERGENCY_VIDEOS || text === '/videos') {
      await this.handleEmergencyVideosMenu(chatId);
      return;
    }

    if (text === BTN_AUTH_STUDENTS_LIST || text.startsWith('/students') || text.startsWith('/auth_list') || text.startsWith('/submissions') || text === 'کیا فرستادن' || text === 'لیست احراز هویت') {
      const parts = text.split(/\s+/);
      const filter = (text.startsWith('/students') || text.startsWith('/auth_list') || text.startsWith('/submissions')) && parts.length > 1
        ? parts.slice(1).join(' ').trim()
        : '';
      await this.handleAuthStudentsList(chatId, null, filter);
      return;
    }

    if (text === '/resend_videos' || text === '🔄 ارسال مجدد ویدیوها') {
      await this.handleResendLatestVideos(chatId);
      return;
    }

    if (text === BTN_ASSISTANTS_MENU || text === '/assistants') {
      await this.setState({ mode: 'ASSISTANTS_MENU', week: null, currentTitle: '', titleCounter: 0 });
      await this.sendMessage(
        chatId,
        `🕵️‍♂️ «مدیریت عکس دستیاران کارآگاه (۲۴ کلاس)»\n\nیکی از روش‌های زیر را انتخاب کنید:\n\n۱️⃣ «${BTN_ASSISTANTS_ARCHIVE}»:\nارسال فایل فشرده (.zip / .rar) حاوی پوشه کلاس‌ها یا ارسال لینک مستقیم دانلود (برای فایل‌های بالای ۲۰ مگابایت). بات به صورت خودکار نام پوشه‌ها را با کلاس‌ها تطبیق داده و عکس هر متربی را با نام خودش در کلاس مربوطه قرار می‌دهد!\n\n۲️⃣ «${BTN_ASSISTANTS_SELECT_CLASS}»:\nانتخاب یک کلاس مشخص و ارسال یا فوروارد کردن عکس‌های متربیان آن کلاس.`,
        getAssistantsMenuKeyboard()
      );
      return;
    }

    if (text === BTN_ASSISTANTS_ARCHIVE) {
      await this.setState({ mode: 'WAIT_ASSISTANTS_ARCHIVE', week: null, currentTitle: '', titleCounter: 0 });
      await this.sendMessage(
        chatId,
        `📦 لطفاً فایل فشرده (.zip یا .rar) عکس‌های دستیاران را بفرستید.\n\n💡 نکات مهم برای اینترنت ضعیف یا فایل‌های حجیم:\n• اگر فایل شما زیر ۲۰ مگابایت است، مستقیم همینجا آپلود یا فوروارد کنید.\n• اگر کل آرشیو بالای ۲۰ مگابایت است (مثلاً ۲۸۰ مگابایت)، به دلیل محدودیت ۲۰ مگابایتی API رسمی بات تلگرام، می‌توانید:\n  الف) لینک مستقیم دانلود (http/https) آن را بفرستید تا سرور با اینترنت پرسرعت خودش مستقیم دانلود و استخراج کند!\n  ب) یا هر کلاس را به صورت یک فایل زیپ جداگانه بفرستید.\n  ج) یا از دکمه «${BTN_ASSISTANTS_SELECT_CLASS}» کلاس را انتخاب کرده و عکس‌ها را بفرستید.`,
        getAssistantsMenuKeyboard()
      );
      return;
    }

    if (text === BTN_ASSISTANTS_STATS) {
      await this.sendAssistantsStats(chatId);
      return;
    }

    if (text === BTN_ASSISTANTS_SELECT_CLASS || text === BTN_ASSISTANTS_CHANGE_CLASS) {
      const sessions = await SessionAssistant.ensureOfficialSessionsExist();
      await this.setState({ mode: 'WAIT_ASSISTANTS_SELECT_CLASS', week: null, currentTitle: '', titleCounter: 0 });
      await this.sendMessage(
        chatId,
        `🏫 لطفاً کلاس مورد نظر را از کیبورد زیر انتخاب کنید تا عکس‌های دستیاران آن کلاس را بفرستید:`,
        getAssistantsClassSelectKeyboard(sessions, '🏫 ')
      );
      return;
    }

    if (text === BTN_ASSISTANTS_CLEAR_CLASS) {
      const sessions = await SessionAssistant.ensureOfficialSessionsExist();
      await this.setState({ mode: 'WAIT_ASSISTANTS_CLEAR_CLASS', week: null, currentTitle: '', titleCounter: 0 });
      await this.sendMessage(
        chatId,
        `🧹 عکس‌های دستیاران کدام کلاس را می‌خواهید پاکسازی کنید؟`,
        getAssistantsClassSelectKeyboard(sessions, '🧹 حذف عکس‌های ')
      );
      return;
    }

    // اگر در حالت پاکسازی عکس‌های یک کلاس هستیم
    if (this.adminState.mode === 'WAIT_ASSISTANTS_CLEAR_CLASS' && text) {
      const cleanClassText = text.replace(/^🧹\s*حذف عکس‌های\s*/u, '').trim();
      const sessions = await SessionAssistant.ensureOfficialSessionsExist();
      const matched = matchFolderToSession(cleanClassText, sessions);
      const matchedSession = matched?.session || matched;
      if (matchedSession && matchedSession.id) {
        const deletedCount = await SessionAssistant.deleteBySessionId(matchedSession.id);
        this.notifyAssistantsUpdated([matchedSession.id]);
        await this.setState({ mode: 'ASSISTANTS_MENU', week: null, currentTitle: '', titleCounter: 0 });
        await this.sendMessage(
          chatId,
          `✅ تمام عکس‌های دستیاران کلاس «${matchedSession.name}» (${deletedCount} تصویر) پاکسازی شد.`,
          getAssistantsMenuKeyboard()
        );
        return;
      }
    }

    // اگر در حالت انتخاب کلاس برای ارسال عکس هستیم (یا کاربر روی دکمه 🏫 نام کلاس زد)
    if (text.startsWith('🏫 ') || (this.adminState.mode === 'WAIT_ASSISTANTS_SELECT_CLASS' && text)) {
      const cleanClassText = text.replace(/^🏫\s*/u, '').trim();
      const sessions = await SessionAssistant.ensureOfficialSessionsExist();
      const matched = matchFolderToSession(cleanClassText, sessions);
      const matchedSession = matched?.session || matched;
      if (matchedSession && matchedSession.id) {
        const currentList = await SessionAssistant.findBySessionId(matchedSession.id);
        await this.setState({
          mode: 'WAIT_ASSISTANTS_CLASS_PHOTOS',
          week: null,
          currentTitle: matchedSession.name,
          titleCounter: matchedSession.id,
        });
        await this.sendMessage(
          chatId,
          `✅ کلاس «${matchedSession.name}» انتخاب شد (کد چت: ${matchedSession.chat_code}).\n📸 تعداد عکس‌های فعلی این کلاس: ${currentList.length}\n\n📤 حالا می‌توانید:\n۱. فایل عکس‌های متربیان این کلاس (PNG / WEBP / JPG) را به صورت File یا Photo یکجا بفرستید یا فوروارد کنید (نام فایل به عنوان نام متربی ثبت می‌شود).\n۲. یا فایل فشرده (.zip / .rar) مخصوص همین کلاس را بفرستید.`,
          getAssistantsReceivingClassKeyboard()
        );
        return;
      }
    }

    // اگر در حالت دریافت عکس برای یک کلاس مشخص (WAIT_ASSISTANTS_CLASS_PHOTOS) هستیم
    if (this.adminState.mode === 'WAIT_ASSISTANTS_CLASS_PHOTOS' && this.adminState.titleCounter) {
      const targetSessionId = Number(this.adminState.titleCounter);
      const targetSessionName = this.adminState.currentTitle || `کلاس #${targetSessionId}`;

      if (text === BTN_ASSISTANTS_LIST_CLASS) {
        const list = await SessionAssistant.findBySessionId(targetSessionId);
        if (!list.length) {
          await this.sendMessage(
            chatId,
            `📭 هنوز هیچ عکسی برای کلاس «${targetSessionName}» ثبت نشده است.`,
            getAssistantsReceivingClassKeyboard()
          );
          return;
        }
        const lines = [`🕵️‍♂️ لیست دستیاران کارآگاه در کلاس «${targetSessionName}» (${list.length} نفر):\n`];
        list.forEach((item, idx) => {
          lines.push(`${idx + 1}. ${item.student_name}`);
        });
        await this.sendMessage(chatId, lines.join('\n'), getAssistantsReceivingClassKeyboard());
        return;
      }

      const mediaInfo = this.extractMediaInfo(msg);
      if (mediaInfo && mediaInfo.contentType === 'archive') {
        await this.handleAssistantsArchiveMessage(chatId, msg, targetSessionId);
        return;
      }
      if (mediaInfo && mediaInfo.contentType === 'image') {
        await this.handleAssistantsSinglePhotoMessage(chatId, msg, targetSessionId, targetSessionName);
        return;
      }
      if (text && /^https?:\/\/\S+/i.test(text)) {
        await this.handleAssistantsArchiveMessage(chatId, msg, targetSessionId);
        return;
      }
    }

    // اگر در حالت WAIT_ASSISTANTS_ARCHIVE یا ASSISTANTS_MENU یا حتی IDLE یک فایل فشرده (.zip / .rar) فرستاده شد
    {
      const mediaInfo = this.extractMediaInfo(msg);
      const isArchiveDoc = mediaInfo && mediaInfo.contentType === 'archive';
      const isDirectArchiveInput =
        this.adminState.mode === 'WAIT_ASSISTANTS_ARCHIVE' &&
        (isArchiveDoc || (text && (/^https?:\/\/\S+/i.test(text) || fs.existsSync(text))));

      if (isArchiveDoc || isDirectArchiveInput) {
        await this.handleAssistantsArchiveMessage(chatId, msg, null);
        return;
      }
    }

    // ۲. اگر در هر حالتی روی یکی از دکمه‌های «هفته اول» تا «هفته پنجم» کلیک شد
    if (text && WEEK_BUTTON_TO_NUM[text]) {
      const weekNum = WEEK_BUTTON_TO_NUM[text];
      await this.startWeekSelection(chatId, weekNum);
      return;
    }

    // ۳. دکمه مشاهده خلاصه و محتوای همه هفته‌ها
    if (text === BTN_VIEW_ALL) {
      await this.sendAllWeeksSummary(chatId);
      return;
    }

    // ۴. دکمه پاکسازی یک هفته مشخص
    if (text === BTN_CLEAR_ONE_WEEK) {
      await this.setState({ mode: 'WAIT_CLEAR_WEEK', week: null, currentTitle: '', titleCounter: 0 });
      await this.sendMessage(
        chatId,
        `🧹 کدام هفته را می‌خواهید به طور کامل پاکسازی کنید؟`,
        getClearWeekSelectionKeyboard()
      );
      return;
    }

    if (this.adminState.mode === 'WAIT_CLEAR_WEEK' && text.startsWith('🧹 پاکسازی ')) {
      const weekLabel = text.replace('🧹 پاکسازی ', '').trim();
      const weekNum = WEEK_BUTTON_TO_NUM[weekLabel];
      if (weekNum) {
        const deletedItems = await WeeklyContent.deleteByWeek(weekNum);
        this.deleteUploadedFilesForItems(deletedItems);
        this.notifyAdminPanel(weekNum);
        await this.setState({ mode: 'IDLE', week: null, currentTitle: '', titleCounter: 0 });
        await this.sendMessage(
          chatId,
          `✅ تمام محتوای «${WEEK_NAMES[weekNum]}» (${deletedItems.length} مرحله) پاکسازی شد.`,
          getMainMenuKeyboard()
        );
        return;
      }
    }

    // ۵. دکمه پاکسازی کل پیام‌های آماده (همه هفته‌ها)
    if (text === BTN_CLEAR_ALL) {
      await this.setState({ mode: 'WAIT_CONFIRM_CLEAR_ALL', week: null, currentTitle: '', titleCounter: 0 });
      await this.sendMessage(
        chatId,
        `⚠️ آیا مطمئن هستید که می‌خواهید تمام پیام‌های آماده و محتوای هر ۵ هفته به طور کامل پاک شوند؟`,
        getConfirmClearAllKeyboard()
      );
      return;
    }

    if (this.adminState.mode === 'WAIT_CONFIRM_CLEAR_ALL' && text === BTN_CONFIRM_CLEAR_ALL) {
      const deletedItems = await WeeklyContent.deleteAll();
      await query('DELETE FROM canned_responses');
      this.deleteUploadedFilesForItems(deletedItems);
      this.notifyAdminPanel(null);
      await this.setState({ mode: 'IDLE', week: null, currentTitle: '', titleCounter: 0 });
      await this.sendMessage(
        chatId,
        `🗑 تمام پیام‌های آماده و محتوای هر ۵ هفته (${deletedItems.length} مورد) به طور کامل از سرور پاک شدند.`,
        getMainMenuKeyboard()
      );
      return;
    }

    // ۶. اگر در حالت انتظار برای عنوان (WAIT_TITLE) هستیم
    if (this.adminState.mode === 'WAIT_TITLE' && this.adminState.week) {
      const weekNum = this.adminState.week;
      const weekName = WEEK_NAMES[weekNum];
      const mediaInfo = this.extractMediaInfo(msg);

      // اگر کاربر به جای نوشتن عنوان کوتاه، مستقیماً پیام طولانی/چندخطی یا فوروارد یا فایل فرستاد،
      // آن را به عنوان «عنوان» اشتباه نگیر! عنوان پیش‌فرض (پیام / ویدیو / عکس) بگذار و مستقیم ذخیره‌اش کن:
      if (mediaInfo || isLikelyContentInsteadOfTitle(msg, text)) {
        const autoBaseTitle = mediaInfo ? defaultBaseTitleForType(mediaInfo.contentType) : 'پیام';
        await this.setState({
          mode: 'WAIT_CONTENT',
          currentTitle: autoBaseTitle,
          titleCounter: 0,
        });
        await this.saveIncomingContentItem(chatId, msg);
        return;
      }

      if (!text) {
        await this.sendMessage(
          chatId,
          `⚠️ لطفاً ابتدا یک «عنوان» برای این دسته در «${weekName}» بنویسید (مثلاً: پیام ها، ویدیو، ویس):`,
          getTitleInputKeyboard()
        );
        return;
      }

      const cleanBaseTitle = normalizeBaseTitle(text);
      await this.setState({
        mode: 'WAIT_CONTENT',
        currentTitle: cleanBaseTitle,
        titleCounter: 0,
      });

      await this.sendMessage(
        chatId,
        `✅ عنوان روی «${cleanBaseTitle}» تنظیم شد.\n\n📤 حالا پیام‌ها یا فایل‌ها را یکی‌یکی بفرستید یا فوروارد کنید.\n🔢 بات به صورت خودکار به عنوان هر کدام عدد اضافه می‌کند:\n«${cleanBaseTitle} 1»، «${cleanBaseTitle} 2»، «${cleanBaseTitle} 3» و...\n\n🔒 تا زمانی که دکمه «${BTN_CHANGE_TITLE}» را نزنید، همین عنوان حفظ می‌شود.`,
        getReceivingContentKeyboard()
      );
      return;
    }

    // ۷. اگر در حالت دریافت محتوا (WAIT_CONTENT) هستیم
    if (this.adminState.mode === 'WAIT_CONTENT' && this.adminState.week) {
      const weekNum = this.adminState.week;
      const weekName = WEEK_NAMES[weekNum];

      // الف) دکمه پایان هفته
      if (text === BTN_END_WEEK) {
        const items = await WeeklyContent.findByWeek(weekNum);
        await this.setState({ mode: 'IDLE', week: null, currentTitle: '', titleCounter: 0 });
        await this.sendMessage(
          chatId,
          `🎉 ثبت محتوای «${weekName}» به پایان رسید.\n📊 مجموع مراحل ثبت‌شده در ${weekName}: ${items.length} مرحله.\n\nمی‌توانید هفته بعدی را از منوی زیر انتخاب کنید:`,
          getMainMenuKeyboard()
        );
        return;
      }

      // ب) دکمه تغییر عنوان برای دسته بعدی در همان هفته
      if (text === BTN_CHANGE_TITLE) {
        await this.setState({ mode: 'WAIT_TITLE', titleCounter: 0 });
        await this.sendMessage(
          chatId,
          `✏️ لطفاً «عنوان جدید» را بنویسید (مثلاً: ویدیو، پیام ها، ویس، عکس):`,
          getTitleInputKeyboard()
        );
        return;
      }

      // ج) دکمه حذف آخرین مرحله ثبت‌شده در این هفته
      if (text === BTN_UNDO_LAST) {
        const items = await WeeklyContent.findByWeek(weekNum);
        if (!items || items.length === 0) {
          await this.sendMessage(
            chatId,
            `ℹ️ هیچ مرحله‌ای در «${weekName}» برای حذف وجود ندارد.`,
            getReceivingContentKeyboard()
          );
          return;
        }
        const lastItem = items[items.length - 1];
        await WeeklyContent.delete(lastItem.id);
        this.deleteUploadedFilesForItems([lastItem]);
        if (this.adminState.titleCounter > 0) {
          await this.setState({ titleCounter: this.adminState.titleCounter - 1 });
        }
        this.notifyAdminPanel(weekNum);
        await this.sendMessage(
          chatId,
          `↩️ آخرین مرحله (شماره ${lastItem.step_order} — ${formatTypeFa(lastItem.content_type)} با عنوان «${lastItem.title}») از ${weekName} حذف شد.`,
          getReceivingContentKeyboard()
        );
        return;
      }

      // د) دکمه نمایش لیست مراحل این هفته
      if (text === BTN_LIST_CURRENT_WEEK) {
        await this.sendWeekStepsList(chatId, weekNum, getReceivingContentKeyboard());
        return;
      }

      // هـ) دریافت و ذخیره محتوا (فایل رسانه‌ای یا پیام متنی) با شماره‌گذاری خودکار روی عنوان فعلی
      await this.saveIncomingContentItem(chatId, msg);
      return;
    }

    // ۸. اگر هنوز هفته‌ای انتخاب نشده است
    await this.sendMessage(
      chatId,
      `📌 لطفاً ابتدا از دکمه‌های زیر، هفته مورد نظر (هفته اول تا پنجم) را انتخاب کنید:`,
      getMainMenuKeyboard()
    );
  }

  async startWeekSelection(chatId, weekNum) {
    const items = await WeeklyContent.findByWeek(weekNum);
    const weekName = WEEK_NAMES[weekNum];
    await this.setState({
      mode: 'WAIT_TITLE',
      week: weekNum,
      currentTitle: '',
      titleCounter: 0,
    });

    await this.sendMessage(
      chatId,
      `📌 «${weekName}» انتخاب شد.\n📊 تعداد مراحل ثبت‌شده فعلی در این هفته: ${items.length}\n\n✏️ لطفاً «عنوان» دسته اول را بنویسید (مثلاً بنویسید: پیام ها یا ویدیو):`,
      getTitleInputKeyboard()
    );
  }

  /**
   * ذخیره یک پیام متنی یا دانلود و ذخیره فایل (عکس، فیلم، صوت، سند) با افزودن خودکار عدد (1, 2, 3...) به عنوان
   */
  async saveIncomingContentItem(chatId, msg) {
    const weekNum = this.adminState.week;
    const weekName = WEEK_NAMES[weekNum];
    const baseTitle = this.adminState.currentTitle || 'پیام';
    const nextCounter = (Number(this.adminState.titleCounter) || 0) + 1;
    const numberedTitle = `${baseTitle} ${nextCounter}`;
    const stepOrder = await WeeklyContent.getNextStepOrder(weekNum);

    const mediaInfo = this.extractMediaInfo(msg);

    // حالت ۱: پیام شامل مدیا (عکس، فیلم، ویس/صوت، فایل) است
    if (mediaInfo) {
      try {
        const safeUniqueName = `week${weekNum}_step${stepOrder}_${Date.now()}_${Math.round(Math.random() * 1000)}${mediaInfo.ext}`;
        const localFilePath = path.join(UPLOAD_DIR, safeUniqueName);
        const publicFileUrl = `${PUBLIC_URL_PREFIX}/${safeUniqueName}`;

        await this.downloadTelegramFile(mediaInfo.fileId, localFilePath, {
          chatId,
          messageId: msg.message_id,
          fileSize: mediaInfo.fileSize,
        });

        const created = await WeeklyContent.create({
          week_number: weekNum,
          step_order: stepOrder,
          content_type: mediaInfo.contentType,
          title: numberedTitle,
          payload: publicFileUrl,
          file_name: safeUniqueName,
        });

        await this.setState({ titleCounter: nextCounter });
        this.notifyAdminPanel(weekNum);

        await this.sendMessage(
          chatId,
          `✅ ثبت شد!\n📅 ${weekName} — مرحله کل: #${created.step_order}\n🏷 عنوان کارت: ${numberedTitle}\n📂 نوع محتوا: ${formatTypeFa(mediaInfo.contentType)}\n\n💡 پیام/فایل بعدی با عنوان «${baseTitle} ${nextCounter + 1}» ثبت می‌شود (یا «${BTN_CHANGE_TITLE}» را بزنید).`,
          getReceivingContentKeyboard()
        );
      } catch (err) {
        console.error('❌ [MohtavaTelBot] خطا در دانلود/ذخیره فایل:', err);
        await this.sendMessage(
          chatId,
          `❌ خطا در دانلود یا ذخیره فایل برای ${weekName}:\n${err.message}`,
          getReceivingContentKeyboard()
        );
      }
      return;
    }

    // حالت ۲: پیام متنی است
    const textContent = typeof msg.text === 'string' ? msg.text.trim() : '';
    if (textContent) {
      try {
        const created = await WeeklyContent.create({
          week_number: weekNum,
          step_order: stepOrder,
          content_type: 'text',
          title: numberedTitle,
          payload: textContent,
          file_name: null,
        });

        await this.setState({ titleCounter: nextCounter });
        this.notifyAdminPanel(weekNum);

        const preview = textContent.length > 50 ? textContent.slice(0, 50) + '…' : textContent;
        await this.sendMessage(
          chatId,
          `✅ ثبت شد!\n📅 ${weekName} — مرحله کل: #${created.step_order}\n🏷 عنوان کارت: ${numberedTitle}\n📂 نوع محتوا: 💬 متن\n📝 متن: «${preview}»\n\n💡 پیام بعدی با عنوان «${baseTitle} ${nextCounter + 1}» ثبت می‌شود (برای عوض کردن عنوان، «${BTN_CHANGE_TITLE}» را بزنید).`,
          getReceivingContentKeyboard()
        );
      } catch (err) {
        console.error('❌ [MohtavaTelBot] خطا در ذخیره متن:', err);
        await this.sendMessage(
          chatId,
          `❌ خطا در ذخیره پیام متنی: ${err.message}`,
          getReceivingContentKeyboard()
        );
      }
      return;
    }

    await this.sendMessage(
      chatId,
      `⚠️ نوع این پیام پشتیبانی نمی‌شود. لطفاً متن، عکس، فیلم، ویس/صوت یا فایل ارسال فرمایید.`,
      getReceivingContentKeyboard()
    );
  }

  async sendWeekStepsList(chatId, weekNum, keyboard) {
    const items = await WeeklyContent.findByWeek(weekNum);
    const weekName = WEEK_NAMES[weekNum];

    if (!items || items.length === 0) {
      await this.sendMessage(chatId, `📭 هیچ مرحله‌ای برای «${weekName}» ثبت نشده است.`, keyboard);
      return;
    }

    const lines = [`📋 لیست مراحل ثبت‌شده در «${weekName}» (${items.length} مورد):\n`];
    for (const item of items) {
      const typeLabel = formatTypeFa(item.content_type);
      const snippet =
        item.content_type === 'text'
          ? ` — "${String(item.payload || '').slice(0, 35)}${String(item.payload || '').length > 35 ? '…' : ''}"`
          : '';
      lines.push(`#${item.step_order} | 🏷 ${item.title} [${typeLabel}]${snippet}`);
    }

    await this.sendMessage(chatId, lines.join('\n'), keyboard);
  }

  async sendAllWeeksSummary(chatId) {
    const lines = ['📊 خلاصه محتوای ثبت‌شده در ۵ هفته سناریو:\n'];
    let total = 0;

    for (let w = 1; w <= 5; w++) {
      const items = await WeeklyContent.findByWeek(w);
      total += items.length;
      lines.push(`🔹 ${WEEK_NAMES[w]}: ${items.length} مرحله`);
      for (const item of items.slice(0, 10)) {
        lines.push(`   #${item.step_order} ${formatTypeFa(item.content_type)} — ${item.title}`);
      }
      if (items.length > 10) {
        lines.push(`   ... و ${items.length - 10} مرحله دیگر`);
      }
    }

    lines.push(`\n📦 مجموع کل مراحل: ${total}`);
    await this.sendMessage(chatId, lines.join('\n'), getMainMenuKeyboard());
  }

  async sendAssistantsStats(chatId) {
    const counts = await SessionAssistant.getCountsBySession();
    const lines = ['📊 آمار عکس‌های «دستیاران کارآگاه» به تفکیک کلاس‌ها:\n'];
    let totalPhotos = 0;
    let classesWithPhotos = 0;

    counts.forEach((c, idx) => {
      totalPhotos += c.count;
      if (c.count > 0) classesWithPhotos += 1;
      const badge = c.count > 0 ? `✅ ${c.count} عکس` : '⚪️ بدون عکس';
      lines.push(`${idx + 1}. ${c.session_name} (${c.chat_code || '—'}) ⬅️ ${badge}`);
    });

    lines.push(`\n─────────────────────`);
    lines.push(`🏫 کلاس‌های دارای عکس: ${classesWithPhotos} از ${counts.length}`);
    lines.push(`🕵️‍♂️ مجموع کل عکس‌های دستیاران: ${totalPhotos} نفر`);

    await this.sendMessage(chatId, lines.join('\n'), getAssistantsMenuKeyboard());
  }

  /**
   * منوی مدیریت و آمار ویدیوهای احراز هویت اضطراری
   */
  async handleEmergencyVideosMenu(chatId) {
    try {
      const countsRes = await query(`
        SELECT status, COUNT(*) as cnt FROM emergency_auth_videos GROUP BY status
      `);
      const counts = { pending: 0, sending: 0, sent: 0, failed: 0 };
      (countsRes.rows || []).forEach(r => { counts[r.status] = Number(r.cnt); });

      const listRes = await query(`
        SELECT v.id, v.reference_code, v.session_id, s.name as session_name, v.phone, v.status, v.created_at
        FROM emergency_auth_videos v
        LEFT JOIN sessions s ON s.id = v.session_id
        ORDER BY v.id DESC LIMIT 5
      `);

      const lines = [
        '📹 «مدیریت و ارسال ویدیوهای احراز هویت»',
        '',
        '📊 آمار وضعیت ویدیوها:',
        `▫️ ارسال‌شده به تلگرام: ${counts.sent}`,
        `▫️ در صف ارسال: ${counts.pending}`,
        `▫️ ناموفق (نیازمند تلاش مجدد): ${counts.failed}`,
        `▫️ در حال پردازش: ${counts.sending}`,
        ''
      ];

      if (listRes.rows && listRes.rows.length > 0) {
        lines.push('📋 آخرین ویدیوهای ثبت‌شده:');
        listRes.rows.forEach((r, idx) => {
          const stBadge = r.status === 'sent' ? '✅ ارسال شد' : (r.status === 'failed' ? '❌ خطا' : '⏳ در صف');
          lines.push(`${idx + 1}. ${r.session_name || 'کلاس ' + r.session_id} (${r.phone}) ⬅️ ${stBadge}`);
        });
      } else {
        lines.push('هنوز ویدیویی در سامانه ثبت نشده است.');
      }

      lines.push('');
      lines.push('💡 جهت ارسال فوری ویدیوهای موجود در صف به همراه پاسخ‌های کامل ۱۲ معما به صورت فایل استریم MP4، دکمه «🔄 ارسال مجدد ویدیوها» یا دستور /resend_videos را ارسال کنید.');

      await this.sendMessage(chatId, lines.join('\n'), getEmergencyVideosKeyboard());
    } catch (err) {
      console.error('❌ خطا در دریافت منوی ویدیوها:', err);
      await this.sendMessage(chatId, `❌ خطا در دریافت وضعیت ویدیوها: ${err.message}`, getMainMenuKeyboard());
    }
  }

  /**
   * پردازش و ارسال فوری ویدیوهای معلق یا ناموفق به تلگرام همراه با پاسخ‌های ۱۲ سؤال
   */
  async handleResendLatestVideos(chatId) {
    try {
      await this.sendMessage(chatId, '⏳ در حال بررسی و آغاز صف ارسال ویدیوها به همراه پاسخ‌های ۱۲ سؤال به تلگرام...');
      await query(`
        UPDATE emergency_auth_videos
        SET status = 'pending', next_attempt_at = NULL, last_error = NULL
        WHERE status IN ('failed', 'sending') OR (status = 'pending' AND next_attempt_at IS NOT NULL)
      `);

      let sentCount = 0;
      let more = true;
      while (more && sentCount < 20) {
        const didProcess = await processOne();
        if (didProcess) {
          sentCount++;
        } else {
          more = false;
        }
      }

      await this.sendMessage(
        chatId,
        sentCount > 0
          ? `✅ پردازش صف انجام شد. ${sentCount} ویدیو به صورت استریم MP4 همراه با پاسخ‌های کامل برای شما ارسال شد.`
          : 'ℹ️ تمام ویدیوهای موجود قبلاً ارسال شده‌اند یا ویدیوی جدیدی در صف نیست.',
        getEmergencyVideosKeyboard()
      );
    } catch (err) {
      console.error('❌ خطا در ارسال مجدد ویدیوها:', err);
      await this.sendMessage(chatId, `❌ خطا در ارسال ویدیوها: ${err.message}`, getEmergencyVideosKeyboard());
    }
  }

  /**
   * گزارش کامل اسامی دانش‌آموزان ثبت‌شده در احراز هویت به تفکیک کلاس
   */
  async handleAuthStudentsList(chatId, threadId = null, filterQuery = '') {
    try {
      const res = await query(`
        SELECT 
          s.id AS session_id,
          s.name AS class_name,
          sub.reference_code,
          sub.phone,
          sub.created_at,
          sub.answers_json
        FROM emergency_auth_submissions sub
        LEFT JOIN sessions s ON sub.session_id = s.id
        ORDER BY s.name ASC, sub.id ASC
      `);

      if (!res || !res.rows || res.rows.length === 0) {
        await this.sendMessage(
          chatId,
          '📭 تاکنون هیچ احراز هویتی در سامانه ثبت نشده است.',
          chatId > 0 ? getEmergencyVideosKeyboard() : null,
          threadId
        );
        return;
      }

      const grouped = new Map();
      let totalSubmissions = 0;
      const normalizedFilter = filterQuery ? String(filterQuery).trim().toLowerCase() : '';

      for (const row of res.rows) {
        const className = row.class_name ? String(row.class_name).trim() : `کلاس ${row.session_id || 'نامشخص'}`;
        if (className === 'تست سرور') continue;

        if (normalizedFilter && !className.toLowerCase().includes(normalizedFilter)) {
          continue;
        }

        let studentName = '';
        try {
          const ans = typeof row.answers_json === 'string' ? JSON.parse(row.answers_json) : row.answers_json;
          studentName = ans?.q_student_name ? String(ans.q_student_name).trim() : '';
        } catch (_) {}

        if (!studentName) studentName = 'بدون نام مشخص';

        if (!grouped.has(className)) {
          grouped.set(className, []);
        }
        grouped.get(className).push({
          name: studentName,
          phone: row.phone,
          code: row.reference_code,
          date: row.created_at
        });
        totalSubmissions++;
      }

      if (grouped.size === 0) {
        const msgText = normalizedFilter
          ? `📭 هیچ احراز هویتی مطابق با عبارت «${filterQuery}» پیدا نشد.`
          : '📭 هیچ پاسخی از کلاس‌های رسمی ثبت نشده است.';
        await this.sendMessage(
          chatId,
          msgText,
          chatId > 0 ? getEmergencyVideosKeyboard() : null,
          threadId
        );
        return;
      }

      const header = [
        '📋 «اسامی دانش‌آموزان احراز هویت‌شده به تفکیک کلاس»',
        normalizedFilter ? `🔍 فیلتر جستجو: «${filterQuery}»` : null,
        '━━━━━━━━━━━━━━━━━━━━',
        ''
      ].filter(Boolean);

      const classBlocks = [];
      let totalUniqueStudents = 0;

      const toFaDigits = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

      for (const [clsName, students] of grouped.entries()) {
        const nameCount = new Map();
        for (const st of students) {
          nameCount.set(st.name, (nameCount.get(st.name) || 0) + 1);
        }
        totalUniqueStudents += nameCount.size;

        const lines = [
          `🏫 کلاس: ${clsName} (${toFaDigits(nameCount.size)} نفر | ${toFaDigits(students.length)} ارسال)`
        ];
        let idx = 1;
        for (const [name, count] of nameCount.entries()) {
          const repeatNotice = count > 1 ? ` (🔄 ${toFaDigits(count)} بار)` : '';
          lines.push(`  ${toFaDigits(idx)}. ${name}${repeatNotice}`);
          idx++;
        }
        lines.push('');
        classBlocks.push(lines.join('\n'));
      }

      const footer = [
        '━━━━━━━━━━━━━━━━━━━━',
        `📊 مجموع: ${toFaDigits(totalUniqueStudents)} دانش‌آموز (${toFaDigits(totalSubmissions)} بار ارسال احراز هویت در ${toFaDigits(grouped.size)} کلاس)`
      ].join('\n');

      let currentMsg = header.join('\n') + '\n';
      for (const block of classBlocks) {
        if ((currentMsg + block).length > 3500) {
          await this.sendMessage(chatId, currentMsg, null, threadId);
          currentMsg = '';
        }
        currentMsg += block;
      }

      currentMsg += '\n' + footer;
      await this.sendMessage(
        chatId,
        currentMsg,
        chatId > 0 ? getEmergencyVideosKeyboard() : null,
        threadId
      );
    } catch (err) {
      console.error('❌ خطا در دریافت لیست دانش‌آموزان احراز هویت:', err);
      await this.sendMessage(
        chatId,
        `❌ خطا در دریافت اطلاعات احراز هویت: ${err.message}`,
        chatId > 0 ? getEmergencyVideosKeyboard() : null,
        threadId
      );
    }
  }

  /**
   * پردازش فایل فشرده (ZIP/RAR) یا لینک مستقیم دانلود یا مسیر سرور و تخصیص خودکار عکس‌ها به کلاس‌ها
   */
  async handleAssistantsArchiveMessage(chatId, msg, fallbackSessionId = null) {
    const text = typeof msg.text === 'string' ? msg.text.trim() : '';
    const mediaInfo = this.extractMediaInfo(msg);
    const replyKeyboard = fallbackSessionId
      ? getAssistantsReceivingClassKeyboard()
      : getAssistantsMenuKeyboard();

    let tempArchivePath = null;
    let originalArchiveName = '';

    try {
      // حالت ۱: مسیر مستقیم فایل یا پوشه روی سرور
      if (text && !/^https?:\/\//i.test(text) && fs.existsSync(text)) {
        const stat = fs.statSync(text);
        await this.sendMessage(
          chatId,
          `⏳ در حال پردازش مسیر محلی سرور و جایگذاری خودکار عکس‌های کلاس‌ها...`,
          replyKeyboard
        );

        let summary;
        if (stat.isDirectory()) {
          summary = await SessionAssistant.importExtractedDirectory({
            extractedDir: text,
            fallbackSessionId,
            originalArchiveName: path.basename(text),
          });
        } else {
          summary = await SessionAssistant.importArchiveToSessions({
            archivePath: text,
            fallbackSessionId,
            originalArchiveName: path.basename(text),
          });
        }

        this.notifyAssistantsUpdated(summary.affectedSessionIds);
        await this.sendArchiveImportReport(chatId, summary, replyKeyboard);
        return;
      }

      // حالت ۲: لینک مستقیم دانلود (HTTP/HTTPS)
      if (text && /^https?:\/\/\S+/i.test(text)) {
        let parsedExt = '.zip';
        try {
          const u = new URL(text);
          const extFromUrl = path.extname(decodeURIComponent(u.pathname)).toLowerCase();
          if (ARCHIVE_EXTS.has(extFromUrl)) parsedExt = extFromUrl;
          originalArchiveName = path.basename(decodeURIComponent(u.pathname)) || `archive${parsedExt}`;
        } catch (_) {
          originalArchiveName = `archive${parsedExt}`;
        }

        tempArchivePath = path.join(os.tmpdir(), `raze_dl_${Date.now()}${parsedExt}`);
        await this.sendMessage(
          chatId,
          `🌐 در حال دانلود مستقیم فایل آرشیو روی سرور (بدون مصرف اینترنت شما)... لطفاً صبر کنید ⏳`,
          replyKeyboard
        );

        await this.downloadExternalUrl(text, tempArchivePath);
      } else if (mediaInfo && mediaInfo.contentType === 'archive') {
        // حالت ۳: فایل فشرده ارسال‌شده در تلگرام
        originalArchiveName = mediaInfo.originalName || `archive${mediaInfo.ext || '.zip'}`;
        tempArchivePath = path.join(os.tmpdir(), `raze_tg_${Date.now()}${mediaInfo.ext || '.zip'}`);

        await this.sendMessage(
          chatId,
          `⏳ در حال دریافت فایل «${originalArchiveName}» و استخراج خودکار کلاس‌ها...`,
          replyKeyboard
        );

        await this.downloadTelegramFile(mediaInfo.fileId, tempArchivePath, {
          chatId,
          messageId: msg.message_id,
          fileSize: mediaInfo.fileSize,
        });
      } else {
        await this.sendMessage(
          chatId,
          `⚠️ لطفاً یک فایل فشرده (.zip / .rar) یا یک لینک مستقیم دانلود (https://...) ارسال فرمایید.`,
          replyKeyboard
        );
        return;
      }

      const summary = await SessionAssistant.importArchiveToSessions({
        archivePath: tempArchivePath,
        fallbackSessionId,
        originalArchiveName,
      });

      this.notifyAssistantsUpdated(summary.affectedSessionIds);
      await this.sendArchiveImportReport(chatId, summary, replyKeyboard);
    } catch (err) {
      console.error('❌ [MohtavaTelBot] خطا در پردازش آرشیو دستیاران:', err);
      const isTooBig = /file is too big/i.test(String(err.message || ''));
      if (isTooBig) {
        await this.sendMessage(
          chatId,
          `⚠️ حجم این فایل بیش از ۲۰ مگابایت است و سرور ابری تلگرام اجازه دانلود مستقیم فایل‌های بالای ۲۰ مگابایت را به ربات‌های استاندارد نمی‌دهد.\n\n✅ ۳ راه‌حل فوری و بدون دردسر:\n۱️⃣ لینک مستقیم دانلود فایل (مثلاً از ربات فایل‌به‌لینک تلگرام یا آپلودسنتر) را همینجا بفرستید تا سرور مستقیماً با اینترنت خودش دانلود و کل ۲۴ کلاس را جایگذاری کند!\n۲️⃣ یا پوشه هر کلاس را جداگانه زیپ کنید (زیر ۲۰ مگابایت) و بفرستید.\n۳️⃣ یا روی «${BTN_ASSISTANTS_SELECT_CLASS}» بزنید، کلاس را انتخاب کنید و عکس‌های آن کلاس را بفرستید.`,
          replyKeyboard
        );
      } else {
        await this.sendMessage(
          chatId,
          `❌ خطا در پردازش فایل آرشیو:\n${err.message}`,
          replyKeyboard
        );
      }
    } finally {
      if (tempArchivePath && fs.existsSync(tempArchivePath)) {
        try {
          fs.unlinkSync(tempArchivePath);
        } catch (_) {}
      }
    }
  }

  async sendArchiveImportReport(chatId, summary, replyKeyboard) {
    const perSessionList = Object.values(summary.perSession || {});
    const lines = [
      `🎉 پردازش و جایگذاری خودکار عکس‌های دستیاران کارآگاه انجام شد!\n`,
      `📸 کل فایل‌های تصویری یافت‌شده: ${summary.totalFilesFound}`,
      `✅ عکس‌های جدید ثبت‌شده: ${summary.importedCount}`,
      `🔄 عکس‌های بروزرسانی‌شده: ${summary.updatedCount}`,
    ];

    if (summary.skippedDuplicatesCount > 0) {
      lines.push(`⏭ فرمت‌های تکراری ردشده (PNG/WEBP هم‌نام): ${summary.skippedDuplicatesCount}`);
    }

    if (perSessionList.length > 0) {
      lines.push(`\n🏫 تفکیک کلاس‌های بروزرسانی‌شده (${perSessionList.length} کلاس):`);
      perSessionList.forEach((s) => {
        lines.push(`• ${s.session_name}: +${s.added} جدید | ${s.updated} ویرایش`);
      });
    }

    if (summary.unmatchedFolders && summary.unmatchedFolders.length > 0) {
      lines.push(`\n⚠️ پوشه‌های بدون تطبیق (${summary.unmatchedCount} فایل):`);
      lines.push(summary.unmatchedFolders.slice(0, 10).join(' ، '));
    }

    await this.sendMessage(chatId, lines.join('\n'), replyKeyboard);
  }

  /**
   * ذخیره یک عکس تکی (File یا Photo) برای کلاس انتخاب‌شده
   */
  async handleAssistantsSinglePhotoMessage(chatId, msg, sessionId, sessionName) {
    const mediaInfo = this.extractMediaInfo(msg);
    if (!mediaInfo || mediaInfo.contentType !== 'image') return;

    let tempFilePath = null;
    try {
      const ext = mediaInfo.ext || '.png';
      tempFilePath = path.join(os.tmpdir(), `raze_photo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}${ext}`);
      await this.downloadTelegramFile(mediaInfo.fileId, tempFilePath, {
        chatId,
        messageId: msg.message_id,
        fileSize: mediaInfo.fileSize,
      });

      const captionText = typeof msg.caption === 'string' ? msg.caption.trim() : '';
      let rawStudentName = '';

      if (captionText) {
        rawStudentName = captionText.split('\n')[0].trim();
      } else if (msg.document && msg.document.file_name) {
        rawStudentName = extractStudentNameFromFilename(msg.document.file_name);
      }

      if (!rawStudentName || /^photo/i.test(rawStudentName) || /^image/i.test(rawStudentName)) {
        const currentList = await SessionAssistant.findBySessionId(sessionId);
        rawStudentName = `دستیار کارآگاه ${currentList.length + 1}`;
      }

      const result = await SessionAssistant.upsertStudentPhoto({
        session_id: sessionId,
        student_name: rawStudentName,
        sourceFilePath: tempFilePath,
        ext,
      });

      this.notifyAssistantsUpdated([sessionId]);

      await this.sendMessage(
        chatId,
        `✅ تصویر دستیار کارآگاه «${result.record.student_name}» در کلاس «${sessionName}» ${result.action === 'updated' ? 'بروزرسانی' : 'ثبت'} شد!`,
        getAssistantsReceivingClassKeyboard()
      );
    } catch (err) {
      console.error('❌ [MohtavaTelBot] خطا در ذخیره عکس دستیار:', err);
      await this.sendMessage(
        chatId,
        `❌ خطا در ذخیره عکس برای کلاس «${sessionName}»:\n${err.message}`,
        getAssistantsReceivingClassKeyboard()
      );
    } finally {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (_) {}
      }
    }
  }

  deleteUploadedFilesForItems(items = []) {
    for (const item of items) {
      if (item && item.payload && String(item.payload).startsWith('/uploads/weekly/')) {
        const fileName = path.basename(String(item.payload));
        const fullPath = path.join(UPLOAD_DIR, fileName);
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
          } catch (_) {}
        }
      }
    }
  }

  /**
   * شروع دریافت آپدیت‌ها از تلگرام (Long Polling)
   */
  async startPolling() {
    if (this.running) return;
    if (!this.token) {
      console.warn('⚠️ [MohtavaTelBot] توکن بات تلگرام تنظیم نشده است.');
      return;
    }

    if (!acquireProcessLock()) {
      console.log('ℹ️ [MohtavaTelBot] یک نمونه دیگر از بات روی سرور فعال است؛ از اجرای تکراری جلوگیری شد.');
      return;
    }

    this.running = true;
    await this.loadAuthorizedAdmins();
    await this.loadAuthorizedGroups();
    await this.syncStateFromDb(this.adminId);

    try {
      const meRes = await this.apiCall('getMe', {}, 10000);
      if (meRes && meRes.ok && meRes.result) {
        this.botId = meRes.result.id;
        this.botUsername = meRes.result.username;
      }
    } catch (_) {}

    console.log(`🤖 [MohtavaTelBot] بات تلگرام فعال شد (PID: ${process.pid} | ادمین اصلی: ${this.adminId} | ادمین‌ها: ${this.authorizedAdminIds.size} | گروه‌ها: ${this.authorizedGroupIds.size})`);

    const pollLoop = async () => {
      while (this.running) {
        try {
          const data = await this.apiCall(
            'getUpdates',
            {
              offset: this.offset,
              timeout: 25,
              allowed_updates: ['message', 'my_chat_member'],
            },
            35000
          );

          if (data && data.ok && Array.isArray(data.result) && data.result.length > 0) {
            const sortedUpdates = [...data.result].sort((a, b) => {
              const msgA = a.message?.message_id || 0;
              const msgB = b.message?.message_id || 0;
              if (msgA && msgB && msgA !== msgB) return msgA - msgB;
              return a.update_id - b.update_id;
            });

            for (const update of sortedUpdates) {
              this.offset = Math.max(this.offset, update.update_id + 1);
              if (update.message) {
                await this.handleMessage(update.message);
              } else if (update.my_chat_member) {
                await this.handleMyChatMember(update.my_chat_member);
              }
            }
          } else if (data && !data.ok) {
            if (data.error_code === 409) {
              await new Promise((r) => setTimeout(r, 10000));
            } else {
              console.warn('⚠️ [MohtavaTelBot] پاسخ تلگرام:', data.description);
              await new Promise((r) => setTimeout(r, 5000));
            }
          }
        } catch (err) {
          if (err.name !== 'AbortError') {
            await new Promise((r) => setTimeout(r, 4000));
          }
        }
      }
    };

    pollLoop();
  }

  stopPolling() {
    this.running = false;
  }
}

module.exports = {
  normalizeAdminPasscode,
  isMatchingAdminPasscode,
  MohtavaTelegramBot,
  normalizeBaseTitle,
  WEEK_BUTTON_TO_NUM,
  BTN_WEEK_1,
  BTN_WEEK_2,
  BTN_WEEK_3,
  BTN_WEEK_4,
  BTN_WEEK_5,
  BTN_END_WEEK,
  BTN_CHANGE_TITLE,
  BTN_UNDO_LAST,
  BTN_LIST_CURRENT_WEEK,
  BTN_BACK_MAIN,
  BTN_VIEW_ALL,
  BTN_CLEAR_ONE_WEEK,
  BTN_CLEAR_ALL,
  BTN_CONFIRM_CLEAR_ALL,
  BTN_ASSISTANTS_MENU,
  BTN_ASSISTANTS_ARCHIVE,
  BTN_ASSISTANTS_SELECT_CLASS,
  BTN_ASSISTANTS_STATS,
  BTN_ASSISTANTS_CLEAR_CLASS,
  BTN_ASSISTANTS_LIST_CLASS,
  BTN_ASSISTANTS_CHANGE_CLASS,
  BTN_EMERGENCY_VIDEOS,
  BTN_AUTH_STUDENTS_LIST,
};
