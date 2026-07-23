/* ==========================================================
   FORMA — ENTITY ENGINE
   Version: 1.0.0

   Builds intelligence from:
   - Brands
   - Product types
   - Product tags

   Signals:
   - Saved product: +5
   - Viewed product: +1
   - Followed brand: +15
   ========================================================== */

(() => {
  "use strict";

  window.Forma = window.Forma || {};

  const Forma = window.Forma;

  const SCORE_WEIGHTS = {
    saved: 5,
    viewed: 1,
    followed: 15
  };

  let entities = createEmptyEntities();
  let generatedAt = null;

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

  function createEmptyEntities() {
    return {
      brands: {},
      types: {},
      tags: {}
    };
  }

  function normalize(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9æøå]+/gi, "-")
      .replace(/^-+|-+$/g, "");
  }

  function normalizeEntityType(type) {
    const value = String(type || "")
      .trim()
      .toLowerCase();

    const aliases = {
      brand: "brands",
      brands: "brands",

      type: "types",
      types: "types",
      producttype: "types",
      producttypes: "types",

      tag: "tags",
      tags: "tags"
    };

    return aliases[value] || null;
  }

  function createEntity(
    key,
    name
  ) {
    return {
      key,
      name: String(name || "").trim(),

      score: 0,

      saved: 0,
      viewed: 0,
      followed: false,

      firstSeen: null,
      lastSeen: null,
      lastInteraction: null
    };
  }

  function ensureEntity(
    collection,
    name
  ) {
    const key = normalize(name);

    if (!key) {
      return null;
    }

    if (!collection[key]) {
      collection[key] =
        createEntity(key, name);
    }

    if (
      !collection[key].name &&
      name
    ) {
      collection[key].name =
        String(name).trim();
    }

    return collection[key];
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
      if (!value) {
        continue;
      }

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
    entity,
    timestamp
  ) {
    if (
      !entity ||
      !timestamp
    ) {
      return;
    }

    if (
      !entity.firstSeen ||
      timestamp < entity.firstSeen
    ) {
      entity.firstSeen = timestamp;
    }

    if (
      !entity.lastSeen ||
      timestamp > entity.lastSeen
    ) {
      entity.lastSeen = timestamp;
    }

    if (
      !entity.lastInteraction ||
      timestamp > entity.lastInteraction
    ) {
      entity.lastInteraction =
        timestamp;
    }
  }

  function calculateScore(entity) {
    entity.score =
      entity.saved *
        SCORE_WEIGHTS.saved +
      entity.viewed *
        SCORE_WEIGHTS.viewed +
      (
        entity.followed
          ? SCORE_WEIGHTS.followed
          : 0
      );

    return entity.score;
  }

  function scoreAllEntities() {
    for (
      const collection of
      Object.values(entities)
    ) {
      for (
        const entity of
        Object.values(collection)
      ) {
        calculateScore(entity);
      }
    }
  }

  async function resolveProduct(item) {
    if (!item) {
      return null;
    }

    const alreadyResolved =
      item.vendor ||
      item.type ||
      item.product_type ||
      Array.isArray(item.tags);

    if (alreadyResolved) {
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
        "[Forma Entities] Could not resolve product:",
        handle,
        error
      );

      return item;
    }
  }

  function getProductType(product) {
    return (
      product?.product_type ||
      product?.type ||
      ""
    );
  }

  function getProductTags(product) {
    if (
      Array.isArray(product?.tags)
    ) {
      return product.tags;
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

  /* ----------------------------------------------------------
     PRODUCT ENTITIES
     ---------------------------------------------------------- */

  function addProductEntities(
    product,
    signalType,
    timestamp
  ) {
    if (!product) {
      return;
    }

    const brandName =
      product.vendor;

    const productType =
      getProductType(product);

    const tags =
      getProductTags(product);

    const brandEntity =
      ensureEntity(
        entities.brands,
        brandName
      );

    const typeEntity =
      ensureEntity(
        entities.types,
        productType
      );

    const tagEntities =
      tags
        .map(tag =>
          ensureEntity(
            entities.tags,
            tag
          )
        )
        .filter(Boolean);

    const productEntities = [
      brandEntity,
      typeEntity,
      ...tagEntities
    ].filter(Boolean);

    for (
      const entity of productEntities
    ) {
      if (signalType === "saved") {
        entity.saved += 1;
      }

      if (signalType === "viewed") {
        entity.viewed += 1;
      }

      updateInteraction(
        entity,
        timestamp
      );
    }
  }

  /* ----------------------------------------------------------
     SAVED PRODUCTS
     ---------------------------------------------------------- */

  async function collectSavedProducts() {
    const savedProducts =
      Forma.savedProducts
        ?.getAll?.() || [];

    for (const item of savedProducts) {
      const product =
        await resolveProduct(item);

      addProductEntities(
        product,
        "saved",
        getTimestamp(item)
      );
    }
  }

  /* ----------------------------------------------------------
     RECENTLY VIEWED PRODUCTS
     ---------------------------------------------------------- */

  async function collectViewedProducts() {
    const viewedProducts =
      Forma.recentlyViewed
        ?.getAll?.() || [];

    for (
      const item of viewedProducts
    ) {
      const product =
        await resolveProduct(item);

      addProductEntities(
        product,
        "viewed",
        getTimestamp(item)
      );
    }
  }

  /* ----------------------------------------------------------
     FOLLOWED BRANDS
     ---------------------------------------------------------- */

  function collectFollowedBrands() {
    const followedBrands =
      Forma.followedBrands
        ?.getAll?.() || [];

    for (
      const item of followedBrands
    ) {
      const brandName =
        typeof item === "string"
          ? item
          : (
              item?.name ||
              item?.title ||
              item?.vendor ||
              item?.handle
            );

      const brand =
        ensureEntity(
          entities.brands,
          brandName
        );

      if (!brand) {
        continue;
      }

      brand.followed = true;

      updateInteraction(
        brand,
        getTimestamp(item)
      );
    }
  }

  /* ----------------------------------------------------------
     BUILD
     ---------------------------------------------------------- */

  async function refresh() {
    entities =
      createEmptyEntities();

    await collectSavedProducts();

    await collectViewedProducts();

    collectFollowedBrands();

    scoreAllEntities();

    generatedAt = Date.now();

    Forma.events?.emit?.(
      "forma:entities-updated",
      {
        generatedAt,
        entities: clone(entities)
      }
    );

    return clone(entities);
  }

  /* ----------------------------------------------------------
     PUBLIC READ METHODS
     ---------------------------------------------------------- */

  function getAll() {
    return {
      generatedAt,
      entities: clone(entities)
    };
  }

  function getCollection(type) {
    const normalizedType =
      normalizeEntityType(type);

    if (!normalizedType) {
      return {};
    }

    return clone(
      entities[normalizedType]
    );
  }

  function get(
    type,
    name
  ) {
    const normalizedType =
      normalizeEntityType(type);

    const key =
      normalize(name);

    if (
      !normalizedType ||
      !key
    ) {
      return null;
    }

    return clone(
      entities[normalizedType][key] ||
      null
    );
  }

  function getScore(
    type,
    name
  ) {
    return (
      get(type, name)?.score || 0
    );
  }

  function hasInterest(
    type,
    name
  ) {
    return (
      getScore(type, name) > 0
    );
  }

  function getTop(
    type,
    limit = 5
  ) {
    const normalizedType =
      normalizeEntityType(type);

    if (!normalizedType) {
      return [];
    }

    const safeLimit =
      Math.max(
        0,
        Number(limit) || 5
      );

    return Object.values(
      entities[normalizedType]
    )
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return (
          (b.lastInteraction || 0) -
          (a.lastInteraction || 0)
        );
      })
      .slice(0, safeLimit)
      .map(clone);
  }

  function getFavorite(type) {
    return (
      getTop(type, 1)[0] ||
      null
    );
  }

  /* ----------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------- */

  Forma.entities = {
    version: "1.0.0",

    weights: clone(
      SCORE_WEIGHTS
    ),

    refresh,

    getAll,

    getCollection,

    get,

    getTop,

    getFavorite,

    getScore,

    hasInterest,

    normalize
  };

  Forma.events?.emit?.(
    "forma:entities-ready",
    {
      version:
        Forma.entities.version
    }
  );

  console.info(
    "[Forma Entities] Entity Engine ready"
  );
})();