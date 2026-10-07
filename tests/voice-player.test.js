const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Telegram voice message player and compact card verification', async (t) => {
  const voiceJsPath = path.join(__dirname, '../public/assets/js/voice-recorder.js');
  const voiceJsContent = fs.readFileSync(voiceJsPath, 'utf8');

  const voiceCssPath = path.join(__dirname, '../public/assets/css/voice-player.css');
  const voiceCssContent = fs.readFileSync(voiceCssPath, 'utf8');

  const adminHtmlPath = path.join(__dirname, '../public/admin/chat.html');
  const adminHtmlContent = fs.readFileSync(adminHtmlPath, 'utf8');

  const adminJsPath = path.join(__dirname, '../public/assets/js/admin-chat.js');
  const adminJsContent = fs.readFileSync(adminJsPath, 'utf8');

  await t.test('voice-recorder.js defines formatAudioTime, initTelegramVoiceAudio, and createTelegramVoiceMarkup', () => {
    assert.ok(voiceJsContent.includes('window.formatAudioTime'), 'formatAudioTime should be defined on window');
    assert.ok(voiceJsContent.includes('window.initTelegramVoiceAudio'), 'initTelegramVoiceAudio should be defined on window');
    assert.ok(voiceJsContent.includes('window.createTelegramVoiceMarkup'), 'createTelegramVoiceMarkup should be defined on window');

    // Ensure redundant "پیام صوتی" label was removed from markup
    assert.ok(!voiceJsContent.includes('<span class="tg-voice-tag">پیام صوتی</span>'), 'Redundant voice tag should not exist in markup');
  });

  await t.test('createTelegramVoiceMarkup produces valid HTML string and formatAudioTime formats accurately', () => {
    // Create a mock sandbox to test formatAudioTime
    const sandbox = { window: {}, document: { dir: 'rtl' } };
    const fn = new Function('window', 'document', 'setTimeout', `${voiceJsContent}; return { formatAudioTime: window.formatAudioTime, createTelegramVoiceMarkup: window.createTelegramVoiceMarkup };`);
    const { formatAudioTime, createTelegramVoiceMarkup } = fn(sandbox.window, sandbox.document, () => {});

    assert.equal(formatAudioTime(0), '۰۰:۰۰');
    assert.equal(formatAudioTime(15), '۰۰:۱۵');
    assert.equal(formatAudioTime(75), '۰۱:۱۵');
    assert.equal(formatAudioTime(NaN), '۰۰:۰۰');

    const sampleMsg = {
      id: 42,
      file_url: '/media/voice.webm',
      created_at: '2026-10-06T12:00:00.000Z'
    };
    const markup = createTelegramVoiceMarkup(sampleMsg, '۱۲:۰۰');
    assert.ok(markup.includes('id="voice-player-42"'), 'Markup must have element id');
    assert.ok(markup.includes('tg-voice-bubble'), 'Markup must have tg-voice-bubble class');
    assert.ok(markup.includes('tg-voice-play-btn'), 'Markup must have play button');
    assert.ok(markup.includes('tg-voice-waves'), 'Markup must have waveform waves');
    assert.ok(markup.includes('tg-voice-stamp'), 'Markup must have timestamp');
    assert.ok(!markup.includes('\n'), 'Markup must not contain newlines that trigger pre-wrap blank lines');
  });

  await t.test('voice-player.css defines compact dimensions and removes redundant whitespace', () => {
    assert.ok(voiceCssContent.includes('.message-bubble.has-voice-message'), 'CSS must define has-voice-message');
    assert.ok(voiceCssContent.includes('width: 30px'), 'Play button must be compact (30px)');
    assert.ok(voiceCssContent.includes('height: 14px'), 'Waveform must be compact (14px)');
    assert.ok(voiceCssContent.includes('max-width: 240px'), 'Max width must be compact (~240px)');
  });

  await t.test('admin/chat.html links voice-player.css and voice-recorder.js', () => {
    assert.ok(adminHtmlContent.includes('voice-player.css'), 'admin/chat.html must include voice-player.css');
    assert.ok(adminHtmlContent.includes('voice-recorder.js'), 'admin/chat.html must include voice-recorder.js');
  });

  await t.test('admin-chat.js uses createTelegramVoiceMarkup and adds has-voice-message class', () => {
    assert.ok(adminJsContent.includes("div.classList.add('has-voice-message')"), 'admin-chat.js must add has-voice-message class');
    assert.ok(adminJsContent.includes('window.createTelegramVoiceMarkup'), 'admin-chat.js must use createTelegramVoiceMarkup');
    assert.ok(!adminJsContent.includes('class="admin-compact-audio"'), 'admin-chat.js should no longer use clunky admin-compact-audio');
  });
});
