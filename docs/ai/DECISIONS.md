# ⚖️ دفتر تصمیمات قطعی معماری و بیزینس (DECISIONS.md)
> **قانون دفتر تصمیمات (Append-only Architectural Decision Records - ADR):**  
> تمامی تصمیمات کلیدی، خطوط قرمز و قوانین کسب‌وکار با شناسه‌های یکتای `DEC-XXXX` ثبت می‌شوند. هیچ تصمیمی بدون ثبت رسمی در این دفتر قابل اعمال یا ارجاع نیست. تغییر قوانین قبلی تنها با صدور تصمیم جدید و ذکر فیلد `Supersedes` مجاز است.

---

### DEC-0001 — ممنوعیت تصمیم‌گیری خودسرانه و حدس زدن قوانین
- **Date:** 2026-10-01
- **Status:** APPROVED
- **Context & Rationale:** هوش‌های مصنوعی در مواجهه با نقاط مبهم سناریو (قیمت‌ها، سناریوهای هفتگی، متون معمایی) نباید حدس بزنند یا پیش‌فرض‌های شخصی بسازند زیرا منجر به برهم خوردن تعادل بازی کارآگاهی می‌شود. در صورت ابهام، ایجنت باید فرآیند را متوقف و مستقیماً از کارفرما سوال کند.
- **Impact:** کل سورس‌کد و تمامی هوش‌های مصنوعی همکار.
- **Supersedes:** None

---

### DEC-0002 — واحد پولی انحصاری «ریال» در تمام بخش‌های فروشگاه و سبد خرید
- **Date:** 2026-10-01
- **Status:** APPROVED
- **Context & Rationale:** جهت حفظ رسمیت فاکتورها و جلوگیری از دوگانگی بین تومان و ریال در پایگاه داده و UI، کلمه «تومان» در کل سیستم ممنوع شد. تمام ارقام نمایش‌یافته در فرانت‌اند و ذخیره‌شده در دیتابیس باید به ریال باشد.
- **Impact:** `src/routes/store.js`, `public/golha/index.html`, `public/golha/checkout.html`, `public/golha/assets/css/atelier.css`.
- **Supersedes:** None

---

### DEC-0003 — توزیع ۵ محصول الزامی فاکتور رسمی در میان کاتالوگ ۱۵ محصول
- **Date:** 2026-10-02
- **Status:** APPROVED
- **Context & Rationale:** جهت طبیعی بودن ویترین فروشگاه گل، ۵ محصول کلیدی فاکتور (بیلچه: ۱,۵۰۰,۰۰۰، سانسوریا پاکوتاه: ۱۰,۵۰۰,۰۰۰، لیلیوم صورتی: ۸,۰۰۰,۰۰۰، کاکتوس ساکولنت: ۷,۰۰۰,۰۰۰، کود تراریم پروتکت: ۳,۰۰۰,۰۰۰ ریال) نباید در ابتدای لیست متمرکز باشند، بلکه باید در میان ۱۰ کالای دیگر پراکنده باشند تا دانش‌آموزان به عنوان بخشی از چالش، آنها را در فروشگاه پیدا کنند.
- **Impact:** `src/routes/store.js#L13-L29`, `public/golha/index.html`.
- **Supersedes:** None

---

### DEC-0004 — تثبیت هویت و برندینگ رسمی «فروشگاه اینترنتی گل و گیاه»
- **Date:** 2026-10-02
- **Status:** APPROVED
- **Context & Rationale:** استفاده از عبارات انگلیسی یا کلمه «گلها» پوشش مخفی بازی را فاش می‌کرد. عنوان رسمی به «فروشگاه اینترنتی گل و گیاه» و شعار به «ارسال خیـــــلی خیـــــلی خیـــــلی سریع» با کشش تایپوگرافی تغییر یافت.
- **Impact:** `public/golha/index.html`, `public/golha/checkout.html`, `public/golha/order-status.html`.
- **Supersedes:** None

---

