import { describe, it, expect } from 'vitest';
import { NoteSchema } from './note';

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
