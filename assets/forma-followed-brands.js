/* ==========================================================
   FORMA — FOLLOWED BRANDS MODULE
   ========================================================== */

(function () {
  "use strict";

  if (!window.Forma) {
    console.error(
      "[Forma Followed Brands] Forma Engine must load before this module."
    );

    return;
  }

  if (window.Forma.followedBrands) {
    return;
  }

  const STORAGE_KEY =
    window.Forma.storage.keys.followedBrands;

  function normalizeHandle(handle) {
    return String(handle || "")
      .trim()
      .toLowerCase();
  }

  function getAll() {
    const brands = window.Forma.storage.get(
      STORAGE_KEY,
      []
    );

    return Array.isArray(brands)
      ? brands
      : [];
  }

  function save(brands) {
    window.Forma.storage.set(
      STORAGE_KEY,
      brands
    );

    window.Forma.events.emit(
      "forma:followed-brands-updated",
      {
        brands,
        count: brands.length
      }
    );
  }

  function isFollowing(handle) {
    const normalizedHandle =
      normalizeHandle(handle);

    if (!normalizedHandle) {
      return false;
    }

    return getAll().some(
      brand =>
        normalizeHandle(brand.handle) ===
        normalizedHandle
    );
  }

  function follow(brand) {
    if (!brand || !brand.handle) {
      console.warn(
        "[Forma Followed Brands] Brand handle is required."
      );

      return false;
    }

    const normalizedHandle =
      normalizeHandle(brand.handle);

    const brands = getAll();

    if (isFollowing(normalizedHandle)) {
      return false;
    }

    brands.push({
      name: String(brand.name || ""),
      handle: normalizedHandle
    });

    save(brands);

    window.Forma.activity?.add(
      "brand_followed",
      {
        entityType: "brand",
        entityId: normalizedHandle,
        handle: normalizedHandle,
        source:
          brand.source ||
          "brand-follow-button",

        metadata: {
          name:
            String(brand.name || ""),

          url:
            brand.url ||
            `/pages/brands#${encodeURIComponent(
              normalizedHandle
            )}`
        }
      }
    );

    return true;
  }

  function unfollow(handle) {
    const normalizedHandle =
      normalizeHandle(handle);

    const brands = getAll();

    const removedBrand =
      brands.find(
        brand =>
          normalizeHandle(
            brand.handle
          ) === normalizedHandle
      );

    const updatedBrands =
      brands.filter(
        brand =>
          normalizeHandle(
            brand.handle
          ) !== normalizedHandle
      );

    if (
      updatedBrands.length ===
      brands.length
    ) {
      return false;
    }

    save(updatedBrands);

    window.Forma.activity?.add(
      "brand_unfollowed",
      {
        entityType: "brand",
        entityId: normalizedHandle,
        handle: normalizedHandle,
        source:
          "brand-follow-button",

        metadata: {
          name:
            removedBrand?.name || "",

          url:
            `/pages/brands#${encodeURIComponent(
              normalizedHandle
            )}`
        }
      }
    );

    return true;
  }

  function toggle(brand) {
    if (!brand?.handle) {
      return false;
    }

    if (isFollowing(brand.handle)) {
      unfollow(brand.handle);
      return false;
    }

    follow(brand);
    return true;
  }

  function count() {
    return getAll().length;
  }

  function clear() {
    save([]);
  }

  window.Forma.followedBrands = {
    getAll,
    isFollowing,
    follow,
    unfollow,
    toggle,
    count,
    clear
  };

})();