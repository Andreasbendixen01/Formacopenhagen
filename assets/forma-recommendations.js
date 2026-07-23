/* ==========================================================
   FORMA — RECOMMENDATION ENGINE
   Version: 1.0.0

   Scores and ranks products from:
   - Brand affinity
   - Product type affinity
   - Tag affinity
   - Followed brands
   - Saved products
   - Recently viewed products

   Architecture:
   Signals → Entities → Persona → Recommendations
   ========================================================== */

(() => {
  "use strict";

  window.Forma = window.Forma || {};

  const Forma = window.Forma;

  if (Forma.recommendations) {
    return;
  }

  /* ----------------------------------------------------------
     CONFIGURATION
     ---------------------------------------------------------- */

  const DEFAULT_OPTIONS = {
    limit: 12,

    refreshEntities: false,

    excludeSaved: true,
    excludeViewed: false,

    maxPerBrand: 3,

    minimumScore: 0,

    weights: {
      brand: 4,
      type: 3,
      tag: 1.5,

      followedBrand: 20,

      savedSimilarity: 8,
      viewedSimilarity: 2,

      freshness: 1,
      popularity: 0
    }
  };

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

  function isObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function mergeDeep(target, source) {
    const output = {
      ...(target || {})
    };

    for (
      const [key, value] of
      Object.entries(source || {})
    ) {
      if (
        isObject(value) &&
        isObject(output[key])
      ) {
        output[key] =
          mergeDeep(
            output[key],
            value
          );

        continue;
      }

      output[key] = value;
    }

    return output;
  }

  function normalize(value) {
    if (Forma.entities?.normalize) {
      return Forma.entities.normalize(
        value
      );
    }

    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9æøå]+/gi, "-")
      .replace(/^-+|-+$/g, "");
  }

  function normalizeHandle(value) {
    if (Forma.products?.normalizeHandle) {
      return Forma.products.normalizeHandle(
        value
      );
    }

    return String(value || "")
      .trim()
      .replace(/^https?:\/\/[^/]+/i, "")
      .replace(/^\/?products\//i, "")
      .replace(/\.js(?:\?.*)?$/i, "")
      .replace(/[?#].*$/, "")
      .replace(/^\/+|\/+$/g, "")
      .toLowerCase();
  }

  function numberOrZero(value) {
    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : 0;
  }

  function getProductHandle(product) {
    return normalizeHandle(
      product?.handle ||
      product?.productHandle ||
      product?.url ||
      ""
    );
  }

  function getProductType(product) {
    return String(
      product?.product_type ||
      product?.type ||
      ""
    ).trim();
  }

  function getProductTags(product) {
    if (
      Array.isArray(product?.tags)
    ) {
      return product.tags
        .map(tag =>
          String(tag || "").trim()
        )
        .filter(Boolean);
    }

    if (
      typeof product?.tags === "string"
    ) {
      return product.tags
        .split(",")
        .map(tag => tag.trim())
        .filter(Boolean);
    }

    return [];
  }

  function getProductImage(product) {
    const featuredImage =
      product?.featured_image;

    if (
      typeof featuredImage === "string"
    ) {
      return featuredImage;
    }

    if (
      featuredImage &&
      typeof featuredImage === "object"
    ) {
      return (
        featuredImage.src ||
        featuredImage.url ||
        null
      );
    }

    const firstImage =
      product?.images?.[0];

    if (
      typeof firstImage === "string"
    ) {
      return firstImage;
    }

    return (
      firstImage?.src ||
      firstImage?.url ||
      product?.image ||
      null
    );
  }

  function getProductPrice(product) {
    return numberOrZero(
      product?.price ||
      product?.price_min ||
      product?.variants?.[0]?.price
    );
  }

  function normalizeProduct(product) {
    if (!product) {
      return null;
    }

    const handle =
      getProductHandle(product);

    return {
      ...product,

      id:
        product.id ||
        handle,

      handle,

      title:
        product.title ||
        "",

      vendor:
        product.vendor ||
        "",

      product_type:
        getProductType(product),

      tags:
        getProductTags(product),

      image:
        getProductImage(product),

      price:
        getProductPrice(product),

      url:
        product.url ||
        (
          handle
            ? `/products/${handle}`
            : ""
        )
    };
  }

  /* ----------------------------------------------------------
     ENTITY STATE
     ---------------------------------------------------------- */

  function getEntityState() {
    const response =
      Forma.entities?.getAll?.();

    if (!response) {
      return {
        brands: {},
        types: {},
        tags: {}
      };
    }

    return (
      response.entities ||
      response
    );
  }

  function getEntity(
    entityState,
    type,
    name
  ) {
    const key =
      normalize(name);

    if (
      !key ||
      !entityState?.[type]
    ) {
      return null;
    }

    return (
      entityState[type][key] ||
      null
    );
  }

  /* ----------------------------------------------------------
     USER PRODUCT STATE
     ---------------------------------------------------------- */

  function createHandleSet(items) {
    const handles =
      new Set();

    for (const item of items || []) {
      const value =
        typeof item === "string"
          ? item
          : (
              item?.handle ||
              item?.productHandle ||
              item?.url
            );

      const handle =
        normalizeHandle(value);

      if (handle) {
        handles.add(handle);
      }
    }

    return handles;
  }

  function getUserState() {
    const savedProducts =
      Forma.savedProducts
        ?.getAll?.() || [];

    const viewedProducts =
      Forma.recentlyViewed
        ?.getAll?.() || [];

    return {
      savedProducts,
      viewedProducts,

      savedHandles:
        createHandleSet(
          savedProducts
        ),

      viewedHandles:
        createHandleSet(
          viewedProducts
        )
    };
  }

  /* ----------------------------------------------------------
     PRODUCT RESOLUTION
     ---------------------------------------------------------- */

  async function resolveProduct(candidate) {
    if (!candidate) {
      return null;
    }

    if (
      typeof candidate === "object" &&
      (
        candidate.vendor ||
        candidate.product_type ||
        candidate.type ||
        candidate.tags
      )
    ) {
      return normalizeProduct(
        candidate
      );
    }

    const value =
      typeof candidate === "string"
        ? candidate
        : (
            candidate.handle ||
            candidate.productHandle ||
            candidate.url
          );

    const handle =
      normalizeHandle(value);

    if (!handle) {
      return normalizeProduct(
        candidate
      );
    }

    if (!Forma.products?.get) {
      return normalizeProduct({
        ...(
          typeof candidate === "object"
            ? candidate
            : {}
        ),
        handle
      });
    }

    const product =
      await Forma.products.get(
        handle
      );

    if (!product) {
      return null;
    }

    return normalizeProduct({
      ...(
        typeof candidate === "object"
          ? candidate
          : {}
      ),
      ...product,
      handle
    });
  }

  async function resolveProducts(
    candidates
  ) {
    const list =
      Array.isArray(candidates)
        ? candidates
        : [];

    const results =
      await Promise.all(
        list.map(resolveProduct)
      );

    const products = [];
    const seenHandles =
      new Set();

    for (const product of results) {
      if (!product) {
        continue;
      }

      const uniqueKey =
        product.handle ||
        String(product.id || "");

      if (
        uniqueKey &&
        seenHandles.has(uniqueKey)
      ) {
        continue;
      }

      if (uniqueKey) {
        seenHandles.add(uniqueKey);
      }

      products.push(product);
    }

    return products;
  }

  /* ----------------------------------------------------------
     SCORING
     ---------------------------------------------------------- */

  function addReason(
    reasons,
    reason
  ) {
    if (
      !reason ||
      !reason.label ||
      reason.points <= 0
    ) {
      return;
    }

    reasons.push(reason);
  }

  function scoreBrand(
    product,
    entityState,
    weights,
    reasons
  ) {
    const brand =
      getEntity(
        entityState,
        "brands",
        product.vendor
      );

    if (!brand) {
      return 0;
    }

    let score =
      numberOrZero(brand.score) *
      numberOrZero(weights.brand);

    addReason(
      reasons,
      {
        type: "brand",
        key: brand.key,
        label:
          `Matches your interest in ${brand.name}`,
        points: score
      }
    );

    if (brand.followed) {
      const followedBonus =
        numberOrZero(
          weights.followedBrand
        );

      score += followedBonus;

      addReason(
        reasons,
        {
          type: "followed-brand",
          key: brand.key,
          label:
            `From a brand you follow`,
          points: followedBonus
        }
      );
    }

    return score;
  }

  function scoreType(
    product,
    entityState,
    weights,
    reasons
  ) {
    const type =
      getEntity(
        entityState,
        "types",
        product.product_type
      );

    if (!type) {
      return 0;
    }

    const score =
      numberOrZero(type.score) *
      numberOrZero(weights.type);

    addReason(
      reasons,
      {
        type: "product-type",
        key: type.key,
        label:
          `Matches your interest in ${type.name}`,
        points: score
      }
    );

    return score;
  }

  function scoreTags(
    product,
    entityState,
    weights,
    reasons
  ) {
    let total = 0;

    for (const tag of product.tags) {
      const tagEntity =
        getEntity(
          entityState,
          "tags",
          tag
        );

      if (!tagEntity) {
        continue;
      }

      const score =
        numberOrZero(
          tagEntity.score
        ) *
        numberOrZero(
          weights.tag
        );

      total += score;

      addReason(
        reasons,
        {
          type: "tag",
          key: tagEntity.key,
          label:
            `Matches ${tagEntity.name}`,
          points: score
        }
      );
    }

    return total;
  }

  function scoreInteractionSimilarity(
    product,
    userState,
    weights,
    reasons
  ) {
    let score = 0;

    if (
      userState.savedHandles.has(
        product.handle
      )
    ) {
      const savedScore =
        numberOrZero(
          weights.savedSimilarity
        );

      score += savedScore;

      addReason(
        reasons,
        {
          type: "saved",
          key: product.handle,
          label:
            "Previously saved by you",
          points: savedScore
        }
      );
    }

    if (
      userState.viewedHandles.has(
        product.handle
      )
    ) {
      const viewedScore =
        numberOrZero(
          weights.viewedSimilarity
        );

      score += viewedScore;

      addReason(
        reasons,
        {
          type: "viewed",
          key: product.handle,
          label:
            "Previously viewed by you",
          points: viewedScore
        }
      );
    }

    return score;
  }

  function scoreFreshness(
    product,
    weights,
    reasons
  ) {
    const createdValue =
      product.created_at ||
      product.published_at;

    if (!createdValue) {
      return 0;
    }

    const timestamp =
      new Date(
        createdValue
      ).getTime();

    if (
      Number.isNaN(timestamp)
    ) {
      return 0;
    }

    const ageInDays =
      (
        Date.now() -
        timestamp
      ) /
      (
        1000 *
        60 *
        60 *
        24
      );

    let freshnessFactor = 0;

    if (ageInDays <= 7) {
      freshnessFactor = 1;
    } else if (ageInDays <= 30) {
      freshnessFactor = 0.6;
    } else if (ageInDays <= 90) {
      freshnessFactor = 0.25;
    }

    const score =
      freshnessFactor *
      numberOrZero(
        weights.freshness
      );

    addReason(
      reasons,
      {
        type: "freshness",
        key: product.handle,
        label:
          "Recently added",
        points: score
      }
    );

    return score;
  }

  function scorePopularity(
    product,
    weights,
    reasons
  ) {
    const popularity =
      numberOrZero(
        product.popularity ||
        product.engagement ||
        product.views
      );

    if (popularity <= 0) {
      return 0;
    }

    const score =
      Math.log10(
        popularity + 1
      ) *
      numberOrZero(
        weights.popularity
      );

    addReason(
      reasons,
      {
        type: "popularity",
        key: product.handle,
        label:
          "Popular on Forma",
        points: score
      }
    );

    return score;
  }

  function calculateConfidence(
    score
  ) {
    if (score <= 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.round(
        100 *
        (
          1 -
          Math.exp(
            -score / 100
          )
        )
      )
    );
  }

  function scoreResolvedProduct(
    product,
    context
  ) {
    const {
      entityState,
      userState,
      options
    } = context;

    const reasons = [];

    let score = 0;

    score += scoreBrand(
      product,
      entityState,
      options.weights,
      reasons
    );

    score += scoreType(
      product,
      entityState,
      options.weights,
      reasons
    );

    score += scoreTags(
      product,
      entityState,
      options.weights,
      reasons
    );

    score +=
      scoreInteractionSimilarity(
        product,
        userState,
        options.weights,
        reasons
      );

    score += scoreFreshness(
      product,
      options.weights,
      reasons
    );

    score += scorePopularity(
      product,
      options.weights,
      reasons
    );

    reasons.sort(
      (a, b) =>
        b.points - a.points
    );

    return {
      product: clone(product),

      score:
        Number(
          score.toFixed(2)
        ),

      confidence:
        calculateConfidence(score),

      reasons:
        reasons.map(reason => ({
          ...reason,
          points:
            Number(
              reason.points.toFixed(2)
            )
        })),

      primaryReason:
        reasons[0]?.label ||
        "Selected for you"
    };
  }

  /* ----------------------------------------------------------
     FILTERING AND DIVERSITY
     ---------------------------------------------------------- */

  function shouldExclude(
    result,
    userState,
    options
  ) {
    const handle =
      result.product.handle;

    if (
      options.excludeSaved &&
      userState.savedHandles.has(handle)
    ) {
      return true;
    }

    if (
      options.excludeViewed &&
      userState.viewedHandles.has(handle)
    ) {
      return true;
    }

    if (
      result.score <
      options.minimumScore
    ) {
      return true;
    }

    return false;
  }

  function diversifyResults(
    results,
    options
  ) {
    const maxPerBrand =
      Math.max(
        1,
        Number(
          options.maxPerBrand
        ) || 3
      );

    const brandCounts = {};
    const diversified = [];

    for (const result of results) {
      const brandKey =
        normalize(
          result.product.vendor
        ) || "unknown";

      const currentCount =
        brandCounts[brandKey] || 0;

      if (
        currentCount >= maxPerBrand
      ) {
        continue;
      }

      brandCounts[brandKey] =
        currentCount + 1;

      diversified.push(result);
    }

    return diversified;
  }

  /* ----------------------------------------------------------
     PUBLIC METHODS
     ---------------------------------------------------------- */

  async function score(
    candidate,
    customOptions = {}
  ) {
    const options =
      mergeDeep(
        DEFAULT_OPTIONS,
        customOptions
      );

    if (
      options.refreshEntities &&
      Forma.entities?.refresh
    ) {
      await Forma.entities.refresh();
    }

    const product =
      await resolveProduct(
        candidate
      );

    if (!product) {
      return null;
    }

    return scoreResolvedProduct(
      product,
      {
        entityState:
          getEntityState(),

        userState:
          getUserState(),

        options
      }
    );
  }

  async function rank(
    candidates,
    customOptions = {}
  ) {
    const options =
      mergeDeep(
        DEFAULT_OPTIONS,
        customOptions
      );

    if (
      options.refreshEntities &&
      Forma.entities?.refresh
    ) {
      await Forma.entities.refresh();
    }

    const products =
      await resolveProducts(
        candidates
      );

    const entityState =
      getEntityState();

    const userState =
      getUserState();

    let results =
      products.map(product =>
        scoreResolvedProduct(
          product,
          {
            entityState,
            userState,
            options
          }
        )
      );

    results =
      results.filter(
        result =>
          !shouldExclude(
            result,
            userState,
            options
          )
      );

    results.sort(
      (a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return String(
          a.product.title || ""
        ).localeCompare(
          String(
            b.product.title || ""
          )
        );
      }
    );

    results =
      diversifyResults(
        results,
        options
      );

    const limit =
      Math.max(
        0,
        Number(options.limit) || 12
      );

    const finalResults =
      results.slice(
        0,
        limit
      );

    Forma.events?.emit?.(
      "forma:recommendations-generated",
      {
        generatedAt:
          Date.now(),

        count:
          finalResults.length,

        results:
          clone(finalResults)
      }
    );

    return clone(
      finalResults
    );
  }

  async function recommend(
    candidates,
    options = {}
  ) {
    return rank(
      candidates,
      options
    );
  }

  async function getProducts(
    candidates,
    options = {}
  ) {
    const results =
      await rank(
        candidates,
        options
      );

    return results.map(
      result =>
        result.product
    );
  }

  function getDefaults() {
    return clone(
      DEFAULT_OPTIONS
    );
  }

  /* ----------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------- */

  Forma.recommendations = {
    version: "1.0.0",

    score,
    rank,
    recommend,
    getProducts,

    resolveProduct,
    resolveProducts,

    getDefaults
  };

  Forma.events?.emit?.(
    "forma:recommendations-ready",
    {
      version:
        Forma.recommendations.version
    }
  );

  console.info(
    "[Forma Recommendations] Recommendation Engine ready"
  );
})();