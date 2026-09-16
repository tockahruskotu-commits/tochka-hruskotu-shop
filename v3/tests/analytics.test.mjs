import test from 'node:test';
import assert from 'node:assert/strict';
import { captureAttribution, readAttribution } from '../js/analytics.js';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
  };
}

test('captureAttribution stores current UTM and preserves the first touch', () => {
  const storage = memoryStorage();
  captureAttribution({
    href: 'https://example.test/?utm_source=instagram&utm_medium=social&utm_campaign=launch',
    referrer: 'https://instagram.com/',
    storage,
    now: () => 100,
    sessionId: 's1',
  });
  captureAttribution({
    href: 'https://example.test/?utm_source=google&utm_medium=organic',
    referrer: 'https://google.com/',
    storage,
    now: () => 200,
    sessionId: 's2',
  });
  const data = readAttribution({ storage });
  assert.equal(data.first.source, 'instagram');
  assert.equal(data.current.source, 'google');
  assert.equal(data.current.medium, 'organic');
  assert.equal(data.current.sessionId, 's2');
});
