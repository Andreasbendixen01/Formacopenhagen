/* ==========================================================
   FORMA — DASHBOARD NAVIGATION
   ========================================================== */

(function () {
  "use strict";

  const dashboard = document.querySelector(
    "[data-forma-dashboard]"
  );

  if (!dashboard) {
    return;
  }

  const dock = document.querySelector(
    "[data-forma-dashboard-dock]"
  );

  const navigationButtons = [
    ...document.querySelectorAll(
      "[data-forma-navigate]"
    )
  ];

  const dockItems = [
    ...document.querySelectorAll(
      "[data-forma-dock-item]"
    )
  ];

  /*
   * The selectors below connect navigation labels
   * to sections that already exist inside Your Forma.
   */

  const destinationSelectors = {
    passport:
      "[data-forma-passport]",

    benefits:
      "#FormaPassportBenefits",

    following:
      "[data-forma-following-section]",

    collections:
      "#FormaWishCollections",

    discover:
      [
        "[data-forma-daily-edit]",
        "[data-forma-recommended]",
        "[data-forma-continue]"
      ].join(",")
  };

  const destinations = {};

  Object.entries(
    destinationSelectors
  ).forEach(
    ([name, selector]) => {
      const element =
        document.querySelector(selector);

      if (!element) {
        return;
      }

      destinations[name] =
        element;

      element.dataset
        .formaNavigationTarget =
        name;
    }
  );

  const hero =
    document.querySelector(
      "[data-forma-dashboard-hero]"
    ) ||
    document.querySelector(
      ".forma-dashboard__hero"
    ) ||
    document.querySelector(
      ".forma-dashboard__title"
    )?.closest("section");

  let highlightTimer = null;

  function setDockVisibility(
    visible
  ) {
    if (!dock) {
      return;
    }

    dock.classList.toggle(
      "is-visible",
      visible
    );

    dock.setAttribute(
      "aria-hidden",
      String(!visible)
    );
  }

  function setActiveDestination(
    name
  ) {
    dockItems.forEach(item => {
      const active =
        item.dataset.formaDockItem ===
        name;

      item.classList.toggle(
        "is-active",
        active
      );

      if (active) {
        item.setAttribute(
          "aria-current",
          "location"
        );
      } else {
        item.removeAttribute(
          "aria-current"
        );
      }
    });
  }

  function highlightDestination(
    element
  ) {
    if (!element) {
      return;
    }

    document
      .querySelectorAll(
        ".is-forma-navigation-highlight"
      )
      .forEach(item => {
        item.classList.remove(
          "is-forma-navigation-highlight"
        );
      });

    element.classList.remove(
      "is-forma-navigation-highlight"
    );

    void element.offsetWidth;

    element.classList.add(
      "is-forma-navigation-highlight"
    );

    window.clearTimeout(
      highlightTimer
    );

    highlightTimer =
      window.setTimeout(() => {
        element.classList.remove(
          "is-forma-navigation-highlight"
        );
      }, 900);
  }

  function navigateTo(
    name
  ) {
    const destination =
      destinations[name];

    if (!destination) {
      console.warn(
        `[Forma Navigation] Destination not found: ${name}`
      );

      return;
    }

    destination.scrollIntoView({
      behavior:
        window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches
          ? "auto"
          : "smooth",

      block: "start"
    });

    setActiveDestination(name);

    window.setTimeout(() => {
      highlightDestination(
        destination
      );
    }, 460);
  }

  navigationButtons.forEach(button => {
    button.addEventListener(
      "click",
      () => {
        navigateTo(
          button.dataset
            .formaNavigate
        );
      }
    );
  });

  /*
   * Show the dock after the Hero
   * has mostly left the viewport.
   */

  if (hero && dock) {
    const heroObserver =
      new IntersectionObserver(
        entries => {
          const entry =
            entries[0];

          setDockVisibility(
            !entry.isIntersecting
          );
        },
        {
          threshold: 0.12
        }
      );

    heroObserver.observe(hero);
  } else {
    /*
     * Fallback if the Hero selector changes.
     */

    const handleScroll = () => {
      setDockVisibility(
        window.scrollY > 420
      );
    };

    window.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true
      }
    );

    handleScroll();
  }

  /*
   * Update active Dock item while scrolling.
   */

  const visibleSections =
    new Map();

  const sectionObserver =
    new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const name =
            entry.target.dataset
              .formaNavigationTarget;

          if (!name) {
            return;
          }

          if (entry.isIntersecting) {
            visibleSections.set(
              name,
              entry.intersectionRatio
            );
          } else {
            visibleSections.delete(
              name
            );
          }
        });

        const mostVisible =
          [...visibleSections.entries()]
            .sort(
              (a, b) =>
                b[1] - a[1]
            )[0];

        if (mostVisible) {
          setActiveDestination(
            mostVisible[0]
          );
        }
      },
      {
        rootMargin:
          "-22% 0px -48% 0px",

        threshold: [
          0.05,
          0.15,
          0.3,
          0.5,
          0.75
        ]
      }
    );

  Object.values(
    destinations
  ).forEach(destination => {
    sectionObserver.observe(
      destination
    );
  });

  console.info(
    "[Forma Dashboard Navigation] Ready"
  );
})();