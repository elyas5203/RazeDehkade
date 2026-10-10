/**
 * src/routes/upload.js
 * مسیر اختصاصی آپلود فایل با multer و اعتبارسنجی نوع و پسوند فایل
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');

// اطمینان از وجود پوشه uploads
const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// پسوندهای مجاز تصویر، صوت/ویدیو و اسناد
const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp', 'png', 'apng', 'gif', 'webp',
  'avif', 'bmp', 'svg', 'ico', 'tif', 'tiff', 'heic', 'heif',
]);
const AUDIO_VIDEO_EXTENSIONS = new Set([
  'mp3', 'wav', 'ogg', 'm4a', 'webm', 'mp4', 'aac', 'flac', 'opus', 'amr', '3gp', 'mov', 'mkv',
]);
const DOC_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', '7z', 'txt', 'csv',
]);
const BLOCKED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'php', 'pl', 'py', 'rb', 'js', 'mjs', 'cjs',
  'jsp', 'asp', 'aspx', 'html', 'htm', 'msi', 'vbs', 'ps1', 'scr', 'com', 'jar', 'dll', 'so',
]);

const MIME_TO_IMAGE_EXT = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/pjpeg': '.jpg',
  'image/png': '.png',
  'image/apng': '.apng',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/bmp': '.bmp',
  'image/x-ms-bmp': '.bmp',
  'image/svg+xml': '.svg',
  'image/x-icon': '.ico',
  'image/vnd.microsoft.icon': '.ico',
  'image/tiff': '.tiff',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

function decodeOriginalFilename(rawName) {
  const str = String(rawName || '').trim();
  if (!str) return 'file';
  // اگر رشته شامل بایت‌های Latin-1 (0x80-0xFF) باشد و کاراکتر بالاتر از 0xFF نداشته باشد، از Latin-1 به UTF-8 برگردانده شود
  if (/[\u0080-\u00ff]/.test(str) && !/[^\u0000-\u00ff]/.test(str)) {
    try {
      const decoded = Buffer.from(str, 'latin1').toString('utf8');
      if (decoded && !decoded.includes('\ufffd')) {
        return decoded;
      }
    } catch (_) {}
  }
  return str;
}

// تنظیمات ذخیره‌سازی فایل‌ها روی دیسک با نام یونیک
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const decodedName = decodeOriginalFilename(file.originalname);
    let ext = path.extname(decodedName).toLowerCase();
    if (!ext && file.mimetype && MIME_TO_IMAGE_EXT[file.mimetype.toLowerCase()]) {
      ext = MIME_TO_IMAGE_EXT[file.mimetype.toLowerCase()];
    }
    cb(null, 'file-' + uniqueSuffix + ext);
  },
});

// فیلتر فایل‌های مجاز (پشتیبانی کامل از تمام فرمت‌های عکس + مسدودسازی فایل‌های اجرایی)
const fileFilter = (req, file, cb) => {
  const decodedName = decodeOriginalFilename(file.originalname);
  const ext = path.extname(decodedName).toLowerCase().replace('.', '');
  const mime = String(file.mimetype || '').toLowerCase();

  if (ext && BLOCKED_EXTENSIONS.has(ext)) {
    return cb(new Error(`پسوند فایل انتخابی مجاز نمی‌باشد (${ext}).`));
  }

  const isAllowedExt = IMAGE_EXTENSIONS.has(ext) || AUDIO_VIDEO_EXTENSIONS.has(ext) || DOC_EXTENSIONS.has(ext);
  const isSafeImageMime = mime.startsWith('image/') && !BLOCKED_EXTENSIONS.has(ext) && !mime.includes('html') && !mime.includes('script');

  if (isAllowedExt || isSafeImageMime) {
    cb(null, true);
  } else {
    cb(new Error(`پسوند فایل انتخابی مجاز نمی‌باشد (${ext || mime}).`));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // حداکثر ۲۰ مگابایت
  fileFilter: fileFilter,
});

/**
 * POST /api/upload
 * آپلود فایل تک‌آیتمی (عکس، ویس یا فایل عمومی)
 */
router.post('/', authenticateToken, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'حجم فایل بیشتر از حد مجاز (۲۰ مگابایت) است.' });
      }
      return res.status(400).json({ success: false, message: `خطا در آپلود: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'هیچ فایلی ارسال نشده است.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const fileName = decodeOriginalFilename(req.file.originalname);
    const mime = String(req.file.mimetype || '').toLowerCase();

    // تشخیص message_type بر اساس پسوند یا MIME Type
    const ext = path.extname(req.file.filename || fileName).toLowerCase().replace('.', '');
    let messageType = 'file';
    if (IMAGE_EXTENSIONS.has(ext) || mime.startsWith('image/')) {
      messageType = 'image';
    } else if (AUDIO_VIDEO_EXTENSIONS.has(ext)) {
      messageType = 'voice';
    }

    return res.json({
      success: true,
      message: 'فایل با موفقیت آپلود شد.',
      data: {
        fileUrl,
        fileName,
        messageType,
        size: req.file.size,
      },
    });
  });
});

module.exports = router;
