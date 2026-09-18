import { initAnalytics, track } from './analytics.js';
import { addProductToCart, initCartDrawer } from './cart-drawer.js';
import { buildProductCard } from './products-ui.js';
import { SECRET_SECTIONS, secretFor } from './secret-language.js';
import { findProduct, loadStore } from './store.js';
import { mountSiteShell } from './ui.js';
import { escapeHtml } from './utils.js';

let store = null;
let section = 'Усі послання';
let query = '';

function normalize(value = '') {
  return String(value).toLocaleLowerCase('uk-UA').replace(/[’']/g, "'").trim();
}

function mappedProducts() {
  return (store?.products || []).filter((product) => product.available !== false && secretFor(product.code));
}

function renderFilters() {
  const node = document.querySelector('[data-secret-filters]');
  if (!node) return;
  node.innerHTML = SECRET_SECTIONS.map((name) => `<button type="button" class="filter-chip${name === section ? ' is-active' : ''}" data-secret-section="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join('');
}

function renderProducts() {
  const grid = document.querySelector('[data-secret-grid]');
  const count = document.querySelector('[data-secret-count]');
  const needle = normalize(query);
  const products = mappedProducts().filter((product) => {
    const entry = secretFor(product.code);
    if (section !== 'Усі послання' && entry.section !== section) return false;
    if (!needle) return true;
    return normalize([entry.title, entry.section, entry.tone, product.name, product.shortDescription].filter(Boolean).join(' ')).includes(needle);
  });
  const currency = store?.settings?.currency || 'грн';
  grid.innerHTML = products.length
    ? products.map((product) => buildProductCard(product, { currency, reviews: store?.reviews || [], secret: true })).join('')
    : '<div class="empty-state">Схоже, ці слова десь заховалися… Спробуйте іншу фразу або розділ.</div>';
  if (count) count.textContent = `Послань: ${products.length}`;
}

function setSection(value) {
  section = value || 'Усі послання';
  renderFilters(); renderProducts();
  document.querySelector('.secret-toolbar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function bind() {
  const search = document.querySelector('[data-secret-search]');
  const clear = document.querySelector('[data-secret-clear]');
  search?.addEventListener('input', () => {
    query = search.value.trim();
    if (clear) clear.hidden = !query;
    renderProducts();
  });
  clear?.addEventListener('click', () => {
    query = ''; search.value = ''; clear.hidden = true; search.focus(); renderProducts();
  });
  document.addEventListener('click', (event) => {
    const filter = event.target.closest('[data-secret-section]');
    if (filter) { setSection(filter.getAttribute('data-secret-section')); return; }
    const scenario = event.target.closest('[data-scenario-section]');
    if (scenario) {
      const value = scenario.getAttribute('data-scenario-section');
      setSection(value === 'ALL' ? 'Усі послання' : value);
      return;
    }
    const quick = event.target.closest('[data-quick-add]');
    if (quick && store) {
      const product = findProduct(store, quick.getAttribute('data-quick-add'));
      const entry = product ? secretFor(product.code) : null;
      if (product && entry) {
        addProductToCart(product, { messageMode: 'secret', secretTitle: entry.title, secretSection: entry.section });
        track('add_to_cart', { currency: 'UAH', value: Number(product.effectivePrice || product.regularPrice || 0), items: [{ item_id: product.code, item_name: product.name, item_variant: entry.title }] });
      }
    }
  });
}

async function boot() {
  mountSiteShell(); initAnalytics(); initCartDrawer(); bind(); renderFilters();
  const status = document.querySelector('[data-store-status]');
  try {
    const result = await loadStore(); store = result.data; renderProducts();
    if (status && result.warning) { status.hidden = false; status.textContent = 'Показуємо останні збережені дані — оновлення тимчасово недоступне.'; }
  } catch (error) {
    console.error(error);
    document.querySelector('[data-secret-grid]').innerHTML = '<div class="empty-state">Не вдалося завантажити каталог. Спробуйте оновити сторінку.</div>';
  }
}

boot();
