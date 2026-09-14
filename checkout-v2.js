/* ============================================================
   ТОЧКА ХРУСКОТУ — CHECKOUT V2
   Оформлення замовлення для багатосторінкового сайту
   ============================================================ */


/* ============================================================
   НАЛАШТУВАННЯ
   ============================================================ */

const CHECKOUT_STORE_API_URL =
  "https://script.google.com/macros/s/AKfycbzCgvAMAmqrsK-KsGcPMfx60kvQbZVJII91WVZKIn-KF7bFIA3HKdKe0JmaBu4RZtX31Q/exec";

const CHECKOUT_CART_KEY =
  "tochka_hruskotu_cart_v3";

const CHECKOUT_LEGACY_CART_KEY =
  "tochka_hruskotu_cart_v4";

const CHECKOUT_REQUEST_ID_KEY =
  "tochka_hruskotu_checkout_request_v2";

const CHECKOUT_IBAN =
  "UA033052990000026001000725967";

const CHECKOUT_FREE_DELIVERY_FROM =
  2000;

const CHECKOUT_SOURCE =
  "GitHub Pages — Точка Хрускоту checkout v2";

const CHECKOUT_TIMEOUT_MS =
  15000;


/* ============================================================
   СТАН
   ============================================================ */

let checkoutStore = null;
let checkoutCart = [];
let checkoutSubmitting = false;
let checkoutCompleted = false;


/* ============================================================
   DOM
   ============================================================ */

const checkoutEls = {};

function checkoutCacheElements() {

  checkoutEls.pageLoader =
    document.getElementById("pageLoader");

  checkoutEls.mobileMenu =
    document.getElementById("mobileMenu");

  checkoutEls.mobileMenuOverlay =
    document.getElementById("mobileMenuOverlay");

  checkoutEls.mobileMenuButton =
    document.getElementById("mobileMenuButton");

  checkoutEls.closeMobileMenu =
    document.getElementById("closeMobileMenu");


  checkoutEls.emptyState =
    document.getElementById("checkoutEmpty");

  checkoutEls.checkoutContent =
    document.getElementById("checkoutContent");

  checkoutEls.form =
    document.getElementById("checkoutForm");


  checkoutEls.orderItems =
    document.getElementById("checkoutOrderItems");

  checkoutEls.itemsCount =
    document.getElementById("checkoutItemsCount");

  checkoutEls.subtotal =
    document.getElementById("checkoutSubtotal");

  checkoutEls.deliverySummary =
    document.getElementById("checkoutDeliverySummary");

  checkoutEls.total =
    document.getElementById("checkoutTotal");

  checkoutEls.freeDeliveryNote =
    document.getElementById("checkoutFreeDeliveryNote");


  checkoutEls.customerName =
    document.getElementById("customerName");

  checkoutEls.customerSurname =
    document.getElementById("customerSurname");

  checkoutEls.customerPhone =
    document.getElementById("customerPhone");


  checkoutEls.deliveryMethod =
    document.getElementById("deliveryMethod");

  checkoutEls.deliveryNote =
    document.getElementById("deliveryNote");


  checkoutEls.regionField =
    document.getElementById("regionField");

  checkoutEls.cityField =
    document.getElementById("cityField");

  checkoutEls.branchField =
    document.getElementById("branchField");


  checkoutEls.customerRegion =
    document.getElementById("customerRegion");

  checkoutEls.customerCity =
    document.getElementById("customerCity");

  checkoutEls.deliveryBranch =
    document.getElementById("deliveryBranch");

  checkoutEls.deliveryBranchLabel =
    document.getElementById("deliveryBranchLabel");


  checkoutEls.desiredDate =
    document.getElementById("desiredDate");


  checkoutEls.paymentMethod =
    document.getElementById("paymentMethod");

  checkoutEls.paymentNote =
    document.getElementById("paymentNote");


  checkoutEls.isGift =
    document.getElementById("isGift");

  checkoutEls.giftNote =
    document.getElementById("giftNote");


  checkoutEls.hasCertificate =
    document.getElementById("hasCertificate");

  checkoutEls.certificateField =
    document.getElementById("certificateField");

  checkoutEls.certificateCode =
    document.getElementById("certificateCode");


  checkoutEls.customerComment =
    document.getElementById("customerComment");

  checkoutEls.termsAccepted =
    document.getElementById("termsAccepted");


  checkoutEls.orderStatus =
    document.getElementById("orderStatus");

  checkoutEls.submitButton =
    document.getElementById("submitOrderButton");


  checkoutEls.successBox =
    document.getElementById("checkoutSuccess");

  checkoutEls.successOrderNumber =
    document.getElementById("successOrderNumber");

  checkoutEls.successTotal =
    document.getElementById("successTotal");

  checkoutEls.successPaymentBlock =
    document.getElementById("successPaymentBlock");

  checkoutEls.successIban =
    document.getElementById("successIban");

  checkoutEls.successPurpose =
    document.getElementById("successPurpose");

  checkoutEls.successContactText =
    document.getElementById("successContactText");

  checkoutEls.copyIbanButton =
    document.getElementById("copySuccessIban");

  checkoutEls.copyPurposeButton =
    document.getElementById("copyPaymentPurpose");


  checkoutEls.headerCartCount =
    document.getElementById("cartCount");

  checkoutEls.headerCartButton =
    document.getElementById("cartButton");
}


/* ============================================================
   ДОПОМІЖНІ ФУНКЦІЇ
   ============================================================ */

function checkoutEscapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function checkoutFormatMoney(value) {

  const number =
    Number(value || 0);

  return new Intl.NumberFormat(
    "uk-UA",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }
  ).format(number) + " грн";
}


function checkoutReadJson(
  key,
  fallback
) {

  try {

    const raw =
      localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw);

  } catch (error) {

    console.warn(
      "Не вдалося прочитати:",
      key,
      error
    );

    return fallback;
  }
}


function checkoutWriteJson(
  key,
  value
) {

  try {

    localStorage.setItem(
      key,
      JSON.stringify(value)
    );

  } catch (error) {

    console.warn(
      "Не вдалося зберегти:",
      key,
      error
    );
  }
}


function checkoutRemoveStorage(key) {

  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(error);
  }
}


function checkoutHideLoader() {

  if (!checkoutEls.pageLoader) {
    return;
  }

  checkoutEls.pageLoader.classList.add(
    "is-hidden"
  );

  setTimeout(
    function () {

      if (checkoutEls.pageLoader) {
        checkoutEls.pageLoader.hidden = true;
      }

    },
    250
  );
}


function checkoutShowStatus(
  type,
  message
) {

  if (!checkoutEls.orderStatus) {
    return;
  }

  checkoutEls.orderStatus.className =
    "checkout-status";

  if (type) {
    checkoutEls.orderStatus.classList.add(
      type
    );
  }

  checkoutEls.orderStatus.textContent =
    message || "";
}


/* ============================================================
   КОШИК
   ============================================================ */

function checkoutLoadCart() {

  let cart =
    checkoutReadJson(
      CHECKOUT_CART_KEY,
      []
    );

  /*
   * Резервна сумісність зі старою версією сайту.
   * Якщо у v3 порожньо, але залишився старий кошик v4,
   * переносимо його в актуальний ключ.
   */

  if (
    (!Array.isArray(cart) || !cart.length)
  ) {

    const oldCart =
      checkoutReadJson(
        CHECKOUT_LEGACY_CART_KEY,
        []
      );

    if (
      Array.isArray(oldCart) &&
      oldCart.length
    ) {

      cart = oldCart;

      checkoutWriteJson(
        CHECKOUT_CART_KEY,
        cart
      );
    }
  }

  if (!Array.isArray(cart)) {
    cart = [];
  }

  return cart
    .filter(function (item) {

      return (
        item &&
        String(item.code || "").trim() &&
        Number(item.quantity || 0) > 0
      );

    })
    .map(function (item) {

      return {
        ...item,
        quantity:
          Math.max(
            1,
            Math.floor(
              Number(item.quantity || 1)
            )
          )
      };
    });
}


function checkoutCartCount() {

  return checkoutCart.reduce(
    function (sum, item) {

      return (
        sum +
        Number(item.quantity || 0)
      );

    },
    0
  );
}


function checkoutCartSubtotal() {

  return checkoutCart.reduce(
    function (sum, item) {

      return (
        sum +
        (
          Number(item.price || 0) *
          Number(item.quantity || 0)
        )
      );

    },
    0
  );
}


function checkoutClearCart() {

  checkoutCart = [];

  checkoutWriteJson(
    CHECKOUT_CART_KEY,
    []
  );

  /*
   * Після успішного замовлення
   * прибираємо і старий ключ,
   * щоб він випадково не відновив кошик.
   */

  checkoutRemoveStorage(
    CHECKOUT_LEGACY_CART_KEY
  );

  checkoutUpdateHeaderCart();
}


function checkoutUpdateHeaderCart() {

  if (checkoutEls.headerCartCount) {

    checkoutEls.headerCartCount.textContent =
      String(
        checkoutCartCount()
      );
  }
}


/* ============================================================
   ДАНІ МАГАЗИНУ
   ============================================================ */

async function checkoutFetchStore() {

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      function () {
        controller.abort();
      },
      CHECKOUT_TIMEOUT_MS
    );

  try {

    const response =
      await fetch(
        CHECKOUT_STORE_API_URL +
        "?action=store&_=" +
        Date.now(),
        {
          method: "GET",
          redirect: "follow",
          signal: controller.signal
        }
      );

    if (!response.ok) {

      throw new Error(
        "Сервер відповів " +
        response.status
      );
    }

    const result =
      await response.json();

    if (!result?.success) {

      throw new Error(
        result?.error ||
        "Не вдалося завантажити дані магазину."
      );
    }

    return result;

  } finally {

    clearTimeout(timer);
  }
}


/* ============================================================
   ТОВАР
   ============================================================ */

function checkoutFindProduct(code) {

  const normalized =
    String(code || "")
      .trim()
      .toUpperCase();

  return (
    checkoutStore?.products || []
  ).find(function (product) {

    return (
      String(product.code || "")
        .trim()
        .toUpperCase() ===
      normalized
    );

  }) || null;
}


function checkoutFindVariant(
  product,
  variantValue
) {

  if (
    !product ||
    !variantValue
  ) {
    return null;
  }

  return (
    product.variants || []
  ).find(function (variant) {

    return (
      String(variant.value || "").trim() ===
      String(variantValue || "").trim()
    );

  }) || null;
}


function checkoutItemPrice(item) {

  const directPrice =
    Number(item.price || 0);

  if (directPrice > 0) {
    return directPrice;
  }

  const product =
    checkoutFindProduct(
      item.code
    );

  if (!product) {
    return 0;
  }

  const variant =
    checkoutFindVariant(
      product,
      item.variantValue
    );

  if (variant) {

    return Number(
      variant.effectivePrice ||
      variant.regularPrice ||
      0
    );
  }

  return Number(
    product.effectivePrice ||
    product.regularPrice ||
    0
  );
}


