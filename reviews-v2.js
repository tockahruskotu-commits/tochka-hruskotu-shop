/* ==========================================================
   ТОЧКА ХРУСКОТУ — REVIEWS V2
   Відгуки та запитання з API,
   фільтри, статистика, форма відгуку/питання,
   кошик, мобільне меню та GA4
   ========================================================== */

const STORE_API_URL =
  "https://script.google.com/macros/s/AKfycbzCgvAMAmqrsK-KsGcPMfx60kvQbZVJII91WVZKIn-KF7bFIA3HKdKe0JmaBu4RZtX31Q/exec";

const CART_STORAGE_KEY =
  "tochka_hruskotu_cart_v3";

const STORE_CACHE_KEY =
  "tochka_hruskotu_store_cache_v1";

const STORE_REQUEST_TIMEOUT_MS =
  10000;

const PAGE_LOADER_MAX_MS =
  900;

let store = null;
let cart = loadCart();

let activeFeedbackFilter =
  "all";

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

  googleReviewButton:
    $("#googleReviewButton"),

  reviewAverage:
    $("#reviewAverage"),

  reviewCount:
    $("#reviewCount"),

  questionCount:
    $("#questionCount"),

  reviewResultText:
    $("#reviewResultText"),

  reviewsFeed:
    $("#reviewsFeed"),

  reviewsEmpty:
    $("#reviewsEmpty"),

  reviewStoreError:
    $("#reviewStoreError"),

  leaveReviewButton:
    $("#leaveReviewButton"),

  askQuestionButton:
    $("#askQuestionButton"),

  emptyReviewButton:
    $("#emptyReviewButton"),

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

function yesValue(value) {
  const normalized =
    normalizeText(value);

  return (
    value === true ||
    value === 1 ||
    normalized === "так" ||
    normalized === "yes" ||
    normalized === "true" ||
    normalized === "1"
  );
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
   3. ТОВАРИ
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


/* ==========================================================
   4. КАТЕГОРІЇ
   ========================================================== */

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


/* ==========================================================
   5. НОРМАЛІЗАЦІЯ ВІДГУКІВ
   Підтримуємо кілька назв полів,
   щоб сторінка була стійкою до API.
   ========================================================== */

function feedbackProductCode(item) {
  return String(
    item?.productCode ??
    item?.code ??
    item?.product_code ??
    ""
  )
    .trim()
    .toUpperCase();
}

function feedbackProductName(item) {
  const explicitName =
    item?.productName ??
    item?.product ??
    item?.product_name ??
    "";

  if (explicitName) {
    return String(
      explicitName
    ).trim();
  }

  const product =
    findProduct(
      feedbackProductCode(
        item
      )
    );

  return (
    product?.name ||
    ""
  );
}

function feedbackType(item) {
  const raw =
    normalizeText(
      item?.type ??
      item?.feedbackType ??
      item?.feedback_type ??
      ""
    );

  if (
    raw === "question" ||
    raw.includes("питан")
  ) {
    return "question";
  }

  return "review";
}

function feedbackName(item) {
  return String(
    item?.name ??
    item?.author ??
    item?.customerName ??
    item?.customer_name ??
    "Покупець"
  ).trim();
}

function feedbackRating(item) {
  return Math.max(
    0,
    Math.min(
      5,
      safeNumber(
        item?.rating ??
        item?.stars ??
        item?.score,
        0
      )
    )
  );
}

function feedbackText(item) {
  return String(
    item?.text ??
    item?.message ??
    item?.review ??
    item?.question ??
    ""
  ).trim();
}

function feedbackAnswer(item) {
  return String(
    item?.answer ??
    item?.reply ??
    item?.response ??
    item?.shopAnswer ??
    ""
  ).trim();
}

function feedbackDateRaw(item) {
  return String(
    item?.date ??
    item?.createdAt ??
    item?.created_at ??
    item?.timestamp ??
    item?.dateTime ??
    ""
  ).trim();
}

function feedbackVerified(item) {
  return yesValue(
    item?.verifiedPurchase ??
    item?.verified ??
    item?.isVerified ??
    item?.verified_purchase
  );
}

function isTestFeedback(item) {
  const code =
    feedbackProductCode(
      item
    );

  const name =
    normalizeText(
      feedbackName(
        item
      )
    );

  return (
    code === "TEST" ||
    name === "тест"
  );
}

function isPublishedFeedback(item) {
  if (
    isTestFeedback(
      item
    )
  ) {
    return false;
  }

  /*
    Якщо API вже повернув тільки
    опубліковані записи, полів status
    та publish може взагалі не бути.
  */

  const publishValue =
    item?.publish ??
    item?.published ??
    item?.show ??
    item?.isPublished;

  const statusValue =
    item?.status;

  const hasPublishField =
    publishValue !==
      undefined &&
    publishValue !==
      null &&
    String(
      publishValue
    ).trim() !== "";

  const hasStatusField =
    statusValue !==
      undefined &&
    statusValue !==
      null &&
    String(
      statusValue
    ).trim() !== "";

  if (
    hasPublishField &&
    !yesValue(
      publishValue
    )
  ) {
    return false;
  }

  if (hasStatusField) {
    const status =
      normalizeText(
        statusValue
      );

    if (
      status.includes(
        "модерац"
      ) ||
      status.includes(
        "відхилен"
      ) ||
      status.includes(
        "чернет"
      )
    ) {
      return false;
    }
  }

  return Boolean(
    feedbackText(
      item
    )
  );
}


/* ==========================================================
   6. ДАТА
   ========================================================== */

function parseFeedbackDate(value) {
  const text =
    String(value || "")
      .trim();

  if (!text) {
    return null;
  }

  /*
    Формат таблиці:
    14.09.2026 14:15:00
  */

  const ukMatch =
    text.match(
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
    );

  if (ukMatch) {
    const [
      ,
      day,
      month,
      year,
      hour = "0",
      minute = "0",
      second = "0"
    ] =
      ukMatch;

    const date =
      new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second)
      );

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {
      return date;
    }
  }

  const native =
    new Date(
      text
    );

  if (
    !Number.isNaN(
      native.getTime()
    )
  ) {
    return native;
  }

  return null;
}

