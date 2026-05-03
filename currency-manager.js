class CurrencyManager {
  constructor(config = {}) {
    this.storageKey = 'dtalles_currency_prefs';
    this.currencies = {
      CUP: { name: 'Peso Cubano', symbol: 'cup', type: 'FIAT' }
    };
    this.activeCurrencies = ['CUP'];
    this.currentCurrency = 'CUP';
    this.rates = { 'CUP': 1.0, 'USD': 1.0 }; 
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

  convert(amount) { return amount; }

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
  getAvailableCurrencies() { return [{ code: 'CUP', name: 'Peso Cubano', symbol: 'cup' }]; }

  onChange(callback) { if (typeof callback === 'function') this.listeners.push(callback); }

  notifyListeners(event, data) {
    this.listeners.forEach(l => { try { l(event, data); } catch (e) { console.error(e); } });
  }

  getState() { return { currentCurrency: 'CUP', rates: this.rates }; }
}
