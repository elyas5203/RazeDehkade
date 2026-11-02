# MASTER-39: به‌روزرسانی متن پرسش پایانی ویدیومسیج احراز هویت اضطراری و ابطال کش مرورگرها
# (Emergency Auth Final Video Question Text Update & Cache Invalidation)

> **سند معماری و تغییرات جراحی دقیق (USMAP-v3 Standard)**  
> **شناسه پروژه:** RazeDehkade-Emergency-Auth-Question-Update-v1.1  
> **تاریخ تنظیم:** ۲۰۲۶-۱۰-۳۱ (2026-10-31)  
> **وضعیت:** **تکمیل‌شده، ابطال کش کلاینت و مستقر در محیط محلی و سرور عملیاتی لایو (COMPLETED & DEPLOYED & CACHE BUSTED)**  
> **دامنه تغییرات:**  
> - `public/assets/js/emergency-auth.js`  
> - `public/emergency-auth.html`  
> - `tests/emergency-question-fidelity.test.js`  
> **حداقل شعاع تخریب (Minimal Blast Radius):** دقیقاً و منحصراً متن پرسش پایانی ویدیومسیج و نسخه کش اسکریپت تغییر یافته است؛ هیچ منطق بیزینسی، استایل، اعتبارسنجی یا فرآیندی دستکاری نشده است.

---

## ۱. صورت‌مسئله و علت مشاهده متن قبلی توسط کاربر (Root Cause Analysis)

### ۱.۱. خواسته صریح کارفرما
متن پرسش آخر درگاه احراز هویت اضطراری که دانش‌آموزان به صورت ویدیوی سلفی به آن پاسخ می‌دهند، باید عیناً به عبارت زیر تغییر یابد:

> **«طبق اخرین ویدیو اخبار، اولین دهکده کدوم شهر بود و در اونجا چه اتفاقاتی افتاد و دشمنان چه کارهایی کردند؟»**

### ۱.۲. چرا کاربر هنگام ورود به سایت متن قبلی را می‌دید؟
1. **تنظیمات Nginx روی سرور (`/etc/nginx/conf.d/razedehkade.conf`):**
   ```nginx
   location ^~ /assets/ {
       alias /home/user615/RazeDehkade/public/assets/;
       expires 30d;
       add_header Cache-Control "public, max-age=2592000, immutable";
       access_log off;
   }
   ```
2. هدر `immutable` با طول عمر ۳۰ روز به مرورگر کلاینت اعلام می‌کند که فایل آدرس‌دهی‌شده هرگز در ۳۰ روز آینده تغییر نخواهد کرد و مرورگر نباید حتی درخواست اعتبارسنجی ۳۰۴ به سرور ارسال کند.
3. در فایل `public/emergency-auth.html`، اسکریپت با کوئری پارامتر قدیمی لود می‌شد:
   ```html
   <script src="/assets/js/emergency-auth.js?v=20261029_1630_v5m"></script>
   ```
4. بنابراین هر مرورگری که پیش‌تر وارد سایت شده بود، فایل جاوااسکریپت را از **دیسک کش محلی خود (Disk Cache)** می‌خواند و متن پرسش جدید را دریافت نمی‌کرد!
5. علاوه بر این، در خط ۷۰۹ فایل `emergency-auth.js`، متن استاتوس لحظه شروع ضبط نیز کماکان به عبارت قبلی («توضیح خلاصه دهکده آخر») اشاره داشت که اصلاح شد.

---

## ۲. کالبدشکافی خط‌به‌خط تغییرات اعمال‌شده (Forensic Code Changes)

### ۲.۱. فایل فرانت‌اند `public/assets/js/emergency-auth.js`

