# Compass — Phase 2 Daily Agent Design

**Status:** Draft for review
**Date:** 2026-05-10
**Phase:** 2 (Daily Agent + Semantic Notes), workstream A — Daily Agent slice
**Branch:** `phase-2-daily-agent` cut off `master`
**Scope:** Replace mocked Brief drawer / Hero "Top of mind" / Ticker references with real LLM-generated morning briefs and EOD reflections; ship UserProfile persistence + DailyTimesSection in ProfileDrawer; swap the alarms scheduler from hardcoded `defaults.ts` to `getUserProfile()`; establish the project's first persistent data layer beyond credentials (sqlite migrations + repos for briefings, pomodoros, llm_cost_ledger). Semantic Notes (RAG, ⌘K ask, sqlite-vec) is a separate later workstream.

---

## 1. Purpose

Phase 2 ships in two workstreams; this is the first. Daily Agent picks up where Phase 1.5 alarms left off — the alarms scheduler currently dispatches `system.ping` and is waiting for `brief.morning` / `brief.eod` to plug in. Daily Agent:

1. Promotes `generateMorningBrief` from a stub to a real LLM-driven agent; adds a sibling `generateEodReflection`.
2. Establishes UserProfile persistence (chrome.storage.local) so the alarms scheduler reads user-edited `briefingHour` / `reflectionHour` instead of hardcoded constants.
3. Surfaces a "Daily times" section in ProfileDrawer letting users edit those hours.
4. Sets up sqlite-backed brief storage (first real `packages/db` migrations).
5. Ships an end-to-end alarm-fires-while-locked + catch-up + manual-regenerate UX so the daily brief degrades gracefully.
6. Wires Hero "Top of mind" and Ticker to the live brief output via a shared `useBrief()` hook.
7. Persists Pomodoro lifecycle so the brief input snapshot can include a real `focusSummary14d`.

After this lands, the Daily Agent slice of PRD §21 Phase 2 closes. Semantic Notes ships next as `phase-2-semantic-notes`.

## 2. Scope

### 2.1 In scope

#### Data layer (new sqlite migrations + repos)

- **First three real migrations** under `packages/db/src/migrations/`:
  - `0001-create-briefings.sql` — composite key `(date_local, kind)` since at most one of each `kind` per day.
  - `0002-create-pomodoros.sql` — UUID PK, `started_at`, `ended_at`, `duration_min`, `completed`, `interrupt_count` (always 0 in Phase 2; deferred UX), `theme`.
  - `0003-create-llm-cost-ledger.sql` — schema from PRD §5.7. Table previously declared in PRD but not yet in code.
- **New repositories** under `packages/db/src/repositories/`:
  - `BriefRepo` — `getByDate`, `upsert`, `recordOpen`, `recordRating`, `recentOpenStatus(daysBack)` for streak.
  - `PomodoroRepo` — `start`, `complete`, `abandon`, `summarize14d(now)` returning the PRD §8.3 `focusSummary14d` shape.
  - `CostLedgerRepo` — `recordRow`, `monthlySpend`. Replaces the mock backing of the existing `ledger.getMonthlySpend` route.
- **`packages/core/src/profile/userProfile.ts`** (new) — `getUserProfile()` (auto-creates default on first call and persists), `setUserProfile(patch)` (validates, writes, fires `alarms.refresh` if hours changed). Storage: `chrome.storage.local['profile.user.v1']`.
- **`no-direct-profile-storage` lint rule** — scopes `profile.user.v1` access to `userProfile.ts`. Documented in `docs/AGENTS.md`.

#### Agent layer

- **`packages/agents/src/brief.morning.ts`** (new) — promotes from `stubs/generateMorningBrief.ts`. Builds the snapshot (real Phase 2 inputs + empty arrays / null for deferred fields), calls the router with `BriefingOutputSchema`, writes a cost ledger row, returns `{ output, costUsd, providerUsed, model }`.
- **`packages/agents/src/brief.eod.ts`** (new) — sibling agent for EOD reflection. Reads today's morning brief from `BriefRepo`; produces `EodReflectionSchema` output. Fails fast with `{ skipped: 'no-morning-brief' }` if morning brief absent.
- **Stubs deleted** at end of workstream: `stubs/generateMorningBrief.ts` + `.test.ts`. Other stubs in `packages/agents/src/stubs/` remain until their respective phases land.
- **Two new prompt files** under `packages/core/src/prompts/`:
  - `brief.morning.md` — system prompt with `{{locale}}`, `{{dateLocal}}`, `{{dayOfWeek}}`, `{{nowHHMM}}` interpolations. Voice: warm, succinct, non-lecturing. Explicit "if a field has no real data, return an empty array or null — do NOT invent meetings/tasks/goals."
  - `brief.eod.md` — sibling. Reflective tone; receives today's morning brief + completed Pomodoros as context.
- **Routing table additions** in [packages/core/src/prompts/routing.ts](../../../packages/core/src/prompts/routing.ts) — two new rows:
  ```
  brief.morning  : claude-sonnet-4-6 / gpt-5.4-mini / claude-sonnet-4-6   reasoning=low cacheable=true temp=0.4 maxTokens=800
  brief.eod      : same model row    /              /                    reasoning=low cacheable=true temp=0.5 maxTokens=600
  ```
  Sonnet-tier (not haiku) because the brief is the user's daily touchpoint — reasoning quality matters more than latency. `cacheable: true` so the system prompt is cached across daily generations.
