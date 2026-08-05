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

      window.Forma
        ?.events
        ?.emit?.(
          "forma:profile-updated",
          {
            profile,
            source: "membership-center"
          }
        );

      window.dispatchEvent(
        new CustomEvent(
          "forma:profile-updated",
          {
            detail: {
              profile,
              source: "membership-center"
            }
          }
        )
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

  profileForm?.addEventListener(
    "submit",
    saveProfile
  );

  hydrateProfile();

  console.info(
    "[Forma Membership Center] Ready"
  );
})();