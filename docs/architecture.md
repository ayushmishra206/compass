# Compass Architecture

Living reference for the Compass monorepo. Update this doc whenever you add a package, change a seam contract, or introduce a new recipe.

---

## Package boundaries

```
compass/
├── apps/
│   └── extension/          # WXT + React 19 — the only app for now
└── packages/
    ├── ui/                 # Design system: tokens, primitives, icons, hooks, layout, ThemeProvider
    ├── core/               # Shared TS types + mock fixtures; Zod schemas in Phase 1
    ├── agents/             # Integration-seam stubs (Phase 0) → real agent business logic (Phase 2+)
    ├── llm/                # Phase 1: provider abstraction (OpenAI, Anthropic) + router + cost ledger
    ├── db/                 # Phase 1: SQLite-WASM + sqlite-vec + migrations
    ├── embeddings/         # Phase 1: local MiniLM via transformers.js
    └── integrations/       # Phase 1: OAuth PKCE; Phase 4: Gmail/Calendar APIs
```

**Dependency direction:** `apps/extension → packages/*`. Packages never import from apps. Within packages:

```
ui ← (nothing upstream)
core ← (nothing upstream)
agents ← core
llm, db, embeddings, integrations ← core (in Phase 1+)
apps/extension ← ui, core, agents
```

**Rationale.** Keeping `packages/ui` feature-agnostic means the design system stays reusable across other apps (options page, popup, future dashboards) without feature-data coupling. `@compass/core` is the stable vocabulary of the product; every package depends on its types but core depends on nothing.

---

## Integration seams

Every place where real LLM / DB / OAuth work will eventually happen is a named stub in `packages/agents/src/stubs/`. Consumers import by name; future phases replace implementations without touching consumer code.

| Seam                            | Signature                                               | Consumer       | Real impl sprint                                                    |
| ------------------------------- | ------------------------------------------------------- | -------------- | ------------------------------------------------------------------- |
| `validateLlmKey(provider, key)` | `(Provider, string) => Promise<{ valid, error? }>`      | Onboarding     | Phase 1 (OpenRouter only); Phase 1.5 adds OpenAI + Anthropic direct |
| `generateMorningBrief(inputs)`  | `(BriefInputs) => Promise<Brief>`                       | New Tab        | Phase 2 — LLM call with prompt template                             |
| `semanticSearch(query)`         | `(string) => Promise<NoteHit[]>`                        | CmdK           | Phase 2 — sqlite-vec hybrid retrieval                               |
| `detectAutoLinks(note)`         | `(Note) => Promise<AutoLink[]>`                         | Notes detail   | Phase 2 — embedding neighbor search                                 |
| `decomposeGoal(goal)`           | `(Goal) => Promise<GoalDecomposition>`                  | DecomposeModal | Phase 4 — high-tier LLM with structured output                      |
| `extractGmailActions(msg)`      | `(GmailMessage) => Promise<InboxAction \| null>`        | Inbox          | Phase 4 — Gmail API + LLM extraction                                |
| `draftReply(action)`            | `(Action) => AsyncIterable<string>`                     | DraftModal     | Phase 4 — streamed LLM with separation-of-extraction-and-action     |
| `negotiateBlock(rule, reason)`  | `(BlockRule, string) => AsyncIterable<NegotiationTurn>` | BlockOverlay   | Phase 3 — LLM negotiation w/ pattern detect                         |

All stubs are typed against `@compass/core` entity types, so real implementations must return the same shapes. Each stub has a latency parity test that fails if the real implementation runs faster than the canned delay — a cheap guard against accidentally breaking the "feels live" experience.

### Swapping in a real implementation (Phase 1+)

1. Keep the file at `packages/agents/src/stubs/<seam>.ts`.
2. Replace the body with real work (call provider, query DB, etc.).
3. Keep the function signature unchanged.
4. Add unit tests that mock the underlying dependencies (provider fetch, DB client).
5. Remove the canned-delay latency assertion from the existing test.
6. Consumers do not change.

---

## Network topology and approved third-party endpoints

The service worker is a thin event router. All heavy compute (LLM calls, DB queries, embeddings, OPFS writes) runs in the offscreen document. The new-tab UI communicates with the service worker via `postMessage`; the service worker forwards to offscreen via `rpc()`.

