/* ==========================================================
   FORMA — DASHBOARD POLISH V1
   ========================================================== */

(function () {
  "use strict";

  const SECTION_SELECTOR =
    ".forma-dashboard-section";

  const REVEAL_ITEM_SELECTORS = [
    ".forma-dashboard-section__header",
    ".forma-dashboard-section__heading",
    ".forma-dashboard-section__title",
    ".forma-dashboard-section__description",

    ".forma-live-stats__item",
    ".forma-recommended-product",
    ".forma-daily-edit__item",
    ".forma-new-brand",
    ".forma-continue-card",
    ".forma-discover-card"
  ];

  function getRevealItems(section) {
    const items = [];

    REVEAL_ITEM_SELECTORS.forEach(
      selector => {
        section
          .querySelectorAll(selector)
          .forEach(element => {
            if (
              element !== section &&
              !items.includes(element)
            ) {
              items.push(element);
            }
          });
      }
    );

    return items;
  }

  function prepareSection(
    section,
    sectionIndex
  ) {
    if (
      section.dataset
        .formaPolishReady === "true"
    ) {
      return;
    }

    section.dataset.formaPolishReady =
      "true";

    section.classList.add(
      "forma-reveal-section"
    );

    section.style.setProperty(
      "--forma-section-index",
      sectionIndex
    );

    const revealItems =
      getRevealItems(section);

    revealItems.forEach(
      (element, index) => {
        element.classList.add(
          "forma-reveal-item"
        );

        element.style.setProperty(
          "--forma-reveal-index",
          Math.min(index, 12)
        );
      }
    );
  }

  function revealSection(section) {
    if (
      section.classList.contains(
        "is-revealed"
      )
    ) {
      return;
    }

    section.classList.add(
      "is-revealed"
    );
  }

  function initDashboardPolish() {
    const sections = Array.from(
      document.querySelectorAll(
        SECTION_SELECTOR
      )
    );

    if (!sections.length) {
      return;
    }

    sections.forEach(
      prepareSection
    );

    const prefersReducedMotion =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

    if (
      prefersReducedMotion ||
      !("IntersectionObserver" in window)
    ) {
      sections.forEach(
        revealSection
      );

      return;
    }

    const observer =
      new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (
              !entry.isIntersecting
            ) {
              return;
            }

            revealSection(
              entry.target
            );

            observer.unobserve(
              entry.target
            );
          });
        },
        {
          threshold: 0.08,
          rootMargin:
            "0px 0px -6% 0px"
        }
      );

    sections.forEach(section => {
      const rect =
        section.getBoundingClientRect();

      /*
       * Reveal content already visible
       * when the page loads.
       */
      if (
        rect.top <
        window.innerHeight * 0.88
      ) {
        requestAnimationFrame(
          () => {
            revealSection(section);
          }
        );
      } else {
        observer.observe(section);
      }
    });
  }

  function prepareDynamicContent(
    event
  ) {
    const section =
      event.target?.closest?.(
        SECTION_SELECTOR
      ) ||
      event.target?.querySelector?.(
        SECTION_SELECTOR
      );

    if (!section) {
      return;
    }

    const sections = Array.from(
      document.querySelectorAll(
        SECTION_SELECTOR
      )
    );

    prepareSection(
      section,
      sections.indexOf(section)
    );

    if (
      section.getBoundingClientRect()
        .top <
      window.innerHeight
    ) {
      revealSection(section);
    }
  }

  [
    "forma:new-arrivals-updated",
    "forma:recommendations-updated",
    "forma:daily-edit-updated",
    "forma:saved-updated"
  ].forEach(eventName => {
    window.addEventListener(
      eventName,
      prepareDynamicContent
    );
  });

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initDashboardPolish,
      {
        once: true
      }
    );
  } else {
    initDashboardPolish();
  }
})();