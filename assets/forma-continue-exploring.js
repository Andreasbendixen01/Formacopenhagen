/* ==========================================================
   FORMA — CONTINUE EXPLORING 2.0
   Version: 2.0.0

   Candidate source:
   - Forma Ranking Engine

   Final ranking:
   - Forma Recommendation Engine
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

  if (!window.Forma?.recommendations) {
    console.error(
      "[Forma Continue Exploring] Recommendation Engine must load first."
    );

    return;
  }

  let isRendering = false;

  /* ----------------------------------------------------------
     HELPERS
     ---------------------------------------------------------- */

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
      .replace(/^https?:\/\/[^/]+/i, "")
      .replace(/^\/?products\//i, "")
      .replace(/\.js(?:\?.*)?$/i, "")
      .replace(/[?#].*$/, "")
      .replace(/^\/+|\/+$/g, "")
      .toLowerCase();
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

  function getRecommendationMeta(product) {
    return (
      product?._formaRecommendation ||
      {}
    );
  }

  function getReason(product, fallback) {
    const recommendation =
      getRecommendationMeta(product);

    return (
      recommendation.primaryReason ||
      recommendation.reasons?.[0]?.label ||
      fallback
    );
  }

  function getConfidence(product) {
    const recommendation =
      getRecommendationMeta(product);

    const confidence =
      Number(
        recommendation.confidence
      );

    if (!Number.isFinite(confidence)) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(100, confidence)
    );
  }

  function createReasonText(
    product,
    fallback
  ) {
    const reason =
      getReason(product, fallback);

    const confidence =
      getConfidence(product);

    if (confidence <= 0) {
      return reason;
    }

    return `${reason} · ${confidence}% match`;
  }

  /* ----------------------------------------------------------
     PRODUCT FETCHING
     ---------------------------------------------------------- */

  async function fetchProduct(product) {
    const handle =
      normalizeHandle(product);

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
        ...fetchedProduct,
        ...product,
        handle,

        _formaRecommendation:
          product._formaRecommendation
      };
    } catch (error) {
      console.warn(
        `[Forma Continue Exploring] Could not load ${handle}.`,
        error
      );

      return product;
    }
  }

  /* ----------------------------------------------------------
     IMAGE RENDERING
     ---------------------------------------------------------- */

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

  /* ----------------------------------------------------------
     FEATURED PRODUCT
     ---------------------------------------------------------- */

  function renderFeatured(product) {
    const title = getTitle(product);
    const brand = getBrand(product);
    const price = getPrice(product);
    const image = getImage(product);
    const url = getProductUrl(product);

    const reason =
      createReasonText(
        product,
        "Selected from your journey"
      );

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

  /* ----------------------------------------------------------
     SECONDARY PRODUCTS
     ---------------------------------------------------------- */

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
      createReasonText(
        product,
        "Worth another look"
      );

    const number =
      String(index + 2).padStart(
        2,
        "0"
      );

    return `
      <a
        href="${escapeHtml(url)}"
        class="forma-continue-card"
      >
        <div class="forma-continue-card__media">
          <p class="forma-continue-card__index">
            ${number}
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

  /* ----------------------------------------------------------
     SECTION STATES
     ---------------------------------------------------------- */

  function showEmptyState() {
    if (content) {
      content.hidden = true;
    }

    if (emptyState) {
      emptyState.hidden = false;
    }

    featuredContainer.innerHTML = "";
    secondaryContainer.innerHTML = "";
  }

  function showContent() {
    if (content) {
      content.hidden = false;
    }

    if (emptyState) {
      emptyState.hidden = true;
    }
  }

  /* ----------------------------------------------------------
     RECOMMENDATION PIPELINE
     ---------------------------------------------------------- */

  function getCandidates() {
    /*
     * Ranking Engine provides a broader candidate pool.
     * Recommendation Engine performs the final scoring,
     * filtering and diversification.
     */

    return (
      window.Forma.ranking
        .getContinueExploring(16) ||
      []
    );
  }

  async function getRecommendations() {
    const candidates =
      getCandidates();

    if (!candidates.length) {
      return [];
    }

    const results =
      await window.Forma
        .recommendations
        .rank(
          candidates,
          {
            limit: 4,

            excludeSaved: true,
            excludeViewed: false,

            maxPerBrand: 2,

            minimumScore: 0
          }
        );

    return results.map(result => ({
      ...result.product,

      _formaRecommendation: {
        score:
          result.score,

        confidence:
          result.confidence,

        reasons:
          result.reasons || [],

        primaryReason:
          result.primaryReason
      }
    }));
  }

  /* ----------------------------------------------------------
     RENDER
     ---------------------------------------------------------- */

  async function render() {
    if (isRendering) {
      return;
    }

    isRendering = true;

    try {
      const recommendedProducts =
        await getRecommendations();

      if (!recommendedProducts.length) {
        showEmptyState();
        return;
      }

      const products =
        await Promise.all(
          recommendedProducts.map(
            fetchProduct
          )
        );

      const validProducts =
        products.filter(Boolean);

      if (!validProducts.length) {
        showEmptyState();
        return;
      }

      renderFeatured(
        validProducts[0]
      );

      secondaryContainer.innerHTML =
        validProducts
          .slice(1)
          .map(createSecondaryCard)
          .join("");

      showContent();
    } catch (error) {
      console.error(
        "[Forma Continue Exploring] Could not render recommendations.",
        error
      );

      showEmptyState();
    } finally {
      isRendering = false;
    }
  }

  /* ----------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------- */

  window.Forma.continueExploring = {
    version: "2.0.0",

    render,

    refresh() {
      return render();
    }
  };

  /* ----------------------------------------------------------
     EVENTS
     ---------------------------------------------------------- */

  window.addEventListener(
    "forma:ranking-updated",
    render
  );

  document.addEventListener(
    "forma:persona-updated",
    render
  );

  window.Forma.events?.on?.(
    "forma:saved-updated",
    render
  );

  window.Forma.events?.on?.(
    "forma:followed-brands-updated",
    render
  );

  window.Forma.events?.on?.(
    "forma:recently-viewed-updated",
    render
  );

  render();

  console.info(
    "[Forma Continue Exploring] Continue Exploring 2.0 ready"
  );
})();