/* ==========================================================
   ТОЧКА ХРУСКОТУ — SITE V2
   Каталог, пошук, кілька категорій, кошик і GA4
   ========================================================== */

const STORE_API_URL =
  "https://script.google.com/macros/s/AKfycbzCgvAMAmqrsK-KsGcPMfx60kvQbZVJII91WVZKIn-KF7bFIA3HKdKe0JmaBu4RZtX31Q/exec";

const CART_STORAGE_KEY = "tochka_hruskotu_cart_v3";
const STORE_CACHE_KEY = "tochka_hruskotu_store_cache_v1";
const STORE_REQUEST_TIMEOUT_MS = 10000;
const PAGE_LOADER_MAX_MS = 900;

let store = null;
let cart = loadCart();

let activeCategory = "ALL";
let searchQuery = "";
let sortMode = "default";
let toastTimer = null;

const $ = selector =>
  document.querySelector(selector);

const elements = {
  pageLoader: $("#pageLoader"),

  headerLogo: $("#headerLogo"),
  footerLogo: $("#footerLogo"),

  headerStoreName: $("#headerStoreName"),
  footerStoreName: $("#footerStoreName"),

  footerGoogleProfile:
    $("#footerGoogleProfile"),

  headerSearchButton:
    $("#headerSearchButton"),

  catalogSearch:
    $("#catalogSearch"),

  clearSearch:
    $("#clearSearch"),

  sortSelect:
    $("#sortSelect"),

  categoryFilters:
    $("#categoryFilters"),

  catalogueCategoriesSection:
    $(".catalogue-categories-section"),

  productGrid:
    $("#productGrid"),

  catalogueResultText:
    $("#catalogueResultText"),

  catalogueEmpty:
    $("#catalogueEmpty"),

  resetCatalogue:
    $("#resetCatalogue"),

  storeError:
    $("#storeError"),

  catalogueSection:
    $("#catalogue"),

  mobileMenuButton:
    $("#mobileMenuButton"),

  mobileMenu:
    $("#mobileMenu"),

  mobileMenuOverlay:
    $("#mobileMenuOverlay"),

  closeMobileMenu:
    $("#closeMobileMenu"),

  cartButton:
    $("#cartButton"),

  cartCount:
    $("#cartCount"),

  cartOverlay:
    $("#cartOverlay"),

  cartPanel:
    $("#cartPanel"),

  closeCartButton:
    $("#closeCartButton"),

  cartItems:
    $("#cartItems"),

  cartProgress:
    $("#cartProgress"),

  cartSuggestions:
    $("#cartSuggestions"),

  cartTotal:
    $("#cartTotal"),

  checkoutButton:
    $("#checkoutButton"),

  continueShoppingButton:
    $("#continueShoppingButton"),

  toast:
    $("#toast")
};


