import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrderPayload, reconcileCart, validateCheckout } from '../js/checkout-core.js';

const store = {
  products: [
    { code: 'A', name: 'A', available: true, effectivePrice: 100, photos: ['a.webp'], sauceCount: 1, sauces: ['X','Y'], variants: [] },
    { code: 'B', name: 'B', available: true, regularPrice: 200, photos: [], sauceCount: 0, variants: [{ value: 'XL', effectivePrice: 250 }] },
  ],
};

test('reconcileCart refreshes current prices from store and reports invalid configurations', () => {
  const ok = reconcileCart([
    { code: 'A', qty: 2, price: 1, sauces: ['X'] },
    { code: 'B', qty: 1, price: 1, variantValue: 'XL' },
  ], store);
  assert.equal(ok.errors.length, 0);
  assert.equal(ok.items[0].price, 100);
  assert.equal(ok.items[1].price, 250);
  assert.equal(ok.total, 450);
  const bad = reconcileCart([{ code: 'A', qty: 1, sauces: [] }], store);
  assert.equal(bad.errors.length, 1);
});

test('validateCheckout requires contact, valid phone, delivery/payment, branch when required and terms', () => {
  const form = { name: 'Тетяна', surname: 'Тест', phone: '+380631234567', deliveryCode: 'NOVA', paymentCode: 'IBAN', region: 'Рівненська', city: 'Млинів', branch: '1', termsAccepted: true };
  const method = { code: 'NOVA', requireRegion: true, requireCity: true, requireBranch: true, branchLabel: 'Відділення' };
  assert.equal(validateCheckout({ form, cart: [{ code: 'A' }], deliveryMethod: method }), '');
  assert.match(validateCheckout({ form: { ...form, phone: '123' }, cart: [{ code: 'A' }], deliveryMethod: method }), /номер телефону/i);
  assert.match(validateCheckout({ form: { ...form, branch: '' }, cart: [{ code: 'A' }], deliveryMethod: method }), /Відділення/);
});

test('createOrderPayload preserves existing Apps Script contract and adds attribution fields', () => {
  const payload = createOrderPayload({
    requestId: 'R1', source: 'V3',
    form: { name: 'Тетяна', surname: 'Тест', phone: '+380631234567', region: 'Рівненська', city: 'Млинів', deliveryCode: 'PICKUP', branch: '', paymentCode: 'CASH_PICKUP', desiredDate: '', isGift: false, certificateCode: '', comment: '', termsAccepted: true },
    cart: [{ code: 'A', qty: 2, variantValue: '', sauces: ['X'] }],
    attribution: { first: { source: 'instagram', medium: 'social' }, current: { source: 'google', medium: 'organic', campaign: 'x', content: '', term: '', landingPage: '/catalog', referrer: 'https://google.com', sessionId: 's1' } },
    device: 'mobile',
  });
  assert.equal(payload.requestId, 'R1');
  assert.equal(payload.customer.name, 'Тетяна');
  assert.equal(payload.items[0].quantity, 2);
  assert.equal(payload.utm_source, 'google');
  assert.equal(payload.first_touch_source, 'instagram');
  assert.equal(payload.device, 'mobile');
});
