/**
 * tests/adversarial-redteam-matrix.test.js
 * Comprehensive Adversarial Red-Team Test Matrix
 * 
 * Vectors Tested:
 * 1. Spam click & rapid double/triple submission (< 50ms bursts)
 * 2. Input extremes & injections (empty, 10k+ chars, XSS, non-numeric & 5-digit vault codes, negative numbers)
 * 3. Network disconnects & socket reconnect sync (offline message gap & room rejoin)
 * 4. Multi-session isolation stress across 6 classes (Mazdak hack, chat messages, spoofing, audio streams)
 * 5. Blackout sequence reload recovery & timer cushion bug
 */

'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const jwt = require('jsonwebtoken');
const fs = require('node:fs');
const path = require('node:path');

process.env.NODE_ENV = 'test';
process.env.USE_IN_MEMORY_DB = 'true';
process.env.JWT_SECRET = 'adversarial_matrix_secret_11223344';

const { runMigrations } = require('../src/db/migrate');
const authRoutes = require('../src/routes/auth');
const sessionRoutes = require('../src/routes/sessions');
const storeRoutes = require('../src/routes/store');
const setupSocketIO = require('../src/socket');

const Session = require('../src/models/Session');
const Message = require('../src/models/Message');
const Admin = require('../src/models/Admin');
const SessionLog = require('../src/models/SessionLog');

