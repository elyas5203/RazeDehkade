const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '../public/assets/js/emergency-auth.js'),
  'utf8'
);
const page = fs.readFileSync(
  path.join(__dirname, '../public/emergency-auth.html'),
  'utf8'
);

const requiredVerbatimText = [
  'نام و نام خانوادگی‌تان را بنویسید.',
  'چجوری روزی صد بار به حج قبول شده بریم ولی از مشهد خارج نشیم؟',
  'تلویزین رو بزنیم شبکه مسجدالحرام',
  'از روی رحمت به پدر و مادر نگاه کنیم',
  'هر روز صد بار بلیط هواپیما بگیریم بریم حج',
  'برو عمو گرفتی منو خود مردم مکه، هم نمی تونن',
  'بهترین زمان برای دیدن اخبار کی هست که خوابمون نبره؟',
  'چهار صبح با پادری',
  'بعد آبگوشت با دوغ آبعلی',
  'وسط کلاس علوم رو صندلی',
  'صبح شنبه ۱ مهر😭😭😭',
  'بهترین سرمایه گذاری مالی در سال ۲۰۲۶ چیست؟چرا؟',
  'خرید قابلمه چنگیز چون توش راحت می شه خوابید',
  'یه شونه تخم مرغ چون به جای جواهر رنگش کنیم بدیم مزداک',
  '۱۲ تا مگس کش پرویز چون که زیرا',
  'نیکی به پدر مادر چون طبق گفته امام صادق هرگز در زندگی فقیر نمی شویم',
  'چرا باید سه نفری رفت کلاس رنگ روغن؟',
  'نامردیه ما روغنی بشیم اونا نشن',
  'چون باید سه پایه داشته باشیم، حالا تو بگو کی پایه تر از ما😎',
  'بیکاریم',
  'اینجوری بیشتر حال میده',
  'اسم گروه تروریستی چه بود؟',
  'چه کسانی نامه پیدا شده را ترجمه کردند ؟',
  'تاریخ شناسان',
  'تبهکاران',
  'کسانی که جواهر را پیدا کردند',
  'اهالی روستا',
  'علت اصلی مهاجرت اهالی دهکده به شهر پیش از کشف جواهر چه بود؟',
  'جنگ و درگیری با گروه‌های تبهکار',
  'خشکسالی و کمبود غذا و آب آشامیدنی',
  'ناامنی و افزایش جرم و جنایت در دهکده',
  'پیدا شدن یک معدن قدیمی در اعماق زمین',
  'ویژگی خاص این جواهر از نظر تاریخ‌شناسان چه بود؟',
  'برامون صبح‌ها نون تازه می‌گیره',
  'موقع امتحان بهمون تقلب می‌رسونه',
  'هر کس از آن جواهر داشته باشد، خوشبخت می‌شود.',
  'تو کل دنیا همه جا ازش خیلی زیاد هست',
  'وقتی رئیس پلیس به کفش‌فروشی رسید، با چه وضعیتی روبرو شد؟',
  'صاحب مغازه در حال فرار از دست تبهکاران بود.',
  'در مغازه بسته بود و صاحب آن به دلیل گاز سمی بیهوش شده بود.',
  'مغازه غارت شده بود و صاحب آن توسط تبهکاران کشته شده بود.',
  'صاحب مغازه در حال پنهان کردن جواهر بود.',
  'طبق اطلاعات بدست آمده دهکده آخر کدام شهر بود؟',
  "{ letter: 'الف', text: 'مکه' }",
  "{ letter: 'ب', text: 'مدینه' }",
  "{ letter: 'ج', text: 'مشهد' }",
  'جواهر ارزشمند داخل پرونده چه بود ؟',
  'محبت و ولایت امیرالمومنین حضرت علی علیه السلام و فرزندانشان',
  'قرآن مجید',
  'پیامبر صلی الله علیه و آله و سلم',
  'امام زمان علیه السلام',
  'در دهکده اخر چه اتفاقی افتاد و دشمنان چه کارهایی کردن؟به صورت خلاصه توضیح دهید.'
];

test('approved emergency questions and choices stay verbatim', () => {
  for (const text of requiredVerbatimText) {
    assert.ok(source.includes(text), `Missing approved text: ${text}`);
  }
});

test('last-village question intentionally has exactly three supplied choices', () => {
  const start = source.indexOf("id: 'q_last_village_city'");
  const end = source.indexOf("id: 'q_precious_gem'", start);
  assert.ok(start >= 0 && end > start, 'last-village question block must exist');
  const block = source.slice(start, end);
  assert.equal((block.match(/letter:/g) || []).length, 3);
});

test('rejected mini-games are plain choices and selfie question is always last', () => {
  for (const id of ['q_padari', 'q_invest_2026', 'q_oil_painting', 'q_letter_translators',
    'q_migration_reason', 'q_gem_feature', 'q_police_shoe_store', 'q_precious_gem']) {
    const start = source.indexOf(`id: '${id}'`);
    const block = source.slice(start, source.indexOf('\n    },', start) + 7);
    assert.match(block, /type: 'choice'/, `${id} must be a plain choice`);
  }
  assert.match(source, /firstNameQ[\s\S]*middleQuestions[\s\S]*lastVideoQ/);
  assert.match(source, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(source, /new MediaRecorder/);
  assert.match(source, /form\.append\('clientSubmissionId'/);
  assert.match(source, /form\.append\('video'/);
  assert.match(source, /userAnswers\[q\.id\] = 'پاسخ ویدیویی همراه با نام و نام خانوادگی و استدلال شفاهی'/);
  assert.match(source, /hole\.addEventListener\('click'/);
});

test('success screen contains only status content and no navigation link or button', () => {
  const start = page.indexOf('<section id="step3Section"');
  const end = page.indexOf('</section>', start);
  const block = page.slice(start, end);
  assert.equal(/<(?:a|button)\b/i.test(block), false);
});
