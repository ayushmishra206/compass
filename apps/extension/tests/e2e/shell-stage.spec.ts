import { test, expect } from './setup/fixtures.js';
import type { BrowserContext, Page } from '@playwright/test';

// The scene system pulls a manifest from the network in the offscreen
// document. Playwright's context.route does not reliably intercept fetches
// initiated from MV3 offscreen documents, so instead we pre-seed the manifest
// into the cache that useScene reads on mount, short-circuiting the RPC path.
const FIXTURE_MANIFEST = {
  version: 1,
  generatedAt: new Date().toISOString(),
  scenes: ['dawn', 'fog', 'ocean', 'alpine', 'desert'].map((mood) => ({
    id: `fixture-${mood}`,
    url: `https://images.unsplash.com/photo-fixture-${mood}`,
    photographer: 'Test',
    attribution: 'https://unsplash.com/@test',
    mood,
    weather: mood === 'fog' ? ['fog'] : ['clear'],
    sha256: `sha-fixture-${mood}`,
  })),
};

async function openSeededNewtab(context: BrowserContext, extensionId: string): Promise<Page> {
  const page = await context.newPage();
  // First navigation establishes the chrome-extension origin so we can write
  // to localStorage and chrome.storage from page context.
  await page.goto(`chrome-extension://${extensionId}/newtab.html`);
  await page.evaluate((manifest) => {
    chrome.storage.local.set({ 'profile.byokConfigured': true });
    localStorage.setItem(
      'compass.scenes.manifest',
      JSON.stringify({ value: manifest, ts: Date.now() }),
    );
  }, FIXTURE_MANIFEST);
  await page.reload();
  return page;
}

test.describe('Stage scene resolution', () => {
  test('topbar shows a mood label sourced from the manifest', async ({ context, extensionId }) => {
    const page = await openSeededNewtab(context, extensionId);

    // useScene picks one of the five moods based on the current hour, then the
    // Topbar renders its capitalized name in the brand row.
    const labels = ['Dawn', 'Fog', 'Ocean', 'Alpine', 'Desert'];
    const found = await Promise.any(
      labels.map(async (l) => {
        await expect(page.getByText(l, { exact: true }).first()).toBeVisible({ timeout: 5_000 });
        return l;
      }),
    ).catch(() => null);

    expect(found, 'one of the five mood labels should be visible').not.toBeNull();
  });

  test('manifest cache survives reload (no refetch on warm load)', async ({
    context,
    extensionId,
  }) => {
    const page = await openSeededNewtab(context, extensionId);

    // The seeded ts is fresh, so useScene must not overwrite the cache or
    // produce a different manifest version.
    const cached = await page.evaluate(() => {
      const raw = localStorage.getItem('compass.scenes.manifest');
      return raw ? (JSON.parse(raw) as { value: { version: number; scenes: unknown[] } }) : null;
    });
    expect(cached?.value.version).toBe(1);
    expect(cached?.value.scenes).toHaveLength(5);
  });
});
