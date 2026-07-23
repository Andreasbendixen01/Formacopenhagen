/* ==========================================================
   FORMA — PRODUCT TRACKER
   ========================================================== */

(function () {
  "use strict";

  if (!window.Forma?.recentlyViewed) return;

  const data = window.formaProduct;

  if (!data?.id) return;

  window.Forma.recentlyViewed.add(data);

})();