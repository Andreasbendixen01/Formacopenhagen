/* ==========================================================
   FORMA — MEMBERSHIP CENTER
   ========================================================== */

(function () {
  "use strict";

  const center = document.querySelector(
    "[data-forma-membership-center]"
  );

  if (!center) {
    return;
  }

  const tabs = [
    ...center.querySelectorAll(
      "[data-membership-tab]"
    )
  ];

  const panels = [
    ...center.querySelectorAll(
      "[data-membership-panel]"
    )
  ];

  function activateTab(tabName) {
    tabs.forEach(tab => {
      const active =
        tab.dataset.membershipTab === tabName;

      tab.classList.toggle(
        "is-active",
        active
      );

      tab.setAttribute(
        "aria-selected",
        String(active)
      );
    });

    panels.forEach(panel => {
      const active =
        panel.dataset.membershipPanel === tabName;

      panel.hidden = !active;
      panel.classList.toggle(
        "is-active",
        active
      );
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener(
      "click",
      () => {
        activateTab(
          tab.dataset.membershipTab
        );
      }
    );
  });
})();