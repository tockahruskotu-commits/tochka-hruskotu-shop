import { CONFIG, appUrl, mediaUrl } from './config.js';
import { relatedProducts } from './product-core.js';
import { secretFor } from './secret-language.js';
import { findProduct, loadStore } from './store.js';
import {
  addCartItem,
  cartCount,
  cartSubtotal,
  loadCart,
  removeCartItem,
  saveCart,
  updateCartQuantity,
} from './cart.js';
import { formatMoney } from './products-ui.js';
import { showToast } from './ui.js';
import { escapeHtml } from './utils.js';

let cart = [];
let mounted = false;
let store = null;

function cartMarkup() {
  return `
    <div class="cart-overlay" data-cart-overlay hidden></div>
    <aside class="cart-drawer" data-cart-drawer aria-label="Кошик" aria-hidden="true">
      <div class="cart-drawer__head">
        <div><p class="eyebrow">Ваш вибір</p><h2>Кошик</h2></div>
        <button class="icon-button is-visible" type="button" data-cart-close aria-label="Закрити кошик">×</button>
      </div>
      <div class="cart-drawer__items" data-cart-items></div>
      <div class="cart-drawer__suggestions" data-cart-suggestions hidden></div>
      <div class="cart-drawer__foot">
        <p class="cart-free-note" data-cart-free-note></p>
        <div class="cart-total"><span>Разом</span><strong data-cart-total>0 грн</strong></div>
        <a class="button button-primary button-block" data-cart-checkout href="${appUrl('checkout.html')}">Оформити замовлення</a>
        <button class="button button-secondary button-block" type="button" data-cart-close>Продовжити покупки</button>
      </div>
    </aside>`;
}


function recommendationItems(limit = 2) {
  if (!store || !cart.length) return [];
  const inCart = new Set(cart.map((item) => String(item.code || '').toUpperCase()));
  const picked = [];
  for (const line of cart) {
    const base = findProduct(store, line.code);
    if (!base) continue;
    for (const candidate of relatedProducts(base, store.products || [], 6)) {
      const code = String(candidate.code || '').toUpperCase();
      if (!code || inCart.has(code) || picked.some((item) => item.code === candidate.code)) continue;
      picked.push(candidate);
      if (picked.length >= limit) return picked;
    }
  }
  return picked;
}

function renderSuggestions() {
  const node = document.querySelector('[data-cart-suggestions]');
  if (!node) return;
  const items = recommendationItems(2);
  node.hidden = !items.length;
  if (!items.length) { node.innerHTML = ''; return; }
  const secretMode = cart.some((item) => item.messageMode === 'secret');
  node.innerHTML = `<strong class="cart-suggest-title">Додайте до кошика в компанію</strong><div class="cart-suggest-list">${items.map((product) => {
    const secret = secretMode ? secretFor(product.code) : null;
    return `<article class="cart-suggest-card"><img src="${escapeHtml(mediaUrl(product.photos?.[0] || ''))}" alt="" width="54" height="54"><span><b>${escapeHtml(secret?.title || product.name || product.code)}</b>${secret ? `<small>${escapeHtml(product.name || '')}</small>` : ''}<em>${formatMoney(product.effectivePrice ?? product.regularPrice ?? 0)}</em></span><button type="button" data-cart-recommend="${escapeHtml(product.code)}">Додати</button></article>`;
  }).join('')}</div>`;
}

function updateHeaderCount() {
  document.querySelectorAll('[data-cart-count]').forEach((node) => {
    node.textContent = String(cartCount(cart));
  });
}

