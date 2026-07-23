/*
|--------------------------------------------------------------------------
| FORMA ENGINE
|--------------------------------------------------------------------------
|
| Core engine for the Forma Platform.
| All modules communicate through this engine.
|
| Version: 1.0.0
|
*/

(function () {
  "use strict";

  if (window.Forma) return;

  const STORAGE_KEYS = {
    savedProducts: "forma_saved_products",
    followedBrands: "forma_followed_brands",
    recentlyViewed: "forma_recently_viewed_products"
  };

  const storage = {
    get(key, fallback = []) {
      try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
      } catch (error) {
        console.warn("[Forma] Storage read failed:", error);
        return fallback;
      }
    },

    set(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    },

    remove(key) {
      localStorage.removeItem(key);
    }
  };

  const events = {
    emit(name, detail = {}) {
      document.dispatchEvent(
        new CustomEvent(name, { detail })
      );
    },

    on(name, callback) {
      document.addEventListener(name, callback);
    }
  };

  window.Forma = {

    version: "1.0.0",

    storage: {
      keys: STORAGE_KEYS,
      get: storage.get,
      set: storage.set,
      remove: storage.remove
    },

    events,

    user: {

      savedProducts() {
        return storage.get(STORAGE_KEYS.savedProducts);
      },

      followedBrands() {
        return storage.get(STORAGE_KEYS.followedBrands);
      },

      recentlyViewed() {
        return storage.get(STORAGE_KEYS.recentlyViewed);
      }

    }

  };

})();