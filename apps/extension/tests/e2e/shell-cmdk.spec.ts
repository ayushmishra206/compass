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
    // tests cover state-machine details.
    //
    // Deliberately NOT asserting the "Searching your notes" spinner. It is a
    // transient state, and in CI the RPC rejects almost immediately because
    // sqlite-wasm cannot init without cross-origin isolation — so `busy` can
    // flip true→false inside a single commit and the spinner is never painted
    // long enough to observe. Reaching a terminal state proves the dispatch
    // happened just as well, and does so deterministically.
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
        { timeout: 30_000 },
      )
      .toBe(true);
  });
});
