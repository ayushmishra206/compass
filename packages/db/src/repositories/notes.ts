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

export interface ChunkInput {
  text: string;
  embedding: Float32Array;
}

export interface NeighborHit {
  noteId: string;
  similarity: number;
}

export interface AutoLinkRow {
  srcNoteId: string;
  targetNoteId: string;
  similarity: number;
  rationale: string | null;
  rationaleAt: string | null;
}

export interface HybridSearchHit {
  noteId: string;
  title: string;
  excerpt: string;
  score: number;
}

export interface NotesRepo {
  create(input: CreateNoteInput): Promise<string>;
  update(id: string, patch: UpdateNoteInput): Promise<void>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<StoredNote | null>;
  list(opts: { limit: number; offset: number }): Promise<StoredNote[]>;
  upsertChunks(noteId: string, chunks: ChunkInput[]): Promise<void>;
  findNeighbors(noteId: string, opts: { k: number; threshold: number }): Promise<NeighborHit[]>;
  hybridSearch(opts: {
    query: string;
    queryEmbedding: Float32Array;
    limit: number;
  }): Promise<HybridSearchHit[]>;
  rebuildAutoLinks(noteId: string, neighbors: NeighborHit[]): Promise<void>;
  listAutoLinksForNote(noteId: string): Promise<AutoLinkRow[]>;
  dismissAutoLink(noteIdA: string, noteIdB: string): Promise<void>;
  setAutoLinkRationale(noteIdA: string, noteIdB: string, rationale: string): Promise<void>;
  getAutoLinkRationale(noteIdA: string, noteIdB: string): Promise<string | null>;
}

const SELECT_COLS =
  'id, created_at, updated_at, title, body, tags_json, manual_links, embedding_model, autolink_enabled';

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

function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function f32ToBlob(v: Float32Array): Uint8Array {
  return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
}

function blobToF32(blob: Uint8Array | ArrayBuffer): Float32Array {
  const buf =
    blob instanceof Uint8Array
      ? blob.buffer.slice(blob.byteOffset, blob.byteOffset + blob.byteLength)
      : blob;
  return new Float32Array(buf);
}

function cosine(a: Float32Array, b: Float32Array): number {
  // Vectors are produced normalized by transformers.js (normalize: true);
  // cosine reduces to dot product. Guard against any drift with a fallback.
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += (a[i] as number) * (b[i] as number);
  return dot;
}

