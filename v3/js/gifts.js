import { initAnalytics } from './analytics.js';
import { addProductToCart, initCartDrawer } from './cart-drawer.js';
import { buildProductCard } from './products-ui.js';
import { findProduct, loadStore } from './store.js';
import { mountSiteShell } from './ui.js';
import { escapeHtml } from './utils.js';

let store = null;
let filter = 'ALL';
const filters = [
  ['ALL','Усі подарунки'],['MINI-DONUTS','Донати'],['MINI-WAFFLES','Вафлі'],['EDIBLE-PUZZLES','Їстівні пазли'],['CERTIFICATES','Сертифікати']
];
const codes = (p) => p.categoryCodes?.length ? p.categoryCodes : String(p.categoryCode || '').split(';').map((x)=>x.trim().toUpperCase());
function giftProducts() {
  const items = (store?.products || []).filter((p) => p.available !== false && codes(p).includes('GIFT-SETS'));
  if (filter !== 'ALL') return items;
  const buckets = [
    items.filter((p) => codes(p).includes('MINI-DONUTS') && !codes(p).includes('CERTIFICATES')),
    items.filter((p) => codes(p).includes('MINI-WAFFLES')),
    items.filter((p) => codes(p).includes('EDIBLE-PUZZLES')),
    items.filter((p) => !codes(p).some((c) => ['MINI-DONUTS','MINI-WAFFLES','EDIBLE-PUZZLES','CERTIFICATES','GIFT-SETS'].includes(c))),
  ].map((bucket) => [...bucket]);
  const certs = items.filter((p) => codes(p).includes('CERTIFICATES'));
  const used = new Set();
  const result = [];
  let advanced = true;
  while (advanced) {
    advanced = false;
    for (const bucket of buckets) {
      const item = bucket.find((p) => !used.has(p.code));
      if (item) { used.add(item.code); result.push(item); advanced = true; }
    }
  }
  const leftovers = items.filter((p) => !used.has(p.code) && !codes(p).includes('CERTIFICATES'));
  leftovers.forEach((p) => { used.add(p.code); result.push(p); });
  certs.forEach((p, index) => result.splice(Math.min(5 + index * 4, result.length), 0, p));
  return result;
}
function renderFilters(){const node=document.querySelector('[data-gift-filters]');node.innerHTML=filters.map(([code,name])=>`<button type="button" class="filter-chip${filter===code?' is-active':''}" data-gift-filter="${code}">${escapeHtml(name)}</button>`).join('');}
function render() { const node=document.querySelector('[data-gift-products]'); let products=giftProducts(); if(filter!=='ALL') products=products.filter((p)=>codes(p).includes(filter)); node.innerHTML=products.length?products.map((p)=>buildProductCard(p,{currency:store?.settings?.currency||'грн',reviews:store?.reviews||[]})).join(''):'<div class="empty-state">У цьому розділі поки немає активних подарунків.</div>'; }
async function boot(){mountSiteShell({active:'gifts'});initAnalytics();initCartDrawer();renderFilters();document.addEventListener('click',(event)=>{const f=event.target.closest('[data-gift-filter]');if(f){filter=f.getAttribute('data-gift-filter')||'ALL';renderFilters();render();return;}const b=event.target.closest('[data-quick-add]');if(!b||!store)return;const p=findProduct(store,b.getAttribute('data-quick-add'));if(p)addProductToCart(p);});try{store=(await loadStore()).data;render();}catch(error){console.error(error);document.querySelector('[data-gift-products]').innerHTML='<div class="empty-state">Схоже, подарунки на хвилинку сховалися. Оновіть сторінку або загляньте трохи пізніше.</div>';}}boot();
