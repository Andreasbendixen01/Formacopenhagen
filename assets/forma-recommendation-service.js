/* ==========================================================
   FORMA — RECOMMENDATION SERVICE
   Version: 1.0.0

   Orchestrates:
   Collections
        ↓
   Recommendation Engine
        ↓
   UI

   ========================================================== */

(() => {
  "use strict";

  if (!window.Forma) {
    console.error(
      "[Forma Recommendation Service] Forma Engine missing."
    );
    return;
  }

  const Forma = window.Forma;

  if (Forma.recommendationService) {
    return;
  }

  const DEFAULT_OPTIONS = {
    limit: 12,
    collections: [],
    recommendationOptions: {}
  };

  function merge(target = {}, source = {}) {
    return {
      ...target,
      ...source
    };
  }

  async function loadCollection(handle) {
    if (!Forma.collections?.products) {
      throw new Error(
        "Forma.collections.products() not available."
      );
    }

    return Forma.collections.products(handle);
  }

  async function loadCollections(handles = []) {
    const unique = [...new Set(handles.filter(Boolean))];

    const result = await Promise.all(
      unique.map(loadCollection)
    );

    return result.flat();
  }

  async function rankProducts(
    products,
    options = {}
  ) {
    if (!Forma.recommendations?.rank) {
      throw new Error(
        "Forma.recommendations.rank() not available."
      );
    }

    return Forma.recommendations.rank(
      products,
      options
    );
  }

  async function getFromCollection(
    handle,
    options = {}
  ) {
    const products =
      await loadCollection(handle);

    return rankProducts(
      products,
      options.recommendationOptions || {}
    );
  }

  async function getFromCollections(
    handles,
    options = {}
  ) {
    const products =
      await loadCollections(handles);

    return rankProducts(
      products,
      options.recommendationOptions || {}
    );
  }

  async function getForYou(
    options = {}
  ) {
    const settings = merge(
      DEFAULT_OPTIONS,
      options
    );

    if (
      !settings.collections.length
    ) {
      console.warn(
        "[Forma Recommendation Service] No collections supplied."
      );

      return [];
    }

    return getFromCollections(
      settings.collections,
      settings
    );
  }

  Forma.recommendationService = {
    version: "1.0.0",

    getForYou,
    getFromCollection,
    getFromCollections,

    loadCollection,
    loadCollections
  };

  console.info(
    "[Forma Recommendation Service] Ready"
  );
})();