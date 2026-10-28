const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const express = require('express');
const { Server } = require('socket.io');
const client = require('socket.io-client');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.USE_IN_MEMORY_DB = 'true';
process.env.JWT_SECRET = 'fifteen_session_isolation_test_secret';

const Session = require('../src/models/Session');
const setupSocketIO = require('../src/socket');

function onceConnected(socket) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('socket connect timeout')), 5000);
    socket.once('connect', () => { clearTimeout(timer); resolve(); });
    socket.once('connect_error', error => { clearTimeout(timer); reject(error); });
  });
}

function emitAck(socket, event, payload) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} ack timeout`)), 5000);
    socket.emit(event, payload, response => { clearTimeout(timer); resolve(response); });
  });
}

test('15 independent users can stream, chat, and receive only their own hack event', { timeout: 30000 }, async () => {
  const app = express();
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/media-library', express.static(path.join(__dirname, '../public/media-library')));
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  setupSocketIO(io);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const sockets = [];
  try {
    const sessions = [];
    for (let i = 0; i < 15; i++) sessions.push(await Session.create({ name: `Load session ${i}` }));
    const adminToken = jwt.sign({ role: 'admin', id: 1 }, process.env.JWT_SECRET);
    const admin = client(url, { auth: { token: adminToken }, transports: ['websocket'] });
    sockets.push(admin);
    const users = sessions.map(session => {
      const token = jwt.sign({ role: 'user', sessionId: session.id }, process.env.JWT_SECRET);
      const socket = client(url, { auth: { token }, transports: ['websocket'] });
      sockets.push(socket);
      return socket;
    });
    const seen = users.map(() => ({ messages: [], hacks: [] }));
    users.forEach((socket, i) => {
      socket.on('new_message', data => seen[i].messages.push(data.session_id));
      socket.on('hack_sequence_triggered', data => seen[i].hacks.push(data.sessionId));
    });
    await Promise.all(sockets.map(onceConnected));

    const media = await Promise.all(sessions.map(async () => {
      const [health, video] = await Promise.all([
        fetch(`${url}/api/health`),
        fetch(`${url}/media-library/videos/first.mp4`, { headers: { Range: 'bytes=0-1023' } }),
      ]);
      return { health: health.status, video: video.status, size: (await video.arrayBuffer()).byteLength };
    }));
    assert.ok(media.every(item => item.health === 200 && item.video === 206 && item.size === 1024));

    const messages = await Promise.all(users.map((socket, i) =>
      emitAck(socket, 'send_message', { sessionId: sessions[i].id, content: `Concurrent user message ${i}` })));
    assert.ok(messages.every(result => result?.success));

    const hacks = await Promise.all(sessions.map(session =>
      emitAck(admin, 'trigger_hack_sequence', { sessionId: session.id })));
    assert.ok(hacks.every(result => result?.success));
    await new Promise(resolve => setTimeout(resolve, 100));
    seen.forEach((events, i) => {
      assert.deepEqual(events.messages, [sessions[i].id]);
      assert.deepEqual(events.hacks, [sessions[i].id]);
    });
  } finally {
    sockets.forEach(socket => socket.disconnect());
    await new Promise(resolve => io.close(resolve));
    await new Promise(resolve => server.close(resolve));
  }
});
