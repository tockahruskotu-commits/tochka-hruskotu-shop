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
let scenario = 'create';

const SCENARIOS = Object.freeze({
  create: {
    title: 'Створіть своє послання',
    copy: 'Ви самі обираєте один або кілька товарів. Ми додаємо універсальну картку-ключ, а ви вирішуєте, як вручити подарунок.',
    sections: null,
    tags: ['Від вашого імені', 'Анонімно', 'З підказкою', 'Особисто'],
    steps: [
      ['1', 'Оберіть товари', 'Кожен товар має своє значення. Можна взяти один або скласти кілька думок.'],
      ['2', 'Оберіть спосіб передачі', 'Відкрито, анонімно, з підказкою або для особистого вручення.'],
      ['3', 'Ми додаємо ключ', 'Картка-ключ їде разом із подарунком; листівку можна додати окремо.'],
    ],
  },
  courage: {
    title: 'Коли важко зробити перший крок',
    copy: 'Тут зібрані фрази для зізнання, вибачення, ще одного шансу або складної розмови. Можна почати дуже делікатно.',
    sections: ['Симпатія й флірт', 'Пробач / примирення', 'Складна розмова', 'Розставання'],
    tags: ['Анонімно', 'Анонімно з підказкою', 'Від вашого імені'],
    steps: [
      ['1', 'Оберіть те, що важко сказати', 'Не треба починати з ідеальної фрази — оберіть найближчий зміст.'],
      ['2', 'Залиште стільки підказок, скільки хочете', 'Можна не називати себе або дати маленький натяк.'],
      ['3', 'Ми передамо послання', 'Картка-ключ пояснить сенс, а про відмову від доставки ми повідомимо вам.'],
    ],
  },
  remind: {
    title: 'Тепло нагадати про себе',
    copy: 'Відкриті послання для рідних, друзів і близьких: підтримати, подякувати, обійняти на відстані або просто зробити день приємнішим.',
    sections: ['Сумую / думаю про тебе', 'Вдячність і близькість', 'Турбота й підтримка', 'Сім’я і близькі'],
    tags: ['Відкрито', 'Для близьких', 'Листівка за бажанням'],
    steps: [
      ['1', 'Оберіть теплу думку', 'Тут без складних натяків — зміст відкритий і добрий.'],
      ['2', 'Додайте листівку за бажанням', 'Кілька власних слів можуть бути окремо від картки-ключа.'],
      ['3', 'Відправте або вручіть самі', 'Можна замовити доставку або отримати подарунок і вручити особисто.'],
    ],
  },
});

