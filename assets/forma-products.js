/* ==========================================================
   FORMA — PRODUCT SERVICE
   ========================================================== */

(function () {
  "use strict";

  if (!window.Forma) {
    console.error(
      "[Forma Products] Forma Engine must load first."
    );

    return;
  }

  if (!window.Forma.cache) {
    console.error(
      "[Forma Products] Forma Cache must load first."
    );

    return;
  }

  if (window.Forma.products) {
    return;
  }

  const PRODUCT_TTL =
    60 * 60 * 1000; // 1 time

  function normalizeHandle(value) {
    return String(value || "")
      .trim()
      .replace(/^https?:\/\/[^/]+/i, "")
      .replace(/^\/?products\//i, "")
      .replace(/\.js(?:\?.*)?$/i, "")
      .replace(/[?#].*$/, "")
      .replace(/^\/+|\/+$/g, "")
      .toLowerCase();
  }

  function createCacheKey(handle) {
    return `product:${handle}`;
  }

  async function requestProduct(handle) {
    const response = await window.fetch(
      `/products/${encodeURIComponent(handle)}.js`
    );

    if (!response.ok) {
      throw new Error(
        `[Forma Products] Could not load "${handle}". Status: ${response.status}`
      );
    }

    return response.json();
  }

  async function get(value, options = {}) {
    const handle =
      normalizeHandle(value);

    if (!handle) {
      return null;
    }

    const {
      force = false,
      ttl = PRODUCT_TTL
    } = options;

    const cacheKey =
      createCacheKey(handle);

    if (force) {
      window.Forma.cache.remove(
        cacheKey
      );
    }

    try {
      return await window.Forma.cache.remember(
        cacheKey,
        () => requestProduct(handle),
        {
          ttl,
          persist: true
        }
      );
    } catch (error) {
      console.warn(
        "[Forma Products] Product request failed:",
        handle,
        error
      );

      return null;
    }
  }

  function peek(value) {
    const handle =
      normalizeHandle(value);

    if (!handle) {
      return undefined;
    }

    return window.Forma.cache.get(
      createCacheKey(handle)
    );
  }

  function has(value) {
    return peek(value) !== undefined;
  }

  function remove(value) {
    const handle =
      normalizeHandle(value);

    if (!handle) {
      return;
    }

    window.Forma.cache.remove(
      createCacheKey(handle)
    );
  }

  window.Forma.products = {
    get,
    fetch: get,
    peek,
    has,
    remove,
    normalizeHandle
  };
})();