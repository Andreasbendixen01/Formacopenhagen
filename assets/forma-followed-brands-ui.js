/* ==========================================================
   FORMA — FOLLOWED BRANDS UI
   ========================================================== */

(function () {
  "use strict";

  const BUTTON_SELECTOR =
    "[data-forma-follow-brand]";

  function getModule() {
    return window.Forma?.followedBrands;
  }

  function getBrandData(button) {
    return {
      name: button.dataset.brandName || "",
      handle: button.dataset.brandHandle || ""
    };
  }

  function updateButton(button) {
    const followedBrands = getModule();

    if (!followedBrands) return;

    const brand = getBrandData(button);

    if (!brand.handle) {
      console.warn(
        "[Forma Followed Brands UI] Brand handle is missing:",
        button
      );

      return;
    }

    const following =
      followedBrands.isFollowing(
        brand.handle
      );

    button.setAttribute(
      "aria-pressed",
      String(following)
    );

    button.classList.toggle(
      "is-following",
      following
    );

    const label = button.querySelector(
      "[data-forma-follow-label]"
    );

    if (label) {
      label.textContent = following
        ? "✓ Following"
        : "+ Follow brand";
    }
  }

  function updateAllButtons(
    root = document
  ) {
    root
      .querySelectorAll(BUTTON_SELECTOR)
      .forEach(updateButton);
  }

  function handleClick(event) {
    const button = event.target.closest(
      BUTTON_SELECTOR
    );

    if (!button) return;

    const followedBrands = getModule();

    if (!followedBrands) {
      console.error(
        "[Forma Followed Brands UI] Followed Brands module is unavailable."
      );

      return;
    }

    const brand = getBrandData(button);

    if (!brand.handle) return;

    event.preventDefault();

    const following =
      followedBrands.toggle(brand);

    updateAllButtons();

    window.Forma.toast?.[
    following ? "success" : "info"
    ](
     following
    ? `You are now following ${brand.name}`
    : `You unfollowed ${brand.name}`
    );

    window.Forma.events.emit(
      "forma:followed-brand-toggled",
      {
        brand,
        following,
        count: followedBrands.count()
      }
    );
  }

  function init() {
    if (!getModule()) {
      console.error(
        "[Forma Followed Brands UI] Load Forma Engine and Followed Brands before the UI module."
      );

      return;
    }

    updateAllButtons();

    document.addEventListener(
      "click",
      handleClick
    );

    window.Forma.events.on(
      "forma:followed-brands-updated",
      () => {
        updateAllButtons();
      }
    );

    document.addEventListener(
      "shopify:section:load",
      event => {
        updateAllButtons(event.target);
      }
    );

    window.addEventListener(
      "storage",
      event => {
        const storageKey =
          window.Forma.storage.keys
            .followedBrands;

        if (event.key === storageKey) {
          updateAllButtons();
        }
      }
    );
  }

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();