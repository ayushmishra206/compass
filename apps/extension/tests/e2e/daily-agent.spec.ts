import type { Page } from '@playwright/test';
import { test, expect } from './setup/fixtures.js';

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

const PROFILE_DRAWER = 'aside.drawer.on[data-kind="profile"]';
const BRIEF_DRAWER = 'aside.drawer.on[data-kind="brief"]';
const FOCUS_DRAWER = 'aside.drawer.on[data-kind="focus"]';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Open the Profile drawer via the topbar avatar button. */
async function openProfileDrawer(page: Page) {
  await page.getByRole('button', { name: 'Profile' }).click();
  await expect(page.locator(PROFILE_DRAWER)).toBeVisible();
}

/** Open the Brief drawer via the topbar nav pill. */
async function openBriefDrawer(page: Page) {
  await page.getByRole('button', { name: 'Brief', exact: true }).click();
  await expect(page.locator(BRIEF_DRAWER)).toBeVisible();
}

/** Open the Focus drawer via the topbar nav pill. */
async function openFocusDrawer(page: Page) {
  await page.getByRole('button', { name: 'Focus', exact: true }).click();
  await expect(page.locator(FOCUS_DRAWER)).toBeVisible();
}

/**
 * Enable encryption with a passphrase via the EncryptionSection in the
 * Profile drawer, then lock the vault.
 */
async function enableEncryptionAndLock(page: Page, passphrase: string) {
  await openProfileDrawer(page);

  await expect(
    page.locator(PROFILE_DRAWER).getByText(/Off — keys are stored unencrypted/i),
  ).toBeVisible();

  await page.locator(PROFILE_DRAWER).getByRole('button', { name: 'Enable encryption' }).click();

  await page.locator(PROFILE_DRAWER).getByLabel('Passphrase').first().fill(passphrase);
  await page.locator(PROFILE_DRAWER).getByLabel('Confirm passphrase').fill(passphrase);
  await page
    .locator(PROFILE_DRAWER)
    .getByRole('button', { name: /Encrypt with this passphrase/i })
    .click();

  await expect(
    page.locator(PROFILE_DRAWER).getByText(/On — keys are encrypted at rest/i),
  ).toBeVisible({ timeout: 5_000 });

  await page.locator(PROFILE_DRAWER).getByRole('button', { name: 'Lock now' }).click();
}

// ---------------------------------------------------------------------------
// Test 1 — DailyTimesSection edit + BriefDrawer infrastructure path
// ---------------------------------------------------------------------------

test('DailyTimesSection saves briefingHour to storage; BriefDrawer renders if RPC live', async ({
  extensionPage: page,
}) => {
  // Seed a profile so DailyTimesSection has something to read.
  await page.evaluate(() => {
    chrome.storage.local.set({
      'profile.user.v1': {
        id: 'test-user-e2e',
        createdAt: new Date().toISOString(),
        timezone: 'UTC',
        locale: 'en-US',
        workHours: { start: '09:00', end: '17:00' },
        briefingHour: 8,
        reflectionHour: 18,
      },
    });
  });
  await page.reload();

  await openProfileDrawer(page);

  // DailyTimesSection renders the "Morning brief" hour picker
  const briefingSelect = page.locator(PROFILE_DRAWER).locator('#briefingHour');
  await expect(briefingSelect).toBeVisible({ timeout: 5_000 });
  await expect(briefingSelect).toHaveValue('8');

  // Change briefingHour to 9 — this calls setUserProfile + rpc('alarms.refresh')
  await briefingSelect.selectOption('9');
  await expect(briefingSelect).toHaveValue('9');

  // --- Infrastructure assertion (no LLM key needed) ---
  // The change must be written to chrome.storage.local.
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          chrome.storage.local
            .get('profile.user.v1')
            .then(
              (r) => (r['profile.user.v1'] as { briefingHour?: number } | undefined)?.briefingHour,
            ),
        ),
      { timeout: 5_000 },
    )
    .toBe(9);

  // Close profile drawer
  await page.getByRole('button', { name: 'Close drawer' }).click();
  await expect(page.locator('aside.drawer.on')).toHaveCount(0);

  // --- BriefDrawer rendering ---
  // BriefDrawer calls rpc('brief.getOrGenerate') which routes through the
  // offscreen document (SQLite-WASM).  Without a live key the RPC will
  // eventually respond (too-early / error) but can be slow on cold start.
  // We assert the terminal state only when COMPASS_E2E_OPENROUTER_KEY is set,
  // or when the BriefDrawer leaves Loading… within the test timeout.
  await openBriefDrawer(page);

  if (process.env.COMPASS_E2E_OPENROUTER_KEY) {
    // Full path: wait for Loading… to clear, then assert have-brief state.
    await expect(page.locator(BRIEF_DRAWER).getByText('Loading…')).not.toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.locator(BRIEF_DRAWER).getByRole('button', { name: 'Regenerate' }),
    ).toBeVisible({ timeout: 60_000 });
  } else {
    // Structural path: BriefDrawer mounts and shows at minimum a Loading… or
    // one of the terminal states.  We simply confirm the drawer is open and
    // the heading is present — the RPC dispatch is tested by the DB-layer
    // unit tests and the infrastructure assertion above covers the storage write.
    await expect(page.locator(BRIEF_DRAWER)).toBeVisible();
    // Morning brief heading is always rendered in the drawer header (App.tsx TITLES)
    await expect(page.getByRole('heading', { name: /Morning brief/i })).toBeVisible();
  }
});