function render() {
  const container = document.querySelector('[data-cart-items]');
  const total = document.querySelector('[data-cart-total]');
  const checkout = document.querySelector('[data-cart-checkout]');
  if (!container || !total) return;

  if (!cart.length) {
    container.innerHTML = '<div class="cart-empty"><strong>Кошик поки порожній</strong><p>Додайте щось хрумке — і воно з’явиться тут.</p></div>';
  } else {
    container.innerHTML = cart.map((item) => `
      <article class="cart-line" data-cart-line="${escapeHtml(item.key)}">
        <img src="${escapeHtml(mediaUrl(item.photo))}" alt="" width="76" height="76">
        <div class="cart-line__body">
          <strong>${escapeHtml(item.secretTitle || item.name || item.code)}</strong>
          ${item.secretTitle ? `<small>${escapeHtml(item.name || item.code)}</small>` : ''}
          ${item.variantValue ? `<small>${escapeHtml(item.variantValue)}</small>` : ''}
          ${item.sauces?.length ? `<small>Соус: ${escapeHtml(item.sauces.join(', '))}</small>` : ''}
          <span>${formatMoney(item.price)}</span>
          <div class="qty-control" aria-label="Кількість">
            <button type="button" data-cart-dec="${escapeHtml(item.key)}" aria-label="Зменшити">−</button>
            <b>${item.qty}</b>
            <button type="button" data-cart-inc="${escapeHtml(item.key)}" aria-label="Збільшити">+</button>
            <button class="qty-remove" type="button" data-cart-remove="${escapeHtml(item.key)}">Видалити</button>
          </div>
        </div>
      </article>`).join('');
  }
  const subtotal = cartSubtotal(cart);
  total.textContent = formatMoney(subtotal);
  const freeNote = document.querySelector('[data-cart-free-note]');
  const threshold = Number(CONFIG.business.freeDeliveryFrom || 0);
  if (freeNote && threshold > 0) {
    freeNote.textContent = subtotal >= threshold
      ? 'Безкоштовна доставка активована для відділення, поштомату або погодженої передачі. Кур’єр — окремо.'
      : `До безкоштовної доставки залишилося ${formatMoney(Math.max(0, threshold - subtotal))}.`;
    freeNote.classList.toggle('is-ready', subtotal >= threshold);
  }
  if (checkout) checkout.setAttribute('aria-disabled', cart.length ? 'false' : 'true');
  renderSuggestions();
  updateHeaderCount();
}

function persist() {
  saveCart(cart);
  render();
  window.dispatchEvent(new CustomEvent('v3:cart-changed', { detail: { cart } }));
}

export function openCart() {
  document.querySelector('[data-cart-overlay]')?.removeAttribute('hidden');
  const drawer = document.querySelector('[data-cart-drawer]');
  drawer?.setAttribute('aria-hidden', 'false');
  document.body.classList.add('cart-open');
}

export function closeCart() {
  document.querySelector('[data-cart-overlay]')?.setAttribute('hidden', '');
  document.querySelector('[data-cart-drawer]')?.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('cart-open');
}

export function addProductToCart(product, selection = {}) {
  cart = addCartItem(cart, {
    code: product.code,
    name: product.name,
    qty: selection.qty || 1,
    variantValue: selection.variantValue || '',
    sauces: selection.sauces || [],
    price: selection.price ?? product.effectivePrice ?? product.regularPrice,
    photo: product.photos?.[0] || '',
    messageMode: selection.messageMode || '',
    secretTitle: selection.secretTitle || '',
    secretSection: selection.secretSection || '',
    scenarioId: selection.scenarioId || '',
  });
  persist();
  showToast(`${selection.secretTitle || product.name} додано в кошик`);
  openCart();
}

export function getCart() { return [...cart]; }

export function initCartDrawer() {
  if (mounted) {
    cart = loadCart();
    render();
    return;
  }
  mounted = true;
  cart = loadCart();
  document.body.insertAdjacentHTML('beforeend', cartMarkup());

  document.addEventListener('click', (event) => {
    const target = event.target.closest('button, a, [data-cart-overlay]');
    if (!target) return;
    if (target.matches('[data-cart-open]')) { event.preventDefault(); openCart(); return; }
    if (target.matches('[data-cart-close], [data-cart-overlay]')) { event.preventDefault(); closeCart(); return; }
    const recommend = target.getAttribute('data-cart-recommend');
    if (recommend && store) {
      const product = findProduct(store, recommend);
      if (product) {
        const secretMode = cart.some((item) => item.messageMode === 'secret');
        const entry = secretMode ? secretFor(product.code) : null;
        addProductToCart(product, { messageMode: entry ? 'secret' : '', secretTitle: entry?.title || '', secretSection: entry?.section || '' });
      }
      return;
    }
    const dec = target.getAttribute('data-cart-dec');
    const inc = target.getAttribute('data-cart-inc');
    const remove = target.getAttribute('data-cart-remove');
    if (dec) {
      const item = cart.find((line) => line.key === dec);
      if (item) { cart = updateCartQuantity(cart, dec, item.qty - 1); persist(); }
    } else if (inc) {
      const item = cart.find((line) => line.key === inc);
      if (item) { cart = updateCartQuantity(cart, inc, item.qty + 1); persist(); }
    } else if (remove) {
      cart = removeCartItem(cart, remove); persist();
    }
  });
  render();
  loadStore().then((result) => { store = result.data; render(); }).catch(() => {});
}
