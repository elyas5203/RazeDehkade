'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');

process.env.NODE_ENV = 'test';
process.env.USE_IN_MEMORY_DB = 'true';
process.env.JWT_SECRET = 'emergency_auth_test_secret';
process.env.TELEGRAM_BOT_TOKEN = 'test-token';
process.env.TELEGRAM_ADMIN_ID = '12345';

const { generateToken } = require('../src/middleware/auth');
const { pool, query } = require('../src/db/pool');
const route = require('../src/routes/emergencyAuth');
const { processOne } = require('../src/services/emergencyVideoQueue');

const ids = [
  'q_student_name',
  'q_shoe_rotary', 'q_terrorist_newspaper', 'q_hajj', 'q_padari',
  'q_invest_2026', 'q_oil_painting', 'q_letter_translators',
  'q_migration_reason', 'q_gem_feature', 'q_police_shoe_store',
  'q_last_village_city', 'q_precious_gem',
  'q_final_video_message'
];
const answers = Object.fromEntries(ids.map(id => [id, 'انتخاب دانش‌آموز']));
const webm = new Blob([Buffer.from('1a45dfa30000000000000000', 'hex')], { type: 'video/webm' });

test('emergency upload validates identity, deduplicates and queues without exposing a grade', async () => {
  pool.tables.sessions.push({ id: 27, name: 'کلاس آزمون', teacher_phone: '09123456789' });
  const app = express();
  app.use(express.json());
  app.use('/api/emergency-auth', route);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api/emergency-auth/submissions`;
  const token = generateToken({ role: 'user', sessionId: 27 });
  const form = (phone = '09123456789', id = 'test-submission-00001', full = answers, video = webm) => {
    const data = new FormData();
    data.set('phone', phone); data.set('clientSubmissionId', id);
    data.set('answers', JSON.stringify(full)); data.set('video', video, 'selfie.webm');
    return data;
  };
  const post = (data, auth = `Bearer ${token}`) => fetch(base, { method: 'POST', headers: { Authorization: auth }, body: data });
  try {
    assert.equal((await post(form(), '')).status, 401);
    assert.equal((await post(form('09123456789', 'test-submission-00002', { q_hajj: 'الف' }))).status, 400);
    assert.equal((await post(form('09111111111'))).status, 403);
    assert.equal((await post(form('09123456789', 'test-submission-00003', answers, new Blob(['not video'], { type: 'video/webm' })))).status, 400);
    const response = await post(form());
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.match(result.reference, /^SEC-[A-F0-9]{12}$/);
    assert.equal('grade' in result, false);
    assert.equal(pool.tables.emergency_auth_submissions.length, 1);
    assert.equal(pool.tables.emergency_auth_videos.length, 1);
    assert.equal(pool.tables.emergency_auth_videos[0].status, 'pending');
    assert.equal((await post(form())).status, 200);
    assert.equal(pool.tables.emergency_auth_videos.length, 1);
    const filePath = pool.tables.emergency_auth_videos[0].file_path;
    assert.ok(fs.existsSync(filePath));
    assert.equal(await processOne(async () => 654321), true);
    assert.equal(pool.tables.emergency_auth_videos[0].status, 'sent');
    assert.equal(pool.tables.emergency_auth_videos[0].telegram_message_id, 654321);
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(fs.existsSync(filePath), false);
  } finally { server.close(); }
});

test('queue retries after backoff and recovers interrupted sending jobs', async () => {
  const job = { id: 88, reference_code: 'SEC-RETRY', client_submission_id: 'test-retry-00000001',
    session_id: 27, phone: '09123456789', file_path: 'unused', mime_type: 'video/webm', file_size: 12,
    status: 'pending', attempt_count: 0, next_attempt_at: null, last_error: null };
  pool.tables.emergency_auth_videos.push(job);
  assert.equal(await processOne(async () => { throw new Error('temporary failure'); }), true);
  assert.equal(job.status, 'failed');
  assert.equal(job.attempt_count, 1);
  assert.ok(new Date(job.next_attempt_at) > new Date());
  assert.equal(await processOne(async () => 1), false);
  job.status = 'sending';
  await query("UPDATE emergency_auth_videos SET status = 'pending' WHERE status = 'sending'");
  assert.equal(job.status, 'pending');
  pool.tables.emergency_auth_videos.splice(pool.tables.emergency_auth_videos.indexOf(job), 1);
});
