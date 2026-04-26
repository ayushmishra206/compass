import type { Config } from 'tailwindcss';
export default {
  content: [
    './app/**/*.{ts,tsx}',
    './entrypoints/**/*.{ts,tsx,html}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
} satisfies Config;
