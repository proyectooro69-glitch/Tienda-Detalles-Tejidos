// ════════════════════════════════════════════════════════════════
// SERVER.JS CORREGIDO - RAILWAY SSR SIN PROBLEMAS DE HIDRATACIÓN
// ════════════════════════════════════════════════════════════════
// 
// CAMBIOS IMPORTANTES:
// 1. Solo modifica meta tags para BOTS (WhatsApp, Facebook, etc)
// 2. Para usuarios normales, sirve HTML SIN MODIFICAR
// 3. Evita hydration mismatch de React
// 4. Healthcheck response correcta
// ════════════════════════════════════════════════════════════════

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// ════════════════════════════════════════════════════════════════
// VARIABLES DE ENTORNO
// ════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zkiqgciijhqizhxkryea.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpraXFnY2lpamhxaXpoeGtyeWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk1MTMzMjcsImV4cCI6MTk5MjA4OTMyN30.Tq8TdmNP1mKtvgYmfLxE1Q7RIpFhxlMqXJBfFKLlr5g';

console.log(`[INIT] PORT: ${PORT}`);
console.log(`[INIT] SUPABASE_URL: ${SUPABASE_URL.substring(0, 40)}...`);

// ════════════════════════════════════════════════════════════════
// INICIALIZAR SUPABASE
// ════════════════════════════════════════════════════════════════

let supabase;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('[✅] Supabase inicializado correctamente');
} catch (err) {
  console.error('[❌] Error inicializando Supabase:', err.message);
  process.exit(1);
}

// ════════════════════════════════════════════════════════════════
// CARGAR HTML TEMPLATE
// ════════════════════════════════════════════════════════════════

let htmlTemplate = null;
const htmlTemplatePath = path.join(__dirname, 'public', 'index.html');

try {
  htmlTemplate = fs.readFileSync(htmlTemplatePath, 'utf8');
  console.log(`[✅] HTML template cargado desde: ${htmlTemplatePath}`);
  console.log(`[✅] Tamaño: ${htmlTemplate.length} bytes`);
} catch (err) {
  console.error(`[❌] Error cargando HTML: ${err.message}`);
  console.error(`[❌] Busca en: ${htmlTemplatePath}`);
  process.exit(1);
}

// ════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ════════════════════════════════════════════════════════════════

// Servir archivos estáticos (CSS, JS, imágenes, etc)
// IMPORTANTE: Esto debe ir ANTES de las rutas dinámicas
app.use(express.static(path.join(__dirname, 'public')));

// ════════════════════════════════════════════════════════════════
// HEALTH CHECK (Para Railway)
// ════════════════════════════════════════════════════════════════

app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ════════════════════════════════════════════════════════════════
// LISTA DE USER-AGENTS DE BOTS
// ════════════════════════════════════════════════════════════════

const BOT_USER_AGENTS = [
  'WhatsApp',
  'facebookexternalhit',
  'Twitterbot',
  'Linkedinbot',
  'Slurp',
  'Baiduspider',
  'YandexBot',
  'Bingbot',
  'Googlebot',
  'Googlebot-Image',
  'Googlebot-Mobile',
  'Pinterest',
  'Slack',
  'Telegram',
  'Viber',
  'Signal',
  'Messenger',
  'curl',
  'wget'
];

/**
 * Detectar si el User-Agent es un bot/crawler
 * @param {string} userAgent - User-Agent a verificar
 * @returns {boolean} - true si es un bot
 */
function isBot(userAgent) {
  if (!userAgent) return false;
  return BOT_USER_AGENTS.some(bot => userAgent.includes(bot));
}

// ════════════════════════════════════════════════════════════════
// 🔑 RUTA PRINCIPAL CON SSR
// ════════════════════════════════════════════════════════════════