- **`trusted: true`** on these requests — brief inputs are user's own data, no untrusted content.

#### Alarms scheduler refactor

- **`defaults.ts` becomes async** — exports `getBriefingHour()` and `getReflectionHour()` that read from `getUserProfile()`. Constants `BRIEFING_HOUR` / `REFLECTION_HOUR` removed (no longer in use after this PR).
- **`scheduler.ts` `computeDesired()` becomes async** — `await Promise.all([getBriefingHour(), getReflectionHour()])`. Existing scheduler tests update accordingly.
- **`handlers.ts`** dispatches `rpc('brief.morning', { trigger: 'alarm' })` for `morning-brief` and `rpc('brief.eod', { trigger: 'alarm' })` for `eod-reflection`. `system.ping` dispatch removed. Unknown alarm names dropped silently.

#### RPC surface (11 new routes)

Added to [packages/runtime/src/routes.ts](../../../packages/runtime/src/routes.ts):

- `brief.morning` — generates today's morning brief; respects `force` for manual regenerate; returns `{ stored }` or `{ skipped: 'locked' | 'too-early' }`.
- `brief.eod` — generates EOD reflection; requires morning brief; returns `{ stored }` or `{ skipped: 'locked' | 'no-morning-brief' }`.
- `brief.getOrGenerate` — catch-up entrypoint called by new-tab on mount; returns `{ kind: 'have-brief' | 'locked-no-brief' | 'too-early' | 'generating' }`.
- `brief.recordOpen` — sets `opened_at`. Called by Brief drawer on first mount per day.
- `brief.recordRating` — sets `user_rating` to -1 or 1.
- `brief.streak` — returns `{ days, lastDate }` computed from `briefRepo.recentOpenStatus(60)`. Single sqlite query.
- `pomodoro.start` — inserts a row; idempotent on `id`.
- `pomodoro.complete` — sets `ended_at` + `completed = 1`.
- `pomodoro.abandon` — sets `ended_at`, leaves `completed = 0`.
- `alarms.refresh` — SW-side; calls `ensureAlarms()`. Triggered by `setUserProfile()` on hour changes.
- (`ledger.getMonthlySpend` already exists — Phase 2 wires it to `costLedger.monthlySpend()` instead of mock data; this is a behavior change, not a new route.)

#### UI surface

- **`apps/extension/app/drawers/profile/DailyTimesSection.tsx`** (new) — extracted alongside ConnectedProvidersSection / EncryptionSection. Hour pickers for `briefingHour` / `reflectionHour`; time pickers for `workHours.start` / `workHours.end` (wired but not consumed until Phase 4); read-only `timezone` and `locale`. Edits call `setUserProfile()`.
- **ProfileDrawer order**: Accent / Scene / Weather / **DailyTimes (NEW)** / ConnectedProviders / Encryption.
- **`apps/extension/app/hooks/useBrief.ts`** (new) — RPC-backed hook returning `{ state, regenerate, recordOpen, recordRating }`. Subscribes to a small Zustand store (`briefStore`) so Hero + Ticker + drawer share the same instance. Auto-refetches on lock-state transitions.
- **`apps/extension/app/state/briefStore.ts`** (new) — small Zustand slice; `kind: 'loading' | 'have-brief' | 'locked-no-brief' | 'too-early' | 'error'`, `brief: StoredBriefing | null`.
- **`apps/extension/app/drawers/BriefDrawer.tsx`** rewritten — replaces direct `MOCK.brief` reads with `useBrief('morning')`. Five state branches each with their own sub-component. EOD reflection at `reflectionHour` switches to `useBrief('eod')` and renders `EodReflectionView`.
- **`apps/extension/app/drawers/brief/`** (new folder) — section sub-components (`BriefTLDR`, `PomodorosSection`, `WatchoutsSection`, `RecoverySection`, `QuotedGoalSection`, `BriefFooter`, `EodReflectionView`, plus `LockedEmpty` / `TooEarlyEmpty` / `ErrorEmpty`). Each section renders Phase 2 empty-state CTAs ("Connect Calendar to see meetings.", "Connect Fitbit/Whoop to surface recovery insights.") when the corresponding output field is empty/null.
- **`apps/extension/app/components/Hero.tsx`** swaps `MOCK.brief.tldr` for `useBrief('morning')` — falls back to "Your morning brief will be ready at 8 AM." (`too-early`) or "🔒 Your daily brief is waiting. Unlock to generate." (`locked-no-brief`).
- **`apps/extension/app/components/Ticker.tsx`** swaps mock streak/watchouts for the real `useBrief()` watchouts and a `brief.streak`-fed StreakChip (only rendered when `days > 0`).
- **`apps/extension/app/drawers/FocusDrawer.tsx`** wires Pomodoro lifecycle to `pomodoro.start` / `complete` / `abandon` RPC routes. Adds a tiny "What are you working on?" theme input. No interrupt UX in Phase 2 (`interrupt_count` always 0).
- **`BriefFooter`** displays provider + cost row: `Generated by openrouter (claude-sonnet-4-6) at 8:00 AM · $0.0003`. 👍 / 👎 buttons + Regenerate button.

### 2.2 Out of scope (deferred)

