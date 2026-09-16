import { CONFIG, mediaUrl, productionUrl } from './config.js';
import { initAnalytics, track } from './analytics.js';
import { addProductToCart, initCartDrawer } from './cart-drawer.js';
import { chosenPrice, normalizeSauceSelection, relatedProducts } from './product-core.js';
import { buildProductCard, formatMoney } from './products-ui.js';
import { findProduct, loadStore } from './store.js';
import { mountSiteShell } from './ui.js';
import { clamp, escapeHtml } from './utils.js';

let store = null;
let product = null;
let selectedVariant = '';
let selectedSauces = [];
let quantity = 1;

function setMeta() {
  document.title = `${product.name} — ${CONFIG.business.name}`;
  const description = product.shortDescription || product.fullDescription || `Купити ${product.name} у Точці Хрускоту.`;
  let meta = document.querySelector('meta[name="description"]');
  if (meta) meta.content = description;
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
  canonical.href = `${productionUrl('product.html')}?code=${encodeURIComponent(product.code)}`;
}

function currentPrice() { return chosenPrice(product, selectedVariant); }

function renderGallery() {
  const main = document.querySelector('[data-product-main-image]');
  const thumbs = document.querySelector('[data-product-thumbs]');
  const photos = product.photos?.length ? product.photos : ['images/brand/logo.webp'];
  if (main) { main.src = mediaUrl(photos[0]); main.alt = product.name; }
  if (thumbs) thumbs.innerHTML = photos.map((photo, index) => `<button type="button" class="product-thumb${index === 0 ? ' is-active' : ''}" data-photo="${escapeHtml(photo)}"><img src="${escapeHtml(mediaUrl(photo))}" alt="" loading="lazy"></button>`).join('');
}

function renderVariants() {
  const group = document.querySelector('[data-variant-group]');
  const node = document.querySelector('[data-variant-options]');
  const variants = product.variants || [];
  if (!group || !node) return;
  group.hidden = !variants.length;
  if (!variants.length) { selectedVariant = ''; return; }
  if (!selectedVariant) selectedVariant = variants[0].value;
  node.innerHTML = variants.map((variant) => `<button type="button" class="choice-chip${variant.value === selectedVariant ? ' is-active' : ''}" data-variant="${escapeHtml(variant.value)}">${escapeHtml(variant.value)} · ${formatMoney(variant.effectivePrice || variant.regularPrice, store?.settings?.currency || 'грн')}</button>`).join('');
}

function renderSauces() {
  const group = document.querySelector('[data-sauce-group]');
  const node = document.querySelector('[data-sauce-options]');
  const help = document.querySelector('[data-sauce-help]');
  const sauces = Array.isArray(product.sauces) ? product.sauces : [];
  const count = Math.max(0, Number(product.sauceCount || 0));
  if (!group || !node) return;
  group.hidden = !count || !sauces.length;
  if (!count || !sauces.length) { selectedSauces = []; return; }
  if (help) help.textContent = count === 1 ? 'Оберіть 1 соус — він входить у комплект.' : `Оберіть ${count} соуси — вони входять у комплект.`;
  node.innerHTML = sauces.map((sauce) => {
    const value = typeof sauce === 'string' ? sauce : sauce?.name || sauce?.value || '';
    return `<button type="button" class="choice-chip${selectedSauces.includes(value) ? ' is-active' : ''}" data-sauce="${escapeHtml(value)}">${escapeHtml(value)}</button>`;
  }).join('');
}

function renderPrice() {
  const node = document.querySelector('[data-product-price]');
  if (node) node.textContent = formatMoney(currentPrice(), store?.settings?.currency || 'грн');
}

