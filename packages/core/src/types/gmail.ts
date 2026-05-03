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
