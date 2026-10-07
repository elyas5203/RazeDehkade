const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
  const base = 'http://127.0.0.1:3000';
  const samples = [
    ['ui-smoke-evidence-a.png', 'bonsai.png', 'نقشه ریشه‌های کنار آسیاب'],
    ['ui-smoke-evidence-b.png', 'sansevieria.png', 'نشانه گیاهی ورودی شمالی'],
    ['ui-smoke-evidence-c.png', 'box.png', 'بسته پیدا شده در انبار'],
  ];
  samples.forEach(([target, source]) => fs.copyFileSync(path.resolve('public/golha/assets/images', source), path.resolve('public/media-library/images', target)));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fa-IR' });
  const errors = [];
  const login = await (await context.request.post(`${base}/api/auth/admin/login`, { data: { username: 'admin', password: 'admin123' } })).json();
  const token = login.data.token;
  const created = await (await context.request.post(`${base}/api/sessions`, { headers: { Authorization: `Bearer ${token}` }, data: { name: 'گروه آزمایشی راز دهکده' } })).json();
  const session = created.data;
  const admin = await context.newPage();
  await admin.addInitScript(([adminToken, adminUser]) => { localStorage.setItem('adminToken', adminToken); localStorage.setItem('adminUser', JSON.stringify(adminUser)); }, [token, login.data.admin]);
  admin.on('pageerror', error => errors.push(`admin: ${error.message}`));
  await admin.goto(`${base}/admin/chat.html`, { waitUntil: 'networkidle' });
  await admin.locator('#active-session-title').waitFor();
  await admin.screenshot({ path: path.resolve('artifacts/admin-media-library.png'), fullPage: true });

  const joined = await (await context.request.post(`${base}/api/auth/user/join`, { data: { code: session.chat_code } })).json();
  const storage = [joined.data.token, joined.data.session];
  const seedUser = ([userToken, userSession]) => { sessionStorage.setItem('userToken', userToken); sessionStorage.setItem('userSession', JSON.stringify(userSession)); };
  const user = await context.newPage();
  await user.addInitScript(seedUser, storage);
  user.on('pageerror', error => errors.push(`user: ${error.message}`));
  await user.goto(`${base}/chat.html`, { waitUntil: 'networkidle' });
  await user.locator('#evidence-grid').waitFor();
  for (const [target, , title] of samples) {
    const sent = await context.request.post(`${base}/api/media-library/send`, { headers: { Authorization: `Bearer ${token}` }, data: { sessionId: session.id, name: `images/${target}`, title } });
    if (!sent.ok()) errors.push(`media send returned ${sent.status()}`);
  }
  await user.locator('.evidence-card').nth(2).waitFor();
  await user.screenshot({ path: path.resolve('artifacts/terminal-evidence-board.png'), fullPage: true });
  await user.locator('.evidence-card').first().click();
  await user.locator('#evidence-dialog[open]').waitFor();
  await user.screenshot({ path: path.resolve('artifacts/terminal-evidence-detail.png'), fullPage: true });
  await user.locator('.dialog-close').click();

  const archive = await context.newPage();
  await archive.addInitScript(seedUser, storage);
  archive.on('pageerror', error => errors.push(`archive: ${error.message}`));
  await archive.goto(`${base}/archive.html`, { waitUntil: 'networkidle' });
  await archive.locator('.case-folder').first().waitFor();
  await archive.screenshot({ path: path.resolve('artifacts/archive-dossiers.png'), fullPage: true });

  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.addInitScript(seedUser, storage);
  await mobile.goto(`${base}/chat.html`, { waitUntil: 'networkidle' });
  await mobile.screenshot({ path: path.resolve('artifacts/terminal-mobile-new.png'), fullPage: true });
  if (!(await admin.locator('#media-library-title').isVisible())) errors.push('media library is not visible');
  if (!(await user.locator('#evidence-title').isVisible())) errors.push('evidence board is not visible');
  if (await archive.locator('.case-folder').count() !== 3) errors.push('archive does not show three dossiers');
  await browser.close();
  samples.forEach(([target]) => fs.rmSync(path.resolve('public/media-library/images', target), { force: true }));
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('UI smoke passed; screenshots saved in artifacts/.');
})().catch(error => { console.error(error); process.exitCode = 1; });
