/* ==========================================================
   FORMA — TOAST SYSTEM
   ========================================================== */

(function () {
  "use strict";

  if (!window.Forma) {
    console.error(
      "[Forma Toast] Forma Engine must load before this module."
    );

    return;
  }

  if (window.Forma.toast) {
    return;
  }

  const DEFAULT_DURATION = 3200;
  const MAX_VISIBLE_TOASTS = 3;

  let container = null;

  function createContainer() {
    if (container?.isConnected) {
      return container;
    }

    container = document.querySelector(
      "[data-forma-toast-container]"
    );

    if (container) {
      return container;
    }

    container = document.createElement("div");

    container.className =
      "forma-toast-container";

    container.dataset.formaToastContainer = "";

    container.setAttribute(
      "aria-live",
      "polite"
    );

    container.setAttribute(
      "aria-atomic",
      "false"
    );

    document.body.appendChild(container);

    return container;
  }

  function getIcon(type) {
    const icons = {
      success: "✓",
      error: "!",
      warning: "!",
      info: "i"
    };

    return icons[type] || icons.info;
  }

  function removeToast(toast) {
    if (!toast || toast.dataset.removing === "true") {
      return;
    }

    toast.dataset.removing = "true";
    toast.classList.add("is-leaving");

    toast.addEventListener(
      "animationend",
      () => {
        toast.remove();
      },
      {
        once: true
      }
    );

    window.setTimeout(() => {
      toast.remove();
    }, 500);
  }

  function limitVisibleToasts() {
    const toastContainer = createContainer();

    const toasts = [
      ...toastContainer.querySelectorAll(
        ".forma-toast"
      )
    ];

    if (toasts.length < MAX_VISIBLE_TOASTS) {
      return;
    }

    const excess =
      toasts.length - MAX_VISIBLE_TOASTS + 1;

    toasts
      .slice(0, excess)
      .forEach(removeToast);
  }

  function show(message, options = {}) {
    if (!message) {
      return null;
    }

    const {
      type = "info",
      duration = DEFAULT_DURATION,
      title = "",
      dismissible = true
    } = options;

    const toastContainer = createContainer();

    limitVisibleToasts();

    const toast =
      document.createElement("div");

    toast.className =
      `forma-toast forma-toast--${type}`;

    toast.setAttribute(
      "role",
      type === "error"
        ? "alert"
        : "status"
    );

    const icon =
      document.createElement("span");

    icon.className =
      "forma-toast__icon";

    icon.setAttribute(
      "aria-hidden",
      "true"
    );

    icon.textContent = getIcon(type);

    const content =
      document.createElement("div");

    content.className =
      "forma-toast__content";

    if (title) {
      const toastTitle =
        document.createElement("strong");

      toastTitle.className =
        "forma-toast__title";

      toastTitle.textContent = title;

      content.appendChild(toastTitle);
    }

    const text =
      document.createElement("p");

    text.className =
      "forma-toast__message";

    text.textContent = String(message);

    content.appendChild(text);

    toast.appendChild(icon);
    toast.appendChild(content);

    if (dismissible) {
      const closeButton =
        document.createElement("button");

      closeButton.type = "button";

      closeButton.className =
        "forma-toast__close";

      closeButton.setAttribute(
        "aria-label",
        "Close notification"
      );

      closeButton.textContent = "×";

      closeButton.addEventListener(
        "click",
        () => {
          removeToast(toast);
        }
      );

      toast.appendChild(closeButton);
    }

    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("is-visible");
    });

    if (
      Number.isFinite(duration) &&
      duration > 0
    ) {
      window.setTimeout(() => {
        removeToast(toast);
      }, duration);
    }

    window.Forma.events.emit(
      "forma:toast-shown",
      {
        message: String(message),
        type,
        title
      }
    );

    return toast;
  }

  function success(message, options = {}) {
    return show(message, {
      ...options,
      type: "success"
    });
  }

  function error(message, options = {}) {
    return show(message, {
      ...options,
      type: "error"
    });
  }

  function warning(message, options = {}) {
    return show(message, {
      ...options,
      type: "warning"
    });
  }

  function info(message, options = {}) {
    return show(message, {
      ...options,
      type: "info"
    });
  }

  function clear() {
    const toastContainer = createContainer();

    toastContainer
      .querySelectorAll(".forma-toast")
      .forEach(removeToast);
  }

  window.Forma.toast = {
    show,
    success,
    error,
    warning,
    info,
    clear
  };

})();