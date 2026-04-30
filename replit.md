# Dtalles — Tejidos con Amor

A static, single-page PWA (Progressive Web App) for an artisanal handmade goods store. The site is built as a single `index.html` with embedded CSS and JavaScript, and uses Supabase (loaded from CDN) for backend data.

## Project Structure

- `index.html` — Single-page app containing all markup, styles, and scripts
- `manifest.json` — PWA manifest
- `sw.js` — Service worker for offline caching
- `icons/` — PWA icons (multiple sizes)
- `apple-touch-icon.png`, `icon-*.png`, `icono-tienda.jpg` — Brand/PWA assets
- `server.js` — Lightweight Node.js static file server used in the Replit environment

## How it runs in Replit

There is no build step. A small Node.js static server (`server.js`) serves the project root over HTTP.

- Host: `0.0.0.0`
- Port: `5000`
- Cache-Control headers are disabled in dev so updates show immediately in the Replit preview iframe.

The workflow `Start application` runs `node server.js`.

## Deployment

Configured for Replit static publishing:

- Deployment target: `static`
- Public directory: `.` (project root)

No build command is required.

## Notes

- The site uses Supabase via the CDN script tag (`@supabase/supabase-js@2`); credentials/config are inside `index.html`.
- Some `<img>` and CSS `background-image` tags in `index.html` reference inline base64 data that appears truncated in the source (e.g. `data:image/jpeg;base64,...`). This is a pre-existing condition of the source file, not an environment setup issue. The actual logo asset is available as `icono-tienda.jpg` if it ever needs to be wired in.
