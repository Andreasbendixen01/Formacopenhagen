/* ==========================================================
   FORMA — ACTIVITY ENGINE
   ========================================================== */

(function () {
  "use strict";

  if (!window.Forma) {
    console.error(
      "[Forma Activity] Forma Engine must load first."
    );

    return;
  }

  if (window.Forma.activity) {
    return;
  }

  const STORAGE_KEY = "forma_activity";
  const VERSION = 1;
  const MAX_ACTIVITIES = 500;

  const VALID_ENTITY_TYPES = [
    "product",
    "brand",
    "article",
    "profile",
    "collection",
    "place"
  ];

  function createId() {
    return [
      Date.now().toString(36),
      Math.random().toString(36).slice(2, 10)
    ].join("-");
  }

  function normalizeString(value) {
    return String(value || "").trim();
  }

  function normalizeEntityType(value) {
    const normalized = normalizeString(
      value
    ).toLowerCase();

    return VALID_ENTITY_TYPES.includes(
      normalized
    )
      ? normalized
      : "";
  }

  function normalizeActivity(activity) {
    if (
      !activity ||
      typeof activity !== "object" ||
      Array.isArray(activity)
    ) {
      return null;
    }

    const type = normalizeString(
      activity.type
    );

    if (!type) {
      return null;
    }

    return {
      id:
        normalizeString(activity.id) ||
        createId(),

      version:
        Number(activity.version) ||
        VERSION,

      type,

      entityType:
        normalizeEntityType(
          activity.entityType
        ),

      entityId:
        normalizeString(
          activity.entityId
        ),

      handle:
        normalizeString(
          activity.handle
        ),

      source:
        normalizeString(
          activity.source
        ) || "unknown",

      metadata:
        activity.metadata &&
        typeof activity.metadata ===
          "object" &&
        !Array.isArray(activity.metadata)
          ? activity.metadata
          : {},

      createdAt:
        normalizeString(
          activity.createdAt
        ) ||
        new Date().toISOString()
    };
  }

  function get() {
    const stored =
      window.Forma.storage.get(
        STORAGE_KEY,
        []
      );

    if (!Array.isArray(stored)) {
      return [];
    }

    return stored
      .map(normalizeActivity)
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      );
  }

  function save(activities) {
    const normalized = (
      Array.isArray(activities)
        ? activities
        : []
    )
      .map(normalizeActivity)
      .filter(Boolean)
      .slice(0, MAX_ACTIVITIES);

    window.Forma.storage.set(
      STORAGE_KEY,
      normalized
    );

    window.Forma.events.emit(
      "forma:activity-updated",
      {
        activities: normalized
      }
    );

    return normalized;
  }

  function add(type, options = {}) {
    const activity = normalizeActivity({
      id: createId(),
      version: VERSION,
      type,

      entityType:
        options.entityType,

      entityId:
        options.entityId,

      handle:
        options.handle,

      source:
        options.source,

      metadata:
        options.metadata,

      createdAt:
        new Date().toISOString()
    });

    if (!activity) {
      console.warn(
        "[Forma Activity] Activity type is required."
      );

      return null;
    }

    const activities = get();

    activities.unshift(activity);

    save(activities);

    window.Forma.events.emit(
      "forma:activity-added",
      {
        activity
      }
    );

    return activity;
  }

  function latest(limit = 20) {
    const normalizedLimit =
      Math.max(
        0,
        Number(limit) || 20
      );

    return get().slice(
      0,
      normalizedLimit
    );
  }

  function findByType(type) {
    const normalizedType =
      normalizeString(type);

    return get().filter(
      activity =>
        activity.type ===
        normalizedType
    );
  }

  function findByEntity(
    entityType,
    identifier
  ) {
    const normalizedType =
      normalizeEntityType(entityType);

    const normalizedIdentifier =
      normalizeString(identifier);

    if (
      !normalizedType ||
      !normalizedIdentifier
    ) {
      return [];
    }

    return get().filter(activity => {
      const matchesType =
        activity.entityType ===
        normalizedType;

      const matchesIdentifier =
        activity.entityId ===
          normalizedIdentifier ||
        activity.handle ===
          normalizedIdentifier;

      return (
        matchesType &&
        matchesIdentifier
      );
    });
  }

  function count(type = "") {
    if (!type) {
      return get().length;
    }

    return findByType(type).length;
  }

  function remove(id) {
    const normalizedId =
      normalizeString(id);

    if (!normalizedId) {
      return get();
    }

    const activities = get().filter(
      activity =>
        activity.id !== normalizedId
    );

    return save(activities);
  }

  function clear() {
    window.Forma.storage.remove(
      STORAGE_KEY
    );

    window.Forma.events.emit(
      "forma:activity-cleared",
      {
        activities: []
      }
    );

    window.Forma.events.emit(
      "forma:activity-updated",
      {
        activities: []
      }
    );

    return [];
  }

  window.Forma.activity = {
    add,
    get,
    save,
    latest,
    findByType,
    findByEntity,
    count,
    remove,
    clear
  };
})();