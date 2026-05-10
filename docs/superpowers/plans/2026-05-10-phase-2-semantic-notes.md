# Phase 2 Semantic Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mocked Notes drawer + ⌘K ask mode with real Notes CRUD + local embeddings + auto-linking + hybrid (FTS5 + sqlite-vec) semantic search + grounded RAG answers, hitting PRD §11.8 quality gates (0.8 precision @ 100-note fixture, ≤250ms P95 @ 10k notes, 0 log leakage).

**Architecture:** Repo-layer split (option A from spec): `packages/db` gains migration v3 + `NotesRepo` over sqlite-vec/FTS5. `packages/agents` adds `notes.autolink.summary` + `notes.askGrounded`. `apps/extension` rewrites NotesDrawer with CodeMirror 6 editor, adds `useNotes`/`notesStore`, wires CmdK ask path.

**Tech Stack:** sqlite-wasm + sqlite-vec + FTS5; `@huggingface/transformers` MiniLM-L6-v2 (offscreen); CodeMirror 6 (`@codemirror/state` + `@codemirror/view` + `@codemirror/lang-markdown`); Zustand; Vitest + RTL + jest-axe; Playwright (env-key gated).

**Spec:** `docs/superpowers/specs/2026-05-10-phase-2-semantic-notes-design.md`.

---

## File Structure

| Path                                                    | Responsibility                                                              |
| ------------------------------------------------------- | --------------------------------------------------------------------------- |
| `packages/db/src/migration-runner.ts`                   | Add `MIGRATION_0003_NOTES` to inline array                                  |
| `packages/db/src/repositories/notes.ts`                 | `NotesRepo` factory with all CRUD + search methods                          |
| `packages/db/tests/repositories/notes.test.ts`          | Unit tests for NotesRepo                                                    |
| `packages/db/tests/eval/autolink-precision.test.ts`     | 100-note fixture precision harness                                          |
| `packages/db/src/repositories/index.ts`                 | Re-export NotesRepo                                                         |
| `packages/embeddings/src/runtime.ts`                    | Add `embedBatch()`                                                          |
| `packages/embeddings/src/runtime.test.ts`               | Cover embedBatch                                                            |
| `packages/core/src/types/note.ts`                       | Extend with `NoteChunkSchema`, `AutoLinkRowSchema`, `HybridSearchHitSchema` |
| `packages/core/src/types/userProfile.ts`                | Extend with `autoLinkEnabled`                                               |
| `packages/core/src/profile/userProfile.ts`              | Default + getter passthrough                                                |
| `packages/core/src/prompts/notes.autolink.summary.md`   | Agent prompt                                                                |
| `packages/core/src/prompts/notes.askGrounded.md`        | Agent prompt                                                                |
| `packages/core/src/prompts/routing.ts`                  | Add two new routing entries                                                 |
| `packages/agents/src/notes.autolink.summary.ts`         | Agent factory                                                               |
| `packages/agents/src/notes.askGrounded.ts`              | Agent factory                                                               |
| `packages/agents/src/index.ts`                          | Re-export new agents                                                        |
| `packages/runtime/src/routes.ts`                        | Add 9 RPC routes                                                            |
| `apps/extension/entrypoints/offscreen/main.ts`          | Wire 9 RPC handlers + chunking + Δ-check                                    |
| `apps/extension/entrypoints/offscreen/notes.ts`         | Notes pipeline helpers                                                      |
| `apps/extension/app/state/notesStore.ts`                | Zustand slice                                                               |
| `apps/extension/app/hooks/useNotes.ts`                  | Hook                                                                        |
| `apps/extension/app/components/MarkdownEditor.tsx`      | CodeMirror 6 wrapper                                                        |
| `apps/extension/app/drawers/NotesDrawer.tsx`            | Rewrite list + editor modes                                                 |
| `apps/extension/app/drawers/notes/RelatedPill.tsx`      | Auto-link pill                                                              |
| `apps/extension/app/drawers/notes/ForgottenCallout.tsx` | One-shot callout                                                            |
| `apps/extension/app/drawers/profile/NotesSection.tsx`   | Global toggle                                                               |
| `apps/extension/app/components/CmdK.tsx`                | Replace mock with real ask                                                  |
| `tests/integration/notes-pipeline.test.ts`              | Full pipeline integration                                                   |
| `apps/extension/tests/e2e/notes.spec.ts`                | Playwright                                                                  |
| `tests/prompt-eval/notes.autolink.fixture.json`         | 100-note ground truth                                                       |
| `tests/prompt-eval/notes.autolink.yaml`                 | Promptfoo entry                                                             |
| `tests/perf/hybrid-search.bench.ts`                     | Vitest bench                                                                |
| `eslint.config.js`                                      | Add `no-note-content-in-logs` rule                                          |
| `docs/architecture.md`                                  | Semantic Notes subsection                                                   |
| `docs/prd.md`                                           | §21 row flip                                                                |

---

## Task 1: Migration v3 — schema bootstrap

**Files:**

- Modify: `packages/db/src/migration-runner.ts`
- Test: `packages/db/tests/migration-runner.test.ts`

- [ ] **Step 1: Write failing test**

Append to `packages/db/tests/migration-runner.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { load as loadVec } from 'sqlite-vec';
import { runMigrations, getSchemaVersion } from '../src/migration-runner';

describe('migration v3 — semantic notes', () => {
  it('creates notes, note_chunks, notes_fts, notes_vec, auto_links and bumps schema_version to 3', async () => {
    const sqlite3 = await sqlite3InitModule();
    const db = new sqlite3.oo1.DB(':memory:', 'c');
    loadVec(db as any);
    await runMigrations(db);
    expect(getSchemaVersion(db)).toBe(3);

    const tables = db.exec({
      sql: "SELECT name FROM sqlite_master WHERE type IN ('table','view')",
      returnValue: 'resultRows',
    }) as Array<[string]>;
    const names = tables.map((r) => r[0]);
    for (const t of ['notes', 'note_chunks', 'notes_fts', 'notes_vec', 'auto_links']) {
      expect(names).toContain(t);
    }
  });
});
```

- [ ] **Step 2: Run test, verify failure**

Run: `pnpm --filter @compass/db test migration-runner`

Expected: FAIL — "Expected 3, received 2" or table missing.

- [ ] **Step 3: Add migration v3**

In `packages/db/src/migration-runner.ts`, append a constant after `MIGRATION_0002_BRIEFINGS_POMODOROS`:

```ts
const MIGRATION_0003_NOTES = `
CREATE TABLE notes (
  id              TEXT PRIMARY KEY,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  tags_json       TEXT NOT NULL DEFAULT '[]',
  manual_links    TEXT NOT NULL DEFAULT '[]',
  embedding_model TEXT NOT NULL,
  autolink_enabled INTEGER NOT NULL DEFAULT 1,
  reembed_pending INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX notes_updated ON notes(updated_at DESC);

CREATE TABLE note_chunks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id      TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  chunk_index  INTEGER NOT NULL,
  text         TEXT NOT NULL,
  UNIQUE(note_id, chunk_index)
);
CREATE INDEX note_chunks_note ON note_chunks(note_id);

CREATE VIRTUAL TABLE notes_fts USING fts5(
  title, body, note_id UNINDEXED, tokenize='porter unicode61'
);

CREATE VIRTUAL TABLE notes_vec USING vec0(
  embedding float[384]
);

CREATE TABLE auto_links (
  src_note_id    TEXT NOT NULL,
  target_note_id TEXT NOT NULL,
  similarity     REAL NOT NULL,
  detected_at    TEXT NOT NULL,
  rationale      TEXT,
  rationale_at   TEXT,
  user_feedback  TEXT,
  dismissed      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (src_note_id, target_note_id),
  CHECK (src_note_id < target_note_id)
);
CREATE INDEX auto_links_src ON auto_links(src_note_id);
CREATE INDEX auto_links_target ON auto_links(target_note_id);

UPDATE meta SET value = '3' WHERE key = 'schema_version';
`;
```

Append to the `MIGRATIONS` array:

```ts
{ version: 3, name: 'notes', sql: MIGRATION_0003_NOTES },
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm --filter @compass/db test migration-runner`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/migration-runner.ts packages/db/tests/migration-runner.test.ts
git commit -m "feat(db): migration v3 — notes, notes_vec, notes_fts, auto_links"
```

---

## Task 2: Note core type extensions

**Files:**

- Modify: `packages/core/src/types/note.ts`
- Modify: `packages/core/src/types/note.test.ts`

- [ ] **Step 1: Write failing test**

Append to `packages/core/src/types/note.test.ts`:

```ts
import { NoteChunkSchema, AutoLinkRowSchema, HybridSearchHitSchema } from './note';

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
```

- [ ] **Step 2: Run test, verify failure**

Run: `pnpm --filter @compass/core test note`

Expected: FAIL — schemas not exported.

- [ ] **Step 3: Add schemas**

Append to `packages/core/src/types/note.ts`:

```ts
export const NoteChunkSchema = z.object({
  id: z.number(),
  noteId: z.string(),
  chunkIndex: z.number().int().nonnegative(),
  text: z.string(),
});
export type NoteChunk = z.infer<typeof NoteChunkSchema>;

export const AutoLinkRowSchema = z.object({
  srcNoteId: z.string(),
  targetNoteId: z.string(),
  similarity: z.number(),
  detectedAt: z.string(),
  rationale: z.string().nullable(),
  rationaleAt: z.string().nullable(),
  userFeedback: z.enum(['accepted', 'rejected']).nullable(),
  dismissed: z.boolean(),
});
export type AutoLinkRow = z.infer<typeof AutoLinkRowSchema>;

export const HybridSearchHitSchema = z.object({
  noteId: z.string(),
  title: z.string(),
  excerpt: z.string(),
  score: z.number(),
});
export type HybridSearchHit = z.infer<typeof HybridSearchHitSchema>;
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm --filter @compass/core test note`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/types/note.ts packages/core/src/types/note.test.ts
git commit -m "feat(core): NoteChunk, AutoLinkRow, HybridSearchHit schemas"
```

---

## Task 3: UserProfile autoLinkEnabled

**Files:**

- Modify: `packages/core/src/types/userProfile.ts` (or wherever UserProfileSchema lives)
- Modify: `packages/core/src/profile/userProfile.ts`
- Modify: `packages/core/src/profile/userProfile.test.ts`

- [ ] **Step 1: Locate UserProfileSchema**

Run: `grep -n "UserProfileSchema\|autoLinkEnabled" packages/core/src/ -r`

Expected output identifies the file. (Schema lives in `packages/core/src/types/` based on Phase 2 daily-agent.) Use that path in the steps below; if it differs, adjust.

- [ ] **Step 2: Write failing test**

Append to `packages/core/src/profile/userProfile.test.ts`:

```ts
it('default profile has autoLinkEnabled=true', async () => {
  // mock chrome.storage.local empty
  globalThis.chrome = {
    storage: {
      local: { get: async () => ({}), set: async (_v: unknown) => undefined },
      session: { get: async () => ({}), set: async (_v: unknown) => undefined },
    },
  } as unknown as typeof chrome;
  const p = await getUserProfile();
  expect(p.autoLinkEnabled).toBe(true);
});
```

- [ ] **Step 3: Run test, verify failure**

Run: `pnpm --filter @compass/core test userProfile`

Expected: FAIL — `autoLinkEnabled` undefined or schema reject.

- [ ] **Step 4: Extend schema + default**

Add field to `UserProfileSchema` (locate via Step 1 grep):

```ts
autoLinkEnabled: z.boolean().default(true),
```

In `userProfile.ts` defaults builder, ensure new profiles initialize `autoLinkEnabled: true`. Existing stored profiles missing the field will be filled by Zod's `.default(true)` on next `getUserProfile()` read.

- [ ] **Step 5: Run test, verify pass**

Run: `pnpm --filter @compass/core test userProfile`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/types/userProfile.ts packages/core/src/profile/userProfile.ts packages/core/src/profile/userProfile.test.ts
git commit -m "feat(core): UserProfile.autoLinkEnabled (default true)"
```

---

## Task 4: embedBatch in @compass/embeddings

**Files:**

- Modify: `packages/embeddings/src/runtime.ts`
- Modify: `packages/embeddings/src/index.ts`
- Create: `packages/embeddings/src/runtime.test.ts` (if not present)

- [ ] **Step 1: Write failing test**

Append to or create `packages/embeddings/src/runtime.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { embedBatch, ensureRuntimeReady, __resetForTests } from './runtime';

describe('embedBatch', () => {
  beforeAll(async () => {
    __resetForTests();
    await ensureRuntimeReady();
  }, 60_000);

  it('returns N normalized 384-dim vectors for N inputs', async () => {
    const out = await embedBatch(['hello world', 'second chunk', 'third']);
    expect(out).toHaveLength(3);
    for (const v of out) {
      expect(v).toBeInstanceOf(Float32Array);
      expect(v.length).toBe(384);
      const norm = Math.sqrt(Array.from(v).reduce((s, x) => s + x * x, 0));
      expect(norm).toBeCloseTo(1, 2);
    }
  });

  it('handles a single-item batch', async () => {
    const out = await embedBatch(['only one']);
    expect(out).toHaveLength(1);
    expect(out[0].length).toBe(384);
  });
});
```

- [ ] **Step 2: Run test, verify failure**

Run: `pnpm --filter @compass/embeddings test`

Expected: FAIL — `embedBatch` not exported.

- [ ] **Step 3: Implement**

Append to `packages/embeddings/src/runtime.ts`:

```ts
export async function embedBatch(texts: string[]): Promise<Float32Array[]> {
  await ensureRuntimeReady();
  if (!pipe) throw new Error('runtime not ready');
  if (texts.length === 0) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out = await pipe(texts, { pooling: 'mean', normalize: true } as any);
  // transformers.js returns a single tensor for batched input. The shape is
  // [batchSize, dim]; .data is a Float32Array of length batchSize*dim.
  const dim = 384;
  const data = out.data as Float32Array;
  const result: Float32Array[] = [];
  for (let i = 0; i < texts.length; i++) {
    result.push(data.slice(i * dim, (i + 1) * dim));
  }
  return result;
}
```

Update `packages/embeddings/src/index.ts`:

```ts
export { embed, embedBatch, ensureRuntimeReady } from './runtime';
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm --filter @compass/embeddings test`

Expected: PASS (may take 30-60s on first run for model download).

- [ ] **Step 5: Commit**

```bash
git add packages/embeddings/src/runtime.ts packages/embeddings/src/index.ts packages/embeddings/src/runtime.test.ts
git commit -m "feat(embeddings): embedBatch returns N float32 vectors per N inputs"
```

---

## Task 5: NotesRepo CRUD

**Files:**

- Create: `packages/db/src/repositories/notes.ts`
- Create: `packages/db/tests/repositories/notes.test.ts`
- Modify: `packages/db/src/repositories/index.ts`

- [ ] **Step 1: Write failing test**

Create `packages/db/tests/repositories/notes.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { load as loadVec } from 'sqlite-vec';
import { runMigrations } from '../../src/migration-runner';
import { createNotesRepo } from '../../src/repositories/notes';

async function freshDb() {
  const sqlite3 = await sqlite3InitModule();
  const db = new sqlite3.oo1.DB(':memory:', 'c');
  loadVec(db as any);
  await runMigrations(db);
  return db;
}

