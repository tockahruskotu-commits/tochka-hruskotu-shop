/* ==========================================================
   ТОЧКА ХРУСКОТУ — PRODUCT V2
   Універсальна сторінка товару
   ========================================================== */

const STORE_API_URL =
  "https://script.google.com/macros/s/AKfycbzCgvAMAmqrsK-KsGcPMfx60kvQbZVJII91WVZKIn-KF7bFIA3HKdKe0JmaBu4RZtX31Q/exec";

const CART_STORAGE_KEY = "tochka_hruskotu_cart_v3";
const STORE_CACHE_KEY = "tochka_hruskotu_store_cache_v1";
const STORE_REQUEST_TIMEOUT_MS = 12000;

let store = null;
let product = null;
let cart = loadCart();

let selectedPhotoIndex = 0;
let selectedVariantValue = "";
let selectedSauces = [];
let quantity = 1;

let toastTimer = null;


/* ==========================================================
   1. ЕЛЕМЕНТИ
   ========================================================== */

const $ = selector => document.querySelector(selector);

const elements = {
  pageLoader: $("#pageLoader"),

  headerLogo: $("#headerLogo"),
  footerLogo: $("#footerLogo"),
  headerStoreName: $("#headerStoreName"),
  footerStoreName: $("#footerStoreName"),
  footerGoogleProfile: $("#footerGoogleProfile"),

  breadcrumbProduct: $("#breadcrumbProduct"),

  productLoading: $("#productLoading"),
  productNotFound: $("#productNotFound"),
  productPage: $("#productPage"),

  productBadges: $("#productBadges"),
  productMainImage: $("#productMainImage"),
  mainImageButton: $("#mainImageButton"),
  productThumbnails: $("#productThumbnails"),

  productCategoryLink: $("#productCategoryLink"),
  productName: $("#productName"),
  productRatingLink: $("#productRatingLink"),
  productRatingText: $("#productRatingText"),
  productShortDescription: $("#productShortDescription"),

  productPrice: $("#productPrice"),
  productOldPrice: $("#productOldPrice"),
  productPriceNote: $("#productPriceNote"),

  variantGroup: $("#variantGroup"),
  variantTitle: $("#variantTitle"),
  variantButtons: $("#variantButtons"),

  sauceGroup: $("#sauceGroup"),
  sauceHelp: $("#sauceHelp"),
  sauceButtons: $("#sauceButtons"),

  decreaseQuantity: $("#decreaseQuantity"),
  increaseQuantity: $("#increaseQuantity"),
  productQuantity: $("#productQuantity"),
  addProductToCart: $("#addProductToCart"),

  productDetailsSection: $("#productDetailsSection"),
  productDescription: $("#productDescription"),

  ingredientsDetails: $("#ingredientsDetails"),
  productIngredients: $("#productIngredients"),
  productAllergens: $("#productAllergens"),

  storageDetails: $("#storageDetails"),
  productStorage: $("#productStorage"),

  productCommunitySection: $("#productCommunitySection"),
  productReviewList: $("#productReviewList"),
  productReviewEmpty: $("#productReviewEmpty"),
  productQuestionList: $("#productQuestionList"),
  productQuestionEmpty: $("#productQuestionEmpty"),
  leaveReviewButton: $("#leaveReviewButton"),
  askQuestionButton: $("#askQuestionButton"),

  relatedProductsSection: $("#relatedProductsSection"),
  relatedProducts: $("#relatedProducts"),

  mobileProductBar: $("#mobileProductBar"),
  mobileProductPrice: $("#mobileProductPrice"),
  mobileAddProduct: $("#mobileAddProduct"),

  mobileMenuButton: $("#mobileMenuButton"),
  mobileMenu: $("#mobileMenu"),
  mobileMenuOverlay: $("#mobileMenuOverlay"),
  closeMobileMenu: $("#closeMobileMenu"),

  cartButton: $("#cartButton"),
  cartCount: $("#cartCount"),
  cartOverlay: $("#cartOverlay"),
  cartPanel: $("#cartPanel"),
  closeCartButton: $("#closeCartButton"),
  cartItems: $("#cartItems"),
  cartProgress: $("#cartProgress"),
  cartSuggestions: $("#cartSuggestions"),
  cartTotal: $("#cartTotal"),
  checkoutButton: $("#checkoutButton"),
  continueShoppingButton: $("#continueShoppingButton"),

  toast: $("#toast")
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
    .trim();
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatMoney(value) {
  const currency = store?.settings?.currency || "грн";

  return (
    new Intl.NumberFormat("uk-UA", {
      maximumFractionDigits: 2
    }).format(safeNumber(value)) +
    " " +
    currency
  );
}

function showToast(message) {
  if (!elements.toast) return;

  clearTimeout(toastTimer);

  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");

  toastTimer = setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 2500);
}

function hideLoader() {
  elements.pageLoader?.classList.add("is-hidden");
}

function getProductCode() {
  const params = new URLSearchParams(window.location.search);

  return String(params.get("code") || "")
    .trim()
    .toUpperCase();
}

function findProduct(code) {
  return (
    (store?.products || []).find(
      item =>
        String(item.code || "")
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
      category => category.code === code
    ) || null
  );
}

function productPhotos(item) {
  const photos =
    Array.isArray(item?.photos)
      ? item.photos.filter(Boolean)
      : [];

  return photos.length
    ? photos
    : [
        store?.settings?.logo ||
          "images/brand/logo.webp"
      ];
}

function productUrl(item) {
  return `product.html?code=${encodeURIComponent(item.code)}`;
}

function selectedVariant() {
  if (!product?.variants?.length) {
    return null;
  }

  return (
    product.variants.find(
      variant =>
        variant.value === selectedVariantValue
    ) ||
    product.variants[0] ||
    null
  );
}

function currentUnitPrice() {
  const variant = selectedVariant();

  if (variant) {
    return safeNumber(
      variant.effectivePrice ??
        variant.salePrice ??
        variant.regularPrice,
      0
    );
  }

  return safeNumber(
    product?.effectivePrice ??
      product?.regularPrice,
    0
  );
}

function currentRegularPrice() {
  const variant = selectedVariant();

  if (variant) {
    return safeNumber(
      variant.regularPrice,
      currentUnitPrice()
    );
  }

  return safeNumber(
    product?.regularPrice,
    currentUnitPrice()
  );
}

