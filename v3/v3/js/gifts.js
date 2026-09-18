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
function giftProducts() { return (store?.products || []).filter((p) => p.available !== false && codes(p).includes('GIFT-SETS')); }
function renderFilters(){const node=document.querySelector('[data-gift-filters]');node.innerHTML=filters.map(([code,name])=>`<button type="button" class="filter-chip${filter===code?' is-active':''}" data-gift-filter="${code}">${escapeHtml(name)}</button>`).join('');}
function render() { const node=document.querySelector('[data-gift-products]'); let products=giftProducts(); if(filter!=='ALL') products=products.filter((p)=>codes(p).includes(filter)); node.innerHTML=products.length?products.map((p)=>buildProductCard(p,{currency:store?.settings?.currency||'грн',reviews:store?.reviews||[]})).join(''):'<div class="empty-state">У цьому розділі поки немає активних подарунків.</div>'; }
async function boot(){mountSiteShell({active:'gifts'});initAnalytics();initCartDrawer();renderFilters();document.addEventListener('click',(event)=>{const f=event.target.closest('[data-gift-filter]');if(f){filter=f.getAttribute('data-gift-filter')||'ALL';renderFilters();render();return;}const b=event.target.closest('[data-quick-add]');if(!b||!store)return;const p=findProduct(store,b.getAttribute('data-quick-add'));if(p)addProductToCart(p);});try{store=(await loadStore()).data;render();}catch(error){console.error(error);document.querySelector('[data-gift-products]').innerHTML='<div class="empty-state">Не вдалося завантажити подарунки. Спробуйте пізніше.</div>';}}boot();