- **Semantic Notes** — separate later workstream `phase-2-semantic-notes` (Notes auto-link, RAG via sqlite-vec, ⌘K ask mode).
- **Calendar / Gmail / Goals / Fitbit integrations** — Phase 4-5. Brief inputs for these stay null/empty in Phase 2; drawer renders empty-state CTAs.
- **Pomodoro `interrupt_count` UX** — deferred to Phase 3 (Personalization + Smart Blocker). Schema column ships but column always 0.
- **chrome.notifications on alarm-skip** — explicitly rejected (interruptive; Compass is a new-tab product, the new tab IS the notification surface).
- **Browser-close detection for EOD** — alarm + manual cover the use cases. PRD §8.2's "second trigger" is aspirational.
- **Streak nudges or visualization beyond Ticker pill** — Phase 3+ Personalization concern.
- **Catch-up brief generation while creds are locked** — surfaces "🔒 Unlock to generate" affordance instead.
- **Telemetry pipeline** — schema continues to ship per PRD §2.2 but no pipeline.
- **Eval suite full content** — `tests/prompt-eval/brief.morning.yaml` placeholder + 3 fixtures land Phase 2; full 50-fixture suite + ≥4/5 human rating gate (PRD §20.4) waits for promptfoo CI integration (separate follow-up).
- **`MOCK` fixture removal** — Phase 2 only removes the 3 surfaces it touches (Hero `tldr`, Ticker streak/watchouts, BriefDrawer body). Other surfaces (TodayDrawer, GoalsDrawer, NotesDrawer, InboxDrawer) keep MOCK references until their respective phases.

## 3. Architecture

### 3.1 Layer overview

Three tiers, clearly bounded:

1. **Data** in `packages/db/` (sqlite repos for briefings + pomodoros + cost ledger) and `packages/core/src/profile/` (chrome.storage.local for UserProfile).
2. **Agents** in `packages/agents/` — `brief.morning.ts` and `brief.eod.ts` orchestrate snapshot → LLM call (via `packages/llm/router`) → schema validation → repo write. Each owns one prompt file under `packages/core/src/prompts/`.
3. **UI** in `apps/extension/app/` — `useBrief()` hook (RPC-backed, Zustand-shared) feeds Brief drawer + Hero + Ticker. ProfileDrawer gains DailyTimesSection. FocusDrawer wires Pomodoro lifecycle RPC.

The alarms scheduler from Phase 1.5 (`packages/integrations/scheduling/`) is the trigger surface — only changes are: `defaults.ts` async + UserProfile-backed, `handlers.ts` dispatches the new routes, plus the new `alarms.refresh` SW handler so ProfileDrawer-edits reschedule immediately.

### 3.2 Data layer

#### 3.2.1 Migrations

```sql
-- packages/db/src/migrations/0001-create-briefings.sql
CREATE TABLE briefings (
  date_local TEXT NOT NULL,                 -- YYYY-MM-DD in user timezone
  kind TEXT NOT NULL CHECK (kind IN ('morning', 'eod')),
  generated_at TEXT NOT NULL,
  output_json TEXT NOT NULL,                -- BriefingOutput | EodReflectionOutput
  opened_at TEXT,
  user_rating INTEGER CHECK (user_rating IN (-1, 1)),
  provider_used TEXT NOT NULL,
  cost_usd REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (date_local, kind)
);
CREATE INDEX briefings_kind_date ON briefings(kind, date_local DESC);
```

```sql
-- packages/db/src/migrations/0002-create-pomodoros.sql
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

```sql
-- packages/db/src/migrations/0003-create-llm-cost-ledger.sql
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

#### 3.2.2 Repository interfaces

```ts
// packages/db/src/repositories/brief.ts
export interface StoredBriefing {
  dateLocal: string;
  kind: 'morning' | 'eod';
  generatedAt: string;
  output: BriefingOutput | EodReflectionOutput;
  openedAt: string | null;
  userRating: -1 | 1 | null;
  providerUsed: ProviderId;
  costUsd: number;
}

export interface BriefRepo {
  getByDate(dateLocal: string, kind: 'morning' | 'eod'): Promise<StoredBriefing | null>;
  upsert(b: StoredBriefing): Promise<void>;
  recordOpen(dateLocal: string, kind: 'morning' | 'eod', at: string): Promise<void>;
  recordRating(dateLocal: string, kind: 'morning' | 'eod', rating: -1 | 1): Promise<void>;
  recentOpenStatus(daysBack: number): Promise<Array<{ dateLocal: string; opened: boolean }>>;
}

export function createBriefRepo(db: Db): BriefRepo;
```

```ts
// packages/db/src/repositories/pomodoro.ts
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

export function createPomodoroRepo(db: Db): PomodoroRepo;
```

```ts
// packages/db/src/repositories/costLedger.ts
export interface CostLedgerRepo {
  recordRow(row: {
    id: string;
    ts: string;
    feature: string;
    provider: ProviderId;
    model: string;
    promptTok: number;
    cachedTok: number;
    completionTok: number;
    usdEstimated: number;
  }): Promise<void>;
  monthlySpend(monthStartIso: string): Promise<{ usd: number; calls: number }>;
}

export function createCostLedgerRepo(db: Db): CostLedgerRepo;
```

#### 3.2.3 UserProfile persistence