function currentSaleActive() {
  const variant = selectedVariant();

  if (variant) {
    return Boolean(
      variant.saleActive &&
        currentRegularPrice() >
          currentUnitPrice()
    );
  }

  return Boolean(
    product?.saleActive &&
      currentRegularPrice() >
        currentUnitPrice()
  );
}

function currentSaleUntil() {
  return (
    selectedVariant()?.saleUntil ||
    product?.saleUntil ||
    ""
  );
}

function formatDateUk(value) {
  if (!value) return "";

  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "uk-UA",
    {
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  ).format(date);
}

function trackGa4Event(eventName, params = {}) {
  if (typeof window.gtag !== "function") {
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

function ga4ProductItem(
  item,
  itemQuantity = 1
) {
  const category =
    findCategory(item.categoryCode);

  return {
    item_id: item.code,
    item_name: item.name,
    item_category:
      category?.name ||
      item.categoryCode ||
      "",
    item_variant:
      selectedVariantValue || "",
    price: currentUnitPrice(),
    quantity: itemQuantity
  };
}


/* ==========================================================
   3. КЕШ І ЗАВАНТАЖЕННЯ
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
      typeof cached !== "object" ||
      !cached.data
    ) {
      return null;
    }

    return cached;
  } catch (error) {
    console.warn(
      "Не вдалося прочитати кеш:",
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
        savedAt: Date.now(),
        data
      })
    );
  } catch (error) {
    console.warn(
      "Не вдалося зберегти кеш:",
      error
    );
  }
}

async function fetchStore() {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      STORE_REQUEST_TIMEOUT_MS
    );

  try {
    const response =
      await fetch(
        `${STORE_API_URL}?action=store&_=${Date.now()}`,
        {
          method: "GET",
          redirect: "follow",
          signal: controller.signal
        }
      );

    if (!response.ok) {
      throw new Error(
        `Помилка сервера: ${response.status}`
      );
    }

    const result =
      await response.json();

    if (!result?.success) {
      throw new Error(
        result?.error ||
          "Не вдалося завантажити товар."
      );
    }

    return result;
  } finally {
    clearTimeout(timer);
  }
}

async function loadStore() {
  const cached =
    readCachedStore();

  const hasCache =
    Boolean(
      cached?.data?.success
    );

  if (hasCache) {
    renderStore(
      cached.data,
      false
    );

    hideLoader();
  }

  try {
    const fresh =
      await fetchStore();

    saveCachedStore(fresh);

    renderStore(
      fresh,
      true
    );
  } catch (error) {
    console.error(error);

    if (!hasCache) {
      showProductNotFound(
        "Не вдалося завантажити товар."
      );
    }
  } finally {
    hideLoader();
  }
}


/* ==========================================================
   4. НАЛАШТУВАННЯ САЙТУ
   ========================================================== */

function applySettings() {
  const settings =
    store?.settings || {};

  const storeName =
    settings.storeName ||
    "Точка Хрускоту";

  if (elements.headerStoreName) {
    elements.headerStoreName.textContent =
      storeName;
  }

  if (elements.footerStoreName) {
    elements.footerStoreName.textContent =
      storeName;
  }

  if (settings.logo) {
    if (elements.headerLogo) {
      elements.headerLogo.src =
        settings.logo;
    }

    if (elements.footerLogo) {
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
   5. ОСНОВНИЙ РЕНДЕР ТОВАРУ
   ========================================================== */

function renderStore(
  data,
  fresh = false
) {
  store = data;

  applySettings();

  const code =
    getProductCode();

  if (!code) {
    showProductNotFound(
      "Не вказано код товару."
    );

    renderCart();
    return;
  }

  const found =
    findProduct(code);

  if (!found) {
    showProductNotFound(
      "Товар із таким кодом не знайдено."
    );

    renderCart();
    return;
  }

  product = found;

  if (
    product.variants?.length &&
    !selectedVariantValue
  ) {
    selectedVariantValue =
      product.variants[0].value || "";
  }

  const sauceCount =
    Math.max(
      0,
      safeNumber(
        product.sauceCount,
        0
      )
    );

  if (
    selectedSauces.length !==
    sauceCount
  ) {
    selectedSauces =
      Array.from(
        { length: sauceCount },
        () => ""
      );
  }

  renderProduct();
  renderCart();

  if (fresh) {
    /*
      Свіжі дані можуть містити нові
      відгуки, ціни або фото.
    */
    renderCommunity();
  }
}

function showProductNotFound(message) {
  if (elements.productLoading) {
    elements.productLoading.hidden =
      true;
  }

  if (elements.productPage) {
    elements.productPage.hidden =
      true;
  }

  if (
    elements.productDetailsSection
  ) {
    elements.productDetailsSection.hidden =
      true;
  }

  if (
    elements.productCommunitySection
  ) {
    elements.productCommunitySection.hidden =
      true;
  }

  if (
    elements.relatedProductsSection
  ) {
    elements.relatedProductsSection.hidden =
      true;
  }

  if (elements.productNotFound) {
    elements.productNotFound.hidden =
      false;

    const paragraph =
      elements.productNotFound.querySelector(
        "p"
      );

    if (paragraph && message) {
      paragraph.textContent =
        message;
    }
  }
}

function renderProduct() {
  if (!product) return;

  elements.productLoading.hidden =
    true;

  elements.productNotFound.hidden =
    true;

  elements.productPage.hidden =
    false;

  elements.productDetailsSection.hidden =
    false;

  elements.productCommunitySection.hidden =
    false;

  document.body.classList.add(
    "has-mobile-product-bar"
  );

  elements.mobileProductBar.hidden =
    false;

  renderSeo();
  renderBasicInfo();
  renderGallery();
  renderBadges();
  renderPrice();
  renderVariants();
  renderSauces();
  renderQuantity();
  renderDetails();
  renderCommunity();
  renderRelatedProducts();
  updateAddButtons();

  trackGa4Event(
    "view_item",
    {
      currency: "UAH",
      value: currentUnitPrice(),
      items: [
        ga4ProductItem(
          product,
          1
        )
      ]
    }
  );
}


/* ==========================================================
   6. SEO ТА ОСНОВНІ ДАНІ
   ========================================================== */

function renderSeo() {
  const storeName =
    store?.settings?.storeName ||
    "Точка Хрускоту";

  document.title =
    `${product.name} — ${storeName}`;

  const description =
    product.shortDescription ||
    product.fullDescription ||
    `${product.name} від Точки Хрускоту.`;

  let meta =
    document.querySelector(
      'meta[name="description"]'
    );

  if (meta) {
    meta.setAttribute(
      "content",
      description
    );
  }
}

function renderBasicInfo() {
  const category =
    findCategory(
      product.categoryCode
    );

  elements.breadcrumbProduct.textContent =
    product.name;

  elements.productName.textContent =
    product.name;

  elements.productShortDescription.textContent =
    product.shortDescription ||
    "";

  elements.productCategoryLink.textContent =
    category?.name ||
    "Каталог";

  elements.productCategoryLink.href =
    "catalog.html";

  renderRatingSummary();
}


/* ==========================================================
   7. ФОТО
   ========================================================== */

function renderGallery() {
  const photos =
    productPhotos(product);

  if (
    selectedPhotoIndex >=
    photos.length
  ) {
    selectedPhotoIndex = 0;
  }

  const currentPhoto =
    photos[selectedPhotoIndex];

  elements.productMainImage.src =
    currentPhoto;

  elements.productMainImage.alt =
    `${product.name} — фото ${
      selectedPhotoIndex + 1
    }`;

  if (photos.length <= 1) {
    elements.productThumbnails.hidden =
      true;

    elements.productThumbnails.innerHTML =
      "";

    return;
  }

  elements.productThumbnails.hidden =
    false;

  elements.productThumbnails.innerHTML =
    photos
      .map(
        (photo, index) => `
          <button
            class="product-thumbnail${
              index === selectedPhotoIndex
                ? " is-active"
                : ""
            }"
            type="button"
            data-photo-index="${index}"
            aria-label="Фото ${index + 1}"
          >
            <img
              src="${escapeHtml(photo)}"
              alt=""
              loading="lazy"
            >
          </button>
        `
      )
      .join("");
}

function changePhoto(index) {
  const photos =
    productPhotos(product);

  if (!photos.length) {
    return;
  }

  let next =
    Number(index);

  if (next < 0) {
    next =
      photos.length - 1;
  }

  if (
    next >= photos.length
  ) {
    next = 0;
  }

  selectedPhotoIndex =
    next;

  renderGallery();
}


/* ==========================================================
   8. ПОЗНАЧКИ
   ========================================================== */

function renderBadges() {
  const badges = [];

  if (product.saleActive) {
    badges.push(
      `<span class="product-page-badge sale">
        Акція
      </span>`
    );
  }

  if (product.isNew) {
    badges.push(
      `<span class="product-page-badge new">
        Новинка
      </span>`
    );
  }

  if (product.badge) {
    badges.push(
      `<span class="product-page-badge">
        ${escapeHtml(product.badge)}
      </span>`
    );
  }

  elements.productBadges.innerHTML =
    badges
      .slice(0, 3)
      .join("");
}


/* ==========================================================
   9. ЦІНА
   ========================================================== */

function renderPrice() {
  const price =
    currentUnitPrice();

  const regular =
    currentRegularPrice();

  const sale =
    currentSaleActive();

  elements.productPrice.textContent =
    formatMoney(price);

  elements.mobileProductPrice.textContent =
    formatMoney(
      price * quantity
    );

  if (
    sale &&
    regular > price
  ) {
    elements.productOldPrice.hidden =
      false;

    elements.productOldPrice.textContent =
      formatMoney(regular);

    const until =
      currentSaleUntil();

    elements.productPriceNote.textContent =
      until
        ? `Акційна ціна до ${formatDateUk(until)}`
        : "Акційна ціна";
  } else {
    elements.productOldPrice.hidden =
      true;

    elements.productOldPrice.textContent =
      "";

    elements.productPriceNote.textContent =
      product.weight ||
      "";
  }
}


/* ==========================================================
   10. ВАРІАНТИ
   ========================================================== */

function renderVariants() {
  const variants =
    Array.isArray(product.variants)
      ? product.variants
      : [];

  if (!variants.length) {
    elements.variantGroup.hidden =
      true;

    elements.variantButtons.innerHTML =
      "";

    return;
  }

  elements.variantGroup.hidden =
    false;

  elements.variantTitle.textContent =
    product.variantType ||
    variants[0]?.type ||
    "Оберіть варіант";

  elements.variantButtons.innerHTML =
    variants
      .map(variant => {
        const selected =
          variant.value ===
          selectedVariantValue;

        return `
          <button
            class="product-option-button${
              selected
                ? " is-selected"
                : ""
            }"
            type="button"
            data-variant="${escapeHtml(
              variant.value
            )}"
          >
            ${escapeHtml(
              variant.value
            )}
            ·
            ${escapeHtml(
              formatMoney(
                variant.effectivePrice ??
                  variant.regularPrice
              )
            )}
          </button>
        `;
      })
      .join("");
}


/* ==========================================================
   11. СОУСИ
   ========================================================== */

function renderSauces() {
  const sauces =
    Array.isArray(product.sauces)
      ? product.sauces
      : [];

  const count =
    Math.max(
      0,
      safeNumber(
        product.sauceCount,
        0
      )
    );

  if (
    !count ||
    !sauces.length
  ) {
    elements.sauceGroup.hidden =
      true;

    elements.sauceButtons.innerHTML =
      "";

    return;
  }

  elements.sauceGroup.hidden =
    false;

  elements.sauceHelp.textContent =
    count === 1
      ? "Один соус входить у комплект."
      : `Оберіть ${count} соуси — вони входять у комплект.`;

  elements.sauceButtons.innerHTML =
    Array.from(
      { length: count },
      (_, slotIndex) => {

        const current =
          selectedSauces[
            slotIndex
          ] || "";

        return `
          <div
            style="
              width:100%;
              margin-bottom:${
                slotIndex + 1 < count
                  ? "12px"
                  : "0"
              };
            "
          >

            ${
              count > 1
                ? `
                  <div
                    style="
                      margin-bottom:7px;
                      color:var(--text-soft);
                      font-size:12px;
                      font-weight:800;
                    "
                  >
                    Соус ${slotIndex + 1}
                  </div>
                `
                : ""
            }

            <div
              style="
                display:flex;
                flex-wrap:wrap;
                gap:8px;
              "
            >

              ${sauces
                .map(
                  sauce => `
                    <button
                      class="product-option-button${
                        current === sauce
                          ? " is-selected"
                          : ""
                      }"
                      type="button"
                      data-sauce-slot="${slotIndex}"
                      data-sauce="${escapeHtml(
                        sauce
                      )}"
                    >
                      ${escapeHtml(
                        sauce
                      )}
                    </button>
                  `
                )
                .join("")}

            </div>

          </div>
        `;
      }
    ).join("");
}


/* ==========================================================
   12. КІЛЬКІСТЬ І КНОПКИ
   ========================================================== */

function renderQuantity() {
  elements.productQuantity.textContent =
    quantity;

  renderPrice();
}

function saucesAreComplete() {
  const required =
    Math.max(
      0,
      safeNumber(
        product?.sauceCount,
        0
      )
    );

  if (!required) {
    return true;
  }

  return (
    selectedSauces.length ===
      required &&
    selectedSauces.every(Boolean)
  );
}

function updateAddButtons() {
  if (!product) return;

  const available =
    product.available !== false;

  const complete =
    saucesAreComplete();

  const enabled =
    available && complete;

  const total =
    currentUnitPrice() *
    quantity;

  elements.addProductToCart.disabled =
    !enabled;

  elements.mobileAddProduct.disabled =
    !enabled;

  if (!available) {
    elements.addProductToCart.textContent =
      "Тимчасово недоступний";

    elements.mobileAddProduct.textContent =
      "Недоступний";

    return;
  }

  if (!complete) {
    const count =
      safeNumber(
        product.sauceCount,
        0
      );

    elements.addProductToCart.textContent =
      count > 1
        ? "Оберіть соуси"
        : "Оберіть соус";

    elements.mobileAddProduct.textContent =
      count > 1
        ? "Оберіть соуси"
        : "Оберіть соус";

    return;
  }

  elements.addProductToCart.textContent =
    `Додати в кошик · ${formatMoney(total)}`;

  elements.mobileAddProduct.textContent =
    `У кошик · ${formatMoney(total)}`;
}


/* ==========================================================
   13. ДЕТАЛЬНА ІНФОРМАЦІЯ
   ========================================================== */

function paragraphHtml(value) {
  const text =
    String(value || "")
      .trim();

  if (!text) {
    return "";
  }

  return `<p>${escapeHtml(text).replace(
    /\n/g,
    "<br>"
  )}</p>`;
}

function renderDetails() {
  elements.productDescription.innerHTML =
    paragraphHtml(
      product.fullDescription ||
        product.shortDescription
    );

  const hasIngredients =
    Boolean(product.ingredients);

  const hasAllergens =
    Boolean(product.allergens);

  elements.ingredientsDetails.hidden =
    !(
      hasIngredients ||
      hasAllergens
    );

  if (hasIngredients) {
    elements.productIngredients.hidden =
      false;

    elements.productIngredients.innerHTML =
      `
        <p>
          <strong>Склад:</strong>
          ${escapeHtml(
            product.ingredients
          )}
        </p>
      `;
  } else {
    elements.productIngredients.hidden =
      true;
  }

  if (hasAllergens) {
    elements.productAllergens.hidden =
      false;

    elements.productAllergens.innerHTML =
      `
        <p>
          <strong>Алергени:</strong>
          ${escapeHtml(
            product.allergens
          )}
        </p>
      `;
  } else {
    elements.productAllergens.hidden =
      true;
  }

  const storageParts = [];

  if (product.weight) {
    storageParts.push(
      `<p>
        <strong>Вага / комплектація:</strong>
        ${escapeHtml(product.weight)}
      </p>`
    );
  }

  if (product.shelfLife) {
    storageParts.push(
      `<p>
        <strong>Термін придатності:</strong>
        ${escapeHtml(
          product.shelfLife
        )}
      </p>`
    );
  }

  if (product.storage) {
    storageParts.push(
      `<p>
        <strong>Умови зберігання:</strong>
        ${escapeHtml(
          product.storage
        )}
      </p>`
    );
  }

  elements.storageDetails.hidden =
    !storageParts.length;

  elements.productStorage.innerHTML =
    storageParts.join("");
}


/* ==========================================================
   14. ВІДГУКИ ТА ПИТАННЯ
   ========================================================== */

function isQuestionFeedback(item) {
  const type =
    normalizeText(
      item?.type || ""
    );

  return (
    type === "question" ||
    type.includes("питан")
  );
}

function productFeedback() {
  return (
    store?.reviews || []
  ).filter(item => {
    return (
      String(
        item?.productCode || ""
      )
        .trim()
        .toUpperCase() ===
      String(
        product?.code || ""
      )
        .trim()
        .toUpperCase()
    );
  });
}

function productReviews() {
  return productFeedback()
    .filter(
      item =>
        !isQuestionFeedback(
          item
        )
    );
}

function productQuestions() {
  return productFeedback()
    .filter(
      isQuestionFeedback
    );
}

function ratingAverage() {
  const ratings =
    productReviews()
      .map(item =>
        safeNumber(
          item.rating,
          0
        )
      )
      .filter(
        value =>
          value >= 1 &&
          value <= 5
      );

  if (!ratings.length) {
    return 0;
  }

  return (
    ratings.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / ratings.length
  );
}

function renderRatingSummary() {
  const reviews =
    productReviews();

  const average =
    ratingAverage();

  if (
    !reviews.length ||
    !average
  ) {
    elements.productRatingLink.hidden =
      true;

    return;
  }

  elements.productRatingLink.hidden =
    false;

  elements.productRatingText.textContent =
    `${average
      .toFixed(1)
      .replace(".", ",")} · ${
      reviews.length
    } ${reviewWord(
      reviews.length
    )}`;
}

function reviewWord(count) {
  const value =
    Math.abs(Number(count)) %
    100;

  const last =
    value % 10;

  if (
    value > 10 &&
    value < 20
  ) {
    return "відгуків";
  }

  if (last === 1) {
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

function renderCommunity() {
  if (!product) return;

  const reviews =
    productReviews();

  const questions =
    productQuestions();

  elements.productCommunitySection.hidden =
    false;

  elements.productReviewEmpty.hidden =
    reviews.length > 0;

  elements.productQuestionEmpty.hidden =
    questions.length > 0;

  elements.productReviewList.innerHTML =
    reviews
      .map(review => {
        const rating =
          Math.max(
            0,
            Math.min(
              5,
              safeNumber(
                review.rating,
                0
              )
            )
          );

        const stars =
          rating
            ? "★".repeat(
                rating
              )
            : "";

        const answer =
          review.answer ||
          review.reply ||
          "";

        return `
          <article class="product-review-card">

            ${
              stars
                ? `
                  <div class="product-review-stars">
                    ${stars}
                  </div>
                `
                : ""
            }

            <strong>
              ${escapeHtml(
                review.name ||
                  "Покупець"
              )}
            </strong>

            ${
              review.verifiedPurchase
                ? `
                  <div
                    style="
                      margin-top:4px;
                      color:var(--green);
                      font-size:11px;
                      font-weight:800;
                    "
                  >
                    Підтверджена покупка
                  </div>
                `
                : ""
            }

            <p>
              ${escapeHtml(
                review.text || ""
              )}
            </p>

            ${
              answer
                ? `
                  <div class="product-answer">
                    <strong>
                      Точка Хрускоту:
                    </strong>
                    ${escapeHtml(answer)}
                  </div>
                `
                : ""
            }

          </article>
        `;
      })
      .join("");

  elements.productQuestionList.innerHTML =
    questions
      .map(question => {
        const answer =
          question.answer ||
          question.reply ||
          "";

        return `
          <article class="product-question-card">

            <strong>
              ${escapeHtml(
                question.name ||
                  "Покупець"
              )}
            </strong>

            <p>
              ${escapeHtml(
                question.text || ""
              )}
            </p>

            ${
              answer
                ? `
                  <div class="product-answer">
                    <strong>
                      Точка Хрускоту:
                    </strong>
                    ${escapeHtml(answer)}
                  </div>
                `
                : ""
            }

          </article>
        `;
      })
      .join("");

  renderRatingSummary();
}


/* ==========================================================
   15. СХОЖІ ТОВАРИ
   ========================================================== */

function relatedProductList() {
  const codes =
    Array.isArray(
      product?.relatedProductCodes
    )
      ? product.relatedProductCodes
      : [];

  let related =
    codes
      .map(findProduct)
      .filter(Boolean)
      .filter(
        item =>
          item.code !== product.code
      );

  if (!related.length) {
    related =
      (store?.products || [])
        .filter(
          item =>
            item.code !==
              product.code &&
            item.categoryCode ===
              product.categoryCode
        );
  }

  return related.slice(0, 4);
}

function relatedProductCard(item) {
  const image =
    productPhotos(item)[0];

  const hasChoices =
    Boolean(
      item.variants?.length ||
        safeNumber(
          item.sauceCount,
          0
        ) > 0
    );

  const price =
    item.variants?.length
      ? Math.min(
          ...item.variants
            .map(variant =>
              safeNumber(
                variant.effectivePrice,
                0
              )
            )
            .filter(
              value =>
                value > 0
            )
        )
      : safeNumber(
          item.effectivePrice ??
            item.regularPrice,
          0
        );

  return `
    <article class="product-card">

      <div class="product-card-media">

        <a
          href="${escapeHtml(
            productUrl(item)
          )}"
        >
          <img
            src="${escapeHtml(image)}"
            alt="${escapeHtml(
              item.name
            )}"
            loading="lazy"
          >
        </a>

      </div>

      <div class="product-card-body">

        <h3 class="product-card-title">
          <a
            href="${escapeHtml(
              productUrl(item)
            )}"
          >
            ${escapeHtml(
              item.name
            )}
          </a>
        </h3>

        ${
          item.shortDescription
            ? `
              <p class="product-card-description">
                ${escapeHtml(
                  item.shortDescription
                )}
              </p>
            `
            : ""
        }

        <div class="product-card-price-row">
          <span class="product-card-price">
            ${
              item.variants?.length
                ? "від "
                : ""
            }${escapeHtml(
              formatMoney(price)
            )}
          </span>
        </div>

        <div class="product-card-actions">

          ${
            hasChoices
              ? `
                <a
                  class="product-card-button"
                  href="${escapeHtml(
                    productUrl(item)
                  )}"
                >
                  Обрати варіант
                </a>
              `
              : `
                <button
                  class="product-card-button"
                  type="button"
                  data-related-add="${escapeHtml(
                    item.code
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

function renderRelatedProducts() {
  const related =
    relatedProductList();

  if (!related.length) {
    elements.relatedProductsSection.hidden =
      true;

    return;
  }

  elements.relatedProductsSection.hidden =
    false;

  elements.relatedProducts.innerHTML =
    related
      .map(
        relatedProductCard
      )
      .join("");
}


/* ==========================================================
   16. КОШИК
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

    return Array.isArray(parsed)
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
      JSON.stringify(cart)
    );
  } catch (error) {
    console.error(
      "Помилка збереження кошика:",
      error
    );
  }
}

function cartCount() {
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

function cartTotal() {
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

function addCurrentProductToCart() {
  if (
    !product ||
    product.available === false
  ) {
    return;
  }

  if (!saucesAreComplete()) {
    showToast(
      safeNumber(
        product.sauceCount,
        0
      ) > 1
        ? "Оберіть усі соуси."
        : "Оберіть соус."
    );

    elements.sauceGroup?.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

    return;
  }

  const variant =
    selectedVariant();

  const sauces =
    [...selectedSauces];

  const price =
    currentUnitPrice();

  const cartItemId =
    `${product.code}__${selectedVariantValue}__${sauces.join(
      "|"
    )}`;

  const existing =
    cart.find(
      item =>
        item.cartItemId ===
        cartItemId
    );

  if (existing) {
    existing.quantity =
      safeNumber(
        existing.quantity,
        1
      ) + quantity;
  } else {
    cart.push({
      cartItemId,
      code: product.code,
      name: product.name,
      photo:
        productPhotos(product)[0],
      price,
      variantType:
        product.variantType ||
        variant?.type ||
        "",
      variantValue:
        selectedVariantValue,
      sauces,
      quantity
    });
  }

  saveCart();
  renderCart();

  trackGa4Event(
    "add_to_cart",
    {
      currency: "UAH",
      value:
        price *
        quantity,
      items: [
        ga4ProductItem(
          product,
          quantity
        )
      ]
    }
  );

  showToast(
    "Товар додано до кошика"
  );

  openCart();
}

function addSimpleRelatedProduct(code) {
  const item =
    findProduct(code);

  if (!item) {
    return;
  }

  const hasChoices =
    Boolean(
      item.variants?.length ||
        safeNumber(
          item.sauceCount,
          0
        ) > 0
    );

  if (hasChoices) {
    window.location.href =
      productUrl(item);

    return;
  }

  const price =
    safeNumber(
      item.effectivePrice ??
        item.regularPrice,
      0
    );

  const id =
    `${item.code}____`;

  const existing =
    cart.find(
      cartItem =>
        cartItem.cartItemId ===
        id
    );

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      cartItemId: id,
      code: item.code,
      name: item.name,
      photo:
        productPhotos(item)[0],
      price,
      variantType: "",
      variantValue: "",
      sauces: [],
      quantity: 1
    });
  }

  saveCart();
  renderCart();

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

  if (!item) return;

  item.quantity =
    safeNumber(
      item.quantity,
      1
    ) + change;

  if (item.quantity <= 0) {
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

function getFreeDeliveryThreshold() {
  return safeNumber(
    store?.settings
      ?.freeDeliveryFrom,
    2000
  );
}

function renderFreeDeliveryProgress() {
  const total =
    cartTotal();

  const threshold =
    getFreeDeliveryThreshold();

  if (!cart.length) {
    elements.cartProgress.hidden =
      true;

    elements.cartProgress.innerHTML =
      "";

    return;
  }

  elements.cartProgress.hidden =
    false;

  if (total >= threshold) {
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
    threshold - total;

  const percent =
    Math.min(
      100,
      Math.max(
        0,
        (total / threshold) *
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

function renderCart() {
  if (!elements.cartItems) {
    return;
  }

  const count =
    cartCount();

  const total =
    cartTotal();

  elements.cartCount.textContent =
    count;

  elements.cartTotal.textContent =
    formatMoney(total);

  if (!cart.length) {
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

    elements.cartProgress.hidden =
      true;

    elements.checkoutButton.classList.add(
      "is-disabled"
    );

    elements.checkoutButton.setAttribute(
      "aria-disabled",
      "true"
    );

    return;
  }

  elements.checkoutButton.classList.remove(
    "is-disabled"
  );

  elements.checkoutButton.removeAttribute(
    "aria-disabled"
  );

  elements.cartItems.innerHTML =
    cart
      .map(item => {
        const itemProduct =
          findProduct(
            item.code
          );

        const image =
          item.photo ||
          productPhotos(
            itemProduct
          )[0];

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
                    itemProduct?.name ||
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
                item.sauces?.length
                  ? `
                    <div class="cart-item-variant">
                      Соус${
                        item.sauces.length >
                        1
                          ? "и"
                          : ""
                      }:
                      ${item.sauces
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
   17. ВІДКРИТТЯ КОШИКА
   ========================================================== */

function openCart() {
  closeMobileMenu();

  elements.cartOverlay.hidden =
    false;

  elements.cartPanel.classList.add(
    "is-open"
  );

  elements.cartPanel.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "cart-open"
  );
}

function closeCart() {
  elements.cartPanel.classList.remove(
    "is-open"
  );

  elements.cartPanel.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.classList.remove(
    "cart-open"
  );

  setTimeout(() => {
    if (
      !elements.cartPanel.classList.contains(
        "is-open"
      )
    ) {
      elements.cartOverlay.hidden =
        true;
    }
  }, 260);
}


/* ==========================================================
   18. МОБІЛЬНЕ МЕНЮ
   ========================================================== */

function openMobileMenu() {
  closeCart();

  elements.mobileMenuOverlay.hidden =
    false;

  elements.mobileMenu.classList.add(
    "is-open"
  );

  elements.mobileMenu.setAttribute(
    "aria-hidden",
    "false"
  );

  elements.mobileMenuButton.setAttribute(
    "aria-expanded",
    "true"
  );

  document.body.classList.add(
    "menu-open"
  );
}

function closeMobileMenu() {
  elements.mobileMenu.classList.remove(
    "is-open"
  );

  elements.mobileMenu.setAttribute(
    "aria-hidden",
    "true"
  );

  elements.mobileMenuButton.setAttribute(
    "aria-expanded",
    "false"
  );

  document.body.classList.remove(
    "menu-open"
  );

  setTimeout(() => {
    if (
      !elements.mobileMenu.classList.contains(
        "is-open"
      )
    ) {
      elements.mobileMenuOverlay.hidden =
        true;
    }
  }, 260);
}


/* ==========================================================
   19. ФОРМА ВІДГУКУ / ПИТАННЯ
   Створюється JS — не треба міняти product.html
   ========================================================== */

function ensureFeedbackModal() {
  if (
    document.querySelector(
      "#feedbackDynamicOverlay"
    )
  ) {
    return;
  }

  const style =
    document.createElement(
      "style"
    );

  style.textContent = `
    .feedback-dynamic-overlay {
      position: fixed;
      inset: 0;
      z-index: 2900;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(35,26,21,.55);
    }

    .feedback-dynamic-overlay.is-open {
      display: flex;
    }

    .feedback-dynamic-modal {
      width: min(520px, 100%);
      max-height: 90vh;
      overflow-y: auto;
      padding: 24px;
      border-radius: 20px;
      background: #fff;
      box-shadow: var(--shadow-lg);
    }

    .feedback-dynamic-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      margin-bottom: 18px;
    }

    .feedback-dynamic-head h2 {
      margin: 0;
      color: var(--brown);
      font-size: 24px;
    }

    .feedback-dynamic-close {
      width: 40px;
      height: 40px;
      border: 1px solid var(--border);
      border-radius: 50%;
      background: var(--surface-soft);
      font-size: 25px;
    }

    .feedback-dynamic-product {
      margin: 0 0 16px;
      color: var(--text-soft);
      font-size: 13px;
    }

    .feedback-dynamic-field {
      display: grid;
      gap: 6px;
      margin-bottom: 14px;
    }

    .feedback-dynamic-field label {
      color: var(--brown);
      font-size: 13px;
      font-weight: 800;
    }

    .feedback-dynamic-field input,
    .feedback-dynamic-field select,
    .feedback-dynamic-field textarea {
      width: 100%;
      padding: 11px 12px;
      border: 1px solid var(--border-strong);
      border-radius: 12px;
      background: #fff;
    }

    .feedback-dynamic-field textarea {
      min-height: 120px;
      resize: vertical;
    }

    .feedback-dynamic-submit {
      width: 100%;
      min-height: 48px;
      border: 0;
      border-radius: 13px;
      background: var(--accent);
      color: #fff;
      font-weight: 900;
    }

    .feedback-dynamic-status {
      margin-top: 12px;
      color: var(--text-soft);
      font-size: 13px;
    }

    .feedback-dynamic-status.is-success {
      color: var(--green);
    }

    .feedback-dynamic-status.is-error {
      color: var(--danger);
    }
  `;

  document.head.appendChild(
    style
  );

  const overlay =
    document.createElement(
      "div"
    );

  overlay.id =
    "feedbackDynamicOverlay";

  overlay.className =
    "feedback-dynamic-overlay";

  overlay.innerHTML = `
    <div
      class="feedback-dynamic-modal"
      role="dialog"
      aria-modal="true"
    >

      <div class="feedback-dynamic-head">

        <h2 id="feedbackDynamicTitle">
          Відгук
        </h2>

        <button
          class="feedback-dynamic-close"
          id="feedbackDynamicClose"
          type="button"
          aria-label="Закрити"
        >
          ×
        </button>

      </div>

      <p
        class="feedback-dynamic-product"
        id="feedbackDynamicProduct"
      ></p>

      <form id="feedbackDynamicForm">

        <input
          id="feedbackDynamicType"
          type="hidden"
        >

        <div class="feedback-dynamic-field">

          <label for="feedbackDynamicName">
            Ваше ім’я
          </label>

          <input
            id="feedbackDynamicName"
            type="text"
            minlength="2"
            required
            autocomplete="name"
          >

        </div>

        <div
          class="feedback-dynamic-field"
          id="feedbackDynamicRatingField"
        >

          <label for="feedbackDynamicRating">
            Оцінка
          </label>

          <select
            id="feedbackDynamicRating"
          >
            <option value="">
              Оберіть оцінку
            </option>

            <option value="5">
              5 — відмінно
            </option>

            <option value="4">
              4 — добре
            </option>

            <option value="3">
              3 — нормально
            </option>

            <option value="2">
              2 — є зауваження
            </option>

            <option value="1">
              1 — не сподобалося
            </option>
          </select>

        </div>

        <div class="feedback-dynamic-field">

          <label
            id="feedbackDynamicTextLabel"
            for="feedbackDynamicText"
          >
            Ваш відгук
          </label>

          <textarea
            id="feedbackDynamicText"
            minlength="5"
            required
          ></textarea>

        </div>

        <button
          class="feedback-dynamic-submit"
          id="feedbackDynamicSubmit"
          type="submit"
        >
          Надіслати
        </button>

        <div
          class="feedback-dynamic-status"
          id="feedbackDynamicStatus"
          aria-live="polite"
        ></div>

      </form>

    </div>
  `;

  document.body.appendChild(
    overlay
  );

  $("#feedbackDynamicClose")
    ?.addEventListener(
      "click",
      closeFeedbackModal
    );

  overlay.addEventListener(
    "click",
    event => {
      if (
        event.target === overlay
      ) {
        closeFeedbackModal();
      }
    }
  );

  $("#feedbackDynamicForm")
    ?.addEventListener(
      "submit",
      submitFeedback
    );
}

function openFeedbackModal(type) {
  if (!product) return;

  ensureFeedbackModal();

  const overlay =
    $("#feedbackDynamicOverlay");

  const isReview =
    type === "review";

  $("#feedbackDynamicType").value =
    type;

  $("#feedbackDynamicTitle").textContent =
    isReview
      ? "Залишити відгук"
      : "Поставити питання";

  $("#feedbackDynamicProduct").textContent =
    product.name;

  $("#feedbackDynamicRatingField").hidden =
    !isReview;

  $("#feedbackDynamicRating").required =
    isReview;

  $("#feedbackDynamicTextLabel").textContent =
    isReview
      ? "Ваш відгук"
      : "Ваше запитання";

  $("#feedbackDynamicText").placeholder =
    isReview
      ? "Напишіть кілька слів про товар..."
      : "Що ви хочете уточнити?";

  $("#feedbackDynamicName").value =
    "";

  $("#feedbackDynamicRating").value =
    "";

  $("#feedbackDynamicText").value =
    "";

  $("#feedbackDynamicStatus").textContent =
    "";

  $("#feedbackDynamicStatus").className =
    "feedback-dynamic-status";

  $("#feedbackDynamicSubmit").disabled =
    false;

  $("#feedbackDynamicSubmit").textContent =
    isReview
      ? "Надіслати відгук"
      : "Надіслати питання";

  overlay.classList.add(
    "is-open"
  );

  document.body.style.overflow =
    "hidden";

  setTimeout(
    () =>
      $("#feedbackDynamicName")
        ?.focus(),
    100
  );
}

function closeFeedbackModal() {
  const overlay =
    $("#feedbackDynamicOverlay");

  if (!overlay) return;

  overlay.classList.remove(
    "is-open"
  );

  document.body.style.overflow =
    "";
}

async function sendFeedbackPayload(
  payload
) {
  const body =
    new URLSearchParams();

  body.set(
    "payload",
    JSON.stringify(payload)
  );

  const response =
    await fetch(
      STORE_API_URL,
      {
        method: "POST",
        body,
        redirect: "follow"
      }
    );

  if (!response.ok) {
    throw new Error(
      `Сервер відповів ${response.status}`
    );
  }

  const result =
    await response.json();

  if (!result?.success) {
    throw new Error(
      result?.error ||
        "Не вдалося передати повідомлення."
    );
  }

  return result;
}

async function submitFeedback(
  event
) {
  event.preventDefault();

  const type =
    $("#feedbackDynamicType")
      ?.value || "";

  const name =
    $("#feedbackDynamicName")
      ?.value.trim() || "";

  const rating =
    $("#feedbackDynamicRating")
      ?.value || "";

  const text =
    $("#feedbackDynamicText")
      ?.value.trim() || "";

  const status =
    $("#feedbackDynamicStatus");

  const button =
    $("#feedbackDynamicSubmit");

  if (name.length < 2) {
    status.textContent =
      "Вкажіть, будь ласка, ваше ім’я.";

    status.className =
      "feedback-dynamic-status is-error";

    return;
  }

  if (
    type === "review" &&
    !rating
  ) {
    status.textContent =
      "Оберіть оцінку.";

    status.className =
      "feedback-dynamic-status is-error";

    return;
  }

  if (text.length < 5) {
    status.textContent =
      type === "review"
        ? "Напишіть кілька слів про враження."
        : "Напишіть ваше запитання.";

    status.className =
      "feedback-dynamic-status is-error";

    return;
  }

  button.disabled =
    true;

  button.textContent =
    "Надсилаємо...";

  status.className =
    "feedback-dynamic-status";

  status.textContent =
    "Передаємо повідомлення...";

  const payload = {
    action: "feedback",
    feedbackType: type,
    name,
    rating:
      type === "review"
        ? Number(rating)
        : "",
    text,
    contact: "",
    productCode:
      product.code,
    productName:
      product.name,
    website: ""
  };

  try {
    const result =
      await sendFeedbackPayload(
        payload
      );

    status.className =
      "feedback-dynamic-status is-success";

    status.textContent =
      result.message ||
      (
        type === "review"
          ? "Дякуємо! Відгук надіслано на модерацію."
          : "Дякуємо! Запитання вже у нас."
      );

    button.textContent =
      "Надіслано";

    setTimeout(
      closeFeedbackModal,
      1800
    );
  } catch (error) {
    console.error(error);

    status.className =
      "feedback-dynamic-status is-error";

    status.textContent =
      error.message ||
      "Не вдалося передати повідомлення.";

    button.disabled =
      false;

    button.textContent =
      type === "review"
        ? "Надіслати відгук"
        : "Надіслати питання";
  }
}


/* ==========================================================
   20. ПОДІЇ
   ========================================================== */

elements.productThumbnails?.addEventListener(
  "click",
  event => {
    const button =
      event.target.closest(
        "[data-photo-index]"
      );

    if (!button) return;

    changePhoto(
      safeNumber(
        button.dataset.photoIndex,
        0
      )
    );
  }
);

elements.variantButtons?.addEventListener(
  "click",
  event => {
    const button =
      event.target.closest(
        "[data-variant]"
      );

    if (!button) return;

    selectedVariantValue =
      button.dataset.variant ||
      "";

    renderVariants();
    renderPrice();
    updateAddButtons();
  }
);

elements.sauceButtons?.addEventListener(
  "click",
  event => {
    const button =
      event.target.closest(
        "[data-sauce]"
      );

    if (!button) return;

    const slot =
      safeNumber(
        button.dataset.sauceSlot,
        0
      );

    selectedSauces[slot] =
      button.dataset.sauce ||
      "";

    renderSauces();
    updateAddButtons();
  }
);

elements.decreaseQuantity?.addEventListener(
  "click",
  () => {
    quantity =
      Math.max(
        1,
        quantity - 1
      );

    renderQuantity();
    updateAddButtons();
  }
);

elements.increaseQuantity?.addEventListener(
  "click",
  () => {
    quantity += 1;

    renderQuantity();
    updateAddButtons();
  }
);

elements.addProductToCart?.addEventListener(
  "click",
  addCurrentProductToCart
);

elements.mobileAddProduct?.addEventListener(
  "click",
  addCurrentProductToCart
);

elements.cartButton?.addEventListener(
  "click",
  openCart
);

elements.closeCartButton?.addEventListener(
  "click",
  closeCart
);

elements.cartOverlay?.addEventListener(
  "click",
  closeCart
);

elements.continueShoppingButton?.addEventListener(
  "click",
  closeCart
);

elements.cartItems?.addEventListener(
  "click",
  event => {
    const step =
      event.target.closest(
        "[data-cart-change]"
      );

    if (step) {
      changeCartQuantity(
        step.dataset.cartItem,
        safeNumber(
          step.dataset.cartChange,
          0
        )
      );

      return;
    }

    const remove =
      event.target.closest(
        "[data-cart-remove]"
      );

    if (remove) {
      removeCartItem(
        remove.dataset.cartRemove
      );
    }
  }
);

elements.relatedProducts?.addEventListener(
  "click",
  event => {
    const add =
      event.target.closest(
        "[data-related-add]"
      );

    if (!add) return;

    addSimpleRelatedProduct(
      add.dataset.relatedAdd
    );
  }
);

elements.mobileMenuButton?.addEventListener(
  "click",
  openMobileMenu
);

elements.closeMobileMenu?.addEventListener(
  "click",
  closeMobileMenu
);

elements.mobileMenuOverlay?.addEventListener(
  "click",
  closeMobileMenu
);

elements.leaveReviewButton?.addEventListener(
  "click",
  () =>
    openFeedbackModal(
      "review"
    )
);

elements.askQuestionButton?.addEventListener(
  "click",
  () =>
    openFeedbackModal(
      "question"
    )
);

elements.checkoutButton?.addEventListener(
  "click",
  event => {
    if (!cart.length) {
      event.preventDefault();
      return;
    }

    trackGa4Event(
      "begin_checkout",
      {
        currency: "UAH",
        value: cartTotal(),
        items:
          cart.map(item => {
            const itemProduct =
              findProduct(
                item.code
              );

            return {
              item_id:
                item.code,
              item_name:
                item.name ||
                itemProduct?.name ||
                item.code,
              item_category:
                findCategory(
                  itemProduct?.categoryCode
                )?.name || "",
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


/* ==========================================================
   21. СВАЙП ФОТО НА ТЕЛЕФОНІ
   ========================================================== */

let touchStartX = null;

elements.mainImageButton?.addEventListener(
  "touchstart",
  event => {
    touchStartX =
      event.touches?.[0]
        ?.clientX ?? null;
  },
  {
    passive: true
  }
);

elements.mainImageButton?.addEventListener(
  "touchend",
  event => {
    if (
      touchStartX === null
    ) {
      return;
    }

    const endX =
      event.changedTouches?.[0]
        ?.clientX;

    if (
      typeof endX !== "number"
    ) {
      touchStartX = null;
      return;
    }

    const distance =
      endX - touchStartX;

    touchStartX = null;

    if (
      Math.abs(distance) <
      45
    ) {
      return;
    }

    if (distance < 0) {
      changePhoto(
        selectedPhotoIndex + 1
      );
    } else {
      changePhoto(
        selectedPhotoIndex - 1
      );
    }
  },
  {
    passive: true
  }
);


/* ==========================================================
   22. КЛАВІАТУРА
   ========================================================== */

document.addEventListener(
  "keydown",
  event => {
    if (event.key !== "Escape") {
      return;
    }

    closeMobileMenu();
    closeCart();
    closeFeedbackModal();
  }
);


/* ==========================================================
   23. СИНХРОНІЗАЦІЯ КОШИКА МІЖ ВКЛАДКАМИ
   ========================================================== */

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


/* ==========================================================
   24. СТАРТ
   ========================================================== */

renderCart();

setTimeout(
  hideLoader,
  1200
);

loadStore();
