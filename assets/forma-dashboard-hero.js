/* ==========================================================
   FORMA — PERSONAL DASHBOARD HERO
   ========================================================== */

(() => {
  const hero = document.querySelector(
    "[data-forma-dashboard-hero]"
  );

  if (!hero) return;

  const greetingElement = hero.querySelector(
    "[data-forma-hero-greeting]"
  );

  const messageElement = hero.querySelector(
    "[data-forma-hero-message]"
  );

  const contextElement = hero.querySelector(
    "[data-forma-hero-context]"
  );

  const getActivities = () => {
    try {
      if (window.Forma?.activity?.getAll) {
        return window.Forma.activity.getAll();
      }

      return [];
    } catch (error) {
      console.warn(
        "Forma dashboard could not read activities.",
        error
      );

      return [];
    }
  };

  const getSavedCount = () => {
    try {
      if (window.Forma?.getSavedProducts) {
        return window.Forma.getSavedProducts().length;
      }

      if (window.Forma?.count) {
        return window.Forma.count();
      }

      return 0;
    } catch {
      return 0;
    }
  };

  const getFollowedCount = () => {
    try {
      if (window.Forma?.followedBrands?.getAll) {
        return window.Forma.followedBrands.getAll().length;
      }

      return 0;
    } catch {
      return 0;
    }
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 5) {
      return "Good night";
    }

    if (hour < 12) {
      return "Good morning";
    }

    if (hour < 18) {
      return "Good afternoon";
    }

    return "Good evening";
  };

  const getHeroContent = () => {
    const activities = getActivities();
    const savedCount = getSavedCount();
    const followedCount = getFollowedCount();

    if (!activities.length) {
      return {
        message: "Let’s begin building your personal Forma.",
        context: "Explore. Save. Follow. Discover."
      };
    }

    if (savedCount >= 25) {
      return {
        message: "You’ve built a collection shaped entirely by your taste.",
        context: `${savedCount} products saved`
      };
    }

    if (followedCount >= 8) {
      return {
        message: "Stay close to the brands that define your world.",
        context: `${followedCount} brands followed`
      };
    }

    const latestActivity = activities[0];

    if (latestActivity?.type === "product_viewed") {
      return {
        message: "Continue exploring what recently caught your eye.",
        context: "Your latest discoveries are waiting"
      };
    }

    if (latestActivity?.type === "product_saved") {
      return {
        message: "A considered collection, built one discovery at a time.",
        context: "Curated by your journey"
      };
    }

    if (latestActivity?.type === "brand_followed") {
      return {
        message: "Discover what’s new from the brands you follow.",
        context: "Your network is taking shape"
      };
    }

    return {
      message: "Your personal world of design, fashion and places.",
      context: "Curated by your journey"
    };
  };

  const render = () => {
    const content = getHeroContent();

    if (greetingElement) {
      greetingElement.textContent = getTimeGreeting();
    }

    if (messageElement) {
      messageElement.textContent = content.message;
    }

    if (contextElement) {
      contextElement.textContent = content.context;
    }
  };

  render();

  window.addEventListener(
    "forma:activity-updated",
    render
  );

  window.addEventListener(
    "forma:saved-updated",
    render
  );

  window.addEventListener(
    "forma:followed-brands-updated",
    render
  );
})();