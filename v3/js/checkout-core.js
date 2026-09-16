import { findProduct } from './store.js';
import { chosenPrice, normalizeSauceSelection, chosenVariant } from './product-core.js';
import { normalizeCart } from './cart.js';

export function reconcileCart(cart, store) {
  const items = [];
  const errors = [];
  for (const line of normalizeCart(cart)) {
    const product = findProduct(store, line.code);
    if (!product) { errors.push(`Товар ${line.code} більше не знайдено.`); continue; }
    if (product.available === false) { errors.push(`${product.name} тимчасово недоступний.`); continue; }
    if (line.variantValue && !chosenVariant(product, line.variantValue)) { errors.push(`Для «${product.name}» обраний варіант більше недоступний.`); continue; }
    const sauces = normalizeSauceSelection(line.sauces, product.sauceCount);
    const requiredSauces = Math.max(0, Number(product.sauceCount || 0));
    if (requiredSauces && sauces.length < requiredSauces) { errors.push(`Для «${product.name}» потрібно обрати ${requiredSauces} соус(и).`); continue; }
    items.push({ ...line, name: product.name, photo: product.photos?.[0] || line.photo || '', sauces, price: chosenPrice(product, line.variantValue) });
  }
  return { items, errors, total: items.reduce((sum, item) => sum + item.price * item.qty, 0) };
}

export function validateCheckout({ form, cart, deliveryMethod }) {
  if (!Array.isArray(cart) || !cart.length) return 'Кошик порожній.';
  if (!String(form?.name || '').trim()) return 'Вкажіть, будь ласка, ваше ім’я.';
  if (!String(form?.surname || '').trim()) return 'Вкажіть, будь ласка, ваше прізвище.';
  if (!/^\+380\d{9}$/.test(String(form?.phone || '').replace(/[\s()-]/g, ''))) return 'Перевірте номер телефону. Формат: +380XXXXXXXXX.';
  if (!form?.deliveryCode || !deliveryMethod) return 'Оберіть спосіб отримання замовлення.';
  if (deliveryMethod.requireRegion && !String(form.region || '').trim()) return 'Вкажіть область.';
  if (deliveryMethod.requireCity && !String(form.city || '').trim()) return 'Вкажіть місто або населений пункт.';
  if (deliveryMethod.requireBranch && !String(form.branch || '').trim()) return deliveryMethod.branchLabel ? `Заповніть поле «${deliveryMethod.branchLabel}».` : 'Вкажіть відділення або поштомат.';
  if (!form?.paymentCode) return 'Оберіть спосіб оплати.';
  if (form?.hasCertificate && !String(form.certificateCode || '').trim()) return 'Введіть код подарункового сертифіката.';
  if (!form?.termsAccepted) return 'Потрібно погодитися з умовами замовлення і доставки.';
  return '';
}

export function createOrderPayload({ requestId, form, cart, attribution = null, source = 'GitHub Pages — Точка Хрускоту V3', device = '' }) {
  const current = attribution?.current || {};
  const first = attribution?.first || {};
  return {
    requestId,
    customer: { name: String(form.name || '').trim(), surname: String(form.surname || '').trim(), phone: String(form.phone || '').trim(), region: String(form.region || '').trim(), city: String(form.city || '').trim() },
    recipient: {},
    delivery: { code: form.deliveryCode, branch: String(form.branch || '').trim() },
    paymentCode: form.paymentCode,
    desiredDate: form.desiredDate || '',
    gift: form.isGift ? { isGift: true, isSurprise: false, hidePrice: false, wrap: '', signatureMode: '', hint: '', courageScenario: '', card: { enabled: false } } : { isGift: false },
    certificateCode: form.hasCertificate ? String(form.certificateCode || '').trim() : '',
    comment: String(form.comment || '').trim(),
    source,
    items: normalizeCart(cart).map((item) => ({ code: item.code, quantity: item.qty, variantValue: item.variantValue || '', sauces: Array.isArray(item.sauces) ? item.sauces : [] })),
    utm_source: current.source || '', utm_medium: current.medium || '', utm_campaign: current.campaign || '', utm_content: current.content || '', utm_term: current.term || '', landing_page: current.landingPage || '', referrer: current.referrer || '', session_id: current.sessionId || '', first_touch_source: first.source || '', first_touch_medium: first.medium || '', device,
  };
}
