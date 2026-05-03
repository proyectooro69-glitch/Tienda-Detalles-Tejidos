/**
 * ═══════════════════════════════════════════════════════════════
 * CurrencyManager — Gestor de Divisas para Dtalles Tejidos
 * ═══════════════════════════════════════════════════════════════
 * Características:
 * - Cambio dinámico de divisas
 * - Caché de tasas de cambio
 * - Persistencia en localStorage
 * - Soporte para USD, EUR, CUP, USDC
 */

class CurrencyManager {
  constructor(config = {}) {
    // Configuración
    this.baseUrl = config.baseUrl || '/api/exchange-rates';
    this.storageKey = 'dtalles_currency_prefs';
    this.cacheDurationMs = (config.cacheDuration || 3600) * 1000; // 1 hora por defecto
    
    // Estado
    this.currencies = {
      USD: { name: 'Dólar Estadounidense', symbol: '$', type: 'FIAT' },
      EUR: { name: 'Euro', symbol: '€', type: 'FIAT' },
      CUP: { name: 'Peso Cubano', symbol: '₱', type: 'FIAT' },
      USDC: { name: 'USD Coin', symbol: 'USDC', type: 'CRYPTO' }
    };
    
    this.activeCurrencies = ['USD', 'EUR', 'CUP', 'USDC'];
    this.currentCurrency = this.loadPreference();
    this.rates = {};
    this.lastUpdate = 0;
    this.listeners = [];
    
    // Cargar tasas al inicializar
    this.loadRates();
  }

