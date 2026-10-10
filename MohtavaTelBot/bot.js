/**
 * MohtavaTelBot/bot.js
 * سیستم یکپارچه و بازطراحی‌شده بات تلگرام مدیریت محتوا و پیام‌های آماده ۵ هفته سناریو
 * محدود به آیدی عددی ادمین: 5490508090
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const {
  BOT_TOKEN,
  AUTHORIZED_ADMIN_ID,
  UPLOAD_DIR,
  PUBLIC_URL_PREFIX,
  WEEK_NAMES,
} = require('./config');

const WeeklyContent = require('../src/models/WeeklyContent');
const { query } = require('../src/db/pool');
const { ensureMp4FastStart } = require('../src/utils/mp4FastStart');

// اطمینان از وجود پوشه آپلود هفتگی در سرور
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const PID_LOCK_FILE = path.join(__dirname, '.bot.pid');

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg', '.heic']);
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.mkv', '.webm', '.3gp', '.avi']);
const VOICE_EXTS = new Set(['.ogg', '.oga', '.mp3', '.wav', '.m4a', '.aac', '.flac', '.opus']);

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
      [{ text: BTN_WEEK_1 }, { text: BTN_WEEK_2 }],
      [{ text: BTN_WEEK_3 }, { text: BTN_WEEK_4 }],
      [{ text: BTN_WEEK_5 }, { text: BTN_VIEW_ALL }],
      [{ text: BTN_CLEAR_ONE_WEEK }, { text: BTN_CLEAR_ALL }],
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
    this.io = options.io || null;
    this.apiBase = `https://api.telegram.org/bot${this.token}`;
    this.fileBase = `https://api.telegram.org/file/bot${this.token}`;
    this.offset = 0;
    this.running = false;

    // وضعیت مکالمه ادمین (همگام با دیتابیس MySQL)
    this.adminState = {
      mode: 'IDLE', // 'IDLE' | 'WAIT_TITLE' | 'WAIT_CONTENT' | 'WAIT_CLEAR_WEEK' | 'WAIT_CONFIRM_CLEAR_ALL'
      week: null,
      currentTitle: '',
      titleCounter: 0,
    };
  }

  async syncStateFromDb() {
    try {
      const res = await query('SELECT * FROM bot_state WHERE admin_id = ?', [this.adminId]);
      if (res.rows && res.rows.length > 0) {
        const row = res.rows[0];
        this.adminState = {
          mode: row.mode || 'IDLE',
          week: row.active_week ? Number(row.active_week) : null,
          currentTitle: row.base_title || '',
          titleCounter: Number(row.title_counter) || 0,
        };
      }
    } catch (_) {}
  }

  async setState(patch) {
    this.adminState = { ...this.adminState, ...patch };
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
          this.adminId,
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

  async sendMessage(chatId, text, replyMarkup = null) {
    const payload = {
      chat_id: chatId,
      text,
    };
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
   * دانلود فایل از سرور تلگرام و ذخیره در پوشه public/uploads/weekly
   */
  async downloadTelegramFile(fileId, destFilePath) {
    const fileInfoRes = await this.apiCall('getFile', { file_id: fileId }, 20000);
    if (!fileInfoRes || !fileInfoRes.ok || !fileInfoRes.result || !fileInfoRes.result.file_path) {
      throw new Error(fileInfoRes?.description || 'خطا در دریافت اطلاعات فایل از تلگرام (getFile)');
    }

    const remotePath = fileInfoRes.result.file_path;
    const downloadUrl = `${this.fileBase}/${remotePath}`;

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

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
        ext: '.jpg',
        originalName: 'photo.jpg',
      };
    }

    if (msg.video) {
      const origExt = path.extname(msg.video.file_name || '').toLowerCase() || '.mp4';
      return {
        contentType: 'video',
        fileId: msg.video.file_id,
        ext: VIDEO_EXTS.has(origExt) ? origExt : '.mp4',
        originalName: msg.video.file_name || `video${origExt}`,
      };
    }

    if (msg.video_note) {
      return {
        contentType: 'video',
        fileId: msg.video_note.file_id,
        ext: '.mp4',
        originalName: 'video_note.mp4',
      };
    }

    if (msg.animation) {
      return {
        contentType: 'video',
        fileId: msg.animation.file_id,
        ext: '.mp4',
        originalName: msg.animation.file_name || 'animation.mp4',
      };
    }

    if (msg.voice) {
      return {
        contentType: 'voice',
        fileId: msg.voice.file_id,
        ext: '.ogg',
        originalName: 'voice.ogg',
      };
    }

    if (msg.audio) {
      const origExt = path.extname(msg.audio.file_name || '').toLowerCase() || '.mp3';
      return {
        contentType: 'voice',
        fileId: msg.audio.file_id,
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

      if (IMAGE_EXTS.has(origExt) || mime.startsWith('image/')) {
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
        ext,
        originalName: origName,
      };
    }

    return null;
  }

  /**
   * پردازش پیام دریافتی از تلگرام (به‌صورت ترتیبی و صف‌بندی‌شده)
   */
  async handleMessage(msg) {
    if (!msg || !msg.chat || !msg.from) return;

    const chatId = msg.chat.id;
    const userId = Number(msg.from.id);

    // بررسی امنیتی آیدی عددی ادمین (فقط 5490508090)
    if (userId !== this.adminId) {
      await this.sendMessage(
        chatId,
        `⛔️ دسترسی غیرمجاز!\nاین ربات فقط برای ادمین اصلی سامانه (${this.adminId}) فعال است.`
      );
      return;
    }

    // همگام‌سازی وضعیت با دیتابیس MySQL
    await this.syncStateFromDb();

    const text = typeof msg.text === 'string' ? msg.text.trim() : '';

    // ۱. دستور شروع یا بازگشت به منوی اصلی
    if (text === '/start' || text === '/menu' || text === BTN_BACK_MAIN) {
      await this.setState({ mode: 'IDLE', week: null, currentTitle: '', titleCounter: 0 });
      await this.sendMessage(
        chatId,
        `👋 سلام ادمین عزیز!\nبه ربات مدیریت «پیام‌های آماده و سناریوی ۵ هفته‌ای» خوش آمدید.\n\n۱️⃣ ابتدا هفته مورد نظر (هفته اول تا پنجم) را انتخاب کنید.\n۲️⃣ سپس عنوان دسته را بنویسید (مثلاً: «پیام ها» یا «ویدیو»).\n۳️⃣ حالا پیام‌ها را یکی‌یکی بفرستید؛ بات خودش به عنوان عدد اضافه می‌کند (پیام 1، پیام 2، پیام 3...) و تا وقتی «${BTN_CHANGE_TITLE}» را نزنید، عنوان تغییر نمی‌کند!`,
        getMainMenuKeyboard()
      );
      return;
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

        await this.downloadTelegramFile(mediaInfo.fileId, localFilePath);

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
    await this.syncStateFromDb();
    console.log(`🤖 [MohtavaTelBot] بات تلگرام فعال شد (PID: ${process.pid} | محدود به آیدی ادمین: ${this.adminId})`);

    const pollLoop = async () => {
      while (this.running) {
        try {
          const data = await this.apiCall(
            'getUpdates',
            {
              offset: this.offset,
              timeout: 25,
              allowed_updates: ['message'],
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
};