function checkoutItemName(item) {

  if (
    String(item.name || "").trim()
  ) {

    return String(item.name).trim();
  }

  const product =
    checkoutFindProduct(
      item.code
    );

  return (
    product?.name ||
    item.code ||
    "Товар"
  );
}


function checkoutItemPhoto(item) {

  if (
    String(item.image || "").trim()
  ) {
    return item.image;
  }

  if (
    String(item.photo || "").trim()
  ) {
    return item.photo;
  }

  const product =
    checkoutFindProduct(
      item.code
    );

  return (
    product?.photos?.[0] ||
    "images/brand/logo.webp"
  );
}


function checkoutItemMeta(item) {

  const parts = [];

  if (
    String(item.variantValue || "").trim()
  ) {

    parts.push(
      String(item.variantValue).trim()
    );
  }

  const sauces =
    Array.isArray(item.sauces)
      ? item.sauces.filter(Boolean)
      : [];

  if (sauces.length) {

    parts.push(
      "Соус: " +
      sauces.join(", ")
    );
  }

  return parts;
}


/* ============================================================
   ПІДСУМОК ЗАМОВЛЕННЯ
   ============================================================ */

function checkoutRenderOrderSummary() {

  if (!checkoutCart.length) {

    if (checkoutEls.emptyState) {
      checkoutEls.emptyState.hidden = false;
    }

    if (checkoutEls.checkoutContent) {
      checkoutEls.checkoutContent.hidden = true;
    }

    checkoutUpdateHeaderCart();

    return;
  }


  if (checkoutEls.emptyState) {
    checkoutEls.emptyState.hidden = true;
  }

  if (
    checkoutEls.checkoutContent &&
    !checkoutCompleted
  ) {
    checkoutEls.checkoutContent.hidden = false;
  }


  if (checkoutEls.orderItems) {

    checkoutEls.orderItems.innerHTML =
      checkoutCart
        .map(function (item) {

          const price =
            checkoutItemPrice(item);

          const quantity =
            Number(item.quantity || 1);

          const total =
            price * quantity;

          const meta =
            checkoutItemMeta(item);

          return `
            <article class="checkout-order-item">

              <img
                src="${checkoutEscapeHtml(
                  checkoutItemPhoto(item)
                )}"
                alt=""
                width="72"
                height="72"
                loading="lazy"
              >

              <div class="checkout-order-item-info">

                <strong>
                  ${checkoutEscapeHtml(
                    checkoutItemName(item)
                  )}
                </strong>

                ${
                  meta.length
                    ? `
                      <span>
                        ${meta
                          .map(checkoutEscapeHtml)
                          .join(" · ")}
                      </span>
                    `
                    : ""
                }

                <small>
                  ${quantity} ×
                  ${checkoutFormatMoney(price)}
                </small>

              </div>

              <strong class="checkout-order-item-total">
                ${checkoutFormatMoney(total)}
              </strong>

            </article>
          `;

        })
        .join("");
  }


  const count =
    checkoutCartCount();

  const subtotal =
    checkoutCart.reduce(
      function (sum, item) {

        return (
          sum +
          (
            checkoutItemPrice(item) *
            Number(item.quantity || 1)
          )
        );

      },
      0
    );


  if (checkoutEls.itemsCount) {

    checkoutEls.itemsCount.textContent =
      String(count);
  }


  if (checkoutEls.subtotal) {

    checkoutEls.subtotal.textContent =
      checkoutFormatMoney(
        subtotal
      );
  }


  if (checkoutEls.total) {

    checkoutEls.total.textContent =
      checkoutFormatMoney(
        subtotal
      );
  }


  if (checkoutEls.freeDeliveryNote) {

    const selectedCode =
      checkoutEls.deliveryMethod?.value ||
      "";

    const localCodes = [
      "LOCAL_MLYNIV",
      "LOCAL_DUBNO",
      "LOCAL_RIVNE",
      "PICKUP"
    ];

    if (
      localCodes.includes(
        selectedCode
      )
    ) {

      checkoutEls.freeDeliveryNote.textContent =
        "Цей спосіб отримання — безкоштовний.";

    } else if (
      subtotal >=
      CHECKOUT_FREE_DELIVERY_FROM
    ) {

      checkoutEls.freeDeliveryNote.textContent =
        "Для цього замовлення доставка у відділення або поштомат — за наш рахунок.";

    } else {

      const left =
        Math.max(
          0,
          CHECKOUT_FREE_DELIVERY_FROM -
          subtotal
        );

      checkoutEls.freeDeliveryNote.textContent =
        "До безкоштовної доставки у відділення або поштомат залишилося " +
        checkoutFormatMoney(left) +
        ".";
    }
  }


  checkoutUpdateHeaderCart();
}


/* ============================================================
   ДОСТАВКА
   ============================================================ */

function checkoutGetDeliveryMethods() {

  return Array.isArray(
    checkoutStore?.deliveryMethods
  )
    ? checkoutStore.deliveryMethods
    : [];
}


function checkoutSelectedDelivery() {

  const code =
    checkoutEls.deliveryMethod?.value ||
    "";

  return checkoutGetDeliveryMethods()
    .find(function (method) {

      return (
        String(method.code || "") ===
        code
      );

    }) || null;
}


