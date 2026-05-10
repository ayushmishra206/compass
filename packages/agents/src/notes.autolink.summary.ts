import { NotesAutolinkSummarySchema, type NotesAutolinkSummary } from '@compass/core';
import type { LlmRouter } from './brief.morning.js';

export interface AutolinkSummaryDeps {
  router: LlmRouter;
  noteA: { title: string; body: string };
  noteB: { title: string; body: string };
}

const MAX_BODY = 2000;

const SYSTEM =
  'You are summarizing why two notes from a single user are conceptually related. ' +
  'Output one short sentence (≤ 25 words) referencing only the shared concept. ' +
  'Do not invent. Do not quote either note. ' +
  'Output JSON only: { "rationale": string }.';

function trim(s: string): string {
  return s.length > MAX_BODY ? s.slice(0, MAX_BODY) + '…' : s;
}

export async function generateAutolinkSummary(
  deps: AutolinkSummaryDeps,
): Promise<NotesAutolinkSummary> {
  const userMsg =
    `Note A:\n# ${deps.noteA.title}\n${trim(deps.noteA.body)}\n\n` +
    `Note B:\n# ${deps.noteB.title}\n${trim(deps.noteB.body)}`;
  const res = await deps.router.executeTask({
    taskId: 'notes.autolink.summary',
    schema: NotesAutolinkSummarySchema,
    system: SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
    trusted: true,
  });
  return res.parsed as NotesAutolinkSummary;
}
