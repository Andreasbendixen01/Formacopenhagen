/* ==========================================================
   FORMA — DAILY EDIT ENGINE V1
   ========================================================== */

(function () {
  "use strict";

  window.Forma = window.Forma || {};

  const CACHE_KEY =
    "forma_daily_edit_v1";

  const DEFAULT_LIMIT = 8;

  const SLOT_REASONS = {
    trusted:
      "A strong match for your taste",

    followedBrand:
      "New from a brand you follow",

    savedConnection:
      "Inspired by products you saved",

    recentConnection:
      "Connected to your recent activity",

    discovery:
      "A new discovery for you",

    wildcard:
      "A wildcard selected by Forma",

    premium:
      "An elevated addition to your edit",

    final:
      "Chosen for today's Forma"
  };

  /* ========================================================
     GENERAL HELPERS
     ======================================================== */

  function safeArray(value) {
    return Array.isArray(value)
      ? value
      : [];
  }

  function normalizeText(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  function normalizeHandle(value) {
    return normalizeText(value)
      .replace(/^\/products\//, "")
      .split("?")[0]
      .split("#")[0]
      .replace(/\/$/, "");
  }

  function unique(values) {
    return Array.from(
      new Set(
        safeArray(values)
          .map(normalizeText)
          .filter(Boolean)
      )
    );
  }

  function getProductHandle(product) {
    return normalizeHandle(
      product?.handle ||
      product?.productHandle ||
      product?.url ||
      product?.href
    );
  }

  function getProductId(product) {
    return String(
      product?.id ||
      product?.productId ||
      ""
    );
  }

  function getProductKey(product) {
    return (
      getProductHandle(product) ||
      getProductId(product)
    );
  }

  function getVendor(product) {
    return normalizeText(
      product?.vendor ||
      product?.brand ||
      product?.productVendor
    );
  }

  function getProductType(product) {
    return normalizeText(
      product?.product_type ||
      product?.productType ||
      product?.type
    );
  }

  function getPrice(product) {
    const rawPrice =
      product?.variants?.[0]?.price ??
      product?.price ??
      product?.price_min;

    if (
      rawPrice === null ||
      rawPrice === undefined ||
      rawPrice === ""
    ) {
      return 0;
    }

    if (typeof rawPrice === "string") {
      const normalizedPrice =
        rawPrice
          .replace(/\s/g, "")
          .replace(",", ".")
          .replace(/[^\d.-]/g, "");

      const numericPrice =
        Number(normalizedPrice);

      return Number.isFinite(
        numericPrice
      )
        ? numericPrice
        : 0;
    }

    const numericPrice =
      Number(rawPrice);

    if (!Number.isFinite(numericPrice)) {
      return 0;
    }

    /*
     * Fallback for data sources returning
     * integer prices in minor units.
     */
    return (
      Number.isInteger(numericPrice) &&
      numericPrice >= 10000
    )
      ? numericPrice / 100
      : numericPrice;
  }

  function getRecommendationScore(
    product
  ) {
    return Number(
      product
        ?.formaRecommendation
        ?.score || 0
    );
  }

  function productsMatch(
    first,
    second
  ) {
    const firstKey =
      getProductKey(first);

    const secondKey =
      getProductKey(second);

    return Boolean(
      firstKey &&
      secondKey &&
      firstKey === secondKey
    );
  }

  function includesProduct(
    products,
    product
  ) {
    return safeArray(products).some(
      existingProduct =>
        productsMatch(
          existingProduct,
          product
        )
    );
  }

  /* ========================================================
     DATE AND SEED
     ======================================================== */

  function getDateKey(date = new Date()) {
    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        date.getDate()
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getUserSeed() {
    try {
      const profile =
        window.Forma.profile
          ?.get?.() || {};

      return String(
        profile?.id ||
        profile?.email ||
        profile?.firstName ||
        profile?.name ||
        "forma-guest"
      );
    } catch (error) {
      return "forma-guest";
    }
  }

  function hashString(value) {
    let hash = 2166136261;

    const text =
      String(value || "");

    for (
      let index = 0;
      index < text.length;
      index += 1
    ) {
      hash ^= text.charCodeAt(index);

      hash = Math.imul(
        hash,
        16777619
      );
    }

    return hash >>> 0;
  }

  function getSeed() {
    return hashString(
      [
        getDateKey(),
        getUserSeed()
      ].join(":")
    );
  }

  function createRandom(seed) {
    let state =
      seed >>> 0;

    return function random() {
      state += 0x6d2b79f5;

      let result = state;

      result = Math.imul(
        result ^ (result >>> 15),
        result | 1
      );

      result ^=
        result +
        Math.imul(
          result ^ (result >>> 7),
          result | 61
        );

      return (
        (
          result ^
          (result >>> 14)
        ) >>> 0
      ) / 4294967296;
    };
  }

  function seededShuffle(
    values,
    seed
  ) {
    const result =
      [...safeArray(values)];

    const random =
      createRandom(seed);

    for (
      let index =
        result.length - 1;
      index > 0;
      index -= 1
    ) {
      const randomIndex =
        Math.floor(
          random() *
          (index + 1)
        );

      [
        result[index],
        result[randomIndex]
      ] = [
        result[randomIndex],
        result[index]
      ];
    }

    return result;
  }

  /* ========================================================
     DATA READERS
     ======================================================== */

  function getSavedProducts() {
    try {
      return safeArray(
        window.Forma.savedProducts
          ?.getAll?.()
      );
    } catch (error) {
      return [];
    }
  }

  function getRecentlyViewed() {
    try {
      return safeArray(
        window.Forma.recentlyViewed
          ?.getAll?.()
      );
    } catch (error) {
      return [];
    }
  }

  function getFollowedBrands() {
    try {
      return unique(
        safeArray(
          window.Forma.followedBrands
            ?.getAll?.()
        ).map(brand =>
          brand?.name ||
          brand?.title ||
          brand?.vendor ||
          brand?.handle ||
          brand
        )
      );
    } catch (error) {
      return [];
    }
  }

  /* ========================================================
     CACHE
     ======================================================== */

  function readCache() {
    try {
      const cache =
        JSON.parse(
          localStorage.getItem(
            CACHE_KEY
          ) || "null"
        );

      if (
        !cache ||
        cache.dateKey !==
          getDateKey() ||
        !Array.isArray(
          cache.products
        )
      ) {
        return null;
      }

      return cache.products;
    } catch (error) {
      return null;
    }
  }

  function writeCache(products) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          dateKey:
            getDateKey(),

          seed:
            getSeed(),

          createdAt:
            new Date().toISOString(),

          products
        })
      );
    } catch (error) {
      console.warn(
        "[Forma Daily Edit] Could not cache today's edit.",
        error
      );
    }
  }

  function clearCache() {
    try {
      localStorage.removeItem(
        CACHE_KEY
      );
    } catch (error) {
      // No action required.
    }
  }

  /* ========================================================
     PRODUCT CLASSIFICATION
     ======================================================== */

  function buildContext() {
    const savedProducts =
      getSavedProducts();

    const recentlyViewed =
      getRecentlyViewed();

    const followedBrands =
      getFollowedBrands();

    return {
      savedProducts,
      recentlyViewed,
      followedBrands,

      savedBrands: unique(
        savedProducts.map(
          getVendor
        )
      ),

      viewedBrands: unique(
        recentlyViewed.map(
          getVendor
        )
      ),

      savedTypes: unique(
        savedProducts.map(
          getProductType
        )
      ),

      viewedTypes: unique(
        recentlyViewed.map(
          getProductType
        )
      )
    };
  }

  function fromFollowedBrand(
    product,
    context
  ) {
    const vendor =
      getVendor(product);

    return Boolean(
      vendor &&
      context.followedBrands
        .includes(vendor)
    );
  }

  function connectedToSaved(
    product,
    context
  ) {
    const vendor =
      getVendor(product);

    const productType =
      getProductType(product);

    return Boolean(
      (
        vendor &&
        context.savedBrands
          .includes(vendor)
      ) ||
      (
        productType &&
        context.savedTypes
          .includes(productType)
      )
    );
  }

  function connectedToRecent(
    product,
    context
  ) {
    const vendor =
      getVendor(product);

    const productType =
      getProductType(product);

    return Boolean(
      (
        vendor &&
        context.viewedBrands
          .includes(vendor)
      ) ||
      (
        productType &&
        context.viewedTypes
          .includes(productType)
      )
    );
  }

  function isNewDiscovery(
    product,
    context
  ) {
    const vendor =
      getVendor(product);

    if (!vendor) {
      return false;
    }

    return ![
      ...context.followedBrands,
      ...context.savedBrands,
      ...context.viewedBrands
    ].includes(vendor);
  }

  /* ========================================================
     SLOT HELPERS
     ======================================================== */

  function selectFirstAvailable(
    products,
    selected,
    predicate
  ) {
    return safeArray(products).find(
      product =>
        !includesProduct(
          selected,
          product
        ) &&
        predicate(product)
    );
  }

  function selectFromPool(
    products,
    selected,
    seed,
    predicate = () => true
  ) {
    const pool =
      safeArray(products).filter(
        product =>
          !includesProduct(
            selected,
            product
          ) &&
          predicate(product)
      );

    if (!pool.length) {
      return null;
    }

    return seededShuffle(
      pool,
      seed
    )[0];
  }

  function addProduct(
    selected,
    product,
    slot,
    reason
  ) {
    if (
      !product ||
      includesProduct(
        selected,
        product
      )
    ) {
      return false;
    }

    selected.push({
      ...product,

      formaDailyEdit: {
        slot,
        reason,
        dateKey:
          getDateKey(),

        seed:
          getSeed()
      }
    });

    return true;
  }

  /* ========================================================
     DAILY EDIT COMPOSITION
     ======================================================== */

  function composeDailyEdit(
    products,
    limit
  ) {
    const seed =
      getSeed();

    const context =
      buildContext();

    const rankedProducts =
      [...safeArray(products)].sort(
        (first, second) =>
          getRecommendationScore(
            second
          ) -
          getRecommendationScore(
            first
          )
      );

    const shuffledProducts =
      seededShuffle(
        rankedProducts,
        seed
      );

    const selected = [];

    /*
     * Slot 1:
     * Strongest overall recommendation.
     */
    addProduct(
      selected,
      rankedProducts[0],
      "trusted",
      SLOT_REASONS.trusted
    );

    /*
     * Slot 2:
     * Product from a followed brand.
     */
    addProduct(
      selected,
      selectFirstAvailable(
        rankedProducts,
        selected,
        product =>
          fromFollowedBrand(
            product,
            context
          )
      ),
      "followedBrand",
      SLOT_REASONS.followedBrand
    );

    /*
     * Slot 3:
     * Connected to saved products.
     */
    addProduct(
      selected,
      selectFirstAvailable(
        rankedProducts,
        selected,
        product =>
          connectedToSaved(
            product,
            context
          )
      ),
      "savedConnection",
      SLOT_REASONS.savedConnection
    );

    /*
     * Slot 4:
     * Connected to recent behaviour.
     */
    addProduct(
      selected,
      selectFirstAvailable(
        rankedProducts,
        selected,
        product =>
          connectedToRecent(
            product,
            context
          )
      ),
      "recentConnection",
      SLOT_REASONS.recentConnection
    );

    /*
     * Slot 5:
     * Product from a brand the user has
     * not interacted with before.
     */
    addProduct(
      selected,
      selectFromPool(
        shuffledProducts,
        selected,
        seed + 101,
        product =>
          isNewDiscovery(
            product,
            context
          )
      ),
      "discovery",
      SLOT_REASONS.discovery
    );

    /*
     * Slot 6:
     * Wildcard from the upper half of
     * the recommendation pool.
     */
    const upperPool =
      rankedProducts.slice(
        0,
        Math.max(
          12,
          Math.ceil(
            rankedProducts.length /
            2
          )
        )
      );

    addProduct(
      selected,
      selectFromPool(
        upperPool,
        selected,
        seed + 202
      ),
      "wildcard",
      SLOT_REASONS.wildcard
    );

    /*
     * Slot 7:
     * Higher-priced editorial product.
     */
    const premiumCandidates =
      [...rankedProducts].sort(
        (first, second) =>
          getPrice(second) -
          getPrice(first)
      );

    addProduct(
      selected,
      selectFirstAvailable(
        premiumCandidates,
        selected,
        product =>
          getPrice(product) > 0
      ),
      "premium",
      SLOT_REASONS.premium
    );

    /*
     * Fill any remaining slots using
     * the daily seeded order.
     */
    shuffledProducts.forEach(
      product => {
        if (
          selected.length >= limit
        ) {
          return;
        }

        addProduct(
          selected,
          product,
          "final",
          SLOT_REASONS.final
        );
      }
    );

    return selected.slice(
      0,
      limit
    );
  }

  /* ========================================================
     PUBLIC METHODS
     ======================================================== */

  async function getProducts(
    limit = DEFAULT_LIMIT,
    options = {}
  ) {
    const safeLimit =
      Math.max(
        1,
        Number(limit) ||
        DEFAULT_LIMIT
      );

    if (
      !options.force
    ) {
      const cached =
        readCache();

      if (
        cached &&
        cached.length
      ) {
        return cached.slice(
          0,
          safeLimit
        );
      }
    }

    if (
      !window.Forma
        ?.recommendations
        ?.getProducts
    ) {
      console.error(
        "[Forma Daily Edit] Recommendation Engine must load first."
      );

      return [];
    }

    /*
     * We request a wider candidate pool
     * so the Daily Edit can create real
     * variation and discoveries.
     */
    const candidates =
      await window.Forma
        .recommendations
        .getProducts(
          Math.max(
            40,
            safeLimit * 5
          ),
          {
            force:
              Boolean(options.force)
          }
        );

    if (!candidates.length) {
      return [];
    }

    const products =
      composeDailyEdit(
        candidates,
        safeLimit
      );

    writeCache(products);

    return products;
  }

  function getReason(product) {
    return (
      product
        ?.formaDailyEdit
        ?.reason ||
      product
        ?.formaRecommendation
        ?.primaryReason ||
      SLOT_REASONS.final
    );
  }

  async function refresh(
    limit = DEFAULT_LIMIT
  ) {
    clearCache();

    const products =
      await getProducts(
        limit,
        {
          force: true
        }
      );

    window.dispatchEvent(
      new CustomEvent(
        "forma:daily-edit-updated",
        {
          detail: {
            products,
            dateKey:
              getDateKey(),
            seed:
              getSeed()
          }
        }
      )
    );

    return products;
  }

  /* ========================================================
     INVALIDATION EVENTS
     ======================================================== */

  [
    "forma:saved-updated",
    "forma:followed-brands-updated",
    "forma:profile-updated",
    "forma:onboarding-completed"
  ].forEach(eventName => {
    window.addEventListener(
      eventName,
      () => {
        clearCache();

        window.dispatchEvent(
          new CustomEvent(
            "forma:daily-edit-profile-changed"
          )
        );
      }
    );
  });

  /* ========================================================
     PUBLIC API
     ======================================================== */

  window.Forma.dailyEdit = {
    getProducts,
    refresh,
    getReason,
    getSeed,
    getDateKey,
    clearCache,
    composeDailyEdit
  };
})();