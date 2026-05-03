const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

const PORT    = process.env.PORT || 5000;
const HOST    = '0.0.0.0';
const ROOT    = __dirname;

/* ── Credenciales Supabase (anon key, pública) ───────────────────── */
const SB_HOST = 'zkiqgciijhqizhxkryea.supabase.co';
const SB_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpraXFnY2lpamhxaXpoeGtyeWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzE1OTQsImV4cCI6MjA5MzA0NzU5NH0.6UM3YjNbx9KnmPbVhekaAEJ5zbV_rj2WIhq8OnVozyM';

const MIME = {
  '.html':'.html','.js':'application/javascript; charset=utf-8',
  '.mjs':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8',
  '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif',
  '.svg':'image/svg+xml','.ico':'image/x-icon','.webp':'image/webp','.txt':'text/plain; charset=utf-8',
};
const MIME_TYPES = {
  '.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8',
  '.mjs':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8',
  '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif',
  '.svg':'image/svg+xml','.ico':'image/x-icon','.webp':'image/webp','.txt':'text/plain; charset=utf-8',
};

const BLOCKED = [
  /^\/\.env/i, /^\/\.git/i, /^\/package(-lock)?\.json$/i,
  /^\/node_modules/i, /^\/.local/i, /^\/replit\.md$/i,
];

function esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* Consulta Supabase para obtener datos del producto por nombre */
function fetchProduct(nombre, cb) {
  const reqPath = '/rest/v1/productos?nombre=eq.' + encodeURIComponent(nombre) +
                  '&select=nombre,precio,imagen_url,descripcion&limit=1';
  const opts = {
    hostname: SB_HOST, path: reqPath, method: 'GET',
    headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Accept': 'application/json' }
  };
  const req = https.request(opts, res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => { try { cb(null, JSON.parse(data)[0] || null); } catch(e){ cb(e, null); } });
  });
  req.on('error', e => cb(e, null));
  req.end();
}

/* Sirve index.html con OG tags inyectados */
function serveIndex(res, prod) {
  const indexPath = path.join(ROOT, 'index.html');

  function injectAndSend(product) {
    fs.readFile(indexPath, 'utf8', (err, html) => {
      if (err) { res.writeHead(500); return res.end('Error'); }
      if (product) {
        const imgUrl  = esc(product.imagen_url || '');
        const title   = esc(product.nombre || '') + ' — Dtalles Tejidos';
        const precio  = product.precio ? ' Precio: ' + esc(product.precio) + '.' : '';
        const desc    = esc((product.descripcion || 'Tejido artesanal hecho con amor.') + precio);
        html = html
          .replace(/(<meta property="og:title"[^>]*content=")([^"]*)(")/,      '$1' + title  + '$3')
          .replace(/(<meta property="og:description"[^>]*content=")([^"]*)(")/,'$1' + desc   + '$3')
          .replace(/(<meta property="og:image"[^>]*content=")([^"]*)(")/,      '$1' + imgUrl + '$3')
          .replace(/(<meta name="twitter:title"[^>]*content=")([^"]*)(")/,     '$1' + title  + '$3')
          .replace(/(<meta name="twitter:image"[^>]*content=")([^"]*)(")/,     '$1' + imgUrl + '$3');
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(html);
    });
  }

  if (prod) {
    fetchProduct(prod, (err, product) => injectAndSend(product));
  } else {
    injectAndSend(null);
  }
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

  const parsed   = url.parse(req.url, true);
  let pathname   = decodeURIComponent(parsed.pathname || '/');

  if (BLOCKED.some(re => re.test(pathname))) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Forbidden');
  }

  /* Raíz o SPA routes → servir index con OG del producto si hay ?prod= */
  if (pathname === '/') {
    return serveIndex(res, parsed.query.prod || '');
  }

  const resolved = path.resolve(ROOT, '.' + pathname);
  if (!resolved.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Forbidden');
  }

  fs.stat(resolved, (err, stats) => {
    if (err || !stats.isFile()) return serveIndex(res, parsed.query.prod || '');
    const ext  = path.extname(resolved).toLowerCase();
    const type = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    fs.createReadStream(resolved).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Dtalles server running at http://${HOST}:${PORT}`);
});
