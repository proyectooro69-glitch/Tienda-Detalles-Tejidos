const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 5000;
const HOST = '0.0.0.0';
const ROOT = __dirname;

/* ── Orígenes permitidos (CORS) ─────────────────────────────── */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

/* También se permiten siempre el dominio de Railway (env) y Replit dev */
if (process.env.RAILWAY_PUBLIC_DOMAIN)
  ALLOWED_ORIGINS.push('https://' + process.env.RAILWAY_PUBLIC_DOMAIN);

function isOriginAllowed(origin) {
  if (!origin) return true;               // peticiones same-origin (sin header)
  if (ALLOWED_ORIGINS.length === 0) return true;  // sin restricción configurada
  return ALLOWED_ORIGINS.some(o => origin === o || origin.endsWith('.replit.dev'));
}

/* ── Archivos bloqueados (nunca se sirven) ───────────────────── */
const BLOCKED_PATTERNS = [
  /^\/\.env/i,
  /^\/\.git/i,
  /^\/package(-lock)?\.json$/i,
  /^\/node_modules/i,
  /^\/.local/i,
  /^\/replit\.md$/i,
  /\.map$/i,
];

function isBlocked(pathname) {
  return BLOCKED_PATTERNS.some(re => re.test(pathname));
}

/* ── MIME types ──────────────────────────────────────────────── */
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

/* ── Security headers ────────────────────────────────────────── */
function securityHeaders(origin) {
  const headers = {
    /* Evita MIME-type sniffing */
    'X-Content-Type-Options': 'nosniff',
    /* XSS filter legacy browsers */
    'X-XSS-Protection': '1; mode=block',
    /* HSTS — fuerza HTTPS por 1 año */
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    /* Referrer — solo origen, sin path */
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    /* Permissions Policy — deshabilita APIs innecesarias */
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    /* Content Security Policy — sin frame-ancestors para permitir iframes */
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https:",
      "worker-src 'self' blob:",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  };
  /* CORS — solo agregar header si hay origen válido */
  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Vary'] = 'Origin';
  }
  return headers;
}

function safeJoin(root, target) {
  const resolved = path.resolve(root, '.' + target);
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

/* ── Servidor ────────────────────────────────────────────────── */
const server = http.createServer((req, res) => {
  const origin = req.headers['origin'] || '';

  /* Preflight CORS */
  if (req.method === 'OPTIONS') {
    if (isOriginAllowed(origin)) {
      res.writeHead(204, securityHeaders(origin));
    } else {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
    }
    return res.end();
  }

  /* Solo GET permitido */
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain', ...securityHeaders(origin) });
    return res.end('Method Not Allowed');
  }

  const parsed = url.parse(req.url);
  let pathname = decodeURIComponent(parsed.pathname || '/');

  /* Bloquear archivos sensibles */
  if (isBlocked(pathname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain', ...securityHeaders(origin) });
    return res.end('Forbidden');
  }

  if (pathname === '/') pathname = '/index.html';

  let filePath = safeJoin(ROOT, pathname);
  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain', ...securityHeaders(origin) });
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(ROOT, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';

    const headers = {
      'Content-Type': type,
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...securityHeaders(origin),
    };

    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Static server running at http://${HOST}:${PORT}`);
});
