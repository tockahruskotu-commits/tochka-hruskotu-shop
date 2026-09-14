/* ==========================================================
   ТОЧКА ХРУСКОТУ — GIFTS V2
   Подарункові товари, сортування, кошик,
   повернення на попереднє місце та GA4
   ========================================================== */

const STORE_API_URL =
  "https://script.google.com/macros/s/AKfycbzCgvAMAmqrsK-KsGcPMfx60kvQbZVJII91WVZKIn-KF7bFIA3HKdKe0JmaBu4RZtX31Q/exec";

const CART_STORAGE_KEY =
  "tochka_hruskotu_cart_v3";

const STORE_CACHE_KEY =
  "tochka_hruskotu_store_cache_v1";

const GIFTS_SCROLL_STORAGE_KEY =
  "tochka_hruskotu_gifts_scroll_v1";

const GIFT_CATEGORY_CODE =
  "GIFT-SETS";

const STORE_REQUEST_TIMEOUT_MS =
  10000;

const PAGE_LOADER_MAX_MS =
  900;

let store = null;
let cart = loadCart();

let sortMode =
  "default";

let giftScrollRestored =
  false;

let toastTimer =
  null;


/* ==========================================================
   1. ЕЛЕМЕНТИ
   ========================================================== */

const $ = selector =>
  document.querySelector(selector);

const elements = {
  pageLoader:
    $("#pageLoader"),

  headerLogo:
    $("#headerLogo"),

  footerLogo:
    $("#footerLogo"),

  headerStoreName:
    $("#headerStoreName"),

  footerStoreName:
    $("#footerStoreName"),

  footerGoogleProfile:
    $("#footerGoogleProfile"),

  giftSortSelect:
    $("#giftSortSelect"),

  giftResultText:
    $("#giftResultText"),

  giftProductGrid:
    $("#giftProductGrid"),

  giftEmpty:
    $("#giftEmpty"),

  giftStoreError:
    $("#giftStoreError"),

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
   2. ДОПОМІЖНІ ФУНКЦІЇ
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

  return (
    new Intl.NumberFormat(
      "uk-UA",
      {
        maximumFractionDigits: 2
      }
    ).format(
      safeNumber(
        value,
        0
      )
    ) +
    " " +
    currency
  );
}

function hidePageLoader() {
  elements.pageLoader
    ?.classList
    .add(
      "is-hidden"
    );
}

