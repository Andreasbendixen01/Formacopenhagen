/* ==========================================================
   FORMA — ACTIVITY FEED
   ========================================================== */

(() => {
  "use strict";

  const feed = document.querySelector(
    "[data-forma-activity-feed]"
  );

  const emptyState = document.querySelector(
    "[data-forma-activity-empty]"
  );

  if (!feed || !emptyState) return;

  const MAX_ITEMS = 20;

  const ACTIVITY_CONFIG = {
    product_saved: {
      icon: "♡",
      label: "Saved"
    },

    product_unsaved: {
      icon: "−",
      label: "Removed"
    },

    brand_followed: {
      icon: "+",
      label: "Followed"
    },

    brand_unfollowed: {
      icon: "−",
      label: "Unfollowed"
    },

    product_viewed: {
      icon: "↗",
      label: "Viewed"
    },

    article_viewed: {
      icon: "○",
      label: "Read"
    },

    onboarding_completed: {
      icon: "✓",
      label: "Completed"
    }
  };

  function escapeHTML(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getConfig(type) {
    return (
      ACTIVITY_CONFIG[type] || {
        icon: "○",
        label: "Activity"
      }
    );
  }

  function getEntityName(activity) {
    const metadata =
      activity.metadata || {};

    return (
      metadata.title ||
      metadata.name ||
      metadata.brand ||
      activity.handle ||
      ""
    );
  }

  function getActivityTitle(activity) {
    const entityName =
      getEntityName(activity);

    switch (activity.type) {
      case "product_saved":
      case "product_unsaved":
      case "product_viewed":
        return entityName || "Product";

      case "brand_followed":
      case "brand_unfollowed":
        return entityName || "Brand";

      case "article_viewed":
        return entityName || "Forma Journal";

      case "onboarding_completed":
        return "Your Forma Profile";

      default:
        return entityName || "Forma";
    }
  }

  function getHref(activity) {
    if (activity.metadata?.url) {
      return activity.metadata.url;
    }

    if (!activity.handle) {
      return "";
    }

    switch (activity.entityType) {
      case "product":
        return `/products/${encodeURIComponent(
          activity.handle
        )}`;

      case "collection":
        return `/collections/${encodeURIComponent(
          activity.handle
        )}`;

      case "brand":
        return `/pages/brands#${encodeURIComponent(
          activity.handle
        )}`;

      default:
        return "";
    }
  }

  function getStartOfDay(date) {
    const result = new Date(date);

    result.setHours(0, 0, 0, 0);

    return result;
  }

  function getDayDifference(date) {
    const today =
      getStartOfDay(new Date());

    const activityDate =
      getStartOfDay(date);

    return Math.floor(
      (today - activityDate) /
        86400000
    );
  }

  function getGroup(activity) {
    const date =
      new Date(activity.createdAt);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return {
        key: "earlier",
        label: "Earlier"
      };
    }

    const dayDifference =
      getDayDifference(date);

    if (dayDifference === 0) {
      return {
        key: "today",
        label: "Today"
      };
    }

    if (dayDifference === 1) {
      return {
        key: "yesterday",
        label: "Yesterday"
      };
    }

    if (dayDifference < 7) {
      return {
        key: "this-week",
        label: "Earlier this week"
      };
    }

    const now =
      new Date();

    const sameMonth =
      date.getFullYear() ===
        now.getFullYear() &&
      date.getMonth() ===
        now.getMonth();

    if (sameMonth) {
      return {
        key: "this-month",
        label: "Earlier this month"
      };
    }

    return {
      key: "earlier",
      label: "Earlier"
    };
  }

  function getTimeLabel(createdAt) {
    const date =
      new Date(createdAt);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    const dayDifference =
      getDayDifference(date);

    if (
      dayDifference === 0 ||
      dayDifference === 1
    ) {
      return new Intl.DateTimeFormat(
        "en-GB",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      ).format(date);
    }

    return new Intl.DateTimeFormat(
      "en-GB",
      {
        day: "numeric",
        month: "short"
      }
    ).format(date);
  }

  function createActivityCard(activity) {
    const config =
      getConfig(activity.type);

    const title =
      escapeHTML(
        getActivityTitle(activity)
      );

    const label =
      escapeHTML(config.label);

    const icon =
      escapeHTML(config.icon);

    const time =
      escapeHTML(
        getTimeLabel(
          activity.createdAt
        )
      );

    const href =
      getHref(activity);

    const content = `
      <div class="forma-activity-card__left">
        <span
          class="forma-activity-card__icon"
          aria-hidden="true"
        >
          ${icon}
        </span>

        <div class="forma-activity-card__content">
          <p class="forma-activity-card__label">
            ${label}
          </p>

          <p class="forma-activity-card__title">
            ${title}
          </p>
        </div>
      </div>

      <span class="forma-activity-card__time">
        ${time}
      </span>
    `;

    if (href) {
      const link =
        document.createElement("a");

      link.className =
        "forma-activity-card forma-activity-card--link";

      link.href = href;
      link.innerHTML = content;

      return link;
    }

    const card =
      document.createElement("article");

    card.className =
      "forma-activity-card";

    card.innerHTML = content;

    return card;
  }

  function groupActivities(activities) {
    const groups = [];

    activities.forEach(activity => {
      const group =
        getGroup(activity);

      let existingGroup =
        groups.find(
          item =>
            item.key === group.key
        );

      if (!existingGroup) {
        existingGroup = {
          key: group.key,
          label: group.label,
          activities: []
        };

        groups.push(existingGroup);
      }

      existingGroup.activities.push(
        activity
      );
    });

    return groups;
  }

  function createGroup(group) {
    const section =
      document.createElement(
        "section"
      );

    section.className =
      "forma-activity-group";

    const header =
      document.createElement("header");

    header.className =
      "forma-activity-group__header";

    header.innerHTML = `
      <p class="forma-activity-group__title">
        ${escapeHTML(group.label)}
      </p>

      <span
        class="forma-activity-group__count"
        aria-label="${group.activities.length} activities"
      >
        ${String(
          group.activities.length
        ).padStart(2, "0")}
      </span>
    `;

    const list =
      document.createElement("div");

    list.className =
      "forma-activity-group__list";

    group.activities.forEach(
      activity => {
        list.appendChild(
          createActivityCard(activity)
        );
      }
    );

    section.appendChild(header);
    section.appendChild(list);

    return section;
  }

  function render() {
    if (!window.Forma?.activity) {
      feed.replaceChildren();
      feed.hidden = true;
      emptyState.hidden = false;
      return;
    }

    const activities =
      window.Forma.activity.latest(
        MAX_ITEMS
      );

    feed.replaceChildren();

    if (!activities.length) {
      feed.hidden = true;
      emptyState.hidden = false;
      return;
    }

    const groups =
      groupActivities(activities);

    groups.forEach(group => {
      feed.appendChild(
        createGroup(group)
      );
    });

    feed.hidden = false;
    emptyState.hidden = true;
  }

  document.addEventListener(
    "forma:activity-updated",
    render
  );

  document.addEventListener(
    "forma:activity-cleared",
    render
  );

  document.addEventListener(
    "DOMContentLoaded",
    render
  );

  window.addEventListener(
    "pageshow",
    render
  );

  window.addEventListener(
    "storage",
    event => {
      if (
        !event.key ||
        event.key ===
          "forma_activity"
      ) {
        render();
      }
    }
  );

  render();
})();