/* ==========================================================
   1. ДОПОМІЖНІ ФУНКЦІЇ
   ========================================================== */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeText(value) {
  return String(value ?? "")
    .toLocaleLowerCase("uk-UA")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function safeNumber(
  value,
  fallback = 0
) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function formatMoney(value) {
  const currency =
    store?.settings?.currency ||
    "грн";

  const amount =
    safeNumber(value, 0);

  return (
    new Intl.NumberFormat(
      "uk-UA",
      {
        maximumFractionDigits: 2
      }
    ).format(amount) +
    " " +
    currency
  );
}

function findProduct(code) {
  return (
    (store?.products || []).find(
      product =>
        String(product.code || "")
          .trim()
          .toUpperCase() ===
        String(code || "")
          .trim()
          .toUpperCase()
    ) || null
  );
}

function findCategory(code) {
  return (
    (store?.categories || []).find(
      category =>
        String(category.code || "")
          .trim()
          .toUpperCase() ===
        String(code || "")
          .trim()
          .toUpperCase()
    ) || null
  );
}


/* ==========================================================
   2. КІЛЬКА КАТЕГОРІЙ В ОДНОМУ ТОВАРІ
   Наприклад:
   MINI-WAFFLES;GIFT-SETS
   ========================================================== */

function productCategoryCodes(product) {
  const raw =
    String(
      product?.categoryCode || ""
    ).trim();

  if (!raw) {
    return [];
  }

  return [
    ...new Set(
      raw
        .split(/[;,|]+/)
        .map(code =>
          code
            .trim()
            .toUpperCase()
        )
        .filter(Boolean)
    )
  ];
}

function productHasCategory(
  product,
  categoryCode
) {
  const wanted =
    String(categoryCode || "")
      .trim()
      .toUpperCase();

  if (!wanted) {
    return false;
  }

  return productCategoryCodes(
    product
  ).includes(wanted);
}

function primaryCategoryCode(product) {
  return (
    productCategoryCodes(product)[0] ||
    ""
  );
}

function productCategoryNames(product) {
  return productCategoryCodes(product)
    .map(code => {
      const category =
        findCategory(code);

      return (
        category?.name ||
        code
      );
    })
    .filter(Boolean);
}

function primaryCategoryName(product) {
  return (
    productCategoryNames(product)[0] ||
    ""
  );
}


/* ==========================================================
   3. ТОВАР
   ========================================================== */

function productUrl(product) {
  return (
    `product.html?code=` +
    encodeURIComponent(
      product.code
    )
  );
}

function productImage(product) {
  return (
    product?.photos?.[0] ||
    "images/hero/main-cover.webp"
  );
}

function productHasChoices(product) {
  return Boolean(
    (
      Array.isArray(
        product?.variants
      ) &&
      product.variants.length
    ) ||
    safeNumber(
      product?.sauceCount,
      0
    ) > 0
  );
}

function productUnitPrice(product) {
  if (!product) {
    return 0;
  }

  const directPrice =
    safeNumber(
      product.effectivePrice,
      NaN
    );

  if (
    Number.isFinite(
      directPrice
    )
  ) {
    return directPrice;
  }

  if (
    Array.isArray(
      product.variants
    ) &&
    product.variants.length
  ) {
    const prices =
      product.variants
        .map(variant =>
          safeNumber(
            variant.effectivePrice,
            NaN
          )
        )
        .filter(
          Number.isFinite
        );

    if (prices.length) {
      return Math.min(
        ...prices
      );
    }
  }

  return safeNumber(
    product.regularPrice,
    0
  );
}


/* ==========================================================
   4. GA4
   ========================================================== */

function trackGa4Event(
  eventName,
  params = {}
) {
  if (
    typeof window.gtag !==
    "function"
  ) {
    return;
  }

  try {
    window.gtag(
      "event",
      eventName,
      params
    );
  } catch (error) {
    console.warn(
      "GA4 event error:",
      error
    );
  }
}

function ga4ItemFromProduct(
  product,
  quantity = 1
) {
  return {
    item_id:
      product.code,

    item_name:
      product.name,

    item_category:
      primaryCategoryName(
        product
      ),

    price:
      productUnitPrice(
        product
      ),

    quantity
  };
}


/* ==========================================================
   5. ПОВІДОМЛЕННЯ
   ========================================================== */

function showToast(message) {
  if (!elements.toast) {
    return;
  }

  clearTimeout(
    toastTimer
  );

  elements.toast.textContent =
    message;

  elements.toast.classList.add(
    "is-visible"
  );

  toastTimer =
    setTimeout(() => {
      elements.toast
        .classList
        .remove(
          "is-visible"
        );
    }, 2400);
}

function hidePageLoader() {
  if (
    !elements.pageLoader
  ) {
    return;
  }

  elements.pageLoader
    .classList
    .add(
      "is-hidden"
    );
}


/* ==========================================================
   6. ПОШУК
   ========================================================== */

function hasActiveSearch() {
  return (
    normalizeText(
      searchQuery
    ).length > 0
  );
}

function updateSearchMode() {
  const searching =
    hasActiveSearch();

  if (
    elements.catalogueCategoriesSection
  ) {
    elements
      .catalogueCategoriesSection
      .hidden =
      searching;
  }

  if (
    elements.catalogSearch
  ) {
    elements.catalogSearch
      .setAttribute(
        "aria-expanded",
        searching
          ? "true"
          : "false"
      );
  }
}

function scrollToCatalogueResults() {
  if (
    !elements.catalogueSection
  ) {
    return;
  }

  elements.catalogueSection
    .scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
}

function prepareSearchField() {
  if (
    !elements.catalogSearch
  ) {
    return;
  }

  /*
    Chrome у type="search"
    показує свій хрестик.
    У нас є власний.
  */

  elements.catalogSearch.type =
    "text";

  elements.catalogSearch
    .setAttribute(
      "role",
      "searchbox"
    );

  elements.catalogSearch
    .setAttribute(
      "aria-controls",
      "productGrid"
    );
}


/* ==========================================================
   7. КЕШ
   ========================================================== */

function readCachedStore() {
  try {
    const raw =
      localStorage.getItem(
        STORE_CACHE_KEY
      );

    if (!raw) {
      return null;
    }

    const cached =
      JSON.parse(raw);

    if (
      !cached ||
      typeof cached !==
        "object" ||
      !cached.data
    ) {
      return null;
    }

    return cached;
  } catch (error) {
    console.warn(
      "Не вдалося прочитати кеш магазину:",
      error
    );

    return null;
  }
}

function saveCachedStore(data) {
  try {
    localStorage.setItem(
      STORE_CACHE_KEY,
      JSON.stringify({
        savedAt:
          Date.now(),
        data
      })
    );
  } catch (error) {
    console.warn(
      "Не вдалося зберегти кеш магазину:",
      error
    );
  }
}


/* ==========================================================
   8. ЗАВАНТАЖЕННЯ МАГАЗИНУ
   ========================================================== */

async function fetchStoreFromServer() {
  const controller =
    new AbortController();

  const timeoutId =
    setTimeout(
      () =>
        controller.abort(),
      STORE_REQUEST_TIMEOUT_MS
    );

  try {
    const response =
      await fetch(
        `${STORE_API_URL}?action=store&_=${Date.now()}`,
        {
          method: "GET",
          redirect: "follow",
          signal:
            controller.signal
        }
      );

    if (!response.ok) {
      throw new Error(
        `Помилка сервера: ${response.status}`
      );
    }

    const text =
      await response.text();

    let result;

    try {
      result =
        JSON.parse(text);
    } catch {
      throw new Error(
        "Сервер повернув некоректну відповідь."
      );
    }

    if (!result.success) {
      throw new Error(
        result.error ||
          "Не вдалося завантажити магазин."
      );
    }

    return result;
  } finally {
    clearTimeout(
      timeoutId
    );
  }
}

function renderStore(data) {
  store = data;

  if (
    elements.storeError
  ) {
    elements.storeError.hidden =
      true;
  }

  applySettings();
  renderCategories();
  updateSearchMode();
  renderCatalogue();
  renderCart();
}

async function loadStore() {
  setTimeout(
    hidePageLoader,
    PAGE_LOADER_MAX_MS
  );

  const cached =
    readCachedStore();

  const hasCachedStore =
    Boolean(
      cached?.data?.success
    );

  if (hasCachedStore) {
    renderStore(
      cached.data
    );

    hidePageLoader();
  }

  try {
    const freshStore =
      await fetchStoreFromServer();

    renderStore(
      freshStore
    );

    saveCachedStore(
      freshStore
    );
  } catch (error) {
    console.error(
      error
    );

    if (!hasCachedStore) {
      if (
        elements.storeError
      ) {
        elements.storeError.hidden =
          false;
      }

      if (
        elements.catalogueResultText
      ) {
        elements
          .catalogueResultText
          .textContent =
          "Не вдалося завантажити товари.";
      }
    }
  } finally {
    hidePageLoader();
  }
}


/* ==========================================================
   9. НАЛАШТУВАННЯ
   ========================================================== */

function applySettings() {
  const settings =
    store?.settings || {};

  const storeName =
    settings.storeName ||
    "Точка Хрускоту";

  document.title =
    `Каталог — ${storeName}`;

  if (
    elements.headerStoreName
  ) {
    elements
      .headerStoreName
      .textContent =
      storeName;
  }

  if (
    elements.footerStoreName
  ) {
    elements
      .footerStoreName
      .textContent =
      storeName;
  }

  if (settings.logo) {
    if (
      elements.headerLogo
    ) {
      elements.headerLogo.src =
        settings.logo;
    }

    if (
      elements.footerLogo
    ) {
      elements.footerLogo.src =
        settings.logo;
    }
  }

  if (
    settings.googleProfile &&
    elements.footerGoogleProfile
  ) {
    elements
      .footerGoogleProfile
      .href =
      settings.googleProfile;
  }
}


/* ==========================================================
   10. КАТЕГОРІЇ
   ========================================================== */

function productsForCategory(code) {
  const products =
    store?.products || [];

  if (code === "ALL") {
    return products;
  }

  if (code === "NEW") {
    return products.filter(
      product =>
        Boolean(
          product.isNew
        )
    );
  }

  if (code === "SALE") {
    return products.filter(
      product =>
        Boolean(
          product.saleActive
        )
    );
  }

  return products.filter(
    product =>
      productHasCategory(
        product,
        code
      )
  );
}

function categoryLabel(category) {
  if (!category) {
    return "";
  }

  if (
    category.code ===
    "ALL"
  ) {
    return "Усі товари";
  }

  if (
    category.code ===
    "NEW"
  ) {
    return (
      category.name ||
      "Новинки"
    );
  }

  if (
    category.code ===
    "SALE"
  ) {
    return (
      category.name ||
      "Акції"
    );
  }

  return (
    category.name ||
    category.code
  );
}

function getVisibleCategories() {
  const source =
    Array.isArray(
      store?.categories
    )
      ? store.categories
      : [];

  const result = [];

  if (
    !source.some(
      category =>
        category.code ===
        "ALL"
    )
  ) {
    result.push({
      code: "ALL",
      name: "Усі товари"
    });
  }

  source.forEach(
    category => {
      if (
        !category?.code
      ) {
        return;
      }

      result.push(
        category
      );
    }
  );

  const seen =
    new Set();

  return result.filter(
    category => {
      const code =
        String(
          category.code || ""
        )
          .trim()
          .toUpperCase();

      if (
        !code ||
        seen.has(code)
      ) {
        return false;
      }

      seen.add(code);

      return true;
    }
  );
}

function renderCategories() {
  if (
    !elements.categoryFilters
  ) {
    return;
  }

  const categories =
    getVisibleCategories();

  if (
    !categories.some(
      category =>
        category.code ===
        activeCategory
    )
  ) {
    activeCategory =
      "ALL";
  }

  elements
    .categoryFilters
    .innerHTML =
    categories
      .map(category => {
        const count =
          productsForCategory(
            category.code
          ).length;

        const isActive =
          category.code ===
          activeCategory;

        return `
          <button
            class="category-button${
              isActive
                ? " is-active"
                : ""
            }"
            type="button"
            data-category="${escapeHtml(
              category.code
            )}"
            aria-pressed="${
              isActive
                ? "true"
                : "false"
            }"
          >
            ${escapeHtml(
              categoryLabel(
                category
              )
            )}

            ${
              count
                ? `
                  <span class="visually-hidden">
                    — ${count} товарів
                  </span>
                `
                : ""
            }
          </button>
        `;
      })
      .join("");
}


/* ==========================================================
   11. ПОШУК І ФІЛЬТРАЦІЯ
   ========================================================== */

function productMatchesSearch(product) {
  const query =
    normalizeText(
      searchQuery
    );

  if (!query) {
    return true;
  }

  const categoryNames =
    productCategoryNames(
      product
    );

  const categoryCodes =
    productCategoryCodes(
      product
    );

  const haystack =
    normalizeText(
      [
        product.code,
        product.name,
        product.shortDescription,
        product.fullDescription,
        product.ingredients,
        product.allergens,
        product.weight,
        product.badge,
        product.searchWords,
        product.keywords,
        ...categoryNames,
        ...categoryCodes
      ]
        .filter(Boolean)
        .join(" ")
    );

  return haystack.includes(
    query
  );
}

function productMatchesCategory(product) {
  if (
    activeCategory ===
    "ALL"
  ) {
    return true;
  }

  if (
    activeCategory ===
    "NEW"
  ) {
    return Boolean(
      product.isNew
    );
  }

  if (
    activeCategory ===
    "SALE"
  ) {
    return Boolean(
      product.saleActive
    );
  }

  return productHasCategory(
    product,
    activeCategory
  );
}

function getFilteredProducts() {
  const source =
    Array.isArray(
      store?.products
    )
      ? [...store.products]
      : [];

  const filtered =
    source.filter(
      product =>
        productMatchesCategory(
          product
        ) &&
        productMatchesSearch(
          product
        )
    );

  if (
    sortMode === "new"
  ) {
    return filtered.sort(
      (a, b) =>
        Number(
          Boolean(
            b.isNew
          )
        ) -
        Number(
          Boolean(
            a.isNew
          )
        )
    );
  }

  if (
    sortMode ===
    "price-asc"
  ) {
    return filtered.sort(
      (a, b) =>
        productUnitPrice(a) -
        productUnitPrice(b)
    );
  }

  if (
    sortMode ===
    "price-desc"
  ) {
    return filtered.sort(
      (a, b) =>
        productUnitPrice(b) -
        productUnitPrice(a)
    );
  }

  return filtered;
}

function updateClearSearchButton() {
  if (
    !elements.clearSearch
  ) {
    return;
  }

  elements.clearSearch.hidden =
    !hasActiveSearch();
}

function resetCatalogueFilters() {
  activeCategory =
    "ALL";

  searchQuery =
    "";

  sortMode =
    "default";

  if (
    elements.catalogSearch
  ) {
    elements.catalogSearch.value =
      "";
  }

  if (
    elements.sortSelect
  ) {
    elements.sortSelect.value =
      "default";
  }

  updateClearSearchButton();
  updateSearchMode();
  renderCategories();
  renderCatalogue();
}

function applySearchValue(value) {
  const nextQuery =
    String(
      value ?? ""
    ).trim();

  const wasSearching =
    hasActiveSearch();

  searchQuery =
    nextQuery;

  if (
    hasActiveSearch()
  ) {
    /*
      Пошук завжди йде
      по всьому каталогу.
    */

    if (
      activeCategory !==
      "ALL"
    ) {
      activeCategory =
        "ALL";

      renderCategories();
    }
  } else if (
    wasSearching
  ) {
    activeCategory =
      "ALL";

    renderCategories();
  }

  updateClearSearchButton();
  updateSearchMode();
  renderCatalogue();
}


/* ==========================================================
   12. РЕЙТИНГ
   ========================================================== */

function getProductRating(product) {
  const rating =
    safeNumber(
      product.ratingAvg ??
        product.averageRating ??
        product.rating,
      0
    );

  const count =
    safeNumber(
      product.reviewCount ??
        product.reviewsCount ??
        product.ratingCount,
      0
    );

  return {
    rating,
    count
  };
}

function reviewWord(count) {
  const value =
    Math.abs(
      Number(count)
    ) % 100;

  const last =
    value % 10;

  if (
    value > 10 &&
    value < 20
  ) {
    return "відгуків";
  }

  if (
    last === 1
  ) {
    return "відгук";
  }

  if (
    last >= 2 &&
    last <= 4
  ) {
    return "відгуки";
  }

  return "відгуків";
}

function productWord(count) {
  const value =
    Math.abs(
      Number(count)
    ) % 100;

  const last =
    value % 10;

  if (
    value > 10 &&
    value < 20
  ) {
    return "товарів";
  }

  if (
    last === 1
  ) {
    return "товар";
  }

  if (
    last >= 2 &&
    last <= 4
  ) {
    return "товари";
  }

  return "товарів";
}


/* ==========================================================
   13. КАРТКА ТОВАРУ
   ========================================================== */

function renderProductBadges(product) {
  const badges = [];

  if (
    product.saleActive
  ) {
    badges.push(
      '<span class="product-badge sale">Акція</span>'
    );
  }

  if (
    product.isNew &&
    badges.length < 2
  ) {
    badges.push(
      '<span class="product-badge new">Новинка</span>'
    );
  }

  if (
    product.badge &&
    badges.length < 2
  ) {
    badges.push(
      `<span class="product-badge">${escapeHtml(
        product.badge
      )}</span>`
    );
  }

  if (
    !badges.length
  ) {
    return "";
  }

  return `
    <div class="product-card-badges">
      ${badges.join("")}
    </div>
  `;
}

function renderProductPrice(product) {
  const hasVariants =
    Array.isArray(
      product.variants
    ) &&
    product.variants.length > 0;

  const price =
    productUnitPrice(
      product
    );

  const regularPrice =
    safeNumber(
      product.regularPrice,
      0
    );

  if (
    product.saleActive &&
    regularPrice > price
  ) {
    return `
      <div class="product-card-price-row">

        <span class="product-card-price">
          ${
            hasVariants
              ? "від "
              : ""
          }${escapeHtml(
            formatMoney(price)
          )}
        </span>

        <span class="product-card-old-price">
          ${escapeHtml(
            formatMoney(
              regularPrice
            )
          )}
        </span>

      </div>
    `;
  }

  return `
    <div class="product-card-price-row">

      <span class="product-card-price">
        ${
          hasVariants
            ? "від "
            : ""
        }${escapeHtml(
          formatMoney(price)
        )}
      </span>

    </div>
  `;
}

function renderProductRating(product) {
  const {
    rating,
    count
  } =
    getProductRating(
      product
    );

  if (
    !rating ||
    !count
  ) {
    return "";
  }

  return `
    <div class="product-card-rating">

      <span
        class="stars"
        aria-hidden="true"
      >
        ★
      </span>

      <span>
        ${escapeHtml(
          rating
            .toFixed(1)
            .replace(
              ".",
              ","
            )
        )}
        ·
        ${count}
        ${reviewWord(count)}
      </span>

    </div>
  `;
}

function renderProductCard(product) {
  const image =
    productImage(
      product
    );

  const url =
    productUrl(
      product
    );

  const choices =
    productHasChoices(
      product
    );

  const available =
    product.available !==
    false;

  return `
    <article
      class="product-card"
      data-product-card="${escapeHtml(
        product.code
      )}"
    >

      <div class="product-card-media">

        ${renderProductBadges(
          product
        )}

        <a
          href="${escapeHtml(url)}"
          data-product-link="${escapeHtml(
            product.code
          )}"
          aria-label="${escapeHtml(
            product.name
          )} — детальніше"
        >

          <img
            src="${escapeHtml(
              image
            )}"
            alt="${escapeHtml(
              product.name
            )}"
            loading="lazy"
          >

        </a>

      </div>


      <div class="product-card-body">

        <h3 class="product-card-title">

          <a
            href="${escapeHtml(
              url
            )}"
            data-product-link="${escapeHtml(
              product.code
            )}"
          >
            ${escapeHtml(
              product.name
            )}
          </a>

        </h3>


        ${
          product.shortDescription
            ? `
              <p class="product-card-description">
                ${escapeHtml(
                  product.shortDescription
                )}
              </p>
            `
            : ""
        }


        ${
          product.weight
            ? `
              <div class="product-card-meta">
                ${escapeHtml(
                  product.weight
                )}
              </div>
            `
            : ""
        }


        ${renderProductRating(
          product
        )}

        ${renderProductPrice(
          product
        )}


        <div class="product-card-actions">

          ${
            !available
              ? `
                <button
                  class="product-card-button secondary"
                  type="button"
                  disabled
                >
                  Немає в наявності
                </button>
              `
              : choices
                ? `
                  <a
                    class="product-card-button"
                    href="${escapeHtml(
                      url
                    )}"
                    data-product-link="${escapeHtml(
                      product.code
                    )}"
                  >
                    Обрати варіант
                  </a>
                `
                : `
                  <button
                    class="product-card-button"
                    type="button"
                    data-add-cart="${escapeHtml(
                      product.code
                    )}"
                  >
                    У кошик
                  </button>
                `
          }

        </div>

      </div>

    </article>
  `;
}