app.get('/', async (req, res) => {
  const userAgent = req.get('user-agent') || '';
  const isRequestFromBot = isBot(userAgent);
  const prodParam = req.query.prod;

  // Log de la request
  console.log(`\n[${new Date().toISOString()}]`);
  console.log(`├─ GET /`);
  console.log(`├─ User-Agent: ${userAgent.substring(0, 80)}${userAgent.length > 80 ? '...' : ''}`);
  console.log(`├─ isBot: ${isRequestFromBot}`);
  console.log(`├─ producto: ${prodParam || 'ninguno'}`);

  let html = htmlTemplate;

  // ═══════════════════════════════════════════════════════════════
  // SOLO MODIFICAR HTML PARA BOTS
  // ═══════════════════════════════════════════════════════════════
  
  if (isRequestFromBot && prodParam) {
    try {
      console.log(`├─ 🤖 Bot detectado, consultando Supabase...`);

      // Consultar producto en Supabase
      const { data: product, error } = await supabase
        .from('productos')
        .select('nombre, imagen_url, descripcion, precio')
        .eq('nombre', decodeURIComponent(prodParam))
        .maybeSingle(); // .maybeSingle() en lugar de .single() para evitar errores

      if (error) {
        console.log(`├─ ⚠️  Error Supabase: ${error.message}`);
      } else if (product) {
        console.log(`├─ ✅ Producto encontrado: "${product.nombre}"`);

        // ═══════════════════════════════════════════════════════════════
        // CONSTRUIR URL ABSOLUTA DE IMAGEN
        // ═══════════════════════════════════════════════════════════════
        
        let ogImage = product.imagen_url || '';
        
        // Si la URL no es absoluta, construirla
        if (ogImage && !ogImage.startsWith('http')) {
          ogImage = `https://zkiqgciijhqizhxkryea.supabase.co${ogImage}`;
        }

        console.log(`├─ 🖼️  Imagen: ${ogImage.substring(0, 70)}...`);

        // ═══════════════════════════════════════════════════════════════
        // CONSTRUIR CONTENIDO DE META TAGS
        // ═══════════════════════════════════════════════════════════════
        
        const ogTitle = product.nombre + ' — Dtalles Tejidos';
        const ogDesc = (product.descripcion || 'Tejido hecho a mano con amor') + 
                      (product.precio ? ` — Precio: Q ${product.precio}` : '');
        const ogUrl = getFullUrl(req, prodParam);

        // ═══════════════════════════════════════════════════════════════
        // REEMPLAZAR META TAGS EN HTML
        // ═══════════════════════════════════════════════════════════════
        
        html = html
          // og:title
          .replace(
            /<meta\s+property=["']og:title["'][^>]*>/i,
            `<meta property="og:title" content="${escapeHtml(ogTitle)}">`
          )
          // og:description
          .replace(
            /<meta\s+property=["']og:description["'][^>]*>/i,
            `<meta property="og:description" content="${escapeHtml(ogDesc)}">`
          )
          // og:image (principal)
          .replace(
            /<meta\s+property=["']og:image["']\s+(?!secure)[^>]*>/i,
            `<meta property="og:image" content="${escapeHtml(ogImage)}">`
          )
          // og:image:secure_url
          .replace(
            /<meta\s+property=["']og:image:secure_url["'][^>]*>/i,
            `<meta property="og:image:secure_url" content="${escapeHtml(ogImage)}">`
          )
          // og:url
          .replace(
            /<meta\s+property=["']og:url["'][^>]*>/i,
            `<meta property="og:url" content="${escapeHtml(ogUrl)}">`
          )
          // twitter:image
          .replace(
            /<meta\s+name=["']twitter:image["'][^>]*>/i,
            `<meta name="twitter:image" content="${escapeHtml(ogImage)}">`
          );

        console.log(`├─ ✨ Meta tags reemplazados`);
        console.log(`├─ 📱 WhatsApp preview enviado`);

      } else {
        console.log(`├─ ⚠️  Producto no encontrado en BD`);
      }

    } catch (err) {
      console.error(`├─ ❌ Error general: ${err.message}`);
      console.error(`    ${err.stack}`);
    }
  } else if (prodParam) {
    // Es usuario normal (no bot) con parámetro de producto
    console.log(`├─ 👤 Usuario normal (no es bot)`);
    console.log(`├─ ⚠️  No modificando HTML para evitar hydration issues`);
  }

  // ═══════════════════════════════════════════════════════════════
  // ENVIAR RESPUESTA
  // ═══════════════════════════════════════════════════════════════

  console.log(`└─ 📤 Enviando respuesta (${html.length} bytes)`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200);
  res.send(html);
});

// ════════════════════════════════════════════════════════════════
// RUTA FALLBACK PARA REACT ROUTER (si usas React Router)
// ════════════════════════════════════════════════════════════════

app.get('*', (req, res) => {
  // Para cualquier otra ruta, servir el index.html sin modificar
  // React Router manejará la navegación en el cliente
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(htmlTemplate);
});

// ════════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES
// ════════════════════════════════════════════════════════════════

/**
 * Escapar caracteres especiales HTML
 * @param {string} text - Texto a escapar
 * @returns {string} - Texto escapado
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Construir URL completa del producto
 * @param {object} req - Request de Express
 * @param {string} prodParam - Nombre del producto
 * @returns {string} - URL completa
 */
function getFullUrl(req, prodParam) {
  const protocol = req.protocol || 'https';
  const host = req.get('host') || 'localhost:3000';
  return `${protocol}://${host}/?prod=${encodeURIComponent(decodeURIComponent(prodParam))}`;
}

// ════════════════════════════════════════════════════════════════
// ERROR HANDLER
// ════════════════════════════════════════════════════════════════

app.use((err, req, res, next) => {
  console.error(`[❌] Error no manejado:`, err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// ════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ════════════════════════════════════════════════════════════════

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  ✅ 🚀 SERVIDOR SSR EJECUTÁNDOSE (VERSIÓN CORREGIDA)     ║
║                                                            ║
║  Puerto: ${PORT}                                             ║
║  Protocolo: http/https                                   ║
║  Host: 0.0.0.0 (accesible desde cualquier dirección)     ║
║                                                            ║
║  ✨ Características:                                      ║
║  ✓ Detecta User-Agent de bots (WhatsApp, etc)           ║
║  ✓ Consulta Supabase dinámicamente                       ║
║  ✓ Genera og:image dinámico SOLO para bots              ║
║  ✓ HTML sin modificar para usuarios normales ✅          ║
║  ✓ Evita hydration mismatch de React ✅                 ║
║  ✓ Health check en /healthz y /health                   ║
║                                                            ║
║  🧪 Prueba local:                                        ║
║  http://localhost:${PORT}/?prod=Nombre%20Del%20Producto     ║
║                                                            ║
║  📱 Para WhatsApp:                                        ║
║  Comparte el enlace y verifica la miniatura             ║
║                                                            ║
║  🐛 Debugging:                                           ║
║  Ver logs en la consola (están muy detallados)          ║
║                                                            ║
║  🚀 Railway:                                             ║
║  - Health check: http://app:${PORT}/healthz              ║
║  - Auto-redeploy: Sí                                    ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[⚠️ ] SIGTERM recibido, cerrando servidor...');
  server.close(() => {
    console.log('[✅] Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[⚠️ ] SIGINT recibido, cerrando servidor...');
  server.close(() => {
    console.log('[✅] Servidor cerrado correctamente');
    process.exit(0);
  });
});

// Manejo de errores no capturados
process.on('uncaughtException', (err) => {
  console.error('[❌] Excepción no capturada:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[❌] Promise rechazada no manejada:', reason);
  process.exit(1);
});
