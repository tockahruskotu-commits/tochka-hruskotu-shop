import { CONFIG, isPreview } from './config.js';
import { initAnalytics } from './analytics.js';
import { postPayload } from './api.js';
import { initCartDrawer } from './cart-drawer.js';
import { loadStore } from './store.js';
import { mountSiteShell } from './ui.js';
import { clamp, escapeHtml } from './utils.js';

let store = null;

function renderReviews() {
  const node = document.querySelector('[data-reviews-list]');
  const reviews = (store?.reviews || []).filter((review) => review?.text);
  node.innerHTML = reviews.length ? reviews.map((review) => `<article class="review-card"><div class="review-stars">${'★'.repeat(clamp(review.rating || 5, 1, 5))}</div><p>“${escapeHtml(review.text)}”</p><strong>${escapeHtml(review.name || 'Покупець')}</strong>${review.reply || review.answer ? `<p><b>Відповідь Точки Хрускоту:</b> ${escapeHtml(review.reply || review.answer)}</p>` : ''}</article>`).join('') : '<div class="empty-state">Поки немає опублікованих відгуків.</div>';
}

function fillProducts() {
  const select = document.querySelector('[data-feedback-product]');
  select.innerHTML = '<option value="">Оберіть товар</option>' + (store?.products || []).filter((p) => p.available !== false).map((p) => `<option value="${escapeHtml(p.code)}">${escapeHtml(p.name)}</option>`).join('');
}

async function submitFeedback(event) {
  event.preventDefault();
  if (isPreview()) {
    const status = event.currentTarget.querySelector('[data-form-status]');
    status.textContent = 'У тестовій V3 реальне надсилання відгуків вимкнене. Форму перевіряємо без запису в основну таблицю.';
    status.className = 'form-status is-success';
    return;
  }
  const form = event.currentTarget;
  const status = form.querySelector('[data-form-status]');
  const button = form.querySelector('button[type="submit"]');
  const type = form.elements.feedbackType.value;
  const productCode = form.elements.productCode.value;
  const product = (store?.products || []).find((p) => p.code === productCode);
  const name = form.elements.name.value.trim();
  const text = form.elements.text.value.trim();
  const rating = form.elements.rating.value;
  if (!product || name.length < 2 || text.length < 5 || (type === 'review' && !rating)) {
    status.textContent = 'Перевірте товар, ім’я, оцінку та текст повідомлення.'; status.className = 'form-status is-error'; return;
  }
  button.disabled = true; status.textContent = 'Надсилаємо…'; status.className = 'form-status';
  try {
    await postPayload({ action: 'feedback', feedbackType: type, name, rating: type === 'review' ? Number(rating) : '', text, contact: '', productCode: product.code, productName: product.name, website: '' });
    status.textContent = 'Дякуємо! Повідомлення передано. Після перевірки воно з’явиться на сайті.'; status.className = 'form-status is-success'; form.reset();
  } catch (error) { console.error(error); status.textContent = error.message || 'Не вдалося надіслати повідомлення.'; status.className = 'form-status is-error'; }
  finally { button.disabled = false; }
}

async function boot() {
  mountSiteShell({ active: 'reviews' }); initAnalytics(); initCartDrawer();
  const google = document.querySelector('[data-google-review]'); if (google) google.href = CONFIG.google.review;
  try { store = (await loadStore()).data; renderReviews(); fillProducts(); }
  catch (error) { console.error(error); document.querySelector('[data-reviews-list]').innerHTML = '<div class="empty-state">Не вдалося завантажити відгуки.</div>'; }
  document.querySelector('[data-feedback-form]')?.addEventListener('submit', submitFeedback);
}
boot();