/* ==========================================================
   14. ВІДОБРАЖЕННЯ КАТАЛОГУ
   ========================================================== */

function renderCatalogue() {
  if (
    !elements.productGrid ||
    !store
  ) {
    return;
  }

  const products =
    getFilteredProducts();

  const total =
    (store.products || [])
      .length;

  const searching =
    hasActiveSearch();

  elements.productGrid.innerHTML =
    products
      .map(
        renderProductCard
      )
      .join("");

  if (
    elements.catalogueEmpty
  ) {
    elements.catalogueEmpty.hidden =
      products.length > 0;
  }

  if (
    elements.catalogueResultText
  ) {
    if (searching) {
      if (
        !products.length
      ) {
        elements
          .catalogueResultText
          .textContent =
          `За запитом «${searchQuery}» нічого не знайдено.`;
      } else {
        elements
          .catalogueResultText
          .textContent =
          `За запитом «${searchQuery}» знайдено ${products.length} ${productWord(
            products.length
          )}.`;
      }
    } else if (
      !products.length
    ) {
      elements
        .catalogueResultText
        .textContent =
        "За цими параметрами товарів не знайдено.";
    } else if (
      products.length ===
        total &&
      activeCategory ===
        "ALL"
    ) {
      elements
        .catalogueResultText
        .textContent =
        `У каталозі ${products.length} ${productWord(
          products.length
        )}.`;
    } else {
      elements
        .catalogueResultText
        .textContent =
        `Знайдено ${products.length} ${productWord(
          products.length
        )}.`;
    }
  }
}


