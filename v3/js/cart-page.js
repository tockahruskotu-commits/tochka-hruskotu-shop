import { CONFIG, appUrl, mediaUrl } from './config.js';
import { initAnalytics, track } from './analytics.js';
import {
  addCartItem,
  cartCount,
  cartSubtotal,
  loadCart,
  removeCartItem,
  saveCart,
  updateCartQuantity,
} from './cart.js';
import { reconcileCart } from './checkout-core.js';
import { initCartDrawer } from './cart-drawer.js';
import { relatedProducts } from './product-core.js';
import { formatMoney, productHref } from './products-ui.js';
import { secretFor } from './secret-language.js';
import { findProduct, loadStore } from './store.js';
import { mountSiteShell, showToast } from './ui.js';
import { escapeHtml } from './utils.js';

let cart = [];
let store = null;

const $ = (selector) => document.querySelector(selector);

function renderItems() {
  const itemsNode = $('[data-cart-page-items]');
  const emptyNode = $('[data-cart-page-empty]');
  const countNode = $('[data-cart-page-count]');
  const totalCountNode = $('[data-cart-page-total-count]');
  const totalNode = $('[data-cart-page-total]');
  const checkoutNode = $('[data-cart-page-checkout]');

  if (!itemsNode) return;

  const count = cartCount(cart);
  const subtotal = cartSubtotal(cart);

  if (countNode) {
    countNode.textContent = cart.length
      ? `${count} ${count === 1 ? 'товар' : 'товари у кошику'}`
      : '';
  }

  if (totalCountNode) {
    totalCountNode.textContent = String(count);
  }

  if (totalNode) {
    totalNode.textContent = formatMoney(subtotal);
  }

  if (!cart.length) {
    itemsNode.innerHTML = '';
    itemsNode.hidden = true;

    if (emptyNode) {
      emptyNode.hidden = false;
    }

    if (checkoutNode) {
      checkoutNode.hidden = true;
      checkoutNode.setAttribute('aria-disabled', 'true');
    }

    renderFreeDelivery();
    renderSuggestions();
    updateHeaderCount();
    return;
  }

  itemsNode.hidden = false;

  if (emptyNode) {
    emptyNode.hidden = true;
  }

  if (checkoutNode) {
    checkoutNode.hidden = false;
    checkoutNode.setAttribute('aria-disabled', 'false');
  }

  itemsNode.innerHTML = cart.map((item) => `
    <article
      class="cart-page__line"
      data-cart-page-line="${escapeHtml(item.key)}"
    >
      <img
        class="cart-page__line-image"
        src="${escapeHtml(mediaUrl(item.photo))}"
        alt="${escapeHtml(item.name || item.code)}"
      >

      <div class="cart-page__line-body">

        <strong>
          ${escapeHtml(item.secretTitle || item.name || item.code)}
        </strong>

        ${item.secretTitle
          ? `<small>${escapeHtml(item.name || item.code)}</small>`
          : ''
        }

        ${item.variantValue
          ? `<small>${escapeHtml(item.variantValue)}</small>`
          : ''
        }

        ${item.sauces?.length
          ? `<small>Соус: ${escapeHtml(item.sauces.join(', '))}</small>`
          : ''
        }

        <span class="cart-page__line-price">
          ${formatMoney(item.price)} за одиницю
        </span>

        <div class="cart-page__line-actions">

          <button
            class="cart-page__qty-button"
            type="button"
            data-cart-page-dec="${escapeHtml(item.key)}"
            aria-label="Зменшити кількість"
          >
            −
          </button>

          <span class="cart-page__qty">
            ${item.qty}
          </span>

          <button
            class="cart-page__qty-button"
            type="button"
            data-cart-page-inc="${escapeHtml(item.key)}"
            aria-label="Збільшити кількість"
          >
            +
          </button>

          <button
            class="cart-page__remove"
            type="button"
            data-cart-page-remove="${escapeHtml(item.key)}"
          >
            Видалити
          </button>

        </div>
      </div>

      <strong class="cart-page__line-total">
        ${formatMoney(item.price * item.qty)}
      </strong>
    </article>
  `).join('');

  renderFreeDelivery();
  renderSuggestions();
  updateHeaderCount();
}

