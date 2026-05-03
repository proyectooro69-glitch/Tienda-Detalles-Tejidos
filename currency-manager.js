/**
 * ═══════════════════════════════════════════════════════════════
 * CurrencyManager — Versión Fija en CUP (Sin conversiones)
 * ═══════════════════════════════════════════════════════════════
 */

class CurrencyManager {
  constructor(config = {}) {
    this.storageKey = 'dtalles_currency_prefs';
    
    // Definimos solo CUP para que no exista otra opción
    this.currencies = {
      CUP: { name: 'Peso Cubano', symbol: 'cup', type: 'FIAT' }
    };
    
    this.activeCurrencies = ['CUP'];
    this.currentCurrency = 'CUP'; // Forzamos CUP desde el inicio
    this.rates = { 'CUP': 1.0, 'USD': 1.0 }; 
    this.lastUpdate = Date.now();
    this.listeners = [];
  }

  loadPreference() { return 'CUP'; }
  savePreference() { }
  async loadRates() { return this.rates; }

  setCurrency(currencyCode) {
    this.currentCurrency = 'CUP';
    this.notifyListeners('currencyChanged', { currency: 'CUP', symbol: 'cup' });
    return true;
  }

  // Devuelve el número exacto que pongas en el administrador
  convert(amount) {
    return amount; 
  }

  // Formato profesional: "3.800,00 cup"
  formatPrice(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return "0,00 cup";
    
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
    this.listeners.forEach(l => {
      try { l(event, data); } catch (e) { console.error(e); }
    });
  }

  getState() {
    return { currentCurrency: 'CUP', rates: this.rates };
  }
}
console.log('✅ Gestor CUP cargado.');
