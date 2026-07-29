/* ==========================================================
   FORMA — COLLECTIONS SERVICE
   Version: 2.0.0

   Loads Shopify collections through:
   /collections/{handle}?view=forma-data

   Features:
   - Fetch collection data
   - Load all paginated products
   - Persistent caching
   - Force refresh
   - Request deduplication through Forma Cache
   - Locale-aware storefront URLs
   - No destructive product normalization
   ========================================================== */

(function () {
  "use strict";

  if (!window.Forma) {
    console.error(
      "[Forma Collections] Forma Engine must load first."
    );

    return;
  }

  if (!window.Forma.cache) {
    console.error(
      "[Forma Collections] Forma Cache must load first."
    );

    return;
  }

  const Forma = window.Forma;

  const VERSION = "2.0.0";

  const DEFAULT_TTL =
    30 * 60 * 1000; // 30 minutter

  const DEFAULT_MAX_PAGES = 20;

  /* ----------------------------------------------------------
     HELPERS
     ---------------------------------------------------------- */

  function normalizeHandle(value) {
    return String(value || "")
      .trim()
      .replace(/^https?:\/\/[^/]+/i, "")
      .replace(/^\/?collections\//i, "")
      .replace(/[?#].*$/, "")
      .replace(/^\/+|\/+$/g, "")
      .toLowerCase();
  }

  function getRootPath() {
    const root =
      window.Shopify?.routes?.root ||
      "/";

    return root.endsWith("/")
      ? root
      : `${root}/`;
  }

  function createCacheKey(handle) {
    return `collections:v2:${handle}`;
  }

  function createRequestUrl(
    handle,
    page = 1
  ) {
    const root =
      getRootPath();

    const path =
      `${root}collections/${encodeURIComponent(handle)}`;

    const url =
      new URL(
        path,
        window.location.origin
      );

    url.searchParams.set(
      "view",
      "forma-data"
    );

    url.searchParams.set(
      "page",
      String(page)
    );

    return url.toString();
  }

  function copy(value) {
    if (value === undefined) {
      return undefined;
    }

    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(
        JSON.stringify(value)
      );
    }
  }

  function getProductKey(product) {
    if (!product) {
      return "";
    }

    return String(
      product.handle ||
      product.id ||
      product.url ||
      ""
    )
      .trim()
      .toLowerCase();
  }

  function removeDuplicateProducts(
    products
  ) {
    const seen = new Set();
    const result = [];

    for (
      const product of products || []
    ) {
      if (
        !product ||
        typeof product !== "object"
      ) {
        continue;
      }

      const key =
        getProductKey(product);

      if (
        key &&
        seen.has(key)
      ) {
        continue;
      }

      if (key) {
        seen.add(key);
      }

      /*
       * Vigtigt:
       * Produktet gemmes præcis, som endpointet returnerer det.
       * Vi normaliserer eller filtrerer ikke felterne her.
       */
      result.push(product);
    }

    return result;
  }

  /* ----------------------------------------------------------
     NETWORK
     ---------------------------------------------------------- */

  async function requestPage(
    handle,
    page
  ) {
    const url =
      createRequestUrl(
        handle,
        page
      );

    const response =
      await window.fetch(
        url,
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            Accept:
              "application/json"
          }
        }
      );

    if (!response.ok) {
      throw new Error(
        `[Forma Collections] Could not load "${handle}", page ${page}. Status: ${response.status}`
      );
    }

    const data =
      await response.json();

    if (
      !data ||
      typeof data !== "object"
    ) {
      throw new Error(
        `[Forma Collections] Invalid response for "${handle}", page ${page}.`
      );
    }

    if (
      !Array.isArray(data.products)
    ) {
      console.warn(
        `[Forma Collections] "${handle}", page ${page}, did not return a products array.`,
        data
      );

      data.products = [];
    }

    return data;
  }

  async function requestCollection(
    handle,
    options = {}
  ) {
    const {
      allPages = true,
      maxPages =
        DEFAULT_MAX_PAGES
    } = options;

    const firstPage =
      await requestPage(
        handle,
        1
      );

    const collection = {
      ...(firstPage.collection || {}),
      handle
    };

    const products = [
      ...firstPage.products
    ];

    const totalPages =
      Math.max(
        1,
        Number(
          firstPage.pagination?.pages
        ) || 1
      );

    const pageLimit =
      allPages
        ? Math.min(
            totalPages,
            Math.max(
              1,
              Number(maxPages) ||
              DEFAULT_MAX_PAGES
            )
          )
        : 1;

    /*
     * Vi henter øvrige sider parallelt.
     * Side 1 er allerede hentet.
     */
    if (pageLimit > 1) {
      const pageRequests = [];

      for (
        let page = 2;
        page <= pageLimit;
        page += 1
      ) {
        pageRequests.push(
          requestPage(
            handle,
            page
          )
        );
      }

      const additionalPages =
        await Promise.all(
          pageRequests
        );

      for (
        const pageData of additionalPages
      ) {
        products.push(
          ...pageData.products
        );
      }
    }

    const uniqueProducts =
      removeDuplicateProducts(
        products
      );

    const productsCount =
      Number(
        collection.products_count
      );

    const result = {
      collection,

      products:
        uniqueProducts,

      count:
        uniqueProducts.length,

      totalCount:
        Number.isFinite(productsCount)
          ? productsCount
          : uniqueProducts.length,

      pagesLoaded:
        pageLimit,

      totalPages,

      complete:
        pageLimit >= totalPages,

      fetchedAt:
        Date.now()
    };

    console.info(
      `[Forma Collections] Loaded "${handle}":`,
      {
        products:
          result.products.length,

        totalCount:
          result.totalCount,

        pagesLoaded:
          result.pagesLoaded
      }
    );

    return result;
  }

  /* ----------------------------------------------------------
     PUBLIC METHODS
     ---------------------------------------------------------- */

  async function get(
    value,
    options = {}
  ) {
    const handle =
      normalizeHandle(value);

    if (!handle) {
      console.warn(
        "[Forma Collections] A collection handle is required."
      );

      return null;
    }

    const {
      force = false,
      ttl = DEFAULT_TTL,
      allPages = true,
      maxPages =
        DEFAULT_MAX_PAGES
    } = options;

    const cacheKey =
      createCacheKey(handle);

    if (force) {
      Forma.cache.remove(
        cacheKey
      );
    }

    try {
      const result =
        await Forma.cache.remember(
          cacheKey,

          () =>
            requestCollection(
              handle,
              {
                allPages,
                maxPages
              }
            ),

          {
            ttl,
            persist: true
          }
        );

      Forma.events?.emit?.(
        "forma:collection-loaded",
        {
          handle,

          count:
            result?.products?.length ||
            0,

          totalCount:
            result?.totalCount ||
            0,

          force,

          fetchedAt:
            result?.fetchedAt ||
            null
        }
      );

      return copy(result);
    } catch (error) {
      console.error(
        `[Forma Collections] Failed to load "${handle}".`,
        error
      );

      Forma.events?.emit?.(
        "forma:collection-error",
        {
          handle,

          message:
            error?.message ||
            "Unknown error"
        }
      );

      return null;
    }
  }

  async function products(
    value,
    options = {}
  ) {
    const result =
      await get(
        value,
        options
      );

    return Array.isArray(
      result?.products
    )
      ? result.products
      : [];
  }

  async function collection(
    value,
    options = {}
  ) {
    const result =
      await get(
        value,
        options
      );

    return (
      result?.collection ||
      null
    );
  }

  async function refresh(
    value,
    options = {}
  ) {
    return get(
      value,
      {
        ...options,
        force: true
      }
    );
  }

  async function preload(
    values,
    options = {}
  ) {
    const input =
      Array.isArray(values)
        ? values
        : [values];

    const handles = [
      ...new Set(
        input
          .map(normalizeHandle)
          .filter(Boolean)
      )
    ];

    const results =
      await Promise.all(
        handles.map(handle =>
          get(
            handle,
            options
          )
        )
      );

    return results.filter(Boolean);
  }

  function peek(value) {
    const handle =
      normalizeHandle(value);

    if (!handle) {
      return undefined;
    }

    return Forma.cache.get(
      createCacheKey(handle)
    );
  }

  function has(value) {
    return (
      peek(value) !== undefined
    );
  }

  function remove(value) {
    const handle =
      normalizeHandle(value);

    if (!handle) {
      return;
    }

    Forma.cache.remove(
      createCacheKey(handle)
    );

    Forma.events?.emit?.(
      "forma:collection-cache-cleared",
      {
        handle
      }
    );
  }

  /* ----------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------- */

  /*
   * Vi overskriver bevidst en eventuel tidligere version.
   * Det gør udvikling med Shopify hot reload mere stabil.
   */
  Forma.collections = {
    version: VERSION,

    get,
    fetch: get,

    products,
    getProducts: products,

    collection,
    getCollection: collection,

    refresh,
    preload,

    peek,
    has,
    remove,

    normalizeHandle,
    createRequestUrl
  };

  Forma.events?.emit?.(
    "forma:collections-ready",
    {
      version: VERSION
    }
  );

  console.info(
    `[Forma Collections] Collections Service ${VERSION} ready`
  );
})();