#### ۱) عنوان پرسش در آرایه `QUESTIONS_DATABASE`:
- **خط دقیق:** [`public/assets/js/emergency-auth.js#L193-L196`](file:///e:/projects/RazeDehkade/public/assets/js/emergency-auth.js#L193-L196)

```javascript
    {
      id: 'q_final_video_message',
      type: 'video_message',
      title: 'طبق اخرین ویدیو اخبار، اولین دهکده کدوم شهر بود و در اونجا چه اتفاقاتی افتاد و دشمنان چه کارهایی کردند؟'
    }
```

#### ۲) متن دستورالعمل درون باکس راهنمای ضبط ویدیو:
- **خط دقیق:** [`public/assets/js/emergency-auth.js#L586`](file:///e:/projects/RazeDehkade/public/assets/js/emergency-auth.js#L586)

```html
          <li>به صورت خلاصه توضیح بده طبق اخرین ویدیو اخبار، اولین دهکده کدوم شهر بود و در اونجا چه اتفاقاتی افتاد و دشمنان چه کارهایی کردند.</li>
```

#### ۳) متن وضعیت شروع ضبط سلفی:
- **خط دقیق:** [`public/assets/js/emergency-auth.js#L709`](file:///e:/projects/RazeDehkade/public/assets/js/emergency-auth.js#L709)

```javascript
        status.textContent = 'در حال ضبط… (00:00) - پاسخ به سوال و نام خود را بگو';
```

---

### ۲.۲. ابطال کش در فایل `public/emergency-auth.html`
- **خط دقیق:** [`public/emergency-auth.html#L148`](file:///e:/projects/RazeDehkade/public/emergency-auth.html#L148)

```html
  <script src="/socket.io/socket.io.js"></script>
  <script src="/assets/js/emergency-auth.js?v=20261031_2045_qvideo"></script>
```
با ارتقای کوئری‌پارامتر نسخه به `?v=20261031_2045_qvideo`، تمامی مرورگرها، کلودفلر و پروکسی‌ها فایل جاوااسکریپت به‌روزرسانی‌شده را بلادرنگ دانلود می‌کنند و کش دیسک منسوخ کلاینت فوراً باطل می‌شود.

---

### ۲.۳. فایل آزمون راستی‌آزمایی `tests/emergency-question-fidelity.test.js`
- **خط دقیق:** [`tests/emergency-question-fidelity.test.js#L67`](file:///e:/projects/RazeDehkade/tests/emergency-question-fidelity.test.js#L67)

```javascript
  'طبق اخرین ویدیو اخبار، اولین دهکده کدوم شهر بود و در اونجا چه اتفاقاتی افتاد و دشمنان چه کارهایی کردند؟'
```

---

## ۳. شواهد عینی راستی‌آزمایی و خروجی ترمینال (Terminal Evidence)

### ۳.۱. اجرای آزمون‌های محلی (Local Test Suite)
```
node scripts/test-runner.js
Executing 40 test suites directly...
...
✅ PASSED: tests\emergency-question-fidelity.test.js
🎉 All 40 test suites passed 100% green!
```

### ۳.۲. استقرار و راستی‌آزمایی روی سرور عملیاتی لینوکس (VPS 95.217.95.111)
- انتقال امن از طریق `scripts/deploy_emergency_q_update.js`:
```
1. Checking local files...
  ✓ public/emergency-auth.html (7257 bytes)
  ✓ public/assets/js/emergency-auth.js (63686 bytes)
  ✓ tests/emergency-question-fidelity.test.js (6023 bytes)
2. Creating tar archive...
3. SCP archive to VPS...
4. Extracting on VPS... Extraction done.
5. Running remote verification...
ok 1 - approved emergency questions and choices stay verbatim
ok 2 - last-village question intentionally has exactly three supplied choices
ok 3 - rejected mini-games are plain choices and selfie question is always last
ok 4 - success screen contains only status content and no navigation link or button
# tests 4 | suites 0 | pass 4 | fail 0
```

- استعلام پاسخ Nginx و Node روی سرور:
```bash
Node response: <script src="/assets/js/emergency-auth.js?v=20261031_2045_qvideo"></script>
Nginx response: <script src="/assets/js/emergency-auth.js?v=20261031_2045_qvideo"></script>
```

- استعلام خروجی سرور عمومی روی اینترنت (`https://razedehkade.ir`):
```bash
# curl -s https://razedehkade.ir/emergency-auth.html | grep emergency-auth.js
<script src="/assets/js/emergency-auth.js?v=20261031_2045_qvideo"></script>

# curl -s https://razedehkade.ir/assets/js/emergency-auth.js?v=20261031_2045_qvideo
title: 'طبق اخرین ویدیو اخبار، اولین دهکده کدوم شهر بود و در اونجا چه اتفاقاتی افتاد و دشمنان چه کارهایی کردند؟'
<li>به صورت خلاصه توضیح بده طبق اخرین ویدیو اخبار، اولین دهکده کدوم شهر بود و در اونجا چه اتفاقاتی افتاد و دشمنان چه کارهایی کردند.</li>
status.textContent = 'در حال ضبط… (00:00) - پاسخ به سوال و نام خود را بگو';
```

- اجرای سوئیت تست‌های کامل سرور روی VPS:
```bash
node scripts/test-runner.js
# 🎉 All 38 test suites passed 100% green!
```

---

## ۴. ثبت در دفتر تصمیمات و حافظه پروژه
- تصمیم رسمی `DEC-0045` در `docs/ai/DECISIONS.md`.
- وضعیت نهایی: **PASS / PRODUCTION READY / CACHE-BUSTED**
