import { describe, expect, it } from 'vitest';
import { NOTES } from '@compass/core/fixtures';
import { detectAutoLinks } from './detectAutoLinks.js';

describe('detectAutoLinks stub', () => {
  it('returns the autoLinks list for a note', async () => {
    const note = NOTES.find((n) => n.id === 'n1')!;
    const links = await detectAutoLinks(note);
    expect(links).toEqual(note.autoLinks);
  });

  it('returns [] for a note with no autoLinks', async () => {
    const note = NOTES.find((n) => n.id === 'n6')!;
    expect(await detectAutoLinks(note)).toEqual([]);
  });
});
