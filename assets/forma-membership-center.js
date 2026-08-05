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

  /* ========================================================
     PROFILE
     ======================================================== */

  const profileForm = center.querySelector(
    "[data-membership-profile-form]"
  );

  const profileFields = [
    ...center.querySelectorAll(
      "[data-membership-profile-field]"
    )
  ];

  const profileStatus = center.querySelector(
    "[data-membership-profile-status]"
  );

  const profileSaveButton = center.querySelector(
    "[data-membership-profile-save]"
  );

  /* ========================================================
     PREFERENCES
     ======================================================== */

  const preferencesForm = center.querySelector(
    "[data-membership-preferences-form]"
  );

  const preferenceGroups = [
    ...center.querySelectorAll(
      "[data-membership-preference-group]"
    )
  ];

  const preferencesStatus = center.querySelector(
    "[data-membership-preferences-status]"
  );

  const preferencesSaveButton = center.querySelector(
    "[data-membership-preferences-save]"
  );

  let preferenceDraft = {
    categories: [],
    styles: []
  };

    /* ========================================================
     SIZES
     ======================================================== */

  const sizesForm = center.querySelector(
    "[data-membership-sizes-form]"
  );

  const sizeFields = [
    ...center.querySelectorAll(
      "[data-membership-size-field]"
    )
  ];

  const sizesStatus = center.querySelector(
    "[data-membership-sizes-status]"
  );

  const sizesSaveButton = center.querySelector(
    "[data-membership-sizes-save]"
  );

    /* ========================================================
     PASSPORT
     ======================================================== */

  const membershipPassport = center.querySelector(
    "[data-membership-passport]"
  );

  const membershipPassportName = center.querySelector(
    "[data-membership-passport-name]"
  );

  const membershipPassportCity = center.querySelector(
    "[data-membership-passport-city]"
  );

  const membershipPassportCityDetail =
    center.querySelector(
      "[data-membership-passport-city-detail]"
    );

  const membershipPassportStatus =
    center.querySelector(
      "[data-membership-passport-status]"
    );

  const membershipPassportSaved =
    center.querySelector(
      "[data-membership-passport-saved]"
    );

  const membershipPassportBrands =
    center.querySelector(
      "[data-membership-passport-brands]"
    );

      /* ========================================================
     NOTIFICATIONS
     ======================================================== */

  const NOTIFICATIONS_STORAGE_KEY =
    "forma_notification_preferences";

  const notificationsForm = center.querySelector(
    "[data-membership-notifications-form]"
  );

  const notificationFields = [
    ...center.querySelectorAll(
      "[data-membership-notification-field]"
    )
  ];

  const notificationsStatus = center.querySelector(
    "[data-membership-notifications-status]"
  );

  const notificationsSaveButton =
    center.querySelector(
      "[data-membership-notifications-save]"
    );


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

  function getProfile() {
    try {
      return (
        window.Forma
          ?.profile
          ?.get?.() || null
      );
    } catch (error) {
      console.warn(
        "[Forma Membership] Could not read profile.",
        error
      );

      return null;
    }
  }

  function emitProfileUpdated(
    profile,
    source
  ) {
    window.Forma
      ?.events
      ?.emit?.(
        "forma:profile-updated",
        {
          profile,
          source
        }
      );

    window.dispatchEvent(
      new CustomEvent(
        "forma:profile-updated",
        {
          detail: {
            profile,
            source
          }
        }
      )
    );
  }

  /* ========================================================
     PROFILE
     ======================================================== */

  function hydrateProfile() {
    const profile = getProfile();

    if (!profile) {
      return;
    }

    profileFields.forEach(field => {
      const key = field.name;

      field.value =
        profile.identity?.[key] || "";
    });
  }

  function setProfileStatus(
    message,
    type = ""
  ) {
    if (!profileStatus) {
      return;
    }

    profileStatus.textContent = message;

    profileStatus.classList.toggle(
      "is-success",
      type === "success"
    );

    profileStatus.classList.toggle(
      "is-error",
      type === "error"
    );
  }

  function saveProfile(event) {
    event.preventDefault();

    if (
      !window.Forma
        ?.profile
        ?.updateIdentity
    ) {
      setProfileStatus(
        "Your profile could not be updated.",
        "error"
      );

      return;
    }

    const changes = {};

    profileFields.forEach(field => {
      changes[field.name] =
        field.value.trim();
    });

    try {
      profileSaveButton?.setAttribute(
        "disabled",
        ""
      );

      setProfileStatus(
        "Saving your changes..."
      );

      const profile =
        window.Forma.profile.updateIdentity(
          changes
        );

      setProfileStatus(
        "Your membership profile has been updated.",
        "success"
      );

      emitProfileUpdated(
        profile,
        "membership-center-profile"
      );

      window.Forma
        ?.toast
        ?.success?.(
          "Profile updated"
        );
    } catch (error) {
      console.error(
        "[Forma Membership] Could not save profile.",
        error
      );

      setProfileStatus(
        "Something went wrong. Please try again.",
        "error"
      );
    } finally {
      profileSaveButton?.removeAttribute(
        "disabled"
      );
    }
  }

  /* ========================================================
     PREFERENCES
     ======================================================== */

  function normalizePreferenceValues(
    values
  ) {
    if (!Array.isArray(values)) {
      return [];
    }

    return values
      .map(value =>
        String(value || "")
          .trim()
          .toLowerCase()
      )
      .filter(Boolean);
  }

  function hydratePreferences() {
    const profile = getProfile();

    preferenceDraft = {
      categories:
        normalizePreferenceValues(
          profile
            ?.preferences
            ?.categories
        ),

      styles:
        normalizePreferenceValues(
          profile
            ?.preferences
            ?.styles
        )
    };

    preferenceGroups.forEach(group => {
      const preferenceName =
        group.dataset
          .membershipPreferenceGroup;

      const selected =
        preferenceDraft[
          preferenceName
        ] || [];

      group
        .querySelectorAll(
          "[data-membership-preference-value]"
        )
        .forEach(button => {
          const value =
            String(
              button.dataset
                .membershipPreferenceValue ||
              ""
            )
              .trim()
              .toLowerCase();

          const active =
            selected.includes(value);

          button.classList.toggle(
            "is-selected",
            active
          );

          button.setAttribute(
            "aria-pressed",
            String(active)
          );
        });
    });
  }

  function setPreferencesStatus(
    message,
    type = ""
  ) {
    if (!preferencesStatus) {
      return;
    }

    preferencesStatus.textContent =
      message;

    preferencesStatus.classList.toggle(
      "is-success",
      type === "success"
    );

    preferencesStatus.classList.toggle(
      "is-error",
      type === "error"
    );
  }

  function handlePreferenceClick(event) {
    const button = event.target.closest(
      "[data-membership-preference-value]"
    );

    if (!button) {
      return;
    }

    const group = button.closest(
      "[data-membership-preference-group]"
    );

    if (!group) {
      return;
    }

    const preferenceName =
      group.dataset
        .membershipPreferenceGroup;

    const value =
      String(
        button.dataset
          .membershipPreferenceValue ||
        ""
      )
        .trim()
        .toLowerCase();

    if (
      !preferenceName ||
      !value
    ) {
      return;
    }

    const currentValues =
      preferenceDraft[
        preferenceName
      ] || [];

    const selected =
      currentValues.includes(value);

    preferenceDraft[
      preferenceName
    ] = selected
      ? currentValues.filter(
          item => item !== value
        )
      : [
          ...currentValues,
          value
        ];

    button.classList.toggle(
      "is-selected",
      !selected
    );

    button.setAttribute(
      "aria-pressed",
      String(!selected)
    );

    setPreferencesStatus(
      "You have unsaved changes."
    );
  }

  function savePreferenceGroup(
    preferenceName,
    selectedValues
  ) {
    const profile = getProfile();

    const currentValues =
      normalizePreferenceValues(
        profile
          ?.preferences
          ?.[preferenceName]
      );

    const valuesToRemove =
      currentValues.filter(
        value =>
          !selectedValues.includes(
            value
          )
      );

    const valuesToAdd =
      selectedValues.filter(
        value =>
          !currentValues.includes(
            value
          )
      );

    valuesToRemove.forEach(value => {
      window.Forma.profile
        .togglePreference(
          preferenceName,
          value
        );
    });

    valuesToAdd.forEach(value => {
      window.Forma.profile
        .togglePreference(
          preferenceName,
          value
        );
    });
  }

  function savePreferences(event) {
    event.preventDefault();

    if (
      !window.Forma
        ?.profile
        ?.togglePreference
    ) {
      setPreferencesStatus(
        "Your preferences could not be updated.",
        "error"
      );

      return;
    }

    try {
      preferencesSaveButton
        ?.setAttribute(
          "disabled",
          ""
        );

      setPreferencesStatus(
        "Saving your preferences..."
      );

      savePreferenceGroup(
        "categories",
        preferenceDraft.categories
      );

      savePreferenceGroup(
        "styles",
        preferenceDraft.styles
      );

      const profile = getProfile();

      setPreferencesStatus(
        "Your preferences have been updated.",
        "success"
      );

      emitProfileUpdated(
        profile,
        "membership-center-preferences"
      );

      window.Forma
        ?.toast
        ?.success?.(
          "Preferences updated"
        );

      hydratePreferences();
    } catch (error) {
      console.error(
        "[Forma Membership] Could not save preferences.",
        error
      );

      setPreferencesStatus(
        "Something went wrong. Please try again.",
        "error"
      );
    } finally {
      preferencesSaveButton
        ?.removeAttribute(
          "disabled"
        );
    }
  }

    /* ========================================================
     SIZES
     ======================================================== */

  function hydrateSizes() {
    const profile = getProfile();

    const sizes =
      profile
        ?.preferences
        ?.sizes || {};

    sizeFields.forEach(field => {
      field.value =
        String(
          sizes[field.name] || ""
        );
    });
  }

  function setSizesStatus(
    message,
    type = ""
  ) {
    if (!sizesStatus) {
      return;
    }

    sizesStatus.textContent =
      message;

    sizesStatus.classList.toggle(
      "is-success",
      type === "success"
    );

    sizesStatus.classList.toggle(
      "is-error",
      type === "error"
    );
  }

  function handleSizeChange() {
    setSizesStatus(
      "You have unsaved changes."
    );
  }

  function saveSizes(event) {
    event.preventDefault();

    if (
      !window.Forma
        ?.profile
        ?.setSize
    ) {
      setSizesStatus(
        "Your sizes could not be updated.",
        "error"
      );

      return;
    }

    try {
      sizesSaveButton?.setAttribute(
        "disabled",
        ""
      );

      setSizesStatus(
        "Saving your sizes..."
      );

      sizeFields.forEach(field => {
        window.Forma.profile.setSize(
          field.name,
          field.value
        );
      });

      const profile = getProfile();

      setSizesStatus(
        "Your preferred sizes have been updated.",
        "success"
      );

      emitProfileUpdated(
        profile,
        "membership-center-sizes"
      );

      window.Forma
        ?.toast
        ?.success?.(
          "Sizes updated"
        );

      hydrateSizes();
    } catch (error) {
      console.error(
        "[Forma Membership] Could not save sizes.",
        error
      );

      setSizesStatus(
        "Something went wrong. Please try again.",
        "error"
      );
    } finally {
      sizesSaveButton?.removeAttribute(
        "disabled"
      );
    }
  }

    /* ========================================================
     PASSPORT
     ======================================================== */

  function getSavedProductCount() {
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

  function calculatePassportStatus(
    savedCount,
    followedBrandCount,
    city
  ) {
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

  function updateMembershipText(
    element,
    value
  ) {
    if (!element) {
      return;
    }

    element.textContent =
      String(value);
  }

  function hydrateMembershipPassport() {
    if (!membershipPassport) {
      return;
    }

    const profile = getProfile();

    const firstName =
      String(
        profile?.identity?.firstName ||
        ""
      ).trim();

    const lastName =
      String(
        profile?.identity?.lastName ||
        ""
      ).trim();

    const displayName =
      [firstName, lastName]
        .filter(Boolean)
        .join(" ") ||
      "Forma Member";

    const city =
      String(
        profile?.identity?.city ||
        ""
      ).trim();

    const savedCount =
      getSavedProductCount();

    const followedBrandCount =
      getFollowedBrandCount();

    const status =
      calculatePassportStatus(
        savedCount,
        followedBrandCount,
        city
      );

    updateMembershipText(
      membershipPassportName,
      displayName
    );

    updateMembershipText(
      membershipPassportCity,
      city || "Your city"
    );

    updateMembershipText(
      membershipPassportCityDetail,
      city || "Not selected"
    );

    updateMembershipText(
      membershipPassportStatus,
      status
    );

    updateMembershipText(
      membershipPassportSaved,
      savedCount
    );

    updateMembershipText(
      membershipPassportBrands,
      followedBrandCount
    );
  }

    /* ========================================================
     NOTIFICATIONS
     ======================================================== */

  function getDefaultNotifications() {
    return {
      earlyAccess: true,
      partnerBenefits: true,
      events: true,
      newBrands: true,
      journal: false,
      recommendations: true
    };
  }

  function getNotificationPreferences() {
    try {
      const storedValue =
        window.localStorage.getItem(
          NOTIFICATIONS_STORAGE_KEY
        );

      if (!storedValue) {
        return getDefaultNotifications();
      }

      const parsedValue =
        JSON.parse(storedValue);

      return {
        ...getDefaultNotifications(),
        ...parsedValue
      };
    } catch (error) {
      console.warn(
        "[Forma Membership] Could not read notification preferences.",
        error
      );

      return getDefaultNotifications();
    }
  }

  function hydrateNotifications() {
    const preferences =
      getNotificationPreferences();

    notificationFields.forEach(field => {
      field.checked =
        Boolean(
          preferences[field.name]
        );
    });
  }

  function setNotificationsStatus(
    message,
    type = ""
  ) {
    if (!notificationsStatus) {
      return;
    }

    notificationsStatus.textContent =
      message;

    notificationsStatus.classList.toggle(
      "is-success",
      type === "success"
    );

    notificationsStatus.classList.toggle(
      "is-error",
      type === "error"
    );
  }

  function handleNotificationChange() {
    setNotificationsStatus(
      "You have unsaved changes."
    );
  }

  function saveNotifications(event) {
    event.preventDefault();

    const preferences = {};

    notificationFields.forEach(field => {
      preferences[field.name] =
        Boolean(field.checked);
    });

    try {
      notificationsSaveButton
        ?.setAttribute(
          "disabled",
          ""
        );

      setNotificationsStatus(
        "Saving your notification preferences..."
      );

      window.localStorage.setItem(
        NOTIFICATIONS_STORAGE_KEY,
        JSON.stringify(preferences)
      );

      setNotificationsStatus(
        "Your notification preferences have been updated.",
        "success"
      );

      window.Forma
        ?.events
        ?.emit?.(
          "forma:notifications-updated",
          {
            preferences,
            source: "membership-center"
          }
        );

      window.dispatchEvent(
        new CustomEvent(
          "forma:notifications-updated",
          {
            detail: {
              preferences,
              source: "membership-center"
            }
          }
        )
      );

      window.Forma
        ?.toast
        ?.success?.(
          "Notifications updated"
        );
    } catch (error) {
      console.error(
        "[Forma Membership] Could not save notifications.",
        error
      );

      setNotificationsStatus(
        "Something went wrong. Please try again.",
        "error"
      );
    } finally {
      notificationsSaveButton
        ?.removeAttribute(
          "disabled"
        );
    }
  }

  /* ========================================================
     EVENTS
     ======================================================== */

  tabs.forEach(tab => {
    tab.addEventListener(
      "click",
      () => {
        const tabName =
          tab.dataset.membershipTab;

        activateTab(tabName);

        if (
        tabName === "preferences"
        ) {
        hydratePreferences();
        }

        if (
        tabName === "sizes"
        ) {
        hydrateSizes();
        }

        if (
        tabName === "passport"
        ) {
        hydrateMembershipPassport();
        }

        if (
        tabName === "notifications"
        ) {
        hydrateNotifications();
}
      }
    );
  });

  profileForm?.addEventListener(
    "submit",
    saveProfile
  );

  preferencesForm?.addEventListener(
    "click",
    handlePreferenceClick
  );

  preferencesForm?.addEventListener(
    "submit",
    savePreferences
  );

  sizeFields.forEach(field => {
  field.addEventListener(
    "change",
    handleSizeChange
    );
    });

    sizesForm?.addEventListener(
    "submit",
    saveSizes
    );

    notificationFields.forEach(field => {
    field.addEventListener(
     "change",
     handleNotificationChange
    );
    });

    notificationsForm?.addEventListener(
    "submit",
    saveNotifications
    );

      window.addEventListener(
    "forma:profile-updated",
    hydrateMembershipPassport
  );

  window.addEventListener(
    "forma:saved-updated",
    hydrateMembershipPassport
  );

  window.addEventListener(
    "forma:followed-brands-updated",
    hydrateMembershipPassport
  );

  window.Forma
    ?.events
    ?.on?.(
      "forma:profile-updated",
      hydrateMembershipPassport
    );

  window.Forma
    ?.events
    ?.on?.(
      "forma:saved-updated",
      hydrateMembershipPassport
    );

  window.Forma
    ?.events
    ?.on?.(
      "forma:followed-brands-updated",
      hydrateMembershipPassport
    );

    hydrateProfile();
    hydratePreferences();
    hydrateSizes();
    hydrateMembershipPassport();
    hydrateNotifications();

  console.info(
    "[Forma Membership Center] Ready"
  );
})();