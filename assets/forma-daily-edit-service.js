/* ==========================================================
   FORMA — DAILY EDIT SERVICE
   ========================================================== */

(() => {
  "use strict";

  if (!window.Forma) {
    return;
  }

  const Forma =
    window.Forma;

  const STORAGE_KEY =
    "forma_daily_edit_v1";

  const DEFAULT_LIMIT =
    8;

  function getTodayKey() {
    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        now.getDate()
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function clone(value) {
    if (
      value === undefined ||
      value === null
    ) {
      return value;
    }

    return JSON.parse(
      JSON.stringify(value)
    );
  }

  function loadCache() {
    try {
      const cached =
        localStorage.getItem(
          STORAGE_KEY
        );

      return cached
        ? JSON.parse(cached)
        : null;
    } catch (error) {
      console.warn(
        "[Forma Daily Edit] Could not read cache.",
        error
      );

      return null;
    }
  }

  function saveCache(data) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
      );
    } catch (error) {
      console.warn(
        "[Forma Daily Edit] Could not save cache.",
        error
      );
    }
  }

  function clearCache() {
    try {
      localStorage.removeItem(
        STORAGE_KEY
      );
    } catch (error) {
      console.warn(
        "[Forma Daily Edit] Could not clear cache.",
        error
      );
    }
  }

  

  function attachRecommendation(
    result
  ) {
    return {
      ...result.product,

      formaRecommendation: {
        score:
          result.score,

        confidence:
          result.confidence,

        reasons:
          result.reasons,

        primaryReason:
          result.primaryReason,

        strategy:
          result.strategy,

        generatedAt:
          result.generatedAt,

        recommendationId:
          result.recommendationId
      }
    };
  }

  async function generate(
    limit = DEFAULT_LIMIT,
    options = {}
  ) {
    if (
      !Forma.recommendations?.rank
    ) {
      throw new Error(
        "Recommendation Engine is unavailable."
      );
    }

    const normalizedLimit =
      Math.max(
        1,
        Number(limit) ||
        DEFAULT_LIMIT
      );

    const today =
      getTodayKey();

    const cache =
      loadCache();

    if (
      !options.force &&
      cache?.date === today &&
      Array.isArray(cache.products) &&
      cache.products.length >=
        normalizedLimit
    ) {
      return clone(
        cache.products.slice(
          0,
          normalizedLimit
        )
      );
    }

    const candidates =
  await Forma.recommendations.getProducts();

const results =
  await Forma.recommendations.rank(
    candidates,
    {
      strategy:
        "daily-edit",

      limit:
        normalizedLimit,

      ...options
    }
  );

    const products =
      results.map(
        attachRecommendation
      );

    saveCache({
      date:
        today,

      generatedAt:
        Date.now(),

      products
    });

    window.dispatchEvent(
      new CustomEvent(
        "forma:daily-edit-updated",
        {
          detail: {
            date:
              today,

            products:
              clone(products)
          }
        }
      )
    );

    return clone(products);
  }

  async function getProducts(
    limit = DEFAULT_LIMIT,
    options = {}
  ) {
    return generate(
      limit,
      options
    );
  }

  function getReason(product) {
    return (
      product
        ?.formaRecommendation
        ?.primaryReason ||
      "Chosen for today's Forma"
    );
  }

  Forma.dailyEdit = {
    version:
      "1.0.0",

    generate,
    getProducts,
    getReason,
    clearCache
  };

  Forma.events?.emit?.(
    "forma:daily-edit-ready",
    {
      version:
        Forma.dailyEdit.version
    }
  );

  console.info(
    "[Forma Daily Edit] Service ready"
  );
})();