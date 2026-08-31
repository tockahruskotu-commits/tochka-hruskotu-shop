const STORE_API_URL =
  "https://script.google.com/macros/s/AKfycbzCgvAMAmqrsK-KsGcPMfx60kvQbZVJII91WVZKIn-KF7bFIA3HKdKe0JmaBu4RZtX31Q/exec";

const CART_STORAGE_KEY = "tochka_hruskotu_cart_v4";
const CUSTOMER_STORAGE_KEY = "tochka_hruskotu_customer_v1";
const STORE_CACHE_KEY = "tochka_hruskotu_store_cache_v2";
const REQUEST_ID_STORAGE_KEY = "tochka_hruskotu_request_id_v3";
const STORE_REQUEST_TIMEOUT_MS = 12000;

let store = null;
let cart = loadJson(CART_STORAGE_KEY, []);
let activeFilter = "ALL";
let searchQuery = "";
let sortMode = "default";
let selectedProduct = null;
let selectedPhotoIndex = 0;
let selectedVariantValue = "";
let selectedSauces = [];
let modalQuantity = 1;
let isSubmittingOrder = false;
let isSubmittingReview = false;
let isSubmittingQuestion = false;
let toastTimer = null;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const els = {
  pageLoader: $("#pageLoader"),
  headerLogo: $("#headerLogo"),
  footerLogo: $("#footerLogo"),
  headerStoreName: $("#headerStoreName"),
  footerStoreName: $("#footerStoreName"),
  heroTitle: $("#heroTitle"),
  heroText: $("#heroText"),
  heroButton: $("#heroButton"),
  heroGiftButton: $("#heroGiftButton"),
  heroImage: $("#heroImage"),
  seasonalNote: $("#seasonalNote"),
  searchTitle: $("#searchTitle"),
  catalogSearch: $("#catalogSearch"),
  clearSearch: $("#clearSearch"),
  sortSelect: $("#sortSelect"),
  categoryFilters: $("#categoryFilters"),
  catalogueResultText: $("#catalogueResultText"),
  productGrid: $("#productGrid"),
  newProductGrid: $("#newProductGrid"),
  catalogueEmpty: $("#catalogueEmpty"),
  resetCatalogue: $("#resetCatalogue"),
  storeError: $("#storeError"),
  certificateGrid: $("#certificateGrid"),
  deliveryList: $("#deliveryList"),
  paymentList: $("#paymentList"),
  aboutTitle: $("#aboutTitle"),
  aboutText: $("#aboutText"),
  reviewGrid: $("#reviewGrid"),
  reviewsEmpty: $("#reviewsEmpty"),
  faqList: $("#faqList"),
  contactText: $("#contactText"),
  contactPhoneDirect: $("#contactPhoneDirect"),
  contactSocialDirect: $("#contactSocialDirect"),
  contactActions: $("#contactActions"),
  socialLinks: $("#socialLinks"),
  googleReviewLink: $("#googleReviewLink"),
  googleProfileLink: $("#googleProfileLink"),
  footerPhone: $("#footerPhone"),
  mobileMenuButton: $("#mobileMenuButton"),
  mobileMenu: $("#mobileMenu"),
  mobileMenuOverlay: $("#mobileMenuOverlay"),
  closeMobileMenu: $("#closeMobileMenu"),
  headerSearchButton: $("#headerSearchButton"),
  mobileSearchButton: $("#mobileSearchButton"),
  cartButton: $("#cartButton"),
  mobileCartButton: $("#mobileCartButton"),
  cartCount: $("#cartCount"),
  mobileCartCount: $("#mobileCartCount"),
  cartHeaderTotal: $("#cartHeaderTotal"),
  cartOverlay: $("#cartOverlay"),
  cartPanel: $("#cartPanel"),
  closeCartButton: $("#closeCartButton"),
  cartItems: $("#cartItems"),
  cartSuggestions: $("#cartSuggestions"),
  cartProgress: $("#cartProgress"),
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
  checkoutDeliveryProgress: $("#checkoutDeliveryProgress"),
  customerName: $("#customerName"),
  customerSurname: $("#customerSurname"),
  customerPhone: $("#customerPhone"),
  rememberCustomer: $("#rememberCustomer"),
  deliveryMethod: $("#deliveryMethod"),
  regionField: $("#regionField"),
  cityField: $("#cityField"),
  branchField: $("#branchField"),
  customerRegion: $("#customerRegion"),
  customerCity: $("#customerCity"),
  deliveryBranch: $("#deliveryBranch"),
  deliveryBranchLabel: $("#deliveryBranchLabel"),
  deliveryNote: $("#deliveryNote"),
  desiredDate: $("#desiredDate"),
  isGift: $("#isGift"),
  giftFields: $("#giftFields"),
  recipientName: $("#recipientName"),
  recipientPhone: $("#recipientPhone"),
  isSurprise: $("#isSurprise"),
  hidePrice: $("#hidePrice"),
  giftWrapping: $("#giftWrapping"),
  giftWrappingNote: $("#giftWrappingNote"),
  cardEnabled: $("#cardEnabled"),
  cardFields: $("#cardFields"),
  cardStyle: $("#cardStyle"),
  cardText: $("#cardText"),
  helpWithCardText: $("#helpWithCardText"),
  congratulationsTo: $("#congratulationsTo"),
  occasion: $("#occasion"),
  giftFrom: $("#giftFrom"),
  signatureMode: $("#signatureMode"),
  recipientHintField: $("#recipientHintField"),
  recipientHint: $("#recipientHint"),
  courageScenarioField: $("#courageScenarioField"),
  courageScenario: $("#courageScenario"),
  paymentMethod: $("#paymentMethod"),
  paymentNote: $("#paymentNote"),
  hasCertificate: $("#hasCertificate"),
  certificateCodeField: $("#certificateCodeField"),
  certificateCode: $("#certificateCode"),
  customerComment: $("#customerComment"),
  termsAccepted: $("#termsAccepted"),
  orderStatus: $("#orderStatus"),
  submitOrderButton: $("#submitOrderButton"),
  termsOverlay: $("#termsOverlay"),
  termsModal: $("#termsModal"),
  closeTermsButton: $("#closeTermsButton"),
  termsContent: $("#termsContent"),
  openTermsButton: $("#openTermsButton"),
  footerTermsButton: $("#footerTermsButton"),
  checkoutTermsButton: $("#checkoutTermsButton"),
  contactOverlay: $("#contactOverlay"),
  contactModal: $("#contactModal"),
  closeContactButton: $("#closeContactButton"),
  contactChoiceGrid: $("#contactChoiceGrid"),
  cardsOverlay: $("#cardsOverlay"),
  cardsModal: $("#cardsModal"),
  openCardsPreview: $("#openCardsPreview"),
  openCardsPreviewSecondary: $("#openCardsPreviewSecondary"),
  closeCardsPreview: $("#closeCardsPreview"),

  reviewOverlay: $("#reviewOverlay"),
  reviewModal: $("#reviewModal"),
  closeReviewButton: $("#closeReviewButton"),
  reviewForm: $("#reviewForm"),
  reviewProductCode: $("#reviewProductCode"),
  reviewProductName: $("#reviewProductName"),
  reviewProductNameInput: $("#reviewProductNameInput"),
  reviewName: $("#reviewName"),
  reviewRating: $("#reviewRating"),
  reviewText: $("#reviewText"),
  reviewStatus: $("#reviewStatus"),
  submitReviewButton: $("#submitReviewButton"),

  questionOverlay: $("#questionOverlay"),
  questionModal: $("#questionModal"),
  closeQuestionButton: $("#closeQuestionButton"),
  questionForm: $("#questionForm"),
  questionProductCode: $("#questionProductCode"),
  questionProductName: $("#questionProductName"),
  questionProductNameInput: $("#questionProductNameInput"),
  questionName: $("#questionName"),
  questionText: $("#questionText"),
  questionStatus: $("#questionStatus"),
  submitQuestionButton: $("#submitQuestionButton"),

  toast: $("#toast")
};

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Не вдалося прочитати ${key}`, error);
    return fallback;
  }
}

function saveJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (error) { console.warn(`Не вдалося зберегти ${key}`, error); }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) { return escapeHtml(value); }
function formatMoney(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 2 }).format(amount) + " грн";
}
function formatDateUk(value) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric" }).format(date);
}
function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[’']/g, "'").trim();
}
function safeUrl(url) {
  const value = String(url || "").trim();
  return /^(https?:|tel:|viber:)/i.test(value) ? value : "#";
}
function showToast(message) {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 2600);
}
function lockBodyIfNeeded() {
  const open = $$(".modal.is-open, .cart-panel.is-open, .mobile-menu.is-open").length > 0;
  document.body.classList.toggle("no-scroll", open);
}

function saveCart() { saveJson(CART_STORAGE_KEY, cart); }
function findProduct(code) { return (store?.products || []).find(p => p.code === code) || null; }
function findCategory(code) { return (store?.categories || []).find(c => c.code === code) || null; }
function getFreeDeliveryThreshold() { return Number(store?.settings?.freeDeliveryFrom || 2000); }
function cartCount() { return cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0); }
function cartTotal() { return cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0); }
function productMinPrice(product) {
  const variants = product?.variants || [];
  if (variants.length) return Math.min(...variants.map(v => Number(v.effectivePrice || 0)).filter(v => v > 0));
  return Number(product?.effectivePrice || 0);
}
function productRegularMinPrice(product) {
  const variants = product?.variants || [];
  if (variants.length) return Math.min(...variants.map(v => Number(v.regularPrice || 0)).filter(v => v > 0));
  return Number(product?.regularPrice || 0);
}
function productHasSale(product) {
  if (product?.saleActive) return true;
  return (product?.variants || []).some(v => v.saleActive && Number(v.salePrice || 0) > 0);
}
function productSaleUntil(product) {
  if (product?.saleActive && product.saleUntil) return product.saleUntil;
  return (product?.variants || []).find(v => v.saleActive && v.saleUntil)?.saleUntil || "";
}
function productPhotos(product) {
  const photos = (product?.photos || []).filter(Boolean);
  return photos.length ? photos : [store?.settings?.logo || "images/brand/logo.webp"];
}
function isCertificateFilter(code) { return code === "CERTIFICATES"; }

async function fetchStore() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STORE_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${STORE_API_URL}?action=store&_=${Date.now()}`, { method: "GET", redirect: "follow", signal: controller.signal });
    if (!response.ok) throw new Error(`Помилка сервера ${response.status}`);
    const result = await response.json();
    if (!result?.success) throw new Error(result?.error || "Не вдалося завантажити каталог.");
    return result;
  } finally { clearTimeout(timer); }
}

