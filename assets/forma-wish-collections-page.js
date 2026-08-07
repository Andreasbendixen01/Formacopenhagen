/* ==========================================================
   FORMA — WISH COLLECTIONS PAGE UI
   ========================================================== */

(function () {
  "use strict";

  const section = document.querySelector(
    "[data-forma-wish-collections]"
  );

  if (!section) {
    return;
  }

  const grid = section.querySelector(
    "[data-wish-collections-grid]"
  );

  const emptyState = section.querySelector(
    "[data-wish-collections-empty]"
  );

  const createButtons = [
    ...section.querySelectorAll(
      "[data-wish-collection-create]"
    )
  ];

  const modal = section.querySelector(
    "[data-wish-modal]"
  );

  const closeButtons = [
    ...section.querySelectorAll(
      "[data-wish-modal-close]"
    )
  ];

  const form = section.querySelector(
    "[data-wish-form]"
  );

  const titleField = section.querySelector(
    "[data-wish-title]"
  );

  const descriptionField =
    section.querySelector(
      "[data-wish-description]"
    );

  const occasionField = section.querySelector(
    "[data-wish-occasion]"
  );

  const statusElement = section.querySelector(
    "[data-wish-form-status]"
  );

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatOccasion(value) {
    const labels = {
      birthday: "Birthday",
      christmas: "Christmas",
      wedding: "Wedding",
      home: "Home",
      travel: "Travel",
      other: "Personal"
    };

    return labels[value] || "Personal";
  }

  function formatVisibility(value) {
    return value === "shared"
      ? "Shareable"
      : "Private";
  }

  function createCard(
    collection,
    index
  ) {
    const productCount =
      collection.products.length;

    const coverProduct =
      collection.products.find(
        product => product.image
      );

    const coverMarkup =
      coverProduct
        ? `
          <img
            src="${escapeHtml(
              coverProduct.image
            )}"
            alt=""
            loading="lazy"
          >
        `
        : `
          <div class="forma-wish-card__placeholder">
            <span>FORMA</span>
            <span>Collection</span>
        </div>
        `;

    return `
      <article
        class="forma-wish-card"
        data-wish-collection-id="${escapeHtml(
          collection.id
        )}"
      >
        <a
          class="forma-wish-card__cover"
          href="/pages/wish-collection?id=${encodeURIComponent(
            collection.id
          )}"
        >
          ${coverMarkup}

          <span class="forma-wish-card__index">
            ${String(index + 1).padStart(2, "0")}
          </span>

          <span class="forma-wish-card__visibility">
            ${escapeHtml(
              formatVisibility(
                collection.visibility
              )
            )}
          </span>
        </a>

        <div class="forma-wish-card__content">
          <p class="forma-wish-card__occasion">
            ${escapeHtml(
              formatOccasion(
                collection.occasion
              )
            )}
          </p>

          <h3 class="forma-wish-card__title">
            ${escapeHtml(collection.title)}
          </h3>

          <div class="forma-wish-card__meta">
            <span>
              ${productCount}
              ${
                productCount === 1
                  ? "wish"
                  : "wishes"
              }
            </span>

            <a
              href="/pages/wish-collection?id=${encodeURIComponent(
                collection.id
              )}"
            >
              <span>Open collection</span>
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </article>
    `;
  }

  function render() {
    if (
      !window.Forma?.wishlists ||
      !grid ||
      !emptyState
    ) {
      return;
    }

    const collections =
      window.Forma.wishlists.getAll();

    if (!collections.length) {
      grid.hidden = true;
      grid.innerHTML = "";
      emptyState.hidden = false;
      return;
    }

    grid.innerHTML =
      collections
        .map(createCard)
        .join("");

    grid.hidden = false;
    emptyState.hidden = true;
  }

  function setStatus(
    message,
    type = ""
  ) {
    if (!statusElement) {
      return;
    }

    statusElement.textContent =
      message;

    statusElement.classList.toggle(
      "is-error",
      type === "error"
    );
  }

  function openModal() {
    if (!modal) {
      return;
    }

    form?.reset();
    setStatus("");

    modal.hidden = false;

    modal.setAttribute(
      "aria-hidden",
      "false"
    );

    document.documentElement.classList.add(
      "forma-wish-modal-is-open"
    );

    window.setTimeout(() => {
      titleField?.focus();
    }, 50);
  }

  function closeModal() {
    if (!modal) {
      return;
    }

    modal.hidden = true;

    modal.setAttribute(
      "aria-hidden",
      "true"
    );

    document.documentElement.classList.remove(
      "forma-wish-modal-is-open"
    );
  }

  function createCollection(event) {
    event.preventDefault();

    const title =
      titleField?.value.trim() || "";

    if (!title) {
      setStatus(
        "Please give your collection a name.",
        "error"
      );

      titleField?.focus();
      return;
    }

    const visibilityField =
      form.querySelector(
        'input[name="visibility"]:checked'
      );

    const collection =
      window.Forma
        ?.wishlists
        ?.create?.({
          title,

          description:
            descriptionField
              ?.value
              ?.trim() || "",

          occasion:
            occasionField
              ?.value || "",

          visibility:
            visibilityField
              ?.value ||
            "private"
        });

    if (!collection) {
      setStatus(
        "The collection could not be created.",
        "error"
      );

      return;
    }

    closeModal();
    render();

    window.Forma
      ?.toast
      ?.success?.(
        "Wish collection created"
      );
  }

  createButtons.forEach(button => {
    button.addEventListener(
      "click",
      openModal
    );
  });

  closeButtons.forEach(button => {
    button.addEventListener(
      "click",
      closeModal
    );
  });

  form?.addEventListener(
    "submit",
    createCollection
  );

  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Escape" &&
        modal &&
        !modal.hidden
      ) {
        closeModal();
      }
    }
  );

  window.addEventListener(
    "forma:wishlists-updated",
    render
  );

  window.Forma
    ?.events
    ?.on?.(
      "forma:wishlists-updated",
      render
    );

    /*
 * Move the modal directly under body.
 * This ensures full viewport positioning and scrolling.
 */

if (modal) {
  document.body.appendChild(modal);
}

  render();

  console.info(
    "[Forma Wish Collections Page] Ready"
  );
})();