export function createNotesRepo(db: Db): NotesRepo {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- sqlite-wasm bind types are loose
  const exec = (sql: string, bind?: any[], returnRows = false) =>
    returnRows
      ? (db.exec({ sql, bind, returnValue: 'resultRows' }) as Array<Array<unknown>>)
      : (db.exec({ sql, bind }) as unknown);

  return {
    async create(input) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      exec(
        `INSERT INTO notes(id, created_at, updated_at, title, body, tags_json, manual_links, embedding_model)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          id,
          now,
          now,
          input.title,
          input.body,
          JSON.stringify(input.tags),
          '[]',
          input.embeddingModel,
        ],
      );
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
      exec(
        `UPDATE notes
         SET title=?, body=?, tags_json=?, autolink_enabled=?, updated_at=?
         WHERE id=?`,
        [
          next.title,
          next.body,
          JSON.stringify(next.tags),
          next.autolinkEnabled ? 1 : 0,
          next.updatedAt,
          id,
        ],
      );
    },

    async delete(id) {
      exec('DELETE FROM note_chunks WHERE note_id=?', [id]);
      exec('DELETE FROM auto_links WHERE src_note_id=? OR target_note_id=?', [id, id]);
      exec('DELETE FROM notes WHERE id=?', [id]);
    },

    async getById(id) {
      const rows = exec(`SELECT ${SELECT_COLS} FROM notes WHERE id=? LIMIT 1`, [id], true) as Array<
        Array<unknown>
      >;
      return rows[0] ? rowToNote(rows[0]) : null;
    },

    async list({ limit, offset }) {
      const rows = exec(
        `SELECT ${SELECT_COLS} FROM notes ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
        [limit, offset],
        true,
      ) as Array<Array<unknown>>;
      return rows.map(rowToNote);
    },

    async upsertChunks(noteId, chunks) {
      db.exec('BEGIN');
      try {
        exec('DELETE FROM note_chunks WHERE note_id=?', [noteId]);
        for (let i = 0; i < chunks.length; i++) {
          const c = chunks[i] as ChunkInput;
          exec(`INSERT INTO note_chunks(note_id, chunk_index, text, embedding) VALUES(?,?,?,?)`, [
            noteId,
            i,
            c.text,
            f32ToBlob(c.embedding),
          ]);
        }
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },

    async findNeighbors(noteId, { k, threshold }) {
      // Use the first chunk of the source note as the query vector.
      const qRows = exec(
        `SELECT embedding FROM note_chunks WHERE note_id=? AND chunk_index=0 LIMIT 1`,
        [noteId],
        true,
      ) as Array<[Uint8Array]>;
      if (qRows.length === 0) return [];
      const q = blobToF32((qRows[0] as [Uint8Array])[0]);

      // Pull every other note's chunks; aggregate by note_id keeping the max similarity.
      const rows = exec(
        `SELECT note_id, embedding FROM note_chunks WHERE note_id != ?`,
        [noteId],
        true,
      ) as Array<[string, Uint8Array]>;
      const bestByNote = new Map<string, number>();
      for (const [nid, blob] of rows) {
        const v = blobToF32(blob);
        const sim = cosine(q, v);
        const cur = bestByNote.get(nid);
        if (cur === undefined || sim > cur) bestByNote.set(nid, sim);
      }
      const out: NeighborHit[] = [];
      for (const [nid, sim] of bestByNote) {
        if (sim >= threshold) out.push({ noteId: nid, similarity: sim });
      }
      out.sort((a, b) => b.similarity - a.similarity);
      return out.slice(0, k);
    },

    async hybridSearch({ query, queryEmbedding, limit }) {
      // FTS5: per-word prefix-OR; preserves recall on partial matches.
      const ftsQuery = query
        .split(/\s+/)
        .filter((w) => w.length > 0)
        .map((w) => `"${w.replace(/"/g, '""')}"*`)
        .join(' OR ');

      let ftsRows: Array<[string, number]> = [];
      if (ftsQuery) {
        try {
          ftsRows = exec(
            `SELECT note_id, rank FROM notes_fts WHERE notes_fts MATCH ? ORDER BY rank LIMIT 20`,
            [ftsQuery],
            true,
          ) as Array<[string, number]>;
        } catch {
          // Tokenizer rejects some queries (e.g., empty after stripping); fall back to no FTS hits.
          ftsRows = [];
        }
      }

      // Vec hits via JS cosine over all chunks; aggregate per-note with max similarity, top-20.
      const allChunks = exec(`SELECT note_id, embedding FROM note_chunks`, [], true) as Array<
        [string, Uint8Array]
      >;
      const bestByNote = new Map<string, number>();
      for (const [nid, blob] of allChunks) {
        const v = blobToF32(blob);
        const sim = cosine(queryEmbedding, v);
        const cur = bestByNote.get(nid);
        if (cur === undefined || sim > cur) bestByNote.set(nid, sim);
      }
      const vecRows: Array<[string, number]> = [...bestByNote.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);

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

      const placeholders = ranked.map(() => '?').join(',');
      const hydration = exec(
        `SELECT id, title, substr(body, 1, 160) FROM notes WHERE id IN (${placeholders})`,
        ranked.map(([id]) => id),
        true,
      ) as Array<[string, string, string]>;
      const byId = new Map(hydration.map(([id, t, e]) => [id, { title: t, excerpt: e }]));

      return ranked.map(([id, score]) => ({
        noteId: id,
        title: byId.get(id)?.title ?? '',
        excerpt: byId.get(id)?.excerpt ?? '',
        score,
      }));
    },

    async rebuildAutoLinks(noteId, neighbors) {
      db.exec('BEGIN');
      try {
        exec('DELETE FROM auto_links WHERE src_note_id=? OR target_note_id=?', [noteId, noteId]);
        const now = new Date().toISOString();
        for (const n of neighbors) {
          if (n.noteId === noteId) continue;
          const [src, tgt] = orderPair(noteId, n.noteId);
          exec(
            `INSERT INTO auto_links(src_note_id, target_note_id, similarity, detected_at)
             VALUES(?,?,?,?)`,
            [src, tgt, n.similarity, now],
          );
        }
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },

    async listAutoLinksForNote(noteId) {
      const rows = exec(
        `SELECT src_note_id, target_note_id, similarity, rationale, rationale_at
         FROM auto_links
         WHERE (src_note_id=? OR target_note_id=?) AND dismissed=0
         ORDER BY similarity DESC`,
        [noteId, noteId],
        true,
      ) as Array<[string, string, number, string | null, string | null]>;
      return rows.map(([src, tgt, sim, rat, ratAt]) => ({
        srcNoteId: noteId,
        targetNoteId: src === noteId ? tgt : src,
        similarity: sim,
        rationale: rat,
        rationaleAt: ratAt,
      }));
    },

    async dismissAutoLink(a, b) {
      const [src, tgt] = orderPair(a, b);
      exec('UPDATE auto_links SET dismissed=1 WHERE src_note_id=? AND target_note_id=?', [
        src,
        tgt,
      ]);
    },

    async setAutoLinkRationale(a, b, rationale) {
      const [src, tgt] = orderPair(a, b);
      exec(
        `UPDATE auto_links SET rationale=?, rationale_at=? WHERE src_note_id=? AND target_note_id=?`,
        [rationale, new Date().toISOString(), src, tgt],
      );
    },

    async getAutoLinkRationale(a, b) {
      const [src, tgt] = orderPair(a, b);
      const rows = exec(
        `SELECT rationale FROM auto_links WHERE src_note_id=? AND target_note_id=? LIMIT 1`,
        [src, tgt],
        true,
      ) as Array<[string | null]>;
      return rows[0]?.[0] ?? null;
    },
  };
}
