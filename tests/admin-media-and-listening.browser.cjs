const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const publicRoot = path.resolve(__dirname, '../public');
let uploadRequests = 0;
let librarySends = 0;
const socketStub = `window.__adminEmits=[];window.__nextAdminAck=null;window.io=()=>{const handlers={};const socket={connected:true,io:{on(){}},on(name,fn){handlers[name]=fn},emit(name,data,cb){window.__adminEmits.push({name,data});if(cb)cb({success:true})},timeout(){return {emit(name,data,cb){window.__adminEmits.push({name,data});const ack=window.__nextAdminAck;window.__nextAdminAck=null;cb(null,ack||{success:true})}}}};setTimeout(()=>handlers.connect?.(),0);return socket}`;
const sessions = [{ id: 1, name: 'کلاس یک', code: '111', unread_count: 0 }, { id: 2, name: 'کلاس دو', code: '222', unread_count: 0 }];
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const json = value => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); };
  if (url.pathname === '/socket.io/socket.io.js') { res.setHeader('Content-Type', 'application/javascript'); return res.end(socketStub); }
  if (url.pathname === '/api/sessions') return json({ success: true, data: sessions });
  if (/^\/api\/sessions\/\d+\/messages$/.test(url.pathname)) return json({ success: true, data: [] });
  if (url.pathname === '/api/weekly-content') return json({ success: true, data: [] });
  if (url.pathname === '/api/media-library') return json({ success: true, data: [] });
  if (url.pathname === '/api/media-library/send') { librarySends++; return json({ success: true, data: null }); }
  if (url.pathname === '/api/upload/chunk') {
    uploadRequests++;
    return json({ success: true, completed: true, data: { fileUrl: '/uploads/test.png', fileName: 'test.png', messageType: 'image' } });
  }
  const filePath = path.resolve(publicRoot, '.' + url.pathname);
  if (!filePath.startsWith(publicRoot + path.sep) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) { res.statusCode = 404; return res.end(); }
  const ext = path.extname(filePath);
  res.setHeader('Content-Type', ext === '.html' ? 'text/html; charset=utf-8' : ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : 'application/octet-stream');
  fs.createReadStream(filePath).pipe(res);
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
    page.setDefaultTimeout(6000);
    page.on('pageerror', error => console.error('PAGE ERROR', error.message));
    await page.addInitScript(() => localStorage.setItem('adminToken', 'local-test-token'));
    await page.goto(`http://127.0.0.1:${server.address().port}/admin/chat.html?session=1`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => typeof sessionsMap !== 'undefined' && sessionsMap[1]);

    await page.locator('#admin-msg-input').fill('پیام گروه');
    await page.evaluate(() => { window.__nextAdminAck = { success: false, message: 'خطای آزمایشی' }; });
    await page.locator('#admin-send-btn').click();
    assert.equal(await page.locator('#admin-msg-input').inputValue(), 'پیام گروه', 'failed message stays in composer');
    assert.match(await page.locator('#admin-send-feedback').textContent(), /خطای آزمایشی/);
    await page.locator('#admin-send-btn').click();
    assert.equal(await page.locator('#admin-msg-input').inputValue(), '', 'confirmed message clears composer');
    await page.evaluate(() => { window.__adminEmits = []; });

    const media = { id: 99, content_type: 'video', title: 'فیلم آزمایشی', file_url: '/assets/test.mp4', file_name: 'test.mp4' };
    await page.evaluate(item => insertStepToComposer(item), media);
    await page.locator('#admin-media-confirm-dialog[open]').waitFor();
    assert.equal(await page.locator('#admin-media-confirm-session').textContent(), 'کلاس یک');
    if (process.env.ADMIN_MEDIA_SCREENSHOT) await page.screenshot({ path: process.env.ADMIN_MEDIA_SCREENSHOT });
    assert.equal(await page.evaluate(() => __adminEmits.filter(e => e.name === 'send_message').length), 0);
    await page.locator('#admin-media-confirm-cancel').click();
    assert.equal(await page.evaluate(() => __adminEmits.filter(e => e.name === 'send_message').length), 0);

    await page.evaluate(item => insertStepToComposer(item), media);
    await page.locator('#admin-media-confirm-send').click();
    await page.waitForFunction(() => __adminEmits.some(e => e.name === 'send_message'));
    assert.equal(await page.evaluate(() => isStepSentInSession(1, 99)), true);

    await page.locator('#admin-file-input').setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: Buffer.from('image test') });
    await page.locator('#admin-media-confirm-dialog[open]').waitFor();
    assert.equal(uploadRequests, 0, 'selection alone does not upload');
    await page.locator('#admin-media-confirm-cancel').click();
    assert.equal(uploadRequests, 0, 'cancel does not upload');

    await page.locator('.photo-btn').click();
    assert.equal(await page.locator('#admin-file-input').getAttribute('accept'), 'image/*', 'photo button opens image picker');

    await page.locator('#admin-file-input').setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: Buffer.from('image test') });
    await page.locator('#admin-media-confirm-send').click();
    await page.waitForFunction(() => __adminEmits.filter(e => e.name === 'send_message').length === 2);
    assert.equal(uploadRequests, 1, 'approved file uploads once');

    await page.evaluate(() => { void sendQuickMedia({ name: 'ready.mp3', title: 'صدای آماده', type: 'audio' }); });
    await page.locator('#admin-media-confirm-dialog[open]').waitFor();
    assert.equal(librarySends, 0);
    await page.locator('#admin-media-confirm-send').click();
    await page.waitForTimeout(100);
    assert.equal(librarySends, 1, 'approved library media sends once');

    await page.evaluate(item => insertStepToComposer(item), media);
    await page.locator('#admin-media-confirm-dialog[open]').waitFor();
    await page.evaluate(() => switchSession(2));
    await page.locator('#admin-media-confirm-send').click();
    assert.equal(await page.evaluate(() => __adminEmits.filter(e => e.name === 'send_message').length), 2, 'changing class before confirmation prevents send');
    await page.evaluate(() => switchSession(1));

    await page.evaluate(() => startAdminAudioListening());
    await page.locator('#tab-btn-media').click();
    assert.equal(await page.evaluate(() => isAudioListening), true, 'switching to prepared messages keeps listening');
    await page.evaluate(() => switchSession(1));
    assert.equal(await page.evaluate(() => isAudioListening), true, 'reselecting same class keeps listening');
    await page.evaluate(() => switchSession(2));
    assert.equal(await page.evaluate(() => isAudioListening), false, 'different class stops listening');
    assert.equal(await page.evaluate(() => __adminEmits.filter(e => e.name === 'stop_audio_stream').length), 1);

    console.log('Mobile media confirmation and listening behavior passed.');
  } finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
})().catch(err => { console.error(err); server.close(); process.exitCode = 1; });