function checkoutPopulateDelivery() {

  if (!checkoutEls.deliveryMethod) {
    return;
  }

  const methods =
    checkoutGetDeliveryMethods();

  checkoutEls.deliveryMethod.innerHTML =
    `
      <option value="">
        Оберіть спосіб отримання
      </option>
    ` +
    methods
      .map(function (method) {

        return `
          <option
            value="${checkoutEscapeHtml(
              method.code
            )}"
          >
            ${checkoutEscapeHtml(
              method.name
            )}
          </option>
        `;

      })
      .join("");


  checkoutUpdateDeliveryFields();
}


function checkoutLocalLocationByCode(
  code
) {

  switch (code) {

    case "LOCAL_MLYNIV":
      return {
        region:
          "Рівненська область",
        city:
          "Млинів"
      };

    case "LOCAL_DUBNO":
      return {
        region:
          "Рівненська область",
        city:
          "Дубно"
      };

    case "LOCAL_RIVNE":
      return {
        region:
          "Рівненська область",
        city:
          "Рівне"
      };

    case "PICKUP":
      return {
        region:
          "Рівненська область",
        city:
          "Млинів"
      };

    default:
      return null;
  }
}


function checkoutUpdateDeliveryFields() {

  const method =
    checkoutSelectedDelivery();


  if (!method) {

    if (checkoutEls.regionField) {
      checkoutEls.regionField.hidden = true;
    }

    if (checkoutEls.cityField) {
      checkoutEls.cityField.hidden = true;
    }

    if (checkoutEls.branchField) {
      checkoutEls.branchField.hidden = true;
    }

    if (checkoutEls.deliveryNote) {
      checkoutEls.deliveryNote.textContent = "";
    }

    if (checkoutEls.deliverySummary) {
      checkoutEls.deliverySummary.textContent =
        "Оберіть спосіб отримання";
    }

    checkoutPopulatePayment();
    checkoutRenderOrderSummary();

    return;
  }


  if (checkoutEls.regionField) {

    checkoutEls.regionField.hidden =
      !Boolean(
        method.requireRegion
      );
  }


  if (checkoutEls.cityField) {

    checkoutEls.cityField.hidden =
      !Boolean(
        method.requireCity
      );
  }


  if (checkoutEls.branchField) {

    checkoutEls.branchField.hidden =
      !Boolean(
        method.requireBranch
      );
  }


  if (
    checkoutEls.customerRegion
  ) {

    checkoutEls.customerRegion.required =
      Boolean(method.requireRegion);

    if (!method.requireRegion) {
      checkoutEls.customerRegion.value =
        "";
    }
  }


  if (
    checkoutEls.customerCity
  ) {

    checkoutEls.customerCity.required =
      Boolean(method.requireCity);

    if (!method.requireCity) {
      checkoutEls.customerCity.value =
        "";
    }
  }


  if (
    checkoutEls.deliveryBranch
  ) {

    checkoutEls.deliveryBranch.required =
      Boolean(method.requireBranch);

    if (!method.requireBranch) {
      checkoutEls.deliveryBranch.value =
        "";
    }

    checkoutEls.deliveryBranch.placeholder =
      method.branchPlaceholder ||
      "";
  }


  if (
    checkoutEls.deliveryBranchLabel
  ) {

    checkoutEls.deliveryBranchLabel.textContent =
      method.branchLabel ||
      "Відділення / поштомат";
  }


  if (checkoutEls.deliveryNote) {

    checkoutEls.deliveryNote.textContent =
      method.note || "";
  }


  if (checkoutEls.deliverySummary) {

    checkoutEls.deliverySummary.textContent =
      method.name || "";
  }


  checkoutPopulatePayment();
  checkoutRenderOrderSummary();
}


/* ============================================================
   ОПЛАТА
   ============================================================ */

function checkoutGetPaymentMethods() {

  return Array.isArray(
    checkoutStore?.paymentMethods
  )
    ? checkoutStore.paymentMethods
    : [];
}


function checkoutPopulatePayment() {

  if (!checkoutEls.paymentMethod) {
    return;
  }

  const delivery =
    checkoutSelectedDelivery();

  const deliveryCode =
    delivery?.code || "";

  const allPayments =
    checkoutGetPaymentMethods();


  /*
   * На новому сайті не показуємо покупцеві
   * два майже однакові безготівкові способи.
   *
   * Основний спосіб:
   * IBAN_FOP.
   *
   * CARD_FOP використаємо тільки як резерв,
   * якщо IBAN чомусь не повернувся з API.
   */

  let bankPayment =
    allPayments.find(
      function (payment) {

        return (
          payment.code ===
          "IBAN_FOP"
        );

      }
    );


  if (!bankPayment) {

    bankPayment =
      allPayments.find(
        function (payment) {

          return (
            payment.code ===
            "CARD_FOP"
          );

        }
      );
  }


  const options = [];

  if (bankPayment) {
    options.push(bankPayment);
  }


  /*
   * Готівку показуємо тільки
   * для самовивозу.
   */

  if (
    deliveryCode === "PICKUP"
  ) {

    const cash =
      allPayments.find(
        function (payment) {

          return (
            payment.code ===
            "CASH_PICKUP"
          );

        }
      );

    if (cash) {
      options.push(cash);
    }
  }


  const previousValue =
    checkoutEls.paymentMethod.value;


  checkoutEls.paymentMethod.innerHTML =
    `
      <option value="">
        Оберіть спосіб оплати
      </option>
    ` +
    options
      .map(function (payment) {

        const label =
          payment.code === "IBAN_FOP"
            ? "Оплата на рахунок за IBAN"
            : payment.name;

        return `
          <option
            value="${checkoutEscapeHtml(
              payment.code
            )}"
          >
            ${checkoutEscapeHtml(
              label
            )}
          </option>
        `;

      })
      .join("");


  if (
    options.some(
      function (payment) {

        return (
          payment.code ===
          previousValue
        );

      }
    )
  ) {

    checkoutEls.paymentMethod.value =
      previousValue;

  } else if (
    options.length === 1
  ) {

    checkoutEls.paymentMethod.value =
      options[0].code;
  }


  checkoutUpdatePaymentNote();
}