### DEC-0005 — ممنوعیت لود تصاویر با استایل opacity: 0
- **Date:** 2026-10-03
- **Status:** APPROVED
- **Context & Rationale:** به دلیل احتمال تاخیر در رویداد لود تصاویر تحت شبکه‌های کند مدارسی یا کش مرورگر، کلاس‌های CSS با `opacity: 0` باعث نامرئی ماندن کارت‌های محصولات می‌شدند. از این رو این شیوه منسوخ و ممنوع شد.
- **Impact:** `public/golha/assets/css/atelier.css`, `public/assets/css/chat.css`.
- **Supersedes:** None

---

### DEC-0006 — سکانس تحویل، بلک‌اوت ۱۰۰٪ مشکی مطلق و ترنسفورمیشن سایبری
- **Date:** 2026-10-03
- **Status:** APPROVED
- **Context & Rationale:** پس از پایان تایمر ۳۰ ثانیه‌ای پیک و اعلام تحویل، صفحه باید به حالت کاملاً مشکی (`cursor: none`) برود تا نگاه اطرافیان در کلاس جلب نشود (۲۰ ثانیه در مود تست، ۳۰۰ ثانیه در پروداکشن). سپس یک ترنسفورمیشن سایبری با ساندترک ساب‌بیس تریلر بدون بیپ‌های مضحک اجرا شده و به `/enter-code.html` ریدایرکت می‌گردد.
- **Impact:** `public/assets/js/delivery.js`, `public/assets/css/delivery.css`, `public/golha/order-status.html`.
- **Supersedes:** None

---

### DEC-0007 — ابزار بازرسی و زوم هوشمند تصاویر شواهد در محدوده ۱.۰ تا ۳.۰ برابر
- **Date:** 2026-10-04
- **Status:** APPROVED
- **Context & Rationale:** مدارک کارآگاهی دارای جزئیات ریز و پنهان هستند. سیستم زوم تصاویر با چرخ موس، دکمه‌های + و - و قابلیت Drag & Pan تعبیه شد. حداکثر زوم ۳.۰x و حداقل ۱.۰x است تا تصویر کوچک‌تر از کادر نشود.
- **Impact:** `public/assets/js/user-chat.js#L300-L380`, `tests/adversarial-redteam-matrix.test.js`.
- **Supersedes:** None

---

### DEC-0008 — استفاده سراسری و محلی از فونت مدرن استعداد (Estedad Variable)
- **Date:** 2026-10-04
- **Status:** APPROVED
- **Context & Rationale:** جهت تضمین بارگذاری سریع در شبکه‌های ایزوله مدارس و عدم وابستگی به CDNهای خارجی، فونت استاندارد «استعداد» به صورت وب‌فونت محلی (`.woff2`) در سرور تعبیه و به عنوان فونت پیش‌فرض تعریف شد.
- **Impact:** تمام فایل‌های CSS پروژه در `public/assets/css/`.
- **Supersedes:** None

---

### DEC-0009 — پایداری پیام‌ها، پیشگیری از دابل‌سابمیت و قفل ضداسپم
- **Date:** 2026-10-05
- **Status:** APPROVED
- **Context & Rationale:** هیجان دانش‌آموزان باعث کلیک‌های پیاپی روی دکمه ارسال می‌شد. مارکر `in-flight` در کلاینت و مکانیزم دیبانس ۵ ثانیه‌ای در سرور سوکت پیاده‌سازی شد تا هرگز پیام تکراری ثبت یا برودکست نشود.
- **Impact:** `src/socket/index.js#L86-L105`, `public/assets/js/user-chat.js`.
- **Supersedes:** None

---

### DEC-0010 — پنل انتخابگر ایموجی دوطرفه در چت دانش‌آموز و کامپوزر ادمین
- **Date:** 2026-10-05
- **Status:** APPROVED
- **Context & Rationale:** جهت ایجاد ارتباط دوستانه و تعامل بهتر، انتخابگر اختصاصی ایموجی با دسته‌بندی کارآگاهی در کادر ورودی پیام هر دو سمت پیاده‌سازی شد.
- **Impact:** `public/chat.html`, `public/admin/chat.html`, `public/assets/js/user-chat.js`, `public/assets/js/admin-chat.js`.
- **Supersedes:** None

