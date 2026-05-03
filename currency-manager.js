/**
 * CurrencyManager — Versión Fija en CUP para Dtalles Tejidos
 */

class CurrencyManager {
  constructor(config = {}) {
    this.storageKey = 'dtalles_currency_prefs';
    
    // Solo dejamos CUP como moneda activa
    this.currencies = {
      CUP: { name: 'Peso Cubano', symbol: 'cup', type: 'FIAT' }
    };
    
    this.activeCurrencies = ['CUP'];
    // Forzamos CUP siempre
    this.currentCurrency = 'CUP';
    
    // Tasas de cambio: 1 a 1 para que no multiplique nada
    this.rates = { 'CUP': 1.0, 'USD': 1.0 };
    this.lastUpdate = Date.now();
    this.listeners = [];
  }

  // Carga siempre CUP por defecto
  loadPreference() { return 'CUP'; }
  savePreference() { /* No es necesario guardar nada */ }
  async loadRates() { return this.rates; }

  setCurrency(currencyCode) {
    this.currentCurrency = 'CUP';
    return true;
  }

  // Función de conversión simplificada: devuelve el mismo número que recibe
  convert(amount) {
    return amount; 
  }

  // Formatea el precio: "3800 cup"
  formatPrice(amount) {
    if (!amount) return "0.00 cup";
    const formatted = new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    
    return `${formatted} cup`;
  }

  getSymbol() { return 'cup'; }
  getName() { return 'Peso Cubano'; }

  onChange(callback) {
    if (typeof callback === 'function') this.listeners.push(callback);
  }

  notifyListeners(event, data) {
    this.listeners.forEach(l => l(event, data));
  }

  getState() {
    return { currentCurrency: 'CUP', rates: this.rates };
  }
}
