# 🔍 سیستم Realtime چت تعاملی برای بازی آموزشی کارآگاهی

این پروژه یک سیستم real-time چندجلسه‌ای ایزوله‌شده جهت ارتباط بین **«دستیاران کارآگاه» (کاربران)** و **ادمین‌های سیستم** برای یک بازی تعاملی آموزشی است.

---

## 🚀 ویژگی‌های کلیدی پروژه

1. **مدیریت همزمان جلسات بازی (تا ۱۰ جلسه همزمان):**
   - هر جلسه متعلق به یک گروه/کاربر به نام «دستیاران کارآگاه» است.
2. **ورود امن با کد عددی ۶ یا ۸ رقمی یونیک:**
   - کاربران با وارد کردن کد عددی یونیک بدون نیاز به ثبت‌نام وارد جلسه می‌شوند.
3. **پنل مدیریت ادمین با قابلیت پشتیبانی از چند جلسه همزمان:**
   - ادمین می‌تواند همزمان چندین جلسه را مشاهده کرده و بین آن‌ها سوئیچ کند (`admin_switch_session`).
4. **پشتیبانی کامل از انواع پیام‌ها:**
   - متن (`text`)، عکس (`image`)، ویس (`voice`)، و فایل (`file`).
   - ارسال پیام با هویت ادمین (`admin`)، پیام سیستم (`system`) یا هکر (`hacker`).
5. **پیام‌های آماده (Canned Responses):**
   - قابلیت تعریف، ویرایش، حذف و استفاده سریع از پیام‌های آماده با عنوان کوتاه توسط ادمین.
6. **تاریخچه چت ماندگار (Persistent Chat History):**
   - تمامی پیام‌ها و رویدادها در دیتابیس PostgreSQL ذخیره و بازیابی می‌شوند.
7. **ایزوله‌سازی کامل بر اساس Roomهای Socket.io:**
   - تمام پیام‌های real-time در روم اختصاصی `session_${sessionId}` مبادله می‌شوند و هیچ پیامی بین جلسات قاطی نمی‌شود.
8. **اسکلت استریم لایو صدای میکروفون (Audio Streaming Skeleton):**
   - آماده‌سازی اولیه رویدادهای `start_audio_stream`, `audio_stream_chunk`, `stop_audio_stream` برای ارسال لایو صدای میکروفون به ادمین در آینده.

---

## 🛠️ تکنولوژی‌های استفاده‌شده

- **Backend:** Node.js + Express + Socket.io
- **Database:** PostgreSQL (همراه با قابلیت فال‌بک in-memory به کمک `pg-mem` در محیط تست)
- **Authentication:** JWT (JSON Web Tokens) + رمزنگاری `bcryptjs` برای رمز عبور ادمین
- **Frontend (تست موقت):** HTML5 + CSS3 + Vanilla JavaScript + Socket.io Client

---

## 📁 ساختار پوشه‌های پروژه

```text
detective-game-realtime-chat/
├── package.json
├── .env.example
├── .gitignore
├── server.js                   # فایل اصلی راه‌اندازی سرور Express و Socket.io
├── src/
│   ├── config/
│   ├── db/
│   │   ├── pool.js             # اتصال به دیتابیس PostgreSQL و مدیریت کوئری‌ها
│   │   ├── migrate.js          # اسکریپت اجرای مایگریشن‌ها و ایجاد ادمین اولیه
│   │   └── migrations/
│   │       └── 001_initial_schema.sql # مایگریشن اسکیما جداول دیتابیس
│   ├── models/                 # مدل‌های دیتابیس (Admin, Session, Message, CannedResponse, SessionLog)
│   ├── routes/                 # مسیرهای REST API (auth, sessions, cannedResponses)
│   ├── socket/                 # ماژول Realtime Socket.io و ایزوله‌سازی روم‌ها
│   ├── middleware/             # میدلورهای JWT و احراز هویت
│   └── utils/                  # ابزار تولید کد عددی ۶ یا ۸ رقمی یونیک
├── public/                     # پنل فرانت‌اند موقت برای تست امکانات (index.html)
├── tests/                      # تست‌های اتوماتیک یکپارچه‌سازی (api.test.js)
└── README.md                   # راهنمای جامع راه‌اندازی و استفاده
```

---

## 🗄️ اسکیما دیتابیس (PostgreSQL)

1. **`admins`**: `id`, `username`, `password_hash`, `display_name`, `is_active`, `created_at`
2. **`sessions`**: `id`, `code` (عددی ۶/۸ رقمی یونیک), `name`, `status` (`waiting` | `active` | `completed` | `archived`), `assigned_admin_id`, `created_at`, `updated_at`, `last_activity_at`
3. **`messages`**: `id`, `session_id`, `sender_type` (`admin` | `user` | `system` | `hacker`), `sender_id`, `content`, `message_type` (`text` | `image` | `voice` | `file`), `file_url`, `file_name`, `is_read`, `created_at`
4. **`canned_responses`**: `id`, `admin_id`, `title`, `content`, `sort_order`, `created_at`
5. **`session_logs`**: `id`, `session_id`, `event_type`, `details`, `created_at`

---

## 🚦 راهنمای نصب و راه‌اندازی (Self-Hosted)

### ۱. پیشنیازها
- نصب **Node.js** (نسخه ۱۸ یا بالاتر)
- نصب **PostgreSQL** (نسخه ۱۲ یا بالاتر)

