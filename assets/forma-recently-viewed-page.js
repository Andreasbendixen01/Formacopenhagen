/* ==========================================================
   FORMA — RECENTLY VIEWED PAGE
   ========================================================== */

(function () {

  "use strict";

  const grid =
    document.getElementById(
      "FormaRecentlyViewed"
    );

  const count =
    document.querySelector(
      "[data-forma-recent-count]"
    );

  if (!grid) return;

  function render() {

    const products =
      window.Forma.recentlyViewed
      .getAll()
      .slice(0,4);

    grid.replaceChildren();

    if (count) {
      count.textContent =
        products.length;
    }

    const fragment =
      document.createDocumentFragment();

    products.forEach(product => {

      const card =
        document.createElement("article");

      card.className =
        "forma-recent-card";

      card.innerHTML = `
        <a href="${product.url}" class="forma-recent-card__link">

          <div class="forma-recent-card__image">
            <img
              src="${product.image}"
              alt="${product.title}"
              loading="lazy"
            >
          </div>

          <div class="forma-recent-card__content">

            <p class="forma-recent-card__vendor">
              ${product.vendor}
            </p>

            <h3 class="forma-recent-card__title">
              ${product.title}
            </h3>

            <p class="forma-recent-card__price">
              ${product.price}
            </p>

          </div>

        </a>
      `;

      fragment.appendChild(card);

    });

    grid.appendChild(fragment);

  }

  window.Forma.events.on(
    "forma:recently-viewed-updated",
    render
  );

  render();

})();