/* ==========================================================
   15. КОШИК
   ========================================================== */

function loadCart() {
  try {
    const raw =
      localStorage.getItem(
        CART_STORAGE_KEY
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    return Array.isArray(
      parsed
    )
      ? parsed
      : [];
  } catch (error) {
    console.error(
      "Помилка читання кошика:",
      error
    );

    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(
        cart
      )
    );
  } catch (error) {
    console.error(
      "Помилка збереження кошика:",
      error
    );
  }
}

function calculateCartCount() {
  return cart.reduce(
    (sum, item) =>
      sum +
      Math.max(
        0,
        safeNumber(
          item.quantity,
          0
        )
      ),
    0
  );
}

function calculateCartTotal() {
  return cart.reduce(
    (sum, item) =>
      sum +
      safeNumber(
        item.price,
        0
      ) *
        Math.max(
          0,
          safeNumber(
            item.quantity,
            0
          )
        ),
    0
  );
}

function normalizeCartItem(item) {
  return {
    ...item,

    sauces:
      Array.isArray(
        item.sauces
      )
        ? item.sauces
        : [],

    quantity:
      Math.max(
        1,
        safeNumber(
          item.quantity,
          1
        )
      ),

    price:
      safeNumber(
        item.price,
        0
      )
  };
}

function addSimpleProductToCart(product) {
  if (
    !product ||
    product.available ===
      false
  ) {
    return;
  }

  if (
    productHasChoices(
      product
    )
  ) {
    window.location.href =
      productUrl(
        product
      );

    return;
  }

  const price =
    productUnitPrice(
      product
    );

  const cartItemId =
    `${product.code}____`;

  const existing =
    cart.find(
      item =>
        item.cartItemId ===
        cartItemId
    );

  if (existing) {
    existing.quantity =
      Math.max(
        1,
        safeNumber(
          existing.quantity,
          1
        )
      ) + 1;
  } else {
    cart.push({
      cartItemId,

      code:
        product.code,

      name:
        product.name,

      price,

      variantType:
        "",

      variantValue:
        "",

      sauces:
        [],

      quantity:
        1
    });
  }

  saveCart();
  renderCart();

  trackGa4Event(
    "add_to_cart",
    {
      currency:
        "UAH",

      value:
        price,

      items: [
        ga4ItemFromProduct(
          product,
          1
        )
      ]
    }
  );

  showToast(
    "Товар додано до кошика"
  );

  openCart();
}

