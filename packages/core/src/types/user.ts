import { z } from 'zod';

export const FeatureFlagSchema = z.enum([
  'daily_agent',
  'eod_reflection',
  'personalization',
  'semantic_notes',
  'smart_blocker',
  'gmail_ai',
  'meeting_prep',
  'goals',
  'voice',
  'vision_gen',
  'image_to_tasks',
]);
export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;

export const UserProfileSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  compassLicense: z.string().optional(),
  timezone: z.string(),
  locale: z.string(),
  workHours: z.object({
    start: z.string(),
    end: z.string(),
  }),
  briefingHour: z.number().int(),
  reflectionHour: z.number().int(),
  autoLinkEnabled: z.boolean().default(true),
  /**
   * Google OAuth client ID for calendar sync. Per-install, and public by OAuth
   * design (it travels in the authorize URL), so it lives in the profile
   * rather than the encrypted credential store — the offscreen document needs
   * it to refresh tokens without prompting for a passphrase.
   */
  calendarClientId: z.string().optional(),
  featureFlags: z.record(z.string(), z.boolean()).optional(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;
