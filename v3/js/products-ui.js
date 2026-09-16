import { appUrl, mediaUrl } from './config.js';
import { escapeHtml } from './utils.js';

export function formatMoney(value, currency = 'грн') {
  const amount = Number(value);
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 }).format(safe)} ${currency}`;
}

export function productPrice(product) {
  const effective = Number(product?.effectivePrice);
  if (Number.isFinite(effective) && effective > 0) return effective;
  const regular = Number(product?.regularPrice);
  return Number.isFinite(regular) ? regular : 0;
}

export function productHref(code, pathname = globalThis?.location?.pathname ?? '') {
  return `${appUrl('product.html', pathname)}?code=${encodeURIComponent(String(code || '').trim())}`;
}

export function categoryCover(category) {
  const possible = [
    category?.cover,
    category?.coverImage,
    category?.image,
    category?.photo,
    category?.imageUrl,
    category?.coverUrl,
  ];
  return possible.find((value) => typeof value === 'string' && value.trim())?.trim() || '';
}

export function productBadges(product) {
  const badges = [];
  if (product?.isNew === true) badges.push('Новинка');
  if (product?.saleActive === true) badges.push('Акція');
  if (product?.badge && !badges.includes(String(product.badge).trim())) badges.push(String(product.badge).trim());
  return badges.slice(0, 2);
}

export function buildProductCard(product, {
  currency = 'грн',
  pathname = globalThis?.location?.pathname ?? '',
} = {}) {
  const price = productPrice(product);
  const regular = Number(product?.regularPrice) || 0;
  const photo = mediaUrl(product?.photos?.[0]);
  const href = productHref(product?.code, pathname);
  const badges = productBadges(product);
  const needsChoice = (product?.variants?.length || 0) > 0 || Number(product?.sauceCount || 0) > 0;
  const unavailable = product?.available === false;

  return `
    <article class="product-card" data-product-code="${escapeHtml(product.code)}">
      <a class="product-card__image" href="${href}" aria-label="${escapeHtml(product.name)}">
        <img src="${escapeHtml(photo)}" alt="${escapeHtml(product.name)}" loading="lazy">
        ${badges.length ? `<span class="product-card__badges">${badges.map((badge) => `<span>${escapeHtml(badge)}</span>`).join('')}</span>` : ''}
      </a>
      <div class="product-card__body">
        <a class="product-card__title" href="${href}">${escapeHtml(product.name)}</a>
        ${product.weight ? `<p class="product-card__meta">${escapeHtml(product.weight)}</p>` : ''}
        <div class="product-card__price">
          <strong>${formatMoney(price, currency)}</strong>
          ${product?.saleActive && regular > price ? `<del>${formatMoney(regular, currency)}</del>` : ''}
        </div>
        ${unavailable
          ? '<span class="product-card__disabled">Тимчасово недоступно</span>'
          : needsChoice
            ? `<a class="button button-secondary button-block" href="${href}">Обрати</a>`
            : `<button class="button button-primary button-block" type="button" data-quick-add="${escapeHtml(product.code)}">У кошик</button>`}
      </div>
    </article>`;
}

export function buildCategoryCard(category, pathname = globalThis?.location?.pathname ?? '') {
  const image = categoryCover(category);
  const href = `${appUrl('catalog.html', pathname)}?category=${encodeURIComponent(category.code)}`;
  return `
    <a class="category-card${image ? ' has-image' : ''}" href="${href}">
      ${image ? `<img src="${escapeHtml(mediaUrl(image))}" alt="" loading="lazy">` : ''}
      <span class="category-card__body">
        <strong>${escapeHtml(category.name || category.code)}</strong>
        <small>${escapeHtml(category.description || category.shortDescription || '')}</small>
      </span>
    </a>`;
}
