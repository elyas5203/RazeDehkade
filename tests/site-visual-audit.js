const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const base = 'http://127.0.0.1:3000';
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const seed = await browser.newContext();
  const login = await (await seed.request.post(`${base}/api/auth/admin/login`, { data: { username: 'admin', password: 'admin123' } })).json();
  const token = login.data.token;
  const created = await (await seed.request.post(`${base}/api/sessions`, { headers: { Authorization: `Bearer ${token}` }, data: { name: 'ممیزی تمام صفحات' } })).json();
  const joined = await (await seed.request.post(`${base}/api/auth/user/join`, { data: { code: created.data.chat_code } })).json();
  await seed.close();
  const routes = ['/golha/', '/golha/checkout.html', '/golha/order-status.html', '/enter-code.html', '/archive.html', '/chat.html', '/admin/login.html', '/admin/dashboard.html', '/admin/chat.html'];
  const sizes = [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }];
  const results = [];
  fs.mkdirSync(path.resolve('artifacts/site-audit'), { recursive: true });
  for (const size of sizes) {
    for (const route of routes) {
      const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, locale: 'fa-IR', permissions: [] });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('response', response => { if (response.status() === 404) errors.push(`404 ${response.url()}`); });
      await page.addInitScript(([adminToken, adminUser, userToken, userSession]) => {
        localStorage.setItem('adminToken', adminToken); localStorage.setItem('adminUser', JSON.stringify(adminUser));
        localStorage.setItem('golha_last_order', JSON.stringify({ orderId: userSession.id, customerName: 'گروه ممیزی', startedAt: Date.now() }));
        sessionStorage.setItem('userToken', userToken); sessionStorage.setItem('userSession', JSON.stringify(userSession));
      }, [token, login.data.admin, joined.data.token, joined.data.session]);
      await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
      const audit = await page.evaluate(() => {
        const root = document.documentElement;
        const missingAlt = [...document.querySelectorAll('img')].filter(img => !img.hasAttribute('alt')).length;
        const unlabeled = [...document.querySelectorAll('input,textarea,select')].filter(el => {
          if (el.type === 'hidden' || el.hidden) return false;
          return !(el.labels?.length || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'));
        }).length;
        const tinyElements = [...document.querySelectorAll('button,a[href],[role="button"]')].filter(el => {
          const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.width < 24 || r.height < 24);
        });
        return { horizontalOverflow: root.scrollWidth > root.clientWidth + 2, missingAlt, unlabeled, tinyTargets: tinyElements.length, tinyDetails: tinyElements.map(el => `${el.tagName}:${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}`), title: document.title, url: location.pathname };
      });
      const file = `${size.name}-${route.replace(/^\//, '').replace(/[\/.]+/g, '-') || 'index'}.png`;
      await page.screenshot({ path: path.resolve('artifacts/site-audit', file), fullPage: true });
      results.push({ size: size.name, route, ...audit, errors });
      await context.close();
    }
  }
  await browser.close();
  fs.writeFileSync(path.resolve('artifacts/site-audit/report.json'), JSON.stringify(results, null, 2));
  const failures = results.filter(item => item.horizontalOverflow || item.errors.length);
  console.log(JSON.stringify({ pages: results.length, failures, warnings: results.filter(item => item.missingAlt || item.unlabeled || item.tinyTargets) }, null, 2));
  if (failures.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