function feedbackTimestamp(item) {
  const date =
    parseFeedbackDate(
      feedbackDateRaw(
        item
      )
    );

  return date
    ? date.getTime()
    : 0;
}

function formatFeedbackDate(item) {
  const date =
    parseFeedbackDate(
      feedbackDateRaw(
        item
      )
    );

  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "uk-UA",
    {
      day:
        "numeric",

      month:
        "long",

      year:
        "numeric"
    }
  ).format(
    date
  );
}


/* ==========================================================
   7. ОПУБЛІКОВАНІ ЗАПИСИ
   ========================================================== */

function allPublishedFeedback() {
  const source =
    Array.isArray(
      store?.reviews
    )
      ? store.reviews
      : [];

  return source
    .filter(
      isPublishedFeedback
    )
    .sort(
      (a, b) =>
        feedbackTimestamp(b) -
        feedbackTimestamp(a)
    );
}

function publishedReviews() {
  return allPublishedFeedback()
    .filter(
      item =>
        feedbackType(
          item
        ) ===
        "review"
    );
}

function publishedQuestions() {
  return allPublishedFeedback()
    .filter(
      item =>
        feedbackType(
          item
        ) ===
        "question"
    );
}


/* ==========================================================
   8. GA4
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


/* ==========================================================
   9. КЕШ
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
   10. ЗАВАНТАЖЕННЯ API
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
        "Не вдалося завантажити відгуки."
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
        elements.reviewStoreError
      ) {
        elements.reviewStoreError.hidden =
          false;
      }

      if (
        elements.reviewResultText
      ) {
        elements.reviewResultText.textContent =
          "Не вдалося завантажити відгуки.";
      }
    }
  } finally {
    hidePageLoader();
  }
}


/* ==========================================================
   11. НАЛАШТУВАННЯ САЙТУ
   ========================================================== */

