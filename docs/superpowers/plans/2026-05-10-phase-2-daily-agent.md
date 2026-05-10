# Phase 2 Daily Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Daily Agent slice of Phase 2 — promote `generateMorningBrief` from stub to real LLM-driven agent + add sibling `generateEodReflection`; persist UserProfile so the alarms scheduler reads user-edited `briefingHour`/`reflectionHour`; establish sqlite-backed brief storage (first real `packages/db` migrations); wire Hero/Ticker/Brief drawer to live brief output via shared `useBrief()` hook; ship alarm-fires-while-locked + catch-up + manual-regenerate UX. Closes the Daily Agent slice of PRD §21 Phase 2.

**Architecture:** Three tiers. **Data** — sqlite repos for briefings + pomodoros + cost ledger; chrome.storage.local for UserProfile. **Agents** — `brief.morning.ts` + `brief.eod.ts` orchestrate snapshot → LLM call (via `packages/llm/router`) → schema validation → repo write. **UI** — `useBrief()` Zustand-shared hook feeds Brief drawer + Hero + Ticker; ProfileDrawer gains DailyTimesSection; FocusDrawer wires Pomodoro lifecycle to RPC. Alarms scheduler from Phase 1.5 swaps `defaults.ts` from hardcoded constants to async `getUserProfile()` reads; `handlers.ts` dispatches the new RPC routes.

**Tech Stack:** TypeScript strict, Vitest + RTL + jest-axe for unit/component tests, Playwright for e2e (existing harness), sqlite-wasm + OPFS via `packages/db`, Zod for schema validation, Zustand for shell state, React + WXT.

**Branch:** `phase-2-daily-agent` cut off `master` (already cut as of 2026-05-10; spec committed at `b1be0a9`).

**Spec:** [`docs/superpowers/specs/2026-05-10-phase-2-daily-agent-design.md`](../specs/2026-05-10-phase-2-daily-agent-design.md).

---

## Decisions made during planning

These were locked during the brainstorm (8 grills resolved). The engineer should NOT re-derive them:

1. **Phase 2 splits into two workstreams.** This plan covers Daily Agent only. Semantic Notes (RAG, ⌘K ask mode, sqlite-vec) is a separate later workstream `phase-2-semantic-notes`.
2. **Brief inputs are honestly sparse in Phase 2** — only time, timezone, user.name, weather, focusSummary14d are real. `events`, `overdueTasks`, `activeGoals`, `fitbit` ship as empty arrays / null. The drawer renders empty-state CTAs ("Connect Calendar to see meetings."). LLM is explicitly told not to invent data.
3. **Brief storage is sqlite via `packages/db`** — first real migrations. PRD-aligned (§5.7). Repository pattern. Composite key `(date_local, kind)` since one date has at most one of each kind.
4. **UserProfile stored in `chrome.storage.local['profile.user.v1']`** — single object, ~200 bytes; sqlite is overkill for config. `getUserProfile()` auto-creates default on first call. `setUserProfile(patch)` writes back + fires `alarms.refresh` if hours changed.
5. **Locked-creds + catch-up + manual regenerate semantics** — alarm fires while locked → silent skip (no row written). Catch-up trigger on next-tab-mount: brief exists → render; brief missing + creds available + `now ≥ briefingHour` → generate inline; brief missing + creds locked → render `LockedEmpty`. Manual Regenerate button in Brief drawer footer with `force: true`.
6. **Two top-level agents** (`brief.morning.ts` + `brief.eod.ts`), not one parameterized agent. Different prompts, schemas, inputs. EOD needs morning brief as input; fails fast with `{ skipped: 'no-morning-brief' }` if absent.
7. **Streak computed on-demand from `briefings.opened_at`** — no separate `streaks` table. Single sqlite query in `briefRepo.recentOpenStatus(60)` + walk-backward in `brief.streak` RPC handler.
8. **focusSummary14d ships in this workstream** — Pomodoro lifecycle persisted (start/complete/abandon RPC routes). `interrupt_count` schema column ships but always 0 (UX deferred to Phase 3).
9. **Empty-state CTAs live in drawer template, not LLM prompt.** LLM emits structurally honest empty arrays / null; drawer hardcodes the "Connect Calendar..." copy. Predictable UX, cheaper LLM call.
10. **No new CI gate.** Existing seven jobs (lint, typecheck, test, build, gate:offline, gate:alarms, e2e advisory) inherit the new code. `e2e (advisory)` is `continue-on-error: true` for the env-key-gated tests.

---

## File layout (additive)

```
packages/core/src/
├── prompts/
│   ├── brief.morning.md                              [NEW]
│   ├── brief.eod.md                                  [NEW]
│   └── routing.ts                                    [ext — add 2 rows]
├── profile/
│   ├── userProfile.ts                                [NEW]
│   ├── userProfile.test.ts                           [NEW]
│   └── index.ts                                      [NEW — barrel]
└── index.ts                                          [ext — re-export profile barrel]

packages/db/src/
├── migrations/
│   ├── 0001-create-briefings.sql                     [NEW]
│   ├── 0002-create-pomodoros.sql                     [NEW]
│   └── 0003-create-llm-cost-ledger.sql               [NEW]
├── repositories/
│   ├── brief.ts                                      [NEW]
│   ├── brief.test.ts                                 [NEW]
│   ├── pomodoro.ts                                   [NEW]
│   ├── pomodoro.test.ts                              [NEW]
│   ├── costLedger.ts                                 [NEW]
│   ├── costLedger.test.ts                            [NEW]
│   └── index.ts                                      [NEW — barrel]
└── index.ts                                          [ext — re-export repositories]

packages/agents/src/
├── brief.morning.ts                                  [NEW]
├── brief.morning.test.ts                             [NEW]
├── brief.eod.ts                                      [NEW]
├── brief.eod.test.ts                                 [NEW]
├── stubs/
│   ├── generateMorningBrief.ts                       [DELETED at end]
│   ├── generateMorningBrief.test.ts                  [DELETED at end]
│   └── index.ts                                      [ext — drop generateMorningBrief]
└── index.ts                                          [ext — export brief.morning, brief.eod]

packages/integrations/src/scheduling/
├── defaults.ts                                       [ext — async + UserProfile-backed]
├── scheduler.ts                                      [ext — computeDesired async]
└── handlers.ts                                       [ext — dispatch brief.morning / brief.eod]

packages/runtime/src/
└── routes.ts                                         [ext — add 11 route types]

apps/extension/
├── app/
│   ├── drawers/
│   │   ├── BriefDrawer.tsx                           [rewrite]
│   │   ├── brief/
│   │   │   ├── BriefTLDR.tsx                         [NEW]
│   │   │   ├── PomodorosSection.tsx                  [NEW]
│   │   │   ├── WatchoutsSection.tsx                  [NEW]
│   │   │   ├── RecoverySection.tsx                   [NEW]
│   │   │   ├── QuotedGoalSection.tsx                 [NEW]
│   │   │   ├── BriefFooter.tsx                       [NEW]
│   │   │   ├── EodReflectionView.tsx                 [NEW]
│   │   │   ├── LockedEmpty.tsx                       [NEW]
│   │   │   ├── TooEarlyEmpty.tsx                     [NEW]
│   │   │   └── ErrorEmpty.tsx                        [NEW]
│   │   ├── FocusDrawer.tsx                           [ext — pomodoro.* RPC wiring]
│   │   ├── ProfileDrawer.tsx                         [ext — render DailyTimesSection]
│   │   └── profile/
│   │       ├── DailyTimesSection.tsx                 [NEW]
│   │       └── DailyTimesSection.test.tsx            [NEW]
│   ├── components/
│   │   ├── Hero.tsx                                  [ext — useBrief]
│   │   └── Ticker.tsx                                [ext — useBrief + brief.streak]
│   ├── hooks/
│   │   ├── useBrief.ts                               [NEW]
│   │   └── useBrief.test.ts                          [NEW]
│   └── state/
│       ├── briefStore.ts                             [NEW]
│       └── briefStore.test.ts                        [NEW]
└── entrypoints/
    ├── background.ts                                 [ext — alarms.refresh dispatch]
    └── offscreen/main.ts                             [ext — register 11 new routes]

apps/extension/tests/e2e/
└── daily-agent.spec.ts                               [NEW]

tests/
├── integration/
│   └── brief-pipeline.test.ts                        [NEW — 7 scenarios]
└── prompt-eval/
    └── brief.morning.yaml                            [NEW — placeholder]

docs/
├── architecture.md                                   [ext — Daily Agent subsection]
├── prd.md                                            [ext — §21 Phase 2 Daily Agent slice closed]
└── AGENTS.md                                         [ext — no-direct-profile-storage rule]
```

---

## Coverage targets (preserved gates)

- `packages/core/crypto/*` — 100% line + branch (preserved from Phase 1.5).
- `packages/core/src/profile/userProfile.ts` — 100% line + branch (new gate).
- `packages/db/repositories/*` — ≥95% line.
- `packages/agents/brief.morning.ts` + `brief.eod.ts` — ≥90% line.
- Aggregate ≥85% line, ≥75% branch (PRD §16.1 / §20.1 carry).

---

## Manual smoke checklist (PR-time, embedded for engineer to copy into PR body)

