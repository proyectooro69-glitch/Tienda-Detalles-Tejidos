window.currencyManager = null;

async function initCurrencySystem() {
  window.currencyManager = new CurrencyManager();
  
  // OCULTAR EL SELECTOR SIEMPRE
  const selector = document.getElementById('currency-selector-container');
  if (selector) {
    selector.style.display = 'none';
    selector.remove(); // Lo eliminamos del mapa
  }

  updateAllPrices();
  console.log('✅ Tienda fijada en CUP y selector eliminado.');
}

// Función vacía para que no se cree el botón de USD
function createCurrencySelector() {
  console.log('El selector de divisas ha sido desactivado.');
}

function updateAllPrices() {
  document.querySelectorAll('[data-product-price]').forEach(el => {
    const price = parseFloat(el.getAttribute('data-product-price'));
    if (!isNaN(price)) el.textContent = window.currencyManager.formatPrice(price);
  });
}

window.applyPricingToProducts = function(products) {
  if (!window.currencyManager) return;
  products.forEach(product => {
    const el = document.querySelector(`[data-product-id="${product.id}"]`);
    if (el) {
      const priceEl = el.querySelector('[data-product-price]');
      if (priceEl) {
        priceEl.setAttribute('data-product-price', product.precio);
        priceEl.textContent = window.currencyManager.formatPrice(product.precio);
      }
    }
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCurrencySystem);
} else {
  initCurrencySystem();
}