function checkoutSelectedPayment() {

  const code =
    checkoutEls.paymentMethod?.value ||
    "";

  return checkoutGetPaymentMethods()
    .find(function (payment) {

      return (
        payment.code === code
      );

    }) || null;
}


function checkoutUpdatePaymentNote() {

  if (!checkoutEls.paymentNote) {
    return;
  }

  const code =
    checkoutEls.paymentMethod?.value ||
    "";

  if (
    code === "IBAN_FOP" ||
    code === "CARD_FOP"
  ) {

    checkoutEls.paymentNote.textContent =
      "Після оформлення замовлення ми зв’яжемося з вами, підтвердимо деталі та надішлемо реквізити для оплати у повідомленні.";

    return;
  }


  if (
    code === "CASH_PICKUP"
  ) {

    checkoutEls.paymentNote.textContent =
      "Оплата готівкою під час самовивозу.";

    return;
  }


  checkoutEls.paymentNote.textContent =
    "";
}


/* ============================================================
   ПОДАРУНОК
   ============================================================ */

function checkoutUpdateGift() {

  if (!checkoutEls.giftNote) {
    return;
  }

  checkoutEls.giftNote.hidden =
    !Boolean(
      checkoutEls.isGift?.checked
    );
}


/* ============================================================
   СЕРТИФІКАТ
   ============================================================ */

function checkoutUpdateCertificate() {

  const enabled =
    Boolean(
      checkoutEls.hasCertificate?.checked
    );

  if (checkoutEls.certificateField) {

    checkoutEls.certificateField.hidden =
      !enabled;
  }


  if (checkoutEls.certificateCode) {

    checkoutEls.certificateCode.required =
      enabled;

    if (!enabled) {

      checkoutEls.certificateCode.value =
        "";
    }
  }
}


/* ============================================================
   ТЕЛЕФОН
   ============================================================ */

function checkoutNormalizePhone(value) {

  let digits =
    String(value || "")
      .replace(/\D/g, "");


  if (
    digits.length === 10 &&
    digits.startsWith("0")
  ) {

    digits =
      "38" + digits;
  }


  if (
    digits.length === 11 &&
    digits.startsWith("80")
  ) {

    digits =
      "3" + digits;
  }


  if (
    digits.length > 12
  ) {

    digits =
      digits.slice(0, 12);
  }


  return digits;
}


function checkoutFormatPhone(value) {

  let digits =
    checkoutNormalizePhone(value);


  if (!digits) {
    return "";
  }


  if (
    digits.startsWith("380")
  ) {

    const operator =
      digits.slice(3, 5);

    const first =
      digits.slice(5, 8);

    const second =
      digits.slice(8, 10);

    const third =
      digits.slice(10, 12);


    let result = "+380";

    if (operator) {
      result += " " + operator;
    }

    if (first) {
      result += " " + first;
    }

    if (second) {
      result += " " + second;
    }

    if (third) {
      result += " " + third;
    }

    return result;
  }


  if (
    digits.startsWith("0")
  ) {

    return digits;
  }


  return "+" + digits;
}


function checkoutPhoneIsValid(value) {

  const digits =
    checkoutNormalizePhone(
      value
    );

  return (
    digits.length === 12 &&
    digits.startsWith("380")
  );
}


/* ============================================================
   ID ЗАПИТУ — ЗАХИСТ ВІД ДУБЛІВ
   ============================================================ */

function checkoutGetRequestId() {

  let id =
    sessionStorage.getItem(
      CHECKOUT_REQUEST_ID_KEY
    );


  if (!id) {

    if (
      window.crypto &&
      typeof window.crypto.randomUUID ===
        "function"
    ) {

      id =
        window.crypto.randomUUID();

    } else {

      id =
        "checkout-" +
        Date.now() +
        "-" +
        Math.random()
          .toString(16)
          .slice(2);
    }


    sessionStorage.setItem(
      CHECKOUT_REQUEST_ID_KEY,
      id
    );
  }


  return id;
}


function checkoutClearRequestId() {

  sessionStorage.removeItem(
    CHECKOUT_REQUEST_ID_KEY
  );
}


/* ============================================================
   ДАНІ КЛІЄНТА
   ============================================================ */

function checkoutCustomerLocation() {

  const delivery =
    checkoutSelectedDelivery();

  if (!delivery) {

    return {
      region: "",
      city: ""
    };
  }


  const local =
    checkoutLocalLocationByCode(
      delivery.code
    );


  if (local) {
    return local;
  }


  return {
    region:
      checkoutEls.customerRegion?.value
        .trim() || "",
    city:
      checkoutEls.customerCity?.value
        .trim() || ""
  };
}


/* ============================================================
   PAYLOAD ДЛЯ APPS SCRIPT
   ============================================================ */