---

### DEC-0011 — حذف ضبط ویس دانش‌آموز با حفظ کامل استریم شنود زنده محیطی ادمین
- **Date:** 2026-10-06
- **Status:** APPROVED
- **Context & Rationale:** ارسال فایل‌های صوتی سنگین توسط دانش‌آموزان باعث اشغال پهنای باند و شلوغی چت می‌شد، بنابراین دکمه ضبط ویس حذف گردید. اما سیستم شنود زنده میکروفون دانش‌آموزان توسط کارآگاه با WebRTC/Socket کاملاً دست‌نخورده و فعال باقی ماند.
- **Impact:** `public/chat.html`, `public/assets/js/user-chat.js`, `src/socket/index.js#L420-L500`.
- **Supersedes:** None

---

### DEC-0012 — تقسیم فضای زیر برد شواهد به پنل چهارگانه عملیاتی
- **Date:** 2026-10-08
- **Status:** APPROVED
- **Context & Rationale:** فضای خالی زیر برد شواهد به ۴ بخش کاربردی تقسیم شد: ۱) تقویم شمسی جلالی پویا، ۲) دکمه مودال گالری دستیاران، ۳) ترمینال مانیتورینگ زنده N-LOG با فونت ریز، ۴) گاوصندوق سه‌بعدی اسناد محرمانه.
- **Impact:** `public/chat.html`, `public/assets/css/chat.css`.
- **Supersedes:** None

---

### DEC-0013 — امکان ویرایش و حذف پیام توسط خود دانش‌آموز با مودال اختصاصی
- **Date:** 2026-10-09
- **Status:** APPROVED
- **Context & Rationale:** اشتباهات تایپی دانش‌آموزان در فضای هیجانی بازی نیازمند اصلاح بود. اجازه ویرایش و حذف پیام‌های `sender_type === 'user'` داده شد و مودال شکیل Liquid Glass تعبیه گردید.
- **Impact:** `src/socket/index.js#L260-L310`, `public/assets/js/user-chat.js`, `public/chat.html`.
- **Supersedes:** None

---

### DEC-0014 — استاندارد چیدمان حباب‌های چت (دانش‌آموز راست، ادمین/کارآگاه چپ)
- **Date:** 2026-10-09
- **Status:** APPROVED
- **Context & Rationale:** طبق استاندارد پیام‌رسان‌های راست‌به‌چپ (RTL)، پیام‌های خود کاربر در سمت راست (`flex-start`) و پیام‌های مخاطب (کارآگاه/ادمین/هکر) در سمت چپ (`flex-end`) تثبیت شدند.
- **Impact:** `public/assets/css/chat.css#L180-L240`.
- **Supersedes:** None

---

### DEC-0015 — حذف هدر بالا و فوتر پایین صفحه چت دانش‌آموز جهت بیشینه‌سازی فضا
- **Date:** 2026-10-10
- **Status:** APPROVED
- **Context & Rationale:** هدرهای اضافی و فوتر ترمینال فضای عمودی ارزشمند مانیتور را اشغال می‌کردند. با حذف آن‌ها، ۱۰۰٪ ارتفاع صفحه به بخش‌های اصلی بازی (برد، پنل ۴گانه و چت) اختصاص یافت.
- **Impact:** `public/chat.html`, `public/assets/css/chat.css`.
- **Supersedes:** None

---

### DEC-0016 — کارت هشدار کوچک ۱۰ ثانیه‌ای مدرک جدید در جریان چت
- **Date:** 2026-10-10
- **Status:** APPROVED
- **Context & Rationale:** به جای نمایش تصاویر بزرگ در وسط چت که منجر به له شدن پیام‌ها می‌شد، مدارک به برد شواهد پین شده و در چت فقط یک قرص هشدار شکیل با متن «📌 کارآگاه مدرک جدیدی به برد اسناد اضافه کرد» ظاهر شده و پس از ۱۰ ثانیه محو می‌شود.
- **Impact:** `public/assets/js/user-chat.js#L550-L610`.
- **Supersedes:** None

