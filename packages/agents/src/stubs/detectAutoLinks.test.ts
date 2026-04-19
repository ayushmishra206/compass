import { describe, expect, it } from 'vitest';
import { NOTES } from '@compass/core/fixtures';
import { detectAutoLinks } from './detectAutoLinks.js';

describe('detectAutoLinks stub', () => {
  it('returns the related list for a note', async () => {
    const note = NOTES.find((n) => n.id === 'n1')!;
    const links = await detectAutoLinks(note);
    expect(links).toEqual(note.related);
  });

  it('returns [] for a note with no related', async () => {
    const note = NOTES.find((n) => n.id === 'n6')!;
    expect(await detectAutoLinks(note)).toEqual([]);
  });
});
