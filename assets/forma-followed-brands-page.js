/* ==========================================================
   FORMA — FOLLOWED BRANDS PAGE
   ========================================================== */

(function () {
  "use strict";

  const grid = document.querySelector(
    "[data-forma-following-grid]"
  );

  const count = document.querySelector(
    "[data-forma-following-count]"
  );

  const emptyState =
    document.querySelector(
      "[data-forma-following-empty]"
    );

  if (!grid) return;

  function getModule() {
    return window.Forma?.followedBrands;
  }

  if (!getModule()) {
    console.warn(
      "[Forma Followed Brands Page] Followed Brands module is unavailable."
    );

    return;
  }

  function createBrandCard(brand) {
    const card =
      document.createElement("article");

    card.className =
      "forma-brand-card";

    const link =
      document.createElement("a");

    link.className =
      "forma-brand-card__link";

    link.href =
      `/collections/vendors?q=${encodeURIComponent(
        brand.name
      )}`;

    link.setAttribute(
      "aria-label",
      `View ${brand.name}`
    );

    const content =
      document.createElement("div");

    content.className =
      "forma-brand-card__content";

    const status =
      document.createElement("span");

    status.className =
      "forma-brand-card__status";

    status.textContent = "Following";

    const footer =
      document.createElement("div");

    footer.className =
      "forma-brand-card__footer";

    const title =
      document.createElement("h3");

    title.className =
      "forma-brand-card__title";

    title.textContent = brand.name;

    const arrow =
      document.createElement("span");

    arrow.className =
      "forma-brand-card__arrow";

    arrow.setAttribute(
      "aria-hidden",
      "true"
    );

    arrow.textContent = "→";

    footer.appendChild(title);
    footer.appendChild(arrow);

    content.appendChild(status);
    content.appendChild(footer);

    link.appendChild(content);
    card.appendChild(link);

    return card;
  }

  function render() {
    const brands =
      getModule().getAll();

    grid.replaceChildren();

    if (count) {
      count.textContent =
        String(brands.length);
    }

    if (!brands.length) {
      if (emptyState) {
        emptyState.hidden = false;
      }

      return;
    }

    if (emptyState) {
      emptyState.hidden = true;
    }

    const fragment =
      document.createDocumentFragment();

    brands.forEach(brand => {
      if (!brand?.handle) return;

      fragment.appendChild(
        createBrandCard(brand)
      );
    });

    grid.appendChild(fragment);
  }

  window.Forma.events.on(
    "forma:followed-brands-updated",
    render
  );

  window.addEventListener(
    "storage",
    event => {
      const storageKey =
        window.Forma.storage.keys
          .followedBrands;

      if (event.key === storageKey) {
        render();
      }
    }
  );

  render();

})();