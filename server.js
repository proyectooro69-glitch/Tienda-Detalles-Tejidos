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

/* Escapa caracteres especiales para inyección en atributos HTML */
function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* Sirve index.html con OG tags del producto inyectados */
function serveIndexWithOG(res, prod, img) {
  const indexPath = path.join(ROOT, 'index.html');
  fs.readFile(indexPath, 'utf8', (err, html) => {
    if (err) {
      res.writeHead(500); return res.end('Error');
    }
    if (prod || img) {
      const title = prod ? esc(prod) + ' — Dtalles Tejidos' : 'Dtalles — Tejidos con Amor';
      const desc  = prod ? 'Producto artesanal: ' + esc(prod) + '. Tejido con amor.' : 'Producciones hechas a mano, con cariño para ti y los tuyos';
      const imgUrl = esc(img || '');
      html = html
        .replace(/(<meta property="og:title"[^>]*content=")([^"]*)(")/,   '$1' + title  + '$3')
        .replace(/(<meta property="og:description"[^>]*content=")([^"]*)(")/,'$1' + desc   + '$3')
        .replace(/(<meta property="og:image"[^>]*content=")([^"]*)(")/,   '$1' + imgUrl + '$3');
    }
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    });
    res.end(html);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET' });
    return res.end();
  }

  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    return res.end('Method Not Allowed');
  }

  const parsed = url.parse(req.url, true);
  let pathname = decodeURIComponent(parsed.pathname || '/');

  if (BLOCKED.some(re => re.test(pathname))) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Forbidden');
  }

  /* Si es la raíz o una ruta que no existe, sirve index.html con OG tags */
  if (pathname === '/') {
    const prod = parsed.query.prod || '';
    const img  = parsed.query.img  || '';
    return serveIndexWithOG(res, prod, img);
  }

  const resolved = path.resolve(ROOT, '.' + pathname);
  if (!resolved.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Forbidden');
  }

  fs.stat(resolved, (err, stats) => {
    if (err || !stats.isFile()) {
      /* Ruta desconocida → SPA fallback con OG tags */
      const prod = parsed.query.prod || '';
      const img  = parsed.query.img  || '';
      return serveIndexWithOG(res, prod, img);
    }
    const ext  = path.extname(resolved).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    });
    fs.createReadStream(resolved).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Dtalles server running at http://${HOST}:${PORT}`);
});
