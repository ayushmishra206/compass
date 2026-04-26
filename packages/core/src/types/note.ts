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