```ts
// packages/core/src/profile/userProfile.ts
const STORAGE_KEY = 'profile.user.v1';

export async function getUserProfile(): Promise<UserProfile> {
  const r = await chrome.storage.local.get(STORAGE_KEY);
  const parsed = UserProfileSchema.safeParse(r[STORAGE_KEY]);
  if (parsed.success) return parsed.data;
  const fresh: UserProfile = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: navigator.language,
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
    await rpc('alarms.refresh');
  }
  return next;
}
```

The existing default `briefingHour=8` / `reflectionHour=18` matches the Phase 1.5 alarms scheduler defaults — so the swap is invisible to existing users; next reschedule picks up whatever they've set.

### 3.3 Agent layer

#### 3.3.1 Agent shape

```ts
// packages/agents/src/brief.morning.ts
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
  output: BriefingOutput;
  costUsd: number;
  providerUsed: ProviderId;
  model: string;
}

export async function generateMorningBrief(deps: MorningBriefDeps): Promise<MorningBriefResult>;
```

The agent:

1. **Builds the snapshot** — real Phase 2 inputs (`now`, `timezone`, `user`, `weather`, `focusSummary14d`); empty arrays / null for `events`, `overdueTasks`, `fitbit`, `activeGoals` (deferred to Phases 4-5).
2. **Calls `router.executeTask`** with `taskId: 'brief.morning'`, schema `BriefingOutputSchema`, system prompt from `brief.morning.md` (with placeholders interpolated), user message containing the snapshot JSON.
3. **Validates output** via `callWithSchema` retry pattern — already shipped in Phase 1.
4. **Writes a `llm_cost_ledger` row** via `costLedger.recordRow()`.
5. **Returns** `MorningBriefResult` for the caller (RPC handler) to upsert into `briefRepo`.

Snapshot transformer is inline (~30 lines) — not a separately-exported module.

`generateEodReflection` has the same shape, additionally takes today's morning brief as input, uses `EodReflectionSchema`, dispatches `taskId: 'brief.eod'`.

#### 3.3.2 Prompt files

```
packages/core/src/prompts/
├── brief.morning.md           [NEW]
├── brief.eod.md               [NEW]
└── routing.ts                 [ext — add brief.morning + brief.eod rows]
```

`brief.morning.md` (sketch):

```markdown
You are Compass, a calm morning briefing for one user. Generate a concise day-ahead briefing in JSON matching the schema provided.

Voice: warm, succinct, never lecturing. Two-to-three-sentence TLDR. No false certainty. If a field has no real data, return an empty array or null — do NOT invent meetings, tasks, or goals.

Inputs you receive include the user's local time, weather, and a 14-day focus summary. Calendar, tasks, and goals will arrive in later phases — for those, leave arrays empty.

Write in {{locale}}. Today is {{dateLocal}} ({{dayOfWeek}}). Local time is {{nowHHMM}}.
```

