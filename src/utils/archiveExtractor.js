/**
 * src/utils/archiveExtractor.js
 * استخراج‌کننده بومی و بدون وابستگی فایل‌های فشرده (ZIP به صورت Pure Node.js + پشتیبانی از RAR/7Z/TAR)
 * با پشتیبانی کامل از نام پوشه‌ها و فایل‌های فارسی (UTF-8)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execFileSync } = require('child_process');

const ALLOWED_IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.avif']);

/**
 * رمزگشایی نام فایل داخل هدر ZIP با پشتیبانی از UTF-8 و فیلد اکسترا 0x7075 (Info-ZIP Unicode Path)
 */
function decodeZipEntryName(nameBuf, extraBuf) {
  // ۱. بررسی فیلد اکسترا Info-ZIP Unicode Path (0x7075)
  if (extraBuf && extraBuf.length >= 9) {
    let offset = 0;
    while (offset + 4 <= extraBuf.length) {
      const headerId = extraBuf.readUInt16LE(offset);
      const dataSize = extraBuf.readUInt16LE(offset + 2);
      if (offset + 4 + dataSize > extraBuf.length) break;
      if (headerId === 0x7075 && dataSize > 5) {
        const unicodeName = extraBuf.subarray(offset + 9, offset + 4 + dataSize).toString('utf8');
        if (unicodeName) return unicodeName;
      }
      offset += 4 + dataSize;
    }
  }

  // ۲. رمزگشایی استاندارد UTF-8
  return nameBuf.toString('utf8');
}

/**
 * استخراج بومی فایل ZIP با استفاده از Central Directory و ماژول داخلی zlib نودجی‌اس
 * (بدون نیاز به هیچ پکیج خارجی یا ابزار خط فرمان؛ ۱۰۰٪ سازگار با ویندوز و لینوکس)
 */
