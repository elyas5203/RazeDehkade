# 🧠 حافظه زنده و وضعیت پایدار پروژه (PROJECT_STATE.md)
> **قانون انباشتی (Append-only Protocol):** این فایل بازتاب زنده حافظه مهندسی سیستم است. جدیدترین وضعیت در بالاترین سطر قرار می‌گیرد. هیچ سابقه‌ای نباید از این سند پاک شود.

---

## Current state — 2026-10-18 — استقرار پروتکل جامع معماری مستر و پایه‌ریزی درخت اسناد هوش مصنوعی (UMAC-P) [Antigravity]
- **دستور کارفرما (Mandate):** «با استفاده از فایل UNIVERSAL_AI_MASTER_PROTOCOL.md برام برو فایلای مستر دقیق و جدید و کامل رو بساز و اماده کن»
- **تغییرات کلیدی معماری:**
  - پایه‌ریزی ساختار درختی رسمی `docs/ai/` منطبق بر استاندارد UMAC-P شامل لایه‌های والد ریشه، حافظه فعال، تاریخچه تغییرات، دفتر تصمیمات قطعی، شاخص میکروسکوپی و نیازمندی‌های آینده.
  - تدوین سند والد ریشه [`ROOT_MASTER.md`](file:///c:/xampp/htdocs/RazeDehkade/docs/ai/ROOT_MASTER.md) به عنوان مرجع کلان معماری، پشته فناوری، جریان داده‌ها و نقشه سیستم.
  - تفکیک بیزینس پروژه به ۵ سند والد دامنه در دایرکتوری `docs/ai/domains/`:
    1. [`AUTH_AND_SESSIONS.md`](file:///c:/xampp/htdocs/RazeDehkade/docs/ai/domains/AUTH_AND_SESSIONS.md) (احراز هویت، نشست‌ها و ایزولاسیون کلاس‌ها)
    2. [`STORE_AND_DELIVERY.md`](file:///c:/xampp/htdocs/RazeDehkade/docs/ai/domains/STORE_AND_DELIVERY.md) (فروشگاه اینترنتی گل، سفارش، بلک‌اوت و دلیوری)
    3. [`REALTIME_CHAT_ENGINE.md`](file:///c:/xampp/htdocs/RazeDehkade/docs/ai/domains/REALTIME_CHAT_ENGINE.md) (موتور چت بلادرنگ، سوکت، شنود و هک مزداک)
    4. [`MEDIA_STREAMING_AND_BOT.md`](file:///c:/xampp/htdocs/RazeDehkade/docs/ai/domains/MEDIA_STREAMING_AND_BOT.md) (استریم رسانه HTTP 206، آپلود تکه‌ای و بات تلگرام)
    5. [`QUAD_PANEL_AND_3D_VAULT.md`](file:///c:/xampp/htdocs/RazeDehkade/docs/ai/domains/QUAD_PANEL_AND_3D_VAULT.md) (پنل ۴گانه زیر برد، تقویم شمسی، پرتره‌ها و گاوصندوق ۳D)
  - تدوین ۶ سند فرزند اجرایی تخصصی در `docs/ai/masters/` منطبق با قالب استاندارد پروتکل (ماتریس تغییر فایل‌ها، خطوط قرمز ویژه، گراف‌های Mermaid و ماتریس آزمون خودکار).
  - ثبت ۲۵ تصمیم حیاتی و دکترین معماری با شناسه‌های یکتای `DEC-0001` الی `DEC-0025` در [`DECISIONS.md`](file:///c:/xampp/htdocs/RazeDehkade/docs/ai/DECISIONS.md).
  - ایجاد نگاشت میکروسکوپی نمادها، روت‌ها و توابع در [`INDEX.md`](file:///c:/xampp/htdocs/RazeDehkade/docs/ai/INDEX.md).
- **فایل‌های تغییر یافته:**
  - `docs/ai/ROOT_MASTER.md` (ایجاد سند والد ریشه)
  - `docs/ai/PROJECT_STATE.md` (ایجاد حافظه زنده با امضای هوش فعلی)
  - `docs/ai/CHANGELOG.md` (ایجاد گاه‌شمار فنی انباشتی)
  - `docs/ai/DECISIONS.md` (ایجاد دفتر تصمیمات قطعی با ۲۵ شناسه مصوب)
  - `docs/ai/BACKLOG.md` (ایجاد لیست نیازمندی‌های آتی)
  - `docs/ai/INDEX.md` (ایجاد شاخص و رادار جستجوی سریع)
  - `docs/ai/domains/AUTH_AND_SESSIONS.md` (سند والد دامنه احراز هویت و کلاس‌ها)
  - `docs/ai/domains/STORE_AND_DELIVERY.md` (سند والد دامنه فروشگاه و دلیوری)
  - `docs/ai/domains/REALTIME_CHAT_ENGINE.md` (سند والد دامنه موتور چت و شنود)
  - `docs/ai/domains/MEDIA_STREAMING_AND_BOT.md` (سند والد دامنه استریم و تلگرام)
  - `docs/ai/domains/QUAD_PANEL_AND_3D_VAULT.md` (سند والد دامنه پنل ۴گانه و گاوصندوق)
  - `docs/ai/masters/MASTER_01_INITIAL_SETUP_AND_STORE.md` (سند تسک فروشگاه)
  - `docs/ai/masters/MASTER_02_DELIVERY_BLACKOUT_AND_TRANSFORMATION.md` (سند تسک دلیوری و بلک‌اوت)
  - `docs/ai/masters/MASTER_03_REALTIME_CHAT_AND_LIVE_LISTENING.md` (سند تسک چت و شنود)
  - `docs/ai/masters/MASTER_04_MEDIA_STREAMING_TELEGRAM_BOT.md` (سند تسک استریم و بات)
  - `docs/ai/masters/MASTER_05_QUAD_PANEL_AND_3D_VAULT.md` (سند تسک پنل ۴گانه و گاوصندوق)
  - `docs/ai/masters/MASTER_06_BUTTONS_AND_OUTPUTS_MATRIX.md` (سند تسک ماتریس دکمه‌ها و خروجی‌ها)
- **اعتبارسنجی:**
  - اجرای کامل سوئیت تست‌های یکپارچگی پروژه با دستور `npm test`:
  - تعداد کل سوئیت‌ها: ۱۱ سوئیت
  - تعداد کل تست‌ها: ۱۰۲ تست خودکار
  - وضعیت خروجی: **۱۰۲ تست پاس شد (PASS)، ۰ خطا (FAIL)**، مدت زمان: ~۸.۵ ثانیه.
  - تست‌های گاوصندوق زرهی ۳D، دلیوری پهپادی، شنود زنده صوتی، استریم آنلاین و روت‌های فروشگاه تماماً تایید شدند.
- **تسک بعدی پیشنهادی:**
  - دستیار هوش مصنوعی بعدی می‌تواند با مراجعه مستقیم به `docs/ai/BACKLOG.md` فاز آماده‌سازی استقرار روی سرور لینوکس پروداکشن (Ubuntu VPS)، تست‌های بار هم‌زمان ۳۰ کلاس، و بهینه‌سازی‌های اتصال پایگاه داده را پیگیری کند.

---

## Historical State — 2026-10-15 — استقرار نهایی گاوصندوق سه‌بعدی تمام‌صفحه و پاکت کاهی V10.0
- **دستور کارفرما:** استقرار گاوصندوق واقعی تمام‌صفحه اداری/بانکی با دستگیره سه‌شاخه، خروج نرم کاغذ از پاکت کاهی و سیاست اکید عدم لو رفتن سناریو (Zero-Spoiler).
- **اعتبارسنجی:** پاس شدن کامل تست‌های `tests/vault-slot4.test.js` و `tests/vault-passcode-and-lock.test.js`.
