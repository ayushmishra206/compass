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
- `Routes` — registry mapping `'system.ping' | 'llm.validate_key' | ...` to typed handlers.
- `ensureHeavyDoc()` — idempotent opener; checks if offscreen exists, creates if not.
- **Request-ID correlation:** every RPC gets a UUID; responses carry it back, allowing parallel in-flight calls.
- **Eviction safety:** offscreen is not guaranteed to stay alive (browser can kill it for memory); RPC timeout falls back to `ensure` + retry.

Example flow (`rpc('system.ping', {})`):

1. UI calls `rpc('system.ping', {})` → generates request ID `req-123`.
2. Sends `{ id: 'req-123', route: 'system.ping', payload: {} }` to offscreen.
3. Offscreen handler runs, returns `{ status: 'ok' }`.
4. Offscreen sends `{ id: 'req-123', result: { status: 'ok' } }` back.
5. RPC promise resolves with result.

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
- **E2E:** Playwright-for-extensions (deferred to next sprint).
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
- **CI:** `.github/workflows/ci.yml` runs lint + typecheck + test + build on every push/PR.

Store submission (Chrome Web Store, AMO, Safari App Store) is Phase 5 per [PRD §17](./prd.md#17-implementation-phases-and-acceptance-gates).
