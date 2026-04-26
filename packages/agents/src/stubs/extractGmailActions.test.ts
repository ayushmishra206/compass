import { describe, expect, it } from 'vitest';
import { extractGmailActions } from './extractGmailActions.js';

describe('extractGmailActions stub', () => {
  it('returns the canned action for known id', async () => {
    const result = await extractGmailActions({ id: 'a1' });
    expect(result?.subject).toContain('pricing');
  });

  it('returns null for unknown id', async () => {
    expect(await extractGmailActions({ id: 'zzz' })).toBeNull();
  });
});
