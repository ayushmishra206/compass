import { z } from 'zod';

export const ExtractedActionSchema = z.object({
  title: z.string(),
  owner: z.enum(['me', 'other', 'ambiguous']),
  dueDate: z.string().nullable().optional(),
  commitmentType: z.enum(['reply', 'task', 'meeting', 'fyi']),
  sourceSpan: z.object({
    start: z.number().int(),
    end: z.number().int(),
  }),
  confidence: z.number(),
});
export type ExtractedAction = z.infer<typeof ExtractedActionSchema>;

export const GmailActionExtractSchema = z.object({
  id: z.string(),
  messageId: z.string(),
  extractedAt: z.string(),
  modelId: z.string(),
  priority: z.enum(['p1', 'p2', 'p3', 'p4']),
  actions: z.array(ExtractedActionSchema),
  draftedReplyId: z.string().optional(),
  userFeedback: z.enum(['accepted', 'edited', 'rejected']).optional(),
});
export type GmailActionExtract = z.infer<typeof GmailActionExtractSchema>;

/**
 * Structured output of `gmail.extract` (PRD §12.3).
 *
 * Constrained deliberately tightly. Every field the model can emit is a value
 * the UI renders as data — there is no free-text field that flows onward into
 * another prompt, and no field that names an action to take.
 */
export const ExtractedActionOutputSchema = z.object({
  title: z.string().max(120),
  owner: z.enum(['me', 'other', 'ambiguous']),
  dueDate: z.string().max(40).nullable().optional(),
  commitmentType: z.enum(['reply', 'task', 'meeting', 'fyi']),
  confidence: z.number().min(0).max(1),
});
export type ExtractedActionOutput = z.infer<typeof ExtractedActionOutputSchema>;

export const GmailExtractionOutputSchema = z.object({
  priority: z.enum(['p1', 'p2', 'p3', 'p4']),
  actions: z.array(ExtractedActionOutputSchema).max(5),
  /** One short reason for the priority. Rendered, never re-prompted. */
  rationale: z.string().max(160),
});
export type GmailExtractionOutput = z.infer<typeof GmailExtractionOutputSchema>;
