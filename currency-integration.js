// FUERZA BRUTA: ESTO DEBE BORRAR EL SELECTOR APENAS CARGUE
document.addEventListener('DOMContentLoaded', () => {
    console.log("!!! CARGANDO NUEVO SISTEMA SOLO CUP !!!");
    
    // 1. Borrar el selector visual por si acaso
    const interval = setInterval(() => {
        const selector = document.getElementById('currency-selector-container');
        if (selector) {
            selector.remove();
            console.log("Selector eliminado con éxito");
            clearInterval(interval);
        }
    }, 100);

    // 2. Forzar precios a CUP
    const update = () => {
        document.querySelectorAll('[data-product-price]').forEach(el => {
            let p = el.getAttribute('data-product-price');
            // Limpiar el texto por si tiene "cup" escrito en la DB
            p = p.replace(/[^0-9.]/g, ''); 
            const price = parseFloat(p);
            if (!isNaN(price)) {
                el.textContent = new Intl.NumberFormat('es-ES', {
                    minimumFractionDigits: 2
                }).format(price) + " cup";
            }
        });
    };

    update();
    setTimeout(update, 2000); // Re-intentar por si Supabase tarda
});
