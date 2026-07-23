/* ==========================================================
   FORMA — SAVE BUTTONS
   ========================================================== */

(() => {
  function updateButton(button) {
    const productId = button.dataset.productId;

    if (!productId || !window.Forma) return;

    const saved = window.Forma.isSaved(productId);

    button.setAttribute("aria-pressed", saved ? "true" : "false");

    const label = button.querySelector(".forma-save-button__label");

    if (label) {
      label.textContent = saved
        ? "Saved to Your Forma"
        : "Save to Your Forma";
    }
  }

  function updateSaveCount() {
    if (!window.Forma) return;

    const count = window.Forma.count();

    const countElements = document.querySelectorAll(
      "[data-forma-save-count], [data-forma-saved-count]"
    );

    countElements.forEach((element) => {
      element.textContent = count;
      element.dataset.count = count;
    });
  }

  function updateAll() {
    document
      .querySelectorAll("[data-forma-save]")
      .forEach(updateButton);

    updateSaveCount();
  }

  function showToast(message) {

  let toast = document.querySelector(".forma-toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.className = "forma-toast";

    toast.innerHTML = `
      <span class="forma-toast__message"></span>

      <a
        class="forma-toast__link"
        href="/pages/your-forma">
        Open
      </a>
    `;

    document.body.appendChild(toast);
  }

  toast.querySelector(".forma-toast__message").textContent = message;

  toast.classList.add("is-visible");

  clearTimeout(toast.hideTimer);

  toast.hideTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2200);
}

  function handleSaveClick(event) {
    const button = event.target.closest("[data-forma-save]");

    if (!button || !window.Forma) return;

    event.preventDefault();
    event.stopPropagation();

    const productId = button.dataset.productId;

    if (!productId) return;

    const productHandle =
  button.dataset.productHandle || "";

const productTitle =
  button.dataset.productTitle || "";

const productBrand =
  button.dataset.productBrand || "";

const saved = window.Forma.toggle(
  productId,
  productHandle
);

window.Forma.activity?.add(
  saved
    ? "product_saved"
    : "product_unsaved",
  {
    entityType: "product",
    entityId: productId,
    handle: productHandle,
    source: "save-button",

    metadata: {
      title: productTitle,
      brand: productBrand
    }
  }
);

updateAll();

    showToast(
      saved
        ? "Saved to Your Forma"
        : "Removed from Your Forma"
    );
  }

  document.addEventListener("click", handleSaveClick);

  document.addEventListener("forma:saved-updated", updateAll);

  document.addEventListener("DOMContentLoaded", updateAll);

  document.addEventListener("shopify:section:load", updateAll);

  window.addEventListener("pageshow", updateAll);

  window.addEventListener("storage", updateAll);

  updateAll();
})();