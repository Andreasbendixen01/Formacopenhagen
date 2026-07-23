/* ==========================================================
   FORMA — USER PROFILE MODULE
   ========================================================== */

(function () {
  "use strict";

  if (!window.Forma) {
    console.error(
      "[Forma Profile] Forma Engine must load first."
    );

    return;
  }

  if (window.Forma.profile) {
    return;
  }

  const STORAGE_KEY = "forma_user_profile";

  const DEFAULT_PROFILE = {
    version: 1,

    identity: {
      firstName: "",
      lastName: "",
      birthday: "",
      city: ""
    },

    preferences: {
      categories: [],
      brands: [],
      styles: [],
      sizes: {}
    },

    onboarding: {
      started: false,
      completed: false,
      completedAt: null
    },

    createdAt: null,
    updatedAt: null
  };

  function clone(value) {
    return JSON.parse(
      JSON.stringify(value)
    );
  }

  function isObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function mergeDeep(target, source) {
    const output = {
      ...target
    };

    if (!isObject(source)) {
      return output;
    }

    Object.keys(source).forEach(key => {
      const sourceValue = source[key];
      const targetValue = output[key];

      if (
        isObject(sourceValue) &&
        isObject(targetValue)
      ) {
        output[key] = mergeDeep(
          targetValue,
          sourceValue
        );
      } else {
        output[key] = sourceValue;
      }
    });

    return output;
  }

  function normalizeProfile(profile) {
    const normalized = mergeDeep(
      clone(DEFAULT_PROFILE),
      profile
    );

    normalized.preferences.categories =
      Array.isArray(
        normalized.preferences.categories
      )
        ? normalized.preferences.categories
        : [];

    normalized.preferences.brands =
      Array.isArray(
        normalized.preferences.brands
      )
        ? normalized.preferences.brands
        : [];

    normalized.preferences.styles =
      Array.isArray(
        normalized.preferences.styles
      )
        ? normalized.preferences.styles
        : [];

    normalized.preferences.sizes =
      isObject(
        normalized.preferences.sizes
      )
        ? normalized.preferences.sizes
        : {};

    return normalized;
  }

  function get() {
    const storedProfile =
      window.Forma.storage.get(
        STORAGE_KEY,
        null
      );

    return normalizeProfile(
      storedProfile || DEFAULT_PROFILE
    );
  }

  function save(profile) {
    const currentProfile = get();
    const now = new Date().toISOString();

    const updatedProfile =
      normalizeProfile(profile);

    updatedProfile.createdAt =
      currentProfile.createdAt || now;

    updatedProfile.updatedAt = now;

    window.Forma.storage.set(
      STORAGE_KEY,
      updatedProfile
    );

    window.Forma.events.emit(
      "forma:profile-updated",
      {
        profile: updatedProfile
      }
    );

    return updatedProfile;
  }

  function update(changes) {
    const currentProfile = get();

    const updatedProfile = mergeDeep(
      currentProfile,
      changes
    );

    return save(updatedProfile);
  }

  function updateIdentity(changes) {
    return update({
      identity: changes
    });
  }

  function updatePreferences(changes) {
    return update({
      preferences: changes
    });
  }

  function setPreferenceList(
    preference,
    values
  ) {
    if (
      ![
        "categories",
        "brands",
        "styles"
      ].includes(preference)
    ) {
      console.warn(
        `[Forma Profile] Unknown preference list: ${preference}`
      );

      return get();
    }

    const normalizedValues = [
      ...new Set(
        (Array.isArray(values) ? values : [])
          .map(value =>
            String(value || "").trim()
          )
          .filter(Boolean)
      )
    ];

    return updatePreferences({
      [preference]: normalizedValues
    });
  }

  function togglePreference(
    preference,
    value
  ) {
    const normalizedValue =
      String(value || "").trim();

    if (!normalizedValue) {
      return get();
    }

    const profile = get();

    const currentValues =
      Array.isArray(
        profile.preferences[preference]
      )
        ? profile.preferences[preference]
        : [];

    const exists = currentValues.includes(
      normalizedValue
    );

    const updatedValues = exists
      ? currentValues.filter(
          item => item !== normalizedValue
        )
      : [
          ...currentValues,
          normalizedValue
        ];

    return setPreferenceList(
      preference,
      updatedValues
    );
  }

  function setSize(category, size) {
    const normalizedCategory =
      String(category || "").trim();

    const normalizedSize =
      String(size || "").trim();

    if (!normalizedCategory) {
      return get();
    }

    const profile = get();

    const sizes = {
      ...profile.preferences.sizes
    };

    if (normalizedSize) {
      sizes[normalizedCategory] =
        normalizedSize;
    } else {
      delete sizes[normalizedCategory];
    }

    return updatePreferences({
      sizes
    });
  }

  function startOnboarding() {
    return update({
      onboarding: {
        started: true
      }
    });
  }

  function completeOnboarding() {
    return update({
      onboarding: {
        started: true,
        completed: true,
        completedAt:
          new Date().toISOString()
      }
    });
  }

  function reset() {
    window.Forma.storage.remove(
      STORAGE_KEY
    );

    const profile = get();

    window.Forma.events.emit(
      "forma:profile-reset",
      {
        profile
      }
    );

    window.Forma.events.emit(
      "forma:profile-updated",
      {
        profile
      }
    );

    return profile;
  }

  function isComplete() {
    return get().onboarding.completed;
  }

  window.Forma.profile = {
    get,
    save,
    update,
    updateIdentity,
    updatePreferences,
    setPreferenceList,
    togglePreference,
    setSize,
    startOnboarding,
    completeOnboarding,
    isComplete,
    reset
  };

})();