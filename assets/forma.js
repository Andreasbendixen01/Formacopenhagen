/* ==========================================================
   FORMA — SAVED PRODUCTS MODULE
   ========================================================== */

(function () {
  "use strict";

  if (!window.Forma) {
    console.error(
      "[Forma Saved Products] Forma Engine must load before forma.js"
    );

    return;
  }

  if (window.Forma.savedProducts) {
    return;
  }

  const STORAGE_KEY = window.Forma.storage.keys.savedProducts;

  function normalizeProductId(productId) {
    return String(productId);
  }

  function getAll() {
    const products = window.Forma.storage.get(STORAGE_KEY, []);

    return Array.isArray(products) ? products : [];
  }

  function save(products) {
    window.Forma.storage.set(STORAGE_KEY, products);

    window.Forma.events.emit("forma:saved-products-updated", {
      products,
      count: products.length
    });
  }

  function isSaved(productId) {
    const normalizedProductId = normalizeProductId(productId);

    return getAll().some(
      product => normalizeProductId(product.id) === normalizedProductId
    );
  }

  function add(productId, productHandle) {
    const normalizedProductId = normalizeProductId(productId);
    const products = getAll();

    if (isSaved(normalizedProductId)) {
      return false;
    }

    products.push({
      id: normalizedProductId,
      handle: productHandle
    });

    save(products);

    return true;
  }

  function remove(productId) {
    const normalizedProductId = normalizeProductId(productId);
    const products = getAll();

    const updatedProducts = products.filter(
      product => normalizeProductId(product.id) !== normalizedProductId
    );

    if (updatedProducts.length === products.length) {
      return false;
    }

    save(updatedProducts);

    return true;
  }

  function toggle(productId, productHandle) {
    const normalizedProductId = normalizeProductId(productId);

    if (isSaved(normalizedProductId)) {
      remove(normalizedProductId);
      return false;
    }

    add(normalizedProductId, productHandle);
    return true;
  }

  function count() {
    return getAll().length;
  }

  function clear() {
    save([]);
  }

  window.Forma.savedProducts = {
    getAll,
    isSaved,
    add,
    remove,
    toggle,
    count,
    clear
  };

})();