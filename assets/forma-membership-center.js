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

  hydrateProfile();
  hydratePreferences();

  console.info(
    "[Forma Membership Center] Ready"
  );
})();