# TASK-009: ارسال پاسخ‌های کامل معماها و ویدیوی MP4 با قابلیت استریم آنی تلگرام

وضعیت: active  
تاریخ و نسخه پایه: 2026-10-26  
والد: `../../docs/ai/masters/MASTER_24_STREAMABLE_MP4_AND_SUBMISSION_ANSWERS_DISPATCH.md`

## درخواست و هدف

ارسال تمام پاسخ‌های ثبت‌شده معماها همراه با ویدیوی سلفی احراز هویت به تلگرام، تبدیل ویدیو به MP4 با قابلیت استریم آنی (FastStart)، کاهش فشار سرور با اولویت‌بندی ضبط MP4 در کلاینت و تبدیل فوق‌سریع FFmpeg در سرور، و تکمیل کلیدها و دستورات `/videos` و `/resend_videos` در بات تلگرام.

## چک‌لیست پذیرش

- [x] پیاده‌سازی نگاشت عناوین فارسی ۱۲ سؤال در `src/utils/videoTranscoder.js`
- [x] پیاده‌سازی ماژول تبدیل بهینه `ensureStreamableVideo` با پرچم‌های `-preset ultrafast -crf 28 -threads 2` و `+faststart`
- [x] تنظیم کلاینت `emergency-auth.js` برای اولویت‌دهی به ضبط `video/mp4`
- [x] استخراج پاسخ‌های ثبت‌شده از `emergency_auth_submissions` و درج در کپشن یا پیام تکمیلی تلگرام
- [x] ارسال ویدیو با متد `sendVideo` و فیلد `supports_streaming: true`
- [x] پیاده‌سازی متدهای `handleEmergencyVideosMenu` و `handleResendLatestVideos` و کیبورد در `MohtavaTelBot/bot.js`
- [x] ایجاد سند مَستر MASTER_24 و فایل تسک TASK-009
- [x] پاس‌شدن ۱۰۰٪ تمام تست‌های پروژه (۲۶ تست سوئیت) بدون رگرسیون

## ریسک و بازگشت

- منابع سرور: استفاده از پرچم `-threads 2` و `-preset ultrafast` مانع از افزایش بار CPU سرور می‌شود.
- بازگشت: در صورت بروز هرگونه مشکل، امکان بازگشت به ارسال ساده فایل بدون تداخل در جریان کاری احراز هویت وجود دارد.
