/* ==========================================================
   FORMA — PASSPORT BENEFITS UI
   ========================================================== */

(function () {
  "use strict";

  const section = document.querySelector(
    "[data-forma-passport-benefits]"
  );

  if (!section) {
    return;
  }

  const grid = section.querySelector(
    "[data-passport-benefits-grid]"
  );

  const emptyState = section.querySelector(
    "[data-passport-benefits-empty]"
  );

  const totalElement = section.querySelector(
    "[data-passport-benefits-total]"
  );

  const drawer = section.querySelector(
    "[data-benefit-drawer]"
  );

  const closeButtons = [
    ...section.querySelectorAll(
      "[data-benefit-drawer-close]"
    )
  ];

  const drawerBrand = section.querySelector(
    "[data-benefit-drawer-brand]"
  );

  const drawerTitle = section.querySelector(
    "[data-benefit-drawer-title]"
  );

  const drawerStatus = section.querySelector(
    "[data-benefit-drawer-status]"
  );

  const drawerCity = section.querySelector(
    "[data-benefit-drawer-city]"
  );

  const drawerDescription = section.querySelector(
    "[data-benefit-drawer-description]"
  );

  const drawerValidity = section.querySelector(
    "[data-benefit-drawer-validity]"
  );

  const drawerLocation = section.querySelector(
    "[data-benefit-drawer-location]"
  );

  const drawerLevel = section.querySelector(
    "[data-benefit-drawer-level]"
  );

  const drawerUseButton = section.querySelector(
    "[data-benefit-drawer-use]"
  );

  const drawerActionLabel = section.querySelector(
    "[data-benefit-drawer-action-label]"
  );

  const benefits = [
    {
      id: "preview-coffee-01",
      featured: true,
      brand: "Forma Partner 01",
      title: "10% on your visit",
      city: "Copenhagen",
      status: "available",
      description:
        "A preview of a future member benefit available when visiting a participating Forma partner.",
      validity: "Preview only",
      location: "Selected Copenhagen location",
      level: "Explorer",
      actionLabel: "Use benefit"
    },
    {
      id: "preview-access-02",
      brand: "Forma Partner 02",
      title: "Early access to selected releases",
      city: "Copenhagen",
      status: "locked",
      description:
        "A preview of a benefit that can be unlocked through membership activity or a future Passport level.",
      validity: "Preview only",
      location: "Online and selected locations",
      level: "Collector",
      actionLabel: "Locked benefit"
    },
    {
      id: "preview-experience-03",
      brand: "Forma Partner 03",
      title: "A complimentary member experience",
      city: "Copenhagen",
      status: "redeemed",
      description:
        "A preview showing how a successfully redeemed Passport experience will appear inside Your Forma.",
      validity: "Preview only",
      location: "Selected Copenhagen location",
      level: "Explorer",
      actionLabel: "Already redeemed"
    }
  ];

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatStatus(status) {
    const labels = {
      available: "Available",
      locked: "Locked",
      redeemed: "Redeemed",
      upcoming: "Upcoming",
      expired: "Expired"
    };

    return labels[status] || "Available";
  }

  function createBenefitCard(
  benefit,
  index
) {
  const statusLabel =
    formatStatus(benefit.status);

  const featuredClass =
    benefit.featured
      ? "forma-benefit-card--featured"
      : "";

  const featuredLabel =
    benefit.featured
      ? "Featured benefit"
      : "Preview";

  return `
    <article
      class="
        forma-benefit-card
        forma-benefit-card--${escapeHtml(
          benefit.status
        )}
        ${featuredClass}
      "
      data-benefit-id="${escapeHtml(
        benefit.id
      )}"
    >
      <div class="forma-benefit-card__top">
        <p class="forma-benefit-card__number">
          ${String(index + 1).padStart(2, "0")}
        </p>

        <p class="forma-benefit-card__preview">
          ${featuredLabel}
        </p>
      </div>

      <div class="forma-benefit-card__main">
        <p class="forma-benefit-card__brand">
          ${escapeHtml(benefit.brand)}
        </p>

        <h3 class="forma-benefit-card__title">
          ${escapeHtml(benefit.title)}
        </h3>

        <p class="forma-benefit-card__city">
          ${escapeHtml(benefit.city)}
        </p>
      </div>

      <div class="forma-benefit-card__bottom">
        <p class="forma-benefit-card__status">
          ${escapeHtml(statusLabel)}
        </p>

        <button
          class="forma-benefit-card__button"
          type="button"
          data-benefit-open
        >
          <span>View benefit</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  `;
  }

  function render() {
    if (!grid || !emptyState) {
      return;
    }

    if (!benefits.length) {
      grid.hidden = true;
      emptyState.hidden = false;

      if (totalElement) {
        totalElement.textContent =
          "0 available";
      }

      return;
    }

    grid.innerHTML = benefits
      .map(createBenefitCard)
      .join("");

    grid.hidden = false;
    emptyState.hidden = true;

    const availableCount =
      benefits.filter(
        benefit =>
          benefit.status === "available"
      ).length;

    if (totalElement) {
      totalElement.textContent =
        `${availableCount} ${
          availableCount === 1
            ? "available"
            : "available"
        }`;
    }
  }

  function updateText(
    element,
    value
  ) {
    if (!element) {
      return;
    }

    element.textContent =
      String(value || "");
  }

  function openDrawer(benefit) {
    if (!drawer || !benefit) {
      return;
    }

    updateText(
      drawerBrand,
      benefit.brand
    );

    updateText(
      drawerTitle,
      benefit.title
    );

    updateText(
      drawerStatus,
      formatStatus(benefit.status)
    );

    updateText(
      drawerCity,
      benefit.city
    );

    updateText(
      drawerDescription,
      benefit.description
    );

    updateText(
      drawerValidity,
      benefit.validity
    );

    updateText(
      drawerLocation,
      benefit.location
    );

    updateText(
      drawerLevel,
      benefit.level
    );

    updateText(
      drawerActionLabel,
      benefit.actionLabel
    );

    if (drawerUseButton) {
      drawerUseButton.disabled =
        benefit.status !== "available";
    }

    drawer.hidden = false;

    drawer.setAttribute(
      "aria-hidden",
      "false"
    );

    document.documentElement.classList.add(
      "forma-benefit-drawer-is-open"
    );

    requestAnimationFrame(() => {
      drawer.classList.add(
        "is-visible"
      );
    });
  }

  function closeDrawer() {
    if (!drawer) {
      return;
    }

    drawer.classList.remove(
      "is-visible"
    );

    drawer.setAttribute(
      "aria-hidden",
      "true"
    );

    document.documentElement.classList.remove(
      "forma-benefit-drawer-is-open"
    );

    window.setTimeout(() => {
      drawer.hidden = true;
    }, 400);
  }

  grid?.addEventListener(
    "click",
    event => {
      const button = event.target.closest(
        "[data-benefit-open]"
      );

      if (!button) {
        return;
      }

      const card = button.closest(
        "[data-benefit-id]"
      );

      if (!card) {
        return;
      }

      const benefit = benefits.find(
        item =>
          item.id ===
          card.dataset.benefitId
      );

      openDrawer(benefit);
    }
  );

  closeButtons.forEach(button => {
    button.addEventListener(
      "click",
      closeDrawer
    );
  });

  drawerUseButton?.addEventListener(
    "click",
    () => {
      window.Forma
        ?.toast
        ?.info?.(
          "Benefit redemption will be activated with the partner integration"
        );
    }
  );

  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Escape" &&
        drawer &&
        !drawer.hidden
      ) {
        closeDrawer();
      }
    }
  );

  /*
   * Move the drawer directly under body so it always
   * uses the full browser viewport.
   */

  if (drawer) {
    document.body.appendChild(drawer);
  }

  render();

  console.info(
    "[Forma Passport Benefits] Ready"
  );
})();