### ۲. پیکربندی متغیرهای محیطی (`.env`)
فایل `.env.example` را کپی کرده و به `.env` تغییر نام دهید:
```bash
cp .env.example .env
```
محتوای `.env` را بر اساس تنظیمات دیتابیس خود تنظیم کنید:
```env
PORT=3000
NODE_ENV=development

# تنظیمات PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=detective_game
DB_USER=postgres
DB_PASSWORD=postgres

# کلید JWT
JWT_SECRET=super_secret_jwt_key_detective_game_2025
JWT_EXPIRES_IN=24h

MAX_CONCURRENT_SESSIONS=10
```

### ۳. نصب وابستگی‌ها
```bash
npm install
```

### ۴. اجرای مایگریشن‌های دیتابیس
اسکریپت مایگریشن، جداول دیتابیس را ساخته و یک حساب کاربری ادمین پیش‌فرض ایجاد می‌کند:
```bash
npm run migrate
```
> **ادمین پیش‌فرض ایجاد شده:**
> - نام کاربری: `admin`
> - رمز عبور: `admin123`

### ۵. اجرا سرور
```bash
npm start
# یا برای حالت توسعه:
npm run dev
```

---

## 🧪 راهنمای تست و استفاده از پروژه

### ۱. اجرای تست‌های اتوماتیک (Automated Tests)
برای اجرای تست‌های اتوماتیک یکپارچه‌سازی REST API و Socket.io:
```bash
npm test
```

### ۲. تست دستی با پنل فرانت‌اند موقت (`public/index.html`)
پس از اجرای سرور (`npm start`)، مرورگر خود را باز کرده و به آدرس زیر بروید:
```text
http://localhost:3000
```

**مراحل تست سناریو چت:**
1. **ورود ادمین:**
   - در پنل ادمین (سمت راست)، نام کاربری `admin` و رمز `admin123` را وارد کرده و روی **«ورود ادمین»** کلیک کنید.
2. **ساخت جلسه جدید:**
   - روی دکمه **«➕ ساخت جلسه جدید»** کلیک کنید تا یک کد ۶ رقمی عددی (مثلاً `123456`) تولید شود.
3. **ورود کاربر (دستیاران کارآگاه):**
   - کد تولید شده را در پنل کاربر (سمت چپ) وارد نموده و روی **«ورود به جلسه با کد»** کلیک کنید.
4. **تبادل پیام Realtime:**
   - در هر دو پنل پیام ارسال کنید و ایزوله بودن پیام‌ها، تایپینگ آنلاین و دریافت سریع را مشاهده کنید.
5. **ارسال پیام‌های سیستم / هکر / عکس / ویس:**
   - از منوی افتادگی پنل ادمین می‌توانید نقش فرستنده را به `system` یا `hacker` تغییر دهید.
6. **تست استریم لایو ویس (اسکلت):**
   - در پنل کاربر روی دکمه **«شروع استریم ویس لایو»** کلیک کنید تا رویداد سوکت به ادمین ارسال شود.

---

## 📡 مستندات REST API

| متد | مسیر (Endpoint) | دسترسی | توضیحات |
|-----|------------------|--------|---------|
| `POST` | `/api/auth/admin/login` | عمومی | ورود ادمین با یوزرنیم و پسورد |
| `POST` | `/api/auth/user/join` | عمومی | ورود کاربر (دستیاران کارآگاه) با کد ۶ یا ۸ رقمی |
| `GET` | `/api/sessions` | فقط ادمین | دریافت لیست همه جلسات فعال و آرشیو |
| `POST` | `/api/sessions` | فقط ادمین | ساخت جلسه جدید + تولید کد عددی یونیک |
| `GET` | `/api/sessions/:id/messages` | ادمین / کاربر همان جلسه | دریافت تاریخچه پیام‌های یک جلسه |
| `GET` | `/api/canned-responses` | فقط ادمین | دریافت لیست پیام‌های آماده |
| `POST` | `/api/canned-responses` | فقط ادمین | ساخت پیام آماده جدید |
| `PUT` | `/api/canned-responses/:id` | فقط ادمین | ویرایش پیام آماده |
| `DELETE` | `/api/canned-responses/:id` | فقط ادمین | حذف پیام آماده |

---

## ⚡ مستندات رویدادهای Socket.io

| نام رویداد (Event) | فرستنده | توضیحات |
|-------------------|----------|---------|
| `join_session` | کلاینت | پیوستن به روم جلسه اختصاصی (`session_${sessionId}`) |
| `leave_session` | کلاینت | خروج از روم جلسه |
| `send_message` | کلاینت | ارسال پیام در جلسه (ذخیره در DB + انتشار در روم) |
| `new_message` | سرور | دریافت پیام جدید برودکاست‌شده به روم جلسه |
| `typing` | کلاینت | اعلام وضعیت تایپینگ کاربر یا ادمین |
| `admin_switch_session` | ادمین | سوئیچ بین چند جلسه فعال بدون قطع اتصال سوکت |
| `mark_as_read` | کلاینت | علامت‌گذاری پیام‌ها به عنوان خوانده شده |
| `start_audio_stream` | کلاینت | شروع استریم صدای میکروفون (اسکلت) |
| `audio_stream_chunk` | کلاینت | ارسال چنک داده صوتی لایو |
| `stop_audio_stream` | کلاینت | توقف استریم صدا |
