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
    build: {
      rollupOptions: {
        external: ['sqlite-vec'],
      },
    },
  }),
  manifest: {
    name: 'Compass',
    description: 'A calm new tab that quietly learns your day.',
    permissions: ['storage', 'alarms', 'offscreen'],
    chrome_url_overrides: { newtab: 'newtab.html' },
    action: { default_title: 'Compass' },
  },
});
