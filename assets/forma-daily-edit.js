/* ==========================================================
   FORMA — DAILY EDIT UI
   ========================================================== */

(function () {
  "use strict";

  function initDailyEdit() {
    const section = document.querySelector(
      "[data-forma-daily-edit]"
    );

    if (!section) {
      return;
    }

    const grid = section.querySelector(
      "[data-forma-daily-edit-grid]"
    );

    const dateElement = section.querySelector(
      "[data-forma-daily-edit-date]"
    );

    if (!grid) {
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

    function getId(product) {
      return String(
        product?.id ||
        product?.productId ||
        ""
      );
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

      return image?.src || image?.url || "";
    }

    function getPrice(product) {
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

      if (typeof rawPrice === "string") {
        const parsed = Number(
          rawPrice
            .replace(/\s/g, "")
            .replace(",", ".")
            .replace(/[^\d.-]/g, "")
        );

        return Number.isFinite(parsed)
          ? parsed
          : null;
      }

      const numericPrice = Number(rawPrice);

      if (!Number.isFinite(numericPrice)) {
        return null;
      }

      return (
        Number.isInteger(numericPrice) &&
        numericPrice >= 10000
      )
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

    function getSavedProducts() {
      try {
        return (
          window.Forma
            ?.savedProducts
            ?.getAll?.() || []
        );
      } catch (error) {
        return [];
      }
    }

    function isSaved(product) {
      const productId = getId(product);
      const handle = getHandle(product);

      return getSavedProducts().some(saved => {
        return (
          (
            productId &&
            getId(saved) === productId
          ) ||
          (
            handle &&
            getHandle(saved) === handle
          )
        );
      });
    }

    function createCard(product, index) {
      const title = getTitle(product);
      const vendor = getVendor(product);
      const image = getImage(product);
      const handle = getHandle(product);
      const productId = getId(product);
      const url = handle
        ? `/products/${handle}`
        : "#";

      const price = formatMoney(
        getPrice(product)
      );

      const reason =
        window.Forma
          ?.dailyEdit
          ?.getReason?.(product) ||
        "Chosen for today's Forma";

      const saved = isSaved(product);

      return `
        <article
          class="forma-daily-card"
          data-daily-product
          data-product-id="${escapeHtml(productId)}"
          data-product-handle="${escapeHtml(handle)}"
        >
          <div class="forma-daily-card__media">
            <a
              href="${escapeHtml(url)}"
              class="forma-daily-card__link"
              aria-label="View ${escapeHtml(title)}"
            >
              <p class="forma-daily-card__number">
                ${String(index + 1).padStart(2, "0")}
              </p>

              ${
                image
                  ? `
                    <img
                      class="forma-daily-card__image"
                      src="${escapeHtml(image)}"
                      alt="${escapeHtml(title)}"
                      loading="lazy"
                    >
                  `
                  : ""
              }

              <p class="forma-daily-card__reason">
                ${escapeHtml(reason)}
              </p>
            </a>

            <button
              class="forma-daily-card__save"
              type="button"
              aria-pressed="${saved}"
              aria-label="${
                saved
                  ? "Remove from Your Forma"
                  : "Save to Your Forma"
              }"
              data-daily-save
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

          <div class="forma-daily-card__content">
            <p class="forma-daily-card__brand">
              ${escapeHtml(vendor)}
            </p>

            <h3 class="forma-daily-card__title">
              <a href="${escapeHtml(url)}">
                ${escapeHtml(title)}
              </a>
            </h3>

            ${
              price
                ? `
                  <p class="forma-daily-card__price">
                    ${escapeHtml(price)}
                  </p>
                `
                : ""
            }
          </div>
        </article>
      `;
    }

    async function render() {
      if (
        !window.Forma
          ?.dailyEdit
          ?.getProducts
      ) {
        console.error(
          "[Forma Daily Edit] Engine is unavailable."
        );

        return;
      }

      try {
        const products =
          await window.Forma
            .dailyEdit
            .getProducts(8);

        if (!products.length) {
          section.hidden = true;
          return;
        }

        grid.innerHTML = products
          .map(createCard)
          .join("");

        if (dateElement) {
          dateElement.textContent =
            new Intl.DateTimeFormat(
              "en-GB",
              {
                day: "numeric",
                month: "long"
              }
            ).format(new Date());
        }

        section.hidden = false;
      } catch (error) {
        console.error(
          "[Forma Daily Edit] Could not render.",
          error
        );

        window.Forma
        .dashboardManager
        ?.setSectionError("daily-edit");

        section.hidden = true;
      }
    }

    grid.addEventListener(
      "click",
      event => {
        const button = event.target.closest(
          "[data-daily-save]"
        );

        if (!button) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        const card = button.closest(
          "[data-daily-product]"
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
    );

    window.addEventListener(
      "forma:daily-edit-updated",
      render
    );

    window.addEventListener(
      "forma:saved-updated",
      render
    );

    render();

    window.Forma
    .dashboardManager
    ?.setSectionReady("daily-edit");
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initDailyEdit,
      { once: true }
    );
  } else {
    initDailyEdit();
  }
})();