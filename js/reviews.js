import { CONFIG, isPreview } from './config.js';
import { initAnalytics } from './analytics.js';
import { postPayload } from './api.js';
import { initCartDrawer } from './cart-drawer.js';
import { loadStore } from './store.js';
import { mountSiteShell } from './ui.js';
import { clamp, escapeHtml } from './utils.js';

let store = null;

function publishedReviews() { return (store?.reviews || []).filter((review) => review?.text && Number(review.rating || 0) > 0); }
function renderSummary() {
  const reviews = publishedReviews();
  if (!reviews.length) return;
  const avg = reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length;
  document.querySelector('[data-rating-average]').textContent = avg.toFixed(1).replace('.', ',');
  document.querySelector('[data-rating-count]').textContent = `${reviews.length} ${reviews.length === 1 ? 'відгук' : 'відгуків'}`;
  document.querySelector('[data-rating-summary]').hidden = false;
}
function renderReviews() {
  const node = document.querySelector('[data-reviews-list]');
  const reviews = publishedReviews();
  node.innerHTML = reviews.length ? reviews.map((review) => `<article class="review-card"><div class="review-stars">${'★'.repeat(clamp(review.rating || 5,1,5))}</div><p>“${escapeHtml(review.text)}”</p><strong>${escapeHtml(review.name || 'Покупець')}</strong>${String(review.source || '').toLowerCase().includes('google') ? '<small class="review-source">Google</small>' : ''}${review.reply || review.answer ? `<p class="review-reply"><b>Відповідь Точки Хрускоту:</b> ${escapeHtml(review.reply || review.answer)}</p>` : ''}</article>`).join('') : '<div class="empty-state">Поки немає опублікованих відгуків.</div>';
}
function fillProducts() {
  const options = (store?.products || []).filter((p) => p.available !== false).map((p) => `<option value="${escapeHtml(p.code)}">${escapeHtml(p.name)}</option>`).join('');
  const reviewSelect = document.querySelector('[data-feedback-product]');
  const questionSelect = document.querySelector('[data-question-product]');
  reviewSelect.insertAdjacentHTML('beforeend', options);
  questionSelect.insertAdjacentHTML('beforeend', options);
  const preselected = new URLSearchParams(location.search).get('product') || '';
  if (preselected && (store?.products || []).some((p) => p.code === preselected)) { reviewSelect.value = preselected; questionSelect.value = preselected; }
}
function selectedProduct(code) { return (store?.products || []).find((p) => p.code === code) || null; }
async function send(form, type) {
  const status=form.querySelector('[data-form-status]');
  if (isPreview()) { status.textContent = type === 'review' ? 'Дякуємо! У живому магазині відгук піде на перевірку перед публікацією.' : 'Дякуємо! У живому магазині запитання буде передано нам разом із вашим контактом.'; status.className='form-status is-success'; return; }
  const data=new FormData(form); const name=String(data.get('name')||'').trim(); const text=String(data.get('text')||'').trim(); const productCode=String(data.get('productCode')||'').trim(); const product=selectedProduct(productCode); const rating=String(data.get('rating')||''); const contact=String(data.get('contact')||'').trim();
  if(name.length<2||text.length<5||(type==='review'&&!rating)||(type==='question'&&!contact)){status.textContent='Перевірте обов’язкові поля.';status.className='form-status is-error';return;}
  const button=form.querySelector('button[type="submit"]'); button.disabled=true; status.textContent='Надсилаємо…';status.className='form-status';
  try{await postPayload({action:'feedback',feedbackType:type,name,rating:type==='review'?Number(rating):'',text,contact,productCode:product?.code||'',productName:product?.name||'',website:''});status.textContent=type==='review'?'Дякуємо! Відгук передано на перевірку.':'Дякуємо! Запитання передано.';status.className='form-status is-success';form.reset();}catch(error){console.error(error);status.textContent=error.message||'Повідомлення не полетіло з першого разу. Спробуйте ще раз.';status.className='form-status is-error';}finally{button.disabled=false;}
}
async function boot(){mountSiteShell({active:'reviews'});initAnalytics();initCartDrawer();const google=document.querySelector('[data-google-review]');if(google)google.href=CONFIG.google.review;try{store=(await loadStore()).data;renderSummary();renderReviews();fillProducts();}catch(error){console.error(error);document.querySelector('[data-reviews-list]').innerHTML='<div class="empty-state">Відгуки на хвилинку сховалися. Оновіть сторінку або загляньте трохи пізніше.</div>';}document.querySelector('[data-review-form]')?.addEventListener('submit',(e)=>{e.preventDefault();send(e.currentTarget,'review');});document.querySelector('[data-question-form]')?.addEventListener('submit',(e)=>{e.preventDefault();send(e.currentTarget,'question');});}
boot();
