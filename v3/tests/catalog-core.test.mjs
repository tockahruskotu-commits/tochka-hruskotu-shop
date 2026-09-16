import test from 'node:test';
import assert from 'node:assert/strict';
import { filterProducts, sortProducts } from '../js/catalog-core.js';

const products = [
  { code: 'A', name: 'Ванільна фрі', categoryCode: 'FRIES', effectivePrice: 120, available: true, searchWords: 'ваніль хрумке' },
  { code: 'B', name: 'Шоколадна кицюня', categoryCode: 'PUZZLE', effectivePrice: 150, available: true, keywords: 'кіт шоколад' },
  { code: 'C', name: 'Недоступне', categoryCode: 'FRIES', effectivePrice: 90, available: false },
];

test('filterProducts hides unavailable products and filters by category', () => {
  assert.deepEqual(filterProducts(products, { category: 'FRIES' }).map((p) => p.code), ['A']);
});

test('filterProducts searches names and search metadata case-insensitively', () => {
  assert.deepEqual(filterProducts(products, { query: 'ШОКОЛАД' }).map((p) => p.code), ['B']);
  assert.deepEqual(filterProducts(products, { query: 'хрумке' }).map((p) => p.code), ['A']);
});

test('sortProducts sorts by price without mutating input', () => {
  const source = products.slice(0, 2);
  const sorted = sortProducts(source, 'price-desc');
  assert.deepEqual(sorted.map((p) => p.code), ['B', 'A']);
  assert.deepEqual(source.map((p) => p.code), ['A', 'B']);
});
