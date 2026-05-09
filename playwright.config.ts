import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/gate/alarms.test.ts', '**/e2e/**/*.test.ts'],
  fullyParallel: false, // extension tests share a built artifact path
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    actionTimeout: 10_000,
    trace: 'retain-on-failure',
  },
});
