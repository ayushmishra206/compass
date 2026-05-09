import type { Page } from '@playwright/test';
import { test, expect } from './setup/fixtures.js';

async function openCmdK(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Open command palette' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test.describe('Command palette', () => {
  test('opens via the topbar affordance and closes on Esc', async ({ extensionPage: page }) => {
    await openCmdK(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('typing a nav match + Enter opens the corresponding drawer', async ({
    extensionPage: page,
  }) => {
    await openCmdK(page);
    await page.locator('input[aria-label="Command palette input"]').fill('brief');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: /Morning brief/i })).toBeVisible();
  });

  test('ask mode renders the grounded-answer affordance', async ({ extensionPage: page }) => {
    await openCmdK(page);
    await page
      .locator('input[aria-label="Command palette input"]')
      .fill('what does the offscreen runtime do?');
    await page.keyboard.press('Enter');
    await expect(page.getByText(/grounded in 3 notes/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/n1 architecture/)).toBeVisible();
  });
});
