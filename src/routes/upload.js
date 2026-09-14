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

// تنظیمات ذخیره‌سازی فایل‌ها روی دیسک با نام یونیک
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'file-' + uniqueSuffix + ext);
  },
});

// فیلتر فایل‌های مجاز
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|gif|webp|mp3|wav|ogg|m4a|webm|pdf|doc|docx|zip|rar|txt/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');

  if (allowedExtensions.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('پسوند فایل انتخابی مجاز نمی‌باشد.'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // حداکثر ۱۵ مگابایت
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
        return res.status(400).json({ success: false, message: 'حجم فایل بیشتر از حد مجاز (۱۵ مگابایت) است.' });
      }
      return res.status(400).json({ success: false, message: `خطا در آپلود: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'هیچ فایلی ارسال نشده است.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const fileName = req.file.originalname;

    // تشخیص message_type بر اساس پسوند
    const ext = path.extname(fileName).toLowerCase().replace('.', '');
    let messageType = 'file';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      messageType = 'image';
    } else if (['mp3', 'wav', 'ogg', 'm4a', 'webm'].includes(ext)) {
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