- [ ] Fresh install: complete onboarding, set briefingHour to current hour - 1, reload — Brief drawer renders real LLM output with TLDR + provider/cost row.
- [ ] Edit briefingHour in DailyTimesSection — `await chrome.alarms.getAll()` from devtools shows updated `when` for `morning-brief`.
- [ ] At reflectionHour (or after editing it to current hour), open new tab — EOD reflection generates and renders.
- [ ] Lock creds, wait for alarm, open new tab — Brief drawer shows `LockedEmpty`. Click chip in topbar → unlock → Regenerate → real brief renders.
- [ ] Start a Pomodoro from FocusDrawer, complete it — `await rpc('pomodoro.start', { id: '...' })` then `complete` — `await rpc('pomodoro.summarize14d')` returns updated `totalFocusMin` (note: this RPC isn't part of the route surface; query via direct `await getDb()` in offscreen console, or add temporary devtools).
- [ ] Open Brief drawer → click 👍 / 👎 → footer updates immediately; `briefings.user_rating` row updates.
- [ ] Open Brief drawer → click Regenerate → spinner → new content renders, cost row updates, `briefings.cost_usd` updates in sqlite.

---

### Task 1: Verify branch state

**Files:** none (git only)

- [ ] **Step 1: Verify on `phase-2-daily-agent` with the spec committed**

```bash
git branch --show-current
git log --oneline -3
```

Expected: `phase-2-daily-agent`. Top commit should be `b1be0a9 docs(specs): phase-2-daily-agent design …` or later. Working tree clean (only `docs/Compass.design-update.html` may be untracked from outside this workstream — leave alone).

If `git status` shows anything in `packages/`, `apps/`, or `tests/`, STOP and report. The plan assumes a clean tree.

---

### Task 2: Add three sqlite migrations

**Files:**

- Create: `packages/db/src/migrations/0001-create-briefings.sql`
- Create: `packages/db/src/migrations/0002-create-pomodoros.sql`
- Create: `packages/db/src/migrations/0003-create-llm-cost-ledger.sql`

The directory `packages/db/src/migrations/` does not exist yet — create it.

- [ ] **Step 1: Create `0001-create-briefings.sql`**

```sql
CREATE TABLE briefings (
  date_local TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('morning', 'eod')),
  generated_at TEXT NOT NULL,
  output_json TEXT NOT NULL,
  opened_at TEXT,
  user_rating INTEGER CHECK (user_rating IN (-1, 1)),
  provider_used TEXT NOT NULL,
  cost_usd REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (date_local, kind)
);
CREATE INDEX briefings_kind_date ON briefings(kind, date_local DESC);
```

- [ ] **Step 2: Create `0002-create-pomodoros.sql`**

```sql
CREATE TABLE pomodoros (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_min INTEGER NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  interrupt_count INTEGER NOT NULL DEFAULT 0,
  theme TEXT
);
CREATE INDEX pomodoros_started ON pomodoros(started_at DESC);
```

- [ ] **Step 3: Create `0003-create-llm-cost-ledger.sql`**

```sql
CREATE TABLE llm_cost_ledger (
  id TEXT PRIMARY KEY,
  ts TEXT NOT NULL,
  feature TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tok INTEGER NOT NULL,
  cached_tok INTEGER NOT NULL,
  completion_tok INTEGER NOT NULL,
  usd_estimated REAL NOT NULL
);
CREATE INDEX llm_cost_ledger_ts ON llm_cost_ledger(ts DESC);
CREATE INDEX llm_cost_ledger_feature ON llm_cost_ledger(feature, ts DESC);
```

- [ ] **Step 4: Verify the migration runner picks them up**

```bash
cat packages/db/src/migration-runner.ts
```

The runner globs `migrations/*.sql` in lexicographic order and runs each in a transaction. Confirm by reading the file. (No code changes here — just verifying the convention is in place.)

- [ ] **Step 5: Run existing db tests to ensure migrations parse cleanly**

```bash
pnpm --filter @compass/db test 2>&1 | tail -20
```

Expected: existing tests still pass. If a test like `init.test.ts` exists and explicitly enumerates migrations, it may need updating — read the test to find out and adapt.

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/migrations/
git commit -m "feat(db): add migrations 0001-0003 — briefings, pomodoros, llm_cost_ledger"
```

---

### Task 3: TDD `BriefRepo`

**Files:**

- Create: `packages/db/src/repositories/brief.ts`
- Create: `packages/db/src/repositories/brief.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/db/src/repositories/brief.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { openInMemoryDb, type Db } from '../opfs';
import { runMigrations } from '../migration-runner';
import { createBriefRepo, type BriefRepo, type StoredBriefing } from './brief';

let db: Db;
let repo: BriefRepo;

beforeEach(async () => {
  db = await openInMemoryDb();
  await runMigrations(db);
  repo = createBriefRepo(db);
});

const sample: StoredBriefing = {
  dateLocal: '2026-05-10',
  kind: 'morning',
  generatedAt: '2026-05-10T08:00:00Z',
  output: {
    oneLineMood: 'Calm.',
    tldr: 'Light schedule.',
    topPriority: { title: 'Ship', why: 'Deadline.', suggestedFocusMinutes: 90 },
    pomodoros: [],
    watchouts: [],
    recovery: { note: '', suggestBreak: false },
    quotedGoal: null,
  } as never,
  openedAt: null,
  userRating: null,
  providerUsed: 'openrouter',
  costUsd: 0.0003,
};

describe('BriefRepo', () => {
  it('returns null when no row exists', async () => {
    expect(await repo.getByDate('2026-05-10', 'morning')).toBeNull();
  });

  it('upserts and returns the row', async () => {
    await repo.upsert(sample);
    const got = await repo.getByDate('2026-05-10', 'morning');
    expect(got?.dateLocal).toBe('2026-05-10');
    expect(got?.kind).toBe('morning');
    expect(got?.providerUsed).toBe('openrouter');
    expect(got?.costUsd).toBeCloseTo(0.0003);
  });

  it('upsert overwrites when same (date_local, kind)', async () => {
    await repo.upsert(sample);
    await repo.upsert({ ...sample, costUsd: 0.0007, providerUsed: 'openai' });
    const got = await repo.getByDate('2026-05-10', 'morning');
    expect(got?.providerUsed).toBe('openai');
    expect(got?.costUsd).toBeCloseTo(0.0007);
  });

  it('records open timestamp', async () => {
    await repo.upsert(sample);
    await repo.recordOpen('2026-05-10', 'morning', '2026-05-10T08:30:00Z');
    expect((await repo.getByDate('2026-05-10', 'morning'))?.openedAt).toBe('2026-05-10T08:30:00Z');
  });

  it('records rating', async () => {
    await repo.upsert(sample);
    await repo.recordRating('2026-05-10', 'morning', 1);
    expect((await repo.getByDate('2026-05-10', 'morning'))?.userRating).toBe(1);
  });

  it('recentOpenStatus returns N days back, newest first, with opened flag', async () => {
    // Today opened
    await repo.upsert({ ...sample, dateLocal: '2026-05-10', openedAt: '2026-05-10T08:30:00Z' });
    // Yesterday opened
    await repo.upsert({ ...sample, dateLocal: '2026-05-09', openedAt: '2026-05-09T08:30:00Z' });
    // Day before yesterday: brief exists but not opened
    await repo.upsert({ ...sample, dateLocal: '2026-05-08', openedAt: null });

    const status = await repo.recentOpenStatus(7);
    // Newest first
    expect(status[0]).toEqual({ dateLocal: '2026-05-10', opened: true });
    expect(status[1]).toEqual({ dateLocal: '2026-05-09', opened: true });
    expect(status[2]).toEqual({ dateLocal: '2026-05-08', opened: false });
  });
});
```

- [ ] **Step 2: Run — verify it fails**

```bash
pnpm --filter @compass/db test -- brief.test.ts
```

Expected: FAIL — `Cannot find module './brief'`. (If the test fails differently because `openInMemoryDb` doesn't exist, read `packages/db/src/opfs.ts` to find the actual in-memory test helper — adapt the import.)

- [ ] **Step 3: Implement `brief.ts`**

Create `packages/db/src/repositories/brief.ts`:

```ts
import type { Db } from '../opfs';

export interface StoredBriefing {
  dateLocal: string;
  kind: 'morning' | 'eod';
  generatedAt: string;
  output: unknown; // BriefingOutput | EodReflectionOutput — type kept loose at the repo layer
  openedAt: string | null;
  userRating: -1 | 1 | null;
  providerUsed: string;
  costUsd: number;
}

export interface BriefRepo {
  getByDate(dateLocal: string, kind: 'morning' | 'eod'): Promise<StoredBriefing | null>;
  upsert(b: StoredBriefing): Promise<void>;
  recordOpen(dateLocal: string, kind: 'morning' | 'eod', at: string): Promise<void>;
  recordRating(dateLocal: string, kind: 'morning' | 'eod', rating: -1 | 1): Promise<void>;
  recentOpenStatus(daysBack: number): Promise<Array<{ dateLocal: string; opened: boolean }>>;
}

interface Row {
  date_local: string;
  kind: 'morning' | 'eod';
  generated_at: string;
  output_json: string;
  opened_at: string | null;
  user_rating: number | null;
  provider_used: string;
  cost_usd: number;
}

function rowToStored(r: Row): StoredBriefing {
  return {
    dateLocal: r.date_local,
    kind: r.kind,
    generatedAt: r.generated_at,
    output: JSON.parse(r.output_json),
    openedAt: r.opened_at,
    userRating: r.user_rating === 1 || r.user_rating === -1 ? r.user_rating : null,
    providerUsed: r.provider_used,
    costUsd: r.cost_usd,
  };
}

export function createBriefRepo(db: Db): BriefRepo {
  return {
    async getByDate(dateLocal, kind) {
      const rows = await db.exec({
        sql: 'SELECT * FROM briefings WHERE date_local = ? AND kind = ?',
        bind: [dateLocal, kind],
        rowMode: 'object',
      });
      const row = rows[0] as Row | undefined;
      return row ? rowToStored(row) : null;
    },
    async upsert(b) {
      await db.exec({
        sql: `INSERT INTO briefings (date_local, kind, generated_at, output_json, opened_at, user_rating, provider_used, cost_usd)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(date_local, kind) DO UPDATE SET
                generated_at = excluded.generated_at,
                output_json = excluded.output_json,
                opened_at = excluded.opened_at,
                user_rating = excluded.user_rating,
                provider_used = excluded.provider_used,
                cost_usd = excluded.cost_usd`,
        bind: [
          b.dateLocal,
          b.kind,
          b.generatedAt,
          JSON.stringify(b.output),
          b.openedAt,
          b.userRating,
          b.providerUsed,
          b.costUsd,
        ],
      });
    },
    async recordOpen(dateLocal, kind, at) {
      await db.exec({
        sql: 'UPDATE briefings SET opened_at = ? WHERE date_local = ? AND kind = ?',
        bind: [at, dateLocal, kind],
      });
    },
    async recordRating(dateLocal, kind, rating) {
      await db.exec({
        sql: 'UPDATE briefings SET user_rating = ? WHERE date_local = ? AND kind = ?',
        bind: [rating, dateLocal, kind],
      });
    },
    async recentOpenStatus(daysBack) {
      const rows = await db.exec({
        sql: `SELECT date_local, opened_at FROM briefings
              WHERE kind = 'morning' AND date_local >= date('now', ?)
              ORDER BY date_local DESC`,
        bind: [`-${daysBack} days`],
        rowMode: 'object',
      });
      return (rows as Array<{ date_local: string; opened_at: string | null }>).map((r) => ({
        dateLocal: r.date_local,
        opened: r.opened_at !== null,
      }));
    },
  };
}
```

- [ ] **Step 4: Run — verify it passes**

```bash
pnpm --filter @compass/db test -- brief.test.ts
```

Expected: PASS — 6 tests green.

If the `Db` interface doesn't have `.exec({ sql, bind, rowMode })` exactly as written, read `packages/db/src/opfs.ts` to find the actual Db API and adapt. The shape above is the sqlite-wasm convention; your project may wrap it.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/repositories/brief.ts packages/db/src/repositories/brief.test.ts
git commit -m "feat(db): add BriefRepo with upsert / getByDate / recordOpen / recordRating / recentOpenStatus"
```

---

### Task 4: TDD `PomodoroRepo`

**Files:**

- Create: `packages/db/src/repositories/pomodoro.ts`
- Create: `packages/db/src/repositories/pomodoro.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/db/src/repositories/pomodoro.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { openInMemoryDb, type Db } from '../opfs';
import { runMigrations } from '../migration-runner';
import { createPomodoroRepo, type PomodoroRepo } from './pomodoro';

let db: Db;
let repo: PomodoroRepo;

beforeEach(async () => {
  db = await openInMemoryDb();
  await runMigrations(db);
  repo = createPomodoroRepo(db);
});

describe('PomodoroRepo', () => {
  it('start inserts a row', async () => {
    await repo.start({ id: 'p1', durationMin: 25 });
    const summary = await repo.summarize14d(new Date('2026-05-10T12:00:00Z'));
    expect(summary.totalFocusMin).toBe(0); // not yet completed
  });

  it('complete marks completed=1 and counts toward total', async () => {
    await repo.start({ id: 'p1', durationMin: 25 });
    await repo.complete('p1');
    const summary = await repo.summarize14d(new Date('2026-05-10T12:00:00Z'));
    expect(summary.totalFocusMin).toBe(25);
  });

  it('abandon does NOT count toward total', async () => {
    await repo.start({ id: 'p1', durationMin: 25 });
    await repo.abandon('p1');
    const summary = await repo.summarize14d(new Date('2026-05-10T12:00:00Z'));
    expect(summary.totalFocusMin).toBe(0);
  });

  it('summarize14d aggregates across 14 days', async () => {
    // 5 completed sessions today, 25 min each
    for (let i = 0; i < 5; i++) {
      await repo.start({ id: `today-${i}`, durationMin: 25 });
      await repo.complete(`today-${i}`);
    }
    const summary = await repo.summarize14d(new Date('2026-05-10T12:00:00Z'));
    expect(summary.totalFocusMin).toBe(125);
    expect(summary.peakHourLocal).not.toBeNull();
  });

  it('summarize14d returns null peakHour when no completed sessions', async () => {
    const summary = await repo.summarize14d(new Date('2026-05-10T12:00:00Z'));
    expect(summary.totalFocusMin).toBe(0);
    expect(summary.peakHourLocal).toBeNull();
    expect(summary.avgInterruptPerSession).toBe(0);
    expect(summary.trend).toBe('flat');
  });
});
```

- [ ] **Step 2: Run — verify it fails**

```bash
pnpm --filter @compass/db test -- pomodoro.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `pomodoro.ts`**

Create `packages/db/src/repositories/pomodoro.ts`:

```ts
import type { Db } from '../opfs';

export interface FocusSummary14d {
  totalFocusMin: number;
  peakHourLocal: number | null;
  avgInterruptPerSession: number;
  trend: 'improving' | 'flat' | 'declining';
}

export interface PomodoroRepo {
  start(input: { id: string; durationMin: number; theme?: string }): Promise<void>;
  complete(id: string): Promise<void>;
  abandon(id: string): Promise<void>;
  summarize14d(now: Date): Promise<FocusSummary14d>;
}

export function createPomodoroRepo(db: Db): PomodoroRepo {
  return {
    async start({ id, durationMin, theme }) {
      await db.exec({
        sql: `INSERT INTO pomodoros (id, started_at, duration_min, theme) VALUES (?, ?, ?, ?)
              ON CONFLICT(id) DO NOTHING`,
        bind: [id, new Date().toISOString(), durationMin, theme ?? null],
      });
    },
    async complete(id) {
      await db.exec({
        sql: 'UPDATE pomodoros SET ended_at = ?, completed = 1 WHERE id = ?',
        bind: [new Date().toISOString(), id],
      });
    },
    async abandon(id) {
      await db.exec({
        sql: 'UPDATE pomodoros SET ended_at = ?, completed = 0 WHERE id = ?',
        bind: [new Date().toISOString(), id],
      });
    },
    async summarize14d(now) {
      const cutoff14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const cutoff7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const totalRows = (await db.exec({
        sql: `SELECT COALESCE(SUM(duration_min), 0) AS total, AVG(interrupt_count) AS avgInt, COUNT(*) AS cnt
              FROM pomodoros WHERE completed = 1 AND started_at >= ?`,
        bind: [cutoff14],
        rowMode: 'object',
      })) as Array<{ total: number; avgInt: number | null; cnt: number }>;
      const totalFocusMin = totalRows[0]?.total ?? 0;
      const avgInt = totalRows[0]?.avgInt ?? 0;

      const peakRows = (await db.exec({
        sql: `SELECT CAST(strftime('%H', started_at, 'localtime') AS INTEGER) AS hour, COUNT(*) AS c
              FROM pomodoros WHERE completed = 1 AND started_at >= ?
              GROUP BY hour ORDER BY c DESC LIMIT 1`,
        bind: [cutoff14],
        rowMode: 'object',
      })) as Array<{ hour: number; c: number }>;
      const peakHourLocal = peakRows[0]?.hour ?? null;

      // Trend: 7d totalMin vs prior 7d (days 8-14)
      const last7 = (await db.exec({
        sql: `SELECT COALESCE(SUM(duration_min), 0) AS t FROM pomodoros
              WHERE completed = 1 AND started_at >= ?`,
        bind: [cutoff7],
        rowMode: 'object',
      })) as Array<{ t: number }>;
      const prior7 = (await db.exec({
        sql: `SELECT COALESCE(SUM(duration_min), 0) AS t FROM pomodoros
              WHERE completed = 1 AND started_at >= ? AND started_at < ?`,
        bind: [cutoff14, cutoff7],
        rowMode: 'object',
      })) as Array<{ t: number }>;
      const cur = last7[0]?.t ?? 0;
      const prev = prior7[0]?.t ?? 0;
      let trend: 'improving' | 'flat' | 'declining' = 'flat';
      if (prev > 0) {
        if (cur >= prev * 1.1) trend = 'improving';
        else if (cur <= prev * 0.9) trend = 'declining';
      }

      return { totalFocusMin, peakHourLocal, avgInterruptPerSession: avgInt ?? 0, trend };
    },
  };
}
```

- [ ] **Step 4: Run — verify it passes**

```bash
pnpm --filter @compass/db test -- pomodoro.test.ts
```

Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/repositories/pomodoro.ts packages/db/src/repositories/pomodoro.test.ts
git commit -m "feat(db): add PomodoroRepo with start / complete / abandon / summarize14d"
```

---

### Task 5: TDD `CostLedgerRepo`

**Files:**

- Create: `packages/db/src/repositories/costLedger.ts`
- Create: `packages/db/src/repositories/costLedger.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/db/src/repositories/costLedger.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { openInMemoryDb, type Db } from '../opfs';
import { runMigrations } from '../migration-runner';
import { createCostLedgerRepo, type CostLedgerRepo } from './costLedger';

let db: Db;
let repo: CostLedgerRepo;

beforeEach(async () => {
  db = await openInMemoryDb();
  await runMigrations(db);
  repo = createCostLedgerRepo(db);
});

const sampleRow = (over: Partial<Parameters<CostLedgerRepo['recordRow']>[0]> = {}) => ({
  id: 'r1',
  ts: '2026-05-10T08:00:00Z',
  feature: 'brief.morning',
  provider: 'openrouter' as const,
  model: 'claude-sonnet-4-6',
  promptTok: 1000,
  cachedTok: 800,
  completionTok: 200,
  usdEstimated: 0.0003,
  ...over,
});

describe('CostLedgerRepo', () => {
  it('recordRow inserts a row', async () => {
    await repo.recordRow(sampleRow());
    const spend = await repo.monthlySpend('2026-05-01T00:00:00Z');
    expect(spend.usd).toBeCloseTo(0.0003);
    expect(spend.calls).toBe(1);
  });

  it('monthlySpend sums cost across rows in the month', async () => {
    await repo.recordRow(sampleRow({ id: 'r1', ts: '2026-05-01T08:00:00Z', usdEstimated: 0.001 }));
    await repo.recordRow(sampleRow({ id: 'r2', ts: '2026-05-15T08:00:00Z', usdEstimated: 0.002 }));
    await repo.recordRow(sampleRow({ id: 'r3', ts: '2026-05-31T23:59:00Z', usdEstimated: 0.003 }));
    const spend = await repo.monthlySpend('2026-05-01T00:00:00Z');
    expect(spend.usd).toBeCloseTo(0.006);
    expect(spend.calls).toBe(3);
  });

  it('monthlySpend excludes rows from previous months', async () => {
    await repo.recordRow(
      sampleRow({ id: 'r-april', ts: '2026-04-15T08:00:00Z', usdEstimated: 0.01 }),
    );
    await repo.recordRow(
      sampleRow({ id: 'r-may', ts: '2026-05-01T08:00:00Z', usdEstimated: 0.005 }),
    );
    const spend = await repo.monthlySpend('2026-05-01T00:00:00Z');
    expect(spend.usd).toBeCloseTo(0.005);
    expect(spend.calls).toBe(1);
  });
});
```

- [ ] **Step 2: Run — verify it fails**

```bash
pnpm --filter @compass/db test -- costLedger.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `costLedger.ts`**

Create `packages/db/src/repositories/costLedger.ts`:

```ts
import type { Db } from '../opfs';

export interface CostLedgerRepo {
  recordRow(row: {
    id: string;
    ts: string;
    feature: string;
    provider: string;
    model: string;
    promptTok: number;
    cachedTok: number;
    completionTok: number;
    usdEstimated: number;
  }): Promise<void>;
  monthlySpend(monthStartIso: string): Promise<{ usd: number; calls: number }>;
}

export function createCostLedgerRepo(db: Db): CostLedgerRepo {
  return {
    async recordRow(r) {
      await db.exec({
        sql: `INSERT INTO llm_cost_ledger (id, ts, feature, provider, model, prompt_tok, cached_tok, completion_tok, usd_estimated)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        bind: [
          r.id,
          r.ts,
          r.feature,
          r.provider,
          r.model,
          r.promptTok,
          r.cachedTok,
          r.completionTok,
          r.usdEstimated,
        ],
      });
    },
    async monthlySpend(monthStartIso) {
      // Compute month-end as start + ~32 days, then take rows where ts < next-month-start
      const start = new Date(monthStartIso);
      const nextMonth = new Date(start.getFullYear(), start.getMonth() + 1, 1).toISOString();
      const rows = (await db.exec({
        sql: `SELECT COALESCE(SUM(usd_estimated), 0) AS usd, COUNT(*) AS calls
              FROM llm_cost_ledger
              WHERE ts >= ? AND ts < ?`,
        bind: [monthStartIso, nextMonth],
        rowMode: 'object',
      })) as Array<{ usd: number; calls: number }>;
      return { usd: rows[0]?.usd ?? 0, calls: rows[0]?.calls ?? 0 };
    },
  };
}
```

- [ ] **Step 4: Run — verify it passes**

```bash
pnpm --filter @compass/db test -- costLedger.test.ts
```

Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/repositories/costLedger.ts packages/db/src/repositories/costLedger.test.ts
git commit -m "feat(db): add CostLedgerRepo with recordRow / monthlySpend"
```

---

### Task 6: Create repositories barrel + extend db package barrel

**Files:**

- Create: `packages/db/src/repositories/index.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: Create the repositories barrel**

Create `packages/db/src/repositories/index.ts`:

```ts
export { createBriefRepo, type BriefRepo, type StoredBriefing } from './brief';
export { createPomodoroRepo, type PomodoroRepo, type FocusSummary14d } from './pomodoro';
export { createCostLedgerRepo, type CostLedgerRepo } from './costLedger';
```

- [ ] **Step 2: Re-export from `packages/db/src/index.ts`**

Read the current barrel:

```bash
cat packages/db/src/index.ts
```

Append (or include in the existing exports):

```ts
export * from './repositories/index';
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @compass/db typecheck
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/repositories/index.ts packages/db/src/index.ts
git commit -m "feat(db): export repositories from package barrel"
```

---

### Task 7: TDD UserProfile persistence

**Files:**

- Create: `packages/core/src/profile/userProfile.ts`
- Create: `packages/core/src/profile/userProfile.test.ts`
- Create: `packages/core/src/profile/index.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/profile/userProfile.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

interface ChromeStorage {
  local: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
}

function installChromeStorageMock(): ChromeStorage {
  const store = new Map<string, unknown>();
  const mock: ChromeStorage = {
    local: {
      get: vi.fn(async (key: string) => (store.has(key) ? { [key]: store.get(key) } : {})),
      set: vi.fn(async (obj: Record<string, unknown>) => {
        for (const [k, v] of Object.entries(obj)) store.set(k, v);
      }),
      remove: vi.fn(async (key: string) => {
        store.delete(key);
      }),
    },
  };
  // Stub rpc so setUserProfile's alarms.refresh call doesn't blow up
  (
    globalThis as unknown as {
      chrome: { storage: ChromeStorage };
      rpc?: (route: string) => Promise<unknown>;
    }
  ).chrome = { storage: mock };
  return mock;
}

import { getUserProfile, setUserProfile } from './userProfile';

describe('UserProfile', () => {
  beforeEach(() => {
    delete (globalThis as { chrome?: unknown }).chrome;
    // The userProfile module imports rpc from @compass/runtime — mocked at module level below.
  });

  it('creates a default profile on first call when storage is empty', async () => {
    installChromeStorageMock();
    const profile = await getUserProfile();
    expect(profile.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(profile.briefingHour).toBe(8);
    expect(profile.reflectionHour).toBe(18);
    expect(profile.workHours.start).toBe('09:00');
    expect(profile.workHours.end).toBe('17:00');
    expect(profile.timezone).toBeTruthy();
    expect(profile.locale).toBeTruthy();
  });

  it('returns the persisted profile on subsequent calls', async () => {
    installChromeStorageMock();
    const first = await getUserProfile();
    const second = await getUserProfile();
    expect(second.id).toBe(first.id);
    expect(second.createdAt).toBe(first.createdAt);
  });

  it('setUserProfile patches the stored profile', async () => {
    installChromeStorageMock();
    await getUserProfile();
    const updated = await setUserProfile({ briefingHour: 9 });
    expect(updated.briefingHour).toBe(9);
    const fetched = await getUserProfile();
    expect(fetched.briefingHour).toBe(9);
  });

  it('setUserProfile validates against UserProfileSchema', async () => {
    installChromeStorageMock();
    await getUserProfile();
    await expect(setUserProfile({ briefingHour: 'invalid' as never })).rejects.toThrow();
  });
});
```

NOTE: `setUserProfile` calls `rpc('alarms.refresh')` when hours change. The test uses a no-op rpc by mocking `@compass/runtime`. Add at the top of the test file before the imports:

```ts
vi.mock('@compass/runtime', () => ({ rpc: vi.fn(async () => ({ ok: true })) }));
```

- [ ] **Step 2: Run — verify it fails**

```bash
pnpm --filter @compass/core test -- userProfile.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `userProfile.ts`**

Create `packages/core/src/profile/userProfile.ts`:

```ts
import { rpc } from '@compass/runtime';
import { UserProfileSchema, type UserProfile } from '../types/user';

const STORAGE_KEY = 'profile.user.v1';

export async function getUserProfile(): Promise<UserProfile> {
  const r = await chrome.storage.local.get(STORAGE_KEY);
  const parsed = UserProfileSchema.safeParse(r[STORAGE_KEY]);
  if (parsed.success) return parsed.data;

  const fresh: UserProfile = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US',
    workHours: { start: '09:00', end: '17:00' },
    briefingHour: 8,
    reflectionHour: 18,
  };
  await chrome.storage.local.set({ [STORAGE_KEY]: fresh });
  return fresh;
}

export async function setUserProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
  const current = await getUserProfile();
  const next = UserProfileSchema.parse({ ...current, ...patch });
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  if (patch.briefingHour !== undefined || patch.reflectionHour !== undefined) {
    await rpc('alarms.refresh', {});
  }
  return next;
}
```

- [ ] **Step 4: Create the barrel `packages/core/src/profile/index.ts`**

```ts
export { getUserProfile, setUserProfile } from './userProfile';
```

- [ ] **Step 5: Run — verify it passes**

```bash
pnpm --filter @compass/core test -- userProfile.test.ts
```

Expected: PASS — 4 tests green.

If `rpc('alarms.refresh', {})` typechecks fail because the route isn't yet declared, temporarily widen the call signature OR proceed knowing Task 18 (route types) will tighten this. The mock makes the call a no-op at runtime regardless.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/profile/userProfile.ts packages/core/src/profile/userProfile.test.ts packages/core/src/profile/index.ts
git commit -m "feat(core): add getUserProfile / setUserProfile with chrome.storage.local persistence"
```

---

### Task 8: Export profile module from `@compass/core` barrel

**Files:**

- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Read the current barrel**

```bash
cat packages/core/src/index.ts
```

- [ ] **Step 2: Add the profile export**

Append (or include in existing structure):

```ts
export * from './profile/index';
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @compass/core typecheck
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/index.ts
git commit -m "feat(core): export profile module from package barrel"
```

---

### Task 9: Add `no-direct-profile-storage` lint rule

**Files:**

- Modify: `eslint.config.js`
- Modify: `docs/AGENTS.md`

- [ ] **Step 1: Read current lint config**

```bash
cat eslint.config.js | head -80
```

Find the existing `no-direct-credentials-storage` rule pattern (uses `no-restricted-syntax` likely). Add a sibling rule restricting `chrome.storage.local.get('profile.user.v1')` and `.set({ 'profile.user.v1': ... })` to `packages/core/src/profile/userProfile.ts`.

- [ ] **Step 2: Add the rule pattern**

In the same rules block as the credentials rule, add a `no-restricted-syntax` selector that catches `Literal[value="profile.user.v1"]` outside the allowed file. Adapt to the existing pattern.

- [ ] **Step 3: Verify lint runs cleanly with the new rule**

```bash
pnpm lint 2>&1 | tail -10
```

Expected: 0 errors. If the rule fires on `userProfile.ts` itself, the override (file-specific allow list) needs to scope that file out — match the existing credentials rule's allow-list mechanism.

- [ ] **Step 4: Document the rule in `docs/AGENTS.md`**

Read the file and add a row to the rules table (or analogous structure):

```markdown
- `no-direct-profile-storage` — `chrome.storage.local['profile.user.v1']` access scoped to `packages/core/src/profile/userProfile.ts`. All other code uses `getUserProfile()` / `setUserProfile()`.
```

- [ ] **Step 5: Commit**

```bash
git add eslint.config.js docs/AGENTS.md
git commit -m "feat(lint): no-direct-profile-storage rule scopes profile.user.v1 to userProfile.ts"
```

---

### Task 10: Add brief.morning + brief.eod prompt files + routing rows

**Files:**

- Create: `packages/core/src/prompts/brief.morning.md`
- Create: `packages/core/src/prompts/brief.eod.md`
- Modify: `packages/core/src/prompts/routing.ts`

- [ ] **Step 1: Create `brief.morning.md`**

```markdown
You are Compass, a calm morning briefing for one user. Generate a concise day-ahead briefing in JSON matching the schema provided.

Voice: warm, succinct, never lecturing. Two-to-three-sentence TLDR. No false certainty. If a field has no real data, return an empty array or null — do NOT invent meetings, tasks, or goals.

Inputs you receive include the user's local time, weather, and a 14-day focus summary. Calendar, tasks, and goals will arrive in later phases — for those, leave arrays empty.

If `avgInterruptPerSession` is 0 and `totalFocusMin` is non-zero, do not infer "flawless focus" — the metric is not yet captured.

Write in {{locale}}. Today is {{dateLocal}} ({{dayOfWeek}}). Local time is {{nowHHMM}}.
```

- [ ] **Step 2: Create `brief.eod.md`**

```markdown
You are Compass, a calm end-of-day reflection for one user. Generate a concise reflection in JSON matching the EodReflectionSchema.

Voice: warm, gentle, non-judgmental. No moralizing. Reflect on what actually happened today — what completed, what slipped, any pattern worth noting. End with a single concrete commitment for tomorrow and a short journal prompt the user can riff on.

Inputs include today's morning brief (what the user planned for) and today's completed Pomodoros (what actually happened). Calendar events and goal progress arrive in later phases — leave related fields empty when absent.

Write in {{locale}}. Today is {{dateLocal}} ({{dayOfWeek}}). Local time is {{nowHHMM}}.
```

- [ ] **Step 3: Read `routing.ts` and add two rows**

```bash
cat packages/core/src/prompts/routing.ts
```

Append (or add to the routes array) two new rows:

```ts
{
  taskId: 'brief.morning',
  models: {
    openrouter: 'anthropic/claude-sonnet-4-6',
    openai: 'gpt-5.4-mini',
    anthropic: 'claude-sonnet-4-6',
  },
  reasoningEffort: 'low',
  maxOutputTokens: 800,
  cacheable: true,
  temperature: 0.4,
},
{
  taskId: 'brief.eod',
  models: {
    openrouter: 'anthropic/claude-sonnet-4-6',
    openai: 'gpt-5.4-mini',
    anthropic: 'claude-sonnet-4-6',
  },
  reasoningEffort: 'low',
  maxOutputTokens: 600,
  cacheable: true,
  temperature: 0.5,
},
```

Adapt model strings if the routing convention uses different names than these placeholders. The existing `system.ping` row in the same file is your style reference.

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter @compass/core typecheck
```

Expected: clean. If the `taskId` type is a literal union, you may need to extend it — read the schema near the top of `routing.ts` and adapt.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/prompts/brief.morning.md packages/core/src/prompts/brief.eod.md packages/core/src/prompts/routing.ts
git commit -m "feat(core): brief.morning + brief.eod prompts + routing table rows"
```

---

### Task 11: TDD `generateMorningBrief` agent

**Files:**

- Create: `packages/agents/src/brief.morning.ts`
- Create: `packages/agents/src/brief.morning.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/agents/src/brief.morning.test.ts`:

```ts
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
  it('builds snapshot with empty arrays for deferred Phase 4-5 fields', async () => {
    const deps = baseDeps();
    await generateMorningBrief(deps);
    const call = (deps.router.executeTask as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(call).toBeDefined();
    // Check snapshot in the user message — implementation detail; we assert via the agent return
  });

  it('returns the LLM output + cost + provider', async () => {
    const deps = baseDeps();
    const result = await generateMorningBrief(deps);
    expect(result.output).toEqual(fakeOutput);
    expect(result.providerUsed).toBeTruthy();
    expect(result.model).toBe('claude-sonnet-4-6');
    expect(result.costUsd).toBeGreaterThanOrEqual(0);
  });

  it('writes a cost ledger row', async () => {
    const deps = baseDeps();
    await generateMorningBrief(deps);
    expect(deps.costLedger.recordRow).toHaveBeenCalledTimes(1);
    const row = (deps.costLedger.recordRow as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(row).toMatchObject({
      feature: 'brief.morning',
      model: 'claude-sonnet-4-6',
      promptTok: 1000,
    });
  });

  it('reads focusSummary14d via the pomodoro repo', async () => {
    const deps = baseDeps();
    await generateMorningBrief(deps);
    expect(deps.pomodoroRepo.summarize14d).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run — verify it fails**

```bash
pnpm --filter @compass/agents test -- brief.morning.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `brief.morning.ts`**

Create `packages/agents/src/brief.morning.ts`:

```ts
import type { BriefRepo, PomodoroRepo, CostLedgerRepo } from '@compass/db';
import type { UserProfile } from '@compass/core';
import { BriefingOutputSchema, BriefingInputsSchema } from '@compass/core';

// LlmRouter interface — minimal shape this agent needs.
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
  output: unknown; // BriefingOutputSchema-typed
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

function approxCostUsd(
  _provider: string,
  _model: string,
  usage: { promptTok: number; cachedTok: number; completionTok: number },
): number {
  // Rough estimate; PRD §6.5 has the canonical formula. For Phase 2 ship a coarse approximation.
  const inputCostPer1M = 3; // $3 per 1M input
  const outputCostPer1M = 15;
  return (usage.promptTok * inputCostPer1M + usage.completionTok * outputCostPer1M) / 1_000_000;
}

export async function generateMorningBrief(deps: MorningBriefDeps): Promise<MorningBriefResult> {
  const now = deps.now();
  const focus = await deps.pomodoroRepo.summarize14d(now);
  const weather = await deps.weatherRpc().catch(() => null);

  const dateLocal = now.toLocaleDateString('sv-SE', { timeZone: deps.userProfile.timezone }); // YYYY-MM-DD
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

  const costUsd = approxCostUsd('openrouter', res.model, res.usage);

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
```

If `BriefingOutputSchema` and `BriefingInputsSchema` aren't yet exported from `@compass/core`, add them to the core barrel — they're in `packages/core/src/schemas/` per PRD §8.3-8.4. If the file doesn't exist, create the schema in `packages/core/src/schemas/briefing.ts` matching PRD §8.4 verbatim and export from the barrel.

- [ ] **Step 4: Run — verify it passes**

```bash
pnpm --filter @compass/agents test -- brief.morning.test.ts
```

Expected: PASS — 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/agents/src/brief.morning.ts packages/agents/src/brief.morning.test.ts packages/core/src/schemas/briefing.ts
git commit -m "feat(agents): generateMorningBrief — snapshot + LLM call + cost ledger row"
```

(Adjust the `git add` to include any schema file you created.)

---

### Task 12: TDD `generateEodReflection` agent

**Files:**

- Create: `packages/agents/src/brief.eod.ts`
- Create: `packages/agents/src/brief.eod.test.ts`

This task mirrors Task 11's structure; reads today's morning brief from `BriefRepo` to feed as input. The output schema is `EodReflectionSchema` (different from `BriefingOutputSchema`).

- [ ] **Step 1: Write the failing test**

Create `packages/agents/src/brief.eod.test.ts` analogous to Task 11's test, with the additional assertion: when `briefRepo.getByDate(today, 'morning')` returns null, `generateEodReflection` throws an error with a `'no-morning-brief'` discriminator.

- [ ] **Step 2: Implement `brief.eod.ts`** — same pattern as `brief.morning.ts` but with the EOD prompt, EOD schema, and an early-throw for missing morning brief.

The full agent code is structurally identical to brief.morning.ts; the differences are:

- Reads morning brief: `const morning = await deps.briefRepo.getByDate(dateLocal, 'morning');` — throws if null with `Error('no-morning-brief')`.
- Adds `morningBrief: morning.output` and `completedToday: <pomodoros>` fields to the snapshot.
- Uses `EodReflectionSchema` for output validation.
- `feature: 'brief.eod'` in cost ledger row.
- System prompt from `brief.eod.md` (interpolated the same way).

- [ ] **Step 3: Commit**

```bash
git add packages/agents/src/brief.eod.ts packages/agents/src/brief.eod.test.ts
git commit -m "feat(agents): generateEodReflection — reads morning brief, produces reflection schema"
```

---

### Task 13: Export brief.morning + brief.eod from agents barrel; remove generateMorningBrief stub

**Files:**

- Modify: `packages/agents/src/index.ts`
- Delete: `packages/agents/src/stubs/generateMorningBrief.ts`
- Delete: `packages/agents/src/stubs/generateMorningBrief.test.ts`
- Modify: `packages/agents/src/stubs/index.ts`

- [ ] **Step 1: Add new exports to package barrel**

```bash
cat packages/agents/src/index.ts
```

Replace with:

```ts
export {
  generateMorningBrief,
  type MorningBriefDeps,
  type MorningBriefResult,
} from './brief.morning';
export {
  generateEodReflection,
  type EodReflectionDeps,
  type EodReflectionResult,
} from './brief.eod';
export * as stubs from './stubs/index.js';
```

- [ ] **Step 2: Drop generateMorningBrief from the stubs barrel**

Read `packages/agents/src/stubs/index.ts` and remove the `generateMorningBrief` export.

- [ ] **Step 3: Delete the stub files**

```bash
git rm packages/agents/src/stubs/generateMorningBrief.ts packages/agents/src/stubs/generateMorningBrief.test.ts
```

- [ ] **Step 4: Typecheck + run tests**

```bash
pnpm --filter @compass/agents typecheck
pnpm --filter @compass/agents test
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add packages/agents/src/index.ts packages/agents/src/stubs/index.ts
git commit -m "feat(agents): export brief.morning + brief.eod; remove generateMorningBrief stub"
```

---

### Task 14: Refactor alarms scheduler `defaults.ts` to async + UserProfile-backed

**Files:**

- Modify: `packages/integrations/src/scheduling/defaults.ts`
- Modify: any consumers in `scheduler.ts` (Task 15) — separate task

- [ ] **Step 1: Replace `defaults.ts` body**

```ts
import { getUserProfile } from '@compass/core';

export async function getBriefingHour(): Promise<number> {
  return (await getUserProfile()).briefingHour;
}

export async function getReflectionHour(): Promise<number> {
  return (await getUserProfile()).reflectionHour;
}
```

The existing `BRIEFING_HOUR` and `REFLECTION_HOUR` constants are removed (no consumers after Task 15).

- [ ] **Step 2: Typecheck — expect breakage in scheduler.ts**

```bash
pnpm --filter @compass/integrations typecheck
```

Expected: FAIL with errors in `scheduler.ts` because `BRIEFING_HOUR` and `REFLECTION_HOUR` are no longer exported. This is fine — Task 15 fixes scheduler.ts.

- [ ] **Step 3: Commit (intentional fail-forward)**

```bash
git add packages/integrations/src/scheduling/defaults.ts
git commit -m "refactor(integrations): defaults async getters reading UserProfile (scheduler.ts fix in next commit)"
```

---

### Task 15: Update scheduler.ts `computeDesired()` to async + handlers.ts to dispatch brief.morning / brief.eod

**Files:**

- Modify: `packages/integrations/src/scheduling/scheduler.ts`
- Modify: `packages/integrations/src/scheduling/scheduler.test.ts`
- Modify: `packages/integrations/src/scheduling/handlers.ts`
- Modify: `packages/integrations/src/scheduling/handlers.test.ts`

- [ ] **Step 1: Update `scheduler.ts`**

Replace `computeDesired` with:

```ts
import { getBriefingHour, getReflectionHour } from './defaults';

export async function computeDesired(): Promise<DesiredAlarm[]> {
  const [briefingHour, reflectionHour] = await Promise.all([
    getBriefingHour(),
    getReflectionHour(),
  ]);
  return [
    { name: 'morning-brief', when: nextOccurrenceAtHour(briefingHour) },
    { name: 'eod-reflection', when: nextOccurrenceAtHour(reflectionHour) },
  ];
}
```

`ensureAlarms()` was already async; the only change is `await computeDesired()` instead of the sync call.

- [ ] **Step 2: Update `scheduler.test.ts` for async `computeDesired`**

Existing tests call `computeDesired()` synchronously. Add `await` to every call site. Also: the tests previously used `Date(2026, 4, 9, 6, 0, 0)` with vi.setSystemTime — those still work; just the call needs awaiting.

The mocks in the existing test setup likely import `BRIEFING_HOUR` / `REFLECTION_HOUR` directly. Replace those imports with mocks of `getBriefingHour` / `getReflectionHour` returning literal numbers (8, 18).

- [ ] **Step 3: Update `handlers.ts`**

Replace the body of `registerAlarmHandlers` with:

```ts
export function registerAlarmHandlers(events: AlarmEvents = defaultEvents()): void {
  events.addListener((alarm) => {
    if (alarm.name === 'morning-brief') {
      void withHeavyDocAlive(() => rpc('brief.morning', { trigger: 'alarm' }));
    } else if (alarm.name === 'eod-reflection') {
      void withHeavyDocAlive(() => rpc('brief.eod', { trigger: 'alarm' }));
    }
    // Unknown alarm names: drop silently.
  });
}
```

- [ ] **Step 4: Update `handlers.test.ts`**

The existing tests assert `rpc('system.ping', { utterance: alarm.name })` was called. Update to assert:

- `morning-brief` alarm → `rpc('brief.morning', { trigger: 'alarm' })`
- `eod-reflection` alarm → `rpc('brief.eod', { trigger: 'alarm' })`
- Unknown alarm → no rpc call

- [ ] **Step 5: Run all integrations tests**

```bash
pnpm --filter @compass/integrations test
pnpm --filter @compass/integrations typecheck
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add packages/integrations/src/scheduling/scheduler.ts packages/integrations/src/scheduling/scheduler.test.ts packages/integrations/src/scheduling/handlers.ts packages/integrations/src/scheduling/handlers.test.ts
git commit -m "refactor(integrations): scheduler async + handlers dispatch brief.morning / brief.eod"
```

---

### Task 16: Wire `alarms.refresh` SW route in background.ts

**Files:**

- Modify: `apps/extension/entrypoints/background.ts`

- [ ] **Step 1: Add the `alarms.refresh` route handler in the SW message bridge**

Read the current background.ts:

```bash
cat apps/extension/entrypoints/background.ts
```

Add an additional message handler check for `alarms.refresh`:

```ts
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.kind === 'rpc.request' && msg?.route === 'alarms.refresh') {
    void ensureAlarms().then(() => sendResponse({ ok: true }));
    return true; // async response
  }
  if (msg?.kind === 'rpc.request') {
    void ensureHeavyDoc();
    return false;
  }
  return false;
});
```

- [ ] **Step 2: Typecheck + build**

```bash
pnpm --filter @compass/extension typecheck
pnpm --filter @compass/extension build
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/extension/entrypoints/background.ts
git commit -m "feat(extension): SW handles alarms.refresh route by calling ensureAlarms"
```

---

### Task 17: Add 11 RPC route types to `packages/runtime/src/routes.ts`

**Files:**

- Modify: `packages/runtime/src/routes.ts`

- [ ] **Step 1: Add the route entries**

Read the current Routes interface:

```bash
cat packages/runtime/src/routes.ts | head -60
```

Add 11 new entries to the Routes interface (preserving existing routes):

```ts
'brief.morning': {
  req: { trigger: 'alarm' | 'manual' | 'catchup'; force?: boolean };
  res: { stored: StoredBriefing } | { skipped: 'locked' | 'too-early' };
};
'brief.eod': {
  req: { trigger: 'alarm' | 'manual'; force?: boolean };
  res: { stored: StoredBriefing } | { skipped: 'locked' | 'no-morning-brief' };
};
'brief.getOrGenerate': {
  req: { kind: 'morning' | 'eod' };
  res:
    | { kind: 'have-brief'; brief: StoredBriefing }
    | { kind: 'locked-no-brief' }
    | { kind: 'too-early'; readyAt: string }
    | { kind: 'generating' };
};
'brief.recordOpen': { req: { dateLocal: string; kind: 'morning' | 'eod' }; res: { ok: true } };
'brief.recordRating': { req: { dateLocal: string; kind: 'morning' | 'eod'; rating: -1 | 1 }; res: { ok: true } };
'brief.streak': { req: Record<string, never>; res: { days: number; lastDate: string | null } };
'pomodoro.start': { req: { id: string; durationMin: number; theme?: string }; res: { ok: true } };
'pomodoro.complete': { req: { id: string }; res: { ok: true } };
'pomodoro.abandon': { req: { id: string }; res: { ok: true } };
'alarms.refresh': { req: Record<string, never>; res: { ok: true } };
```

Add the import for `StoredBriefing`:

```ts
import type { StoredBriefing } from '@compass/db';
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @compass/runtime typecheck
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add packages/runtime/src/routes.ts
git commit -m "feat(runtime): declare 11 new RPC routes for brief, pomodoro, alarms.refresh"
```

---

### Task 18: TDD offscreen handlers for brief.\* routes

**Files:**

- Modify: `apps/extension/entrypoints/offscreen/main.ts`
- Test: integration test in Task 32 covers these end-to-end

This task wires 6 brief.\* handlers in offscreen/main.ts. They depend on the agents from Tasks 11-12, the repos from Tasks 3-5, and `getActiveCredentials` from Phase 1.5.

- [ ] **Step 1: Inspect offscreen/main.ts to see the registration pattern**

```bash
cat apps/extension/entrypoints/offscreen/main.ts | head -80
```

Existing `registry.register('system.ping', ...)` and `registry.register('llm.validateKey', ...)` are your reference patterns.

- [ ] **Step 2: Add the 6 brief.\* registrations**

After the existing routes, add:

```ts
import { generateMorningBrief, generateEodReflection } from '@compass/agents';
import { createBriefRepo, createPomodoroRepo, createCostLedgerRepo } from '@compass/db';
import { getUserProfile } from '@compass/core';

// At handler-time, instantiate repos via the offscreen-shared db.
async function getBriefRepo() {
  return createBriefRepo(await getDb());
}
async function getPomodoroRepo() {
  return createPomodoroRepo(await getDb());
}
async function getCostLedger() {
  return createCostLedgerRepo(await getDb());
}

function todayLocalIso(timezone: string): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: timezone });
}

