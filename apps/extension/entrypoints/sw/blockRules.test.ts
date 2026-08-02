import { describe, expect, it, vi, beforeEach } from 'vitest';
import { applicableRules, applyBlockRules, toDnrRules } from './blockRules';
import type { StoredBlockRule } from '@compass/db';

const CTX = { focusActive: true, blockPageUrl: 'chrome-extension://abc/blocked.html' };

const rule = (over: Partial<StoredBlockRule> = {}): StoredBlockRule => ({
  id: 'r1',
  pattern: 'reddit.com',
  mode: 'soft',
  source: 'user',
  createdAt: '2026-08-02T10:00:00.000Z',
  enabled: true,
  focusOnly: true,
  strikes: 0,
  ...over,
});

describe('applicableRules', () => {
  it('includes an enabled focus-only rule during focus', () => {
    expect(applicableRules([rule()], true)).toHaveLength(1);
  });

  it('excludes a focus-only rule outside focus', () => {
    expect(applicableRules([rule()], false)).toHaveLength(0);
  });

  it('includes an always-on rule outside focus', () => {
    expect(applicableRules([rule({ focusOnly: false })], false)).toHaveLength(1);
  });

  it('excludes a disabled rule even during focus', () => {
    expect(applicableRules([rule({ enabled: false })], true)).toHaveLength(0);
  });
});

describe('toDnrRules', () => {
  it('redirects to the block page', () => {
    const [r] = toDnrRules([rule()], CTX);
    expect(r?.action.type).toBe('redirect');
    expect(r?.action.redirect?.url).toContain('blocked.html');
  });

  it('passes the host so the block page can name it', () => {
    const [r] = toDnrRules([rule()], CTX);
    expect(r?.action.redirect?.url).toContain('host=reddit.com');
  });

  it('never puts the requested path in the redirect', () => {
    const [r] = toDnrRules([rule()], CTX);
    const url = r?.action.redirect?.url ?? '';
    expect(url).not.toContain('/r/');
    expect(url.split('?')[1]).not.toContain('path');
  });

  it('matches subdomains via requestDomains', () => {
    const [r] = toDnrRules([rule()], CTX);
    expect(r?.condition.requestDomains).toEqual(['reddit.com']);
  });

  it('only intercepts top-level navigations, not subresources', () => {
    const [r] = toDnrRules([rule()], CTX);
    expect(r?.condition.resourceTypes).toEqual(['main_frame']);
  });

  it('assigns unique ids', () => {
    const rules = toDnrRules([rule(), rule({ id: 'r2', pattern: 'x.com' })], CTX);
    expect(new Set(rules.map((r) => r.id)).size).toBe(2);
  });

  it('produces nothing when no rule applies', () => {
    expect(toDnrRules([rule({ enabled: false })], CTX)).toEqual([]);
  });
});

describe('applyBlockRules', () => {
  let existing: Array<{ id: number }>;
  let update: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    existing = [];
    update = vi.fn(async () => {});
    vi.stubGlobal('chrome', {
      declarativeNetRequest: {
        getDynamicRules: vi.fn(async () => existing),
        updateDynamicRules: update,
      },
    });
  });

  it('installs rules', async () => {
    const count = await applyBlockRules([rule()], CTX);
    expect(count).toBe(1);
    expect(update.mock.calls[0]![0].addRules).toHaveLength(1);
  });

  it('clears every previous Compass rule, not just the ones being re-added', async () => {
    // A rule the user deleted would otherwise survive forever.
    existing = [{ id: 1000 }, { id: 1001 }, { id: 1002 }];
    await applyBlockRules([rule()], CTX);
    expect(update.mock.calls[0]![0].removeRuleIds).toEqual([1000, 1001, 1002]);
  });

  it('leaves rules outside the reserved id range alone', async () => {
    existing = [{ id: 5 }, { id: 1000 }];
    await applyBlockRules([rule()], CTX);
    expect(update.mock.calls[0]![0].removeRuleIds).toEqual([1000]);
  });

  it('clears everything when no rule applies', async () => {
    existing = [{ id: 1000 }];
    const count = await applyBlockRules([], CTX);
    expect(count).toBe(0);
    expect(update.mock.calls[0]![0].removeRuleIds).toEqual([1000]);
    expect(update.mock.calls[0]![0].addRules).toEqual([]);
  });
});