function checkoutCreatePayload() {

  const location =
    checkoutCustomerLocation();

  const giftEnabled =
    Boolean(
      checkoutEls.isGift?.checked
    );

  const certificateEnabled =
    Boolean(
      checkoutEls.hasCertificate?.checked
    );


  return {

    requestId:
      checkoutGetRequestId(),

    customer: {

      name:
        checkoutEls.customerName
          .value
          .trim(),

      surname:
        checkoutEls.customerSurname
          .value
          .trim(),

      phone:
        checkoutEls.customerPhone
          .value
          .trim(),

      region:
        location.region,

      city:
        location.city
    },


    recipient: {},


    delivery: {

      code:
        checkoutEls.deliveryMethod
          .value,

      branch:
        checkoutEls.deliveryBranch
          ?.value
          .trim() || ""
    },


    paymentCode:
      checkoutEls.paymentMethod
        .value,


    desiredDate:
      checkoutEls.desiredDate
        ?.value || "",


    /*
     * У checkout більше не просимо
     * покупця заповнювати десяток
     * подарункових полів.
     *
     * Якщо це подарунок —
     * фіксуємо сам факт.
     * Решту узгоджуємо особисто.
     */

    gift:
      giftEnabled
        ? {
            isGift: true,
            isSurprise: false,
            hidePrice: false,
            wrap: "",
            signatureMode: "",
            hint: "",
            courageScenario: "",
            card: {
              enabled: false
            }
          }
        : {
            isGift: false
          },


    certificateCode:
      certificateEnabled
        ? checkoutEls.certificateCode
            .value
            .trim()
        : "",


    comment:
      checkoutEls.customerComment
        ?.value
        .trim() || "",


    source:
      CHECKOUT_SOURCE,


    items:
      checkoutCart.map(
        function (item) {

          return {

            code:
              item.code,

            quantity:
              Number(
                item.quantity || 1
              ),

            variantValue:
              item.variantValue || "",

            sauces:
              Array.isArray(
                item.sauces
              )
                ? item.sauces
                : []
          };
        }
      )
  };
}


/* ============================================================
   ВАЛІДАЦІЯ
   ============================================================ */

function checkoutValidationMessage() {

  if (
    !checkoutCart.length
  ) {

    return "Кошик порожній.";
  }


  if (
    !checkoutEls.customerName
      .value
      .trim()
  ) {

    checkoutEls.customerName.focus();

    return "Вкажіть, будь ласка, ваше ім’я.";
  }


  if (
    !checkoutEls.customerSurname
      .value
      .trim()
  ) {

    checkoutEls.customerSurname.focus();

    return "Вкажіть, будь ласка, ваше прізвище.";
  }


  if (
    !checkoutEls.customerPhone
      .value
      .trim()
  ) {

    checkoutEls.customerPhone.focus();

    return "Вкажіть номер телефону.";
  }


  if (
    !checkoutPhoneIsValid(
      checkoutEls.customerPhone.value
    )
  ) {

    checkoutEls.customerPhone.focus();

    return "Перевірте номер телефону. Формат: +380XXXXXXXXX.";
  }


  const delivery =
    checkoutSelectedDelivery();


  if (!delivery) {

    checkoutEls.deliveryMethod.focus();

    return "Оберіть спосіб отримання замовлення.";
  }


  if (
    delivery.requireRegion &&
    !checkoutEls.customerRegion
      .value
      .trim()
  ) {

    checkoutEls.customerRegion.focus();

    return "Вкажіть область.";
  }


  if (
    delivery.requireCity &&
    !checkoutEls.customerCity
      .value
      .trim()
  ) {

    checkoutEls.customerCity.focus();

    return "Вкажіть місто або населений пункт.";
  }


  if (
    delivery.requireBranch &&
    !checkoutEls.deliveryBranch
      .value
      .trim()
  ) {

    checkoutEls.deliveryBranch.focus();

    return (
      delivery.branchLabel
        ? "Заповніть поле «" +
          delivery.branchLabel +
          "»."
        : "Вкажіть відділення або поштомат."
    );
  }


  if (
    !checkoutEls.paymentMethod
      .value
  ) {

    checkoutEls.paymentMethod.focus();

    return "Оберіть спосіб оплати.";
  }


  if (
    checkoutEls.hasCertificate
      ?.checked &&
    !checkoutEls.certificateCode
      .value
      .trim()
  ) {

    checkoutEls.certificateCode.focus();

    return "Введіть код подарункового сертифіката.";
  }


  if (
    !checkoutEls.termsAccepted
      .checked
  ) {

    checkoutEls.termsAccepted.focus();

    return "Потрібно погодитися з умовами замовлення і доставки.";
  }


  return "";
}


/* ============================================================
   НАДСИЛАННЯ ЗАМОВЛЕННЯ
   ============================================================ */

async function checkoutSubmitOrder(event) {

  event.preventDefault();


  if (
    checkoutSubmitting ||
    checkoutCompleted
  ) {
    return;
  }


  const validation =
    checkoutValidationMessage();


  if (validation) {

    checkoutShowStatus(
      "error",
      validation
    );

    return;
  }


  checkoutSubmitting = true;

  checkoutEls.submitButton.disabled =
    true;

  checkoutEls.submitButton.textContent =
    "Надсилаємо замовлення...";


  checkoutShowStatus(
    "loading",
    "Передаємо замовлення. Це займе кілька секунд."
  );


  const payload =
    checkoutCreatePayload();


  try {

    const body =
      new URLSearchParams();

    body.set(
      "payload",
      JSON.stringify(payload)
    );


    const response =
      await fetch(
        CHECKOUT_STORE_API_URL,
        {
          method: "POST",
          body: body,
          redirect: "follow"
        }
      );


    if (!response.ok) {

      throw new Error(
        "Сервер відповів " +
        response.status
      );
    }


    const result =
      await response.json();


    if (!result?.success) {

      throw new Error(
        result?.error ||
        "Не вдалося записати замовлення."
      );
    }


    checkoutCompleted = true;


    checkoutShowPurchaseEvent(
      result,
      payload
    );


    checkoutClearCart();
    checkoutClearRequestId();


    checkoutRenderSuccess(
      result,
      payload
    );


  } catch (error) {

    console.error(
      "Помилка оформлення:",
      error
    );


    checkoutShowStatus(
      "error",
      error?.message ||
      "Не вдалося передати замовлення. Спробуйте ще раз."
    );


    checkoutEls.submitButton.disabled =
      false;

    checkoutEls.submitButton.textContent =
      "Оформити замовлення";


  } finally {

    checkoutSubmitting = false;
  }
}