registry.register('brief.morning', async ({ trigger: _t, force }) => {
  const briefRepo = await getBriefRepo();
  const profile = await getUserProfile();
  const today = todayLocalIso(profile.timezone);

  if (!force) {
    const existing = await briefRepo.getByDate(today, 'morning');
    if (existing) return { stored: existing };
  }

  try {
    await getActiveCredentials();
  } catch (e) {
    if (e instanceof LlmCredentialsLocked) return { skipped: 'locked' };
    throw e;
  }

  const result = await generateMorningBrief({
    briefRepo,
    pomodoroRepo: await getPomodoroRepo(),
    weatherRpc: () =>
      rpc('weather.getCurrent', {
        /* …user profile coords… */
      }) as never,
    router: { executeTask: callWithSchemaThroughRouter } as never, // adapter — real impl per @compass/llm executeTask
    costLedger: await getCostLedger(),
    now: () => new Date(),
    userProfile: profile,
  });

  const stored: StoredBriefing = {
    dateLocal: today,
    kind: 'morning',
    generatedAt: new Date().toISOString(),
    output: result.output,
    openedAt: null,
    userRating: null,
    providerUsed: result.providerUsed,
    costUsd: result.costUsd,
  };
  await briefRepo.upsert(stored);
  return { stored };
});

