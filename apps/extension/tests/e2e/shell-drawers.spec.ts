import { test, expect } from './setup/fixtures.js';

test.describe('Shell drawers', () => {
  test('open and close each nav drawer', async ({ extensionPage: page }) => {
    const drawers: { pill: string; titleRegex: RegExp }[] = [
      { pill: 'Brief', titleRegex: /Morning brief/i },
      { pill: 'Today', titleRegex: /^Today$/ },
      { pill: 'Goals', titleRegex: /^Goals$/ },
      { pill: 'Notes', titleRegex: /^Notes$/ },
      { pill: 'Inbox', titleRegex: /^Inbox$/ },
      { pill: 'Focus', titleRegex: /^Focus$/ },
    ];

    for (const d of drawers) {
      await page.getByRole('button', { name: d.pill, exact: true }).click();
      await expect(page.getByRole('heading', { name: d.titleRegex })).toBeVisible();
      await page.getByRole('button', { name: 'Close drawer' }).click();
      await expect(page.locator('aside.drawer.on')).toHaveCount(0);
    }
  });

  test('Esc closes the drawer', async ({ extensionPage: page }) => {
    await page.getByRole('button', { name: 'Brief', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Morning brief/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('aside.drawer.on')).toHaveCount(0);
  });
});