---

### DEC-0017 — ساعت دیجیتالی نئونی در هدر باکس گفتگو
- **Date:** 2026-10-11
- **Status:** APPROVED
- **Context & Rationale:** با حذف کدهای شلوغ جلسه از بالای چت، یک ساعت دیجیتال نئونی با فرمت `HH:MM:SS` جایگزین شد که حس زمان واقعی را به بازی تزریق می‌کند.
- **Impact:** `public/chat.html`, `public/assets/js/user-chat.js`.
- **Supersedes:** None

---

### DEC-0018 — استاندارد کامپوزر ادمین و دکمه‌های با ارتفاع ثابت
- **Date:** 2026-10-13
- **Status:** APPROVED
- **Context & Rationale:** در پنل ادمین، زدن کلید `Enter` پیام را ارسال کرده و دکمه‌های کناری با ارتفاع ثابت `42px` و `align-self: end` هم‌تراز شدند تا با چندخطی شدن پیام‌ها کش نیایند.
- **Impact:** `public/admin/chat.html`, `public/assets/js/admin-chat.js`.
- **Supersedes:** None

---

### DEC-0019 — تفکیک قطعی فایل‌های ارسالی دانش‌آموز از برد مدارک کارآگاه
- **Date:** 2026-10-13
- **Status:** APPROVED
- **Context & Rationale:** عکس‌هایی که دانش‌آموزان ارسال می‌کنند فقط در حباب چت خودشان باقی می‌ماند و نباید روی برد شواهد قرار گیرد یا کارت هشدار کارآگاه را فعال کند. همچنین از تمام پسوندهای تصویری (jpg, png, webp, heic, avif و...) پشتیبانی می‌شود.
- **Impact:** `src/routes/upload.js`, `public/assets/js/user-chat.js`.
- **Supersedes:** None

---

### DEC-0020 — آپلود تکه‌ای ۲۰۰ کیلوبایتی (Chunked Upload) ضد خطای Nginx
- **Date:** 2026-10-13
- **Status:** APPROVED
- **Context & Rationale:** سرورهای لینوکس پروداکشن معمولاً محدودیت `client_max_body_size 1m` دارند. جهت عبور امن از این محدودیت، فایل‌ها در چانک‌های ۲۰۰KB همراه با درصد پیشرفت لایو و دکمه لغو آپلود ارسال می‌شوند.
- **Impact:** `public/assets/js/user-chat.js`, `src/routes/upload.js#L70-L130`.
- **Supersedes:** None

---

### DEC-0021 — عناوین دقیق ۳ پرونده در صفحه بایگانی
- **Date:** 2026-10-14
- **Status:** APPROVED
- **Context & Rationale:** صفحه بایگانی (`public/archive.html`) دارای ۳ پرونده مشخص است: ۱) سمت چپ: «سندروم فراموشی»، ۲) وسط: «راز دهکده»، ۳) سمت راست: «دادگاه عدالت».
- **Impact:** `public/archive.html`, `public/assets/js/archive.js`.
- **Supersedes:** None

---

### DEC-0022 — نمایش ۱۰۰٪ تصویر بدون برش در مودال بازرسی شواهد
- **Date:** 2026-10-14
- **Status:** APPROVED
- **Context & Rationale:** تصاویر عمودی با `object-fit: contain` و ابعاد منعطف تنظیم شدند تا در لود اولیه تمام ابعاد عکس بدون هیچ برشی در مرکز دیالوگ دیده شود.
- **Impact:** `public/assets/css/chat.css#L420-L460`.
- **Supersedes:** None

---