function changeCartQuantity(
  cartItemId,
  change
) {
  const item =
    cart.find(
      entry =>
        entry.cartItemId ===
        cartItemId
    );

  if (!item) {
    return;
  }

  item.quantity =
    safeNumber(
      item.quantity,
      1
    ) + change;

  if (
    item.quantity <= 0
  ) {
    cart =
      cart.filter(
        entry =>
          entry.cartItemId !==
          cartItemId
      );
  }

  saveCart();
  renderCart();
}

function removeCartItem(
  cartItemId
) {
  cart =
    cart.filter(
      entry =>
        entry.cartItemId !==
        cartItemId
    );

  saveCart();
  renderCart();
}


/* ==========================================================
   16. БЕЗКОШТОВНА ДОСТАВКА
   ========================================================== */

function getFreeDeliveryThreshold() {
  const settings =
    store?.settings || {};

  const fromSettings =
    [
      settings.freeDeliveryFrom,
      settings.freeDeliveryThreshold,
      settings.freeDeliveryFromAmount
    ]
      .map(value =>
        safeNumber(
          value,
          0
        )
      )
      .find(
        value =>
          value > 0
      );

  if (fromSettings) {
    return fromSettings;
  }

  const fromDelivery =
    (
      store?.deliveryMethods ||
      []
    )
      .map(method =>
        safeNumber(
          method.freeFrom ??
            method.freeDeliveryFrom ??
            method.freeFromAmount,
          0
        )
      )
      .filter(
        value =>
          value > 0
      );

  if (
    fromDelivery.length
  ) {
    return Math.min(
      ...fromDelivery
    );
  }

  return 2000;
}

