/**
 * ═══════════════════════════════════════════════════════════════
 * CurrencyManager — Versión Simplificada (Solo CUP)
 * ═══════════════════════════════════════════════════════════════
 */

class CurrencyManager {
  constructor(config = {}) {
    this.storageKey = 'dtalles_currency_prefs';
    
    // Definimos solo CUP como moneda disponible
    this.currencies = {
      CUP: { name: 'Peso Cubano', symbol: 'cup', type: 'FIAT' }
    };
    
    this.activeCurrencies = ['CUP'];
    this.currentCurrency = 'CUP';
    this.rates = { 'CUP': 1.0, 'USD': 1.0 }; // Tasa 1:1 para que el número no cambie
    this.lastUpdate = Date.now();
    this.listeners = [];
  }

  // Siempre devuelve CUP independientemente de lo guardado
  loadPreference() {
    return 'CUP';
  }

  savePreference() {
    // No hace falta guardar cambios ya que es fija
  }

  async loadRates() {
    // No necesita consultar APIs externas, usa tasa fija 1:1
    return this.rates;
  }

  setCurrency(currencyCode) {
    // Bloqueamos cualquier cambio, siempre será CUP
    this.currentCurrency = 'CUP';
    this.notifyListeners('currencyChanged', { 
      currency: 'CUP',
      symbol: 'cup'
    });
    return true;
  }

  /**
   * Devuelve el mismo número que recibe (sin multiplicar por 125)
   */
  convert(amount) {
    return amount; 
  }

  /**
   * Formatea el precio con dos decimales y la palabra "cup" al final
   */
  formatPrice(amount) {
    if (amount === null || amount === undefined) return "0,00 cup";
    
    const formatted = new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    
    return `${formatted} cup`;
  }

  formatNumber(value) {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  getSymbol() {
    return 'cup';
  }

  getName() {
    return 'Peso Cubano';
  }

  getAvailableCurrencies() {
    return [{ code: 'CUP', name: 'Peso Cubano', symbol: 'cup', type: 'FIAT' }];
  }

  onChange(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (e) {
        console.error('Error en listener:', e);
      }
    });
  }

  getState() {
    return {
      currentCurrency: 'CUP',
      rates: this.rates,
      availableCurrencies: this.getAvailableCurrencies(),
    };
  }
}

console.log('✅ Gestor de moneda fija (CUP) cargado sin recortes');
