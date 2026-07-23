/* ==========================================================
   FORMA — SAVED PRODUCTS PAGE
   ========================================================== */

(function () {
  "use strict";

  const container = document.querySelector(
    "#FormaSavedProducts"
  );

  const emptyState = document.querySelector(
    "#FormaEmptyState"
  );

  if (!container || !emptyState) return;

  function getModule() {
    return window.Forma?.savedProducts;
  }

  if (!getModule()) {
    console.warn(
      "[Forma Saved Products Page] Saved Products module is unavailable."
    );

    return;
  }

  let renderVersion = 0;

  async function fetchProduct(handle) {
  try {
    return await window.Forma.api.products.get(handle);
  } catch (error) {
    console.error(
      `[Forma Saved Products] Could not load product: ${handle}`,
      error
    );

    return null;
  }
}

  function formatMoney(cents) {
    const amount = Number(cents);

    if (!Number.isFinite(amount)) {
      return "";
    }

    return new Intl.NumberFormat("da-DK", {
      style: "currency",
      currency: "DKK",
      minimumFractionDigits: 0
    }).format(amount / 100);
  }

  function createElement(
    tagName,
    className,
    textContent
  ) {
    const element = document.createElement(tagName);

    if (className) {
      element.className = className;
    }

    if (textContent !== undefined) {
      element.textContent = textContent;
    }

    return element;
  }

  function createProductLink(product, className) {
    const link = document.createElement("a");

    link.href = product.url;
    link.className = className || "";

    return link;
  }

  function createHeartIcon() {
    const namespace = "http://www.w3.org/2000/svg";

    const svg = document.createElementNS(
      namespace,
      "svg"
    );

    svg.setAttribute("width", "18");
    svg.setAttribute("height", "18");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.7");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");

    const path = document.createElementNS(
      namespace,
      "path"
    );

    path.setAttribute(
      "d",
      "M12 21s-7-4.35-9.5-8C.5 9.5 2.4 5 6.8 5c2.1 0 3.5 1.2 5.2 3 1.7-1.8 3.1-3 5.2-3C21.6 5 23.5 9.5 21.5 13 19 16.65 12 21 12 21z"
    );

    svg.appendChild(path);

    return svg;
  }

  function createProductCard(product) {
    const image =
      product.featured_image ||
      product.images?.[0] ||
      "";

    const card = createElement(
      "article",
      "forma-saved-card"
    );

    const media = createElement(
      "div",
      "forma-saved-card__media"
    );

    const imageLink = createProductLink(product);

    if (image) {
      const productImage = document.createElement("img");

      productImage.src = image;
      productImage.alt = product.title || "";
      productImage.loading = "lazy";

      imageLink.appendChild(productImage);
    }

    media.appendChild(imageLink);

    const actions = createElement(
      "div",
      "forma-saved-card__actions"
    );

    const viewProductLink = createProductLink(
      product,
      "forma-saved-card__action"
    );

    viewProductLink.textContent = "View product";

    actions.appendChild(viewProductLink);
    media.appendChild(actions);

    const saveButton = createElement(
      "button",
      "forma-save-button forma-save-button--card"
    );

    saveButton.type = "button";

    saveButton.setAttribute(
      "data-forma-save",
      ""
    );

    saveButton.setAttribute(
      "data-product-id",
      String(product.id)
    );

    saveButton.setAttribute(
      "data-product-handle",
      product.handle
    );

    saveButton.setAttribute(
      "aria-pressed",
      "true"
    );

    saveButton.setAttribute(
      "aria-label",
      `Remove ${product.title} from Your Forma`
    );

    const icon = createElement(
      "span",
      "forma-save-button__icon is-saved"
    );

    icon.setAttribute(
      "data-forma-save-icon",
      ""
    );

    icon.appendChild(createHeartIcon());
    saveButton.appendChild(icon);
    media.appendChild(saveButton);

    const content = createElement(
      "div",
      "forma-saved-card__content"
    );

    const vendor = createElement(
      "p",
      "forma-saved-card__vendor",
      product.vendor || ""
    );

    const title = createElement(
      "h2",
      "forma-saved-card__title"
    );

    const titleLink = createProductLink(product);

    titleLink.textContent = product.title || "";
    title.appendChild(titleLink);

    const price = createElement(
      "p",
      "forma-saved-card__price",
      formatMoney(product.price)
    );

    content.appendChild(vendor);
    content.appendChild(title);
    content.appendChild(price);

    card.appendChild(media);
    card.appendChild(content);

    return card;
  }

  function setLoading(isLoading) {
    container.setAttribute(
      "aria-busy",
      String(isLoading)
    );

    container.classList.toggle(
      "is-loading",
      isLoading
    );
  }

  function showEmptyState() {
    container.replaceChildren();
    emptyState.hidden = false;
    setLoading(false);
  }

  function showProducts(fragment) {
    container.replaceChildren(fragment);
    emptyState.hidden = true;
    setLoading(false);
  }

  async function renderSavedProducts() {
    const currentRenderVersion = ++renderVersion;
    const savedProducts = getModule().getAll();

    setLoading(true);
    container.replaceChildren();

    if (!savedProducts.length) {
      showEmptyState();
      return;
    }

    const validProducts = savedProducts.filter(
      product =>
        product &&
        typeof product.handle === "string" &&
        product.handle.trim()
    );

    if (!validProducts.length) {
      showEmptyState();
      return;
    }

    const results = await Promise.allSettled(
      validProducts.map(product =>
        fetchProduct(product.handle)
      )
    );

    if (currentRenderVersion !== renderVersion) {
      return;
    }

    const fragment = document.createDocumentFragment();

    results.forEach(result => {
      if (result.status !== "fulfilled") {
        console.warn(
          "[Forma Saved Products Page] A saved product could not be loaded:",
          result.reason
        );

        return;
      }

      fragment.appendChild(
        createProductCard(result.value)
      );
    });

    if (!fragment.childNodes.length) {
      showEmptyState();
      return;
    }

    showProducts(fragment);
  }

  window.Forma.events.on(
    "forma:saved-products-updated",
    renderSavedProducts
  );

  window.Forma.events.on(
    "forma:saved-product-toggled",
    renderSavedProducts
  );

  window.addEventListener("storage", event => {
    const storageKey =
      window.Forma.storage.keys.savedProducts;

    if (event.key === storageKey) {
      renderSavedProducts();
    }
  });

  renderSavedProducts();

})();