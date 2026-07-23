/* ==========================================================
   FORMA — CACHE LAYER
   ========================================================== */

(function () {
  "use strict";

  if (!window.Forma) {
    console.error(
      "[Forma Cache] Forma Engine must load first."
    );

    return;
  }

  if (window.Forma.cache) {
    return;
  }

  const STORAGE_PREFIX = "forma_cache:";
  const DEFAULT_TTL = 15 * 60 * 1000;

  const memory = new Map();
  const pending = new Map();

  function normalizeKey(key) {
    return String(key || "").trim();
  }

  function storageKey(key) {
    return `${STORAGE_PREFIX}${normalizeKey(key)}`;
  }

  function isExpired(entry) {
    return (
      !entry ||
      typeof entry.expiresAt !== "number" ||
      Date.now() >= entry.expiresAt
    );
  }

  function createEntry(value, ttl) {
    const duration =
      Number.isFinite(ttl) && ttl >= 0
        ? ttl
        : DEFAULT_TTL;

    return {
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + duration
    };
  }

  function readLocal(key) {
    try {
      const raw = localStorage.getItem(
        storageKey(key)
      );

      if (!raw) {
        return null;
      }

      const entry = JSON.parse(raw);

      if (isExpired(entry)) {
        localStorage.removeItem(
          storageKey(key)
        );

        return null;
      }

      return entry;
    } catch (error) {
      console.warn(
        `[Forma Cache] Could not read "${key}" from local cache.`,
        error
      );

      return null;
    }
  }

  function writeLocal(key, entry) {
    try {
      localStorage.setItem(
        storageKey(key),
        JSON.stringify(entry)
      );

      return true;
    } catch (error) {
      console.warn(
        `[Forma Cache] Could not save "${key}" to local cache.`,
        error
      );

      return false;
    }
  }

  function get(key) {
    const normalizedKey = normalizeKey(key);

    if (!normalizedKey) {
      return undefined;
    }

    const memoryEntry =
      memory.get(normalizedKey);

    if (memoryEntry) {
      if (!isExpired(memoryEntry)) {
        return memoryEntry.value;
      }

      memory.delete(normalizedKey);
    }

    const localEntry =
      readLocal(normalizedKey);

    if (!localEntry) {
      return undefined;
    }

    memory.set(
      normalizedKey,
      localEntry
    );

    return localEntry.value;
  }

  function set(
    key,
    value,
    options = {}
  ) {
    const normalizedKey =
      normalizeKey(key);

    if (!normalizedKey) {
      return value;
    }

    const {
      ttl = DEFAULT_TTL,
      persist = true
    } = options;

    const entry =
      createEntry(value, ttl);

    memory.set(
      normalizedKey,
      entry
    );

    if (persist) {
      writeLocal(
        normalizedKey,
        entry
      );
    }

    window.Forma.events.emit(
      "forma:cache-set",
      {
        key: normalizedKey,
        ttl,
        persist
      }
    );

    return value;
  }

  function remove(key) {
    const normalizedKey =
      normalizeKey(key);

    if (!normalizedKey) {
      return;
    }

    memory.delete(normalizedKey);
    pending.delete(normalizedKey);

    try {
      localStorage.removeItem(
        storageKey(normalizedKey)
      );
    } catch (error) {
      console.warn(
        `[Forma Cache] Could not remove "${normalizedKey}".`,
        error
      );
    }

    window.Forma.events.emit(
      "forma:cache-removed",
      {
        key: normalizedKey
      }
    );
  }

  function clear() {
    memory.clear();
    pending.clear();

    try {
      const keysToRemove = [];

      for (
        let index = 0;
        index < localStorage.length;
        index += 1
      ) {
        const key =
          localStorage.key(index);

        if (
          key?.startsWith(
            STORAGE_PREFIX
          )
        ) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.warn(
        "[Forma Cache] Could not clear local cache.",
        error
      );
    }

    window.Forma.events.emit(
      "forma:cache-cleared"
    );
  }

  async function remember(
    key,
    resolver,
    options = {}
  ) {
    const normalizedKey =
      normalizeKey(key);

    if (!normalizedKey) {
      throw new Error(
        "[Forma Cache] A cache key is required."
      );
    }

    if (typeof resolver !== "function") {
      throw new TypeError(
        "[Forma Cache] Resolver must be a function."
      );
    }

    const cachedValue =
      get(normalizedKey);

    if (cachedValue !== undefined) {
      return cachedValue;
    }

    if (pending.has(normalizedKey)) {
      return pending.get(normalizedKey);
    }

    const request = Promise.resolve()
      .then(resolver)
      .then(value => {
        set(
          normalizedKey,
          value,
          options
        );

        return value;
      })
      .finally(() => {
        pending.delete(
          normalizedKey
        );
      });

    pending.set(
      normalizedKey,
      request
    );

    return request;
  }

  window.Forma.cache = {
    get,
    set,
    remove,
    clear,
    remember
  };
})();