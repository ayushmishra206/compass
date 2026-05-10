import { NotesAskGroundedSchema } from '@compass/core';
import type { LlmRouter } from './brief.morning.js';

export interface AskGroundedHit {
  noteId: string;
  title: string;
  excerpt: string;
  score: number;
}

export interface AskGroundedDeps {
  router: LlmRouter;
  query: string;
  hits: AskGroundedHit[];
}

export interface AskGroundedResult {
  answer: string | null;
  citations: Array<{ id: string; noteId: string }>;
  reason: string | null;
}

const SYSTEM =
  'You answer the user\'s question using ONLY the notes provided as <note id="nN">…</note> blocks. ' +
  'If not answerable from the notes, set answer=null and reason="not-in-notes". ' +
  'Reference notes inline as [nN]. Citations must be exact ids from the context. ' +
  '1-3 sentences. JSON only: { "answer": string|null, "citations": string[], "reason": string|null }.';

export async function askGrounded(deps: AskGroundedDeps): Promise<AskGroundedResult> {
  if (deps.hits.length === 0) {
    return { answer: null, citations: [], reason: 'no-notes' };
  }
  const idToNoteId = new Map<string, string>();
  const blocks: string[] = [];
  deps.hits.forEach((h, i) => {
    const id = `n${i + 1}`;
    idToNoteId.set(id, h.noteId);
    blocks.push(`<note id="${id}">${h.title}\n${h.excerpt}</note>`);
  });
  const res = await deps.router.executeTask({
    taskId: 'notes.askGrounded',
    schema: NotesAskGroundedSchema,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Question:\n${deps.query}\n\nContext:\n${blocks.join('\n\n')}`,
      },
    ],
    trusted: false,
  });
  const out = res.parsed as { answer: string | null; citations: string[]; reason: string | null };
  const citations = (out.citations ?? [])
    .filter((id) => idToNoteId.has(id))
    .map((id) => ({ id, noteId: idToNoteId.get(id) as string }));
  return { answer: out.answer, citations, reason: out.reason };
}
