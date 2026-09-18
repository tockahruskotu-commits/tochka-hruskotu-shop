import test from 'node:test';
import assert from 'node:assert/strict';
import { SECRET_LANGUAGE, secretFor } from '../js/secret-language.js';

test('approved secret-language preview covers all 60 current catalog SKUs', () => {
  assert.equal(Object.keys(SECRET_LANGUAGE).length, 60);
});

test('secret menu covers both affection and difficult conversation', () => {
  assert.equal(secretFor('DONUT-VANILLA-STRAWBERRY').title, 'Ти мені подобаєшся');
  assert.equal(secretFor('AIRY-BAG').title, 'Нам краще розійтися');
  assert.equal(secretFor('SAUCE-CHOCO').type, 'Підсилювач');
});
