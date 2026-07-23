/* ==========================================================
   FORMA — DASHBOARD MANAGER
   Central lifecycle, states and section coordination
   ========================================================== */

(() => {
  const Forma = window.Forma || (window.Forma = {});

  if (Forma.dashboardManager) return;

  const EVENTS = {
    READY: "forma:dashboard-ready",
    SECTION_READY: "forma:dashboard-section-ready",
    REFRESH: "forma:dashboard-refresh"
  };

  let dashboard = null;
  let sections = [];
  let readySections = new Set();
  let isReady = false;

  function getSectionId(section, index) {
    return (
      section.dataset.formaSection ||
      section.id ||
      `dashboard-section-${index + 1}`
    );
  }

  function registerSections() {
    sections = Array.from(
      dashboard.querySelectorAll(".forma-dashboard-section")
    );

    sections.forEach((section, index) => {
      const id = getSectionId(section, index);

      section.dataset.formaSection = id;
      section.dataset.formaState = "loading";
      section.setAttribute("aria-busy", "true");
    });
  }

  function setSectionReady(sectionOrId) {
    const section =
      typeof sectionOrId === "string"
        ? sections.find(
            item => item.dataset.formaSection === sectionOrId
          )
        : sectionOrId;

    if (!section) return;

    const id = section.dataset.formaSection;

    section.dataset.formaState = "ready";
    section.setAttribute("aria-busy", "false");

    readySections.add(id);

    const sectionIndex = sections.indexOf(section);
    const delay = Math.max(sectionIndex, 0) * 90;

    window.setTimeout(() => {
    window.requestAnimationFrame(() => {
        section.classList.add("is-visible");
    });
    }, delay);

    window.dispatchEvent(
      new CustomEvent(EVENTS.SECTION_READY, {
        detail: {
          id,
          section
        }
      })
    );

    checkDashboardReady();
  }

  function setSectionError(sectionOrId) {
    const section =
      typeof sectionOrId === "string"
        ? sections.find(
            item => item.dataset.formaSection === sectionOrId
          )
        : sectionOrId;

    if (!section) return;

    section.dataset.formaState = "error";
    section.setAttribute("aria-busy", "false");

    readySections.add(section.dataset.formaSection);

    checkDashboardReady();
  }

  function checkDashboardReady() {
    if (isReady || readySections.size < sections.length) return;

    isReady = true;

    dashboard.dataset.formaDashboardState = "ready";
    dashboard.setAttribute("aria-busy", "false");

    window.dispatchEvent(
      new CustomEvent(EVENTS.READY, {
        detail: {
          dashboard,
          sections
        }
      })
    );
  }

  function refresh() {
    if (!dashboard) return;

    isReady = false;
    readySections.clear();

    dashboard.dataset.formaDashboardState = "loading";
    dashboard.setAttribute("aria-busy", "true");

    sections.forEach(section => {
      section.dataset.formaState = "loading";
      section.setAttribute("aria-busy", "true");
      section.classList.remove("is-visible");
    });

    window.dispatchEvent(
      new CustomEvent(EVENTS.REFRESH, {
        detail: {
          dashboard,
          sections
        }
      })
    );
  }

  function init() {
    dashboard = document.querySelector("[data-forma-dashboard]");

    if (!dashboard) return;

    dashboard.dataset.formaDashboardState = "loading";
    dashboard.setAttribute("aria-busy", "true");
    dashboard.classList.add("is-managed");

    registerSections();

    /*
     * Midlertidig fallback:
     * Sektionerne markeres som klar, efter den eksisterende
     * dashboard-kode har fået tid til at rendere.
     *
     * Senere kobler vi hvert modul direkte på manageren.
     */
    window.setTimeout(() => {
      sections.forEach(setSectionReady);
    }, 700);
  }

  Forma.dashboardManager = {
    init,
    refresh,
    setSectionReady,
    setSectionError,
    getSections: () => [...sections],
    isReady: () => isReady,
    events: { ...EVENTS }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }
})();