import { initAnalytics, track } from './analytics.js';
import { addProductToCart, initCartDrawer } from './cart-drawer.js';
import { CATALOG_GROUPS, filterProducts, sortProducts } from './catalog-core.js';
import { CATEGORY_ICONS } from './category-art.js';
import { buildProductCard } from './products-ui.js';
import { findProduct, loadStore } from './store.js';
import { mountSiteShell } from './ui.js';
import { escapeHtml } from './utils.js';

let store = null;

let category =
  new URLSearchParams(location.search)
    .get('category')
    ?.toUpperCase() || 'ALL';

let query =
  new URLSearchParams(location.search)
    .get('q') || '';

let sortMode = 'default';

function validCategory(code) {
  if (code === 'ALL') return true;

  return CATALOG_GROUPS.some(
    (group) => group.code === code
  ) || (store?.categories || []).some(
    (item) => item.code === code
  );
}

function categoryName(code) {
  if (code === 'ALL') return 'Усе';

  const group = CATALOG_GROUPS.find(
    (item) => item.code === code
  );

  if (group?.name) return group.name;

  const storeCategory = (store?.categories || []).find(
    (item) => item.code === code
  );

  return storeCategory?.name || code;
}

function ensureSelectedCategoryBlock() {
  const shell = document.querySelector(
    '.catalog-toolbar .site-shell'
  );

  if (!shell) return null;

  let node = shell.querySelector(
    '[data-selected-category]'
  );

  if (node) return node;

  node = document.createElement('div');
  node.className = 'catalog-selected-category';
  node.dataset.selectedCategory = '';

  node.innerHTML = `
    <div class="catalog-selected-category__copy">
      <span>Ви обрали</span>
      <strong data-selected-category-name></strong>
    </div>

    <button
      type="button"
      class="catalog-selected-category__change"
      data-change-category
    >
      Змінити категорію
    </button>
  `;

  shell.prepend(node);

  return node;
}

function renderSelectedCategory() {
  const node = ensureSelectedCategoryBlock();

  if (!node) return;

  if (category === 'ALL') {
    node.hidden = true;
    return;
  }

  node.hidden = false;

  const name = node.querySelector(
    '[data-selected-category-name]'
  );

  if (name) {
    name.textContent = categoryName(category);
  }
}

function renderCategoryCards() {
  const node = document.querySelector(
    '[data-catalog-category-cards]'
  );

  if (!node) return;

  node.innerHTML = CATALOG_GROUPS.map((group) => `
    <a
      class="catalog-category-card${group.code === category ? ' is-active' : ''}"
      href="./catalog.html?category=${encodeURIComponent(group.code)}"
      data-category-card="${escapeHtml(group.code)}"
    >
      <span class="catalog-category-card__art">
        ${CATEGORY_ICONS[group.code] || ''}
      </span>

      <span>
        <strong>${escapeHtml(group.name)}</strong>
        <small>${escapeHtml(group.description || '')}</small>
      </span>
    </a>
  `).join('');
}

function renderFilters() {
  const node = document.querySelector(
    '[data-category-filters]'
  );

  if (!node) return;

  const all = [
    { code: 'ALL', name: 'Усе' },
    ...CATALOG_GROUPS,
  ];

  node.innerHTML = all.map((item) => `
    <button
      type="button"
      class="filter-chip${item.code === category ? ' is-active' : ''}"
      data-category="${escapeHtml(item.code)}"
    >
      ${escapeHtml(item.name)}
    </button>
  `).join('');
}

function renderProducts() {
  const grid = document.querySelector(
    '[data-catalog-grid]'
  );

  const result = document.querySelector(
    '[data-result-count]'
  );

  if (!grid) return;

  const filtered = sortProducts(
    filterProducts(
      store?.products || [],
      { category, query }
    ),
    sortMode
  );

  const currency =
    store?.settings?.currency || 'грн';

  grid.innerHTML = filtered.length
    ? filtered.map((product) =>
        buildProductCard(product, {
          currency,
          reviews: store?.reviews || [],
        })
      ).join('')
    : `
      <div class="empty-state">
        Схоже, цей смак десь заховався…
        Спробуйте іншу категорію або слово.
      </div>
    `;

  if (result) {
    result.textContent = filtered.length
      ? `Смаколиків: ${filtered.length}`
      : '';
  }
}