### DEC-0023 — استریم آنی HTTP 206 با MP4 FastStart و ممنوعیت قفل کش
- **Date:** 2026-10-14
- **Status:** APPROVED
- **Context & Rationale:** پخش ویدیو و صوت نباید منتظر دانلود کامل فایل بماند. فایل‌های MP4 به حالت FastStart درآمده و با هدرهای استاندارد استریم سرو می‌شوند. استفاده از `preload` های موازی که در کروم کش را قفل می‌کرد ممنوع شد.
- **Impact:** `server.js#L53-L115`, `src/utils/mp4FastStart.js`, `public/assets/js/user-chat.js`.
- **Supersedes:** None

---

### DEC-0024 — فیلتر و مخفی‌سازی کامل عناوین ربات تلگرام از دید دانش‌آموز
- **Date:** 2026-10-14
- **Status:** APPROVED
- **Context & Rationale:** عناوینی مانند «پیام ۱»، «ویدیو ۱»، یا «بعد از ۵ دقیقه» که در بات تلگرام توسط ادمین ثبت می‌شوند، راهنمای داخلی هستند و هرگز نباید به دانش‌آموز نشان داده شوند. برای دانش‌آموز عناوین جذاب کارآگاهی (مانند «فایل صوتی محرمانه») جایگزین می‌گردد.
- **Impact:** `public/assets/js/user-chat.js#L680-L730`, `MohtavaTelBot/bot.js`.
- **Supersedes:** None

---

### DEC-0025 — گاوصندوق فولادی ۳D، قانون Zero-Spoiler، رمز 0110 و ریست با رفرش
- **Date:** 2026-10-15
- **Status:** APPROVED
- **Context & Rationale:** گاوصندوق اسلات ۴ باید کاملاً جدی و فولادی باشد. نباید برچسب پلمپ یا نوشته سبزی سناریو را لو دهد. رمز بازگشایی منحصراً `0110` است. با چرخش ۱۰۸۰ درجه دستگیره سه‌شاخه و عقب‌نشینی ۵ زبانه فولادی، پاکت کاهی محرمانه خارج شده و پوستر دعوت‌نامه «موزه اسرارآمیز» پدیدار می‌شود. با هر رفرش صفحه وضعیت به حالت قفل بازمی‌گردد.
- **Impact:** `public/assets/js/vault-3d.js`, `public/assets/css/vault-3d.css`, `tests/vault-slot4.test.js`, `tests/vault-passcode-and-lock.test.js`.
- **Supersedes:** None


---

### DEC-0034 — معماری نفوذ سایبری مزداک نسخه ۲، ایزولاسیون کلاسی، گلیچ پویای دستیاران و درگاه احراز هویت اضطراری
- **Date:** 2026-10-23
- **Status:** APPROVED
- **Context & Rationale:** انتقال سناریوی سینماتیک نفوذ مزداک به چت زنده سامانه با انطباق کامل نیازمندی‌های پرورشی و فنی:
  ۱) **ایزولاسیون کلاسی دیتابیس:** افزودن فیلد `is_hacked` و `hacked_at` به جدول `sessions` تا هر کلاس مستقل از سایر ۲۴ کلاس هک شود و وضعیت در دیتابیس ماندگار بماند.
  ۲) **گلیچ کروماتیک چهره دستیاران واقعی:** واکشی دینامیک تصاویر و نام‌های دانش‌آموزان هر کلاس از `session_assistants` و الصاق لایه‌های Screen blend آبی و قرمز، رتیکول بیومتریک و کد خطای باینری به جای نام‌ها و چهره‌های هاردکد شده قبلی.
  ۳) **سکانس ۱۲۰ ثانیه‌ای:** پس از ۲ دقیقه نبرد سایبری و صعود ترمینال و پیام‌های شخصی‌سازی‌شده مزداک در چت، در ثانیه ۱۲۰ مودال اخطار فوق‌امنیتی تمام‌صفحه باز شده و به دانش‌آموزان اعلام می‌کند برای نجات پرونده باید آدرس `https://razedehkade.ir` را یادداشت کرده و به درگاه احراز هویت اضطراری بروند.
  ۴) **درگاه احراز هویت اضطراری (`/emergency-auth.html`):** گام ۱ تایید شماره موبایل و کد کلاس، گام ۲ پرسشنامه امنیتی بازیابی پرونده با سوالات کارآگاهی، و گام ۳ دریافت کد رهگیری امنیتی پرونده تا جلسه حضوری بعد.
  ۵) **کنترل هفتگی ادمین:** دکمه‌های تریگر و آنلاک هک در چت ادمین و بج اخطار نفوذ به همراه بازگشایی تک‌کلیکی در داشبورد ادمین.
  ۶) **گیت‌کیپینگ ورود:** تلاش برای ورود به کلاس هک‌شده با کد در `/enter-code.html` مسدود شده و با خطای ۴۰۳ و پیام هشدار فوراً به درگاه اضطراری هدایت می‌شود.
