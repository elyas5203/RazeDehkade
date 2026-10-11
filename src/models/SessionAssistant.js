/**
 * src/models/SessionAssistant.js
 * مدل مدیریت تصاویر «دستیاران کارآگاه» (متربیان هر کلاس/جلسه)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { query } = require('../db/pool');
const Session = require('./Session');
const {
  OFFICIAL_SESSIONS_SPEC,
  extractStudentNameFromFilename,
  getStudentDedupKey,
  matchFolderToSession,
} = require('../utils/classFolderMatcher');
const {
  extractAssistantsArchive,
  collectExtractedImages,
} = require('../utils/archiveExtractor');

const ASSISTANTS_UPLOAD_ROOT = path.join(__dirname, '../../public/uploads/assistants');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function unlinkSafe(fileUrl) {
  if (!fileUrl) return;
  try {
    const rel = String(fileUrl).replace(/^\/+/, '');
    const fullPath = path.join(__dirname, '../../public', rel);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    // ignore unlink errors
  }
}

/**
 * اولویت پسوند در زمان ایمپورت آرشیو (در صورتی که یک متربی هم فایل PNG و هم WEBP داشته باشد)
 */
function getExtensionPriority(ext) {
  const clean = String(ext || '').toLowerCase();
  if (clean === '.png') return 3;
  if (clean === '.jpg' || clean === '.jpeg') return 2;
  if (clean === '.webp') return 1;
  return 0;
}

class SessionAssistant {
  /**
   * دریافت لیست دستیاران یک جلسه
   * @param {number} sessionId
   */
  static async findBySessionId(sessionId) {
    const res = await query(
      `SELECT * FROM session_assistants
       WHERE session_id = ?
       ORDER BY display_order ASC, id ASC`,
      [Number(sessionId)]
    );
    return res.rows || [];
  }

  /**
   * یافتن رکورد دستیار با شناسه
   * @param {number} id
   */
  static async findById(id) {
    const res = await query(
      `SELECT * FROM session_assistants
       WHERE id = ?`,
      [Number(id)]
    );
    return res.rows[0] || null;
  }

  /**
   * اطمینان از وجود هر ۲۴ کلاس رسمی در دیتابیس
   */
  static async ensureOfficialSessionsExist() {
    let sessions = await Session.findAll();
    let createdAny = false;

    for (const spec of OFFICIAL_SESSIONS_SPEC) {
      const exists = sessions.find(
        (s) =>
          (spec.chatCode && String(s.chat_code) === String(spec.chatCode)) ||
          (spec.orderCode && String(s.order_code) === String(spec.orderCode)) ||
          String(s.name).trim() === String(spec.name).trim()
      );
      if (!exists) {
        const fallbackChatCode = spec.chatCode || '999999';
        const fallbackOrderCode = spec.orderCode || '111111';
        const res = await query(
          `INSERT INTO sessions (code, order_code, chat_code, name, status, assigned_admin_id, active_case)
           VALUES (?, ?, ?, ?, 'waiting', ?, 'village')`,
          [fallbackChatCode, fallbackOrderCode, fallbackChatCode, spec.name, null]
        );
        if (res.insertId) {
          await Session.setCaseStatus(res.insertId, 'village', 'active');
          await Session.setCaseStatus(res.insertId, 'syndrome', 'locked');
          await Session.setCaseStatus(res.insertId, 'court', 'locked');
          createdAny = true;
        }
      }
    }

    if (createdAny) {
      sessions = await Session.findAll();
    }
    return sessions;
  }