`brief.eod.md` reflects backward over the day (today's morning brief + completed Pomodoros) — produces wins / dropped / patterns / tomorrowOneThing / journalPrompt.

#### 3.3.3 Routing table additions

```ts
// packages/core/src/prompts/routing.ts (Phase 2 additions)
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
  models: { /* same model row */ },
  reasoningEffort: 'low',
  maxOutputTokens: 600,
  cacheable: true,
  temperature: 0.5,
},
```

#### 3.3.4 Failure modes

`callWithSchema` already handles 2 schema retries; `executeTask` already handles failover across providers; rate-limit handling is router-internal. Phase 2 doesn't reinvent any of these. The agent surfaces `LlmKeyInvalid` / `LlmTimeout` / `LlmSchemaError` to the caller, who decides UX (drawer shows error toast or empty state).

### 3.4 Alarms scheduler refactor

```ts
// packages/integrations/src/scheduling/defaults.ts (Phase 2)
import { getUserProfile } from '@compass/core';

export async function getBriefingHour(): Promise<number> {
  return (await getUserProfile()).briefingHour;
}

export async function getReflectionHour(): Promise<number> {
  return (await getUserProfile()).reflectionHour;
}
```

```ts
// packages/integrations/src/scheduling/scheduler.ts (Phase 2)
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

```ts
// packages/integrations/src/scheduling/handlers.ts (Phase 2)
export function registerAlarmHandlers(events: AlarmEvents = defaultEvents()): void {
  events.addListener((alarm) => {
    if (alarm.name === 'morning-brief') {
      void withHeavyDocAlive(() => rpc('brief.morning', { trigger: 'alarm' }));
    } else if (alarm.name === 'eod-reflection') {
      void withHeavyDocAlive(() => rpc('brief.eod', { trigger: 'alarm' }));
    }
  });
}
```

`alarms.refresh` SW route added to background.ts handler:

```ts
chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
  if (msg?.kind === 'rpc.request' && msg.route === 'alarms.refresh') {
    void ensureAlarms();
    return false;
  }
  // ...existing rpc forwarding...
});
```

### 3.5 RPC routes

11 new entries in [packages/runtime/src/routes.ts](../../../packages/runtime/src/routes.ts):

| Route                 | Purpose                                                            |
| --------------------- | ------------------------------------------------------------------ |
| `brief.morning`       | Generate today's morning brief; `force: true` regenerates          |
| `brief.eod`           | Generate EOD reflection; requires morning brief                    |
| `brief.getOrGenerate` | Catch-up entrypoint called by new-tab on mount                     |
| `brief.recordOpen`    | Sets `opened_at`; called by drawer on first mount per day          |
| `brief.recordRating`  | Sets `user_rating` to -1 or 1                                      |
| `brief.streak`        | Returns `{ days, lastDate }` from `briefRepo.recentOpenStatus(60)` |
| `pomodoro.start`      | Inserts a row; idempotent on `id`                                  |
| `pomodoro.complete`   | Sets `ended_at` + `completed = 1`                                  |
| `pomodoro.abandon`    | Sets `ended_at`, leaves `completed = 0`                            |
| `alarms.refresh`      | SW-side; calls `ensureAlarms()`                                    |

Plus existing `ledger.getMonthlySpend` switches from mock to real `costLedger.monthlySpend()` query — same route shape, behavior change.

#### 3.5.1 Catch-up handler (`brief.getOrGenerate`)

```ts
registry.register('brief.getOrGenerate', async ({ kind }) => {
  const today = todayLocalIso();
  const existing = await briefRepo.getByDate(today, kind);
  if (existing) return { kind: 'have-brief', brief: existing };

  const profile = await getUserProfile();
  const targetHour = kind === 'morning' ? profile.briefingHour : profile.reflectionHour;
  if (new Date().getHours() < targetHour) {
    return { kind: 'too-early', readyAt: nextOccurrenceAtHour(targetHour) };
  }

  try {
    await getActiveCredentials();
  } catch (e) {
    if (e instanceof LlmCredentialsLocked) return { kind: 'locked-no-brief' };
    throw e;
  }

  const result =
    kind === 'morning'
      ? await generateMorningBrief({ ...deps, userProfile: profile })
      : await generateEodReflection({ ...deps, userProfile: profile });
  const stored: StoredBriefing = {
    /* ... */
  };
  await briefRepo.upsert(stored);
  return { kind: 'have-brief', brief: stored };
});
```

#### 3.5.2 Locked-creds skip

Both `brief.morning` (alarm path) and `brief.getOrGenerate` (catch-up path) handle `LlmCredentialsLocked` identically — return a `skipped`/`locked-no-brief` discriminator. No state mutation, no log spam. The user lands on the new tab, sees `LockedEmpty`, clicks the chip in the topbar, unlocks, clicks Regenerate.

### 3.6 UI layer

#### 3.6.1 DailyTimesSection

[apps/extension/app/drawers/profile/DailyTimesSection.tsx](../../../apps/extension/app/drawers/profile/DailyTimesSection.tsx) — extracted alongside ConnectedProvidersSection / EncryptionSection. Hour pickers for `briefingHour` / `reflectionHour`; time pickers for `workHours.start` / `workHours.end` (wired but not consumed until Phase 4); read-only `timezone` and `locale`.

`<HourPicker>` and `<TimePicker>` are tiny inline wrappers (8-12 lines each) around `<select>` and `<input type="time">` — not extracted (only one consumer).

ProfileDrawer.tsx orchestrator:

```tsx
<AccentSection /> <SceneSection /> <WeatherSection />
<DailyTimesSection />                {/* NEW */}
<ConnectedProvidersSection />
<EncryptionSection />
```

#### 3.6.2 `useBrief()` hook + briefStore

```ts
// apps/extension/app/hooks/useBrief.ts
type BriefState =
  | { kind: 'loading' }
  | { kind: 'have-brief'; brief: StoredBriefing }
  | { kind: 'locked-no-brief' }
  | { kind: 'too-early'; readyAt: string }
  | { kind: 'error'; message: string };

export function useBrief(kind: 'morning' | 'eod' = 'morning'): {
  state: BriefState;
  regenerate: () => Promise<void>;
  recordOpen: () => Promise<void>;
  recordRating: (r: -1 | 1) => Promise<void>;
};
```

Internally subscribes to a `useBriefStore` Zustand slice so Hero + Ticker + drawer share the same instance. Hook fires `rpc('brief.getOrGenerate', { kind })` on mount; updates the store. After unlock (lock chip → unlock), the store auto-refetches (subscribes to `useShell.locked` transitioning true→false).

#### 3.6.3 Brief drawer rewrite

```tsx
export function BriefDrawer() {
  const { state, regenerate, recordOpen, recordRating } = useBrief('morning');

  useEffect(() => {
    if (state.kind === 'have-brief' && state.brief.openedAt === null) {
      void recordOpen();
    }
  }, [state]);

  if (state.kind === 'loading') return <Spinner />;
  if (state.kind === 'too-early') return <TooEarlyEmpty readyAt={state.readyAt} />;
  if (state.kind === 'locked-no-brief') return <LockedEmpty />;
  if (state.kind === 'error') return <ErrorEmpty message={state.message} onRetry={regenerate} />;

  // 'have-brief'
  const o = state.brief.output as BriefingOutput;
  return (
    <>
      <BriefTLDR text={o.tldr} mood={o.oneLineMood} />
      <PomodorosSection items={o.pomodoros} />
      <WatchoutsSection items={o.watchouts} />
      <RecoverySection note={o.recovery} />
      <QuotedGoalSection goal={o.quotedGoal} />
      <BriefFooter
        provider={state.brief.providerUsed}
        cost={state.brief.costUsd}
        rating={state.brief.userRating}
        onRate={recordRating}
        onRegenerate={regenerate}
      />
    </>
  );
}
```

For EOD reflection at `reflectionHour`, the drawer switches to `useBrief('eod')` and renders `<EodReflectionView>` instead.

#### 3.6.4 Hero + Ticker

```tsx
// Hero
const { state } = useBrief('morning');
const tldr =
  state.kind === 'have-brief'
    ? (state.brief.output as BriefingOutput).tldr
    : state.kind === 'too-early'
      ? 'Your morning brief will be ready at 8 AM.'
      : state.kind === 'locked-no-brief'
        ? '🔒 Your daily brief is waiting. Unlock to generate.'
        : '';
