import type { AutoLink, Note } from '@compass/core';
import { delay } from './_util.js';

/**
 * Stub: returns the note's pre-wired `related` list. Phase 2 swaps this for a
 * real embedding-based neighbor search.
 */
export async function detectAutoLinks(note: Note): Promise<AutoLink[]> {
  await delay(600);
  return note.related;
}
