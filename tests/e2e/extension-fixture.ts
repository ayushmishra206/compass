/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

interface ExtensionFixtures {
  context: BrowserContext;
  extensionId: string;
  newtabPage: Page;
}

const EXTENSION_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'apps',
  'extension',
  '.output',
  'chrome-mv3',
);

export const test = base.extend<ExtensionFixtures>({
  context: async (_fixtures, use) => {
    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'compass-pw-'));
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: true,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
      ],
    });
    await use(context);
    await context.close();
    await fs.rm(userDataDir, { recursive: true, force: true });
  },
  extensionId: async ({ context }, use) => {
    // Wait for the SW to register so we can read its URL → extension ID.
    let workers = context.serviceWorkers();
    if (workers.length === 0) {
      workers = [await context.waitForEvent('serviceworker')];
    }
    const url = workers[0].url(); // chrome-extension://<id>/background.js
    const id = url.split('/')[2];
    await use(id);
  },
  newtabPage: async ({ context, extensionId }, use) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/newtab.html`);
    await use(page);
    await page.close();
  },
});

export { expect } from '@playwright/test';