function renderFreeDelivery() {
  const node = $('[data-cart-page-free-note]');
  if (!node) return;

  const threshold = Number(CONFIG.business.freeDeliveryFrom || 0);
  const subtotal = cartSubtotal(cart);

  if (!threshold) {
    node.textContent = '';
    node.hidden = true;
    return;
  }

  node.hidden = false;

  if (subtotal >= threshold) {
    node.textContent =
      'Безкоштовна доставка активована для Нової пошти або Укрпошти у відділення / поштомат. Кур’єрська доставка оплачується окремо.';

    node.classList.add('is-ready');
    return;
  }

  node.textContent =
    `До безкоштовної доставки залишилося ${formatMoney(
      Math.max(0, threshold - subtotal)
    )}.`;

  node.classList.remove('is-ready');
}

function recommendationItems(limit = 4) {
  if (!store || !cart.length) return [];

  const inCart = new Set(
    cart.map((item) => String(item.code || '').toUpperCase())
  );

  const picked = [];

  for (const line of cart) {
    const base = findProduct(store, line.code);

    if (!base) continue;

    const related = relatedProducts(
      base,
      store.products || [],
      8
    );

    for (const candidate of related) {
      const code = String(candidate.code || '').toUpperCase();

      if (!code) continue;
      if (inCart.has(code)) continue;

      if (
        picked.some(
          (item) =>
            String(item.code || '').toUpperCase() === code
        )
      ) {
        continue;
      }

      picked.push(candidate);

      if (picked.length >= limit) {
        return picked;
      }
    }
  }

  return picked;
}

function renderSuggestions() {
  const section = $('[data-cart-page-suggestions]');
  const list = $('[data-cart-page-suggestion-list]');

  if (!section || !list) return;

  const products = recommendationItems(4);

  if (!products.length) {
    section.hidden = true;
    list.innerHTML = '';
    return;
  }

  section.hidden = false;

  const secretMode = cart.some(
    (item) => item.messageMode === 'secret'
  );

  list.innerHTML = products.map((product) => {
    const secret = secretMode
      ? secretFor(product.code)
      : null;

    const title =
      secret?.title ||
      product.name ||
      product.code;

    const price = Number(
      product.effectivePrice ??
      product.regularPrice ??
      0
    );

    const needsChoice =
      (product.variants?.length || 0) > 0 ||
      Number(product.sauceCount || 0) > 0;

    return `
      <article class="cart-page__suggestion">

        <img
          src="${escapeHtml(
            mediaUrl(product.photos?.[0] || '')
          )}"
          alt="${escapeHtml(product.name || product.code)}"
        >

        <div class="cart-page__suggestion-body">

          <strong>
            ${escapeHtml(title)}
          </strong>

          ${secret
            ? `<small>${escapeHtml(product.name || '')}</small>`
            : ''
          }

          <span class="cart-page__suggestion-price">
            ${formatMoney(price)}
          </span>

          <button
            type="button"
            ${
              needsChoice
                ? `data-cart-page-open-product="${escapeHtml(product.code)}"`
                : `data-cart-page-add="${escapeHtml(product.code)}"`
            }
          >
            ${needsChoice ? 'Обрати' : 'Додати'}
          </button>

        </div>
      </article>
    `;
  }).join('');
}

function updateHeaderCount() {
  const count = cartCount(cart);

  document
    .querySelectorAll('[data-cart-count]')
    .forEach((node) => {
      node.textContent = String(count);
    });
}

function persist({
  eventName = '',
  eventItem = null,
} = {}) {
  saveCart(cart);

  renderItems();

  /*
   * Оновлюємо також drawer-кошик у шапці,
   * щоб він не залишався зі старими даними.
   */
  initCartDrawer();

  window.dispatchEvent(
    new CustomEvent('v3:cart-changed', {
      detail: { cart },
    })
  );

  if (eventName && eventItem) {
    track(eventName, {
      currency: 'UAH',
      value: Number(eventItem.price || 0) *
        Number(eventItem.qty || 1),
      items: [{
        item_id: eventItem.code,
        item_name: eventItem.name,
        price: eventItem.price,
        quantity: eventItem.qty,
      }],
    });
  }
}