```

```tsx
// Ticker
const { state } = useBrief('morning');
const [streak, setStreak] = useState({ days: 0, lastDate: null });
useEffect(() => {
  void rpc('brief.streak').then(setStreak);
}, []);

const watchouts =
  state.kind === 'have-brief' ? (state.brief.output as BriefingOutput).watchouts : [];

return (
  <TickerStrip>
    <DateChip /> <WeatherChip />
    {streak.days > 0 && <StreakChip days={streak.days} />}
    {watchouts.map((w, i) => (
      <WatchoutChip key={i} text={w} />
    ))}
  </TickerStrip>
);
```

#### 3.6.5 Empty-state UX

Empty-state copy lives in the **drawer template**, not the LLM prompt. Each `*Section` sub-component renders empty-state CTAs when its corresponding output field is empty/null:

| Section     | Empty-state copy (Phase 2)                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------ |
| Pomodoros   | "Suggested focus blocks land with Calendar in Phase 4. For now, start a Pomodoro from Focus drawer to track time." |
| Recovery    | "Connect Fitbit/Whoop to surface recovery and sleep insights."                                                     |
| Quoted Goal | "Set goals to anchor your day. Coming with the Goals drawer."                                                      |
| Watchouts   | (rendered only when array non-empty; if empty, section header collapses)                                           |

The LLM is explicitly instructed via system prompt: "If a field has no real data, return an empty array or null — do NOT invent meetings, tasks, or goals."

#### 3.6.6 FocusDrawer Pomodoro lifecycle

```tsx
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

Visible UI doesn't change beyond a "What are you working on?" theme input added to the start affordance.

### 3.7 Component layout (additive to phase-1.5-settings baseline)