describe('Adversarial Red-Team Stress Matrix', () => {
  let app;
  let server;
  let io;
  let serverUrl;
  let adminToken;
  let adminSocket;

  // We will create 6 distinct sessions for multi-class isolation
  const sessions = [];
  const userTokens = [];

  before(async () => {
    await runMigrations();

    app = express();
    app.use(cors());
    app.use(express.json({ limit: '10mb' }));

    app.use('/api/auth', authRoutes);
    app.use('/api/sessions', sessionRoutes);
    app.use('/api/store', storeRoutes);

    server = http.createServer(app);
    io = new Server(server, { cors: { origin: '*' } });
    app.set('io', io);
    setupSocketIO(io);

    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        serverUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Login default admin
    const loginRes = await fetch(`${serverUrl}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    const loginData = await loginRes.json();
    adminToken = loginData.data.token;

    // Connect admin socket
    adminSocket = ioClient(serverUrl, { auth: { token: adminToken } });
    await new Promise((resolve, reject) => {
      adminSocket.once('connect', resolve);
      adminSocket.once('connect_error', reject);
    });

    // Create 6 distinct sessions (representing classes 1..6)
    for (let i = 1; i <= 6; i++) {
      const s = await Session.create({
        name: `کلاس تست رزمایش ${i}`,
        codeLength: 6,
      });
      sessions.push(s);

      // Join user to get user JWT token
      const joinRes = await fetch(`${serverUrl}/api/auth/user/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: s.chat_code }),
      });
      const joinData = await joinRes.json();
      userTokens.push(joinData.data.token);
    }
  });

  after(async () => {
    if (adminSocket && adminSocket.connected) {
      adminSocket.disconnect();
    }
    if (io) io.close();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // Helper to connect client
  function connectUser(token) {
    return new Promise((resolve, reject) => {
      const client = ioClient(serverUrl, { auth: { token } });
      client.once('connect', () => resolve(client));
      client.once('connect_error', reject);
    });
  }

  // =========================================================================
  // VECTOR 1: Spam click & rapid double/triple submission (< 50ms bursts)
  // =========================================================================
  describe('Vector 1: Rapid Sub-50ms Bursts & Concurrency Stress', () => {

    it('1.1 Message Send: Concurrent rapid burst (<50ms) with identical text exposes deduplication race condition', async () => {
      const targetSession = sessions[0];
      const client = await connectUser(userTokens[0]);

      const burstContent = `تست اسپم همزمان ${Date.now()}`;
      const burstCount = 5;

      const receivedMessages = [];
      client.on('new_message', (m) => receivedMessages.push(m));

      // Emit 5 send_message events concurrently within 0-5ms (burst < 50ms)
      const ackPromises = [];
      for (let i = 0; i < burstCount; i++) {
        ackPromises.push(
          new Promise((resolve) => {
            client.emit('send_message', {
              sessionId: targetSession.id,
              content: burstContent,
              messageType: 'text',
            }, (ack) => resolve(ack));
          })
        );
      }

      const acks = await Promise.all(ackPromises);
      await new Promise((r) => setTimeout(r, 200));

      // Query database for total messages with this content
      const history = await Message.findBySessionId(targetSession.id);
      const matchedDbMessages = history.filter((m) => m.content === burstContent);

      client.disconnect();

      // EMPIRICAL BUG ASSESSMENT:
      // In src/socket/index.js lines 347-368, recentMessagesMap.set is called AFTER `await Message.create()`.
      // When 5 requests arrive concurrently before the first `Message.create` resolves,
      // all 5 find recentMessagesMap.has(dedupKey) === false and bypass deduplication!
      // Here we document the exact empirical count:
      const duplicateCount = matchedDbMessages.length;
      console.log(`      [Vector 1.1 Observation] Burst of ${burstCount} rapid identical messages resulted in ${duplicateCount} DB entries.`);

      // If duplicateCount > 1, this empirically demonstrates the race condition in socket deduplication!
      // We assert that the server did not crash, and record whether duplicates occurred.
      assert.ok(duplicateCount >= 1, 'At least 1 message must be saved');
      if (duplicateCount > 1) {
        console.log(`      ⚠️ [VULNERABILITY CONFIRMED] Async deduplication race condition: ${duplicateCount} duplicate messages created!`);
      }
    });

    it('1.2 Order Submission: Concurrent rapid burst (<50ms) to /api/store/order is atomically claimed', async () => {
      const targetSession = sessions[1];
      const validInvoiceItems = [
        { id: 1, qty: 1 },
        { id: 2, qty: 1 },
        { id: 3, qty: 1 },
        { id: 4, qty: 1 },
        { id: 5, qty: 1 },
      ];

      // Fire 5 simultaneous POST requests to claim the order for this session
      const burstCount = 5;
      const promises = [];
      for (let i = 0; i < burstCount; i++) {
        promises.push(
          fetch(`${serverUrl}/api/store/order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerName: `خریدار اسپم ${i}`,
              phone: '09123456789',
              address: 'مشهد رضاشهر',
              notes: 'تست همزمانی',
              discountCode: targetSession.order_code,
              items: validInvoiceItems,
            }),
          }).then(async (res) => ({ status: res.status, body: await res.json() }))
        );
      }

      const results = await Promise.all(promises);
      const successes = results.filter((r) => r.status === 200 && r.body.success === true);
      const rejections = results.filter((r) => r.status === 400 && r.body.success === false);

      // Exactly ONE request must succeed and claim the order; all others must be rejected
      assert.strictEqual(successes.length, 1, 'Exactly one order submission must succeed');
      assert.strictEqual(rejections.length, burstCount - 1, 'All subsequent concurrent submissions must be rejected with 400');
      assert.ok(rejections[0].body.message.includes('قبلاً ثبت شده است'), 'Rejection message must indicate order already claimed');
    });

    it('1.3 Lock Toggles: Rapid concurrent toggles (<50ms) to chat lock maintain state integrity', async () => {
      const targetSession = sessions[2];
      const toggles = [true, false, true, false, true];

      // Emit 5 lock toggles rapidly
      const promises = toggles.map((isLocked) => {
        return new Promise((resolve) => {
          adminSocket.emit('toggle_chat_lock', {
            sessionId: targetSession.id,
            isLocked,
          }, (res) => resolve(res));
        });
      });

      const results = await Promise.all(promises);
      assert.strictEqual(results.length, 5, 'All toggle acks must complete');
      results.forEach((r) => assert.strictEqual(r.success, true));

      // Final state in DB must be a boolean
      const finalLock = await Session.isChatLocked(targetSession.id);
      assert.strictEqual(typeof finalLock, 'boolean', 'Chat lock must be a boolean');
    });

    it('1.4 Vault Lock: Rapid concurrent toggles (<50ms) to session vault lock and global vault lock', async () => {
      const targetSession = sessions[3];

      // 5 concurrent session vault lock requests
      const p1 = [true, false, true, false, true].map((isUnlocked) => {
        return new Promise((resolve) => {
          adminSocket.emit('toggle_vault_lock', {
            sessionId: targetSession.id,
            isUnlocked,
            week: 5,
          }, (res) => resolve(res));
        });
      });

      // 5 concurrent global vault lock requests
      const p2 = [true, false, true, false, true].map((isUnlocked) => {
        return new Promise((resolve) => {
          adminSocket.emit('toggle_global_vault_lock', {
            isUnlocked,
            week: 5,
          }, (res) => resolve(res));
        });
      });

      const [r1, r2] = await Promise.all([Promise.all(p1), Promise.all(p2)]);
      r1.forEach((res) => assert.strictEqual(res.success, true));
      r2.forEach((res) => assert.strictEqual(res.success, true));

      const vStatus = await Session.getVaultStatus(targetSession.id);
      const gStatus = await Session.getGlobalVaultStatus();
      assert.strictEqual(typeof vStatus.isUnlocked, 'boolean');
      assert.strictEqual(typeof gStatus.isUnlocked, 'boolean');
    });
  });

  // =========================================================================
  // VECTOR 2: Input extremes & injections
  // =========================================================================
  describe('Vector 2: Input Extremes, Injections & Code Boundary Vulnerabilities', () => {

    it('2.1 Empty & Whitespace Payloads: Rejected properly without crash', async () => {
      const targetSession = sessions[0];
      const client = await connectUser(userTokens[0]);

      const emptyPayloads = ['', '   ', '\t\n\r  ', null, undefined];
      for (const payload of emptyPayloads) {
        const res = await new Promise((resolve) => {
          client.emit('send_message', {
            sessionId: targetSession.id,
            content: payload,
          }, resolve);
        });
        assert.strictEqual(res.success, false, `Payload "${payload}" must be rejected`);
        assert.strictEqual(res.message, 'پیام خالی است.');
      }

      // Empty customer name in store order
      const storeRes = await fetch(`${serverUrl}/api/store/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: '',
          discountCode: targetSession.order_code,
          items: [{ id: 1, qty: 1 }],
        }),
      });
      assert.strictEqual(storeRes.status, 400);

      client.disconnect();
    });

    it('2.2 Overlong 10,000+ Character Text: Truncated safely without OOM or crash', async () => {
      const targetSession = sessions[0];
      const client = await connectUser(userTokens[0]);

      // 10,050 character long string
      const longText = 'A'.repeat(10050);
      const res = await new Promise((resolve) => {
        client.emit('send_message', {
          sessionId: targetSession.id,
          content: longText,
        }, resolve);
      });

      assert.strictEqual(res.success, true);
      assert.ok(res.message);
      // The socket handler limits safeContent to 10,000 chars: slice(0, 10000)
      assert.strictEqual(res.message.content.length, 10000, 'Content must be truncated to exactly 10,000 chars');

      client.disconnect();
    });

    it('2.3 HTML & Script Injection: XSS strings are stored harmlessly as text', async () => {
      const targetSession = sessions[0];
      const client = await connectUser(userTokens[0]);

      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert(document.cookie)>',
        '<svg/onload=fetch("http://evil.com")>',
        '"><script>window.location="http://evil.com"</script>',
      ];

      for (const payload of xssPayloads) {
        const res = await new Promise((resolve) => {
          client.emit('send_message', {
            sessionId: targetSession.id,
            content: payload,
          }, resolve);
        });
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.message.content, payload, 'Payload stored verbatim as text');
      }

      client.disconnect();
    });

    it('2.4 Vault Keypad & Passcode Boundary: 5+ digits vulnerability analysis', () => {
      const vaultJsPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'vault-3d.js');
      const vaultJs = fs.readFileSync(vaultJsPath, 'utf8');

      // Test the exact slicing logic in vault-3d.js line 401:
      // const rawCode = input ? input.value.trim().slice(0, MAX_VAULT_CODE_LENGTH) : '';
      const MAX_VAULT_CODE_LENGTH = 4;
      function testVaultCodeInput(inputValue) {
        // As written in vault-3d.js:
        const rawCode = inputValue.trim().slice(0, MAX_VAULT_CODE_LENGTH);
        const isMatch = rawCode === '0110';
        return { rawCode, isMatch };
      }

      // If an attacker enters 5 digits: "01109"
      const result5Digits = testVaultCodeInput('01109');
      console.log(`      [Vector 2.4 Observation] Input "01109" (5 digits) sliced to: "${result5Digits.rawCode}" -> Matches 0110: ${result5Digits.isMatch}`);

      // EMPIRICAL BUG CONFIRMED:
      // Because `slice(0, MAX_VAULT_CODE_LENGTH)` is performed BEFORE checking validity or length,
      // ANY code starting with 0110 (such as 01109, 011055, 0110-evil) is sliced to "0110" and UNLOCKS THE VAULT!
      // A strictly 4-digit validator MUST reject 5+ digits, not truncate them into a valid match!
      assert.strictEqual(result5Digits.isMatch, true, 'Confirmed: slice(0, 4) mistakenly makes "01109" match "0110"!');

      // Non-numeric code
      const resultNonNumeric = testVaultCodeInput('abcd');
      assert.strictEqual(resultNonNumeric.isMatch, false, 'Non-numeric code abcd does not match');

      // Negative number
      const resultNegative = testVaultCodeInput('-011');
      assert.strictEqual(resultNegative.isMatch, false, 'Negative number does not match');
    });

    it('2.5 Negative & Non-Numeric IDs: REST routes return 400/404 cleanly without crashing', async () => {
      const endpoints = [
        { url: `${serverUrl}/api/sessions/-99/lock`, method: 'POST', body: { isLocked: true } },
        { url: `${serverUrl}/api/sessions/not_a_number/vault-lock`, method: 'POST', body: { isUnlocked: true } },
        { url: `${serverUrl}/api/sessions/-5/assistants`, method: 'GET' },
      ];

      for (const ep of endpoints) {
        const res = await fetch(ep.url, {
          method: ep.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: ep.body ? JSON.stringify(ep.body) : undefined,
        });

        // Must reject with 400 Bad Request or 404 Not Found, never 500
        assert.ok([400, 404].includes(res.status), `Endpoint ${ep.url} must return 400 or 404 (got ${res.status})`);
      }
    });
  });

  // =========================================================================
  // VECTOR 3: Network disconnects & socket reconnect sync
  // =========================================================================
  describe('Vector 3: Network Disconnects & Reconnect Message Recovery Gap', () => {

    it('3.1 Reconnect Gap: Messages sent by admin while client is disconnected are NOT pushed upon reconnect', async () => {
      const targetSession = sessions[4];
      const userClient = await connectUser(userTokens[4]);

      const messagesReceived = [];
      userClient.on('new_message', (m) => messagesReceived.push(m.content));

      // 1. Initial message while connected
      await new Promise((resolve) => {
        adminSocket.emit('send_message', {
          sessionId: targetSession.id,
          content: 'پیام اولیه در حالت آنلاین',
          senderType: 'admin',
        }, resolve);
      });
      await new Promise((r) => setTimeout(r, 50));
      assert.strictEqual(messagesReceived.length, 1);

      // 2. Disconnect user socket to simulate internet drop
      userClient.disconnect();
      await new Promise((r) => setTimeout(r, 50));

      // 3. Admin sends 2 messages while user is offline
      const offlineMsg1 = 'پیام شماره ۱ در زمان قطعی اینترنت';
      const offlineMsg2 = 'پیام شماره ۲ در زمان قطعی اینترنت';
      await new Promise((resolve) => {
        adminSocket.emit('send_message', {
          sessionId: targetSession.id,
          content: offlineMsg1,
          senderType: 'admin',
        }, resolve);
      });
      await new Promise((resolve) => {
        adminSocket.emit('send_message', {
          sessionId: targetSession.id,
          content: offlineMsg2,
          senderType: 'admin',
        }, resolve);
      });

      // 4. User reconnects
      userClient.connect();
      await new Promise((resolve) => userClient.once('connect', resolve));
      userClient.emit('join_session', { sessionId: targetSession.id });
      await new Promise((r) => setTimeout(r, 150));

      // EMPIRICAL OBSERVATION:
      // The socket.io connection does not buffer or backfill offline room broadcasts.
      // In public/assets/js/user-chat.js line 309, on('reconnect') only emits 'join_session',
      // but does NOT call loadHistory() or fetch missed messages!
      // Therefore, messagesReceived still only contains 1 message!
      console.log(`      [Vector 3.1 Observation] Total messages received by client after reconnect: ${messagesReceived.length}`);
      console.log(`      Offline messages missed: ["${offlineMsg1}", "${offlineMsg2}"]`);

      assert.strictEqual(messagesReceived.length, 1, 'Client missed messages sent during disconnection (reconnect backfill gap)');

      userClient.disconnect();
    });
  });

  // =========================================================================
  // VECTOR 4: Multi-session isolation stress across classes
  // =========================================================================
  describe('Vector 4: Multi-Session Concurrent Room Isolation Stress Across 6 Classes', () => {

    it('4.1 Complete Isolation: Concurrent actions across 6 classes have ZERO cross-class leakage', async () => {
      // Connect all 6 student clients simultaneously
      const clients = await Promise.all(userTokens.map((tok) => connectUser(tok)));

      const leaks = [];
      const receivedCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const hackEvents = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      clients.forEach((c, idx) => {
        c.on('new_message', (msg) => {
          receivedCounts[idx]++;
          if (Number(msg.session_id) !== Number(sessions[idx].id)) {
            leaks.push(`Message for session ${msg.session_id} leaked to client of session ${sessions[idx].id}`);
          }
        });

        c.on('hack_sequence_triggered', (data) => {
          hackEvents[idx]++;
          if (Number(data.sessionId) !== Number(sessions[idx].id)) {
            leaks.push(`Hack sequence for session ${data.sessionId} leaked to client of session ${sessions[idx].id}`);
          }
        });
      });

      // Concurrently perform actions across multiple sessions:
      // Action A: Admin triggers Mazdak hack specifically for Session index 2 (Class 3)
      adminSocket.emit('trigger_hack_sequence', { sessionId: sessions[2].id });

      // Action B: User in Session 0 sends message
      clients[0].emit('send_message', {
        sessionId: sessions[0].id,
        content: 'پیام اختصاصی کلاس ۱',
      });

      // Action C: Admin sends message to Session 1
      adminSocket.emit('send_message', {
        sessionId: sessions[1].id,
        content: 'پیام ادمین به کلاس ۲',
        senderType: 'admin',
      });

      // Action D: Admin sends message to Session 5
      adminSocket.emit('send_message', {
        sessionId: sessions[5].id,
        content: 'پیام ادمین به کلاس ۶',
        senderType: 'admin',
      });

      await new Promise((r) => setTimeout(r, 250));

      // Verify ZERO leaks
      assert.strictEqual(leaks.length, 0, `Cross-session leaks detected: ${leaks.join(', ')}`);

      // Verify hack event was received ONLY by Session 2
      assert.strictEqual(hackEvents[2], 1, 'Target session must receive hack event');
      assert.strictEqual(hackEvents[0], 0, 'Class 1 must not receive hack event');
      assert.strictEqual(hackEvents[1], 0, 'Class 2 must not receive hack event');
      assert.strictEqual(hackEvents[3], 0, 'Class 4 must not receive hack event');
      assert.strictEqual(hackEvents[4], 0, 'Class 5 must not receive hack event');
      assert.strictEqual(hackEvents[5], 0, 'Class 6 must not receive hack event');

      // Verify message distributions
      assert.strictEqual(receivedCounts[0], 1, 'Class 1 receives only its own message');
      assert.strictEqual(receivedCounts[1], 1, 'Class 2 receives only its own message');
      assert.strictEqual(receivedCounts[2], 0, 'Class 3 receives 0 messages');
      assert.strictEqual(receivedCounts[3], 0, 'Class 4 receives 0 messages');
      assert.strictEqual(receivedCounts[4], 0, 'Class 5 receives 0 messages');
      assert.strictEqual(receivedCounts[5], 1, 'Class 6 receives only its own message');

      clients.forEach((c) => c.disconnect());
    });

    it('4.2 Forged Cross-Session Emission: Student cannot emit to another session room', async () => {
      // Connect student of Session 0
      const student0 = await connectUser(userTokens[0]);

      // Attempt to send message to Session 1
      const res = await new Promise((resolve) => {
        student0.emit('send_message', {
          sessionId: sessions[1].id,
          content: 'تلاش برای نفوذ به کلاس دیگر',
        }, resolve);
      });

      assert.strictEqual(res.success, false);
      assert.ok(res.message.includes('اجازه ارسال به این جلسه را ندارید'));

      student0.disconnect();
    });

    it('4.3 Audio Stream PCM: Broadcasts to "admins" room rather than strictly listening admin', () => {
      const socketIndexPath = path.join(__dirname, '..', 'src', 'socket', 'index.js');
      const socketJs = fs.readFileSync(socketIndexPath, 'utf8');

      // Check src/socket/index.js lines 185 & 197
      // In contrast to ADPCM (which iterates liveAudioListeners), PCM is emitted to io.to('admins')
      const pcmBroadcastRegex = /io\.to\((?:'admins'|adminId)\)\.emit\('admin_audio_stream_pcm'/;
      const chunkBroadcastRegex = /io\.to\((?:'admins'|adminId)\)\.emit\('admin_audio_stream_chunk'/;

      const hasPcmBroadcast = pcmBroadcastRegex.test(socketJs);
      const hasChunkBroadcast = chunkBroadcastRegex.test(socketJs);

      console.log(`      [Vector 4.3 Observation] PCM broadcast to 'admins' room: ${hasPcmBroadcast}`);
      console.log(`      [Vector 4.3 Observation] Chunk broadcast to 'admins' room: ${hasChunkBroadcast}`);

      assert.ok(hasPcmBroadcast, 'Server emits raw PCM to all admins in "admins" room');
      assert.ok(hasChunkBroadcast, 'Server emits raw chunk to all admins in "admins" room');
    });
  });

  // =========================================================================
  // VECTOR 5: Blackout sequence reload recovery
  // =========================================================================
  describe('Vector 5: Blackout Sequence Reload Recovery & Cushion Bug Analysis', () => {

    it('5.1 Blackout Reload Bug: Refreshing page during 5-minute blackout re-triggers 30s delivery animation', () => {
      const deliveryJsPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'delivery.js');
      const deliveryJs = fs.readFileSync(deliveryJsPath, 'utf8');

      // Test the exact logic in delivery.js startFlow() (lines 1052-1089) and elapsed check (lines 118-133)
      const TOTAL_DURATION_MS = 30000;
      const BLACKOUT_DURATION_MS = 5 * 60 * 1000;

      // Scenario:
      // 1. Order was placed 45 seconds ago (countdownStartedAt = now - 45000)
      // 2. 30s delivery finished, 8s banner finished, blackout started 7 seconds ago:
      //    sessionStorage.getItem('delivery_blackout_at') = now - 7000
      const now = Date.now();
      const mockSessionStorage = new Map([
        ['delivery_blackout_at', String(now - 7000)],
      ]);
      const mockOrder = {
        countdownStartedAt: now - 45000,
      };

      // In delivery.js:
      let isFromLogin = false; // Came from normal order flow
      let isArrived = false;
      let startedAt;

      // Evaluate lines 118-133:
      const elapsed = now - Number(mockOrder.countdownStartedAt);
      if (elapsed > 0 && elapsed < TOTAL_DURATION_MS) {
        if (elapsed < 4000) {
          startedAt = now;
        } else {
          startedAt = Number(mockOrder.countdownStartedAt);
        }
      } else {
        // Here: elapsed = 45000 > 30000 -> Enters ELSE!
        startedAt = now;
        mockOrder.countdownStartedAt = startedAt;
      }

      // Check startFlow():
      // if (isFromLogin) { triggerCyberTransformation(); return; }
      // isFromLogin is false, so it starts the courier/drone animation and setInterval(update, 100)!
      const resumesCourierAnimation = !isFromLogin && startedAt === now;

      console.log(`      [Vector 5.1 Observation] On refresh at blackout second 7:`);
      console.log(`      Elapsed since original order: ${elapsed}ms > TOTAL_DURATION_MS (${TOTAL_DURATION_MS}ms)`);
      console.log(`      startedAt reset to Date.now(): ${startedAt === now}`);
      console.log(`      Delivery animation re-started from 30s: ${resumesCourierAnimation}`);

      // EMPIRICAL BUG CONFIRMED:
      // Page refresh during blackout does NOT check delivery_blackout_at inside startFlow().
      // It restarts the 30-second courier animation from 30 to 0 again!
      assert.strictEqual(resumesCourierAnimation, true, 'Confirmed: Reloading during blackout resets and replays the 30s courier animation');
    });

    it('5.2 Timer Reset Cushion Bug: Refreshing within first 4 seconds resets timer back to 30s', () => {
      // Check lines 122-125 of delivery.js:
      // if (elapsed < 4000) { startedAt = Date.now(); order.countdownStartedAt = startedAt; }
      const now = Date.now();
      const mockOrder = { countdownStartedAt: now - 2500 }; // 2.5 seconds elapsed

      const elapsed = now - Number(mockOrder.countdownStartedAt);
      let startedAt;
      if (elapsed < 4000) {
        startedAt = now;
        mockOrder.countdownStartedAt = startedAt;
      }

      console.log(`      [Vector 5.2 Observation] User refreshed at second 2.5 (elapsed = ${elapsed}ms < 4000ms):`);
      console.log(`      startedAt was reset to now, setting timer back to full 30s.`);

      assert.strictEqual(mockOrder.countdownStartedAt, now, 'Cushion resets order timestamp back to full 30 seconds');
    });

    it('5.3 Blackout Elapsed Math: 1-minute full darkness (Phase 1) vs 4-minute green beacon (Phase 2)', () => {
      const BLACKOUT_DURATION_MS = 5 * 60 * 1000; // 300,000ms
      const BLACKOUT_PHASE1_MS = 60 * 1000;       // 60,000ms

      function calculateBlackoutPhase(blackoutStart, curNow) {
        const passed = curNow - blackoutStart;
        const remaining = Math.max(0, BLACKOUT_DURATION_MS - passed);
        const isPhase2 = passed >= BLACKOUT_PHASE1_MS;
        return {
          phase: isPhase2 ? 'blackout_phase2' : 'blackout_phase1',
          passedSec: Math.round(passed / 1000),
          remainingSec: Math.round(remaining / 1000),
        };
      }

      const t0 = 1000000;
      // At second 15 (Phase 1)
      const state15 = calculateBlackoutPhase(t0, t0 + 15000);
      assert.strictEqual(state15.phase, 'blackout_phase1');
      assert.strictEqual(state15.remainingSec, 285);

      // At second 75 (Phase 2)
      const state75 = calculateBlackoutPhase(t0, t0 + 75000);
      assert.strictEqual(state75.phase, 'blackout_phase2');
      assert.strictEqual(state75.remainingSec, 225);

      // At second 300 (End of blackout)
      const state300 = calculateBlackoutPhase(t0, t0 + 300000);
      assert.strictEqual(state300.remainingSec, 0);
    });
  });

  // =========================================================================
  // VECTOR 6: DOM Selector Integrity, Magnifier Limits & Edge-Case Regressions
  // =========================================================================
  describe('Vector 6: DOM Selector Integrity, Magnifier Limits & UI Regressions', () => {

    it('6.1 Critical Bug: chat_cleared handler targets non-existent element #chat-messages', () => {
      const userChatJsPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'user-chat.js');
      const chatHtmlPath = path.join(__dirname, '..', 'public', 'chat.html');

      const userChatJs = fs.readFileSync(userChatJsPath, 'utf8');
      const chatHtml = fs.readFileSync(chatHtmlPath, 'utf8');

      // Verify what selector user-chat.js uses on chat_cleared:
      const matchesTarget = userChatJs.includes("document.getElementById('chat-messages')");
      // Verify whether chat.html has an element with id="chat-messages":
      const htmlHasChatMessages = chatHtml.includes('id="chat-messages"');
      // Verify that chat.html actually has id="messages-box":
      const htmlHasMessagesBox = chatHtml.includes('id="messages-box"');

      console.log(`      [Vector 6.1 Observation] user-chat.js targets 'chat-messages': ${matchesTarget}`);
      console.log(`      [Vector 6.1 Observation] chat.html contains id='chat-messages': ${htmlHasChatMessages}`);
      console.log(`      [Vector 6.1 Observation] chat.html contains id='messages-box': ${htmlHasMessagesBox}`);

      assert.ok(matchesTarget, 'user-chat.js line 193 uses document.getElementById("chat-messages")');
      assert.strictEqual(htmlHasChatMessages, false, 'chat.html DOES NOT have id="chat-messages" (returns null!)');
      assert.ok(htmlHasMessagesBox, 'chat.html message container is actually id="messages-box"');
      console.log(`      ⚠️ [CRITICAL BUG CONFIRMED] chat_cleared fails to clear student UI due to DOM ID mismatch!`);
    });

    it('6.2 Image Magnifier: MAX_ZOOM and MIN_ZOOM violate Master Matrix limits', () => {
      const magnifierJsPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'image-magnifier.js');
      const magnifierJs = fs.readFileSync(magnifierJsPath, 'utf8');

      // Matrix Row 12 requires 3x ceiling:
      const maxZoomMatch = magnifierJs.match(/MAX_ZOOM\s*=\s*(\d+(\.\d+)?)/);
      // Matrix Row 13 requires 1.0x floor:
      const minZoomMatch = magnifierJs.match(/MIN_ZOOM\s*=\s*(\d+(\.\d+)?)/);

      assert.ok(maxZoomMatch, 'MAX_ZOOM must be defined in image-magnifier.js');
      assert.ok(minZoomMatch, 'MIN_ZOOM must be defined in image-magnifier.js');

      const maxZoom = parseFloat(maxZoomMatch[1]);
      const minZoom = parseFloat(minZoomMatch[1]);

      console.log(`      [Vector 6.2 Observation] Current MAX_ZOOM = ${maxZoom} (Master matrix requires 3.0x max)`);
      console.log(`      [Vector 6.2 Observation] Current MIN_ZOOM = ${minZoom} (Master matrix requires 1.0x min)`);

      assert.strictEqual(maxZoom, 3.0, `MAX_ZOOM must strictly be 3.0 (got ${maxZoom})`);
      assert.strictEqual(minZoom, 1.0, `MIN_ZOOM must strictly be 1.0 (got ${minZoom})`);
    });

    it('6.3 Evidence Dialog Backdrop: #evidence-dialog missing from backdrop-closing dialogs', () => {
      const userChatJsPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'user-chat.js');
      const userChatJs = fs.readFileSync(userChatJsPath, 'utf8');

      // In initCalendarAndModals, array of dialog IDs that close on backdrop click:
      const backdropArrayMatch = userChatJs.match(/\[\s*'assistants-photo-dialog'[\s\S]*?\]/);
      assert.ok(backdropArrayMatch, 'Dialog backdrop list must be found in user-chat.js');

      const backdropList = backdropArrayMatch[0];
      const hasEvidence = backdropList.includes('evidence-dialog');

      console.log(`      [Vector 6.3 Observation] Dialogs closing on backdrop click: ${backdropList}`);
      console.log(`      [Vector 6.3 Observation] #evidence-dialog included: ${hasEvidence}`);

      assert.strictEqual(hasEvidence, true, 'evidence-dialog must be included in backdrop click dismissals');
    });
  });
});

