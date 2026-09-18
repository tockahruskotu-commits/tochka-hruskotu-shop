import { initAnalytics, track } from './analytics.js';
import { addProductToCart, initCartDrawer } from './cart-drawer.js';
import { CATALOG_GROUPS, filterProducts, sortProducts } from './catalog-core.js';
import { buildProductCard } from './products-ui.js';
import { findProduct, loadStore } from './store.js';
import { mountSiteShell } from './ui.js';
import { escapeHtml } from './utils.js';

let store = null;
let category = new URLSearchParams(location.search).get('category')?.toUpperCase() || 'ALL';
let query = new URLSearchParams(location.search).get('q') || '';
let sortMode = 'default';

function validCategory(code) {
  if (code === 'ALL') return true;
  return CATALOG_GROUPS.some((group) => group.code === code)
    || (store?.categories || []).some((item) => item.code === code);
}

function renderFilters() {
  const node = document.querySelector('[data-category-filters]');
  if (!node) return;
  const all = [{ code: 'ALL', name: 'Усе' }, ...CATALOG_GROUPS];
  node.innerHTML = all.map((item) => `<button type="button" class="filter-chip${item.code === category ? ' is-active' : ''}" data-category="${escapeHtml(item.code)}">${escapeHtml(item.name)}</button>`).join('');
}

function renderProducts() {
  const grid = document.querySelector('[data-catalog-grid]');
  const result = document.querySelector('[data-result-count]');
  if (!grid) return;
  const filtered = sortProducts(filterProducts(store?.products || [], { category, query }), sortMode);
  const currency = store?.settings?.currency || 'грн';
  grid.innerHTML = filtered.length
    ? filtered.map((product) => buildProductCard(product, { currency, reviews: store?.reviews || [] })).join('')
    : '<div class="empty-state">Схоже, цей смак десь заховався… Спробуйте іншу категорію або слово.</div>';
  if (result) result.textContent = `Знайдено: ${filtered.length}`;
}

function updateSearchUi() {
  const clear = document.querySelector('[data-search-clear]');
  if (clear) clear.hidden = !query;
}

function updateUrl() {
  const params = new URLSearchParams();
  if (category !== 'ALL') params.set('category', category);
  if (query) params.set('q', query);
  history.replaceState({}, '', `${location.pathname}${params.size ? `?${params}` : ''}`);
}

function bindControls() {
  const search = document.querySelector('[data-catalog-search]');
  const sort = document.querySelector('[data-catalog-sort]');
  if (search) {
    search.value = query;
    updateSearchUi();
    let timer = null;
    search.addEventListener('input', () => {
      query = search.value.trim();
      updateSearchUi();
      clearTimeout(timer);
      timer = setTimeout(() => {
        updateUrl(); renderProducts();
        if (query) track('search', { search_term: query });
      }, 180);
    });
  }
  document.querySelector('[data-search-clear]')?.addEventListener('click', () => {
    query = '';
    if (search) { search.value = ''; search.focus(); }
    updateSearchUi(); updateUrl(); renderProducts();
  });
  sort?.addEventListener('change', () => { sortMode = sort.value; renderProducts(); });
  document.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-category]');
    if (chip) {
      category = chip.getAttribute('data-category') || 'ALL';
      renderFilters(); updateUrl(); renderProducts();
      track('view_item_list', { item_list_id: category });
      return;
    }
    const quick = event.target.closest('[data-quick-add]');
    if (quick && store) {
      const product = findProduct(store, quick.getAttribute('data-quick-add'));
      if (product) addProductToCart(product);
    }
  });
}

async function boot() {
  mountSiteShell({ active: 'catalog' });
  initAnalytics();
  initCartDrawer();
  bindControls();
  const status = document.querySelector('[data-store-status]');
  try {
    const result = await loadStore();
    store = result.data;
    if (!validCategory(category)) category = 'ALL';
    renderFilters();
    renderProducts();
    track('view_item_list', { item_list_id: category });
    if (status && result.warning) { status.hidden = false; status.textContent = 'Показуємо останні збережені дані — оновлення тимчасово недоступне.'; }
  } catch (error) {
    console.error(error);
    if (status) { status.hidden = false; status.textContent = 'Не вдалося завантажити каталог. Спробуйте оновити сторінку.'; }
  }
}

boot();
