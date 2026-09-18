import test from 'node:test';
import assert from 'node:assert/strict';
import { chosenPrice, normalizeSauceSelection, relatedProducts } from '../js/product-core.js';

const product = { code: 'A', categoryCode: 'CAT', effectivePrice: 100, variants: [{ value: '200 г', effectivePrice: 180 }] };

test('chosenPrice uses selected variant price and falls back to product price', () => {
  assert.equal(chosenPrice(product, '200 г'), 180);
  assert.equal(chosenPrice(product, ''), 100);
});

test('normalizeSauceSelection de-duplicates and enforces included sauce count', () => {
  assert.deepEqual(normalizeSauceSelection(['A', 'A', 'B', 'C'], 2), ['A', 'B']);
  assert.deepEqual(normalizeSauceSelection(['A'], 0), []);
});

test('relatedProducts honors explicit related codes then category fallback without current product', () => {
  const all = [
    { code: 'A', categoryCode: 'CAT', available: true },
    { code: 'B', categoryCode: 'OTHER', available: true },
    { code: 'C', categoryCode: 'CAT', available: true },
  ];
  assert.deepEqual(relatedProducts({ ...product, relatedProductCodes: ['B'] }, all).map((p) => p.code), ['B', 'C']);
});
