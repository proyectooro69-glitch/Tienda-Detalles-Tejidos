// ════════════════════════════════════════════════════════════════
// FUNCIÓN SERVERLESS DE STORMKIT — VISTA PREVIA DE WHATSAPP
// ════════════════════════════════════════════════════════════════
// Vive en la carpeta `api` configurada en Stormkit, como "producto.js".
// Se accede como: /api/producto?nombre=NombreDelProducto
//
// A diferencia de la versión de Netlify, esta NO intenta adivinar si
// quien visita es un bot o una persona. Simplemente:
//   1. Siempre busca los datos del producto en Supabase.
//   2. Siempre devuelve un HTML con las meta tags correctas (para que
//      WhatsApp/Facebook las lean sin importar quién sea).
//   3. Si es una persona real (que sí ejecuta JavaScript), la manda
//      automáticamente y al instante a la tienda real.
// Esto evita por completo el problema de "detectar bots" que causó
// tantas vueltas en Netlify.
// ════════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://zkiqgciijhqizhxkryea.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpraXFnY2lpamhxaXpoeGtyeWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk1MTMzMjcsImV4cCI6MTk5MjA4OTMyN30.Tq8TdmNP1mKtvgYmfLxE1Q7RIpFhxlMqXJBfFKLlr5g';

// ⚠️ CAMBIA ESTO si tu URL final de Stormkit es distinta:
const SITE_URL = 'https://tiendadtalles-tejidos.stormkit.dev';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async (req, res) => {
  const url = new URL(req.url, SITE_URL);
  const nombre = url.searchParams.get('nombre') || '';

  let ogTitle = 'Dtalles — Tejidos con Amor';
  let ogDesc = 'Producciones hechas a mano, con cariño para ti y los tuyos';
  let ogImage = '';
  let redirectUrl = SITE_URL + '/';

  if (nombre) {
    redirectUrl = `${SITE_URL}/?prod=${encodeURIComponent(nombre)}`;

    // Como aquí solo hay UNA llamada (no dos en paralelo, como en Netlify),
    // le damos más margen: 6 segundos, para cubrir el "arranque en frío"
    // de las funciones serverless de Stormkit.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const query = `${SUPABASE_URL}/rest/v1/productos?nombre=eq.${encodeURIComponent(nombre)}&select=nombre,imagen_url,descripcion,precio`;
      const resp = await fetch(query, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        },
        signal: controller.signal
      });

      if (resp.ok) {
        const data = await resp.json();
        const product = Array.isArray(data) ? data[0] : null;

        if (product) {
          ogTitle = `${product.nombre} — Dtalles Tejidos`;
          ogDesc = (product.descripcion || 'Tejido hecho a mano con amor') +
                   (product.precio ? ` — Precio: ${product.precio}` : '');
          ogImage = product.imagen_url || '';
          if (ogImage && !ogImage.startsWith('http')) {
            ogImage = `${SUPABASE_URL}${ogImage}`;
          }
        }
      }
    } catch (err) {
      // Si Supabase falla o tarda demasiado, igual seguimos: se muestra
      // el título/desc por defecto y se redirige normal a la tienda.
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta property="og:title" content="${escapeHtml(ogTitle)}">
<meta property="og:description" content="${escapeHtml(ogDesc)}">
<meta property="og:image" content="${escapeHtml(ogImage)}">
<meta property="og:image:secure_url" content="${escapeHtml(ogImage)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${escapeHtml(url.href)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(ogTitle)}">
<meta name="twitter:description" content="${escapeHtml(ogDesc)}">
<meta name="twitter:image" content="${escapeHtml(ogImage)}">
<title>${escapeHtml(ogTitle)}</title>
<script>window.location.replace(${JSON.stringify(redirectUrl)});</script>
</head>
<body>
<p>Redirigiendo a <a href="${escapeHtml(redirectUrl)}">${escapeHtml(ogTitle)}</a>…</p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.writeHead(200);
  res.write(html);
  res.end();
};
