import { describe, it, expect, vi } from 'vitest';
import { generateMorningBrief, type MorningBriefDeps } from './brief.morning';
import type { UserProfile } from '@compass/core';

const fakeProfile: UserProfile = {
  id: 'u1',
  createdAt: '2026-05-01T00:00:00Z',
  timezone: 'America/New_York',
  locale: 'en-US',
  workHours: { start: '09:00', end: '17:00' },
  briefingHour: 8,
  reflectionHour: 18,
  autoLinkEnabled: true,
};

const fakeOutput = {
  oneLineMood: 'Calm.',
  tldr: 'Light schedule today.',
  topPriority: { title: 'Ship PRD', why: 'Deadline.', suggestedFocusMinutes: 90 },
  pomodoros: [],
  watchouts: [],
  recovery: { note: '', suggestBreak: false },
  quotedGoal: null,
};

const baseDeps = (): MorningBriefDeps => ({
  briefRepo: {
    getByDate: vi.fn(),
    upsert: vi.fn(),
    recordOpen: vi.fn(),
    recordRating: vi.fn(),
    recentOpenStatus: vi.fn(),
  } as never,
  pomodoroRepo: {
    start: vi.fn(),
    complete: vi.fn(),
    abandon: vi.fn(),
    summarize14d: vi.fn(async () => ({
      totalFocusMin: 0,
      peakHourLocal: null,
      avgInterruptPerSession: 0,
      trend: 'flat' as const,
    })),
  },
  weatherRpc: vi.fn(async () => ({ summary: 'Light drizzle', tempC: 14, precipitationPct: 30 })),
  router: {
    executeTask: vi.fn(async () => ({
      parsed: fakeOutput,
      text: '',
      usage: { promptTok: 1000, cachedTok: 800, completionTok: 200 },
      model: 'claude-sonnet-4-6',
      finishReason: 'stop' as const,
    })),
  } as never,
  costLedger: { recordRow: vi.fn(), monthlySpend: vi.fn() } as never,
  now: () => new Date('2026-05-10T08:00:00Z'),
  userProfile: fakeProfile,
});

describe('generateMorningBrief', () => {
  it('returns the LLM output + cost + provider + model', async () => {
    const deps = baseDeps();
    const result = await generateMorningBrief(deps);
    expect(result.output).toEqual(fakeOutput);
    expect(result.providerUsed).toBeTruthy();
    expect(result.model).toBe('claude-sonnet-4-6');
    expect(result.costUsd).toBeGreaterThanOrEqual(0);
  });

  it('writes a cost ledger row with the right feature tag', async () => {
    const deps = baseDeps();
    await generateMorningBrief(deps);
    expect(deps.costLedger.recordRow).toHaveBeenCalledTimes(1);
    const row = (deps.costLedger.recordRow as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(row).toMatchObject({
      feature: 'brief.morning',
      model: 'claude-sonnet-4-6',
      promptTok: 1000,
      cachedTok: 800,
      completionTok: 200,
    });
  });

  it('reads focusSummary14d via the pomodoro repo', async () => {
    const deps = baseDeps();
    await generateMorningBrief(deps);
    expect(deps.pomodoroRepo.summarize14d).toHaveBeenCalledTimes(1);
  });

  it('passes taskId="brief.morning" and trusted=true to router.executeTask', async () => {
    const deps = baseDeps();
    await generateMorningBrief(deps);
    const call = (deps.router.executeTask as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(call.taskId).toBe('brief.morning');
    expect(call.trusted).toBe(true);
  });

  it('continues with weather=null when weatherRpc throws', async () => {
    const deps = baseDeps();
    deps.weatherRpc = vi.fn(async () => {
      throw new Error('network');
    });
    const result = await generateMorningBrief(deps);
    expect(result.output).toEqual(fakeOutput);
  });
});