/* ============================================================
   УСПІШНЕ ЗАМОВЛЕННЯ
   ============================================================ */

function checkoutRenderSuccess(
  result,
  payload
) {

  const orderNumber =
    result.orderNumber || "";

  const total =
    Number(
      result.totalAmount ??
      result.productsTotal ??
      checkoutCartSubtotal()
    );


  if (checkoutEls.checkoutContent) {

    checkoutEls.checkoutContent.hidden =
      true;
  }


  if (checkoutEls.emptyState) {

    checkoutEls.emptyState.hidden =
      true;
  }


  if (checkoutEls.successBox) {

    checkoutEls.successBox.hidden =
      false;
  }


  if (
    checkoutEls.successOrderNumber
  ) {

    checkoutEls.successOrderNumber.textContent =
      orderNumber;
  }


  if (
    checkoutEls.successTotal
  ) {

    checkoutEls.successTotal.textContent =
      checkoutFormatMoney(total);
  }


  const isCash =
    payload.paymentCode ===
    "CASH_PICKUP";


  if (
    checkoutEls.successPaymentBlock
  ) {

    checkoutEls.successPaymentBlock.hidden =
      isCash;
  }


  if (
    checkoutEls.successIban
  ) {

    checkoutEls.successIban.textContent =
      CHECKOUT_IBAN;
  }


  if (
    checkoutEls.successPurpose
  ) {

    checkoutEls.successPurpose.textContent =
      orderNumber
        ? "Оплата замовлення " +
          orderNumber
        : "Оплата замовлення";
  }


  if (
    checkoutEls.successContactText
  ) {

    let text =
      "Ми зв’яжемося з вами, підтвердимо деталі замовлення та надішлемо реквізити для оплати у повідомленні.";


    if (isCash) {

      text =
        "Ми зв’яжемося з вами та підтвердимо деталі самовивозу. Оплата — готівкою під час отримання.";
    }


    if (
      payload.gift?.isGift
    ) {

      text +=
        " Також узгодимо всі деталі подарунка.";
    }


    checkoutEls.successContactText.textContent =
      text;
  }


  checkoutShowStatus(
    "",
    ""
  );


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* ============================================================
   КОПІЮВАННЯ
   ============================================================ */

async function checkoutCopyText(
  text,
  button,
  successText
) {

  try {

    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {

      await navigator.clipboard.writeText(
        text
      );

    } else {

      const textarea =
        document.createElement(
          "textarea"
        );

      textarea.value =
        text;

      textarea.setAttribute(
        "readonly",
        ""
      );

      textarea.style.position =
        "fixed";

      textarea.style.opacity =
        "0";

      document.body.appendChild(
        textarea
      );

      textarea.select();

      document.execCommand(
        "copy"
      );

      textarea.remove();
    }


    if (button) {

      const oldText =
        button.textContent;

      button.textContent =
        successText;

      button.classList.add(
        "is-copied"
      );

      setTimeout(
        function () {

          button.textContent =
            oldText;

          button.classList.remove(
            "is-copied"
          );

        },
        2000
      );
    }


  } catch (error) {

    console.error(
      "Не вдалося скопіювати:",
      error
    );
  }
}


/* ============================================================
   GA4
   ============================================================ */

function checkoutGaEvent(
  eventName,
  params
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
      params || {}
    );

  } catch (error) {

    console.warn(
      "GA4:",
      error
    );
  }
}


function checkoutGaItems() {

  return checkoutCart.map(
    function (item) {

      return {

        item_id:
          item.code,

        item_name:
          checkoutItemName(item),

        item_variant:
          item.variantValue || "",

        price:
          checkoutItemPrice(item),

        quantity:
          Number(
            item.quantity || 1
          )
      };
    }
  );
}


function checkoutShowBeginCheckoutEvent() {

  if (!checkoutCart.length) {
    return;
  }

  checkoutGaEvent(
    "begin_checkout",
    {
      currency: "UAH",
      value:
        checkoutCart.reduce(
          function (sum, item) {

            return (
              sum +
              (
                checkoutItemPrice(item) *
                Number(
                  item.quantity || 1
                )
              )
            );

          },
          0
        ),
      items:
        checkoutGaItems()
    }
  );
}


function checkoutShowPurchaseEvent(
  result,
  payload
) {

  checkoutGaEvent(
    "purchase",
    {
      transaction_id:
        result.orderNumber || "",

      currency:
        "UAH",

      value:
        Number(
          result.totalAmount ??
          result.productsTotal ??
          0
        ),

      shipping:
        Number(
          result.deliveryCost || 0
        ),

      items:
        checkoutGaItems(),

      payment_type:
        payload.paymentCode,

      delivery_method:
        payload.delivery?.code || ""
    }
  );
}


/* ============================================================
   МОБІЛЬНЕ МЕНЮ
   ============================================================ */