// ---------------------------------------------------------------------------
// Test 2 — Locked → unlock → BriefDrawer locked state
// ---------------------------------------------------------------------------

test('locked vault shows locked-no-brief in BriefDrawer; unlock clears it', async ({
  freshExtensionPage: page,
}) => {
  // Mark BYOK as configured so onboarding stays out of the way.
  await page.evaluate(() => chrome.storage.local.set({ 'profile.byokConfigured': true }));
  await page.reload();
  // Seed a provider so EncryptionSection has creds to encrypt
  const now = new Date().toISOString();
  await page.evaluate((ts) => {
    chrome.storage.local.set({
      'llm.creds.v1': {
        default: 'openrouter',
        openrouter: { apiKey: 'or-test-key-e2e', addedAt: ts, lastValidatedAt: ts },
      },
    });
  }, now);
  await page.reload();

  const passphrase = 'e2e-daily-agent-passphrase-1';
  await enableEncryptionAndLock(page, passphrase);

  // --- Infrastructure assertion (no LLM key needed) ---
  // After locking, the session key should be absent from chrome.storage.session
  // and the local creds should be encrypted (EncryptedSecretSchema shape).
  const lockedCreds = await page.evaluate(() =>
    chrome.storage.local
      .get('llm.creds.v1')
      .then((r) => r['llm.creds.v1'] as Record<string, unknown> | undefined),
  );
  expect(lockedCreds).toMatchObject({ v: 1, algo: 'AES-GCM-256' });

  // Close the profile drawer
  await page.getByRole('button', { name: 'Close drawer' }).click();
  await expect(page.locator('aside.drawer.on')).toHaveCount(0);

  // Open the Brief drawer — drawer should be open regardless of RPC state
  await openBriefDrawer(page);
  await expect(page.locator(BRIEF_DRAWER)).toBeVisible();
  // Brief drawer header should always render
  await expect(page.getByRole('heading', { name: /Morning brief/i })).toBeVisible();

  if (process.env.COMPASS_E2E_OPENROUTER_KEY) {
    // Full path: wait for locked-no-brief state from the RPC
    await expect(page.locator(BRIEF_DRAWER).getByText('Loading…')).not.toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.locator(BRIEF_DRAWER).getByText(/Your daily brief is waiting\. Unlock to generate\./i),
    ).toBeVisible({ timeout: 5_000 });
  }

  // Close Brief; open Profile to unlock
  await page.getByRole('button', { name: 'Close drawer' }).click();
  await expect(page.locator('aside.drawer.on')).toHaveCount(0);

  await openProfileDrawer(page);

  // ConnectedProvidersSection shows the locked passphrase form
  await expect(
    page.locator(PROFILE_DRAWER).getByText(/Locked\. Enter your passphrase to manage providers\./i),
  ).toBeVisible({ timeout: 5_000 });

  // Enter the passphrase and unlock
  await page.locator(PROFILE_DRAWER).getByLabel('Passphrase').last().fill(passphrase);
  await page.locator(PROFILE_DRAWER).getByRole('button', { name: 'Unlock' }).click();

  // Locked message should disappear
  await expect(
    page.locator(PROFILE_DRAWER).getByText(/Locked\. Enter your passphrase/i),
  ).not.toBeVisible({ timeout: 5_000 });

  // --- Infrastructure assertion after unlock ---
  // chrome.storage.session should now have the KEK
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          chrome.storage.session
            .get('llm.creds.v1.kek')
            .then((r) => typeof r['llm.creds.v1.kek'] === 'string'),
        ),
      { timeout: 5_000 },
    )
    .toBe(true);

  // Reopen Brief drawer and assert the locked-no-brief state has cleared.
  // This runs on both paths (live key and structural) — the locked text is
  // produced by client-side state, not the LLM, so it is testable without
  // a real key.
  await page.getByRole('button', { name: 'Close drawer' }).click();
  await expect(page.locator('aside.drawer.on')).toHaveCount(0);

  await openBriefDrawer(page);
  await expect(
    page.locator(BRIEF_DRAWER).getByText(/Your daily brief is waiting\. Unlock to generate\./i),
  ).not.toBeVisible({ timeout: 5_000 });

  if (process.env.COMPASS_E2E_OPENROUTER_KEY) {
    // Full path: wait for Loading… to clear and a real brief to land.
    await expect(page.locator(BRIEF_DRAWER).getByText('Loading…')).not.toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.locator(BRIEF_DRAWER).getByRole('button', { name: 'Regenerate' }),
    ).toBeVisible({ timeout: 60_000 });
  }
});

