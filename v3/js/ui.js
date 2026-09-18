import { CONFIG, appUrl, rootUrl } from './config.js';

const navItems = [
  ['catalog', 'Каталог', 'catalog.html'],
  ['gifts', 'Подарунки', 'gifts.html'],
  ['about', 'Про нас', 'about.html'],
  ['delivery', 'Доставка й оплата', 'delivery.html'],
  ['contacts', 'Контакти', 'contacts.html'],
];

function navLink([key, label, path], active, pathname) {
  const current = key === active ? ' aria-current="page" class="is-active"' : '';
  return `<a href="${appUrl(path, pathname)}"${current}>${label}</a>`;
}

export function buildHeaderMarkup(active = '', pathname = globalThis?.location?.pathname ?? '') {
  return `
    <header class="v3-header" data-v3-header>
      <div class="site-shell v3-header__row">
        <a class="v3-logo" href="${appUrl('', pathname)}" aria-label="${CONFIG.business.name} — головна">
          <img src="${rootUrl('images/brand/logo.webp')}" alt="" width="44" height="44">
          <span>${CONFIG.business.name}</span>
        </a>
        <nav class="v3-nav" aria-label="Основна навігація">
          ${navItems.map((item) => navLink(item, active, pathname)).join('')}
        </nav>
        <div class="v3-header__actions">
          <button class="icon-button" type="button" data-mobile-menu-toggle aria-controls="v3MobileMenu" aria-expanded="false" aria-label="Відкрити меню">☰</button>
          <button class="cart-button" type="button" data-cart-open aria-label="Відкрити кошик">
            <span aria-hidden="true">🛒</span><span>Кошик</span><strong data-cart-count>0</strong>
          </button>
        </div>
      </div>
      <div class="v3-mobile-menu" id="v3MobileMenu" data-mobile-menu hidden>
        <nav class="site-shell" aria-label="Мобільна навігація">
          ${navItems.map((item) => navLink(item, active, pathname)).join('')}
          <a href="${appUrl('secret.html', pathname)}">Хочу сказати більше</a>
        </nav>
      </div>
    </header>`;
}

export function buildFooterMarkup(pathname = globalThis?.location?.pathname ?? '') {
  const social = CONFIG.social;
  return `
    <footer class="v3-footer">
      <div class="site-shell v3-footer__grid">
        <div>
          <a class="v3-logo v3-logo--footer" href="${appUrl('', pathname)}">
            <img src="${rootUrl('images/brand/logo.webp')}" alt="" width="48" height="48">
            <span>${CONFIG.business.name}</span>
          </a>
          <p>Хрумкі подарунки й смаколики з Млинова. Відправляємо по Україні.</p>
        </div>
        <div>
          <h2>Покупцям</h2>
          <a href="${appUrl('catalog.html', pathname)}">Каталог</a>
          <a href="${appUrl('gifts.html', pathname)}">Подарунки</a>
          <a href="${appUrl('certificates.html', pathname)}">Сертифікати</a>
          <a href="${appUrl('reviews.html', pathname)}">Відгуки</a>
          <a href="${appUrl('faq.html', pathname)}">FAQ</a>
        </div>
        <div>
          <h2>Про магазин</h2>
          <a href="${appUrl('about.html', pathname)}">Про нас</a>
          <a href="${appUrl('delivery.html', pathname)}">Доставка й оплата</a>
          <a href="${appUrl('contacts.html', pathname)}">Контакти</a>
          <a href="${appUrl('secret.html', pathname)}">Хочу сказати більше</a>
        </div>
        <div>
          <h2>Документи</h2>
          <a href="${appUrl('privacy.html', pathname)}">Політика конфіденційності</a>
          <a href="${appUrl('terms.html', pathname)}">Умови продажу</a>
        </div>
        <div>
          <h2>Ми онлайн</h2>
          <a href="${social.instagram}" rel="noopener noreferrer">Instagram</a>
          <a href="${social.facebook}" rel="noopener noreferrer">Facebook</a>
          <a href="${social.tiktok}" rel="noopener noreferrer">TikTok</a>
          <a href="${social.youtube}" rel="noopener noreferrer">YouTube</a>
          <a href="${social.telegram}" rel="noopener noreferrer">Telegram</a>
        </div>
      </div>
      <div class="site-shell v3-footer__bottom">© ${new Date().getFullYear()} ${CONFIG.business.name}</div>
    </footer>`;
}

export function bindMobileMenu(root = document) {
  const button = root.querySelector('[data-mobile-menu-toggle]');
  const menu = root.querySelector('[data-mobile-menu]');
  if (!button || !menu) return;
  button.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  });
}

export function mountSiteShell({ active = '', root = document } = {}) {
  const pathname = globalThis?.location?.pathname ?? '';
  const header = root.querySelector('[data-site-header]');
  const footer = root.querySelector('[data-site-footer]');
  if (header) header.innerHTML = buildHeaderMarkup(active, pathname);
  if (footer) footer.innerHTML = buildFooterMarkup(pathname);
  bindMobileMenu(root);
}

let toastTimer = null;
export function showToast(message, { root = document, timeoutMs = 2600 } = {}) {
  let toast = root.querySelector('[data-v3-toast]');
  if (!toast) {
    toast = root.createElement('div');
    toast.className = 'v3-toast';
    toast.dataset.v3Toast = 'true';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    root.body.append(toast);
  }
  toast.textContent = String(message || '');
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, timeoutMs);
}
