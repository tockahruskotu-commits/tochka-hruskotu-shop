export function chosenVariant(product, variantValue = '') {
  const target = String(variantValue || '').trim();
  if (!target) return null;
  return (product?.variants || []).find((variant) => String(variant?.value || '').trim() === target) || null;
}

export function chosenPrice(product, variantValue = '') {
  const variant = chosenVariant(product, variantValue);
  const candidate = variant?.effectivePrice ?? variant?.regularPrice ?? product?.effectivePrice ?? product?.regularPrice ?? 0;
  const price = Number(candidate);
  return Number.isFinite(price) ? price : 0;
}

export function normalizeSauceSelection(values, allowedCount) {
  const limit = Math.max(0, Math.floor(Number(allowedCount) || 0));
  if (!limit) return [];
  const unique = [];
  for (const value of Array.isArray(values) ? values : []) {
    const text = String(value || '').trim();
    if (text && !unique.includes(text)) unique.push(text);
    if (unique.length >= limit) break;
  }
  return unique;
}

export function relatedProducts(product, allProducts, limit = 4) {
  const all = (Array.isArray(allProducts) ? allProducts : []).filter((item) => item?.available !== false && item?.code && item.code !== product?.code);
  const explicit = (product?.relatedProductCodes || [])
    .map((code) => all.find((item) => String(item.code).toUpperCase() === String(code).toUpperCase()))
    .filter(Boolean);
  const category = all.filter((item) => item.categoryCode && item.categoryCode === product?.categoryCode && !explicit.some((chosen) => chosen.code === item.code));
  return [...explicit, ...category].slice(0, limit);
}
