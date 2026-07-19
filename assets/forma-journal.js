class FormaJournal {
  constructor() {
    this.article = document.querySelector("[data-forma-article-content]");
    this.progressBar = document.querySelector(
      ".forma-reading-progress__bar"
    );
    this.toc = document.querySelector("[data-forma-toc]");
    this.tocList = this.toc?.querySelector(
      ".forma-article__toc-list"
    );

    if (!this.article ||
  this.article.dataset.formaJournalInitialized === "true"
) {
  return;
}

this.article.dataset.formaJournalInitialized = "true";

    this.headings = Array.from(
      this.article.querySelectorAll("h2")
    );

    this.buildTableOfContents();
    this.buildEditorialMedia();
    this.prepareRevealElements();
    this.initRevealObserver();
    this.initScrollEvents();
    this.updateReadingProgress();
    this.updateActiveHeading();
  }

  createHeadingId(heading, index) {
    if (heading.id) return heading.id;

    const baseId = heading.textContent
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const id = baseId || `section-${index + 1}`;
    heading.id = id;

    return id;
  }

  buildTableOfContents() {
    if (!this.toc || !this.tocList || this.headings.length < 2) {
      return;
    }

    this.headings.forEach((heading, index) => {
      const id = this.createHeadingId(heading, index);
      const item = document.createElement("li");
      const link = document.createElement("a");

      link.href = `#${id}`;
      link.className = "forma-article__toc-link";
      link.textContent = heading.textContent.trim();
      link.dataset.target = id;

      link.addEventListener("click", (event) => {
        event.preventDefault();

        heading.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

        window.history.replaceState(null, "", `#${id}`);
      });

      item.className = "forma-article__toc-item";
      item.appendChild(link);
      this.tocList.appendChild(item);
    });

    this.toc.hidden = false;
  }

  buildEditorialMedia() {
  const images = Array.from(
    this.article.querySelectorAll("img")
  );

  if (!images.length) return;

  images.forEach((image, index) => {
    if (
      image.closest(".forma-media") ||
      image.closest(".forma-media-pair")
    ) {
      return;
    }

    const parent = image.parentElement;
    const isLink =
      parent?.tagName.toLowerCase() === "a";

    const sourceElement = isLink ? parent : image;
    const sourceParent = sourceElement.parentElement;

    if (!sourceParent) return;

    const figure = document.createElement("figure");
    figure.className = "forma-media";
    figure.dataset.formaMediaIndex = index;

    sourceParent.insertBefore(figure, sourceElement);
    figure.appendChild(sourceElement);

    const altText = image.getAttribute("alt")?.trim();

    if (altText) {
      const caption = document.createElement("figcaption");

      caption.className = "forma-media__caption";
      caption.textContent = altText;

      figure.appendChild(caption);
    }

    const originalWrapper = figure.parentElement;

    if (
      originalWrapper?.tagName.toLowerCase() === "p" &&
      originalWrapper.textContent.trim() === ""
    ) {
      originalWrapper.parentElement.insertBefore(
        figure,
        originalWrapper
      );

      originalWrapper.remove();
    }
  });

  this.buildImagePairs();
}

buildImagePairs() {
  const figures = Array.from(
    this.article.querySelectorAll(":scope > .forma-media")
  );

  figures.forEach((figure) => {
    if (figure.closest(".forma-media-pair")) return;

    let nextElement = figure.nextElementSibling;

    while (
      nextElement &&
      nextElement.tagName.toLowerCase() === "p" &&
      nextElement.textContent.trim() === ""
    ) {
      nextElement = nextElement.nextElementSibling;
    }

    if (
      !nextElement ||
      !nextElement.classList.contains("forma-media")
    ) {
      return;
    }

    const pair = document.createElement("div");
    pair.className = "forma-media-pair";

    figure.parentElement.insertBefore(pair, figure);
    pair.appendChild(figure);
    pair.appendChild(nextElement);
  });
}

  prepareRevealElements() {
    const selectors = [
    "h2",
    "h3",
    "blockquote",
    ".forma-media",
    ".forma-media-pair",
    ];

    this.revealElements = Array.from(
      this.article.querySelectorAll(selectors.join(","))
    );

    this.revealElements.forEach((element) => {
      element.classList.add("forma-reveal");
    });
  }

  initRevealObserver() {
    if (
      !this.revealElements?.length ||
      !("IntersectionObserver" in window)
    ) {
      this.revealElements?.forEach((element) => {
        element.classList.add("is-visible");
      });

      return;
    }

    const observer = new IntersectionObserver(
      (entries, currentObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          currentObserver.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    this.revealElements.forEach((element) => {
      observer.observe(element);
    });
  }

  initScrollEvents() {
    let ticking = false;

    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;

        window.requestAnimationFrame(() => {
          this.updateReadingProgress();
          this.updateActiveHeading();
          ticking = false;
        });

        ticking = true;
      },
      { passive: true }
    );

    window.addEventListener("resize", () => {
      this.updateReadingProgress();
      this.updateActiveHeading();
    });
  }

  updateReadingProgress() {
    if (!this.progressBar) return;

    const articleRect = this.article.getBoundingClientRect();
    const articleTop = window.scrollY + articleRect.top;
    const articleHeight = this.article.offsetHeight;
    const viewportHeight = window.innerHeight;

    const readingDistance = Math.max(
      articleHeight - viewportHeight * 0.35,
      1
    );

    const progress =
      ((window.scrollY - articleTop + viewportHeight * 0.2) /
        readingDistance) *
      100;

    const clampedProgress = Math.min(
      100,
      Math.max(0, progress)
    );

    this.progressBar.style.transform =
      `scaleX(${clampedProgress / 100})`;
  }

  updateActiveHeading() {
    if (!this.headings.length || !this.tocList) return;

    const offset = 180;
    let activeHeading = this.headings[0];

    this.headings.forEach((heading) => {
      if (heading.getBoundingClientRect().top <= offset) {
        activeHeading = heading;
      }
    });

    this.tocList
      .querySelectorAll(".forma-article__toc-link")
      .forEach((link) => {
        link.classList.toggle(
          "is-active",
          link.dataset.target === activeHeading.id
        );
      });
  }
}

const initFormaJournal = () => {
  if (document.querySelector("[data-forma-article-content]")) {
    new FormaJournal();
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFormaJournal);
} else {
  initFormaJournal();
}

document.addEventListener(
  "shopify:section:load",
  initFormaJournal
);