import { initAnalytics } from './analytics.js';
import { initCartDrawer } from './cart-drawer.js';
import { loadStore } from './store.js';
import { mountSiteShell } from './ui.js';
import { escapeHtml } from './utils.js';

function renderMethods(node, items, emptyText) {
  node.innerHTML = items.length ? items.filter((item) => item.active !== false).map((item) => `<li><strong>${escapeHtml(item.name || item.code)}</strong>${item.note ? `<br><span>${escapeHtml(item.note)}</span>` : ''}</li>`).join('') : `<li>${emptyText}</li>`;
}

async function boot() {
  mountSiteShell({ active: 'delivery' }); initAnalytics(); initCartDrawer();
  try {
    const { data: store } = await loadStore();
    renderMethods(document.querySelector('[data-delivery-methods]'), store.deliveryMethods || [], 'Способи доставки уточнюються.');
    renderMethods(document.querySelector('[data-payment-methods]'), store.paymentMethods || [], 'Способи оплати уточнюються.');
    const threshold = Number(store.settings?.freeDeliveryFrom || store.settings?.freeDeliveryFromAmount || store.settings?.freeDeliveryThreshold || 0);
    const node = document.querySelector('[data-free-delivery]');
    if (node) node.textContent = threshold > 0 ? `Для замовлень від ${threshold.toLocaleString('uk-UA')} грн діє умова безкоштовної доставки, якщо вона застосовна до обраного способу.` : 'Вартість доставки залежить від обраного способу та тарифів перевізника.';
  } catch (error) { console.error(error); }
}
boot();
