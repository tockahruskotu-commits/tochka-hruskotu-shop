import { fetchStore } from './api.js';

export const STORE_CACHE_KEY = 'tochka_hruskotu_store_cache_v3';

const asText = (value, fallback = '') => value == null ? fallback : String(value).trim();
const asUpperCode = (value) => asText(value).toUpperCase();

function asNumber(value, fallback = 0) {
  if (value === '' || value == null) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = asText(value).toLocaleLowerCase('uk-UA');
  if (['так', 'yes', 'true', '1'].includes(normalized)) return true;
  if (['ні', 'no', 'false', '0'].includes(normalized)) return false;
  return fallback;
}

const asArray = (value) => Array.isArray(value) ? value : [];

function asCodeArray(value) {
  const source = Array.isArray(value) ? value : String(value ?? '').split(';');
  return [...new Set(source.map(asUpperCode).filter(Boolean))];
}

function normalizeVariant(raw = {}) {
  return {
    ...raw,
    value: asText(raw.value),
    type: asText(raw.type),
    regularPrice: asNumber(raw.regularPrice),
    salePrice: asNumber(raw.salePrice),
    effectivePrice: asNumber(raw.effectivePrice ?? raw.salePrice ?? raw.regularPrice),
    saleActive: asBoolean(raw.saleActive, false),
  };
}

export function normalizeProduct(raw = {}) {
  const availableFallback = raw.available == null ? true : false;
  return {
    ...raw,
    code: asUpperCode(raw.code),
    categoryCode: asUpperCode(raw.categoryCode),
    categoryCodes: asCodeArray(raw.categoryCodes?.length ? raw.categoryCodes : raw.categoryCode),
    name: asText(raw.name),
    shortDescription: asText(raw.shortDescription),
    fullDescription: asText(raw.fullDescription),
    weight: asText(raw.weight),
    regularPrice: asNumber(raw.regularPrice),
    effectivePrice: asNumber(raw.effectivePrice ?? raw.salePrice ?? raw.regularPrice),
    saleActive: asBoolean(raw.saleActive, false),
    available: asBoolean(raw.available, availableFallback),
    isNew: asBoolean(raw.isNew, false),
    sauceCount: Math.max(0, asNumber(raw.sauceCount, 0)),
    photos: asArray(raw.photos).filter(Boolean).map(String),
    sauces: asArray(raw.sauces).filter(Boolean),
    variants: asArray(raw.variants).map(normalizeVariant),
    relatedProductCodes: asArray(raw.relatedProductCodes).filter(Boolean).map(asUpperCode),
  };
}

function normalizeCategory(raw = {}) {
  return {
    ...raw,
    code: asUpperCode(raw.code),
    name: asText(raw.name),
    active: asBoolean(raw.active, raw.active == null ? true : false),
    order: asNumber(raw.order, 0),
  };
}


function normalizeDeliveryMethod(raw = {}) {
  return {
    ...raw,
    code: asUpperCode(raw.code),
    name: asText(raw.name),
    active: asBoolean(raw.active, raw.active == null ? true : false),
    requireBranch: asBoolean(raw.requireBranch, false),
    requireCity: asBoolean(raw.requireCity, false),
    requireRegion: asBoolean(raw.requireRegion, false),
    branchLabel: asText(raw.branchLabel),
  };
}

function normalizePaymentMethod(raw = {}) {
  return {
    ...raw,
    code: asUpperCode(raw.code),
    name: asText(raw.name),
    active: asBoolean(raw.active, raw.active == null ? true : false),
  };
}

export function normalizeStore(raw = {}) {
  return {
    ...raw,
    success: raw.success === true,
    settings: raw.settings && typeof raw.settings === 'object' ? { ...raw.settings } : {},
    categories: asArray(raw.categories).map(normalizeCategory),
    products: asArray(raw.products).map(normalizeProduct),
    deliveryMethods: asArray(raw.deliveryMethods).map(normalizeDeliveryMethod),
    paymentMethods: asArray(raw.paymentMethods).map(normalizePaymentMethod),
    reviews: asArray(raw.reviews).map((item) => ({ ...item })),
  };
}

export function findProduct(store, code) {
  const target = asUpperCode(code);
  if (!target) return null;
  return asArray(store?.products).find((product) => asUpperCode(product?.code) === target) || null;
}

export function findCategory(store, code) {
  const target = asUpperCode(code);
  if (!target) return null;
  return asArray(store?.categories).find((category) => asUpperCode(category?.code) === target) || null;
}

export function readStoreCache({ storage = globalThis.localStorage } = {}) {
  if (!storage || typeof storage.getItem !== 'function') return null;
  try {
    const raw = storage.getItem(STORE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.data || !Number.isFinite(Number(parsed.savedAt))) {
      return null;
    }
    return {
      savedAt: Number(parsed.savedAt),
      data: normalizeStore(parsed.data),
    };
  } catch {
    return null;
  }
}

export function writeStoreCache(data, {
  storage = globalThis.localStorage,
  now = Date.now,
} = {}) {
  if (!storage || typeof storage.setItem !== 'function') return false;
  try {
    storage.setItem(STORE_CACHE_KEY, JSON.stringify({
      savedAt: now(),
      data: normalizeStore(data),
    }));
    return true;
  } catch {
    return false;
  }
}

export async function loadStore({
  fetchStoreImpl = fetchStore,
  storage = globalThis.localStorage,
  now = Date.now,
  preferCache = true,
} = {}) {
  const cached = readStoreCache({ storage });
  if (preferCache && cached) {
    Promise.resolve()
      .then(() => fetchStoreImpl())
      .then((payload) => {
        const fresh = normalizeStore(payload);
        writeStoreCache(fresh, { storage, now });
        try {
          globalThis.dispatchEvent?.(new CustomEvent('v3:store-updated', { detail: { data: fresh } }));
        } catch {}
      })
      .catch(() => {});
    return { data: cached.data, source: 'cache', warning: null, savedAt: cached.savedAt, revalidating: true };
  }
  try {
    const fresh = normalizeStore(await fetchStoreImpl());
    writeStoreCache(fresh, { storage, now });
    return { data: fresh, source: 'server', warning: null };
  } catch (error) {
    if (!cached) throw error;
    return { data: cached.data, source: 'cache', warning: error, savedAt: cached.savedAt };
  }
}
