import { isPreview } from './config.js';

const PROD_CART_KEY = 'tochka_hruskotu_cart_v3';
const PREVIEW_CART_KEY = 'tochka_hruskotu_cart_v3_preview';

const text = (value) => value == null ? '' : String(value).trim();
const upper = (value) => text(value).toUpperCase();
const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeSauces = (value) => Array.isArray(value)
  ? value.map(text).filter(Boolean)
  : [];

function lineKey({ code, variantValue, sauces, messageMode, secretTitle }) {
  const sauceKey = [...normalizeSauces(sauces)]
    .map((item) => item.toLocaleLowerCase('uk-UA'))
    .sort((a, b) => a.localeCompare(b, 'uk-UA'))
    .join('|');
  return [upper(code), text(variantValue), sauceKey, text(messageMode), text(secretTitle)].join('::');
}

export function cartStorageKey(pathname = globalThis?.location?.pathname ?? '') {
  return isPreview(pathname) ? PREVIEW_CART_KEY : PROD_CART_KEY;
}

export function normalizeCartItem(raw = {}) {
  const qty = Math.max(1, Math.floor(number(raw.qty ?? raw.quantity, 1)));
  const item = {
    ...raw,
    code: upper(raw.code),
    name: text(raw.name),
    variantValue: text(raw.variantValue),
    sauces: normalizeSauces(raw.sauces),
    qty,
    price: Math.max(0, number(raw.price, 0)),
    photo: text(raw.photo),
    messageMode: text(raw.messageMode),
    secretTitle: text(raw.secretTitle),
    secretSection: text(raw.secretSection),
    scenarioId: text(raw.scenarioId),
  };
  item.key = lineKey(item);
  return item;
}

export function normalizeCart(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeCartItem)
    .filter((item) => item.code);
}

export function addCartItem(cart, rawItem) {
  const current = normalizeCart(cart);
  const nextItem = normalizeCartItem(rawItem);
  if (!nextItem.code) return current;
  const index = current.findIndex((item) => item.key === nextItem.key);
  if (index < 0) return [...current, nextItem];
  return current.map((item, i) => i === index
    ? normalizeCartItem({ ...item, ...nextItem, qty: item.qty + nextItem.qty })
    : item);
}

export function updateCartQuantity(cart, key, qty) {
  const nextQty = Math.floor(number(qty, 0));
  if (nextQty <= 0) return removeCartItem(cart, key);
  return normalizeCart(cart).map((item) => item.key === key
    ? normalizeCartItem({ ...item, qty: nextQty })
    : item);
}

export function removeCartItem(cart, key) {
  return normalizeCart(cart).filter((item) => item.key !== key);
}

export function cartCount(cart) {
  return normalizeCart(cart).reduce((sum, item) => sum + item.qty, 0);
}

export function cartSubtotal(cart) {
  return normalizeCart(cart).reduce((sum, item) => sum + item.qty * item.price, 0);
}

export function loadCart({
  storage = globalThis.localStorage,
  pathname = globalThis?.location?.pathname ?? '',
} = {}) {
  if (!storage?.getItem) return [];
  try {
    const raw = storage.getItem(cartStorageKey(pathname));
    return raw ? normalizeCart(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function saveCart(cart, {
  storage = globalThis.localStorage,
  pathname = globalThis?.location?.pathname ?? '',
} = {}) {
  if (!storage?.setItem) return false;
  try {
    storage.setItem(cartStorageKey(pathname), JSON.stringify(normalizeCart(cart)));
    return true;
  } catch {
    return false;
  }
}
