/* ==========================================================
   FORMA — SIGNAL ENGINE
   Version: 1.0.0

   Collects behavioral signals from:
   - Saved products
   - Followed brands
   - Recently viewed products
   ========================================================== */

(() => {
  "use strict";

  window.Forma = window.Forma || {};

  const Forma = window.Forma;

  /* ----------------------------------------------------------
     HELPERS
     ---------------------------------------------------------- */

  function clone(value) {
    if (value === undefined) {
      return undefined;
    }

    return JSON.parse(
      JSON.stringify(value)
    );
  }

  function normalizeBrand(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9æøå]+/gi, "-")
      .replace(/^-+|-+$/g, "");
  }

  function createBrandSignal(name = "") {
    return {
      name: String(name || "").trim(),
      saved: 0,
      viewed: 0,
      followed: false,
      firstSeen: null,
      lastSeen: null,
      lastInteraction: null
    };
  }

  function ensureBrand(
    signals,
    brandName
  ) {
    const key = normalizeBrand(brandName);

    if (!key) {
      return null;
    }

    if (!signals[key]) {
      signals[key] =
        createBrandSignal(brandName);
    }

    if (
      !signals[key].name &&
      brandName
    ) {
      signals[key].name =
        String(brandName).trim();
    }

    return signals[key];
  }

  function getTimestamp(
    item,
    fallback = Date.now()
  ) {
    const possibleValues = [
      item?.lastInteraction,
      item?.viewedAt,
      item?.savedAt,
      item?.addedAt,
      item?.createdAt,
      item?.timestamp,
      item?.updatedAt
    ];

    for (const value of possibleValues) {
      if (!value) continue;

      const timestamp =
        typeof value === "number"
          ? value
          : new Date(value).getTime();

      if (!Number.isNaN(timestamp)) {
        return timestamp;
      }
    }

    return fallback;
  }

  function updateInteraction(
    signal,
    timestamp
  ) {
    if (!signal || !timestamp) {
      return;
    }

    if (
      !signal.firstSeen ||
      timestamp < signal.firstSeen
    ) {
      signal.firstSeen = timestamp;
    }

    if (
      !signal.lastSeen ||
      timestamp > signal.lastSeen
    ) {
      signal.lastSeen = timestamp;
    }

    if (
      !signal.lastInteraction ||
      timestamp > signal.lastInteraction
    ) {
      signal.lastInteraction = timestamp;
    }
  }

  async function resolveProduct(item) {
    if (!item) {
      return null;
    }

    if (item.vendor) {
      return item;
    }

    const handle =
      item.handle ||
      item.productHandle;

    if (
      !handle ||
      !Forma.products?.get
    ) {
      return item;
    }

    try {
      const product =
        await Forma.products.get(handle);

      return {
        ...item,
        ...product,
        handle
      };
    } catch (error) {
      console.warn(
        "[Forma Signals] Could not resolve product:",
        handle,
        error
      );

      return item;
    }
  }

  /* ----------------------------------------------------------
     SAVED PRODUCT SIGNALS
     ---------------------------------------------------------- */

  async function collectSavedSignals(
    signals
  ) {
    const savedProducts =
      Forma.savedProducts?.getAll?.() || [];

    for (const item of savedProducts) {
      const product =
        await resolveProduct(item);

      const brandName =
        product?.vendor ||
        item?.vendor;

      const signal =
        ensureBrand(
          signals,
          brandName
        );

      if (!signal) {
        continue;
      }

      signal.saved += 1;

      updateInteraction(
        signal,
        getTimestamp(item)
      );
    }
  }

  /* ----------------------------------------------------------
     RECENTLY VIEWED SIGNALS
     ---------------------------------------------------------- */

  async function collectViewedSignals(
    signals
  ) {
    const viewedProducts =
      Forma.recentlyViewed?.getAll?.() || [];

    for (const item of viewedProducts) {
      const product =
        await resolveProduct(item);

      const brandName =
        product?.vendor ||
        item?.vendor;

      const signal =
        ensureBrand(
          signals,
          brandName
        );

      if (!signal) {
        continue;
      }

      signal.viewed += 1;

      updateInteraction(
        signal,
        getTimestamp(item)
      );
    }
  }

  /* ----------------------------------------------------------
     FOLLOWED BRAND SIGNALS
     ---------------------------------------------------------- */

  function collectFollowedSignals(
    signals
  ) {
    const followedBrands =
      Forma.followedBrands?.getAll?.() || [];

    for (const item of followedBrands) {
      const brandName =
        typeof item === "string"
          ? item
          : (
              item?.name ||
              item?.title ||
              item?.vendor ||
              item?.handle
            );

      const signal =
        ensureBrand(
          signals,
          brandName
        );

      if (!signal) {
        continue;
      }

      signal.followed = true;

      updateInteraction(
        signal,
        getTimestamp(item)
      );
    }
  }

  /* ----------------------------------------------------------
     PUBLIC COLLECTORS
     ---------------------------------------------------------- */

  async function getBrandSignals() {
    const signals = {};

    await collectSavedSignals(
      signals
    );

    await collectViewedSignals(
      signals
    );

    collectFollowedSignals(
      signals
    );

    return clone(signals);
  }

  async function getAll() {
    const brands =
      await getBrandSignals();

    return {
      generatedAt: Date.now(),
      brands
    };
  }

  /* ----------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------- */

  Forma.signals = {
    version: "1.0.0",

    getAll,

    getBrandSignals,

    normalizeBrand
  };

  Forma.events?.emit?.(
    "forma:signals-ready",
    {
      version:
        Forma.signals.version
    }
  );

  console.info(
    "[Forma Signals] Signal Engine ready"
  );
})();