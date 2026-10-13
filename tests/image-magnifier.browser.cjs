// Run against the local fixture: node artifacts/visual-preview.cjs, then node tests/image-magnifier.browser.cjs.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, locale: 'fa-IR' });
    await page.goto('http://127.0.0.1:3011/chat.html', { waitUntil: 'networkidle' });
    await page.locator('.evidence-card').first().click();
    await page.locator('#evidence-dialog[open] #zoomTargetImage').waitFor();
    const image = page.locator('#zoomTargetImage');
    await image.evaluate(img => img.decode());
    const box = await image.boundingBox();
    assert(box && box.width > 0 && box.height > 0, 'opened image is visible');
    const lens = page.locator('#zoomViewport .image-magnifier-lens');
    assert.equal(await lens.isVisible(), false, 'lens starts hidden');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    assert.equal(await lens.isVisible(), true, 'hover displays lens');
    if (process.env.MAGNIFIER_SCREENSHOTS) await page.screenshot({ path: process.env.MAGNIFIER_SCREENSHOTS + '/magnifier-evidence.png' });
    const before = await page.locator('#zoomLevelBadge').textContent();
    await page.mouse.wheel(0, -120);
    const after = await page.locator('#zoomLevelBadge').textContent();
    assert.notEqual(after, before, 'wheel changes local lens zoom');
    assert.equal(await image.evaluate(img => getComputedStyle(img).transform), 'none', 'source image stays fixed');
    await page.mouse.move(0, 0);
    assert.equal(await lens.isVisible(), false, 'lens hides outside image');
    await page.locator('#zoomViewport').focus();
    assert.equal(await lens.isVisible(), true, 'keyboard focus reveals lens');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('+');
    assert.equal(await lens.isVisible(), true, 'keyboard movement keeps lens available');
    await page.keyboard.press('Escape');
    assert.equal(await lens.isVisible(), false, 'Escape dismisses lens');
    assert.equal(await page.locator('#evidence-dialog').evaluate(dialog => dialog.open), true, 'Escape dismisses the lens before the dialog');
    await page.evaluate(() => { if (document.getElementById('evidence-dialog').open) closeEvidence(); });

    await page.evaluate(() => {
      sessionAssistantsList = [{ student_name: 'نمونه', file_url: '/assets/scene/suspect.jpg' }];
      document.getElementById('assistants-photo-dialog').showModal();
      openAssistantLightbox(0);
    });
    const portrait = page.locator('#assistants-lb-img');
    await portrait.evaluate(img => img.decode());
    const portraitBox = await portrait.boundingBox();
    const portraitLens = page.locator('#assistants-lb-portrait-box .image-magnifier-lens');
    await page.mouse.move(portraitBox.x + portraitBox.width / 2, portraitBox.y + portraitBox.height / 2);
    assert.equal(await portraitLens.isVisible(), true, 'assistant lightbox also shows the lens');
    if (process.env.MAGNIFIER_SCREENSHOTS) await page.screenshot({ path: process.env.MAGNIFIER_SCREENSHOTS + '/magnifier-assistant.png' });
    const portraitBefore = await page.locator('#assistantsLensLevel').textContent();
    await page.mouse.wheel(0, -120);
    assert.notEqual(await page.locator('#assistantsLensLevel').textContent(), portraitBefore, 'assistant lens zoom changes');
    assert.equal(await portrait.evaluate(img => getComputedStyle(img).transform), 'none', 'assistant portrait stays fixed');
    await page.evaluate(() => closeAssistantLightbox());
    assert.equal(await portraitLens.isVisible(), false, 'closing assistant image hides its lens');
    console.log('Image magnifier browser check passed.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