function renderFreeDeliveryProgress() {
  if (
    !elements.cartProgress
  ) {
    return;
  }

  const threshold =
    getFreeDeliveryThreshold();

  const total =
    calculateCartTotal();

  if (
    !threshold ||
    !cart.length
  ) {
    elements.cartProgress.innerHTML =
      "";

    elements.cartProgress.hidden =
      true;

    return;
  }

  elements.cartProgress.hidden =
    false;

  if (
    total >= threshold
  ) {
    elements.cartProgress.innerHTML = `
      <strong>
        Доставку у відділення або поштомат беремо на себе.
      </strong>

      <div
        class="free-delivery-progress"
        aria-hidden="true"
      >
        <span style="width:100%"></span>
      </div>
    `;

    return;
  }

  const remaining =
    Math.max(
      0,
      threshold - total
    );

  const percent =
    Math.max(
      0,
      Math.min(
        100,
        (
          total /
          threshold
        ) * 100
      )
    );

  elements.cartProgress.innerHTML = `
    До доставки у відділення або поштомат за наш рахунок залишилося
    <strong>
      ${escapeHtml(
        formatMoney(
          remaining
        )
      )}
    </strong>.

    <div
      class="free-delivery-progress"
      aria-hidden="true"
    >
      <span
        style="width:${percent}%"
      ></span>
    </div>
  `;
}


/* ==========================================================
   17. ВІДОБРАЖЕННЯ КОШИКА
   ========================================================== */

