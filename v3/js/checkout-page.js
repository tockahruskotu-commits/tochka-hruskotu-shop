import { CONFIG, isPreview, mediaUrl } from './config.js';
import { initAnalytics, readAttribution, track } from './analytics.js';
import { fetchStore, postPayload } from './api.js';
import { cartCount, cartSubtotal, loadCart, saveCart } from './cart.js';
import { createOrderPayload, reconcileCart, validateCheckout } from './checkout-core.js';
import { initCartDrawer } from './cart-drawer.js';
import { formatMoney } from './products-ui.js';
import { loadStore, normalizeStore } from './store.js';
import { mountSiteShell } from './ui.js';
import { escapeHtml } from './utils.js';

let store = null;
let cart = [];
let submitting = false;
let completed = false;
const REQUEST_KEY = isPreview() ? 'tochka_hruskotu_checkout_request_v3_preview' : 'tochka_hruskotu_checkout_request_v3';

const $ = (selector) => document.querySelector(selector);

function requestId() {
  let id = sessionStorage.getItem(REQUEST_KEY);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() || `REQ-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(REQUEST_KEY, id);
  }
  return id;
}

function clearRequestId() { sessionStorage.removeItem(REQUEST_KEY); }
function deviceType() { return window.innerWidth <= 760 ? 'mobile' : window.innerWidth <= 1100 ? 'tablet' : 'desktop'; }

function renderSummary() {
  const node = $('[data-checkout-items]');
  const total = $('[data-checkout-total]');
  const count = $('[data-checkout-count]');
  if (!node || !total) return;
  node.innerHTML = cart.length ? cart.map((item) => `<article class="checkout-line"><img src="${escapeHtml(mediaUrl(item.photo))}" alt=""><div><strong>${escapeHtml(item.name || item.code)}</strong>${item.variantValue ? `<small>${escapeHtml(item.variantValue)}</small>` : ''}${item.sauces?.length ? `<small>Соус: ${escapeHtml(item.sauces.join(', '))}</small>` : ''}<span>${item.qty} × ${formatMoney(item.price)}</span></div><b>${formatMoney(item.qty * item.price)}</b></article>`).join('') : '<div class="empty-state">Кошик порожній. Поверніться до каталогу й додайте товари.</div>';
  total.textContent = formatMoney(cartSubtotal(cart));
  const itemsCount = cartCount(cart);
  if (count) count.textContent = String(itemsCount);
  document.querySelectorAll('[data-cart-count]').forEach((node) => { node.textContent = String(itemsCount); });
}

function fillMethods() {
  const delivery = $('[name="deliveryCode"]');
  const payment = $('[name="paymentCode"]');
  const deliveryItems = (store?.deliveryMethods || []).filter((item) => item.active !== false);
  const paymentItems = (store?.paymentMethods || []).filter((item) => item.active !== false);
  delivery.innerHTML = '<option value="">Оберіть спосіб отримання</option>' + deliveryItems.map((item) => `<option value="${escapeHtml(item.code)}">${escapeHtml(item.name || item.code)}</option>`).join('');
  payment.innerHTML = '<option value="">Оберіть спосіб оплати</option>' + paymentItems.map((item) => `<option value="${escapeHtml(item.code)}">${escapeHtml(item.name || item.code)}</option>`).join('');
}

function selectedDelivery() { const code = $('[name="deliveryCode"]')?.value; return (store?.deliveryMethods || []).find((item) => item.code === code) || null; }

function updateDeliveryFields() {
  const method = selectedDelivery();
  const regionWrap = $('[data-region-field]'); const cityWrap = $('[data-city-field]'); const branchWrap = $('[data-branch-field]');
  regionWrap.hidden = !method?.requireRegion; cityWrap.hidden = !method?.requireCity; branchWrap.hidden = !method?.requireBranch;
  const branchLabel = $('[data-branch-label]'); if (branchLabel) branchLabel.textContent = method?.branchLabel || 'Відділення або поштомат';
  if (!method?.requireRegion) $('[name="region"]').value = '';
  if (!method?.requireCity) $('[name="city"]').value = '';
  if (!method?.requireBranch) $('[name="branch"]').value = '';
}

function readForm() {
  const form = $('[data-checkout-form]');
  const deliveryCode = form.elements.deliveryCode.value;
  const isPickup = deliveryCode === 'PICKUP';
  return {
    name: form.elements.name.value.trim(), surname: form.elements.surname.value.trim(), phone: form.elements.phone.value.trim(),
    region: isPickup ? CONFIG.business.pickup.region : form.elements.region.value.trim(), city: isPickup ? CONFIG.business.pickup.locality : form.elements.city.value.trim(),
    deliveryCode, branch: form.elements.branch.value.trim(), paymentCode: form.elements.paymentCode.value,
    desiredDate: form.elements.desiredDate.value, isGift: form.elements.isGift.checked, hasCertificate: form.elements.hasCertificate.checked,
    certificateCode: form.elements.certificateCode.value.trim(), comment: form.elements.comment.value.trim(), termsAccepted: form.elements.termsAccepted.checked,
  };
}

function setStatus(message, type = '') { const node = $('[data-checkout-status]'); node.textContent = message; node.className = `checkout-status${type ? ` is-${type}` : ''}`; }

function renderSuccess(result) {
  $('[data-checkout-form-wrap]').hidden = true;
  $('[data-checkout-success]').hidden = false;
  $('[data-success-number]').textContent = result.orderNumber || result.number || result.orderId || 'прийнято';
}

async function submit(event) {
  event.preventDefault();
  if (submitting || completed) return;
  const formData = readForm();
  const method = selectedDelivery();
  const validation = validateCheckout({ form: formData, cart, deliveryMethod: method });
  if (validation) { setStatus(validation, 'error'); return; }

  if (isPreview() && !CONFIG.checkout.previewSubmitEnabled) {
    setStatus('V3 працює в тестовому режимі: реальний запис замовлення поки навмисно вимкнений. На фінальному етапі ми окремо проведемо контрольне тестове замовлення.', 'info');
    return;
  }

  submitting = true; const button = $('[data-submit-order]'); button.disabled = true; button.textContent = 'Перевіряємо ціни…'; setStatus('Оновлюємо каталог перед відправленням замовлення.', 'info');
  try {
    const freshStore = normalizeStore(await fetchStore());
    const reconciled = reconcileCart(cart, freshStore);
    if (reconciled.errors.length) {
      cart = reconciled.items; saveCart(cart); renderSummary();
      throw new Error(reconciled.errors.join(' '));
    }
    cart = reconciled.items; saveCart(cart); renderSummary(); store = freshStore;
    const attribution = readAttribution();
    const payload = createOrderPayload({ requestId: requestId(), form: formData, cart, attribution, source: 'GitHub Pages — Точка Хрускоту V3', device: deviceType() });
    button.textContent = 'Надсилаємо…'; setStatus('Передаємо замовлення. Це займе кілька секунд.', 'info');
    const result = await postPayload(payload);
    completed = true;
    track('purchase', { transaction_id: result.orderNumber || result.orderId || payload.requestId, currency: 'UAH', value: cartSubtotal(cart), items: cart.map((item) => ({ item_id: item.code, item_name: item.name, price: item.price, quantity: item.qty, item_variant: item.variantValue })) });
    saveCart([]); clearRequestId(); renderSuccess(result);
  } catch (error) { console.error(error); setStatus(error.message || 'Не вдалося оформити замовлення. Спробуйте ще раз.', 'error'); button.disabled = false; button.textContent = 'Оформити замовлення'; }
  finally { submitting = false; }
}

async function boot() {
  mountSiteShell(); initAnalytics(); initCartDrawer(); cart = loadCart();
  try {
    const result = await loadStore(); store = result.data;
    const reconciled = reconcileCart(cart, store); cart = reconciled.items; saveCart(cart); renderSummary(); fillMethods(); updateDeliveryFields();
    if (reconciled.errors.length) setStatus(reconciled.errors.join(' '), 'error');
    const threshold = Number(store.settings?.freeDeliveryFrom || store.settings?.freeDeliveryThreshold || 0); if (threshold > 0) $('[data-delivery-note]').textContent = `Безкоштовна доставка — від ${threshold.toLocaleString('uk-UA')} грн, якщо умова застосовна до обраного способу.`;
  } catch (error) { console.error(error); setStatus('Не вдалося завантажити актуальні дані магазину. Оформлення тимчасово недоступне.', 'error'); $('[data-submit-order]').disabled = true; }
  $('[name="deliveryCode"]')?.addEventListener('change', () => { updateDeliveryFields(); track('add_shipping_info', { shipping_tier: $('[name="deliveryCode"]').value }); });
  $('[name="paymentCode"]')?.addEventListener('change', () => track('add_payment_info', { payment_type: $('[name="paymentCode"]').value }));
  $('[name="hasCertificate"]')?.addEventListener('change', (event) => { $('[data-certificate-field]').hidden = !event.target.checked; });
  $('[data-checkout-form]')?.addEventListener('submit', submit);
  window.addEventListener('v3:cart-changed', (event) => {
    cart = event.detail?.cart || loadCart();
    if (store) { const reconciled = reconcileCart(cart, store); cart = reconciled.items; }
    renderSummary();
  });
  track('begin_checkout', { currency: 'UAH', value: cartSubtotal(cart), items: cart.map((item) => ({ item_id: item.code, item_name: item.name, price: item.price, quantity: item.qty })) });
}
boot();
