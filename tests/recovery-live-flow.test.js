'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
process.env.NODE_ENV = 'test';
process.env.USE_IN_MEMORY_DB = 'true';
process.env.RECOVERY_LIVE_OFFLINE_GRACE_MS = '120';
const { app, server } = require('../server');
const { pool } = require('../src/db/pool');
const { generateToken } = require('../src/middleware/auth');
const { io: connectSocket } = require('socket.io-client');
const liveStore = require('../src/services/recoveryLiveStore');
const Message = require('../src/models/Message');

test('fifteen classes may activate concurrently without sharing a run or changing each other', async () => {
  const ids = Array.from({ length: 15 }, (_, index) => 8201 + index);
  pool.tables.sessions.push(...ids.map(id => ({ id, name: `کلاس ${id}`, is_hacked: 1, status: 'active' })));
  try {
    const runs = await Promise.all(ids.map(id => liveStore.activate(id, 1)));
    assert.equal(new Set(runs.map(run => Number(run.id))).size, ids.length);
    assert.deepEqual(runs.map(run => Number(run.session_id)), ids);
    const repeat = await Promise.all(ids.map(id => liveStore.activate(id, 2)));
    assert.deepEqual(repeat.map(run => Number(run.id)), runs.map(run => Number(run.id)));
    runs[0].phase = 'MATCHING';
    assert.ok(runs.slice(1).every(run => run.phase === 'WAITING_FOR_CLASS'));
  } finally {
    pool.tables.sessions = pool.tables.sessions.filter(row => !ids.includes(Number(row.id)));
    pool.tables.recovery_runs = pool.tables.recovery_runs.filter(row => !ids.includes(Number(row.session_id)));
  }
});

