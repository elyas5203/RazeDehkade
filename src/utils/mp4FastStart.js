/**
 * src/utils/mp4FastStart.js
 * بهینه‌ساز سریع و بدون وابستگی (Pure Node.js) برای فایل‌های ویدیویی MP4 / MOV / M4A
 * انتقال اتم `moov` (جدول ایندکس و متادیتای ویدیو) از انتهای فایل به ابتدای فایل (FastStart)
 * تا مرورگر بدون نیاز به دانلود کل فایل، در کمتر از ۱ ثانیه پخش استریم ویدیو را آغاز کند.
 */

const fs = require('fs');
const path = require('path');

const CONTAINER_ATOMS = new Set(['moov', 'trak', 'edts', 'mdia', 'minf', 'dinf', 'stbl']);
const FASTSTART_EXTS = new Set(['.mp4', '.mov', '.m4a', '.m4v']);

/**
 * خواندن لیست اتم‌های سطح اول (Top-Level Boxes) در فایل MP4/MOV
 * @param {number} fd
 * @param {number} fileSize
 */
function parseTopLevelAtoms(fd, fileSize) {
  const atoms = [];
  let pos = 0;
  const headerBuf = Buffer.alloc(16);

  while (pos + 8 <= fileSize) {
    const bytesRead = fs.readSync(fd, headerBuf, 0, Math.min(16, fileSize - pos), pos);
    if (bytesRead < 8) break;

    let size = headerBuf.readUInt32BE(0);
    const type = headerBuf.toString('ascii', 4, 8);
    let headerSize = 8;

    if (size === 1) {
      if (bytesRead < 16) break;
      size = Number(headerBuf.readBigUInt64BE(8));
      headerSize = 16;
    } else if (size === 0) {
      size = fileSize - pos;
    }

    if (size < headerSize || pos + size > fileSize) {
      break;
    }

    atoms.push({
      type,
      offset: pos,
      size,
      headerSize,
    });

    pos += size;
  }

  return atoms;
}

/**
 * پیمایش بازگشتی داخل بافر `moov` و افزایش آفست‌های `stco` و `co64` به اندازه `delta`
 * @param {Buffer} buf
 * @param {number} start
 * @param {number} end
 * @param {number} delta
 * @returns {{ patchedChunks: number, overflow: boolean }}
 */
function patchMoovChunkOffsets(buf, start, end, delta) {
  let pos = start;
  let patchedChunks = 0;

  while (pos + 8 <= end) {
    let size = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    let headerSize = 8;

    if (size === 1) {
      if (pos + 16 > end) break;
      size = Number(buf.readBigUInt64BE(pos + 8));
      headerSize = 16;
    } else if (size === 0) {
      size = end - pos;
    }

    if (size < headerSize || pos + size > end) {
      break;
    }

    if (CONTAINER_ATOMS.has(type)) {
      const subResult = patchMoovChunkOffsets(buf, pos + headerSize, pos + size, delta);
      if (subResult.overflow) return subResult;
      patchedChunks += subResult.patchedChunks;
    } else if (type === 'stco') {
      if (pos + 16 <= pos + size) {
        const entryCount = buf.readUInt32BE(pos + 12);
        const tableEnd = pos + 16 + entryCount * 4;
        if (tableEnd <= pos + size) {
          for (let i = 0; i < entryCount; i++) {
            const entryPos = pos + 16 + i * 4;
            const oldOffset = buf.readUInt32BE(entryPos);
            const newOffset = oldOffset + delta;
            if (newOffset > 0xFFFFFFFF) {
              return { patchedChunks, overflow: true };
            }
            buf.writeUInt32BE(newOffset >>> 0, entryPos);
            patchedChunks++;
          }
        }
      }
    } else if (type === 'co64') {
      if (pos + 16 <= pos + size) {
        const entryCount = buf.readUInt32BE(pos + 12);
        const tableEnd = pos + 16 + entryCount * 8;
        if (tableEnd <= pos + size) {
          const bigDelta = BigInt(delta);
          for (let i = 0; i < entryCount; i++) {
            const entryPos = pos + 16 + i * 8;
            const oldOffset = buf.readBigUInt64BE(entryPos);
            buf.writeBigUInt64BE(oldOffset + bigDelta, entryPos);
            patchedChunks++;
          }
        }
      }
    }

    pos += size;
  }

  return { patchedChunks, overflow: false };
}

/**
 * کپی بازه‌ای از یک فایل باز به یک فایل خروجی با بافر ۲ مگابایتی
 */
function copyFileRangeSync(srcFd, destFd, startOffset, length) {
  const CHUNK_SIZE = 2 * 1024 * 1024;
  const buf = Buffer.allocUnsafe(Math.min(CHUNK_SIZE, Math.max(1, length)));
  let remaining = length;
  let readPos = startOffset;

  while (remaining > 0) {
    const toRead = Math.min(buf.length, remaining);
    const bytesRead = fs.readSync(srcFd, buf, 0, toRead, readPos);
    if (bytesRead <= 0) break;
    fs.writeSync(destFd, buf, 0, bytesRead);
    readPos += bytesRead;
    remaining -= bytesRead;
  }
}

/**
 * بررسی و تبدیل درجا (Atomic) فایل MP4/MOV به حالت FastStart (انتقال moov به قبل از mdat)
 * @param {string} filePath
 * @returns {{ optimized: boolean, reason: string, patchedChunks?: number }}
 */
