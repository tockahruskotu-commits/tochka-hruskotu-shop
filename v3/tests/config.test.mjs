import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIG,
  detectAppBasePath,
  appUrl,
  rootUrl,
  isPreview,
  mediaUrl,
  productionUrl,
} from '../js/config.js';

test('preview path is detected inside /v3/', () => {
  assert.equal(
    detectAppBasePath('/tochka-hruskotu-shop/v3/catalog.html'),
    '/tochka-hruskotu-shop/v3/',
  );
  assert.equal(isPreview('/tochka-hruskotu-shop/v3/'), true);
});

test('production path is detected outside /v3/', () => {
  assert.equal(
    detectAppBasePath('/tochka-hruskotu-shop/catalog.html'),
    '/tochka-hruskotu-shop/',
  );
  assert.equal(isPreview('/tochka-hruskotu-shop/catalog.html'), false);
});

test('appUrl follows preview or production app base without duplicate slashes', () => {
  assert.equal(
    appUrl('/catalog.html', '/tochka-hruskotu-shop/v3/index.html'),
    '/tochka-hruskotu-shop/v3/catalog.html',
  );
  assert.equal(
    appUrl('catalog.html', '/tochka-hruskotu-shop/index.html'),
    '/tochka-hruskotu-shop/catalog.html',
  );
});

test('rootUrl always targets stable repository root for assets and protected service pages', () => {
  assert.equal(
    rootUrl('/images/logo.webp'),
    '/tochka-hruskotu-shop/images/logo.webp',
  );
  assert.equal(
    rootUrl('tiktok-callback.html'),
    '/tochka-hruskotu-shop/tiktok-callback.html',
  );
});

test('central config keeps stable public identity and deliberately disables analytics in foundation stage', () => {
  assert.equal(CONFIG.business.name, 'Точка Хрускоту');
  assert.equal(CONFIG.business.pickup.locality, 'Млинів');
  assert.equal(CONFIG.api.store.includes('script.google.com/macros/s/'), true);
  assert.equal(CONFIG.analytics.enabled, false);
  assert.equal(CONFIG.analytics.measurementId, null);
  assert.equal(CONFIG.social.tiktok, 'https://www.tiktok.com/@tockahruskotu');
  assert.equal(CONFIG.social.youtube, 'https://www.youtube.com/@ТочкаХрускоту');
});


test('mediaUrl keeps absolute media and points relative API media to stable repository assets', () => {
  assert.equal(mediaUrl('images/products/x.webp'), '/tochka-hruskotu-shop/images/products/x.webp');
  assert.equal(mediaUrl('../images/site/a.webp'), '/tochka-hruskotu-shop/images/site/a.webp');
  assert.equal(mediaUrl('https://cdn.example/a.webp'), 'https://cdn.example/a.webp');
});


test('productionUrl builds the final QR-root absolute URL', () => {
  assert.equal(productionUrl('product.html'), 'https://tockahruskotu-commits.github.io/tochka-hruskotu-shop/product.html');
});
