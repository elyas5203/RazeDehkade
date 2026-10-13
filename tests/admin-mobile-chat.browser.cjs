const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    await page.addInitScript(() => localStorage.setItem('adminToken', 'local-preview'));
    await page.route('**/assets/js/admin-chat.js*', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
    await page.goto('http://127.0.0.1:3011/admin/chat.html', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.body.classList.add('mobile-tab-chat'));
    const field = page.locator('#admin-msg-input');
    const send = page.locator('.admin-composer .primary');
    const fieldBox = await field.boundingBox();
    const sendBox = await send.boundingBox();
    assert(fieldBox && fieldBox.width >= 360 && fieldBox.height >= 54, `usable message field: ${JSON.stringify(fieldBox)}`);
    assert(sendBox && sendBox.width >= 360 && sendBox.y + sendBox.height <= 852, `visible send button: ${JSON.stringify(sendBox)}`);
    assert(fieldBox.y + fieldBox.height <= sendBox.y, 'message field has its own row');
    await field.fill('پیام آزمایشی');
    assert.equal(await field.inputValue(), 'پیام آزمایشی');
    if (process.env.ADMIN_MOBILE_SCREENSHOT) await page.screenshot({ path: process.env.ADMIN_MOBILE_SCREENSHOT });
    console.log('Admin mobile composer visible at 393 × 852.');
  } finally { await browser.close(); }
})().catch(err => { console.error(err); process.exitCode = 1; });