function ensureMp4FastStart(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return { optimized: false, reason: 'invalid_path' };
  }

  const ext = path.extname(filePath).toLowerCase();
  if (!FASTSTART_EXTS.has(ext)) {
    return { optimized: false, reason: 'unsupported_ext' };
  }

  if (!fs.existsSync(filePath)) {
    return { optimized: false, reason: 'not_found' };
  }

  let srcFd = null;
  let destFd = null;
  const tmpPath = `${filePath}.faststart_${ process.pid }_${ Date.now() }.tmp`;

  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size < 32) {
      return { optimized: false, reason: 'too_small' };
    }

    srcFd = fs.openSync(filePath, 'r');
    const atoms = parseTopLevelAtoms(srcFd, stat.size);

    const mdatAtom = atoms.find(a => a.type === 'mdat');
    const moovAtom = atoms.find(a => a.type === 'moov');
    const hasMoof = atoms.some(a => a.type === 'moof');

    if (!mdatAtom || !moovAtom || hasMoof) {
      return { optimized: false, reason: 'missing_atoms_or_fragmented' };
    }

    // اگر moov از قبل جلوتر از mdat باشد، فایل FastStart است و نیازی به دستکاری ندارد
    if (moovAtom.offset < mdatAtom.offset) {
      return { optimized: false, reason: 'already_faststart' };
    }

    // محدودیت ایمنی برای سایز moov در حافظه (حداکثر ۳۲ مگابایت)
    if (moovAtom.size > 32 * 1024 * 1024) {
      return { optimized: false, reason: 'moov_too_large' };
    }

    const moovBuf = Buffer.allocUnsafe(moovAtom.size);
    const readBytes = fs.readSync(srcFd, moovBuf, 0, moovAtom.size, moovAtom.offset);
    if (readBytes !== moovAtom.size) {
      return { optimized: false, reason: 'moov_read_incomplete' };
    }

    const patchResult = patchMoovChunkOffsets(moovBuf, 0, moovBuf.length, moovAtom.size);
    if (patchResult.overflow || patchResult.patchedChunks === 0) {
      return { optimized: false, reason: patchResult.overflow ? 'offset_overflow_32bit' : 'no_chunks_found' };
    }

    destFd = fs.openSync(tmpPath, 'w');

    // ۱. نوشتن تمام اتم‌های قبل از mdat (مثل ftyp و uuid/free)
    if (mdatAtom.offset > 0) {
      copyFileRangeSync(srcFd, destFd, 0, mdatAtom.offset);
    }

    // ۲. نوشتن اتم moov اصلاح‌شده دقیقاً قبل از mdat
    fs.writeSync(destFd, moovBuf, 0, moovBuf.length);

    // ۳. نوشتن mdat و هر اتمی که بین mdat و moov قرار داشته است
    const middleLength = moovAtom.offset - mdatAtom.offset;
    if (middleLength > 0) {
      copyFileRangeSync(srcFd, destFd, mdatAtom.offset, middleLength);
    }

    // ۴. نوشتن هر اتمی که احیاناً بعد از moov در انتهای فایل بوده است
    const tailOffset = moovAtom.offset + moovAtom.size;
    const tailLength = stat.size - tailOffset;
    if (tailLength > 0) {
      copyFileRangeSync(srcFd, destFd, tailOffset, tailLength);
    }

    fs.closeSync(destFd);
    destFd = null;
    fs.closeSync(srcFd);
    srcFd = null;

    const newStat = fs.statSync(tmpPath);
    if (newStat.size !== stat.size) {
      fs.unlinkSync(tmpPath);
      return { optimized: false, reason: 'size_mismatch' };
    }

    fs.renameSync(tmpPath, filePath);
    return {
      optimized: true,
      reason: 'relocated_moov_to_front',
      patchedChunks: patchResult.patchedChunks,
    };
  } catch (err) {
    console.warn(`⚠️ [mp4FastStart] خطا در بهینه‌سازی فایل ${path.basename(filePath)}:`, err.message);
    return { optimized: false, reason: err.message };
  } finally {
    if (destFd !== null) {
      try { fs.closeSync(destFd); } catch (_) {}
    }
    if (srcFd !== null) {
      try { fs.closeSync(srcFd); } catch (_) {}
    }
    if (fs.existsSync(tmpPath)) {
      try { fs.unlinkSync(tmpPath); } catch (_) {}
    }
  }
}

/**
 * اسکن و بهینه‌سازی تمام ویدیوهای موجود در پوشه‌های آپلود هنگام بالا آمدن سرور
 * @param {string[]} dirPaths
 */
function optimizeVideosInDirectories(dirPaths = []) {
  let optimizedCount = 0;
  for (const dirPath of dirPaths) {
    if (!dirPath || !fs.existsSync(dirPath)) continue;
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          optimizedCount += optimizeVideosInDirectories([fullPath]);
        } else if (entry.isFile() && FASTSTART_EXTS.has(path.extname(entry.name).toLowerCase())) {
          const res = ensureMp4FastStart(fullPath);
          if (res.optimized) {
            optimizedCount++;
            console.log(`⚡ [FastStart] ویدیوی «${entry.name}» برای پخش آنی بهینه‌سازی شد (${res.patchedChunks} قطعه).`);
          }
        }
      }
    } catch (_) {}
  }
  return optimizedCount;
}

module.exports = {
  ensureMp4FastStart,
  optimizeVideosInDirectories,
};