test('weekly recovery isolates classes, keeps one selected video per portrait and streams ranges', async () => {
  const mediaPath = path.resolve(__dirname, '..', 'storage', 'emergency-selfies', `recovery-live-test-${process.pid}.mp4`);
  fs.mkdirSync(path.dirname(mediaPath), { recursive: true });
  fs.copyFileSync(path.resolve(__dirname, '..', 'public', 'assets', 'recovery', 'part1.mp4'), mediaPath);
  const misnamedWebmPath = `${mediaPath}.misnamed.mp4`;
  execFileSync(require('ffmpeg-static'), ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=160x120:r=10',
    '-t', '1', '-c:v', 'libvpx', '-f', 'webm', '-y', misnamedWebmPath]);
  const seed = {
    sessions: [
      { id: 8101, name: 'آزمایش یک', code: '810101', chat_code: '810101', status: 'active', teacher_phone: '09120000001', is_hacked: 1 },
      { id: 8102, name: 'آزمایش دو', code: '810102', chat_code: '810102', status: 'active', teacher_phone: '09120000002', is_hacked: 1 }
    ],
    session_assistants: [
      { id: 8111, session_id: 8101, student_name: 'دانش‌آموز یک', file_url: '/one.png', display_order: 1 },
      { id: 8112, session_id: 8102, student_name: 'دانش‌آموز دو', file_url: '/two.png', display_order: 1 }
    ],
    emergency_auth_submissions: [
      { reference_code: 'SEC-8101', session_id: 8101, answers_json: { q_student_name: 'دانش‌آموز یک' } }
    ],
    emergency_auth_videos: [
      { id: 8121, reference_code: 'SEC-8101', session_id: 8101, phone: '09120000001', file_path: mediaPath, mime_type: 'video/mp4', created_at: new Date() },
      { id: 8123, reference_code: 'SEC-8101', session_id: 8101, phone: '09120000001', file_path: mediaPath + '.missing', mime_type: 'video/mp4', created_at: new Date() },
      { id: 8124, reference_code: 'SEC-8101', session_id: 8101, phone: '09120000001', file_path: misnamedWebmPath, mime_type: 'video/mp4', created_at: new Date() },
      { id: 8122, reference_code: 'SEC-8102', session_id: 8102, phone: '09120000002', file_path: mediaPath, mime_type: 'video/mp4', created_at: new Date() }
    ]
  };
  for (const [table, rows] of Object.entries(seed)) pool.tables[table].push(...rows);
  await new Promise(resolve => server.listen(0, resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const admin = generateToken({ role: 'admin', id: 1 });
  let a = generateToken({ role: 'user', sessionId: 8101 });
  const b = generateToken({ role: 'user', sessionId: 8102 });
  const call = async (id, suffix, token, method = 'GET', body, headers = {}) => {
    const response = await fetch(`${origin}/api/recovery-live/sessions/${id}${suffix}`, {
      method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined
    });
    const contentType = response.headers.get('content-type') || '';
    return { response, data: contentType.includes('application/json') ? await response.json() : null };
  };
  let studentSocket;
  try {
    assert.equal((await call(8101, '/activate', a, 'POST')).response.status, 403);
    const first = await call(8101, '/activate', admin, 'POST');
    assert.equal(first.response.status, 200);
    assert.equal(first.data.state.phase, 'WAITING_FOR_CLASS');
    assert.equal((await call(8101, '/activate', admin, 'POST')).data.state.id, first.data.state.id);
    const phoneCheck = await fetch(`${origin}/api/auth/teacher/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '09120000001' }) });
    const phoneData = await phoneCheck.json();
    assert.equal(phoneData.redirectUrl, '/chat.html');
    assert.ok(phoneData.data.token);
    assert.equal((await call(8101, '', a)).response.status, 200);
    a = phoneData.data.token;
    assert.equal((await call(8102, '', b)).data.state.phase, 'DORMANT');
    assert.equal((await call(8101, '', b)).response.status, 403);
    const candidates = (await call(8101, '/candidates', admin)).data.items;
    assert.equal(candidates.length, 3);
    assert.equal(candidates.find(x => x.id === 8121).name, 'دانش‌آموز یک');
    assert.equal(candidates.find(x => x.id === 8121).available, true);
    assert.equal(candidates.find(x => x.id === 8123).available, false);
    const webmMedia = await fetch(`${origin}${candidates.find(x => x.id === 8124).mediaUrl}`, { headers: { Range: 'bytes=0-3' } });
    assert.equal(webmMedia.status, 206);
    assert.match(webmMedia.headers.get('content-type'), /^video\/webm/);
    assert.equal((await webmMedia.arrayBuffer()).byteLength, 4);
    if (process.env.RECOVERY_BROWSER_MEDIA_CHECK === '1') {
      const { chromium } = require('playwright-core');
      const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
      try {
        const page = await browser.newPage();
        await page.goto(origin);
        await page.setContent('<video muted playsinline></video>');
        await page.locator('video').evaluate((video, url) => { video.src = url; video.play(); }, `${origin}${candidates.find(x => x.id === 8124).mediaUrl}`);
        await page.waitForFunction(() => document.querySelector('video')?.currentTime > 0.1, null, { timeout: 10000 });
        assert.equal(await page.locator('video').evaluate(video => video.error), null);
      } finally { await browser.close(); }
    }
    assert.equal((await call(8101, '/links/8111', admin, 'PUT', { videoId: 8123, expected_revision: 1 })).response.status, 409);
    assert.equal((await call(8101, '/links/8112', admin, 'PUT', { videoId: 8121, expected_revision: 1 })).response.status, 403);
    assert.equal((await call(8101, '/links/8111', admin, 'PUT', { videoId: 8122, expected_revision: 1 })).response.status, 403);
    const linked = await call(8101, '/links/8111', admin, 'PUT', { videoId: 8121, expected_revision: 1 });
    assert.equal(linked.response.status, 200);
    assert.equal(linked.data.state.phase, 'MATCHING');
    assert.equal((await call(8101, '/links/8111', admin, 'PUT', { videoId: 8121, expected_revision: 1 })).response.status, 409);
    assert.equal((await call(8101, '/links/8111', admin, 'DELETE', { expected_revision: 2 })).response.status, 200);
    assert.equal((await call(8101, '/roster', a)).data.items[0].videoId, null);
    assert.equal((await call(8101, '/links/8111', admin, 'PUT', { videoId: 8121, expected_revision: 3 })).response.status, 200);
    const roster = (await call(8101, '/roster', a)).data.items;
    assert.equal(roster[0].videoId, 8121);
    assert.ok(roster[0].mediaUrl);
    assert.equal((await call(8102, '/roster', b)).data.items[0].videoId, null);
    const media = await fetch(`${origin}${roster[0].mediaUrl}`, { headers: { Range: 'bytes=0-99' } });
    assert.equal(media.status, 206);
    assert.equal((await media.arrayBuffer()).byteLength, 100);
    assert.equal((await call(8101, '/start', admin, 'POST', { expected_revision: 4 })).response.status, 409);
    const location = await call(8101, '/location', admin, 'PUT', { latitude: 36.3, longitude: 59.5, expected_revision: 4 });
    assert.equal(location.response.status, 200);
    assert.equal((await call(8101, '/start', admin, 'POST', { expected_revision: 5 })).response.status, 409);
    studentSocket = connectSocket(origin, { auth: { token: a }, transports: ['websocket'], reconnection: false });
    await new Promise((resolve, reject) => { studentSocket.once('connect', resolve); studentSocket.once('connect_error', reject); });
    assert.equal((await call(8101, '/start', admin, 'POST', { expected_revision: 5 })).response.status, 200);
    assert.equal((await call(8101, '/pause', admin, 'POST', { expected_revision: 6 })).data.state.phase, 'PAUSED');
    assert.equal((await call(8101, '/resume', admin, 'POST', { expected_revision: 7 })).data.state.phase, 'RUNNING');
    studentSocket.disconnect();
    let offlineState;
    for (let attempt = 0; attempt < 50; attempt++) {
      offlineState = (await call(8101, '', admin)).data.state;
      if (offlineState.phase === 'PAUSED') break;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.equal(offlineState.phase, 'PAUSED');
    assert.equal(offlineState.previousPhase, 'RUNNING');
    assert.equal((await call(8101, '/resume', admin, 'POST', { expected_revision: offlineState.revision })).response.status, 409);
    studentSocket = connectSocket(origin, { auth: { token: a }, transports: ['websocket'], reconnection: false });
    await new Promise((resolve, reject) => { studentSocket.once('connect', resolve); studentSocket.once('connect_error', reject); });
    assert.equal((await call(8101, '/resume', admin, 'POST', { expected_revision: offlineState.revision })).data.state.phase, 'RUNNING');
    assert.equal((await call(8101, '/complete', a, 'POST')).response.status, 409);
    const run = pool.tables.recovery_runs.find(x => Number(x.session_id) === 8101);
    run.started_at = new Date(Date.now() - 11000);
    assert.equal((await call(8101, '/cues/mazdak1', a, 'POST')).response.status, 200);
    assert.equal((await call(8101, '/cues/mazdak1', a, 'POST')).data.repeated, true);
    assert.equal((await call(8101, '/cues/mazdak2', a, 'POST')).response.status, 409);
    run.started_at = new Date(Date.now() - 18000);
    assert.equal((await call(8101, '/cues/mazdak2', a, 'POST')).response.status, 200);
    for (const [key, second] of [['mazdak3', 26], ['mazdak4', 34], ['mazdak5', 42]]) {
      run.started_at = new Date(Date.now() - (second - 3) * 1000);
      assert.equal((await call(8101, `/cues/${key}`, a, 'POST')).response.status, 409);
      run.started_at = new Date(Date.now() - (second + 1) * 1000);
      assert.equal((await call(8101, `/cues/${key}`, a, 'POST')).response.status, 200);
    }
    assert.equal((await call(8101, '/complete', a, 'POST')).response.status, 409);
    run.started_at = new Date(Date.now() - 421000);
    assert.equal((await call(8101, '/cues/bot2', a, 'POST')).response.status, 200);
    assert.equal((await call(8101, '/complete', a, 'POST')).response.status, 200);
    assert.equal(pool.tables.sessions.find(x => x.id === 8101).is_hacked, 0);
    const ordinaryMessage = await Message.create({ session_id: 8101, sender_type: 'user', content: 'گزارش معمولی کلاس' });
    const firstCueId = pool.tables.recovery_cues.find(x => Number(x.run_id) === Number(first.data.state.id) && x.cue_key === 'mazdak1')?.message_id;
    assert.ok(firstCueId);
    const historyBefore = await fetch(`${origin}/api/sessions/8101/messages`, { headers: { Authorization: `Bearer ${admin}` } }).then(r => r.json());
    assert.ok(historyBefore.data.some(message => Number(message.id) === Number(firstCueId)));
    pool.tables.sessions.find(x => x.id === 8101).is_hacked = 1;
    const nextWeek = await call(8101, '/activate', admin, 'POST');
    assert.equal(nextWeek.data.state.runNo, 2);
    assert.notEqual(nextWeek.data.state.id, first.data.state.id);
    const historyAfter = await fetch(`${origin}/api/sessions/8101/messages`, { headers: { Authorization: `Bearer ${admin}` } }).then(r => r.json());
    assert.equal(historyAfter.session.recovery_run_id, nextWeek.data.state.id);
    assert.ok(!historyAfter.data.some(message => Number(message.id) === Number(firstCueId)));
    assert.ok(historyAfter.data.some(message => Number(message.id) === Number(ordinaryMessage.id)));
    assert.ok(pool.tables.messages.some(message => Number(message.id) === Number(firstCueId)));
    assert.equal((await call(8101, '/roster', admin)).data.items[0].videoId, null);
    assert.equal((await fetch(`${origin}${roster[0].mediaUrl}`, { headers: { Range: 'bytes=0-0' } })).status, 403);
    assert.equal((await call(8102, '', b)).data.state.phase, 'DORMANT');
  } finally {
    studentSocket?.disconnect();
    await new Promise(resolve => server.close(resolve));
    fs.unlinkSync(mediaPath);
    fs.unlinkSync(misnamedWebmPath);
    for (const [table, rows] of Object.entries(seed)) pool.tables[table] = pool.tables[table].filter(x => !rows.includes(x));
    pool.tables.recovery_runs = pool.tables.recovery_runs.filter(x => ![8101, 8102].includes(Number(x.session_id)));
    pool.tables.recovery_video_links = pool.tables.recovery_video_links.filter(x => ![8101, 8102].includes(Number(x.session_id)));
    pool.tables.recovery_cues = pool.tables.recovery_cues.filter(x => !pool.tables.messages.some(message => Number(message.id) === Number(x.message_id) && [8101, 8102].includes(Number(message.session_id))));
    pool.tables.messages = pool.tables.messages.filter(message => ![8101, 8102].includes(Number(message.session_id)));
  }
});