function addRecommendation(code) {
  if (!store) return;

  const product = findProduct(store, code);
  if (!product) return;

  const secretMode = cart.some(
    (item) => item.messageMode === 'secret'
  );

  const secret = secretMode
    ? secretFor(product.code)
    : null;

  const price = Number(
    product.effectivePrice ??
    product.regularPrice ??
    0
  );

  cart = addCartItem(cart, {
    code: product.code,
    name: product.name,
    qty: 1,
    variantValue: '',
    sauces: [],
    price,
    photo: product.photos?.[0] || '',
    messageMode: secret ? 'secret' : '',
    secretTitle: secret?.title || '',
    secretSection: secret?.section || '',
    scenarioId: '',
  });

  persist({
    eventName: 'add_to_cart',
    eventItem: {
      code: product.code,
      name: product.name,
      price,
      qty: 1,
    },
  });

  showToast(
    `${secret?.title || product.name} додано в кошик`
  );
}

function bindPageActions() {
  document.addEventListener('click', (event) => {
    const target = event.target.closest('button, a');

    if (!target) return;

    const dec = target.getAttribute(
      'data-cart-page-dec'
    );

    const inc = target.getAttribute(
      'data-cart-page-inc'
    );

    const remove = target.getAttribute(
      'data-cart-page-remove'
    );

    const add = target.getAttribute(
      'data-cart-page-add'
    );

    const openProduct = target.getAttribute(
      'data-cart-page-open-product'
    );

    if (dec) {
      const item = cart.find(
        (line) => line.key === dec
      );

      if (!item) return;

      if (item.qty <= 1) {
        cart = removeCartItem(cart, dec);

        persist({
          eventName: 'remove_from_cart',
          eventItem: item,
        });

        return;
      }

      cart = updateCartQuantity(
        cart,
        dec,
        item.qty - 1
      );

      persist();
      return;
    }

    if (inc) {
      const item = cart.find(
        (line) => line.key === inc
      );

      if (!item) return;

      cart = updateCartQuantity(
        cart,
        inc,
        item.qty + 1
      );

      persist();
      return;
    }

    if (remove) {
      const item = cart.find(
        (line) => line.key === remove
      );

      cart = removeCartItem(
        cart,
        remove
      );

      persist({
        eventName: 'remove_from_cart',
        eventItem: item || null,
      });

      return;
    }

    if (add) {
      addRecommendation(add);
      return;
    }

    if (openProduct && store) {
      const secretMode = cart.some(
        (item) => item.messageMode === 'secret'
      );

      const secret = secretMode
        ? secretFor(openProduct)
        : null;

      window.location.href = productHref(
        openProduct,
        window.location.pathname,
        { secret: Boolean(secret) }
      );
    }
  });
}

async function loadFreshStore() {
  try {
    const result = await loadStore();
    store = result.data;

    const reconciled = reconcileCart(
      cart,
      store
    );

    if (reconciled.errors.length) {
      cart = reconciled.items;
      saveCart(cart);

      showToast(
        'Ми оновили кошик: деякі позиції або варіанти вже змінилися.'
      );
    } else {
      cart = reconciled.items;
      saveCart(cart);
    }

    renderItems();
    initCartDrawer();
  } catch (error) {
    console.error(error);

    /*
     * Якщо каталог тимчасово не завантажився,
     * локальний кошик усе одно лишається видимим.
     */
    renderItems();
  }
}

async function boot() {
  mountSiteShell();
  initAnalytics();

  cart = loadCart();

  /*
   * Drawer у шапці лишаємо доступним,
   * але основний перегляд тут — повна сторінка.
   */
  initCartDrawer();

  bindPageActions();
  renderItems();

  track('view_cart', {
    currency: 'UAH',
    value: cartSubtotal(cart),
    items: cart.map((item) => ({
      item_id: item.code,
      item_name: item.name,
      price: item.price,
      quantity: item.qty,
    })),
  });

  await loadFreshStore();
}

boot();
