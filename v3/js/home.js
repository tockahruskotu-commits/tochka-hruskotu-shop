import { mediaUrl } from './config.js';
import { initAnalytics, track } from './analytics.js';
import { initCartDrawer, addProductToCart } from './cart-drawer.js';
import { CATALOG_GROUPS } from './catalog-core.js';
import { CATEGORY_ICONS } from './category-art.js';
import { loadStore, findProduct } from './store.js';
import { buildProductCard } from './products-ui.js';
import { mountSiteShell } from './ui.js';
import { escapeHtml, clamp } from './utils.js';

let store = null;


function activeProducts() {
  return (store?.products || []).filter((product) => product.available !== false && product.code);
}

function renderCategories() {
  const node = document.querySelector('[data-home-categories]');
  if (!node) return;
  node.innerHTML = CATALOG_GROUPS.map((group) => `
    <a class="category-sketch-card" href="./catalog.html?category=${encodeURIComponent(group.code)}">
      <span class="category-sketch-card__art">${CATEGORY_ICONS[group.code] || ''}</span>
      <span><strong>${escapeHtml(group.name)}</strong><small>${escapeHtml(group.description || '')}</small></span>
    </a>`).join('');
}

function diverseFeatured(products, limit = 8) {
  const chosen = [];
  const categoryCount = new Map();
  let certificateCount = 0;
  const signal = (p) => Number(Boolean(p.isNew)) * 4 + Number(Boolean(p.badge)) * 2 + Number(Boolean(p.saleActive)) + Number(Boolean(p.isGift));
  const priority = [...products].sort((a, b) => signal(b) - signal(a) || Number(a.order || 0) - Number(b.order || 0));
  const canTake = (product, relaxed = false) => {
    const codes = product.categoryCodes || [product.categoryCode].filter(Boolean);
    const isCertificate = codes.includes('CERTIFICATES');
    if (isCertificate && certificateCount >= 1) return false;
    if (!relaxed && codes.some((code) => (categoryCount.get(code) || 0) >= 1)) return false;
    if (relaxed && codes.some((code) => (categoryCount.get(code) || 0) >= 2)) return false;
    return true;
  };
  const take = (product) => {
    chosen.push(product);
    const codes = product.categoryCodes || [product.categoryCode].filter(Boolean);
    codes.forEach((code) => categoryCount.set(code, (categoryCount.get(code) || 0) + 1));
    if (codes.includes('CERTIFICATES')) certificateCount += 1;
  };
  for (const product of priority) { if (canTake(product, false)) take(product); if (chosen.length >= limit) return chosen; }
  for (const product of priority) { if (!chosen.some((x) => x.code === product.code) && canTake(product, true)) take(product); if (chosen.length >= limit) break; }
  return chosen;
}

function renderFeatured() {
  const node = document.querySelector('[data-home-featured]');
  if (!node) return;
  const products = diverseFeatured(activeProducts(), 8);
  const currency = store?.settings?.currency || 'грн';
  node.innerHTML = products.length
    ? products.map((product) => buildProductCard(product, { currency, reviews: store?.reviews || [] })).join('')
    : '<div class="empty-state">Наразі немає доступних товарів.</div>';
}

function renderReviews() {
  const node = document.querySelector('[data-home-reviews]');
  if (!node) return;
  const reviews = (store?.reviews || []).filter((review) => review?.text && Number(review.rating || 0) > 0).slice(0, 4);
  node.innerHTML = reviews.length ? reviews.map((review) => `
    <article class="review-card">
      <div class="review-stars" aria-label="Оцінка ${Number(review.rating || 5)} з 5">${'★'.repeat(clamp(review.rating || 5, 1, 5))}</div>
      <p>“${escapeHtml(review.text)}”</p>
      <strong>${escapeHtml(review.name || 'Покупець')}</strong>
      ${String(review.source || '').toLowerCase().includes('google') ? '<small class="review-source">Google</small>' : ''}
    </article>`).join('') : '<div class="empty-state">Відгуки скоро з’являться тут.</div>';
}

function bindQuickAdd() {
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-quick-add]');
    if (!button || !store) return;
    const product = findProduct(store, button.getAttribute('data-quick-add'));
    if (!product) return;
    addProductToCart(product);
    track('add_to_cart', { currency: 'UAH', value: Number(product.effectivePrice || product.regularPrice || 0), items: [{ item_id: product.code, item_name: product.name }] });
  });
}

async function boot() {
  mountSiteShell({ active: 'home' });
  initAnalytics();
  initCartDrawer();
  bindQuickAdd();
  renderCategories();

  const hero = document.querySelector('[data-home-hero-image]');
  if (hero) hero.src = mediaUrl('images/site/hero-family-desktop.webp');

  const status = document.querySelector('[data-store-status]');
  try {
    const result = await loadStore();
    store = result.data;
    renderFeatured();
    renderReviews();
    if (status && result.warning) {
      status.hidden = true;
      console.info('Using cached store data');
    }
  } catch (error) {
    console.error(error);
    if (status) { status.textContent = 'Схоже, каталог на хвилинку замислився. Оновіть сторінку або загляньте трохи пізніше.'; status.hidden = false; }
  }
}

boot();