async function loadStore() {
  const cached = loadJson(STORE_CACHE_KEY, null);
  if (cached?.data?.success) {
    renderStore(cached.data);
    hideLoader();
  }
  try {
    const fresh = await fetchStore();
    saveJson(STORE_CACHE_KEY, { savedAt: Date.now(), data: fresh });
    renderStore(fresh);
  } catch (error) {
    console.error(error);
    if (!cached?.data?.success) {
      els.storeError.hidden = false;
      els.productGrid.innerHTML = "";
    }
  } finally { hideLoader(); }
}

function hideLoader() { els.pageLoader?.classList.add("is-hidden"); }

function renderStore(data) {
  store = data;
  els.storeError.hidden = true;
  applySettings();
  renderFilters();
  renderCatalogue();
  renderNewProducts();
  renderCertificates();
  renderDeliveryPayment();
  renderAbout();
  renderReviews();
  renderFaq();
  renderContacts();
  renderTerms();
  populateCheckoutOptions();
  renderCart();
}

function applySettings() {
  const s = store?.settings || {};
  document.title = `${s.storeName || "Точка Хрускоту"} — крафтові десерти та подарунки`;
  els.headerStoreName.textContent = s.storeName || "Точка Хрускоту";
  els.footerStoreName.textContent = s.storeName || "Точка Хрускоту";
  els.heroTitle.textContent = s.heroTitle || "Трохи хрускоту. Трохи дитинства. Багато тепла.";
  els.heroText.textContent = s.heroText || "Солодощі, які хочеться смакувати самим, ділити з близькими й дарувати тим, кого любиш.";
  els.heroButton.textContent = s.heroButton || "Обрати щось смачненьке";
  els.heroGiftButton.textContent = s.giftButton || "Знайти подарунок";
  els.searchTitle.textContent = s.searchTitle || "Що сьогодні хочеться похрумтіти?";
  els.catalogSearch.placeholder = s.searchPlaceholder || "Пошук: донати, карамель, подарунок, соус...";
  els.contactText.textContent = s.contactText || "«Точка Хрускоту» — м. Дубно, Рівненська область.";
  if (s.logo) { els.headerLogo.src = s.logo; els.footerLogo.src = s.logo; }
  if (s.googleReview) els.googleReviewLink.href = s.googleReview;
  if (s.googleProfile) els.googleProfileLink.href = s.googleProfile;
  if (s.phone) {
    els.footerPhone.href = `tel:${s.phone.replace(/[^\d+]/g, "")}`;
    els.footerPhone.textContent = s.phone;
  }
  const banner = (store?.banners || [])[0];
  if (banner?.text) {
    els.seasonalNote.hidden = false;
    els.seasonalNote.textContent = banner.text;
  } else {
    els.seasonalNote.hidden = true;
  }
}

function publicFilterCategories() {
  const categories = store?.categories || [];
  const wanted = categories.filter(c => c.active && c.code !== "CERTIFICATES");
  if (store?.settings?.features?.certificates !== false) {
    const cert = categories.find(c => c.code === "CERTIFICATES");
    if (cert) wanted.push(cert);
  }
  return wanted.sort((a,b) => Number(a.order || 9999) - Number(b.order || 9999));
}

function categoryIcon(category) {
  const key = `${category?.code || ""} ${category?.name || ""}`.toLowerCase();
  if (key.includes("donut") || key.includes("донат")) return "🍩";
  if (key.includes("waff") || key.includes("ваф")) return "🧇";
  if (key.includes("fries") || key.includes("фрі")) return "🍟";
  if (key.includes("nugget") || key.includes("нагет")) return "◉";
  if (key.includes("cupcake") || key.includes("кекс")) return "🧁";
  if (key.includes("pops") || key.includes("попс")) return "●";
  if (key.includes("burger") || key.includes("бургер")) return "🍔";
  if (key.includes("fortune") || key.includes("передбач")) return "☕";
  if (key.includes("gift") || key.includes("подар")) return "🎁";
  if (key.includes("sauce") || key.includes("соус")) return "🥄";
  if (key.includes("cert") || key.includes("сертиф")) return "🎟";
  if (key.includes("cookie") || key.includes("печив")) return "🍪";
  if (key.includes("all") || key.includes("усі") || key.includes("весь")) return "✦";
  return "♡";
}

function renderFilters() {
  els.categoryFilters.innerHTML = publicFilterCategories().map(category => `
    <button class="filter-chip ${category.code === activeFilter ? "is-active" : ""}" type="button" data-filter="${escapeAttr(category.code)}">
      <span class="filter-icon" aria-hidden="true">${categoryIcon(category)}</span>
      <strong>${escapeHtml(category.name)}</strong>
    </button>
  `).join("");
}

