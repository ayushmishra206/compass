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

  test('ask mode dispatches notes.askGrounded and surfaces a terminal state', async ({
    extensionPage: page,
  }) => {
    await openCmdK(page);
    await page
      .locator('input[aria-label="Command palette input"]')
      .fill('what does the offscreen runtime do?');
    await page.keyboard.press('Enter');
    // Phase 2 semantic-notes wires the real notes.askGrounded RPC.
    // We accept ANY terminal state (no-notes / locked / error / grounded
    // answer). The point of this e2e is "dispatch happens"; the in-process
    // tests cover state-machine details. The thinking spinner is the
    // signal that the rpc fired.
    await expect(page.getByText(/Searching your notes/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/Searching your notes/i)).not.toBeVisible({ timeout: 30_000 });
    const terminalStates = [
      /Write some notes first/i,
      /Unlock to ask/i,
      /Something went wrong/i,
      /grounded in/i,
    ];
    await expect
      .poll(
        async () => {
          for (const re of terminalStates) {
            if (
              await page
                .getByText(re)
                .isVisible()
                .catch(() => false)
            )
              return true;
          }
          return false;
        },
        { timeout: 5_000 },
      )
      .toBe(true);
  });
});
