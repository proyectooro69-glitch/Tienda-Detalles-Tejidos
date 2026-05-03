const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.txt':  'text/plain; charset=utf-8',
};

const BLOCKED = [
  /^\/\.env/i,
  /^\/\.git/i,
  /^\/package(-lock)?\.json$/i,
  /^\/node_modules/i,
  /^\/.local/i,
  /^\/replit\.md$/i,
];

/**
 * Escapa caracteres especiales para inyección en atributos HTML
 */
function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/**
 * Valida que una URL sea absoluta y segura
 */
function isAbsoluteUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sirve index.html con OG tags inyectados para productos
 * Soporta tanto ?prod=nombre&img=url como /producto/slug
 */
function serveIndexWithOG(res, producto, imagenUrl) {
  const indexPath = path.join(ROOT, 'index.html');
  fs.readFile(indexPath, 'utf8', (err, html) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('Error cargando index.html');
    }

    let title = 'Dtalles — Tejidos con Amor';
    let description = 'Producciones hechas a mano, con cariño para ti y los tuyos';
    let ogImage = '';
    let ogUrl = '';

    if (producto && imagenUrl && isAbsoluteUrl(imagenUrl)) {
      title = esc(producto) + ' — Dtalles Tejidos';
      description = 'Producto artesanal: ' + esc(producto) + '. Tejido con amor. Hecho a mano con cariño.';
      
      // Validar que sea URL absoluta
      ogImage = isAbsoluteUrl(imagenUrl) ? imagenUrl : '';
      
      // Construir URL canónica del producto
      try {
        const prodSlug = producto.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        ogUrl = `${getBaseUrl()} ?prod=${encodeURIComponent(producto)}&img=${encodeURIComponent(imagenUrl)}`;
      } catch {
        ogUrl = getBaseUrl();
      }
    }

    // Inyectar tags Open Graph
    html = html
      .replace(/(<meta property="og:title"[^>]*id="og-title"[^>]*content=")([^"]*)(")/,
        '$1' + title + '$3')
      .replace(/(<meta property="og:description"[^>]*id="og-description"[^>]*content=")([^"]*)(")/,
        '$1' + description + '$3')
      .replace(/(<meta property="og:image"[^>]*id="og-image"[^>]*content=")([^"]*)(")/,
        '$1' + ogImage + '$3')
      .replace(/(<meta property="og:url"[^>]*id="og-url"[^>]*content=")([^"]*)(")/,
        '$1' + ogUrl + '$3')
      // Twitter Card
      .replace(/(<meta name="twitter:title"[^>]*id="tw-title"[^>]*content=")([^"]*)(")/,
        '$1' + title + '$3')
      .replace(/(<meta name="twitter:description"[^>]*id="tw-desc"[^>]*content=")([^"]*)(")/,
        '$1' + description + '$3')
      .replace(/(<meta name="twitter:image"[^>]*id="tw-image"[^>]*content=")([^"]*)(")/,
        '$1' + ogImage + '$3');

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(html);
  });
}

/**
 * Obtiene la URL base del servidor (para OpenGraph)
 */
function getBaseUrl() {
  // En producción, usar variable de entorno
  const protocol = process.env.PROTOCOL || 'https';
  const domain = process.env.DOMAIN || 'localhost:5000';
  return `${protocol}://${domain}`;
}

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  // Solo GET
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    return res.end('Method Not Allowed');
  }

  const parsed = url.parse(req.url, true);
  let pathname = decodeURIComponent(parsed.pathname || '/');

  // Bloquear accesos sensibles
  if (BLOCKED.some(re => re.test(pathname))) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Forbidden');
  }

  // ═══════════════════════════════════════════════════════════════════
  // RUTA 1: Raíz "/"
  // Soporta: /?prod=nombre&img=url
  // ═══════════════════════════════════════════════════════════════════
  if (pathname === '/') {
    const producto = parsed.query.prod || '';
    const imagen = parsed.query.img || '';
    return serveIndexWithOG(res, producto, imagen);
  }

  // ═══════════════════════════════════════════════════════════════════
  // RUTA 2: Producto dinámico "/producto/:id"
  // Formato: /producto/123 o /producto/mi-producto-bonito
  // ═══════════════════════════════════════════════════════════════════
  const prodMatch = pathname.match(/^\/producto\/([a-zA-Z0-9\-_]+)$/);
  if (prodMatch) {
    const productId = prodMatch[1];
    // El cliente JavaScript se encargará de obtener los datos del producto desde Supabase
    // Aquí solo servimos el index con parámetros en query para compatibilidad
    const producto = parsed.query.prod || '';
    const imagen = parsed.query.img || '';
    return serveIndexWithOG(res, producto, imagen);
  }

  // ═══════════════════════════════════════════════════════════════════
  // RUTA 3: API REST para tasas de cambio
  // GET /api/exchange-rates
  // ═══════════════════════════════════════════════════════════════════
  if (pathname === '/api/exchange-rates') {
    // En una implementación real, esto consultaría una base de datos
    // o un servicio externo de tasas de cambio
    const rates = {
      base: 'USD',
      rates: {
        'USD': 1.0,
        'EUR': 0.92,
        'CUP': 24.0,
        'USDC': 1.0,
      },
      timestamp: new Date().toISOString(),
    };
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'max-age=3600',
      'Access-Control-Allow-Origin': '*',
    });
    return res.end(JSON.stringify(rates));
  }

  // ═══════════════════════════════════════════════════════════════════
  // RUTA 4: Archivos estáticos
  // ═══════════════════════════════════════════════════════════════════
  const resolved = path.resolve(ROOT, '.' + pathname);
  if (!resolved.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Forbidden');
  }

  fs.stat(resolved, (err, stats) => {
    if (err || !stats.isFile()) {
      // Ruta desconocida → SPA fallback
      const producto = parsed.query.prod || '';
      const imagen = parsed.query.img || '';
      return serveIndexWithOG(res, producto, imagen);
    }

    const ext = path.extname(resolved).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const cacheControl = ext === '.html' 
      ? 'no-store, no-cache, must-revalidate, max-age=0'
      : 'public, max-age=31536000';

    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(resolved).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`🧶 Dtalles Tejidos server running at http://${HOST}:${PORT}`);
  console.log(`   Open Graph enabled for product sharing`);
  console.log(`   Exchange rates API available at /api/exchange-rates`);
});