function filteredProducts() {
  let products = [...(store?.products || [])];
  if (activeFilter === "NEW") products = products.filter(p => p.isNew);
  else if (activeFilter === "SALE") products = products.filter(productHasSale);
  else if (!["ALL", "CERTIFICATES"].includes(activeFilter)) products = products.filter(p => p.categoryCode === activeFilter);
  else if (activeFilter === "CERTIFICATES") return [];

  if (searchQuery) {
    const q = normalizeText(searchQuery);
    products = products.filter(product => {
      const hay = [
        product.name, product.shortDescription, product.fullDescription, product.categoryCode,
        ...(product.searchKeywords || []), ...(product.sauces || []), ...(product.variants || []).map(v => v.value)
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  switch (sortMode) {
    case "price-asc": return products.sort((a,b) => productMinPrice(a) - productMinPrice(b));
    case "price-desc": return products.sort((a,b) => productMinPrice(b) - productMinPrice(a));
    case "name-asc": return products.sort((a,b) => a.name.localeCompare(b.name, "uk"));
    case "name-desc": return products.sort((a,b) => b.name.localeCompare(a.name, "uk"));
    case "newest": return products.sort((a,b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)) || Number(a.order||9999)-Number(b.order||9999));
    default: return products.sort((a,b) => Number(a.order||9999)-Number(b.order||9999));
  }
}

function productBadges(product) {
  const badges = [];
  if (product.isNew) badges.push(["Новинка", "new"]);
  if (product.isHit) badges.push(["Хіт", "hit"]);
  if (productHasSale(product)) badges.push(["Акція", "sale"]);
  // Значення "Подарунок" у старому полі Badge не показуємо, якщо реальна gift-акція вимкнена.
  const custom = String(product.badge || "").trim();
  if (custom && !["Новинка","Хіт","Акція","Подарунок"].includes(custom)) badges.push([custom, ""]);
  return badges.slice(0, 3);
}

function productPriceHtml(product) {
  const current = productMinPrice(product);
  const regular = productRegularMinPrice(product);
  const prefix = (product.variants || []).length ? '<span class="price-prefix">від</span>' : "";
  const hasSale = productHasSale(product) && regular > current;
  return `${prefix}<span class="price-current">${formatMoney(current)}</span>${hasSale ? `<span class="price-old">${formatMoney(regular)}</span>` : ""}`;
}

function productCardHtml(product) {
  const photos = productPhotos(product).slice(0, 3);
  const status = product.status || "Під замовлення";
  const production = product.productionTime || "1–3 робочі дні";
  return `
    <article class="product-card" data-product-card="${escapeAttr(product.code)}">
      <div class="product-media" data-card-gallery data-code="${escapeAttr(product.code)}" data-index="0">
        <button class="product-media-button" type="button" data-open-product="${escapeAttr(product.code)}" aria-label="Детальніше про ${escapeAttr(product.name)}">
          <img class="product-photo" src="${escapeAttr(photos[0])}" data-card-photo alt="${escapeAttr(product.name)}" loading="lazy" decoding="async">
        </button>
        <div class="badge-stack">${productBadges(product).map(([name, cls]) => `<span class="product-badge ${cls}">${escapeHtml(name)}</span>`).join("")}</div>
        ${photos.length > 1 ? `<div class="card-gallery-nav"><button type="button" data-card-prev aria-label="Попереднє фото">‹</button><button type="button" data-card-next aria-label="Наступне фото">›</button></div><div class="card-dots">${photos.map((_, i) => `<i class="${i===0?"active":""}"></i>`).join("")}</div>` : ""}
      </div>
      <div class="product-card-body">
        <h3>${escapeHtml(product.name)}</h3>
        <p class="product-short">${escapeHtml(product.shortDescription || "")}</p>
        <div class="product-meta">
          ${product.weight ? `<span>${escapeHtml(product.weight)}</span>` : ""}
          <span>${escapeHtml(status)}</span>
          <span>${escapeHtml(production)}</span>
        </div>
        <div class="price-row">${productPriceHtml(product)}</div>
        <div class="product-actions">
          <button class="add-cart-button" type="button" data-quick-add="${escapeAttr(product.code)}" ${product.available ? "" : "disabled"}>${product.available ? "У кошик" : "Недоступно"}</button>
          <button class="details-button" type="button" data-open-product="${escapeAttr(product.code)}">Деталі</button>
        </div>
      </div>
    </article>`;
}

function renderCatalogue() {
  renderFilters();
  const isCert = isCertificateFilter(activeFilter);
  const products = filteredProducts();
  els.productGrid.hidden = isCert;
  els.catalogueEmpty.hidden = true;
  document.querySelector("#certificates")?.classList.toggle("is-highlighted", isCert);

  if (isCert) {
    els.productGrid.innerHTML = "";
    els.catalogueResultText.textContent = "Подарункові сертифікати — нижче на сторінці.";
    document.querySelector("#certificates")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  els.productGrid.hidden = false;
  els.productGrid.innerHTML = products.map(productCardHtml).join("");
  const categoryName = findCategory(activeFilter)?.name || "Весь асортимент";
  els.catalogueResultText.textContent = `${categoryName}: ${products.length} ${plural(products.length, "позиція", "позиції", "позицій")}`;
  els.catalogueEmpty.hidden = products.length > 0;
}

function renderNewProducts() {
  if (!els.newProductGrid) return;
  const products = (store?.products || [])
    .filter(product => product.available && product.isNew)
    .sort((a,b) => Number(a.order || 9999) - Number(b.order || 9999))
    .slice(0, 4);
  els.newProductGrid.innerHTML = products.map(productCardHtml).join("");
  const section = document.querySelector("#new");
  if (section) section.hidden = products.length === 0;
}

function plural(n, one, few, many) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if ([2,3,4].includes(mod10) && ![12,13,14].includes(mod100)) return few;
  return many;
}

function renderCertificates() {
  const options = store?.certificateOptions || [];
  els.certificateGrid.innerHTML = options.map(item => `
    <article class="certificate-card">
      <span class="section-kicker">Точка Хрускоту</span>
      <strong>${item.amount ? formatMoney(item.amount) : "Інша сума"}</strong>
      <p>${escapeHtml(item.note || "Безстроковий; одноразове використання.")}</p>
      <button type="button" data-certificate-contact="${escapeAttr(item.name)}">Замовити</button>
    </article>`).join("");
}

function renderDeliveryPayment() {
  els.deliveryList.innerHTML = (store?.deliveryMethods || []).map(item => `
    <div class="stack-item"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.note || "")}${item.freeDeliveryFrom > 0 ? ` · безкоштовно від ${formatMoney(item.freeDeliveryFrom)}` : ""}</span></div>
  `).join("");
  els.paymentList.innerHTML = (store?.paymentMethods || []).map(item => `
    <div class="stack-item"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.note || "")}</span></div>
  `).join("");
}

function renderAbout() {
  const about = store?.about;
  if (!about?.active) return;
  els.aboutTitle.textContent = about.title || "Тут усе починається з турботи";
  els.aboutText.textContent = about.text || "";
}

function renderReviews() {
  const reviews = store?.reviews || [];
  els.reviewsEmpty.hidden = reviews.length > 0;
  els.reviewGrid.innerHTML = reviews.slice(0, 6).map(review => `
    <article class="review-card">
      <div class="review-card-head"><strong>${escapeHtml(review.name || "Покупець")}</strong>${review.rating ? `<span>${"★".repeat(Math.max(1, Math.min(5, Number(review.rating))))}</span>` : ""}</div>
      ${review.verifiedPurchase ? '<span class="verified-badge">Підтверджена покупка</span>' : ""}
      <p>${escapeHtml(review.text || "")}</p>
      ${review.reply ? `<small><strong>Точка Хрускоту:</strong> ${escapeHtml(review.reply)}</small>` : ""}
    </article>`).join("");
}

function renderFaq() {
  els.faqList.innerHTML = (store?.faq || []).map((item, i) => `
    <article class="faq-item ${i===0?"is-open":""}">
      <button class="faq-question" type="button"><span>${escapeHtml(item.question)}</span><span>+</span></button>
      <div class="faq-answer">${escapeHtml(item.answer)}</div>
    </article>`).join("");
}

function contactItems() {
  const s = store?.settings || {};
  const phone = s.phone ? `tel:${s.phone.replace(/[^\d+]/g, "")}` : "";
  return [
    ["Telegram", s.telegram],
    ["Viber", s.viber],
    ["Instagram", s.instagram],
    [s.phone ? `Телефон ${s.phone}` : "Зателефонувати", phone]
  ].filter(([,url]) => Boolean(url));
}

function socialDisplayValue(name, url) {
  const value = String(url || "").trim();
  if (!value) return "";
  try {
    const parsed = new URL(value);
    const path = decodeURIComponent(parsed.pathname || "").replace(/^\/+|\/+$/g, "");
    if (["Telegram", "Instagram", "TikTok"].includes(name) && path) {
      const handle = path.split("/").filter(Boolean).pop();
      return handle ? `@${handle.replace(/^@/, "")}` : value;
    }
    if (name === "YouTube" && path) return path.replace(/^@/, "@");
    if (name === "Facebook") return "Точка Хрускоту";
    return value;
  } catch (error) {
    return value;
  }
}

function renderContacts() {
  const items = contactItems();
  els.contactActions.innerHTML = items.map(([name,url]) => `<a class="contact-pill" href="${escapeAttr(safeUrl(url))}" ${String(url).startsWith("http") ? 'target="_blank" rel="noopener noreferrer"' : ""}>${escapeHtml(name)}</a>`).join("");
  els.contactChoiceGrid.innerHTML = items.map(([name,url]) => `<a class="contact-choice" href="${escapeAttr(safeUrl(url))}" ${String(url).startsWith("http") ? 'target="_blank" rel="noopener noreferrer"' : ""}>${escapeHtml(name)}</a>`).join("");

  const s = store?.settings || {};
  if (els.contactPhoneDirect && s.phone) {
    els.contactPhoneDirect.href = `tel:${s.phone.replace(/[^\d+]/g, "")}`;
    els.contactPhoneDirect.textContent = s.phone;
  }

  const socialRows = [
    ["Telegram", s.telegram],
    ["Instagram", s.instagram],
    ["Facebook", s.facebook],
    ["TikTok", s.tiktok],
    ["YouTube", s.youtube]
  ].filter(([,url]) => Boolean(url));

  if (els.contactSocialDirect) {
    els.contactSocialDirect.innerHTML = socialRows.map(([name,url]) => `
      <a class="contact-social-item" href="${escapeAttr(safeUrl(url))}" target="_blank" rel="noopener noreferrer">
        <strong>${escapeHtml(name)}</strong>
        <span>${escapeHtml(socialDisplayValue(name, url))}</span>
      </a>
    `).join("");
  }

  els.socialLinks.innerHTML = socialRows.map(([name,url])=>`<a href="${escapeAttr(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(name)}</a>`).join("");
}

function renderTerms() {
  const t = store?.terms || {};
  const entries = [
    ["Термін виготовлення", t.productionTime], ["Доставка", t.delivery], ["Оплата", t.payment],
    ["Вартість доставки", t.deliveryCost], ["Неотримана посилка", t.unclaimedParcel],
    ["Повернення", t.returns], ["Якщо є проблема із замовленням", t.orderProblem]
  ].filter(([,v]) => v);
  els.termsContent.innerHTML = entries.map(([k,v]) => `<article><h3>${escapeHtml(k)}</h3><p>${escapeHtml(v)}</p></article>`).join("");
}

function populateCheckoutOptions() {
  const deliveries = store?.deliveryMethods || [];
  els.deliveryMethod.innerHTML = `<option value="">Оберіть спосіб доставки</option>` + deliveries.map(i => `<option value="${escapeAttr(i.code)}">${escapeHtml(i.name)}</option>`).join("");
  const wrap = (store?.giftOptions || []).filter(i => i.type === "Пакування");
  els.giftWrapping.innerHTML = wrap.map(i => `<option value="${escapeAttr(i.name)}" data-note="${escapeAttr(i.description || "")}">${escapeHtml(i.name)}${i.priceType && i.priceType !== "Фіксована" ? ` — ${escapeHtml(i.priceType)}` : ""}</option>`).join("");
  const cards = store?.cardCategories || [];
  els.cardStyle.innerHTML = `<option value="">Оберіть стиль</option>` + cards.map(i => `<option value="${escapeAttr(i.name)}">${escapeHtml(i.name)}</option>`).join("");
  restoreCustomer();
  updateDeliveryFields();
  updateGiftWrappingNote();
}

function updatePaymentOptions() {
  const delivery = (store?.deliveryMethods || []).find(i => i.code === els.deliveryMethod.value);
  const isPickup = delivery?.code === "PICKUP";
  let allowed = (store?.paymentMethods || []).filter(p => isPickup ? p.forPickup : p.forPostalDelivery);

  if (isPickup && !allowed.some(p => p.code === "CASH_PICKUP")) {
    allowed = [
      {
        code: "CASH_PICKUP",
        name: "Готівкою при самовивозі",
        note: "Оплата готівкою під час отримання замовлення у м. Дубно."
      },
      ...allowed
    ];
  }

  els.paymentMethod.innerHTML = `<option value="">Оберіть спосіб оплати</option>` + allowed.map(i => `<option value="${escapeAttr(i.code)}" data-note="${escapeAttr(i.note || "")}">${escapeHtml(i.name)}</option>`).join("");
  updatePaymentNote();
}

function updateDeliveryFields() {
  const method = (store?.deliveryMethods || []).find(i => i.code === els.deliveryMethod.value) || null;
  const reqRegion = Boolean(method?.requireRegion);
  const reqCity = Boolean(method?.requireCity);
  const reqBranch = Boolean(method?.requireBranch);
  els.regionField.hidden = !reqRegion;
  els.cityField.hidden = !reqCity;
  els.branchField.hidden = !reqBranch;
  els.customerRegion.required = reqRegion;
  els.customerCity.required = reqCity;
  els.deliveryBranch.required = reqBranch;
  if (method) {
    els.deliveryBranchLabel.textContent = method.branchLabel + (reqBranch ? " *" : "");
    els.deliveryBranch.placeholder = method.branchPlaceholder || "";
    els.deliveryNote.textContent = method.note || "";
  }
  updatePaymentOptions();
}

function updatePaymentNote() {
  const option = els.paymentMethod.selectedOptions?.[0];
  els.paymentNote.textContent = option?.dataset?.note || "";
}
function updateGiftWrappingNote() {
  const option = els.giftWrapping.selectedOptions?.[0];
  els.giftWrappingNote.textContent = option?.dataset?.note || "";
}

function setFilter(code, scroll = true) {
  activeFilter = code || "ALL";
  renderCatalogue();
  if (scroll) document.querySelector("#catalogue")?.scrollIntoView({ behavior: "smooth", block: "start" });
  closeMobileMenu();
}

function cardGalleryStep(gallery, delta) {
  const product = findProduct(gallery.dataset.code);
  if (!product) return;
  const photos = productPhotos(product).slice(0,3);
  let index = Number(gallery.dataset.index || 0);
  index = (index + delta + photos.length) % photos.length;
  gallery.dataset.index = String(index);
  gallery.querySelector("[data-card-photo]").src = photos[index];
  [...gallery.querySelectorAll(".card-dots i")].forEach((dot,i) => dot.classList.toggle("active", i===index));
}

function quickAdd(code) {
  const product = findProduct(code);
  if (!product?.available) return;
  if ((product.variants || []).length || product.sauceCount > 0) return openProduct(code);
  addCartItem(product, null, [], 1);
}

function addCartItem(product, variant, sauces, quantity) {
  const variantValue = variant?.value || "";
  const price = Number(variant?.effectivePrice ?? product.effectivePrice ?? productMinPrice(product));
  const id = `${product.code}__${variantValue}__${sauces.join("|")}`;
  const existing = cart.find(i => i.cartItemId === id);
  if (existing) existing.quantity = Math.min(20, existing.quantity + quantity);
  else cart.push({ cartItemId:id, code:product.code, name:product.name, photo:productPhotos(product)[0], price, variantType:variant?.type||"", variantValue, sauces:[...sauces], quantity });
  saveCart();
  renderCart();
  closeProduct();
  showToast(store?.settings?.messages?.cartAdded || "Готово — ще трішки радості вже в кошику.");
}

function openProduct(code) {
  const product = findProduct(code);
  if (!product) return;
  selectedProduct = product;
  selectedPhotoIndex = 0;
  selectedVariantValue = product.variants?.[0]?.value || "";
  selectedSauces = Array.from({length: Number(product.sauceCount || 0)}, () => product.sauces?.[0] || "");
  modalQuantity = 1;
  renderProductModal();
  openModal(els.productModal, els.productOverlay);
}

function selectedVariant() {
  return selectedProduct?.variants?.find(v => v.value === selectedVariantValue) || null;
}

function renderProductModal() {
  const p = selectedProduct;
  if (!p) return;
  const photos = productPhotos(p);
  const variant = selectedVariant();
  const current = Number(variant?.effectivePrice ?? p.effectivePrice ?? productMinPrice(p));
  const regular = Number(variant?.regularPrice ?? p.regularPrice ?? productRegularMinPrice(p));
  const sale = Boolean(variant?.saleActive || p.saleActive) && regular > current;
  const related = (p.relatedProductCodes || []).map(findProduct).filter(Boolean).slice(0,3);
  const productReviews = (store?.reviews || []).filter(r => !r.productCode || r.productCode === p.code);
  const categoryName = findCategory(p.categoryCode)?.name || "";

  els.productModalContent.innerHTML = `
    <div class="product-modal-layout">
      <div class="product-gallery">
        <div class="product-gallery-main">
          <img id="modalMainImage" src="${escapeAttr(photos[selectedPhotoIndex])}" alt="${escapeAttr(p.name)}">
          ${photos.length > 1 ? `<button class="gallery-arrow prev" type="button" data-modal-photo-step="-1">‹</button><button class="gallery-arrow next" type="button" data-modal-photo-step="1">›</button>` : ""}
        </div>
        <div class="gallery-thumbs">${photos.map((photo,i)=>`<button class="gallery-thumb ${i===selectedPhotoIndex?"is-active":""}" type="button" data-modal-photo="${i}"><img src="${escapeAttr(photo)}" alt="" loading="lazy"></button>`).join("")}</div>
      </div>
      <div class="product-detail">
        <p class="section-kicker">${escapeHtml(categoryName)}</p>
        <h2 id="productModalTitle">${escapeHtml(p.name)}</h2>
        <p class="product-detail-copy">${escapeHtml(p.fullDescription || p.shortDescription || "")}</p>
        <div class="product-meta">${p.weight?`<span>${escapeHtml(p.weight)}</span>`:""}<span>${escapeHtml(p.status || "Під замовлення")}</span><span>${escapeHtml(p.productionTime || "1–3 робочі дні")}</span></div>
        <div class="price-row"><span class="price-current">${formatMoney(current)}</span>${sale?`<span class="price-old">${formatMoney(regular)}</span>`:""}${productSaleUntil(p)?`<span class="price-prefix">до ${escapeHtml(formatDateUk(productSaleUntil(p)))}</span>`:""}</div>

        ${(p.variants||[]).length ? `<div class="choice-group"><label>${escapeHtml(p.variantType || "Варіант")}</label><div class="choice-chips">${p.variants.map(v=>`<button class="choice-chip ${v.value===selectedVariantValue?"is-selected":""}" type="button" data-variant="${escapeAttr(v.value)}">${escapeHtml(v.value)} · ${formatMoney(v.effectivePrice)}</button>`).join("")}</div></div>` : ""}
        ${p.sauceCount > 0 ? `<div class="choice-group"><label>${p.sauceCount>1?`Оберіть ${p.sauceCount} соуси`:"Оберіть соус"}</label>${Array.from({length:p.sauceCount},(_,idx)=>`<div class="choice-chips" data-sauce-group="${idx}" style="margin-bottom:8px">${p.sauces.map(s=>`<button class="choice-chip ${selectedSauces[idx]===s?"is-selected":""}" type="button" data-sauce-index="${idx}" data-sauce="${escapeAttr(s)}">${escapeHtml(s)}</button>`).join("")}</div>`).join("")}</div>` : ""}

        <div class="product-modal-actions">
          <div class="quantity-control"><button type="button" data-modal-qty="-1">−</button><span>${modalQuantity}</span><button type="button" data-modal-qty="1">+</button></div>
          <button class="add-cart-button" type="button" data-modal-add ${p.available?"":"disabled"}>${p.available?`Додати · ${formatMoney(current*modalQuantity)}`:"Тимчасово недоступний"}</button>
        </div>

        ${p.ingredients?`<details class="detail-block"><summary>Склад</summary><p>${escapeHtml(p.ingredients)}</p></details>`:""}
        ${p.allergens?`<details class="detail-block"><summary>Алергени</summary><p>${escapeHtml(p.allergens)}</p></details>`:""}
        ${(p.shelfLife||p.storage)?`<details class="detail-block"><summary>Зберігання</summary><p>${escapeHtml(p.shelfLife||"")} ${escapeHtml(p.storage||"")}</p></details>`:""}

        ${related.length?`<div class="related-products"><h3>З цим часто обирають</h3><div class="related-mini-grid">${related.map(r=>`<button class="related-mini-card" type="button" data-related-open="${escapeAttr(r.code)}"><img src="${escapeAttr(productPhotos(r)[0])}" alt="" loading="lazy"><strong>${escapeHtml(r.name)}</strong></button>`).join("")}</div></div>`:""}

        <div class="product-feedback">
          <h3>Відгуки та запитання</h3>
          <p class="product-detail-copy">
            ${productReviews.length
              ? `${productReviews.length} ${plural(productReviews.length,"відгук","відгуки","відгуків")} уже опубліковано.`
              : "Поки немає опублікованих відгуків саме про цей товар."}
          </p>
          <div class="product-feedback-actions">
            <button class="button button-secondary" type="button" data-open-review>
              Залишити відгук
            </button>
            <button class="button button-secondary" type="button" data-open-question>
              Поставити запитання
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

function renderCart() {
  const count = cartCount();
  const total = cartTotal();
  els.cartCount.textContent = count;
  els.mobileCartCount.textContent = count;
  els.mobileCartCount.hidden = count === 0;
  els.cartHeaderTotal.textContent = formatMoney(total);
  els.cartTotal.textContent = formatMoney(total);
  els.checkoutButton.disabled = count === 0;
  els.checkoutSummaryTotal.textContent = formatMoney(total);

  if (!cart.length) {
    els.cartItems.innerHTML = `<div class="cart-empty">${escapeHtml(store?.settings?.messages?.emptyCart || "Тут поки тихо. Може, знайдемо щось хрумке?")}</div>`;
    els.cartSuggestions.innerHTML = "";
  } else {
    els.cartItems.innerHTML = cart.map(item => `
      <article class="cart-item">
        <img src="${escapeAttr(item.photo || "images/brand/logo.webp")}" alt="" loading="lazy">
        <div><h4>${escapeHtml(item.name)}</h4><p>${item.variantValue?`${escapeHtml(item.variantType || "Варіант")}: ${escapeHtml(item.variantValue)}`:""}${item.sauces?.length?`${item.variantValue?" · ":""}Соус${item.sauces.length>1?"и":""}: ${escapeHtml(item.sauces.join(", "))}`:""}</p><div class="cart-item-controls"><button type="button" data-cart-step="-1" data-cart-id="${escapeAttr(item.cartItemId)}">−</button><span>${item.quantity}</span><button type="button" data-cart-step="1" data-cart-id="${escapeAttr(item.cartItemId)}">+</button><button class="remove-item" type="button" data-cart-remove="${escapeAttr(item.cartItemId)}">прибрати</button></div></div>
        <div class="cart-item-price">${formatMoney(item.price * item.quantity)}</div>
      </article>`).join("");
    renderCartSuggestions();
  }
  renderFreeDeliveryProgress();
}

function renderFreeDeliveryProgress() {
  const total = cartTotal();
  const threshold = getFreeDeliveryThreshold();
  if (!cart.length) {
    els.cartProgress.innerHTML = `Безкоштовна доставка до відділення або поштомату — від ${formatMoney(threshold)}.`;
    els.checkoutDeliveryProgress.textContent = "";
    return;
  }
  const remaining = Math.max(0, threshold-total);
  const pct = Math.min(100, threshold ? total/threshold*100 : 100);
  const text = remaining > 0 ? `Ще ${formatMoney(remaining)} — і доставку до відділення або поштомату беремо на себе.` : "Готово! Доставка до відділення або поштомату — за наш рахунок.";
  els.cartProgress.innerHTML = `<strong>${escapeHtml(text)}</strong><div class="progress-track"><div class="progress-bar" style="width:${pct}%"></div></div>`;
  els.checkoutDeliveryProgress.textContent = text;
}

function renderCartSuggestions() {
  const inCart = new Set(cart.map(i=>i.code));
  const codes = [...new Set(cart.flatMap(i => findProduct(i.code)?.relatedProductCodes || []))];
  const suggestions = codes.map(findProduct).filter(p => p?.available && !inCart.has(p.code)).slice(0,3);
  if (!suggestions.length) { els.cartSuggestions.innerHTML = ""; return; }
  els.cartSuggestions.innerHTML = `<h3>Може, ще щось до компанії?</h3><div class="suggestion-row">${suggestions.map(p=>`<div class="suggestion-card"><img src="${escapeAttr(productPhotos(p)[0])}" alt="${escapeAttr(p.name)}" loading="lazy"><div class="suggestion-copy"><strong>${escapeHtml(p.name)}</strong><span>${formatMoney(productMinPrice(p))}</span></div><button type="button" data-suggestion-add="${escapeAttr(p.code)}">+ Додати</button></div>`).join("")}</div>`;
}

function openCart() { els.cartOverlay.classList.add("is-open"); els.cartPanel.classList.add("is-open"); els.cartPanel.setAttribute("aria-hidden","false"); lockBodyIfNeeded(); }
function closeCart() { els.cartOverlay.classList.remove("is-open"); els.cartPanel.classList.remove("is-open"); els.cartPanel.setAttribute("aria-hidden","true"); lockBodyIfNeeded(); }
function openModal(modal, overlay) { overlay.classList.add("is-open"); modal.classList.add("is-open"); modal.setAttribute("aria-hidden","false"); lockBodyIfNeeded(); }
function closeModal(modal, overlay) { overlay.classList.remove("is-open"); modal.classList.remove("is-open"); modal.setAttribute("aria-hidden","true"); lockBodyIfNeeded(); }
function closeProduct() { closeModal(els.productModal, els.productOverlay); selectedProduct = null; }
function openTerms() { openModal(els.termsModal, els.termsOverlay); }
function closeTerms() { closeModal(els.termsModal, els.termsOverlay); }
function openContact() { openModal(els.contactModal, els.contactOverlay); }
function closeContact() { closeModal(els.contactModal, els.contactOverlay); }

function openReviewForm(product) {
  if (!product || !els.reviewForm || !els.reviewModal || !els.reviewOverlay) return;

  const code = product.code || "";
  const name = product.name || "";

  els.reviewForm.reset();
  els.reviewProductCode.value = code;
  els.reviewProductNameInput.value = name;
  els.reviewProductName.textContent = name;
  els.reviewStatus.textContent = "";
  els.reviewStatus.className = "order-status";
  if (els.submitReviewButton) {
    els.submitReviewButton.disabled = false;
    els.submitReviewButton.textContent = "Надіслати відгук";
  }

  closeProduct();
  openModal(els.reviewModal, els.reviewOverlay);
}

function closeReviewForm() {
  if (els.reviewModal && els.reviewOverlay) closeModal(els.reviewModal, els.reviewOverlay);
}

function openQuestionForm(product) {
  if (!product || !els.questionForm || !els.questionModal || !els.questionOverlay) return;

  const code = product.code || "";
  const name = product.name || "";

  els.questionForm.reset();
  els.questionProductCode.value = code;
  els.questionProductNameInput.value = name;
  els.questionProductName.textContent = name;
  els.questionStatus.textContent = "";
  els.questionStatus.className = "order-status";
  if (els.submitQuestionButton) {
    els.submitQuestionButton.disabled = false;
    els.submitQuestionButton.textContent = "Надіслати питання";
  }

  closeProduct();
  openModal(els.questionModal, els.questionOverlay);
}

function closeQuestionForm() {
  if (els.questionModal && els.questionOverlay) closeModal(els.questionModal, els.questionOverlay);
}

function showReviewStatus(type, message) {
  if (!els.reviewStatus) return;
  els.reviewStatus.className = `order-status ${type || ""}`.trim();
  els.reviewStatus.textContent = message || "";
}

function showQuestionStatus(type, message) {
  if (!els.questionStatus) return;
  els.questionStatus.className = `order-status ${type || ""}`.trim();
  els.questionStatus.textContent = message || "";
}

async function sendFeedbackPayload(payload) {
  const body = new URLSearchParams();
  body.set("payload", JSON.stringify(payload));

  const response = await fetch(STORE_API_URL, {
    method: "POST",
    body,
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error(`Сервер відповів ${response.status}`);
  }

  const result = await response.json();
  if (!result?.success) {
    throw new Error(result?.error || "Не вдалося передати повідомлення.");
  }

  return result;
}

async function submitReview(event) {
  event.preventDefault();
  if (isSubmittingReview) return;

  const name = els.reviewName?.value.trim() || "";
  const rating = Number(els.reviewRating?.value || 0);
  const text = els.reviewText?.value.trim() || "";

  if (name.length < 2) {
    showReviewStatus("error", "Вкажіть, будь ласка, ваше ім’я.");
    els.reviewName?.focus();
    return;
  }

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    showReviewStatus("error", "Оберіть оцінку від 1 до 5.");
    els.reviewRating?.focus();
    return;
  }

  if (text.length < 5) {
    showReviewStatus("error", "Напишіть кілька слів про враження.");
    els.reviewText?.focus();
    return;
  }

  const payload = {
    action: "feedback",
    feedbackType: "review",
    name,
    rating,
    text,
    contact: "",
    productCode: els.reviewProductCode?.value || "",
    productName: els.reviewProductNameInput?.value || "",
    website: ""
  };

  isSubmittingReview = true;
  if (els.submitReviewButton) {
    els.submitReviewButton.disabled = true;
    els.submitReviewButton.textContent = "Надсилаємо...";
  }
  showReviewStatus("", "Передаємо відгук. Це займе кілька секунд.");

  try {
    const result = await sendFeedbackPayload(payload);
    showReviewStatus("success", result.message || "Дякуємо! Ваш відгук уже у нас і очікує модерації.");

    if (els.submitReviewButton) {
      els.submitReviewButton.textContent = "Надіслано";
    }

    setTimeout(() => closeReviewForm(), 1800);
  } catch (error) {
    console.error(error);
    showReviewStatus("error", error.message || "Не вдалося передати відгук. Спробуйте ще раз.");

    if (els.submitReviewButton) {
      els.submitReviewButton.disabled = false;
      els.submitReviewButton.textContent = "Надіслати відгук";
    }
  } finally {
    isSubmittingReview = false;
  }
}

async function submitQuestion(event) {
  event.preventDefault();
  if (isSubmittingQuestion) return;

  const name = els.questionName?.value.trim() || "";
  const text = els.questionText?.value.trim() || "";

  if (name.length < 2) {
    showQuestionStatus("error", "Вкажіть, будь ласка, ваше ім’я.");
    els.questionName?.focus();
    return;
  }

  if (text.length < 5) {
    showQuestionStatus("error", "Напишіть ваше запитання.");
    els.questionText?.focus();
    return;
  }

  const payload = {
    action: "feedback",
    feedbackType: "question",
    name,
    rating: "",
    text,
    contact: "",
    productCode: els.questionProductCode?.value || "",
    productName: els.questionProductNameInput?.value || "",
    website: ""
  };

  isSubmittingQuestion = true;
  if (els.submitQuestionButton) {
    els.submitQuestionButton.disabled = true;
    els.submitQuestionButton.textContent = "Надсилаємо...";
  }
  showQuestionStatus("", "Передаємо запитання. Це займе кілька секунд.");

  try {
    const result = await sendFeedbackPayload(payload);
    showQuestionStatus("success", result.message || "Дякуємо! Запитання вже у нас. Відповімо після перегляду.");

    if (els.submitQuestionButton) {
      els.submitQuestionButton.textContent = "Надіслано";
    }

    setTimeout(() => closeQuestionForm(), 1800);
  } catch (error) {
    console.error(error);
    showQuestionStatus("error", error.message || "Не вдалося передати запитання. Спробуйте ще раз.");

    if (els.submitQuestionButton) {
      els.submitQuestionButton.disabled = false;
      els.submitQuestionButton.textContent = "Надіслати питання";
    }
  } finally {
    isSubmittingQuestion = false;
  }
}

function openCardsModal() { if (els.cardsModal && els.cardsOverlay) openModal(els.cardsModal, els.cardsOverlay); }
function closeCardsModal() { if (els.cardsModal && els.cardsOverlay) closeModal(els.cardsModal, els.cardsOverlay); }
function openMobileMenu() { els.mobileMenu.classList.add("is-open"); els.mobileMenuOverlay.classList.add("is-open"); els.mobileMenu.setAttribute("aria-hidden","false"); lockBodyIfNeeded(); }
function closeMobileMenu() { els.mobileMenu.classList.remove("is-open"); els.mobileMenuOverlay.classList.remove("is-open"); els.mobileMenu.setAttribute("aria-hidden","true"); lockBodyIfNeeded(); }

function openCheckout() {
  if (!cart.length) return;
  closeCart();
  restoreCustomer();
  renderCart();
  els.orderStatus.textContent = "";
  els.orderStatus.className = "order-status";
  openModal(els.checkoutModal, els.checkoutOverlay);
}
function closeCheckout() { if (!isSubmittingOrder) closeModal(els.checkoutModal, els.checkoutOverlay); }

function restoreCustomer() {
  const data = loadJson(CUSTOMER_STORAGE_KEY, null);
  if (!data) return;
  els.customerName.value = data.name || "";
  els.customerSurname.value = data.surname || "";
  els.customerPhone.value = data.phone || "";
  els.customerRegion.value = data.region || "";
  els.customerCity.value = data.city || "";
  els.rememberCustomer.checked = true;
}
function saveCustomerIfNeeded() {
  if (!els.rememberCustomer.checked) { localStorage.removeItem(CUSTOMER_STORAGE_KEY); return; }
  saveJson(CUSTOMER_STORAGE_KEY, { name:els.customerName.value, surname:els.customerSurname.value, phone:els.customerPhone.value, region:els.customerRegion.value, city:els.customerCity.value });
}

function getRequestId() {
  let id = sessionStorage.getItem(REQUEST_ID_STORAGE_KEY);
  if (!id) { id = crypto?.randomUUID?.() || `req-${Date.now()}-${Math.random().toString(16).slice(2)}`; sessionStorage.setItem(REQUEST_ID_STORAGE_KEY,id); }
  return id;
}
function clearRequestId() { sessionStorage.removeItem(REQUEST_ID_STORAGE_KEY); }

function createOrderPayload() {
  const giftEnabled = els.isGift.checked;
  const cardEnabled = giftEnabled && els.cardEnabled.checked;
  return {
    requestId: getRequestId(),
    customer: { name:els.customerName.value, surname:els.customerSurname.value, phone:els.customerPhone.value, region:els.customerRegion.value, city:els.customerCity.value },
    recipient: giftEnabled ? { name:els.recipientName.value, phone:els.recipientPhone.value } : {},
    delivery: { code:els.deliveryMethod.value, branch:els.deliveryBranch.value },
    paymentCode: els.paymentMethod.value,
    desiredDate: els.desiredDate.value,
    gift: giftEnabled ? {
      isGift:true, isSurprise:els.isSurprise.checked, hidePrice:els.hidePrice.checked,
      wrap:els.giftWrapping.value,
      signatureMode:els.signatureMode.value,
      hint:els.recipientHint.value,
      courageScenario:els.courageScenario.value,
      card: cardEnabled ? { enabled:true, style:els.cardStyle.value, text:els.cardText.value, helpWithText:els.helpWithCardText.checked, to:els.congratulationsTo.value, occasion:els.occasion.value, from:els.giftFrom.value } : { enabled:false }
    } : { isGift:false },
    certificateCode: els.hasCertificate.checked ? els.certificateCode.value : "",
    comment: els.customerComment.value,
    source: "GitHub Pages — Точка Хрускоту v2",
    items: cart.map(item => ({ code:item.code, quantity:item.quantity, variantValue:item.variantValue || "", sauces:item.sauces || [] }))
  };
}

function friendlyValidationMessage() {
  if (!els.customerName.value.trim()) return "Здається, ми пропустили ваше ім’я.";
  if (!els.customerSurname.value.trim()) return "Додайте, будь ласка, прізвище.";
  if (!els.customerPhone.value.trim()) return "Залиште телефон, щоб ми могли підтвердити замовлення.";
  if (!els.deliveryMethod.value) return "Оберіть, як зручніше отримати замовлення.";
  const method = (store?.deliveryMethods || []).find(i=>i.code===els.deliveryMethod.value);
  if (method?.requireRegion && !els.customerRegion.value.trim()) return "Вкажіть область для доставки.";
  if (method?.requireCity && !els.customerCity.value.trim()) return "Вкажіть місто або населений пункт.";
  if (method?.requireBranch && !els.deliveryBranch.value.trim()) return "Вкажіть відділення, поштомат або індекс.";
  if (!els.paymentMethod.value) return "Оберіть спосіб оплати.";
  if (els.isGift.checked && els.recipientPhone.value && !/^\+?380\d{9}$/.test(els.recipientPhone.value.replace(/\s/g,""))) return "Перевірте телефон отримувача у форматі +380XXXXXXXXX.";
  if (els.hasCertificate.checked && !els.certificateCode.value.trim()) return "Введіть код подарункового сертифіката.";
  if (!els.termsAccepted.checked) return "Потрібно погодитися з умовами замовлення і доставки.";
  return "";
}

function showOrderStatus(type, message) {
  els.orderStatus.className = `order-status ${type}`;
  els.orderStatus.textContent = message;
}

async function submitOrder(event) {
  event.preventDefault();
  if (isSubmittingOrder) return;
  if (!cart.length) { showOrderStatus("error", "Тут поки тихо — кошик порожній."); return; }
  const validation = friendlyValidationMessage();
  if (validation) { showOrderStatus("error", validation); return; }

  saveCustomerIfNeeded();
  isSubmittingOrder = true;
  els.submitOrderButton.disabled = true;
  els.submitOrderButton.textContent = "Надсилаємо...";
  showOrderStatus("", "Передаємо замовлення. Це займе кілька секунд.");

  try {
    const body = new URLSearchParams();
    body.set("payload", JSON.stringify(createOrderPayload()));
    const response = await fetch(STORE_API_URL, { method:"POST", body, redirect:"follow" });
    if (!response.ok) throw new Error(`Сервер відповів ${response.status}`);
    const result = await response.json();
    if (!result?.success) throw new Error(result?.error || "Не вдалося записати замовлення.");

    const paymentLine = els.paymentMethod.value === "CASH_PICKUP" ? "Оплата — готівкою під час самовивозу." : "Поки що оплачувати нічого не потрібно.";
    showOrderStatus("success", `Готово! Замовлення №${result.orderNumber} уже у нас. ${paymentLine} Ми зв’яжемося з вами для підтвердження.`);
    cart = [];
    saveCart();
    renderCart();
    clearRequestId();
    els.checkoutForm.reset();
    populateCheckoutOptions();
    els.submitOrderButton.textContent = "Замовлення прийнято";
    els.submitOrderButton.disabled = true;
  } catch (error) {
    console.error(error);
    showOrderStatus("error", error.message || "Не вдалося передати замовлення. Спробуйте ще раз.");
    els.submitOrderButton.disabled = false;
    els.submitOrderButton.textContent = "Спробувати ще раз";
  } finally { isSubmittingOrder = false; }
}

// Events
els.categoryFilters.addEventListener("click", e => { const b=e.target.closest("[data-filter]"); if(b) setFilter(b.dataset.filter,false); });
els.catalogSearch.addEventListener("input", e => { searchQuery=e.target.value.trim(); els.clearSearch.hidden=!searchQuery; renderCatalogue(); });
els.clearSearch.addEventListener("click", ()=>{ els.catalogSearch.value=""; searchQuery=""; els.clearSearch.hidden=true; renderCatalogue(); els.catalogSearch.focus(); });
els.sortSelect.addEventListener("change", e=>{ sortMode=e.target.value; renderCatalogue(); });
els.resetCatalogue.addEventListener("click", ()=>{ activeFilter="ALL"; searchQuery=""; sortMode="default"; els.catalogSearch.value=""; els.sortSelect.value="default"; renderCatalogue(); });

els.productGrid.addEventListener("click", e => {
  const open=e.target.closest("[data-open-product]"); if(open){ openProduct(open.dataset.openProduct); return; }
  const add=e.target.closest("[data-quick-add]"); if(add){ quickAdd(add.dataset.quickAdd); return; }
  const gallery=e.target.closest("[data-card-gallery]");
  if(gallery && e.target.closest("[data-card-prev]")){ cardGalleryStep(gallery,-1); return; }
  if(gallery && e.target.closest("[data-card-next]")){ cardGalleryStep(gallery,1); return; }
});

if (els.newProductGrid) {
  els.newProductGrid.addEventListener("click", e => {
    const open=e.target.closest("[data-open-product]"); if(open){ openProduct(open.dataset.openProduct); return; }
    const add=e.target.closest("[data-quick-add]"); if(add){ quickAdd(add.dataset.quickAdd); return; }
    const gallery=e.target.closest("[data-card-gallery]");
    if(gallery && e.target.closest("[data-card-prev]")){ cardGalleryStep(gallery,-1); return; }
    if(gallery && e.target.closest("[data-card-next]")){ cardGalleryStep(gallery,1); return; }
  });
}

els.productGrid.addEventListener("mouseover", e=>{
  const gallery=e.target.closest("[data-card-gallery]");
  if(!gallery || gallery.contains(e.relatedTarget)) return;
  const p=findProduct(gallery.dataset.code); const photos=productPhotos(p).slice(0,3);
  if(photos.length>1){ gallery.dataset.hoverIndex=gallery.dataset.index; gallery.dataset.index="1"; gallery.querySelector("[data-card-photo]").src=photos[1]; [...gallery.querySelectorAll(".card-dots i")].forEach((d,i)=>d.classList.toggle("active",i===1)); }
});
els.productGrid.addEventListener("mouseout", e=>{
  const gallery=e.target.closest("[data-card-gallery]");
  if(!gallery || gallery.contains(e.relatedTarget) || gallery.dataset.hoverIndex===undefined) return;
  const p=findProduct(gallery.dataset.code); const photos=productPhotos(p).slice(0,3); const idx=Number(gallery.dataset.hoverIndex||0);
  gallery.dataset.index=String(idx); delete gallery.dataset.hoverIndex; gallery.querySelector("[data-card-photo]").src=photos[idx]; [...gallery.querySelectorAll(".card-dots i")].forEach((d,i)=>d.classList.toggle("active",i===idx));
});

els.productModalContent.addEventListener("click", e=>{
  const photo=e.target.closest("[data-modal-photo]"); if(photo){ selectedPhotoIndex=Number(photo.dataset.modalPhoto); renderProductModal(); return; }
  const step=e.target.closest("[data-modal-photo-step]"); if(step){ const photos=productPhotos(selectedProduct); selectedPhotoIndex=(selectedPhotoIndex+Number(step.dataset.modalPhotoStep)+photos.length)%photos.length; renderProductModal(); return; }
  const variant=e.target.closest("[data-variant]"); if(variant){ selectedVariantValue=variant.dataset.variant; renderProductModal(); return; }
  const sauce=e.target.closest("[data-sauce]"); if(sauce){ selectedSauces[Number(sauce.dataset.sauceIndex)]=sauce.dataset.sauce; renderProductModal(); return; }
  const qty=e.target.closest("[data-modal-qty]"); if(qty){ modalQuantity=Math.max(1,Math.min(20,modalQuantity+Number(qty.dataset.modalQty))); renderProductModal(); return; }
  if(e.target.closest("[data-modal-add]")){ addCartItem(selectedProduct,selectedVariant(),selectedSauces.filter(Boolean),modalQuantity); return; }
  const related=e.target.closest("[data-related-open]"); if(related){ openProduct(related.dataset.relatedOpen); return; }

  if(e.target.closest("[data-open-review]")){
    openReviewForm(selectedProduct);
    return;
  }

  if(e.target.closest("[data-open-question]")){
    openQuestionForm(selectedProduct);
    return;
  }
});

els.cartItems.addEventListener("click", e=>{
  const step=e.target.closest("[data-cart-step]"); if(step){ const item=cart.find(i=>i.cartItemId===step.dataset.cartId); if(item){ item.quantity=Math.max(1,Math.min(20,item.quantity+Number(step.dataset.cartStep))); saveCart(); renderCart(); } return; }
  const remove=e.target.closest("[data-cart-remove]"); if(remove){ cart=cart.filter(i=>i.cartItemId!==remove.dataset.cartRemove); saveCart(); renderCart(); }
});
els.cartSuggestions.addEventListener("click", e=>{ const b=e.target.closest("[data-suggestion-add]"); if(b) quickAdd(b.dataset.suggestionAdd); });

els.certificateGrid.addEventListener("click", e=>{ const b=e.target.closest("[data-certificate-contact]"); if(b){ showToast(`Сертифікат: ${b.dataset.certificateContact}. Напишіть нам — оформимо.`); openContact(); } });
els.faqList.addEventListener("click", e=>{ const q=e.target.closest(".faq-question"); if(q) q.closest(".faq-item").classList.toggle("is-open"); });

$$('[data-filter-link]').forEach(el=>el.addEventListener("click",()=>setFilter(el.dataset.filterLink,true)));
$$('[data-open-contact]').forEach(el=>el.addEventListener("click",openContact));

els.mobileMenuButton.addEventListener("click",openMobileMenu); els.closeMobileMenu.addEventListener("click",closeMobileMenu); els.mobileMenuOverlay.addEventListener("click",closeMobileMenu);
els.mobileMenu.addEventListener("click",e=>{ if(e.target.closest("a")) closeMobileMenu(); });
els.headerSearchButton.addEventListener("click",()=>{ document.querySelector("#catalogue")?.scrollIntoView({behavior:"smooth"}); setTimeout(()=>els.catalogSearch.focus(),450); });
els.mobileSearchButton.addEventListener("click",()=>{ document.querySelector("#catalogue")?.scrollIntoView({behavior:"smooth"}); setTimeout(()=>els.catalogSearch.focus(),450); });

els.cartButton.addEventListener("click",openCart); els.mobileCartButton.addEventListener("click",openCart); els.closeCartButton.addEventListener("click",closeCart); els.cartOverlay.addEventListener("click",closeCart); els.checkoutButton.addEventListener("click",openCheckout);
els.closeProductButton.addEventListener("click",closeProduct); els.productOverlay.addEventListener("click",closeProduct);
els.closeCheckoutButton.addEventListener("click",closeCheckout); els.checkoutOverlay.addEventListener("click",closeCheckout);
els.openTermsButton.addEventListener("click",openTerms); els.footerTermsButton.addEventListener("click",openTerms); els.checkoutTermsButton.addEventListener("click",openTerms); els.closeTermsButton.addEventListener("click",closeTerms); els.termsOverlay.addEventListener("click",closeTerms);
els.closeContactButton.addEventListener("click",closeContact); els.contactOverlay.addEventListener("click",closeContact);

els.closeReviewButton?.addEventListener("click", closeReviewForm);
els.reviewOverlay?.addEventListener("click", closeReviewForm);
els.closeQuestionButton?.addEventListener("click", closeQuestionForm);
els.questionOverlay?.addEventListener("click", closeQuestionForm);

els.openCardsPreview?.addEventListener("click",openCardsModal);
els.openCardsPreviewSecondary?.addEventListener("click",openCardsModal);
els.closeCardsPreview?.addEventListener("click",closeCardsModal);
els.cardsOverlay?.addEventListener("click",closeCardsModal);

els.deliveryMethod.addEventListener("change",updateDeliveryFields); els.paymentMethod.addEventListener("change",updatePaymentNote); els.giftWrapping.addEventListener("change",updateGiftWrappingNote);
els.isGift.addEventListener("change",()=>{ els.giftFields.hidden=!els.isGift.checked; });
els.cardEnabled.addEventListener("change",()=>{ els.cardFields.hidden=!els.cardEnabled.checked; });
els.signatureMode.addEventListener("change",()=>{ els.recipientHintField.hidden=els.signatureMode.value!=="Нехай людина здогадається"; });
els.cardStyle.addEventListener("change",()=>{ els.courageScenarioField.hidden=els.cardStyle.value!=="На що я не можу наважитися"; });
els.hasCertificate.addEventListener("change",()=>{ els.certificateCodeField.hidden=!els.hasCertificate.checked; });
els.reviewForm?.addEventListener("submit", submitReview);
els.questionForm?.addEventListener("submit", submitQuestion);
els.checkoutForm.addEventListener("submit",submitOrder);

window.addEventListener("keydown", e=>{
  if(e.key!=="Escape") return;
  closeMobileMenu(); closeCart(); closeProduct(); closeTerms(); closeContact(); closeReviewForm(); closeQuestionForm(); closeCardsModal(); closeCheckout();
});

renderCart();
setTimeout(hideLoader, 1200);
loadStore();
