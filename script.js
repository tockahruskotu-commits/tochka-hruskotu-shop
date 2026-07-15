const CART_STORAGE_KEY = "tochka_hruskotu_cart_v1";

let cart = loadCart();

const productGrid = document.getElementById("productGrid");
const cartButton = document.getElementById("cartButton");
const cartCount = document.getElementById("cartCount");
const cartPanel = document.getElementById("cartPanel");
const cartOverlay = document.getElementById("cartOverlay");
const closeCartButton = document.getElementById("closeCartButton");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const checkoutButton = document.getElementById("checkoutButton");

function formatMoney(value) {
  return new Intl.NumberFormat("uk-UA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value) + " грн";
}

function loadCart() {
  try {
    const storedCart = localStorage.getItem(CART_STORAGE_KEY);

    if (!storedCart) {
      return [];
    }

    const parsedCart = JSON.parse(storedCart);

    return Array.isArray(parsedCart) ? parsedCart : [];
  } catch (error) {
    console.error("Не вдалося прочитати кошик:", error);
    return [];
  }
}

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function renderProducts() {
  const availableProducts = PRODUCTS.filter(
    product => product.available
  );

  productGrid.innerHTML = availableProducts
    .map(product => {
      const sauceOptions = product.sauces
        .map(
          sauce =>
            `<option value="${sauce}">${sauce}</option>`
        )
        .join("");

      return `
        <article class="product-card">
          <div class="product-visual">
            <span>${product.name}</span>
          </div>

          <div class="product-content">
            <p class="product-category">
              ${product.category}
            </p>

            <h3 class="product-title">
              ${product.name}
            </h3>

            <p class="product-description">
              ${product.description}
            </p>

            <p class="product-weight">
              ${product.weight}
            </p>

            <div class="product-price">
              ${formatMoney(product.price)}
            </div>

            <label
              class="product-label"
              for="sauce-${product.id}"
            >
              Оберіть соус
            </label>

            <select
              class="product-select"
              id="sauce-${product.id}"
              data-sauce-select="${product.id}"
            >
              ${sauceOptions}
            </select>

            <button
              class="add-button"
              type="button"
              data-add-product="${product.id}"
            >
              Додати до кошика
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function addProductToCart(productId) {
  const product = PRODUCTS.find(item => item.id === productId);

  if (!product || !product.available) {
    return;
  }

  const sauceSelect = document.querySelector(
    `[data-sauce-select="${productId}"]`
  );

  const selectedSauce = sauceSelect
    ? sauceSelect.value
    : "";

  const cartItemId = `${product.id}__${selectedSauce}`;

  const existingItem = cart.find(
    item => item.cartItemId === cartItemId
  );

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      cartItemId,
      productId: product.id,
      code: product.code,
      name: product.name,
      price: product.price,
      weight: product.weight,
      sauce: selectedSauce,
      quantity: 1
    });
  }

  saveCart();
  renderCart();
  openCart();
}

function changeQuantity(cartItemId, change) {
  const item = cart.find(
    cartItem => cartItem.cartItemId === cartItemId
  );

  if (!item) {
    return;
  }

  item.quantity += change;

  if (item.quantity <= 0) {
    cart = cart.filter(
      cartItem => cartItem.cartItemId !== cartItemId
    );
  }

  saveCart();
  renderCart();
}

function removeCartItem(cartItemId) {
  cart = cart.filter(
    item => item.cartItemId !== cartItemId
  );

  saveCart();
  renderCart();
}

function calculateCartTotal() {
  return cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
}

function calculateCartCount() {
  return cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
}

function renderCart() {
  cartCount.textContent = calculateCartCount();

  if (cart.length === 0) {
    cartItems.innerHTML = `
      <div class="empty-cart">
        Кошик поки порожній.
      </div>
    `;

    cartTotal.textContent = formatMoney(0);
    checkoutButton.disabled = true;
    return;
  }

  cartItems.innerHTML = cart
    .map(item => {
      const itemTotal = item.price * item.quantity;

      return `
        <article class="cart-item">
          <p class="cart-item-title">
            ${item.name}
          </p>

          <p class="cart-item-sauce">
            Соус: ${item.sauce}
          </p>

          <div class="cart-item-bottom">
            <div class="quantity-control">
              <button
                class="quantity-button"
                type="button"
                data-quantity-change="-1"
                data-cart-item="${item.cartItemId}"
                aria-label="Зменшити кількість"
              >
                −
              </button>

              <span class="quantity-value">
                ${item.quantity}
              </span>

              <button
                class="quantity-button"
                type="button"
                data-quantity-change="1"
                data-cart-item="${item.cartItemId}"
                aria-label="Збільшити кількість"
              >
                +
              </button>
            </div>

            <div class="cart-item-price">
              ${formatMoney(itemTotal)}
            </div>
          </div>

          <button
            class="remove-button"
            type="button"
            data-remove-item="${item.cartItemId}"
          >
            Видалити
          </button>
        </article>
      `;
    })
    .join("");

  cartTotal.textContent = formatMoney(
    calculateCartTotal()
  );

  checkoutButton.disabled = false;
}

function openCart() {
  cartPanel.classList.add("is-open");
  cartOverlay.classList.add("is-open");
  document.body.classList.add("cart-open");
  cartPanel.setAttribute("aria-hidden", "false");
}

function closeCart() {
  cartPanel.classList.remove("is-open");
  cartOverlay.classList.remove("is-open");
  document.body.classList.remove("cart-open");
  cartPanel.setAttribute("aria-hidden", "true");
}

productGrid.addEventListener("click", event => {
  const addButton = event.target.closest(
    "[data-add-product]"
  );

  if (!addButton) {
    return;
  }

  addProductToCart(addButton.dataset.addProduct);
});

cartItems.addEventListener("click", event => {
  const quantityButton = event.target.closest(
    "[data-quantity-change]"
  );

  if (quantityButton) {
    changeQuantity(
      quantityButton.dataset.cartItem,
      Number(quantityButton.dataset.quantityChange)
    );

    return;
  }

  const removeButton = event.target.closest(
    "[data-remove-item]"
  );

  if (removeButton) {
    removeCartItem(removeButton.dataset.removeItem);
  }
});

cartButton.addEventListener("click", openCart);
closeCartButton.addEventListener("click", closeCart);
cartOverlay.addEventListener("click", closeCart);

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeCart();
  }
});

checkoutButton.addEventListener("click", () => {
  alert(
    "Форму оформлення замовлення підключимо на наступному етапі."
  );
});

renderProducts();
renderCart();
