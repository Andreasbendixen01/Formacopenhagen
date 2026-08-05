/* ==========================================================
   FORMA — PASSPORT
   ========================================================== */

(function () {
  "use strict";

  const passport = document.querySelector(
    "[data-forma-passport]"
  );

  if (!passport) {
    return;
  }

  const nameElement = passport.querySelector(
    "[data-forma-passport-name]"
  );

  const cityElement = passport.querySelector(
    "[data-forma-passport-city]"
  );

  const statusElement = passport.querySelector(
    "[data-forma-passport-status]"
  );

  const brandsElement = passport.querySelector(
    "[data-forma-passport-brands]"
  );

  const savedElement = passport.querySelector(
    "[data-forma-passport-saved]"
  );

  const citiesElement = passport.querySelector(
    "[data-forma-passport-cities]"
  );

  function getProfile() {
    try {
      return (
        window.Forma
          ?.profile
          ?.get?.() || null
      );
    } catch (error) {
      console.warn(
        "[Forma Passport] Could not read profile.",
        error
      );

      return null;
    }
  }

  function getSavedCount() {
    try {
      if (
        typeof window.Forma
          ?.savedProducts
          ?.count === "function"
      ) {
        return Number(
          window.Forma.savedProducts.count()
        ) || 0;
      }

      const products =
        window.Forma
          ?.savedProducts
          ?.getAll?.() || [];

      return Array.isArray(products)
        ? products.length
        : 0;
    } catch (error) {
      return 0;
    }
  }

  function getFollowedBrandCount() {
    try {
      if (
        typeof window.Forma
          ?.followedBrands
          ?.count === "function"
      ) {
        return Number(
          window.Forma.followedBrands.count()
        ) || 0;
      }

      const brands =
        window.Forma
          ?.followedBrands
          ?.getAll?.() || [];

      return Array.isArray(brands)
        ? brands.length
        : 0;
    } catch (error) {
      return 0;
    }
  }

  function getFirstName(profile) {
    return String(
      profile?.identity?.firstName ||
      ""
    ).trim();
  }

  function getLastName(profile) {
    return String(
      profile?.identity?.lastName ||
      ""
    ).trim();
  }

  function getDisplayName(profile) {
    const firstName =
      getFirstName(profile);

    const lastName =
      getLastName(profile);

    const fullName =
      [firstName, lastName]
        .filter(Boolean)
        .join(" ");

    return (
      fullName ||
      nameElement?.textContent?.trim() ||
      "Forma Member"
    );
  }

  function getCity(profile) {
    return String(
      profile?.identity?.city ||
      ""
    ).trim();
  }

  function calculateStatus({
    savedCount,
    followedBrandCount,
    city
  }) {
    const activityTotal =
      savedCount +
      followedBrandCount;

    if (activityTotal >= 50) {
      return "Tastemaker";
    }

    if (activityTotal >= 25) {
      return "Curator";
    }

    if (activityTotal >= 10) {
      return "Collector";
    }

    if (
      activityTotal > 0 ||
      city
    ) {
      return "Explorer";
    }

    return "New Member";
  }

  function updateText(
    element,
    value
  ) {
    if (!element) {
      return;
    }

    element.textContent =
      String(value);
  }

  function render() {
    const profile =
      getProfile();

    const displayName =
      getDisplayName(profile);

    const city =
      getCity(profile);

    const savedCount =
      getSavedCount();

    const followedBrandCount =
      getFollowedBrandCount();

    const cityCount =
      city ? 1 : 0;

    const status =
      calculateStatus({
        savedCount,
        followedBrandCount,
        city
      });

  updateText(
  nameElement,
  displayName
);

updateText(
  cityElement,
  city || "Your city"
);

updateText(
  brandsElement,
  followedBrandCount
);

updateText(
  savedElement,
  savedCount
);

updateText(
  citiesElement,
  cityCount
);

updateText(
  statusElement,
  status
);

/* Passport Carry */

updateText(
  carryName,
  displayName
);

updateText(
  carryId,
  `FORMA — ${
    passport
      .querySelector(
        "[data-forma-passport-id]"
      )
      ?.textContent
      ?.trim() ||
    "000000"
  }`
);
}

  function subscribeToFormaEvent(
    eventName
  ) {
    window.Forma
      ?.events
      ?.on?.(
        eventName,
        render
      );
  }

  window.addEventListener(
    "forma:saved-updated",
    render
  );

  window.addEventListener(
    "forma:followed-brands-updated",
    render
  );

  window.addEventListener(
    "forma:profile-updated",
    render
  );

  window.addEventListener(
    "forma:onboarding-completed",
    render
  );

  subscribeToFormaEvent(
    "forma:saved-updated"
  );

  subscribeToFormaEvent(
    "forma:followed-brands-updated"
  );

  subscribeToFormaEvent(
    "forma:profile-updated"
  );

  subscribeToFormaEvent(
    "forma:onboarding-completed"
  );

    const carryPanel = passport.querySelector(
    "[data-forma-passport-carry]"
  );

  const carryToggle = passport.querySelector(
    "[data-forma-passport-carry-toggle]"
  );

  const carryCloseButtons =
    passport.querySelectorAll(
      "[data-forma-passport-carry-close]"
    );

  const carryName = passport.querySelector(
    "[data-forma-passport-carry-name]"
  );

  const carryId = passport.querySelector(
    "[data-forma-passport-carry-id]"
  );

  if (carryPanel) {
  document.body.appendChild(
    carryPanel
  );
}

  function openCarryPanel() {
  if (!carryPanel) {
    return;
  }

  carryPanel.hidden = false;

  carryPanel.setAttribute(
    "aria-hidden",
    "false"
  );

  document.documentElement.classList.add(
    "forma-passport-carry-is-open"
  );

  carryToggle?.setAttribute(
    "aria-expanded",
    "true"
  );

  requestAnimationFrame(() => {
    carryPanel.classList.add(
      "is-visible"
    );
  });
}

  function closeCarryPanel() {
  if (!carryPanel) {
    return;
  }

  carryPanel.classList.remove(
    "is-visible"
  );

  document.documentElement.classList.remove(
    "forma-passport-carry-is-open"
  );

  carryToggle?.setAttribute(
    "aria-expanded",
    "false"
  );

  carryPanel.setAttribute(
    "aria-hidden",
    "true"
  );

  window.setTimeout(() => {
    carryPanel.hidden = true;
  }, 400);
}

  const passportUrlParams =
    new URLSearchParams(
      window.location.search
    );

  const shouldOpenCarryPanel =
    passportUrlParams.get("open") ===
    "passport-carry";

  if (shouldOpenCarryPanel) {
    openCarryPanel();

    passportUrlParams.delete("open");

    const cleanQuery =
      passportUrlParams.toString();

    const cleanUrl =
      `${window.location.pathname}${
        cleanQuery
          ? `?${cleanQuery}`
          : ""
      }${window.location.hash}`;

    window.history.replaceState(
      {},
      "",
      cleanUrl
    );
  }

  carryToggle?.addEventListener(
    "click",
    openCarryPanel
  );

  carryCloseButtons.forEach(button => {
    button.addEventListener(
      "click",
      closeCarryPanel
    );
  });

  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Escape" &&
        carryPanel &&
        !carryPanel.hidden
      ) {
        closeCarryPanel();
      }
    }
  );

  render();

  console.info(
    "[Forma Passport] Ready"
  );
})();