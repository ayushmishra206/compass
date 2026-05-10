import { z } from 'zod';

export const AutoLinkSchema = z.object({
  targetNoteId: z.string(),
  similarity: z.number(),
  detectedAt: z.string(),
  surfaced: z.boolean(),
  userFeedback: z.enum(['accepted', 'rejected']).nullable().optional(),
});
export type AutoLink = z.infer<typeof AutoLinkSchema>;

export const NoteSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  title: z.string(),
  body: z.string(),
  manualLinks: z.array(z.string()),
  autoLinks: z.array(AutoLinkSchema),
  tags: z.array(z.string()),
  embedding: z.any().optional(), // Float32Array not directly serializable in Zod
  embeddingModel: z.string(),
});
export type Note = z.infer<typeof NoteSchema>;

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
