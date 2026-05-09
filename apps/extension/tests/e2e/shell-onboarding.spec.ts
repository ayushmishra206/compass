import { test, expect } from './setup/fixtures.js';

// The drawer header *and* the OnboardingDrawer body both render a "Welcome to
// Compass" h2 — assert against the drawer aside specifically.
const ONBOARDING_DRAWER = 'aside.drawer.on[data-kind="onboarding"]';

test.describe('Onboarding gate', () => {
  test('Onboarding drawer auto-opens on fresh install', async ({ freshExtensionPage: page }) => {
    await expect(page.locator(ONBOARDING_DRAWER)).toBeVisible();
    await expect(
      page.locator(ONBOARDING_DRAWER).getByRole('heading', { name: 'Welcome to Compass' }).first(),
    ).toBeVisible();
  });

  test('scrim click and Esc are no-ops while locked', async ({ freshExtensionPage: page }) => {
    await page.locator('[data-testid="drawer-scrim"]').click({ force: true });
    await expect(page.locator(ONBOARDING_DRAWER)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator(ONBOARDING_DRAWER)).toBeVisible();
  });

  test('close button is hidden while locked', async ({ freshExtensionPage: page }) => {
    await expect(page.locator('[data-testid="drawer-close"]')).toHaveCount(0);
  });
});
