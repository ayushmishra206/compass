import { describe, it, expect } from 'vitest';
import {
  NoteSchema,
  NoteChunkSchema,
  AutoLinkRowSchema,
  HybridSearchHitSchema,
  NotesAutolinkSummarySchema,
  NotesAskGroundedSchema,
} from './note';

describe('Note schema', () => {
  it('parses a happy-path fixture', () => {
    const ok = NoteSchema.safeParse({
      id: 'n1',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      title: 'Meeting notes',
      body: 'Discussion about roadmap',
      manualLinks: [],
      autoLinks: [],
      tags: ['work', 'planning'],
      embeddingModel: 'all-MiniLM-L6-v2',
    });
    expect(ok.success).toBe(true);
  });

  it('rejects a missing required field', () => {
    expect(NoteSchema.safeParse({ id: 'n1' }).success).toBe(false);
  });
});

describe('NoteChunk schema', () => {
  it('parses a valid chunk row', () => {
    const v = NoteChunkSchema.parse({ id: 1, noteId: 'n1', chunkIndex: 0, text: 'hello' });
    expect(v.text).toBe('hello');
  });
});

describe('AutoLinkRow schema', () => {
  it('parses a row with null rationale', () => {
    const v = AutoLinkRowSchema.parse({
      srcNoteId: 'a',
      targetNoteId: 'b',
      similarity: 0.85,
      detectedAt: '2026-05-10T00:00:00Z',
      rationale: null,
      rationaleAt: null,
      userFeedback: null,
      dismissed: false,
    });
    expect(v.similarity).toBe(0.85);
  });
});

describe('HybridSearchHit schema', () => {
  it('parses a hit with rrf score', () => {
    const v = HybridSearchHitSchema.parse({
      noteId: 'n1',
      title: 'Q2',
      excerpt: 'launch blockers',
      score: 0.0123,
    });
    expect(v.noteId).toBe('n1');
  });
});

describe('Notes agent output schemas', () => {
  it('NotesAutolinkSummary requires rationale string', () => {
    expect(NotesAutolinkSummarySchema.safeParse({ rationale: 'short' }).success).toBe(true);
    expect(NotesAutolinkSummarySchema.safeParse({}).success).toBe(false);
  });

  it('NotesAskGrounded accepts null answer + defaults', () => {
    const v = NotesAskGroundedSchema.parse({ answer: null });
    expect(v.citations).toEqual([]);
    expect(v.reason).toBeNull();
  });
});
