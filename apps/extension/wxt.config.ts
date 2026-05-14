import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';

export default defineConfig({
  modules: [],
  vite: () => ({
    plugins: [react()],
    resolve: {
      alias: {
        '@app': new URL('./app', import.meta.url).pathname,
      },
    },
    optimizeDeps: {
      // Required by @sqlite.org/sqlite-wasm — Emscripten output uses dynamic
      // imports that break under Vite's pre-bundling.
      exclude: ['@sqlite.org/sqlite-wasm'],
    },
    assetsInclude: ['**/*.wasm'],
  }),
  manifest: {
    name: 'Compass',
    description: 'A calm new tab that quietly learns your day.',
    permissions: ['storage', 'alarms', 'offscreen'],
    chrome_url_overrides: { newtab: 'newtab.html' },
    action: { default_title: 'Compass' },
    // MV3 default CSP blocks WebAssembly compilation. sqlite-wasm needs
    // wasm-unsafe-eval to instantiate sqlite3.wasm.
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
    },
  },
});