registry.register('brief.eod', async ({ trigger: _t, force }) => {
  const briefRepo = await getBriefRepo();
  const profile = await getUserProfile();
  const today = todayLocalIso(profile.timezone);

  if (!force) {
    const existing = await briefRepo.getByDate(today, 'eod');
    if (existing) return { stored: existing };
  }

  // EOD requires morning brief
  const morning = await briefRepo.getByDate(today, 'morning');
  if (!morning) return { skipped: 'no-morning-brief' };

  try {
    await getActiveCredentials();
  } catch (e) {
    if (e instanceof LlmCredentialsLocked) return { skipped: 'locked' };
    throw e;
  }

  const result = await generateEodReflection({
    briefRepo,
    pomodoroRepo: await getPomodoroRepo(),
    router: { executeTask: callWithSchemaThroughRouter } as never,
    costLedger: await getCostLedger(),
    now: () => new Date(),
    userProfile: profile,
  } as never);

  const stored: StoredBriefing = {
    dateLocal: today,
    kind: 'eod',
    generatedAt: new Date().toISOString(),
    output: result.output,
    openedAt: null,
    userRating: null,
    providerUsed: result.providerUsed,
    costUsd: result.costUsd,
  };
  await briefRepo.upsert(stored);
  return { stored };
});

registry.register('brief.getOrGenerate', async ({ kind }) => {
  const briefRepo = await getBriefRepo();
  const profile = await getUserProfile();
  const today = todayLocalIso(profile.timezone);

  const existing = await briefRepo.getByDate(today, kind);
  if (existing) return { kind: 'have-brief' as const, brief: existing };

  const targetHour = kind === 'morning' ? profile.briefingHour : profile.reflectionHour;
  if (new Date().getHours() < targetHour) {
    const next = new Date();
    next.setHours(targetHour, 0, 0, 0);
    if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
    return { kind: 'too-early' as const, readyAt: next.toISOString() };
  }

  // Inline generate (catch-up path).
  if (kind === 'morning') {
    const sub = await registry.dispatch('brief.morning', { trigger: 'catchup' });
    if ('skipped' in sub && sub.skipped === 'locked') return { kind: 'locked-no-brief' as const };
    return { kind: 'have-brief' as const, brief: (sub as { stored: StoredBriefing }).stored };
  } else {
    const sub = await registry.dispatch('brief.eod', { trigger: 'manual' });
    if ('skipped' in sub) {
      if (sub.skipped === 'locked') return { kind: 'locked-no-brief' as const };
      // 'no-morning-brief' — surface as locked-no-brief from the drawer's POV (user can't act on EOD without morning)
      return { kind: 'locked-no-brief' as const };
    }
    return { kind: 'have-brief' as const, brief: (sub as { stored: StoredBriefing }).stored };
  }
});

