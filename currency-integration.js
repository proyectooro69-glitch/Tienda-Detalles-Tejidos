/**
 * ═══════════════════════════════════════════════════════════════
 * currency-integration.js
 * ═══════════════════════════════════════════════════════════════
 * Integración del gestor de divisas con la tienda Dtalles
 * 
 * Este archivo debe añadirse DESPUÉS de cargar currency-manager.js
 * en el HTML: <script src="currency-manager.js"></script>
 *            <script src="currency-integration.js"></script>
 */

// Instancia global del gestor de divisas
window.currencyManager = null;

/**
 * Inicializa el sistema de divisas
 */
async function initCurrencySystem() {
  // Crear instancia del gestor
  window.currencyManager = new CurrencyManager({
    baseUrl: '/api/exchange-rates',
    cacheDuration: 3600, // 1 hora
  });

  // Esperar a que se carguen las tasas
  await window.currencyManager.loadRates();

  // Crear y insertar selector de divisas en la UI
  createCurrencySelector();

  // Configurar listener para cambios de divisa
  window.currencyManager.onChange((event, data) => {
    if (event === 'currencyChanged') {
      updateAllPrices();
      updateProductCard();
      updateMessagePreview();
    }
  });

  console.log('✅ Sistema de divisas inicializado:', window.currencyManager.getState());
}

/**
 * Crea el selector de divisas en el UI
 */
function createCurrencySelector() {
  // Buscar donde insertar (después del header o en la navbar)
  let container = document.querySelector('.navbar') || 
                  document.querySelector('header') ||
                  document.body.firstChild;

  const selectorHTML = `
    <div id="currency-selector-container" style="
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      background: rgba(8, 8, 10, 0.95);
      border: 2px solid var(--gold);
      border-radius: 12px;
      padding: 0;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    ">
      <select id="currency-selector" style="
        background: transparent;
        border: none;
        color: var(--gold);
        padding: 10px 15px;
        font-family: 'Poppins', sans-serif;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        outline: none;
        min-width: 120px;
      ">
        <option value="USD" selected>$ USD</option>
        <option value="EUR">€ EUR</option>
        <option value="CUP">₱ CUP</option>
        <option value="USDC">USDC</option>
      </select>
    </div>
  `;

  // Insertar selector
  if (!document.getElementById('currency-selector-container')) {
    document.body.insertAdjacentHTML('afterbegin', selectorHTML);

    // Establecer valor actual
    const selector = document.getElementById('currency-selector');
    selector.value = window.currencyManager.currentCurrency;

    // Listener para cambios
    selector.addEventListener('change', (e) => {
      window.currencyManager.setCurrency(e.target.value);
    });
  }
}

/**
 * Actualiza todos los precios en la página
 */
function updateAllPrices() {
  // Actualizar precios en tarjetas de productos (grid)
  document.querySelectorAll('[data-product-price]').forEach(el => {
    const priceUsd = parseFloat(el.getAttribute('data-product-price'));
    if (!isNaN(priceUsd)) {
      el.textContent = window.currencyManager.formatPrice(priceUsd);
    }
  });

  // Actualizar precios en detalles de producto
  document.querySelectorAll('[data-price-amount]').forEach(el => {
    const priceUsd = parseFloat(el.getAttribute('data-price-amount'));
    if (!isNaN(priceUsd)) {
      el.textContent = window.currencyManager.formatPrice(priceUsd);
    }
  });

  // Actualizar símbolo de divisa global
  updateCurrencySymbols();
}

/**
 * Actualiza los símbolos de divisa en toda la página
 */
function updateCurrencySymbols() {
  const symbol = window.currencyManager.getSymbol();
  const currencyName = window.currencyManager.getName();

  // Actualizar atributos data
  document.querySelectorAll('[data-currency-symbol]').forEach(el => {
    el.textContent = symbol;
  });

  document.querySelectorAll('[data-currency-name]').forEach(el => {
    el.textContent = currencyName;
  });
}

/**
 * Actualiza la tarjeta de producto detallado (modal/panel)
 */
function updateProductCard() {
  const priceElement = document.querySelector('[data-modal-price]');
  if (priceElement) {
    const priceUsd = parseFloat(priceElement.getAttribute('data-modal-price'));
    if (!isNaN(priceUsd)) {
      priceElement.textContent = window.currencyManager.formatPrice(priceUsd);
    }
  }
}

/**
 * Actualiza la vista previa del mensaje de WhatsApp
 * (muestra el precio en la divisa actual)
 */
function updateMessagePreview() {
  // Buscar el mensaje de WhatsApp que se está constructo
  const previewElement = document.querySelector('[data-wa-message-preview]');
  if (previewElement && window.lastProductData) {
    const { nombre, precio } = window.lastProductData;
    const formattedPrice = window.currencyManager.formatPrice(precio);
    const newMessage = `Hola, me interesa este producto: ${nombre}. Precio: ${formattedPrice}`;
    previewElement.textContent = newMessage;
  }
}

/**
 * Sobrescribe la función de compra por WhatsApp para incluir precio en divisa actual
 * (Compatible con la función buyWA existente)
 */
function overrideBuyWAFunction() {
  if (!window.buyWA) return;

  const originalBuyWA = window.buyWA;

  window.buyWA = function(nombre, precio, imagenUrl) {
    // Convertir precio a divisa actual
    const precioEnDivisaActual = window.currencyManager.convert(precio, 'USD');
    const precioFormateado = window.currencyManager.formatPrice(precio);
    const symbolo = window.currencyManager.getSymbol();

    // Construir mensaje con la divisa actual
    const mensaje = `Hola, me interesa este producto: ${nombre}. Precio: ${precioFormateado}. Puedes verlo aquí: ` + 
                    `${window.location.origin}?prod=${encodeURIComponent(nombre)}&img=${encodeURIComponent(imagenUrl || '')}`;

    // Guardar datos del producto para actualizar preview
    window.lastProductData = { nombre, precio };

    // Codificar y redirigir a WhatsApp
    const encoded = encodeURIComponent(mensaje);
    const whatsappNumber = '1234567890'; // Reemplazar con el número real
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encoded}`;
    
    window.open(whatsappUrl, '_blank');
  };
}

/**
 * Mejora los Open Graph tags al compartir en WhatsApp
 * Asegura que incluyan la moneda actual
 */
function updateOGTags() {
  const precio = window.lastProductData?.precio || 0;
  const precioFormateado = window.currencyManager.formatPrice(precio);

  // Actualizar og:description para incluir el precio actual
  const descElement = document.getElementById('og-description');
  if (descElement) {
    const currentDesc = descElement.getAttribute('content');
    const updatedDesc = currentDesc.includes('Precio:') 
      ? currentDesc.replace(/Precio:.*/, `Precio: ${precioFormateado}`)
      : `${currentDesc}. Precio: ${precioFormateado}`;
    descElement.setAttribute('content', updatedDesc);
  }
}

/**
 * Hook para actualizar precios cuando se cargan productos desde Supabase
 * Llama a esta función después de renderizar productos
 */
window.applyPricingToProducts = function(products) {
  if (!window.currencyManager) return;

  products.forEach(product => {
    // Buscar elemento del producto
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

/**
 * Inicialización automática cuando el DOM está listo
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCurrencySystem);
} else {
  initCurrencySystem();
}

// Exportar para uso manual
window.CurrencyIntegration = {
  updateAllPrices,
  updateProductCard,
  createCurrencySelector,
  updateOGTags,
  applyPricingToProducts,
};

console.log('✅ Currency integration script loaded');
