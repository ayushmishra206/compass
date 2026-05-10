import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { runMigrations } from '../../packages/db/src/migration-runner';
import { createNotesRepo, type NotesRepo } from '../../packages/db/src/repositories/notes';

export const DIM = 384;
export const QUERIES = [
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

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pseudoEmbedding(seed: number): Float32Array {
  const rng = seededRand(seed);
  const v = new Float32Array(DIM);
  let norm = 0;
  for (let i = 0; i < DIM; i++) {
    v[i] = rng() * 2 - 1;
    norm += v[i]! * v[i]!;
  }
  norm = Math.sqrt(norm);
  for (let i = 0; i < DIM; i++) v[i]! /= norm;
  return v;
}

export async function buildCorpus(size: number): Promise<NotesRepo> {
  const sqlite3 = await sqlite3InitModule();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = new sqlite3.oo1.DB(':memory:', 'c') as any;
  await runMigrations(db);
  const r = createNotesRepo(db);

  for (let i = 0; i < size; i++) {
    const t = QUERIES[i % QUERIES.length]!;
    const id = await r.create({
      title: `${t} #${i}`,
      body: `${t} body — line ${i}. context content for note ${i}.`,
      tags: [],
      embeddingModel: 'minilm-l6-v2',
    });
    const text = `${t} #${i}\n${t} body — line ${i}.`;
    await r.upsertChunks(id, [{ text, embedding: pseudoEmbedding(i + 1) }]);
  }
  return r;
}
