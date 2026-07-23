/* ==========================================================
   FORMA — NEW ARRIVALS ENGINE V1
   ========================================================== */

(function () {
  "use strict";

  window.Forma = window.Forma || {};

  const STORAGE_KEY =
    "forma_new_arrivals_v1";

  const SESSION_KEY =
    "forma_new_arrivals_session_v1";

  const DEFAULT_PRODUCT_LIMIT = 60;
  const DEFAULT_BRAND_LIMIT = 8;
  const INITIAL_LOOKBACK_DAYS = 30;

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
      .replace(/^\/collections\//, "")
      .replace(/^\/products\//, "")
      .split("?")[0]
      .split("#")[0]
      .replace(/\/$/, "");
  }

  function slugify(value) {
    return normalizeText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function uniqueBy(values, getKey) {
    const seen = new Set();

    return safeArray(values).filter(value => {
      const key = getKey(value);

      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  function getProductId(product) {
    return String(
      product?.id ||
      product?.productId ||
      ""
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

  function getProductKey(product) {
    return (
      getProductHandle(product) ||
      getProductId(product)
    );
  }

  function getVendor(product) {
    return String(
      product?.vendor ||
      product?.brand ||
      product?.productVendor ||
      ""
    ).trim();
  }

  function getVendorKey(product) {
    return normalizeText(
      getVendor(product)
    );
  }

  function getBrandName(brand) {
    return String(
      brand?.name ||
      brand?.title ||
      brand?.vendor ||
      brand?.label ||
      brand?.handle ||
      brand ||
      ""
    ).trim();
  }

  function getBrandHandle(brand) {
    return normalizeHandle(
      brand?.handle ||
      brand?.slug ||
      brand?.collectionHandle ||
      ""
    ) || slugify(
      getBrandName(brand)
    );
  }

  function getBrandKey(brand) {
    return normalizeText(
      getBrandName(brand)
    );
  }

  function getProductDate(product) {
    const possibleDates = [
      product?.published_at,
      product?.publishedAt,
      product?.created_at,
      product?.createdAt,
      product?.updated_at,
      product?.updatedAt,
      product?.date
    ];

    for (
      const possibleDate of possibleDates
    ) {
      if (!possibleDate) {
        continue;
      }

      const parsedDate =
        new Date(possibleDate);

      if (
        !Number.isNaN(
          parsedDate.getTime()
        )
      ) {
        return parsedDate;
      }
    }

    return null;
  }

  function getProductTimestamp(product) {
    return (
      getProductDate(product)
        ?.getTime() || 0
    );
  }

  function sortNewestFirst(products) {
    return [...safeArray(products)]
      .sort(
        (first, second) =>
          getProductTimestamp(second) -
          getProductTimestamp(first)
      );
  }

  function daysAgo(days) {
    const date = new Date();

    date.setDate(
      date.getDate() - days
    );

    return date;
  }

  function isAfter(date, comparisonDate) {
    if (!date || !comparisonDate) {
      return false;
    }

    return (
      date.getTime() >
      comparisonDate.getTime()
    );
  }

  /* ========================================================
     STORAGE
     ======================================================== */

  function createDefaultState() {
    return {
      version: 1,

      firstSeenAt:
        new Date().toISOString(),

      lastDashboardVisit: null,

      previousDashboardVisit: null,

      brandVisits: {}
    };
  }

  function readState() {
    try {
      const stored =
        JSON.parse(
          localStorage.getItem(
            STORAGE_KEY
          ) || "null"
        );

      if (
        !stored ||
        typeof stored !== "object"
      ) {
        return createDefaultState();
      }

      return {
        ...createDefaultState(),
        ...stored,

        brandVisits: {
          ...stored.brandVisits
        }
      };
    } catch (error) {
      return createDefaultState();
    }
  }

  function writeState(state) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );
    } catch (error) {
      console.warn(
        "[Forma New Arrivals] Could not save state.",
        error
      );
    }
  }

  function getSessionStart() {
    try {
      const existing =
        sessionStorage.getItem(
          SESSION_KEY
        );

      if (existing) {
        return existing;
      }

      const sessionStart =
        new Date().toISOString();

      sessionStorage.setItem(
        SESSION_KEY,
        sessionStart
      );

      return sessionStart;
    } catch (error) {
      return new Date().toISOString();
    }
  }

  /* ========================================================
     VISIT TRACKING
     ======================================================== */

  function registerDashboardVisit() {
    const state = readState();
    const sessionStart =
      getSessionStart();

    /*
     * Only register one dashboard visit
     * per browser session.
     */
    if (
      state.lastDashboardVisit ===
      sessionStart
    ) {
      return state;
    }

    /*
     * When this session has already
     * been registered, keep the stored
     * previous visit untouched.
     */
    try {
      const sessionRegistered =
        sessionStorage.getItem(
          `${SESSION_KEY}:registered`
        );

      if (sessionRegistered) {
        return state;
      }

      sessionStorage.setItem(
        `${SESSION_KEY}:registered`,
        "true"
      );
    } catch (error) {
      // Continue without session flag.
    }

    state.previousDashboardVisit =
      state.lastDashboardVisit;

    state.lastDashboardVisit =
      sessionStart;

    writeState(state);

    window.dispatchEvent(
      new CustomEvent(
        "forma:new-arrivals-visit-registered",
        {
          detail: {
            currentVisit:
              state.lastDashboardVisit,

            previousVisit:
              state.previousDashboardVisit
          }
        }
      )
    );

    return state;
  }

  function getLastVisit() {
    const state = readState();

    const storedVisit =
      state.previousDashboardVisit ||
      state.lastDashboardVisit;

    if (storedVisit) {
      const parsed =
        new Date(storedVisit);

      if (
        !Number.isNaN(
          parsed.getTime()
        )
      ) {
        return parsed;
      }
    }

    /*
     * First-time users see products
     * published within the last 30 days.
     */
    return daysAgo(
      INITIAL_LOOKBACK_DAYS
    );
  }

  function getBrandLastVisit(
    brandIdentifier
  ) {
    const state = readState();

    const brandKey =
      normalizeText(
        brandIdentifier
      );

    const storedVisit =
      state.brandVisits?.[brandKey];

    if (storedVisit) {
      const parsed =
        new Date(storedVisit);

      if (
        !Number.isNaN(
          parsed.getTime()
        )
      ) {
        return parsed;
      }
    }

    return getLastVisit();
  }

  function markVisited(
    brandIdentifier
  ) {
    const brandKey =
      normalizeText(
        brandIdentifier
      );

    if (!brandKey) {
      return false;
    }

    const state = readState();

    state.brandVisits[brandKey] =
      new Date().toISOString();

    writeState(state);

    window.dispatchEvent(
      new CustomEvent(
        "forma:new-arrivals-brand-visited",
        {
          detail: {
            brandKey,

            visitedAt:
              state.brandVisits[
                brandKey
              ]
          }
        }
      )
    );

    return true;
  }

  function markAllVisited(brands) {
    const state = readState();
    const visitedAt =
      new Date().toISOString();

    safeArray(brands).forEach(
      brand => {
        const key =
          normalizeText(
            brand?.key ||
            brand?.name ||
            brand?.handle ||
            brand
          );

        if (key) {
          state.brandVisits[key] =
            visitedAt;
        }
      }
    );

    writeState(state);

    window.dispatchEvent(
      new CustomEvent(
        "forma:new-arrivals-all-visited",
        {
          detail: {
            visitedAt
          }
        }
      )
    );

    return true;
  }

  /* ========================================================
     FOLLOWED BRANDS
     ======================================================== */

  function getFollowedBrands() {
    try {
      const rawBrands =
        window.Forma
          ?.followedBrands
          ?.getAll?.() || [];

      return uniqueBy(
        safeArray(rawBrands)
          .map(brand => ({
            raw: brand,

            name:
              getBrandName(brand),

            handle:
              getBrandHandle(brand),

            key:
              getBrandKey(brand),

            url:
              brand?.url ||
              (
                getBrandHandle(brand)
                  ? `/collections/${getBrandHandle(brand)}`
                  : "/pages/brands"
              )
          }))
          .filter(
            brand =>
              brand.name &&
              brand.key
          ),
        brand => brand.key
      );
    } catch (error) {
      console.warn(
        "[Forma New Arrivals] Could not read followed brands.",
        error
      );

      return [];
    }
  }

  function isFollowedBrand(
    product,
    followedBrands
  ) {
    const vendorKey =
      getVendorKey(product);

    if (!vendorKey) {
      return false;
    }

    return safeArray(
      followedBrands
    ).some(
      brand =>
        brand.key === vendorKey ||
        normalizeText(
          brand.handle
        ) === vendorKey ||
        slugify(
          vendorKey
        ) === brand.handle
    );
  }

  function findMatchingBrand(
    product,
    followedBrands
  ) {
    const vendorKey =
      getVendorKey(product);

    return safeArray(
      followedBrands
    ).find(
      brand =>
        brand.key === vendorKey ||
        normalizeText(
          brand.handle
        ) === vendorKey ||
        slugify(
          vendorKey
        ) === brand.handle
    ) || null;
  }

  /* ========================================================
     PRODUCT SOURCE
     ======================================================== */

  async function getCandidateProducts(
    limit = DEFAULT_PRODUCT_LIMIT,
    options = {}
  ) {
    if (
      !window.Forma
        ?.recommendations
        ?.getProducts
    ) {
      console.error(
        "[Forma New Arrivals] Recommendation Engine must load first."
      );

      return [];
    }

    try {
      const products =
        await window.Forma
          .recommendations
          .getProducts(
            Math.max(
              DEFAULT_PRODUCT_LIMIT,
              Number(limit) ||
              DEFAULT_PRODUCT_LIMIT
            ),
            {
              force:
                Boolean(
                  options.force
                )
            }
          );

      return uniqueBy(
        safeArray(products),
        getProductKey
      );
    } catch (error) {
      console.error(
        "[Forma New Arrivals] Could not load products.",
        error
      );

      return [];
    }
  }

  /* ========================================================
     BRAND PRODUCT LOGIC
     ======================================================== */

  function productIsNewForBrand(
    product,
    brand
  ) {
    const productDate =
      getProductDate(product);

    if (!productDate) {
      return false;
    }

    const comparisonDate =
      getBrandLastVisit(
        brand.key
      );

    return isAfter(
      productDate,
      comparisonDate
    );
  }

  function groupProductsByBrand(
    products,
    followedBrands
  ) {
    const groups = new Map();

    safeArray(products).forEach(
      product => {
        if (
          !isFollowedBrand(
            product,
            followedBrands
          )
        ) {
          return;
        }

        const brand =
          findMatchingBrand(
            product,
            followedBrands
          );

        if (!brand) {
          return;
        }

        if (
          !productIsNewForBrand(
            product,
            brand
          )
        ) {
          return;
        }

        if (
          !groups.has(
            brand.key
          )
        ) {
          groups.set(
            brand.key,
            {
              ...brand,
              products: []
            }
          );
        }

        groups
          .get(brand.key)
          .products
          .push(product);
      }
    );

    return Array.from(
      groups.values()
    ).map(group => {
      const sortedProducts =
        sortNewestFirst(
          group.products
        );

      const newestProduct =
        sortedProducts[0];

      return {
        ...group,

        products:
          sortedProducts,

        count:
          sortedProducts.length,

        newestAt:
          getProductDate(
            newestProduct
          )?.toISOString() ||
          null,

        lastVisitedAt:
          getBrandLastVisit(
            group.key
          ).toISOString()
      };
    });
  }

  /* ========================================================
     PUBLIC DATA METHODS
     ======================================================== */

  async function getBrands(
    limit = DEFAULT_BRAND_LIMIT,
    options = {}
  ) {
    const followedBrands =
      getFollowedBrands();

    if (!followedBrands.length) {
      return [];
    }

    const products =
      await getCandidateProducts(
        options.productLimit ||
        DEFAULT_PRODUCT_LIMIT,
        options
      );

    const groups =
      groupProductsByBrand(
        products,
        followedBrands
      );

    return groups
      .sort(
        (first, second) => {
          const firstTime =
            first.newestAt
              ? new Date(
                  first.newestAt
                ).getTime()
              : 0;

          const secondTime =
            second.newestAt
              ? new Date(
                  second.newestAt
                ).getTime()
              : 0;

          if (
            secondTime !== firstTime
          ) {
            return (
              secondTime -
              firstTime
            );
          }

          return (
            second.count -
            first.count
          );
        }
      )
      .slice(
        0,
        Math.max(
          1,
          Number(limit) ||
          DEFAULT_BRAND_LIMIT
        )
      );
  }

  async function getBrandProducts(
    brandIdentifier,
    limit = 8,
    options = {}
  ) {
    const identifier =
      normalizeText(
        brandIdentifier
      );

    if (!identifier) {
      return [];
    }

    const brands =
      await getBrands(
        DEFAULT_BRAND_LIMIT * 10,
        options
      );

    const brand =
      brands.find(
        item =>
          item.key === identifier ||
          normalizeText(
            item.handle
          ) === identifier ||
          slugify(
            item.name
          ) === slugify(
            identifier
          )
      );

    if (!brand) {
      return [];
    }

    return brand.products.slice(
      0,
      Math.max(
        1,
        Number(limit) || 8
      )
    );
  }

  async function getNewCount(
    brandIdentifier,
    options = {}
  ) {
    const products =
      await getBrandProducts(
        brandIdentifier,
        Number.MAX_SAFE_INTEGER,
        options
      );

    return products.length;
  }

  async function getTotalCount(
    options = {}
  ) {
    const brands =
      await getBrands(
        DEFAULT_BRAND_LIMIT * 10,
        options
      );

    return brands.reduce(
      (total, brand) =>
        total + brand.count,
      0
    );
  }

  async function refresh(
    limit = DEFAULT_BRAND_LIMIT
  ) {
    const brands =
      await getBrands(
        limit,
        {
          force: true
        }
      );

    window.dispatchEvent(
      new CustomEvent(
        "forma:new-arrivals-updated",
        {
          detail: {
            brands,

            totalCount:
              brands.reduce(
                (total, brand) =>
                  total +
                  brand.count,
                0
              ),

            lastVisit:
              getLastVisit()
                .toISOString()
          }
        }
      )
    );

    return brands;
  }

  function reset() {
    try {
      localStorage.removeItem(
        STORAGE_KEY
      );

      sessionStorage.removeItem(
        SESSION_KEY
      );

      sessionStorage.removeItem(
        `${SESSION_KEY}:registered`
      );

      return true;
    } catch (error) {
      return false;
    }
  }

  /* ========================================================
     INVALIDATION EVENTS
     ======================================================== */

  [
    "forma:followed-brands-updated",
    "forma:profile-updated",
    "forma:onboarding-completed"
  ].forEach(eventName => {
    window.addEventListener(
      eventName,
      () => {
        window.dispatchEvent(
          new CustomEvent(
            "forma:new-arrivals-profile-changed"
          )
        );
      }
    );
  });

  /* ========================================================
     PUBLIC API
     ======================================================== */

  window.Forma.newArrivals = {
    getBrands,
    getBrandProducts,
    getNewCount,
    getTotalCount,
    getLastVisit,
    getBrandLastVisit,
    getFollowedBrands,
    registerDashboardVisit,
    markVisited,
    markAllVisited,
    refresh,
    reset
  };
})();
