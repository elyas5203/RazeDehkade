const { test } = require('node:test');
const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
const { app, server } = require('../server');
const { pool } = require('../src/db/pool');
const { generateToken } = require('../src/middleware/auth');

test('collective recovery stays within its session and requires an approved video', async () => {
  pool.tables.sessions.push(
    { id: 7101, name: 'کلاس الف', status: 'active', chat_code: '710101', code: '710101', teacher_phone: '09120000001', is_hacked: 1 },
    { id: 7102, name: 'کلاس ب', status: 'active', chat_code: '710102', code: '710102', teacher_phone: '09120000002', is_hacked: 1 }
  );
  await new Promise(resolve => server.listen(0, resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const admin = generateToken({ id: 1, role: 'admin' });
  const userA = generateToken({ sessionId: 7101, role: 'user' });
  const userB = generateToken({ sessionId: 7102, role: 'user' });
  const call = async (id, path, token, method = 'GET', body) => {
    const response = await fetch(`${origin}/api/recovery/sessions/${id}${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined
    });
    return { status: response.status, data: await response.json() };
  };
  const join = async code => {
    const response = await fetch(`${origin}/api/auth/user/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
    return { status: response.status, data: await response.json() };
  };
  try {
    assert.equal((await join('710101')).data.redirectUrl, '/emergency-auth.html');
    assert.equal((await join('710102')).data.redirectUrl, '/emergency-auth.html');
    assert.equal((await call(7101, '', userB)).status, 403);
    assert.equal((await call(7101, '/activate', userA, 'POST', { expected_revision: 0 })).status, 403);
    assert.equal((await call(7101, '/activate', admin, 'POST', { expected_revision: 0 })).status, 200);
    assert.equal((await call(7101, '', userA)).data.state.authMode, 'collective');
    assert.equal((await call(7102, '', userB)).data.state.authMode, 'individual');
    assert.equal((await join('710101')).data.redirectUrl, '/chat.html');
    assert.equal((await join('710102')).data.redirectUrl, '/emergency-auth.html');
    const individual = await fetch(`${origin}/api/emergency-auth/verify-phone`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '09120000002' }) });
    assert.equal(individual.status, 200);
    assert.equal((await individual.json()).session.id, 7102);
    assert.equal((await call(7101, '/activate', admin, 'POST', { expected_revision: 0 })).status, 409);
    assert.equal((await call(7102, '', userB)).data.state.phase, 'DORMANT');
    assert.equal((await call(7101, '/ready', admin, 'POST', { expected_revision: 1 })).status, 409);
    assert.equal((await call(7101, '/location', admin, 'PUT', { expected_revision: 1, latitude: 200, longitude: 59 })).status, 400);
    const location = await call(7101, '/location', admin, 'PUT', { expected_revision: 1, latitude: 36.31200894, longitude: 59.572289549 });
    assert.equal(location.status, 200);
    assert.equal(Number(location.data.state.latitude), 36.31200894);
    const student = await call(7101, '', userA);
    assert.equal(student.data.state.phase, 'COLLECTING');
    assert.equal(student.data.state.revision, 2);
    assert.equal((await call(7102, '', userB)).data.state.phase, 'DORMANT');
    pool.tables.collective_submissions.push({ id: 9991, session_id: 7101, phone_normalized: '09120000001', status: 'pending', telegram_status: 'pending', duration_seconds: 12, created_at: new Date() });
    assert.equal((await call(7101, '/submissions/9991/decision', userB, 'POST', { status: 'approved' })).status, 403);
    assert.equal((await call(7101, '/submissions/9991/decision', admin, 'POST', { status: 'approved' })).status, 200);
    assert.equal((await call(7102, '/submissions', userB)).data.items.length, 0);
    assert.equal((await call(7101, '/submissions', userA)).data.items.length, 1);
    assert.equal((await call(7101, '/ready', admin, 'POST', { expected_revision: 3 })).status, 200);
    assert.equal((await call(7101, '/release', admin, 'POST', { expected_revision: 4 })).status, 200);
    assert.equal((await call(7101, '/start', admin, 'POST', { expected_revision: 5 })).status, 200);
    assert.equal((await call(7101, '/pause', admin, 'POST', { expected_revision: 6 })).status, 200);
    assert.equal((await call(7101, '/complete', userA, 'POST')).status, 409);
    const paused = await call(7101, '', userA);
    assert.equal(paused.data.state.phase, 'PAUSED');
    assert.equal((await call(7101, '/resume', admin, 'POST', { expected_revision: 7 })).status, 200);
    assert.equal((await call(7101, '', userA)).data.state.phase, 'CINEMATIC');
    assert.equal((await call(7101, '/complete', userB, 'POST')).status, 403);
    assert.equal((await call(7101, '/complete', userA, 'POST')).status, 409);
    pool.tables.session_recovery[0].sequence_started_at = new Date(Date.now() - 60000);
    assert.equal((await call(7101, '/complete', userA, 'POST')).status, 200);
    assert.equal(pool.tables.sessions.find(x => x.id === 7101).is_hacked, 0);
    assert.equal(pool.tables.sessions.find(x => x.id === 7102).is_hacked, 1);
  } finally {
    await new Promise(resolve => server.close(resolve));
    pool.tables.sessions = pool.tables.sessions.filter(x => ![7101, 7102].includes(x.id));
    pool.tables.session_recovery = pool.tables.session_recovery.filter(x => x.session_id !== 7101);
    pool.tables.collective_submissions = pool.tables.collective_submissions.filter(x => x.id !== 9991);
  }
});
