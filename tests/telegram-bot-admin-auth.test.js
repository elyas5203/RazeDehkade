'use strict';
process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  MohtavaTelegramBot,
  normalizeAdminPasscode,
  isMatchingAdminPasscode,
} = require('../MohtavaTelBot/bot');
const { ADMIN_SECRET_KEY, AUTHORIZED_ADMIN_ID } = require('../MohtavaTelBot/config');
const { query } = require('../src/db/pool');
const { getAllAuthorizedAdminChatIds } = require('../src/services/emergencyVideoQueue');

test('MASTER-ADMIN-AUTH: MohtavaTelBot Universal Admin Authorization via admin_110_59', async t => {
  await t.test('1. normalizeAdminPasscode converts Persian and Arabic digits to English and trims', () => {
    assert.equal(normalizeAdminPasscode('admin_110_59'), 'admin_110_59');
    assert.equal(normalizeAdminPasscode('  Admin_۱۱۰_۵۹  '), 'admin_110_59');
    assert.equal(normalizeAdminPasscode('ADMIN_١١٠_٥٩'), 'admin_110_59');
    assert.equal(normalizeAdminPasscode('/START admin_۱۱۰_۵۹'), '/start admin_110_59');
  });

  await t.test('2. isMatchingAdminPasscode matches standalone passcode and /start commands', () => {
    assert.equal(isMatchingAdminPasscode('admin_110_59'), true);
    assert.equal(isMatchingAdminPasscode('  Admin_110_59  '), true);
    assert.equal(isMatchingAdminPasscode('admin_۱۱۰_۵۹'), true);
    assert.equal(isMatchingAdminPasscode('/start admin_110_59'), true);
    assert.equal(isMatchingAdminPasscode('/start admin_۱۱۰_۵۹'), true);
    assert.equal(isMatchingAdminPasscode('/admin admin_110_59'), true);
    assert.equal(isMatchingAdminPasscode('wrong_passcode'), false);
    assert.equal(isMatchingAdminPasscode('hello world'), false);
    assert.equal(isMatchingAdminPasscode(''), false);
  });

  await t.test('3. Default admin (5490508090) is authorized out of the box', () => {
    const bot = new MohtavaTelegramBot({ adminId: 5490508090 });
    assert.equal(bot.isAuthorizedAdmin(5490508090), true);
    assert.equal(bot.isAuthorizedAdmin(99999999), false);
  });

  await t.test('4. Unauthorized user is rejected when sending random messages', async () => {
    const bot = new MohtavaTelegramBot({ adminId: 5490508090 });
    const sentMessages = [];
    bot.sendMessage = async (chatId, text, replyMarkup) => {
      sentMessages.push({ chatId, text, replyMarkup });
      return { message_id: 101 };
    };

    const unauthorizedMsg = {
      chat: { id: 777123 },
      from: { id: 777123, first_name: 'غریبه' },
      text: 'سلام چطوری',
    };

    await bot.handleMessage(unauthorizedMsg);
    assert.equal(sentMessages.length, 1);
    assert.match(sentMessages[0].text, /⛔️ دسترسی غیرمجاز/);
    assert.equal(bot.isAuthorizedAdmin(777123), false);
  });

  await t.test('5. Unauthorized user sending admin_110_59 is immediately promoted to admin', async () => {
    const testAdminId = 888456;
    const bot = new MohtavaTelegramBot({ adminId: 5490508090 });
    const sentMessages = [];
    bot.sendMessage = async (chatId, text, replyMarkup) => {
      sentMessages.push({ chatId, text, replyMarkup });
      return { message_id: 201 };
    };

    const authMsg = {
      chat: { id: testAdminId },
      from: { id: testAdminId, first_name: 'ادمین جدید', username: 'new_admin' },
      text: 'admin_110_59',
    };

    await bot.handleMessage(authMsg);

    // بررسی ثبت و تایید
    assert.equal(bot.isAuthorizedAdmin(testAdminId), true);
    assert.equal(sentMessages.length, 1);
    assert.match(sentMessages[0].text, /✅ هویت شما به عنوان ادمین با موفقیت تایید شد/);
    assert.ok(sentMessages[0].replyMarkup, 'منوی اصلی کیبورد باید ارسال شود');

    // ارسال پیام بعدی توسط همین کاربر به عنوان ادمین مجاز
    const startMsg = {
      chat: { id: testAdminId },
      from: { id: testAdminId },
      text: '/start',
    };
    await bot.handleMessage(startMsg);

    assert.equal(sentMessages.length, 2);
    assert.match(sentMessages[1].text, /👋 سلام ادمین عزیز/);
  });

  await t.test('6. Multi-admin isolation: distinct states per admin_id in bot_state', async () => {
    const admin1 = 5490508090;
    const admin2 = 666789;

    const bot = new MohtavaTelegramBot({ adminId: admin1 });
    await bot.authorizeAdmin(admin2, { firstName: 'Admin2' });

    // تنظیم وضعیت ادمین ۱ روی هفته دوم
    await bot.setState({ mode: 'WAIT_TITLE', week: 2, currentTitle: 'تست هفته ۲', titleCounter: 1 }, admin1);

    // تنظیم وضعیت ادمین ۲ روی عکس دستیاران
    await bot.setState({ mode: 'ASSISTANTS_MENU', week: null, currentTitle: '', titleCounter: 0 }, admin2);

    // بررسی عدم تداخل
    await bot.syncStateFromDb(admin1);
    assert.equal(bot.adminState.mode, 'WAIT_TITLE');
    assert.equal(bot.adminState.week, 2);

    await bot.syncStateFromDb(admin2);
    assert.equal(bot.adminState.mode, 'ASSISTANTS_MENU');
    assert.equal(bot.adminState.week, null);
  });

  await t.test('7. getAllAuthorizedAdminChatIds includes primary admin, storage file, and database admins', async () => {
    const ids = await getAllAuthorizedAdminChatIds('5490508090');
    assert.ok(Array.isArray(ids));
    assert.ok(ids.includes('5490508090'), 'Primary admin must be in the list');
    assert.ok(ids.includes('888456'), 'Promoted admin 888456 must be in the broadcast list');
  });
});
