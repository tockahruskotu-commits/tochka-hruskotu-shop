const STORE_API_URL =
  "https://script.google.com/macros/s/AKfycbzCgvAMAmqrsK-KsGcPMfx60kvQbZVJII91WVZKIn-KF7bFIA3HKdKe0JmaBu4RZtX31Q/exec";

const CART_STORAGE_KEY = "tochka_hruskotu_cart_v2";
const REQUEST_ID_STORAGE_KEY = "tochka_hruskotu_request_id_v2";

let store = null;
let cart = loadCart();
let selectedProduct = null;
let selectedPhotoIndex = 0;
let isSubmittingOrder = false;
let returnToCheckoutAfterTerms = false;

const $ = selector => document.querySelector(selector);

const elements = {
  pageLoader: $("#pageLoader"),
  headerLogo: $("#headerLogo"),
  footerLogo: $("#footerLogo"),
  headerStoreName: $("#headerStoreName"),
  footerStoreName: $("#footerStoreName"),
  heroTitle: $("#heroTitle"),
  heroImage: $("#heroImage"),
  categoryGrid: $("#categoryGrid"),
  catalogueSections: $("#catalogueSections"),
  catalogueIntro: $("#catalogueIntro"),
  storeError: $("#storeError"),
  deliverySummary: $("#deliverySummary"),
  deliveryList: $("#deliveryList"),
  paymentList: $("#paymentList"),
  googleReviewLink: $("#googleReviewLink"),
  googleProfileLink: $("#googleProfileLink"),
  socialLinks: $("#socialLinks"),
  footerPhone: $("#footerPhone"),

  cartButton: $("#cartButton"),
  cartCount: $("#cartCount"),
  cartOverlay: $("#cartOverlay"),
  cartPanel: $("#cartPanel"),
  closeCartButton: $("#closeCartButton"),
  cartItems: $("#cartItems"),
  cartTotal: $("#cartTotal"),
  checkoutButton: $("#checkoutButton"),

  productOverlay: $("#productOverlay"),
  productModal: $("#productModal"),
  closeProductButton: $("#closeProductButton"),
  productModalContent: $("#productModalContent"),

  checkoutOverlay: $("#checkoutOverlay"),
  checkoutModal: $("#checkoutModal"),
  closeCheckoutButton: $("#closeCheckoutButton"),
  checkoutForm: $("#checkoutForm"),
  checkoutSummaryTotal: $("#checkoutSummaryTotal"),
  deliveryMethod: $("#deliveryMethod"),
  deliveryBranch: $("#deliveryBranch"),
  deliveryBranchLabel: $("#deliveryBranchLabel"),
  deliveryNote: $("#deliveryNote"),
  paymentMethod: $("#paymentMethod"),
  paymentNote: $("#paymentNote"),
  orderStatus: $("#orderStatus"),
  submitOrderButton: $("#submitOrderButton"),

  termsOverlay: $("#termsOverlay"),
  termsModal: $("#termsModal"),
  closeTermsButton: $("#closeTermsButton"),
  termsContent: $("#termsContent"),
  termsTitle: $("#termsTitle"),
  openTermsButton: $("#openTermsButton"),
  footerTermsButton: $("#footerTermsButton"),
  checkoutTermsButton: $("#checkoutTermsButton")
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(value) {
  const currency = store?.settings?.currency || "грн";
  return new Intl.NumberFormat("uk-UA", {
    maximumFractionDigits: 2
  }).format(Number(value) || 0) + " " + currency;
}

function formatDateUk(value) {
  if (!value) return "";
  const date = new Date(value + "T00:00:00");
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function categoryAnchor(code) {
  return "category-" + String(code).toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Помилка читання кошика:", error);
    return [];
  }
}

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

async function loadStore() {
  try {
    const response = await fetch(`${STORE_API_URL}?action=store`, {
      method: "GET",
      redirect: "follow",
      cache: "no-store"
    });

    const text = await response.text();
    let result;

    try {
      result = JSON.parse(text);
    } catch {
      throw new Error("Сервер повернув некоректну відповідь.");
    }

    if (!result.success) {
      throw new Error(result.error || "Не вдалося завантажити магазин.");
    }

    store = result;
    applySettings();
    renderCategories();
    renderCatalogue();
    renderDeliveryAndPayment();
    renderTerms();
    renderCart();
  } catch (error) {
    console.error(error);
    elements.storeError.hidden = false;
    elements.catalogueSections.innerHTML = "";
  } finally {
    elements.pageLoader.classList.add("is-hidden");
  }
}

function applySettings() {
  const settings = store.settings || {};

  document.title = `${settings.storeName || "Точка Хрускоту"} — онлайн-магазин`;

  elements.headerStoreName.textContent = settings.storeName || "Точка Хрускоту";
  elements.footerStoreName.textContent = settings.storeName || "Точка Хрускоту";
  elements.heroTitle.textContent = "Знайди свою точку хрускоту";

  if (settings.logo) {
    elements.headerLogo.src = settings.logo;
    elements.footerLogo.src = settings.logo;
  }

  if (settings.heroImage) {
    elements.heroImage.src = settings.heroImage;
  }

  if (settings.googleReview) {
    elements.googleReviewLink.href = settings.googleReview;
  }

  if (settings.googleProfile) {
    elements.googleProfileLink.href = settings.googleProfile;
  }

  if (settings.phone) {
    const normalized = settings.phone.startsWith("+")
      ? settings.phone
      : `+${settings.phone}`;

    elements.footerPhone.href = `tel:${normalized.replace(/[^\d+]/g, "")}`;
    elements.footerPhone.textContent = normalized;
  }

  elements.deliverySummary.textContent =
    `Доставка по Україні. Термін виготовлення — до ${
      settings.productionDays || 3
    } робочих днів. Якщо продукція є в наявності, відправимо раніше.`;

  const socialItems = [
    ["Telegram", settings.telegram],
    ["Instagram", settings.instagram],
    ["Facebook", settings.facebook],
    ["TikTok", settings.tiktok],
    ["YouTube", settings.youtube]
  ].filter(([, url]) => Boolean(url));

  elements.socialLinks.innerHTML = socialItems
    .map(([name, url]) => `
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
        ${escapeHtml(name)}
      </a>
    `)
    .join("");
}

function getRealCategories() {
  return (store.categories || []).filter(
    category => !["ALL", "NEW", "SALE"].includes(category.code)
  );
}

function productsForCategory(code) {
  const products = store.products || [];

  if (code === "ALL") return products;
  if (code === "NEW") return products.filter(product => product.isNew);
  if (code === "SALE") return products.filter(product => product.saleActive);

  return products.filter(product => product.categoryCode === code);
}

function renderCategories() {
  elements.categoryGrid.innerHTML = (store.categories || [])
    .map(category => {
      const count = productsForCategory(category.code).length;
      const image = category.cover
        ? `<img src="${escapeHtml(category.cover)}" alt="${escapeHtml(category.name)}" loading="lazy">`
        : "";

      return `
        <button
          class="category-card ${category.cover ? "" : "no-image"}"
          type="button"
          data-category-jump="${escapeHtml(category.code)}"
        >
          ${image}
          <span class="category-card-copy">
            <strong>${escapeHtml(category.name)}</strong>
            <span>${count ? `${count} позицій` : "Незабаром"}</span>
          </span>
        </button>
      `;
    })
    .join("");
}

function renderCatalogue() {
  const categories = store.categories || [];

  const sections = categories
    .filter(category => category.code !== "ALL")
    .map(category => {
      const products = productsForCategory(category.code);

      const productMarkup = products.length
        ? `<div class="product-grid">${products.map(renderProductCard).join("")}</div>`
        : `<div class="empty-category">У цій категорії скоро з’являться нові позиції.</div>`;

      return `
        <section
          class="category-section"
          id="${categoryAnchor(category.code)}"
          data-category-section="${escapeHtml(category.code)}"
        >
          <header class="category-section-header">
            <div>
              <h3>${escapeHtml(category.name)}</h3>
              <p>${escapeHtml(category.description || "")}</p>
            </div>
            <button type="button" data-scroll-all>Дивитися весь асортимент</button>
          </header>
          ${productMarkup}
        </section>
      `;
    })
    .join("");

  elements.catalogueSections.innerHTML = sections;
}

function renderProductCard(product) {
  const firstPhoto = product.photos?.[0] || "images/hero/main-cover.webp";
  const category = (store.categories || []).find(
    item => item.code === product.categoryCode
  );

  const badges = [
    product.saleActive ? `<span class="badge badge-sale">Акція</span>` : "",
    product.isNew ? `<span class="badge badge-new">Новинка</span>` : "",
    product.badge ? `<span class="badge">${escapeHtml(product.badge)}</span>` : ""
  ].join("");

  const price = product.saleActive
    ? `
      <span class="price-current price-sale">${formatMoney(product.effectivePrice)}</span>
      <span class="price-old">${formatMoney(product.regularPrice)}</span>
      <span class="sale-until">Акція до ${escapeHtml(formatDateUk(product.saleUntil))}</span>
    `
    : `<span class="price-current">${formatMoney(product.effectivePrice)}</span>`;

  return `
    <article class="product-card">
      <button
        class="product-image-button"
        type="button"
        data-open-product="${escapeHtml(product.code)}"
        aria-label="Переглянути ${escapeHtml(product.name)}"
      >
        <span class="product-badges">${badges}</span>
        <img src="${escapeHtml(firstPhoto)}" alt="${escapeHtml(product.name)}" loading="lazy">
      </button>

      <div class="product-content">
        <p class="product-category">${escapeHtml(category?.name || "")}</p>
        <h4 class="product-title">${escapeHtml(product.name)}</h4>
        <p class="product-description">${escapeHtml(product.shortDescription || "")}</p>
        <p class="product-weight">${escapeHtml(product.weight || "")}</p>

        <div class="price-row">${price}</div>

        <div class="product-actions">
          <button
            class="details-button"
            type="button"
            data-open-product="${escapeHtml(product.code)}"
          >
            Детальніше
          </button>
          <button
            class="quick-add-button"
            type="button"
            data-quick-add="${escapeHtml(product.code)}"
            ${product.available ? "" : "disabled"}
          >
            ${product.available ? "До кошика" : "Немає в наявності"}
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderDeliveryAndPayment() {
  const deliveryMethods = store.deliveryMethods || [];
  const paymentMethods = store.paymentMethods || [];

  elements.deliveryList.innerHTML = deliveryMethods
    .map(method => `
      <div class="info-option">
        <strong>${escapeHtml(method.name)}</strong>
        <span>${escapeHtml(method.note || "")}</span>
      </div>
    `)
    .join("");

  elements.paymentList.innerHTML = paymentMethods
    .map(method => `
      <div class="info-option">
        <strong>${escapeHtml(method.name)}</strong>
        <span>${escapeHtml(method.note || "")}</span>
      </div>
    `)
    .join("");

  elements.deliveryMethod.innerHTML = deliveryMethods
    .map(method => `
      <option value="${escapeHtml(method.code)}">${escapeHtml(method.name)}</option>
    `)
    .join("");

  elements.paymentMethod.innerHTML =
    `<option value="">Оберіть спосіб оплати</option>` +
    paymentMethods
      .map(method => `
        <option value="${escapeHtml(method.code)}">${escapeHtml(method.name)}</option>
      `)
      .join("");

  updateDeliveryFields();
  updatePaymentNote();
}

function renderTerms() {
  const terms = store.terms || {};
  elements.termsTitle.textContent = terms.title || "Умови замовлення і доставки";

  const items = [
    ["Термін виготовлення", terms.productionTime],
    ["Доставка", terms.delivery],
    ["Оплата", terms.payment],
    ["Вартість доставки", terms.deliveryCost],
    ["Неотримана посилка", terms.unclaimedParcel],
    ["Повернення", terms.returns],
    ["Проблема із замовленням", terms.orderProblem]
  ].filter(([, value]) => Boolean(value));

  elements.termsContent.innerHTML = items
    .map(([title, value]) => `
      <article class="term-item">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(value)}</p>
      </article>
    `)
    .join("");
}

function findProduct(code) {
  return (store.products || []).find(product => product.code === code);
}

function openProduct(code) {
  const product = findProduct(code);
  if (!product) return;

  selectedProduct = product;
  selectedPhotoIndex = 0;
  renderProductModal();

  openModal(elements.productModal, elements.productOverlay);
}

function renderProductModal() {
  if (!selectedProduct) return;

  const product = selectedProduct;
  const photos = product.photos?.length
    ? product.photos
    : ["images/hero/main-cover.webp"];

  const price = product.saleActive
    ? `
      <span class="price-current price-sale">${formatMoney(product.effectivePrice)}</span>
      <span class="price-old">${formatMoney(product.regularPrice)}</span>
      <span class="sale-until">Акція до ${escapeHtml(formatDateUk(product.saleUntil))}</span>
    `
    : `<span class="price-current">${formatMoney(product.effectivePrice)}</span>`;

  const thumbs = photos
    .map((photo, index) => `
      <button
        class="thumbnail-button ${index === selectedPhotoIndex ? "is-active" : ""}"
        type="button"
        data-photo-index="${index}"
      >
        <img src="${escapeHtml(photo)}" alt="" loading="lazy">
      </button>
    `)
    .join("");

  const sauceFields = product.sauceCount > 0
    ? `
      <div class="sauce-fields">
        ${Array.from({ length: product.sauceCount }, (_, index) => `
          <div class="sauce-field">
            <label for="modalSauce${index}">
              ${product.sauceCount > 1 ? `Соус ${index + 1}` : "Оберіть соус"}
            </label>
            <select id="modalSauce${index}" data-modal-sauce>
              ${product.sauces.map(sauce => `
                <option value="${escapeHtml(sauce)}">${escapeHtml(sauce)}</option>
              `).join("")}
            </select>
          </div>
        `).join("")}
      </div>
    `
    : "";

  elements.productModalContent.innerHTML = `
    <div class="product-detail-grid">
      <div>
        <img
          class="product-main-image"
          id="productMainImage"
          src="${escapeHtml(photos[selectedPhotoIndex])}"
          alt="${escapeHtml(product.name)}"
        >
        <div class="thumbnail-row">${thumbs}</div>
      </div>

      <div class="product-detail-content">
        <p class="product-category">${escapeHtml(product.categoryCode)}</p>
        <h2 id="productModalTitle">${escapeHtml(product.name)}</h2>
        <p class="product-full-description">
          ${escapeHtml(product.fullDescription || product.shortDescription || "")}
        </p>
        <p class="product-weight">${escapeHtml(product.weight || "")}</p>
        <div class="price-row">${price}</div>

        <div class="detail-info">
          ${product.ingredients ? `<p><strong>Склад:</strong> ${escapeHtml(product.ingredients)}</p>` : ""}
          ${product.allergens ? `<p><strong>Алергени:</strong> ${escapeHtml(product.allergens)}</p>` : ""}
        </div>

        ${sauceFields}

        <button
          class="modal-add-button"
          type="button"
          data-modal-add="${escapeHtml(product.code)}"
          ${product.available ? "" : "disabled"}
        >
          ${product.available ? "Додати до кошика" : "Тимчасово недоступний"}
        </button>
      </div>
    </div>
  `;
}

function collectModalSauces() {
  return [...elements.productModalContent.querySelectorAll("[data-modal-sauce]")]
    .map(select => select.value)
    .filter(Boolean);
}

function quickAdd(code) {
  const product = findProduct(code);
  if (!product || !product.available) return;

  if (product.sauceCount > 0) {
    openProduct(code);
    return;
  }

  addToCart(product, []);
}

function addToCart(product, sauces) {
  const normalizedSauces = [...sauces];
  const cartItemId = `${product.code}__${normalizedSauces.join("|")}`;

  const existing = cart.find(item => item.cartItemId === cartItemId);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      cartItemId,
      code: product.code,
      name: product.name,
      price: product.effectivePrice,
      sauces: normalizedSauces,
      quantity: 1
    });
  }

  saveCart();
  renderCart();
  closeProduct();
  openCart();
}

function calculateCartCount() {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function calculateCartTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function renderCart() {
  elements.cartCount.textContent = calculateCartCount();

  if (!cart.length) {
    elements.cartItems.innerHTML = `
      <div class="empty-cart">
        Кошик поки порожній. Оберіть свій смак у каталозі.
      </div>
    `;
    elements.cartTotal.textContent = formatMoney(0);
    elements.checkoutButton.disabled = true;
    return;
  }

  elements.cartItems.innerHTML = cart
    .map(item => `
      <article class="cart-item">
        <p class="cart-item-title">${escapeHtml(item.name)}</p>
        ${item.sauces.length
          ? `<p class="cart-item-sauces">Соус: ${item.sauces.map(escapeHtml).join(", ")}</p>`
          : ""
        }

        <div class="cart-item-bottom">
          <div class="quantity-control">
            <button
              class="quantity-button"
              type="button"
              data-cart-change="-1"
              data-cart-item="${escapeHtml(item.cartItemId)}"
            >−</button>
            <span class="quantity-value">${item.quantity}</span>
            <button
              class="quantity-button"
              type="button"
              data-cart-change="1"
              data-cart-item="${escapeHtml(item.cartItemId)}"
            >+</button>
          </div>
          <strong class="cart-item-price">
            ${formatMoney(item.price * item.quantity)}
          </strong>
        </div>

        <button
          class="remove-button"
          type="button"
          data-cart-remove="${escapeHtml(item.cartItemId)}"
        >
          Видалити
        </button>
      </article>
    `)
    .join("");

  elements.cartTotal.textContent = formatMoney(calculateCartTotal());
  elements.checkoutButton.disabled = false;
}

function changeCartQuantity(cartItemId, change) {
  const item = cart.find(entry => entry.cartItemId === cartItemId);
  if (!item) return;

  item.quantity += change;

  if (item.quantity <= 0) {
    cart = cart.filter(entry => entry.cartItemId !== cartItemId);
  }

  saveCart();
  renderCart();
}

function removeCartItem(cartItemId) {
  cart = cart.filter(entry => entry.cartItemId !== cartItemId);
  saveCart();
  renderCart();
}

function openCart() {
  elements.cartOverlay.classList.add("is-open");
  elements.cartPanel.classList.add("is-open");
  elements.cartPanel.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
}

function closeCart() {
  elements.cartOverlay.classList.remove("is-open");
  elements.cartPanel.classList.remove("is-open");
  elements.cartPanel.setAttribute("aria-hidden", "true");
  unlockBodyIfNoModal();
}

function openModal(modal, overlay) {
  overlay.classList.add("is-open");
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
}

function closeModal(modal, overlay) {
  overlay.classList.remove("is-open");
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  unlockBodyIfNoModal();
}

function unlockBodyIfNoModal() {
  const open = document.querySelector(
    ".cart-panel.is-open, .modal.is-open, .overlay.is-open, .modal-overlay.is-open"
  );

  if (!open) {
    document.body.classList.remove("no-scroll");
  }
}

function closeProduct() {
  selectedProduct = null;
  closeModal(elements.productModal, elements.productOverlay);
}

function openCheckout() {
  if (!cart.length) return;

  closeCart();
  clearOrderStatus();
  elements.checkoutSummaryTotal.textContent = formatMoney(calculateCartTotal());
  elements.submitOrderButton.disabled = false;
  elements.submitOrderButton.textContent = "Підтвердити замовлення";
  openModal(elements.checkoutModal, elements.checkoutOverlay);
}

function closeCheckout() {
  if (isSubmittingOrder) return;
  closeModal(elements.checkoutModal, elements.checkoutOverlay);
}

function openTerms(fromCheckout = false) {
  returnToCheckoutAfterTerms = fromCheckout;

  if (fromCheckout) {
    closeModal(elements.checkoutModal, elements.checkoutOverlay);
  }

  openModal(elements.termsModal, elements.termsOverlay);
}

function closeTerms() {
  closeModal(elements.termsModal, elements.termsOverlay);

  if (returnToCheckoutAfterTerms) {
    returnToCheckoutAfterTerms = false;
    openModal(elements.checkoutModal, elements.checkoutOverlay);
  }
}

function updateDeliveryFields() {
  const method = (store.deliveryMethods || []).find(
    item => item.code === elements.deliveryMethod.value
  );

  if (!method) return;

  elements.deliveryBranchLabel.textContent =
    `${method.branchLabel || "Відділення / поштомат"}${method.requireBranch ? " *" : ""}`;

  elements.deliveryBranch.placeholder = method.branchPlaceholder || "";
  elements.deliveryBranch.required = Boolean(method.requireBranch);
  elements.deliveryNote.textContent = method.note || "";

  $("#customerRegion").required = Boolean(method.requireRegion);
  $("#customerCity").required = Boolean(method.requireCity);
}

function updatePaymentNote() {
  const method = (store.paymentMethods || []).find(
    item => item.code === elements.paymentMethod.value
  );

  elements.paymentNote.textContent = method?.note || "";
}

function clearOrderStatus() {
  elements.orderStatus.className = "order-status";
  elements.orderStatus.textContent = "";
}

function showOrderStatus(type, message) {
  elements.orderStatus.className = `order-status is-${type}`;
  elements.orderStatus.textContent = message;
}

function createRequestId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `WEB-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function getRequestId() {
  let id = sessionStorage.getItem(REQUEST_ID_STORAGE_KEY);

  if (!id) {
    id = createRequestId();
    sessionStorage.setItem(REQUEST_ID_STORAGE_KEY, id);
  }

  return id;
}

function clearRequestId() {
  sessionStorage.removeItem(REQUEST_ID_STORAGE_KEY);
}

function createOrderPayload() {
  const formData = new FormData(elements.checkoutForm);

  return {
    requestId: getRequestId(),
    customer: {
      name: formData.get("customerName"),
      surname: formData.get("customerSurname"),
      phone: formData.get("customerPhone"),
      region: formData.get("customerRegion"),
      city: formData.get("customerCity")
    },
    delivery: {
      code: formData.get("deliveryMethod"),
      branch: formData.get("deliveryBranch")
    },
    paymentCode: formData.get("paymentMethod"),
    comment: formData.get("customerComment"),
    source: "GitHub Pages — Точка Хрускоту",
    items: cart.map(item => ({
      code: item.code,
      quantity: item.quantity,
      sauces: item.sauces
    }))
  };
}

async function submitOrder(event) {
  event.preventDefault();

  if (isSubmittingOrder) return;

  if (!cart.length) {
    showOrderStatus("error", "Кошик порожній.");
    return;
  }

  if (!elements.checkoutForm.checkValidity()) {
    elements.checkoutForm.reportValidity();
    showOrderStatus("error", "Заповніть усі обов’язкові поля.");
    return;
  }

  isSubmittingOrder = true;
  elements.submitOrderButton.disabled = true;
  elements.submitOrderButton.textContent = "Надсилаємо...";
  showOrderStatus("loading", "Передаємо замовлення. Не закривайте сторінку.");

  try {
    const body = new URLSearchParams();
    body.set("payload", JSON.stringify(createOrderPayload()));

    const response = await fetch(STORE_API_URL, {
      method: "POST",
      body,
      redirect: "follow"
    });

    const text = await response.text();
    let result;

    try {
      result = JSON.parse(text);
    } catch {
      throw new Error("Сервер повернув некоректну відповідь.");
    }

    if (!result.success) {
      throw new Error(result.error || "Не вдалося записати замовлення.");
    }

    showOrderStatus(
      "success",
      result.duplicate
        ? `Замовлення №${result.orderNumber} уже було записане.`
        : `Замовлення №${result.orderNumber} успішно прийнято. Ми зв’яжемося з вами для підтвердження.`
    );

    cart = [];
    saveCart();
    renderCart();
    elements.checkoutForm.reset();
    renderDeliveryAndPayment();
    clearRequestId();
    elements.checkoutSummaryTotal.textContent = formatMoney(0);
    elements.submitOrderButton.textContent = "Замовлення прийнято";
    elements.submitOrderButton.disabled = true;
  } catch (error) {
    console.error(error);
    showOrderStatus(
      "error",
      error.message || "Не вдалося передати замовлення. Спробуйте ще раз."
    );
    elements.submitOrderButton.disabled = false;
    elements.submitOrderButton.textContent = "Спробувати ще раз";
  } finally {
    isSubmittingOrder = false;
  }
}

elements.categoryGrid.addEventListener("click", event => {
  const button = event.target.closest("[data-category-jump]");
  if (!button) return;

  const code = button.dataset.categoryJump;

  if (code === "ALL") {
    document.querySelector("#catalogue").scrollIntoView({ behavior: "smooth" });
    return;
  }

  document
    .querySelector(`#${categoryAnchor(code)}`)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
});

elements.catalogueSections.addEventListener("click", event => {
  const openButton = event.target.closest("[data-open-product]");
  if (openButton) {
    openProduct(openButton.dataset.openProduct);
    return;
  }

  const quickButton = event.target.closest("[data-quick-add]");
  if (quickButton) {
    quickAdd(quickButton.dataset.quickAdd);
    return;
  }

  if (event.target.closest("[data-scroll-all]")) {
    document.querySelector("#catalogue").scrollIntoView({ behavior: "smooth" });
  }
});

elements.productModalContent.addEventListener("click", event => {
  const thumb = event.target.closest("[data-photo-index]");
  if (thumb && selectedProduct) {
    selectedPhotoIndex = Number(thumb.dataset.photoIndex) || 0;
    renderProductModal();
    return;
  }

  const addButton = event.target.closest("[data-modal-add]");
  if (addButton && selectedProduct) {
    const sauces = collectModalSauces();

    if (sauces.length !== selectedProduct.sauceCount) {
      alert(`Потрібно вибрати соусів: ${selectedProduct.sauceCount}.`);
      return;
    }

    addToCart(selectedProduct, sauces);
  }
});

elements.cartItems.addEventListener("click", event => {
  const changeButton = event.target.closest("[data-cart-change]");
  if (changeButton) {
    changeCartQuantity(
      changeButton.dataset.cartItem,
      Number(changeButton.dataset.cartChange)
    );
    return;
  }

  const removeButton = event.target.closest("[data-cart-remove]");
  if (removeButton) {
    removeCartItem(removeButton.dataset.cartRemove);
  }
});

elements.cartButton.addEventListener("click", openCart);
elements.closeCartButton.addEventListener("click", closeCart);
elements.cartOverlay.addEventListener("click", closeCart);
elements.checkoutButton.addEventListener("click", openCheckout);

elements.closeProductButton.addEventListener("click", closeProduct);
elements.productOverlay.addEventListener("click", closeProduct);

elements.closeCheckoutButton.addEventListener("click", closeCheckout);
elements.checkoutOverlay.addEventListener("click", closeCheckout);
elements.checkoutForm.addEventListener("submit", submitOrder);
elements.deliveryMethod.addEventListener("change", updateDeliveryFields);
elements.paymentMethod.addEventListener("change", updatePaymentNote);

elements.openTermsButton.addEventListener("click", () => openTerms(false));
elements.footerTermsButton.addEventListener("click", () => openTerms(false));
elements.checkoutTermsButton.addEventListener("click", () => openTerms(true));
elements.closeTermsButton.addEventListener("click", closeTerms);
elements.termsOverlay.addEventListener("click", closeTerms);

document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;

  closeCart();
  if (elements.productModal.classList.contains("is-open")) closeProduct();
  if (elements.checkoutModal.classList.contains("is-open")) closeCheckout();
  if (elements.termsModal.classList.contains("is-open")) closeTerms();
});

loadStore();
