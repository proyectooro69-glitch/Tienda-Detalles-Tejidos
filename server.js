// ═════════════════════════════════════════════════════════════════════════════
// FUNCIONES MEJORADAS PARA WHATSAPP Y OG TAGS
// Copiar y pegar estas funciones en tu proyecto
// ═════════════════════════════════════════════════════════════════════════════

/**
 * ✨ NUEVA FUNCIÓN
 * Convierte cualquier URL de imagen a URL absoluta
 * 
 * ¿Por qué es importante?
 * - WhatsApp necesita URLs absolutas para descargar y mostrar imágenes
 * - Las URLs relativas no funcionan con Open Graph Meta Tags
 * 
 * @param {string} imgUrl - URL de la imagen (puede ser relativa o absoluta)
 * @returns {string} - URL absoluta de la imagen
 */
function getAbsoluteImageUrl(imgUrl) {
  if (!imgUrl) return '';
  
  // Si ya es una URL absoluta, retornarla tal cual
  if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
    return imgUrl;
  }
  
  // Si es una URL relativa, construir la absoluta
  var protocol = window.location.protocol;  // http: o https:
  var host = window.location.host;           // tudominio.com o localhost:3000
  var baseUrl = protocol + '//' + host;
  
  // Si comienza con /, es relativa a la raíz del sitio
  if (imgUrl.startsWith('/')) {
    return baseUrl + imgUrl;
  }
  
  // Otro caso: construir desde la ruta actual
  var path = window.location.pathname;
  var directory = path.substring(0, path.lastIndexOf('/'));
  return baseUrl + directory + '/' + imgUrl;
}

/**
 * 🔧 FUNCIÓN MEJORADA: setOGTags(p)
 * 
 * Actualiza los Open Graph Meta Tags para que:
 * 1. WhatsApp muestre una miniatura del producto
 * 2. Facebook y otros sitios muestren la información correcta
 * 3. Twitter Card muestre los datos actualizados
 * 
 * ¡IMPORTANTE! Esta función debe ser llamada ANTES de compartir por WhatsApp
 * 
 * @param {object} p - Objeto del producto con propiedades:
 *   - nombre: string
 *   - precio: number
 *   - imagen_url: string (URL de la imagen)
 *   - descripcion: string
 */
function setOGTags(p) {
  // Validar que el producto no sea nulo
  if (!p) return;
  
  // Construir URLs base
  var base = window.location.origin + window.location.pathname;
  var prodUrl = base + (p.nombre ? '?prod=' + encodeURIComponent(p.nombre) : '');
  
  // ✨ CLAVE: Obtener URL absoluta de la imagen
  var img = p.imagen_url || '';
  var absoluteImageUrl = getAbsoluteImageUrl(img);
  
  // Construir descripción
  var desc = (p.descripcion || 'Tejido hecho a mano con amor') + 
             (p.precio ? ' — Precio: ' + p.precio : '');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Actualizar Open Graph Meta Tags (para WhatsApp y Facebook)
  // ═══════════════════════════════════════════════════════════════════════════
  document.getElementById('og-title').setAttribute('content', p.nombre + ' — Dtalles Tejidos');
  document.getElementById('og-description').setAttribute('content', desc);
  
  // ✨ IMPORTANTE: og:image con URL ABSOLUTA
  document.getElementById('og-image').setAttribute('content', absoluteImageUrl);
  
  // Para conexiones HTTPS (la mayoría de navegadores modernos)
  document.getElementById('og-image-secure').setAttribute('content', absoluteImageUrl);
  
  // URL del producto (para que WhatsApp enlace correctamente)
  document.getElementById('og-url').setAttribute('content', prodUrl);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Actualizar Twitter Card Meta Tags (para compatibilidad con Twitter/X)
  // ═══════════════════════════════════════════════════════════════════════════
  document.getElementById('tw-title').setAttribute('content', p.nombre + ' — Dtalles Tejidos');
  document.getElementById('tw-desc').setAttribute('content', desc);
  document.getElementById('tw-image').setAttribute('content', absoluteImageUrl);
  
  // Actualizar título de la página
  document.title = p.nombre + ' — Dtalles Tejidos';
  
  // 🔍 Log en consola para debugging
  console.log('✅ OG Tags actualizados:', {
    titulo: p.nombre,
    imagen: absoluteImageUrl,
    url: prodUrl,
    timestamp: new Date().toISOString()
  });
}

