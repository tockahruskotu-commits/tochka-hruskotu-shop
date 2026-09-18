import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrderPayload, reconcileCart, splitFullName, validateCheckout } from '../js/checkout-core.js';

const store = { products: [
  { code: 'A', name: 'A', available: true, effectivePrice: 100, photos: ['a.webp'], sauceCount: 1, sauces: ['X','Y'], variants: [] },
  { code: 'B', name: 'B', available: true, regularPrice: 200, photos: [], sauceCount: 0, variants: [{ value: 'XL', effectivePrice: 250 }] },
] };

test('reconcileCart refreshes current prices and preserves secret metadata', () => {
  const ok = reconcileCart([{ code: 'A', qty: 2, price: 1, sauces: ['X'], messageMode: 'secret', secretTitle: 'Сумую' },{ code: 'B', qty: 1, price: 1, variantValue: 'XL' }], store);
  assert.equal(ok.errors.length, 0); assert.equal(ok.items[0].price, 100); assert.equal(ok.items[0].secretTitle, 'Сумую'); assert.equal(ok.items[1].price, 250); assert.equal(ok.total, 450);
  assert.equal(reconcileCart([{ code: 'A', qty: 1, sauces: [] }], store).errors.length, 1);
});

test('splitFullName keeps surname separate and the rest in name field', () => {
  assert.deepEqual(splitFullName('Твардовська Тетяна Миколаївна'), { surname: 'Твардовська', name: 'Тетяна Миколаївна' });
});

test('validateCheckout requires full name, phone, recipient when needed, delivery/payment and terms', () => {
  const form = { fullName: 'Твардовська Тетяна Миколаївна', phone: '+380631234567', email: '', recipientMode: 'self', deliveryCode: 'NOVA', paymentCode: 'IBAN', region: 'Рівненська', city: 'Млинів', branch: '1', termsAccepted: true, signatureMode: 'named' };
  const method = { code: 'NOVA', requireRegion: true, requireCity: true, requireBranch: true, branchLabel: 'Відділення' };
  assert.equal(validateCheckout({ form, cart: [{ code: 'A' }], deliveryMethod: method }), '');
  assert.match(validateCheckout({ form: { ...form, phone: '123' }, cart: [{ code: 'A' }], deliveryMethod: method }), /номер телефону/i);
  assert.match(validateCheckout({ form: { ...form, branch: '' }, cart: [{ code: 'A' }], deliveryMethod: method }), /Відділення/);
  assert.match(validateCheckout({ form: { ...form, recipientMode: 'other', recipientName: '', recipientPhone: '' }, cart: [{ code: 'A' }], deliveryMethod: method }), /отримувача/i);
});

test('createOrderPayload keeps Apps Script fields and adds recipient/secret metadata', () => {
  const payload = createOrderPayload({ requestId: 'R1', source: 'V3', form: { fullName: 'Твардовська Тетяна Миколаївна', phone: '+380631234567', email: 'x@example.com', recipientMode: 'other', recipientName: 'Іваненко Марія', recipientPhone: '+380671234567', region: 'Рівненська', city: 'Млинів', deliveryCode: 'PICKUP', branch: '', paymentCode: 'CASH_PICKUP', desiredDate: '', isGift: false, hasCertificate: false, certificateCode: '', signatureMode: 'anonymous', hint: '', comment: '', termsAccepted: true }, cart: [{ code: 'A', qty: 2, variantValue: '', sauces: ['X'], messageMode: 'secret', secretTitle: 'Сумую', secretSection: 'Сумую / думаю про тебе' }], attribution: { first: { source: 'instagram', medium: 'social' }, current: { source: 'google', medium: 'organic', campaign: 'x', content: '', term: '', landingPage: '/catalog', referrer: 'https://google.com', sessionId: 's1' } }, device: 'mobile' });
  assert.equal(payload.requestId, 'R1'); assert.equal(payload.customer.name, 'Тетяна Миколаївна'); assert.equal(payload.customer.surname, 'Твардовська'); assert.equal(payload.recipient.name, 'Іваненко Марія'); assert.equal(payload.items[0].quantity, 2); assert.equal(payload.items[0].secretMeaning, 'Сумую'); assert.equal(payload.secretMessage.enabled, true); assert.equal(payload.utm_source, 'google'); assert.equal(payload.first_touch_source, 'instagram'); assert.equal(payload.device, 'mobile');
});
