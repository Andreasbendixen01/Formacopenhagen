/* ==========================================================
   FORMA — SAVED PRODUCTS UI
   ========================================================== */

(function () {
  "use strict";

  const BUTTON_SELECTOR = "[data-forma-save]";
  const COUNT_SELECTOR = "[data-forma-save-count]";

  function getModule() {
    return window.Forma?.savedProducts;
  }

  function getProductData(button) {
    return {
      id:
        button.dataset.productId ||
        button.dataset.formaProductId ||
        button.dataset.formaSave,

      handle:
        button.dataset.productHandle ||
        button.dataset.formaProductHandle ||
        button.dataset.handle
    };
  }

  function updateButton(button) {
    const savedProducts = getModule();

    if (!savedProducts) return;

    const { id } = getProductData(button);

    if (!id) {
      console.warn(
        "[Forma Saved Products UI] Product ID is missing:",
        button
      );

      return;
    }

    const saved = savedProducts.isSaved(id);

    button.setAttribute("aria-pressed", String(saved));
    button.classList.toggle("is-saved", saved);

    const label = button.querySelector("[data-forma-save-label]");

    if (label) {
      label.textContent = saved
        ? "Saved to Your Forma"
        : "Save to Your Forma";
    }

    const icon = button.querySelector("[data-forma-save-icon]");

    if (icon) {
      icon.classList.toggle("is-saved", saved);
    }
  }

  function updateAllButtons(root = document) {
    root
      .querySelectorAll(BUTTON_SELECTOR)
      .forEach(updateButton);
  }

  function updateCount() {
    const savedProducts = getModule();

    if (!savedProducts) return;

    const count = savedProducts.count();

    document
      .querySelectorAll(COUNT_SELECTOR)
      .forEach(element => {
        element.textContent = count;
        element.hidden = count === 0;
        element.setAttribute(
          "aria-label",
          `${count} saved ${count === 1 ? "product" : "products"}`
        );
      });
  }

  function updateUI(root = document) {
    updateAllButtons(root);
    updateCount();
  }

  function handleSaveClick(event) {
    const button = event.target.closest(BUTTON_SELECTOR);

    if (!button) return;

    const savedProducts = getModule();

    if (!savedProducts) {
      console.error(
        "[Forma Saved Products UI] Saved Products module is unavailable."
      );

      return;
    }

    const { id, handle } = getProductData(button);

    if (!id) {
      console.warn(
        "[Forma Saved Products UI] Cannot save product without an ID."
      );

      return;
    }

    event.preventDefault();

    const saved = savedProducts.toggle(id, handle);

    updateAllButtons();
    updateCount();

    window.Forma.toast?.[
    saved ? "success" : "info"
    ](
     saved
    ? "Saved to Your Forma"
    : "Removed from saved products"
    );

    window.Forma.events.emit("forma:saved-product-toggled", {
      id: String(id),
      handle,
      saved,
      count: savedProducts.count()
    });
  }

  function init() {
    if (!getModule()) {
      console.error(
        "[Forma Saved Products UI] Load forma-engine.js and forma.js before the UI module."
      );

      return;
    }

    updateUI();

    document.addEventListener("click", handleSaveClick);

    window.Forma.events.on(
      "forma:saved-products-updated",
      () => {
        updateUI();
      }
    );

    document.addEventListener(
      "shopify:section:load",
      event => {
        updateUI(event.target);
      }
    );

    window.addEventListener("storage", event => {
      const storageKey =
        window.Forma.storage.keys.savedProducts;

      if (event.key === storageKey) {
        updateUI();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();