registry.register('brief.recordOpen', async ({ dateLocal, kind }) => {
  const briefRepo = await getBriefRepo();
  await briefRepo.recordOpen(dateLocal, kind, new Date().toISOString());
  return { ok: true as const };
});

registry.register('brief.recordRating', async ({ dateLocal, kind, rating }) => {
  const briefRepo = await getBriefRepo();
  await briefRepo.recordRating(dateLocal, kind, rating);
  return { ok: true as const };
});

registry.register('brief.streak', async () => {
  const briefRepo = await getBriefRepo();
  const status = await briefRepo.recentOpenStatus(60);
  let days = 0;
  let lastDate: string | null = null;
  for (const day of status) {
    if (day.opened) {
      days++;
      if (lastDate === null) lastDate = day.dateLocal;
    } else {
      break; // streak broken
    }
  }
  return { days, lastDate };
});
```

The `callWithSchemaThroughRouter` adapter wires the real `executeTask` from `@compass/llm` — read `packages/llm/src/router.ts` to see the actual signature and adapt. The `weatherRpc` placeholder needs to call `rpc('weather.getCurrent', { lat, lon })` with stored coords (which Phase 1.6 set up in shell store; if not yet captured, pass null and let the agent's `.catch(() => null)` handle it).

- [ ] **Step 3: Build to verify it compiles**

```bash
pnpm --filter @compass/extension build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/extension/entrypoints/offscreen/main.ts
git commit -m "feat(extension): offscreen handlers for brief.* RPC routes"
```

---

### Task 19: TDD offscreen handlers for pomodoro.\* routes

**Files:**

- Modify: `apps/extension/entrypoints/offscreen/main.ts`

- [ ] **Step 1: Add the 3 pomodoro handlers**

In offscreen/main.ts, add:

```ts
registry.register('pomodoro.start', async ({ id, durationMin, theme }) => {
  const repo = await getPomodoroRepo();
  await repo.start({ id, durationMin, theme });
  return { ok: true as const };
});

