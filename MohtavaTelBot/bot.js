/**
 * MohtavaTelBot/bot.js
 * منطق اصلی بات تلگرام مدیریت محتوا و پیام‌های آماده ۵ هفته سناریو
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

// اطمینان از وجود پوشه آپلود هفتگی در سرور
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

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
      [{ text: BTN_END_WEEK }, { text: BTN_CHANGE_TITLE }],
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
    this.pollTimer = null;

    // وضعیت مکالمه ادمین
    this.adminState = {
      mode: 'IDLE', // 'IDLE' | 'WAIT_TITLE' | 'WAIT_CONTENT' | 'WAIT_CLEAR_WEEK' | 'WAIT_CONFIRM_CLEAR_ALL'
      week: null,
      currentTitle: '',
    };
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

    return remotePath;
  }

  /**
   * تشخیص نوع محتوا و مشخصات فایل از روی پیام تلگرام
   */
  extractMediaInfo(msg) {
    // ۱. عکس (Photo)
    if (Array.isArray(msg.photo) && msg.photo.length > 0) {
      const largestPhoto = msg.photo[msg.photo.length - 1];
      return {
        contentType: 'image',
        fileId: largestPhoto.file_id,
        ext: '.jpg',
        originalName: 'photo.jpg',
      };
    }

    // ۲. ویدیو یا ویدیو نوت یا انیمیشن
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

    // ۳. ویس یا فایل صوتی (Voice / Audio)
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

    // ۴. سند یا فایل (Document)
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

    const text = typeof msg.text === 'string' ? msg.text.trim() : '';

    // ۱. دستور شروع یا بازگشت به منوی اصلی
    if (text === '/start' || text === '/menu' || text === BTN_BACK_MAIN) {
      this.adminState = { mode: 'IDLE', week: null, currentTitle: '' };
      await this.sendMessage(
        chatId,
        `👋 سلام ادمین عزیز!\nبه ربات مدیریت «پیام‌های آماده و سناریوی ۵ هفته‌ای» خوش آمدید.\n\n۱️⃣ ابتدا هفته مورد نظر (هفته اول تا پنجم) را انتخاب کنید.\n۲️⃣ سپس عنوان را بنویسید.\n۳️⃣ بعد پیام‌ها یا فایل‌ها (متن، عکس، فیلم، صوت) را فوروارد یا ارسال کنید تا به ترتیب (۱، ۲، ۳...) در سرور ذخیره شوند.`,
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
      this.adminState = { mode: 'WAIT_CLEAR_WEEK', week: null, currentTitle: '' };
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
        this.adminState = { mode: 'IDLE', week: null, currentTitle: '' };
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
      this.adminState = { mode: 'WAIT_CONFIRM_CLEAR_ALL', week: null, currentTitle: '' };
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
      this.adminState = { mode: 'IDLE', week: null, currentTitle: '' };
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

      if (!text) {
        await this.sendMessage(
          chatId,
          `⚠️ لطفاً ابتدا یک «عنوان» متنی برای «${weekName}» بنویسید و ارسال کنید:`,
          getTitleInputKeyboard()
        );
        return;
      }

      this.adminState.currentTitle = text.slice(0, 140);
      this.adminState.mode = 'WAIT_CONTENT';

      const nextOrder = await WeeklyContent.getNextStepOrder(weekNum);
      await this.sendMessage(
        chatId,
        `✅ عنوان «${this.adminState.currentTitle}» برای «${weekName}» ثبت شد.\n\n📤 حالا محتوای آن را (متن، عکس، فیلم، ویس/صوت یا فایل) فوروارد کنید یا بفرستید.\n🔢 هر پیام یا فایلی که بفرستید، به صورت کارت جداگانه از شماره ${nextOrder} به بعد به ترتیب ثبت می‌شود.\n\n💡 برای تغییر عنوان بخش بعدی «${BTN_CHANGE_TITLE}» و در انتهای کار «${BTN_END_WEEK}» را بزنید.`,
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
        this.adminState = { mode: 'IDLE', week: null, currentTitle: '' };
        await this.sendMessage(
          chatId,
          `🎉 ثبت محتوای «${weekName}» به پایان رسید.\n📊 مجموع مراحل ثبت‌شده در ${weekName}: ${items.length} مرحله.\n\nمی‌توانید هفته بعدی را از منوی زیر انتخاب کنید:`,
          getMainMenuKeyboard()
        );
        return;
      }

      // ب) دکمه تغییر عنوان برای مراحل بعدی همان هفته
      if (text === BTN_CHANGE_TITLE) {
        this.adminState.mode = 'WAIT_TITLE';
        await this.sendMessage(
          chatId,
          `✏️ لطفاً «عنوان جدید» برای ادامه مراحل «${weekName}» را بنویسید:`,
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

      // هـ) دریافت و ذخیره محتوا (فایل رسانه‌ای یا پیام متنی)
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
    this.adminState = {
      mode: 'WAIT_TITLE',
      week: weekNum,
      currentTitle: '',
    };

    await this.sendMessage(
      chatId,
      `📌 «${weekName}» انتخاب شد.\n📊 تعداد مراحل ثبت‌شده فعلی در این هفته: ${items.length}\n\n✏️ لطفاً «عنوان» را بنویسید و بفرستید:`,
      getTitleInputKeyboard()
    );
  }

  /**
   * ذخیره یک پیام متنی یا دانلود و ذخیره فایل (عکس، فیلم، صوت، سند) به ترتیب در هفته انتخاب‌شده
   */
  async saveIncomingContentItem(chatId, msg) {
    const weekNum = this.adminState.week;
    const weekName = WEEK_NAMES[weekNum];
    const title = this.adminState.currentTitle || `مرحله ${weekName}`;
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
          title,
          payload: publicFileUrl,
          file_name: safeUniqueName,
        });

        this.notifyAdminPanel(weekNum);

        await this.sendMessage(
          chatId,
          `✅ ثبت شد!\n📅 ${weekName} — مرحله شماره ${created.step_order}\n🏷 عنوان: ${title}\n📂 نوع محتوا: ${formatTypeFa(mediaInfo.contentType)}`,
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
          title,
          payload: textContent,
          file_name: null,
        });

        this.notifyAdminPanel(weekNum);

        const preview = textContent.length > 60 ? textContent.slice(0, 60) + '…' : textContent;
        await this.sendMessage(
          chatId,
          `✅ ثبت شد!\n📅 ${weekName} — مرحله شماره ${created.step_order}\n🏷 عنوان: ${title}\n📂 نوع محتوا: 💬 متن\n📝 متن: «${preview}»`,
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
      lines.push(`${item.step_order}. [${typeLabel}] ${item.title}${snippet}`);
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
      for (const item of items.slice(0, 8)) {
        lines.push(`   #${item.step_order} ${formatTypeFa(item.content_type)} — ${item.title}`);
      }
      if (items.length > 8) {
        lines.push(`   ... و ${items.length - 8} مرحله دیگر`);
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

    this.running = true;
    console.log(`🤖 [MohtavaTelBot] بات تلگرام فعال شد (محدود به آیدی ادمین: ${this.adminId})`);

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
            // مرتب‌سازی دقیق بر اساس message_id / update_id برای حفظ ۱۰۰٪ ترتیب پیام‌های فورواردشده همزمان
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
            // اگر نمونه دیگری از بات (مثلاً به صورت مستقل با PM2) در حال اجرا باشد، آرام عقب‌نشینی کن
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
