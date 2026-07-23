/* ==========================================================
   FORMA — API LAYER
   ========================================================== */

(function () {

  "use strict";

  if (!window.Forma) {
    console.error(
      "[Forma API] Forma Engine must load first."
    );

    return;
  }

  if (window.Forma.api) {
    return;
  }

  async function request(url) {

    const response = await fetch(url, {
      credentials: "same-origin"
    });

    if (!response.ok) {
      throw new Error(
        `[Forma API] ${response.status} ${response.statusText}`
      );
    }

    return response.json();

  }

  const products = {
  async get(handle, options = {}) {
    const normalizedHandle =
      String(handle || "")
        .trim()
        .toLowerCase();

    if (!normalizedHandle) {
      throw new Error(
        "[Forma API] Product handle missing."
      );
    }

    const {
      force = false,
      ttl = 15 * 60 * 1000
    } = options;

    const cacheKey =
      `product:${normalizedHandle}`;

    if (force) {
      window.Forma.cache.remove(
        cacheKey
      );
    }

    return window.Forma.cache.remember(
      cacheKey,
      () =>
        request(
          `/products/${encodeURIComponent(
            normalizedHandle
          )}.js`
        ),
      {
        ttl,
        persist: true
      }
    );
  }
};

  const collections = {

    async get(handle) {

      return request(
        `/collections/${handle}?view=json`
      );

    }

  };

  const articles = {

    async get(handle) {

      return request(
        `/blogs/journal/${handle}?view=json`
      );

    }

  };

  window.Forma.api = {

    request,

    products,

    collections,

    articles

  };

})();