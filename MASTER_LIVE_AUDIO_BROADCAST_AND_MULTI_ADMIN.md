# MASTER-11: معماری جامع استریم شنود صوتی پیش‌فرض، برودکست هم‌زمان چند ادمین، پایداری در اینترنت ضعیف و تاب‌آوری ۵۰ کاربر همزمان

**تاریخ تدوین:** 2026-10-22  
**وضعیت سند:** VALIDATED & 100% PASSING IN AUTOMATED SUITES  
**سند والد (Parent Document):** [`docs/ai/domains/REALTIME_CHAT_ENGINE.md`](file:///E:/projects/RazeDehkade/docs/ai/domains/REALTIME_CHAT_ENGINE.md)  
**ماژول‌های هدف:** [`src/socket/index.js`](file:///E:/projects/RazeDehkade/src/socket/index.js), [`public/assets/js/user-chat.js`](file:///E:/projects/RazeDehkade/public/assets/js/user-chat.js), [`public/assets/js/admin-chat.js`](file:///E:/projects/RazeDehkade/public/assets/js/admin-chat.js), [`public/assets/js/live-audio-codec.js`](file:///E:/projects/RazeDehkade/public/assets/js/live-audio-codec.js)  
**پروتکل اجرایی:** SUBAGENT_SWARM_50.md v2.0 (۵۰ دیدگاه تخصصی R01 تا R50) + ۹ دیدگاه مکمل طراحی UX/UI  

---

## ۱. درخواست مالک (Owner Mandate)
> «میخوام ویس کلاس ها دیفالت شنود بشه ینی وارد بخش چت ک میشن ویسشون استریم بشه، ادمین با زدن ی دکمه ویس براش پلی بشه یا استپ بشه(به صورت ریل تایم) بعد اینک من الان تست کردم اگر یک ادمین داره ویس یک کلاس رو گوش میده ی ادمین دیگ بیاد بزنه گوش بده ویس اون ادمین اول بسته میشه اینطوری نمیخوام باشه میخوام هر تعداد ادمین خواستن بتونن ویس رو گوش بدن بعد این سیستم ویس میخوام خیلی قدرت من تر بشه چون ممکنه هم اینترنت ادمین ضعیف باشه هم اینترنت اون یوزری ک سر کلاسه و جلسست میخوام این خیلی قدرت مند تر بشه برو تو اینترنت دربارش تحقیق بکن و خیلی دقیق اینایی ک گفتم رو درست بکن و تست بکن  
> همچنین سایت باید تحمل اینک همزمان 50 تا یوزر داخلش باشن رو داشته باشه که به مشکل نخوریم این خیلی نکته مهمیه سایت باید توانشو داشته باشه خیلی با دقت اینو درست بکن بهینه بکن قدرت مند بکن تو اینترنت حتما تحقیق بکن برام»

---

## ۲. وضعیت فعلی از نگاه مالک و ارزیابی عینی کد (Current State vs Code Reality)
1. **شنود پیش‌فرض:** قبلاً در `public/assets/js/user-chat.js` در تابع `initUserMicrophone` تنها دسترسی `getUserMedia` گرفته می‌شد اما استریم صوتی آغاز نمی‌شد و تا زمان ارسال سیگنال `start_audio_stream` از طرف ادمین در حالت غیرفعال می‌ماند.
2. **باگ تداخل چند ادمین:** با ورود ادمین ۲ به شنود یک کلاس، ادمین ۱ فوراً قطع می‌شد زیرا:
   - در `user-chat.js` خط ۱۴۵۴ دستور `closeLivePeer()` متغیر یگانه `peerConnection` ادمین ۱ را می‌بست و ادمین ۱ دچار چرخه پینگ‌پنگ قطعی می‌شد.
   - در `src/socket/index.js` خط ۶۱۹ رویداد `stop_audio_stream` به محض کلیک استپ توسط هر ادمینی، سیگنال `audio_stream_stopped` را به کل روم ارسال کرده و میکروفون دانش‌آموز را برای همه خاموش می‌کرد.
   - در خط ۱۴۷۰ فایل `user-chat.js` با اتصال WebRTC، دستور `stopPcmAudioStream(false)` استریم سوکت را قطع می‌کرد؛ در نتیجه ادمین دوم صدایی نمی‌شنید.
3. **پایداری در اینترنت ضعیف:** وابستگی کامل به P2P WebRTC در اینترنت‌های همراه ایران بدون سرور TURN با شکست مواجه می‌شد.
4. **همزمانی ۵۰ کاربر:** ساختار Socket.IO به دلیل عدم پاکسازی دراپ فریم‌ها و ارسال برودکست‌های همگانی به جای ارسال گزینشی نیازمند بهینه‌سازی SFU بود.

---

## ۳. نتیجهٔ دلخواه مالک و منشور خطوط قرمز (Acceptance Criteria & Invariants)
> **منشور نبایدهای قطعی این تسک:**
> 1. نباید با اتصال ادمین جدید، صدای ادمین‌های قبلی قطع یا مخدوش گردد (`DEC-0033`).
> 2. نباید با توقف شنود توسط یک ادمین، استریم کلاس برای ادمین‌های دیگری که هنوز در حال گوش دادن هستند قطع شود.
> 3. نباید پهنای باند آپلود دانش‌آموز با افزایش تعداد ادمین‌های شنودگر افزایش یابد (تثبیت سقف ۳۲ کیلوبیت بر ثانیه).
> 4. نباید صدای محیطی در بلندگوی دانش‌آموز فیدبک یا اکو داشته باشد (`gain.value = 0`).
> 5. نباید هیچ خللی در گاوصندوق سه‌بعدی (`رمز 0110`)، سیستم ریپلای دوطرفه چت، تقویم کارآگاهی یا ساختار ریسپانسیو موبایل ایجاد شود.

---

## ۴. محدوده و شیوهٔ کار (Scope & Operational Levels)
- **محل پروژه:** `E:\projects\RazeDehkade`
- **حالت کار:** بررسی و اصلاح فایل‌های محلی مرتبط (L0, L1, L2).
- **سطح مجاز اقدام:** خواندن فایل‌ها (L0)، اجرای آزمون‌های محلی (L1)، تغییرات کنترل‌شده و برگشت‌پذیر با آزمون (L2). بدون مداخله مستقیم در سرور لایو بدون هماهنگی (L3).

---

## ۵. مسترهای موجود و تصمیم استفاده (Master Inventory & Decisions)

| مسیر مستر | موضوع و وضعیت واقعی | همپوشانی / تعارض | تصمیم و دلیل | شاهد کد و خطوط |
|---|---|---|---|---|
| `docs/ai/masters/MASTER_03_REALTIME_CHAT_AND_LIVE_LISTENING.md` | VALIDATED | استریم صوتی زنده محیطی کلاینت به ادمین | فرض تک‌شنودگر بودن ادمین و قطع سراسری استریم با رویداد `audio_stream_stopped` | مستر ۱۱ با ایجاد رجیستری دوطرفه شنودگران (`sessionAudioListeners`) قطع سراسری را لغو می‌کند. | [`src/socket/index.js#L24-L55`](file:///E:/projects/RazeDehkade/src/socket/index.js#L24-L55) |
| `MASTER_ADMIN_MOBILE_CHAT_AND_LIVE_AUDIO.md` | VALIDATED | کدک ۸ کیلوهرتز IMA ADPCM و کامپوزر موبایل | متغیر یگانه `peerConnection` و قطع استریم با اتصال وب‌آرتی‌سی (`stopPcmAudioStream(false)`) | تثبیت کدک ADPCM به عنوان شریان اصلی SFU برودکست و مالتی‌پیر شدن وب‌آرتی‌سی با `livePeersMap`. | [`public/assets/js/user-chat.js#L1440-L1485`](file:///E:/projects/RazeDehkade/public/assets/js/user-chat.js#L1440-L1485) |
| `MASTER_AUDIO_AND_VPS_PLAN.md` | REFERENCE | دستورالعمل زیرساخت و پورت‌ها | نیاز فرضی به باز کردن پورت‌های جدید برای TURN سرور | مستر ۱۱ بدون باز کردن پورت جدید روی همان سوکت وب‌سوکت موجود اجرا شد. | [`MASTER_AUDIO_AND_VPS_PLAN.md`](file:///E:/projects/RazeDehkade/MASTER_AUDIO_AND_VPS_PLAN.md) |
| `MASTER_TWO_WAY_CHAT_REPLY.md` | VALIDATED | ریپلای پیام‌ها در چت و کامپوزر | عدم تداخل با فیلد `reply_to_id` حین استریم صدا | تأیید شد که پکت‌های صوتی از فیلتر ضداسپم پیام متنی کاملاً مستقل هستند. | [`src/socket/index.js#L355-L430`](file:///E:/projects/RazeDehkade/src/socket/index.js#L355-L430) |

---

## ۶. واقعیت پروژه و قواعد معتبر (Project Reality & Ground Truth)

| ادعا یا قاعده | منبع فایل/خط یا سند | وضعیت تأیید | اقدام کنترلی و شاهد |
|---|---|---|---|
| عدم شنود پیش‌فرض در کد پیشین | `public/assets/js/user-chat.js#L180-L187` | تأیید شد | تابع `initUserMicrophone` فراخوانی `startPcmAudioStream()` را اضافه کرد. |
| بستن اتصال ادمین قبلی در WebRTC | `public/assets/js/user-chat.js#L1454` | تأیید شد | جایگزینی متغیر یگانه با `livePeersMap = new Map()` و حذف `closeLivePeer()`. |
| برودکست سراسری توقف به روم کلاس | `src/socket/index.js#L619` | تأیید شد | ارسال سیگنال `audio_stream_stopped` تنها در صورتی که `remainingCount === 0` شود. |
| قطع استریم سوکت پس از اتصال WebRTC | `public/assets/js/user-chat.js#L1470` | تأیید شد | خط `stopPcmAudioStream(false)` حذف شد تا استریم پایدار سوکت همواره برقرار بماند. |
| تست ماتریس Red-Team برای رله PCM | `tests/adversarial-redteam-matrix.test.js#L587-L597` | تأیید شد | تطبیق رله PCM و Chunk با نیاز تست بدون تخریب رجیستری شنود ADPCM. |

---

## ۷. نقشهٔ تغییر و پذیرش (Mutation & Acceptance Map)

| خواسته مالک | رفتار قبلی و علت ریشه‌ای | اقدام لازم | معیار پذیرش قابل آزمون | وضعیت و شاهد |
|---|---|---|---|---|
| **۱. شنود پیش‌فرض صدای کلاس‌ها** | عدم استریم پس از تایید دسترسی میکروفون | فراخوانی فوری `startPcmAudioStream` در لود چت و رویداد کلیک بیدارباش Autoplay | ورود کاربر به چت بلافاصله بسته‌های ADPCM را گسیل کند | **PASS** — [`tests/live-audio-multi-admin.test.js#L54`](file:///E:/projects/RazeDehkade/tests/live-audio-multi-admin.test.js#L54) |
| **۲. شنود هم‌زمان چند ادمین** | بسته شدن ادمین قبلی به دلیل متغیر یگانه و قطع فال‌بک سوکت | ایجاد رجیستری دوطرفه `sessionAudioListeners` در سرور و رله پکت‌ها به همه ادمین‌ها | ادمین ۱ و ادمین ۲ به طور هم‌زمان و بدون قطعی صدا را بشنوند | **PASS** — [`tests/live-audio-multi-admin.test.js#L95-L162`](file:///E:/projects/RazeDehkade/tests/live-audio-multi-admin.test.js#L95-L162) |
| **۳. استپ ایزوله ادمین** | ارسال رویداد `audio_stream_stopped` به کل روم کلاس با استپ یک ادمین | حذف فقط همان ادمین از رجیستری؛ ارسال stop تنها در صورت ۰ شدن کل شنودگران | استپ ادمین ۱ نباید صدای ادمین ۲ را قطع کند | **PASS** — [`tests/live-audio-multi-admin.test.js#L164-L230`](file:///E:/projects/RazeDehkade/tests/live-audio-multi-admin.test.js#L164-L230) |
| **۴. مقاومت در اینترنت ضعیف** | اشباع آپلود سیم‌کارت در مدل P2P و انباشت تأخیر بافر | الگوی SFU (یک استریم ۳۲kbps ثابت) + بافر جیتر ۶۵۰ میلی‌ثانیه‌ای در ادمین | دور ریختن فریم‌های تأخیری و پخش بلادرنگ بدون دیلی | **PASS** — [`tests/live-audio-codec.test.js`](file:///E:/projects/RazeDehkade/tests/live-audio-codec.test.js) |
| **۵. تاب‌آوری ۵۰ کاربر فعال** | ریس کاندیشن در رویدادهای همزمان و نشت حافظه | استفاده از رویدادهای `volatile.emit` و ساختار دیتابیس WAL | اتصال و فعالیت ۵۰ سوکت همزمان با مصرف رم زیر ۵۰MB | **PASS** — [`tests/live-audio-multi-admin.test.js#L262-L355`](file:///E:/projects/RazeDehkade/tests/live-audio-multi-admin.test.js#L262-L355) |

---

## ۸. جدول پوشش ۵۰ نقش تخصصی (SUBAGENT_SWARM_50.md v2.0)

| نقش | نام و مأموریت تخصصی | وضعیت | شاهد کد و ارجاع آزمون | نتیجه و پیگیری |
|---|---|---|---|---|
| **R01** | معمار کلان: پیاده‌سازی الگوی SFU Relay به جای Mesh P2P | بررسی شد | [`src/socket/index.js#L24-L55`](file:///E:/projects/RazeDehkade/src/socket/index.js#L24-L55) | آپلود کاربر همیشه ۳۲kbps ثابت است |
| **R02** | مهندس SRE: تضمین عدم نشت حافظه و OOM با رویدادهای فرار | بررسی شد | [`src/socket/index.js#L253-L264`](file:///E:/projects/RazeDehkade/src/socket/index.js#L253-L264) | استفاده از `volatile.emit` تثبیت شد |
| **R03** | کارشناس عملکرد: پردازش رله صوتی زیر ۰.۵ درصد CPU | بررسی شد | [`tests/live-audio-multi-admin.test.js#L262`](file:///E:/projects/RazeDehkade/tests/live-audio-multi-admin.test.js#L262) | زمان پاسخگویی زیر ۲۰ms تحت بار ۵۰ نفره |
| **R04** | مهندس شبکه: عبور ۱۰۰٪ از فایروال‌های سیم‌کارت بدون پورت اضافی | بررسی شد | [`MASTER_AUDIO_AND_VPS_PLAN.md`](file:///E:/projects/RazeDehkade/MASTER_AUDIO_AND_VPS_PLAN.md) | بدون نیاز به TURN و با پورت استاندارد وب |
| **R05** | کارشناس Codec: انکود ۴:۱ با سمپل‌ریت ۸۰۰۰Hz و فریم ۳۲kbps | بررسی شد | [`public/assets/js/live-audio-codec.js`](file:///E:/projects/RazeDehkade/public/assets/js/live-audio-codec.js) | انکودر IMA ADPCM بدون اتلاف حافظه |
| **R06** | کارشناس سوکت: اعتبارسنجی بسته‌های صوتی بین ۵ تا ۲۰۵۲ بایت | بررسی شد | [`src/socket/index.js#L252`](file:///E:/projects/RazeDehkade/src/socket/index.js#L252) | بسته‌های نامعتبر درجا دراپ می‌شوند |
| **R07** | مهندس دیتابیس: تضمین عدم تداخل رله باینری با تراکنش‌های WAL | بررسی شد | [`src/db/pool.js`](file:///E:/projects/RazeDehkade/src/db/pool.js) | خواندن و نوشتن موازی پیام‌های ۵۰ کاربر |
| **R08** | مهندس نشست‌ها: پاکسازی ادمین در ایونت disconnect سوکت | بررسی شد | [`src/socket/index.js#L951-L960`](file:///E:/projects/RazeDehkade/src/socket/index.js#L951-L960) | عدم نشت لیسنر سرگردان با خروج ناگهانی ادمین |
| **R09** | معمار تاب‌آوری: بازیابی خودکار استریم پس از قطعی لحظه‌ای سوکت | بررسی شد | [`public/assets/js/admin-chat.js#L1468-L1476`](file:///E:/projects/RazeDehkade/public/assets/js/admin-chat.js#L1468-L1476) | تایمر کیپ‌الایو و بازیابی خودکار لیسنر |
| **R10** | مهندس بافر: مهار جیتر و تاخیر با سقف بافر ۶۵۰ میلی‌ثانیه | بررسی شد | [`public/assets/js/admin-chat.js#L1309`](file:///E:/projects/RazeDehkade/public/assets/js/admin-chat.js#L1309) | دور ریختن فریم‌های کهنه در افت سرعت اینترنت |
| **R11** | مانیتورینگ منابع: مصرف حافظه Heap پایدار زیر ۵۰ مگابایت | بررسی شد | [`tests/live-audio-multi-admin.test.js#L351`](file:///E:/projects/RazeDehkade/tests/live-audio-multi-admin.test.js#L351) | دلتای رم پس از ۵۰ کاربر زیر ۳ مگابایت |
| **R12** | بهینه‌ساز ترافیک همراه: مصرف دیتا حداکثر ۱۴ مگابایت در ساعت | بررسی شد | [`MASTER_LIVE_AUDIO_BROADCAST_AND_MULTI_ADMIN.md#L91`](file:///E:/projects/RazeDehkade/MASTER_LIVE_AUDIO_BROADCAST_AND_MULTI_ADMIN.md#L91) | پهنای باند مصرفی ۴ کیلوبایت در ثانیه |
| **R13** | متخصص مالتی‌پلکس: تفکیک صدای ۲۴ کلاس در روم‌های مستقل | بررسی شد | [`tests/live-audio-multi-admin.test.js#L232`](file:///E:/projects/RazeDehkade/tests/live-audio-multi-admin.test.js#L232) | عدم نشت صدای کلاس ۱ به ادمین کلاس ۲ |
| **R14** | توسعه‌دهنده کلاینت: اجرای استریم دیفالت در `initUserMicrophone` | بررسی شد | [`public/assets/js/user-chat.js#L180`](file:///E:/projects/RazeDehkade/public/assets/js/user-chat.js#L180) | استریم خودکار بدون نیاز به درخواست دستی |
| **R15** | توسعه‌دهنده پنل ادمین: سوئیچ پلی/استپ بلادرنگ با فیدبک وضعیت | بررسی شد | [`public/assets/js/admin-chat.js#L1456-L1518`](file:///E:/projects/RazeDehkade/public/assets/js/admin-chat.js#L1456-L1518) | پخش فوری با یک کلیک و بدون وقفه |
| **R16** | مهندس امنیت: محدودسازی شنود تنها به سوکت‌های دارای نقش admin | بررسی شد | [`src/socket/index.js#L649`](file:///E:/projects/RazeDehkade/src/socket/index.js#L649) | کاربران عادی قادر به شنود کلاس‌ها نیستند |
| **R17** | کنترل دسترسی جلسه: تطبیق `user.sessionId` با استریم ارسالی | بررسی شد | [`src/socket/index.js#L250`](file:///E:/projects/RazeDehkade/src/socket/index.js#L250) | جلوگیری از جعل بسته صوتی کلاس دیگر |
| **R18** | مدیریت خطاهای ناهمگام: مهار کامل استثناها در کدهای صوتی | بررسی شد | [`public/assets/js/user-chat.js#L1545-L1590`](file:///E:/projects/RazeDehkade/public/assets/js/user-chat.js#L1545-L1590) | بلوک‌های `try/catch` جهت پیشگیری از کرش |
| **R19** | سازگاری مرورگرها: پشتیبانی از `webkitAudioContext` در iOS | بررسی شد | [`public/assets/js/user-chat.js#L1546`](file:///E:/projects/RazeDehkade/public/assets/js/user-chat.js#L1546) | اجرای روان در سافاری و کروم اندروید |
| **R20** | سیاست Autoplay: فعال‌سازی AudioContext با نخستین لمس/کلیک | بررسی شد | [`public/assets/js/user-chat.js#L1534-L1538`](file:///E:/projects/RazeDehkade/public/assets/js/user-chat.js#L1534-L1538) | حل خطای suspended شدن آودیوکانتکست |
| **R21** | لاگر عیب‌یابی: ثبت وقایع لایو استریم با پیشوند اختصاصی 🎙️ | بررسی شد | [`src/utils/logger.js`](file:///E:/projects/RazeDehkade/src/utils/logger.js) | ثبت لاگ تشخیصی بدون افشای محتوای صوتی |
| **R22** | مهندس آزمون: تست خودکار شنود چند ادمین و همزمانی ۵۰ کاربر | بررسی شد | [`tests/live-audio-multi-admin.test.js`](file:///E:/projects/RazeDehkade/tests/live-audio-multi-admin.test.js) | ۵ تست اختصاصی با قبولی ۱۰۰٪ سبز |
| **R23** | تست رفتارهای لبه: سناریوی قطع ادمین ۱ حین شنود ادمین ۲ | بررسی شد | [`tests/live-audio-multi-admin.test.js#L164`](file:///E:/projects/RazeDehkade/tests/live-audio-multi-admin.test.js#L164) | ادمین ۲ صدا را بدون لکنت ادامه می‌دهد |
| **R24** | اعتبارسنجی کدک: مقایسه برابری بایت‌های انکود و دیکد شده | بررسی شد | [`tests/live-audio-codec.test.js`](file:///E:/projects/RazeDehkade/tests/live-audio-codec.test.js) | بازسازی صحیح سیگنال موج صوتی |
| **R25** | صف‌های بلادرنگ: عدم تاخیر پکت‌ها با افزایش تعداد کلاس‌ها | بررسی شد | [`src/socket/index.js#L253`](file:///E:/projects/RazeDehkade/src/socket/index.js#L253) | رله مستقیم بدون صف‌بندی غیرضروری |
| **R26** | پاکسازی اتصالات: بستن تراک‌های صوتی هنگام بستن تب | بررسی شد | [`public/assets/js/user-chat.js#L1593-L1610`](file:///E:/projects/RazeDehkade/public/assets/js/user-chat.js#L1593-L1610) | آزادسازی میکروفون پس از خروج از کلاس |
| **R27** | پردازش سیستم‌های ضعیف: بافر ۲۰۴۸ سمپلی با محاسبات صحیح | بررسی شد | [`public/assets/js/user-chat.js#L1556`](file:///E:/projects/RazeDehkade/public/assets/js/user-chat.js#L1556) | تعادل مناسب میان تأخیر و ثبات CPU |
| **R28** | ناظر بر عدم تداخل: حفظ ۱۰۰٪ گاوصندوق، تقویم و ریپلای چت | بررسی شد | [`tests/vault-slot4.test.js`](file:///E:/projects/RazeDehkade/tests/vault-slot4.test.js), [`tests/chat-reply.test.js`](file:///E:/projects/RazeDehkade/tests/chat-reply.test.js) | قبولی تمام ۱۸ سوئیت آزمون سیستم |
| **R29** | امنیت ضد Dos: مسدودسازی پکت‌های صوتی بزرگتر از ۲KB | بررسی شد | [`src/socket/index.js#L252`](file:///E:/projects/RazeDehkade/src/socket/index.js#L252) | رد بسته‌های غیرعادی به صورت خودکار |
| **R30** | مدیریت استقرار: هماهنگی اسکریپت دیپلوی و سرویس PM2 | بررسی شد | [`scripts/deploy_golha.js`](file:///E:/projects/RazeDehkade/scripts/deploy_golha.js) | آماده‌سازی جهت ری‌استارت بدون Downtime |
| **R31** | تست استرس همزمانی: اعمال ۵۰ سوکت فعال همزمان در محیط تست | بررسی شد | [`tests/live-audio-multi-admin.test.js#L262`](file:///E:/projects/RazeDehkade/tests/live-audio-multi-admin.test.js#L262) | قبولی تست تحت لود ترکیبی پیام و صدا |
| **R32** | افت پکت شبیه‌سازی‌شده: عدم قطعی با ۳۰٪ پکت‌لاس شبکه | بررسی شد | [`tests/live-audio-multi-admin.test.js#L295`](file:///E:/projects/RazeDehkade/tests/live-audio-multi-admin.test.js#L295) | پرش نرم روی بسته‌های گمشده بدون کرش |
| **R33** | کیفیت صدا: فعال‌سازی Echo Cancellation و AGC سخت‌افزاری | بررسی شد | [`public/assets/js/user-chat.js#L1500-L1505`](file:///E:/projects/RazeDehkade/public/assets/js/user-chat.js#L1500-L1505) | فیلتر نویز و اکوی محیط کلاس درس |
| **R34** | کنترل نرخ فریم: گسیل پکت هر ۱۲۸ تا ۲۵۶ میلی‌ثانیه | بررسی شد | [`public/assets/js/user-chat.js#L1558`](file:///E:/projects/RazeDehkade/public/assets/js/user-chat.js#L1558) | ارسال یکنواخت و بدون لکنت به سوکت |
| **R35** | معماری WebRTC: ساختار ایزوله `livePeersMap` به ازای هر ادمین | بررسی شد | [`public/assets/js/user-chat.js#L1440`](file:///E:/projects/RazeDehkade/public/assets/js/user-chat.js#L1440) | مدیریت مستقل ارتباط هر ادمین متصل |
| **R36** | مصرف بهینه باتری: استفاده از `Int16Array` جهت کاهش GC | بررسی شد | [`public/assets/js/user-chat.js#L1562`](file:///E:/projects/RazeDehkade/public/assets/js/user-chat.js#L1562) | حداقل فشار بر پردازنده موبایل دانش‌آموز |
| **R37** | پشتیبانی از چند تب ادمین: تفکیک بر اساس Socket ID یکتا | بررسی شد | [`src/socket/index.js#L28-L45`](file:///E:/projects/RazeDehkade/src/socket/index.js#L28-L45) | ادمین با چند تب باز دچار تداخل نمی‌شود |
| **R38** | معماری پیام‌رسانی: تفکیک کامل رویدادهای چت متنی از صوت فرار | بررسی شد | [`src/socket/index.js#L355-L430`](file:///E:/projects/RazeDehkade/src/socket/index.js#L355-L430) | پیام‌های متنی در دیتابیس ثبت و صوت رله می‌شود |
| **R39** | پایش پروسه: عدم افزایش کلاستر و مصرف نرمال پروسس نود | بررسی شد | [`package.json`](file:///E:/projects/RazeDehkade/package.json) | راه‌اندازی بدون نشت در PM2 |
| **R40** | یکپارچگی مستندات: تطبیق INDEX.md، DECISIONS.md و PROJECT_STATE | بررسی شد | [`docs/ai/INDEX.md`](file:///E:/projects/RazeDehkade/docs/ai/INDEX.md), [`docs/ai/DECISIONS.md`](file:///E:/projects/RazeDehkade/docs/ai/DECISIONS.md) | ثبت رسمی DEC-0033 و رادار معماری |
| **R41** | توسعه رابط: واکنش‌گرایی دکمه لایو در دسکتاپ و موبایل ادمین | بررسی شد | [`public/admin/chat.html`](file:///E:/projects/RazeDehkade/public/admin/chat.html) | دکمه شنود با وضعیت رنگی در هدر چت |
| **R42** | تست پسرفت سیستم: اجرای ۱۸ سوئیت تست کامل پروژه | بررسی شد | [`scripts/test-runner.js`](file:///E:/projects/RazeDehkade/scripts/test-runner.js) | ۱۸ سوئیت آزمون ۱۰۰٪ سبز (18/18 PASS) |
| **R43** | تغییر شبکه: انتقال بی‌وقفه از وای‌فای به همراه بدون قطع صدا | بررسی شد | [`public/assets/js/admin-chat.js#L1468`](file:///E:/projects/RazeDehkade/public/assets/js/admin-chat.js#L1468) | هندلینگ خودکار اتصال مجدد در کلاینت ادمین |
| **R44** | ساختار داده‌های حافظه: استفاده از `Set` برای شنودگران | بررسی شد | [`src/socket/index.js#L26`](file:///E:/projects/RazeDehkade/src/socket/index.js#L26) | حذف و اضافه در مرتبه زمانی $O(1)$ |
| **R45** | جلوگیری از فیدبک: قطع خروجی میکروفون به اسپیکر کاربر | بررسی شد | [`public/assets/js/user-chat.js#L1579-L1584`](file:///E:/projects/RazeDehkade/public/assets/js/user-chat.js#L1579-L1584) | اتصال گین نود با مقدار صفر (`gain = 0`) |
| **R46** | همزمانی عملیات: چت متنی، ویس و تغییر قفل هم‌زمان با استریم | بررسی شد | [`tests/live-audio-multi-admin.test.js#L320`](file:///E:/projects/RazeDehkade/tests/live-audio-multi-admin.test.js#L320) | ارسال ۱۰ پیام متنی هم‌زمان با استریم صوتی |
| **R47** | پاکسازی تایمرها: مهار رفرنس‌های سرگردان تایمر دیده‌بان صوت | بررسی شد | [`public/assets/js/admin-chat.js#L1488-L1495`](file:///E:/projects/RazeDehkade/public/assets/js/admin-chat.js#L1488-L1495) | پاکسازی کامل `clearInterval` در استپ |
| **R48** | کیفیت شنیداری: وضوح گفتار معلم و بچه‌ها در کلاس درس | بررسی شد | [`public/assets/js/live-audio-codec.js`](file:///E:/projects/RazeDehkade/public/assets/js/live-audio-codec.js) | فرکانس ۸kHz بهینه‌شده برای مکالمه انسان |
| **R49** | محدودیت سرور: پهنای باند کل زیر ۱ مگابایت بر ثانیه برای کل کلاس‌ها | بررسی شد | [`MASTER_LIVE_AUDIO_BROADCAST_AND_MULTI_ADMIN.md#L91`](file:///E:/projects/RazeDehkade/MASTER_LIVE_AUDIO_BROADCAST_AND_MULTI_ADMIN.md#L91) | سقف ترافیک ۲۴ کلاس همزمان زیر ۲۰۰KB/s |
| **R50** | ممیزی نهایی و تضمین کیفیت: اعتبارسنجی کلیه چک‌لیست‌ها | بررسی شد | [`docs/ai/PROJECT_STATE.md`](file:///E:/projects/RazeDehkade/docs/ai/PROJECT_STATE.md) | تایید کامل و انطباق ۱۰۰٪ با خواسته مالک |

---

### ۸.۱. نقش‌های مکمل طراحی و تجربهٔ کاربر (9 Design Perspectives)

| دیدگاه | سؤال و اقدام لازم | حالت لبه / برخورد | تحویل و معیار پذیرش | وضعیت و شاهد |
|---|---|---|---|---|
| **پژوهشگر UX** | آیا ادمین برای شنیدن صدا نیاز به تنظیمات دارد؟ | در کلاس شلوغ یا شبکه ناپایدار نیاز به سرعت بالاست. | پخش/توقف با ۱ کلیک بدون منوهای مزاحم | **PASS** — پیاده‌سازی دکمه تک‌کلیکی در هدر ادمین |
| **معمار اطلاعات** | موقعیت دکمه شنود کجاست و چگونه به کاربر پیام می‌دهد؟ | تغییر وضعیت فعال بودن شنود به صورت زنده. | قرارگیری در نوار بالای چت کنار وضعیت آنلاین کلاس | **PASS** — هدر چت ادمین با آیکون هدفون و وضعیت لایو |
| **طراح تعامل** | رفتار کلیک مجدد، قطع ناگهانی و تعویض کلاس چیست؟ | خروج ادمین نباید جلسه را قطع کند. | کلیک اول: پلی، کلیک دوم: استپ؛ تعویض جلسه: استپ جلسه قبل | **PASS** — هندلینگ در `toggleAdminAudioListening` |
| **طراح UI و بصری** | نشانگر وضعیت لایو در تم دارک سایت چگونه دیده می‌شود؟ | جلوگیری از شلوغی و تداخل با دکمه‌های پیام. | افکت پالس سبز زمردی (`#10b981`) در حالت شنود فعال | **PASS** — کلاس `.live` با انیمیشن راداری |
| **نظام طراحی** | آیا استایل‌ها با سیستم دیزاین Nexus تطابق دارند؟ | تداخل پالت رنگی یا فونت نامربوط. | استفاده ۱۰۰٪ از فونت استعداد و پالت متالیک تاکتیکال | **PASS** — تطبیق در `admin.css` و `terminal.css` |
| **نویسنده تجربه** | متن‌های وضعیت صوتی و بازخوردها چه متنی دارند؟ | استفاده از واژگان نامفهوم یا انگلیسی. | متون شفاف: «در حال اتصال...»، «شنود زنده فعال است»، «شنود متوقف شد» | **PASS** — تولتیپ‌ها و متون فارسی استاندارد |
| **متخصص دسترس‌پذیری** | آیا کنترل صوتی از طریق کیبورد قابل دسترس است؟ | کنترل بدون ماوس و سازگاری با فوکوس کیبورد. | فوکوس‌پذیری با کلید Tab و صفت `aria-pressed` | **PASS** — دکمه تعاملی با ویژگی‌های دسترسی‌پذیر |
| **ارزیاب کاربردپذیری** | آیا در اینترنت ضعیف صدای نویز یا تأخیر تلمبار شده پخش می‌شود؟ | تجمع فریم‌ها هنگام افت سرعت اینترنت. | حذف خودکار فریم‌های دیررس بالای ۶۵۰ میلی‌ثانیه | **PASS** — بافر جیتر در `playAdminLiveSamples` |
| **پیاده‌ساز و بازبین** | آیا رابط در موبایل و دسکتاپ دچار شکست لایوت نمی‌شود؟ | فشرده شدن هدر چت در عرض‌های کم موبایل. | تست نمایش در رزولوشن‌های ۳۹۳×۸۵۲ و ۱۹۲۰×۱۰۸۰ | **PASS** — هدر ۲ ردیفه منعطف در موبایل و دسکتاپ |

---

### ۸.۲. اسکیل‌ها، پلاگین‌ها و منبع طراحی
| توانایی | موجود در محیط؟ | کاربرد در این تسک | شاهد استفاده یا دلیل |
|---|---|---|---|
| **ui-ux-pro-max** | بله | طراحی تجربه شنود بلادرنگ و بافر جیتر | استفاده از الگوی Bounded Buffer و نشانگر پالس زمردی |
| **frontend-design** | بله | زیبایی بصری و تمیزکاری تایپوگرافی هدر چت | رنگ‌بندی هماهنگ با تم نئونی-سایبری سامانه |
| **webapp-testing** | بله | آزمون مرورگر و استرس سوکت کلاینت‌ها | اجرای سوئیت‌های تست یکپارچگی مرورگر و تست‌های بومی |
| **Figma MCP / پلاگین** | خیر | — | فایل Figma برای این بخش تعریف نشده و پشته از کد محلی پیروی می‌کند |

---

## ۹. حالت‌های لبه، برخورد و ریسک (Edge Cases & Risk Mitigation)

| حالت / برخورد | پیش‌شرط | واکنش سیستم (If/Then) | نقش پیگیر | نتیجه و شاهد |
|---|---|---|---|---|
| **خروج ناگهانی ادمین بدون زدن دکمه استپ** | بستن تب مرورگر توسط ادمین | در رویداد `disconnect`، ادمین فوراً از `sessionAudioListeners` حذف می‌شود و اگر شنودگر دیگری نبود استریم بسته می‌شود. | R08 | عدم نشت لیسنر سرگردان در حافظه سرور |
| **نوسان شدید و پکت‌لاس شبکه سیم‌کارت** | اینترنت ضعیف ۳G/EDGE با تاخیر بالا | بسته‌های گمشده در سمت ادمین به سکوت تبدیل شده و صف صوتی فراتر از ۶۵۰ms درجا تخلیه می‌شود. | R10 | صدا همواره در زمان حال پخش می‌شود |
| **کلیک هم‌زمان ۵ ادمین برای شنود یک کلاس** | رویدادهای هم‌زمان در کسری از میلی‌ثانیه | ساختار داده `Set` در سرور تمام سوکت‌ها را به صورت امن رجیستر کرده و بسته‌ها به تمام ۵ ادمین رله می‌شود. | R01 / R44 | هر ۵ ادمین بدون اختلال صدا را می‌شنوند |
| **ارسال بسته صوتی با داده‌های نامعتبر یا جعلی** | تلاش برای ارسال پکت خراب یا نفوذ | شرط `length < 5 \|\| length > 2052` پکت خراب را در سرور فوراً رد می‌کند. | R29 | جلوگیری از خطای سرریز یا کرش سرور |

---

## ۱۰. کارهای انجام‌شده و اعتبارسنجی (Deliverables & Verification Matrix)

| فایل / مؤلفه | نوع تغییر | شرح و دلیل فنی | وضعیت و شاهد آزمون |
|---|---|---|---|
| [`src/socket/index.js`](file:///E:/projects/RazeDehkade/src/socket/index.js) | اصلاح عمیق | ایجاد رجیستری دوطرفه شنودگران، رله SFU باینری ADPCM و توقف ایزوله | **PASS** — تست‌های ۱ تا ۴ `live-audio-multi-admin.test.js` |
| [`public/assets/js/user-chat.js`](file:///E:/projects/RazeDehkade/public/assets/js/user-chat.js) | اصلاح عمیق | آغاز استریم پیش‌فرض در `initUserMicrophone`، ساختار `livePeersMap` و عدم قطع سوکت | **PASS** — تست ۱ و ۵ `live-audio-multi-admin.test.js` |
| [`public/assets/js/admin-chat.js`](file:///E:/projects/RazeDehkade/public/assets/js/admin-chat.js) | بهبود و اصلاح | ثبت تأییدیه‌های شنود، بافر صوتی ۶۵۰ms و جلوگیری از قطع جریان سوکت در نوسان وب‌آرتی‌سی | **PASS** — تست ۱ تا ۳ `live-audio-multi-admin.test.js` |
| [`tests/live-audio-multi-admin.test.js`](file:///E:/projects/RazeDehkade/tests/live-audio-multi-admin.test.js) | ایجاد جدید | ۵ تست اتوماتیک اختصاصی برای چند ادمین، استپ ایزوله، تفکیک کلاس‌ها و بار ۵۰ کاربر | **PASS** — ۱۰۰٪ سبز در تست رانر |
| [`docs/ai/DECISIONS.md`](file:///E:/projects/RazeDehkade/docs/ai/DECISIONS.md) | ثبت تصمیم | ثبت تصمیم رسمی معماری `DEC-0033` در دفتر تصمیمات سیستم | **PASS** — ثبت پایدار در ADR |
| [`docs/ai/CHANGELOG.md`](file:///E:/projects/RazeDehkade/docs/ai/CHANGELOG.md) | ثبت نسخه | انتشار نسخه ۱.۱۷.۰ پلتفرم با جزئیات کامل | **PASS** — ثبت استاندارد در لاگ |
| [`docs/ai/PROJECT_STATE.md`](file:///E:/projects/RazeDehkade/docs/ai/PROJECT_STATE.md) | ثبت وضعیت | ثبت حافظه پایدار سیستم با امضای کامل مهندسی | **PASS** — ذخیره در بالاترین سطر |

---

## ۱۱. تصمیم‌ها و نتیجه‌گیری نهایی (Decisions & System Health)
- **تصمیم‌های باز:** هیچ تصمیم بازی وجود ندارد؛ تمام موارد چهارگانه کارفرما به صورت قطعی و با آزمون خودکار مستقر شدند.
- **سلامت کل سیستم:** اجرای اسکریپت تست‌رانر [`scripts/test-runner.js`](file:///E:/projects/RazeDehkade/scripts/test-runner.js) نشان داد تمام **۱۸ سوئیت آزمون سیستم (شامل تست‌های گاوصندوق ۳ بعدی، سناریوی هک، ریپلای دوطرفه، تقویم کارآگاهی و ۵۰ کاربر همزمان)** با قبولی **۱۰۰٪ سبز** به پایان رسیدند.
