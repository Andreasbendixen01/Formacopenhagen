/* ==========================================================
   FORMA — SAVED PRODUCTS PAGE
   ========================================================== */

(() => {
  const container = document.querySelector("#FormaSavedProducts");
  const emptyState = document.querySelector("#FormaEmptyState");

  if (!container || !emptyState || !window.Forma) return;

  async function fetchProduct(handle) {
    const response = await fetch(`/products/${handle}.js`);

    if (!response.ok) {
      throw new Error(`Could not load product: ${handle}`);
    }

    return response.json();
  }

  function formatMoney(cents) {
    return new Intl.NumberFormat("da-DK", {
      style: "currency",
      currency: "DKK",
      minimumFractionDigits: 0
    }).format(cents / 100);
  }

  function createProductCard(product) {
    const image =
      product.featured_image ||
      product.images?.[0] ||
      "";

    const card = document.createElement("article");

    card.className = "forma-saved-card";

    card.innerHTML = `
      <div class="forma-saved-card__media">
        <a href="${product.url}">
          <img
            src="${image}"
            alt="${product.title}"
            loading="lazy"
          >
        </a>

        <button
          class="forma-save-button forma-save-button--card"
          type="button"
          data-forma-save
          data-product-id="${product.id}"
          data-product-handle="${product.handle}"
          aria-pressed="true"
          aria-label="Remove ${product.title} from Your Forma"
        >
          <span class="forma-save-button__icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 21s-7-4.35-9.5-8C.5 9.5 2.4 5 6.8 5c2.1 0 3.5 1.2 5.2 3 1.7-1.8 3.1-3 5.2-3C21.6 5 23.5 9.5 21.5 13 19 16.65 12 21 12 21z"/>
            </svg>
          </span>
        </button>
      </div>

      <div class="forma-saved-card__content">
        <p class="forma-saved-card__vendor">
          ${product.vendor || ""}
        </p>

        <h2 class="forma-saved-card__title">
          <a href="${product.url}">
            ${product.title}
          </a>
        </h2>

        <p class="forma-saved-card__price">
          ${formatMoney(product.price)}
        </p>
      </div>
    `;

    return card;
  }

  async function renderSavedProducts() {
    container.setAttribute("aria-busy", "true");
    const savedProducts = window.Forma.getSavedProducts();

    container.innerHTML = "";

    if (!savedProducts.length) {
      emptyState.hidden = false;
      return;

      container.setAttribute("aria-busy", "false");
    }

    emptyState.hidden = true;

    const validProducts = savedProducts.filter(
      (product) => product && product.handle
    );

    const results = await Promise.allSettled(
      validProducts.map((product) =>
        fetchProduct(product.handle)
      )
    );

    results.forEach((result) => {
      if (result.status !== "fulfilled") return;

      const card = createProductCard(result.value);
      container.appendChild(card);
    });

    if (!container.children.length) {
      emptyState.hidden = false;
    }
  }

  document.addEventListener(
  "forma:saved-updated",
  () => {
    renderSavedProducts();
  }
);

  renderSavedProducts();
})();