function normalize(value = '') { return String(value).toLocaleLowerCase('uk-UA').replace(/[’']/g, "'").trim(); }
function mappedProducts() { return (store?.products || []).filter((product) => product.available !== false && secretFor(product.code)); }

function typeRank(product) {
  const type = secretFor(product.code)?.type || '';
  return ({ 'Одна думка': 0, 'Готове послання': 1, 'Підсилювач': 2, 'Вибір': 3 })[type] ?? 4;
}

function scenarioAllows(entry) {
  const cfg = SCENARIOS[scenario];
  if (!cfg?.sections) return true;
  return cfg.sections.includes(entry.section);
}

function renderScenarioGuide() {
  const cfg = SCENARIOS[scenario] || SCENARIOS.create;
  const node = document.querySelector('[data-scenario-guide]');
  if (!node) return;
  node.innerHTML = `
    <div class="scenario-guide__intro">
      <span class="section-kicker">Обраний формат</span>
      <h2>${escapeHtml(cfg.title)}</h2>
      <p>${escapeHtml(cfg.copy)}</p>
      <div class="scenario-guide__tags">${cfg.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
    </div>
    <div class="scenario-guide__steps">${cfg.steps.map(([num,title,copy]) => `<article class="scenario-step"><span class="scenario-step__num">${num}</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(copy)}</p></article>`).join('')}</div>`;
  const title = document.querySelector('[data-secret-catalog-title]');
  const copy = document.querySelector('[data-secret-catalog-copy]');
  if (title) title.textContent = cfg.title;
  if (copy) copy.textContent = `${cfg.copy} Фізична назва товару й смак завжди показані другим рядком.`;
  document.querySelectorAll('[data-scenario]').forEach((button) => button.classList.toggle('is-active', button.getAttribute('data-scenario') === scenario));
}

function availableSections() {
  const cfg = SCENARIOS[scenario];
  const base = cfg?.sections || SECRET_SECTIONS.slice(1);
  return ['Усі послання', ...base.filter((x) => x !== 'Усі послання')];
}

function renderFilters() {
  const node = document.querySelector('[data-secret-filters]');
  if (!node) return;
  const options = availableSections();
  if (!options.includes(section)) section = 'Усі послання';
  node.innerHTML = options.map((name) => `<button type="button" class="filter-chip${name === section ? ' is-active' : ''}" data-secret-section="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join('');
}

function renderProducts() {
  const grid = document.querySelector('[data-secret-grid]');
  const count = document.querySelector('[data-secret-count]');
  const needle = normalize(query);
  const products = mappedProducts().filter((product) => {
    const entry = secretFor(product.code);
    if (!scenarioAllows(entry)) return false;
    if (section !== 'Усі послання' && entry.section !== section) return false;
    if (!needle) return true;
    return normalize([entry.title, entry.section, entry.tone, entry.type, product.name, product.shortDescription].filter(Boolean).join(' ')).includes(needle);
  }).sort((a,b) => typeRank(a) - typeRank(b) || Number(a.order || 0) - Number(b.order || 0));
  const currency = store?.settings?.currency || 'грн';
  grid.innerHTML = products.length
    ? products.map((product) => buildProductCard(product, { currency, reviews: store?.reviews || [], secret: true })).join('')
    : '<div class="empty-state">Схоже, ці слова десь заховалися… Спробуйте іншу фразу або розділ.</div>';
  if (count) count.textContent = `Послань: ${products.length}`;
}

function setSection(value) { section = value || 'Усі послання'; renderFilters(); renderProducts(); document.querySelector('.secret-toolbar')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function setScenario(value, { scroll = true } = {}) {
  scenario = SCENARIOS[value] ? value : 'create';
  section = 'Усі послання';
  renderScenarioGuide(); renderFilters(); renderProducts();
  if (scroll) document.querySelector('[data-scenario-guide]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function bind() {
  const search = document.querySelector('[data-secret-search]');
  const clear = document.querySelector('[data-secret-clear]');
  search?.addEventListener('input', () => { query = search.value.trim(); if (clear) clear.hidden = !query; renderProducts(); });
  clear?.addEventListener('click', () => { query = ''; search.value = ''; clear.hidden = true; search.focus(); renderProducts(); });
  document.addEventListener('click', (event) => {
    const filter = event.target.closest('[data-secret-section]');
    if (filter) { setSection(filter.getAttribute('data-secret-section')); return; }
    const scenarioButton = event.target.closest('[data-scenario]');
    if (scenarioButton) { setScenario(scenarioButton.getAttribute('data-scenario')); return; }
    const quick = event.target.closest('[data-quick-add]');
    if (quick && store) {
      const product = findProduct(store, quick.getAttribute('data-quick-add'));
      const entry = product ? secretFor(product.code) : null;
      if (product && entry) {
        addProductToCart(product, { messageMode: 'secret', secretTitle: entry.title, secretSection: entry.section, scenarioId: scenario });
        track('add_to_cart', { currency: 'UAH', value: Number(product.effectivePrice || product.regularPrice || 0), items: [{ item_id: product.code, item_name: product.name, item_variant: entry.title }] });
      }
    }
  });
}

async function boot() {
  mountSiteShell(); initAnalytics(); initCartDrawer(); bind(); renderScenarioGuide(); renderFilters();
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
