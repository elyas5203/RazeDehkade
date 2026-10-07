const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const BASE = 'http://127.0.0.1:3000';
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const mediaPath = path.resolve('public/media-library/images/two-session-test.png');
  fs.copyFileSync(path.resolve('public/golha/assets/images/sansevieria.png'), mediaPath);
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const control = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fa-IR' });
  const login = await (await control.request.post(`${BASE}/api/auth/admin/login`, { data: { username: 'admin', password: 'admin123' } })).json();
  const adminToken = login.data.token;
  const create = async name => (await (await control.request.post(`${BASE}/api/sessions`, { headers: { Authorization: `Bearer ${adminToken}` }, data: { name } })).json()).data;
  const sessionA = await create('جلسه الف — شروع زودتر');
  const sessionB = await create('جلسه ب — ورود با تأخیر');
  const join = async session => (await (await control.request.post(`${BASE}/api/auth/user/join`, { data: { code: session.chat_code } })).json()).data;
  const [joinedA, joinedB] = await Promise.all([join(sessionA), join(sessionB)]);
  const errors = [];
  const watch = (page, label) => page.on('pageerror', error => errors.push(`${label}: ${error.message}`));
  const seedAdmin = ([token, user]) => { localStorage.setItem('adminToken', token); localStorage.setItem('adminUser', JSON.stringify(user)); };
  const seedUser = ([token, session]) => { sessionStorage.setItem('userToken', token); sessionStorage.setItem('userSession', JSON.stringify(session)); };

  const admin = await control.newPage(); watch(admin, 'admin');
  await admin.addInitScript(seedAdmin, [adminToken, login.data.admin]);
  await admin.goto(`${BASE}/admin/chat.html`, { waitUntil: 'networkidle' });

  const contextA = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'fa-IR', permissions: [] });
  const userA = await contextA.newPage(); watch(userA, 'userA');
  await userA.addInitScript(seedUser, [joinedA.token, joinedA.session]);
  await userA.goto(`${BASE}/chat.html`, { waitUntil: 'networkidle' });
  await admin.locator('.session-card', { hasText: sessionA.name }).click();
  await admin.locator('#admin-msg-input').fill('A-شروع عملیات؛ فقط جلسه الف');
  await admin.getByRole('button', { name: 'ارسال پیام' }).click();
  await userA.getByText('A-شروع عملیات؛ فقط جلسه الف').waitFor();

  // جلسه الف عمداً یک دقیقه جلوتر از جلسه ب کار می‌کند.
  await sleep(20000);
  await userA.locator('#msg-input').fill('A-گزارش بیست ثانیه: ورودی آسیاب بررسی شد');
  await userA.getByRole('button', { name: 'ارسال', exact: true }).click();
  await sleep(20000);
  await control.request.post(`${BASE}/api/media-library/send`, { headers: { Authorization: `Bearer ${adminToken}` }, data: { sessionId: sessionA.id, name: 'images/two-session-test.png', title: 'A-نشانه گیاهی جلسه الف' } });
  await userA.locator('.evidence-card').waitFor();
  await sleep(20000);

  const contextB = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'fa-IR', permissions: [] });
  const userB = await contextB.newPage(); watch(userB, 'userB');
  await userB.addInitScript(seedUser, [joinedB.token, joinedB.session]);
  await userB.goto(`${BASE}/chat.html`, { waitUntil: 'networkidle' });
  await admin.locator('.session-card', { hasText: sessionB.name }).click();
  await admin.locator('#admin-msg-input').fill('B-شروع مستقل؛ فقط جلسه ب');
  await admin.getByRole('button', { name: 'ارسال پیام' }).click();
  await userB.getByText('B-شروع مستقل؛ فقط جلسه ب').waitFor();
  if (await userA.getByText('B-شروع مستقل؛ فقط جلسه ب').count()) errors.push('پیام جلسه ب به جلسه الف نشت کرد');
  if (await userB.getByText('A-شروع عملیات؛ فقط جلسه الف').count()) errors.push('تاریخچه جلسه الف به جلسه ب نشت کرد');
  if (await userB.locator('.evidence-card').count()) errors.push('مدیای جلسه الف روی برد جلسه ب دیده شد');

  await userA.reload({ waitUntil: 'networkidle' });
  await userA.getByText('A-شروع عملیات؛ فقط جلسه الف').waitFor();
  await userA.locator('.evidence-card').waitFor();
  if (await userA.locator('.evidence-card').count() !== 1) errors.push('مدیا پس از refresh درست بازیابی نشد');
  await contextA.setOffline(true);
  await sleep(1500);
  await contextA.setOffline(false);
  await userA.getByText('متصل', { exact: true }).waitFor({ timeout: 15000 });

  await userB.locator('#msg-input').fill('B-گزارش کاربر دوم');
  await userB.getByRole('button', { name: 'ارسال', exact: true }).click();
  await admin.getByText('B-گزارش کاربر دوم').waitFor();
  await admin.locator('.session-card', { hasText: sessionA.name }).click();
  await admin.getByText('A-گزارش بیست ثانیه: ورودی آسیاب بررسی شد').waitFor();

  await admin.getByRole('button', { name: 'اجرای سکانس مزداک' }).click();
  await admin.getByRole('button', { name: 'اجرای سکانس', exact: true }).click();
  await userA.locator('.breach-scene').waitFor();
  await sleep(1200);
  if (await userB.locator('.breach-scene').count()) errors.push('سکانس هک جلسه الف به جلسه ب نشت کرد');
  await userA.locator('.breach-skip').click();

  await Promise.all([
    admin.screenshot({ path: path.resolve('artifacts/multi-admin-final.png'), fullPage: true }),
    userA.screenshot({ path: path.resolve('artifacts/multi-user-a-final.png'), fullPage: true }),
    userB.screenshot({ path: path.resolve('artifacts/multi-user-b-final.png'), fullPage: true }),
  ]);
  await browser.close();
  fs.rmSync(mediaPath, { force: true });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(JSON.stringify({ success: true, delaySeconds: 60, sessionA: sessionA.id, sessionB: sessionB.id, isolation: 'passed' }));
})().catch(error => { console.error(error); process.exitCode = 1; });