```
packages/core/src/
├── prompts/
│   ├── brief.morning.md                              [NEW]
│   ├── brief.eod.md                                  [NEW]
│   └── routing.ts                                    [ext — add 2 rows]
└── profile/
    ├── userProfile.ts                                [NEW]
    ├── userProfile.test.ts                           [NEW]
    └── index.ts                                      [NEW — barrel]

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
│   ├── generateMorningBrief.ts                       [DELETED]
│   ├── generateMorningBrief.test.ts                  [DELETED]
│   └── index.ts                                      [ext — drop generateMorningBrief]
└── index.ts                                          [ext — export brief.morning, brief.eod]

packages/integrations/src/scheduling/
├── defaults.ts                                       [ext — async + UserProfile-backed]
├── scheduler.ts                                      [ext — computeDesired async]
└── handlers.ts                                       [ext — dispatch brief.morning / brief.eod]

packages/runtime/src/
└── routes.ts                                         [ext — add 11 routes; ledger.getMonthlySpend behavior change in handler]

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

## 4. Testing strategy

### 4.1 Unit & component coverage targets

| Target                                                     | Tool                                           | Threshold                                                     |
| ---------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------- |
| `packages/core/src/profile/userProfile.ts`                 | Vitest + chrome.storage mock                   | 100% line + branch                                            |
| `packages/db/src/repositories/brief.ts`                    | Vitest + in-process sqlite                     | ≥95%                                                          |
| `packages/db/src/repositories/pomodoro.ts`                 | Vitest + in-process sqlite                     | ≥95%                                                          |
| `packages/db/src/repositories/costLedger.ts`               | Vitest + in-process sqlite                     | ≥95%                                                          |
| `packages/agents/src/brief.morning.ts`                     | Vitest + mocked deps + frozen-fixture snapshot | ≥90%                                                          |
| `packages/agents/src/brief.eod.ts`                         | Vitest + mocked deps                           | ≥90%                                                          |
| `packages/integrations/src/scheduling/scheduler.ts`        | (existing tests update for async)              | preserved ≥95%                                                |
| `packages/integrations/src/scheduling/handlers.ts`         | (existing tests update for new dispatch)       | preserved ≥90%                                                |
| Offscreen handlers for 11 new routes                       | Vitest + in-process sqlite + stub router       | ≥85% (each)                                                   |
| `apps/extension/app/hooks/useBrief.ts`                     | Vitest + RTL                                   | ≥85%                                                          |
| `apps/extension/app/state/briefStore.ts`                   | Vitest                                         | 100%                                                          |
| `apps/extension/app/drawers/profile/DailyTimesSection.tsx` | Vitest + RTL + jest-axe                        | ≥85%, axe clean                                               |
| `apps/extension/app/drawers/BriefDrawer.tsx`               | Vitest + RTL + jest-axe                        | ≥85%, axe clean (each `*Section` and the four state branches) |
| `apps/extension/app/drawers/FocusDrawer.tsx` (ext)         | Vitest + RTL                                   | ≥80%                                                          |
| `apps/extension/app/components/Hero.tsx`                   | Vitest + RTL                                   | preserved + new branches                                      |
| `apps/extension/app/components/Ticker.tsx`                 | Vitest + RTL                                   | preserved + new streak/watchout cases                         |

Aggregate: ≥85% line, ≥75% branch (PRD §16.1 / §20.1 carry).

### 4.2 Integration

New file `tests/integration/brief-pipeline.test.ts`. Single Vitest harness with in-process sqlite. 7 scenarios:

1. Cold start, alarm fires, key configured → brief stored.
2. Alarm fires while creds locked → `{ skipped: 'locked' }`, no row.
3. Catch-up trigger before briefingHour → `{ kind: 'too-early', readyAt }`.
4. Manual regenerate after success → second `brief.morning` with `force: true` overwrites prior row.
5. EOD requires morning brief → `{ skipped: 'no-morning-brief' }` if absent; succeeds after morning upsert.
6. focusSummary14d shape — 20 fake rows across 14 days produce expected aggregation.
7. UserProfile change reschedules alarms — `setUserProfile({ briefingHour: 9 })` triggers `clear` + `create` on fake alarms API.

### 4.3 E2E (Playwright, advisory `e2e` job)

New `apps/extension/tests/e2e/daily-agent.spec.ts`. 3 tests:

1. **Brief generation via DailyTimesSection edit + tab reload.** Skip onboarding via DevTools storage seed. Edit briefingHour; reload tab; assert spinner-then-real-output. Requires `COMPASS_E2E_OPENROUTER_KEY`.
2. **Locked → unlock → regenerate.** Seed encrypted creds, no session. New tab → `LockedEmpty`. Click chip → unlock → Regenerate → assert real brief renders.
3. **Pomodoro lifecycle persists across tab close.** Start 1-min Pomodoro, close, reopen, query `pomodoro.summarize14d` to confirm row exists.

Same env-key gating as Phase 1.5 settings tests. Advisory job's `continue-on-error: true` accommodates skips.

### 4.4 Eval suite placeholder

`tests/prompt-eval/brief.morning.yaml` — promptfoo skeleton with 3 fixture days (no-data, partial-data-with-weather, partial-data-with-focus-trend). Pass criteria: schema-valid 100%; manual smoke acceptable. Full PRD §20.4 requirement (50 fixtures, ≥4/5 human rating) is **not** in this workstream — gated behind promptfoo CI integration which is its own follow-up.

### 4.5 Manual smoke checklist (PR-time)

- [ ] Fresh install: complete onboarding, set briefingHour to current hour - 1, reload — Brief drawer renders real LLM output.
- [ ] Edit briefingHour in DailyTimesSection — `chrome.alarms.getAll()` shows updated `when` for `morning-brief`.
- [ ] At reflectionHour (or after editing it to current hour), open new tab — EOD reflection generates and renders.
- [ ] Lock creds, wait for alarm, open new tab — Brief drawer shows `LockedEmpty`. Unlock + Regenerate → real brief renders.
- [ ] Start a Pomodoro, complete it — `await rpc('pomodoro.summarize14d')` returns updated `totalFocusMin`.
- [ ] Open Brief drawer → click 👍 / 👎 → footer updates immediately; `briefings.user_rating` row updates.
- [ ] Open Brief drawer → click Regenerate → spinner → new content renders, cost row updates, `briefings.cost_usd` updates in sqlite.

## 5. CI

No new CI gate. Existing seven jobs (`lint`, `typecheck`, `test`, `build`, `gate:offline`, `gate:alarms`, `e2e (advisory)`) inherit the new code. Coverage thresholds grow with new packages/files.

## 6. Definition of Done

The Phase 2 — Daily Agent slice closes when:

- [ ] Migrations 0001 (briefings), 0002 (pomodoros), 0003 (llm_cost_ledger) ship and run on offscreen mount.
- [ ] `BriefRepo`, `PomodoroRepo`, `CostLedgerRepo` exposed from `@compass/db`; ≥95% coverage each.
- [ ] `getUserProfile()` / `setUserProfile()` ship in `@compass/core`; 100% coverage.
- [ ] `<DailyTimesSection>` renders in ProfileDrawer; edits persist + trigger `alarms.refresh`.
- [ ] `brief.morning` and `brief.eod` agents ship in `@compass/agents`; stubs deleted; ≥90% coverage each.
- [ ] Prompt files `brief.morning.md` and `brief.eod.md` ship under `packages/core/src/prompts/`.
- [ ] Routing table gains `brief.morning` and `brief.eod` rows.
- [ ] Alarms scheduler `defaults.ts` async + UserProfile-backed; `handlers.ts` dispatches the new routes; existing scheduler tests updated for async; coverage preserved at ≥95% / ≥90%.
- [ ] 11 new RPC routes wired in offscreen + types in `packages/runtime/src/routes.ts`.
- [ ] `useBrief()` hook + `briefStore` Zustand slice; Hero + Ticker + Brief drawer all read from it.
- [ ] BriefDrawer rewritten with 4 state branches (loading / have-brief / locked-no-brief / too-early / error) + section sub-components with empty-state CTAs.
- [ ] FocusDrawer wires `pomodoro.start` / `complete` / `abandon` lifecycle.
- [ ] Streak computed from `briefings.opened_at`; Ticker displays when `> 0`.
- [ ] Cost ledger row written per generation; `ledger.getMonthlySpend` switches from mock to real query.
- [ ] Integration test (7 scenarios) passes.
- [ ] E2E spec (3 tests) lands; runs in advisory job.
- [ ] Manual smoke checklist completed and pasted in PR description.
- [ ] `MOCK.brief` references in shell are removed (only Hero / Ticker / Brief surfaces — other MOCK fields stay until later workstreams).
- [ ] `docs/architecture.md` gains a "Daily Agent (`brief.*`)" subsection.
- [ ] PRD §21 marks Phase 2 — Daily Agent slice closed.

## 7. Risks & mitigations

| Risk                                                                                               | Mitigation                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sqlite cold-start latency hurts new-tab open time                                                  | Offscreen `startDb()` already runs on mount (Phase 1); brief queries are single-row + indexed. Catch-up generation runs async; new-tab renders skeleton immediately.                                                                                                 |
| First migration runs on existing users with no data                                                | All migrations are `CREATE TABLE`; idempotent. No data to migrate.                                                                                                                                                                                                   |
| LLM invents data despite the "do NOT invent" instruction                                           | Schema validation catches structural lies (events array isn't even in `BriefingOutputSchema` — only output-side fields). User-visible failure mode: `LlmSchemaError` after retries, drawer shows ErrorEmpty.                                                         |
| Multi-tab opens a stale brief                                                                      | `useBriefStore` subscribes to `chrome.storage.onChanged` — propagates across tabs. (Already done for shell store in Phase 1.5; same pattern.)                                                                                                                        |
| User edits briefingHour past current time, expecting brief to fire today                           | After edit, `ensureAlarms()` reschedules. If new hour is in the past, `nextOccurrenceAtHour` rolls to tomorrow (Phase 1.5 alarms behavior). User opens new tab; `brief.getOrGenerate` sees `nowHour >= newBriefingHour` and generates inline. Documented in PR body. |
| Rate-limited LLM blocks alarm-driven generation                                                    | Router-internal: 3 retries with exponential backoff (existing). On exhaust, agent surfaces `LlmRateLimited` to handler; handler returns error; drawer shows ErrorEmpty + Regenerate button.                                                                          |
| Stub deletion breaks an importer                                                                   | `generateMorningBrief` was only consumed by `stubs/index.ts` (which exports it as part of `agents.stubs`). The barrel export in `packages/agents/src/index.ts` (`export * as stubs from './stubs/index.js'`) is the only public surface. Removal is clean.           |
| `interrupt_count = 0` always makes `avgInterruptPerSession = 0`, which the LLM might over-index on | System prompt clarifies: "If `avgInterruptPerSession` is 0 and `totalFocusMin` is non-zero, do not infer 'flawless focus' — the metric is not yet captured."                                                                                                         |
| Cost row written before brief upsert; if upsert fails, ledger has orphan cost                      | Sequence is: agent emits result → handler upserts brief AND records cost. Wrap both in a sqlite transaction. Single round-trip; both succeed or neither.                                                                                                             |

## 8. Future-sprint runways

| Future workstream                         | Drops into seam                                                                                                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `phase-2-semantic-notes`                  | Adds sqlite-vec migrations + Notes auto-link agent + RAG for `notes.askGrounded` (⌘K ask mode). Brief drawer unaffected.                                                              |
| Phase 3 — Personalization + Smart Blocker | Adds interrupt UX + `pomodoro.recordInterrupt` RPC. The `interrupt_count` column is already there. Personalization signals can read brief history (briefings.user_rating) for tuning. |
| Phase 3 — Streak nudging                  | Streak data already computed; just adds UI surfaces (notification on streak break, milestone celebrations).                                                                           |
| Phase 4 — Calendar / Gmail / Goals        | Brief inputs gain real `events`, `overdueTasks`, `activeGoals`. Agent snapshot transformer extends; output schema unchanged; drawer empty-states are replaced when arrays populate.   |
| Phase 4 — `meeting-prep` alarm            | Alarms scheduler gains a third alarm name; handlers.ts adds dispatch. Same pattern as `morning-brief` / `eod-reflection`.                                                             |
| Phase 5 — Fitbit/Whoop integration        | Brief snapshot's `fitbit` field becomes real; `RecoverySection` empty-state replaced by real recovery note.                                                                           |
| Promptfoo CI integration                  | Eval suite placeholders become real fixtures; CI gate on regression.                                                                                                                  |

## 9. References

- [docs/prd.md](../../prd.md) — §5.7 (db schema), §6 (LLM provider), §7.2 (routing table), §8 (Brief drawer surface), §19 (failure modes), §20 (testing), §21 (phases).
- [docs/architecture.md](../../architecture.md) — Phase 1.6 + 1.5 baseline.
- [docs/superpowers/specs/2026-05-03-phase-1.5-foundation-design.md](2026-05-03-phase-1.5-foundation-design.md) — alarms scheduler that this workstream extends.
- [docs/superpowers/specs/2026-05-09-phase-1.5-settings-design.md](2026-05-09-phase-1.5-settings-design.md) — UserProfile preceded here in spec but not in code; this spec implements it.
- [packages/db/src/migration-runner.ts](../../../packages/db/src/migration-runner.ts) — already shipped, finally exercised.
- [packages/integrations/src/scheduling/](../../../packages/integrations/src/scheduling/) — alarms scheduler that this workstream extends.
- [WebCrypto: AES-GCM, PBKDF2](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) (carries from Phase 1.5).