function renderCart() {
  if (
    !elements.cartItems
  ) {
    return;
  }

  cart =
    cart.map(
      normalizeCartItem
    );

  const count =
    calculateCartCount();

  const total =
    calculateCartTotal();

  if (
    elements.cartCount
  ) {
    elements.cartCount.textContent =
      count;
  }

  if (
    !cart.length
  ) {
    elements.cartItems.innerHTML = `
      <div class="cart-empty">

        <strong>
          Тут поки тихо.
        </strong>

        <span>
          Може, знайдемо щось хрумке?
        </span>

      </div>
    `;

    if (
      elements.cartTotal
    ) {
      elements.cartTotal.textContent =
        formatMoney(0);
    }

    if (
      elements.cartProgress
    ) {
      elements.cartProgress.innerHTML =
        "";

      elements.cartProgress.hidden =
        true;
    }

    if (
      elements.cartSuggestions
    ) {
      elements.cartSuggestions.innerHTML =
        "";
    }

    if (
      elements.checkoutButton
    ) {
      elements.checkoutButton
        .classList
        .add(
          "is-disabled"
        );

      elements.checkoutButton
        .setAttribute(
          "aria-disabled",
          "true"
        );
    }

    return;
  }

  elements.cartItems.innerHTML =
    cart
      .map(item => {
        const product =
          findProduct(
            item.code
          );

        const image =
          productImage(
            product
          );

        const sauces =
          Array.isArray(
            item.sauces
          )
            ? item.sauces
            : [];

        return `
          <div class="cart-item">

            <div class="cart-item-image">

              <img
                src="${escapeHtml(
                  image
                )}"
                alt=""
                loading="lazy"
              >

            </div>


            <div>

              <p class="cart-item-name">
                ${escapeHtml(
                  item.name ||
                    product?.name ||
                    "Товар"
                )}
              </p>


              ${
                item.variantValue
                  ? `
                    <div class="cart-item-variant">
                      ${escapeHtml(
                        item.variantType ||
                          "Варіант"
                      )}:
                      ${escapeHtml(
                        item.variantValue
                      )}
                    </div>
                  `
                  : ""
              }


              ${
                sauces.length
                  ? `
                    <div class="cart-item-variant">
                      Соус${
                        sauces.length >
                        1
                          ? "и"
                          : ""
                      }:
                      ${sauces
                        .map(
                          escapeHtml
                        )
                        .join(", ")}
                    </div>
                  `
                  : ""
              }


              <div class="cart-item-price">
                ${escapeHtml(
                  formatMoney(
                    item.price *
                      item.quantity
                  )
                )}
              </div>


              <div class="cart-item-controls">

                <button
                  class="cart-qty-button"
                  type="button"
                  data-cart-change="-1"
                  data-cart-item="${escapeHtml(
                    item.cartItemId
                  )}"
                  aria-label="Зменшити кількість"
                >
                  −
                </button>


                <span class="cart-qty">
                  ${item.quantity}
                </span>


                <button
                  class="cart-qty-button"
                  type="button"
                  data-cart-change="1"
                  data-cart-item="${escapeHtml(
                    item.cartItemId
                  )}"
                  aria-label="Збільшити кількість"
                >
                  +
                </button>

              </div>

            </div>


            <button
              class="cart-item-remove"
              type="button"
              data-cart-remove="${escapeHtml(
                item.cartItemId
              )}"
              aria-label="Видалити товар"
            >
              ×
            </button>

          </div>
        `;
      })
      .join("");

  if (
    elements.cartTotal
  ) {
    elements.cartTotal.textContent =
      formatMoney(
        total
      );
  }

  if (
    elements.checkoutButton
  ) {
    elements.checkoutButton
      .classList
      .remove(
        "is-disabled"
      );

    elements.checkoutButton
      .removeAttribute(
        "aria-disabled"
      );
  }

  renderFreeDeliveryProgress();
}


/* ==========================================================
   18. МОБІЛЬНЕ МЕНЮ
   ========================================================== */

function openMobileMenu() {
  if (
    !elements.mobileMenu ||
    !elements.mobileMenuOverlay
  ) {
    return;
  }

  closeCart();

  elements.mobileMenuOverlay.hidden =
    false;

  elements.mobileMenu
    .classList
    .add(
      "is-open"
    );

  elements.mobileMenu
    .setAttribute(
      "aria-hidden",
      "false"
    );

  elements.mobileMenuButton
    ?.setAttribute(
      "aria-expanded",
      "true"
    );

  document.body
    .classList
    .add(
      "menu-open"
    );
}

function closeMobileMenu() {
  if (
    !elements.mobileMenu ||
    !elements.mobileMenuOverlay
  ) {
    return;
  }

  elements.mobileMenu
    .classList
    .remove(
      "is-open"
    );

  elements.mobileMenu
    .setAttribute(
      "aria-hidden",
      "true"
    );

  elements.mobileMenuButton
    ?.setAttribute(
      "aria-expanded",
      "false"
    );

  document.body
    .classList
    .remove(
      "menu-open"
    );

  setTimeout(() => {
    if (
      !elements.mobileMenu
        .classList
        .contains(
          "is-open"
        )
    ) {
      elements.mobileMenuOverlay.hidden =
        true;
    }
  }, 260);
}


/* ==========================================================
   19. КОШИК — ВІДКРИТТЯ / ЗАКРИТТЯ
   ========================================================== */

function openCart() {
  if (
    !elements.cartPanel ||
    !elements.cartOverlay
  ) {
    return;
  }

  closeMobileMenu();

  elements.cartOverlay.hidden =
    false;

  elements.cartPanel
    .classList
    .add(
      "is-open"
    );

  elements.cartPanel
    .setAttribute(
      "aria-hidden",
      "false"
    );

  document.body
    .classList
    .add(
      "cart-open"
    );
}

function closeCart() {
  if (
    !elements.cartPanel ||
    !elements.cartOverlay
  ) {
    return;
  }

  elements.cartPanel
    .classList
    .remove(
      "is-open"
    );

  elements.cartPanel
    .setAttribute(
      "aria-hidden",
      "true"
    );

  document.body
    .classList
    .remove(
      "cart-open"
    );

  setTimeout(() => {
    if (
      !elements.cartPanel
        .classList
        .contains(
          "is-open"
        )
    ) {
      elements.cartOverlay.hidden =
        true;
    }
  }, 260);
}


/* ==========================================================
   20. ПОДІЇ КАТАЛОГУ
   ========================================================== */

