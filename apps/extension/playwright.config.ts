import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: '**/setup/**',
  globalSetup: './tests/e2e/setup/global-setup.ts',
  // Persistent contexts can't share state — keep workers serialized.
  workers: 1,
  fullyParallel: false,
  // Service-worker startup adds latency over the default test timeout.
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
});
