import type { Page } from '@playwright/test';
import { test, expect } from './setup/fixtures.js';

// Selectors reused across tests
const PROFILE_DRAWER = 'aside.drawer.on[data-kind="profile"]';
const ONBOARDING_DRAWER = 'aside.drawer.on[data-kind="onboarding"]';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Open the Profile drawer via the topbar avatar button. */
async function openProfileDrawer(page: Page) {
  await page.getByRole('button', { name: 'Profile' }).click();
  await expect(page.locator(PROFILE_DRAWER)).toBeVisible();
}

/**
 * Complete onboarding inline (steps 1 → 2 → 3 → skip encryption).
 *
 * The KeyValidator calls `rpc('llm.validateKey', …)` which reaches a real LLM
 * provider.  To avoid hard-coding a live key we inject a fake credential
 * directly into chrome.storage and bypass the KeyValidator altogether —
 * mirroring what the `extensionPage` fixture does (sets `profile.byokConfigured`
 * to skip onboarding entirely), but done here from inside a `freshExtensionPage`
 * so the state transition through the onboarding steps is exercised.
 *
 * If you want to run the full KeyValidator path, supply a real API key via the
 * COMPASS_E2E_OPENROUTER_KEY environment variable; the helper will use it and
 * fall back to the storage-injection path when absent.
 */