registry.register('pomodoro.complete', async ({ id }) => {
  const repo = await getPomodoroRepo();
  await repo.complete(id);
  return { ok: true as const };
});

registry.register('pomodoro.abandon', async ({ id }) => {
  const repo = await getPomodoroRepo();
  await repo.abandon(id);
  return { ok: true as const };
});
```

- [ ] **Step 2: Build + commit**

```bash
pnpm --filter @compass/extension build
git add apps/extension/entrypoints/offscreen/main.ts
git commit -m "feat(extension): offscreen handlers for pomodoro.* RPC routes"
```

---

### Task 20: Wire `ledger.getMonthlySpend` to real CostLedgerRepo

**Files:**

- Modify: `apps/extension/entrypoints/offscreen/main.ts` (find existing `ledger.getMonthlySpend` registration)

- [ ] **Step 1: Replace the existing handler body**

The existing handler returns mocked `{ usd: 0, calls: 0 }`. Replace with:

```ts
registry.register('ledger.getMonthlySpend', async ({ monthStartIso }) => {
  const repo = await getCostLedger();
  return await repo.monthlySpend(monthStartIso);
});
```

- [ ] **Step 2: Build + commit**

```bash
pnpm --filter @compass/extension build
git add apps/extension/entrypoints/offscreen/main.ts
git commit -m "feat(extension): ledger.getMonthlySpend reads from CostLedgerRepo"
```

---

### Task 21: TDD `briefStore` Zustand slice

**Files:**

- Create: `apps/extension/app/state/briefStore.ts`
- Create: `apps/extension/app/state/briefStore.test.ts`

- [ ] **Step 1: Write the failing test**

Create `briefStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useBriefStore } from './briefStore';