/**
 * 🔄 FUNCIÓN MEJORADA: resetOGTags()
 * 
 * Resetea los Open Graph Meta Tags a los valores por defecto
 * Se llama cuando se cierra el modal del producto
 */
function resetOGTags() {
  var base = window.location.origin + window.location.pathname;
  
  // Resetear Open Graph Meta Tags
  document.getElementById('og-title').setAttribute('content', 'Dtalles — Tejidos con Amor');
  document.getElementById('og-description').setAttribute('content', 'Producciones hechas a mano, con cariño para ti y los tuyos');
  document.getElementById('og-image').setAttribute('content', '');
  document.getElementById('og-image-secure').setAttribute('content', '');
  document.getElementById('og-url').setAttribute('content', base);
  
  // Resetear Twitter Card Meta Tags
  document.getElementById('tw-title').setAttribute('content', 'Dtalles — Tejidos con Amor');
  document.getElementById('tw-desc').setAttribute('content', 'Producciones hechas a mano, con cariño para ti y los tuyos');
  document.getElementById('tw-image').setAttribute('content', '');
  
  // Resetear título de la página
  document.title = 'Dtalles — Tejidos con Amor';
  
  console.log('✅ OG Tags reseteados a valores por defecto');
}

/**
 * 📱 FUNCIÓN MEJORADA: buyWA(nombre, precio, imgUrl)
 * 
 * Mejoras principales:
 * 1. Actualiza los OG Tags ANTES de abrir WhatsApp
 * 2. Construye un mensaje con formato WhatsApp (negritas, emojis)
 * 3. Incluye URL absoluta del producto
 * 4. Log detallado para debugging
 * 
 * ¡ESTA ES LA FUNCIÓN CLAVE QUE SOLUCIONA EL PROBLEMA!
 * 
 * @param {string} nombre - Nombre del producto
 * @param {number} precio - Precio del producto
 * @param {string} imgUrl - URL de la imagen del producto
 */