function renderDetails() {
  document.querySelector('[data-product-name]').textContent = product.name;
  const desc = document.querySelector('[data-product-description]'); if (desc) desc.textContent = product.fullDescription || product.shortDescription || '';
  const short = document.querySelector('[data-product-short]'); if (short) short.textContent = product.shortDescription || '';
  const weight = document.querySelector('[data-product-weight]'); if (weight) { weight.textContent = product.weight || ''; weight.hidden = !product.weight; }
  const badges = document.querySelector('[data-product-badges]');
  if (badges) badges.innerHTML = [product.isNew ? 'Новинка' : '', product.saleActive ? 'Акція' : '', product.badge || ''].filter(Boolean).map((item) => `<span>${escapeHtml(item)}</span>`).join('');
  const details = [
    ['Склад', product.ingredients], ['Алергени', product.allergens], ['Термін придатності', product.shelfLife], ['Умови зберігання', product.storage],
  ].filter(([, value]) => value);
  const node = document.querySelector('[data-product-details]');
  if (node) node.innerHTML = details.map(([label, value]) => `<div class="detail-row"><strong>${label}</strong><p>${escapeHtml(value)}</p></div>`).join('');
}

function renderRelated() {
  const section = document.querySelector('[data-related-section]');
  const node = document.querySelector('[data-related-products]');
  const related = relatedProducts(product, store.products, 4);
  if (!section || !node) return;
  section.hidden = !related.length;
  node.innerHTML = related.map((item) => buildProductCard(item, { currency: store?.settings?.currency || 'грн' })).join('');
}

function renderAll() {
  setMeta(); renderGallery(); renderDetails(); renderVariants(); renderSauces(); renderPrice(); renderRelated();
  const buy = document.querySelector('[data-add-product]'); if (buy) buy.disabled = product.available === false;
}

function bind() {
  document.addEventListener('click', (event) => {
    const photo = event.target.closest('[data-photo]');
    if (photo) {
      const main = document.querySelector('[data-product-main-image]'); if (main) main.src = mediaUrl(photo.getAttribute('data-photo'));
      document.querySelectorAll('[data-photo]').forEach((button) => button.classList.toggle('is-active', button === photo));
      return;
    }
    const variant = event.target.closest('[data-variant]');
    if (variant) { selectedVariant = variant.getAttribute('data-variant') || ''; renderVariants(); renderPrice(); return; }
    const sauce = event.target.closest('[data-sauce]');
    if (sauce) {
      const value = sauce.getAttribute('data-sauce') || '';
      selectedSauces = selectedSauces.includes(value) ? selectedSauces.filter((item) => item !== value) : normalizeSauceSelection([...selectedSauces, value], product.sauceCount);
      renderSauces(); return;
    }
    if (event.target.closest('[data-qty-dec]')) { quantity = clamp(quantity - 1, 1, 99); document.querySelector('[data-qty-value]').textContent = quantity; return; }
    if (event.target.closest('[data-qty-inc]')) { quantity = clamp(quantity + 1, 1, 99); document.querySelector('[data-qty-value]').textContent = quantity; return; }
    if (event.target.closest('[data-add-product]')) {
      if (Number(product.sauceCount || 0) > 0 && selectedSauces.length < Number(product.sauceCount || 0)) {
        document.querySelector('[data-product-message]').textContent = `Оберіть ${product.sauceCount} соус(и) для комплекту.`; return;
      }
      addProductToCart(product, { qty: quantity, variantValue: selectedVariant, sauces: selectedSauces, price: currentPrice() });
      track('add_to_cart', { currency: 'UAH', value: currentPrice() * quantity, items: [{ item_id: product.code, item_name: product.name, quantity, price: currentPrice(), item_variant: selectedVariant }] });
    }
    const quick = event.target.closest('[data-quick-add]');
    if (quick && store) { const item = findProduct(store, quick.getAttribute('data-quick-add')); if (item) addProductToCart(item); }
  });
}

async function boot() {
  mountSiteShell(); initAnalytics(); initCartDrawer(); bind();
  const code = new URLSearchParams(location.search).get('code');
  const errorNode = document.querySelector('[data-product-error]');
  if (!code) { errorNode.hidden = false; errorNode.textContent = 'Не вказано код товару.'; return; }
  try {
    const result = await loadStore(); store = result.data; product = findProduct(store, code);
    if (!product) throw new Error('Товар не знайдено');
    renderAll(); document.querySelector('[data-product-content]').hidden = false;
    track('view_item', { currency: 'UAH', value: currentPrice(), items: [{ item_id: product.code, item_name: product.name, price: currentPrice() }] });
  } catch (error) { console.error(error); errorNode.hidden = false; errorNode.textContent = 'Цей товар не знайдено або каталог тимчасово недоступний.'; }
}

boot();
