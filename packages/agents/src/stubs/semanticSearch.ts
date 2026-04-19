import type { Note } from '@compass/core';
import { NOTES } from '@compass/core/fixtures';
import { delay } from './_util.js';

export interface NoteHit {
  note: Note;
  score: number;
}

/**
 * Stub: token-overlap search across the fixture notes. Returns descending by
 * naive score. Phase 2 replaces with real SQLite-vec hybrid retrieval.
 */
export async function semanticSearch(query: string): Promise<NoteHit[]> {
  await delay(300);
  const trimmed = query.trim();
  if (!trimmed) return [];
  const tokens = trimmed
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  return NOTES.filter((n) => {
    const hay = (n.title + ' ' + n.excerpt + ' ' + n.tags.join(' ')).toLowerCase();
    return tokens.some((w) => hay.includes(w));
  }).map((note, i) => ({ note, score: Math.max(0.1, 0.82 - i * 0.03) }));
}
