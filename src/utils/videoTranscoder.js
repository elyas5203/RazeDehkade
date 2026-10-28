/**
 * src/utils/videoTranscoder.js
 * ابزار تبدیل و بهینه‌سازی فایل‌های ویدیویی به MP4 با قابلیت استریم آنی تلگرام (FastStart)
 * و قالب‌بندی پاسخ‌های ۱۲ سؤال احراز هویت اضطراری جهت ارسال به ادمین.
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { ensureMp4FastStart } = require('./mp4FastStart');

const CANDIDATE_FFMPEG_PATHS = [
  process.env.FFMPEG_PATH,
  '/home/user615/RazeDehkade/bin/ffmpeg',
  path.join(__dirname, '..', '..', 'bin', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'),
  'ffmpeg'
].filter(Boolean);

let cachedFfmpegPath = undefined;

/**
 * یافتن مسیر قابل اجرای ffmpeg روی سرور یا لوکال
 */
function getFfmpegPath() {
  if (cachedFfmpegPath !== undefined) return cachedFfmpegPath;

  for (const candidate of CANDIDATE_FFMPEG_PATHS) {
    if (path.isAbsolute(candidate)) {
      if (fs.existsSync(candidate)) {
        try {
          fs.accessSync(candidate, fs.constants.X_OK);
          cachedFfmpegPath = candidate;
          return cachedFfmpegPath;
        } catch (_) {
          // در ویندوز ممکن است X_OK کار نکند ولی فایل موجود باشد
          if (process.platform === 'win32') {
            cachedFfmpegPath = candidate;
            return cachedFfmpegPath;
          }
        }
      }
    }
  }

  // بررسی در صورتی که در PATH سیستم باشد
  cachedFfmpegPath = 'ffmpeg';
  return cachedFfmpegPath;
}

/**
 * بررسی دسترسی‌پذیری اجرای ffmpeg در زمان اجرا
 */
function isFfmpegAvailable() {
  const binary = getFfmpegPath();
  if (!binary) return Promise.resolve(false);
  return new Promise(resolve => {
    execFile(binary, ['-version'], { timeout: 3000 }, (error, stdout) => {
      if (error || !stdout || !stdout.includes('ffmpeg version')) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * عناوین کامل و ترتیب ۱۲ سؤال احراز هویت پرونده
 */
const QUESTION_LABELS = {
  q_student_name: '۰. نام و نام خانوادگی دانش‌آموز',
  q_shoe_rotary: '۱. شماره کفش‌فروشی تنها',
  q_terrorist_newspaper: '۲. اسم گروه تروریستی (پازل روزنامه)',
  q_hajj: '۳. حج از مشهد بدون خروج',
  q_padari: '۴. بهترین زمان دیدن اخبار برای خواب نرفتن',
  q_invest_2026: '۵. بهترین سرمایه‌گذاری مالی سال ۲۰۲۶',
  q_oil_painting: '۶. کلاس رنگ روغن ۳ نفره',
  q_letter_translators: '۷. مترجمان نامه کشف‌شده',
  q_migration_reason: '۸. علت اصلی مهاجرت اهالی دهکده',
  q_gem_feature: '۹. ویژگی خاص جواهر پرونده',
  q_police_shoe_store: '۱۰. وضعیت مغازه کفش‌فروشی در حضور رئیس پلیس',
  q_last_village_city: '۱۱. شهر دهکده آخر',
  q_precious_gem: '۱۲. جواهر ارزشمند پرونده',
  q_final_video_message: '۱۳. ویدیوی تشریح رخدادهای دهکده آخر (ویدیومسیج)'
};

/**
 * قالب‌بندی مشخصات و تمام ۱۲ پاسخ دانش‌آموز به متن خوانا و مرتب برای تلگرام
 */
function formatAnswersReport(answers, meta = {}) {
  const lines = [
    '📹 پاسخ ویدیویی احراز هویت پرونده',
    `🏫 کلاس: ${meta.className || 'نامشخص'}`,
    `📞 شماره تماس: ${meta.phone || 'نامشخص'}`,
    `📂 کد پرونده: ${meta.referenceCode || 'نامشخص'}`
  ];

  lines.push('\n📋 پاسخ‌های ثبت‌شده به ۱۲ معما:');

  const ansObj = answers && typeof answers === 'object' ? answers : {};
  for (const [id, label] of Object.entries(QUESTION_LABELS)) {
    const val = ansObj[id] ? String(ansObj[id]).trim() : '—';
    lines.push(`▫️ ${label}:\n   «${val}»`);
  }

  return lines.join('\n');
}

/**
 * تبدیل ویدیو به فرمت استاندارد H.264/AAC MP4 با اتم moov در ابتدا (faststart)
 * جهت پخش استریم بدون معطلی در کلاینت تلگرام و مرورگر
 */
function transcodeToStreamableMp4(inputPath, outputPath, options = {}) {
  const binary = options.ffmpegPath || getFfmpegPath();
  const args = [
    '-y',
    '-i', inputPath,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '28',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '96k',
    '-movflags', '+faststart',
    '-threads', '2',
    outputPath
  ];

  return new Promise((resolve, reject) => {
    execFile(binary, args, { timeout: 60000 }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`FFmpeg transcoding failed: ${error.message} - ${stderr || ''}`));
      }
      if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
        return reject(new Error('FFmpeg produced empty output file'));
      }
      resolve(outputPath);
    });
  });
}

/**
 * اطمینان از آماده بودن فایل جهت استریم مستقیم به عنوان MP4 در تلگرام
 * اگر فایل ورودی WebM باشد، به MP4 FastStart تبدیل می‌شود.
 * اگر از قبل MP4 باشد، moov atom آن به ابتدای فایل منتقل می‌شود.
 */
async function ensureStreamableVideo(filePath, mimeType) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Video file not found: ${filePath}`);
  }

  const isWebm = mimeType === 'video/webm' || filePath.toLowerCase().endsWith('.webm');
  const isMp4 = mimeType === 'video/mp4' || filePath.toLowerCase().endsWith('.mp4');

  if (isMp4) {
    // برای MP4 موجود، اتم moov را به ابتدای فایل می‌بریم تا پخش آنی شود
    try {
      ensureMp4FastStart(filePath);
    } catch (_) {}
    return {
      filePath,
      mimeType: 'video/mp4',
      isMp4: true,
      transcoded: false
    };
  }

  if (isWebm) {
    const available = await isFfmpegAvailable();
    if (!available) {
      // اگر ffmpeg موجود نباشد (مثلاً در محیط تست ساده محلی)، همان فایل بدون تبدیل برمی‌گردد
      return {
        filePath,
        mimeType: 'video/webm',
        isMp4: false,
        transcoded: false
      };
    }

    const outputPath = filePath.replace(/\.webm$/i, '') + `_stream_${Date.now()}.mp4`;
    try {
      await transcodeToStreamableMp4(filePath, outputPath);
      return {
        filePath: outputPath,
        mimeType: 'video/mp4',
        isMp4: true,
        transcoded: true,
        originalPath: filePath
      };
    } catch (err) {
      console.warn('⚠️ FFmpeg transcoding error, fallback to original:', err.message);
      return {
        filePath,
        mimeType: 'video/webm',
        isMp4: false,
        transcoded: false
      };
    }
  }

  return {
    filePath,
    mimeType,
    isMp4: false,
    transcoded: false
  };
}

module.exports = {
  getFfmpegPath,
  isFfmpegAvailable,
  QUESTION_LABELS,
  formatAnswersReport,
  transcodeToStreamableMp4,
  ensureStreamableVideo
};
