import { CONFIG, mediaUrl } from './config.js';
import { initAnalytics, track } from './analytics.js';
import { initCartDrawer, addProductToCart } from './cart-drawer.js';
import { loadStore, findProduct } from './store.js';
import { buildCategoryCard, buildProductCard } from './products-ui.js';
import { mountSiteShell } from './ui.js';
import { escapeHtml, clamp } from './utils.js';

let store = null;

function activeCategories() {
  return (store?.categories || [])
    .filter((category) => category.code && category.code !== 'ALL' && category.active !== false)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

function activeProducts() {
  return (store?.products || []).filter((product) => product.available !== false && product.code);
}

function renderCategories() {
  const node = document.querySelector('[data-home-categories]');
  if (!node) return;
  node.innerHTML = activeCategories().slice(0, 12).map((category) => buildCategoryCard(category)).join('');
}

function renderFeatured() {
  const node = document.querySelector('[data-home-featured]');
  if (!node) return;
  const all = activeProducts();
  const marked = all.filter((product) => product.isNew || product.saleActive || product.badge);
  const products = (marked.length ? marked : all).slice(0, 8);
  const currency = store?.settings?.currency || 'грн';
  node.innerHTML = products.length
    ? products.map((product) => buildProductCard(product, { currency })).join('')
    : '<div class="empty-state">Наразі немає доступних товарів.</div>';
}

function renderReviews() {
  const node = document.querySelector('[data-home-reviews]');
  if (!node) return;
  const reviews = (store?.reviews || []).filter((review) => review?.text).slice(0, 3);
  node.innerHTML = reviews.length ? reviews.map((review) => `
    <article class="review-card">
      <div class="review-stars" aria-label="Оцінка ${Number(review.rating || 5)} з 5">${'★'.repeat(clamp(review.rating || 5, 1, 5))}</div>
      <p>“${escapeHtml(review.text)}”</p>
      <strong>${escapeHtml(review.name || 'Покупець')}</strong>
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

  const hero = document.querySelector('[data-home-hero-image]');
  if (hero) hero.src = mediaUrl('images/site/hero-family-desktop.webp');

  const status = document.querySelector('[data-store-status]');
  try {
    const result = await loadStore();
    store = result.data;
    renderCategories();
    renderFeatured();
    renderReviews();
    if (status) {
      status.textContent = result.source === 'cache' ? 'Показуємо останні збережені дані. Оновлення тимчасово недоступне.' : '';
      status.hidden = !status.textContent;
    }
  } catch (error) {
    console.error(error);
    if (status) {
      status.hidden = false;
      status.textContent = 'Не вдалося завантажити каталог. Спробуйте оновити сторінку або напишіть нам.';
    }
  }
}

boot();