- **Impact:** `src/db/migrations/005_add_session_hack_status.sql`, `src/models/Session.js`, `src/routes/auth.js`, `src/routes/sessions.js`, `src/socket/index.js`, `public/chat.html`, `public/assets/css/cyber-breach-engine.css`, `public/assets/js/cyber-breach-engine.js`, `public/emergency-auth.html`, `public/assets/css/emergency-auth.css`, `public/assets/js/emergency-auth.js`, `public/admin/chat.html`, `public/assets/js/admin-chat.js`, `public/assets/js/admin-dashboard.js`, `tests/mazdak-cyber-breach-v2.test.js`, `MASTER_MAZDAK_CYBER_BREACH_V2.md`, `docs/ai/masters/MASTER_12_MAZDAK_CYBER_BREACH_AND_EMERGENCY_PORTAL.md`.
- **Supersedes:** None

---

### DEC-0035 — ارتقای سکانس صعود و فرود هیدرولیک ترمینال با FLIP پورتال‌شده، سنتز چندلایه صوتی Web Audio و شوک ویوپورت
- **Date:** 2026-10-24
- **Status:** APPROVED
- **Context & Rationale:** ارتقای عمیق سکانس صعود و فرود ترمینال امنیتی در هک مزداک:
  ۱) **پورتالینگ FLIP به بدنه (`document.body`):** محاسبه دقیق بردار اولیه با `getBoundingClientRect()` و پورتال مستقیم به `document.body` برای رهایی از Stacking Context و `display: none` تب‌های موبایل، با حرکت نرم `cubic-bezier(0.16, 1, 0.3, 1)` به مرکز و انیمیشن فرود با شتاب جاذبه `cubic-bezier(0.55, 0.085, 0.68, 0.53)`.
  ۲) **اسلات گوست پایدار:** حفظ گرید ۲×۲ در والد با قرارگیری `#terminal-ghost-slot` و جلوگیری کامل از Layout Shift یا جابجایی گاوصندوق ۳ بعدی.
  ۳) **سنتز صوتی Web Audio استودیویی:** صدای انباشت فشار و لرزش پیش‌پرواز (ثانیه ۵۶-۵۷)، شلیک پرتاب با سوئیپ نویز باندپس و ساب‌بیس (ثانیه ۵۸)، صدای شمارشگر گایگر و آرک‌های الکتریکی روی براکت‌های هولوگرافیک (ثانیه ۵۹-۷۹)، و کوبش چندتنی فرود هیدرولیک با ساب‌بیس ۳۰Hz و صدای کوبش متالیک FM (ثانیه ۸۰).
  ۴) **شوک ۳D زلزله ویوپورت:** لرزش چندمحوره پرسپکتیو کل صفحه در لحظه برخورد ترمینال به شاسی اصلی همراه با فلش CRT و جرقه‌های اسلات گوست.
