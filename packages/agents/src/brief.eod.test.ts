import { describe, it, expect, vi } from 'vitest';
import { generateEodReflection, type EodReflectionDeps } from './brief.eod';
import type { UserProfile } from '@compass/core';

const fakeProfile: UserProfile = {
  id: 'u1',
  createdAt: '2026-05-01T00:00:00Z',
  timezone: 'America/New_York',
  locale: 'en-US',
  workHours: { start: '09:00', end: '17:00' },
  briefingHour: 8,
  reflectionHour: 18,
};

const fakeMorning = {
  dateLocal: '2026-05-10',
  kind: 'morning' as const,
  generatedAt: '2026-05-10T08:00:00Z',
  output: { tldr: 'Morning brief content' },
  openedAt: null,
  userRating: null,
  providerUsed: 'openrouter',
  costUsd: 0.0003,
};

const fakeEodOutput = {
  wins: ['Shipped PRD'],
  dropped: ['Replied to Mira'],
  patterns: ['Afternoon focus dips'],
  tomorrowOneThing: 'Eng review prep',
  journalPrompt: 'What conversation moved the day?',
};

const baseDeps = (): EodReflectionDeps => ({
  briefRepo: {
    getByDate: vi.fn(async () => fakeMorning),
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
      totalFocusMin: 75,
      peakHourLocal: 10,
      avgInterruptPerSession: 0,
      trend: 'flat' as const,
    })),
  },
  router: {
    executeTask: vi.fn(async () => ({
      parsed: fakeEodOutput,
      text: '',
      usage: { promptTok: 800, cachedTok: 600, completionTok: 150 },
      model: 'claude-sonnet-4-6',
      finishReason: 'stop' as const,
    })),
  } as never,
  costLedger: { recordRow: vi.fn(), monthlySpend: vi.fn() } as never,
  now: () => new Date('2026-05-10T18:00:00Z'),
  userProfile: fakeProfile,
});

describe('generateEodReflection', () => {
  it('returns the LLM output + cost + provider + model', async () => {
    const deps = baseDeps();
    const result = await generateEodReflection(deps);
    expect(result.output).toEqual(fakeEodOutput);
    expect(result.providerUsed).toBeTruthy();
    expect(result.model).toBe('claude-sonnet-4-6');
    expect(result.costUsd).toBeGreaterThanOrEqual(0);
  });

  it("reads today's morning brief from briefRepo", async () => {
    const deps = baseDeps();
    await generateEodReflection(deps);
    expect(deps.briefRepo.getByDate).toHaveBeenCalled();
    const args = (deps.briefRepo.getByDate as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(args?.[1]).toBe('morning');
  });

  it('throws when morning brief is missing', async () => {
    const deps = baseDeps();
    deps.briefRepo.getByDate = vi.fn(async () => null);
    await expect(generateEodReflection(deps)).rejects.toThrow(/no-morning-brief/);
  });

  it('writes a cost ledger row with feature="brief.eod"', async () => {
    const deps = baseDeps();
    await generateEodReflection(deps);
    expect(deps.costLedger.recordRow).toHaveBeenCalledTimes(1);
    const row = (deps.costLedger.recordRow as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(row).toMatchObject({
      feature: 'brief.eod',
      model: 'claude-sonnet-4-6',
    });
  });

  it('passes taskId="brief.eod" and trusted=true to router.executeTask', async () => {
    const deps = baseDeps();
    await generateEodReflection(deps);
    const call = (deps.router.executeTask as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(call.taskId).toBe('brief.eod');
    expect(call.trusted).toBe(true);
  });
});
