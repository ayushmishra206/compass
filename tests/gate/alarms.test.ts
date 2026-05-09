import { test, expect } from '../e2e/extension-fixture';

test.describe('gate:alarms', () => {
  test('two alarms registered with valid `when` timestamps after extension load', async ({
    newtabPage,
  }) => {
    // The newtab page has chrome.alarms access (alarms permission is in manifest).
    // Wait briefly to allow the SW bootstrap (top-level void ensureAlarms()) to settle.
    await newtabPage.waitForTimeout(500);

    const alarms = await newtabPage.evaluate(async () => {
      // chrome.alarms.getAll returns Promise<Alarm[]> in MV3.
      return await chrome.alarms.getAll();
    });

    const names = alarms.map((a) => a.name).sort();
    expect(names).toEqual(['eod-reflection', 'morning-brief']);

    const now = Date.now();
    for (const a of alarms) {
      expect(a.scheduledTime).toBeGreaterThan(now);
      // Both alarms scheduled within the next 24h.
      expect(a.scheduledTime).toBeLessThan(now + 25 * 60 * 60 * 1000);
    }
  });

  test('ensureAlarms is idempotent across newtab reloads', async ({ newtabPage }) => {
    await newtabPage.waitForTimeout(500);
    const before = await newtabPage.evaluate(() => chrome.alarms.getAll());

    await newtabPage.reload();
    await newtabPage.waitForTimeout(500);
    const after = await newtabPage.evaluate(() => chrome.alarms.getAll());

    // Same names, same scheduledTime (within drift tolerance handled by ensureAlarms).
    expect(after.map((a) => a.name).sort()).toEqual(before.map((a) => a.name).sort());
    for (const a of after) {
      const prior = before.find((p) => p.name === a.name);
      expect(prior).toBeDefined();
      expect(Math.abs(a.scheduledTime - prior!.scheduledTime)).toBeLessThan(60_000);
    }
  });
});
