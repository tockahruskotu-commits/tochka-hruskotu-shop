import { initAnalytics } from './analytics.js';
import { addProductToCart, initCartDrawer } from './cart-drawer.js';
import { buildProductCard } from './products-ui.js';
import { findProduct, loadStore } from './store.js';
import { mountSiteShell } from './ui.js';

let store = null;
function isCertificate(product) { return (product.categoryCodes || String(product.categoryCode || '').split(';')).map((x) => String(x).trim().toUpperCase()).includes('CERTIFICATES'); }
function render() {
  const node = document.querySelector('[data-certificate-products]');
  const products = (store?.products || []).filter((product) => product.available !== false && isCertificate(product));
  node.innerHTML = products.length ? products.map((product) => buildProductCard(product, { currency: store?.settings?.currency || 'грн', reviews: store?.reviews || [] })).join('') : '<div class="empty-state">Сертифікати тимчасово не завантажилися.</div>';
}
async function boot() { mountSiteShell({ active: 'gifts' }); initAnalytics(); initCartDrawer(); document.addEventListener('click',(event)=>{const button=event.target.closest('[data-quick-add]'); if(!button||!store)return; const product=findProduct(store,button.getAttribute('data-quick-add')); if(product)addProductToCart(product);}); try{store=(await loadStore()).data;render();}catch(error){console.error(error);document.querySelector('[data-certificate-products]').innerHTML='<div class="empty-state">Не вдалося завантажити сертифікати.</div>';}} boot();
