import { CONFIG } from './config.js';

export const ATTRIBUTION_KEY = 'tochka_hruskotu_attribution_v3';

const clean = (value) => value == null ? '' : String(value).trim();

function sourceFromReferrer(referrer) {
  if (!referrer) return { source: '(direct)', medium: '(none)' };
  try {
    return { source: new URL(referrer).hostname.replace(/^www\./, ''), medium: 'referral' };
  } catch {
    return { source: 'referral', medium: 'referral' };
  }
}

function makeSessionId(now = Date.now) {
  return `s_${now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function captureAttribution({
  href = globalThis?.location?.href ?? 'https://invalid.local/',
  referrer = globalThis?.document?.referrer ?? '',
  storage = globalThis.localStorage,
  now = Date.now,
  sessionId = makeSessionId(now),
} = {}) {
  let url;
  try {
    url = new URL(href);
  } catch {
    url = new URL('https://invalid.local/');
  }

  const referral = sourceFromReferrer(referrer);
  const source = clean(url.searchParams.get('utm_source')) || referral.source;
  const medium = clean(url.searchParams.get('utm_medium')) || referral.medium;
  const touch = {
    source,
    medium,
    campaign: clean(url.searchParams.get('utm_campaign')),
    content: clean(url.searchParams.get('utm_content')),
    term: clean(url.searchParams.get('utm_term')),
    landingPage: `${url.pathname}${url.search}`,
    referrer: clean(referrer),
    sessionId,
    capturedAt: now(),
  };

  let previous = null;
  try {
    previous = storage?.getItem ? JSON.parse(storage.getItem(ATTRIBUTION_KEY) || 'null') : null;
  } catch {
    previous = null;
  }

  const data = {
    first: previous?.first || touch,
    current: touch,
  };

  try {
    storage?.setItem?.(ATTRIBUTION_KEY, JSON.stringify(data));
  } catch {
    // Attribution must never block shopping.
  }

  return data;
}

export function readAttribution({ storage = globalThis.localStorage } = {}) {
  try {
    const data = storage?.getItem ? JSON.parse(storage.getItem(ATTRIBUTION_KEY) || 'null') : null;
    return data && data.first && data.current ? data : null;
  } catch {
    return null;
  }
}

function metaPayload(params = {}) {
  const items = Array.isArray(params.items) ? params.items : [];
  const contents = items.map((item) => ({
    id: clean(item.item_id || item.id),
    quantity: Number(item.quantity || 1),
    item_price: Number(item.price || 0),
  })).filter((item) => item.id);

  const payload = {};
  if (params.currency) payload.currency = params.currency;
  if (params.value != null && Number.isFinite(Number(params.value))) payload.value = Number(params.value);
  if (contents.length) {
    payload.content_ids = contents.map((item) => item.id);
    payload.contents = contents;
    payload.content_type = 'product';
  }
  if (params.search_term) payload.search_string = String(params.search_term);
  return payload;
}

function trackMeta(eventName, params = {}) {
  if (!CONFIG.analytics.metaPixelId || typeof globalThis.fbq !== 'function') return false;

  const standardMap = {
    view_item: 'ViewContent',
    add_to_cart: 'AddToCart',
    begin_checkout: 'InitiateCheckout',
    add_payment_info: 'AddPaymentInfo',
    purchase: 'Purchase',
    search: 'Search',
    click_phone: 'Contact',
    click_viber: 'Contact',
    click_whatsapp: 'Contact',
    click_telegram: 'Contact',
    click_messenger: 'Contact',
    click_instagram_dm: 'Contact',
  };

  const standardName = standardMap[eventName];
  if (standardName) {
    globalThis.fbq('track', standardName, metaPayload(params));
  } else {
    globalThis.fbq('trackCustom', eventName, metaPayload(params));
  }
  return true;
}

export function track(eventName, params = {}) {
  let sent = false;

  if (CONFIG.analytics.measurementId && typeof globalThis.gtag === 'function') {
    globalThis.gtag('event', eventName, params);
    sent = true;
  }

  if (trackMeta(eventName, params)) sent = true;
  return sent;
}

function initMetaPixel() {
  if (!CONFIG.analytics.metaPixelId || typeof document === 'undefined') return false;
  if (globalThis.fbq?.loaded) return true;

  if (!globalThis.fbq) {
    const fbq = function fbq() {
      if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
      else fbq.queue.push(arguments);
    };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    globalThis.fbq = fbq;
    globalThis._fbq = fbq;
  }

  if (!document.querySelector('script[data-v3-meta-pixel]')) {
    const script = document.createElement('script');
    script.async = true;
    script.dataset.v3MetaPixel = 'true';
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.append(script);
  }

  globalThis.fbq('init', CONFIG.analytics.metaPixelId);
  globalThis.fbq('track', 'PageView');
  return true;
}

function initGa4() {
  if (!CONFIG.analytics.measurementId || typeof document === 'undefined') return false;
  if (document.querySelector('script[data-v3-gtag]')) return true;

  globalThis.dataLayer = globalThis.dataLayer || [];
  globalThis.gtag = globalThis.gtag || function gtag() { globalThis.dataLayer.push(arguments); };
  globalThis.gtag('js', new Date());
  globalThis.gtag('config', CONFIG.analytics.measurementId, { send_page_view: true });

  const script = document.createElement('script');
  script.async = true;
  script.dataset.v3Gtag = 'true';
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(CONFIG.analytics.measurementId)}`;
  document.head.append(script);
  return true;
}

export function initAnalytics() {
  captureAttribution();
  if (!CONFIG.analytics.enabled) return false;
  const meta = initMetaPixel();
  const ga4 = initGa4();
  return meta || ga4;
}
