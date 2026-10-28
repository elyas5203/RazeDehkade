const fs = require('fs');
const path = require('path');

const addendum = `
- **هماهنگ‌سازی بدون وقفه کرئوگرافی، ارسال آنی پیام اول و تثبیت صفحه ذخیره آدرس (TASK-011 / Polish 2):**
  1. **ارسال فوری پیام اول در ثانیه صفر:** با تریگر هک توسط ادمین، بلافاصله در همان لحظه تابع \`renderFrame(0)\` فراخوانی شده و پیام اول کارآگاه (\`خب\\nویدئو دهکده آخر رو دیدین ؟\`) در ثانیه صفر به چت مخابره می‌گردد تا هیچ تأخیری احساس نشود.
  2. **سرعت بی‌وقفه و ریتمیک تمام ۲۴ دیالوگ سناریو:** فواصل میان پیام‌های متنی کارآگاه و مزداک به ۲ الی ۳ ثانیه بهینه‌سازی شدند تا حس زنده نبرد چت حفظ شده و وقفه طولانی و حس گیر کردن در پیام‌ها کاملاً برطرف گردد. کل سناریو تا پایان شمارش معکوس در زمان استاندارد ۱۷۳ ثانیه به اتمام می‌رسد.
  3. **تثبیت صفحه ذخیره آدرس سایت و عدم ورود به سوالات احراز هویت:** در مودال اخراج اضطراری، کادر ذخیره آدرس (\`https://razedehkade.ir\`) به همراه دکمه کپی آدرس قرار دارد. پس از اتمام شمارش معکوس ۱۰ ثانیه‌ای، کاربر روی همین صفحه هشدار مسدود مانده و به هیچ‌وجه به صفحه سوالات احراز هویت (\`/emergency-auth.html\`) منتقل نمی‌شود.
  4. **کش‌باستر جدید:** دارایی‌ها به \`v=20261027_0800\` به‌روزرسانی شدند.
`;

const rootMasterPath = path.join(__dirname, '..', 'MASTER_CINEMATIC_BREACH_CHOREOGRAPHY_AND_STORYLINE.md');
if (fs.existsSync(rootMasterPath)) {
  let content = fs.readFileSync(rootMasterPath, 'utf8');
  if (!content.includes('هماهنگ‌سازی بدون وقفه کرئوگرافی')) {
    content = content.replace('## ۱۰. شواهد آزمون و پایان کار', `${addendum}\n---\n\n## ۱۰. شواهد آزمون و پایان کار`);
    fs.writeFileSync(rootMasterPath, content, 'utf8');
    console.log('Updated root MASTER_CINEMATIC_BREACH_CHOREOGRAPHY_AND_STORYLINE.md');
  }
}

const docsMasterPath = path.join(__dirname, '..', 'docs', 'ai', 'masters', 'MASTER_28_CINEMATIC_BREACH_CHOREOGRAPHY_AND_STORYLINE.md');
if (fs.existsSync(docsMasterPath)) {
  let content = fs.readFileSync(docsMasterPath, 'utf8');
  if (!content.includes('هماهنگ‌سازی بدون وقفه کرئوگرافی')) {
    content = content.replace('## ۱۰. شواهد آزمون و پایان کار', `${addendum}\n---\n\n## ۱۰. شواهد آزمون و پایان کار`);
    fs.writeFileSync(docsMasterPath, content, 'utf8');
    console.log('Updated docs MASTER_28_CINEMATIC_BREACH_CHOREOGRAPHY_AND_STORYLINE.md');
  }
}

const statePath = path.join(__dirname, '..', 'ai-kit', 'memory', 'STATE.md');
if (fs.existsSync(statePath)) {
  let content = fs.readFileSync(statePath, 'utf8');
  const bulletPoint = `  - **Immediate T=0 First Message & Seamless Dialogue Rhythm:** Rendered initial detective message at T=0 immediately upon start; synchronized all 24 scenario lines with tight 2-3s intervals.
  - **Save Site Address Lockout Screen (No Quiz Redirect):** Ejection modal prominently features site URL \`https://razedehkade.ir\` with copy button. Upon 10s countdown expiry, screen permanently locks on this address saving notification without redirecting users to the question quiz portal.
  - **Cache Buster:** Bumped to \`v=20261027_0800\` in \`public/chat.html\` and test suites.`;
  if (!content.includes('Immediate T=0 First Message')) {
    content = content.replace('  - Bumped cache-busters to `v=20261027_0700`.', bulletPoint);
    fs.writeFileSync(statePath, content, 'utf8');
    console.log('Updated STATE.md');
  }
}

console.log('Master documentation updated.');
