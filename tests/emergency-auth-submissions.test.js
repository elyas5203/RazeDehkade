'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');

process.env.NODE_ENV = 'test';
process.env.USE_IN_MEMORY_DB = 'true';
process.env.JWT_SECRET = 'emergency_auth_test_secret';

const { generateToken } = require('../src/middleware/auth');
const { pool } = require('../src/db/pool');
const route = require('../src/routes/emergencyAuth');

const ids = [
  'q_shoe_rotary', 'q_terrorist_newspaper', 'q_hajj', 'q_padari',
  'q_invest_2026', 'q_oil_painting', 'q_letter_translators',
  'q_migration_reason', 'q_gem_feature', 'q_police_shoe_store',
  'q_last_village_city', 'q_precious_gem'
];
const answers = Object.fromEntries(ids.map(id => [id, 'انتخاب دانش‌آموز']));

test('emergency answers are accepted only when complete and saved without a grade', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/emergency-auth', route);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api/emergency-auth/submissions`;
  const token = generateToken({ role: 'user', sessionId: 27 });
  try {
    const post = (body, authorization = `Bearer ${token}`) => fetch(base, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authorization },
      body: JSON.stringify(body)
    });
    assert.equal((await post({ phone: '09123456789', answers }, '')).status, 401);
    assert.equal((await post({ phone: '09123456789', answers: { q_hajj: 'الف' } })).status, 400);
    assert.equal((await post({ phone: 'wrong', answers })).status, 400);
    const response = await post({ phone: '09123456789', answers });
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.match(result.reference, /^SEC-[A-F0-9]{12}$/);
    assert.equal('grade' in result, false);
    assert.equal('correct' in result, false);
    assert.equal(pool.tables.emergency_auth_submissions.length, 1);
    assert.equal(pool.tables.emergency_auth_submissions[0].session_id, 27);
    assert.deepEqual(JSON.parse(pool.tables.emergency_auth_submissions[0].answers_json), answers);
    const client = fs.readFileSync(path.join(__dirname, '../public/assets/js/emergency-auth.js'), 'utf8');
    assert.match(client, /if \(!response\.ok \|\| !result\.success\) throw/);
  } finally {
    server.close();
  }
});