describe('briefStore', () => {
  beforeEach(() => {
    useBriefStore.setState({
      morning: { kind: 'loading' },
      eod: { kind: 'loading' },
    });
  });

  it('setMorning updates the morning slice', () => {
    useBriefStore.getState().setMorning({ kind: 'too-early', readyAt: '2026-05-10T08:00:00Z' });
    expect(useBriefStore.getState().morning).toEqual({
      kind: 'too-early',
      readyAt: '2026-05-10T08:00:00Z',
    });
  });

  it('setEod updates the eod slice', () => {
    useBriefStore.getState().setEod({ kind: 'locked-no-brief' });
    expect(useBriefStore.getState().eod.kind).toBe('locked-no-brief');
  });

  it('reset returns both slices to loading', () => {
    useBriefStore.getState().setMorning({ kind: 'locked-no-brief' });
    useBriefStore.getState().reset();
    expect(useBriefStore.getState().morning.kind).toBe('loading');
    expect(useBriefStore.getState().eod.kind).toBe('loading');
  });
});
```

- [ ] **Step 2: Implement `briefStore.ts`**

```ts
import { create } from 'zustand';
import type { StoredBriefing } from '@compass/db';

export type BriefState =
  | { kind: 'loading' }
  | { kind: 'have-brief'; brief: StoredBriefing }
  | { kind: 'locked-no-brief' }
  | { kind: 'too-early'; readyAt: string }
  | { kind: 'error'; message: string };

interface BriefStore {
  morning: BriefState;
  eod: BriefState;
  setMorning: (s: BriefState) => void;
  setEod: (s: BriefState) => void;
  reset: () => void;
}

export const useBriefStore = create<BriefStore>((set) => ({
  morning: { kind: 'loading' },
  eod: { kind: 'loading' },
  setMorning: (s) => set({ morning: s }),
  setEod: (s) => set({ eod: s }),
  reset: () => set({ morning: { kind: 'loading' }, eod: { kind: 'loading' } }),
}));
```

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter @compass/extension test -- briefStore.test.ts
git add apps/extension/app/state/briefStore.ts apps/extension/app/state/briefStore.test.ts
git commit -m "feat(extension): briefStore Zustand slice for shared brief state"
```

---

### Task 22: TDD `useBrief` hook

**Files:**

- Create: `apps/extension/app/hooks/useBrief.ts`
- Create: `apps/extension/app/hooks/useBrief.test.ts`

- [ ] **Step 1: Write the failing test**

Create the test asserting:

- On mount, calls `rpc('brief.getOrGenerate', { kind })`.
- Updates the briefStore with the returned state.
- `regenerate()` calls `rpc('brief.morning', { trigger: 'manual', force: true })`.
- `recordOpen()` calls `rpc('brief.recordOpen', ...)`.
- `recordRating(1)` calls `rpc('brief.recordRating', ...)` with rating 1.

(Spec full code for the test mirrors Phase 1.5 patterns; adapt from the `useUnlockState` hook test if one exists, otherwise use the `KeyValidator` test as a reference for `vi.mock('@compass/runtime', ...)`.)

- [ ] **Step 2: Implement `useBrief.ts`**

```ts
import { useEffect, useCallback } from 'react';
import { rpc } from '@compass/runtime';
import { useBriefStore, type BriefState } from '../state/briefStore';
import type { StoredBriefing } from '@compass/db';

export function useBrief(kind: 'morning' | 'eod' = 'morning'): {
  state: BriefState;
  regenerate: () => Promise<void>;
  recordOpen: () => Promise<void>;
  recordRating: (r: -1 | 1) => Promise<void>;
} {
  const state = useBriefStore((s) => (kind === 'morning' ? s.morning : s.eod));
  const set = useBriefStore((s) => (kind === 'morning' ? s.setMorning : s.setEod));

  useEffect(() => {
    let cancelled = false;
    void rpc('brief.getOrGenerate', { kind })
      .then((res) => {
        if (cancelled) return;
        if (res.kind === 'have-brief') set({ kind: 'have-brief', brief: res.brief });
        else if (res.kind === 'too-early') set({ kind: 'too-early', readyAt: res.readyAt });
        else if (res.kind === 'locked-no-brief') set({ kind: 'locked-no-brief' });
        else set({ kind: 'loading' });
      })
      .catch((e) => {
        if (cancelled) return;
        set({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [kind, set]);

  const regenerate = useCallback(async () => {
    set({ kind: 'loading' });
    const route = kind === 'morning' ? 'brief.morning' : 'brief.eod';
    const res = await rpc(route, { trigger: 'manual', force: true });
    if ('stored' in res) set({ kind: 'have-brief', brief: res.stored });
    else if ('skipped' in res) set({ kind: 'locked-no-brief' });
  }, [kind, set]);

  const recordOpen = useCallback(async () => {
    if (state.kind !== 'have-brief') return;
    await rpc('brief.recordOpen', { dateLocal: state.brief.dateLocal, kind });
    set({ kind: 'have-brief', brief: { ...state.brief, openedAt: new Date().toISOString() } });
  }, [kind, state, set]);

  const recordRating = useCallback(
    async (r: -1 | 1) => {
      if (state.kind !== 'have-brief') return;
      await rpc('brief.recordRating', { dateLocal: state.brief.dateLocal, kind, rating: r });
      set({ kind: 'have-brief', brief: { ...state.brief, userRating: r } });
    },
    [kind, state, set],
  );

  return { state, regenerate, recordOpen, recordRating };
}
```

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter @compass/extension test -- useBrief.test.ts
git add apps/extension/app/hooks/useBrief.ts apps/extension/app/hooks/useBrief.test.ts
git commit -m "feat(extension): useBrief hook backed by briefStore + RPC"
```

---

### Task 23: TDD `DailyTimesSection`

**Files:**

- Create: `apps/extension/app/drawers/profile/DailyTimesSection.tsx`
- Create: `apps/extension/app/drawers/profile/DailyTimesSection.test.tsx`

- [ ] **Step 1: Write the failing test** asserting:
- Renders briefingHour + reflectionHour + workHours pickers + read-only timezone/locale.
- Editing briefingHour calls `setUserProfile({ briefingHour })`.
- jest-axe clean.

- [ ] **Step 2: Implement** the section per spec §3.6.1, with inline `<HourPicker>` and `<TimePicker>` (each ~10 lines) wrapping `<select>` and `<input type="time">`.

- [ ] **Step 3: Add to ProfileDrawer.tsx orchestrator**

In `apps/extension/app/drawers/ProfileDrawer.tsx`, add the import and render between WeatherSection and ConnectedProvidersSection.

- [ ] **Step 4: Run + commit**

```bash
pnpm --filter @compass/extension test -- DailyTimesSection.test.tsx
git add apps/extension/app/drawers/profile/DailyTimesSection.tsx apps/extension/app/drawers/profile/DailyTimesSection.test.tsx apps/extension/app/drawers/ProfileDrawer.tsx
git commit -m "feat(extension): DailyTimesSection in ProfileDrawer with hour/time pickers"
```

---

### Task 24: Create Brief drawer sub-components (10 files)

**Files:** 10 new files under `apps/extension/app/drawers/brief/`

Implement each as a small (15-40 line) component:

- `BriefTLDR.tsx` — header + text
- `PomodorosSection.tsx` — list with empty-state "Suggested focus blocks land with Calendar in Phase 4."
- `WatchoutsSection.tsx` — pill list, hidden when empty
- `RecoverySection.tsx` — note + suggestBreak indicator, empty-state "Connect Fitbit/Whoop..."
- `QuotedGoalSection.tsx` — pull-quote, empty-state "Set goals to anchor your day. Coming with the Goals drawer."
- `BriefFooter.tsx` — provider/cost row + 👍/👎 + Regenerate button
- `EodReflectionView.tsx` — wins / dropped / patterns / tomorrowOneThing / journalPrompt
- `LockedEmpty.tsx` — "🔒 Your daily brief is waiting. Unlock to generate."
- `TooEarlyEmpty.tsx` — "Your morning brief will be ready at {readyAt time}."
- `ErrorEmpty.tsx` — error message + retry button

Each gets a tiny .test.tsx with render + axe assertions (combine into one shared test file `brief-sections.test.tsx` if more efficient).

- [ ] **Single commit at end:**

```bash
git add apps/extension/app/drawers/brief/
git commit -m "feat(extension): brief drawer sub-components with empty-state CTAs"
```

---

### Task 25: Rewrite `BriefDrawer.tsx`

**Files:**

- Modify: `apps/extension/app/drawers/BriefDrawer.tsx`

- [ ] **Step 1: Replace contents** with the version from spec §3.6.3:

```tsx
import { useEffect } from 'react';
import { useBrief } from '../hooks/useBrief';
import type { BriefingOutput } from '@compass/core';
import { BriefTLDR } from './brief/BriefTLDR';
import { PomodorosSection } from './brief/PomodorosSection';
// ... other imports

export function BriefDrawer() {
  // Decide morning vs eod based on current hour vs reflectionHour
  // For Phase 2 simplicity, default to 'morning'; if past reflectionHour and morning brief exists, switch.
  const morning = useBrief('morning');
  const eod = useBrief('eod');

  // Use morning by default; switch to eod if it's past reflectionHour AND eod is have-brief OR locked-no-brief OR error.
  const showEod =
    (eod.state.kind === 'have-brief' || eod.state.kind === 'error') &&
    morning.state.kind === 'have-brief';
  const useState = showEod ? eod : morning;

  useEffect(() => {
    if (useState.state.kind === 'have-brief' && useState.state.brief.openedAt === null) {
      void useState.recordOpen();
    }
  }, [useState.state, useState.recordOpen]);

  // ... render switch on state.kind per spec
}
```

- [ ] **Step 2: Run + commit**

```bash
pnpm --filter @compass/extension test -- BriefDrawer.test.tsx
pnpm --filter @compass/extension typecheck
git add apps/extension/app/drawers/BriefDrawer.tsx
git commit -m "feat(extension): BriefDrawer rewrite with useBrief + 5 state branches"
```

---

### Task 26: Wire Hero to useBrief

**Files:**

- Modify: `apps/extension/app/components/Hero.tsx`

- [ ] **Step 1: Replace MOCK.brief.tldr usage**

```tsx
import { useBrief } from '../hooks/useBrief';
import type { BriefingOutput } from '@compass/core';

export function Hero() {
  const { state } = useBrief('morning');
  const tldr =
    state.kind === 'have-brief'
      ? (state.brief.output as BriefingOutput).tldr
      : state.kind === 'too-early'
        ? 'Your morning brief will be ready at 8 AM.'
        : state.kind === 'locked-no-brief'
          ? '🔒 Your daily brief is waiting. Unlock to generate.'
          : '';
  // ...existing layout, swap MOCK reference for tldr
}
```

- [ ] **Step 2: Update or add Hero.test.tsx**

Test the four state branches.

- [ ] **Step 3: Commit**

```bash
git add apps/extension/app/components/Hero.tsx apps/extension/app/components/Hero.test.tsx
git commit -m "feat(extension): Hero TLDR sources from useBrief"
```

---

### Task 27: Wire Ticker to useBrief + brief.streak

**Files:**

- Modify: `apps/extension/app/components/Ticker.tsx`
- Modify: `apps/extension/app/components/Ticker.test.tsx`

- [ ] **Step 1: Add streak fetch + watchouts pills**

```tsx
import { useEffect, useState } from 'react';
import { rpc } from '@compass/runtime';
import { useBrief } from '../hooks/useBrief';

