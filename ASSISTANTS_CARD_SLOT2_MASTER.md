# 📋 مستر پلن جامع و نهایی اسلات ۲: ویترین سه‌گانه قاب‌بندی‌شده «عکس دستیاران کارآگاه» با چرخش خودکار ۱ دقیقه‌ای (نسخه V11.0)

> **وضعیت سند**: مرجع رسمی، قطعی و لازم‌الاجرا (`SINGLE SOURCE OF TRUTH - SLOT 2 ASSISTANTS SHOWCASE V11.0`)
> **مسیرهای هدف**:
> - محلی (Local): `c:\xampp\htdocs\RazeDehkade`
> - سرور عملیاتی (Production): `95.217.95.111` (`/home/user615/RazeDehkade`)

---

## ۱. قوانین طلایی: بایدها (DOs) و نبایدها (DON'Ts)

### ✅ بایدها (MUST DO):
1. **حذف کامل ظاهر بچه‌گانه و ایموجی‌محور کارت اسلات ۲ (`.quad-assistants-card`)**:
   - کارت اسلات ۲ در گرید ۴تایی زیر برد مدارک (`.under-board-quad-grid`) **باید** از حالت دکمه ساده با دایره ایموجی `🕵️‍♂️` خارج شده و به یک **ویترین پرونده کارآگاهی حرفه‌ای، سنگین و شکیل (`Detective Dossier Trio Showcase`)** تبدیل شود.
2. **نمایش همزمان ۳ عکس کوچک از بچه‌ها در کنار هم با قاب‌بندی دقیق و استاندارد (`3-Up Framed Portraits`)**:
   - در داخل کارت `.quad-assistants-card` دقیقاً **۳ قاب پرتره کارآگاهی مجزا (`.assistant-mini-frame`)** به صورت افقی (`grid-template-columns: repeat(3, minmax(0, 1fr))`) قرار می‌گیرند.
   - هر قاب دارای:
     - **حاشیه و پاسپارتوی فلزی/برنجی تیره کارآگاهی (`Double-Bezel Brass & Obsidian Frame`)** با گوشه‌های تقویت‌شده، سایه درونی عمیق (`inset vignette`) و نورپردازی استودیویی گرم (`radial-gradient`) در پس‌زمینه تصویر شفاف (`.webp`).
     - **قاب‌بندی استاندارد نیم‌تنه و چهره (`object-fit: cover; object-position: center 8%`)** به طوری که سر و شانه هر دانش‌آموز دقیقاً در مرکز توجه قاب قرار بگیرد، هیچ سری بریده نشود و ابعاد پرتره‌ها در هر ۳ قاب کاملاً یکدست و متوازن باشد.
     - **پلاک مشخصات پایینی هر قاب (`.assistant-mini-nameplate`)** شامل نام دانش‌آموز با فونت خوانا و برچسب شماره پرونده (`#۱`، `#۲`، ...).