function checkoutOpenMobileMenu() {

  if (
    !checkoutEls.mobileMenu ||
    !checkoutEls.mobileMenuOverlay
  ) {
    return;
  }

  checkoutEls.mobileMenu.classList.add(
    "is-open"
  );

  checkoutEls.mobileMenuOverlay.hidden =
    false;

  checkoutEls.mobileMenuOverlay.classList.add(
    "is-open"
  );

  checkoutEls.mobileMenu.setAttribute(
    "aria-hidden",
    "false"
  );

  checkoutEls.mobileMenuButton?.setAttribute(
    "aria-expanded",
    "true"
  );

  document.body.classList.add(
    "no-scroll"
  );
}


function checkoutCloseMobileMenu() {

  if (
    !checkoutEls.mobileMenu ||
    !checkoutEls.mobileMenuOverlay
  ) {
    return;
  }

  checkoutEls.mobileMenu.classList.remove(
    "is-open"
  );

  checkoutEls.mobileMenuOverlay.classList.remove(
    "is-open"
  );

  checkoutEls.mobileMenu.setAttribute(
    "aria-hidden",
    "true"
  );

  checkoutEls.mobileMenuButton?.setAttribute(
    "aria-expanded",
    "false"
  );

  document.body.classList.remove(
    "no-scroll"
  );


  setTimeout(
    function () {

      if (
        !checkoutEls.mobileMenu.classList.contains(
          "is-open"
        )
      ) {

        checkoutEls.mobileMenuOverlay.hidden =
          true;
      }

    },
    250
  );
}


/* ============================================================
   ПОДІЇ
   ============================================================ */

function checkoutBindEvents() {

  checkoutEls.form?.addEventListener(
    "submit",
    checkoutSubmitOrder
  );


  checkoutEls.deliveryMethod?.addEventListener(
    "change",
    checkoutUpdateDeliveryFields
  );


  checkoutEls.paymentMethod?.addEventListener(
    "change",
    checkoutUpdatePaymentNote
  );


  checkoutEls.isGift?.addEventListener(
    "change",
    checkoutUpdateGift
  );


  checkoutEls.hasCertificate?.addEventListener(
    "change",
    checkoutUpdateCertificate
  );


  checkoutEls.customerPhone?.addEventListener(
    "input",
    function () {

      const formatted =
        checkoutFormatPhone(
          checkoutEls.customerPhone.value
        );

      checkoutEls.customerPhone.value =
        formatted;
    }
  );


  checkoutEls.customerPhone?.addEventListener(
    "blur",
    function () {

      if (
        checkoutEls.customerPhone.value &&
        checkoutPhoneIsValid(
          checkoutEls.customerPhone.value
        )
      ) {

        checkoutEls.customerPhone.value =
          checkoutFormatPhone(
            checkoutEls.customerPhone.value
          );
      }
    }
  );


  checkoutEls.mobileMenuButton?.addEventListener(
    "click",
    checkoutOpenMobileMenu
  );


  checkoutEls.closeMobileMenu?.addEventListener(
    "click",
    checkoutCloseMobileMenu
  );


  checkoutEls.mobileMenuOverlay?.addEventListener(
    "click",
    checkoutCloseMobileMenu
  );


  checkoutEls.headerCartButton?.addEventListener(
    "click",
    function () {

      const summary =
        document.getElementById(
          "checkoutSummary"
        );

      if (summary) {

        summary.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    }
  );


  checkoutEls.copyIbanButton?.addEventListener(
    "click",
    function () {

      checkoutCopyText(
        CHECKOUT_IBAN,
        checkoutEls.copyIbanButton,
        "IBAN скопійовано"
      );
    }
  );


  checkoutEls.copyPurposeButton?.addEventListener(
    "click",
    function () {

      const text =
        checkoutEls.successPurpose
          ?.textContent
          ?.trim() || "";

      if (!text) {
        return;
      }

      checkoutCopyText(
        text,
        checkoutEls.copyPurposeButton,
        "Призначення скопійовано"
      );
    }
  );


  document.addEventListener(
    "keydown",
    function (event) {

      if (
        event.key === "Escape"
      ) {

        checkoutCloseMobileMenu();
      }
    }
  );
}


/* ============================================================
   МІНІМАЛЬНА ДАТА
   ============================================================ */

function checkoutSetDateMinimum() {

  if (!checkoutEls.desiredDate) {
    return;
  }

  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );


  checkoutEls.desiredDate.min =
    year +
    "-" +
    month +
    "-" +
    day;
}


/* ============================================================
   ІНІЦІАЛІЗАЦІЯ
   ============================================================ */

async function checkoutInit() {

  checkoutCacheElements();

  checkoutCart =
    checkoutLoadCart();

  checkoutUpdateHeaderCart();

  checkoutBindEvents();

  checkoutSetDateMinimum();

  checkoutUpdateGift();

  checkoutUpdateCertificate();


  if (!checkoutCart.length) {

    checkoutRenderOrderSummary();

    checkoutHideLoader();

    return;
  }


  try {

    checkoutStore =
      await checkoutFetchStore();


    checkoutPopulateDelivery();

    checkoutRenderOrderSummary();

    checkoutShowBeginCheckoutEvent();


  } catch (error) {

    console.error(
      "Не вдалося завантажити checkout:",
      error
    );


    checkoutShowStatus(
      "error",
      "Не вдалося завантажити способи доставки й оплати. Оновіть сторінку та спробуйте ще раз."
    );


    if (
      checkoutEls.submitButton
    ) {

      checkoutEls.submitButton.disabled =
        true;
    }


  } finally {

    checkoutHideLoader();
  }
}


/* ============================================================
   СТАРТ
   ============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  checkoutInit
);
