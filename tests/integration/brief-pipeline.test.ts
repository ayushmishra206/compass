import { describe, it, expect, beforeEach, vi } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import {
  runMigrations,
  createBriefRepo,
  createPomodoroRepo,
  createCostLedgerRepo,
  type BriefRepo,
  type PomodoroRepo,
  type CostLedgerRepo,
  type Db,
  type StoredBriefing,
} from '@compass/db';
import { generateMorningBrief, generateEodReflection, type LlmRouter } from '@compass/agents';
import type { UserProfile } from '@compass/core';

let db: Db;
let briefRepo: BriefRepo;
let pomodoroRepo: PomodoroRepo;
let costLedger: CostLedgerRepo;

const fakeProfile: UserProfile = {
  id: 'u1',
  createdAt: '2026-05-01T00:00:00Z',
  timezone: 'America/New_York',
  locale: 'en-US',
  workHours: { start: '09:00', end: '17:00' },
  briefingHour: 8,
  reflectionHour: 18,
};

const stubRouter: LlmRouter = {
  executeTask: vi.fn(async (req) => ({
    parsed:
      req.taskId === 'brief.morning'
        ? {
            oneLineMood: 'Calm.',
            tldr: 'Light schedule today.',
            topPriority: { title: 'Ship PRD', why: 'Deadline.', suggestedFocusMinutes: 90 },
            pomodoros: [],
            watchouts: [],
            recovery: { note: '', suggestBreak: false },
            quotedGoal: null,
          }
        : {
            wins: ['Shipped PRD'],
            dropped: [],
            patterns: [],
            tomorrowOneThing: 'Eng review prep',
            journalPrompt: 'What moved the day?',
          },
    text: '',
    usage: { promptTok: 1000, cachedTok: 800, completionTok: 200 },
    model: 'claude-sonnet-4-6',
    finishReason: 'stop',
  })),
};

beforeEach(async () => {
  const sqlite3 = await sqlite3InitModule();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db = new sqlite3.oo1.DB(':memory:') as any;
  await runMigrations(db);
  briefRepo = createBriefRepo(db);
  pomodoroRepo = createPomodoroRepo(db);
  costLedger = createCostLedgerRepo(db);
  vi.clearAllMocks();
});

const baseDeps = () => ({
  briefRepo,
  pomodoroRepo,
  weatherRpc: async () => null,
  router: stubRouter,
  costLedger,
  now: () => new Date('2026-05-10T08:00:00Z'),
  userProfile: fakeProfile,
});

describe('brief-pipeline integration', () => {
  it('cold start: agent generates brief, upsert stores it, getByDate returns it', async () => {
    const result = await generateMorningBrief(baseDeps());
    const stored: StoredBriefing = {
      dateLocal: '2026-05-10',
      kind: 'morning',
      generatedAt: '2026-05-10T08:00:00Z',
      output: result.output,
      openedAt: null,
      userRating: null,
      providerUsed: result.providerUsed,
      costUsd: result.costUsd,
    };
    await briefRepo.upsert(stored);
    const fetched = await briefRepo.getByDate('2026-05-10', 'morning');
    expect(fetched?.dateLocal).toBe('2026-05-10');
    expect(fetched?.kind).toBe('morning');
  });

  it('writes a row to llm_cost_ledger', async () => {
    await generateMorningBrief(baseDeps());
    const spend = await costLedger.monthlySpend('2026-05-01T00:00:00Z');
    expect(spend.calls).toBe(1);
    expect(spend.usd).toBeGreaterThan(0);
  });

  it('manual regenerate overwrites prior row via upsert', async () => {
    const r1 = await generateMorningBrief(baseDeps());
    await briefRepo.upsert({
      dateLocal: '2026-05-10',
      kind: 'morning',
      generatedAt: '2026-05-10T08:00:00Z',
      output: r1.output,
      openedAt: null,
      userRating: null,
      providerUsed: r1.providerUsed,
      costUsd: r1.costUsd,
    });

    const r2 = await generateMorningBrief({
      ...baseDeps(),
      now: () => new Date('2026-05-10T08:30:00Z'),
    });
    await briefRepo.upsert({
      dateLocal: '2026-05-10',
      kind: 'morning',
      generatedAt: '2026-05-10T08:30:00Z',
      output: r2.output,
      openedAt: null,
      userRating: null,
      providerUsed: r2.providerUsed,
      costUsd: r2.costUsd,
    });

    const fetched = await briefRepo.getByDate('2026-05-10', 'morning');
    expect(fetched?.generatedAt).toBe('2026-05-10T08:30:00Z');
  });

  it('EOD requires morning brief — throws no-morning-brief otherwise', async () => {
    await expect(generateEodReflection(baseDeps())).rejects.toThrow(/no-morning-brief/);
  });

  it('EOD succeeds after morning brief is upserted', async () => {
    const m = await generateMorningBrief(baseDeps());
    await briefRepo.upsert({
      dateLocal: '2026-05-10',
      kind: 'morning',
      generatedAt: '2026-05-10T08:00:00Z',
      output: m.output,
      openedAt: null,
      userRating: null,
      providerUsed: m.providerUsed,
      costUsd: m.costUsd,
    });

    const eod = await generateEodReflection({
      ...baseDeps(),
      now: () => new Date('2026-05-10T18:00:00Z'),
    });
    expect(eod.output).toBeTruthy();
  });

  it('focusSummary14d shape — 5 completed sessions today aggregate correctly', async () => {
    for (let i = 0; i < 5; i++) {
      await pomodoroRepo.start({ id: `p${i}`, durationMin: 25 });
      await pomodoroRepo.complete(`p${i}`);
    }
    const summary = await pomodoroRepo.summarize14d(new Date());
    expect(summary.totalFocusMin).toBe(125);
  });

  it('streak from briefings.opened_at — three consecutive opened days', async () => {
    const now = new Date();
    const fmt = (d: Date) => d.toLocaleDateString('sv-SE');
    const today = fmt(now);
    const yesterday = fmt(new Date(now.getTime() - 24 * 3600 * 1000));
    const dayBefore = fmt(new Date(now.getTime() - 2 * 24 * 3600 * 1000));

    for (const d of [today, yesterday, dayBefore]) {
      await briefRepo.upsert({
        dateLocal: d,
        kind: 'morning',
        generatedAt: now.toISOString(),
        output: { tldr: 'x' },
        openedAt: now.toISOString(),
        userRating: null,
        providerUsed: 'openrouter',
        costUsd: 0,
      });
    }
    const status = await briefRepo.recentOpenStatus(7);
    let streakDays = 0;
    for (const s of status) {
      if (s.opened) streakDays++;
      else break;
    }
    expect(streakDays).toBe(3);
  });
});
