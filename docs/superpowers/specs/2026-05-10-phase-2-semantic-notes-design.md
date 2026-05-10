# Phase 2 Semantic Notes — Design Spec

**Date:** 2026-05-10
**Branch:** `phase-2-semantic-notes`
**Closes:** PRD §11 in full; PRD §18.4 ⌘K ask mode real path.

## 1. Goal

Replace the mocked Notes drawer + ⌘K ask mode with a real notes system: markdown editor with debounced save, local embeddings (MiniLM-L6-v2, 384 dims), auto-linking with on-demand rationale, forgotten-context surfacing, hybrid (FTS5 + sqlite-vec) semantic search, and grounded RAG answers in ⌘K with clickable citations.

## 2. Scope

**In scope (full §11 end-to-end):**

- Notes CRUD with CodeMirror 6 markdown editor.
- Local embedding pipeline (offscreen) over per-chunk text.
- Auto-linking: at-save neighbor compute (local), on-demand LLM rationale (lazy).
- Forgotten-context callout — one per session, when neighbor `updatedAt > 45 days` AND similarity > 0.82.
- Hybrid semantic search: FTS5 ∪ sqlite-vec, reciprocal-rank fusion.
- ⌘K `notes.askGrounded` — hybrid retrieve → grounded answer LLM → answer + citation badges.
- §11.8 quality gates **hit before merge**: auto-link precision ≥ 0.8 on a 100-note curated fixture; semantic search P95 ≤ 250 ms at 10k notes; 0 content leakage to logs (CI-enforced).
- Per-note + global auto-link kill switches.
- Embedding model swap _surface_ (schema columns); execution deferred.

**Out of scope:**

- Query rewrite (§11.5) — feature-flagged off in this slice.
- Image-to-tasks "Scan note" action (§11.6) — Phase 5.
- Embedding model swap migration v4 + background re-embed job — future slice.
- Notes export/import, cross-device sync, real-time collaboration.

## 3. Architecture (option A — repo-layer split)

Extends existing packages along established seams:

| Package                           | Surface                                                                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/db`                     | Migration v3, `NotesRepo`, `notes` / `note_chunks` / `notes_fts` / `notes_vec` / `auto_links` tables                                       |
| `packages/embeddings`             | Existing `embed()`; add `embedBatch()`                                                                                                     |
| `packages/agents`                 | New `notes.autolink.summary`, `notes.askGrounded` agents                                                                                   |
| `packages/core/src/types/note.ts` | Extends with `NoteChunk`, `AutoLinkRow`, `HybridSearchHit` schemas                                                                         |
| `packages/runtime/src/routes.ts`  | Adds 9 RPC routes (see §6)                                                                                                                 |
| `apps/extension`                  | Offscreen handlers, `NotesDrawer` rewrite (CM6 editor), `notesStore` slice, `useNotes` hook, `CmdK` ask path, `ProfileDrawer/NotesSection` |

No new packages introduced; pattern mirrors the Phase 2 daily-agent slice exactly.

## 4. Schema (migration v3)

```sql
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
```

**Notes:**

- `notes_vec.rowid` ties to `note_chunks.id`; insert/delete in same transaction.
- `embedding_model` per-note + `reembed_pending` flag prepares for the future model swap migration.
- `auto_links` symmetric storage (`src < target` constraint) halves rows; readers `WHERE src=? OR target=?`.
- `tags_json` and `manual_links` are JSON-encoded TEXT (no native array type).

## 5. Pipelines

### 5.1 Write path (debounced 5 s)

```
useNotes.save(note)
  ↓ rpc('notes.update', { id, title, body, tags })
  ↓ offscreen handler
1. Δ check: if (Δbody < 50 chars && headings unchanged) → write notes row only, skip embed.
2. Else:
   a. DELETE FROM note_chunks WHERE note_id=? (cascades notes_vec)
   b. chunks = chunk(title, body)              // §11.2
   c. embeddings = embedBatch(chunks)
   d. INSERT note_chunks rows; INSERT notes_vec rows (one transaction)
   e. Rebuild auto_links for this note:
        neighbors = NotesRepo.findNeighbors(noteId, k=5, threshold)
        DELETE existing auto_links pairs touching this note
        INSERT new pairs (rationale=NULL)
3. Forgotten-context check: among neighbors, any with updatedAt > 45 days ago AND sim > 0.82?
   If yes AND no callout this session → response includes { forgotten: { noteId, sim } }.
```

If `autolink_enabled = 0` (per-note) or global toggle off: steps 2.e and 3 are skipped.

### 5.2 Auto-link rationale (on-demand)

```
User clicks Related pill
  ↓ rpc('notes.autolink.rationale', { srcId, targetId })
  ↓ offscreen
