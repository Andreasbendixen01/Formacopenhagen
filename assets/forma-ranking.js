/* ==========================================================
   FORMA — PERSONAL RANKING ENGINE
   ========================================================== */

(function () {
  "use strict";

  window.Forma = window.Forma || {};

  const DAY_IN_MS =
    24 * 60 * 60 * 1000;

  const SCORE_WEIGHTS = {
    viewedToday: 40,
    viewedThisWeek: 28,
    viewedThisMonth: 16,
    viewedEarlier: 8,

    repeatView: 12,
    saved: 24,
    followedBrand: 16,

    rediscoverMinimumAge: 14,
    rediscoverAgeBonus: 18
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

  function parseDate(value) {
    if (!value) {
      return null;
    }

    const date =
      value instanceof Date
        ? value
        : new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  function getDaysSince(value) {
    const date = parseDate(value);

    if (!date) {
      return null;
    }

    return Math.max(
      0,
      Math.floor(
        (Date.now() - date.getTime()) /
          DAY_IN_MS
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
      product?.variantId ||
      ""
    );
  }

  function getProductBrand(product) {
    return String(
      product?.vendor ||
      product?.brand ||
      product?.productVendor ||
      ""
    ).trim();
  }

  function getProductTimestamp(product) {
    return (
      product?.lastViewedAt ||
      product?.viewedAt ||
      product?.updatedAt ||
      product?.timestamp ||
      product?.createdAt ||
      product?.date ||
      null
    );
  }

  function getProductKey(product) {
    const handle =
      getProductHandle(product);

    if (handle) {
      return `handle:${handle}`;
    }

    const id =
      getProductId(product);

    if (id) {
      return `id:${id}`;
    }

    return "";
  }

  function getSavedProducts() {
    try {
      return safeArray(
        window.Forma.savedProducts
          ?.getAll?.()
      );
    } catch (error) {
      console.warn(
        "[Forma Ranking] Could not read saved products.",
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
        "[Forma Ranking] Could not read recently viewed products.",
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
        "[Forma Ranking] Could not read followed brands.",
        error
      );

      return [];
    }
  }

  function getActivity() {
    try {
      return safeArray(
        window.Forma.activity
          ?.getAll?.()
      );
    } catch (error) {
      return [];
    }
  }

  /* ========================================================
     MATCHING
     ======================================================== */

  function productsMatch(
    firstProduct,
    secondProduct
  ) {
    const firstHandle =
      getProductHandle(firstProduct);

    const secondHandle =
      getProductHandle(secondProduct);

    if (
      firstHandle &&
      secondHandle &&
      firstHandle === secondHandle
    ) {
      return true;
    }

    const firstId =
      getProductId(firstProduct);

    const secondId =
      getProductId(secondProduct);

    return Boolean(
      firstId &&
      secondId &&
      firstId === secondId
    );
  }

  function isProductSaved(
    product,
    savedProducts
  ) {
    return savedProducts.some(
      savedProduct =>
        productsMatch(
          product,
          savedProduct
        )
    );
  }

  function getFollowedBrandNames(
    followedBrands
  ) {
    return new Set(
      followedBrands
        .map(brand =>
          normalizeText(
            brand?.name ||
            brand?.title ||
            brand?.vendor ||
            brand?.handle ||
            brand
          )
        )
        .filter(Boolean)
    );
  }

  function isBrandFollowed(
    product,
    followedBrandNames
  ) {
    const brand =
      normalizeText(
        getProductBrand(product)
      );

    return Boolean(
      brand &&
      followedBrandNames.has(brand)
    );
  }

  /* ========================================================
     VIEW HISTORY
     ======================================================== */

  function getViewCount(
    product,
    recentlyViewed,
    activity
  ) {
    const directCount =
      Number(
        product?.viewCount ||
        product?.views ||
        0
      );

    const recentMatches =
      recentlyViewed.filter(item =>
        productsMatch(product, item)
      ).length;

    const activityMatches =
      activity.filter(item => {
        const type =
          normalizeText(
            item?.type ||
            item?.event ||
            item?.action
          );

        if (
          type !== "product_viewed" &&
          type !== "product viewed"
        ) {
          return false;
        }

        const activityProduct =
          item?.product ||
          item?.data ||
          item?.payload ||
          item;

        return productsMatch(
          product,
          activityProduct
        );
      }).length;

    return Math.max(
      1,
      directCount,
      recentMatches,
      activityMatches
    );
  }

  function getMostRecentTimestamp(
    product,
    activity
  ) {
    const timestamps = [
      getProductTimestamp(product)
    ];

    activity.forEach(item => {
      const type =
        normalizeText(
          item?.type ||
          item?.event ||
          item?.action
        );

      if (
        type !== "product_viewed" &&
        type !== "product viewed"
      ) {
        return;
      }

      const activityProduct =
        item?.product ||
        item?.data ||
        item?.payload ||
        item;

      if (
        productsMatch(
          product,
          activityProduct
        )
      ) {
        timestamps.push(
          item?.timestamp ||
          item?.createdAt ||
          item?.date
        );
      }
    });

    const validDates =
      timestamps
        .map(parseDate)
        .filter(Boolean)
        .sort(
          (first, second) =>
            second.getTime() -
            first.getTime()
        );

    return validDates[0]
      ?.toISOString() || null;
  }

  /* ========================================================
     SCORING
     ======================================================== */

  function getRecencyScore(daysSince) {
    if (daysSince === null) {
      return 0;
    }

    if (daysSince === 0) {
      return SCORE_WEIGHTS.viewedToday;
    }

    if (daysSince <= 7) {
      return SCORE_WEIGHTS.viewedThisWeek;
    }

    if (daysSince <= 30) {
      return SCORE_WEIGHTS.viewedThisMonth;
    }

    return SCORE_WEIGHTS.viewedEarlier;
  }

  function scoreProduct(
    product,
    context
  ) {
    const {
      recentlyViewed,
      savedProducts,
      followedBrandNames,
      activity
    } = context;

    const timestamp =
      getMostRecentTimestamp(
        product,
        activity
      );

    const daysSince =
      getDaysSince(timestamp);

    const viewCount =
      getViewCount(
        product,
        recentlyViewed,
        activity
      );

    const saved =
      isProductSaved(
        product,
        savedProducts
      );

    const followedBrand =
      isBrandFollowed(
        product,
        followedBrandNames
      );

    let score =
      getRecencyScore(daysSince);

    if (viewCount > 1) {
      score +=
        Math.min(
          viewCount - 1,
          4
        ) *
        SCORE_WEIGHTS.repeatView;
    }

    if (saved) {
      score +=
        SCORE_WEIGHTS.saved;
    }

    if (followedBrand) {
      score +=
        SCORE_WEIGHTS.followedBrand;
    }

    return {
      ...product,

      formaRanking: {
        score,
        timestamp,
        daysSince,
        viewCount,
        saved,
        followedBrand
      }
    };
  }

  /* ========================================================
     PRODUCT POOL
     ======================================================== */

  function buildProductPool(
    recentlyViewed,
    savedProducts
  ) {
    const productMap =
      new Map();

    [
      ...recentlyViewed,
      ...savedProducts
    ].forEach(product => {
      const key =
        getProductKey(product);

      if (!key) {
        return;
      }

      const existing =
        productMap.get(key);

      productMap.set(
        key,
        existing
          ? {
              ...existing,
              ...product
            }
          : product
      );
    });

    return Array.from(
      productMap.values()
    );
  }

  /* ========================================================
     PUBLIC RANKING METHODS
     ======================================================== */

  function rankProducts() {
    const recentlyViewed =
      getRecentlyViewed();

    const savedProducts =
      getSavedProducts();

    const followedBrands =
      getFollowedBrands();

    const activity =
      getActivity();

    const followedBrandNames =
      getFollowedBrandNames(
        followedBrands
      );

    const productPool =
      buildProductPool(
        recentlyViewed,
        savedProducts
      );

    const context = {
      recentlyViewed,
      savedProducts,
      followedBrandNames,
      activity
    };

    return productPool
      .map(product =>
        scoreProduct(
          product,
          context
        )
      )
      .sort((first, second) => {
        const scoreDifference =
          second.formaRanking.score -
          first.formaRanking.score;

        if (scoreDifference !== 0) {
          return scoreDifference;
        }

        const firstDate =
          parseDate(
            first.formaRanking.timestamp
          )?.getTime() || 0;

        const secondDate =
          parseDate(
            second.formaRanking.timestamp
          )?.getTime() || 0;

        return secondDate - firstDate;
      });
  }

  function getContinueExploring(
    limit = 4
  ) {
    return rankProducts()
      .filter(product => {
        return Boolean(
          getProductHandle(product)
        );
      })
      .slice(0, limit);
  }

  function getRediscoverProducts(
    limit = 4
  ) {
    return rankProducts()
      .filter(product => {
        const daysSince =
          product.formaRanking
            .daysSince;

        return (
          daysSince !== null &&
          daysSince >=
            SCORE_WEIGHTS
              .rediscoverMinimumAge
        );
      })
      .map(product => {
        const daysSince =
          product.formaRanking
            .daysSince;

        const ageBonus =
          Math.min(
            Math.floor(
              daysSince / 14
            ),
            4
          ) *
          SCORE_WEIGHTS
            .rediscoverAgeBonus;

        return {
          ...product,

          formaRanking: {
            ...product.formaRanking,

            rediscoverScore:
              product.formaRanking
                .score +
              ageBonus
          }
        };
      })
      .sort(
        (first, second) =>
          second.formaRanking
            .rediscoverScore -
          first.formaRanking
            .rediscoverScore
      )
      .slice(0, limit);
  }

  function getExplanation(product) {
    const ranking =
      product?.formaRanking;

    if (!ranking) {
      return "";
    }

    if (
      ranking.saved &&
      ranking.viewCount > 1
    ) {
      return "Saved and viewed more than once";
    }

    if (ranking.saved) {
      return "Saved to Your Forma";
    }

    if (ranking.followedBrand) {
      return "From a brand you follow";
    }

    if (ranking.daysSince === 0) {
      return "Viewed today";
    }

    if (ranking.daysSince === 1) {
      return "Viewed yesterday";
    }

    if (
      ranking.daysSince !== null &&
      ranking.daysSince <= 7
    ) {
      return "Viewed earlier this week";
    }

    if (
      ranking.daysSince !== null
    ) {
      return `Viewed ${ranking.daysSince} days ago`;
    }

    return "Selected for you";
  }

  function refresh() {
    const rankedProducts =
      rankProducts();

    window.dispatchEvent(
      new CustomEvent(
        "forma:ranking-updated",
        {
          detail: {
            products:
              rankedProducts
          }
        }
      )
    );

    return rankedProducts;
  }

  /* ========================================================
     EVENTS
     ======================================================== */

  [
    "forma:saved-updated",
    "forma:followed-brands-updated",
    "forma:recently-viewed-updated",
    "forma:activity-updated"
  ].forEach(eventName => {
    window.addEventListener(
      eventName,
      refresh
    );
  });

  /* ========================================================
     PUBLIC API
     ======================================================== */

  window.Forma.ranking = {
    rankProducts,
    getContinueExploring,
    getRediscoverProducts,
    getExplanation,
    refresh
  };
})();