function applySettings() {
  const settings =
    store?.settings ||
    {};

  const storeName =
    settings.storeName ||
    "Точка Хрускоту";

  document.title =
    `Відгуки — ${storeName}`;

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

  const googleProfile =
    settings.googleProfile ||
    "https://share.google/Fc4vC6bW6pVCzwFYW";

  const googleReview =
    settings.googleReview ||
    settings.googleReviewUrl ||
    googleProfile;

  if (
    elements.footerGoogleProfile
  ) {
    elements.footerGoogleProfile.href =
      googleProfile;
  }

  if (
    elements.googleReviewButton
  ) {
    elements.googleReviewButton.href =
      googleReview;
  }
}


/* ==========================================================
   12. СТАТИСТИКА
   ========================================================== */

function averageRating() {
  const ratings =
    publishedReviews()
      .map(
        feedbackRating
      )
      .filter(
        value =>
          value >= 1 &&
          value <= 5
      );

  if (
    !ratings.length
  ) {
    return 0;
  }

  return (
    ratings.reduce(
      (sum, value) =>
        sum + value,
      0
    ) /
    ratings.length
  );
}

function renderSummary() {
  const reviews =
    publishedReviews();

  const questions =
    publishedQuestions();

  const average =
    averageRating();

  if (
    elements.reviewAverage
  ) {
    elements.reviewAverage.textContent =
      average
        ? `${average
            .toFixed(1)
            .replace(
              ".",
              ","
            )} ★`
        : "—";
  }

  if (
    elements.reviewCount
  ) {
    elements.reviewCount.textContent =
      reviews.length;
  }

  if (
    elements.questionCount
  ) {
    elements.questionCount.textContent =
      questions.length;
  }
}


/* ==========================================================
   13. ВІДМІНЮВАННЯ
   ========================================================== */

function recordWord(count) {
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
    return "записів";
  }

  if (
    last === 1
  ) {
    return "запис";
  }

  if (
    last >= 2 &&
    last <= 4
  ) {
    return "записи";
  }

  return "записів";
}


/* ==========================================================
   14. ФІЛЬТР
   ========================================================== */

function filteredFeedback() {
  const all =
    allPublishedFeedback();

  if (
    activeFeedbackFilter ===
    "reviews"
  ) {
    return all.filter(
      item =>
        feedbackType(
          item
        ) ===
        "review"
    );
  }

  if (
    activeFeedbackFilter ===
    "questions"
  ) {
    return all.filter(
      item =>
        feedbackType(
          item
        ) ===
        "question"
    );
  }

  return all;
}

function updateFilterButtons() {
  document
    .querySelectorAll(
      "[data-feedback-filter]"
    )
    .forEach(button => {
      const active =
        button.dataset
          .feedbackFilter ===
        activeFeedbackFilter;

      button.classList.toggle(
        "is-active",
        active
      );

      button.setAttribute(
        "aria-pressed",
        active
          ? "true"
          : "false"
      );
    });
}


/* ==========================================================
   15. КАРТКА ВІДГУКУ / ПИТАННЯ
   ========================================================== */

function starsText(rating) {
  const value =
    Math.max(
      0,
      Math.min(
        5,
        Math.round(
          safeNumber(
            rating,
            0
          )
        )
      )
    );

  return value
    ? "★".repeat(value)
    : "";
}