1. If auto_links.rationale IS NOT NULL → return cached value.
2. Else: agent('notes.autolink.summary', { srcNote, targetNote }) → 1-sentence rationale.
3. UPDATE auto_links SET rationale=?, rationale_at=NOW().
4. Cost ledger row: feature='notes.autolink'.
5. Return { rationale }.
```

Locked credentials → `{ rationale: null, reason: 'locked' }`; UI shows "Unlock to load reason".

### 5.3 Hybrid search

```
rpc('notes.search', { query, limit=20 })
  ↓ offscreen
1. queryEmbedding = embed(query)
2. ftsHits = SELECT note_id, rank FROM notes_fts WHERE notes_fts MATCH ? LIMIT 20
3. vecHits = SELECT note_chunks.note_id, distance FROM notes_vec
              LEFT JOIN note_chunks ON note_chunks.id = notes_vec.rowid
              WHERE notes_vec.embedding MATCH ? AND k = 20
4. Reciprocal-rank fusion (k=60); dedupe by note_id; return top-`limit`.
```

### 5.4 Ask grounded

```
rpc('notes.askGrounded', { query })
  ↓ offscreen
1. hits = notes.search(query) → top 5
2. context = render hits as <note id="n1">title\nexcerpt</note> blocks
3. result = agent('notes.askGrounded', { query, context })
   → { answer, citations: ['n1', 'n3', ...] }
