/**
 * src/utils/classFolderMatcher.js
 * نگاشت هوشمند نام پوشه‌های داخل فایل فشرده (ZIP/RAR) به ۲۴ جلسه/کلاس ثبت‌شده در دیتابیس
 */

const path = require('path');

/**
 * لیست رسمی ۲۴ جلسه به همراه کدهای تخفیف (سفارش گل)، کد ورود به چت و نام‌های معادل پوشه‌ها در فایل RAR/ZIP
 */
const OFFICIAL_SESSIONS_SPEC = [
  {
    index: 1,
    name: 'یاوری و ناصری',
    orderCode: '529783',
    chatCode: '729279',
    activeCase: 'syndrome',
    cases: { syndrome: 'active', village: 'locked', court: 'locked' },
    folderAliases: ['یاوری و ناصری', 'ناصری و یاوری'],
  },
  {
    index: 2,
    name: 'عطاران و رحمتی و سید زاده',
    orderCode: '684131',
    chatCode: '494234',
    activeCase: 'syndrome',
    cases: { syndrome: 'active', village: 'locked', court: 'locked' },
    folderAliases: ['عطاران و سید زاده', 'عطاران و سیدزاده', 'عطاران و رحمتی و سید زاده', 'رحمتی و سید زاده'],
  },
  {
    index: 3,
    name: 'نعمتی و مقامی',
    orderCode: '998471',
    chatCode: '942342',
    activeCase: 'syndrome',
    cases: { syndrome: 'active', village: 'locked', court: 'locked' },
    folderAliases: ['نعمتی و مقامی - 3 نفر', 'نعمتی و مقامی', 'مقامی و نعمتی'],
  },
  {
    index: 4,
    name: 'خرازی',
    orderCode: '131456',
    chatCode: '795545',
    activeCase: 'syndrome',
    cases: { syndrome: 'active', village: 'locked', court: 'locked' },
    folderAliases: ['خرازی'],
  },
  {
    index: 5,
    name: 'خدادحسینی و خراسانی',
    orderCode: '608978',
    chatCode: '754675',
    activeCase: 'syndrome',
    cases: { syndrome: 'active', village: 'locked', court: 'locked' },
    folderAliases: ['خدادحسینی و خراسانی', 'خداداد حسینی و خراسانی', 'خداداد حسینی', 'خراسانی'],
  },
  {
    index: 6,
    name: 'محمدی پویا و باقرزاده و یوسف',
    orderCode: '747398',
    chatCode: '438600',
    activeCase: 'syndrome',
    cases: { syndrome: 'active', village: 'locked', court: 'locked' },
    folderAliases: ['باقرزاده و عطاران و محمدی', 'محمدی پویا و باقرزاده و یوسف', 'باقرزاده و محمدی و یوسف', 'یوسف و باقرزاده'],
  },
  {
    index: 7,
    name: 'محمدی پویا و باقرزاده و نوایی',
    orderCode: '477998',
    chatCode: '328695',
    activeCase: 'syndrome',
    cases: { syndrome: 'active', village: 'locked', court: 'locked' },
    folderAliases: ['نوایی و باقرزاده', 'باقرزاده و نوایی', 'محمدی پویا و باقرزاده و نوایی'],
  },
  {
    index: 8,
    name: 'شمسی و ملک',
    orderCode: '518854',
    chatCode: '624584',
    activeCase: 'syndrome',
    cases: { syndrome: 'active', village: 'locked', court: 'locked' },
    folderAliases: ['شمسی و ملک', 'ملک و شمسی'],
  },
  {
    index: 9,
    name: 'باقری و مسرت',
    orderCode: '370479',
    chatCode: '629081',
    activeCase: 'syndrome',
    cases: { syndrome: 'active', village: 'locked', court: 'locked' },
    folderAliases: ['مسرت و باقری', 'باقری و مسرت'],
  },
  {
    index: 10,
    name: 'بهمن ابادی و قانع منش و زمانیان',
    orderCode: '843141',
    chatCode: '552975',
    activeCase: 'syndrome',
    cases: { syndrome: 'active', village: 'locked', court: 'locked' },
    folderAliases: ['قانع منش و بهمن آبادی', 'قانع منش و بهمن ابادی', 'بهمن ابادی و قانع منش و زمانیان', 'زمانیان'],
  },
  {
    index: 11,
    name: 'حدادیان و رجب زاده',
    orderCode: '860265',
    chatCode: '446590',
    activeCase: 'syndrome',
    cases: { syndrome: 'active', village: 'locked', court: 'locked' },
    folderAliases: ['حدادیان و رجب زاده', 'رجب زاده و حدادیان', 'حدادیان', 'رجب زاده'],
  },
  {
    index: 12,
    name: 'حسین هاشمی',
    orderCode: '936789',
    chatCode: '223274',
    activeCase: 'syndrome',
    cases: { syndrome: 'active', village: 'locked', court: 'locked' },
    folderAliases: ['حسین هاشمی', 'هاشمی'],
  },
  {
    index: 13,
    name: 'سید جواد حسینی',
    orderCode: '238789',
    chatCode: '366870',
    activeCase: 'syndrome',
    cases: { syndrome: 'active', village: 'locked', court: 'locked' },
    folderAliases: ['سید جواد حسینی', 'جواد حسینی'],
  },
  {
    index: 14,
    name: 'اکبری و واحدی و انتظامی',
    orderCode: '113919',
    chatCode: '681352',
    activeCase: 'village',
    cases: { syndrome: 'solved', village: 'active', court: 'locked' },
    folderAliases: ['اکبری و واحدی و انتظامی', 'اکبری و واحدی', 'اکبری و انتظامی', 'واحدی و انتظامی', 'اکبری'],
  },
  {
    index: 15,
    name: 'شمسی و خوشباف',
    orderCode: '380731',
    chatCode: '827115',
    activeCase: 'village',
    cases: { syndrome: 'solved', village: 'active', court: 'locked' },
    folderAliases: ['شمسی و خوشباف', 'خوشباف و شمسی', 'خوشباف'],
  },
  {
    index: 16,
    name: 'خداد حسینی و منبتی',
    orderCode: '943277',
    chatCode: '346361',
    activeCase: 'village',
    cases: { syndrome: 'solved', village: 'active', court: 'locked' },
    folderAliases: ['خداد حسینی و منبتی', 'خداداد حسینی و منبتی', 'منبتی و خداداد حسینی', 'منبتی'],
  },
  {
    index: 17,
    name: 'زارع و احمدی',
    orderCode: '590019',
    chatCode: '699275',
    activeCase: 'village',
    cases: { syndrome: 'solved', village: 'active', court: 'locked' },
    folderAliases: ['زارع و احمدی', 'احمدی و زارع'],
  },
  {
    index: 18,
    name: 'وکیلیان و داوودپور',
    orderCode: '899862',
    chatCode: '511116',
    activeCase: 'village',
    cases: { syndrome: 'solved', village: 'active', court: 'locked' },
    folderAliases: ['داوود پور و وکیلیان', 'داوودپور و وکیلیان', 'وکیلیان و داوودپور', 'وکیلیان و داوود پور'],
  },
  {
    index: 19,
    name: 'عطاران و نجفیان و شیخ السلامی',
    orderCode: '940288',
    chatCode: '346775',
    activeCase: 'village',
    cases: { syndrome: 'solved', village: 'active', court: 'locked' },
    folderAliases: ['عطاران و نجفیان', 'عطاران و نجفیان و شیخ السلامی', 'نجفیان و عطاران', 'شیخ السلامی'],
  },
  {
    index: 20,
    name: 'قانع منش و عطاران',
    orderCode: '670711',
    chatCode: '178180',
    activeCase: 'village',
    cases: { syndrome: 'solved', village: 'active', court: 'locked' },
    folderAliases: ['قانع منش و عطاران', 'عطاران و قانع منش'],
  },
  {
    index: 21,
    name: 'زادسر و مجتبوی',
    orderCode: '315099',
    chatCode: '680929',
    activeCase: 'village',
    cases: { syndrome: 'solved', village: 'active', court: 'locked' },
    folderAliases: ['زادسر و مجتبوی', 'مجتبوی و زادسر'],
  },
  {
    index: 22,
    name: 'سعادتمند و شعبانی',
    orderCode: '206690',
    chatCode: '633712',
    activeCase: 'village',
    cases: { syndrome: 'solved', village: 'active', court: 'locked' },
    folderAliases: ['شعبانی', 'سعادتمند و شعبانی', 'شعبانی و سعادتمند', 'سعادتمند'],
  },
  {
    index: 23,
    name: 'تست سرور',
    orderCode: null,
    chatCode: null,
    activeCase: 'village',
    cases: { syndrome: 'solved', village: 'active', court: 'locked' },
    folderAliases: ['تست سرور', 'تست'],
    isTestSession: true,
  },
  {
    index: 24,
    name: 'حکیم زاده',
    orderCode: '957104',
    chatCode: '227765',
    activeCase: 'village',
    cases: { syndrome: 'solved', village: 'active', court: 'locked' },
    folderAliases: ['حکیم زاده', 'حکیم‌زاده'],
  },
];

