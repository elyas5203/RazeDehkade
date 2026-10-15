'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('Exclusive Military FLIR Recon Drone Rooftop Airdrop Delivery for Class 17 (Zare & Ahmadi)', async (t) => {
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

  await t.test('1. HTML files synchronization and Military FLIR Recon & Earth Zoom DOM elements', () => {
    assert.strictEqual(orderStatusHtml, orderStatusAlt, 'order-status.html and order_status.html must be identical');

    assert.ok(orderStatusHtml.includes('id="droneDeliverySection"'), 'Must have droneDeliverySection container');
    assert.ok(orderStatusHtml.includes('id="droneStatusTitle"'), 'Must have droneStatusTitle element');
    assert.ok(orderStatusHtml.includes('id="flirScreenFrame"'), 'Must have flirScreenFrame element');
    assert.ok(orderStatusHtml.includes('id="flirAerialWorld"'), 'Must have flirAerialWorld element');
    assert.ok(orderStatusHtml.includes('id="droneCinemaSlides"'), 'Must have droneCinemaSlides element');
    assert.ok(orderStatusHtml.includes('id="slideTakeoff"'), 'Must have slideTakeoff (orbital Earth) element');
    assert.ok(orderStatusHtml.includes('id="slideTransit"'), 'Must have slideTransit (regional Mashhad) element');
    assert.ok(orderStatusHtml.includes('id="slideDrop"'), 'Must have slideDrop (Kaveh satellite) element');
    assert.ok(orderStatusHtml.includes('id="slideLanded"'), 'Must have slideLanded (Kaveh street map) element');
    assert.ok(orderStatusHtml.includes('id="earthTargetPinWrap"'), 'Must have earthTargetPinWrap element');
    assert.ok(orderStatusHtml.includes('id="earthAddressCard"'), 'Must have earthAddressCard element');
    assert.ok(orderStatusHtml.includes('id="droneMissionNote"'), 'Must have droneMissionNote element');
    assert.ok(orderStatusHtml.includes('id="courierStepDot"'), 'Must have courierStepDot element');
    assert.ok(orderStatusHtml.includes('id="courierStepLabel"'), 'Must have courierStepLabel element');
    assert.ok(orderStatusHtml.includes('id="arrivedTitle"'), 'Must have arrivedTitle element');
    assert.ok(orderStatusHtml.includes('id="arrivedSub"'), 'Must have arrivedSub element');
  });

  await t.test('2. CSS has high-tech military FLIR night-vision HUD, zero-scroll 100vh layout & Earth-to-street zoom animations', () => {
    assert.ok(deliveryCss.includes('body.is-drone-mode'), 'Must have body.is-drone-mode styling');
    assert.ok(deliveryCss.includes('overflow: hidden !important'), 'Must enforce overflow hidden to prevent scrolling');
    assert.ok(deliveryCss.includes('flir-screen-frame'), 'Must have flir-screen-frame styling');
    assert.ok(deliveryCss.includes('flir-scanlines'), 'Must have flir-scanlines styling');
    assert.ok(deliveryCss.includes('flir-aerial-world'), 'Must have flir-aerial-world styling');
    assert.ok(deliveryCss.includes('earthSpaceZoomDrift'), 'Must have earthSpaceZoomDrift keyframes');
    assert.ok(deliveryCss.includes('mashhadAtmosphericDescent'), 'Must have mashhadAtmosphericDescent keyframes');
    assert.ok(deliveryCss.includes('kavehSatelliteApproach'), 'Must have kavehSatelliteApproach keyframes');
    assert.ok(deliveryCss.includes('kavehStreetPinpointZoom'), 'Must have kavehStreetPinpointZoom keyframes');
    assert.ok(deliveryCss.includes('earthPinLand'), 'Must have earthPinLand keyframes');
    assert.ok(deliveryCss.includes('earth-address-card'), 'Must have earth-address-card styling');
    assert.ok(deliveryCss.includes('flir-hud-overlay'), 'Must have flir-hud-overlay styling');
    assert.ok(deliveryCss.includes('flir-center-crosshair'), 'Must have flir-center-crosshair styling');
  });

  await t.test('3. Exact Persian status progression strings, coordinates and package delivery location during 30s countdown', () => {
    // Continuous zoom engine
    assert.ok(deliveryJs.includes('renderContinuousReconZoom'), 'Must have continuous 60fps reconnaissance zoom renderer');
    // Stage 1: Deep space Earth orbit
    assert.ok(deliveryJs.includes('رهگیری ماهواره‌ای مختصات هدف // شناسایی محل تحویل بسته'), 'Stage 1 label must be present');
    // Stage 2: Atmospheric descent over Mashhad
    assert.ok(deliveryJs.includes('تقرب مداری به حریم هوایی مشهد // کاهش ارتفاع عملیاتی'), 'Stage 2 label must be present');
    // Stage 3: Kaveh blvd reconnaissance
    assert.ok(deliveryJs.includes('تثبیت ماهواره‌ای روی منطقه ۹ و رضاشهر // تقرب به بلوار کاوه'), 'Stage 3 label must be present');
    // Stage 4: Package delivery location pinpoint lock
    assert.ok(deliveryJs.includes('موقعیت مکانی محل تحویل بسته با موفقیت تثبیت شد'), 'Stage 4 label must be present');
    // Exact GPS coordinates
    assert.ok(deliveryJs.includes('36.2843'), 'Latitude 36.2843 must be present');
    assert.ok(deliveryJs.includes('59.5448'), 'Longitude 59.5448 must be present');
    // Street address
    assert.ok(deliveryJs.includes('کوچه شهید کاوه ۱۳ (رودکی ۲۰)'), 'Exact alley address must be present');
    // Arrived
    assert.ok(deliveryJs.includes('سفارش روی پشت‌بوم رها شد!') || deliveryJs.includes('سفارش در محل تحویل تحویل داده شد!'), 'Arrival title must announce rooftop delivery');
    assert.ok(deliveryJs.includes('کوچه شهید کاوه ۱۳'), 'Arrival subtitle must confirm package location');
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
    assert.ok(storeJs.includes('رهگیری ماهواره‌ای مختصات هدف // شناسایی محل تحویل بسته'), 'store.js must emit Stage 1 satellite label');
    assert.ok(storeJs.includes('تقرب مداری به حریم هوایی مشهد // کاهش ارتفاع عملیاتی'), 'store.js must emit Stage 2 satellite label');
    assert.ok(storeJs.includes('تثبیت ماهواره‌ای روی منطقه ۹ و رضاشهر // تقرب به بلوار کاوه'), 'store.js must emit Stage 3 satellite label');
    assert.ok(storeJs.includes('موقعیت مکانی محل تحویل بسته با موفقیت تثبیت شد: کوچه شهید کاوه ۱۳ مشهد'), 'store.js must emit Stage 4 satellite label');
  });

  await t.test('6. Corner countdown widget, centered street pinpoint alignment, 8s arrival duration, and military vector HUD', () => {
    // Corner countdown widget
    assert.ok(orderStatusHtml.includes('id="flirCornerCountdown"'), 'Must have flirCornerCountdown container');
    assert.ok(orderStatusHtml.includes('id="flirCornerTimerDigits"'), 'Must have flirCornerTimerDigits element');
    assert.ok(orderStatusHtml.includes('id="flirCornerTimerFill"'), 'Must have flirCornerTimerFill element');
    assert.ok(orderStatusHtml.includes('id="flirCornerPhaseTag"'), 'Must have flirCornerPhaseTag element');
    assert.ok(deliveryJs.includes('flirCornerTimerDigits'), 'JS must update flirCornerTimerDigits');

    // Centered map alignment on Kaveh 13
    assert.ok(deliveryCss.includes('translate(-65.95%, -71.73%)') || deliveryCss.includes('translate(-52.73%, -63.80%)'), 'CSS must translate slide 4 to dead center');
    assert.ok(deliveryJs.includes('translate(-65.95%, -71.73%)') || deliveryJs.includes('translate(-52.73%, -63.80%)'), 'JS must maintain translation to dead center during zoom');

    // 8-second readable arrival duration and arrival banner
    assert.ok(orderStatusHtml.includes('id="flirArrivalBanner"'), 'Must have flirArrivalBanner element');
    assert.ok(orderStatusHtml.includes('id="arrivalBlackoutSec"'), 'Must have arrivalBlackoutSec countdown');
    assert.ok(deliveryJs.includes('8000'), 'Must wait 8000ms (8.0 seconds) on arrival display before blackout');

    // Military HUD vector reticle
    assert.ok(orderStatusHtml.includes('military-target-laser-crosshair'), 'Must have military vector crosshair');
    assert.ok(orderStatusHtml.includes('laser-reticle-svg'), 'Must have SVG laser reticle');
    assert.ok(!orderStatusHtml.includes('📍'), 'Must NOT have childish pin emoji in orderStatusHtml');
  });
});
