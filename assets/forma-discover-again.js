/* ==========================================================
   FORMA — DISCOVER AGAIN
   ========================================================== */

(function () {
  "use strict";

  const section = document.querySelector(
    "[data-forma-discover-again]"
  );

  if (!section) {
    return;
  }

  const featuredContainer = section.querySelector(
    "[data-forma-discover-again-featured]"
  );

  const secondaryContainer = section.querySelector(
    "[data-forma-discover-again-secondary]"
  );

  if (!window.Forma?.ranking) {
    console.error(
      "[Forma Discover Again] Ranking Engine must load first."
    );

    return;
  }

  /*
   * Sæt denne til true, mens vi tester designet.
   * Når sektionen er godkendt, ændrer vi den til false.
   */
  const TEST_MODE = true;

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
      product?.href ||
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
    const handle = getHandle(product);

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
        `[Forma Discover Again] Could not load ${handle}.`,
        error
      );

      return product;
    }
  }

  function getReason(product) {
    const daysSince =
      product?.formaRanking?.daysSince;

    if (daysSince === 1) {
      return "Viewed yesterday";
    }

    if (
      Number.isFinite(daysSince) &&
      daysSince > 1
    ) {
      return `Last viewed ${daysSince} days ago`;
    }

    if (
      product?.formaRanking?.saved
    ) {
      return "Saved to Your Forma";
    }

    return "Worth another look";
  }

  function renderImage(
    image,
    title,
    className
  ) {
    if (!image) {
      return "";
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
    const image = getImage(product);
    const price = getPrice(product);
    const url = getUrl(product);
    const reason = getReason(product);

    featuredContainer.innerHTML = `
      <a
        href="${escapeHtml(url)}"
        class="forma-discover-again__featured-media"
        aria-label="Rediscover ${escapeHtml(title)}"
      >
        ${renderImage(
          image,
          title,
          "forma-discover-again__featured-image"
        )}
      </a>

      <div class="forma-discover-again__featured-info">
        <div class="forma-discover-again__meta">
          <p class="forma-discover-again__index">
            01
          </p>

          <p class="forma-discover-again__reason">
            ${escapeHtml(reason)}
          </p>
        </div>

        <div>
          <p class="forma-discover-again__brand">
            ${escapeHtml(brand)}
          </p>

          <h3 class="forma-discover-again__title">
            ${escapeHtml(title)}
          </h3>

          ${
            price
              ? `
                <p class="forma-discover-again__price">
                  ${escapeHtml(price)}
                </p>
              `
              : ""
          }

          <a
            href="${escapeHtml(url)}"
            class="forma-discover-again__link"
          >
            <span>Discover again</span>
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
    const image = getImage(product);
    const price = getPrice(product);
    const url = getUrl(product);
    const reason = getReason(product);

    return `
      <a
        href="${escapeHtml(url)}"
        class="forma-discover-again-card"
      >
        <div class="forma-discover-again-card__media">
          <p class="forma-discover-again-card__index">
            0${index + 2}
          </p>

          ${renderImage(
            image,
            title,
            "forma-discover-again-card__image"
          )}
        </div>

        <div class="forma-discover-again-card__content">
          <p class="forma-discover-again-card__brand">
            ${escapeHtml(brand)}
          </p>

          <h3 class="forma-discover-again-card__title">
            ${escapeHtml(title)}
          </h3>

          ${
            price
              ? `
                <p class="forma-discover-again-card__price">
                  ${escapeHtml(price)}
                </p>
              `
              : ""
          }

          <p class="forma-discover-again-card__reason">
            ${escapeHtml(reason)}
          </p>
        </div>
      </a>
    `;
  }

  function hideSection() {
    section.hidden = true;
    featuredContainer.innerHTML = "";
    secondaryContainer.innerHTML = "";
  }

  function showSection() {
    section.hidden = false;
  }

  async function render() {
    let products =
      window.Forma.ranking
        .getRediscoverProducts(3);

    /*
     * Testtilstand:
     * Hvis der endnu ikke findes produkter,
     * der er mindst 14 dage gamle, bruger vi
     * Continue Exploring-produkter midlertidigt.
     */
    if (
      TEST_MODE &&
      products.length === 0
    ) {
      products =
        window.Forma.ranking
          .getContinueExploring(3);
    }

    if (!products.length) {
      hideSection();
      return;
    }

    const fetchedProducts =
      await Promise.all(
        products.map(fetchProduct)
      );

    renderFeatured(
      fetchedProducts[0]
    );

    secondaryContainer.innerHTML =
      fetchedProducts
        .slice(1, 3)
        .map(createSecondaryCard)
        .join("");

    showSection();
  }

  window.addEventListener(
    "forma:ranking-updated",
    render
  );

  render();
})();