/* ==========================================================
   FORMA — NEW ARRIVALS UI V1
   ========================================================== */

(function () {
  "use strict";

  function initNewArrivals() {
    const section = document.querySelector(
      "[data-forma-new-arrivals]"
    );

    if (!section) {
      return;
    }

    const list = section.querySelector(
      "[data-forma-new-arrivals-list]"
    );

    const totalElement = section.querySelector(
      "[data-forma-new-arrivals-total]"
    );

    const emptyState = section.querySelector(
      "[data-forma-new-arrivals-empty]"
    );

    const skeleton = section.querySelector(
    "[data-forma-new-arrivals-skeleton]"
    );

    if (!list) {
      return;
    }

    let brands = [];
    let openBrandKey = null;

    function escapeHtml(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function normalizeText(value) {
      return String(value || "")
        .trim()
        .toLowerCase();
    }

    function getProductId(product) {
      return String(
        product?.id ||
        product?.productId ||
        ""
      );
    }

    function getProductHandle(product) {
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

    function getProductTitle(product) {
      return String(
        product?.title ||
        product?.name ||
        "Untitled product"
      );
    }

    function getProductVendor(product) {
      return String(
        product?.vendor ||
        product?.brand ||
        "Forma"
      );
    }

    function getProductImage(product) {
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

    function getNumericPrice(product) {
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
        const cleaned = rawPrice
          .replace(/\s/g, "")
          .replace(",", ".")
          .replace(/[^\d.-]/g, "");

        const parsed = Number(cleaned);

        return Number.isFinite(parsed)
          ? parsed
          : null;
      }

      const price = Number(rawPrice);

      if (!Number.isFinite(price)) {
        return null;
      }

      return (
        Number.isInteger(price) &&
        price >= 10000
      )
        ? price / 100
        : price;
    }

    function formatMoney(product) {
      const amount =
        getNumericPrice(product);

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

    function isProductSaved(product) {
      const productId =
        getProductId(product);

      const productHandle =
        getProductHandle(product);

      return getSavedProducts().some(
        savedProduct => {
          const savedId =
            getProductId(savedProduct);

          const savedHandle =
            getProductHandle(savedProduct);

          return (
            (
              productId &&
              savedId === productId
            ) ||
            (
              productHandle &&
              savedHandle === productHandle
            )
          );
        }
      );
    }

    function createProductCard(product) {
      const id =
        getProductId(product);

      const handle =
        getProductHandle(product);

      const title =
        getProductTitle(product);

      const vendor =
        getProductVendor(product);

      const image =
        getProductImage(product);

      const price =
        formatMoney(product);

      const url = handle
        ? `/products/${handle}`
        : "#";

      const saved =
        isProductSaved(product);

      return `
        <article
          class="forma-new-product"
          data-forma-new-product
          data-product-id="${escapeHtml(id)}"
          data-product-handle="${escapeHtml(handle)}"
        >
          <div class="forma-new-product__media">
            <a
              href="${escapeHtml(url)}"
              class="forma-new-product__link"
              aria-label="View ${escapeHtml(title)}"
            >
              ${
                image
                  ? `
                    <img
                      src="${escapeHtml(image)}"
                      alt="${escapeHtml(title)}"
                      class="forma-new-product__image"
                      loading="lazy"
                    >
                  `
                  : ""
              }
            </a>

            <button
              type="button"
              class="forma-new-product__save"
              data-forma-new-save
              aria-pressed="${saved}"
              aria-label="${
                saved
                  ? "Remove from Your Forma"
                  : "Save to Your Forma"
              }"
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

          <div class="forma-new-product__content">
            <p class="forma-new-product__vendor">
              ${escapeHtml(vendor)}
            </p>

            <h4 class="forma-new-product__title">
              <a href="${escapeHtml(url)}">
                ${escapeHtml(title)}
              </a>
            </h4>

            ${
              price
                ? `
                  <p class="forma-new-product__price">
                    ${escapeHtml(price)}
                  </p>
                `
                : ""
            }
          </div>
        </article>
      `;
    }

    function createBrandRow(brand, index) {
      const brandKey =
        normalizeText(
          brand?.key ||
          brand?.name ||
          brand?.handle
        );

      const brandName =
        String(
          brand?.name ||
          brand?.title ||
          brand?.handle ||
          "Brand"
        );

      const count =
        Number(brand?.count) || 0;

      const brandUrl =
        brand?.url ||
        (
          brand?.handle
            ? `/collections/${brand.handle}`
            : "/pages/brands"
        );

      const isOpen =
        openBrandKey === brandKey;

      const products =
        Array.isArray(brand?.products)
          ? brand.products.slice(0, 4)
          : [];

      const panelId =
        `FormaNewBrandPanel-${index}`;

      return `
        <article
          class="forma-new-brand${isOpen ? " is-open" : ""}"
          data-forma-new-brand
          data-brand-key="${escapeHtml(brandKey)}"
        >
          <button
            type="button"
            class="forma-new-brand__trigger"
            data-forma-new-brand-trigger
            aria-expanded="${isOpen}"
            aria-controls="${panelId}"
          >
            <span class="forma-new-brand__index">
              ${String(index + 1).padStart(2, "0")}
            </span>

            <span class="forma-new-brand__name">
              ${escapeHtml(brandName)}
            </span>

            <span class="forma-new-brand__count">
              <span class="forma-new-brand__count-number">
                ${count}
              </span>

              <span>
                new ${count === 1 ? "arrival" : "arrivals"}
              </span>
            </span>

            <span
              class="forma-new-brand__icon"
              aria-hidden="true"
            ></span>
          </button>

          <div
            id="${panelId}"
            class="forma-new-brand__panel"
          >
            <div class="forma-new-brand__panel-inner">
              <div class="forma-new-brand__content">
                <div class="forma-new-brand__meta">
                  <p class="forma-new-brand__label">
                    New since you were here
                  </p>

                  <a
                    href="${escapeHtml(brandUrl)}"
                    class="forma-new-brand__view-all"
                  >
                    <span>View all from ${escapeHtml(brandName)}</span>
                    <span aria-hidden="true">→</span>
                  </a>
                </div>

                <div class="forma-new-brand__products">
                  ${products
                    .map(createProductCard)
                    .join("")}
                </div>
              </div>
            </div>
          </div>
        </article>
      `;
    }

    function updateSaveButtons() {
      list
        .querySelectorAll(
          "[data-forma-new-product]"
        )
        .forEach(card => {
          const productId =
            card.dataset.productId;

          const productHandle =
            card.dataset.productHandle;

          const button =
            card.querySelector(
              "[data-forma-new-save]"
            );

          if (!button) {
            return;
          }

          const saved =
            getSavedProducts().some(
              product => {
                return (
                  (
                    productId &&
                    getProductId(product) ===
                    productId
                  ) ||
                  (
                    productHandle &&
                    getProductHandle(product) ===
                    productHandle
                  )
                );
              }
            );

          button.setAttribute(
            "aria-pressed",
            String(saved)
          );

          button.setAttribute(
            "aria-label",
            saved
              ? "Remove from Your Forma"
              : "Save to Your Forma"
          );
        });
    }

    function render() {
      if (!brands.length) {
        list.innerHTML = "";
        list.hidden = true;

        if (emptyState) {
          emptyState.hidden = false;
        }

        if (totalElement) {
          totalElement.textContent =
            "No new arrivals";
        }

        section.hidden = false;
        return;
      }

      list.hidden = false;

      if (emptyState) {
        emptyState.hidden = true;
      }

      list.innerHTML = brands
        .map(createBrandRow)
        .join("");

      const totalCount =
        brands.reduce(
          (total, brand) =>
            total +
            (Number(brand.count) || 0),
          0
        );

      if (totalElement) {
        totalElement.textContent =
          `${totalCount} new ${
            totalCount === 1
              ? "arrival"
              : "arrivals"
          }`;
      }

      section.hidden = false;
    }

    async function load() {

        if (skeleton) {
        skeleton.hidden = false;
        skeleton.classList.remove("is-leaving");
        }

        list.hidden = true;

        if (emptyState) {
        emptyState.hidden = true;
        }

        section.hidden = false;

      if (
        !window.Forma
          ?.newArrivals
          ?.getBrands
      ) {
        console.error(
          "[Forma New Arrivals UI] Engine is unavailable."
        );

        return;
      }

      try {
        /*
        * Products are loaded before registering the
        * current dashboard visit. This preserves the
        * correct previous-visit comparison.
        */
        brands = await window.Forma
            .newArrivals
            .getBrands(8);

        /*
        * Giver skeletonen tid til at blive opfattet,
        * men uden at gøre dashboardet langsomt.
        */
        await new Promise(resolve => {
            window.setTimeout(resolve, 340);
        });

        if (skeleton) {
            skeleton.classList.add("is-leaving");

            await new Promise(resolve => {
            window.setTimeout(resolve, 300);
            });

            skeleton.hidden = true;
        }

        render();

        window.Forma
            .newArrivals
            .registerDashboardVisit?.();

            window.Forma
            .dashboardManager
            ?.setSectionReady("new-arrivals");

        } catch (error) {
        if (skeleton) {
            skeleton.hidden = true;
        }

        console.error(
            "[Forma New Arrivals UI] Could not render.",
            error
        );

        window.Forma
        .dashboardManager
        ?.setSectionError("new-arrivals");

        section.hidden = true;
        }
    }

    list.addEventListener(
      "click",
      event => {
        const saveButton =
          event.target.closest(
            "[data-forma-new-save]"
          );

        if (saveButton) {
          event.preventDefault();
          event.stopPropagation();

          const productCard =
            saveButton.closest(
              "[data-forma-new-product]"
            );

          const productId =
            productCard?.dataset.productId;

          if (
            !productId ||
            !window.Forma
              ?.savedProducts
              ?.toggle
          ) {
            return;
          }

          const saved =
            window.Forma
              .savedProducts
              .toggle(productId);

          saveButton.setAttribute(
            "aria-pressed",
            String(Boolean(saved))
          );

          saveButton.setAttribute(
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

          return;
        }

        const trigger =
          event.target.closest(
            "[data-forma-new-brand-trigger]"
          );

        if (!trigger) {
          return;
        }

        const brandRow =
          trigger.closest(
            "[data-forma-new-brand]"
          );

        const brandKey =
          brandRow?.dataset.brandKey;

        if (!brandKey) {
          return;
        }

        const isOpening =
          openBrandKey !== brandKey;

        openBrandKey =
          isOpening
            ? brandKey
            : null;

        list
          .querySelectorAll(
            "[data-forma-new-brand]"
          )
          .forEach(row => {
            const rowKey =
              row.dataset.brandKey;

            const rowTrigger =
              row.querySelector(
                "[data-forma-new-brand-trigger]"
              );

            const shouldOpen =
              rowKey === openBrandKey;

            row.classList.toggle(
              "is-open",
              shouldOpen
            );

            rowTrigger?.setAttribute(
              "aria-expanded",
              String(shouldOpen)
            );
          });

        if (isOpening) {
          window.Forma
            ?.newArrivals
            ?.markVisited?.(
              brandKey
            );
        }
      }
    );

    window.addEventListener(
      "forma:saved-updated",
      updateSaveButtons
    );

    window.addEventListener(
      "forma:new-arrivals-updated",
      event => {
        const updatedBrands =
          event.detail?.brands;

        if (
          Array.isArray(updatedBrands)
        ) {
          brands = updatedBrands;
          openBrandKey = null;
          render();
        }
      }
    );

    window.addEventListener(
      "forma:new-arrivals-profile-changed",
      load
    );

    load();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initNewArrivals,
      { once: true }
    );
  } else {
    initNewArrivals();
  }
})();