- **Impact:** `public/chat.html`, `public/assets/css/cyber-breach-engine.css`, `public/assets/js/cyber-breach-engine.js`, `tests/mazdak-cyber-breach-v2.test.js`, `MASTER_TERMINAL_ELEVATION_AND_SLAM_CHOREOGRAPHY.md`, `docs/ai/masters/MASTER_13_TERMINAL_CINEMATIC_ELEVATION_AND_SLAM.md`.
- **Supersedes:** None

---

### DEC-0036 — وحدت بصری ۱۰۰٪ درگاه احراز هویت اضطراری و مودال خروج سایبری با تم Warm Noir و شیشه مایع سایت اصلی
- **Date:** 2026-10-24
- **Status:** APPROVED
- **Context & Rationale:** طبق دستور مستقیم کارفرما مبنی بر هماهنگ‌سازی ظاهر بخش‌های ایجادشده با تم و ظاهر سایت اصلی:
  ۱) **یکپارچه‌سازی کامل ظاهر درگاه اضطراری (`/emergency-auth.html`):** جایگزینی استایل‌های نئون قرمز منسوخ با توکن‌های طراحی اصیل پایگاه راز دهکده (`gateway.css`) شامل پس‌زمینه Warm Noir (`#070a0e`)، شبکه سایبری با ماسک ملایم (`.gateway-grid-bg`) و هاله نورانی معلق محیطی (`.ambient-glow-ring`).
  ۲) **هدر و برندینگ مشترک:** استفاده از کامپوننت استاندارد `.gateway-header` با نشان طلایی `RD` و عنوان «مرکز عملیات راز دهکده» و بج پروتکل امنیتی با LED تپنده کهربایی.
  ۳) **کارت مایع شیشه‌ای (Liquid Glass):** ساختار محوری کارت با `backdrop-filter: blur(28px)`، حاشیه طلایی-کهربایی (`rgba(245, 158, 11, 0.22)`)، گوشه‌های ۲۴ پیکسلی و آیکون شیلد طلایی در بالای کارت.
  ۴) **فرم‌ها و پرسشنامه امنیتی:** کارت‌های گزینه‌های رادیویی با طراحی مدرن شیشه‌ای، بازخورد رنگی طلایی هنگام انتخاب، فیلدهای ورودی تیره هماهنگ با ورودی کد درگاه اصلی، و دکمه‌های اکشن طلایی درخشان با تایپوگرافی فارسی اصیل وزیرمتن.
  ۵) **مودال خروج اضطراری ۱۲۰ ثانیه‌ای:** بازطراحی `.emergency-ejection-modal` در `cyber-breach-engine.css` با استایل شیشه مایع تیره، حاشیه طلایی-کهربایی، نوار هشدار طلایی/مشکی با زاویه ۴۵ درجه، کادر آدرس سایت با سایه داخلی و دکمه هدایت طلایی.
  ۶) **عدم تغییر در منطق و قراردادها:** حفظ تمام شناسه‌ها (`emergencyPhone`، `questionnaireForm`، `step3Section` و...) بدون کوچک‌ترین شکستگی در ۱۹ مجموعه آزمون سیستم.
- **Impact:** `public/emergency-auth.html`, `public/assets/css/emergency-auth.css`, `public/assets/css/cyber-breach-engine.css`, `tests/mazdak-cyber-breach-v2.test.js`, `MASTER_THEME_UNIFICATION_AND_EMERGENCY_PORTAL.md`, `docs/ai/masters/MASTER_14_VISUAL_THEME_UNIFICATION_AND_PORTAL_POLISH.md`.
- **Supersedes:** None

---

