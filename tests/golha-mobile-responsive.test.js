/**
 * tests/golha-mobile-responsive.test.js
 * تست‌های جامع اعتبارسنجی معماری ریسپانسیو موبایل صفحات گل‌فروشی (Golha Mobile Responsive Engine)
 * منطبق بر استانداردهای UMAC-P و سند مستر ۱۰ (MASTER_FLOWER_STORE_MOBILE_RESPONSIVE.md)
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const golhaDir = path.join(rootDir, 'public', 'golha');

test('Golha Flower Store Mobile Responsive Engine (MASTER-10)', async (t) => {

  await t.test('1. Architecture & Links: All store pages link golha-mobile.css and contain valid mobile viewport meta', () => {
    const pages = ['index.html', 'checkout.html', 'order-status.html', 'order_status.html'];
    
    for (const pageName of pages) {
      const filePath = path.join(golhaDir, pageName);
      assert.ok(fs.existsSync(filePath), `${pageName} must exist`);
      const content = fs.readFileSync(filePath, 'utf8');

      // Viewport meta tag
      assert.match(content, /<meta\s+name=["']viewport["']\s+content=["'][^"']*width=device-width[^"']*["']/i,
        `${pageName} must contain mobile viewport meta tag`);

      // Link to golha-mobile.css
      assert.match(content, /href=["'][^"']*golha-mobile\.css[^"']*["']/i,
        `${pageName} must link golha-mobile.css`);
    }
  });

  await t.test('2. Invariants & Prohibitions: Strictly Rials, no Toman, exact 5 factor items preserved', () => {
    const indexPath = path.join(golhaDir, 'index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf8');
    const checkoutPath = path.join(golhaDir, 'checkout.html');
    const checkoutHtml = fs.readFileSync(checkoutPath, 'utf8');

    // Strict currency: Rials only, no Toman
    assert.doesNotMatch(indexHtml, /تومان/, 'index.html must NOT contain the word Toman');
    assert.doesNotMatch(checkoutHtml, /تومان/, 'checkout.html must NOT contain the word Toman');

    // 5 required factor items
    assert.match(checkoutHtml, /REQUIRED_INVOICE_IDS\s*=\s*\[1,\s*2,\s*3,\s*4,\s*5\]/,
      'checkout.html must preserve exact 5 factor item IDs');
  });

  await t.test('3. CSS Breakpoints Hierarchy: 992px, 768px, 480px, and 360px rules defined in golha-mobile.css', () => {
    const cssPath = path.join(golhaDir, 'assets', 'css', 'golha-mobile.css');
    assert.ok(fs.existsSync(cssPath), 'golha-mobile.css must exist');
    const css = fs.readFileSync(cssPath, 'utf8');

    // Horizontal overflow guard
    assert.match(css, /html,\s*body\s*\{[^}]*max-width:\s*100vw;[^}]*overflow-x:\s*hidden;/s,
      'golha-mobile.css must guard against horizontal overflow');

    // iOS font-size 16px input guard to prevent auto-zoom
    assert.match(css, /font-size:\s*16px\s*!important;/,
      'Inputs must have 16px font-size on mobile to prevent iOS auto-zoom');

    // Breakpoint queries
    assert.match(css, /@media\s*\(\s*max-width:\s*992px\s*\)/, 'Must define <=992px breakpoint');
    assert.match(css, /@media\s*\(\s*max-width:\s*768px\s*\)/, 'Must define <=768px breakpoint');
    assert.match(css, /@media\s*\(\s*max-width:\s*480px\s*\)/, 'Must define <=480px breakpoint');
    assert.match(css, /@media\s*\(\s*max-width:\s*360px\s*\)/, 'Must define <=360px breakpoint');
  });

  await t.test('4. Catalog & Hero Mobile Optimization: Fluid typography, touch stepper & full-width drawer', () => {
    const cssPath = path.join(golhaDir, 'assets', 'css', 'golha-mobile.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // Fluid brand logo and hero headline
    assert.match(css, /\.brand-logo\s*\{[^}]*font-size:\s*clamp/s, 'Brand logo must use fluid clamp typography');
    assert.match(css, /\.hero-banner\s+h1\s*\{[^}]*font-size:\s*clamp/s, 'Hero headline must use fluid clamp typography');

    // Stepper touch targets (min 36px)
    assert.match(css, /\.qty-btn\s*\{[^}]*width:\s*36px\s*!important;[^}]*height:\s*36px\s*!important;/s,
      'Quantity buttons must have minimum 36px touch targets on mobile');

    // Drawer 100vw on phones
    assert.match(css, /\.cart-drawer\s*\{[^}]*width:\s*100vw\s*!important;/s,
      'Cart drawer must be full width on phones <=480px');

    // Floating cart button safe-area support
    assert.match(css, /\.floating-cart-btn\s*\{[^}]*bottom:\s*max\(/s,
      'Floating cart button must support safe-area-inset-bottom');
  });

  await t.test('5. Checkout & Order Status Mobile Ergonomics: Form inputs, stepper line & drone view scaling', () => {
    const cssPath = path.join(golhaDir, 'assets', 'css', 'golha-mobile.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // Checkout container padding and discount button wrapping
    assert.match(css, /\.checkout-container\s*\{[^}]*padding:\s*18px\s*12px\s*!important;/s,
      'Checkout container must have compact padding on mobile phones');
    assert.match(css, /\.checkout-discount-row\s*\{[^}]*flex-wrap:\s*wrap\s*!important;/s,
      'Discount code row must wrap cleanly on narrow screens');

    // Delivery stepper mobile dots & labels
    assert.match(css, /\.delivery-stepper\s*\{[^}]*margin-bottom:\s*20px\s*!important;/s,
      'Delivery stepper must have scaled margins on mobile');
    assert.match(css, /\.step-dot\s*\{[^}]*width:\s*24px\s*!important;/s,
      'Step dots must scale down on phones');

    // Drone Class 17 FLIR header responsive wrap
    assert.match(css, /\.flir-status-header\s*\{[^}]*flex-wrap:\s*wrap\s*!important;/s,
      'FLIR header must wrap cleanly without horizontal overflow');
  });
});
