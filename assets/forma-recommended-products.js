/* ==========================================================
   FORMA — RECOMMENDED PRODUCTS UI
   ========================================================== */

(function () {
  "use strict";

  function initRecommendedProducts() {
    const section = document.querySelector(
      "[data-forma-recommended]"
    );

    if (!section) {
      console.warn(
        "[Forma Recommended] Section was not found."
      );

      return;
    }

    const grid = section.querySelector(
      "[data-forma-recommended-grid]"
    );

    const refreshButton = section.querySelector(
      "[data-forma-recommended-refresh]"
    );

    if (!grid) {
      console.warn(
        "[Forma Recommended] Grid was not found."
      );

      return;
    }

    function escapeHtml(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function getHandle(product) {
      return String(
        product?.handle ||
        product?.productHandle ||
        product?.url ||
        ""
      )
        .trim()
        .replace(/^\/products\//, "")
        .split("?")[0]
        .split("#")[0]
        .replace(/\/$/, "");
    }

    function getUrl(product) {
      const handle = getHandle(product);

      return handle
        ? `/products/${handle}`
        : "#";
    }

    function getTitle(product) {
      return String(
        product?.title ||
        product?.name ||
        "Untitled product"
      );
    }

    function getVendor(product) {
      return String(
        product?.vendor ||
        product?.brand ||
        "Forma"
      );
    }

    function getImage(product) {
      const image =
        product?.images?.[0]?.src ||
        product?.images?.[0] ||
        product?.featured_image ||
        product?.featuredImage ||
        product?.image;

      if (typeof image === "string") {
        return image;
      }

      return (
        image?.src ||
        image?.url ||
        ""
      );
    }

    function getProductId(product) {
      return String(
        product?.id ||
        product?.productId ||
        ""
      );
    }

    function getPriceValue(product) {
  const rawPrice =
    product?.variants?.[0]?.price ??
    product?.price ??
    product?.price_min;

  if (
    rawPrice === null ||
    rawPrice === undefined ||
    rawPrice === ""
  ) {
    return null;
  }

  /*
   * products.json returnerer typisk priser
   * som tekst i hovedvalutaen:
   *
   * "1299.00"
   */
  if (typeof rawPrice === "string") {
    const normalizedPrice = rawPrice
      .replace(/\s/g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "");

    const numericPrice =
      Number(normalizedPrice);

    return Number.isFinite(numericPrice)
      ? numericPrice
      : null;
  }

  /*
   * Andre Shopify-endpoints kan returnere
   * beløbet som et heltal i øre.
   */
  const numericPrice =
    Number(rawPrice);

  if (!Number.isFinite(numericPrice)) {
    return null;
  }

  return Number.isInteger(numericPrice) &&
    numericPrice >= 10000
      ? numericPrice / 100
      : numericPrice;
}

function formatMoney(amount) {
  if (amount === null) {
    return "";
  }

  return new Intl.NumberFormat(
    "da-DK",
    {
      style: "currency",
      currency: "DKK",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }
  ).format(amount);
}

    function getReason(product) {
      return (
        window.Forma?.recommendations
          ?.getExplanation?.(product) ||
        product
          ?.formaRecommendation
          ?.primaryReason ||
        "Selected for your Forma"
      );
    }

    function isSaved(product) {
      const productId =
        getProductId(product);

      const handle =
        getHandle(product);

      try {
        const savedProducts =
          window.Forma?.savedProducts
            ?.getAll?.() || [];

        return savedProducts.some(saved => {
          const savedId =
            String(
              saved?.id ||
              saved?.productId ||
              ""
            );

          const savedHandle =
            getHandle(saved);

          return (
            (productId &&
              savedId === productId) ||
            (handle &&
              savedHandle === handle)
          );
        });
      } catch (error) {
        return false;
      }
    }

    function renderImage(
      image,
      title
    ) {
      if (!image) {
        return "";
      }

      return `
        <img
          class="forma-recommended-card__image"
          src="${escapeHtml(image)}"
          alt="${escapeHtml(title)}"
          loading="lazy"
        >
      `;
    }

    function createCard(
      product,
      index
    ) {
      const title =
        getTitle(product);

      const vendor =
        getVendor(product);

      const image =
        getImage(product);

      const url =
        getUrl(product);

      const price =
        formatMoney(
          getPriceValue(product)
        );

      const reason =
        getReason(product);

      const productId =
        getProductId(product);

      const handle =
        getHandle(product);

      const saved =
        isSaved(product);

      return `
        <article
          class="forma-recommended-card"
          data-recommended-product
          data-product-id="${escapeHtml(productId)}"
          data-product-handle="${escapeHtml(handle)}"
        >
          <div class="forma-recommended-card__media">
  <a
    href="${escapeHtml(url)}"
    class="forma-recommended-card__media-link"
    aria-label="View ${escapeHtml(title)}"
  >
    <p class="forma-recommended-card__number">
      ${String(index + 1).padStart(2, "0")}
    </p>

    ${renderImage(image, title)}

    <p class="forma-recommended-card__reason">
      ${escapeHtml(reason)}
    </p>
  </a>

  <button
    class="forma-recommended-card__save"
    type="button"
    aria-label="${
      saved
        ? "Remove from Your Forma"
        : "Save to Your Forma"
    }"
    aria-pressed="${saved}"
    data-recommended-save
  >
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
      ></path>
    </svg>
  </button>
</div>

          <div class="forma-recommended-card__content">
            <p class="forma-recommended-card__brand">
              ${escapeHtml(vendor)}
            </p>

            <h3 class="forma-recommended-card__title">
              <a
                href="${escapeHtml(url)}"
                class="forma-recommended-card__title-link"
              >
                ${escapeHtml(title)}
              </a>
            </h3>

            ${
  price
    ? `
      <p class="forma-recommended-card__price">
        ${escapeHtml(price)}
      </p>
    `
    : ""
}
          </div>
        </article>
      `;
    }

    function hideSection() {
      section.hidden = true;
      grid.innerHTML = "";
    }

    function showSection() {
      section.hidden = false;
    }

    async function render({
      force = false
    } = {}) {
      if (
        !window.Forma
          ?.recommendations
          ?.getProducts
      ) {
        console.error(
          "[Forma Recommended] Recommendation Engine is unavailable."
        );

        hideSection();
        return;
      }

      if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.textContent =
          "Updating...";
      }

      try {
        const products =
          await window.Forma
            .recommendations
            .getProducts(
              8,
              { force }
            );

        console.log(
          "[Forma Recommended] Products:",
          products
        );

        if (!products.length) {
          console.warn(
            "[Forma Recommended] No recommended products were returned."
          );

          hideSection();
          return;
        }

        grid.innerHTML =
          products
            .slice(0, 8)
            .map(createCard)
            .join("");

        showSection();
      } catch (error) {
        console.error(
          "[Forma Recommended] Could not render recommendations.",
          error
        );

        hideSection();
      } finally {
        if (refreshButton) {
          refreshButton.disabled = false;
          refreshButton.textContent =
            "Refresh selection";
        }
      }
    }

    function handleSaveClick(button) {
      const card = button.closest(
        "[data-recommended-product]"
      );

      if (!card) {
        return;
      }

      const productId =
        card.dataset.productId;

      if (
        !window.Forma
          ?.savedProducts
          ?.toggle
      ) {
        console.warn(
          "[Forma Recommended] Saved Products API is unavailable."
        );

        return;
      }

      const saved =
        window.Forma.savedProducts.toggle(
          productId
        );

      button.setAttribute(
        "aria-pressed",
        String(Boolean(saved))
      );

      button.setAttribute(
        "aria-label",
        saved
          ? "Remove from Your Forma"
          : "Save to Your Forma"
      );

      if (saved) {
        window.Forma.toast?.success(
          "Saved to Your Forma"
        );
      } else {
        window.Forma.toast?.info(
          "Removed from saved products"
        );
      }
    }

    grid.addEventListener(
      "click",
      event => {
        const saveButton =
          event.target.closest(
            "[data-recommended-save]"
          );

        if (!saveButton) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        handleSaveClick(saveButton);
      }
    );

    refreshButton?.addEventListener(
      "click",
      () => {
        window.Forma
          ?.recommendations
          ?.clearCatalogCache?.();

        render({
          force: true
        });
      }
    );

    window.addEventListener(
      "forma:saved-updated",
      () => render()
    );

    window.addEventListener(
      "forma:followed-brands-updated",
      () => render()
    );

    window.addEventListener(
      "forma:profile-updated",
      () => render()
    );

    window.addEventListener(
      "forma:onboarding-completed",
      () => render()
    );

    render();
  }

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initRecommendedProducts,
      { once: true }
    );
  } else {
    initRecommendedProducts();
  }
})();