/* ==========================================================
   FORMA — SCORE ENGINE
   Version 1.0.0
   ========================================================== */

(() => {
  window.Forma = window.Forma || {};

  const SCORE_MIN = 40;
  const SCORE_MAX = 99;

  function normalize(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function clamp(value, min = SCORE_MIN, max = SCORE_MAX) {
    return Math.min(Math.max(value, min), max);
  }

  function getProductHandle(product) {
    return normalize(
      product?.handle ||
      product?.productHandle ||
      product?.url?.split("/products/")?.[1]?.split("?")?.[0]
    );
  }

  function getProductBrand(product) {
    return normalize(
      product?.vendor ||
      product?.brand ||
      product?.productVendor
    );
  }

  function getSignals(product) {
    const handle = getProductHandle(product);
    const brand = getProductBrand(product);

    const savedProducts =
      window.Forma.savedProducts?.getAll?.() || [];

    const followedBrands =
      window.Forma.followedBrands?.getAll?.() || [];

    const recentlyViewed =
      window.Forma.recentlyViewed?.getAll?.() || [];

    const isSaved = savedProducts.some(item => {
      const savedHandle =
        typeof item === "string"
          ? normalize(item)
          : getProductHandle(item);

      return savedHandle === handle;
    });

    const followsBrand = followedBrands.some(item => {
      const followedBrand =
        typeof item === "string"
          ? normalize(item)
          : normalize(item?.handle || item?.vendor || item?.brand);

      return followedBrand === brand;
    });

    const wasRecentlyViewed = recentlyViewed.some(item => {
      return getProductHandle(item) === handle;
    });

    const viewedSameBrand = recentlyViewed.some(item => {
      return getProductBrand(item) === brand;
    });

    const savedSameBrand = savedProducts.some(item => {
      return getProductBrand(item) === brand;
    });

    return {
      isSaved,
      followsBrand,
      wasRecentlyViewed,
      viewedSameBrand,
      savedSameBrand
    };
  }

  function calculate(product) {
    if (!product) return SCORE_MIN;

    const signals = getSignals(product);

    let score = 58;

    if (signals.followsBrand) {
      score += 18;
    }

    if (signals.savedSameBrand) {
      score += 10;
    }

    if (signals.viewedSameBrand) {
      score += 7;
    }

    if (signals.wasRecentlyViewed) {
      score += 4;
    }

    if (signals.isSaved) {
      score += 2;
    }

    return clamp(score);
  }

  function getLabel(score) {
    if (score >= 92) return "Exceptional Match";
    if (score >= 84) return "Excellent Match";
    if (score >= 74) return "Strong Match";
    if (score >= 62) return "Good Match";

    return "Worth Exploring";
  }

  function explain(product) {
    const score = calculate(product);
    const signals = getSignals(product);
    const reasons = [];

    if (signals.followsBrand) {
      reasons.push({
        id: "followed-brand",
        label: "From a brand you follow",
        weight: 18
      });
    }

    if (signals.savedSameBrand) {
      reasons.push({
        id: "saved-brand",
        label: "Matches brands in your saved collection",
        weight: 10
      });
    }

    if (signals.viewedSameBrand) {
      reasons.push({
        id: "viewed-brand",
        label: "Similar to brands you have explored",
        weight: 7
      });
    }

    if (signals.wasRecentlyViewed) {
      reasons.push({
        id: "recently-viewed",
        label: "You have viewed this product before",
        weight: 4
      });
    }

    if (signals.isSaved) {
      reasons.push({
        id: "saved-product",
        label: "Already part of your saved collection",
        weight: 2
      });
    }

    if (!reasons.length) {
      reasons.push({
        id: "discovery",
        label: "Selected to broaden your Forma",
        weight: 0
      });
    }

    return {
      score,
      label: getLabel(score),
      reasons,
      signals
    };
  }

  function compare(productA, productB) {
    const resultA = explain(productA);
    const resultB = explain(productB);

    return {
      first: resultA,
      second: resultB,
      difference: resultA.score - resultB.score,
      winner:
        resultA.score === resultB.score
          ? null
          : resultA.score > resultB.score
            ? productA
            : productB
    };
  }

  function refresh() {
    window.dispatchEvent(
      new CustomEvent("forma:score-refreshed")
    );
  }

  window.Forma.score = {
    get: calculate,
    explain,
    compare,
    refresh,
    getLabel,
    version: "1.0.0"
  };

  window.dispatchEvent(
    new CustomEvent("forma:score-ready")
  );
})();