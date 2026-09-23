const normalize = (value) => String(value ?? '')
  .toLocaleLowerCase('uk-UA')
  .replace(/[’']/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

export const CATALOG_GROUPS = Object.freeze([
  { code: 'CRUNCH-FRIES', name: 'Кранч-Фрі', description: 'Хрумкі палички з соусом' },
  { code: 'BURGERS-NUGGETS', name: 'Бургери та нагетси', description: 'Солодкі формати з характером', categories: ['CRUNCH-BURGERS', 'CRUNCH-NUGGETS'] },
  { code: 'POPS', name: 'Попси', description: 'Хрумкі та кексові попси', categories: ['CRUNCH-POPS', 'CUPCAKE-POPS'] },
  { code: 'MINI-DONUTS', name: 'Міні-донати', description: 'Класичні та з начинкою' },
  { code: 'MINI-WAFFLES', name: 'Міні-вафлі', description: 'П’ять смаків і подарункові формати' },
  { code: 'COOKIES-PUZZLES', name: 'Печиво та їстівні пазли', description: 'Печиво, яке можна ще й складати', categories: ['AIRY-COOKIES', 'EDIBLE-PUZZLES'] },
  { code: 'COFFEE-FORTUNES', name: 'Кавові передбачення', description: 'Маленькі послання до кави' },
  { code: 'GIFT-SETS', name: 'Подарунки', description: 'Набори, бокси та сертифікати', categories: ['GIFT-SETS', 'CERTIFICATES'] },
  { code: 'SAUCES', name: 'Фірмові соуси', description: 'Ще один смак до хрускоту' },
]);

function codesOf(product) {
  if (Array.isArray(product?.categoryCodes) && product.categoryCodes.length) {
    return product.categoryCodes.map((value) => String(value || '').trim().toUpperCase()).filter(Boolean);
  }
  return String(product?.categoryCode || '')
    .split(';')
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
}

export function categoryTargets(category = 'ALL') {
  const code = String(category || 'ALL').trim().toUpperCase();
  if (code === 'ALL') return [];
  const group = CATALOG_GROUPS.find((item) => item.code === code);
  return group?.categories?.length ? group.categories : [code];
}

export function productMatchesCategory(product, category = 'ALL') {
  const targets = categoryTargets(category);
  if (!targets.length) return true;
  const codes = codesOf(product);
  return targets.some((target) => codes.includes(target));
}

export function filterProducts(products, { category = 'ALL', query = '' } = {}) {
  const needle = normalize(query);
  return (Array.isArray(products) ? products : []).filter((product) => {
    if (!product?.code || product.available === false) return false;
    if (!productMatchesCategory(product, category)) return false;
    if (!needle) return true;
    const haystack = normalize([
      product.name,
      product.shortDescription,
      product.fullDescription,
      product.searchWords,
      product.keywords,
      product.weight,
      ...(Array.isArray(product.categoryCodes) ? product.categoryCodes : []),
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
