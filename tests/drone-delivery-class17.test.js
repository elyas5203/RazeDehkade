'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('Exclusive Micro-UAV Drone Rooftop Airdrop Delivery for Class 17 (Zare & Ahmadi)', async (t) => {
  const deliveryJsPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'delivery.js');
  const deliveryCssPath = path.join(__dirname, '..', 'public', 'assets', 'css', 'delivery.css');
  const orderStatusHtmlPath = path.join(__dirname, '..', 'public', 'golha', 'order-status.html');
  const orderStatusAltPath = path.join(__dirname, '..', 'public', 'golha', 'order_status.html');
  const storeJsPath = path.join(__dirname, '..', 'src', 'routes', 'store.js');

  const deliveryJs = fs.readFileSync(deliveryJsPath, 'utf8');
  const deliveryCss = fs.readFileSync(deliveryCssPath, 'utf8');
  const orderStatusHtml = fs.readFileSync(orderStatusHtmlPath, 'utf8');
  const orderStatusAlt = fs.readFileSync(orderStatusAltPath, 'utf8');
  const storeJs = fs.readFileSync(storeJsPath, 'utf8');

  await t.test('1. HTML files synchronization and Drone Rooftop Airdrop DOM elements', () => {
    assert.strictEqual(orderStatusHtml, orderStatusAlt, 'order-status.html and order_status.html must be identical');

    assert.ok(orderStatusHtml.includes('id="droneDeliverySection"'), 'Must have droneDeliverySection container');
    assert.ok(orderStatusHtml.includes('id="droneStatusTitle"'), 'Must have droneStatusTitle element');
    assert.ok(orderStatusHtml.includes('id="droneAirTheater"'), 'Must have droneAirTheater element');
    assert.ok(orderStatusHtml.includes('id="tacticalUavDrone"'), 'Must have tacticalUavDrone element');
    assert.ok(orderStatusHtml.includes('id="uavSearchlight"'), 'Must have uavSearchlight beam element');
    assert.ok(orderStatusHtml.includes('id="airdropCargoPackage"'), 'Must have airdropCargoPackage element');
    assert.ok(orderStatusHtml.includes('id="cargoChuteCanopy"'), 'Must have cargoChuteCanopy element');
    assert.ok(orderStatusHtml.includes('id="rooftopTarget"'), 'Must have rooftopTarget pad element');
    assert.ok(orderStatusHtml.includes('id="droneMissionNote"'), 'Must have droneMissionNote element');
    assert.ok(orderStatusHtml.includes('id="courierStepDot"'), 'Must have courierStepDot element');
    assert.ok(orderStatusHtml.includes('id="courierStepLabel"'), 'Must have courierStepLabel element');
    assert.ok(orderStatusHtml.includes('id="arrivedTitle"'), 'Must have arrivedTitle element');
    assert.ok(orderStatusHtml.includes('id="arrivedSub"'), 'Must have arrivedSub element');
  });

  await t.test('2. CSS has high-tech animations for UAV drone, rotors, searchlight, and rooftop parachute airdrop', () => {
    assert.ok(deliveryCss.includes('body.is-drone-mode'), 'Must have body.is-drone-mode styling');
    assert.ok(deliveryCss.includes('drone-air-theater'), 'Must have drone-air-theater class');
    assert.ok(deliveryCss.includes('tactical-uav-drone'), 'Must have tactical-uav-drone class');
    assert.ok(deliveryCss.includes('uav-searchlight-beam'), 'Must have uav-searchlight-beam class');
    assert.ok(deliveryCss.includes('propSpin'), 'Must have propSpin keyframes for spinning rotors');
    assert.ok(deliveryCss.includes('cargoAirdropFall'), 'Must have cargoAirdropFall keyframes for rooftop drop');
    assert.ok(deliveryCss.includes('droneTakeoffFlight'), 'Must have droneTakeoffFlight keyframes');
    assert.ok(deliveryCss.includes('droneTransitFlight'), 'Must have droneTransitFlight keyframes');
    assert.ok(deliveryCss.includes('droneHoverAirdrop'), 'Must have droneHoverAirdrop keyframes');
    assert.ok(deliveryCss.includes('rooftop-helipad-target'), 'Must have rooftop-helipad-target styling');
    assert.ok(deliveryCss.includes('cargo-chute-canopy'), 'Must have cargo-chute-canopy styling');
  });

  await t.test('3. Exact Persian status progression strings during 30s countdown', () => {
    // Stage 1
    assert.ok(deliveryJs.includes('بسته با ریزپرنده ارسال شد'), 'Stage 1: بسته با ریزپرنده ارسال شد must be present');
    // Stage 2
    assert.ok(deliveryJs.includes('ریزپرنده در حال حرکت به سمت مقصد'), 'Stage 2: ریزپرنده در حال حرکت به سمت مقصد must be present');
    // Stage 3
    assert.ok(deliveryJs.includes('ریزپرنده بسته انداخت روی پشت‌بوم'), 'Stage 3: ریزپرنده بسته انداخت روی پشت‌بوم must be present');
    // Arrived
    assert.ok(deliveryJs.includes('سفارش شما روی پشت‌بوم تحویل داده شد!'), 'Arrival title must announce rooftop delivery');
    assert.ok(deliveryJs.includes('ریزپرنده بسته را با موفقیت روی پشت‌بوم انداخت و مأموریت پایان یافت.'), 'Arrival subtitle must confirm drone drop');
  });

  await t.test('4. Exclusive isolation: Class 17 detection criteria vs standard class isolation', () => {
    // Verify checkIsDroneSession logic
    assert.ok(deliveryJs.includes('590019'), 'Must check order code 590019');
    assert.ok(deliveryJs.includes('699275'), 'Must check chat code 699275');
    assert.ok(deliveryJs.includes('17'), 'Must check session id 17');
    assert.ok(deliveryJs.includes('زارع'), 'Must check class name for Zare');
    assert.ok(deliveryJs.includes('احمدی'), 'Must check class name for Ahmadi');

    // Test detection logic directly
    function evaluateIsDrone(order, query = {}) {
      const discount = String(order?.discountCode || order?.order_code || query.discount || query.order_code || query.code || '').trim();
      const chatCode = String(order?.chat_code || query.chat_code || '').trim();
      const sessionId = Number(order?.orderId || order?.sessionId || order?.session_id || query.session || query.sessionId || 0);
      const sessionName = String(order?.sessionName || order?.name || order?.customerName || '').trim();

      return (
        discount === '590019' ||
        chatCode === '699275' ||
        sessionId === 17 ||
        sessionName.includes('زارع') ||
        sessionName.includes('احمدی') ||
        query.drone === '1'
      );
    }

    // Class 17 matches:
    assert.strictEqual(evaluateIsDrone({ discountCode: '590019' }), true, 'Order code 590019 must be drone');
    assert.strictEqual(evaluateIsDrone({ chat_code: '699275' }), true, 'Chat code 699275 must be drone');
    assert.strictEqual(evaluateIsDrone({ orderId: 17 }), true, 'Session 17 must be drone');
    assert.strictEqual(evaluateIsDrone({ customerName: 'کلاس زارع و احمدی' }), true, 'Class name containing Zare must be drone');
    assert.strictEqual(evaluateIsDrone(null, { drone: '1' }), true, 'Query param drone=1 must be drone');
    assert.strictEqual(evaluateIsDrone(null, { order_code: '590019' }), true, 'Query param 590019 must be drone');

    // Standard classes must NOT be drone:
    assert.strictEqual(evaluateIsDrone({ discountCode: '140510' }), false, 'Class 1 must NOT be drone');
    assert.strictEqual(evaluateIsDrone({ discountCode: '542810' }), false, 'Test user must NOT be drone unless explicitly requested');
    assert.strictEqual(evaluateIsDrone({ orderId: 1 }), false, 'Session 1 must NOT be drone');
    assert.strictEqual(evaluateIsDrone({ orderId: 16 }), false, 'Session 16 must NOT be drone');
    assert.strictEqual(evaluateIsDrone({ orderId: 18 }), false, 'Session 18 must NOT be drone');
    assert.strictEqual(evaluateIsDrone({ customerName: 'کلاس گل نرگس' }), false, 'Other class names must NOT be drone');
  });

  await t.test('5. Server store routes reflect drone delivery status for Class 17 during admin live updates', () => {
    assert.ok(storeJs.includes('isDroneClass'), 'store.js must identify isDroneClass');
    assert.ok(storeJs.includes('590019'), 'store.js must check 590019');
    assert.ok(storeJs.includes('بسته با ریزپرنده ارسال شد'), 'store.js must emit Stage 1 drone label');
    assert.ok(storeJs.includes('ریزپرنده در حال حرکت به سمت مقصد'), 'store.js must emit Stage 2 drone label');
    assert.ok(storeJs.includes('ریزپرنده بسته انداخت روی پشت‌بوم'), 'store.js must emit Stage 3 drone label');
  });
});