async function completeOnboardingSkipEncryption(page: Page) {
  // Step 1 — welcome screen must be visible
  await expect(page.locator(ONBOARDING_DRAWER)).toBeVisible();
  await expect(
    page.locator(ONBOARDING_DRAWER).getByRole('heading', { name: 'Welcome to Compass' }).first(),
  ).toBeVisible();

  const apiKey = process.env.COMPASS_E2E_OPENROUTER_KEY;

  if (apiKey) {
    // Full flow: step 1 → 2 via button, then use KeyValidator with a real key.
    await page.getByRole('button', { name: 'Connect a model' }).click();
    await expect(
      page.locator(ONBOARDING_DRAWER).getByRole('heading', { name: 'Connect a model' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'openrouter' }).click();
    await page.getByLabel('API key').fill(apiKey);
    await page.getByRole('button', { name: 'Validate & continue' }).click();
    // After validation succeeds the drawer advances to step 3
    await expect(
      page.locator(ONBOARDING_DRAWER).getByRole('heading', { name: 'Optional: encryption' }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Skip for now' }).click();
  } else {
    // Fast path: inject creds directly and mark onboarding complete.
    // This tests the post-onboarding Profile UI without requiring a live key.
    await page.evaluate(() => {
      const now = new Date().toISOString();
      chrome.storage.local.set({
        'llm.creds.v1': {
          default: 'openrouter',
          openrouter: { apiKey: 'or-test-key-e2e', addedAt: now, lastValidatedAt: now },
        },
        'profile.byokConfigured': true,
      });
    });
    await page.reload();
    // The onboarding drawer should be gone after byokConfigured is set
    await expect(page.locator(ONBOARDING_DRAWER)).not.toBeVisible();
    return; // drawer is already closed; no skip button to click
  }

  // Onboarding drawer should close after "Skip for now"
  await expect(page.locator(ONBOARDING_DRAWER)).not.toBeVisible();
}

// ---------------------------------------------------------------------------
// Test 1 — add a second provider via ProfileDrawer
// ---------------------------------------------------------------------------

test('add second provider via ProfileDrawer', async ({ extensionPage: page }) => {
  // extensionPage has byokConfigured=true but no actual creds in storage.
  // Seed a first provider so the "Connected providers" section renders rows
  // and the "+ Add another provider" button is shown.
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

  await openProfileDrawer(page);

  // One provider row should be visible
  const providerRows = page.locator(PROFILE_DRAWER).getByText('openrouter');
  await expect(providerRows.first()).toBeVisible();

  // Click "+ Add another provider"
  await page
    .locator(PROFILE_DRAWER)
    .getByRole('button', { name: '+ Add another provider' })
    .click();

  // The KeyValidator form should appear — select openai
  await page.locator(PROFILE_DRAWER).getByRole('button', { name: 'openai' }).click();

  // Fill in a (fake) API key — handleAddAnother does NOT call rpc; it stores
  // the key directly, so we do not need a live provider here.
  // NOTE: ConnectedProvidersSection.handleAddAnother stores creds without
  // calling rpc.validateKey — the KeyValidator inside "add" mode DOES call
  // rpc.validateKey before invoking onValidated.  If the RPC is unavailable
  // (no real key / no background service) the test will stop here and show
  // a "Validation failed" error.  That is expected in CI without test keys.
  const addKey = process.env.COMPASS_E2E_OPENAI_KEY ?? 'sk-test-fake-e2e-key';
  await page.getByLabel('API key').fill(addKey);

  if (process.env.COMPASS_E2E_OPENAI_KEY) {
    await page.locator(PROFILE_DRAWER).getByRole('button', { name: 'Add provider' }).click();
    // Wait for the form to close and two provider rows to be rendered
    await expect(
      page.locator(PROFILE_DRAWER).getByRole('button', { name: '+ Add another provider' }),
    ).not.toBeVisible({ timeout: 10_000 });

    // Both openrouter and openai should now appear
    await expect(page.locator(PROFILE_DRAWER).getByText('openrouter').first()).toBeVisible();
    await expect(page.locator(PROFILE_DRAWER).getByText('openai').first()).toBeVisible();
  } else {
    // Without a live key we cannot call through the RPC; assert the form is
    // shown correctly and bail — structural correctness is the goal.
    await expect(page.getByLabel('API key')).toHaveValue(addKey);
    // The "Add provider" submit button should be enabled now that a key is filled
    await expect(
      page.locator(PROFILE_DRAWER).getByRole('button', { name: 'Add provider' }),
    ).toBeEnabled();
  }
});

// ---------------------------------------------------------------------------
// Test 2 — encryption opt-in round-trip
// ---------------------------------------------------------------------------

test('encryption opt-in round-trip', async ({ freshExtensionPage: page }) => {
  await completeOnboardingSkipEncryption(page);

  await openProfileDrawer(page);

  // EncryptionSection should show "Off" state
  await expect(
    page.locator(PROFILE_DRAWER).getByText(/Off — keys are stored unencrypted/i),
  ).toBeVisible();

  // Click "Enable encryption"
  await page.locator(PROFILE_DRAWER).getByRole('button', { name: 'Enable encryption' }).click();

  // PassphraseSetForm should appear
  await expect(
    page.locator(PROFILE_DRAWER).getByRole('button', { name: /Encrypt with this passphrase/i }),
  ).toBeVisible();

  // Enter a strong passphrase (12+ chars, matching confirm)
  const passphrase = 'correct horse battery staple 1';
  await page.locator(PROFILE_DRAWER).getByLabel('Passphrase').first().fill(passphrase);
  await page.locator(PROFILE_DRAWER).getByLabel('Confirm passphrase').fill(passphrase);

  // Submit button should be enabled and clickable
  const encryptBtn = page
    .locator(PROFILE_DRAWER)
    .getByRole('button', { name: /Encrypt with this passphrase/i });
  await expect(encryptBtn).toBeEnabled();
  await encryptBtn.click();

  // EncryptionSection should now show "On" state
  await expect(
    page.locator(PROFILE_DRAWER).getByText(/On — keys are encrypted at rest/i),
  ).toBeVisible({ timeout: 5_000 });

  // Assert the stored value matches EncryptedSecretSchema shape:
  // { v: 1, algo: 'AES-GCM-256', kdf: 'PBKDF2-SHA256-250k', salt, iv, ct }
  const stored = await page.evaluate(() =>
    chrome.storage.local.get('llm.creds.v1').then((r) => r['llm.creds.v1']),
  );

  expect(stored).not.toBeNull();
  expect(stored).toMatchObject({
    v: 1,
    algo: 'AES-GCM-256',
    kdf: 'PBKDF2-SHA256-250k',
  });
  expect(typeof stored.salt).toBe('string');
  expect(typeof stored.iv).toBe('string');
  expect(typeof stored.ct).toBe('string');
  expect(stored.salt.length).toBeGreaterThan(0);
  expect(stored.iv.length).toBeGreaterThan(0);
  expect(stored.ct.length).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// Test 3 — forgotten passphrase wipes credentials and re-arms onboarding
// ---------------------------------------------------------------------------

test('forgotten passphrase wipes credentials and re-arms onboarding', async ({
  freshExtensionPage: page,
}) => {
  await completeOnboardingSkipEncryption(page);

  await openProfileDrawer(page);

  // Enable encryption
  await page.locator(PROFILE_DRAWER).getByRole('button', { name: 'Enable encryption' }).click();

  const passphrase = 'correct horse battery staple 2';
  await page.locator(PROFILE_DRAWER).getByLabel('Passphrase').first().fill(passphrase);
  await page.locator(PROFILE_DRAWER).getByLabel('Confirm passphrase').fill(passphrase);
  await page
    .locator(PROFILE_DRAWER)
    .getByRole('button', { name: /Encrypt with this passphrase/i })
    .click();

  // Wait for "On" state
  await expect(
    page.locator(PROFILE_DRAWER).getByText(/On — keys are encrypted at rest/i),
  ).toBeVisible({ timeout: 5_000 });

  // Lock the vault
  await page.locator(PROFILE_DRAWER).getByRole('button', { name: 'Lock now' }).click();

  // ConnectedProvidersSection should now be locked — "Forgot passphrase?" link visible
  await expect(
    page.locator(PROFILE_DRAWER).getByRole('button', { name: 'Forgot passphrase?' }),
  ).toBeVisible();

  // Click "Forgot passphrase?"
  await page.locator(PROFILE_DRAWER).getByRole('button', { name: 'Forgot passphrase?' }).click();

  // Confirm the destructive ForgotPassphrasePrompt
  await expect(
    page.locator(PROFILE_DRAWER).getByText(/permanently erase your saved API keys/i),
  ).toBeVisible();
  await page
    .locator(PROFILE_DRAWER)
    .getByRole('button', { name: 'Erase keys and start over' })
    .click();

  // OnboardingDrawer step 1 should appear (drawer re-armed)
  await expect(page.locator(ONBOARDING_DRAWER)).toBeVisible({ timeout: 5_000 });
  await expect(
    page.locator(ONBOARDING_DRAWER).getByRole('heading', { name: 'Welcome to Compass' }).first(),
  ).toBeVisible();

  // Assert both storage keys are wiped
  const after = await page.evaluate(() =>
    chrome.storage.local
      .get(['llm.creds.v1', 'profile.byokConfigured'])
      .then((r) => ({ creds: r['llm.creds.v1'], configured: r['profile.byokConfigured'] })),
  );
  expect(after.creds).toBeUndefined();
  expect(after.configured).toBeUndefined();
});
