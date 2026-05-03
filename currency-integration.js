/**
 * ═══════════════════════════════════════════════════════════════
 * currency-integration.js — Integración Limpia (Solo CUP)
 * ═══════════════════════════════════════════════════════════════
 */

window.currencyManager = null;

async function initCurrencySystem() {
  window.currencyManager = new CurrencyManager();
  
  // Forzamos la actualización de toda la interfaz
  updateAllPrices();
  updateProductCard();
  
  // Ocultamos cualquier selector que haya quedado
  const selector = document.getElementById('currency-selector-container');
  if (selector) selector.style.display = 'none';

  console.log('✅ Tienda fijada en CUP.');
}

// Dejamos esta función vacía para que NO cree el botoncito arriba a la derecha
function createCurrencySelector() {
  console.log('Selector desactivado para mayor profesionalidad.');
}

function updateAllPrices() {
  document.querySelectorAll('[data-product-price]').forEach(el => {
    const price = parseFloat(el.getAttribute('data-product-price'));
    if (!isNaN(price)) {
      el.textContent = window.currencyManager.formatPrice(price);
    }
  });

  document.querySelectorAll('[data-price-amount]').forEach(el => {
    const price = parseFloat(el.getAttribute('data-price-amount'));
    if (!isNaN(price)) {
      el.textContent = window.currencyManager.formatPrice(price);
    }
  });
}

function updateProductCard() {
  const priceElement = document.querySelector('[data-modal-price]');
  if (priceElement) {
    const price = parseFloat(priceElement.getAttribute('data-modal-price'));
    if (!isNaN(price)) {
      priceElement.textContent = window.currencyManager.formatPrice(price);
    }
  }
}

// Hook para Supabase
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
