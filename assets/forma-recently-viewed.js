/* ==========================================================
   FORMA — RECENTLY VIEWED MODULE
   ========================================================== */

(function () {
  "use strict";

  if (!window.Forma) {
    console.error(
      "[Forma Recently Viewed] Forma Engine must load first."
    );

    return;
  }

  if (window.Forma.recentlyViewed) {
    return;
  }

  const STORAGE_KEY =
    window.Forma.storage.keys.recentlyViewed;

  const MAX_PRODUCTS = 24;

  function getAll() {
    const products =
      window.Forma.storage.get(
        STORAGE_KEY,
        []
      );

    return Array.isArray(products)
      ? products
      : [];
  }

  function save(products) {
    window.Forma.storage.set(
      STORAGE_KEY,
      products
    );

    window.Forma.events.emit(
      "forma:recently-viewed-updated",
      {
        products,
        count: products.length
      }
    );
  }

  function add(product) {
    if (!product?.id) {
      return;
    }

    let products = getAll();

    const existingProduct =
      products.find(
        item =>
          String(item.id) ===
          String(product.id)
      );

    products = products.filter(
      item =>
        String(item.id) !==
        String(product.id)
    );

    products.unshift(product);

    if (
      products.length >
      MAX_PRODUCTS
    ) {
      products.length =
        MAX_PRODUCTS;
    }

    save(products);

    if (!existingProduct) {
      window.Forma.activity?.add(
        "product_viewed",
        {
          entityType: "product",
          entityId: product.id,
          handle: product.handle,
          source: "product-page",

          metadata: {
            title: product.title,
            brand:
              product.vendor ||
              product.brand ||
              ""
          }
        }
      );
    }
  }

  function clear() {
    save([]);
  }

  function count() {
    return getAll().length;
  }

  window.Forma.recentlyViewed = {
    getAll,
    add,
    clear,
    count
  };
})();