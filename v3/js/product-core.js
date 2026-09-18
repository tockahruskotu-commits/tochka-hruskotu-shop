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

const codes = (product) => product?.categoryCodes?.length
  ? product.categoryCodes
  : String(product?.categoryCode || '').split(';').map((value) => value.trim().toUpperCase()).filter(Boolean);

const complements = {
  'CRUNCH-FRIES': ['SAUCES','COFFEE-FORTUNES','MINI-DONUTS'],
  'CRUNCH-BURGERS': ['SAUCES','COFFEE-FORTUNES','MINI-DONUTS'],
  'CRUNCH-NUGGETS': ['SAUCES','COFFEE-FORTUNES','MINI-DONUTS'],
  'MINI-DONUTS': ['COFFEE-FORTUNES','SAUCES','MINI-WAFFLES'],
  'MINI-WAFFLES': ['COFFEE-FORTUNES','SAUCES','MINI-DONUTS'],
  'EDIBLE-PUZZLES': ['MINI-DONUTS','COFFEE-FORTUNES'],
  'AIRY-COOKIES': ['COFFEE-FORTUNES','SAUCES'],
  'COFFEE-FORTUNES': ['MINI-DONUTS','MINI-WAFFLES','AIRY-COOKIES'],
};

export function relatedProducts(product, allProducts, limit = 4) {
  const all = (Array.isArray(allProducts) ? allProducts : []).filter((item) => item?.available !== false && item?.code && item.code !== product?.code && !codes(item).includes('CERTIFICATES'));
  const explicit = (product?.relatedProductCodes || []).map((code) => all.find((item) => String(item.code).toUpperCase() === String(code).toUpperCase())).filter(Boolean);
  const productCodes = codes(product);
  const complementTargets = [...new Set(productCodes.flatMap((code) => complements[code] || []))];
  const complementary = all.filter((item) => codes(item).some((code) => complementTargets.includes(code)) && !explicit.some((chosen) => chosen.code === item.code));
  const sameCategory = all.filter((item) => codes(item).some((code) => productCodes.includes(code)) && !explicit.some((chosen) => chosen.code === item.code) && !complementary.some((chosen) => chosen.code === item.code));
  return [...explicit, ...complementary, ...sameCategory].slice(0, limit);
}
