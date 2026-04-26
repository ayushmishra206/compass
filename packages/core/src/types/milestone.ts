import { z } from 'zod';

export const MilestoneSchema = z.object({
  id: z.string(),
  title: z.string(),
  targetDate: z.string(),
  weekIndex: z.number().int(),
  definitionOfDone: z.string(),
  linkedTaskIds: z.array(z.string()),
});
export type Milestone = z.infer<typeof MilestoneSchema>;
