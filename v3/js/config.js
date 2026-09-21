const trimSlashes = (value = '') => String(value).replace(/^\/+|\/+$/g, '');

export const CONFIG = Object.freeze({
  app: Object.freeze({
    repositoryBasePath: '/tochka-hruskotu-shop/',
    previewBasePath: '/tochka-hruskotu-shop/v3/',
    productionUrl: 'https://tockahruskotu-commits.github.io/tochka-hruskotu-shop/',
    previewUrl: 'https://tockahruskotu-commits.github.io/tochka-hruskotu-shop/v3/',
  }),
  api: Object.freeze({
    store: 'https://script.google.com/macros/s/AKfycbzCgvAMAmqrsK-KsGcPMfx60kvQbZVJII91WVZKIn-KF7bFIA3HKdKe0JmaBu4RZtX31Q/exec',
  }),
  checkout: Object.freeze({
    previewSubmitEnabled: false,
  }),
  analytics: Object.freeze({
    // Meta Pixel is active now. GA4 remains unset until the legacy IDs are reconciled.
    enabled: true,
    measurementId: null,
    metaPixelId: '1644862923685859',
  }),
  business: Object.freeze({
    name: 'Точка Хрускоту',
    phone: '+380638330860',
    email: 'tockahruskotu@gmail.com',
    freeDeliveryFrom: 2000,
    pickup: Object.freeze({
      locality: 'Млинів',
      region: 'Рівненська область',
      country: 'Україна',
    }),
  }),
  social: Object.freeze({
    telegram: 'https://t.me/tockahruskotu',
    viber: 'viber://chat?number=%2B380638330860',
    whatsapp: 'https://wa.me/380638330860',
    instagram: 'https://instagram.com/tockahruskotu',
    facebook: 'https://www.facebook.com/tockahruskotu/',
    tiktok: 'https://www.tiktok.com/@tockahruskotu',
    youtube: 'https://www.youtube.com/@ТочкаХрускоту',
  }),
  google: Object.freeze({
    profile: 'https://share.google/Fc4vC6bW6pVCzwFYW',
    review: 'https://g.page/r/CbrEqPmOVWsOEAI/review',
  }),
  protectedIntegrationPaths: Object.freeze([
    'tiktok-share.html',
    'tiktok-callback.html',
    'youtube-share.html',
    'publish.html',
    'tiktokTimlA0fBJePVC8P6zhIQsXgiu0F1N4am.txt',
  ]),
});

export function isPreview(pathname = globalThis?.location?.pathname ?? '') {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return normalized === CONFIG.app.previewBasePath.slice(0, -1)
    || normalized.startsWith(CONFIG.app.previewBasePath);
}

export function detectAppBasePath(pathname = globalThis?.location?.pathname ?? '') {
  return isPreview(pathname)
    ? CONFIG.app.previewBasePath
    : CONFIG.app.repositoryBasePath;
}

export function appUrl(path = '', pathname = globalThis?.location?.pathname ?? '') {
  const clean = trimSlashes(path);
  return `${detectAppBasePath(pathname)}${clean}`;
}

export function rootUrl(path = '') {
  const clean = trimSlashes(path);
  return `${CONFIG.app.repositoryBasePath}${clean}`;
}

export function productionUrl(path = '') {
  const clean = trimSlashes(path);
  return `${CONFIG.app.productionUrl}${clean}`;
}

export function mediaUrl(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return rootUrl('images/brand/logo.webp');
  if (/^(?:https?:|data:|blob:)/i.test(raw)) return raw;
  if (raw.startsWith(CONFIG.app.repositoryBasePath)) return raw;
  return rootUrl(raw.replace(/^(?:\.\.?\/)+/, ''));
}