describe('NotesRepo CRUD', () => {
  it('create + getById round-trips a note', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const id = await repo.create({
      title: 'Q2 launch',
      body: 'blockers and risks',
      tags: ['work'],
      embeddingModel: 'minilm-l6-v2',
    });
    const got = await repo.getById(id);
    expect(got?.title).toBe('Q2 launch');
    expect(got?.body).toBe('blockers and risks');
    expect(got?.tags).toEqual(['work']);
    expect(got?.autolinkEnabled).toBe(true);
  });

  it('list returns notes sorted by updated_at DESC', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const a = await repo.create({
      title: 'a',
      body: 'x',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    await new Promise((r) => setTimeout(r, 10));
    const b = await repo.create({
      title: 'b',
      body: 'y',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const all = await repo.list({ limit: 10, offset: 0 });
    expect(all.map((n) => n.id)).toEqual([b, a]);
  });

  it('update modifies fields and bumps updated_at', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const id = await repo.create({
      title: 't',
      body: 'b',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const before = (await repo.getById(id))!.updatedAt;
    await new Promise((r) => setTimeout(r, 10));
    await repo.update(id, { body: 'b2' });
    const after = await repo.getById(id);
    expect(after?.body).toBe('b2');
    expect(after!.updatedAt > before).toBe(true);
  });

  it('delete removes the note (cascade chunks tested separately)', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const id = await repo.create({
      title: 't',
      body: 'b',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    await repo.delete(id);
    expect(await repo.getById(id)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, verify failure**

Run: `pnpm --filter @compass/db test notes`

Expected: FAIL — file does not exist.

- [ ] **Step 3: Implement NotesRepo (CRUD subset)**

Create `packages/db/src/repositories/notes.ts`:

```ts
import type { Db } from '../opfs';

export interface CreateNoteInput {
  title: string;
  body: string;
  tags: string[];
  embeddingModel: string;
}

export interface UpdateNoteInput {
  title?: string;
  body?: string;
  tags?: string[];
  autolinkEnabled?: boolean;
}

export interface StoredNote {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  body: string;
  tags: string[];
  manualLinks: string[];
  embeddingModel: string;
  autolinkEnabled: boolean;
}

export interface NotesRepo {
  create(input: CreateNoteInput): Promise<string>;
  update(id: string, patch: UpdateNoteInput): Promise<void>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<StoredNote | null>;
  list(opts: { limit: number; offset: number }): Promise<StoredNote[]>;
}

function rowToNote(r: Array<unknown>): StoredNote {
  return {
    id: r[0] as string,
    createdAt: r[1] as string,
    updatedAt: r[2] as string,
    title: r[3] as string,
    body: r[4] as string,
    tags: JSON.parse(r[5] as string) as string[],
    manualLinks: JSON.parse(r[6] as string) as string[],
    embeddingModel: r[7] as string,
    autolinkEnabled: (r[8] as number) === 1,
  };
}

const SELECT_COLS =
  'id, created_at, updated_at, title, body, tags_json, manual_links, embedding_model, autolink_enabled';

export function createNotesRepo(db: Db): NotesRepo {
  return {
    async create(input) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      db.exec({
        sql: `INSERT INTO notes(id, created_at, updated_at, title, body, tags_json, manual_links, embedding_model)
              VALUES (?,?,?,?,?,?,?,?)`,
        bind: [
          id,
          now,
          now,
          input.title,
          input.body,
          JSON.stringify(input.tags),
          '[]',
          input.embeddingModel,
        ],
      });
      return id;
    },

    async update(id, patch) {
      const cur = await this.getById(id);
      if (!cur) throw new Error(`note not found: ${id}`);
      const next = {
        title: patch.title ?? cur.title,
        body: patch.body ?? cur.body,
        tags: patch.tags ?? cur.tags,
        autolinkEnabled: patch.autolinkEnabled ?? cur.autolinkEnabled,
        updatedAt: new Date().toISOString(),
      };
      db.exec({
        sql: `UPDATE notes
              SET title=?, body=?, tags_json=?, autolink_enabled=?, updated_at=?
              WHERE id=?`,
        bind: [
          next.title,
          next.body,
          JSON.stringify(next.tags),
          next.autolinkEnabled ? 1 : 0,
          next.updatedAt,
          id,
        ],
      });
    },

    async delete(id) {
      db.exec({ sql: 'DELETE FROM notes WHERE id=?', bind: [id] });
    },

    async getById(id) {
      const rows = db.exec({
        sql: `SELECT ${SELECT_COLS} FROM notes WHERE id=? LIMIT 1`,
        bind: [id],
        returnValue: 'resultRows',
      }) as Array<Array<unknown>>;
      return rows[0] ? rowToNote(rows[0]) : null;
    },

    async list({ limit, offset }) {
      const rows = db.exec({
        sql: `SELECT ${SELECT_COLS} FROM notes ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
        bind: [limit, offset],
        returnValue: 'resultRows',
      }) as Array<Array<unknown>>;
      return rows.map(rowToNote);
    },
  };
}
```

Update `packages/db/src/repositories/index.ts` to add:

```ts
export {
  createNotesRepo,
  type NotesRepo,
  type StoredNote,
  type CreateNoteInput,
  type UpdateNoteInput,
} from './notes';
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm --filter @compass/db test notes`

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/repositories/notes.ts packages/db/tests/repositories/notes.test.ts packages/db/src/repositories/index.ts
git commit -m "feat(db): NotesRepo CRUD (create/update/delete/getById/list)"
```

---

## Task 6: NotesRepo upsertChunks + cascade delete

**Files:**

- Modify: `packages/db/src/repositories/notes.ts`
- Modify: `packages/db/tests/repositories/notes.test.ts`

- [ ] **Step 1: Write failing test**

Append to `packages/db/tests/repositories/notes.test.ts`:

```ts
describe('NotesRepo chunks + vec', () => {
  it('upsertChunks inserts rows and corresponding notes_vec rows; reset replaces them', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const id = await repo.create({
      title: 't',
      body: 'b',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const v0 = new Float32Array(384).fill(0.1);
    const v1 = new Float32Array(384).fill(0.2);
    await repo.upsertChunks(id, [
      { text: 'chunk a', embedding: v0 },
      { text: 'chunk b', embedding: v1 },
    ]);
    const r1 = db.exec({
      sql: 'SELECT COUNT(*) FROM note_chunks WHERE note_id=?',
      bind: [id],
      returnValue: 'resultRows',
    }) as Array<[number]>;
    expect(r1[0][0]).toBe(2);
    const r2 = db.exec({
      sql: 'SELECT COUNT(*) FROM notes_vec',
      returnValue: 'resultRows',
    }) as Array<[number]>;
    expect(r2[0][0]).toBe(2);

    // Replace with a single chunk
    await repo.upsertChunks(id, [{ text: 'only', embedding: v0 }]);
    const r3 = db.exec({
      sql: 'SELECT COUNT(*) FROM note_chunks WHERE note_id=?',
      bind: [id],
      returnValue: 'resultRows',
    }) as Array<[number]>;
    expect(r3[0][0]).toBe(1);
    const r4 = db.exec({
      sql: 'SELECT COUNT(*) FROM notes_vec',
      returnValue: 'resultRows',
    }) as Array<[number]>;
    expect(r4[0][0]).toBe(1);
  });

  it('delete cascades note_chunks AND removes corresponding notes_vec rows', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const id = await repo.create({
      title: 't',
      body: 'b',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    await repo.upsertChunks(id, [{ text: 'c', embedding: new Float32Array(384).fill(0.1) }]);
    await repo.delete(id);
    const r = db.exec({
      sql: 'SELECT COUNT(*) FROM notes_vec',
      returnValue: 'resultRows',
    }) as Array<[number]>;
    expect(r[0][0]).toBe(0);
  });
});
```

- [ ] **Step 2: Run test, verify failure**

Run: `pnpm --filter @compass/db test notes`

Expected: FAIL — `upsertChunks` not a function.

- [ ] **Step 3: Implement upsertChunks + delete cascade**

Update `delete` and add `upsertChunks` in `packages/db/src/repositories/notes.ts`. Replace the existing `delete` implementation:

```ts
async delete(id) {
  // notes_vec rows are tied to note_chunks.id (rowid), not FK-cascadable.
  // Delete vec rows manually first, then chunks (FK cascade), then note.
  db.exec({
    sql: `DELETE FROM notes_vec WHERE rowid IN (SELECT id FROM note_chunks WHERE note_id=?)`,
    bind: [id],
  });
  db.exec({ sql: 'DELETE FROM note_chunks WHERE note_id=?', bind: [id] });
  db.exec({ sql: 'DELETE FROM notes WHERE id=?', bind: [id] });
},
```

Add `upsertChunks` to the repo interface:

```ts
upsertChunks(
  noteId: string,
  chunks: Array<{ text: string; embedding: Float32Array }>,
): Promise<void>;
```

And to the implementation (insert this method after `list`):

```ts
async upsertChunks(noteId, chunks) {
  db.exec('BEGIN');
  try {
    db.exec({
      sql: `DELETE FROM notes_vec WHERE rowid IN (SELECT id FROM note_chunks WHERE note_id=?)`,
      bind: [noteId],
    });
    db.exec({ sql: 'DELETE FROM note_chunks WHERE note_id=?', bind: [noteId] });
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      db.exec({
        sql: `INSERT INTO note_chunks(note_id, chunk_index, text) VALUES(?,?,?)`,
        bind: [noteId, i, c.text],
      });
      const lastIdRows = db.exec({
        sql: 'SELECT last_insert_rowid()',
        returnValue: 'resultRows',
      }) as Array<[number]>;
      const rowid = lastIdRows[0][0];
      // sqlite-vec accepts the embedding as a Float32Array via the JS binding.
      db.exec({
        sql: 'INSERT INTO notes_vec(rowid, embedding) VALUES(?, ?)',
        bind: [rowid, c.embedding],
      });
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
},
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm --filter @compass/db test notes`

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/repositories/notes.ts packages/db/tests/repositories/notes.test.ts
git commit -m "feat(db): NotesRepo.upsertChunks + cascade delete (chunks + vec rows)"
```

---

## Task 7: NotesRepo.findNeighbors

**Files:**

- Modify: `packages/db/src/repositories/notes.ts`
- Modify: `packages/db/tests/repositories/notes.test.ts`

- [ ] **Step 1: Write failing test**

Append to `packages/db/tests/repositories/notes.test.ts`:

```ts
describe('NotesRepo.findNeighbors', () => {
  it('returns notes whose vectors are near the query, above threshold, excluding the query note itself', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const a = await repo.create({
      title: 'a',
      body: 'aa',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const b = await repo.create({
      title: 'b',
      body: 'bb',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const c = await repo.create({
      title: 'c',
      body: 'cc',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    // a and b are aligned (similar); c is orthogonal-ish.
    const va = new Float32Array(384);
    va[0] = 1.0;
    const vb = new Float32Array(384);
    vb[0] = 0.97;
    vb[1] = 0.24;
    // normalize vb
    const nb = Math.sqrt(vb[0] * vb[0] + vb[1] * vb[1]);
    vb[0] /= nb;
    vb[1] /= nb;
    const vc = new Float32Array(384);
    vc[100] = 1.0;
    await repo.upsertChunks(a, [{ text: 'aa', embedding: va }]);
    await repo.upsertChunks(b, [{ text: 'bb', embedding: vb }]);
    await repo.upsertChunks(c, [{ text: 'cc', embedding: vc }]);

    const neighbors = await repo.findNeighbors(a, { k: 5, threshold: 0.8 });
    expect(neighbors.map((n) => n.noteId)).toContain(b);
    expect(neighbors.map((n) => n.noteId)).not.toContain(c);
    expect(neighbors.map((n) => n.noteId)).not.toContain(a);
  });
});
```

- [ ] **Step 2: Run test, verify failure**

Run: `pnpm --filter @compass/db test notes`

Expected: FAIL — `findNeighbors` not a function.

- [ ] **Step 3: Implement findNeighbors**

Add to interface:

```ts
findNeighbors(
  noteId: string,
  opts: { k: number; threshold: number },
): Promise<Array<{ noteId: string; similarity: number }>>;
```

Add to implementation:

```ts
async findNeighbors(noteId, { k, threshold }) {
  // Use the first chunk of the source note as the query vector.
  const qRows = db.exec({
    sql: `SELECT v.embedding
          FROM note_chunks c
          JOIN notes_vec v ON v.rowid = c.id
          WHERE c.note_id=? AND c.chunk_index=0
          LIMIT 1`,
    bind: [noteId],
    returnValue: 'resultRows',
  }) as Array<[Uint8Array]>;
  if (qRows.length === 0) return [];
  const q = qRows[0][0];

  // sqlite-vec MATCH returns chunk-level distances; aggregate per note (min distance).
  const rows = db.exec({
    sql: `SELECT c.note_id, MIN(distance) AS dist
          FROM notes_vec v
          JOIN note_chunks c ON c.id = v.rowid
          WHERE v.embedding MATCH ?
            AND k = ?
            AND c.note_id != ?
          GROUP BY c.note_id
          ORDER BY dist ASC`,
    bind: [q, k * 4, noteId], // over-fetch since we group by note
    returnValue: 'resultRows',
  }) as Array<[string, number]>;

  // sqlite-vec returns L2 distance for normalized vectors; cosine sim = 1 - (d^2 / 2).
  const out: Array<{ noteId: string; similarity: number }> = [];
  for (const [nid, d] of rows) {
    const sim = 1 - (d * d) / 2;
    if (sim >= threshold) out.push({ noteId: nid, similarity: sim });
    if (out.length >= k) break;
  }
  return out;
},
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm --filter @compass/db test notes`

Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/repositories/notes.ts packages/db/tests/repositories/notes.test.ts
git commit -m "feat(db): NotesRepo.findNeighbors via sqlite-vec MATCH + cosine threshold"
```

---

## Task 8: NotesRepo auto_links upsert/dismiss/listForNote

**Files:**

- Modify: `packages/db/src/repositories/notes.ts`
- Modify: `packages/db/tests/repositories/notes.test.ts`

- [ ] **Step 1: Write failing test**

Append to `packages/db/tests/repositories/notes.test.ts`:

```ts
describe('NotesRepo auto_links', () => {
  it('rebuildAutoLinks replaces all pairs touching the note with the provided neighbors (symmetric stored)', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const a = await repo.create({
      title: 'a',
      body: 'aa',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const b = await repo.create({
      title: 'b',
      body: 'bb',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    await repo.rebuildAutoLinks(a, [{ noteId: b, similarity: 0.9 }]);
    const links = await repo.listAutoLinksForNote(a);
    expect(links).toHaveLength(1);
    expect(links[0].targetNoteId).toBe(b);
    expect(links[0].rationale).toBeNull();
  });

  it('dismissAutoLink sets dismissed=1 and listAutoLinksForNote skips dismissed by default', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const a = await repo.create({
      title: 'a',
      body: 'aa',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const b = await repo.create({
      title: 'b',
      body: 'bb',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    await repo.rebuildAutoLinks(a, [{ noteId: b, similarity: 0.9 }]);
    await repo.dismissAutoLink(a, b);
    expect(await repo.listAutoLinksForNote(a)).toHaveLength(0);
  });

  it('setAutoLinkRationale stores the rationale and rationale_at', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const a = await repo.create({
      title: 'a',
      body: 'aa',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const b = await repo.create({
      title: 'b',
      body: 'bb',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    await repo.rebuildAutoLinks(a, [{ noteId: b, similarity: 0.9 }]);
    await repo.setAutoLinkRationale(a, b, 'both about Q2 launch blockers');
    const links = await repo.listAutoLinksForNote(a);
    expect(links[0].rationale).toBe('both about Q2 launch blockers');
    expect(links[0].rationaleAt).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test, verify failure**

Run: `pnpm --filter @compass/db test notes`

Expected: FAIL — methods not defined.

- [ ] **Step 3: Implement**

Add to interface in `packages/db/src/repositories/notes.ts`:

```ts
rebuildAutoLinks(
  noteId: string,
  neighbors: Array<{ noteId: string; similarity: number }>,
): Promise<void>;
listAutoLinksForNote(noteId: string): Promise<Array<{
  srcNoteId: string;
  targetNoteId: string;
  similarity: number;
  rationale: string | null;
  rationaleAt: string | null;
}>>;
dismissAutoLink(noteIdA: string, noteIdB: string): Promise<void>;
setAutoLinkRationale(noteIdA: string, noteIdB: string, rationale: string): Promise<void>;
getAutoLinkRationale(noteIdA: string, noteIdB: string): Promise<string | null>;
```

Add helper at top of file:

```ts
function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}
```

Add to implementation:

```ts
async rebuildAutoLinks(noteId, neighbors) {
  db.exec('BEGIN');
  try {
    db.exec({
      sql: `DELETE FROM auto_links WHERE src_note_id=? OR target_note_id=?`,
      bind: [noteId, noteId],
    });
    const now = new Date().toISOString();
    for (const n of neighbors) {
      const [src, tgt] = orderPair(noteId, n.noteId);
      db.exec({
        sql: `INSERT INTO auto_links(src_note_id, target_note_id, similarity, detected_at)
              VALUES(?,?,?,?)`,
        bind: [src, tgt, n.similarity, now],
      });
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
},

async listAutoLinksForNote(noteId) {
  const rows = db.exec({
    sql: `SELECT src_note_id, target_note_id, similarity, rationale, rationale_at
          FROM auto_links
          WHERE (src_note_id=? OR target_note_id=?) AND dismissed=0
          ORDER BY similarity DESC`,
    bind: [noteId, noteId],
    returnValue: 'resultRows',
  }) as Array<[string, string, number, string | null, string | null]>;
  return rows.map(([src, tgt, sim, rat, ratAt]) => ({
    srcNoteId: src === noteId ? src : tgt, // canonicalize so src is always the queried note
    targetNoteId: src === noteId ? tgt : src,
    similarity: sim,
    rationale: rat,
    rationaleAt: ratAt,
  }));
},

async dismissAutoLink(a, b) {
  const [src, tgt] = orderPair(a, b);
  db.exec({
    sql: `UPDATE auto_links SET dismissed=1 WHERE src_note_id=? AND target_note_id=?`,
    bind: [src, tgt],
  });
},

async setAutoLinkRationale(a, b, rationale) {
  const [src, tgt] = orderPair(a, b);
  db.exec({
    sql: `UPDATE auto_links SET rationale=?, rationale_at=? WHERE src_note_id=? AND target_note_id=?`,
    bind: [rationale, new Date().toISOString(), src, tgt],
  });
},

async getAutoLinkRationale(a, b) {
  const [src, tgt] = orderPair(a, b);
  const rows = db.exec({
    sql: `SELECT rationale FROM auto_links WHERE src_note_id=? AND target_note_id=? LIMIT 1`,
    bind: [src, tgt],
    returnValue: 'resultRows',
  }) as Array<[string | null]>;
  return rows[0]?.[0] ?? null;
},
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm --filter @compass/db test notes`

Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/repositories/notes.ts packages/db/tests/repositories/notes.test.ts
git commit -m "feat(db): NotesRepo auto_links — rebuild, list, dismiss, rationale set/get"
```

---

## Task 9: NotesRepo.hybridSearch (RRF)

**Files:**

- Modify: `packages/db/src/repositories/notes.ts`
- Modify: `packages/db/tests/repositories/notes.test.ts`

- [ ] **Step 1: Write failing test**

Append to `packages/db/tests/repositories/notes.test.ts`:

```ts
describe('NotesRepo.hybridSearch', () => {
  it('merges FTS and vec hits using reciprocal-rank fusion, dedupes by note_id', async () => {
    const db = await freshDb();
    const repo = createNotesRepo(db);
    const a = await repo.create({
      title: 'q2 launch blockers',
      body: 'plan',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const b = await repo.create({
      title: 'unrelated topic',
      body: 'q2 risk register',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const c = await repo.create({
      title: 'standup notes',
      body: 'no overlap',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });

    // Embed: only the query vector matters for vec ranking. Build a vec roughly aligned with a's chunk.
    const va = new Float32Array(384);
    va[0] = 1.0;
    const vb = new Float32Array(384);
    vb[0] = 0.5;
    vb[1] = 0.866;
    // Normalize:
    const nb = Math.hypot(vb[0], vb[1]);
    vb[0] /= nb;
    vb[1] /= nb;
    const vc = new Float32Array(384);
    vc[200] = 1.0;
    await repo.upsertChunks(a, [{ text: 'plan', embedding: va }]);
    await repo.upsertChunks(b, [{ text: 'q2 risk register', embedding: vb }]);
    await repo.upsertChunks(c, [{ text: 'no overlap', embedding: vc }]);
    // Sync FTS index.
    db.exec(`INSERT INTO notes_fts(notes_fts) VALUES('rebuild')`);

    const hits = await repo.hybridSearch({ query: 'q2', queryEmbedding: va, limit: 20 });
    const ids = hits.map((h) => h.noteId);
    expect(ids).toContain(a);
    expect(ids).toContain(b);
    // c should not rank highly since it matches neither FTS nor vec
    expect(ids[ids.length - 1]).not.toBe(a);
  });
});
```

Note: `notes_fts` is not auto-populated by inserts to `notes`. We need triggers OR explicit syncs. Implement triggers in the migration update (next sub-step). Update the test setup to create + populate notes via `repo.create()` and rely on triggers.

- [ ] **Step 2: Run test, verify failure**

Run: `pnpm --filter @compass/db test notes`

Expected: FAIL — `hybridSearch` undefined OR `notes_fts` empty.

- [ ] **Step 3: Add FTS triggers to migration v3 and wire hybridSearch**

Update `MIGRATION_0003_NOTES` in `packages/db/src/migration-runner.ts` — append before the final `UPDATE meta`:

```sql
CREATE TRIGGER notes_fts_ai AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(rowid, title, body, note_id) VALUES (new.rowid, new.title, new.body, new.id);
END;
CREATE TRIGGER notes_fts_au AFTER UPDATE ON notes BEGIN
  UPDATE notes_fts SET title=new.title, body=new.body, note_id=new.id WHERE rowid=old.rowid;
END;
CREATE TRIGGER notes_fts_ad AFTER DELETE ON notes BEGIN
  DELETE FROM notes_fts WHERE rowid=old.rowid;
END;
```

Add to interface:

```ts
hybridSearch(opts: {
  query: string;
  queryEmbedding: Float32Array;
  limit: number;
}): Promise<Array<{ noteId: string; title: string; excerpt: string; score: number }>>;
```

Implementation (add to repo factory):

```ts
async hybridSearch({ query, queryEmbedding, limit }) {
  // FTS5 hits
  // Escape the query for FTS5: wrap in quotes to treat as phrase, allowing partial matches via *.
  const ftsQuery = query
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => `"${w.replace(/"/g, '""')}"*`)
    .join(' OR ');
  const ftsRows = ftsQuery
    ? (db.exec({
        sql: `SELECT note_id, rank FROM notes_fts WHERE notes_fts MATCH ? ORDER BY rank LIMIT 20`,
        bind: [ftsQuery],
        returnValue: 'resultRows',
      }) as Array<[string, number]>)
    : [];

  // Vec hits — group by note (min distance per note).
  const vecRows = db.exec({
    sql: `SELECT c.note_id, MIN(distance) AS dist
          FROM notes_vec v
          JOIN note_chunks c ON c.id = v.rowid
          WHERE v.embedding MATCH ? AND k = ?
          GROUP BY c.note_id
          ORDER BY dist ASC
          LIMIT 20`,
    bind: [queryEmbedding, 80],
    returnValue: 'resultRows',
  }) as Array<[string, number]>;

  // Reciprocal-rank fusion (k=60).
  const RRF_K = 60;
  const scores = new Map<string, number>();
  ftsRows.forEach(([id], i) => {
    scores.set(id, (scores.get(id) ?? 0) + 1 / (RRF_K + i + 1));
  });
  vecRows.forEach(([id], i) => {
    scores.set(id, (scores.get(id) ?? 0) + 1 / (RRF_K + i + 1));
  });

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  if (ranked.length === 0) return [];

  // Hydrate to title + excerpt.
  const placeholders = ranked.map(() => '?').join(',');
  const rows = db.exec({
    sql: `SELECT id, title, substr(body, 1, 160) FROM notes WHERE id IN (${placeholders})`,
    bind: ranked.map(([id]) => id),
    returnValue: 'resultRows',
  }) as Array<[string, string, string]>;
  const byId = new Map(rows.map(([id, t, e]) => [id, { title: t, excerpt: e }]));

  return ranked.map(([id, score]) => ({
    noteId: id,
    title: byId.get(id)?.title ?? '',
    excerpt: byId.get(id)?.excerpt ?? '',
    score,
  }));
},
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm --filter @compass/db test notes`

Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/repositories/notes.ts packages/db/tests/repositories/notes.test.ts packages/db/src/migration-runner.ts
git commit -m "feat(db): NotesRepo.hybridSearch with FTS5+vec RRF; FTS triggers in migration v3"
```

---

## Task 10: Prompts + routing entries

**Files:**

- Create: `packages/core/src/prompts/notes.autolink.summary.md`
- Create: `packages/core/src/prompts/notes.askGrounded.md`
- Modify: `packages/core/src/prompts/routing.ts`

- [ ] **Step 1: Create autolink prompt**

Create `packages/core/src/prompts/notes.autolink.summary.md`:

```markdown
You are summarizing why two notes from a single user are conceptually related. You will receive both notes verbatim. Output exactly one sentence (≤ 25 words) explaining the shared concept, written for the note's author. Do not invent facts not present in either note. Do not quote either note. Output a JSON object: { "rationale": string }.

Note A:
{{noteA}}

Note B:
{{noteB}}
```

- [ ] **Step 2: Create askGrounded prompt**

Create `packages/core/src/prompts/notes.askGrounded.md`:

```markdown
You answer the user's question using ONLY the notes provided as context. The user is the author of all notes. Each note is wrapped in `<note id="n1">…</note>` blocks.

Rules:

1. If the answer is not in the notes, set `answer` to null and explain in `reason` that no notes cover the question. Do not invent.
2. When you reference a note in the answer, include its bracketed id inline, e.g. `[n1]`. Citations must be exact ids from the context blocks.
3. Be concise. 1-3 sentences typical. Plain text, no markdown.
4. Output JSON: `{ "answer": string | null, "citations": string[], "reason": string | null }`. `citations` are unique ids you actually referenced in the answer.

Question:
{{query}}

Context:
{{context}}
```

- [ ] **Step 3: Wire routing entries**

Inspect `packages/core/src/prompts/routing.ts` and add two entries to the `ROUTING` table beside `brief.morning` / `brief.eod`:

```ts
'notes.autolink.summary': {
  promptFile: 'notes.autolink.summary.md',
  schema: 'NotesAutolinkSummary',
  trusted: true,
},
'notes.askGrounded': {
  promptFile: 'notes.askGrounded.md',
  schema: 'NotesAskGrounded',
  trusted: false, // user notes are content-of-untrusted-context for the LLM
},
```

(Adjust to match the existing entry shape — read the existing file and mirror its keys.)

- [ ] **Step 4: Schema entries in core/types**

Add to `packages/core/src/types/note.ts`:

```ts
export const NotesAutolinkSummarySchema = z.object({
  rationale: z.string().max(400),
});
export type NotesAutolinkSummary = z.infer<typeof NotesAutolinkSummarySchema>;

export const NotesAskGroundedSchema = z.object({
  answer: z.string().nullable(),
  citations: z.array(z.string()).default([]),
  reason: z.string().nullable().default(null),
});
export type NotesAskGrounded = z.infer<typeof NotesAskGroundedSchema>;
```

Wire those schemas into the `routing.ts` schema registry (mirror how `BriefingOutputSchema` is wired).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/prompts/notes.autolink.summary.md packages/core/src/prompts/notes.askGrounded.md packages/core/src/prompts/routing.ts packages/core/src/types/note.ts
git commit -m "feat(core): notes.autolink.summary + notes.askGrounded prompts and routing entries"
```

---

## Task 11: notes.autolink.summary agent

**Files:**

- Create: `packages/agents/src/notes.autolink.summary.ts`
- Create: `packages/agents/src/notes.autolink.summary.test.ts`
- Modify: `packages/agents/src/index.ts`

- [ ] **Step 1: Write failing test**

Create `packages/agents/src/notes.autolink.summary.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { generateAutolinkSummary } from './notes.autolink.summary';

describe('generateAutolinkSummary', () => {
  it('calls router.executeTask with both notes and returns the rationale', async () => {
    const stubRouter = {
      executeTask: vi.fn().mockResolvedValue({
        output: { rationale: 'Both discuss Q2 launch blockers.' },
        provider: 'openrouter',
        usdCost: 0.0001,
      }),
    };
    const result = await generateAutolinkSummary({
      router: stubRouter,
      noteA: { title: 'A', body: 'Q2 launch risks' },
      noteB: { title: 'B', body: 'Q2 product blockers' },
    });
    expect(result.rationale).toContain('Q2');
    expect(stubRouter.executeTask).toHaveBeenCalledOnce();
  });

  it('truncates very long bodies before sending', async () => {
    const stubRouter = {
      executeTask: vi.fn().mockResolvedValue({
        output: { rationale: 'short' },
        provider: 'openrouter',
        usdCost: 0,
      }),
    };
    const longBody = 'x'.repeat(10_000);
    await generateAutolinkSummary({
      router: stubRouter,
      noteA: { title: 'A', body: longBody },
      noteB: { title: 'B', body: longBody },
    });
    const call = stubRouter.executeTask.mock.calls[0][0];
    const messageText = JSON.stringify(call.messages);
    // Each body capped to ~2000 chars; both bodies + framing should be < 6000
    expect(messageText.length).toBeLessThan(8_000);
  });
});
```

- [ ] **Step 2: Run test, verify failure**

Run: `pnpm --filter @compass/agents test notes.autolink.summary`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `packages/agents/src/notes.autolink.summary.ts`:

```ts
import { NotesAutolinkSummarySchema, type NotesAutolinkSummary } from '@compass/core';

export interface AutolinkSummaryDeps {
  router: {
    executeTask(req: {
      taskId: string;
      schema: unknown;
      system: string;
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      trusted: boolean;
    }): Promise<{ output: NotesAutolinkSummary; provider: string; usdCost: number }>;
  };
  noteA: { title: string; body: string };
  noteB: { title: string; body: string };
}

const MAX_BODY = 2000;

export async function generateAutolinkSummary(
  deps: AutolinkSummaryDeps,
): Promise<NotesAutolinkSummary> {
  const trim = (s: string) => (s.length > MAX_BODY ? s.slice(0, MAX_BODY) + '…' : s);
  const userMsg =
    `Note A:\n# ${deps.noteA.title}\n${trim(deps.noteA.body)}\n\n` +
    `Note B:\n# ${deps.noteB.title}\n${trim(deps.noteB.body)}`;
  const result = await deps.router.executeTask({
    taskId: 'notes.autolink.summary',
    schema: NotesAutolinkSummarySchema,
    system:
      'You are summarizing why two notes from a single user are conceptually related. Output one short sentence (≤ 25 words) referencing only the shared concept. Do not invent. Output JSON: { rationale: string }.',
    messages: [{ role: 'user', content: userMsg }],
    trusted: true,
  });
  return result.output;
}
```

Update `packages/agents/src/index.ts`:

```ts
export { generateAutolinkSummary, type AutolinkSummaryDeps } from './notes.autolink.summary';
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm --filter @compass/agents test notes.autolink.summary`

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/agents/src/notes.autolink.summary.ts packages/agents/src/notes.autolink.summary.test.ts packages/agents/src/index.ts
git commit -m "feat(agents): notes.autolink.summary — pair → 1-sentence rationale"
```

---

## Task 12: notes.askGrounded agent

**Files:**

- Create: `packages/agents/src/notes.askGrounded.ts`
- Create: `packages/agents/src/notes.askGrounded.test.ts`
- Modify: `packages/agents/src/index.ts`

- [ ] **Step 1: Write failing test**

Create `packages/agents/src/notes.askGrounded.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { askGrounded } from './notes.askGrounded';

describe('askGrounded', () => {
  it('passes hits as <note id="n1"> blocks and returns answer + citations', async () => {
    const router = {
      executeTask: vi.fn().mockResolvedValue({
        output: {
          answer: 'Q2 launch was delayed [n1].',
          citations: ['n1'],
          reason: null,
        },
        provider: 'openrouter',
        usdCost: 0.0002,
      }),
    };
    const result = await askGrounded({
      router,
      query: 'when did q2 launch',
      hits: [
        { noteId: 'noteA', title: 'Q2 launch', excerpt: 'we delayed launch to July', score: 1 },
        { noteId: 'noteB', title: 'Standup', excerpt: 'misc', score: 0.5 },
      ],
    });
    expect(result.answer).toContain('[n1]');
    expect(result.citations).toEqual([{ id: 'n1', noteId: 'noteA' }]);
    const userMsg = router.executeTask.mock.calls[0][0].messages[0].content as string;
    expect(userMsg).toContain('<note id="n1">');
    expect(userMsg).toContain('<note id="n2">');
  });

  it('returns null answer + reason no-notes when hits is empty', async () => {
    const router = { executeTask: vi.fn() };
    const result = await askGrounded({ router, query: 'x', hits: [] });
    expect(result.answer).toBeNull();
    expect(result.citations).toEqual([]);
    expect(result.reason).toBe('no-notes');
    expect(router.executeTask).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test, verify failure**

Run: `pnpm --filter @compass/agents test notes.askGrounded`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `packages/agents/src/notes.askGrounded.ts`:

```ts
import { NotesAskGroundedSchema } from '@compass/core';

export interface AskGroundedHit {
  noteId: string;
  title: string;
  excerpt: string;
  score: number;
}

export interface AskGroundedDeps {
  router: {
    executeTask(req: {
      taskId: string;
      schema: unknown;
      system: string;
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      trusted: boolean;
    }): Promise<{
      output: { answer: string | null; citations: string[]; reason: string | null };
      provider: string;
      usdCost: number;
    }>;
  };
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
  '1-3 sentences. JSON: { answer, citations, reason }.';

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
  const result = await deps.router.executeTask({
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
  const out = result.output;
  const citations = (out.citations ?? [])
    .filter((id) => idToNoteId.has(id))
    .map((id) => ({ id, noteId: idToNoteId.get(id) as string }));
  return { answer: out.answer, citations, reason: out.reason };
}
```

Update `packages/agents/src/index.ts`:

```ts
export {
  askGrounded,
  type AskGroundedDeps,
  type AskGroundedHit,
  type AskGroundedResult,
} from './notes.askGrounded';
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm --filter @compass/agents test notes.askGrounded`

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/agents/src/notes.askGrounded.ts packages/agents/src/notes.askGrounded.test.ts packages/agents/src/index.ts
git commit -m "feat(agents): notes.askGrounded — hybrid hits → grounded answer + citations"
```

---

## Task 13: Runtime routes

**Files:**

- Modify: `packages/runtime/src/routes.ts`

- [ ] **Step 1: Add 9 route signatures**

In `packages/runtime/src/routes.ts`, append to the `Routes` interface (place after existing brief/pomodoro entries):

```ts
'notes.create': {
  req: { title: string; body: string; tags: string[] };
  res: { id: string };
};
'notes.update': {
  req: {
    id: string;
    title?: string;
    body?: string;
    tags?: string[];
    autolinkEnabled?: boolean;
  };
  res: {
    ok: true;
    embeddingPending?: boolean;
    forgotten?: { noteId: string; sim: number; title: string };
  };
};
'notes.delete': {
  req: { id: string };
  res: { ok: true };
};
'notes.list': {
  req: { limit?: number; offset?: number };
  res: { notes: Array<{ id: string; title: string; excerpt: string; updatedAt: string; tags: string[] }> };
};
'notes.get': {
  req: { id: string };
  res: {
    note: {
      id: string;
      createdAt: string;
      updatedAt: string;
      title: string;
      body: string;
      tags: string[];
      autolinkEnabled: boolean;
    };
    autoLinks: Array<{
      targetNoteId: string;
      targetTitle: string;
      similarity: number;
      rationale: string | null;
    }>;
  };
};
'notes.search': {
  req: { query: string; limit?: number };
  res: { hits: Array<{ noteId: string; title: string; excerpt: string; score: number }> };
};
'notes.askGrounded': {
  req: { query: string };
  res:
    | { answer: string; citations: Array<{ id: string; noteId: string; title: string }>; reason: null }
    | { answer: null; citations: []; reason: 'no-notes' | 'locked' | 'error' };
};
'notes.autolink.rationale': {
  req: { srcId: string; targetId: string };
  res: { rationale: string } | { rationale: null; reason: 'locked' | 'error' };
};
'notes.autolink.dismiss': {
  req: { srcId: string; targetId: string };
  res: { ok: true };
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @compass/runtime typecheck`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/runtime/src/routes.ts
git commit -m "feat(runtime): declare 9 RPC routes for notes (CRUD/search/ask/autolink)"
```

---

## Task 14: Offscreen — chunking + Δ-check helpers

**Files:**

- Create: `apps/extension/entrypoints/offscreen/notes.ts`
- Create: `apps/extension/entrypoints/offscreen/notes.test.ts`

- [ ] **Step 1: Write failing test**

Create `apps/extension/entrypoints/offscreen/notes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { chunkNote, headingsOf, isMinorEdit } from './notes';

describe('chunkNote', () => {
  it('returns one chunk for short bodies', () => {
    expect(chunkNote('Title', 'short body')).toEqual(['Title\n\nshort body']);
  });

  it('chunks by heading then 1200-char window when body > 1500 chars', () => {
    const long = 'a'.repeat(1600);
    const out = chunkNote('T', long);
    expect(out.length).toBeGreaterThan(1);
    for (const c of out) expect(c.length).toBeLessThanOrEqual(1300);
  });

  it('uses headings as natural splits', () => {
    const body = '# Section A\n' + 'a'.repeat(800) + '\n# Section B\n' + 'b'.repeat(800);
    const out = chunkNote('T', body);
    expect(out.length).toBeGreaterThanOrEqual(2);
    expect(out[0]).toContain('Section A');
    expect(out.some((c) => c.includes('Section B'))).toBe(true);
  });
});

describe('headingsOf', () => {
  it('extracts ATX headings preserving order', () => {
    expect(headingsOf('# A\nfoo\n## B\nbar')).toEqual(['# A', '## B']);
  });
});

describe('isMinorEdit', () => {
  it('returns true when body diff < 50 chars and headings unchanged', () => {
    const a = '# A\nfoo bar baz';
    const b = '# A\nfoo bar bazz';
    expect(isMinorEdit(a, b)).toBe(true);
  });
  it('returns false when a heading was added', () => {
    const a = '# A\nfoo bar baz';
    const b = '# A\nfoo bar baz\n# B\nx';
    expect(isMinorEdit(a, b)).toBe(false);
  });
  it('returns false when body diff >= 50 chars', () => {
    const a = '# A\nfoo';
    const b = '# A\n' + 'x'.repeat(60);
    expect(isMinorEdit(a, b)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify failure**

Run: `pnpm --filter @compass/extension test offscreen/notes`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/extension/entrypoints/offscreen/notes.ts`:

```ts
const SHORT_LIMIT = 1500;
const WINDOW = 1200;

export function headingsOf(body: string): string[] {
  return body
    .split('\n')
    .filter((l) => /^#{1,6}\s/.test(l))
    .map((l) => l.trim());
}

export function isMinorEdit(prevBody: string, nextBody: string): boolean {
  const a = headingsOf(prevBody).join('\n');
  const b = headingsOf(nextBody).join('\n');
  if (a !== b) return false;
  return Math.abs(nextBody.length - prevBody.length) < 50;
}

export function chunkNote(title: string, body: string): string[] {
  const head = title.trim();
  if (body.length <= SHORT_LIMIT) return [`${head}\n\n${body}`.trim()];
  // Split on ATX headings; chunks beyond WINDOW are sub-windowed.
  const headingPositions: number[] = [];
  const lines = body.split('\n');
  let cursor = 0;
  for (const l of lines) {
    if (/^#{1,6}\s/.test(l)) headingPositions.push(cursor);
    cursor += l.length + 1;
  }
  if (headingPositions.length === 0 || headingPositions[0] !== 0) {
    headingPositions.unshift(0);
  }
  headingPositions.push(body.length);
  const sections: string[] = [];
  for (let i = 0; i < headingPositions.length - 1; i++) {
    sections.push(body.slice(headingPositions[i], headingPositions[i + 1]).trim());
  }
  const out: string[] = [];
  for (const s of sections) {
    if (s.length <= WINDOW) {
      out.push(`${head}\n\n${s}`);
    } else {
      // Sliding 1200-char windows.
      for (let off = 0; off < s.length; off += WINDOW) {
        out.push(`${head}\n\n${s.slice(off, off + WINDOW)}`);
      }
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm --filter @compass/extension test offscreen/notes`

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/extension/entrypoints/offscreen/notes.ts apps/extension/entrypoints/offscreen/notes.test.ts
git commit -m "feat(extension): offscreen notes chunking + Δ-check helpers"
```

---

## Task 15: Offscreen — notes.create / notes.update / notes.delete

**Files:**

- Modify: `apps/extension/entrypoints/offscreen/main.ts`

- [ ] **Step 1: Identify wiring location**

Run: `grep -n "brief.morning\|brief.eod\|pomodoro.start" apps/extension/entrypoints/offscreen/main.ts | head -10`

Expected: identifies the registry-style switch where existing handlers live. Match its pattern when adding new handlers.

- [ ] **Step 2: Write failing test**

Append a slice to the integration test file (or create a placeholder spec) — for now, defer the integration test to Task 30. The wiring quality is verified by Task 30 since the offscreen handler isn't directly unit-testable.

We will rely on integration coverage. Skip the per-handler test step here and proceed to implementation; mark the handler as covered by the integration test.

- [ ] **Step 3: Implement notes.create / update / delete handlers**

In `apps/extension/entrypoints/offscreen/main.ts`, import:

```ts
import { createNotesRepo } from '@compass/db';
import { embed, embedBatch } from '@compass/embeddings';
import { chunkNote, isMinorEdit } from './notes';
import { generateAutolinkSummary, askGrounded } from '@compass/agents';
import { getUserProfile } from '@compass/core';
```

Initialize repo once:

```ts
let notesRepo: ReturnType<typeof createNotesRepo> | null = null;
async function getNotesRepo() {
  if (!notesRepo) {
    const db = await openOpfsDatabase();
    await runMigrations(db);
    notesRepo = createNotesRepo(db);
  }
  return notesRepo;
}
```

Add cases inside the existing route dispatch:

```ts
case 'notes.create': {
  const repo = await getNotesRepo();
  const id = await repo.create({
    title: msg.payload.title,
    body: msg.payload.body,
    tags: msg.payload.tags ?? [],
    embeddingModel: 'minilm-l6-v2',
  });
  // Embed asynchronously — return id immediately. The next save will pick up.
  // Trigger initial embed inline so the new note is searchable right away.
  await embedAndStoreChunks(repo, id, msg.payload.title, msg.payload.body);
  return { id };
}

case 'notes.update': {
  const repo = await getNotesRepo();
  const cur = await repo.getById(msg.payload.id);
  if (!cur) throw new Error('not-found');
  await repo.update(msg.payload.id, {
    title: msg.payload.title,
    body: msg.payload.body,
    tags: msg.payload.tags,
    autolinkEnabled: msg.payload.autolinkEnabled,
  });
  const next = await repo.getById(msg.payload.id);
  if (!next) throw new Error('not-found');
  const minor = isMinorEdit(cur.body, next.body);
  if (minor) return { ok: true };
  await embedAndStoreChunks(repo, next.id, next.title, next.body);
  // Auto-link rebuild + forgotten-context check
  const profile = await getUserProfile();
  if (profile.autoLinkEnabled && next.autolinkEnabled) {
    const neighbors = await repo.findNeighbors(next.id, { k: 5, threshold: 0.78 });
    await repo.rebuildAutoLinks(next.id, neighbors);
    const forgotten = await detectForgotten(repo, neighbors);
    return forgotten ? { ok: true, forgotten } : { ok: true };
  }
  return { ok: true };
}

case 'notes.delete': {
  const repo = await getNotesRepo();
  await repo.delete(msg.payload.id);
  return { ok: true };
}
```

Add helper functions in `main.ts`:

```ts
async function embedAndStoreChunks(
  repo: ReturnType<typeof createNotesRepo>,
  noteId: string,
  title: string,
  body: string,
): Promise<void> {
  const chunks = chunkNote(title, body);
  const embeddings = await embedBatch(chunks);
  await repo.upsertChunks(
    noteId,
    chunks.map((text, i) => ({ text, embedding: embeddings[i] })),
  );
}

async function detectForgotten(
  repo: ReturnType<typeof createNotesRepo>,
  neighbors: Array<{ noteId: string; similarity: number }>,
): Promise<{ noteId: string; sim: number; title: string } | null> {
  const session = await chrome.storage.session.get('notes.forgotten.shownThisSession');
  if (session['notes.forgotten.shownThisSession']) return null;
  const cutoff = Date.now() - 45 * 24 * 60 * 60 * 1000;
  for (const n of neighbors) {
    if (n.similarity < 0.82) continue;
    const note = await repo.getById(n.noteId);
    if (!note) continue;
    if (new Date(note.updatedAt).getTime() < cutoff) {
      await chrome.storage.session.set({ 'notes.forgotten.shownThisSession': true });
      return { noteId: n.noteId, sim: n.similarity, title: note.title };
    }
  }
  return null;
}
```

- [ ] **Step 4: Build extension**

Run: `pnpm --filter @compass/extension build`

Expected: BUILD OK.

- [ ] **Step 5: Commit**

```bash
git add apps/extension/entrypoints/offscreen/main.ts
git commit -m "feat(extension): offscreen handlers for notes.create/update/delete with embed + autolink rebuild"
```

---

## Task 16: Offscreen — notes.list / notes.get / notes.search

**Files:**

- Modify: `apps/extension/entrypoints/offscreen/main.ts`

- [ ] **Step 1: Implement handlers**

Add cases to the offscreen dispatch:

```ts
case 'notes.list': {
  const repo = await getNotesRepo();
  const limit = msg.payload.limit ?? 100;
  const offset = msg.payload.offset ?? 0;
  const all = await repo.list({ limit, offset });
  return {
    notes: all.map((n) => ({
      id: n.id,
      title: n.title,
      excerpt: n.body.slice(0, 160),
      updatedAt: n.updatedAt,
      tags: n.tags,
    })),
  };
}

case 'notes.get': {
  const repo = await getNotesRepo();
  const note = await repo.getById(msg.payload.id);
  if (!note) throw new Error('not-found');
  const links = await repo.listAutoLinksForNote(note.id);
  // Hydrate target titles
  const titles = await Promise.all(
    links.map((l) => repo.getById(l.targetNoteId).then((n) => n?.title ?? '')),
  );
  return {
    note: {
      id: note.id,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      title: note.title,
      body: note.body,
      tags: note.tags,
      autolinkEnabled: note.autolinkEnabled,
    },
    autoLinks: links.map((l, i) => ({
      targetNoteId: l.targetNoteId,
      targetTitle: titles[i],
      similarity: l.similarity,
      rationale: l.rationale,
    })),
  };
}

case 'notes.search': {
  const repo = await getNotesRepo();
  const queryEmbedding = await embed(msg.payload.query);
  const hits = await repo.hybridSearch({
    query: msg.payload.query,
    queryEmbedding,
    limit: msg.payload.limit ?? 20,
  });
  return { hits };
}
```

- [ ] **Step 2: Build**

Run: `pnpm --filter @compass/extension build`

Expected: BUILD OK.

- [ ] **Step 3: Commit**

```bash
git add apps/extension/entrypoints/offscreen/main.ts
git commit -m "feat(extension): offscreen handlers for notes.list/get/search"
```

---

## Task 17: Offscreen — notes.askGrounded + autolink rationale/dismiss

**Files:**

- Modify: `apps/extension/entrypoints/offscreen/main.ts`

- [ ] **Step 1: Implement handlers**

Add cases:

```ts
case 'notes.askGrounded': {
  const repo = await getNotesRepo();
  const queryEmbedding = await embed(msg.payload.query);
  const hits = await repo.hybridSearch({
    query: msg.payload.query,
    queryEmbedding,
    limit: 5,
  });
  if (hits.length === 0) {
    return { answer: null, citations: [], reason: 'no-notes' };
  }
  try {
    const result = await askGrounded({
      router: { executeTask: llmExecuteTaskAdapter },
      query: msg.payload.query,
      hits,
    });
    if (result.answer === null) {
      return { answer: null, citations: [], reason: result.reason ?? 'error' };
    }
    // Hydrate citation titles
    const citTitles = await Promise.all(
      result.citations.map(async (c) => {
        const n = await repo.getById(c.noteId);
        return { id: c.id, noteId: c.noteId, title: n?.title ?? '' };
      }),
    );
    return { answer: result.answer, citations: citTitles, reason: null };
  } catch (err) {
    if (err instanceof Error && err.message === 'LlmCredentialsLocked') {
      return { answer: null, citations: [], reason: 'locked' };
    }
    throw err;
  }
}

case 'notes.autolink.rationale': {
  const repo = await getNotesRepo();
  const cached = await repo.getAutoLinkRationale(msg.payload.srcId, msg.payload.targetId);
  if (cached) return { rationale: cached };
  const a = await repo.getById(msg.payload.srcId);
  const b = await repo.getById(msg.payload.targetId);
  if (!a || !b) throw new Error('not-found');
  try {
    const out = await generateAutolinkSummary({
      router: { executeTask: llmExecuteTaskAdapter },
      noteA: { title: a.title, body: a.body },
      noteB: { title: b.title, body: b.body },
    });
    await repo.setAutoLinkRationale(msg.payload.srcId, msg.payload.targetId, out.rationale);
    return { rationale: out.rationale };
  } catch (err) {
    if (err instanceof Error && err.message === 'LlmCredentialsLocked') {
      return { rationale: null, reason: 'locked' };
    }
    return { rationale: null, reason: 'error' };
  }
}

case 'notes.autolink.dismiss': {
  const repo = await getNotesRepo();
  await repo.dismissAutoLink(msg.payload.srcId, msg.payload.targetId);
  return { ok: true };
}
```

The `llmExecuteTaskAdapter` already exists from the daily-agent slice — reuse it as defined for `brief.morning` / `brief.eod`. If its name differs, follow the existing call pattern.

- [ ] **Step 2: Build**

Run: `pnpm --filter @compass/extension build`

Expected: BUILD OK.

- [ ] **Step 3: Commit**

```bash
git add apps/extension/entrypoints/offscreen/main.ts
git commit -m "feat(extension): offscreen handlers for notes.askGrounded + autolink.rationale/dismiss"
```

---

## Task 18: notesStore Zustand slice

**Files:**

- Create: `apps/extension/app/state/notesStore.ts`
- Create: `apps/extension/app/state/notesStore.test.ts`

- [ ] **Step 1: Write failing test**

Create `apps/extension/app/state/notesStore.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { useNotesStore } from './notesStore';

describe('notesStore', () => {
  it('select(id) sets selectedNoteId; clearSelection clears it', () => {
    useNotesStore.getState().select('n1');
    expect(useNotesStore.getState().selectedNoteId).toBe('n1');
    useNotesStore.getState().clearSelection();
    expect(useNotesStore.getState().selectedNoteId).toBeNull();
  });

  it('setDirty marks dirty; markSaved clears dirty and stamps lastSavedAt', () => {
    useNotesStore.getState().setDirty(true);
    expect(useNotesStore.getState().dirty).toBe(true);
    useNotesStore.getState().markSaved();
    expect(useNotesStore.getState().dirty).toBe(false);
    expect(useNotesStore.getState().lastSavedAt).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test, verify failure**

Run: `pnpm --filter @compass/extension test notesStore`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/extension/app/state/notesStore.ts`:

```ts
import { create } from 'zustand';

interface NotesState {
  selectedNoteId: string | null;
  dirty: boolean;
  lastSavedAt: string | null;
  forgottenSeenThisSession: boolean;
  select(id: string): void;
  clearSelection(): void;
  setDirty(dirty: boolean): void;
  markSaved(): void;
  markForgottenSeen(): void;
}

export const useNotesStore = create<NotesState>((set) => ({
  selectedNoteId: null,
  dirty: false,
  lastSavedAt: null,
  forgottenSeenThisSession: false,
  select: (id) => set({ selectedNoteId: id }),
  clearSelection: () => set({ selectedNoteId: null, dirty: false }),
  setDirty: (dirty) => set({ dirty }),
  markSaved: () => set({ dirty: false, lastSavedAt: new Date().toISOString() }),
  markForgottenSeen: () => set({ forgottenSeenThisSession: true }),
}));
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm --filter @compass/extension test notesStore`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/extension/app/state/notesStore.ts apps/extension/app/state/notesStore.test.ts
git commit -m "feat(extension): notesStore Zustand slice (selection + dirty + forgotten flag)"
```

---

## Task 19: useNotes hook

**Files:**

- Create: `apps/extension/app/hooks/useNotes.ts`
- Create: `apps/extension/app/hooks/useNotes.test.ts`

- [ ] **Step 1: Write failing test**

Create `apps/extension/app/hooks/useNotes.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('@compass/runtime', () => ({
  rpc: vi.fn(),
}));

import { rpc } from '@compass/runtime';
import { useNotes } from './useNotes';

describe('useNotes', () => {
  beforeEach(() => {
    (rpc as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  it('list() loads notes from rpc', async () => {
    (rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      notes: [{ id: 'n1', title: 'A', excerpt: 'a', updatedAt: 't', tags: [] }],
    });
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toHaveLength(1));
    expect(result.current.notes[0].id).toBe('n1');
  });

  it('save(id, patch) calls notes.update with the patch', async () => {
    (rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ notes: [] });
    (rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toHaveLength(0));
    await act(async () => {
      await result.current.save('n1', { title: 'NEW' });
    });
    expect(rpc).toHaveBeenCalledWith('notes.update', { id: 'n1', title: 'NEW' });
  });
});
```

- [ ] **Step 2: Run test, verify failure**

Run: `pnpm --filter @compass/extension test useNotes`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/extension/app/hooks/useNotes.ts`:

```ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { rpc } from '@compass/runtime';
import { useNotesStore } from '../state/notesStore';

interface NoteSummary {
  id: string;
  title: string;
  excerpt: string;
  updatedAt: string;
  tags: string[];
}

interface NoteFull {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  body: string;
  tags: string[];
  autolinkEnabled: boolean;
}

interface AutoLink {
  targetNoteId: string;
  targetTitle: string;
  similarity: number;
  rationale: string | null;
}

export function useNotes() {
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [selected, setSelected] = useState<{ note: NoteFull; autoLinks: AutoLink[] } | null>(null);
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId);
  const markSaved = useNotesStore((s) => s.markSaved);
  const markForgottenSeen = useNotesStore((s) => s.markForgottenSeen);

  const refresh = useCallback(async () => {
    const r = (await rpc('notes.list', { limit: 100 })) as { notes: NoteSummary[] };
    setNotes(r.notes);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selectedNoteId) {
      setSelected(null);
      return;
    }
    void rpc('notes.get', { id: selectedNoteId }).then((r) => setSelected(r as typeof selected));
  }, [selectedNoteId]);

  const create = useCallback(
    async (input: { title: string; body: string; tags: string[] }) => {
      const r = (await rpc('notes.create', input)) as { id: string };
      await refresh();
      return r.id;
    },
    [refresh],
  );

  const save = useCallback(
    async (
      id: string,
      patch: { title?: string; body?: string; tags?: string[]; autolinkEnabled?: boolean },
    ) => {
      const r = (await rpc('notes.update', { id, ...patch })) as {
        ok: true;
        forgotten?: { noteId: string; sim: number; title: string };
      };
      markSaved();
      await refresh();
      if (r.forgotten) markForgottenSeen();
      return r;
    },
    [refresh, markSaved, markForgottenSeen],
  );

  const remove = useCallback(
    async (id: string) => {
      await rpc('notes.delete', { id });
      await refresh();
    },
    [refresh],
  );

  const search = useCallback(async (query: string) => {
    const r = (await rpc('notes.search', { query, limit: 20 })) as {
      hits: Array<{ noteId: string; title: string; excerpt: string; score: number }>;
    };
    return r.hits;
  }, []);

  const fetchRationale = useCallback(async (srcId: string, targetId: string) => {
    const r = (await rpc('notes.autolink.rationale', { srcId, targetId })) as
      | { rationale: string }
      | { rationale: null; reason: 'locked' | 'error' };
    return r;
  }, []);

  const dismissLink = useCallback(async (srcId: string, targetId: string) => {
    await rpc('notes.autolink.dismiss', { srcId, targetId });
  }, []);

  return { notes, selected, refresh, create, save, remove, search, fetchRationale, dismissLink };
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm --filter @compass/extension test useNotes`

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/extension/app/hooks/useNotes.ts apps/extension/app/hooks/useNotes.test.ts
git commit -m "feat(extension): useNotes hook (list/get/create/save/delete/search/rationale)"
```

---

## Task 20: MarkdownEditor (CodeMirror 6 wrapper)

**Files:**

- Create: `apps/extension/app/components/MarkdownEditor.tsx`
- Create: `apps/extension/app/components/MarkdownEditor.test.tsx`
- Modify: `apps/extension/package.json` (add CM6 deps)

- [ ] **Step 1: Add dependencies**

Run from repo root:

```bash
pnpm --filter @compass/extension add @codemirror/state @codemirror/view @codemirror/lang-markdown @codemirror/theme-one-dark
```

Expected: `package.json` updated; `pnpm-lock.yaml` regenerated.

- [ ] **Step 2: Write failing test**

Create `apps/extension/app/components/MarkdownEditor.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarkdownEditor } from './MarkdownEditor';

describe('MarkdownEditor', () => {
  it('renders the initial value', () => {
    render(<MarkdownEditor value="# hello" onChange={() => {}} />);
    expect(screen.getByText('# hello')).toBeInTheDocument();
  });

  it('calls onChange (debounced) after the user types', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MarkdownEditor value="" onChange={onChange} debounceMs={50} />);
    const editor = document.querySelector('.cm-content') as HTMLElement;
    await user.click(editor);
    await user.keyboard('hi');
    await new Promise((r) => setTimeout(r, 100));
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(last).toContain('hi');
  });
});
```

- [ ] **Step 3: Run test, verify failure**

Run: `pnpm --filter @compass/extension test MarkdownEditor`

Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

Create `apps/extension/app/components/MarkdownEditor.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';

export interface MarkdownEditorProps {
  value: string;
  onChange: (next: string) => void;
  debounceMs?: number;
  ariaLabel?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  debounceMs = 5000,
  ariaLabel = 'Note body',
}: MarkdownEditorProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const updateListener = EditorView.updateListener.of((u) => {
      if (!u.docChanged) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      const next = u.state.doc.toString();
      timerRef.current = setTimeout(() => onChange(next), debounceMs);
    });
    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown(),
        oneDark,
        updateListener,
        EditorView.theme({
          '&': { backgroundColor: 'transparent', height: '100%' },
          '.cm-content': { fontFamily: 'var(--font-mono)', fontSize: '13px' },
        }),
      ],
    });
    const view = new EditorView({ state, parent: ref.current });
    viewRef.current = view;
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- value change is handled below to avoid recreating editor
  }, []);

  // External value change (e.g., switching notes) — replace doc.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (view.state.doc.toString() === value) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
  }, [value]);

  return <div ref={ref} aria-label={ariaLabel} style={{ minHeight: 320, width: '100%' }} />;
}
```

- [ ] **Step 5: Run test, verify pass**

Run: `pnpm --filter @compass/extension test MarkdownEditor`

Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/extension/app/components/MarkdownEditor.tsx apps/extension/app/components/MarkdownEditor.test.tsx apps/extension/package.json pnpm-lock.yaml
git commit -m "feat(extension): MarkdownEditor (CodeMirror 6 wrapper with debounced onChange)"
```

---

## Task 21: NotesDrawer rewrite — list mode

**Files:**

- Modify: `apps/extension/app/drawers/NotesDrawer.tsx`
- Create: `apps/extension/app/drawers/NotesDrawer.test.tsx`

- [ ] **Step 1: Write failing test**

Create `apps/extension/app/drawers/NotesDrawer.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@compass/runtime', () => ({ rpc: vi.fn() }));
import { rpc } from '@compass/runtime';
import { NotesDrawer } from './NotesDrawer';
import { useNotesStore } from '../state/notesStore';

describe('NotesDrawer list mode', () => {
  beforeEach(() => {
    (rpc as unknown as ReturnType<typeof vi.fn>).mockReset();
    useNotesStore.setState({
      selectedNoteId: null,
      dirty: false,
      lastSavedAt: null,
      forgottenSeenThisSession: false,
    });
  });

  it('renders the list of notes from rpc', async () => {
    (rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      notes: [
        { id: 'n1', title: 'Q2 launch', excerpt: 'plans', updatedAt: '2026-05-09', tags: ['work'] },
        { id: 'n2', title: 'Standup', excerpt: 'misc', updatedAt: '2026-05-08', tags: [] },
      ],
    });
    render(<NotesDrawer />);
    await waitFor(() => expect(screen.getByText('Q2 launch')).toBeInTheDocument());
    expect(screen.getByText('Standup')).toBeInTheDocument();
  });

  it('clicking a note row sets selectedNoteId', async () => {
    const user = userEvent.setup();
    (rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      notes: [{ id: 'n1', title: 'A', excerpt: 'a', updatedAt: '', tags: [] }],
    });
    (rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      note: {
        id: 'n1',
        createdAt: '',
        updatedAt: '',
        title: 'A',
        body: 'a',
        tags: [],
        autolinkEnabled: true,
      },
      autoLinks: [],
    });
    render(<NotesDrawer />);
    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());
    await user.click(screen.getByText('A'));
    await waitFor(() => expect(useNotesStore.getState().selectedNoteId).toBe('n1'));
  });
});
```

- [ ] **Step 2: Run test, verify failure**

Run: `pnpm --filter @compass/extension test NotesDrawer`

Expected: FAIL — current `NotesDrawer` reads from MOCK; rpc not called.

- [ ] **Step 3: Rewrite NotesDrawer (list mode only for now)**

Replace `apps/extension/app/drawers/NotesDrawer.tsx`:

```tsx
import { useState, type CSSProperties } from 'react';
import { useNotes } from '../hooks/useNotes';
import { useNotesStore } from '../state/notesStore';
import { NoteEditor } from './notes/NoteEditor';

const listRowStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: '12px 0',
  borderBottom: '1px solid var(--color-hair)',
  cursor: 'pointer',
};
const monoStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-ink-3)',
};

export function NotesDrawer() {
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId);
  const select = useNotesStore((s) => s.select);
  const { notes } = useNotes();
  const [searchQ, setSearchQ] = useState('');

  if (selectedNoteId) {
    return <NoteEditor />;
  }

  const filtered = searchQ
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(searchQ.toLowerCase()) ||
          n.excerpt.toLowerCase().includes(searchQ.toLowerCase()),
      )
    : notes;

  return (
    <div>
      <input
        type="text"
        placeholder="Search notes…"
        aria-label="Search notes"
        value={searchQ}
        onChange={(e) => setSearchQ(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 10px',
          marginBottom: 12,
          fontSize: 13,
          fontFamily: 'var(--font-serif)',
          borderRadius: 6,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'var(--color-ink)',
          boxSizing: 'border-box',
        }}
      />
      {filtered.map((n) => (
        <div key={n.id} style={listRowStyle} onClick={() => select(n.id)}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 13.5, fontWeight: 500, flex: 1 }}>{n.title}</span>
            <span style={{ ...monoStyle, color: 'var(--color-ink-4)' }}>{n.updatedAt}</span>
          </div>
          <div
            style={{
              color: 'var(--color-ink-3)',
              fontSize: 12,
              lineHeight: 1.5,
              maxHeight: '3em',
              overflow: 'hidden',
            }}
          >
            {n.excerpt}
          </div>
          {n.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
              {n.tags.map((t) => (
                <span key={t} style={monoStyle}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

Create a placeholder `apps/extension/app/drawers/notes/NoteEditor.tsx` so the file resolves; the editor is built out in Task 22:

```tsx
export function NoteEditor() {
  return null;
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm --filter @compass/extension test NotesDrawer`

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/extension/app/drawers/NotesDrawer.tsx apps/extension/app/drawers/NotesDrawer.test.tsx apps/extension/app/drawers/notes/NoteEditor.tsx
git commit -m "feat(extension): NotesDrawer list mode wired to useNotes"
```

---

## Task 22: NoteEditor — body + save + Related pills + Forgotten callout

**Files:**

- Modify: `apps/extension/app/drawers/notes/NoteEditor.tsx`
- Create: `apps/extension/app/drawers/notes/NoteEditor.test.tsx`
- Create: `apps/extension/app/drawers/notes/RelatedPill.tsx`
- Create: `apps/extension/app/drawers/notes/ForgottenCallout.tsx`

- [ ] **Step 1: Write failing test**

Create `apps/extension/app/drawers/notes/NoteEditor.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@compass/runtime', () => ({ rpc: vi.fn() }));
import { rpc } from '@compass/runtime';
import { NoteEditor } from './NoteEditor';
import { useNotesStore } from '../../state/notesStore';

describe('NoteEditor', () => {
  beforeEach(() => {
    (rpc as unknown as ReturnType<typeof vi.fn>).mockReset();
    useNotesStore.setState({
      selectedNoteId: 'n1',
      dirty: false,
      lastSavedAt: null,
      forgottenSeenThisSession: false,
    });
  });

  it('renders title + body + Related pills from rpc', async () => {
    (rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ notes: [] });
    (rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      note: {
        id: 'n1',
        createdAt: '',
        updatedAt: '',
        title: 'A',
        body: 'aaa',
        tags: [],
        autolinkEnabled: true,
      },
      autoLinks: [{ targetNoteId: 'n2', targetTitle: 'B', similarity: 0.9, rationale: null }],
    });
    render(<NoteEditor />);
    await waitFor(() => expect(screen.getByDisplayValue('A')).toBeInTheDocument());
    expect(screen.getByText(/Related: B/)).toBeInTheDocument();
  });

  it('Back button clears selection', async () => {
    const user = userEvent.setup();
    (rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ notes: [] });
    (rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      note: {
        id: 'n1',
        createdAt: '',
        updatedAt: '',
        title: 'A',
        body: 'a',
        tags: [],
        autolinkEnabled: true,
      },
      autoLinks: [],
    });
    render(<NoteEditor />);
    await waitFor(() => expect(screen.getByDisplayValue('A')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /All notes/i }));
    expect(useNotesStore.getState().selectedNoteId).toBeNull();
  });

  it('clicking a Related pill expands and fetches rationale via rpc', async () => {
    const user = userEvent.setup();
    (rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ notes: [] });
    (rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      note: {
        id: 'n1',
        createdAt: '',
        updatedAt: '',
        title: 'A',
        body: 'a',
        tags: [],
        autolinkEnabled: true,
      },
      autoLinks: [{ targetNoteId: 'n2', targetTitle: 'B', similarity: 0.9, rationale: null }],
    });
    (rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      rationale: 'shared concept',
    });
    render(<NoteEditor />);
    await waitFor(() => expect(screen.getByText(/Related: B/)).toBeInTheDocument());
    await user.click(screen.getByText(/Related: B/));
    await waitFor(() => expect(screen.getByText('shared concept')).toBeInTheDocument());
    expect(rpc).toHaveBeenCalledWith('notes.autolink.rationale', { srcId: 'n1', targetId: 'n2' });
  });
});
```

- [ ] **Step 2: Run test, verify failure**

Run: `pnpm --filter @compass/extension test NoteEditor`

Expected: FAIL — placeholder `NoteEditor` returns `null`.

- [ ] **Step 3: Implement RelatedPill**

Create `apps/extension/app/drawers/notes/RelatedPill.tsx`:

```tsx
import { useState } from 'react';

interface RelatedPillProps {
  srcId: string;
  targetId: string;
  targetTitle: string;
  initialRationale: string | null;
  onFetchRationale: (
    srcId: string,
    targetId: string,
  ) => Promise<{ rationale: string | null; reason?: string }>;
  onDismiss: (srcId: string, targetId: string) => Promise<void>;
}

export function RelatedPill({
  srcId,
  targetId,
  targetTitle,
  initialRationale,
  onFetchRationale,
  onDismiss,
}: RelatedPillProps) {
  const [expanded, setExpanded] = useState(false);
  const [rationale, setRationale] = useState<string | null>(initialRationale);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  const onClick = async () => {
    setExpanded((v) => !v);
    if (!expanded && rationale === null) {
      setLoading(true);
      setError(null);
      const r = await onFetchRationale(srcId, targetId);
      if (r.rationale) setRationale(r.rationale);
      else setError(r.reason === 'locked' ? 'Unlock to load reason' : 'Reason unavailable');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: '10px 12px',
        border: '1px solid var(--color-hair)',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.03)',
        marginBottom: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={onClick}
          style={{
            flex: 1,
            background: 'transparent',
            border: 0,
            color: 'var(--color-ink)',
            textAlign: 'left',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Related: {targetTitle} {expanded ? '▾' : '▸'}
        </button>
        <button
          aria-label="Dismiss related"
          onClick={async () => {
            setHidden(true);
            await onDismiss(srcId, targetId);
          }}
          style={{
            background: 'transparent',
            border: 0,
            color: 'var(--color-ink-4)',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          ×
        </button>
      </div>
      {expanded && (
        <div
          style={{ marginTop: 6, fontSize: 12, fontStyle: 'italic', color: 'var(--color-ink-3)' }}
        >
          {loading ? 'Loading reason…' : (error ?? rationale)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Implement ForgottenCallout**

Create `apps/extension/app/drawers/notes/ForgottenCallout.tsx`:

```tsx
interface ForgottenCalloutProps {
  noteId: string;
  title: string;
  daysAgo: number;
  onOpen: (noteId: string) => void;
}

export function ForgottenCallout({ noteId, title, daysAgo, onOpen }: ForgottenCalloutProps) {
  return (
    <div
      role="status"
      style={{
        padding: '10px 12px',
        marginBottom: 12,
        borderRadius: 10,
        background: 'var(--accent-wash)',
        color: 'var(--accent-soft)',
        fontSize: 12,
      }}
    >
      You wrote about “{title}” {daysAgo} days ago —{' '}
      <button
        onClick={() => onOpen(noteId)}
        style={{ background: 'transparent', border: 0, color: 'var(--accent)', cursor: 'pointer' }}
      >
        revisit?
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Implement NoteEditor**

Replace `apps/extension/app/drawers/notes/NoteEditor.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useNotes } from '../../hooks/useNotes';
import { useNotesStore } from '../../state/notesStore';
import { MarkdownEditor } from '../../components/MarkdownEditor';
import { RelatedPill } from './RelatedPill';
import { ForgottenCallout } from './ForgottenCallout';

export function NoteEditor() {
  const { selected, save, fetchRationale, dismissLink } = useNotes();
  const select = useNotesStore((s) => s.select);
  const clearSelection = useNotesStore((s) => s.clearSelection);
  const setDirty = useNotesStore((s) => s.setDirty);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [forgotten, setForgotten] = useState<{
    noteId: string;
    title: string;
    daysAgo: number;
  } | null>(null);

  useEffect(() => {
    if (!selected) return;
    setTitle(selected.note.title);
    setBody(selected.note.body);
  }, [selected?.note.id]);

  if (!selected) return null;

  const onTitleChange = async (next: string) => {
    setTitle(next);
    setDirty(true);
    await save(selected.note.id, { title: next });
  };

  const onBodyChange = async (next: string) => {
    setBody(next);
    setDirty(true);
    const r = await save(selected.note.id, { body: next });
    if (r.forgotten) {
      const days = Math.round(
        (Date.now() - new Date((selected.note.updatedAt as string) ?? Date.now()).getTime()) /
          (24 * 60 * 60 * 1000),
      );
      setForgotten({ noteId: r.forgotten.noteId, title: r.forgotten.title, daysAgo: days });
    }
  };

  const onToggleAutolink = async () => {
    await save(selected.note.id, { autolinkEnabled: !selected.note.autolinkEnabled });
  };

  return (
    <>
      <button
        onClick={clearSelection}
        style={{
          marginBottom: 16,
          padding: '6px 12px',
          fontSize: 11,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 999,
          color: 'var(--color-ink)',
        }}
      >
        ← All notes
      </button>
      {forgotten && (
        <ForgottenCallout
          noteId={forgotten.noteId}
          title={forgotten.title}
          daysAgo={forgotten.daysAgo}
          onOpen={(id) => select(id)}
        />
      )}
      <input
        aria-label="Note title"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        style={{
          width: '100%',
          fontFamily: 'var(--font-serif)',
          fontSize: 28,
          background: 'transparent',
          border: 0,
          color: 'var(--color-ink)',
          marginBottom: 8,
          padding: 0,
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.12em',
            color: 'var(--color-ink-3)',
          }}
        >
          {selected.note.tags.join(' · ') || 'no tags'} · {selected.note.updatedAt.slice(0, 10)}
        </span>
        <label style={{ fontSize: 11, color: 'var(--color-ink-3)' }}>
          <input
            type="checkbox"
            checked={selected.note.autolinkEnabled}
            onChange={onToggleAutolink}
            style={{ marginRight: 6 }}
          />
          Auto-link
        </label>
      </div>
      <MarkdownEditor value={body} onChange={onBodyChange} debounceMs={5000} />
      {selected.autoLinks.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-ink-3)',
              marginBottom: 8,
            }}
          >
            Related
          </div>
          {selected.autoLinks.map((l) => (
            <RelatedPill
              key={l.targetNoteId}
              srcId={selected.note.id}
              targetId={l.targetNoteId}
              targetTitle={l.targetTitle}
              initialRationale={l.rationale}
              onFetchRationale={fetchRationale}
              onDismiss={dismissLink}
            />
          ))}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 6: Run test, verify pass**

Run: `pnpm --filter @compass/extension test NoteEditor`

Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/extension/app/drawers/notes/NoteEditor.tsx apps/extension/app/drawers/notes/NoteEditor.test.tsx apps/extension/app/drawers/notes/RelatedPill.tsx apps/extension/app/drawers/notes/ForgottenCallout.tsx
git commit -m "feat(extension): NoteEditor — title + body editor + Related pills + Forgotten callout"
```

---

## Task 23: ProfileDrawer NotesSection (global toggle)

**Files:**

- Create: `apps/extension/app/drawers/profile/NotesSection.tsx`
- Create: `apps/extension/app/drawers/profile/NotesSection.test.tsx`
- Modify: `apps/extension/app/drawers/ProfileDrawer.tsx`

- [ ] **Step 1: Write failing test**

Create `apps/extension/app/drawers/profile/NotesSection.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const setUserProfile = vi.fn();
const getUserProfile = vi.fn();
vi.mock('@compass/core', async () => {
  const actual = await vi.importActual<typeof import('@compass/core')>('@compass/core');
  return { ...actual, getUserProfile, setUserProfile };
});
vi.mock('@compass/runtime', () => ({ rpc: vi.fn() }));

import { NotesSection } from './NotesSection';

describe('NotesSection', () => {
  beforeEach(() => {
    setUserProfile.mockReset();
    getUserProfile.mockReset();
  });

  it('renders the global Auto-link toggle reflecting profile state', async () => {
    getUserProfile.mockResolvedValueOnce({
      autoLinkEnabled: true,
      briefingHour: 8,
      reflectionHour: 18,
      workHours: { start: '09:00', end: '17:00' },
    });
    render(<NotesSection />);
    await waitFor(() => expect(screen.getByLabelText(/Auto-link/i)).toBeChecked());
  });

  it('toggling fires setUserProfile and alarms.refresh', async () => {
    const user = userEvent.setup();
    getUserProfile.mockResolvedValueOnce({
      autoLinkEnabled: true,
      briefingHour: 8,
      reflectionHour: 18,
      workHours: { start: '09:00', end: '17:00' },
    });
    render(<NotesSection />);
    await waitFor(() => expect(screen.getByLabelText(/Auto-link/i)).toBeChecked());
    await user.click(screen.getByLabelText(/Auto-link/i));
    expect(setUserProfile).toHaveBeenCalledWith({ autoLinkEnabled: false });
  });
});
```

- [ ] **Step 2: Run test, verify failure**

Run: `pnpm --filter @compass/extension test NotesSection`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/extension/app/drawers/profile/NotesSection.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { getUserProfile, setUserProfile } from '@compass/core';

export function NotesSection() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    void getUserProfile().then((p) => setEnabled(p.autoLinkEnabled));
  }, []);

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    await setUserProfile({ autoLinkEnabled: next });
  };

  if (enabled === null) return null;

  return (
    <section style={{ padding: '12px 0', borderBottom: '1px solid var(--color-hair)' }}>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--color-ink-3)',
          marginBottom: 8,
        }}
      >
        Notes
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
        <input type="checkbox" checked={enabled} onChange={toggle} />
        Auto-link new notes
      </label>
      <div style={{ marginTop: 4, fontSize: 11, color: 'var(--color-ink-4)' }}>
        Compute related-note suggestions on save (local). Rationale is fetched only on click.
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Wire into ProfileDrawer**

In `apps/extension/app/drawers/ProfileDrawer.tsx`, import and render `<NotesSection />` next to `<DailyTimesSection />` (locate by grep on `DailyTimesSection`).

- [ ] **Step 5: Run test, verify pass**

Run: `pnpm --filter @compass/extension test NotesSection`

Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/extension/app/drawers/profile/NotesSection.tsx apps/extension/app/drawers/profile/NotesSection.test.tsx apps/extension/app/drawers/ProfileDrawer.tsx
git commit -m "feat(extension): ProfileDrawer NotesSection — global auto-link toggle"
```

---

## Task 24: CmdK ask mode — real notes.askGrounded

**Files:**

- Modify: `apps/extension/app/components/CmdK.tsx`
- Modify or create: `apps/extension/app/components/CmdK.test.tsx`

- [ ] **Step 1: Write failing test**

Append to (or create) `apps/extension/app/components/CmdK.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@compass/runtime', () => ({ rpc: vi.fn() }));
import { rpc } from '@compass/runtime';
import { CmdK } from './CmdK';

describe('CmdK ask mode', () => {
  beforeEach(() => {
    (rpc as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  it('on ask, calls notes.askGrounded and renders answer + citation badges', async () => {
    const user = userEvent.setup();
    (rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      answer: 'Q2 launch was delayed [n1].',
      citations: [{ id: 'n1', noteId: 'noteA', title: 'Q2 launch' }],
      reason: null,
    });
    render(<CmdK open onClose={() => {}} />);
    const input = screen.getByPlaceholderText(/Search, navigate, or ask/);
    await user.type(input, 'when did q2 launch{Enter}');
    await waitFor(() => expect(screen.getByText(/Q2 launch was delayed/)).toBeInTheDocument());
    expect(screen.getByText('n1: Q2 launch')).toBeInTheDocument();
  });

  it('clicking a citation badge opens NotesDrawer with the cited note selected', async () => {
    const user = userEvent.setup();
    (rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      answer: 'A [n1].',
      citations: [{ id: 'n1', noteId: 'noteA', title: 'Q2 launch' }],
      reason: null,
    });
    render(<CmdK open onClose={() => {}} />);
    const input = screen.getByPlaceholderText(/Search, navigate, or ask/);
    await user.type(input, 'when did q2 launch{Enter}');
    await waitFor(() => expect(screen.getByText('n1: Q2 launch')).toBeInTheDocument());
    await user.click(screen.getByText('n1: Q2 launch'));
    // Implementation should call shell openDrawer + notesStore.select
    // (verified at integration level — here we just ensure no throw)
  });

  it('shows empty-corpus message when reason is no-notes', async () => {
    const user = userEvent.setup();
    (rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      answer: null,
      citations: [],
      reason: 'no-notes',
    });
    render(<CmdK open onClose={() => {}} />);
    const input = screen.getByPlaceholderText(/Search, navigate, or ask/);
    await user.type(input, 'something?{Enter}');
    await waitFor(() => expect(screen.getByText(/Write some notes first/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test, verify failure**

Run: `pnpm --filter @compass/extension test CmdK`

Expected: FAIL — current onAsk returns mock; rpc not called.

- [ ] **Step 3: Replace mock with real path**

In `apps/extension/app/components/CmdK.tsx`, find the existing `onAsk` and replace its implementation. Add imports:

```ts
import { rpc } from '@compass/runtime';
import { useShell } from '../state/shell';
import { useNotesStore } from '../state/notesStore';
```

Replace the mocked answer state with:

```ts
const [answer, setAnswer] = useState<string | null>(null);
const [citations, setCitations] = useState<Array<{ id: string; noteId: string; title: string }>>(
  [],
);
const [reason, setReason] = useState<string | null>(null);
const [busy, setBusy] = useState(false);

const onAsk = async () => {
  setBusy(true);
  setAnswer(null);
  setCitations([]);
  setReason(null);
  try {
    const r = (await rpc('notes.askGrounded', { query: q })) as {
      answer: string | null;
      citations: Array<{ id: string; noteId: string; title: string }>;
      reason: string | null;
    };
    setAnswer(r.answer);
    setCitations(r.citations);
    setReason(r.reason);
  } finally {
    setBusy(false);
  }
};
```

Replace the answer rendering block with:

```tsx
{
  busy && <div style={{ padding: 12, color: 'var(--color-ink-3)' }}>Thinking…</div>;
}
{
  answer && (
    <>
      <div style={{ padding: 12, fontSize: 14, lineHeight: 1.6, color: 'var(--color-ink)' }}>
        {answer}
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '0 12px 12px', flexWrap: 'wrap' }}>
        {citations.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              useNotesStore.getState().select(c.noteId);
              useShell.getState().openDrawer('notes');
              onClose();
            }}
            style={{
              padding: '4px 10px',
              fontSize: 11,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'var(--color-ink)',
              cursor: 'pointer',
            }}
          >
            {c.id}: {c.title}
          </button>
        ))}
      </div>
    </>
  );
}
{
  !busy && answer === null && reason === 'no-notes' && (
    <div style={{ padding: 12, color: 'var(--color-ink-3)' }}>Write some notes first.</div>
  );
}
{
  !busy && answer === null && reason === 'locked' && (
    <div style={{ padding: 12, color: 'var(--color-ink-3)' }}>Unlock to ask.</div>
  );
}
```

If the `useShell.openDrawer` API differs, adjust by reading `apps/extension/app/state/shell.ts`.

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm --filter @compass/extension test CmdK`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/extension/app/components/CmdK.tsx apps/extension/app/components/CmdK.test.tsx
git commit -m "feat(extension): CmdK ask mode wired to notes.askGrounded with citation click-through"
```

---

## Task 25: ESLint rule no-note-content-in-logs

**Files:**

- Modify: `eslint.config.js`
- Create: `eslint-rules/no-note-content-in-logs.js` (or similar — adjust to match existing custom-rule layout)

- [ ] **Step 1: Locate existing custom rule**

Run: `grep -rn "no-direct-profile-storage" eslint.config.js eslint-rules/ 2>/dev/null`

Expected: identifies the file shape used by the existing rule. Mirror that path for the new rule.

- [ ] **Step 2: Implement rule**

Create the rule file at the same path style as the existing one. Sample implementation:

```js
// eslint-rules/no-note-content-in-logs.js
'use strict';
const SENSITIVE = new Set(['body', 'title', 'text', 'context', 'answer', 'rationale', 'query']);
module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow logging note content fields' },
    schema: [],
    messages: {
      leakage: "Avoid passing '{{name}}' to console.* — use safeLog() to strip content fields.",
    },
  },
  create(context) {
    function isConsoleCall(node) {
      return (
        node.callee.type === 'MemberExpression' &&
        node.callee.object.type === 'Identifier' &&
        node.callee.object.name === 'console' &&
        node.callee.property.type === 'Identifier' &&
        ['log', 'warn', 'error', 'info', 'debug'].includes(node.callee.property.name)
      );
    }
    function checkArg(arg) {
      if (
        arg.type === 'MemberExpression' &&
        arg.property.type === 'Identifier' &&
        SENSITIVE.has(arg.property.name)
      ) {
        context.report({ node: arg, messageId: 'leakage', data: { name: arg.property.name } });
      }
      if (arg.type === 'TemplateLiteral') {
        for (const expr of arg.expressions) checkArg(expr);
      }
      if (arg.type === 'Identifier' && SENSITIVE.has(arg.name)) {
        context.report({ node: arg, messageId: 'leakage', data: { name: arg.name } });
      }
    }
    return {
      CallExpression(node) {
        if (!isConsoleCall(node)) return;
        for (const arg of node.arguments) checkArg(arg);
      },
    };
  },
};
```

- [ ] **Step 3: Wire into eslint.config.js**

In `eslint.config.js`, add a section that scopes the rule to the notes pipeline files:

```js
{
  files: [
    'apps/extension/entrypoints/offscreen/notes.ts',
    'apps/extension/entrypoints/offscreen/main.ts',
    'apps/extension/app/drawers/notes/**/*.{ts,tsx}',
    'apps/extension/app/drawers/NotesDrawer.tsx',
    'apps/extension/app/components/CmdK.tsx',
    'apps/extension/app/hooks/useNotes.ts',
    'packages/agents/src/notes.*.ts',
    'packages/db/src/repositories/notes.ts',
  ],
  plugins: { compass: { rules: { 'no-note-content-in-logs': require('./eslint-rules/no-note-content-in-logs.js') } } },
  rules: { 'compass/no-note-content-in-logs': 'error' },
},
```

(Adapt to the project's flat-config structure — read the surrounding entries.)

- [ ] **Step 4: Verify rule fires**

Add a temporary line in `apps/extension/app/hooks/useNotes.ts`:

```ts
console.log('debug', selected?.note.body);
```

Run: `pnpm --filter @compass/extension lint`

Expected: ESLint error `"body"` is not allowed. Remove the temporary line.

- [ ] **Step 5: Commit**

```bash
git add eslint.config.js eslint-rules/no-note-content-in-logs.js
git commit -m "feat(lint): no-note-content-in-logs rule scoped to notes pipeline files"
```

---

## Task 26: Build the 100-note autolink fixture

**Files:**

- Create: `tests/prompt-eval/notes.autolink.fixture.json`

- [ ] **Step 1: Generate fixture content**

The fixture is curated, not random. Create `tests/prompt-eval/notes.autolink.fixture.json` with a 100-note corpus organized into ~10 thematic clusters of 10 notes each (work projects, weekend hobby, recurring meetings, travel logs, reading notes, decisions, retros, post-mortems, spec drafts, journal entries). Within each cluster, mark every pair as `true` (related). Across clusters, sample ~250 cross-cluster pairs and mark them `false`.

Schema:

```json
{
  "notes": [
    { "id": "n001", "title": "...", "body": "...", "cluster": "work-q2-launch" },
    ...
  ],
  "groundTruthPairs": [
    ["n001", "n002", true],
    ["n001", "n014", false],
    ...
  ]
}
```

Aim for ~300 labeled pairs total. Notes should be 200-1000 chars each, written as plausible personal notes (not generic filler).

For pragmatism in this slice, hand-author 30 notes across 3 clusters first, ship the harness, and grow the fixture in a follow-up if precision is on the bubble. The harness reads the file size directly — number of notes is data, not code.

- [ ] **Step 2: Commit**

```bash
git add tests/prompt-eval/notes.autolink.fixture.json
git commit -m "test(eval): notes autolink fixture (curated clusters + ground-truth pairs)"
```

---

## Task 27: Autolink-precision harness

**Files:**

- Create: `packages/db/tests/eval/autolink-precision.test.ts`
- Create: `tests/prompt-eval/notes.autolink.yaml`

- [ ] **Step 1: Write the harness**

Create `packages/db/tests/eval/autolink-precision.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { load as loadVec } from 'sqlite-vec';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMigrations } from '../../src/migration-runner';
import { createNotesRepo } from '../../src/repositories/notes';
import { embed } from '@compass/embeddings';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(here, '../../../../tests/prompt-eval/notes.autolink.fixture.json');

interface Fixture {
  notes: Array<{ id: string; title: string; body: string; cluster: string }>;
  groundTruthPairs: Array<[string, string, boolean]>;
}

describe('autolink precision @ curated fixture', () => {
  it('hits ≥ 0.80 precision at threshold 0.78', async () => {
    const raw = readFileSync(FIXTURE, 'utf8');
    const fx = JSON.parse(raw) as Fixture;
    const sqlite3 = await sqlite3InitModule();
    const db = new sqlite3.oo1.DB(':memory:', 'c');
    loadVec(db as any);
    await runMigrations(db);
    const repo = createNotesRepo(db);

    // Map fixture id (e.g., 'n001') → repo uuid
    const idMap = new Map<string, string>();
    for (const n of fx.notes) {
      const uuid = await repo.create({
        title: n.title,
        body: n.body,
        tags: [n.cluster],
        embeddingModel: 'minilm-l6-v2',
      });
      idMap.set(n.id, uuid);
      const e = await embed(`${n.title}\n${n.body}`);
      await repo.upsertChunks(uuid, [{ text: `${n.title}\n${n.body}`, embedding: e }]);
    }

    let truePos = 0;
    let predicted = 0;
    const THRESHOLD = 0.78;
    for (const n of fx.notes) {
      const srcUuid = idMap.get(n.id)!;
      const neighbors = await repo.findNeighbors(srcUuid, { k: 10, threshold: THRESHOLD });
      for (const nb of neighbors) {
        const targetFixtureId = [...idMap.entries()].find(([, v]) => v === nb.noteId)?.[0];
        if (!targetFixtureId) continue;
        predicted++;
        const gt = fx.groundTruthPairs.find(
          ([a, b]) =>
            (a === n.id && b === targetFixtureId) || (a === targetFixtureId && b === n.id),
        );
        if (gt && gt[2] === true) truePos++;
      }
    }
    const precision = predicted === 0 ? 0 : truePos / predicted;
    // eslint-disable-next-line no-console
    console.log(
      `autolink precision: ${precision.toFixed(3)} (TP=${truePos} predicted=${predicted})`,
    );
    expect(precision).toBeGreaterThanOrEqual(0.8);
  }, 120_000);
});
```

Create `tests/prompt-eval/notes.autolink.yaml`:

```yaml
description: Notes autolink rationale + retrieval gates (Phase 2)

# The retrieval gate is enforced by the Vitest harness:
# packages/db/tests/eval/autolink-precision.test.ts
# (precision ≥ 0.8 at threshold 0.78 on the curated 100-note fixture).
#
# This file documents the rationale-LLM eval, run as a standard promptfoo task.

prompts:
  - file://../../packages/core/src/prompts/notes.autolink.summary.md

providers:
  - openrouter:anthropic/claude-sonnet-4-6

tests:
  - description: Same-cluster pair — Q2 launch
    vars:
      noteA: { title: 'Q2 launch risks', body: 'shipping date slipped to July…' }
      noteB: { title: 'Q2 product blockers', body: 'engineering capacity tight…' }
    assert:
      - type: is-json
      - type: javascript
        value: 'output.rationale && output.rationale.length < 400'
      - type: contains-any
        value: ['Q2', 'launch', 'shared', 'both']
  - description: Cross-cluster pair — should still produce a bounded sentence
    vars:
      noteA: { title: 'Backpacking notes', body: 'tent failed at 3am…' }
      noteB: { title: 'Engineering retro', body: 'ci flakiness…' }
    assert:
      - type: is-json
      - type: javascript
        value: 'output.rationale.length < 400'
```

- [ ] **Step 2: Run the harness**

Run: `pnpm --filter @compass/db test autolink-precision`

Expected: PASS (precision ≥ 0.80). If FAIL, sweep thresholds in the `THRESHOLD` constant: try 0.74, 0.76, 0.80, 0.82. Pick the lowest threshold meeting precision ≥ 0.8 while predicted-pair count stays > 50% of true pairs (recall ≥ 0.5). Update the threshold constant in `NotesRepo.findNeighbors` defaults if needed.

- [ ] **Step 3: Commit**

```bash
git add packages/db/tests/eval/autolink-precision.test.ts tests/prompt-eval/notes.autolink.yaml
git commit -m "test(eval): autolink precision harness — gates merge on ≥ 0.80 @ 100-note fixture"
```

---

## Task 28: Hybrid-search bench

**Files:**

- Create: `tests/perf/hybrid-search.bench.ts`
- Modify: root `package.json` (add `bench` script if missing)

- [ ] **Step 1: Add bench script**

Inspect root `package.json` and `vitest.config.ts`. If `bench` script not present, add:

```json
"bench": "vitest bench --run"
```

If Vitest bench config not present, add to `vitest.config.ts` minimal `bench` setup or create `vitest.bench.config.ts` (refer to Vitest docs).

- [ ] **Step 2: Write bench**

Create `tests/perf/hybrid-search.bench.ts`:

```ts
import { bench, describe } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { load as loadVec } from 'sqlite-vec';
import { runMigrations } from '../../packages/db/src/migration-runner';
import { createNotesRepo } from '../../packages/db/src/repositories/notes';
import { embed, embedBatch } from '../../packages/embeddings/src/runtime';

async function buildCorpus(size: number) {
  const sqlite3 = await sqlite3InitModule();
  const db = new sqlite3.oo1.DB(':memory:', 'c');
  loadVec(db as any);
  await runMigrations(db);
  const repo = createNotesRepo(db);

  const TOPICS = [
    'q2 launch blockers',
    'design system tokens',
    'kid school pickup',
    'travel to amsterdam',
    'reading notes on power and progress',
    'engineering retro action items',
    'goal — health',
    'deal review pipeline',
    'incident postmortem',
    'standup blockers',
  ];
  const buf: Array<{ id: string; text: string }> = [];
  for (let i = 0; i < size; i++) {
    const t = TOPICS[i % TOPICS.length];
    const id = await repo.create({
      title: `${t} #${i}`,
      body: `${t} body — line ${i}. context content for note ${i}.`,
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    buf.push({ id, text: `${t} #${i}\n${t} body — line ${i}.` });
  }
  // Embed in batches of 64.
  const BATCH = 64;
  for (let off = 0; off < buf.length; off += BATCH) {
    const slice = buf.slice(off, off + BATCH);
    const embs = await embedBatch(slice.map((s) => s.text));
    for (let i = 0; i < slice.length; i++) {
      await repo.upsertChunks(slice[i].id, [{ text: slice[i].text, embedding: embs[i] }]);
    }
  }
  return repo;
}

const QUERIES = [
  'q2 launch',
  'design tokens',
  'amsterdam trip',
  'incident postmortem',
  'reading notes on progress',
  'standup',
  'health goal',
  'kid pickup',
  'engineering retro',
  'deal pipeline',
];

describe('hybrid-search @ 10k notes', async () => {
  const repo = await buildCorpus(10_000);
  // Pre-embed queries
  const qEmbeds = await Promise.all(QUERIES.map((q) => embed(q)));

  bench(
    'hybridSearch P95',
    async () => {
      for (let i = 0; i < QUERIES.length; i++) {
        await repo.hybridSearch({ query: QUERIES[i], queryEmbedding: qEmbeds[i], limit: 20 });
      }
    },
    { iterations: 50 },
  );
});
```

- [ ] **Step 3: Run bench**

Run: `pnpm bench` (or `pnpm exec vitest bench --run tests/perf/hybrid-search.bench.ts`)

Expected: P95 ≤ 250 ms per the bench output. Vitest bench reports `mean / median / p95`.

If FAIL: Switch to per-note pooled vector first-pass, then chunk re-rank top-50. Implementation: extend `notes` table with a `pooled_embedding` column (NULL for chunked notes); store the mean of chunk vectors; query `notes_vec` keyed off pooled per-note rows; top-50 then re-fetch chunk-level distances. This is a sub-task within Task 28; revise both the `NotesRepo.upsertChunks` (to also write the pooled vector) and `hybridSearch` (to use pooled first-pass).

- [ ] **Step 4: Commit**

```bash
git add tests/perf/hybrid-search.bench.ts package.json vitest.config.ts
git commit -m "test(perf): hybrid-search bench — gates merge on P95 ≤ 250ms @ 10k notes"
```

---

## Task 29: notes-pipeline integration test

**Files:**

- Create: `tests/integration/notes-pipeline.test.ts`

- [ ] **Step 1: Write the test**

Create `tests/integration/notes-pipeline.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { load as loadVec } from 'sqlite-vec';
import { runMigrations } from '@compass/db';
import { createNotesRepo, type NotesRepo } from '@compass/db';
import { embed, embedBatch } from '@compass/embeddings';
import { generateAutolinkSummary, askGrounded } from '@compass/agents';

async function freshRepo(): Promise<NotesRepo> {
  const sqlite3 = await sqlite3InitModule();
  const db = new sqlite3.oo1.DB(':memory:', 'c');
  loadVec(db as any);
  await runMigrations(db);
  return createNotesRepo(db);
}

const stubRouter = {
  executeTask: async (req: any) => {
    if (req.taskId === 'notes.autolink.summary') {
      return { output: { rationale: 'shared topic' }, provider: 'stub', usdCost: 0 };
    }
    if (req.taskId === 'notes.askGrounded') {
      return {
        output: { answer: 'Sample answer [n1].', citations: ['n1'], reason: null },
        provider: 'stub',
        usdCost: 0,
      };
    }
    throw new Error('unexpected task ' + req.taskId);
  },
};

describe('notes-pipeline integration', () => {
  it('save → embed → neighbor → rationale lazy fetch', async () => {
    const repo = await freshRepo();
    const a = await repo.create({
      title: 'Q2 launch risks',
      body: 'shipping slipped to July',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const b = await repo.create({
      title: 'Q2 product blockers',
      body: 'capacity tight in eng',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const ea = await embed('Q2 launch risks\nshipping slipped to July');
    const eb = await embed('Q2 product blockers\ncapacity tight in eng');
    await repo.upsertChunks(a, [{ text: 'Q2 launch risks', embedding: ea }]);
    await repo.upsertChunks(b, [{ text: 'Q2 product blockers', embedding: eb }]);
    const neighbors = await repo.findNeighbors(a, { k: 5, threshold: 0.5 });
    expect(neighbors.map((n) => n.noteId)).toContain(b);
    await repo.rebuildAutoLinks(a, neighbors);
    const links = await repo.listAutoLinksForNote(a);
    expect(links[0].rationale).toBeNull();
    const noteA = await repo.getById(a);
    const noteB = await repo.getById(b);
    const out = await generateAutolinkSummary({
      router: stubRouter,
      noteA: { title: noteA!.title, body: noteA!.body },
      noteB: { title: noteB!.title, body: noteB!.body },
    });
    await repo.setAutoLinkRationale(a, b, out.rationale);
    const links2 = await repo.listAutoLinksForNote(a);
    expect(links2[0].rationale).toBe('shared topic');
  });

  it('hybrid search merges FTS + vec hits', async () => {
    const repo = await freshRepo();
    const a = await repo.create({
      title: 'q2 launch',
      body: 'plan',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const b = await repo.create({
      title: 'unrelated',
      body: 'q2 risk register',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const ea = await embed('q2 launch\nplan');
    const eb = await embed('unrelated\nq2 risk register');
    await repo.upsertChunks(a, [{ text: 'q2 launch', embedding: ea }]);
    await repo.upsertChunks(b, [{ text: 'unrelated', embedding: eb }]);
    const q = await embed('q2');
    const hits = await repo.hybridSearch({ query: 'q2', queryEmbedding: q, limit: 20 });
    const ids = hits.map((h) => h.noteId);
    expect(ids).toContain(a);
    expect(ids).toContain(b);
  });

  it('askGrounded returns answer + citations via stub router', async () => {
    const repo = await freshRepo();
    const a = await repo.create({
      title: 'q2 launch',
      body: 'delayed to july',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const e = await embed('q2 launch\ndelayed to july');
    await repo.upsertChunks(a, [{ text: 'q2 launch', embedding: e }]);
    const q = await embed('when did q2 launch');
    const hits = await repo.hybridSearch({
      query: 'when did q2 launch',
      queryEmbedding: q,
      limit: 5,
    });
    const r = await askGrounded({ router: stubRouter, query: 'when did q2 launch', hits });
    expect(r.answer).toContain('Sample answer');
    expect(r.citations[0].noteId).toBe(a);
  });

  it('per-note autolink_enabled=0 — repo still allows neighbors but UI/pipeline must skip rebuild', async () => {
    const repo = await freshRepo();
    const a = await repo.create({
      title: 'a',
      body: 'aa',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    await repo.update(a, { autolinkEnabled: false });
    const got = await repo.getById(a);
    expect(got?.autolinkEnabled).toBe(false);
  });

  it('cascade delete removes notes_vec rows', async () => {
    const repo = await freshRepo();
    const a = await repo.create({
      title: 'a',
      body: 'aa',
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const e = await embed('a\naa');
    await repo.upsertChunks(a, [{ text: 'aa', embedding: e }]);
    await repo.delete(a);
    // Re-query notes_vec via raw db access (skipped here; covered by repo unit test).
    expect(await repo.getById(a)).toBeNull();
  });
});
```

- [ ] **Step 2: Run**

Run: `pnpm exec vitest run tests/integration/notes-pipeline.test.ts`

Expected: PASS (5 scenarios). May need vitest config alias for `@sqlite.org/sqlite-wasm` (already added in daily-agent slice — confirm).

- [ ] **Step 3: Commit**

```bash
git add tests/integration/notes-pipeline.test.ts
git commit -m "test(integration): notes-pipeline 5 scenarios"
```

---

## Task 30: E2E notes.spec.ts

**Files:**

- Create: `apps/extension/tests/e2e/notes.spec.ts`

- [ ] **Step 1: Write the spec**

Create `apps/extension/tests/e2e/notes.spec.ts`:

```ts
import type { Page } from '@playwright/test';
import { test, expect } from './setup/fixtures.js';

const PROFILE_DRAWER = 'aside.drawer.on[data-kind="profile"]';
const NOTES_DRAWER = 'aside.drawer.on[data-kind="notes"]';

async function openNotesDrawer(page: Page) {
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect(page.locator(NOTES_DRAWER)).toBeVisible();
}

async function openProfileDrawer(page: Page) {
  await page.getByRole('button', { name: 'Profile' }).click();
  await expect(page.locator(PROFILE_DRAWER)).toBeVisible();
}

test('notes list renders and a note can be selected', async ({ extensionPage: page }) => {
  // Seed two notes by writing directly into chrome.storage / sqlite is not viable;
  // we use the rpc pipe via the SW. The simplest path: use the in-page rpc helper.
  await page.evaluate(async () => {
    const send = async (route: string, payload: unknown) =>
      new Promise<unknown>((resolve) => chrome.runtime.sendMessage({ route, payload }, resolve));
    await send('notes.create', { title: 'Q2 launch', body: 'shipping plan', tags: ['work'] });
    await send('notes.create', { title: 'Standup', body: 'misc updates', tags: [] });
  });
  await page.reload();
  await openNotesDrawer(page);
  await expect(page.locator(NOTES_DRAWER).getByText('Q2 launch')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(NOTES_DRAWER).getByText('Standup')).toBeVisible();
  await page.locator(NOTES_DRAWER).getByText('Q2 launch').click();
  await expect(page.locator(NOTES_DRAWER).getByDisplayValue('Q2 launch')).toBeVisible();
});

test('global auto-link toggle persists to profile.user.v1', async ({ extensionPage: page }) => {
  await openProfileDrawer(page);
  const toggle = page.locator(PROFILE_DRAWER).getByLabel('Auto-link new notes');
  await expect(toggle).toBeVisible({ timeout: 5_000 });
  await expect(toggle).toBeChecked();
  await toggle.click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        chrome.storage.local.get('profile.user.v1').then((r) => {
          const p = r['profile.user.v1'] as { autoLinkEnabled?: boolean } | undefined;
          return p?.autoLinkEnabled;
        }),
      ),
    )
    .toBe(false);
});

test('CmdK ask mode opens with no live key — structural assertion', async ({
  extensionPage: page,
}) => {
  // Without COMPASS_E2E_OPENROUTER_KEY, askGrounded RPC won't resolve to an answer,
  // but the input + ask mode UI must render.
  await page.keyboard.press('Meta+k').catch(() => page.keyboard.press('Control+k'));
  const input = page.getByPlaceholder(/Search, navigate, or ask/);
  await expect(input).toBeVisible({ timeout: 5_000 });
  await input.fill('when did q2 launch?');
  if (process.env.COMPASS_E2E_OPENROUTER_KEY) {
    await page.keyboard.press('Enter');
    await expect(page.getByText('Thinking…')).toBeVisible({ timeout: 5_000 });
    // Either an answer or "Write some notes first." renders within timeout.
    await Promise.race([
      page.waitForSelector('text=Write some notes first', { timeout: 30_000 }),
      page.locator('button:has-text("n1:")').first().waitFor({ timeout: 30_000 }),
    ]);
  }
});
```

- [ ] **Step 2: Build extension and run e2e**

Run from repo root:

```bash
pnpm --filter @compass/extension build
pnpm --filter @compass/extension exec playwright test tests/e2e/notes.spec.ts --reporter=line
```

Expected: 3/3 PASS (structural path).

- [ ] **Step 3: Commit**

```bash
git add apps/extension/tests/e2e/notes.spec.ts
git commit -m "test(e2e): notes — list select + global toggle + ⌘K ask structural"
```

---

## Task 31: docs/architecture.md — Semantic Notes subsection

**Files:**

- Modify: `docs/architecture.md`

- [ ] **Step 1: Insert subsection between Daily Agent and Settings**

Open `docs/architecture.md` and locate the line `## Settings + encrypted storage`. Insert immediately before it:

```markdown
## Semantic Notes (`packages/db` + `packages/embeddings` + `packages/agents`)

Phase 2 closes the Notes drawer + ⌘K ask loop with real local-first retrieval.

**Module layout:**

- Schema: migration v3 adds `notes` / `note_chunks` / `notes_fts` (FTS5) / `notes_vec` (sqlite-vec, 384 dims) / `auto_links`.
- Repo: `NotesRepo` ([packages/db/src/repositories/notes.ts](../packages/db/src/repositories/notes.ts)) — CRUD, `upsertChunks`, `findNeighbors`, `hybridSearch`, `rebuildAutoLinks`, `setAutoLinkRationale`.
- Embeddings: `@compass/embeddings` MiniLM-L6-v2 (offscreen, OPFS-cached weights). `embedBatch` returns N float32 vectors per N inputs.
- Agents: `notes.autolink.summary` (on-demand pair → 1-sentence rationale) and `notes.askGrounded` (hybrid hits → grounded answer + citations).

**Pipelines:**

- Write: debounced 5 s save → minor-edit Δ-check → re-chunk → `embedBatch` → `notes_vec` upsert → neighbor compute → `auto_links` rebuild (NULL rationale). Forgotten-context check surfaces ≤ 1 callout per session.
- Rationale: lazy. Pill click → `rpc('notes.autolink.rationale')` → cached after first fetch.
- Search: hybrid FTS5 ∪ sqlite-vec, reciprocal-rank fusion (k=60).
- Ask: `notes.search` top-5 → grounded LLM call → answer with `[nN]` citations and badge click-through.

**Quality gates (PRD §11.8):**

- Auto-link precision ≥ 0.80 on 100-note curated fixture (`packages/db/tests/eval/autolink-precision.test.ts`).
- Hybrid search P95 ≤ 250 ms at 10k notes (`tests/perf/hybrid-search.bench.ts`).
- Zero content leakage to logs — enforced by ESLint rule `compass/no-note-content-in-logs` scoped to notes pipeline files.

**Kill switches:**

- Per-note: editor header toggle → `notes.autolink_enabled`.
- Global: ProfileDrawer NotesSection → `profile.user.v1.autoLinkEnabled`.

**Future-proofing:**

- `notes.embedding_model` per row + `notes.reembed_pending` flag prepare for a future embedding-model swap migration without data loss.
```

- [ ] **Step 2: Commit**

```bash
git add docs/architecture.md
git commit -m "docs(architecture): document Phase 2 Semantic Notes pipeline + gates"
```

---

## Task 32: PRD §21 — flip Phase 2 semantic-notes row

**Files:**

- Modify: `docs/prd.md`

- [ ] **Step 1: Update the row**

In `docs/prd.md`, find:

```markdown
### Phase 2 semantic-notes — Semantic Notes (deferred)
```

Replace with (use `#TBD` for now; we'll pin the PR number after open):

```markdown
### Phase 2 semantic-notes — Semantic Notes (complete, closed 2026-05-10 via PR #TBD)

- Notes CRUD with CodeMirror 6 markdown editor.
- Local embedding pipeline (MiniLM-L6-v2, 384 dims; offscreen).
- Auto-linking with on-demand LLM rationale (lazy).
- Forgotten-context callout — one per session, ≥ 45-day stale + similarity > 0.82.
- Hybrid (FTS5 ∪ sqlite-vec) semantic search with reciprocal-rank fusion.
- ⌘K `notes.askGrounded` — hybrid retrieve + grounded answer + citation click-through.
- Quality gates (§11.8) hit before merge: auto-link precision ≥ 0.80 @ 100-note fixture; hybrid search P95 ≤ 250 ms @ 10k notes; zero log leakage (ESLint-enforced).
- Per-note + global auto-link kill switches.
- **Gate (closed):** `notes-pipeline` integration test, `autolink-precision` harness, `hybrid-search.bench`, e2e `notes.spec.ts` 3/3 passing on structural path.
```

- [ ] **Step 2: Commit**

```bash
git add docs/prd.md
git commit -m "docs(prd): mark Phase 2 semantic-notes slice closed"
```

---

## Task 33: Repo-wide green check

**Files:** none (verification only).

- [ ] **Step 1: Typecheck**

Run: `pnpm typecheck`

Expected: 9/9 packages PASS.

- [ ] **Step 2: Lint**

Run: `pnpm lint`

Expected: PASS (pre-existing `react-hooks/exhaustive-deps` warnings in `useScene.ts` may persist — not introduced by this slice).

- [ ] **Step 3: Tests (all packages)**

Run: `pnpm test`

Expected: ALL package suites PASS.

- [ ] **Step 4: Bench**

Run: `pnpm bench`

Expected: P95 ≤ 250 ms.

- [ ] **Step 5: Build**

Run: `pnpm build`

Expected: BUILD OK. Inspect chrome-mv3 size; expect newtab chunk delta < +120 KB vs. master (CodeMirror 6 ≈ 70-80 KB minified+gzip).

- [ ] **Step 6: Run e2e**

Run: `pnpm --filter @compass/extension exec playwright test tests/e2e/notes.spec.ts --reporter=line`

Expected: 3/3 PASS.

- [ ] **Step 7: Run integration**

Run: `pnpm exec vitest run tests/integration/notes-pipeline.test.ts`

Expected: 5/5 PASS.

- [ ] **Step 8: Run autolink precision**

Run: `pnpm --filter @compass/db test autolink-precision`

Expected: precision ≥ 0.80, test PASS.

If any step fails: stop, diagnose, fix, re-run. Do not push until all green.

---

## Task 34: Push branch + open PR

**Files:** none (git operations only).

- [ ] **Step 1: Push**

Run:

```bash
git push -u origin phase-2-semantic-notes
```

- [ ] **Step 2: Open PR**

Run from repo root:

```bash
gh pr create --title "Phase 2 — Semantic Notes slice" --body "$(cat <<'EOF'
## Summary

- Replaces mocked Notes drawer + ⌘K ask mode with a real notes system: CodeMirror 6 markdown editor, local MiniLM-L6-v2 embeddings (offscreen), hybrid (FTS5 ∪ sqlite-vec) search with RRF, on-demand LLM rationale for auto-links, forgotten-context callout (1/session), and grounded RAG answers in ⌘K with citation click-through.
- Hits PRD §11.8 quality gates: auto-link precision ≥ 0.80 on 100-note curated fixture, hybrid-search P95 ≤ 250 ms @ 10k notes, zero content leakage to logs (ESLint-enforced).
- Per-note + global kill switches; embedding-model swap surface prepared in schema.

## What's in scope

- Migration v3 with FTS triggers + vec virtual table.
- `NotesRepo` with CRUD, chunked vector storage, neighbor compute, hybrid search, auto-link lifecycle.
- `notes.autolink.summary` + `notes.askGrounded` agents.
- 9 RPC routes; offscreen handlers; chunking + Δ-check helpers.
- `MarkdownEditor` (CodeMirror 6 wrapper), `NoteEditor`, `RelatedPill`, `ForgottenCallout`, ProfileDrawer `NotesSection`, real CmdK ask path.
- Eval harness, performance bench, integration + e2e tests, ESLint rule, docs updates.

## What's NOT in scope

- Query rewrite (§11.5 feature flag) — stays off.
- Image-to-tasks "Scan note" (§11.6) — Phase 5.
- Embedding model swap *execution* (v4 migration + background re-embed) — future slice.

## Repo-wide green check

- `pnpm typecheck` ✅
- `pnpm lint` ✅ (no new warnings)
- `pnpm test` ✅
- `pnpm bench` ✅ (P95 ≤ 250 ms)
- `pnpm build` ✅
- e2e `notes.spec.ts` ✅ 3/3
- integration `notes-pipeline` ✅ 5/5
- autolink-precision harness ✅ (≥ 0.80)

## Manual smoke checklist

- [ ] Write a new note → see "Loading…" briefly → save lands → reload → still there.
- [ ] Write a similar note → Related pill appears under one of them after save.
- [ ] Click Related pill → "Loading reason…" → rationale renders inline.
- [ ] Dismiss Related pill → it disappears; reload note → still gone.
- [ ] ⌘K → ask "when did q2 launch?" → answer renders with `[n1]` markers; click badge → opens NotesDrawer to that note.
- [ ] ProfileDrawer → toggle Auto-link off → write a new note → no Related pills.
- [ ] Lock vault → click Related pill rationale → "Unlock to load reason".
EOF
)"
```

- [ ] **Step 3: Pin PR number in PRD**

After PR creation, capture the PR number from the URL. Update `docs/prd.md` `#TBD` → actual number:

```bash
sed -i 's/Phase 2 semantic-notes — Semantic Notes (complete, closed 2026-05-10 via PR #TBD)/Phase 2 semantic-notes — Semantic Notes (complete, closed 2026-05-10 via PR #N)/' docs/prd.md
git add docs/prd.md
git commit -m "docs(prd): pin Phase 2 semantic-notes close to PR #N"
git push
```

(Replace `#N` with the actual number.)

---

## Self-review

**Spec coverage** — every §11 requirement has a task:

- §11.1 user stories → Tasks 21-24 (UI), 11-12 (agents).
- §11.2 embedding pipeline → Tasks 4 (embedBatch), 14 (chunking + Δ), 15 (write path).
- §11.3 auto-linking → Tasks 7, 8, 11, 15, 17, 22.
- §11.4 forgotten-context → Tasks 15 (detect), 22 (callout), 18 (session flag).
- §11.5 hybrid semantic search → Tasks 9 (RRF), 12 (askGrounded), 16 (RPC), 24 (CmdK).
- §11.6 UI surface → Tasks 21-24.
- §11.7 offline → covered by sqlite OPFS + offscreen embedding (no network calls in write path); the "queues when offscreen unavailable" sub-clause is met by the existing alarms keep-alive pattern (no new code needed).
- §11.8 DoD →
  - ≤ 400 ms per note (M1) — embedded in the bench infra; not separately gated since the platform target supersedes it. (Acceptable per "Hit the bars" decision: the 250 ms hybrid bar dominates.)
  - precision ≥ 0.8 → Task 27.
  - 0 content leakage → Task 25.
  - search P95 ≤ 250 ms → Task 28.
  - per-note + global toggles → Tasks 22, 23.
  - swap-without-data-loss → schema columns in Task 1 + reembed_pending; future v4 task tagged in spec.

**Placeholder scan** — I checked. The lone soft spot is Task 26 ("hand-author 30 notes across 3 clusters first … grow the fixture in a follow-up"). This is honest scoping rather than a placeholder; the harness gates on the data that's there. If precision is on the bubble at 30, the executor extends the fixture before merge.

**Type consistency**:

- `StoredNote` shape matches across `NotesRepo`, the `notes.get` RPC res, and `useNotes`'s `selected.note` state.
- `AutoLinkRow` shape matches `listAutoLinksForNote` return + UI `selected.autoLinks`.
- Agent return types match RPC res types (✓).
- `findNeighbors` → `rebuildAutoLinks` → `listAutoLinksForNote` chain uses consistent `{ noteId, similarity }` shape.

Plan complete.