  /**
   * افزودن یا بروزرسانی تصویر یک دستیار کارآگاه در یک جلسه
   * اگر متربی با همین نام در این جلسه وجود داشته باشد، بروزرسانی یا ادغام می‌شود.
   */
  static async upsertStudentPhoto({
    session_id,
    student_name,
    sourceFilePath,
    ext = '.png',
    display_order = 0,
    preferHigherPriorityExt = false,
  }) {
    const sid = Number(session_id);
    const cleanName = extractStudentNameFromFilename(student_name || 'دستیار کارآگاه');
    const dedupKey = getStudentDedupKey(cleanName);

    const existingList = await SessionAssistant.findBySessionId(sid);
    const existing = existingList.find((item) => getStudentDedupKey(item.student_name) === dedupKey);

    const cleanExt = (ext && ext.startsWith('.') ? ext : `.${ext || 'png'}`).toLowerCase();

    if (existing && preferHigherPriorityExt) {
      const existingExt = path.extname(existing.file_url || '').toLowerCase();
      if (getExtensionPriority(existingExt) >= getExtensionPriority(cleanExt)) {
        return { record: existing, action: 'skipped_duplicate' };
      }
    }

    const sessionDir = path.join(ASSISTANTS_UPLOAD_ROOT, `session_${sid}`);
    ensureDir(sessionDir);

    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const destFileName = `assistant_${sid}_${uniqueSuffix}${cleanExt}`;
    const destFullPath = path.join(sessionDir, destFileName);
    fs.copyFileSync(sourceFilePath, destFullPath);

    const fileUrl = `/uploads/assistants/session_${sid}/${destFileName}`;

    if (existing) {
      unlinkSafe(existing.file_url);
      await query(`DELETE FROM session_assistants WHERE id = ?`, [existing.id]);
    }

    const orderVal = existing ? existing.display_order : (display_order || existingList.length + 1);
    const res = await query(
      `INSERT INTO session_assistants (session_id, student_name, file_url, display_order)
       VALUES (?, ?, ?, ?)`,
      [sid, cleanName, fileUrl, orderVal]
    );

    const created = await SessionAssistant.findById(res.insertId);
    return {
      record: created,
      action: existing ? 'updated' : 'inserted',
    };
  }

  /**
   * دریافت آمار تعداد عکس‌های هر جلسه
   */
  static async getCountsBySession() {
    const sessions = await SessionAssistant.ensureOfficialSessionsExist();
    const counts = [];
    for (const s of sessions) {
      const list = await SessionAssistant.findBySessionId(s.id);
      counts.push({
        session_id: s.id,
        session_name: s.name,
        chat_code: s.chat_code,
        order_code: s.order_code,
        count: list.length,
      });
    }
    return counts;
  }

  /**
   * حذف یک عکس دستیار با شناسه
   */
  static async deleteById(id) {
    const existing = await SessionAssistant.findById(id);
    if (!existing) return null;
    unlinkSafe(existing.file_url);
    await query(`DELETE FROM session_assistants WHERE id = ?`, [Number(id)]);
    return existing;
  }

  /**
   * حذف تمام عکس‌های یک جلسه
   */
  static async deleteBySessionId(sessionId) {
    const sid = Number(sessionId);
    const list = await SessionAssistant.findBySessionId(sid);
    for (const item of list) {
      unlinkSafe(item.file_url);
    }
    await query(`DELETE FROM session_assistants WHERE session_id = ?`, [sid]);
    return list.length;
  }

  /**
   * حذف تمامی عکس‌های دستیاران در کل سامانه
   */
  static async deleteAll() {
    const sessions = await Session.findAll();
    let total = 0;
    for (const s of sessions) {
      total += await SessionAssistant.deleteBySessionId(s.id);
    }
    await query(`DELETE FROM session_assistants`);
    return total;
  }