function renderFeedbackCard(item) {
  const type =
    feedbackType(
      item
    );

  const isQuestion =
    type ===
    "question";

  const name =
    feedbackName(
      item
    );

  const rating =
    feedbackRating(
      item
    );

  const text =
    feedbackText(
      item
    );

  const answer =
    feedbackAnswer(
      item
    );

  const date =
    formatFeedbackDate(
      item
    );

  const code =
    feedbackProductCode(
      item
    );

  const product =
    findProduct(
      code
    );

  const productName =
    feedbackProductName(
      item
    );

  const verified =
    feedbackVerified(
      item
    );

  return `
    <article class="review-feed-card">

      <div class="review-feed-top">

        <div class="review-person">

          <strong>
            ${escapeHtml(
              name ||
              "Покупець"
            )}
          </strong>

          ${
            date
              ? `
                <span class="review-date">
                  ${escapeHtml(
                    date
                  )}
                </span>
              `
              : ""
          }

        </div>


        ${
          isQuestion
            ? `
              <span class="question-badge">
                Запитання
              </span>
            `
            : `
              <span class="review-source">
                Відгук на сайті
              </span>
            `
        }

      </div>


      ${
        !isQuestion &&
        rating
          ? `
            <div
              class="review-card-stars"
              aria-label="Оцінка ${rating} з 5"
            >
              ${starsText(
                rating
              )}
            </div>
          `
          : ""
      }


      ${
        verified
          ? `
            <div
              style="
                margin-top:8px;
                color:#4c684a;
                font-size:11px;
                font-weight:850;
              "
            >
              Підтверджена покупка
            </div>
          `
          : ""
      }


      <p class="review-card-text">
        ${escapeHtml(
          text
        )}
      </p>


      ${
        product &&
        productName
          ? `
            <a
              class="review-product-link"
              href="${escapeHtml(
                productUrl(
                  product
                )
              )}"
            >
              Про товар:
              ${escapeHtml(
                productName
              )}
            </a>
          `
          : productName
            ? `
              <div class="review-product-link">
                Про товар:
                ${escapeHtml(
                  productName
                )}
              </div>
            `
            : ""
      }


      ${
        answer
          ? `
            <div class="review-answer">

              <strong>
                Точка Хрускоту:
              </strong>

              ${escapeHtml(
                answer
              )}

            </div>
          `
          : ""
      }

    </article>
  `;
}


/* ==========================================================
   16. ВІДОБРАЖЕННЯ СПИСКУ
   ========================================================== */

function renderReviews() {
  if (
    !elements.reviewsFeed ||
    !store
  ) {
    return;
  }

  const records =
    filteredFeedback();

  elements.reviewsFeed.innerHTML =
    records
      .map(
        renderFeedbackCard
      )
      .join("");

  if (
    elements.reviewsEmpty
  ) {
    elements.reviewsEmpty.hidden =
      records.length >
      0;
  }

  if (
    elements.reviewResultText
  ) {
    if (
      activeFeedbackFilter ===
      "reviews"
    ) {
      elements.reviewResultText.textContent =
        `Відгуків: ${records.length}.`;
    } else if (
      activeFeedbackFilter ===
      "questions"
    ) {
      elements.reviewResultText.textContent =
        `Запитань: ${records.length}.`;
    } else {
      elements.reviewResultText.textContent =
        `Показано ${records.length} ${recordWord(
          records.length
        )}.`;
    }
  }
}


/* ==========================================================
   17. ОСНОВНИЙ РЕНДЕР
   ========================================================== */

function renderStore(data) {
  store =
    data;

  if (
    elements.reviewStoreError
  ) {
    elements.reviewStoreError.hidden =
      true;
  }

  applySettings();
  renderSummary();
  renderReviews();
  renderCart();
}


