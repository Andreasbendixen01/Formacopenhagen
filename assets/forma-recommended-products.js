/* ==========================================================
   FORMA — RECOMMENDED PRODUCTS UI
   Version 3.0.0

   Recommendation Service
          ↓
   Recommended product handles
          ↓
   Shopify product-card endpoint
          ↓
   Existing product-card.liquid
   ========================================================== */

(function () {
  "use strict";

  const VERSION = "3.0.0";
  const DEFAULT_LIMIT = 8;
  const CARD_VIEW = "forma-card";

  /*
   * Cache færdigrenderede produktkort i den aktuelle session.
   *
   * Det betyder, at vi ikke henter det samme kort igen,
   * hver gang brugerens anbefalinger opdateres.
   */
  const productCardCache = new Map();

  /*
   * Holder styr på alle initialiserede sektioner.
   *
   * Det gør filen kompatibel med Shopify Theme Editor,
   * hvor sektioner kan blive indlæst dynamisk.
   */
  const initializedSections = new WeakSet();

  function normalizeHandle(value) {
    if (!value) {
      return "";
    }

    let handle = String(value).trim();

    try {
      if (
        handle.startsWith("http://") ||
        handle.startsWith("https://")
      ) {
        handle = new URL(handle).pathname;
      }
    } catch (error) {
      // Fortsæt med den oprindelige værdi.
    }

    return handle
      .replace(/^\/+/, "")
      .replace(/^products\//, "")
      .split("?")[0]
      .split("#")[0]
      .replace(/\/+$/, "")
      .trim();
  }

  function getProductHandle(product) {
    return normalizeHandle(
      product?.handle ||
      product?.product_handle ||
      product?.productHandle ||
      product?.url ||
      product?.product_url ||
      ""
    );
  }

  function getShopRoot() {
    const root =
      window.Shopify?.routes?.root ||
      "/";

    return root.endsWith("/")
      ? root
      : `${root}/`;
  }

  function createProductCardUrl(handle) {
    const root = getShopRoot();

    return (
      `${root}products/` +
      `${encodeURIComponent(handle)}` +
      `?view=${CARD_VIEW}`
    );
  }

  function normalizeRecommendationResult(result) {
    if (Array.isArray(result)) {
      return result;
    }

    if (Array.isArray(result?.products)) {
      return result.products;
    }

    if (Array.isArray(result?.recommendations)) {
      return result.recommendations;
    }

    if (Array.isArray(result?.items)) {
      return result.items;
    }

    if (Array.isArray(result?.results)) {
      return result.results;
    }

    return [];
  }

  function removeDuplicateProducts(products) {
    const seenHandles = new Set();

    return products.filter(product => {
      const handle = getProductHandle(product);

      if (!handle || seenHandles.has(handle)) {
        return false;
      }

      seenHandles.add(handle);
      return true;
    });
  }

  async function getRecommendedProducts({
    limit = DEFAULT_LIMIT,
    force = false
  } = {}) {
    const forma =
      window.Forma;

    /*
     * Den nye Recommendation Service er førstevalg.
     */
    if (
      typeof forma
        ?.recommendationService
        ?.getForYou === "function"
    ) {
      const result =
        await forma.recommendationService.getForYou({
          limit,
          force
        });

      const products =
        normalizeRecommendationResult(result);

      return removeDuplicateProducts(products)
        .slice(0, limit);
    }

    /*
     * Fallback til den eksisterende Recommendation Engine.
     *
     * Dermed fungerer sektionen stadig, hvis den nye service
     * ikke er indlæst på en bestemt side.
     */
    if (
      typeof forma
        ?.recommendations
        ?.getProducts === "function"
    ) {
      const result =
        await forma.recommendations.getProducts(
          limit,
          { force }
        );

      const products =
        normalizeRecommendationResult(result);

      return removeDuplicateProducts(products)
        .slice(0, limit);
    }

    throw new Error(
      "Neither Forma.recommendationService nor " +
      "Forma.recommendations is available."
    );
  }

  async function fetchProductCard(
    handle,
    {
      force = false,
      signal
    } = {}
  ) {
    const normalizedHandle =
      normalizeHandle(handle);

    if (!normalizedHandle) {
      throw new Error(
        "A valid product handle is required."
      );
    }

    if (
      !force &&
      productCardCache.has(normalizedHandle)
    ) {
      return productCardCache.get(
        normalizedHandle
      );
    }

    const response = await fetch(
      createProductCardUrl(normalizedHandle),
      {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "text/html"
        },
        signal
      }
    );

    if (!response.ok) {
      throw new Error(
        `Could not load product card for ` +
        `"${normalizedHandle}". ` +
        `Status: ${response.status}`
      );
    }

    const html =
      (await response.text()).trim();

    if (!html) {
      throw new Error(
        `The product card endpoint returned ` +
        `empty HTML for "${normalizedHandle}".`
      );
    }

    productCardCache.set(
      normalizedHandle,
      html
    );

    return html;
  }

  async function fetchProductCards(
    products,
    {
      force = false,
      signal
    } = {}
  ) {
    const requests =
      products.map(async product => {
        const handle =
          getProductHandle(product);

        if (!handle) {
          console.warn(
            "[Forma Recommended] Product has no valid handle:",
            product
          );

          return null;
        }

        try {
          const html =
            await fetchProductCard(
              handle,
              {
                force,
                signal
              }
            );

          return {
            handle,
            product,
            html
          };
        } catch (error) {
          if (error?.name === "AbortError") {
            throw error;
          }

          console.warn(
            `[Forma Recommended] Could not load card for "${handle}".`,
            error
          );

          return null;
        }
      });

    const cards =
      await Promise.all(requests);

    return cards.filter(Boolean);
  }

  function announceRenderedProducts(
    section,
    products,
    cards
  ) {
    const detail = {
      section,
      products,
      cards,
      count: cards.length
    };

    /*
     * Egen event til kommende Forma-moduler.
     */
    window.dispatchEvent(
      new CustomEvent(
        "forma:recommended-products-rendered",
        { detail }
      )
    );

    /*
     * Opdater eksisterende Forma save-knapper,
     * hvis modulet udstiller en update-funktion.
     */
    window.Forma
      ?.saveButtons
      ?.updateAll?.();

    window.Forma
      ?.savedProductsUI
      ?.updateAll?.();
  }

  function initRecommendedProducts(section) {
    if (
      !section ||
      initializedSections.has(section)
    ) {
      return;
    }

    const grid = section.querySelector(
      "[data-forma-recommended-grid]"
    );

    const refreshButton =
      section.querySelector(
        "[data-forma-recommended-refresh]"
      );

    if (!grid) {
      console.warn(
        "[Forma Recommended] Grid was not found."
      );

      return;
    }

    initializedSections.add(section);

    const configuredLimit =
      Number(
        section.dataset.formaRecommendedLimit ||
        section.dataset.productLimit ||
        DEFAULT_LIMIT
      );

    const productLimit =
      Number.isFinite(configuredLimit) &&
      configuredLimit > 0
        ? Math.floor(configuredLimit)
        : DEFAULT_LIMIT;

    const originalRefreshLabel =
      refreshButton?.textContent?.trim() ||
      "Refresh selection";

    let activeRequestController = null;
    let renderSequence = 0;
    let refreshTimeout = null;

    function showSection() {
      section.hidden = false;
      section.removeAttribute("aria-hidden");
    }

    function hideSection() {
      section.hidden = true;
      section.setAttribute(
        "aria-hidden",
        "true"
      );

      grid.innerHTML = "";
    }

    function setLoading(isLoading) {
      section.classList.toggle(
        "is-loading",
        isLoading
      );

      section.setAttribute(
        "aria-busy",
        String(isLoading)
      );

      if (!refreshButton) {
        return;
      }

      refreshButton.disabled =
        isLoading;

      refreshButton.textContent =
        isLoading
          ? "Updating..."
          : originalRefreshLabel;
    }

    async function render({
      force = false
    } = {}) {
      renderSequence += 1;

      const currentSequence =
        renderSequence;

      /*
       * Stop en tidligere request, hvis en ny opdatering
       * bliver startet, før den gamle er færdig.
       */
      activeRequestController?.abort();

      activeRequestController =
        new AbortController();

      const { signal } =
        activeRequestController;

      setLoading(true);

      try {
        const products =
          await getRecommendedProducts({
            limit: productLimit,
            force
          });

        if (
          signal.aborted ||
          currentSequence !== renderSequence
        ) {
          return;
        }

        if (!products.length) {
          console.warn(
            "[Forma Recommended] No recommendations were returned."
          );

          hideSection();
          return;
        }

        const cards =
          await fetchProductCards(
            products,
            {
              force,
              signal
            }
          );

        if (
          signal.aborted ||
          currentSequence !== renderSequence
        ) {
          return;
        }

        if (!cards.length) {
          console.warn(
            "[Forma Recommended] No product cards could be rendered."
          );

          hideSection();
          return;
        }

        grid.innerHTML =
          cards
            .map(card => card.html)
            .join("");

        showSection();

        announceRenderedProducts(
          section,
          products,
          cards
        );

        console.log(
          `[Forma Recommended] Rendered ${cards.length} product cards.`
        );
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error(
          "[Forma Recommended] Could not render recommendations.",
          error
        );

        hideSection();
      } finally {
        if (
          currentSequence === renderSequence
        ) {
          setLoading(false);
        }
      }
    }

    function scheduleRender({
      force = false,
      delay = 150
    } = {}) {
      window.clearTimeout(
        refreshTimeout
      );

      refreshTimeout =
        window.setTimeout(
          () => {
            render({ force });
          },
          delay
        );
    }

    function clearRecommendationCaches() {
      productCardCache.clear();

      window.Forma
        ?.recommendations
        ?.clearCatalogCache?.();

      window.Forma
        ?.recommendationService
        ?.clear?.();

      window.Forma
        ?.recommendationService
        ?.clearCache?.();
    }

    refreshButton?.addEventListener(
      "click",
      () => {
        clearRecommendationCaches();

        render({
          force: true
        });
      }
    );

    /*
     * Brugerens Forma ændrer sig.
     * Derfor beregner vi anbefalingerne igen.
     */
    const recommendationEvents = [
      "forma:saved-updated",
      "forma:followed-brands-updated",
      "forma:recently-viewed-updated",
      "forma:profile-updated",
      "forma:onboarding-completed"
    ];

    recommendationEvents.forEach(
      eventName => {
        window.addEventListener(
          eventName,
          () => {
            scheduleRender();
          }
        );
      }
    );

    /*
     * Shopify Theme Editor cleanup.
     */
    section.addEventListener(
      "forma:recommended-destroy",
      () => {
        activeRequestController?.abort();

        window.clearTimeout(
          refreshTimeout
        );
      },
      { once: true }
    );

    render();
  }

  function initAllRecommendedProducts(
    root = document
  ) {
    const sections = [];

    if (
      root instanceof Element &&
      root.matches(
        "[data-forma-recommended]"
      )
    ) {
      sections.push(root);
    }

    root
      .querySelectorAll?.(
        "[data-forma-recommended]"
      )
      .forEach(section => {
        sections.push(section);
      });

    sections.forEach(
      initRecommendedProducts
    );
  }

  function boot() {
    initAllRecommendedProducts();

    console.log(
      `[Forma Recommended] Ready — v${VERSION}`
    );
  }

  /*
   * Understøtter dynamisk indlæsning i Shopify Theme Editor.
   */
  document.addEventListener(
    "shopify:section:load",
    event => {
      initAllRecommendedProducts(
        event.target
      );
    }
  );

  document.addEventListener(
    "shopify:section:unload",
    event => {
      const section =
        event.target.matches?.(
          "[data-forma-recommended]"
        )
          ? event.target
          : event.target.querySelector?.(
              "[data-forma-recommended]"
            );

      section?.dispatchEvent(
        new CustomEvent(
          "forma:recommended-destroy"
        )
      );
    }
  );

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      boot,
      { once: true }
    );
  } else {
    boot();
  }
})();