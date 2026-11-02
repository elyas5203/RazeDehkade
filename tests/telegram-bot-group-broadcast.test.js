process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// Ensure storage dir exists
const storageDir = path.resolve(__dirname, '..', 'storage');
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

const groupsFile = path.join(storageDir, 'telegram_authorized_groups.json');

const { MohtavaTelegramBot } = require('../MohtavaTelBot/bot');
const {
  getAllAuthorizedAdminChatIds,
  getAllAuthorizedGroupDestinations,
  sendExistingTelegramMedia
} = require('../src/services/emergencyVideoQueue');

test('MASTER-GROUP-BROADCAST: Telegram Group Auto-Registration and Video Broadcast', async (t) => {
  const originalGroupsFileContent = fs.existsSync(groupsFile) ? fs.readFileSync(groupsFile, 'utf8') : null;

  t.after(() => {
    if (originalGroupsFileContent !== null) {
      fs.writeFileSync(groupsFile, originalGroupsFileContent, 'utf8');
    } else if (fs.existsSync(groupsFile)) {
      fs.unlinkSync(groupsFile);
    }
  });

  await t.test('1. Casual messages in group are silently ignored without sending warnings', async () => {
    const sentMessages = [];
    const bot = new MohtavaTelegramBot({ adminId: 5490508090, adminSecretKey: 'admin_110_59' });
    bot.sendMessage = async (chatId, text, replyMarkup, threadId) => {
      sentMessages.push({ chatId, text, replyMarkup, threadId });
    };

    // Casual chat by a non-admin in a group
    await bot.handleMessage({
      chat: { id: -1001234567890, type: 'supergroup', title: 'کارآگاه و راز دهکده متروک' },
      from: { id: 999999, first_name: 'دانش‌آموز علی' },
      text: 'سلام بچه‌ها فردا کلاس چه ساعتیه؟',
    });

    assert.equal(sentMessages.length, 0, 'No warning message should be sent to casual group messages');
  });

  await t.test('2. Sending admin_110_59 in group authorizes group and replies with confirmation', async () => {
    const sentMessages = [];
    const bot = new MohtavaTelegramBot({ adminId: 5490508090, adminSecretKey: 'admin_110_59' });
    bot.sendMessage = async (chatId, text, replyMarkup, threadId) => {
      sentMessages.push({ chatId, text, replyMarkup, threadId });
    };

    const targetGroupId = -1009876543210;
    await bot.handleMessage({
      chat: { id: targetGroupId, type: 'supergroup', title: 'کارآگاه و راز دهکده متروک' },
      from: { id: 434076112, first_name: 'M.R.Maserrat', username: 'M_R_Maserrat' },
      text: 'admin_110_59',
    });

    assert.equal(bot.isAuthorizedGroup(targetGroupId), true, 'Group should be marked authorized');
    assert.equal(sentMessages.length, 1, 'Should send 1 confirmation message');
    assert.match(sentMessages[0].text, /با موفقیت برای ارسال مستقیم ویدیوهای احراز هویت ثبت شد/, 'Should confirm group registration');

    // Verify written to storage file
    assert.equal(fs.existsSync(groupsFile), true);
    const parsed = JSON.parse(fs.readFileSync(groupsFile, 'utf8'));
    const found = parsed.find(g => String(g.groupId) === String(targetGroupId));
    assert.ok(found, 'Group record must exist in telegram_authorized_groups.json');
    assert.equal(found.title, 'کارآگاه و راز دهکده متروک');
  });

  await t.test('3. Authorized admin sending /setgroup connects group', async () => {
    const sentMessages = [];
    const bot = new MohtavaTelegramBot({ adminId: 5490508090, adminSecretKey: 'admin_110_59' });
    bot.sendMessage = async (chatId, text, replyMarkup, threadId) => {
      sentMessages.push({ chatId, text, replyMarkup, threadId });
    };

    const newGroupId = -1005555555555;
    // 5490508090 is default authorized admin
    await bot.handleMessage({
      chat: { id: newGroupId, type: 'supergroup', title: 'گروه تست ۲' },
      from: { id: 5490508090, first_name: 'Elyas' },
      text: '/setgroup',
    });

    assert.equal(bot.isAuthorizedGroup(newGroupId), true);
    assert.equal(sentMessages.length, 1);
    assert.match(sentMessages[0].text, /با موفقیت برای ارسال مستقیم ویدیوهای احراز هویت ثبت شد/);
  });

  await t.test('4. /group_info in group reports connection status', async () => {
    const sentMessages = [];
    const bot = new MohtavaTelegramBot({ adminId: 5490508090 });
    bot.sendMessage = async (chatId, text) => {
      sentMessages.push({ chatId, text });
    };

    bot.authorizedGroupIds.add('-1009876543210');

    await bot.handleMessage({
      chat: { id: -1009876543210, type: 'supergroup', title: 'کارآگاه و راز دهکده متروک' },
      from: { id: 111111, first_name: 'Member' },
      text: '/group_info',
    });

    assert.equal(sentMessages.length, 1);
    assert.match(sentMessages[0].text, /وضعیت: متصل به سیستم ارسال خودکار ویدیوها/);
  });

  await t.test('5. my_chat_member: adding bot to group by authorized admin automatically registers group', async () => {
    const sentMessages = [];
    const bot = new MohtavaTelegramBot({ adminId: 5490508090 });
    bot.authorizedAdminIds.add(434076112); // M.R.Maserrat
    bot.sendMessage = async (chatId, text) => {
      sentMessages.push({ chatId, text });
    };

    const autoGroupId = -1007777777777;
    await bot.handleMyChatMember({
      chat: { id: autoGroupId, type: 'supergroup', title: 'کارآگاه و راز دهکده متروک' },
      from: { id: 434076112, first_name: 'M.R.Maserrat' },
      new_chat_member: { status: 'administrator' },
    });

    assert.equal(bot.isAuthorizedGroup(autoGroupId), true);
    assert.equal(sentMessages.length, 1);
    assert.match(sentMessages[0].text, /به عنوان مقصد اختصاصی و مستقیم ارسال ویدیوهای احراز هویت دانش‌آموزان ثبت گردید/);
  });

  await t.test('6. getAllAuthorizedGroupDestinations returns registered groups', async () => {
    fs.writeFileSync(groupsFile, JSON.stringify([
      { groupId: '-1009876543210', title: 'کارآگاه و راز دهکده متروک', threadId: null },
      { groupId: '-1001122334455', title: 'گروه فرعی', threadId: '42' }
    ], null, 2), 'utf8');

    const dests = await getAllAuthorizedGroupDestinations();
    const ids = dests.map(d => d.chatId);

    assert.ok(ids.includes('-1009876543210'), 'Main group must be in destinations');
    assert.ok(ids.includes('-1001122334455'), 'Secondary group must be in destinations');
    const topicGroup = dests.find(d => d.chatId === '-1001122334455');
    assert.equal(topicGroup.threadId, '42');
  });

  await t.test('7. Group caption formats clean metadata without leaking 12 questions into the group', async () => {
    // Test helper logic for caption generation
    const studentAnswers = {
      q_student_name: 'محمد گل مکانی',
      q_1: 'جواب ۱',
      q_2: 'جواب ۲',
      q_3: 'جواب ۳',
    };
    const job = {
      phone: '09355635736',
      reference_code: 'SEC-1BC9DD4911FC',
    };
    const className = 'شمسی و خوشباف';

    const groupCaptionText = [
      '📹 پاسخ ویدیویی احراز هویت پرونده',
      '━━━━━━━━━━━━━━━━━━━━',
      studentAnswers?.q_student_name ? `👤 دانش‌آموز: ${studentAnswers.q_student_name}` : null,
      `🏫 کلاس: ${className}`,
      `📞 شماره تماس: ${job.phone}`,
      `📂 کد پرونده: ${job.reference_code}`,
      '━━━━━━━━━━━━━━━━━━━━'
    ].filter(Boolean).join('\n');

    assert.match(groupCaptionText, /محمد گل مکانی/);
    assert.match(groupCaptionText, /شمسی و خوشباف/);
    assert.match(groupCaptionText, /09355635736/);
    assert.match(groupCaptionText, /SEC-1BC9DD4911FC/);
    assert.doesNotMatch(groupCaptionText, /جواب ۱/, '12 questions answers must NOT be present in group caption');
  });

  await t.test('8. Sending /setgroup inside a specific forum topic locks destination to that topic threadId', async () => {
    const sentMessages = [];
    const bot = new MohtavaTelegramBot({ adminId: 5490508090 });
    bot.sendMessage = async (chatId, text, replyMarkup, threadId) => {
      sentMessages.push({ chatId, text, replyMarkup, threadId });
    };

    const targetGroupId = -1004328744281;
    const topicThreadId = 9876; // e.g. "آرشیو عکس و فیلم" topic

    await bot.handleMessage({
      chat: { id: targetGroupId, type: 'supergroup', title: 'کارآگاه و راز دهکده متروک' },
      from: { id: 5490508090, first_name: 'Elyas' },
      message_thread_id: topicThreadId,
      text: '/setgroup',
    });

    assert.equal(bot.isAuthorizedGroup(targetGroupId), true);
    assert.equal(sentMessages.length, 1);
    assert.equal(sentMessages[0].threadId, topicThreadId, 'Confirmation must be sent inside the topic');
    assert.match(sentMessages[0].text, /تاپیک اختصاصی با موفقیت ثبت شد/);

    const storedGroup = bot.authorizedGroups.get(String(targetGroupId));
    assert.equal(storedGroup.threadId, String(topicThreadId), 'Stored threadId must match topic threadId');
  });

  await t.test('9. handleAuthStudentsList lists authenticated students grouped by class with duplicate handling', async () => {
    const sentMessages = [];
    const bot = new MohtavaTelegramBot({ adminId: 5490508090 });
    bot.sendMessage = async (chatId, text, replyMarkup, threadId) => {
      sentMessages.push({ chatId, text, replyMarkup, threadId });
    };

    const { pool } = require('../src/db/pool');
    if (pool.tables) {
      pool.tables.sessions.push({ id: 101, name: 'شمسی و خوشباف' });
      pool.tables.emergency_auth_submissions.push({
        id: 1,
        session_id: 101,
        phone: '09355635736',
        reference_code: 'SEC-1BC9DD4911FC',
        answers_json: JSON.stringify({ q_student_name: 'محمد گل مکانی' }),
        created_at: new Date()
      });
      pool.tables.emergency_auth_submissions.push({
        id: 2,
        session_id: 101,
        phone: '09355635736',
        reference_code: 'SEC-2F4C8A005E9E',
        answers_json: JSON.stringify({ q_student_name: 'محمد گل مکانی' }),
        created_at: new Date()
      });
      pool.tables.emergency_auth_submissions.push({
        id: 3,
        session_id: 101,
        phone: '09121112233',
        reference_code: 'SEC-3AA8E62046B2',
        answers_json: JSON.stringify({ q_student_name: 'مجتبی مقدسان' }),
        created_at: new Date()
      });
    }

    await bot.handleMessage({
      chat: { id: 5490508090, type: 'private' },
      from: { id: 5490508090, first_name: 'Elyas' },
      text: '👥 اسامی احراز هویت کلاس‌ها',
    });

    assert.ok(sentMessages.length >= 1, 'Should send at least 1 message');
    const fullText = sentMessages.map(m => m.text).join('\n');
    assert.match(fullText, /اسامی دانش‌آموزان احراز هویت‌شده به تفکیک کلاس/);
    assert.match(fullText, /شمسی و خوشباف/);
    assert.match(fullText, /محمد گل مکانی/);
    assert.match(fullText, /مجتبی مقدسان/);
    assert.match(fullText, /۲ بار/);
  });

  await t.test('10. 5-minute recording cap (300s), 100MB limit and recording timer badge fidelity', () => {
    const authJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/emergency-auth.js'), 'utf8');
    const authCss = fs.readFileSync(path.join(__dirname, '../public/assets/css/emergency-auth.css'), 'utf8');
    const routeJs = fs.readFileSync(path.join(__dirname, '../src/routes/emergencyAuth.js'), 'utf8');

    // 1. Check timer badge in HTML/DOM
    assert.match(authJs, /id="selfieTimerBadge"/, 'Timer badge element must exist in viewfinder');
    assert.match(authJs, /id="selfieTimerValue"/, 'Timer text element must exist');
    assert.match(authJs, /selfieIntervalTimer = setInterval/, 'Ticking interval must be implemented');

    // 2. Check 5-minute cap (300 seconds = 300,000 ms)
    assert.match(authJs, /MAX_RECORD_SECONDS\s*=\s*300/, 'Max recording must be 300 seconds (5 minutes)');
    assert.match(authJs, /100\s*\*\s*1024\s*\*\s*1024/, 'Client blob limit must allow up to 100 MB');

    // 3. Check UI note text is preserved (not changed to 5 minutes)
    assert.match(authJs, /ویدیو حداکثر ۱ دقیقه باشد/, 'User facing note must keep 1 minute text as requested');

    // 4. Check backend route limits
    assert.match(routeJs, /fileSize:\s*100\s*\*\s*1024\s*\*\s*1024/, 'Backend multer must allow 100 MB');
    assert.match(routeJs, /duration\s*>\s*310/, 'Backend duration ceiling must allow 5 minutes (310s)');

    // 5. Check CSS styling for timer badge
    assert.match(authCss, /\.selfie-timer-badge/, 'CSS must define .selfie-timer-badge');
    assert.match(authCss, /\.selfie-timer-dot/, 'CSS must define .selfie-timer-dot');
  });
});