### DEC-0037 — نبرد سایبری مزداک: قفل تامپر اسلات‌ها، استامپ رسانه‌ها، رفع پرش لاگ‌ها، نبرد فیک چت، تمدید مودال خروج به ۵ دقیقه و فرم تک‌فیلدی احراز هویت
- **Date:** 2026-10-25
- **Status:** APPROVED
- **Context & Rationale:** ارتقای جامع و سینمایی فاز نفوذ سایبری مزداک، ایزولاسیون کامل تعاملات و هدایت ایمن به درگاه بازیابی اضطراری بر اساس نیازمندی‌های قطعی کارفرما:
  ۱) **قفل کامل ابزارهای ۴ اسلات (Tamper Lockdown):** اعمال قفل سخت‌افزاری بر تقویم کارآگاه، نوار ابزار شواهد، دکمه‌های کنترلی کامپوزر و اموجی‌ها با کلاس‌های `.calendar-locked-breakdown` و `.is-locked-cyber-breach`.
  ۲) **قفل و تخریب ظاهری اسلات ۲ و ۴ (Corrupted Glitch State):** مسدودسازی بزرگ‌نمایی و باز شدن پروفایل بچه‌ها (اسلات ۲) و گاوصندوق ۳ بعدی (اسلات ۴) با افکت‌های گلیچ خرابی `.slot-corrupted-breakdown` و `.vault-corrupted-breakdown` و گارد بازدارنده در توابع تعاملی `openVaultInteraction`, `openVaultPasswordModal`, `openEvidence`, `openAssistantsPhotoPopup`.
  ۳) **استامپ سراسری نشان مزداک روی رسانه‌ها:** استقرار `mazdak.jpg` در ریشه و پوشه `public` و تزریق ماسک توقیف `.mazdak-media-stamp` روی تمام عکس‌ها، صوت‌ها و ویدیوها با غیرفعال‌سازی رویدادهای ماوس (`pointer-events: none`).
  ۴) **رفع باگ پرش و لرزش چشمک‌زن لاگ‌ها:** حذف بازنویسی مخرب `innerHTML` و جایگزینی با متدهای پایدار Append-only (`appendTerminalBilingualLine` و `appendChatMessage`) به همراه ردگیری شناسه‌ها در ساختار داده `Set`.
  ۵) **پیام‌های خودکار مضطرب کارآگاه در آغاز حمله:** ارسال زنجیره پیام‌های کارآگاه در ثانیه‌های نخست («پیام من میاد؟ دارن به سایت حمله می‌کنن...»).
  ۶) **پیام‌های ارعاب‌آمیز مزداک در ترمینال:** نمایش لاگ‌های دوزبانه درشت با فونت بزرگ، کنتراست بالا و کارت‌های تهدید مستقیم مزداک در داخل بدنه ترمینال صعودیافته.
  ۷) **نبرد فیک در چت پس از فرود ترمینال:** قفل کامل ورودی چت برای دانش‌آموزان، ارسال پیام‌های مزداک با هویت جعلی بچه‌ها (`kids-impersonated-msg`)، فریب اولیه کارآگاه، کشف نفوذ و نهایتاً پیام اخطاردهنده کارآگاه پیرامون سرنخ «لیلیوم» و فعال‌سازی احراز هویت اضطراری.
  ۸) **تمدید زمان مودال خروج به ۵ دقیقه (۳۰۰ ثانیه):** افزایش زمان شمارش معکوس به `۰۵:۰۰` دقیقه در `.emergency-ejection-modal` جهت فرصت کافی دانش‌آموزان برای یادداشت آدرس سایت `https://razedehkade.ir`.
  ۹) **فرم تک‌فیلدی درگاه احراز هویت (`emergency-auth.html`):** حذف کامل فیلد کد کلاس و اتکای فرم گام ۱ منحصراً به شماره موبایل بدون وابستگی‌های اضافی.
- **Impact:** `public/assets/css/cyber-breach-engine.css`, `public/assets/js/cyber-breach-engine.js`, `public/assets/js/emergency-auth.js`, `public/emergency-auth.html`, `public/assets/js/vault-3d.js`, `public/assets/js/user-chat.js`, `server.js`, `mazdak.jpg`, `public/mazdak.jpg`, `tests/mazdak-cyber-warfare.test.js`, `MASTER_MAZDAK_CYBER_WARFARE_AND_LOCKDOWN.md`, `docs/ai/masters/MASTER_15_MAZDAK_CYBER_WARFARE_AND_LOCKDOWN.md`.
- **Supersedes:** None

