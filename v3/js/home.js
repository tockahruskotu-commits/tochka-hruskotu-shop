import { mediaUrl } from './config.js';
import { initAnalytics, track } from './analytics.js';
import { initCartDrawer, addProductToCart } from './cart-drawer.js';
import { CATALOG_GROUPS } from './catalog-core.js';
import { loadStore, findProduct } from './store.js';
import { buildProductCard } from './products-ui.js';
import { mountSiteShell } from './ui.js';
import { escapeHtml, clamp } from './utils.js';

let store = null;

const icons = {
  'CRUNCH-FRIES': '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 50h28l5-29H13l5 29Z"/><path d="M20 21 17 8M29 21 28 6M38 21l2-14M46 21l4-12"/></svg>',
  'BURGERS-NUGGETS': '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 29c2-11 10-17 20-17s18 6 20 17H12Z"/><path d="M11 35h42M15 41h34M18 49h28"/><path d="M20 25h2M30 21h2M41 25h2"/></svg>',
  'POPS': '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M20 14h24l-3 38H23l-3-38Z"/><circle cx="26" cy="25" r="4"/><circle cx="37" cy="31" r="4"/><circle cx="30" cy="40" r="4"/></svg>',
  'MINI-DONUTS': '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="20"/><circle cx="32" cy="32" r="7"/><path d="M18 25c8 4 18-3 28 1"/></svg>',
  'MINI-WAFFLES': '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="12" y="12" width="40" height="40" rx="9"/><path d="M22 14v36M32 14v36M42 14v36M14 22h36M14 32h36M14 42h36"/></svg>',
  'COOKIES-PUZZLES': '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M13 20h14a6 6 0 1 1 10 0h14v12a6 6 0 1 0 0 10v10H13V40a6 6 0 1 0 0-10V20Z"/></svg>',
  'COFFEE-FORTUNES': '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M13 23h34v18c0 8-7 13-17 13S13 49 13 41V23Z"/><path d="M47 28h5a7 7 0 0 1 0 14h-5M22 15c-3-4 3-5 0-9M32 15c-3-4 3-5 0-9M42 15c-3-4 3-5 0-9"/></svg>',
  'GIFT-SETS': '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 25h40v29H12zM9 18h46v9H9zM32 18v36"/><path d="M32 18c-8 0-13-3-13-7 0-3 3-5 6-5 5 0 7 6 7 12ZM32 18c8 0 13-3 13-7 0-3-3-5-6-5-5 0-7 6-7 12Z"/></svg>',
  'SAUCES': '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M23 8h18l-2 10 7 9-4 29H22l-4-29 7-9-2-10Z"/><path d="M22 34h20M24 43h16"/></svg>',
};

function activeProducts() {
  return (store?.products || []).filter((product) => product.available !== false && product.code);
}

function renderCategories() {
  const node = document.querySelector('[data-home-categories]');
  if (!node) return;
  node.innerHTML = CATALOG_GROUPS.map((group) => `
    <a class="category-sketch-card" href="./catalog.html?category=${encodeURIComponent(group.code)}">
      <span class="category-sketch-card__art">${icons[group.code] || ''}</span>
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
      status.textContent = 'Показуємо останні збережені дані — оновлення тимчасово недоступне.';
      status.hidden = false;
    }
  } catch (error) {
    console.error(error);
    if (status) { status.textContent = 'Не вдалося завантажити каталог. Спробуйте оновити сторінку.'; status.hidden = false; }
  }
}

boot();
