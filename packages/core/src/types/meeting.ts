import { z } from 'zod';

export const AttendeeBriefSchema = z.object({
  email: z.string().optional(),
  name: z.string().optional(),
  recentContext: z.string().optional(),
});
export type AttendeeBrief = z.infer<typeof AttendeeBriefSchema>;

export const MeetingPrepSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  generatedAt: z.string(),
  attendeesContext: z.array(AttendeeBriefSchema),
  relevantNoteIds: z.array(z.string()),
  relevantEmailIds: z.array(z.string()),
  pastMeetingIds: z.array(z.string()),
  agendaDraft: z.string().optional(),
});
export type MeetingPrep = z.infer<typeof MeetingPrepSchema>;
