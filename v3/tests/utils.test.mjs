import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, clamp } from '../js/utils.js';

test('escapeHtml neutralizes markup characters from API content', () => {
  assert.equal(escapeHtml('<img src=x onerror=1> & "x"'), '&lt;img src=x onerror=1&gt; &amp; &quot;x&quot;');
});

test('clamp bounds numeric values', () => {
  assert.equal(clamp(9, 1, 5), 5);
  assert.equal(clamp(-1, 1, 5), 1);
});