/* ==========================================================
   18. МОДАЛЬНЕ ВІКНО
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
      z-index: 3000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(35,26,21,.58);
    }

    .feedback-dynamic-overlay.is-open {
      display: flex;
    }

    .feedback-dynamic-modal {
      width: min(540px, 100%);
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
      font-size: 25px;
    }

    .feedback-dynamic-close {
      width: 40px;
      height: 40px;
      flex: 0 0 40px;
      border: 1px solid var(--border);
      border-radius: 50%;
      background: var(--surface-soft);
      color: var(--brown);
      font-size: 25px;
      cursor: pointer;
    }

    .feedback-dynamic-field {
      display: grid;
      gap: 6px;
      margin-bottom: 14px;
    }

    .feedback-dynamic-field label {
      color: var(--brown);
      font-size: 13px;
      font-weight: 850;
    }

    .feedback-dynamic-field input,
    .feedback-dynamic-field select,
    .feedback-dynamic-field textarea {
      width: 100%;
      min-height: 46px;
      padding: 11px 12px;
      border: 1px solid var(--border-strong);
      border-radius: 12px;
      background: #fff;
      color: var(--text);
    }

    .feedback-dynamic-field textarea {
      min-height: 120px;
      resize: vertical;
    }

    .feedback-dynamic-note {
      margin: -2px 0 15px;
      padding: 11px 13px;
      border-radius: 11px;
      background: var(--surface-soft);
      color: var(--text-soft);
      font-size: 12px;
      line-height: 1.5;
    }

    .feedback-dynamic-submit {
      width: 100%;
      min-height: 48px;
      border: 0;
      border-radius: 13px;
      background: var(--accent);
      color: #fff;
      font-weight: 900;
      cursor: pointer;
    }

    .feedback-dynamic-submit:disabled {
      opacity: .65;
      cursor: wait;
    }

    .feedback-dynamic-status {
      margin-top: 12px;
      color: var(--text-soft);
      font-size: 13px;
      line-height: 1.5;
    }

    .feedback-dynamic-status.is-success {
      color: #496347;
    }

    .feedback-dynamic-status.is-error {
      color: var(--danger);
    }
  `;

  document.head
    .appendChild(
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
      aria-labelledby="feedbackDynamicTitle"
    >

      <div class="feedback-dynamic-head">

        <h2 id="feedbackDynamicTitle">
          Залишити відгук
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


      <form id="feedbackDynamicForm">

        <input
          id="feedbackDynamicType"
          type="hidden"
        >


        <div class="feedback-dynamic-field">

          <label for="feedbackDynamicProduct">
            Товар
          </label>

          <select
            id="feedbackDynamicProduct"
            required
          >
            <option value="">
              Оберіть товар
            </option>
          </select>

        </div>


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

          <select id="feedbackDynamicRating">

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


        <div class="feedback-dynamic-note">
          Повідомлення з’явиться на сайті після перевірки.
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

  document.body
    .appendChild(
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
        event.target ===
        overlay
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


/* ==========================================================
   19. СПИСОК ТОВАРІВ У ФОРМІ
   ========================================================== */

function renderFeedbackProductOptions() {
  const select =
    $("#feedbackDynamicProduct");

  if (!select) {
    return;
  }

  const products =
    Array.isArray(
      store?.products
    )
      ? [...store.products]
      : [];

  products.sort(
    (a, b) =>
      String(
        a.name || ""
      ).localeCompare(
        String(
          b.name || ""
        ),
        "uk"
      )
  );

  select.innerHTML = `
    <option value="">
      Оберіть товар
    </option>

    ${products
      .map(
        product => `
          <option
            value="${escapeHtml(
              product.code
            )}"
          >
            ${escapeHtml(
              product.name
            )}
          </option>
        `
      )
      .join("")}
  `;
}


/* ==========================================================
   20. ВІДКРИТТЯ ФОРМИ
   ========================================================== */

function openFeedbackModal(type) {
  if (!store) {
    showToast(
      "Зачекайте, будь ласка, поки завантажиться сторінка."
    );

    return;
  }

  ensureFeedbackModal();
  renderFeedbackProductOptions();

  const overlay =
    $("#feedbackDynamicOverlay");

  const isReview =
    type ===
    "review";

  $("#feedbackDynamicType").value =
    type;

  $("#feedbackDynamicTitle").textContent =
    isReview
      ? "Залишити відгук"
      : "Поставити запитання";

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
      ? "Розкажіть, що вам сподобалося..."
      : "Що ви хочете уточнити?";

  $("#feedbackDynamicProduct").value =
    "";

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

  setTimeout(() => {
    $("#feedbackDynamicProduct")
      ?.focus();
  }, 100);
}

function closeFeedbackModal() {
  const overlay =
    $("#feedbackDynamicOverlay");

  if (!overlay) {
    return;
  }

  overlay.classList.remove(
    "is-open"
  );

  document.body.style.overflow =
    "";
}


/* ==========================================================
   21. ВІДПРАВЛЕННЯ ФОРМИ
   ========================================================== */

