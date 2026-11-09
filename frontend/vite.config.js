import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Content Security Policy for the built site. Scripts may only come from our
// own origin, so an injected inline/remote <script> (e.g. the Nov 2026 ClickFix
// injection) is refused by the browser. Keep in sync with deploy/nginx.conf.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "connect-src 'self' https://speshwayhrms.com https://*.speshwayhrms.com wss://speshwayhrms.com wss://*.speshwayhrms.com https://*.googleapis.com https://ipapi.co https://nominatim.openstreetmap.org",
  "worker-src 'self'",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join('; ')

// Only applied to `vite build`; the dev server needs inline HMR scripts.
const cspPlugin = {
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`
    ),
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), cspPlugin],
  // Dev server is for local development only. Production must serve the
  // `dist/` build through nginx (see deploy/), never `vite` / `vite preview`.
  server: {
    host: 'localhost',
    port: 5173,
  },
  build: {
    target: 'es2019',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Only split libraries every page needs. Libraries used by a few lazy
        // screens (PDF, Excel, MUI, maps, charts) are left to Vite, so they
        // load with those screens instead of being preloaded on every page.
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['jspdf', 'xlsx', '@googlemaps/react-wrapper'],
  }
});
