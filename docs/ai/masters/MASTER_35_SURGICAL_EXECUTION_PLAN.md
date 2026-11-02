# MASTER-35-PLAN: نقشه راه و دستورالعمل جراحی بهینه‌سازی دیتابیس، کش، همزمانی و رفع نشت حافظه
# (Surgical Execution Plan: Performance, Golden Indexing, N+1 Elimination & Memory Cleanup)

> **سند مشخصات تفصیلی و دستورالعمل قطعی جراحی کد (Surgical Implementation Blueprint)**  
> **شناسه سند:** MASTER-35-SURGERY-SPEC  
> **مرجع ممیزی:** `MASTER_35_PERFORMANCE_DATABASE_CONCURRENCY_AND_CACHE_AUDIT.md`  
> **وضعیت:** **آماده اجرا — در انتظار فرمان صریح کاربر (READY / PENDING USER AUTHORIZATION)**  
> **قانون اکید:** هیچ کدی در پروژه تغییر نیافته است؛ تمامی تغییرات با شماره خطوط دقیق، کدهای Before/After و تست‌های اعتبارسنجی در این سند تدوین شده‌اند تا پس از تایید کاربر، مرحله به مرحله و با تست‌های ضد رگرسیون پیاده‌سازی شوند.

---

## فهرست فازهای عملیاتی جراحی

1. **فاز ۱: ریشه‌کنی خطای N+1 در واکشی جلسات و آمار دستیاران**
2. **فاز ۲: ایندکس‌گذاری طلایی ۶ شرط پرمصرف پایگاه داده (مایگریشن 006)**
3. **فاز ۳: مهار نشت حافظه رم با ابطال متمرکز تایمرهای سفارشات و پاکسازی قطعات موقت**
4. **فاز ۴: رفع فریز ۶۰ ثانیه‌ای ترد اصلی با غیرمسدودسازی پردازش تصویر دستیاران**
5. **فاز ۵: اتمیسیته تراکنش‌ها (ACID) و پشتیبانی دیتابیس تستی حافظه‌ای**
6. **فاز ۶: پیاده‌سازی لایه کش ردیس با TTL استاندارد و Fallback شفاف**
7. **فاز ۷: سوئیت آزمون‌های خودکار ضدجعل عملکرد (`performance-and-nplusone.test.js`)**
8. **فاز ۸: توالی اجرای امن و سناریوی بازگشت (Rollback Plan)**

---

## فاز ۱: ریشه‌کنی خطای N+1 در واکشی جلسات و آمار دستیاران

