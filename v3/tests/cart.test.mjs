import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addCartItem,
  cartCount,
  cartSubtotal,
  cartStorageKey,
  normalizeCart,
  removeCartItem,
  updateCartQuantity,
} from '../js/cart.js';

test('preview cart storage key is isolated from production cart', () => {
  assert.equal(cartStorageKey('/tochka-hruskotu-shop/v3/'), 'tochka_hruskotu_cart_v3_preview');
  assert.equal(cartStorageKey('/tochka-hruskotu-shop/'), 'tochka_hruskotu_cart_v3');
});

test('addCartItem merges same product configuration and preserves distinct variants', () => {
  let cart = [];
  cart = addCartItem(cart, { code: 'A', qty: 1, variantValue: '100 г', sauces: ['Шоколад'], price: 100 });
  cart = addCartItem(cart, { code: 'a', qty: 2, variantValue: '100 г', sauces: ['Шоколад'], price: 100 });
  cart = addCartItem(cart, { code: 'A', qty: 1, variantValue: '200 г', sauces: ['Шоколад'], price: 180 });
  assert.equal(cart.length, 2);
  assert.equal(cart[0].qty, 3);
  assert.equal(cart[1].qty, 1);
});

test('cart totals use normalized positive quantities and numeric snapshot prices', () => {
  const cart = normalizeCart([
    { code: 'A', qty: 2, price: '100' },
    { code: 'B', qty: 3, price: 50 },
  ]);
  assert.equal(cartCount(cart), 5);
  assert.equal(cartSubtotal(cart), 350);
});

test('quantity update removes zero quantity and explicit remove removes matching line', () => {
  const original = normalizeCart([
    { code: 'A', qty: 2, variantValue: 'x', price: 10 },
    { code: 'B', qty: 1, price: 20 },
  ]);
  const afterZero = updateCartQuantity(original, original[0].key, 0);
  assert.equal(afterZero.length, 1);
  assert.equal(afterZero[0].code, 'B');
  assert.deepEqual(removeCartItem(afterZero, afterZero[0].key), []);
});
