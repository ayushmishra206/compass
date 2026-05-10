import type { BriefRepo, PomodoroRepo, CostLedgerRepo } from '@compass/db';
import type { UserProfile } from '@compass/core';
import { BriefingOutputSchema } from '@compass/core';

export interface LlmRouter {
  executeTask(req: {
    taskId: string;
    schema?: unknown;
    system: string;
    messages: Array<{ role: 'user'; content: string }>;
    trusted: boolean;
  }): Promise<{
    parsed: unknown;
    text: string;
    usage: { promptTok: number; cachedTok: number; completionTok: number };
    model: string;
    finishReason: string;
  }>;
}

export interface MorningBriefDeps {
  briefRepo: BriefRepo;
  pomodoroRepo: PomodoroRepo;
  weatherRpc: () => Promise<{ summary: string; tempC: number; precipitationPct: number } | null>;
  router: LlmRouter;
  costLedger: CostLedgerRepo;
  now: () => Date;
  userProfile: UserProfile;
}

export interface MorningBriefResult {
  output: unknown;
  costUsd: number;
  providerUsed: string;
  model: string;
}

const SYSTEM_TEMPLATE = `You are Compass, a calm morning briefing for one user. Generate a concise day-ahead briefing in JSON matching the schema provided.

Voice: warm, succinct, never lecturing. Two-to-three-sentence TLDR. No false certainty. If a field has no real data, return an empty array or null — do NOT invent meetings, tasks, or goals.

Inputs you receive include the user's local time, weather, and a 14-day focus summary. Calendar, tasks, and goals will arrive in later phases — for those, leave arrays empty.

If avgInterruptPerSession is 0 and totalFocusMin is non-zero, do not infer "flawless focus" — the metric is not yet captured.

Write in {{locale}}. Today is {{dateLocal}} ({{dayOfWeek}}). Local time is {{nowHHMM}}.`;

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

function approxCostUsd(usage: { promptTok: number; completionTok: number }): number {
  // Coarse estimate; refine in Phase 4.
  const inputCostPer1M = 3;
  const outputCostPer1M = 15;
  return (usage.promptTok * inputCostPer1M + usage.completionTok * outputCostPer1M) / 1_000_000;
}

export async function generateMorningBrief(deps: MorningBriefDeps): Promise<MorningBriefResult> {
  const now = deps.now();
  const focus = await deps.pomodoroRepo.summarize14d(now);
  const weather = await deps.weatherRpc().catch(() => null);

  const dateLocal = now.toLocaleDateString('sv-SE', { timeZone: deps.userProfile.timezone });
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
    events: [],
    overdueTasks: [],
    focusSummary14d: focus,
    fitbit: null,
    weather,
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
    taskId: 'brief.morning',
    schema: BriefingOutputSchema,
    system,
    messages: [{ role: 'user', content: userMessage }],
    trusted: true,
  });

  const costUsd = approxCostUsd(res.usage);

  await deps.costLedger.recordRow({
    id: crypto.randomUUID(),
    ts: now.toISOString(),
    feature: 'brief.morning',
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
