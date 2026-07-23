/* ==========================================================
   FORMA — YOUR FORMA DASHBOARD
   ========================================================== */

(function () {
  "use strict";

  const dashboard = document.querySelector(
    "[data-forma-dashboard]"
  );

  if (!dashboard) {
    return;
  }

  if (!window.Forma?.profile) {
    console.error(
      "[Forma Dashboard] Forma Profile must load first."
    );

    return;
  }

  /* ========================================================
     DOM ELEMENTS
     ======================================================== */

  const profileName = dashboard.querySelector(
    "[data-forma-profile-name]"
  );

  const profileStatus = dashboard.querySelector(
    "[data-forma-profile-status]"
  );

  const followingCount = dashboard.querySelector(
    "[data-forma-following-count]"
  );

  const savedCount = dashboard.querySelector(
    "[data-forma-saved-count]"
  );

  const recentCount = dashboard.querySelector(
    "[data-forma-recent-count]"
  );

  const editProfileButton = dashboard.querySelector(
    "[data-forma-edit-profile]"
  );

  /* ========================================================
     PROFILE
     ======================================================== */

  function hasValue(value) {
    return String(value || "").trim().length > 0;
  }

  function calculateProfileCompletion(profile) {
    const identity =
      profile?.identity || {};

    const preferences =
      profile?.preferences || {};

    const sizes =
      preferences.sizes || {};

    const checks = [
      hasValue(identity.firstName),
      hasValue(identity.city),

      Array.isArray(preferences.categories) &&
        preferences.categories.length > 0,

      Array.isArray(preferences.styles) &&
        preferences.styles.length > 0,

      hasValue(sizes.tops),
      hasValue(sizes.bottoms),
      hasValue(sizes.shoes)
    ];

    const completed =
      checks.filter(Boolean).length;

    return Math.round(
      (completed / checks.length) * 100
    );
  }

  function renderProfile(profile) {
    const firstName = String(
      profile?.identity?.firstName || ""
    ).trim();

    if (profileName) {
      profileName.textContent =
        firstName
          ? `, ${firstName}`
          : "";
    }

    if (profileStatus) {
      const completion =
        calculateProfileCompletion(profile);

      profileStatus.textContent =
        `${completion}%`;
    }
  }

  /* ========================================================
     DASHBOARD STATS
     ======================================================== */

  function getFollowingCount() {
    try {
      return (
        window.Forma.followedBrands?.count?.() ||
        0
      );
    } catch (error) {
      console.warn(
        "[Forma Dashboard] Could not read followed brands.",
        error
      );

      return 0;
    }
  }

  function getSavedCount() {
    try {
      return (
        window.Forma.savedProducts?.count?.() ||
        0
      );
    } catch (error) {
      console.warn(
        "[Forma Dashboard] Could not read saved products.",
        error
      );

      return 0;
    }
  }

  function getRecentlyViewedCount() {
    try {
      return (
        window.Forma.recentlyViewed?.count?.() ||
        0
      );
    } catch (error) {
      console.warn(
        "[Forma Dashboard] Could not read recently viewed products.",
        error
      );

      return 0;
    }
  }

  function renderStats() {
    if (followingCount) {
      followingCount.textContent =
        String(getFollowingCount());
    }

    if (savedCount) {
      savedCount.textContent =
        String(getSavedCount());
    }

    if (recentCount) {
      recentCount.textContent =
        String(getRecentlyViewedCount());
    }
  }

  /* ========================================================
     PROFILE EDITOR
     ======================================================== */

  function openProfileEditor() {
    window.Forma.events.emit(
      "forma:onboarding-open"
    );
  }

  editProfileButton?.addEventListener(
    "click",
    openProfileEditor
  );

  /* ========================================================
     PROFILE EVENTS
     ======================================================== */

  window.Forma.events.on(
    "forma:profile-updated",
    event => {
      const profile =
        event?.detail?.profile ||
        window.Forma.profile.get();

      renderProfile(profile);
    }
  );

  window.Forma.events.on(
    "forma:profile-reset",
    event => {
      const profile =
        event?.detail?.profile ||
        window.Forma.profile.get();

      renderProfile(profile);
    }
  );

  window.Forma.events.on(
    "forma:onboarding-completed",
    event => {
      const profile =
        event?.detail?.profile ||
        window.Forma.profile.get();

      renderProfile(profile);
    }
  );

  /* ========================================================
     STAT EVENTS
     ======================================================== */

  window.addEventListener(
    "forma:saved-updated",
    renderStats
  );

  window.addEventListener(
    "forma:followed-brands-updated",
    renderStats
  );

  window.addEventListener(
    "forma:recently-viewed-updated",
    renderStats
  );

  window.addEventListener(
    "forma:activity-updated",
    renderStats
  );

  /* ========================================================
     INITIAL RENDER
     ======================================================== */

  renderProfile(
    window.Forma.profile.get()
  );

  renderStats();
})();