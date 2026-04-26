# Compass — Phase 1: Foundation

**Status:** Draft for review
**Date:** 2026-04-26
**Phase:** 1 (Foundation) per [PRD §17](../../prd.md#17-implementation-phases-and-acceptance-gates)
**Scope:** Service worker + offscreen scaffolding, SW↔offscreen RPC, Zod schemas for §6 entities, WebCrypto envelope (built but unwired), SQLite-WASM + sqlite-vec with migration 0001 + cost ledger, `LlmProvider` + OpenRouter implementation + task router, local MiniLM embeddings (lazy-load), onboarding flow.

---

## 1. Purpose

Turn the Phase 0 design-prototype shell into a system that can perform a real LLM call end-to-end. Every architectural seam declared in Phase 0 either gets a real implementation or a packaged-but-unwired primitive ready for Phase 1.5/2 to wire up.

The Phase 1 gate ([PRD §17](../../prd.md#17-implementation-phases-and-acceptance-gates)) is:

- Any `LlmProvider` method callable from offscreen end-to-end
- Crypto unit tests at 100%
- Sample `system.ping` task returns structured output

Everything in this spec exists to satisfy that gate while leaving Phase 1.5 (alarms + direct providers + multi-key Settings UX) and Phase 2 (Daily Agent + Semantic Notes) as additive sprints rather than refactors.

## 2. Scope

### 2.1 In scope

- **SW + offscreen runtime (Chrome only).**
  - `apps/extension/entrypoints/background.ts` — explicit SW entry, on-demand offscreen creation.
  - `apps/extension/entrypoints/offscreen/main.ts` — heavy-doc bootstrap (DB init, RPC handler registration).
  - `packages/runtime` — `HeavyRuntime` interface (transport-agnostic) + Chrome offscreen implementation. Firefox + Safari implementations deferred to a later sprint; an in-process mock implementation lives in tests to enforce transport-agnosticism.
- **Custom SW↔offscreen RPC layer** (one-shot only; streaming deferred).
  - Typed `Routes` registry; `rpc(kind, payload): Promise<response>` on the SW side.
  - Eviction-safe (request-id correlated; handler tolerates SW restart mid-call).
- **`packages/core/types` — Zod schemas for all §6 entities, structural-only validation** (field names + types + required/optional + nullable). Semantic refinements (regex, bounds, cross-field) deferred to consumers.
- **`packages/core/crypto` — WebCrypto envelope, built and tested at 100% coverage.** Unwired into onboarding (raw-default credential path is the only Phase 1 user surface). Encrypted opt-in lands in Phase 1.5.
- **`packages/core/crypto/credentials.ts` — `getActiveCredentials()`** as the single, lint-enforced reader for `chrome.storage.local` credential keys. Importable by both onboarding (UI) and offscreen (heavy-doc) without an SW round-trip.
- **`packages/db` — SQLite-WASM + sqlite-vec, OPFS-backed, async background init.** Migration 0001 contains `meta` (schema_version kv) + `llm_cost_ledger`. Standalone `tests/db.smoke.test.ts` verifies `vec_version()`. Migration runner is idempotent (reads `meta.schema_version`; applies new migrations only).
- **`packages/llm` — provider abstraction + OpenRouter implementation + task router + cost ledger.**
  - `LlmProvider` interface per [PRD §7.1](../../prd.md#71-provider-interface).
  - OpenRouter implementation via the `openai` SDK pointed at `https://openrouter.ai/api/v1` (OpenAI-compatible).
  - Structured output via `response_format: { type: 'json_schema' }`.
  - Validate-and-retry wrapper per [PRD §7.4](../../prd.md#74-output-validation-and-retry).
  - Routing config in `packages/core/src/prompts/routing.ts` with one row: `system.ping`. Phase 2+ adds task rows as features ship.
  - Cost ledger: `recordCall()` writes; `getMonthlySpend()` queries. Banner UX deferred to Phase 2.
- **`packages/embeddings/local` — transformers.js + MiniLM, lazy + first-use download.** WASM runtime bundled in extension; weights downloaded from a SHA-pinned URL into OPFS on first `embed()` call. Tested with mock weights. No Phase 1 consumer.
- **Onboarding flow** — three-step wizard at the existing `/onboarding` route (already scaffolded in Phase 0):
  1. Choose provider (OpenRouter recommended; OpenAI/Anthropic disabled with "Coming in Phase 1.5" copy).
  2. Paste key, validate via real `validateLlmKey` (calls `GET /v1/models`).
  3. Done. Skip path is available at every step (PRD invariant 3).
- **Error taxonomy** — `LlmKeyMissing`, `LlmKeyInvalid`, `LlmRateLimited`, `LlmUnavailable`, `LlmSchemaError`, `LlmTimeout`. Rich at the onboarding-side; throw-and-log at runtime.
- **`system.ping` task** — Phase 1's canonical smoke test. Synthetic stub in week 1; real OpenRouter call in week 3. CI runs `gate:offline` (synthetic) on every PR; `gate:wired` (real network) nightly + on release branches.
- **Heavy-doc lifecycle** — on-demand creation via `chrome.offscreen.createDocument`; never auto-closed.
- **CI updates** — add `gate:offline` and `gate:wired` jobs; extend coverage targets to new packages.

### 2.2 Out of scope (for this sprint)

- **OpenAI direct provider, Anthropic direct provider** — both deferred to Phase 1.5 alongside the alarms scheduler. Multi-key Settings UX lands with them.
- **OpenRouter PKCE OAuth onboarding** — Phase 4 alongside Gmail OAuth. Phase 1 onboards OpenRouter via raw-key paste only.
- **Encrypted-storage onboarding wiring** — `packages/core/crypto` ships built and tested but is not surfaced in onboarding. Encrypted opt-in lands in Phase 1.5.
- **Firefox / Safari heavy-doc implementations** — `HeavyRuntime` interface is shipped; only the Chrome implementation is provided. FF and Safari implementations land in a dedicated cross-browser sprint.
- **Streaming RPC** — `LlmProvider.stream()` exists on the interface (for future provider impls) but the SW↔offscreen RPC layer is one-shot only. Streaming RPC arrives when Phase 3 needs `negotiateBlock` / Phase 4 needs `draftReply`.
- **Cost-cap banner UX, tier-downgrade routing logic** — `getMonthlySpend()` ships as a query; the consumer (banner + downgrade) lands in Phase 2.
- **Telemetry events** ([PRD §6.4](../../prd.md#64-telemetry-event-no-content)) — schema lands as part of structural Zod (Q13(c)), but no telemetry pipeline ships in Phase 1.
- **Settings affordances** for credential management beyond "show active provider, allow remove" — full multi-key Settings UX lands in Phase 1.5.
- **Service worker `chrome.alarms` scheduling** — Phase 1.5.

## 3. Architecture

### 3.1 Runtime topology (Phase 1, Chrome only)

```
┌────────────────────────────────────────────────────────────────────┐
│ Browser profile (Chrome MV3)                                       │
│                                                                    │
│  ┌──────────────────┐                  ┌─────────────────────────┐ │
│  │ New-tab UI       │                  │ Service worker          │ │
│  │ - Onboarding     │ ─ chrome.runtime │  - rpc() dispatcher     │ │
│  │   overlay        │   .sendMessage   │  - ensureHeavyDoc()     │ │
│  │ - Test "Run      │ ←──────────────→ │  - request-id tracking  │ │
│  │   ping" button   │                  └────────────┬────────────┘ │
│  │   (dev panel)    │                               │              │
│  └────────┬─────────┘                               │              │
│           │                                         │ chrome       │
│           │                                         │ .offscreen   │
│           │ chrome.storage.local                    ▼              │
│           │ (raw key, read via              ┌──────────────────┐   │
│           │  getActiveCredentials())        │ Offscreen        │   │
│           ▼                                 │  - RPC handler   │   │
│  ┌──────────────────┐                       │  - sqlite-wasm   │   │
│  │ chrome.storage   │ ◀──────── reads ────  │    + sqlite-vec  │   │
│  │ .local           │                       │    + OPFS        │   │
│  │ (credentials)    │                       │  - LlmProvider   │   │
│  └──────────────────┘                       │    (OpenRouter)  │   │
│                                             │  - cost ledger   │   │
│                                             │  - embeddings    │   │
│                                             │    (lazy)        │   │
│                                             └────────┬─────────┘   │
└──────────────────────────────────────────────────────┼─────────────┘
                                                       │ fetch (TLS)
                                                       ▼
                                             api.openrouter.ai
                                             (user's key, BYOK)
```

### 3.2 Tracer-bullet weekly cadence

| Week | Deliverable                                                                                                                                                                      | Stubs in place                                         | Real                                 |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------ |
| 1    | SW + offscreen scaffold; RPC layer; synthetic ping returning hardcoded JSON; heavy-doc lifecycle; in-process `HeavyRuntime` mock                                                 | DB stub, crypto stub, provider stub, embeddings absent | RPC, heavy-doc creation, ping wiring |
| 2    | `packages/core/types` (all §6 Zod, structural); `packages/core/crypto` (full impl + tests); `packages/db` with migration 0001 + smoke test; cost ledger writes via stub provider | Provider still synthetic                               | Types, crypto, DB, ledger writes     |
| 3    | `packages/llm` with OpenRouter implementation; `validateLlmKey` real; onboarding wired; real `system.ping` succeeds end-to-end on OpenRouter                                     | Embeddings stub                                        | LLM call, onboarding                 |
| 4    | `packages/embeddings/local` with MiniLM (lazy + download); error-taxonomy polish; gate ceremony — both `gate:offline` and `gate:wired` green; PRD §17 update PR                  | None                                                   | Embeddings, gate                     |

### 3.3 Package layout (additive to Phase 0)

```
packages/
├── core/                                  [extended]
│   ├── src/
│   │   ├── types/                         [NEW] — Zod schemas for §6 entities
│   │   │   ├── credentials.ts             # LlmCredentials (multi-key shape)
│   │   │   ├── user.ts, configuration.ts
│   │   │   ├── goal.ts, milestone.ts
│   │   │   ├── note.ts, focus.ts
│   │   │   ├── block.ts, briefing.ts
│   │   │   ├── gmail.ts, meeting.ts
│   │   │   ├── telemetry.ts
│   │   │   ├── ledger.ts                  # CostLedgerRow
│   │   │   ├── ping.ts                    # system.ping I/O
│   │   │   └── index.ts
│   │   ├── crypto/                        [NEW]
│   │   │   ├── keystore.ts                # WebCrypto envelope
│   │   │   ├── credentials.ts             # getActiveCredentials() — single read site
│   │   │   └── index.ts
│   │   └── prompts/                       [NEW]
│   │       └── routing.ts                 # task → model routing table
├── db/                                    [extended — Phase 0 stub becomes real]
│   ├── src/
│   │   ├── init.ts                        # startDb / getDb (async background init)
│   │   ├── opfs.ts                        # sqlite-wasm + sqlite-vec + OPFS handle
│   │   ├── migrations/0001-foundation.sql
│   │   ├── migration-runner.ts            # idempotent; reads meta.schema_version
│   │   └── index.ts
│   └── tests/
│       └── smoke.test.ts                  # SELECT vec_version()
├── llm/                                   [extended]
│   ├── src/
│   │   ├── provider.ts                    # LlmProvider interface
│   │   ├── providers/
│   │   │   ├── openrouter.ts              # OpenRouter via openai SDK
│   │   │   └── stub.ts                    # synthetic provider for week 1–2 + tests
│   │   ├── router.ts                      # picks model per taskId; one-key in Phase 1
│   │   ├── validate.ts                    # callWithSchema retry wrapper
│   │   ├── ledger.ts                      # recordCall + getMonthlySpend
│   │   ├── errors.ts                      # error taxonomy
│   │   └── index.ts
│   └── tests/
│       ├── openrouter.test.ts             # fixture-based; recorded responses
│       └── ledger.test.ts                 # write/read round-trip; month boundary
├── embeddings/                            [extended]
│   └── local/
│       ├── src/
│       │   ├── runtime.ts                 # transformers.js wrapper
│       │   ├── weights.ts                 # OPFS cache + SHA-verified download
│       │   ├── embed.ts                   # public: embed(text) → Float32Array(384)
│       │   └── index.ts
│       └── tests/
│           ├── runtime.test.ts            # mock weights; deterministic output
│           └── weights.test.ts            # fetch-mock; SHA verification
├── runtime/                               [NEW]
│   ├── src/
│   │   ├── HeavyRuntime.ts                # interface: rpc(); init(); shutdown()
│   │   ├── chrome-offscreen.ts            # Chrome implementation
│   │   ├── in-process.ts                  # mock for tests + transport-agnosticism enforcement
│   │   ├── routes.ts                      # typed Routes registry
│   │   ├── rpc.ts                         # client-side rpc() helper
│   │   └── index.ts
│   └── tests/
│       ├── in-process.test.ts             # contract test runs against mock
│       └── eviction.test.ts               # request-id correlation under SW restart
└── ...
```

### 3.4 SW↔offscreen RPC contract

```ts
// packages/runtime/src/routes.ts
export interface Routes {
  'system.ping': {
    req: { utterance: string };
    res: { pong: true; echo: string };
  };
  'llm.complete': {
    req: { taskId: TaskId; system?: string; messages: LlmMessage[]; schema?: unknown; ... };
    res: LlmResponse;
  };
  'llm.validateKey': {
    req: { provider: ProviderId; apiKey: string };
    res: { valid: boolean; error?: string };
  };
  'ledger.getMonthlySpend': {
    req: { monthStartIso: string };
    res: { usd: number; calls: number };
  };
}

// SW side
export function rpc<K extends keyof Routes>(kind: K, payload: Routes[K]['req']): Promise<Routes[K]['res']>;

// Offscreen side
export function registerHandler<K extends keyof Routes>(
  kind: K,
  handler: (payload: Routes[K]['req']) => Promise<Routes[K]['res']>,
): void;
```

Eviction safety: every `rpc()` invocation generates a UUID; the offscreen handler responds via `chrome.runtime.sendMessage` (not by replying to the original message); the SW handler registers a listener idempotently on every wake-up that resolves pending promises by request-id. If the SW dies mid-call, the next wake-up resumes by listening for the response; the calling promise is awaited via a `chrome.storage.session`-backed pending-id table.

### 3.5 LlmCredentials shape (multi-key forward-compat)

```ts
// packages/core/src/types/credentials.ts
export type ProviderId = 'openai' | 'anthropic' | 'openrouter';

export interface KeyEntry {
  apiKey: string;
  addedAt: string;
  lastValidatedAt?: string;
}

export interface LlmCredentials {
  default: ProviderId | null; // null = onboarding skipped
  openrouter?: KeyEntry; // populated in Phase 1
  openai?: KeyEntry; // populated in Phase 1.5
  anthropic?: KeyEntry; // populated in Phase 1.5
}
```

Phase 1 onboarding writes only `openrouter` + sets `default: 'openrouter'`. Phase 1 router reads `creds.default ?? 'openrouter'` and dispatches to the corresponding provider. With only one slot populated, no failover ever fires. Phase 1.5 adds direct providers; the failover path activates without router refactoring.

### 3.6 Migration 0001

```sql
-- packages/db/src/migrations/0001-foundation.sql

CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO meta(key, value) VALUES ('schema_version', '1');

CREATE TABLE llm_cost_ledger (
  id              TEXT PRIMARY KEY,
  ts              TEXT NOT NULL,
  feature         TEXT NOT NULL,
  provider        TEXT NOT NULL,
  model           TEXT NOT NULL,
  prompt_tok      INTEGER NOT NULL,
  cached_tok      INTEGER NOT NULL,
  completion_tok  INTEGER NOT NULL,
  usd_estimated   REAL NOT NULL
);
CREATE INDEX idx_ledger_ts ON llm_cost_ledger(ts);
```

A separate `tests/db.smoke.test.ts` calls `SELECT vec_version()` to assert sqlite-vec links correctly. No `notes_vec` or `notes_fts` virtual table is created in Phase 1; those land in migration 0002 alongside Phase 2 Notes.

### 3.7 `system.ping` task

Added as the first row in [packages/core/src/prompts/routing.ts](../../../packages/core/src/prompts/routing.ts):

| TaskId        | Primary (OpenRouter)         | Reasoning | Schema       | Max out | Cache |
| ------------- | ---------------------------- | --------- | ------------ | ------- | ----- |
| `system.ping` | `anthropic/claude-haiku-4-5` | none      | `PingOutput` | 50      | no    |

The schema:

```ts
// packages/core/src/types/ping.ts
import { z } from 'zod';
export const PingInputSchema = z.object({ utterance: z.string() });
export const PingOutputSchema = z.object({
  pong: z.literal(true),
  echo: z.string(),
});
```

The prompt:

```ts
export const SYSTEM = `You are a connectivity diagnostic. Respond ONLY with the literal JSON object {"pong": true, "echo": "<the user's utterance>"}.`;
export const USER_TEMPLATE = (i: PingInput) => `<utterance>${i.utterance}</utterance>`;
```

`gate:offline` runs the synthetic stub provider; `gate:wired` runs the real OpenRouter call. Both assert the schema parse + `echo` matches input.

## 4. Testing strategy

### 4.1 Unit & component coverage

| Target                                        | Tool                               | Threshold                                                |
| --------------------------------------------- | ---------------------------------- | -------------------------------------------------------- |
| Zod schemas (all §6 entities)                 | Vitest                             | 100% (round-trip + 1–2 negative cases per schema)        |
| `packages/core/crypto`                        | Vitest                             | 100% (PRD §17 explicit gate criterion)                   |
| `packages/db` migration runner + queries      | Vitest + in-memory sqlite-wasm     | ≥90% line / ≥80% branch                                  |
| `packages/db` smoke test                      | Vitest                             | Pass on `vec_version()`                                  |
| `packages/llm/router`                         | Vitest                             | ≥90% (mocked provider; routing table coverage)           |
| `packages/llm/ledger`                         | Vitest                             | 100% (write/read round-trip + month-boundary edge cases) |
| `packages/llm/openrouter`                     | Vitest + recorded fixtures         | ≥90% (happy + 4 failure modes)                           |
| `packages/llm/validate` (callWithSchema)      | Vitest                             | 100% (3-attempt retry, schema feedback, error path)      |
| `packages/embeddings/local` runtime + weights | Vitest + fetch-mock + mock weights | ≥90%                                                     |
| `packages/runtime` RPC + heavy-doc            | Vitest + in-process mock           | ≥90%                                                     |
| Onboarding render + state                     | Vitest + RTL + jest-axe            | render, validate happy/sad, skip path, axe clean         |

### 4.2 Integration

- **`packages/runtime` contract test** runs the same RPC test against the in-process mock and (in CI on Chromium-headless) the chrome-offscreen impl. Forces transport-agnosticism.
- **End-to-end ping** at gate time:
  - `gate:offline` — Vitest harness boots the heavy-doc with the synthetic stub provider, calls `rpc('system.ping', { utterance: 'hello' })`, asserts `{ pong: true, echo: 'hello' }`.
  - `gate:wired` — Same harness with the real OpenRouter provider; uses `OPENROUTER_TEST_KEY` from CI secrets; runs nightly + on release branches; asserts schema match + the cost ledger gained one row.

### 4.3 Coverage targets (carries from Phase 0 baseline)

- Aggregate ≥85% line, ≥75% branch ([PRD §16.1](../../prd.md#16-quality-bars-and-engineering-process)).
- `packages/core/crypto` — 100% line and branch (gate criterion).

## 5. CI

### 5.1 New jobs

| Job            | Trigger                           | Steps                                                                                                          |
| -------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `gate:offline` | every PR                          | `pnpm --filter @compass/extension test:gate:offline` — boots heavy-doc with stub provider, runs synthetic ping |
| `gate:wired`   | nightly (cron) + release branches | Same harness with real OpenRouter key from secrets; one synthetic-style assertion + ledger-row assertion       |

### 5.2 Existing jobs (unchanged)

`lint`, `typecheck`, `test`, `build`, `e2e`, `visreg` — coverage targets and per-package test counts grow with the new packages but the job shapes don't change.

### 5.3 Lint rules added

- **`no-direct-credentials-storage`** — bans `chrome.storage.local.*` with arguments matching `/llm\.creds/` outside `packages/core/src/crypto/credentials.ts`. ESLint `no-restricted-syntax` rule.
- **`no-streaming-rpc`** (Phase 1 only) — bans imports of `rpcStream` (which doesn't exist yet). Rule deleted when streaming RPC lands.

## 6. Definition of Done

The Phase 1 gate ([PRD §17](../../prd.md#17-implementation-phases-and-acceptance-gates)):

- [ ] Any `LlmProvider` method callable from offscreen end-to-end. Verified by `gate:wired` running real `system.ping`.
- [ ] `packages/core/crypto` unit tests at 100% line + branch.
- [ ] `system.ping` returns Zod-validated structured output. Verified by both `gate:offline` and `gate:wired`.

Plus the per-deliverable DoD:

- [ ] `packages/runtime`: `HeavyRuntime` interface + Chrome offscreen impl + in-process mock; contract test green.
- [ ] SW↔offscreen RPC eviction-safe; integration test simulates SW restart.
- [ ] `packages/core/types`: every §6 entity has a Zod schema + 1+ round-trip test.
- [ ] `packages/core/crypto`: WebCrypto envelope per [PRD §5.3](../../prd.md#53-storage-of-keys-and-tokens) parameters; 100% coverage.
- [ ] `packages/core/crypto/credentials.ts`: `getActiveCredentials()` is the only call site for `chrome.storage.local` credential reads. Lint rule enforced; CI catches violations.
- [ ] `packages/db`: migration 0001 applied idempotently on heavy-doc init; OPFS persistence verified across restarts; sqlite-vec smoke test green.
- [ ] `packages/llm`: OpenRouter provider, task router, validate-and-retry wrapper, cost ledger writes + `getMonthlySpend()`. Error taxonomy complete.
- [ ] `packages/embeddings/local`: lazy-init + first-use SHA-verified download; tested against mock weights; no Phase 1 consumer wired.
- [ ] Onboarding: provider chooser (OpenRouter; OpenAI/Anthropic disabled with future-phase copy), key paste, real validation, skip path. Tailored error UX for `LlmKeyInvalid` / `LlmRateLimited` / `LlmUnavailable`.
- [ ] CI: `gate:offline` green on every PR; `gate:wired` green on nightly cron.
- [ ] Coverage ≥85% line / ≥75% branch aggregate; crypto at 100%.
- [ ] [docs/architecture.md](../../architecture.md) updated: `HeavyRuntime` section, RPC contract, migration policy, credentials read pattern.
- [ ] PRD §17 Phase 1 line updated to reflect "OpenRouter implementation" (was "OpenAI + Anthropic implementations"). Phase 1.5 line gains "+ direct provider implementations + multi-key Settings UX."

## 7. Future-sprint runways

Seams Phase 1 establishes so subsequent sprints are plug-in work only:

| Future sprint                             | Drops into seam(s)                                                                                                                                                                                                                                                                                        |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1.5 — Alarms + direct providers     | `chrome.alarms` wrapper. `LlmProvider` impls for `OpenAi` and `Anthropic` (interface unchanged). Multi-key Settings UX (storage shape unchanged from Phase 1). Encrypted-storage opt-in (crypto package shipped in Phase 1; just needs wiring).                                                           |
| Phase 2 — Daily Agent + Semantic Notes    | Task router gains `brief.morning`, `brief.eod`, `notes.autolink.summary`, `notes.semantic.query_rewrite` rows. Migration 0002 adds `notes`, `notes_fts`, `notes_vec` tables. `packages/embeddings/local` becomes consumed (semantic search). Cost ledger banner UX wired to existing `getMonthlySpend()`. |
| Phase 3 — Personalization + Blocker       | Streaming RPC layer (sibling to one-shot RPC). `negotiateBlock` becomes a real LLM call returning `AsyncIterable`.                                                                                                                                                                                        |
| Phase 4 — Gmail + Goals + OpenRouter PKCE | OAuth in `packages/integrations`. `OpenRouter` provider gains a PKCE-OAuth onboarding path alongside the BYOK paste flow shipped in Phase 1.                                                                                                                                                              |

## 8. Risks & mitigations

| Risk                                                      | Mitigation                                                                                                                                                                             |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| sqlite-wasm + OPFS init fails on a Chrome build           | OPFS smoke test in CI on every PR; `gate:offline` fails loudly if init throws.                                                                                                         |
| sqlite-vec WASM fails to load (binding issue)             | `tests/db.smoke.test.ts` calls `vec_version()`; gate fails before any feature work.                                                                                                    |
| OpenRouter API drift breaks request shape                 | Recorded fixtures + nightly `gate:wired` against the live API catches drift within 24h.                                                                                                |
| MV3 SW eviction drops in-flight RPC                       | Eviction-safe RPC layer (request-id + storage.session pending table); `tests/eviction.test.ts` simulates SW restart mid-call.                                                          |
| Weights download fails or supply-chain compromise         | SHA verified at download via WebCrypto subtleDigest; failure surfaces as `WEIGHTS_UNAVAILABLE`; consumer (Phase 2 semantic search) falls back to FTS.                                  |
| Onboarding key validation succeeds against wrong provider | OpenRouter is the only Phase 1 path; provider mis-selection isn't yet a meaningful failure mode. Becomes a real risk in Phase 1.5; addressed by multi-provider validation matrix then. |
| `HeavyRuntime` interface leaks Chrome-isms                | In-process mock contract test runs the same RPC suite against a non-Chrome impl; CI fails if the interface is Chrome-coupled.                                                          |
| Phase 1 ships, encrypted-storage path slips again         | Phase 1.5 names "encrypted-storage opt-in wiring" as its first deliverable, alongside alarms; the crypto package is already complete and tested at 100% so wiring is purely additive.  |

## 9. References

- [docs/prd.md](../../prd.md) — §3 (topology), §5 (auth), §6 (data model), §7 (LLM abstraction), §15 (privacy), §17 (phases)
- [docs/architecture.md](../../architecture.md) — Phase 0 reference (extended in Phase 1)
- [docs/superpowers/specs/2026-04-19-phase-0-scaffold-and-design-system-design.md](2026-04-19-phase-0-scaffold-and-design-system-design.md) — Phase 0 spec (foundational decisions)
- [OpenRouter API docs](https://openrouter.ai/docs) — OpenAI-compatible API contract
- [transformers.js](https://huggingface.co/docs/transformers.js) — embeddings runtime
- [sqlite-wasm](https://sqlite.org/wasm/doc/trunk/index.md), [sqlite-vec](https://github.com/asg017/sqlite-vec) — DB stack
