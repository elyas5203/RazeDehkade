# 🧭 شاخص و رادار جستجوی سریع معماری (INDEX.md)
> **قانون آدرس‌دهی صریح و میکروسکوپی (Microscopic Deterministic Index):**  
> این سند نگاشت فوری و دقیق میان کلیدواژه‌ها، مفاهیم بیزینسی، مسیرهای فایل، شماره خطوط و نمادها (کلاس‌ها و توابع) را فراهم می‌آورد.

---

## ۱. نگاشت مسیرهای API و نقاط انتهایی (REST Endpoints Index)

| مسیر API | متد | فایل پیاده‌سازی | بازه خطوط | تابع / کنترلر | توضیحات و دامنه مرتبط |
|---|---|---|---|---|---|
| `/api/auth/admin/login` | POST | [`src/routes/auth.js`](file:///c:/xampp/htdocs/RazeDehkade/src/routes/auth.js) | L18-L58 | `router.post('/admin/login')` | ورود ادمین با نام کاربری و پسورد هش‌شده با bcrypt |
| `/api/auth/user/login-code` | POST | [`src/routes/auth.js`](file:///c:/xampp/htdocs/RazeDehkade/src/routes/auth.js) | L65-L115 | `router.post('/user/login-code')` | ورود دانش‌آموز با کد ۶ رقمی بسته |
| `/api/store/products` | GET | [`src/routes/store.js`](file:///c:/xampp/htdocs/RazeDehkade/src/routes/store.js) | L35-L40 | `router.get('/products')` | دریافت کاتالوگ ۱۵ محصول فروشگاه به ریال |
| `/api/store/validate-discount` | POST | [`src/routes/store.js`](file:///c:/xampp/htdocs/RazeDehkade/src/routes/store.js) | L46-L69 | `router.post('/validate-discount')` | بررسی اعتبار کد تخفیف ۱۰۰٪ بر اساس `order_code` |
| `/api/store/order` | POST | [`src/routes/store.js`](file:///c:/xampp/htdocs/RazeDehkade/src/routes/store.js) | L75-L290 | `router.post('/order')` | ثبت سفارش ۵ قلم الزامی، آغاز تایمر ۳۰ ثانیه و بلک‌اوت |
| `/api/upload` | POST | [`src/routes/upload.js`](file:///c:/xampp/htdocs/RazeDehkade/src/routes/upload.js) | L25-L65 | `router.post('/')` | آپلود مستقیم انواع فرمت‌های تصویر، صوت و مدیا |
| `/api/upload/chunk` | POST | [`src/routes/upload.js`](file:///c:/xampp/htdocs/RazeDehkade/src/routes/upload.js) | L70-L135 | `router.post('/chunk')` | آپلود تکه‌ای ۲۰۰KB جهت عبور از لیمیت Nginx |
| `/api/sessions` | GET | [`src/routes/sessions.js`](file:///c:/xampp/htdocs/RazeDehkade/src/routes/sessions.js) | L25-L75 | `router.get('/')` | لیست جلسات فعال، کدهای ورود و وضعیت آنلاین |
| `/api/sessions/:id/lock` | POST | [`src/routes/sessions.js`](file:///c:/xampp/htdocs/RazeDehkade/src/routes/sessions.js) | L120-L155 | `router.post('/:id/lock')` | قفل یا بازگشایی ارسال پیام دانش‌آموزان در جلسه |
| `/api/sessions/:id/vault/lock` | POST | [`src/routes/sessions.js`](file:///c:/xampp/htdocs/RazeDehkade/src/routes/sessions.js) | L230-L280 | `router.post('/:id/vault/lock')` | کنترل پلمپ سایلنت گاوصندوق برای یک جلسه خاص |
| `/api/sessions/vault/lock-all` | POST | [`src/routes/sessions.js`](file:///c:/xampp/htdocs/RazeDehkade/src/routes/sessions.js) | L290-L335 | `router.post('/vault/lock-all')` | پلمپ/بازگشایی همگانی گاوصندوق تمام جلسات در داشبورد |
| `/api/sessions/:id/assistants` | GET | [`src/routes/sessions.js`](file:///c:/xampp/htdocs/RazeDehkade/src/routes/sessions.js) | L350-L410 | `router.get('/:id/assistants')` | دریافت لیست پرتره‌های دستیاران ۲۴ کلاس با تطبیق نام |
| `/api/canned-responses` | GET/POST | [`src/routes/cannedResponses.js`](file:///c:/xampp/htdocs/RazeDehkade/src/routes/cannedResponses.js) | L15-L85 | `router.get('/') / post('/')` | مدیریت پیام‌های از پیش‌آماده سناریوی کارآگاه |
| `/api/weekly-content` | GET | [`src/routes/weeklyContent.js`](file:///c:/xampp/htdocs/RazeDehkade/src/routes/weeklyContent.js) | L15-L65 | `router.get('/')` | دریافت محتوای چندرسانه‌ای ۵ هفته سناریو |

---

## ۲. نگاشت رویدادهای بلادرنگ سوکت (Socket.io Realtime Events)

| نام رویداد سوکت | جهت داده | فایل مرجع | بازه خطوط | شرح رفتار |
|---|---|---|---|---|
| `join_session` | کلاینت -> سرور | [`src/socket/index.js`](file:///c:/xampp/htdocs/RazeDehkade/src/socket/index.js) | L110-L165 | ورود به روم ایزوله `session_${sessionId}` و برودکست آنلاین |
| `send_message` | کلاینت -> سرور | [`src/socket/index.js`](file:///c:/xampp/htdocs/RazeDehkade/src/socket/index.js) | L170-L245 | ارسال پیام، کنترل ضداسپم ۵ ثانیه‌ای و تفکیک حباب‌ها |
| `new_message` | سرور -> روم | [`src/socket/index.js`](file:///c:/xampp/htdocs/RazeDehkade/src/socket/index.js) | L220-L240 | ارسال پیام جدید به تمام اعضای همان روم جلسه |
| `edit_message` | کلاینت -> سرور | [`src/socket/index.js`](file:///c:/xampp/htdocs/RazeDehkade/src/socket/index.js) | L260-L295 | ویرایش متن پیام توسط خود دانش‌آموز (`sender_type === 'user'`) |
| `delete_message` | کلاینت -> سرور | [`src/socket/index.js`](file:///c:/xampp/htdocs/RazeDehkade/src/socket/index.js) | L300-L335 | حذف پیام توسط خود دانش‌آموز و برودکست حذف به جلسه |
| `chat_lock_toggle` | ادمین -> سرور | [`src/socket/index.js`](file:///c:/xampp/htdocs/RazeDehkade/src/socket/index.js) | L350-L380 | تغییر وضعیت قفل چت و اطلاع‌رسانی آنی به دانش‌آموزان |
| `listen_live_audio` | ادمین -> سرور | [`src/socket/index.js`](file:///c:/xampp/htdocs/RazeDehkade/src/socket/index.js) | L410-L450 | آغاز شنود زنده صدای محیط کلاس دانش‌آموز توسط کارآگاه |
| `audio_stream_data` | کلاینت -> سرور | [`src/socket/index.js`](file:///c:/xampp/htdocs/RazeDehkade/src/socket/index.js) | L460-L490 | ارسال چانک‌های صوتی فشرده ADPCM به ادمین متصل |
| `start_hack_sequence` | ادمین -> سرور | [`src/socket/index.js`](file:///c:/xampp/htdocs/RazeDehkade/src/socket/index.js) | L510-L550 | فعال‌سازی سکانس ۵۳.۵ ثانیه‌ای حمله سایبری مزداک |
| `stop_hack_sequence` | ادمین -> سرور | [`src/socket/index.js`](file:///c:/xampp/htdocs/RazeDehkade/src/socket/index.js) | L560-L580 | توقف اضطراری سکانس هک و بازیابی کنترل صفحه |
| `order_countdown_tick`| سرور -> ادمین | [`src/routes/store.js`](file:///c:/xampp/htdocs/RazeDehkade/src/routes/store.js) | L220-L260 | ارسال تیک‌های ثانیه‌ای پیک و بلک‌اوت برای داشبورد |

---

## ۳. نگاشت مدل‌های پایگاه داده MySQL (Database Models)

| نام مدل | فایل کلاس | جدول MySQL | کلیدهای اصلی/خارجی | مسئولیت |
|---|---|---|---|---|
| `Session` | [`src/models/Session.js`](file:///c:/xampp/htdocs/RazeDehkade/src/models/Session.js) | `sessions` | `id (PK)`, `order_code (UQ)`, `access_code (UQ)` | نگهداری جلسات ۲۴ کلاس، وضعیت قفل چت، وضعیت گاوصندوق |
| `Message` | [`src/models/Message.js`](file:///c:/xampp/htdocs/RazeDehkade/src/models/Message.js) | `messages` | `id (PK)`, `session_id (FK)` | آرشیو پیام‌های متنی، تصاویر، صداها و وضعیت حذف/ویرایش |
| `Admin` | [`src/models/Admin.js`](file:///c:/xampp/htdocs/RazeDehkade/src/models/Admin.js) | `admins` | `id (PK)`, `username (UQ)` | نگهداری حساب‌های کاربری ادمین، نقش‌ها و پسوردهای هش‌شده |
| `Teacher` | [`src/models/Teacher.js`](file:///c:/xampp/htdocs/RazeDehkade/src/models/Teacher.js) | `teachers` | `id (PK)`, `session_id (FK)`, `phone` | اتصال شماره موبایل آموزگار به کلاس و لاگ سفارش |
| `SessionAssistant` | [`src/models/SessionAssistant.js`](file:///c:/xampp/htdocs/RazeDehkade/src/models/SessionAssistant.js) | `session_assistants` | `id (PK)`, `session_id (FK)` | رجیستری پرتره دستیاران کارآگاه به ازای هر کلاس |
| `WeeklyContent` | [`src/models/WeeklyContent.js`](file:///c:/xampp/htdocs/RazeDehkade/src/models/WeeklyContent.js) | `weekly_content` | `id (PK)`, `week_number` | سناریوها و فایل‌های چندرسانه‌ای ۵ هفته بازی |
| `CannedResponse`| [`src/models/CannedResponse.js`](file:///c:/xampp/htdocs/RazeDehkade/src/models/CannedResponse.js) | `canned_responses` | `id (PK)` | پاسخ‌های از پیش آماده جهت تسهیل چت کارآگاه |

---

## ۴. نگاشت ماژول‌ها و اسکریپت‌های کلاینت فرانت‌اند (Client Controllers)

| کنترلر کلاینت | فایل مسیر | المنت‌های اصلی DOM | مسئولیت و قابلیت‌ها |
|---|---|---|---|
| چت دانش‌آموز | [`public/assets/js/user-chat.js`](file:///c:/xampp/htdocs/RazeDehkade/public/assets/js/user-chat.js) | `#messages-box`, `#user-input`, `#evidence-grid` | سوکت، نمایش حباب‌ها، ادیت/حذف پیام، کارت ۱۰ ثانیه‌ای مدرک، آپلود تکه‌ای |
| گاوصندوق ۳D | [`public/assets/js/vault-3d.js`](file:///c:/xampp/htdocs/RazeDehkade/public/assets/js/vault-3d.js) | `#vault-password-dialog`, `#vault-3d-stage` | دستگیره ۳شاخه ۱۰۸۰ درجه، پاکت کاهی دو مرحله‌ای، بازگشایی با 0110، ریست در رفرش |
| دلیوری و بلک‌اوت | [`public/assets/js/delivery.js`](file:///c:/xampp/htdocs/RazeDehkade/public/assets/js/delivery.js) | `#countdown-timer`, `#blackout-layer` | تیک‌تاک صوتی وب‌آدیو، بلک‌اوت کامل مشکی، ترنسفورمیشن ماتریکس و زوم زمین |
| چت ادمین | [`public/assets/js/admin-chat.js`](file:///c:/xampp/htdocs/RazeDehkade/public/assets/js/admin-chat.js) | `#admin-composer`, `#live-audio-btn` | ارسال با اینتر، دکمه‌های با ارتفاع ثابت ۴۲px، شنود لایو وب‌آرتی‌سی، تغییر رنگ سناریوها |
| داشبورد مدیریت | [`public/admin/dashboard.html`](file:///c:/xampp/htdocs/RazeDehkade/public/admin/dashboard.html) | `#sessions-table`, `#vault-master-btn` | پایش ۲۴ کلاس، تایمرهای لحظه‌ای سفارش، پلمپ همگانی گاوصندوق |

---

## ۵. نگاشت ابزارها و ماژول‌های کمکی (Utilities Index)

| نام ماژول | فایل مسیر | توابع کلیدی | کاربرد |
|---|---|---|---|
| `mp4FastStart` | [`src/utils/mp4FastStart.js`](file:///c:/xampp/htdocs/RazeDehkade/src/utils/mp4FastStart.js) | `ensureMp4FastStart(file)` | جابه‌جایی اتم `moov` به ابتدای MP4 جهت استریم بدون بافر HTTP 206 |
| `classFolderMatcher` | [`src/utils/classFolderMatcher.js`](file:///c:/xampp/htdocs/RazeDehkade/src/utils/classFolderMatcher.js) | `matchClassFolder(name)` | انطباق نام کلاس با پوشه‌های ۲۴گانه پرتره دستیاران با نرمال‌سازی فارسی |
| `codeGenerator` | [`src/utils/codeGenerator.js`](file:///c:/xampp/htdocs/RazeDehkade/src/utils/codeGenerator.js) | `generateUniqueCode()` | تولید کدهای تصادفی ۶ رقمی بدون تکرار |
| `logger` | [`src/utils/logger.js`](file:///c:/xampp/htdocs/RazeDehkade/src/utils/logger.js) | `info`, `warn`, `fatal` | ثبت لاگ‌های اتمیک در پوشه `logs/` و لاگ درخواست‌های HTTP |
