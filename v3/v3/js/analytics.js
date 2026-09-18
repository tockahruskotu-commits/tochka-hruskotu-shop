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

export function track(eventName, params = {}) {
  if (!CONFIG.analytics.enabled || !CONFIG.analytics.measurementId) return false;
  if (typeof globalThis.gtag !== 'function') return false;
  globalThis.gtag('event', eventName, params);
  return true;
}

export function initAnalytics() {
  captureAttribution();
  if (!CONFIG.analytics.enabled || !CONFIG.analytics.measurementId || typeof document === 'undefined') {
    return false;
  }
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