  /**
   * پردازش یک پوشه استخراج‌شده و تخصیص هوشمند عکس‌ها به جلسات متناظر
   */
  static async importExtractedDirectory({
    extractedDir,
    fallbackSessionId = null,
    originalArchiveName = '',
  }) {
    const sessions = await SessionAssistant.ensureOfficialSessionsExist();
    const images = collectExtractedImages(extractedDir);

    const summary = {
      totalFilesFound: images.length,
      importedCount: 0,
      updatedCount: 0,
      skippedDuplicatesCount: 0,
      unmatchedCount: 0,
      unmatchedFolders: [],
      affectedSessionIds: new Set(),
      perSession: {},
    };

    const unmatchedSet = new Set();

    // مرتب‌سازی تا ابتدا فایل‌های PNG پردازش شوند و نام‌ها به ترتیب الفبا چیده شوند
    images.sort((a, b) => {
      const prioDiff = getExtensionPriority(b.ext) - getExtensionPriority(a.ext);
      if (prioDiff !== 0) return prioDiff;
      return String(a.fileName).localeCompare(String(b.fileName), 'fa');
    });

    for (const img of images) {
      let targetSession = null;

      // ۱. تطبیق بر اساس نام پوشه داخل آرشیو
      if (img.folderHint) {
        const matched = matchFolderToSession(img.folderHint, sessions);
        const sessionObj = matched?.session || matched;
        if (sessionObj && sessionObj.id) {
          targetSession = sessionObj;
        }
      }

      // ۲. اگر پوشه‌ای نبود یا تطبیق نخورد، بررسی کل مسیر نسبی
      if (!targetSession && img.relPath) {
        const parts = img.relPath.split('/').slice(0, -1);
        for (const p of parts) {
          const matched = matchFolderToSession(p, sessions);
          const sessionObj = matched?.session || matched;
          if (sessionObj && sessionObj.id) {
            targetSession = sessionObj;
            break;
          }
        }
      }

      // ۳. بررسی نام خود فایل آرشیو (مثلاً اگر فایل زیپ مربوط به یک کلاس خاص باشد)
      if (!targetSession && originalArchiveName) {
        const archiveBase = path.basename(originalArchiveName, path.extname(originalArchiveName));
        const matched = matchFolderToSession(archiveBase, sessions);
        const sessionObj = matched?.session || matched;
        if (sessionObj && sessionObj.id) {
          targetSession = sessionObj;
        }
      }

      // ۴. استفاده از fallbackSessionId در صورت انتخاب مستقیم کلاس در بات
      if (!targetSession && fallbackSessionId) {
        targetSession = sessions.find((s) => Number(s.id) === Number(fallbackSessionId)) || null;
      }

      if (!targetSession) {
        summary.unmatchedCount += 1;
        if (img.folderHint) unmatchedSet.add(img.folderHint);
        continue;
      }

      const studentName = extractStudentNameFromFilename(img.fileName);
      if (!studentName) continue;

      const result = await SessionAssistant.upsertStudentPhoto({
        session_id: targetSession.id,
        student_name: studentName,
        sourceFilePath: img.fullPath,
        ext: img.ext,
        preferHigherPriorityExt: true,
      });

      summary.affectedSessionIds.add(targetSession.id);
      if (!summary.perSession[targetSession.id]) {
        summary.perSession[targetSession.id] = {
          session_id: targetSession.id,
          session_name: targetSession.name,
          added: 0,
          updated: 0,
          skipped: 0,
        };
      }

      if (result.action === 'inserted') {
        summary.importedCount += 1;
        summary.perSession[targetSession.id].added += 1;
      } else if (result.action === 'updated') {
        summary.updatedCount += 1;
        summary.perSession[targetSession.id].updated += 1;
      } else {
        summary.skippedDuplicatesCount += 1;
        summary.perSession[targetSession.id].skipped += 1;
      }
    }

    summary.unmatchedFolders = Array.from(unmatchedSet);
    summary.affectedSessionIds = Array.from(summary.affectedSessionIds);
    return summary;
  }

  /**
   * استخراج فایل فشرده (ZIP / RAR) و ایمپورت خودکار تمام کلاس‌ها
   */
  static async importArchiveToSessions({
    archivePath,
    fallbackSessionId = null,
    originalArchiveName = '',
  }) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raze_assistants_'));
    try {
      extractAssistantsArchive(archivePath, tempDir);
      return await SessionAssistant.importExtractedDirectory({
        extractedDir: tempDir,
        fallbackSessionId,
        originalArchiveName: originalArchiveName || path.basename(archivePath),
      });
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        // ignore cleanup errors
      }
    }
  }
}

module.exports = SessionAssistant;