async function sendFeedbackPayload(
  payload
) {
  const body =
    new URLSearchParams();

  body.set(
    "payload",
    JSON.stringify(
      payload
    )
  );

  const response =
    await fetch(
      STORE_API_URL,
      {
        method:
          "POST",

        body,

        redirect:
          "follow"
      }
    );

  if (
    !response.ok
  ) {
    throw new Error(
      `Сервер відповів ${response.status}`
    );
  }

  const result =
    await response.json();

  if (
    !result?.success
  ) {
    throw new Error(
      result?.error ||
      "Не вдалося передати повідомлення."
    );
  }

  return result;
}

async function submitFeedback(event) {
  event.preventDefault();

  const type =
    $("#feedbackDynamicType")
      ?.value ||
    "";

  const productCode =
    $("#feedbackDynamicProduct")
      ?.value ||
    "";

  const product =
    findProduct(
      productCode
    );

  const name =
    $("#feedbackDynamicName")
      ?.value
      .trim() ||
    "";

  const rating =
    $("#feedbackDynamicRating")
      ?.value ||
    "";

  const text =
    $("#feedbackDynamicText")
      ?.value
      .trim() ||
    "";

  const status =
    $("#feedbackDynamicStatus");

  const button =
    $("#feedbackDynamicSubmit");


  if (!product) {
    status.textContent =
      "Оберіть товар.";

    status.className =
      "feedback-dynamic-status is-error";

    return;
  }


  if (
    name.length < 2
  ) {
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


  if (
    text.length < 5
  ) {
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
    action:
      "feedback",

    feedbackType:
      type,

    name,

    rating:
      type === "review"
        ? Number(
            rating
          )
        : "",

    text,

    contact:
      "",

    productCode:
      product.code,

    productName:
      product.name,

    website:
      ""
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
          : "Дякуємо! Запитання надіслано."
      );

    button.textContent =
      "Надіслано";


    trackGa4Event(
      "generate_lead",
      {
        form_name:
          type === "review"
            ? "Відгук"
            : "Запитання",

        product_id:
          product.code
      }
    );


    setTimeout(
      closeFeedbackModal,
      1800
    );

  } catch (error) {
    console.error(
      error
    );

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
   22. КОШИК
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
   23. БЕЗКОШТОВНА ДОСТАВКА
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
   24. ВІДОБРАЖЕННЯ КОШИКА
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
   25. КОШИК — ВІДКРИТТЯ
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
   26. МОБІЛЬНЕ МЕНЮ
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
   27. ПОДІЇ
   ========================================================== */

function bindEvents() {

  document.addEventListener(
    "click",
    event => {
      const filterButton =
        event.target.closest(
          "[data-feedback-filter]"
        );

      if (
        !filterButton
      ) {
        return;
      }

      activeFeedbackFilter =
        filterButton.dataset
          .feedbackFilter ||
        "all";

      updateFilterButtons();
      renderReviews();
    }
  );


  elements.leaveReviewButton
    ?.addEventListener(
      "click",
      () =>
        openFeedbackModal(
          "review"
        )
    );


  elements.emptyReviewButton
    ?.addEventListener(
      "click",
      () =>
        openFeedbackModal(
          "review"
        )
    );


  elements.askQuestionButton
    ?.addEventListener(
      "click",
      () =>
        openFeedbackModal(
          "question"
        )
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


  elements.cartItems
    ?.addEventListener(
      "click",
      event => {
        const change =
          event.target.closest(
            "[data-cart-change]"
          );

        if (
          change
        ) {
          changeCartQuantity(
            change.dataset
              .cartItem,

            safeNumber(
              change.dataset
                .cartChange,
              0
            )
          );

          return;
        }

        const remove =
          event.target.closest(
            "[data-cart-remove]"
          );

        if (
          remove
        ) {
          removeCartItem(
            remove.dataset
              .cartRemove
          );
        }
      }
    );


  elements.checkoutButton
    ?.addEventListener(
      "click",
      event => {
        if (
          !cart.length
        ) {
          event.preventDefault();
        }
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


  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key !==
        "Escape"
      ) {
        return;
      }

      closeFeedbackModal();
      closeMobileMenu();
      closeCart();
    }
  );
}


/* ==========================================================
   28. СТАРТ
   ========================================================== */

bindEvents();

updateFilterButtons();

renderCart();

loadStore();
