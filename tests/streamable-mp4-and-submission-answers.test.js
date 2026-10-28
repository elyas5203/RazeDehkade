'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const transcoderJs = require('../src/utils/videoTranscoder');
const queueFile = fs.readFileSync(path.join(root, 'src/services/emergencyVideoQueue.js'), 'utf8');
const clientJs = fs.readFileSync(path.join(root, 'public/assets/js/emergency-auth.js'), 'utf8');
const botJs = fs.readFileSync(path.join(root, 'MohtavaTelBot/bot.js'), 'utf8');

test('MASTER-24: Streamable MP4 Dispatch & Complete Submission Answers Transmission', async t => {
  await t.test('1. QUESTION_LABELS maps all 14 questions in exact order', () => {
    const expectedIds = [
      'q_student_name',
      'q_shoe_rotary', 'q_terrorist_newspaper', 'q_hajj', 'q_padari',
      'q_invest_2026', 'q_oil_painting', 'q_letter_translators',
      'q_migration_reason', 'q_gem_feature', 'q_police_shoe_store',
      'q_last_village_city', 'q_precious_gem',
      'q_final_video_message'
    ];
    const keys = Object.keys(transcoderJs.QUESTION_LABELS);
    assert.deepEqual(keys, expectedIds);
    assert.match(transcoderJs.QUESTION_LABELS.q_student_name, /نام و نام خانوادگی/);
    assert.match(transcoderJs.QUESTION_LABELS.q_shoe_rotary, /کفش‌فروشی تنها/);
    assert.match(transcoderJs.QUESTION_LABELS.q_terrorist_newspaper, /گروه تروریستی/);
    assert.match(transcoderJs.QUESTION_LABELS.q_precious_gem, /جواهر ارزشمند/);
    assert.match(transcoderJs.QUESTION_LABELS.q_final_video_message, /دهکده آخر/);
  });

  await t.test('2. formatAnswersReport formats Persian summary with metadata and all answers', () => {
    const sampleAnswers = {
      q_student_name: 'علیرضا حسینی',
      q_shoe_rotary: '05138440000',
      q_terrorist_newspaper: 'مزداک',
      q_hajj: 'از روی رحمت به پدر و مادر نگاه کنیم',
      q_padari: 'چهار صبح با پادری',
      q_invest_2026: 'نیکی به پدر و مادر طبق حدیث امام صادق (ع)',
      q_oil_painting: 'چون باید سه پایه داشته باشیم',
      q_letter_translators: 'تاریخ شناسان',
      q_migration_reason: 'خشکسالی و کمبود غذا و آب آشامیدنی',
      q_gem_feature: 'هر کس از آن جواهر داشته باشد، خوشبخت می‌شود.',
      q_police_shoe_store: 'در مغازه بسته بود و صاحب آن به دلیل گاز سمی بیهوش شده بود',
      q_last_village_city: 'مشهد',
      q_precious_gem: 'محبت و ولایت امیرالمومنین حضرت علی علیه السلام',
      q_final_video_message: 'پاسخ ویدیویی همراه با نام و نام خانوادگی و استدلال شفاهی'
    };
    const report = transcoderJs.formatAnswersReport(sampleAnswers, {
      className: 'کلاس کارآگاهان جوان',
      phone: '09151112233',
      referenceCode: 'SEC-A1B2C3D4'
    });

    assert.match(report, /پاسخ ویدیویی احراز هویت پرونده/);
    assert.match(report, /کلاس کارآگاهان جوان/);
    assert.match(report, /09151112233/);
    assert.match(report, /SEC-A1B2C3D4/);
    assert.match(report, /۱\. شماره کفش‌فروشی تنها:\s*«05138440000»/);
    assert.match(report, /۲\. اسم گروه تروریستی \(پازل روزنامه\):\s*«مزداک»/);
    assert.match(report, /۱۲\. جواهر ارزشمند پرونده:\s*«محبت و ولایت امیرالمومنین حضرت علی علیه السلام»/);
    assert.match(report, /۱۳\. ویدیوی تشریح رخدادهای دهکده آخر \(ویدیومسیج\):\s*«پاسخ ویدیویی همراه با نام و نام خانوادگی و استدلال شفاهی»/);
  });

  await t.test('3. Client MediaRecorder prioritizes MP4 container before WebM', () => {
    assert.match(clientJs, /'video\/mp4;codecs=avc1,mp4a\.40\.2'/);
    assert.match(clientJs, /'video\/mp4'/);
    // Verifies MP4 appears before WebM in candidate list
    const mp4Index = clientJs.indexOf('video/mp4;codecs=avc1,mp4a.40.2');
    const webmIndex = clientJs.indexOf('video/webm;codecs=vp8,opus');
    assert.ok(mp4Index > 0 && webmIndex > 0 && mp4Index < webmIndex);
  });

  await t.test('4. emergencyVideoQueue implements answers lookup, streamable MP4 transcoding, and supports_streaming', () => {
    assert.match(queueFile, /SELECT answers_json FROM emergency_auth_submissions/);
    assert.match(queueFile, /formatAnswersReport/);
    assert.match(queueFile, /ensureStreamableVideo/);
    assert.match(queueFile, /supports_streaming/);
    assert.match(queueFile, /sendVideo/);
    assert.match(queueFile, /sendTelegramTextMessage/);
  });

  await t.test('5. MohtavaTelBot implements handleEmergencyVideosMenu and handleResendLatestVideos', () => {
    assert.match(botJs, /async handleEmergencyVideosMenu\(chatId\)/);
    assert.match(botJs, /async handleResendLatestVideos\(chatId\)/);
    assert.match(botJs, /getEmergencyVideosKeyboard/);
    assert.match(botJs, /🔄 ارسال مجدد ویدیوها/);
  });

  await t.test('6. Master and Task documentation exist', () => {
    const masterPath = path.join(root, 'docs/ai/masters/MASTER_24_STREAMABLE_MP4_AND_SUBMISSION_ANSWERS_DISPATCH.md');
    const taskPath = path.join(root, 'ai-kit/tasks/TASK-009-STREAMABLE-MP4-AND-SUBMISSION-ANSWERS.md');
    assert.ok(fs.existsSync(masterPath), 'Master 24 must exist');
    assert.ok(fs.existsSync(taskPath), 'Task 009 must exist');
  });
});
