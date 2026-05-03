/**
 * ═══════════════════════════════════════════════════════════════
 * currency-integration.js — Integración Fija (Solo CUP)
 * ═══════════════════════════════════════════════════════════════
 */

window.currencyManager = null;

async function initCurrencySystem() {
  // Inicializamos el gestor (que ya viene fijo en CUP por el otro archivo)
  window.currencyManager = new CurrencyManager();

  // Llamamos a la actualización inicial de precios
  updateAllPrices();
  updateProductCard();
  
  // Sobrescribimos la función de WhatsApp para que use el formato nuevo
  overrideBuyWAFunction();

  console.log('✅ Sistema de tienda en CUP inicializado correctamente');
}

/**
 * Función vacía para que NO aparezca el selector en pantalla
 */
function createCurrencySelector() {
  const existing = document.getElementById('currency-selector-container');
  if (existing) existing.remove();
  console.log('Selector visual ocultado para evitar confusión del cliente.');
}

function updateAllPrices() {
  // Actualizar todos los elementos que tengan el atributo de precio
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

/**
 * Asegura que el mensaje de WhatsApp diga el precio en CUP exactamente
 */
function overrideBuyWAFunction() {
  if (!window.buyWA) return;

  const originalBuyWA = window.buyWA;

  window.buyWA = function(nombre, precio, imagenUrl) {
    const precioFormateado = window.currencyManager.formatPrice(precio);

    // Mensaje limpio sin referencias a otras monedas
    const mensaje = `Hola, me interesa este producto: ${nombre}. Precio: ${precioFormateado}. Puedes verlo aquí: ` + 
                    `${window.location.origin}?prod=${encodeURIComponent(nombre)}`;

    const encoded = encodeURIComponent(mensaje);
    // IMPORTANTE: Asegúrate de que tu número de WhatsApp esté configurado en tu archivo principal
    const whatsappNumber = window.whatsappNumber || '535XXXXXXX'; 
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encoded}`;
    
    window.open(whatsappUrl, '_blank');
  };
}

/**
 * Hook para productos cargados dinámicamente desde Supabase
 */
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

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCurrencySystem);
} else {
  initCurrencySystem();
}

console.log('✅ Integración de precios completa y sin recortes');