**Approved third-party endpoints** reachable from the service worker or offscreen runtime:

| Endpoint                 | Purpose                                                              | Data sent                                   |
| ------------------------ | -------------------------------------------------------------------- | ------------------------------------------- |
| `api.openai.com`         | LLM inference (user's own key / OAuth)                               | User's prompt + key                         |
| `api.anthropic.com`      | LLM inference (user's own key)                                       | User's prompt + key                         |
| Gmail / Calendar APIs    | Integration (user's OAuth token)                                     | OAuth-scoped requests                       |
| `assets.compassdash.com` | Compass-curated scene manifest (JSON, ~30 KB, 7-day TTL)             | No user data                                |
| `images.unsplash.com`    | Unsplash photo CDN (image bytes, hotlinked per Unsplash API terms)   | No user data                                |
| `api.open-meteo.com`     | Open-Meteo weather API (no key required, current weather + WMO code) | Rounded coordinates only, when user opts in |

`navigator.geolocation` access in the new-tab UI thread is gated by the user opting into weather-aware scenes via the Profile drawer (default OFF). When enabled, coordinates are rounded to 3 decimal places (~10 km radius) before storage and before any transmission to Open-Meteo. No content data transits the three new endpoints above.

---

## Routing & state

### Routing (`wouter`)

Hash-based routing, MV3-safe, ~1.5kb. Routes defined in `apps/extension/entrypoints/newtab/App.tsx`:

| Route                  | Surface                          |
| ---------------------- | -------------------------------- |
| `/`                    | `NewTab`                         |
| `/notes`, `/notes/:id` | `Notes` (+ CmdK modal)           |
| `/focus`               | `Focus` (+ FocusRunning overlay) |
| `/goals`, `/goals/:id` | `Goals` (+ DecomposeModal)       |
| `/inbox`, `/inbox/:id` | `Inbox` (+ DraftModal)           |
| `/blocker`             | `Blocker` (+ BlockOverlay)       |
| `/settings`            | `Settings`                       |

Onboarding is not a route — it mounts as an overlay via `useShell().openOverlay('onboarding')`.

### State (`zustand`)

One shell store at `apps/extension/app/state/shell.ts`:

- **Persisted:** `theme`, `accent`, `density` (localStorage).
- **Transient:** `overlay`, `overlayPayload`, `tweaksOpen`.

Surface-local state uses `useState`. A surface only promotes to Zustand when multiple sibling components need the same state (e.g., Notes list + CmdK both need the selected note ID).

---

## Heavy-doc + RPC

The service worker spins up an **offscreen document** (Chrome MV3 API) that runs the real compute: LLM calls, DB queries, embeddings. The extension's UI communicates via `rpc()` calls, which are request-response message pairs tagged with a request ID for correlation.

**Key contracts:**

- `HeavyRuntime` — interface exposed by offscreen; all methods async, no callbacks.
- `Routes` — registry mapping `'system.ping' | 'llm.validate_key' | 'scenes.getManifest' | 'scenes.fetchPhoto' | 'weather.getCurrent' | ...` to typed handlers.
- `ensureHeavyDoc()` — idempotent opener; checks if offscreen exists, creates if not.
- **Request-ID correlation:** every RPC gets a UUID; responses carry it back, allowing parallel in-flight calls.
- **Eviction safety:** offscreen is not guaranteed to stay alive (browser can kill it for memory); RPC timeout falls back to `ensure` + retry.

Example flow (`rpc('system.ping', {})`):

1. UI calls `rpc('system.ping', {})` → generates request ID `req-123`.
2. Sends `{ id: 'req-123', route: 'system.ping', payload: {} }` to offscreen.
3. Offscreen handler runs, returns `{ status: 'ok' }`.
4. Offscreen sends `{ id: 'req-123', result: { status: 'ok' } }` back.
5. RPC promise resolves with result.

**RPC routes registry** (all routes in `packages/runtime/src/routes.ts`):

| Route                    | Runs in   | Request                           | Response                                                              |
| ------------------------ | --------- | --------------------------------- | --------------------------------------------------------------------- |
| `system.ping`            | offscreen | `{}`                              | `{ status: 'ok' }`                                                    |
| `llm.validateKey`        | offscreen | `{ provider, key }`               | `{ valid, error? }`                                                   |
| `llm.complete`           | offscreen | `LlmRequest`                      | `LlmResponse`                                                         |
| `ledger.getMonthlySpend` | offscreen | `{ month }`                       | `{ usdEstimated }`                                                    |
| `scenes.getManifest`     | SW        | `{ etag?: string }`               | `{ manifest: SceneManifest, fetchedAt: number }`                      |
| `scenes.fetchPhoto`      | offscreen | `{ url: string, sha256: string }` | `{ blobUrl: string }` (cached or fresh)                               |
| `weather.getCurrent`     | SW        | `{ lat: number, lon: number }`    | `{ code: number, tempC: number, summary: string, fetchedAt: number }` |

---

## Stage pipeline

The new-tab page renders a full-bleed photo backdrop ("Stage") that reacts to time-of-day and (optionally) weather. Three caches live in OPFS under `compass.opfs/scenes/`:

- `manifest.json` — Compass-curated scene manifest (TTL 7 days, stale-while-revalidate). Hosted at `assets.compassdash.com/scenes/manifest.v1.json`.
- `weather.json` — last weather lookup (TTL 90 minutes). Source: Open-Meteo.
- `photos/<sha256>.jpg` — immutable photo cache (LRU evicted at 50 MB target). Source URL hotlinked from `images.unsplash.com`.

**Picker** ([packages/core/src/scenes/picker.ts](../packages/core/src/scenes/picker.ts)): pure function `pickScene(now, weather, manifest, dateSeed) → Scene`. Time-of-day maps to a mood band (dawn / fog / ocean / alpine / desert); weather narrows the mood pool by affinity tag; FNV-1a hash of `dateSeed + mood` selects deterministically within the pool. Same `(date, mood, weather)` tuple always produces the same scene.

**Privacy gate.** Weather-aware scenes are OFF by default. When the user toggles them ON in the Profile drawer, `navigator.geolocation` is prompted; coordinates are rounded to 3 decimals (~10 km) before storage and transmission to Open-Meteo. No content data ever transits these third-party endpoints.

---

## Migrations policy

Phase 1 introduced `packages/db` with SQLite-WASM + sqlite-vec stored in OPFS. Migrations are **additive-only**: no column drops, no table renames, only new columns (with defaults) or new tables.

**Naming and structure:**

- Historically, migrations were numbered files (`0001-foundation.sql`, `0002-add-embeddings.sql`).
- Currently, migration SQL is inlined as TypeScript strings in `packages/db/src/migration-runner.ts` to avoid build-tool friction in WASM bundles.
- Migrations run in numeric order on first open; `meta.schema_version` is checked before applying.

**Runner invariants:**

- `meta.schema_version` always equals the highest-numbered migration applied.
- Runner is idempotent: applying the same migration twice is safe (checked via version).
- No DROP/ALTER destructive ops — future schema changes only remove stubs from code, not from DB.

---

## Credential read pattern

Onboarding and settings both need to read the user's stored API keys. All credential reads go through **one function:** `getActiveCredentials()` in `packages/core/src/credentials.ts`. This is the single integration seam for `chrome.storage.local` reads, enforced by ESLint rule.

Future encrypted-storage migration (Phase 1.5+) will be a one-function edit: swap the storage backend inside `getActiveCredentials()` without touching consumers.

---

## LLM provider and router

### Multi-provider routing (Phase 1.5)

The Phase 1 router was scoped to a single provider (OpenRouter). Phase 1.5 widens
`getProviderInstance()` to dispatch by `ProviderId`, and `executeTask()` implements
first-failure failover across providers in deterministic order
`[default, openrouter, openai, anthropic]`. Trigger errors are `LlmKeyMissing`,
`LlmRateLimited`, and `LlmUnavailable` (after `callWithSchema`'s in-provider 3-attempt
retry exhausts on schema errors). Hard-fail errors (`LlmKeyInvalid`, `LlmTimeout`,
`LlmSchemaError`) surface immediately without failover.

Providers that lack a key in the active credentials are skipped during chain
construction; tasks without a model entry for a given provider in the routing table
are skipped silently mid-failover. The cost ledger writes one row per successful call
(no row for failed providers). On all-fail, the last error is re-thrown.

The `LlmProvider` interface itself remains identical to Phase 1 except for the
addition of `model: string` to `LlmRequest` (replacing the Phase 1 `_model` cast).
Anthropic-specific concerns (tool-use synthesis for structured output, system-as-top-level
parameter, `input_tokens`/`output_tokens` usage shape, `stop_reason` mapping) are
provider-internal and do not leak to the router.

---

## Scheduling (`@compass/integrations/scheduling`)

Phase 1.5 introduces a cross-browser alarm scheduler used by Phase 2's Daily Agent.

**Module layout:**

- `defaults.ts` — hardcoded `BRIEFING_HOUR=8`, `REFLECTION_HOUR=18`. Phase 2 swaps the body for `getUserProfile()` reads when UserProfile persistence ships.
- `scheduler.ts` — `computeDesired()` returns `{ name, when }` pairs in local-time epoch ms. `ensureAlarms(api?)` lists existing alarms via `chrome.alarms.getAll()`, compares to desired, and creates / clears differentials with a 60-second drift tolerance to avoid churn on hour-aligned reschedules.
- `handlers.ts` — `registerAlarmHandlers(events?)` wires `chrome.alarms.onAlarm` to dispatch `rpc('system.ping', { utterance: alarm.name })` inside `withHeavyDocAlive()`.

**Bootstrap.** [`apps/extension/entrypoints/background.ts`](../apps/extension/entrypoints/background.ts) calls `registerAlarmHandlers()` and `void ensureAlarms()` at top level, plus on `chrome.runtime.onInstalled` and `chrome.runtime.onStartup` (when present). The reconcile is idempotent — running it on every SW wake / FF persistent-page reload / Safari SW wake costs nothing when alarms already match.

**Keep-alive.** `withHeavyDocAlive(work)` (in [`packages/runtime/src/chrome-offscreen.ts`](../packages/runtime/src/chrome-offscreen.ts)) calls `ensureHeavyDoc()`, opens a `chrome.runtime.connect({ name: 'heavy-doc-keepalive' })` Port, runs the work, and disconnects in `finally`. Chrome will not evict the SW or offscreen while at least one Port is connected. The offscreen side accepts the Port via `chrome.runtime.onConnect` — the open Port itself is the contract; the listener body is empty.

**Testing.** Unit tests in `packages/integrations/src/scheduling/*.test.ts` (≥95% coverage on scheduler, ≥90% on handlers). The `gate:alarms` CI job loads the built `chrome-mv3` extension in headless Chromium via Playwright (under `xvfb-run` to satisfy MV3 service-worker registration) and asserts `chrome.alarms.getAll()` returns the two expected entries. Cross-browser verification on FF and Safari is via the manual checklist embedded in the alarms-workstream plan doc.

**Phase 2 swap surface.**

- `defaults.ts` body → `getUserProfile()` reads.
- `handlers.ts` → swap `'system.ping'` for `'brief.morning'` / `'brief.eod'` route names and the corresponding payload schemas. The scheduler module itself does not change.

---

## Daily Agent (`brief.morning` / `brief.eod`)

Phase 2 closes the alarm → LLM → drawer loop introduced by Phase 1.5 alarms.

**Module layout:**

- Agents at `packages/agents/src/brief.{morning,eod}.ts` orchestrate snapshot → `router.executeTask` → cost ledger row.
- Prompts at `packages/core/src/prompts/brief.{morning,eod}.md` with `{{locale}}`, `{{dateLocal}}`, `{{dayOfWeek}}`, `{{nowHHMM}}` interpolations.
- Storage in sqlite via `BriefRepo` ([`packages/db/src/repositories/brief.ts`](../packages/db/src/repositories/brief.ts)), composite key `(date_local, kind)`. `PomodoroRepo` aggregates focusSummary14d (peakHourLocal + trend). `CostLedgerRepo` records token + USD per generation.

**Trigger paths:**

- Alarm-driven: `chrome.alarms.onAlarm` → `withHeavyDocAlive(rpc('brief.morning'))`. Silent skip on `LlmCredentialsLocked`.
- Catch-up: new-tab mounts → `useBrief()` → `rpc('brief.getOrGenerate')`. Returns one of `loading` / `have-brief` / `locked-no-brief` / `too-early` / `error`.
- Manual: Brief drawer Regenerate button → `rpc('brief.morning', { trigger: 'manual' })`.

**UserProfile-backed alarms.** Scheduler `defaults.ts` async `getBriefingHour()` / `getReflectionHour()` reads `chrome.storage.local['profile.user.v1']`. ProfileDrawer's [`DailyTimesSection`](../apps/extension/app/drawers/profile/DailyTimesSection.tsx) edits trigger `rpc('alarms.refresh')` SW route → `ensureAlarms()`.

**Empty-state UX.** Phase 2 ships honestly sparse — calendar/Gmail/goals/Fitbit fields stay empty until Phase 4-5. Drawer template renders "Connect X to see Y" CTAs in [`apps/extension/app/drawers/brief/`](../apps/extension/app/drawers/brief/); the LLM is told not to invent data.

**Phase 2 swap surface for later phases:**

- Phase 4 (Calendar/Gmail/Goals) → snapshot transformers in agents extend to populate the empty arrays.
- Phase 5 (Fitbit) → `RecoverySection` empty-state replaced with real recovery score.
- Promptfoo CI → [`tests/prompt-eval/brief.morning.yaml`](../tests/prompt-eval/brief.morning.yaml) placeholder grows to 50 fixtures + ≥4/5 human rating gate.

---

## Settings + encrypted storage (`packages/core/src/crypto/`)

Phase 1.5 settings closes the Phase 1.5 gate by giving users multi-key BYOK CRUD + opt-in passphrase encryption.

**Module layout:**

- `keystore.ts` — AES-GCM + PBKDF2 envelope. Shipped in Phase 1; unchanged.
- `passphrase.ts` — `MIN_PASSPHRASE_LENGTH = 12`, `passphraseStrength`, `passphraseError`. Length-only rules per NIST SP 800-63B.
- `credentials.ts` — `getActiveCredentials()` shape-detects raw `LlmCredentials` JSON vs `EncryptedSecret` envelope at the same `chrome.storage.local['llm.creds.v1']` key. `setActiveCredentials()` is shape-aware (re-encrypts when storage holds envelope). New helpers: `enableEncryption(passphrase)`, `disableEncryption(currentPassphrase)`, `unlockCredentials(passphrase)`, `lockCredentials()`, `isEncryptionEnabled()`, `isLocked()`. Throws `LlmCredentialsLocked` when storage holds envelope and `chrome.storage.session['llm.creds.v1.kek']` is empty.

**Caching choice.** `chrome.storage.session` caches the raw passphrase string, not a derived KEK. `keystore.encrypt`/`decrypt` accept passphrases directly; caching the passphrase avoids `crypto.subtle.exportKey/importKey` round-trips on every read. Same security posture as caching a KEK (session storage is in-memory only, not on disk).

**Shell store lock-state slice.** [`apps/extension/app/state/shell.ts`](../apps/extension/app/state/shell.ts) carries `encryptionEnabled`, `locked`, `unlockHint` plus six actions (`refreshLockState`, `unlock`, `lock`, `requestUnlock`, `setEncryptionState`, `clearUnlockHint`). The fields are NOT persisted by Zustand `persist` — they're refreshed on App mount via `refreshLockState()` to match `chrome.storage.*` truth.

**UI surface.** Drawer-paradigm-native; no modal primitive introduced.

- ProfileDrawer: thin orchestrator. New extracted sections at [`apps/extension/app/drawers/profile/`](../apps/extension/app/drawers/profile/) — `ConnectedProvidersSection` (locked branch with PassphraseConfirmForm + Forgot passphrase link; unlocked branch with row list + ⋯ actions + Add another) and `EncryptionSection` (Off/On + Enable/Disable/Lock now).
- OnboardingDrawer: step 2 uses `<KeyValidator>`; step 3 ships real `<PassphraseSetForm>` opt-in alongside Skip.
- Topbar: lock chip on the right end, visible iff `encryptionEnabled && locked`. Click → `requestUnlock()` opens ProfileDrawer with `unlockHint=true`.
- Shared widgets at [`apps/extension/app/components/credentials/`](../apps/extension/app/components/credentials/): `<KeyValidator>`, `<PassphraseSetForm>`, `<PassphraseConfirmForm>`. Pure data-flow — never call `setActiveCredentials` directly; persistence is the parent's responsibility.

**Forgotten-passphrase recovery.** Inline confirmation in `ConnectedProvidersSection`'s locked branch. Clears `llm.creds.v1` + session cache + `profile.byokConfigured`, sets `onboardingLocked=true` → OnboardingDrawer pops up via the existing gate.

**Lazy unlock.** Components catching `LlmCredentialsLocked` call `useShell.getState().requestUnlock()`. The original action does not auto-retry; user re-clicks after unlock (form state is preserved).

**Phase 2 swap surface.** UserProfile persistence + `briefingHour`/`reflectionHour` controls land in ProfileDrawer as a new section alongside accent/scene/weather. The existing alarms scheduler swaps `defaults.ts` body for `getUserProfile()` reads. Encryption envelope already shipped — OAuth refresh tokens (Phase 4) reuse the same `encrypt`/`decrypt` helpers.

---

## Overlays

Three fullscreen/portal overlays owned by the shell store:

| Overlay        | Trigger                            | Component                            |
| -------------- | ---------------------------------- | ------------------------------------ |
| `focusRunning` | Start button in Focus planner      | `FocusRunning` in `routes/focus/`    |
| `blockOverlay` | Clicking a blocker tile            | `BlockOverlay` in `routes/blocker/`  |
| `onboarding`   | Manual trigger (settings, dev nav) | `Onboarding` in `routes/onboarding/` |

Modal-style overlays (CmdK, DecomposeModal, DraftModal) are rendered inline inside their owning surface via the `Modal` primitive's portal.

---

## Keyboard shortcuts

Registered by `useGlobalShortcuts()` in `apps/extension/app/shortcuts.ts`:

| Keys            | Action                      |
| --------------- | --------------------------- |
| `⌘K` / `Ctrl+K` | Toggle CmdK semantic search |
| `Esc`           | Close topmost overlay       |
| `?` + `d`       | Toggle Tweaks panel         |

Add new shortcuts by editing `shortcuts.ts`.

---

## Recipes

### Add a new UI primitive

1. Create `packages/ui/src/components/<Name>.tsx` — forward `className`, add `displayName`.
2. Create `packages/ui/src/components/<Name>.test.tsx` — render, variants, keyboard behavior, axe.
3. Add to `packages/ui/src/index.ts` barrel.
4. Document in `docs/design-system.md` under "Primitives".

### Add a new surface

1. Create `apps/extension/app/routes/<name>/index.tsx` — pure component consuming `@compass/core/fixtures` and `@compass/agents/stubs` where needed.
2. Add a render test at `apps/extension/app/routes/Surfaces.test.tsx` (or a sibling `<Name>.test.tsx`).
3. Add a route in `apps/extension/entrypoints/newtab/App.tsx`.
4. Add a `NAV_ITEMS` entry in `apps/extension/app/components/CompassSidebar.tsx`.
5. If the route has a breadcrumb, update `TITLES` in `apps/extension/app/components/CompassTopbar.tsx`.

### Add a new integration seam

1. Create `packages/agents/src/stubs/<seam>.ts` — typed signature using `@compass/core` types.
2. Return canned fixture data after a realistic delay.
3. Export via `packages/agents/src/stubs/index.ts` barrel.
4. Add a unit test at `packages/agents/src/stubs/<seam>.test.ts`.
5. Document the contract in this file's seam table.
6. Consumers import from `@compass/agents/stubs` (not directly from the file).

### Add a new LLM task (Phase 2+ preview)

1. Define the Zod schema in `packages/core/src/schemas/<taskId>.ts`.
2. Define the prompt template in `packages/core/src/prompts/<taskId>.ts` (SYSTEM frozen per-release).
3. Register the routing rule in `packages/core/src/prompts/routing.ts`.
4. Wire the real implementation into the appropriate seam stub.

---

## Testing

- **Unit / component:** Vitest + Testing Library + jest-axe. Co-located with source.
- **Typechecking:** `tsc --noEmit` per workspace under `pnpm -r typecheck`.
- **Lint:** ESLint + Prettier via `pnpm lint`; pre-commit runs lint-staged.
- **E2E:** Playwright (10 shell specs in `apps/extension/tests/e2e/` — drawer toggling, command palette, onboarding gate, scene resolution).
- **Visual regression:** Playwright screenshots with frozen clock (deferred to next sprint).

Run everything locally:

```bash
pnpm install
pnpm build        # WXT builds Chrome + Firefox extension bundles
pnpm test         # All workspaces
pnpm typecheck
pnpm lint
```

---

## Build & release

- **Dev:** `pnpm --filter @compass/extension dev` — WXT dev server with hot reload.
- **Build:** `pnpm build` — produces `apps/extension/.output/chrome-mv3/` and `.output/firefox-mv2/`.
- **Load unpacked (Chrome):** `chrome://extensions` → Developer mode → Load unpacked → select `.output/chrome-mv3`.
- **Load in Firefox:** `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → select `manifest.json` under `.output/firefox-mv2`.
- **CI:** `.github/workflows/ci.yml` runs lint + typecheck + test + build + e2e on every push/PR.

Store submission (Chrome Web Store, AMO, Safari App Store) is Phase 5 per [PRD §17](./prd.md#17-implementation-phases-and-acceptance-gates).

### Working in WXT dev mode

The extension is an MV3 bundle living in four execution contexts. Hot reload and inspection differ across them — most onboarding pain comes from confusing one for another.

**Build artifact layout (`apps/extension/.output/chrome-mv3/`):**

- `manifest.json` — MV3 manifest (mtime is the canonical "is this build fresh" signal used by the e2e globalSetup).
- `newtab.html`, `popup.html`, `options.html`, `offscreen.html` — entry HTML files; new-tab override is wired via `chrome_url_overrides`.
- `background.js` — the service worker. Restarted on code change; in-memory state is lost.
- `chunks/`, `assets/` — Vite-built JS/CSS with content-hashed filenames.

**Reload semantics differ per context:**

- **Background SW + content scripts:** WXT auto-reloads on save (Chrome DevTools shows "service worker terminated and started").
- **New-tab page:** the page itself does _not_ live-reload. After a code change, open a fresh tab (or `Cmd/Ctrl+R` in an open tab) to pick up the new bundle.
- **Offscreen document:** ephemeral; the SW recreates it on first RPC after a reload. State is wiped (in-memory caches, blob URLs); OPFS persists.
- **Popup / options:** reopen the popup or options page to pick up changes.

**Inspecting each context in DevTools:**

- **New-tab page:** `Cmd/Ctrl+Shift+I` on the tab itself.
- **Background SW:** `chrome://extensions` → Compass → "service worker" link → opens DevTools attached to `background.js`.
- **Offscreen document:** `chrome://extensions` → Compass → "offscreen" link (only visible while the offscreen is alive); same DevTools surface.
- **Popup:** right-click the toolbar icon → Inspect popup.

**Resetting OPFS during dev** (the scene cache, Phase 2+ vector store, etc.): `chrome://extensions` → Compass → "Storage" → "Clear data". Or `navigator.storage.estimate()` from the new-tab DevTools console for a sanity check. Reloading the extension does _not_ clear OPFS — only an explicit reset does.

**Extension ID:**

- In dev / unpacked, the ID is derived from the absolute path of the loaded directory and is stable as long as the path doesn't change. The e2e harness resolves it dynamically from the service worker URL (`chrome-extension://<id>/background.js`); it is never hardcoded.
- In production builds, the ID is derived from the `key` field embedded by the store at publish time.

**Dev server vs build:**

- `pnpm --filter @compass/extension dev` runs WXT's dev server, which is what to use during day-to-day work — it auto-rebuilds and reloads the extension via the WXT runtime helpers.
- The e2e suite always runs against the static `.output/chrome-mv3/` bundle (via Playwright's `--load-extension`), not the dev server. The globalSetup auto-rebuilds when source files are newer than `manifest.json`.

**Source maps:** generated by Vite in dev and build modes; DevTools resolves them automatically when viewing chunked output.

**Headless extension testing:** Playwright's default `chromium-headless-shell` does _not_ support extensions. The e2e fixture explicitly selects `channel: 'chromium'` so the full Chromium binary is used; without that, persistent contexts close before the service worker registers.
