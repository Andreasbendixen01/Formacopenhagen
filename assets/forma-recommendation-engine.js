/* ==========================================================
   FORMA — RECOMMENDATION ENGINE V1
   ========================================================== */

(function () {
  "use strict";

  window.Forma = window.Forma || {};

  const CACHE_KEY =
    "forma_recommendation_catalog_v1";

  const CACHE_DURATION =
    30 * 60 * 1000;

  const DEFAULT_LIMIT = 6;

  const WEIGHTS = {
    followedBrand: 42,
    savedBrand: 30,
    viewedBrand: 20,

    savedProductType: 24,
    viewedProductType: 16,

    savedTag: 10,
    viewedTag: 6,
    profileCategory: 20,
    profileStyle: 14,

    available: 4,
    duplicatePenalty: 1000
  };

  /* ========================================================
     HELPERS
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

  function escapeRegExp(value) {
    return String(value)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function textContains(
    source,
    value
  ) {
    const normalizedSource =
      normalizeText(source);

    const normalizedValue =
      normalizeText(value);

    if (
      !normalizedSource ||
      !normalizedValue
    ) {
      return false;
    }

    const expression =
      new RegExp(
        `(^|[^a-z0-9æøå])${escapeRegExp(
          normalizedValue
        )}([^a-z0-9æøå]|$)`,
        "i"
      );

    return expression.test(
      normalizedSource
    );
  }

  function countMatches(
    sourceValues,
    targetValues
  ) {
    const source =
      unique(sourceValues);

    const targets =
      unique(targetValues);

    return targets.filter(target =>
      source.some(value =>
        value === target ||
        textContains(value, target) ||
        textContains(target, value)
      )
    ).length;
  }

  function getHandle(product) {
    return normalizeHandle(
      product?.handle ||
      product?.productHandle ||
      product?.url ||
      product?.href
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

  function getTags(product) {
    const tags = product?.tags;

    if (Array.isArray(tags)) {
      return unique(tags);
    }

    if (typeof tags === "string") {
      return unique(
        tags.split(",")
      );
    }

    return [];
  }

  function getTitle(product) {
    return String(
      product?.title ||
      product?.name ||
      ""
    ).trim();
  }

  function getSearchableText(product) {
    return [
      getTitle(product),
      getVendor(product),
      getProductType(product),
      ...getTags(product)
    ]
      .filter(Boolean)
      .join(" ");
  }

  function productsMatch(
    first,
    second
  ) {
    const firstHandle =
      getHandle(first);

    const secondHandle =
      getHandle(second);

    if (
      firstHandle &&
      secondHandle
    ) {
      return (
        firstHandle === secondHandle
      );
    }

    const firstId =
      String(
        first?.id ||
        first?.productId ||
        ""
      );

    const secondId =
      String(
        second?.id ||
        second?.productId ||
        ""
      );

    return Boolean(
      firstId &&
      secondId &&
      firstId === secondId
    );
  }

  /* ========================================================
     SAFE DATA READERS
     ======================================================== */

  function getSavedProducts() {
    try {
      return safeArray(
        window.Forma.savedProducts
          ?.getAll?.()
      );
    } catch (error) {
      console.warn(
        "[Forma Recommendations] Could not read saved products.",
        error
      );

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
      console.warn(
        "[Forma Recommendations] Could not read recently viewed products.",
        error
      );

      return [];
    }
  }

  function getFollowedBrands() {
    try {
      return safeArray(
        window.Forma.followedBrands
          ?.getAll?.()
      );
    } catch (error) {
      console.warn(
        "[Forma Recommendations] Could not read followed brands.",
        error
      );

      return [];
    }
  }

  function getProfile() {
    try {
      return (
        window.Forma.profile?.get?.() ||
        {}
      );
    } catch (error) {
      console.warn(
        "[Forma Recommendations] Could not read profile.",
        error
      );

      return {};
    }
  }

  /* ========================================================
     CATALOG
     ======================================================== */

  function readCatalogCache() {
    try {
      const stored =
        JSON.parse(
          localStorage.getItem(
            CACHE_KEY
          ) || "null"
        );

      if (
        !stored ||
        !Array.isArray(stored.products) ||
        !stored.timestamp
      ) {
        return null;
      }

      const cacheAge =
        Date.now() -
        Number(stored.timestamp);

      if (
        cacheAge >
        CACHE_DURATION
      ) {
        return null;
      }

      return stored.products;
    } catch (error) {
      return null;
    }
  }

  function writeCatalogCache(
    products
  ) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          products
        })
      );
    } catch (error) {
      console.warn(
        "[Forma Recommendations] Could not cache catalog.",
        error
      );
    }
  }

  async function fetchCatalog({
    force = false
  } = {}) {
    if (!force) {
      const cached =
        readCatalogCache();

      if (cached) {
        return cached;
      }
    }

    try {
      const response = await fetch(
        "/collections/all/products.json?limit=250",
        {
          headers: {
            Accept:
              "application/json"
          }
        }
      );

      if (!response.ok) {
        throw new Error(
          `Catalog request failed: ${response.status}`
        );
      }

      const data =
        await response.json();

      const products =
        safeArray(data?.products);

      writeCatalogCache(products);

      return products;
    } catch (error) {
      console.error(
        "[Forma Recommendations] Could not load product catalog.",
        error
      );

      return [];
    }
  }

  function clearCatalogCache() {
    try {
      localStorage.removeItem(
        CACHE_KEY
      );
    } catch (error) {
      // Nothing else to do.
    }
  }

  /* ========================================================
     USER TASTE PROFILE
     ======================================================== */

  function getBrandName(brand) {
    return normalizeText(
      brand?.name ||
      brand?.title ||
      brand?.vendor ||
      brand?.handle ||
      brand
    );
  }

  function buildTasteProfile() {
    const savedProducts =
      getSavedProducts();

    const recentlyViewed =
      getRecentlyViewed();

    const followedBrands =
      getFollowedBrands();

    const profile =
      getProfile();

    const preferences =
      profile?.preferences || {};

    return {
      savedProducts,
      recentlyViewed,

      followedBrands: unique(
        followedBrands.map(
          getBrandName
        )
      ),

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

      savedProductTypes: unique(
        savedProducts.map(
          getProductType
        )
      ),

      viewedProductTypes: unique(
        recentlyViewed.map(
          getProductType
        )
      ),

      savedTags: unique(
        savedProducts.flatMap(
          getTags
        )
      ),

      viewedTags: unique(
        recentlyViewed.flatMap(
          getTags
        )
      ),

      profileCategories: unique(
        preferences.categories
      ),

      profileStyles: unique(
        preferences.styles
      )
    };
  }

  /* ========================================================
     EXCLUSION
     ======================================================== */

  function hasAlreadyInteracted(
    product,
    tasteProfile
  ) {
    return [
      ...tasteProfile.savedProducts,
      ...tasteProfile.recentlyViewed
    ].some(existingProduct =>
      productsMatch(
        product,
        existingProduct
      )
    );
  }

  /* ========================================================
     SCORING
     ======================================================== */

  function scoreProduct(
    product,
    tasteProfile
  ) {
    let score = 0;

    const reasons = [];

    const vendor =
      getVendor(product);

    const productType =
      getProductType(product);

    const tags =
      getTags(product);

    const searchableText =
      getSearchableText(product);

    if (
      vendor &&
      tasteProfile.followedBrands
        .includes(vendor)
    ) {
      score +=
        WEIGHTS.followedBrand;

      reasons.push(
        "From a brand you follow"
      );
    }

    if (
      vendor &&
      tasteProfile.savedBrands
        .includes(vendor)
    ) {
      score +=
        WEIGHTS.savedBrand;

      reasons.push(
        "Inspired by products you saved"
      );
    }

    if (
      vendor &&
      tasteProfile.viewedBrands
        .includes(vendor)
    ) {
      score +=
        WEIGHTS.viewedBrand;

      reasons.push(
        "Based on brands you explored"
      );
    }

    if (
      productType &&
      tasteProfile.savedProductTypes
        .includes(productType)
    ) {
      score +=
        WEIGHTS.savedProductType;

      reasons.push(
        "Similar to your saved collection"
      );
    }

    if (
      productType &&
      tasteProfile.viewedProductTypes
        .includes(productType)
    ) {
      score +=
        WEIGHTS.viewedProductType;

      reasons.push(
        "Matches products you viewed"
      );
    }

    const savedTagMatches =
      countMatches(
        tags,
        tasteProfile.savedTags
      );

    if (savedTagMatches > 0) {
      score +=
        Math.min(
          savedTagMatches,
          4
        ) *
        WEIGHTS.savedTag;

      reasons.push(
        "Matches details you tend to save"
      );
    }

    const viewedTagMatches =
      countMatches(
        tags,
        tasteProfile.viewedTags
      );

    if (viewedTagMatches > 0) {
      score +=
        Math.min(
          viewedTagMatches,
          4
        ) *
        WEIGHTS.viewedTag;

      reasons.push(
        "Connected to your recent activity"
      );
    }

    const categoryMatches =
      tasteProfile
        .profileCategories
        .filter(category =>
          textContains(
            searchableText,
            category
          )
        ).length;

    if (categoryMatches > 0) {
      score +=
        categoryMatches *
        WEIGHTS.profileCategory;

      reasons.push(
        "Matches your selected categories"
      );
    }

    const styleMatches =
      tasteProfile
        .profileStyles
        .filter(style =>
          textContains(
            searchableText,
            style
          )
        ).length;

    if (styleMatches > 0) {
      score +=
        styleMatches *
        WEIGHTS.profileStyle;

      reasons.push(
        "Selected for your style"
      );
    }

    if (
      product?.available !== false
    ) {
      score += WEIGHTS.available;
    }

    if (
      hasAlreadyInteracted(
        product,
        tasteProfile
      )
    ) {
      score -=
        WEIGHTS.duplicatePenalty;
    }

    return {
      ...product,

      formaRecommendation: {
        score,
        reasons:
          unique(reasons),

        primaryReason:
          reasons[0] ||
          "Selected for your Forma",

        signals: {
          vendor,
          productType,
          savedTagMatches,
          viewedTagMatches,
          categoryMatches,
          styleMatches
        }
      }
    };
  }

  /* ========================================================
     DIVERSITY
     ======================================================== */

  function diversifyProducts(
    products,
    limit
  ) {
    const selected = [];
    const brandCounts =
      new Map();

    products.forEach(product => {
      if (
        selected.length >= limit
      ) {
        return;
      }

      const vendor =
        getVendor(product) ||
        "unknown";

      const currentCount =
        brandCounts.get(vendor) || 0;

      /*
       * Maksimalt to produkter fra samme
       * brand i samme anbefalingsrunde.
       */
      if (currentCount >= 2) {
        return;
      }

      selected.push(product);

      brandCounts.set(
        vendor,
        currentCount + 1
      );
    });

    /*
     * Hvis brandbegrænsningen gav for få
     * resultater, fylder vi resten op.
     */
    if (
      selected.length < limit
    ) {
      products.forEach(product => {
        if (
          selected.length >= limit ||
          selected.some(selectedProduct =>
            productsMatch(
              product,
              selectedProduct
            )
          )
        ) {
          return;
        }

        selected.push(product);
      });
    }

    return selected;
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

    const catalog =
      await fetchCatalog({
        force:
          Boolean(options.force)
      });

    const tasteProfile =
      buildTasteProfile();

    const scoredProducts =
      catalog
        .map(product =>
          scoreProduct(
            product,
            tasteProfile
          )
        )
        .filter(product => {
          const recommendation =
            product.formaRecommendation;

          return (
            getHandle(product) &&
            recommendation.score > 0 &&
            product.available !== false
          );
        })
        .sort(
          (first, second) =>
            second.formaRecommendation
              .score -
            first.formaRecommendation
              .score
        );

    return diversifyProducts(
      scoredProducts,
      safeLimit
    );
  }

  async function getBrands(
    limit = 6
  ) {
    const products =
      await getProducts(50);

    const brands =
      new Map();

    products.forEach(product => {
      const vendor =
        String(
          product?.vendor || ""
        ).trim();

      const key =
        normalizeText(vendor);

      if (!key) {
        return;
      }

      const existing =
        brands.get(key);

      const score =
        product
          .formaRecommendation
          ?.score || 0;

      if (!existing) {
        brands.set(key, {
          name: vendor,
          score,
          products: [product],
          reason:
            product
              .formaRecommendation
              ?.primaryReason ||
            "Selected for you"
        });

        return;
      }

      existing.score += score;
      existing.products.push(product);
    });

    return Array.from(
      brands.values()
    )
      .sort(
        (first, second) =>
          second.score -
          first.score
      )
      .slice(0, limit);
  }

  function getExplanation(
    product
  ) {
    return (
      product
        ?.formaRecommendation
        ?.primaryReason ||
      "Selected for your Forma"
    );
  }

  async function refresh() {
    const products =
      await getProducts(
        DEFAULT_LIMIT,
        {
          force: true
        }
      );

    window.dispatchEvent(
      new CustomEvent(
        "forma:recommendations-updated",
        {
          detail: {
            products
          }
        }
      )
    );

    return products;
  }

  /* ========================================================
     EVENTS
     ======================================================== */

  [
    "forma:saved-updated",
    "forma:followed-brands-updated",
    "forma:recently-viewed-updated",
    "forma:profile-updated",
    "forma:onboarding-completed"
  ].forEach(eventName => {
    window.addEventListener(
      eventName,
      () => {
        window.dispatchEvent(
          new CustomEvent(
            "forma:recommendation-profile-changed"
          )
        );
      }
    );
  });

  /* ========================================================
     PUBLIC API
     ======================================================== */

  window.Forma.recommendations = {
    getProducts,
    getBrands,
    getExplanation,
    buildTasteProfile,
    fetchCatalog,
    clearCatalogCache,
    refresh
  };
})();