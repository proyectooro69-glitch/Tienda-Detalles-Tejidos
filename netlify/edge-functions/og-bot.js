// ════════════════════════════════════════════════════════════════
// EDGE FUNCTION - PREVIEW DE WHATSAPP/FACEBOOK PARA PRODUCTOS
// ════════════════════════════════════════════════════════════════
//
// Migrado desde server.js (lógica original para Railway/Express).
// Hace exactamente lo mismo, pero en formato Netlify Edge Function:
// 1. Solo modifica meta tags para BOTS (WhatsApp, Facebook, etc)
// 2. Para usuarios normales, sirve el HTML SIN MODIFICAR
// 3. Si algo falla (Supabase caído, etc), devuelve el HTML original
//    sin romper nada — nunca bloquea la carga del sitio.
// ════════════════════════════════════════════════════════════════

const BOT_USER_AGENTS = [
  'WhatsApp', 'facebookexternalhit', 'Twitterbot', 'Linkedinbot',
  'Slurp', 'Baiduspider', 'YandexBot', 'Bingbot', 'Googlebot',
  'Googlebot-Image', 'Googlebot-Mobile', 'Pinterest', 'Slack',
  'Telegram', 'Viber', 'Signal', 'Messenger', 'curl', 'wget'
];

const SUPABASE_URL = Netlify.env.get("SUPABASE_URL");
const SUPABASE_KEY = Netlify.env.get("SUPABASE_KEY");

function isBot(userAgent) {
  if (!userAgent) return false;
  return BOT_USER_AGENTS.some(bot => userAgent.includes(bot));
}

// WhatsApp descarta imágenes de más de ~300-600KB, aunque Facebook las acepte
// hasta 8MB. Esta función pide una versión ya redimensionada y comprimida
// del mismo archivo, usando el servicio gratuito wsrv.nl — sin tocar ni
// volver a subir tus fotos originales en Supabase.
function optimizarImagenParaWhatsApp(originalUrl) {
  if (!originalUrl) return originalUrl;
  const params = new URLSearchParams({
    url: originalUrl,
    w: '1200',
    h: '630',
    fit: 'cover',
    q: '75',
    output: 'jpg'
  });
  return `https://wsrv.nl/?${params.toString()}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async (request, context) => {
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || '';
  const prodParam = url.searchParams.get('prod');

  console.log(`[og-bot] GET ${url.pathname}${url.search} | UA: ${userAgent.substring(0, 60)} | isBot: ${isBot(userAgent)} | prod: ${prodParam || 'ninguno'}`);

  // Deja pasar todo lo que no sea "bot + producto", sin tocar nada
  if (!isBot(userAgent) || !prodParam) {
    return context.next();
  }

  // Trae el HTML original tal cual Netlify lo serviría
  const response = await context.next();
  let html = await response.text();

  try {
    console.log('[og-bot] Bot detectado, consultando Supabase...');

    const query = `${SUPABASE_URL}/rest/v1/productos?nombre=eq.${encodeURIComponent(decodeURIComponent(prodParam))}&select=nombre,imagen_url,descripcion,precio`;
    const resp = await fetch(query, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!resp.ok) {
      console.log(`[og-bot] Supabase respondió ${resp.status}`);
      return new Response(html, { status: response.status, headers: response.headers });
    }

    const data = await resp.json();
    const product = Array.isArray(data) ? data[0] : null;

    if (!product) {
      console.log('[og-bot] Producto no encontrado en BD');
      return new Response(html, { status: response.status, headers: response.headers });
    }

    console.log(`[og-bot] Producto encontrado: "${product.nombre}"`);

    let ogImage = product.imagen_url || '';
    if (ogImage && !ogImage.startsWith('http')) {
      ogImage = `${SUPABASE_URL}${ogImage}`;
    }
    // Comprimir/redimensionar antes de usarla como og:image (fix WhatsApp)
    ogImage = optimizarImagenParaWhatsApp(ogImage);

    const ogTitle = product.nombre + ' — Dtalles Tejidos';
    const ogDesc = (product.descripcion || 'Tejido hecho a mano con amor') +
                   (product.precio ? ` — Precio: ${product.precio}` : '');
    const ogUrl = url.origin + url.pathname + '?prod=' + encodeURIComponent(prodParam);

    html = html
      .replace(
        /<meta\s+property=["']og:title["'][^>]*>/i,
        `<meta property="og:title" content="${escapeHtml(ogTitle)}">`
      )
      .replace(
        /<meta\s+property=["']og:description["'][^>]*>/i,
        `<meta property="og:description" content="${escapeHtml(ogDesc)}">`
      )
      .replace(
        /<meta\s+property=["']og:image["']\s+(?!secure)[^>]*>/i,
        `<meta property="og:image" content="${escapeHtml(ogImage)}">`
      )
      .replace(
        /<meta\s+property=["']og:image:secure_url["'][^>]*>/i,
        `<meta property="og:image:secure_url" content="${escapeHtml(ogImage)}">`
      )
      .replace(
        /<meta\s+property=["']og:url["'][^>]*>/i,
        `<meta property="og:url" content="${escapeHtml(ogUrl)}">`
      )
      .replace(
        /<meta\s+name=["']twitter:image["'][^>]*>/i,
        `<meta name="twitter:image" content="${escapeHtml(ogImage)}">`
      );

    console.log('[og-bot] Meta tags reemplazados con éxito');

  } catch (err) {
    console.error(`[og-bot] Error: ${err.message}`);
    // Si algo falla, devolvemos el HTML original sin romper nada
  }

  return new Response(html, {
    status: response.status,
    headers: response.headers
  });
};

export const config = { path: "/" };
