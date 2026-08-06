/* ==========================================================
   FORMA — WISH COLLECTIONS
   ========================================================== */

(function () {
  "use strict";

  window.Forma = window.Forma || {};

  const STORAGE_KEY =
    "forma_wish_collections";

  function createId(prefix = "wish") {
    const randomPart =
      Math.random()
        .toString(36)
        .slice(2, 10);

    const timePart =
      Date.now()
        .toString(36);

    return `${prefix}_${timePart}_${randomPart}`;
  }

  function createShareId() {
    return [
      Math.random().toString(36).slice(2, 8),
      Math.random().toString(36).slice(2, 8)
    ]
      .join("")
      .toUpperCase();
  }

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function normalizeVisibility(value) {
    return value === "shared"
      ? "shared"
      : "private";
  }

  function normalizeProduct(product) {
    if (!product || typeof product !== "object") {
      return null;
    }

    const handle =
      normalizeText(product.handle);

    if (!handle) {
      return null;
    }

    return {
      id:
        product.id ||
        handle,

      handle,

      title:
        normalizeText(product.title) ||
        "Untitled product",

      brand:
        normalizeText(
          product.brand ||
          product.vendor
        ),

      image:
        normalizeText(product.image),

      price:
        Number(product.price) || 0,

      url:
        normalizeText(product.url) ||
        `/products/${handle}`,

      note:
        normalizeText(product.note),

      priority:
        product.priority ||
        "normal",

      addedAt:
        product.addedAt ||
        new Date().toISOString()
    };
  }

  function normalizeCollection(collection) {
    const products =
      Array.isArray(collection?.products)
        ? collection.products
            .map(normalizeProduct)
            .filter(Boolean)
        : [];

    return {
      id:
        normalizeText(collection?.id) ||
        createId(),

      shareId:
        normalizeText(collection?.shareId) ||
        createShareId(),

      title:
        normalizeText(collection?.title) ||
        "Untitled collection",

      description:
        normalizeText(
          collection?.description
        ),

      occasion:
        normalizeText(
          collection?.occasion
        ),

      visibility:
        normalizeVisibility(
          collection?.visibility
        ),

      coverImage:
        normalizeText(
          collection?.coverImage
        ),

      products,

      createdAt:
        collection?.createdAt ||
        new Date().toISOString(),

      updatedAt:
        collection?.updatedAt ||
        new Date().toISOString()
    };
  }

  function getAll() {
    try {
      const storedValue =
        window.localStorage.getItem(
          STORAGE_KEY
        );

      if (!storedValue) {
        return [];
      }

      const parsedValue =
        JSON.parse(storedValue);

      if (!Array.isArray(parsedValue)) {
        return [];
      }

      return parsedValue.map(
        normalizeCollection
      );
    } catch (error) {
      console.warn(
        "[Forma Wish Collections] Could not read collections.",
        error
      );

      return [];
    }
  }

  function saveAll(collections) {
    const normalizedCollections =
      collections.map(
        normalizeCollection
      );

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        normalizedCollections
      )
    );

    const detail = {
      collections:
        normalizedCollections,

      count:
        normalizedCollections.length
    };

    window.Forma
      ?.events
      ?.emit?.(
        "forma:wishlists-updated",
        detail
      );

    window.dispatchEvent(
      new CustomEvent(
        "forma:wishlists-updated",
        {
          detail
        }
      )
    );

    return normalizedCollections;
  }

  function getById(collectionId) {
    return (
      getAll().find(
        collection =>
          collection.id ===
          collectionId
      ) || null
    );
  }

  function getByShareId(shareId) {
    const normalizedShareId =
      normalizeText(shareId)
        .toUpperCase();

    return (
      getAll().find(
        collection =>
          collection.shareId ===
          normalizedShareId
      ) || null
    );
  }

  function create(input = {}) {
    const collections = getAll();

    const collection =
      normalizeCollection({
        ...input,

        id:
          input.id ||
          createId(),

        shareId:
          input.shareId ||
          createShareId(),

        products: [],

        createdAt:
          new Date().toISOString(),

        updatedAt:
          new Date().toISOString()
      });

    collections.unshift(
      collection
    );

    saveAll(collections);

    return collection;
  }

  function update(
    collectionId,
    changes = {}
  ) {
    const collections = getAll();

    const index =
      collections.findIndex(
        collection =>
          collection.id ===
          collectionId
      );

    if (index === -1) {
      return null;
    }

    collections[index] =
      normalizeCollection({
        ...collections[index],
        ...changes,

        id:
          collections[index].id,

        shareId:
          collections[index].shareId,

        updatedAt:
          new Date().toISOString()
      });

    saveAll(collections);

    return collections[index];
  }

  function remove(collectionId) {
    const collections =
      getAll().filter(
        collection =>
          collection.id !==
          collectionId
      );

    saveAll(collections);

    return collections;
  }

  function addProduct(
    collectionId,
    product
  ) {
    const collection =
      getById(collectionId);

    const normalizedProduct =
      normalizeProduct(product);

    if (
      !collection ||
      !normalizedProduct
    ) {
      return null;
    }

    const alreadyExists =
      collection.products.some(
        item =>
          item.handle ===
          normalizedProduct.handle
      );

    if (!alreadyExists) {
      collection.products.unshift(
        normalizedProduct
      );
    }

    return update(
      collectionId,
      {
        products:
          collection.products
      }
    );
  }

  function removeProduct(
    collectionId,
    productHandle
  ) {
    const collection =
      getById(collectionId);

    if (!collection) {
      return null;
    }

    const products =
      collection.products.filter(
        product =>
          product.handle !==
          productHandle
      );

    return update(
      collectionId,
      {
        products
      }
    );
  }

  function count() {
    return getAll().length;
  }

  function countProducts() {
    return getAll().reduce(
      (
        total,
        collection
      ) =>
        total +
        collection.products.length,
      0
    );
  }

  function clear() {
    return saveAll([]);
  }

  window.Forma.wishlists = {
    getAll,
    getById,
    getByShareId,
    create,
    update,
    remove,
    addProduct,
    removeProduct,
    count,
    countProducts,
    clear
  };

  console.info(
    "[Forma Wish Collections] Ready"
  );
})();