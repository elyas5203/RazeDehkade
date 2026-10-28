const fs = require('fs');
const path = require('path');

const addendum = `
- **بهبودهای نهایی کامپوزر، زمان‌بندی خوانش و نمایش شفاف تصاویر مزداک (TASK-011):**
  1. **ارتفاع پویا و چندخطی اینپوت کامپوزر (#msg-input):** در حین تایپ چندخطی روح (\`\\n\` یا متن‌های بلند)، ارتفاع کامپوزر با تابع \`adjustHeight()\` به‌طور خودکار بین ۶۸ پیکسل تا ۲۲۰ پیکسل منبسط می‌شود و \`white-space: pre-wrap; line-height: 1.6\` فعال می‌گردد تا هیچ خطی از دید پنهان نماند و اسکرول‌بار ظاهر نشود. پس از اتمام تایپ، استایل به‌طور خودکار به وضعیت اولیه ریست می‌گردد.
  2. **سرعت طبیعی خواندن و پاک کردن متن (Ghost Typing Pacing):** زمان مکث متن برای خواندن توسط دانش‌آموزان به حداقل ۷.۵ ثانیه افزایش یافت (\`holdMs >= 7500ms\`). پاک شدن متن نیز به جای جهش ناگهانی ۴ حرفی، کاراکتر به کاراکتر مانند کلید Backspace واقعی (با تأخیر ۳۵ الی ۵۵ میلی‌ثانیه) انجام می‌شود و مکث دراماتیک ۱.۲ ثانیه‌ای قبل از تایپ پیام ارسالی و ۲.۲ ثانیه‌ای قبل از فرستادن پیام اعمال گردید تا بچه‌ها فرصت کامل برای خواندن پیام داشته باشند.
  3. **نمایش کامل و شفاف تصویر مزداک روی کلیه مدارک برد (Anti-Blackout Fix):** فیلتر تاریک‌کننده \`filter: grayscale(1) brightness(0.25)\` از روی کلاس \`.card-blackout\` حذف شد و پوشش \`.evidence-mazdak-glitch-cover\` با لایه بالاتر \`z-index: 100\`، کادر نئونی قرمز و بج \`⚠️ مدرک به تصاحب مزداک درآمد\` روی کلیه کارت‌ها (عکس، فایل، وویس) تصویر \`/mazdak.jpg\` را با روشنایی و شفافیت ۱۰.۵ برابری نمایش می‌دهد.
  4. **کش‌باستر جدید:** دارایی‌های فرانت‌اند به \`v=20261027_0700\` به‌روزرسانی شدند.
`;

// 1. MASTER_CINEMATIC_BREACH_CHOREOGRAPHY_AND_STORYLINE.md
const rootMasterPath = path.join(__dirname, '..', 'MASTER_CINEMATIC_BREACH_CHOREOGRAPHY_AND_STORYLINE.md');
if (fs.existsSync(rootMasterPath)) {
  let content = fs.readFileSync(rootMasterPath, 'utf8');
  if (!content.includes('بهبودهای نهایی کامپوزر، زمان‌بندی خوانش')) {
    content = content.replace('## ۱۰. شواهد آزمون و پایان کار', `${addendum}\n---\n\n## ۱۰. شواهد آزمون و پایان کار`);
    fs.writeFileSync(rootMasterPath, content, 'utf8');
    console.log('Updated root MASTER_CINEMATIC_BREACH_CHOREOGRAPHY_AND_STORYLINE.md');
  }
}

// 2. docs/ai/masters/MASTER_28_CINEMATIC_BREACH_CHOREOGRAPHY_AND_STORYLINE.md
const docsMasterPath = path.join(__dirname, '..', 'docs', 'ai', 'masters', 'MASTER_28_CINEMATIC_BREACH_CHOREOGRAPHY_AND_STORYLINE.md');
if (fs.existsSync(docsMasterPath)) {
  let content = fs.readFileSync(docsMasterPath, 'utf8');
  if (!content.includes('بهبودهای نهایی کامپوزر، زمان‌بندی خوانش')) {
    content = content.replace('## ۱۰. شواهد آزمون و پایان کار', `${addendum}\n---\n\n## ۱۰. شواهد آزمون و پایان کار`);
    fs.writeFileSync(docsMasterPath, content, 'utf8');
    console.log('Updated docs MASTER_28_CINEMATIC_BREACH_CHOREOGRAPHY_AND_STORYLINE.md');
  }
}

// 3. ai-kit/memory/STATE.md
const statePath = path.join(__dirname, '..', 'ai-kit', 'memory', 'STATE.md');
if (fs.existsSync(statePath)) {
  let content = fs.readFileSync(statePath, 'utf8');
  const bulletPoint = `  - **Composer Multi-line Auto-Expansion & Ghost Typing Pacing:** Added dynamic height auto-expansion (68px-220px) to \`#msg-input\` during ghost typing to prevent line clipping. Enhanced hold duration to >=7500ms, character-by-character backspace erasing, and 2.2s reading hold before dispatch.
  - **Evidence Board Clear Mazdak Photos:** Removed blackout/dimming filters from \`.card-blackout\`, set \`.evidence-mazdak-glitch-cover\` z-index to 100 with clear brightness, ensuring all cards (photos, voice notes, files) display Mazdak's photo \`/mazdak.jpg\` clearly.
  - **Cache Buster:** Bumped to \`v=20261027_0700\` in \`public/chat.html\` and test suites.`;
  if (!content.includes('Composer Multi-line Auto-Expansion')) {
    content = content.replace('  - Bumped cache-busters to `v=20261027_0600`.', bulletPoint);
    fs.writeFileSync(statePath, content, 'utf8');
    console.log('Updated STATE.md');
  }
}

console.log('Master documentation successfully updated.');
