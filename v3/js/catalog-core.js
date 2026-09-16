const normalize = (value) => String(value ?? '')
  .toLocaleLowerCase('uk-UA')
  .replace(/[’']/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

export function filterProducts(products, { category = 'ALL', query = '' } = {}) {
  const targetCategory = String(category || 'ALL').trim().toUpperCase();
  const needle = normalize(query);
  return (Array.isArray(products) ? products : []).filter((product) => {
    if (!product?.code || product.available === false) return false;
    if (targetCategory !== 'ALL' && String(product.categoryCode || '').trim().toUpperCase() !== targetCategory) return false;
    if (!needle) return true;
    const haystack = normalize([
      product.name,
      product.shortDescription,
      product.fullDescription,
      product.searchWords,
      product.keywords,
      product.weight,
    ].filter(Boolean).join(' '));
    return haystack.includes(needle);
  });
}

export function sortProducts(products, mode = 'default') {
  const items = [...(Array.isArray(products) ? products : [])];
  const price = (product) => Number(product?.effectivePrice ?? product?.regularPrice ?? 0) || 0;
  if (mode === 'price-asc') return items.sort((a, b) => price(a) - price(b));
  if (mode === 'price-desc') return items.sort((a, b) => price(b) - price(a));
  if (mode === 'name') return items.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'uk-UA'));
  return items.sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0));
}
