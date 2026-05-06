class CurrencyManager {
  constructor() {
    this.currentCurrency = 'CUP';
    this.currencies = { CUP: { symbol: 'cup' } };
  }
  loadPreference() { return 'CUP'; }
  savePreference() { }
  async loadRates() { return { CUP: 1.0 }; }
  setCurrency() { return true; }
  convert(amount) { return amount; }
  formatPrice(amount) {
    if (!amount) return "0,00 cup";
    // Formato: 3.800,00
    const num = new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
    return `${num} cup`;
  }
  getSymbol() { return 'cup'; }
  getAvailableCurrencies() { return [{ code: 'CUP', symbol: 'cup' }]; }
  onChange() { }
  getState() { return { currentCurrency: 'CUP' }; }
}
