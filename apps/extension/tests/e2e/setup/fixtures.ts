import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(here, '../../..', '.output/chrome-mv3');

interface ExtensionFixtures {
  context: BrowserContext;
  extensionId: string;
  /** Newtab page with BYOK already configured — onboarding bypassed. */
  extensionPage: Page;
  /** Newtab page with BYOK absent — onboarding gate active. */
  freshExtensionPage: Page;
}

async function resolveExtensionId(context: BrowserContext): Promise<string> {
  // Keep the browser alive while we wait for the service worker to register.
  const keepalive = context.pages()[0] ?? (await context.newPage());
  await keepalive.goto('about:blank').catch(() => {});

  const existing = context.serviceWorkers();
  const sw = existing[0] ?? (await context.waitForEvent('serviceworker'));
  // chrome-extension://<id>/background.js
  return new URL(sw.url()).host;
}

/* eslint-disable react-hooks/rules-of-hooks -- Playwright fixture callbacks
   take a `use` parameter that is unrelated to React hooks. */
export const test = base.extend<ExtensionFixtures>({
  // eslint-disable-next-line no-empty-pattern -- Playwright fixture signature
  context: async ({}: Record<string, never>, use) => {
    // `channel: 'chromium'` selects the full Chromium binary; the default
    // `chromium-headless-shell` build does not support extensions.
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
      ],
    });
    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    const id = await resolveExtensionId(context);
    await use(id);
  },

  extensionPage: async ({ context, extensionId }, use) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/newtab.html`);
    await page.evaluate(() => chrome.storage.local.set({ 'profile.byokConfigured': true }));
    await page.reload();
    await use(page);
  },

  freshExtensionPage: async ({ context, extensionId }, use) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/newtab.html`);
    await page.evaluate(() => chrome.storage.local.remove('profile.byokConfigured'));
    await page.reload();
    await use(page);
  },
});
/* eslint-enable react-hooks/rules-of-hooks */

export { expect } from '@playwright/test';