/**
 * نرمال‌سازی رشته‌های فارسی برای تطبیق دقیق نام کلاس‌ها و نام دانش‌آموزان
 */
function normalizePersianName(input) {
  let s = String(input || '').trim();
  if (!s) return '';

  // یکسان‌سازی حروف عربی/فارسی و حذف اعراب و نیم‌فاصله
  s = s
    .replace(/[\u200B-\u200D\uFEFF]/g, ' ')
    .replace(/[يیئ]/g, 'ی')
    .replace(/[كک]/g, 'ک')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // حذف پسوندهای شمارشی مثل «- 3 نفر» یا «(3 نفر)»
    .replace(/[-–—(]?\s*[0-9۰-۹]+\s*نفر\s*[)]?/g, ' ')
    // یکسان‌سازی املای خداداد حسینی / خدادحسینی و داوود پور / داوودپور
    .replace(/خداداد\s*حسینی/g, 'خدادحسینی')
    .replace(/خداد\s*حسینی/g, 'خدادحسینی')
    .replace(/داوود\s*پور/g, 'داوودپور')
    .replace(/داود\s*پور/g, 'داوودپور')
    .replace(/بهمن\s*ابادی/g, 'بهمنابادی')
    .replace(/سید\s*زاده/g, 'سیدزاده')
    .replace(/قانع\s*منش/g, 'قانعمنش')
    .replace(/رجب\s*زاده/g, 'رجبزاده')
    .replace(/حکیم\s*زاده/g, 'حکیمزاده')
    .replace(/شیخ\s*الاسلامی/g, 'شیخالسلامی')
    .replace(/شیخ\s*السلامی/g, 'شیخالسلامی')
    .replace(/محمدی\s*پویا/g, 'محمدی')
    .replace(/[._\-/\\()[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return s;
}

/**
 * استخراج توکن‌های معنی‌دار از نام کلاس/پوشه (حذف حرف ربط «و»، «کلاس»، «گروه»، «جلسه»)
 */
function extractNameTokens(input) {
  const norm = normalizePersianName(input);
  if (!norm) return [];
  const stopWords = new Set(['و', 'کلاس', 'گروه', 'جلسه', 'عکس', 'های', 'کاراگاهی', 'کارآگاهی', 'دستیاران']);
  return norm
    .split(' ')
    .map(t => t.trim())
    .filter(t => t.length > 1 && !stopWords.has(t));
}

/**
 * استخراج نام تمیز دانش‌آموز از روی نام فایل عکس (مثلاً «امیرحسین حسن آبادی.png» -> «امیرحسین حسن آبادی»)
 */
function extractStudentNameFromFilename(fileName) {
  let base = path.basename(String(fileName || ''), path.extname(String(fileName || '')));
  base = base
    .replace(/[\u200B-\u200D\uFEFF]/g, ' ')
    .replace(/[ي]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[_]+/g, ' ')
    .replace(/\s+\(\d+\)$/g, '')
    .replace(/\s+copy$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return base || 'دستیار کارآگاه';
}

/**
 * کلید یکتا برای تشخیص تکراری بودن نام دانش‌آموز در یک کلاس (مثلاً وقتی هم .png و هم .webp برای یک نفر وجود دارد)
 */
function getStudentDedupKey(studentName) {
  return normalizePersianName(studentName).replace(/\s+/g, '');
}

/**
 * پیدا کردن بهترین جلسه دیتابیس برای یک نام پوشه (مثلاً «باقرزاده و عطاران و محمدی» یا «داوود پور و وکیلیان»)
 * @param {string} rawFolderName
 * @param {Array<{id: number, name: string, chat_code?: string, order_code?: string}>} dbSessions
 */
function matchFolderToSession(rawFolderName, dbSessions = []) {
  const cleanFolder = normalizePersianName(rawFolderName);
  if (!cleanFolder || !Array.isArray(dbSessions) || dbSessions.length === 0) {
    return null;
  }

  // ۱. تطبیق مستقیم با کد چت یا کد سفارش اگر در نام پوشه باشد
  for (const s of dbSessions) {
    if (s.chat_code && cleanFolder.includes(String(s.chat_code))) return s;
    if (s.order_code && cleanFolder.includes(String(s.order_code))) return s;
  }

  // ۲. تطبیق دقیق با نام یا Aliasهای رسمی تعریف‌شده در OFFICIAL_SESSIONS_SPEC
  for (const spec of OFFICIAL_SESSIONS_SPEC) {
    const allAliases = [spec.name, ...(spec.folderAliases || [])].map(normalizePersianName);
    if (allAliases.includes(cleanFolder)) {
      const normSpecName = normalizePersianName(spec.name);
      const found = dbSessions.find(
        s =>
          (spec.chatCode && String(s.chat_code) === String(spec.chatCode)) ||
          (spec.orderCode && String(s.order_code) === String(spec.orderCode)) ||
          normalizePersianName(s.name) === normSpecName
      );
      if (found) return found;
    }
  }

  // ۳. تطبیق مستقیم با نام جلسات موجود در دیتابیس (با ترتیب کلمات یکسان یا جابه‌جا شده)
  const folderTokens = extractNameTokens(cleanFolder);
  if (folderTokens.length === 0) return null;
  const folderTokenSet = new Set(folderTokens);

  let bestSession = null;
  let bestScore = 0;

  for (const s of dbSessions) {
    const sNorm = normalizePersianName(s.name);
    if (sNorm === cleanFolder) {
      return s;
    }

    // بررسی هم‌پوشانی توکن‌ها با خود نام جلسه و Aliasهای متناظر آن
    const matchingSpec = OFFICIAL_SESSIONS_SPEC.find(
      sp => normalizePersianName(sp.name) === sNorm || (sp.chatCode && String(s.chat_code) === String(sp.chatCode))
    );

    const candidateStrings = [s.name, ...(matchingSpec ? matchingSpec.folderAliases : [])];

    for (const cand of candidateStrings) {
      const candNorm = normalizePersianName(cand);
      if (candNorm === cleanFolder) {
        return s;
      }

      const candTokens = extractNameTokens(candNorm);
      if (candTokens.length === 0) continue;

      let intersection = 0;
      for (const t of folderTokenSet) {
        if (candTokens.includes(t)) {
          intersection++;
        }
      }

      if (intersection === 0) continue;

      // اگر تمام توکن‌های پوشه و کاندید دقیقاً یکی باشند (فقط جابه‌جا شده باشند مثل «مسرت و باقری» و «باقری و مسرت»)
      if (intersection === folderTokenSet.size && intersection === candTokens.length) {
        return s;
      }

      // امتیازدهی هوشمند بر اساس نسبت اشتراک توکن‌ها
      const precision = intersection / folderTokenSet.size;
      const recall = intersection / candTokens.length;
      const score = precision * 0.65 + recall * 0.35 + intersection * 0.08;

      if (score > bestScore && (intersection >= 2 || (folderTokenSet.size === 1 && intersection === 1))) {
        bestScore = score;
        bestSession = s;
      }
    }
  }

  return bestScore >= 0.55 ? bestSession : null;
}

module.exports = {
  OFFICIAL_SESSIONS_SPEC,
  normalizePersianName,
  extractNameTokens,
  extractStudentNameFromFilename,
  getStudentDedupKey,
  matchFolderToSession,
};
