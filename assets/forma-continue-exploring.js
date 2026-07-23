/* ==========================================================
   FORMA — CONTINUE EXPLORING
   ========================================================== */

(function () {
  "use strict";

  const section = document.querySelector(
    "[data-forma-continue]"
  );

  if (!section) {
    return;
  }

  const content = section.querySelector(
    "[data-forma-continue-content]"
  );

  const featuredContainer = section.querySelector(
    "[data-forma-continue-featured]"
  );

  const secondaryContainer = section.querySelector(
    "[data-forma-continue-secondary]"
  );

  const emptyState = section.querySelector(
    "[data-forma-continue-empty]"
  );

  if (!window.Forma?.ranking) {
    console.error(
      "[Forma Continue Exploring] Ranking Engine must load first."
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

  function normalizeHandle(product) {
    return String(
      product?.handle ||
      product?.productHandle ||
      product?.url ||
      product?.href ||
      ""
    )
      .trim()
      .replace(/^\/products\//, "")
      .split("?")[0]
      .split("#")[0]
      .replace(/\/$/, "");
  }

  function getProductUrl(product) {
    const handle = normalizeHandle(product);

    return handle
      ? `/products/${handle}`
      : "#";
  }

  function getImage(product) {
    const image =
      product?.featured_image ||
      product?.featuredImage ||
      product?.image ||
      product?.images?.[0];

    if (typeof image === "string") {
      return image;
    }

    return (
      image?.src ||
      image?.url ||
      ""
    );
  }

  function getTitle(product) {
    return (
      product?.title ||
      product?.name ||
      "Untitled product"
    );
  }

  function getBrand(product) {
    return (
      product?.vendor ||
      product?.brand ||
      product?.productVendor ||
      "Forma"
    );
  }

  function formatMoney(cents) {
    const amount = Number(cents);

    if (!Number.isFinite(amount)) {
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
    ).format(amount / 100);
  }

  function getPrice(product) {
    return formatMoney(
      product?.price ||
      product?.price_min ||
      product?.variants?.[0]?.price
    );
  }

  async function fetchProduct(product) {
    const handle = normalizeHandle(product);

    if (!handle) {
      return product;
    }

    try {
      const response = await fetch(
        `/products/${handle}.js`
      );

      if (!response.ok) {
        return product;
      }

      const fetchedProduct =
        await response.json();

      return {
        ...product,
        ...fetchedProduct,
        handle
      };
    } catch (error) {
      console.warn(
        `[Forma Continue Exploring] Could not load ${handle}.`,
        error
      );

      return product;
    }
  }

  function renderImage(
    image,
    title,
    className
  ) {
    if (!image) {
      return `
        <div class="forma-continue__image-placeholder">
          Image unavailable
        </div>
      `;
    }

    return `
      <img
        class="${className}"
        src="${escapeHtml(image)}"
        alt="${escapeHtml(title)}"
        loading="lazy"
      >
    `;
  }

  function renderFeatured(product) {
    const title = getTitle(product);
    const brand = getBrand(product);
    const price = getPrice(product);
    const image = getImage(product);
    const url = getProductUrl(product);

    const reason =
      window.Forma.ranking
        .getExplanation(product) ||
      "Selected from your journey";

    featuredContainer.innerHTML = `
      <a
        href="${escapeHtml(url)}"
        class="forma-continue__featured-media"
        aria-label="Continue exploring ${escapeHtml(title)}"
      >
        ${renderImage(
          image,
          title,
          "forma-continue__featured-image"
        )}
      </a>

      <div class="forma-continue__featured-info">
        <div class="forma-continue__featured-top">
          <p class="forma-continue__number">
            01
          </p>

          <p class="forma-continue__reason">
            ${escapeHtml(reason)}
          </p>
        </div>

        <div class="forma-continue__featured-bottom">
          <p class="forma-continue__featured-brand">
            ${escapeHtml(brand)}
          </p>

          <h3 class="forma-continue__featured-title">
            ${escapeHtml(title)}
          </h3>

          ${
            price
              ? `
                <p class="forma-continue__featured-price">
                  ${escapeHtml(price)}
                </p>
              `
              : ""
          }

          <a
            href="${escapeHtml(url)}"
            class="forma-continue__featured-link"
          >
            <span>Continue exploring</span>
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    `;
  }

  function createSecondaryCard(
    product,
    index
  ) {
    const title = getTitle(product);
    const brand = getBrand(product);
    const price = getPrice(product);
    const image = getImage(product);
    const url = getProductUrl(product);

    const reason =
      window.Forma.ranking
        .getExplanation(product) ||
      "Worth another look";

    return `
      <a
        href="${escapeHtml(url)}"
        class="forma-continue-card"
      >
        <div class="forma-continue-card__media">
          <p class="forma-continue-card__index">
            0${index + 2}
          </p>

          ${renderImage(
            image,
            title,
            "forma-continue-card__image"
          )}
        </div>

        <div class="forma-continue-card__content">
          <p class="forma-continue-card__brand">
            ${escapeHtml(brand)}
          </p>

          <h3 class="forma-continue-card__title">
            ${escapeHtml(title)}
          </h3>

          ${
            price
              ? `
                <p class="forma-continue-card__price">
                  ${escapeHtml(price)}
                </p>
              `
              : ""
          }

          <p class="forma-continue-card__reason">
            ${escapeHtml(reason)}
          </p>
        </div>
      </a>
    `;
  }

  function showEmptyState() {
    content.hidden = true;
    emptyState.hidden = false;

    featuredContainer.innerHTML = "";
    secondaryContainer.innerHTML = "";
  }

  function showContent() {
    content.hidden = false;
    emptyState.hidden = true;
  }

  async function render() {
    const rankedProducts =
      window.Forma.ranking
        .getContinueExploring(4);

    if (!rankedProducts.length) {
      showEmptyState();
      return;
    }

    const products = await Promise.all(
      rankedProducts.map(fetchProduct)
    );

    renderFeatured(products[0]);

    secondaryContainer.innerHTML =
      products
        .slice(1)
        .map(createSecondaryCard)
        .join("");

    showContent();
  }

  window.addEventListener(
    "forma:ranking-updated",
    render
  );

  render();
})();