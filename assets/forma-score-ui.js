/* ==========================================================
   FORMA — SCORE UI
   Version 1.1.0
   ========================================================== */

(() => {
  const CARD_SELECTOR = "[data-forma-score-card]";

  function getProduct(card) {
    return {
      id: card.dataset.productId,
      handle: card.dataset.productHandle,
      vendor: card.dataset.productVendor,
      title: card.dataset.productTitle,
      url: card.dataset.productUrl
    };
  }

  function animateScore(element, nextScore) {
    if (!element) return;

    const currentScore =
      Number(element.textContent) || nextScore;

    if (currentScore === nextScore) {
      element.textContent = nextScore;
      return;
    }

    const duration = 420;
    const startTime = performance.now();

    element.classList.add("is-updating");

    function update(currentTime) {
      const progress = Math.min(
        (currentTime - startTime) / duration,
        1
      );

      const easedProgress =
        1 - Math.pow(1 - progress, 3);

      const displayedScore = Math.round(
        currentScore +
        (nextScore - currentScore) * easedProgress
      );

      element.textContent = displayedScore;

      if (progress < 1) {
        window.requestAnimationFrame(update);
        return;
      }

      element.textContent = nextScore;

      window.setTimeout(() => {
        element.classList.remove("is-updating");
      }, 180);
    }

    window.requestAnimationFrame(update);
  }

  function renderScoreCard(card, shouldAnimate = false) {
    if (!card || !window.Forma?.score) return;

    const product = getProduct(card);
    const result = window.Forma.score.explain(product);

    const scoreElement = card.querySelector(
      "[data-forma-score-value]"
    );

    const labelElement = card.querySelector(
      "[data-forma-score-label]"
    );

    const reasonsElement = card.querySelector(
      "[data-forma-score-reasons]"
    );

    const progressElement = card.querySelector(
    "[data-forma-score-progress]"
    );

    if (scoreElement) {
      if (shouldAnimate) {
        animateScore(scoreElement, result.score);
      } else {
        scoreElement.textContent = result.score;
      }
    }

    if (labelElement) {
      labelElement.textContent = result.label;
    }

    if (progressElement) {
    window.requestAnimationFrame(() => {
        progressElement.style.width = `${result.score}%`;
    });
    }

    if (reasonsElement) {
      reasonsElement.innerHTML = "";

      result.reasons.forEach(reason => {
        const item = document.createElement("li");

        item.className = "forma-score-card__reason";
        item.textContent = reason.label;

        reasonsElement.appendChild(item);
      });
    }

    card.hidden = false;
    card.dataset.formaScoreState = "ready";
    card.dataset.formaScore = String(result.score);
  }

  function bindScoreCard(card) {
    if (!card || card.dataset.formaScoreBound === "true") {
      return;
    }

    const toggle = card.querySelector(
      "[data-forma-score-toggle]"
    );

    const details = card.querySelector(
      "[data-forma-score-details]"
    );

    if (toggle && details) {
      toggle.addEventListener("click", () => {
        const isExpanded =
          toggle.getAttribute("aria-expanded") === "true";

        const nextExpanded = !isExpanded;

        toggle.setAttribute(
          "aria-expanded",
          String(nextExpanded)
        );

        details.hidden = !nextExpanded;

        card.classList.toggle(
          "is-expanded",
          nextExpanded
        );

        toggle.textContent = nextExpanded
          ? "Close"
          : "Why?";
      });
    }

    card.dataset.formaScoreBound = "true";
  }

  function init() {
    document
      .querySelectorAll(CARD_SELECTOR)
      .forEach(card => {
        bindScoreCard(card);
        renderScoreCard(card);
      });
  }

  function refresh() {
    document
      .querySelectorAll(CARD_SELECTOR)
      .forEach(card => {
        bindScoreCard(card);
        renderScoreCard(card, true);
      });
  }

  const refreshEvents = [
    "forma:score-refreshed",
    "forma:saved-products-updated",
    "forma:followed-brands-updated",
    "forma:recently-viewed-updated"
  ];

  refreshEvents.forEach(eventName => {
    window.addEventListener(eventName, refresh);
    document.addEventListener(eventName, refresh);
  });

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

  window.Forma = window.Forma || {};

  window.Forma.scoreUI = {
    init,
    refresh,
    version: "1.1.0"
  };
})();