  /**
   * Carga la preferencia de divisa guardada en localStorage
   */
  loadPreference() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const { currency } = JSON.parse(saved);
        return (currency && this.currencies[currency]) ? currency : 'USD';
      }
    } catch (e) {
      console.warn('Error loading currency preference:', e);
    }
    return 'USD';
  }

  /**
   * Guarda la preferencia de divisa en localStorage
   */
  savePreference() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        currency: this.currentCurrency,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('Error saving currency preference:', e);
    }
  }

  /**
   * Carga las tasas de cambio desde el servidor
   */
  async loadRates() {
    const now = Date.now();
    
    // Usar caché si es válido
    if (this.lastUpdate && (now - this.lastUpdate) < this.cacheDurationMs) {
      return this.rates;
    }

    try {
      const response = await fetch(this.baseUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      this.rates = data.rates || {};
      this.lastUpdate = now;
      
      this.notifyListeners('ratesUpdated', this.rates);
      return this.rates;
    } catch (error) {
      console.error('Error loading exchange rates:', error);
      
      // Usar tasas de respaldo si falla la carga
      this.rates = this.getDefaultRates();
      return this.rates;
    }
  }

  /**
   * Tasas de cambio por defecto (fallback)
   */
  getDefaultRates() {
    return {
      'USD': 1.0,
      'EUR': 0.92,
      'CUP': 24.0,
      'USDC': 1.0,
    };
  }

  /**
   * Establece la divisa actual y notifica cambios
   */
  setCurrency(currencyCode) {
    if (!this.currencies[currencyCode]) {
      console.warn(`Currency ${currencyCode} not supported`);
      return false;
    }

    if (this.currentCurrency === currencyCode) return true;

    this.currentCurrency = currencyCode;
    this.savePreference();
    this.notifyListeners('currencyChanged', { 
      currency: currencyCode,
      symbol: this.currencies[currencyCode].symbol
    });
    
    return true;
  }

  /**
   * Convierte un precio de una moneda a otra
   * @param {number} amount - Cantidad en moneda de origen
   * @param {string} fromCurrency - Código de moneda origen (default: USD)
   * @param {string} toCurrency - Código de moneda destino (default: this.currentCurrency)
   */
  convert(amount, fromCurrency = 'USD', toCurrency = null) {
    if (!amount || amount < 0) return 0;
    
    toCurrency = toCurrency || this.currentCurrency;
    
    if (fromCurrency === toCurrency) return amount;
    
    const fromRate = this.rates[fromCurrency] || 1;
    const toRate = this.rates[toCurrency] || 1;
    
    if (!fromRate || !toRate) {
      console.warn(`Exchange rate not available for ${fromCurrency} or ${toCurrency}`);
      return amount;
    }

    // Convertir a USD primero, luego a la moneda destino
    const inUsd = amount / fromRate;
    return inUsd * toRate;
  }

  /**
   * Formatea un precio con la divisa actual
   */
  formatPrice(amount, currencyCode = null) {
    const currency = currencyCode || this.currentCurrency;
    const symbol = this.currencies[currency]?.symbol || '$';
    const converted = this.convert(amount, 'USD', currency);
    
    // Formato: $ 99.99 o USDC 99.99
    const formatted = this.formatNumber(converted);
    
    // Para criptomonedas, mostrar símbolo al final
    if (this.currencies[currency]?.type === 'CRYPTO') {
      return `${formatted} ${symbol}`;
    }
    
    return `${symbol} ${formatted}`;
  }

  /**
   * Formatea un número con decimales apropiados
   */
  formatNumber(value) {
    // Para criptomonedas, mostrar más decimales
    const decimals = this.currentCurrency === 'USDC' ? 2 : 2;
    
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  /**
   * Obtiene el símbolo de la divisa
   */
  getSymbol(currencyCode = null) {
    const currency = currencyCode || this.currentCurrency;
    return this.currencies[currency]?.symbol || '$';
  }

  /**
   * Obtiene el nombre de la divisa
   */
  getName(currencyCode = null) {
    const currency = currencyCode || this.currentCurrency;
    return this.currencies[currency]?.name || currency;
  }

  /**
   * Obtiene todas las divisas disponibles
   */
  getAvailableCurrencies() {
    return this.activeCurrencies.map(code => ({
      code,
      name: this.currencies[code].name,
      symbol: this.currencies[code].symbol,
      type: this.currencies[code].type,
    }));
  }

  /**
   * Registra un listener para cambios
   */
  onChange(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  /**
   * Notifica a los listeners
   */
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (e) {
        console.error('Error in currency listener:', e);
      }
    });
  }

  /**
   * Actualiza manualmente las tasas (para admin)
   */
  async updateRates(newRates) {
    this.rates = { ...this.rates, ...newRates };
    this.lastUpdate = Date.now();
    this.notifyListeners('ratesUpdated', this.rates);
  }

  /**
   * Obtiene el estado actual del gestor
   */
  getState() {
    return {
      currentCurrency: this.currentCurrency,
      rates: this.rates,
      lastUpdate: new Date(this.lastUpdate),
      availableCurrencies: this.getAvailableCurrencies(),
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// Ejemplo de uso en el HTML:
// ═══════════════════════════════════════════════════════════════
/*

// Inicializar
const currency = new CurrencyManager();

// Cambiar divisa
currency.setCurrency('EUR');

// Convertir precios
const priceInEur = currency.convert(50, 'USD', 'EUR');
const formatted = currency.formatPrice(50); // Usa la divisa actual

// Observar cambios
currency.onChange((event, data) => {
  if (event === 'currencyChanged') {
    console.log('Nueva divisa:', data.currency);
    // Actualizar UI
    document.querySelectorAll('[data-price]').forEach(el => {
      const priceUsd = parseFloat(el.getAttribute('data-price'));
      el.textContent = currency.formatPrice(priceUsd);
    });
  }
});

// Crear selector en HTML
const selector = document.createElement('select');
selector.id = 'currency-selector';
selector.innerHTML = currency.getAvailableCurrencies()
  .map(c => `<option value="${c.code}">${c.symbol} ${c.code}</option>`)
  .join('');
selector.value = currency.currentCurrency;
selector.addEventListener('change', (e) => currency.setCurrency(e.target.value));
document.body.appendChild(selector);

*/