function buyWA(nombre, precio, imgUrl) {
  console.log('📱 Iniciando compartir por WhatsApp...', { nombre, precio });
  
  // ✨ CLAVE: Actualizar OG Tags ANTES de abrir WhatsApp
  // Esto asegura que cuando el servidor procese el compartir,
  // los meta tags ya estén con la información correcta
  if (window._modalProduct) {
    setOGTags(window._modalProduct);
    console.log('✅ OG Tags actualizados antes de compartir');
  }
  
  // Construir URLs
  var base = window.location.origin + window.location.pathname;
  var prodUrl = base + '?prod=' + encodeURIComponent(nombre || '');
  var precioFmt = formatPrecio(precio);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Construir mensaje con formato WhatsApp
  // ═══════════════════════════════════════════════════════════════════════════
  var msg = 'Hola 👋\n\n';
  msg += 'Me interesa este producto:\n';
  msg += '*' + nombre + '*';                    // ← Negritas en WhatsApp
  
  if (precioFmt) {
    msg += '\n\nPrecio: *' + precioFmt + '*';  // ← Negritas en WhatsApp
  }
  
  msg += '\n\nPuedes verlo aquí: ' + prodUrl;
  msg += '\n\n¿Podrías ayudarme? 😊';
  
  // 🔍 Log detallado para debugging
  console.log('📱 Compartiendo por WhatsApp:', {
    nombre: nombre,
    precio: precioFmt,
    imagen: imgUrl,
    urlProducto: prodUrl,
    mensaje: msg,
    timestamp: new Date().toISOString()
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Abrir WhatsApp
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Nota: Reemplaza WA_NUM con tu número de WhatsApp
  // Formato: país + número sin + ni espacios
  // Ejemplo: 50247827800 (Guatemala)
  var whatsappUrl = 'https://wa.me/' + WA_NUM + '?text=' + encodeURIComponent(msg);
  
  window.open(whatsappUrl, '_blank');
  
  console.log('✅ WhatsApp abierto:', whatsappUrl.substring(0, 50) + '...');
}

// ═════════════════════════════════════════════════════════════════════════════
// INTEGRACIÓN CON MODAL (cómo se llama buyWA)
// ═════════════════════════════════════════════════════════════════════════════

/*
Cuando abres el modal del producto, asegúrate de que en el evento onclick
del botón de WhatsApp se haga así:

// ✅ CORRECTO:
document.getElementById('mp-wa-btn').onclick = function() {
  buyWA(p.nombre, p.precio, p.imagen_url);
};

// Antes de abrir el modal:
setOGTags(p);  // ← Actualizar OG tags cuando se abre el producto

// Cuando se cierra el modal:
resetOGTags();  // ← Resetear OG tags cuando se cierra
*/

// ═════════════════════════════════════════════════════════════════════════════
// REFERENCIA RÁPIDA: Meta Tags necesarios en <head>
// ═════════════════════════════════════════════════════════════════════════════

/*

<!-- Open Graph Meta Tags (NECESARIOS para WhatsApp) -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="Dtalles — Tejidos con Amor">
<meta property="og:title" id="og-title" content="Dtalles — Tejidos con Amor">
<meta property="og:description" id="og-description" content="Producciones hechas a mano, con cariño para ti y los tuyos">

<!-- ✨ IMPORTANTE: Con URL ABSOLUTA -->
<meta property="og:image" id="og-image" content="">
<meta property="og:image:secure_url" id="og-image-secure" content="">
<meta property="og:image:type" id="og-image-type" content="image/jpeg">
<meta property="og:image:width" id="og-image-width" content="1200">
<meta property="og:image:height" id="og-image-height" content="630">

<meta property="og:url" id="og-url" content="">
<meta property="og:locale" content="es_GT">

<!-- Twitter Card Meta Tags (para compatibilidad) -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" id="tw-title" content="Dtalles — Tejidos con Amor">
<meta name="twitter:description" id="tw-desc" content="Producciones hechas a mano, con cariño para ti y los tuyos">
<meta name="twitter:image" id="tw-image" content="">

*/

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN AUXILIAR: Formatear precio (si no existe)
// ═════════════════════════════════════════════════════════════════════════════

/*
Si no tienes esta función, cópiala:

function formatPrecio(precio) {
  if (!precio) return '';
  var num = parseFloat(precio);
  return 'Q ' + num.toFixed(2);
}
*/

// ═════════════════════════════════════════════════════════════════════════════
// TESTING: Cómo verificar que funciona
// ═════════════════════════════════════════════════════════════════════════════

/*

1. En la consola del navegador (F12), ejecuta:

   // Ver la URL absoluta de la imagen actual
   document.querySelector('meta[property="og:image"]').getAttribute('content')
   
   // Debe mostrar algo como:
   // https://zkiqgciijhqizhxkryea.supabase.co/storage/v1/object/public/product-images/...
   // o
   // https://tudominio.com/images/producto.jpg

2. Para probar el compartir:
   - Abre un producto en la tienda
   - Click en "Comprar por WhatsApp"
   - En WhatsApp Web (web.whatsapp.com), verifica que la miniatura aparezca ✅

3. Para verificar con herramientas online:
   - https://www.opengraph.xyz/ - Pega tu URL del producto
   - https://www.facebook.com/sharing/debugger/ - Debugger de Facebook
   - Ambas deben mostrar la imagen del producto

*/

// ═════════════════════════════════════════════════════════════════════════════
// NOTAS IMPORTANTES
// ═════════════════════════════════════════════════════════════════════════════

/*

✅ COMPROBACIONES ANTES DE SUBIR A PRODUCCIÓN:

1. ¿Las imágenes están en una URL accesible públicamente?
   - Si usan Supabase Storage: ✅ Suelen ser públicas por defecto
   - Si usan un servidor propio: ✅ Asegurar que NO requieran autenticación

2. ¿El servidor devuelve los headers correctos?
   - Content-Type: image/jpeg (o image/png, etc)
   - Access-Control-Allow-Origin: * (si hay CORS)

3. ¿Funcionan las URLs en el navegador?
   - Abre la URL en el navegador: ¿Se ve la imagen? ✅
   - Si no se ve, el problema está en la URL o acceso

4. ¿Está correctamente formateada la URL absoluta?
   - Debe empezar con https:// (no http://)
   - No debe tener espacios
   - No debe tener caracteres especiales sin encode

5. ¿Los meta tags se actualizan correctamente?
   - Abre DevTools (F12) → Elements → Search "og-image"
   - Verifica que content="" tenga la URL correcta ✅

*/