function showToast(message) {
  if (!elements.toast) {
    return;
  }

  clearTimeout(
    toastTimer
  );

  elements.toast.textContent =
    message;

  elements.toast
    .classList
    .add(
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


/* ==========================================================
   3. ПОШУК ТОВАРІВ І КАТЕГОРІЙ
   ========================================================== */

function findProduct(code) {
  return (
    (store?.products || [])
      .find(product =>
        String(
          product.code || ""
        )
          .trim()
          .toUpperCase() ===
        String(
          code || ""
        )
          .trim()
          .toUpperCase()
      ) ||
    null
  );
}

function findCategory(code) {
  return (
    (store?.categories || [])
      .find(category =>
        String(
          category.code || ""
        )
          .trim()
          .toUpperCase() ===
        String(
          code || ""
        )
          .trim()
          .toUpperCase()
      ) ||
    null
  );
}


/* ==========================================================
   4. КІЛЬКА КАТЕГОРІЙ
   Наприклад:
   MINI-WAFFLES;GIFT-SETS
   ========================================================== */

function productCategoryCodes(product) {
  const raw =
    String(
      product?.categoryCode ||
      ""
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
    String(
      categoryCode || ""
    )
      .trim()
      .toUpperCase();

  if (!wanted) {
    return false;
  }

  return productCategoryCodes(
    product
  ).includes(
    wanted
  );
}

function productCategoryNames(product) {
  return productCategoryCodes(
    product
  )
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
    productCategoryNames(
      product
    )[0] ||
    ""
  );
}


/* ==========================================================
   5. ТОВАР
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
  const photos =
    Array.isArray(
      product?.photos
    )
      ? product.photos
          .filter(Boolean)
      : [];

  return (
    photos[0] ||
    store?.settings?.logo ||
    "images/brand/logo.webp"
  );
}

function productHasChoices(product) {
  return Boolean(
    (
      Array.isArray(
        product?.variants
      ) &&
      product.variants.length >
        0
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
            variant.effectivePrice ??
            variant.regularPrice,
            NaN
          )
        )
        .filter(
          Number.isFinite
        );

    if (
      prices.length
    ) {
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
   6. GA4
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
  const categories =
    productCategoryNames(
      product
    );

  const result = {
    item_id:
      product.code,

    item_name:
      product.name,

    price:
      productUnitPrice(
        product
      ),

    quantity
  };

  if (
    categories[0]
  ) {
    result.item_category =
      categories[0];
  }

  if (
    categories[1]
  ) {
    result.item_category2 =
      categories[1];
  }

  return result;
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
      JSON.parse(
        raw
      );

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
          method:
            "GET",

          redirect:
            "follow",

          signal:
            controller.signal
        }
      );

    if (
      !response.ok
    ) {
      throw new Error(
        `Помилка сервера: ${response.status}`
      );
    }

    const text =
      await response.text();

    let result;

    try {
      result =
        JSON.parse(
          text
        );
    } catch {
      throw new Error(
        "Сервер повернув некоректну відповідь."
      );
    }

    if (
      !result.success
    ) {
      throw new Error(
        result.error ||
        "Не вдалося завантажити товари."
      );
    }

    return result;
  } finally {
    clearTimeout(
      timeoutId
    );
  }
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

  if (
    hasCachedStore
  ) {
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

    if (
      !hasCachedStore
    ) {
      if (
        elements.giftStoreError
      ) {
        elements.giftStoreError.hidden =
          false;
      }

      if (
        elements.giftResultText
      ) {
        elements.giftResultText.textContent =
          "Не вдалося завантажити подарункові товари.";
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
    store?.settings ||
    {};

  const storeName =
    settings.storeName ||
    "Точка Хрускоту";

  document.title =
    `Подарунки — ${storeName}`;

  if (
    elements.headerStoreName
  ) {
    elements.headerStoreName.textContent =
      storeName;
  }

  if (
    elements.footerStoreName
  ) {
    elements.footerStoreName.textContent =
      storeName;
  }

  if (
    settings.logo
  ) {
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
    elements.footerGoogleProfile.href =
      settings.googleProfile;
  }
}


/* ==========================================================
   10. СТАН СОРТУВАННЯ В URL
   ========================================================== */

function readGiftStateFromUrl() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const requestedSort =
    String(
      params.get("sort") ||
      "default"
    );

  const allowed =
    new Set([
      "default",
      "price-asc",
      "price-desc",
      "new"
    ]);

  sortMode =
    allowed.has(
      requestedSort
    )
      ? requestedSort
      : "default";

  if (
    elements.giftSortSelect
  ) {
    elements.giftSortSelect.value =
      sortMode;
  }
}

function updateGiftUrl() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  params.delete(
    "sort"
  );

  if (
    sortMode &&
    sortMode !== "default"
  ) {
    params.set(
      "sort",
      sortMode
    );
  }

  const query =
    params.toString();

  const nextUrl =
    window.location.pathname +
    (
      query
        ? `?${query}`
        : ""
    );

  window.history.replaceState(
    {
      gifts:
        true
    },
    "",
    nextUrl
  );
}


/* ==========================================================
   11. ПОВЕРНЕННЯ НА ТЕ САМЕ МІСЦЕ
   ========================================================== */

function currentGiftUrlKey() {
  return (
    window.location.pathname +
    window.location.search
  );
}

function saveGiftScrollPosition() {
  try {
    const data = {
      url:
        currentGiftUrlKey(),

      y:
        Math.max(
          0,
          window.scrollY ||
          window.pageYOffset ||
          0
        ),

      savedAt:
        Date.now()
    };

    sessionStorage.setItem(
      GIFTS_SCROLL_STORAGE_KEY,
      JSON.stringify(
        data
      )
    );
  } catch (error) {
    console.warn(
      "Не вдалося запам’ятати місце на сторінці подарунків:",
      error
    );
  }
}

function readGiftScrollPosition() {
  try {
    const raw =
      sessionStorage.getItem(
        GIFTS_SCROLL_STORAGE_KEY
      );

    if (!raw) {
      return null;
    }

    const saved =
      JSON.parse(
        raw
      );

    if (
      !saved ||
      saved.url !==
        currentGiftUrlKey()
    ) {
      return null;
    }

    if (
      Date.now() -
        safeNumber(
          saved.savedAt,
          0
        ) >
      30 * 60 * 1000
    ) {
      return null;
    }

    return saved;
  } catch {
    return null;
  }
}