function extractZipNative(zipFilePath, destDir) {
  const buf = fs.readFileSync(zipFilePath);
  const len = buf.length;

  // یافتن End of Central Directory (EOCD) با امضای 0x06054b50 از انتهای فایل
  let eocdOffset = -1;
  const minSearchOffset = Math.max(0, len - 65558);
  for (let i = len - 22; i >= minSearchOffset; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error('ساختار فایل ZIP معتبر نیست (EOCD پیدا نشد).');
  }

  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  const cdSize = buf.readUInt32LE(eocdOffset + 12);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);

  let ptr = cdOffset;
  const cdEnd = Math.min(len, cdOffset + cdSize);
  let extractedCount = 0;

  for (let entryIdx = 0; entryIdx < totalEntries && ptr + 46 <= cdEnd; entryIdx++) {
    const sig = buf.readUInt32LE(ptr);
    if (sig !== 0x02014b50) break;

    const compressionMethod = buf.readUInt16LE(ptr + 10);
    const compressedSize = buf.readUInt32LE(ptr + 20);
    const fileNameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localHeaderOffset = buf.readUInt32LE(ptr + 42);

    const nameBuf = buf.subarray(ptr + 46, ptr + 46 + fileNameLen);
    const extraBuf = buf.subarray(ptr + 46 + fileNameLen, ptr + 46 + fileNameLen + extraLen);
    const rawEntryName = decodeZipEntryName(nameBuf, extraBuf).replace(/\\/g, '/');

    ptr += 46 + fileNameLen + extraLen + commentLen;

    // رد کردن دایرکتوری‌ها و فایل‌های مخفی سیستم‌عامل (__MACOSX / .DS_Store / Thumbs.db)
    if (
      !rawEntryName ||
      rawEntryName.endsWith('/') ||
      rawEntryName.includes('__MACOSX') ||
      rawEntryName.includes('..') ||
      path.basename(rawEntryName).startsWith('._')
    ) {
      continue;
    }

    const ext = path.extname(rawEntryName).toLowerCase();
    if (!ALLOWED_IMAGE_EXTS.has(ext)) {
      continue;
    }

    if (localHeaderOffset + 30 > len) continue;
    if (buf.readUInt32LE(localHeaderOffset) !== 0x04034b50) continue;

    const localNameLen = buf.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const dataEnd = dataStart + compressedSize;

    if (dataEnd > len) continue;

    const compressedSlice = buf.subarray(dataStart, dataEnd);
    let fileContent;
    if (compressionMethod === 0) {
      fileContent = compressedSlice;
    } else if (compressionMethod === 8) {
      fileContent = zlib.inflateRawSync(compressedSlice);
    } else {
      continue;
    }

    // پاکسازی مسیر نسبی و ذخیره در پوشه مقصد
    const safeParts = rawEntryName
      .split('/')
      .map(p => p.trim().replace(/[<>:"|?*\x00-\x1F]/g, ''))
      .filter(Boolean);

    if (safeParts.length === 0) continue;

    const targetPath = path.join(destDir, ...safeParts);
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(targetPath, fileContent);
    extractedCount++;
  }

  return extractedCount;
}

/**
 * تلاش برای استخراج فایل‌های RAR یا 7Z یا ZIP با ابزارهای سیستمی (در صورت نصب بودن روی سرور)
 */
function trySystemExtract(archivePath, destDir) {
  const ext = path.extname(archivePath).toLowerCase();
  const candidates = [];

  if (ext === '.rar') {
    candidates.push(
      { cmd: 'unrar', args: ['x', '-o+', '-y', archivePath, destDir + path.sep] },
      { cmd: '7z', args: ['x', '-y', `-o${destDir}`, archivePath] },
      { cmd: '7za', args: ['x', '-y', `-o${destDir}`, archivePath] },
      { cmd: 'unar', args: ['-f', '-o', destDir, archivePath] },
      { cmd: 'bsdtar', args: ['-xf', archivePath, '-C', destDir] },
      { cmd: 'tar', args: ['-xf', archivePath, '-C', destDir] }
    );
    if (process.platform === 'win32') {
      candidates.push(
        { cmd: 'C:\\Program Files\\WinRAR\\UnRAR.exe', args: ['x', '-o+', '-y', archivePath, destDir + path.sep] },
        { cmd: 'C:\\Program Files\\7-Zip\\7z.exe', args: ['x', '-y', `-o${destDir}`, archivePath] }
      );
    }
  } else {
    candidates.push(
      { cmd: 'unzip', args: ['-o', '-q', archivePath, '-d', destDir] },
      { cmd: '7z', args: ['x', '-y', `-o${destDir}`, archivePath] },
      { cmd: 'tar', args: ['-xf', archivePath, '-C', destDir] }
    );
  }

  for (const item of candidates) {
    try {
      execFileSync(item.cmd, item.args, { stdio: 'ignore', timeout: 120000 });
      return true;
    } catch (_) {}
  }

  return false;
}

/**
 * پیمایش بازگشتی پوشه استخراج‌شده و جمع‌آوری تمام عکس‌های دستیاران به همراه نام پوشه کلاس آن‌ها
 */
function collectExtractedImages(rootDir, fallbackClassHint = '') {
  const results = [];

  function walk(currentDir, relativeChain = []) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === '__MACOSX') continue;
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, [...relativeChain, entry.name]);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!ALLOWED_IMAGE_EXTS.has(ext)) continue;

        // نزدیک‌ترین پوشه والد که نام عمومی («عکس های کاراگاهی») نباشد به عنوان نام کلاس انتخاب می‌شود
        let folderName = fallbackClassHint;
        for (let i = relativeChain.length - 1; i >= 0; i--) {
          const candidate = relativeChain[i];
          if (!/^(عکس[\s\u200c]*های[\s\u200c]*کار[اآ]گاهی|photos|images|assistants|root)$/iu.test(candidate.trim())) {
            folderName = candidate;
            break;
          }
        }

        const stat = fs.statSync(fullPath);
        const resolvedFolder = folderName || relativeChain[relativeChain.length - 1] || fallbackClassHint;
        results.push({
          folderName: resolvedFolder,
          folderHint: resolvedFolder,
          relPath: [...relativeChain, entry.name].join('/'),
          fileName: entry.name,
          ext,
          fullPath,
          sizeBytes: stat.size,
        });
      }
    }
  }

  if (fs.existsSync(rootDir)) {
    walk(rootDir, []);
  }
  return results;
}

/**
 * استخراج کامل فایل فشرده (ZIP یا RAR) و بازگرداندن لیست تصاویر به تفکیک پوشه کلاس
 */
function extractAssistantsArchive(archivePath, tempExtractDir, fallbackClassHint = '') {
  if (!fs.existsSync(tempExtractDir)) {
    fs.mkdirSync(tempExtractDir, { recursive: true });
  }

  const ext = path.extname(archivePath).toLowerCase();
  let extractedOk = false;

  if (ext === '.zip') {
    try {
      const count = extractZipNative(archivePath, tempExtractDir);
      if (count > 0) extractedOk = true;
    } catch (_) {}
  }

  if (!extractedOk) {
    extractedOk = trySystemExtract(archivePath, tempExtractDir);
  }

  if (!extractedOk && ext === '.rar') {
    throw new Error(
      'برای استخراج فایل RAR روی سرور نیاز به ابزار unrar یا 7z است، یا لطفاً فایل را با فرمت استاندارد .zip ارسال فرمایید (فرمت ZIP بدون نیاز به هیچ برنامه‌ای به صورت پیش‌فرض در سرور باز می‌شود).'
    );
  }

  return collectExtractedImages(tempExtractDir, fallbackClassHint);
}

function isArchiveFilename(fileName) {
  const ext = path.extname(String(fileName || '')).toLowerCase();
  return ext === '.zip' || ext === '.rar' || ext === '.7z';
}

module.exports = {
  ALLOWED_IMAGE_EXTS,
  extractZipNative,
  extractAssistantsArchive,
  collectExtractedImages,
  isArchiveFilename,
};
