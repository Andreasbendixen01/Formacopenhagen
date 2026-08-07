/* ==========================================================
   FORMA — ACCOUNT GATEWAY
   ========================================================== */

(function () {
  "use strict";

  const modal = document.querySelector(
    "[data-forma-login-modal]"
  );

  const openButton = document.querySelector(
    "[data-forma-login-open]"
  );

  if (!modal || !openButton) {
    return;
  }

  const closeButtons =
    modal.querySelectorAll(
      "[data-forma-login-close]"
    );

  let closeTimer = null;

  function openModal() {
    window.clearTimeout(
      closeTimer
    );

    modal.hidden = false;

    modal.setAttribute(
      "aria-hidden",
      "false"
    );

    document.documentElement.classList.add(
      "forma-login-is-open"
    );

    requestAnimationFrame(() => {
      modal.classList.add(
        "is-visible"
      );
    });

    const closeButton =
      modal.querySelector(
        ".forma-login-modal__close"
      );

    window.setTimeout(() => {
      closeButton?.focus();
    }, 200);
  }

  function closeModal() {
    modal.classList.remove(
      "is-visible"
    );

    modal.setAttribute(
      "aria-hidden",
      "true"
    );

    document.documentElement.classList.remove(
      "forma-login-is-open"
    );

    closeTimer =
      window.setTimeout(() => {
        modal.hidden = true;
      }, 380);

    openButton.focus();
  }

  openButton.addEventListener(
    "click",
    openModal
  );

  closeButtons.forEach(button => {
    button.addEventListener(
      "click",
      closeModal
    );
  });

  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Escape" &&
        !modal.hidden
      ) {
        closeModal();
      }
    }
  );

  console.info(
    "[Forma Account Gateway] Ready"
  );
})();