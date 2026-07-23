/* ==========================================================
   FORMA — PERSONA ENGINE
   Version: 2.0.0

   Responsibilities:
   - Stores the user's intelligence profile
   - Reads analyzed data from Entity Engine
   - Calculates profile confidence
   - Exposes a stable Persona API

   Required load order:
   1. forma-engine.js
   2. forma-products.js
   3. forma-signals.js
   4. forma-entities.js
   5. forma-persona.js
   ========================================================== */

(() => {
  "use strict";

  window.Forma = window.Forma || {};

  const Forma = window.Forma;

  const STORAGE_KEY =
    "forma_persona_v1";

  const DEFAULT_PROFILE = {
    version: 2,

    brands: {},

    entities: {
      brands: {},
      types: {},
      tags: {}
    },

    categories: {},
    colors: {},
    materials: {},
    priceRanges: {},

    activity: {
      savedProducts: 0,
      followedBrands: 0,
      viewedProducts: 0
    },

    confidence: 0,

    createdAt: null,
    updatedAt: null
  };

  let profile = load();

  /* ----------------------------------------------------------
     HELPERS
     ---------------------------------------------------------- */

  function clone(value) {
    if (value === undefined) {
      return undefined;
    }

    if (
      typeof structuredClone ===
      "function"
    ) {
      return structuredClone(value);
    }

    return JSON.parse(
      JSON.stringify(value)
    );
  }

  function createDefaultProfile() {
    const defaultProfile =
      clone(DEFAULT_PROFILE);

    const now = Date.now();

    defaultProfile.createdAt = now;
    defaultProfile.updatedAt = now;

    return defaultProfile;
  }

  function normalizeEntityType(type) {
    const value = String(type || "")
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "");

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

  function normalizeEntityName(name) {
    if (
      Forma.entities?.normalize
    ) {
      return Forma.entities.normalize(
        name
      );
    }

    return String(name || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/['’]/g, "")
      .replace(
        /[^a-z0-9æøå]+/gi,
        "-"
      )
      .replace(/^-+|-+$/g, "");
  }

  function normalizeStoredProfile(
    storedProfile
  ) {
    const defaults =
      createDefaultProfile();

    const stored =
      storedProfile &&
      typeof storedProfile === "object"
        ? storedProfile
        : {};

    return {
      ...defaults,
      ...stored,

      activity: {
        ...defaults.activity,
        ...(stored.activity || {})
      },

      entities: {
        ...defaults.entities,
        ...(stored.entities || {}),

        brands: {
          ...defaults.entities.brands,
          ...(
            stored.entities
              ?.brands || {}
          )
        },

        types: {
          ...defaults.entities.types,
          ...(
            stored.entities
              ?.types || {}
          )
        },

        tags: {
          ...defaults.entities.tags,
          ...(
            stored.entities
              ?.tags || {}
          )
        }
      },

      brands: {
        ...defaults.brands,
        ...(stored.brands || {})
      },

      categories: {
        ...defaults.categories,
        ...(stored.categories || {})
      },

      colors: {
        ...defaults.colors,
        ...(stored.colors || {})
      },

      materials: {
        ...defaults.materials,
        ...(stored.materials || {})
      },

      priceRanges: {
        ...defaults.priceRanges,
        ...(stored.priceRanges || {})
      }
    };
  }

  /* ----------------------------------------------------------
     STORAGE
     ---------------------------------------------------------- */

  function load() {
    try {
      const stored =
        localStorage.getItem(
          STORAGE_KEY
        );

      if (!stored) {
        return createDefaultProfile();
      }

      return normalizeStoredProfile(
        JSON.parse(stored)
      );
    } catch (error) {
      console.warn(
        "[Forma Persona] Could not load profile:",
        error
      );

      return createDefaultProfile();
    }
  }

  function save(nextProfile = profile) {
    const now = Date.now();

    if (!nextProfile.createdAt) {
      nextProfile.createdAt = now;
    }

    nextProfile.updatedAt = now;

    profile =
      normalizeStoredProfile(
        nextProfile
      );

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(profile)
      );
    } catch (error) {
      console.warn(
        "[Forma Persona] Could not save profile:",
        error
      );
    }

    const detail = clone(profile);

    document.dispatchEvent(
      new CustomEvent(
        "forma:persona-updated",
        {
          detail
        }
      )
    );

    Forma.events?.emit?.(
      "forma:persona-updated",
      detail
    );

    return clone(profile);
  }

  /* ----------------------------------------------------------
     CONFIDENCE
     ---------------------------------------------------------- */

  function calculateConfidence(
    currentProfile
  ) {
    const activity =
      currentProfile.activity || {};

    const savedProducts =
      Number(
        activity.savedProducts
      ) || 0;

    const followedBrands =
      Number(
        activity.followedBrands
      ) || 0;

    const viewedProducts =
      Number(
        activity.viewedProducts
      ) || 0;

    /*
     * Saved and followed actions are stronger
     * preference signals than simple views.
     */
    const weightedActivity =
      savedProducts * 3 +
      followedBrands * 5 +
      viewedProducts;

    return Math.min(
      100,
      Math.round(
        weightedActivity * 2
      )
    );
  }

  /* ----------------------------------------------------------
     ACTIVITY
     ---------------------------------------------------------- */

  function collectActivity() {
    return {
      savedProducts:
        Number(
          Forma.savedProducts
            ?.count?.()
        ) || 0,

      followedBrands:
        Number(
          Forma.followedBrands
            ?.count?.()
        ) || 0,

      viewedProducts:
        Number(
          Forma.recentlyViewed
            ?.count?.()
        ) || 0
    };
  }

  /* ----------------------------------------------------------
     ENTITY ANALYSIS
     ---------------------------------------------------------- */

  async function analyzeEntities() {
    if (
      !Forma.entities?.refresh ||
      !Forma.entities?.getAll
    ) {
      console.warn(
        "[Forma Persona] Entity Engine is not available"
      );

      profile.entities = {
        brands: {},
        types: {},
        tags: {}
      };

      profile.brands = {};

      return;
    }

    await Forma.entities.refresh();

    const entityResult =
      Forma.entities.getAll();

    const entityData =
      entityResult?.entities || {};

    profile.entities = {
      brands: clone(
        entityData.brands || {}
      ),

      types: clone(
        entityData.types || {}
      ),

      tags: clone(
        entityData.tags || {}
      )
    };

    /*
     * Backwards compatibility:
     * Older modules may still read
     * profile.brands directly.
     */
    profile.brands = clone(
      profile.entities.brands
    );
  }

  /* ----------------------------------------------------------
     PROFILE REBUILD
     ---------------------------------------------------------- */

  async function rebuildProfile() {
    profile.activity =
      collectActivity();

    await analyzeEntities();

    profile.confidence =
      calculateConfidence(profile);

    return save(profile);
  }

  /* ----------------------------------------------------------
     ENTITY READ METHODS
     ---------------------------------------------------------- */

  function getEntityCollection(type) {
    const normalizedType =
      normalizeEntityType(type);

    if (!normalizedType) {
      return {};
    }

    return clone(
      profile.entities
        ?.[normalizedType] || {}
    );
  }

  function getEntity(
    type,
    name
  ) {
    const normalizedType =
      normalizeEntityType(type);

    const key =
      normalizeEntityName(name);

    if (
      !normalizedType ||
      !key
    ) {
      return null;
    }

    return clone(
      profile.entities
        ?.[normalizedType]
        ?.[key] || null
    );
  }

  function getTopEntities(
    type,
    limit = 5
  ) {
    const normalizedType =
      normalizeEntityType(type);

    if (!normalizedType) {
      return [];
    }

    const parsedLimit =
      Number(limit);

    const safeLimit =
      Number.isFinite(parsedLimit)
        ? Math.max(
            0,
            Math.floor(parsedLimit)
          )
        : 5;

    const collection =
      profile.entities
        ?.[normalizedType] || {};

    return Object.values(collection)
      .sort((a, b) => {
        const scoreDifference =
          (Number(b.score) || 0) -
          (Number(a.score) || 0);

        if (scoreDifference !== 0) {
          return scoreDifference;
        }

        return (
          (
            Number(
              b.lastInteraction
            ) || 0
          ) -
          (
            Number(
              a.lastInteraction
            ) || 0
          )
        );
      })
      .slice(0, safeLimit)
      .map(entity =>
        clone(entity)
      );
  }

  /* ----------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------- */

  Forma.persona = {
    version: "2.0.0",

    async refresh() {
      return rebuildProfile();
    },

    getProfile() {
      return clone(profile);
    },

    reset() {
      profile =
        createDefaultProfile();

      return save(profile);
    },

    getConfidence() {
      return (
        Number(
          profile.confidence
        ) || 0
      );
    },

    getActivity() {
      return clone(
        profile.activity
      );
    },

    /* --------------------------------------------------------
       GENERIC ENTITY API
       -------------------------------------------------------- */

    getEntities(type) {
      return getEntityCollection(
        type
      );
    },

    getEntity(type, name) {
      return getEntity(
        type,
        name
      );
    },

    getEntityScore(
      type,
      name
    ) {
      return (
        Number(
          getEntity(type, name)
            ?.score
        ) || 0
      );
    },

    hasEntityInterest(
      type,
      name
    ) {
      return (
        this.getEntityScore(
          type,
          name
        ) > 0
      );
    },

    getTopEntities(
      type,
      limit = 5
    ) {
      return getTopEntities(
        type,
        limit
      );
    },

    getFavoriteEntity(type) {
      return (
        getTopEntities(
          type,
          1
        )[0] || null
      );
    },

    /* --------------------------------------------------------
       BRAND API
       Backwards-compatible convenience methods
       -------------------------------------------------------- */

    getBrands() {
      return this.getEntities(
        "brands"
      );
    },

    getBrandScore(name) {
      return this.getEntityScore(
        "brands",
        name
      );
    },

    hasInterest(name) {
      return this.hasEntityInterest(
        "brands",
        name
      );
    },

    getTopBrands(limit = 5) {
      return this.getTopEntities(
        "brands",
        limit
      );
    },

    getFavoriteBrand() {
      return (
        this.getFavoriteEntity(
          "brands"
        )?.name || null
      );
    },

    /* --------------------------------------------------------
       TYPE API
       -------------------------------------------------------- */

    getTypes() {
      return this.getEntities(
        "types"
      );
    },

    getTypeScore(name) {
      return this.getEntityScore(
        "types",
        name
      );
    },

    getTopTypes(limit = 5) {
      return this.getTopEntities(
        "types",
        limit
      );
    },

    getFavoriteType() {
      return (
        this.getFavoriteEntity(
          "types"
        )?.name || null
      );
    },

    /* --------------------------------------------------------
       TAG API
       -------------------------------------------------------- */

    getTags() {
      return this.getEntities(
        "tags"
      );
    },

    getTagScore(name) {
      return this.getEntityScore(
        "tags",
        name
      );
    },

    getTopTags(limit = 5) {
      return this.getTopEntities(
        "tags",
        limit
      );
    },

    getFavoriteTag() {
      return (
        this.getFavoriteEntity(
          "tags"
        )?.name || null
      );
    }
  };

  Forma.events?.emit?.(
    "forma:persona-ready",
    {
      version:
        Forma.persona.version
    }
  );

  console.info(
    "[Forma Persona] Persona Engine ready"
  );
})();