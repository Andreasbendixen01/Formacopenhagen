/* ==========================================================
   FORMA — MEMBER PAGE TRANSITIONS
   ========================================================== */

(function () {
  "use strict";

  const reducedMotion =
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

  const main =
    document.querySelector(
      "[data-forma-dashboard]"
    );

  if (!main) {
    return;
  }

  const links = [
    ...document.querySelectorAll(
      "[data-forma-page-link]"
    )
  ];

  /*
   * Entry animation
   */

  if (!reducedMotion) {
    main.classList.add(
      "forma-page-enter"
    );

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        main.classList.add(
          "forma-page-enter-active"
        );
      });
    });
  }

  /*
   * Navigate between member pages
   */

  links.forEach(link => {
    link.addEventListener(
      "click",
      event => {
        const destination =
          link.href;

        if (
          !destination ||
          reducedMotion ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }

        event.preventDefault();

        const isBack =
          link.dataset.formaDirection ===
          "back";

        main.classList.add(
          isBack
            ? "forma-page-leave-back"
            : "forma-page-leave"
        );

        window.setTimeout(() => {
          window.location.href =
            destination;
        }, 320);
      }
    );
  });

  console.info(
    "[Forma Page Transitions] Ready"
  );
})();