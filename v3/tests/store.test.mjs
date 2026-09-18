import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STORE_CACHE_KEY,
  findCategory,
  findProduct,
  loadStore,
  normalizeStore,
  readStoreCache,
  writeStoreCache,
} from '../js/store.js';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

const rawStore = {
  success: true,
  customTopLevel: 'keep-me',
  settings: { currency: 'грн' },
  categories: [{ code: ' edible-puzzles ', name: 'Пазли', active: 'Ні', order: '120', extra: 7 }],
  products: [{
    code: ' puzzle-kitties ',
    categoryCode: ' edible-puzzles;gift-sets ',
    name: 'Кицюні',
    regularPrice: '129',
    effectivePrice: '119.50',
    available: 'Так',
    photos: ['a.webp'],
    variants: [{ value: '100 г', regularPrice: '129', effectivePrice: '119.5' }],
    unknownProductField: 'keep',
  }],
  deliveryMethods: null,
};

test('normalizeStore preserves unknown data and normalizes known IDs, arrays, numbers and booleans', () => {
  const store = normalizeStore(rawStore);
  assert.equal(store.customTopLevel, 'keep-me');
  assert.equal(store.products[0].unknownProductField, 'keep');
  assert.equal(store.products[0].code, 'PUZZLE-KITTIES');
  assert.equal(store.products[0].categoryCode, 'EDIBLE-PUZZLES;GIFT-SETS');
  assert.deepEqual(store.products[0].categoryCodes, ['EDIBLE-PUZZLES','GIFT-SETS']);
  assert.equal(store.products[0].regularPrice, 129);
  assert.equal(store.products[0].effectivePrice, 119.5);
  assert.equal(store.products[0].available, true);
  assert.deepEqual(store.deliveryMethods, []);
  assert.equal(store.categories[0].code, 'EDIBLE-PUZZLES');
  assert.equal(store.categories[0].active, false);
  assert.equal(store.categories[0].order, 120);
});

test('findProduct and findCategory are case-insensitive and trim input', () => {
  const store = normalizeStore(rawStore);
  assert.equal(findProduct(store, ' puzzle-kitties ')?.name, 'Кицюні');
  assert.equal(findCategory(store, 'edible-puzzles')?.name, 'Пазли');
});

test('store cache round-trips normalized store and ignores malformed cache', () => {
  const storage = memoryStorage();
  const normalized = normalizeStore(rawStore);
  writeStoreCache(normalized, { storage, now: () => 100 });
  const cached = readStoreCache({ storage });
  assert.equal(cached.savedAt, 100);
  assert.equal(cached.data.products[0].code, 'PUZZLE-KITTIES');
  storage.setItem(STORE_CACHE_KEY, '{bad');
  assert.equal(readStoreCache({ storage }), null);
});

test('loadStore prefers fresh server data and caches it', async () => {
  const storage = memoryStorage();
  const result = await loadStore({
    fetchStoreImpl: async () => rawStore,
    storage,
    now: () => 500,
  });
  assert.equal(result.source, 'server');
  assert.equal(result.data.products[0].code, 'PUZZLE-KITTIES');
  assert.equal(readStoreCache({ storage }).savedAt, 500);
});

test('loadStore falls back to cached data when server fails', async () => {
  const storage = memoryStorage();
  writeStoreCache(normalizeStore(rawStore), { storage, now: () => 50 });
  const result = await loadStore({
    fetchStoreImpl: async () => { throw new Error('offline'); },
    storage,
  });
  assert.equal(result.source, 'cache');
  assert.equal(result.data.products[0].name, 'Кицюні');
  assert.equal(result.warning, null);
  assert.equal(result.revalidating, true);
});