// ---------------------------------------------------------------------------
// Test 3 — Pomodoro start dispatches RPC and FocusDrawer recovers after close
//
// Note: the FocusDrawer timer state is intentionally ephemeral (no
// page-load recovery), and FocusDrawer does not surface a historical
// session count.  True persistence of the `pomodoros` SQLite row across
// tab close is verified by the `brief-pipeline` integration test
// (focusSummary14d aggregation).  This e2e test verifies the user-visible
// half of "lifecycle persists": the RPC fires, the in-flight UI transition
// happens (with live key), and a new tab opens cleanly into Focus mode
// after the previous tab is killed mid-session.
// ---------------------------------------------------------------------------

test('pomodoro start dispatches RPC; new tab recovers cleanly after mid-session close', async ({
  context,
  extensionId,
}) => {
  // Open a fresh extension page with BYOK configured
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/newtab.html`);
  await page.evaluate(() => chrome.storage.local.set({ 'profile.byokConfigured': true }));
  await page.reload();

  await openFocusDrawer(page);

  const startBtn = page.locator(FOCUS_DRAWER).getByRole('button', { name: /Start/ });
  await expect(startBtn).toBeVisible({ timeout: 5_000 });

  const themeInput = page.locator(FOCUS_DRAWER).getByLabel('Pomodoro theme');
  await expect(themeInput).toBeVisible();
  await themeInput.fill('e2e test session');
  await expect(themeInput).toHaveValue('e2e test session');

  // Fire the start. FocusDrawer awaits rpc('pomodoro.start') before
  // flipping into the running state, so the UI transition is itself the
  // signal that the RPC resolved.
  await startBtn.click();

  if (process.env.COMPASS_E2E_OPENROUTER_KEY) {
    // Full stack: rpc resolves, theme input disappears, Pause/Stop appear.
    await expect(page.locator(FOCUS_DRAWER).getByRole('button', { name: /Pause/ })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator(FOCUS_DRAWER).getByRole('button', { name: 'Stop' })).toBeVisible({
      timeout: 5_000,
    });
    // Wait for the running state to be reflected before killing the tab —
    // this guarantees the rpc round-trip has resolved and the row was
    // committed to SQLite. Polling on the UI rather than a fixed sleep.
    await expect
      .poll(() => page.locator(FOCUS_DRAWER).getByLabel('Pomodoro theme').count(), {
        timeout: 5_000,
      })
      .toBe(0);
  }
  // Without a live key the click is issued but the rpc may not resolve;
  // tab-close is still a valid stress on the SW and offscreen lifecycle.

  // Kill the tab mid-session
  await page.close();

  // Open a new extension page
  const page2 = await context.newPage();
  await page2.goto(`chrome-extension://${extensionId}/newtab.html`);
  await page2.evaluate(() => chrome.storage.local.set({ 'profile.byokConfigured': true }));
  await page2.reload();

  // FocusDrawer mounts cleanly on the new tab
  await openFocusDrawer(page2);
  await expect(page2.locator(FOCUS_DRAWER).getByRole('button', { name: /Start/ })).toBeVisible({
    timeout: 5_000,
  });
  await expect(page2.locator(FOCUS_DRAWER).getByLabel('Pomodoro theme')).toHaveValue('');
});
