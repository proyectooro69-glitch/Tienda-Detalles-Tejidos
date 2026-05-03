async function initCurrencySystem() {
  window.currencyManager = new CurrencyManager();
  
  // ELIMINAR EL SELECTOR SIEMPRE
  const selector = document.getElementById('currency-selector-container');
  if (selector) selector.remove();

  updateAllPrices();
  console.log("--- TIENDA EN MODO SOLO CUP ---");
}

function createCurrencySelector() { 
  // Función vacía para que no se cree el botón de USD
  return; 
}

function updateAllPrices() {
  document.querySelectorAll('[data-product-price]').forEach(el => {
    const p = parseFloat(el.getAttribute('data-product-price'));
    if (!isNaN(p)) el.textContent = window.currencyManager.formatPrice(p);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCurrencySystem);
} else {
  initCurrencySystem();
}
