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

  // Algunos bots (Facebook/WhatsApp) piden solo un "pedacito" de la página
  // (Range request) para ahorrar datos. Si dejamos pasar eso, podemos recibir
  // un HTML incompleto (código 206) y algunas meta tags se pierden según
  // dónde caiga el corte. Pedimos siempre la página COMPLETA.
  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.delete('range');
  forwardHeaders.delete('if-range');
  const cleanRequest = new Request(request, { headers: forwardHeaders });

  // ── CLAVE DE VELOCIDAD ──────────────────────────────────────────
  // WhatsApp tiene un límite de tiempo (timeout) MUY estricto (unos
  // pocos segundos) para leer la página — mucho más agresivo que
  // Facebook, que es más "paciente". Antes, esta función pedía el HTML
  // y ESPERABA esa respuesta completa antes de recién ahí empezar a
  // consultar Supabase — dos viajes de red uno detrás del otro.
  // Ahora se piden AMBAS COSAS AL MISMO TIEMPO (en paralelo), y a la
  // consulta de Supabase se le pone un límite de 4 segundos: si tarda
  // más que eso, se sigue de largo con el HTML original en vez de
  // dejar a WhatsApp esperando y que se rinda sin mostrar nada.
  const supabaseController = new AbortController();
  const supabaseTimeout = setTimeout(() => supabaseController.abort(), 4000);

  const query = `${SUPABASE_URL}/rest/v1/productos?nombre=eq.${encodeURIComponent(decodeURIComponent(prodParam))}&select=nombre,imagen_url,descripcion,precio`;

  const [response, productResult] = await Promise.all([
    context.next(cleanRequest),
    fetch(query, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      signal: supabaseController.signal
    })
      .then(r => r.ok ? r.json() : null)
      .catch(err => {
        console.log(`[og-bot] Supabase tardó demasiado o falló: ${err.message}`);
        return null;
      })
      .finally(() => clearTimeout(supabaseTimeout))
  ]);

  let html = await response.text();

  try {
    const data = productResult;
    const product = Array.isArray(data) ? data[0] : null;

    if (!product) {
      console.log('[og-bot] Producto no encontrado en BD (o Supabase no respondió a tiempo)');
      return new Response(html, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' }
      });
    }

    console.log(`[og-bot] Producto encontrado: "${product.nombre}"`);

    let ogImage = product.imagen_url || '';
    if (ogImage && !ogImage.startsWith('http')) {
      ogImage = `${SUPABASE_URL}${ogImage}`;
    }
    // La imagen ya viene comprimida desde el momento en que se sube
    // (función compressImg en el panel de admin: máx 1200px, calidad 82%),
    // así que se usa tal cual, sin intermediarios externos.

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
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' }
  });
};

export const config = { path: "/" };