4. Cost ledger: feature='notes.ask'.
5. Return { answer, citations: [{ id: 'n1', noteId, title }, ...] }
```

Empty corpus → `{ answer: null, citations: [], reason: 'no-notes' }`.

## 6. RPC routes

Added to `packages/runtime/src/routes.ts`:

| Route                      | Req                                              | Res                                                        |
| -------------------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| `notes.create`             | `{ title, body, tags }`                          | `{ id }`                                                   |
| `notes.update`             | `{ id, title?, body?, tags?, autolinkEnabled? }` | `{ ok: true, embeddingPending?: true, forgotten?: {...} }` |
| `notes.delete`             | `{ id }`                                         | `{ ok: true }`                                             |
| `notes.list`               | `{ limit?, offset? }`                            | `{ notes: NoteSummary[] }`                                 |
| `notes.get`                | `{ id }`                                         | `{ note: Note, autoLinks: AutoLinkRow[] }`                 |
| `notes.search`             | `{ query, limit? }`                              | `{ hits: HybridSearchHit[] }`                              |
| `notes.askGrounded`        | `{ query }`                                      | `{ answer, citations } \| { answer: null, reason }`        |
| `notes.autolink.rationale` | `{ srcId, targetId }`                            | `{ rationale } \| { rationale: null, reason: 'locked' }`   |
| `notes.autolink.dismiss`   | `{ srcId, targetId }`                            | `{ ok: true }`                                             |

## 7. UI

### 7.1 NotesDrawer

Two view modes:

- **List**: search input (debounced 200 ms) on top, "+ New note" button, rows sorted by `updated_at DESC`. Each row: title, last-updated, tag chips, 2-line excerpt.
- **Editor**: back button, title input, CodeMirror 6 markdown body (`@codemirror/lang-markdown` + token-palette theme), tag chips (editable), Related pills row, Forgotten-context callout, per-note auto-link toggle.

CodeMirror 6 `EditorView.updateListener` triggers `useNotes.save` debounced 5 s after `update.docChanged`.

### 7.2 Related pills

`Related: {targetTitle}` chevron-toggleable. Initial render reads `auto_links.rationale` (NULL = lazy). Click expands; if rationale NULL, fires `rpc('notes.autolink.rationale')` with inline spinner. Italic rationale text shown below. Dismiss `×` → `rpc('notes.autolink.dismiss')`.

### 7.3 Forgotten-context callout

Renders above editor when `notes.update` response includes `forgotten`. One-line: _"You wrote about this 4 months ago — revisit?"_ with link. Sets `chrome.storage.session['notes.forgotten.shownThisSession']=true` so subsequent updates in the same session don't surface another.

### 7.4 ProfileDrawer NotesSection

Sibling of `DailyTimesSection`. Single toggle: "Auto-link new notes". Stored in `profile.user.v1.autoLinkEnabled` (extends `UserProfile`). Default `true`.

### 7.5 ⌘K ask mode

Replaces mocked answer with `rpc('notes.askGrounded', { query })`. Renders inline answer with `[n1]`, `[n3]` markers preserved; below the answer, citation badges (`n1: title →` etc.). Click closes ⌘K and opens NotesDrawer with `selectedNoteId` set to cited note. Empty-corpus / locked states show appropriate empty UI.

## 8. Quality gates (§11.8)

### 8.1 Auto-link precision ≥ 0.8 on 100-note fixture

`tests/prompt-eval/notes.autolink.fixture.json`: 100 notes + ~300 ground-truth labeled pairs (related vs. not). Harness at `packages/db/tests/eval/autolink-precision.test.ts`:

1. In-memory sqlite, run migrations through v3.
2. Embed all 100 notes (real MiniLM).
3. For each ground-truth pair, query `findNeighbors(srcId, k=5, threshold)`.
4. **Precision** = TP / (TP + FP) across all predicted pairs.
5. CI fails if precision < 0.80.

If 0.78 yields <0.8 precision: sweep [0.74, 0.76, 0.78, 0.80, 0.82] and pick the lowest threshold meeting precision while recall ≥ 0.5. Tuned constant lands in `NotesRepo`.

### 8.2 Semantic search P95 ≤ 250 ms at 10k notes

`tests/perf/hybrid-search.bench.ts`:

1. Synthetic 10k-note corpus, deterministic seed (regenerated in CI; not checked in).
2. 50 query workload (mixed FTS-strong / vec-strong / hybrid).
3. End-to-end `notes.search()` latency including query embed.
4. CI fails if `p95 > 250` ms.

Fallback if missed: switch to per-note pooled vector first-pass shortlist, then chunk re-rank top-50.

### 8.3 0 content leakage to logs

- New `eslint.config.js` rule `no-note-content-in-logs`: AST check rejecting `console.{log,warn,error}` calls referencing `.body`, `.title`, `.text`, `.context`, `.answer`, `.rationale`, or `.query` member access in the notes pipeline.
- `safeLog(meta)` helper in offscreen strips known content fields; review enforces use.

### 8.4 User kill switches

- Per-note: editor header toggle → `notes.autolink_enabled` column.
- Global: ProfileDrawer NotesSection → `profile.user.v1.autoLinkEnabled`.
- When either is off, the offscreen save path skips neighbor compute.

### 8.5 Model swap surface

`notes.embedding_model` per-row + `notes.reembed_pending` flag in v3. Future v4 migration sets `reembed_pending=1` on stale-model rows; offscreen background job processes them. Tested via v3→v4 dry-run unit test in this slice.

## 9. Testing

### 9.1 Unit

- `NotesRepo` CRUD round-trip, chunk cascade delete, `findNeighbors`, `hybridSearch` RRF correctness, auto-link upsert + dismiss + symmetric constraint.
- Migration v3 idempotent + virtual tables exist.
- `notes.autolink.summary` returns ≤1-sentence rationale; locked path returns `null` + reason.
- `notes.askGrounded` returns answer + citations; empty-corpus path returns `null` + reason.
- `embedBatch` dim=384, normalized, batches of 1/5/50.

### 9.2 Component (vitest + RTL)

- `NotesDrawer.test.tsx` — list/editor mode swap, search debounce, save fires after 5 s, related pill expand fires rationale rpc, dismiss removes pill, forgotten-context one-shot, per-note toggle.
- `CmdK.test.tsx` extended — ask mode swap, citation render, click-through, empty + locked states.
- `notesStore.test.ts`, `useNotes.test.ts`, `NotesSection.test.tsx`.

### 9.3 Integration

`tests/integration/notes-pipeline.test.ts` — 7 scenarios: save→neighbor→rationale lazy fetch; hybrid search RRF order; askGrounded returns answer + citations; forgotten-context one-shot; per-note toggle; global toggle; cascade delete.

### 9.4 Bench

`tests/perf/hybrid-search.bench.ts` — 10k-note P95 (§8.2). Required green in CI.

### 9.5 Eval

`tests/prompt-eval/notes.autolink.yaml` — references the fixture; 100-note precision (§8.1). Required green in CI.

### 9.6 E2E (Playwright, env-key gated)

`apps/extension/tests/e2e/notes.spec.ts` — 3 tests: write a note + related pill expands rationale; ⌘K ask returns answer + citation click-through opens correct note; global auto-link toggle disables pill creation.

### 9.7 Repo-wide green check before PR

`pnpm typecheck && pnpm lint && pnpm test && pnpm bench && pnpm build`. All green.

## 10. Docs updates

- `docs/architecture.md` — new "Semantic Notes" subsection after Daily Agent. Documents pipeline, schema, hybrid search, embedding model swap surface.
- `docs/prd.md` §21 — flip the `Phase 2 semantic-notes` row from "(deferred)" to closed-with-PR-number.

## 11. Risks

| Risk                            | Mitigation                                                              |
| ------------------------------- | ----------------------------------------------------------------------- |
| Bundle weight from CodeMirror 6 | Modular imports; track newtab chunk delta in build output (cap +80 KB). |
| Auto-link precision miss        | Threshold sweep (§8.1) + per-note pooled-vector fallback.               |
| Hybrid search P95 miss          | Per-note pooled vector first-pass + chunk re-rank top-50.               |
| Rationale latency on click      | Spinner + abort > 10 s → "Reason unavailable".                          |
| FTS tokenizer locale            | Ships English-first; localization is Phase 5.                           |

## 12. Out of scope (deferred)

- Query rewrite (§11.5).
- Image-to-tasks "Scan note" (§11.6) — Phase 5.
- Embedding model swap _execution_ (v4 migration + background job).
- Notes export/import, real-time sync — §22 explicitly out.