function restoreGiftScrollPosition() {
  if (
    giftScrollRestored
  ) {
    return;
  }

  const saved =
    readGiftScrollPosition();

  giftScrollRestored =
    true;

  if (
    !saved ||
    safeNumber(
      saved.y,
      0
    ) <= 0
  ) {
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.scrollTo({
        top:
          safeNumber(
            saved.y,
            0
          ),

        left:
          0,

        behavior:
          "auto"
      });
    });
  });
}


/* ==========================================================
   12. ПОДАРУНКОВІ ТОВАРИ
   ========================================================== */

function giftProducts() {
  const products =
    Array.isArray(
      store?.products
    )
      ? store.products
      : [];

  return products.filter(
    product =>
      productHasCategory(
        product,
        GIFT_CATEGORY_CODE
      )
  );
}

function sortedGiftProducts() {
  const products =
    [
      ...giftProducts()
    ];

  if (
    sortMode ===
    "price-asc"
  ) {
    return products.sort(
      (a, b) =>
        productUnitPrice(a) -
        productUnitPrice(b)
    );
  }

  if (
    sortMode ===
    "price-desc"
  ) {
    return products.sort(
      (a, b) =>
        productUnitPrice(b) -
        productUnitPrice(a)
    );
  }

  if (
    sortMode ===
    "new"
  ) {
    return products.sort(
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

  return products;
}


/* ==========================================================
   13. ВІДМІНЮВАННЯ
   ========================================================== */

function productWord(count) {
  const value =
    Math.abs(
      Number(count)
    ) %
    100;

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

function reviewWord(count) {
  const value =
    Math.abs(
      Number(count)
    ) %
    100;

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


/* ==========================================================
   14. РЕЙТИНГ
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


/* ==========================================================
   15. ПОЗНАЧКИ
   ========================================================== */

function renderProductBadges(product) {
  const badges =
    [];

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


/* ==========================================================
   16. ЦІНА КАРТКИ
   ========================================================== */

function renderProductPrice(product) {
  const hasVariants =
    Array.isArray(
      product.variants
    ) &&
    product.variants.length >
      0;

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
            formatMoney(
              price
            )
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
          formatMoney(
            price
          )
        )}
      </span>

    </div>
  `;
}


/* ==========================================================
   17. КАРТКА ПОДАРУНКА
   ========================================================== */

function renderGiftProductCard(product) {
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
          href="${escapeHtml(
            url
          )}"
          data-gift-product-link="${escapeHtml(
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
            data-gift-product-link="${escapeHtml(
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
                    data-gift-product-link="${escapeHtml(
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
                    data-gift-add="${escapeHtml(
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
   18. ВІДОБРАЖЕННЯ ПОДАРУНКІВ
   ========================================================== */

function renderGiftProducts() {
  if (
    !elements.giftProductGrid ||
    !store
  ) {
    return;
  }

  const products =
    sortedGiftProducts();

  elements.giftProductGrid.innerHTML =
    products
      .map(
        renderGiftProductCard
      )
      .join("");

  if (
    elements.giftEmpty
  ) {
    elements.giftEmpty.hidden =
      products.length >
      0;
  }

  if (
    elements.giftResultText
  ) {
    if (
      products.length
    ) {
      elements.giftResultText.textContent =
        `Знайдено ${products.length} ${productWord(
          products.length
        )}.`;
    } else {
      elements.giftResultText.textContent =
        "Подарункових товарів поки немає.";
    }
  }

  trackGa4Event(
    "view_item_list",
    {
      item_list_name:
        "Подарунки",

      items:
        products
          .slice(0, 20)
          .map(
            (
              product,
              index
            ) => ({
              ...ga4ItemFromProduct(
                product,
                1
              ),

              index:
                index + 1
            })
          )
    }
  );
}


/* ==========================================================
   19. ОСНОВНИЙ РЕНДЕР
   ========================================================== */

function renderStore(data) {
  store =
    data;

  if (
    elements.giftStoreError
  ) {
    elements.giftStoreError.hidden =
      true;
  }

  applySettings();
  renderGiftProducts();
  renderCart();

  restoreGiftScrollPosition();
}


/* ==========================================================
   20. КОШИК
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
      JSON.parse(
        raw
      );

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


/* ==========================================================
   21. ДОДАВАННЯ ПРОСТОГО ТОВАРУ
   ========================================================== */

function addSimpleGiftToCart(product) {
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
    saveGiftScrollPosition();

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

  if (
    existing
  ) {
    existing.quantity =
      safeNumber(
        existing.quantity,
        1
      ) +
      1;
  } else {
    cart.push({
      cartItemId,

      code:
        product.code,

      name:
        product.name,

      photo:
        productImage(
          product
        ),

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
    ) +
    change;

  if (
    item.quantity <=
    0
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
   22. БЕЗКОШТОВНА ДОСТАВКА
   ========================================================== */

function getFreeDeliveryThreshold() {
  const settings =
    store?.settings ||
    {};

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

  if (
    fromSettings
  ) {
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
    !cart.length
  ) {
    elements.cartProgress.hidden =
      true;

    elements.cartProgress.innerHTML =
      "";

    return;
  }

  elements.cartProgress.hidden =
    false;

  if (
    total >=
    threshold
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
      threshold -
      total
    );

  const percent =
    Math.max(
      0,
      Math.min(
        100,
        (
          total /
          threshold
        ) *
        100
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
   23. ВІДОБРАЖЕННЯ КОШИКА
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
    elements.cartTotal
  ) {
    elements.cartTotal.textContent =
      formatMoney(
        total
      );
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
      elements.cartProgress
    ) {
      elements.cartProgress.hidden =
        true;

      elements.cartProgress.innerHTML =
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

  elements.cartItems.innerHTML =
    cart
      .map(item => {
        const product =
          findProduct(
            item.code
          );

        const image =
          item.photo ||
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
                    safeNumber(
                      item.price,
                      0
                    ) *
                    safeNumber(
                      item.quantity,
                      1
                    )
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
                  ${safeNumber(
                    item.quantity,
                    1
                  )}
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

  renderFreeDeliveryProgress();
}


/* ==========================================================
   24. КОШИК — ВІДКРИТТЯ
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
   25. МОБІЛЬНЕ МЕНЮ
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
   26. КЛІК ПО ТОВАРУ
   ========================================================== */

function handleGiftGridClick(event) {
  const addButton =
    event.target.closest(
      "[data-gift-add]"
    );

  if (
    addButton
  ) {
    event.preventDefault();

    const product =
      findProduct(
        addButton.dataset.giftAdd
      );

    addSimpleGiftToCart(
      product
    );

    return;
  }

  const productLink =
    event.target.closest(
      "[data-gift-product-link]"
    );

  if (
    productLink
  ) {
    saveGiftScrollPosition();

    const product =
      findProduct(
        productLink.dataset
          .giftProductLink
      );

    if (
      !product
    ) {
      return;
    }

    trackGa4Event(
      "select_item",
      {
        item_list_name:
          "Подарунки",

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


/* ==========================================================
   27. КЛІКИ КОШИКА
   ========================================================== */

function handleCartClick(event) {
  const changeButton =
    event.target.closest(
      "[data-cart-change]"
    );

  if (
    changeButton
  ) {
    changeCartQuantity(
      changeButton.dataset
        .cartItem,

      safeNumber(
        changeButton.dataset
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

  if (
    removeButton
  ) {
    removeCartItem(
      removeButton.dataset
        .cartRemove
    );
  }
}


/* ==========================================================
   28. ПОДІЇ
   ========================================================== */

function bindEvents() {
  elements.giftProductGrid
    ?.addEventListener(
      "click",
      handleGiftGridClick
    );


  elements.giftSortSelect
    ?.addEventListener(
      "change",
      event => {
        sortMode =
          event.target.value ||
          "default";

        giftScrollRestored =
          true;

        updateGiftUrl();
        renderGiftProducts();
      }
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


  elements.cartItems
    ?.addEventListener(
      "click",
      handleCartClick
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

                const categories =
                  productCategoryNames(
                    product
                  );

                const result = {
                  item_id:
                    item.code,

                  item_name:
                    item.name ||
                    product?.name ||
                    item.code,

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

                if (
                  categories[0]
                ) {
                  result.item_category =
                    categories[0];
                }

                if (
                  categories[1]
                ) {
                  result.item_category2 =
                    categories[1];
                }

                return result;
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


  window.addEventListener(
    "pagehide",
    saveGiftScrollPosition
  );


  window.addEventListener(
    "pageshow",
    event => {
      if (
        event.persisted
      ) {
        cart =
          loadCart();

        renderCart();
      }
    }
  );
}


/* ==========================================================
   29. СТАРТ
   ========================================================== */

readGiftStateFromUrl();

bindEvents();

renderCart();

loadStore();
