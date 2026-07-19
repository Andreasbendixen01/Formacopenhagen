/* ==========================================================
   FORMA CORE
   ========================================================== */

window.Forma = (() => {

  const STORAGE_KEY = "forma_saved_products";

  function getSavedProducts() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  }

  function saveProducts(products) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    document.dispatchEvent(new CustomEvent("forma:saved-updated"));
  }

  function isSaved(productId) {
    return getSavedProducts().some(
     product => product.id === productId
    );
    }

  function toggle(productId, productHandle) {
  let products = getSavedProducts();
  const existingIndex = products.findIndex(
    product => product.id === productId
  );

  if (existingIndex > -1) {
    products.splice(existingIndex, 1);
  } else {

    products.push({
      id: productId,
      handle: productHandle
    });
  }

  saveProducts(products);
  return products.some(product => product.id === productId);
}

  function count() {
    return getSavedProducts().length;
  }

  return {
    toggle,
    isSaved,
    count,
    getSavedProducts
  };

})();