export function Ticker() {
  const { state } = useBrief('morning');
  const [streak, setStreak] = useState({ days: 0, lastDate: null as string | null });
  useEffect(() => {
    void rpc('brief.streak', {}).then(setStreak);
  }, []);

  const watchouts =
    state.kind === 'have-brief' ? (state.brief.output as { watchouts: string[] }).watchouts : [];

  return (
    <TickerStrip>
      {/* existing date/weather chips */}
      {streak.days > 0 && <StreakChip days={streak.days} />}
      {watchouts.map((w, i) => (
        <WatchoutChip key={i} text={w} />
      ))}
    </TickerStrip>
  );
}
```

- [ ] **Step 2: Update Ticker.test.tsx** — assert streak chip shows when days > 0; watchout chips render when state has them.

- [ ] **Step 3: Commit**

```bash
git add apps/extension/app/components/Ticker.tsx apps/extension/app/components/Ticker.test.tsx
git commit -m "feat(extension): Ticker streak + watchouts from useBrief"
```

---

### Task 28: Wire FocusDrawer Pomodoro lifecycle

**Files:**

- Modify: `apps/extension/app/drawers/FocusDrawer.tsx`
- Modify: `apps/extension/app/drawers/FocusDrawer.test.tsx`

- [ ] **Step 1: Add RPC calls on lifecycle transitions**

```tsx
import { rpc } from '@compass/runtime';

// In the component:
const startPomo = async () => {
  const id = crypto.randomUUID();
  await rpc('pomodoro.start', { id, durationMin: 25, theme: themeInput });
  setActiveId(id);
  setRunning(true);
};

const onCountdownEnd = async () => {
  if (activeId) await rpc('pomodoro.complete', { id: activeId });
  setRunning(false);
  setActiveId(null);
};

const onAbandon = async () => {
  if (activeId) await rpc('pomodoro.abandon', { id: activeId });
  setRunning(false);
  setActiveId(null);
};
```

Add a `<input>` for theme above the start button.

- [ ] **Step 2: Update tests** — mock `rpc` and assert calls fire on each transition.

- [ ] **Step 3: Commit**

```bash
git add apps/extension/app/drawers/FocusDrawer.tsx apps/extension/app/drawers/FocusDrawer.test.tsx
git commit -m "feat(extension): FocusDrawer wires pomodoro.* RPC on lifecycle transitions"
```

---

### Task 29: Integration test — brief pipeline

**Files:**

- Create: `tests/integration/brief-pipeline.test.ts`

- [ ] **Step 1: Write 7 scenarios** per spec §4.2:

1. Cold start, alarm, key configured → brief stored.
2. Alarm fires while creds locked → `{ skipped: 'locked' }`.
3. Catch-up before briefingHour → `{ kind: 'too-early' }`.
4. Manual regenerate after success → second `brief.morning` with `force: true` overwrites.
5. EOD requires morning brief.
6. focusSummary14d shape — 20 fixture rows.
7. UserProfile change reschedules alarms.

Use in-memory sqlite + mocked router + mocked chrome.alarms (same patterns as Phase 1.5 alarms).

- [ ] **Step 2: Run + commit**

```bash
pnpm vitest run tests/integration/brief-pipeline.test.ts
git add tests/integration/brief-pipeline.test.ts
git commit -m "test(integration): brief-pipeline 7 scenarios"
```

---

### Task 30: E2E — daily-agent.spec.ts

**Files:**

- Create: `apps/extension/tests/e2e/daily-agent.spec.ts`

- [ ] **Step 1: Write 3 tests** per spec §4.3:

1. Brief generation via DailyTimesSection edit + reload.
2. Locked → unlock → regenerate.
3. Pomodoro lifecycle persists across tab close.

Env-key gated like Phase 1.5 settings tests. Skipped locally if no display.

- [ ] **Step 2: Commit**

```bash
git add apps/extension/tests/e2e/daily-agent.spec.ts
git commit -m "test(e2e): daily-agent — brief generation, locked/unlock, pomodoro lifecycle"
```

---

### Task 31: Eval suite placeholder

**Files:**

- Create: `tests/prompt-eval/brief.morning.yaml`

- [ ] **Step 1: Add 3 fixture days**

```yaml
description: Brief.morning eval suite (Phase 2 placeholder)
prompts:
  - file://../../packages/core/src/prompts/brief.morning.md
providers:
  - openrouter:anthropic/claude-sonnet-4-6
tests:
  - description: No data — fresh install
    vars:
      snapshot: { /* minimal snapshot — empty arrays */ }
    assert:
      - type: is-json
      - type: javascript
        value: 'output.pomodoros.length === 0 && output.recovery.note === ""'
  - description: Partial data — weather only
    vars:
      snapshot: { /* with weather */ }
    assert:
      - type: is-json
  - description: Partial data — focus trend declining
    vars:
      snapshot: { /* focusSummary with declining trend */ }
    assert:
      - type: is-json
      - type: contains-any
        value: ['focus', 'declining', 'last week']
```

- [ ] **Step 2: Commit**

```bash
git add tests/prompt-eval/brief.morning.yaml
git commit -m "test(eval): brief.morning placeholder with 3 fixture days"
```

---

### Task 32: docs/architecture.md — Daily Agent subsection

**Files:**

- Modify: `docs/architecture.md`

- [ ] **Step 1: Insert subsection** between Scheduling and Settings + encrypted storage:

```markdown
## Daily Agent (`brief.morning` / `brief.eod`)

Phase 2 closes the alarm → LLM → drawer loop introduced by Phase 1.5 alarms.

**Module layout:**

- Agents at `packages/agents/src/brief.{morning,eod}.ts` orchestrate snapshot → router.executeTask → cost ledger row.
- Prompts at `packages/core/src/prompts/brief.{morning,eod}.md` with `{{locale}}`, `{{dateLocal}}`, `{{dayOfWeek}}`, `{{nowHHMM}}` interpolations.
- Storage in sqlite via `BriefRepo` (`packages/db/src/repositories/brief.ts`). Composite key `(date_local, kind)`.

**Trigger paths:**

- Alarm-driven: `chrome.alarms.onAlarm` → `withHeavyDocAlive(rpc('brief.morning'))`. Silent skip on `LlmCredentialsLocked`.
- Catch-up: new-tab mounts → `useBrief()` → `rpc('brief.getOrGenerate')`. Returns `have-brief` / `locked-no-brief` / `too-early`.
- Manual: Brief drawer Regenerate button → `rpc('brief.morning', { force: true })`.

**UserProfile-backed alarms:** scheduler `defaults.ts` async `getBriefingHour()` / `getReflectionHour()` reads from `chrome.storage.local['profile.user.v1']`. ProfileDrawer DailyTimesSection edits trigger `alarms.refresh` SW route → `ensureAlarms()`.

**Empty-state UX:** Phase 2 ships honestly sparse — calendar/Gmail/goals/Fitbit fields empty until Phase 4-5. Drawer template renders "Connect X to see Y" CTAs; LLM is told not to invent data.

**Phase 2 swap surface for later phases:**

- Phase 4 Calendar/Gmail/Goals → snapshot transformers in agents extend to populate the empty arrays.
- Phase 5 Fitbit → `RecoverySection` empty-state replaced.
- Promptfoo CI → `tests/prompt-eval/brief.morning.yaml` placeholder grows to 50 fixtures + ≥4/5 human rating gate.
```

- [ ] **Step 2: Commit**

```bash
git add docs/architecture.md
git commit -m "docs(architecture): document Phase 2 Daily Agent"
```

---

### Task 33: PRD §21 — mark Phase 2 Daily Agent slice closed

**Files:**

- Modify: `docs/prd.md`

- [ ] **Step 1: Update §21 Phase 2 row**

Find the existing `### Phase 2 — Daily Agent + Semantic Notes (6 weeks)` heading. Update to indicate the Daily Agent slice has shipped:

```markdown
### Phase 2 — Daily Agent + Semantic Notes (6 weeks; Daily Agent slice closed 2026-05-10 via PR #TBD; Semantic Notes pending)
```

(`#TBD` will be replaced after the PR opens; can be folded into a follow-up commit.)

- [ ] **Step 2: Commit**

```bash
git add docs/prd.md
git commit -m "docs(prd): Phase 2 Daily Agent slice closed"
```

---

### Task 34: Repo-wide green check

- [ ] **Step 1: Run all checks**

```bash
git status
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Expected: all green. Coverage on `packages/db/repositories/*` ≥95%, `packages/agents/brief.*` ≥90%, `packages/core/profile/*` 100%.

- [ ] **Step 2: Run integration test**

```bash
pnpm vitest run tests/integration/brief-pipeline.test.ts
```

Expected: 7 tests pass.

- [ ] **Step 3: Run e2e (if display available)**

```bash
pnpm --filter @compass/extension test:e2e -- daily-agent.spec.ts
```

Expected: 3 tests pass (env-key gated tests may skip).

- [ ] **Step 4: If anything fails, fix in a new commit on this branch — do not amend.**

---

### Task 35: Push branch + open PR

- [ ] **Step 1: Push the branch**

```bash
git push -u origin phase-2-daily-agent
```

- [ ] **Step 2: Open the PR** using the `pr` skill conventions

Title (under 70 chars): `feat: phase-2-daily-agent — real morning brief + EOD reflection`

Body: Summary + Manual smoke checklist + Test plan + Notes/follow-ups (the spec deviations + any deferred polish).

NO Claude attribution.

- [ ] **Step 3: Wait for CI**

All seven jobs (`lint`, `typecheck`, `test`, `build`, `gate:offline`, `gate:alarms`, `e2e (advisory)`) must be green before the user merges. Any failure → fix in a new commit, do not amend.

- [ ] **Step 4: Replace #TBD in PRD §21** with the actual PR number once known. Commit on this branch before merge, or as a follow-up patch.

---

## Definition of Done

This plan is complete when:

- [ ] All 35 tasks above are checked off
- [ ] All spec §6 DoD items are met (tracked in spec doc, mapped to tasks above)
- [ ] PR opened and awaiting user merge — never run `gh pr merge` directly
- [ ] Manual cross-browser smoke checklist (top of this plan) completed and pasted into PR description

---

## Future-sprint runways (informational — not in scope)

- **`phase-2-semantic-notes`** — Notes auto-link, RAG via sqlite-vec, ⌘K ask mode. Brief drawer unchanged.
- **Phase 3 — Personalization + Smart Blocker** — interrupt UX + `pomodoro.recordInterrupt` RPC; streak nudging UI; Personalization signals can read brief history (briefings.user_rating) for tuning.
- **Phase 4 — Calendar / Gmail / Goals** — Brief snapshot's `events`, `overdueTasks`, `activeGoals` populate; agent snapshot transformer extends; output schema unchanged; drawer empty-states replaced when arrays populate.
- **Phase 5 — Fitbit/Whoop** — Brief snapshot's `fitbit` field populates; `RecoverySection` empty-state replaced.
- **Promptfoo CI integration** — `tests/prompt-eval/brief.morning.yaml` grows from 3 fixtures to 50+ with human-rated ≥4/5 acceptance gate.
- **EOD browser-close trigger** — `chrome.runtime.onSuspend` (unreliable in MV3) — possible polish if telemetry shows EOD fires being missed.
