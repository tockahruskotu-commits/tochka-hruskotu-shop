import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFooterMarkup, buildHeaderMarkup } from '../js/ui.js';

test('header contains core V3 navigation and cart hooks', () => {
  const html = buildHeaderMarkup('catalog', '/tochka-hruskotu-shop/v3/catalog.html');
  assert.match(html, /Каталог/);
  assert.match(html, /Подарунки/);
  assert.match(html, /data-cart-open/);
  assert.match(html, /aria-current="page"/);
});

test('footer always keeps TikTok and YouTube public links and legal pages', () => {
  const html = buildFooterMarkup('/tochka-hruskotu-shop/v3/');
  assert.match(html, /tiktok\.com\/@tockahruskotu/);
  assert.match(html, /youtube\.com\/@ТочкаХрускоту/);
  assert.match(html, /privacy\.html/);
  assert.match(html, /terms\.html/);
});