function handleCategoryClick(event) {
  const button =
    event.target.closest(
      "[data-category]"
    );

  if (!button) {
    return;
  }

  activeCategory =
    button.dataset.category ||
    "ALL";

  searchQuery =
    "";

  if (
    elements.catalogSearch
  ) {
    elements.catalogSearch.value =
      "";
  }

  updateClearSearchButton();
  updateSearchMode();
  renderCategories();
  renderCatalogue();

  scrollToCatalogueResults();
}

function handleProductGridClick(event) {
  const addButton =
    event.target.closest(
      "[data-add-cart]"
    );

  if (addButton) {
    event.preventDefault();

    const product =
      findProduct(
        addButton.dataset.addCart
      );

    addSimpleProductToCart(
      product
    );

    return;
  }

  const productLink =
    event.target.closest(
      "[data-product-link]"
    );

  if (productLink) {
    const product =
      findProduct(
        productLink.dataset.productLink
      );

    if (!product) {
      return;
    }

    trackGa4Event(
      "select_item",
      {
        item_list_name:
          "Каталог",

        items: [
          ga4ItemFromProduct(
            product,
            1
          )
        ]
      }
    );
  }
}

function handleCartClick(event) {
  const changeButton =
    event.target.closest(
      "[data-cart-change]"
    );

  if (changeButton) {
    changeCartQuantity(
      changeButton
        .dataset
        .cartItem,

      safeNumber(
        changeButton
          .dataset
          .cartChange,
        0
      )
    );

    return;
  }

  const removeButton =
    event.target.closest(
      "[data-cart-remove]"
    );

  if (removeButton) {
    removeCartItem(
      removeButton
        .dataset
        .cartRemove
    );
  }
}


/* ==========================================================
   21. ОСНОВНІ ПОДІЇ
   ========================================================== */

function bindEvents() {
  elements.categoryFilters
    ?.addEventListener(
      "click",
      handleCategoryClick
    );

  elements.productGrid
    ?.addEventListener(
      "click",
      handleProductGridClick
    );

  elements.cartItems
    ?.addEventListener(
      "click",
      handleCartClick
    );


  elements.catalogSearch
    ?.addEventListener(
      "input",
      event => {
        applySearchValue(
          event.target.value
        );
      }
    );


  elements.catalogSearch
    ?.addEventListener(
      "keydown",
      event => {
        if (
          event.key ===
            "Enter" &&
          hasActiveSearch()
        ) {
          event.preventDefault();

          scrollToCatalogueResults();
        }
      }
    );


  elements.clearSearch
    ?.addEventListener(
      "click",
      () => {
        if (
          elements.catalogSearch
        ) {
          elements.catalogSearch.value =
            "";
        }

        applySearchValue(
          ""
        );

        elements.catalogSearch
          ?.focus();
      }
    );


  elements.sortSelect
    ?.addEventListener(
      "change",
      event => {
        sortMode =
          event.target.value ||
          "default";

        renderCatalogue();
      }
    );


  elements.resetCatalogue
    ?.addEventListener(
      "click",
      resetCatalogueFilters
    );


  elements.headerSearchButton
    ?.addEventListener(
      "click",
      () => {
        elements.catalogSearch
          ?.scrollIntoView({
            behavior:
              "smooth",
            block:
              "center"
          });

        setTimeout(() => {
          elements.catalogSearch
            ?.focus();
        }, 350);
      }
    );


  elements.mobileMenuButton
    ?.addEventListener(
      "click",
      openMobileMenu
    );

  elements.closeMobileMenu
    ?.addEventListener(
      "click",
      closeMobileMenu
    );

  elements.mobileMenuOverlay
    ?.addEventListener(
      "click",
      closeMobileMenu
    );


  elements.cartButton
    ?.addEventListener(
      "click",
      openCart
    );

  elements.closeCartButton
    ?.addEventListener(
      "click",
      closeCart
    );

  elements.cartOverlay
    ?.addEventListener(
      "click",
      closeCart
    );

  elements.continueShoppingButton
    ?.addEventListener(
      "click",
      closeCart
    );


  elements.checkoutButton
    ?.addEventListener(
      "click",
      event => {
        if (
          !cart.length
        ) {
          event.preventDefault();
          return;
        }

        trackGa4Event(
          "begin_checkout",
          {
            currency:
              "UAH",

            value:
              calculateCartTotal(),

            items:
              cart.map(item => {
                const product =
                  findProduct(
                    item.code
                  );

                return {
                  item_id:
                    item.code,

                  item_name:
                    item.name ||
                    product?.name ||
                    item.code,

                  item_category:
                    primaryCategoryName(
                      product
                    ),

                  item_variant:
                    item.variantValue ||
                    "",

                  price:
                    safeNumber(
                      item.price,
                      0
                    ),

                  quantity:
                    safeNumber(
                      item.quantity,
                      1
                    )
                };
              })
          }
        );
      }
    );


  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key !==
        "Escape"
      ) {
        return;
      }

      closeMobileMenu();
      closeCart();
    }
  );


  window.addEventListener(
    "storage",
    event => {
      if (
        event.key !==
        CART_STORAGE_KEY
      ) {
        return;
      }

      cart =
        loadCart();

      renderCart();
    }
  );
}


/* ==========================================================
   22. СТАРТ
   ========================================================== */

prepareSearchField();
bindEvents();
updateSearchMode();
renderCart();
loadStore();
