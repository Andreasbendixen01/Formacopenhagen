/* ==========================================================
   FORMA — ONBOARDING UI
   ========================================================== */

(function () {
  "use strict";

  const root = document.querySelector(
    "[data-forma-onboarding]"
  );

  if (!root) return;

  if (!window.Forma?.profile) {
    console.error(
      "[Forma Onboarding] Forma Profile must load first."
    );

    return;
  }

  const steps = [
    ...root.querySelectorAll(
      "[data-forma-onboarding-step]"
    )
  ];

  const nextButton = root.querySelector(
    "[data-forma-onboarding-next]"
  );

  const backButton = root.querySelector(
    "[data-forma-onboarding-back]"
  );

  const skipButton = root.querySelector(
    "[data-forma-onboarding-skip]"
  );

  const closeButtons = root.querySelectorAll(
    "[data-forma-onboarding-close]"
  );

  const progressBar = root.querySelector(
    "[data-forma-onboarding-progress]"
  );

  const progressLabel = root.querySelector(
    "[data-forma-onboarding-progress-label]"
  );

  const MAX_STEP = steps.length;

  let currentStep = 1;

  function getProfile() {
    return window.Forma.profile.get();
  }

  function show() {
    root.hidden = false;
    document.documentElement.classList.add(
      "forma-onboarding-is-open"
    );

    window.Forma.profile.startOnboarding();

    requestAnimationFrame(() => {
      root.classList.add("is-visible");
    });
  }

  function hide() {
    root.classList.remove("is-visible");

    document.documentElement.classList.remove(
      "forma-onboarding-is-open"
    );

    window.setTimeout(() => {
      root.hidden = true;
    }, 350);
  }

  function updateStep() {
  steps.forEach(step => {
    const stepNumber = Number(
      step.dataset.formaOnboardingStep
    );

    const active =
      stepNumber === currentStep;

    step.hidden = !active;

    step.classList.toggle(
      "is-active",
      active
    );
  });

  const progress =
    (currentStep / MAX_STEP) * 100;

  if (progressBar) {
    progressBar.style.width =
      `${progress}%`;
  }

  if (progressLabel) {
    const current =
      String(currentStep).padStart(2, "0");

    const total =
      String(MAX_STEP).padStart(2, "0");

    progressLabel.textContent =
      `${current} / ${total}`;
  }

  if (backButton) {
    backButton.hidden =
      currentStep === 1;
  }

  if (nextButton) {
    const label =
      nextButton.querySelector("span:first-child");

    if (label) {
      label.textContent =
        currentStep === MAX_STEP
          ? "Complete profile"
          : "Continue";
    }
  }
}

  function hydrateFields() {
    const profile = getProfile();

    root
      .querySelectorAll(
        "[data-forma-profile-field]"
      )
      .forEach(field => {
        const key = field.name;

        field.value =
          profile.identity[key] || "";
      });

    root
      .querySelectorAll(
        "[data-forma-preference-group]"
      )
      .forEach(group => {
        const preference =
          group.dataset.formaPreferenceGroup;

        const selected =
          profile.preferences[preference] || [];

        group
          .querySelectorAll(
            "[data-forma-preference-value]"
          )
          .forEach(button => {
            const value =
              button.dataset.formaPreferenceValue;

            const active =
              selected.includes(value);

            button.classList.toggle(
              "is-selected",
              active
            );

            button.setAttribute(
              "aria-pressed",
              String(active)
            );
          });
      });

    root
      .querySelectorAll(
        "[data-forma-size-field]"
      )
      .forEach(field => {
        const category =
          field.dataset.formaSizeField;

        field.value =
          profile.preferences.sizes[
            category
          ] || "";
      });
  }

  function saveIdentity() {
    const changes = {};

    root
      .querySelectorAll(
        "[data-forma-profile-field]"
      )
      .forEach(field => {
        changes[field.name] =
          field.value.trim();
      });

    window.Forma.profile.updateIdentity(
      changes
    );
  }

  function saveSizes() {
    root
      .querySelectorAll(
        "[data-forma-size-field]"
      )
      .forEach(field => {
        window.Forma.profile.setSize(
          field.dataset.formaSizeField,
          field.value
        );
      });
  }

  function saveCurrentStep() {
    if (currentStep === 1) {
      saveIdentity();
    }

    if (currentStep === MAX_STEP) {
      saveSizes();
    }
  }

  function next() {
    saveCurrentStep();

    if (currentStep < MAX_STEP) {
      currentStep += 1;
      updateStep();
      return;
    }

const profile =
  window.Forma.profile.completeOnboarding();

window.Forma.activity?.add(
  "onboarding_completed",
  {
    entityType: "profile",
    entityId: "current-user",
    source: "your-forma",

    metadata: {
      firstName:
        profile.identity.firstName,

      categories:
        profile.preferences.categories,

      styles:
        profile.preferences.styles
    }
  }
);

hide();

window.Forma.toast?.success(
  profile.identity.firstName
    ? `Welcome to Your Forma, ${profile.identity.firstName}`
    : "Your Forma profile is ready"
);

    window.Forma.events.emit(
      "forma:onboarding-completed",
      {
        profile
      }
    );
  }

  function back() {
    if (currentStep <= 1) return;

    saveCurrentStep();

    currentStep -= 1;
    updateStep();
  }

  function skip() {
    saveCurrentStep();
    hide();

    window.Forma.events.emit(
      "forma:onboarding-skipped",
      {
        step: currentStep
      }
    );
  }

  function handlePreferenceClick(event) {
    const button = event.target.closest(
      "[data-forma-preference-value]"
    );

    if (!button) return;

    const group = button.closest(
      "[data-forma-preference-group]"
    );

    if (!group) return;

    const preference =
      group.dataset.formaPreferenceGroup;

    const value =
      button.dataset.formaPreferenceValue;

    const profile =
      window.Forma.profile.togglePreference(
        preference,
        value
      );

    const selected =
      profile.preferences[
        preference
      ].includes(value);

    button.classList.toggle(
      "is-selected",
      selected
    );

    button.setAttribute(
      "aria-pressed",
      String(selected)
    );
  }

  nextButton?.addEventListener(
    "click",
    next
  );

  backButton?.addEventListener(
    "click",
    back
  );

  skipButton?.addEventListener(
    "click",
    skip
  );

  closeButtons.forEach(button => {
    button.addEventListener(
      "click",
      skip
    );
  });

  root.addEventListener(
    "click",
    handlePreferenceClick
  );

  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Escape" &&
        !root.hidden
      ) {
        skip();
      }
    }
  );

  hydrateFields();
  updateStep();

  if (!window.Forma.profile.isComplete()) {
    show();
  }

  window.Forma.events.on(
    "forma:onboarding-open",
    () => {
      hydrateFields();
      currentStep = 1;
      updateStep();
      show();
    }
  );
})();