### ۱.۱. اصلاح `Session.findAll()`
- **مسیر فایل:** [`src/models/Session.js`](file:///e:/projects/RazeDehkade/src/models/Session.js)
- **محدوده خطوط هدف:** خطوط ۱۲۹ تا ۱۵۰
- **مشکل فعلی:** اجرای ۴۹ کوئری متوالی به ازای ۲۴ جلسه درون حلقه `for (let s of sessions)`.
- **راهکار جراحی:** واکشی یکجای پرونده‌ها و شماره‌های تلفن با عملگر `WHERE session_id IN (...)` و متصل کردن در حافظه با `Map` در زمان $O(1)$.

#### کد موجود (Before):
```javascript
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
```

#### کد جایگزین پس از دستور اجرا (After):
```javascript
  static async findAll() {
    const res = await query(
      `SELECT s.*, a.display_name as assigned_admin_name,
              (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id AND m.is_read = 0 AND m.sender_type = 'user') as unread_count
       FROM sessions s
       LEFT JOIN admins a ON s.assigned_admin_id = a.id
       ORDER BY s.last_activity_at DESC`
    );
    const sessions = res.rows || [];
    if (sessions.length === 0) return [];

    const sessionIds = sessions.map(s => Number(s.id));
    const placeholders = sessionIds.map(() => '?').join(',');

    // ۱. واکشی دسته‌ای پرونده‌ها با یک کوئری
    const casesRes = await query(
      `SELECT * FROM session_cases WHERE session_id IN (${placeholders})`,
      sessionIds
    );
    const casesBySession = new Map();
    for (const c of (casesRes.rows || [])) {
      const sid = Number(c.session_id);
      if (!casesBySession.has(sid)) casesBySession.set(sid, []);
      casesBySession.get(sid).push(c);
    }

    // ۲. واکشی دسته‌ای تلفن مدرسان فقط برای جلساتی که فاقد شماره هستند
    const missingPhoneIds = sessions.filter(s => !s.teacher_phone).map(s => Number(s.id));
    const phoneBySession = new Map();
    if (missingPhoneIds.length > 0) {
      const pPlaceholders = missingPhoneIds.map(() => '?').join(',');
      const teachersRes = await query(
        `SELECT session_id, phone FROM teachers WHERE session_id IN (${pPlaceholders}) AND phone IS NOT NULL AND phone != '' ORDER BY id ASC`,
        missingPhoneIds
      );
      for (const t of (teachersRes.rows || [])) {
        phoneBySession.set(Number(t.session_id), t.phone);
      }
    }

    // ۳. اتصال نگاشتی در حافظه بدون هیچ کوئری اضافی
    for (let s of sessions) {
      if (!s.teacher_phone && phoneBySession.has(Number(s.id))) {
        s.teacher_phone = phoneBySession.get(Number(s.id));
      }
      s.cases = casesBySession.get(Number(s.id)) || [];
    }
    return sessions;
  }
```

---

### ۱.۲. اصلاح `SessionAssistant.getCountsBySession()`
- **مسیر فایل:** [`src/models/SessionAssistant.js`](file:///e:/projects/RazeDehkade/src/models/SessionAssistant.js)
- **محدوده خطوط هدف:** خطوط ۲۱۰ تا ۲۲۴
- **مشکل فعلی:** فراخوانی `findBySessionId` در حلقه ۲۴ تایی و لود کردن کل رکوردهای تصاویر به رم فقط برای شمردن `list.length`.
- **راهکار جراحی:** تجمیع در یک کوئری `GROUP BY session_id`.

#### کد موجود (Before):
```javascript
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
```

#### کد جایگزین پس از دستور اجرا (After):
```javascript
  static async getCountsBySession() {
    const sessions = await SessionAssistant.ensureOfficialSessionsExist();
    const countsRes = await query(
      `SELECT session_id, COUNT(*) as count 
       FROM session_assistants 
       GROUP BY session_id`
    );
    const countMap = new Map();
    for (const r of (countsRes.rows || [])) {
      countMap.set(Number(r.session_id), Number(r.count));
    }

    return sessions.map(s => ({
      session_id: s.id,
      session_name: s.name,
      chat_code: s.chat_code,
      order_code: s.order_code,
      count: countMap.get(Number(s.id)) || 0,
    }));
  }
```

---

## فاز ۲: ایندکس‌گذاری طلایی ۶ شرط پرمصرف دیتابیس (مایگریشن 006)

### ۲.۱. فایل مایگریشن `src/db/migrations/006_golden_indexes_and_performance.sql`
- **مسیر فایل جدید:** `src/db/migrations/006_golden_indexes_and_performance.sql`
- **محتوای قطعی:**

```sql
-- Migration: 006_golden_indexes_and_performance.sql
-- ایجاد ایندکس‌های طلایی ترکیبی جهت ریشه‌کنی Full Table Scan و تسریع کوئری‌های پرمصرف
-- منطبق بر استانداردهای USMAP-v3 و تصمیم معماری DEC-0043

-- ۱. ایندکس ترکیبی برای شمارش پیام‌های ناخوانده و علامت‌گذاری سریع
ALTER TABLE messages ADD INDEX idx_messages_session_read (session_id, sender_type, is_read);

-- ۲. ایندکس ترکیبی برای مرتب‌سازی تاریخی پیام‌های چت جلسه
ALTER TABLE messages ADD INDEX idx_messages_session_id_asc (session_id, id ASC);

-- ۳. ایندکس ترکیبی برای احراز شماره تلفن مدرس و وضعیت جلسه
ALTER TABLE sessions ADD INDEX idx_sessions_teacher_phone (teacher_phone, status, last_activity_at);
ALTER TABLE sessions ADD INDEX idx_sessions_active_status (status);

-- ۴. ایندکس ترکیبی برای توالی نمایش مراحل هفتگی سناریو
ALTER TABLE weekly_content ADD INDEX idx_weekly_content_week_order (week_number, step_order, id);

-- ۵. ایندکس ترکیبی برای تاریخچه وقایع و ترتیب دستیاران
ALTER TABLE session_logs ADD INDEX idx_session_logs_session_date (session_id, created_at DESC);
ALTER TABLE session_assistants ADD INDEX idx_session_assistants_order (session_id, display_order, id);
```

### ۲.۲. به‌روزرسانی `src/db/migrate.js`
- **مسیر فایل:** [`src/db/migrate.js`](file:///e:/projects/RazeDehkade/src/db/migrate.js)
- **محدوده خطوط هدف:** خط ۳۰
- **تغییر:** افزودن نام `'006_golden_indexes_and_performance.sql'` به آرایه `migrationFiles`.
- **گارد محافظ:** اضافه کردن چک `SHOW INDEX FROM ...` مشابه مایگریشن 004 جهت جلوگیری از اجرای تکراری یا خطای Duplicate Key در زمان راه‌اندازی مکرر سرور.

---

## فاز ۳: مهار نشت حافظه رم و تایمرهای معلق در فروشگاه گل و آپلود

### ۳.۱. مدیریت متمرکز تایمرهای ۳۳۰ ثانیه‌ای در `src/routes/store.js`
- **مسیر فایل:** [`src/routes/store.js`](file:///e:/projects/RazeDehkade/src/routes/store.js)
- **محدوده خطوط هدف:** خطوط ۱۱ و ۲۱۵ تا ۳۱۲
- **کد اصلاحی:**
  1. تعریف ساختار نگاشت در هدر ماژول:
     ```javascript
     const activeOrderTimers = new Map(); // sessionId -> timerInterval
     ```
  2. متوقف‌سازی صریح تایمر قبلی جلسه قبل از ایجاد تایمر جدید:
     ```javascript
     if (activeOrderTimers.has(existingSession.id)) {
       clearInterval(activeOrderTimers.get(existingSession.id));
       activeOrderTimers.delete(existingSession.id);
     }
     ```
  3. پاکسازی تایمر از `activeOrderTimers` به محض اتمام مرحله شمارش معکوس یا خطای خروج.

### ۳.۲. پاکسازی خودکار فایل‌های موقت آپلود در `src/routes/upload.js`
- **مسیر فایل:** [`src/routes/upload.js`](file:///e:/projects/RazeDehkade/src/routes/upload.js)
- **کد اصلاحی:** افزودن تابع دوره‌ای `cleanAbandonedChunkUploads()` که هر ۲ ساعت یک‌بار اجرا شده و فایل‌های موقت `.tmp-chunk-*` با عمر بیش از ۱ ساعت را از پوشه `public/uploads/` حذف می‌کند تا از پر شدن بیهوده دیسک سرور جلوگیری شود.

---

## فاز ۴: رفع فریز ۶۰ ثانیه‌ای سرور با غیرمسدودسازی پردازش تصویر دستیاران

### ۴.۱. اصلاح تابع `tryOptimizeAndCutoutPortrait` در `SessionAssistant.js`
- **مسیر فایل:** [`src/models/SessionAssistant.js`](file:///e:/projects/RazeDehkade/src/models/SessionAssistant.js)
- **محدوده خطوط هدف:** خطوط ۵۰ تا ۶۹
- **مشکل فعلی:** اجرای همگام `execFileSync` که کل Event Loop نودجی‌اس را تا ۶۰ ثانیه بلاک می‌کند.
- **راهکار جراحی:** تبدیل به متد ناهمگام (`async`) با `execFile` مبتنی بر کالبک و پرامیس:

```javascript
// After:
async function tryOptimizeAndCutoutPortraitAsync(fullPath) {
  if (process.env.NODE_ENV === 'test' || !fs.existsSync(BG_PROCESSOR_SCRIPT)) {
    return fullPath;
  }
  const { execFile } = require('child_process');
  const pyBins = process.platform === 'win32' ? ['python', 'python3'] : ['python3', 'python'];
  for (const pyBin of pyBins) {
    try {
      const out = await new Promise((resolve, reject) => {
        execFile(pyBin, [BG_PROCESSOR_SCRIPT, '--single', fullPath], {
          timeout: 60000,
          encoding: 'utf8',
        }, (err, stdout) => {
          if (err) return reject(err);
          resolve(stdout);
        });
      });
      const match = String(out || '').match(/OK:([^|\r\n]+)/);
      if (match && match[1] && fs.existsSync(match[1].trim())) {
        return match[1].trim();
      }
    } catch (_) {}
  }
  return fullPath;
}
```

---

## فاز ۵: اتمیسیته تراکنش‌ها (ACID Transactions)

### ۵.۱. افزودن متد `withTransaction` به `src/db/pool.js`
- **مسیر فایل:** [`src/db/pool.js`](file:///e:/projects/RazeDehkade/src/db/pool.js)
- **کارکرد:** سازگاری ۱۰۰٪ با محیط MySQL واقعی و محیط تستی `InMemoryDatabase`:

```javascript
/**
 * اجرای عملیات چندمرحله‌ای درون ترنزکشن اتمیک
 * @param {Function} callback - تابعی که پارامتر conn را دریافت می‌کند
 */
async function withTransaction(callback) {
  if (isMemoryDb || !pool || typeof pool.getConnection !== 'function') {
    // شبیه‌سازی ترنزکشن در دیتابیس تستی حافظه
    return await callback({ query });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
```

### ۵.۲. اصلاح `Session.delete(id)` با ترنزکشن اتمیک
- **مسیر فایل:** [`src/models/Session.js#L182-L191`](file:///e:/projects/RazeDehkade/src/models/Session.js#L182-L191)
- **کد اصلاحی:** محصور کردن هر ۵ دستور حذف در بلوک `withTransaction` تا هیچ داده نیمه‌کاره یا یتیمی رها نشود.

---

## فاز ۶: پیاده‌سازی لایه کش ردیس با TTL استاندارد و Fallback شفاف

### ۶.۱. ماژول `src/utils/cache.js`
- **مسیر فایل جدید:** `src/utils/cache.js`
- **ویژگی‌های کلیدی:**
  1. اگر پکیج ردیس یا متغیر `REDIS_URL` تنظیم باشد، به ردیس متصل می‌شود.
  2. در صورت نبود ردیس (ویندوز توسعه‌دهنده یا قطع موقت ردیس)، به صورت خودکار و ۱۰۰٪ شفاف به یک کش درون‌حافظه‌ای با انقضای زمان‌بندی‌شده (In-Memory Map Cache) سوئیچ می‌کند.
  3. توابع استاندارد:
     - `get(key)`
     - `set(key, value, ttlSeconds)`
     - `del(key)`
     - `delByPrefix(prefix)`
  4. اعمال TTL استاندارد:
     - جلسات ادمین (`cache:sessions:all`): ۳۰ ثانیه
     - جزئیات جلسه (`cache:session:{id}`): ۶۰ ثانیه
     - محتوای هفتگی (`cache:weekly:{week}`): ۶۰۰ ثانیه (۱۰ دقیقه)

---

## فاز ۷: سوئیت آزمون‌های خودکار ضدجعل عملکرد (`tests/performance-and-nplusone.test.js`)

سوئیت تست اختصاصی جدید در مسیر `tests/performance-and-nplusone.test.js` برای راستی‌آزمایی مستقل و ضدجعل موارد زیر پیاده‌سازی خواهد شد:
۱. **آزمون کاهش کوئری N+1:** شمارش دقیق تعداد دفعات فراخوانی متد `query()` در زمان اجرای `Session.findAll()` و اثبات عدم اجرای کوئری در حلقه.
۲. **آزمون ایندکس‌های طلایی:** بررسی اجرای بدون خطای مایگریشن 006 و حضور ایندکس‌ها.
۳. **آزمون ابطال تایمرها:** اثبات عدم باقی‌ماندن بیش از یک تایمر به ازای هر جلسه در `store.js`.
۴. **آزمون ترنزکشن اتمیک:** شبیه‌سازی خطا در میانه حذف جلسه و اثبات رول‌بک کامل و عدم تغییر داده‌ها.

---

## فاز ۸: توالی اجرای امن و سناریوی بازگشت (Rollback Plan)

### ۸.۱. ترتیب دقیق اعمال پس از دستور کاربر:
```
گام ۱: ایجاد ماژول src/utils/cache.js (بدون اثر جانبی)
گام ۲: ایجاد مایگریشن src/db/migrations/006_golden_indexes_and_performance.sql
گام ۳: اصلاح متد withTransaction در src/db/pool.js
گام ۴: اصلاح جراحی Session.findAll و Session.delete در src/models/Session.js
گام ۵: اصلاح SessionAssistant.getCountsBySession در src/models/SessionAssistant.js
گام ۶: اصلاح activeOrderTimers در src/routes/store.js
گام ۷: اجرای کامل تست‌های ۳۷‌گانه قبلی + تست جدید performance-and-nplusone
گام ۸: بررسی خروجی errors.log و اطمینان از صفر بودن خطاها
```

### ۸.۲. سناریوی بازگشت فوری (Emergency Rollback):
در صورت بروز هرگونه ناسازگاری غیرمنتظره:
- کدهای اصلاح‌شده بدون تغییر اسکیماهای اصلی طراحی شده‌اند؛ کافیست فایل‌های `Session.js` و `store.js` از آخرین کامیت گیت (`git checkout HEAD -- src/models/Session.js src/routes/store.js`) بازگردانی شوند.
- ایندکس‌های ساخته‌شده در دیتابیس آسیبی به داده‌ها نمی‌زنند و فقط برای واکشی کوئری‌ها هستند.

---
> **امضای ناظر ارشد سیستم:**  
> تمامی جزئیات فوق به صورت تئوریک و با بازبینی خط‌به‌خط سورس‌کد نهایی شده‌اند.  
> **هیچ کدی در اپلیکیشن تا قبل از صدور دستور صریح شما تغییر نخواهد کرد.**
