import type { BriefRepo, PomodoroRepo, CostLedgerRepo } from '@compass/db';
import type { UserProfile } from '@compass/core';
import { EodReflectionSchema } from '@compass/core';
import type { LlmRouter } from './brief.morning';

export interface EodReflectionDeps {
  briefRepo: BriefRepo;
  pomodoroRepo: PomodoroRepo;
  router: LlmRouter;
  costLedger: CostLedgerRepo;
  now: () => Date;
  userProfile: UserProfile;
}

export interface EodReflectionResult {
  output: unknown;
  costUsd: number;
  providerUsed: string;
  model: string;
}

const SYSTEM_TEMPLATE = `You are Compass, a calm end-of-day reflection for one user. Generate a concise reflection in JSON matching the EodReflectionSchema.

Voice: warm, gentle, non-judgmental. No moralizing. Reflect on what actually happened today — what completed, what slipped, any pattern worth noting. End with a single concrete commitment for tomorrow and a short journal prompt the user can riff on.

Inputs include today's morning brief (what the user planned for) and today's completed Pomodoros (what actually happened). Calendar events and goal progress arrive in later phases — leave related fields empty when absent.

Write in {{locale}}. Today is {{dateLocal}} ({{dayOfWeek}}). Local time is {{nowHHMM}}.`;

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

function approxCostUsd(usage: { promptTok: number; completionTok: number }): number {
  const inputCostPer1M = 3;
  const outputCostPer1M = 15;
  return (usage.promptTok * inputCostPer1M + usage.completionTok * outputCostPer1M) / 1_000_000;
}

export async function generateEodReflection(deps: EodReflectionDeps): Promise<EodReflectionResult> {
  const now = deps.now();
  const dateLocal = now.toLocaleDateString('sv-SE', { timeZone: deps.userProfile.timezone });

  const morning = await deps.briefRepo.getByDate(dateLocal, 'morning');
  if (!morning) {
    throw new Error(
      "no-morning-brief: cannot generate EOD reflection without today's morning brief",
    );
  }

  const focus = await deps.pomodoroRepo.summarize14d(now);

  const dayOfWeek = now.toLocaleDateString(deps.userProfile.locale, {
    weekday: 'long',
    timeZone: deps.userProfile.timezone,
  });
  const nowHHMM = now.toLocaleTimeString(deps.userProfile.locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: deps.userProfile.timezone,
  });

  const snapshot = {
    now: now.toISOString(),
    timezone: deps.userProfile.timezone,
    user: {},
    morningBrief: morning.output,
    completedToday: focus,
    events: [],
    activeGoals: [],
  };

  const system = interpolate(SYSTEM_TEMPLATE, {
    locale: deps.userProfile.locale,
    dateLocal,
    dayOfWeek,
    nowHHMM,
  });

  const userMessage = `Snapshot:\n${JSON.stringify(snapshot, null, 2)}`;

  const res = await deps.router.executeTask({
    taskId: 'brief.eod',
    schema: EodReflectionSchema,
    system,
    messages: [{ role: 'user', content: userMessage }],
    trusted: true,
  });

  const costUsd = approxCostUsd(res.usage);

  await deps.costLedger.recordRow({
    id: crypto.randomUUID(),
    ts: now.toISOString(),
    feature: 'brief.eod',
    provider: 'openrouter',
    model: res.model,
    promptTok: res.usage.promptTok,
    cachedTok: res.usage.cachedTok,
    completionTok: res.usage.completionTok,
    usdEstimated: costUsd,
  });

  return {
    output: res.parsed,
    costUsd,
    providerUsed: 'openrouter',
    model: res.model,
  };
}