function updateSearchUi() {
  const clear = document.querySelector(
    '[data-search-clear]'
  );

  if (clear) {
    clear.hidden = !query;
  }
}

function updateUrl() {
  const params = new URLSearchParams();

  if (category !== 'ALL') {
    params.set('category', category);
  }

  if (query) {
    params.set('q', query);
  }

  history.replaceState(
    {},
    '',
    `${location.pathname}${
      params.size ? `?${params}` : ''
    }`
  );
}

function scrollToCatalogResults({
  smooth = true,
} = {}) {
  const toolbar = document.querySelector(
    '.catalog-toolbar'
  );

  if (!toolbar) return;

  toolbar.scrollIntoView({
    behavior: smooth ? 'smooth' : 'auto',
    block: 'start',
  });
}

function scrollToCategoryChooser() {
  const chooser = document.querySelector(
    '.catalog-category-stage'
  );

  if (!chooser) return;

  chooser.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

function applyCategory(nextCategory, {
  scroll = false,
} = {}) {
  category = nextCategory || 'ALL';

  renderFilters();
  renderCategoryCards();
  renderSelectedCategory();
  updateUrl();
  renderProducts();

  if (scroll) {
    scrollToCatalogResults();
  }

  track('view_item_list', {
    item_list_id: category,
  });
}

function bindControls() {
  const search = document.querySelector(
    '[data-catalog-search]'
  );

  const sort = document.querySelector(
    '[data-catalog-sort]'
  );

  if (search) {
    search.value = query;
    updateSearchUi();

    let timer = null;

    search.addEventListener('input', () => {
      query = search.value.trim();

      updateSearchUi();
      clearTimeout(timer);

      timer = setTimeout(() => {
        updateUrl();
        renderProducts();

        if (query) {
          track('search', {
            search_term: query,
          });
        }
      }, 180);
    });
  }

  document
    .querySelector('[data-search-clear]')
    ?.addEventListener('click', () => {
      query = '';

      if (search) {
        search.value = '';
        search.focus();
      }

      updateSearchUi();
      updateUrl();
      renderProducts();
    });

  sort?.addEventListener('change', () => {
    sortMode = sort.value;
    renderProducts();
  });

  document.addEventListener('click', (event) => {
    const changeCategory = event.target.closest(
      '[data-change-category]'
    );

    if (changeCategory) {
      event.preventDefault();
      scrollToCategoryChooser();
      return;
    }

    const card = event.target.closest(
      '[data-category-card]'
    );

    if (card) {
      event.preventDefault();

      applyCategory(
        card.getAttribute('data-category-card') || 'ALL',
        { scroll: true }
      );

      return;
    }

    const chip = event.target.closest(
      '[data-category]'
    );

    if (chip) {
      applyCategory(
        chip.getAttribute('data-category') || 'ALL'
      );

      return;
    }

    const quick = event.target.closest(
      '[data-quick-add]'
    );

    if (quick && store) {
      const product = findProduct(
        store,
        quick.getAttribute('data-quick-add')
      );

      if (product) {
        addProductToCart(product);
      }
    }
  });
}

function mobileInitialCategoryJump() {
  if (category === 'ALL') return;

  if (!window.matchMedia(
    '(max-width: 680px)'
  ).matches) {
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scrollToCatalogResults({
        smooth: false,
      });
    });
  });
}

async function boot() {
  mountSiteShell({
    active: 'catalog',
  });

  initAnalytics();
  initCartDrawer();
  bindControls();

  const status = document.querySelector(
    '[data-store-status]'
  );

  try {
    const result = await loadStore();

    store = result.data;

    if (!validCategory(category)) {
      category = 'ALL';
    }

    renderFilters();
    renderCategoryCards();
    renderSelectedCategory();
    renderProducts();

    track('view_item_list', {
      item_list_id: category,
    });

    mobileInitialCategoryJump();

    if (status && result.warning) {
      status.hidden = true;
      console.info(
        'Using cached store data'
      );
    }
  } catch (error) {
    console.error(error);

    if (status) {
      status.hidden = false;
      status.textContent =
        'Схоже, каталог на хвилинку замислився. Оновіть сторінку або загляньте трохи пізніше.';
    }
  }
}

boot();