3. **لوپ چرخشی خودکار هر ۱ دقیقه (`60,000ms`) برای نمایش تمام بچه‌های کلاس**:
   - یک تایمر دقیق (`ASSISTANTS_CARD_ROTATION_MS = 60000` میلی‌ثانیه = **۱ دقیقه کامل**) در [`public/assets/js/user-chat.js`](file:///c:/xampp/htdocs/RazeDehkade/public/assets/js/user-chat.js) اجرا می‌شود.
   - در هر چرخه ۱ دقیقه‌ای، اندیس شروع (`assistantsCardLoopOffset`) به اندازه ۳ نفر جلو می‌رود:
     `assistantsCardLoopOffset = (assistantsCardLoopOffset + 3) % totalAssistants`
   - انتخاب ۳ عکس در هر مرحله با حساب پیمانه‌ای (`(assistantsCardLoopOffset + slotIndex) % totalAssistants`) انجام می‌شود تا **حتی اگر تعداد دانش‌آموزان کلاس مضرب ۳ نباشد (مثلاً ۱۰، ۱۱ یا ۱۴ نفر)، تک‌تک بچه‌های کلاس بدون استثنا در این لوپ چرخشی قرار بگیرند و پس از اتمام لیست، حلقه به نرمی از ابتدا تکرار شود.**
   - پیش از فرا رسیدن ثانیه ۶۰، ۳ تصویر بعدی در پس‌زمینه (`new Image()`) پیش‌بارگذاری (`Preload`) می‌شوند تا تعویض عکس‌ها با انیمیشن نرم (`Crossfade + Subtle Flip`) و بدون هیچ پرش یا تاخیری انجام شود.
4. **حفظ عملکرد کلیک جهت باز شدن گالری کامل (`#assistants-photo-dialog`)**:
   - کلیک روی هر بخش از کارت اسلات ۲ (`#open-assistants-popup-btn`) همچنان پنجره مودال کامل گالری دستیاران (`openAssistantsPhotoPopup()`) را باز می‌کند.

---

### ❌ نبایدها (MUST NOT DO):
1. **ممنوعیت مطلق بازگشت به آیکون دایره‌ای بچه‌گانه `🕵️‍♂️` در مرکز کارت**:
   - هرگز از ایموجی بزرگ وسط کارت یا متن‌های ساده بدون تصویر در حالتی که عکس دستیاران موجود است استفاده نشود.
2. **ممنوعیت کشیدگی تصویر (`Image Distortion`) یا بریده شدن بالای سر دانش‌آموزان**:
   - هرگز از `object-fit: fill` که باعث دفرمه شدن صورت بچه‌ها می‌شود استفاده نشود؛ همواره باید `object-fit: cover; object-position: center 8%` به همراه فضای تنفس بالایی (`padding-top: 3px`) رعایت گردد.
3. **ممنوعیت بیرون‌زدگی (`Overflow`) از کادر گرید ۴تایی**:
   - ارتفاع و عرض کارت اسلات ۲ باید دقیقاً مقید به سلول خود در `.under-board-quad-grid` (`min-height: 0; overflow: hidden`) باشد و باعث اسکرول یا به‌هم‌ریختگی سایر اسلات‌ها (تقویم، ترمینال، گاوصندوق) نشود.
4. **ممنوعیت ساخت چند تایمر موازی (`Memory / Interval Leak`)**:
   - پیش از راه‌اندازی یا ریست کردن لوپ ۱ دقیقه‌ای، تایمر قبلی حتماً باید با `clearInterval(assistantsCardLoopTimer)` پاک‌سازی شود.

---

## ۲. معماری دقیق و آدرس‌دهی فایل‌ها

| ردیف | مسیر دقیق فایل | شرح تغییرات مهندسی |
| :--- | :--- | :--- |
| ۱ | [`public/chat.html`](file:///c:/xampp/htdocs/RazeDehkade/public/chat.html) | بازطراحی ساختار HTML بخش `.quad-assistants-card` (خطوط ۱۷۱ تا ۱۹۰): افزودن نوار هدر کارآگاهی (`.assistants-card-header`) شامل عنوان، نشانگر لوپ زنده و شمارنده کل (`#assistants-btn-sub`) + صحنه ۳ قاب پرتره (`#assistants-card-trio-stage.assistants-trio-stage`) و ارتقای نسخه کش به `?v=6.2`. |
| ۲ | [`public/assets/css/terminal.css`](file:///c:/xampp/htdocs/RazeDehkade/public/assets/css/terminal.css) | پیاده‌سازی استایل‌های `.quad-assistants-card`، `.assistants-card-header`، `.assistants-trio-stage`، `.assistant-mini-frame`، `.assistant-mini-photo-box`، `.assistant-mini-img`، `.assistant-mini-nameplate` و انیمیشن تعویض ۱ دقیقه‌ای (`.is-rotating-trio`). |
| ۳ | [`public/assets/js/user-chat.js`](file:///c:/xampp/htdocs/RazeDehkade/public/assets/js/user-chat.js) | پیاده‌سازی توابع `renderAssistantsCardTrio(animateTransition)`، `startAssistantsCardRotationLoop()` و `preloadNextAssistantsTrio()` با زمان‌بندی دقیق `60000ms` (هر ۱ دقیقه) و گردش حلقه‌ای روی تمام اعضای `sessionAssistantsList`. |

---

## ۳. مشخصات فنی قاب‌بندی ۳ عکس و لوپ ۱ دقیقه‌ای

### الف) ساختار HTML اسلات ۲ در [`public/chat.html`](file:///c:/xampp/htdocs/RazeDehkade/public/chat.html):
```html
<!-- قسمت ۲: ویترین سه‌گانه قاب‌بندی‌شده «عکس دستیاران کارآگاه» با لوپ ۱ دقیقه‌ای -->
<div class="quad-card quad-assistants-card">
  <button type="button" class="assistants-popup-btn" id="open-assistants-popup-btn" onclick="openAssistantsPhotoPopup()" aria-label="مشاهده گالری کامل دستیاران کارآگاه">
    <div class="assistants-card-header">
      <div class="assistants-header-title">
        <span class="assistants-live-dot" aria-hidden="true"></span>
        <strong class="assistants-btn-label">پرونده دستیاران کارآگاه</strong>
      </div>
      <span class="assistants-btn-sub" id="assistants-btn-sub">گالری کامل ↗</span>
    </div>
    <div class="assistants-trio-stage" id="assistants-card-trio-stage">
      <!-- ۳ قاب پرتره به صورت پویا توسط user-chat.js رندر و هر ۱ دقیقه تعویض می‌شوند -->
    </div>
  </button>
</div>
```

### ب) الگوریتم لوپ ۱ دقیقه‌ای در [`public/assets/js/user-chat.js`](file:///c:/xampp/htdocs/RazeDehkade/public/assets/js/user-chat.js):
- **متغیرهای وضعیت**:
  - `const ASSISTANTS_CARD_ROTATION_MS = 60000;` (دقیقاً ۶۰ ثانیه = ۱ دقیقه)
  - `let assistantsCardLoopOffset = 0;`
  - `let assistantsCardLoopTimer = null;`
- **منطق انتخاب ۳ نفر از کل کلاس**:
  - اگر `total = sessionAssistantsList.length` باشد:
  - برای `slot = 0, 1, 2`:
    `const studentIndex = (assistantsCardLoopOffset + slot) % total;`
    `const student = sessionAssistantsList[studentIndex];`
  - در هر تیک تایمر (`60000ms`):
    `assistantsCardLoopOffset = (assistantsCardLoopOffset + 3) % total;`
    و سپس `renderAssistantsCardTrio(true)` فراخوانی می‌شود تا ۳ عکس بعدی با افکت نرم جایگزین شوند و در یک حلقه بی‌نهایت تمام دانش‌آموزان کلاس به نوبت نمایش داده شوند.
