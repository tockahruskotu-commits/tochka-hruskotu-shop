import { CONFIG, isPreview } from './config.js';
import { initAnalytics } from './analytics.js';
import { cartCount, loadCart } from './cart.js';
import { mountSiteShell } from './ui.js';

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

function refreshHeaderCart() {
  const count = cartCount(loadCart());
  document.querySelectorAll('[data-cart-count]').forEach((node) => {
    node.textContent = String(count);
  });
}

function boot() {
  document.documentElement.dataset.appVersion = 'v3';
  document.documentElement.dataset.environment = isPreview() ? 'preview' : 'production';

  mountSiteShell({ active: 'home' });
  initAnalytics();
  refreshHeaderCart();

  setText('[data-brand-name]', CONFIG.business.name);
  setText('[data-pickup-location]', `${CONFIG.business.pickup.locality}, ${CONFIG.business.pickup.region}`);
  setText('[data-env-label]', isPreview() ? 'V3 test' : 'V3 production');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
