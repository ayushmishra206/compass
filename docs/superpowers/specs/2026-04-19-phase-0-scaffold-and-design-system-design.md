# Compass — Phase 0: Scaffold & Design System

**Status:** Draft for review
**Date:** 2026-04-19
**Phase:** 0 (Bootstrap) per [PRD §17](../../../prd.md#17-implementation-phases-and-acceptance-gates)
**Scope:** Repo scaffold, design system (`packages/ui`), faithful React port of all 7 surfaces + onboarding from the design prototype, integration-seam stubs, testing harness, and CI.

---

## 1. Purpose

Establish the foundation every subsequent Compass phase builds on:

- A **WXT + React 19 + TypeScript 5.6** monorepo that builds for Chrome, Firefox, and Safari.
- A **robust design system** (`packages/ui`) that encodes the warm-paper aesthetic from the design prototype as typed React primitives and Tailwind v4 tokens.
- **Pixel-perfect ports** of all seven product surfaces from [design/project/Compass.html](../../../../design/project/Compass.html), wired to mock data — no LLM integration yet.
- **Named, typed integration seams** for every place a future sprint will plug in LLM / DB / auth logic.
- Durable **testing and CI harness** so future sprints can swap integration-seam implementations with confidence.
- Living reference docs (`docs/design-system.md`, `docs/architecture.md`, root `AGENTS.md`) that subsequent phases update rather than rewrite.

Explicit non-goals: no real LLM calls, no SQLite, no OAuth flows, no crypto envelope, no service-worker or offscreen runtime beyond empty scaffolds. Those land in Phase 1.

## 2. Scope

### 2.1 In scope

- Monorepo bootstrap: pnpm workspaces, Turborepo, shared `tsconfig.base.json`, ESLint, Prettier, Husky.
- `apps/extension` — WXT-based extension shell with new-tab, popup, options, background, and offscreen entrypoints. Background and offscreen are empty stubs with TODO pointers to Phase 1.
- `packages/ui` — the design system (tokens, primitives, icons, hooks, layout).
- `packages/core` — stubbed with mock-data entity types only (UserProfile, Note, Goal, etc.). Zod schemas come in Phase 1.
- `packages/llm`, `packages/db`, `packages/embeddings`, `packages/integrations`, `packages/agents` — stubbed with `package.json` + `README.md` + an empty barrel export so cross-workspace imports resolve.
- Faithful ports of all seven surfaces (New Tab, Notes, Focus, Goals, Inbox, Blocker, Settings) plus Onboarding and the two full-screen overlays (FocusRunning, BlockOverlay), all wired to mock data.
- Eight integration-seam stubs in `packages/agents/src/stubs/`, each returning the prototype's canned data after a realistic latency delay.
- Testing: Vitest + Testing Library + jest-axe for unit/component, Playwright-for-extensions for E2E smoke, visual regression via Playwright screenshots.
- CI: GitHub Actions running lint, typecheck, unit test, build for three browser targets, E2E smoke, and visual regression.
- Three living docs: `docs/design-system.md`, `docs/architecture.md`, `AGENTS.md`.

### 2.2 Out of scope (for this sprint)

- Real LLM provider adapters, prompt templates, router, cost ledger.
- SQLite-WASM, sqlite-vec, migrations.
- WebCrypto passphrase envelope.
- OAuth 2.0 PKCE flows (Google, OpenRouter).
- Service-worker alarms, offscreen document runtime, offscreen ML pipeline.
- Chrome Web Store / AMO / Safari App Store signing and upload.
- Storybook (can be added in a later sprint without rework).

## 3. Architecture

### 3.1 Repository layout

```
compass/
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .nvmrc                             # 22
├── .eslintrc.cjs, .prettierrc, .husky/
├── AGENTS.md                           # ≤200 lines, per PRD §4.3
├── apps/
│   └── extension/
│       ├── wxt.config.ts               # Chrome / Firefox / Safari targets
│       ├── package.json
│       ├── entrypoints/
│       │   ├── newtab/index.html, main.tsx, App.tsx
│       │   ├── popup/                  # stub — "Open new tab" link only
│       │   ├── options/                # stub — redirect to /settings
│       │   ├── background.ts           # empty stub + TODO(phase-1)
│       │   └── offscreen/              # empty stub + TODO(phase-1)
│       ├── app/
│       │   ├── routes/                 # one dir per surface (§3.3)
│       │   ├── components/             # cross-surface composites
│       │   ├── state/                  # zustand stores
│       │   ├── mock/                   # typed fixtures ported from design/data.jsx
│       │   └── shortcuts.ts            # keyboard registry
│       └── public/                     # fonts, icons
├── packages/
│   ├── ui/                             # THE design system (§4)
│   ├── core/                           # mock-entity types only this sprint
│   ├── agents/
│   │   └── src/stubs/                  # the 8 integration seams
│   ├── llm/, db/, embeddings/, integrations/  # stubs with barrel exports
├── tests/
│   ├── e2e/                            # playwright
│   └── visreg/                         # screenshot baselines
├── docs/
│   ├── prd.md                          # existing
│   ├── architecture.md                 # NEW — package boundaries, seams, how-to-extend
│   ├── design-system.md                # NEW — tokens, primitives, recipes
│   └── superpowers/specs/…
└── .github/workflows/ci.yml
```

### 3.2 Tech stack

All choices match or refine PRD §4.1.

| Layer | Choice | Notes |
|---|---|---|
| Extension framework | WXT (Vite-based) | |
| UI | React 19 + TypeScript 5.6 strict | `noUncheckedIndexedAccess: true` |
| Routing | `wouter` ^3 | ~1.5kb, hash-based, MV3-safe |
| State | Zustand ^5 with `chrome.storage` adapter | Per-store persistence keys |
| Styling | Tailwind v4 (CSS-first config) + design tokens | Dark mode via `data-theme` attribute |
| Forms / schema | Zod ^3 | Types live in `packages/core` |
| Animation | Framer Motion ^12 | Respects `prefers-reduced-motion` |
| Fonts | `@fontsource/newsreader`, `@fontsource/instrument-sans`, `@fontsource/jetbrains-mono` | Self-hosted, no Google Fonts CDN |
| Testing (unit) | Vitest ^2 + @testing-library/react + jest-axe | |
| Testing (E2E) | @playwright/test ^1 + Playwright extension helper | Chromium + Firefox; Safari deferred |
| Package manager | pnpm ^9 | |
| Build orchestration | Turborepo ^2 | Cache lint/typecheck/test per workspace |
| Node | 22 LTS | Pinned via `.nvmrc` |

### 3.3 Routing

`wouter` with eight routes; `BlockOverlay` and `FocusOverlay` are portal-rendered fullscreen overlays dispatched from any route via the shell store.

| Route | Component | Mirrors |
|---|---|---|
| `/` | `routes/newtab` | Prototype New Tab |
| `/notes` | `routes/notes` | Prototype Notes list |
| `/notes/:id` | `routes/notes` | Prototype Notes detail |
| `/focus` | `routes/focus` | Prototype Focus planner |
| `/goals` | `routes/goals` | Prototype Goals list + detail |
| `/inbox` | `routes/inbox` | Prototype Inbox + detail |
| `/blocker` | `routes/blocker` | Prototype Site Blocker |
| `/settings` | `routes/settings` | Prototype Settings |
| `/onboarding` | `routes/onboarding` | Prototype 3-step wizard |

### 3.4 State

- **Shell store** (`apps/extension/app/state/shell.ts`): `{theme, accent, density, activeOverlay, cmdKOpen, tweaksOpen}`. Persisted via `chrome.storage.sync` for `{theme, accent, density}` and `chrome.storage.session` for the transient flags.
- **Surface-local state** uses `useState` for truly local things. Zustand sub-stores only when state crosses two or more components within a surface (e.g., Notes uses a store because both the list and ⌘K need the selection).
- **Mock data** is imported statically from `apps/extension/app/mock/` and typed against entity types from `packages/core`.

## 4. Design system — `packages/ui`

### 4.1 Token architecture

Tokens are authored in two synchronized places:

1. `packages/ui/src/tokens.ts` — TypeScript constants for programmatic consumption (accent math, theme provider, tests).
2. `packages/ui/src/theme.css` — Tailwind v4 `@theme` block exposing the same tokens as Tailwind utilities.

A `tokens.test.ts` snapshot test fails any drift between the two.

**Token families:**

| Family | Tokens |
|---|---|
| Background / surface | `bg`, `bg-deep`, `panel`, `panel-2` (light + dark) |
| Ink | `ink`, `ink-2`, `ink-3`, `ink-4` (light + dark) |
| Hair | `hair`, `hair-2` (light + dark) |
| Accent | `accent`, `accent-ink`, `accent-wash` — driven by `{h, c, l}` swapped at runtime |
| Accent swatches | `terracotta`, `ink`, `sage`, `ocean`, `plum` |
| Secondary hues | `sage`, `slate` |
| Radii | `sm: 8`, `md: 14`, `lg: 22` |
| Shadows | `sh-1`, `sh-2`, `sh-3` |
| Type | `serif` (Newsreader), `sans` (Instrument Sans), `mono` (JetBrains Mono); display/body/mono size ramps |
| Motion | `fast 120ms`, `mid 220ms`, `slow 400ms`; `fadeIn`, `slideUp`, `spin`, `blink` keyframes |
| Density | `spacious`, `compact` — shell padding + sidebar width only |

### 4.2 Theme provider

`<ThemeProvider>` mounts at every entrypoint root. It:

1. Reads persisted `{theme, accent, density}` from storage (fallback defaults: `light`, `terracotta`, `spacious`).
2. Writes `document.documentElement.dataset.theme` = `light | dark`.
3. Writes CSS custom properties `--accent-h`, `--accent-c`, `--accent-l` from the selected swatch.
4. Exposes the state via the shell Zustand store.

### 4.3 Primitives

All primitives live in `packages/ui/src/components/<Name>.tsx`, each:
- is a pure function component,
- forwards `className` and `ref`,
- has a `displayName`,
- has a `.test.tsx` covering render + variants + a11y,
- has a TSDoc comment on the component and on every prop, consumed by `docs/design-system.md`.

```
Button           variants: default | primary | accent | ghost; sizes: xs | sm | md
IconButton       32×32 button wrapper
Card             CardHeader, CardBody; padded | hair variants
Badge            variants: default | accent | sage | slate; Dot subcomponent
Input            hair-bordered text input; size xs..md; mono variant
Textarea         hair-bordered multi-line
Kbd              keyboard-key pill
Modal            ModalScrim, ModalHeader, ModalBody; wide variant; focus-trap + Esc
Segmented        toggle group (theme + density use this)
Swatch           round color disc (accent picker)
Toggle           animated pill switch
Tag              mono 10px label
Spinner          concentric ring, 14px
BrandMark        the compass logo (ported from prototype CSS gradient)
Divider          hairline rule (vertical + horizontal)
Progress         bar, 0..1; optional label
Prose            serif prose wrapper (for note bodies)
```

### 4.4 Icons

`packages/ui/src/icons/` — every icon from the prototype's `icons.jsx` as a typed component. Same feather-style 1.5px stroke. Exported both as individual named components (`IconSearch`, `IconPlus`, …) and as a map `{ compass, home, note, … }` for dynamic lookup in the sidebar.

### 4.5 Utilities & hooks

| Export | Purpose |
|---|---|
| `cn(...args)` | `clsx` + `tailwind-merge` wrapper |
| `useEscape(onEscape)` | Esc keydown handler |
| `useFocusTrap(ref, active)` | Focus trap for modals/overlays |
| `usePersistentState(key, initial)` | `chrome.storage`-backed useState |
| `useShortcuts(bindings)` | Global keyboard-shortcut registry |
| `useTheme()` | Accessor for theme store |
| `useOverlay()` | Dispatch + close the two fullscreen overlays |

### 4.6 Layout primitives

```
AppShell         sidebar + main grid; density-aware; mobile collapse <960px
Sidebar          from shell.jsx; nav items + brand + budget card + user line
Topbar           breadcrumb + date + search stub + plus button
Surface          28px/32px/64px padded container, max-width 1180px
Grid             12-col CSS grid helper
```

## 5. Surface port strategy

### 5.1 Per-surface structure

Each surface is a route directory with this shape:

```
routes/<name>/
├── index.tsx              # <SurfaceName /> — entry, wires data + seams
├── <Composite>.tsx        # surface-specific composites (one per section)
├── data.ts                # typed mock re-exports from app/mock/
└── types.ts               # surface-local interface types
```

### 5.2 Integration seams

Every place the prototype simulates LLM/DB/network work becomes a named, typed stub in `packages/agents/src/stubs/`.

| Seam | Signature | Used by | Canned response | Real impl sprint |
|---|---|---|---|---|
| `generateMorningBrief(inputs)` | `(BriefingInputs) => Promise<BriefingOutput>` | New Tab | Mocked prototype brief + 1.8s latency | Phase 2 |
| `semanticSearch(query)` | `(string) => Promise<NoteHit[]>` | CmdK | Fuzzy-matched notes from mock | Phase 2 |
| `detectAutoLinks(note)` | `(Note) => Promise<AutoLink[]>` | Notes detail | Canned related list | Phase 2 |
| `decomposeGoal(goal)` | `(Goal) => Promise<GoalDecomposition>` | DecomposeModal | Two-stage (thinking → result) | Phase 4 |
| `extractGmailActions(msg)` | `(GmailMessage) => Promise<GmailExtract>` | Inbox | Canned extracts from mock | Phase 4 |
| `draftReply(action)` | `(ExtractedAction) => AsyncIterable<string>` | DraftModal | Streamed prototype draft | Phase 4 |
| `negotiateBlock(rule, reason)` | `(BlockRule, string) => AsyncIterable<NegotiationTurn>` | BlockOverlay | Two-turn canned exchange | Phase 3 |
| `validateLlmKey(provider, key)` | `(Provider, string) => Promise<{valid: boolean, error?: string}>` | Onboarding | Any non-empty string → valid after 900ms | Phase 1 |

Every consumer imports these by name from `@compass/agents/stubs`. Next sprint replaces the implementations; no consumer code changes.

### 5.3 Accessibility

- Every modal is focus-trapped, Esc-dismissible, returns focus on close.
- Every interactive element has a visible focus ring (accent color, 2px offset; dark-mode variant).
- Shortcuts registered via `useShortcuts`:
  - `⌘K` / `Ctrl+K` → open CmdK
  - `Esc` → close topmost overlay
  - `? b` → toggle Morning Brief
  - `? d` → toggle Tweaks panel
- Animations respect `prefers-reduced-motion`.
- Every surface passes `axe-core` with 0 violations in tests.

## 6. Testing strategy

### 6.1 Unit & component

| Target | Tool | Count (approx) | Threshold |
|---|---|---|---|
| Tokens (drift + accent math) | Vitest snapshot | 4 | 100% |
| UI primitives | Vitest + RTL + jest-axe | 1 per primitive × ~17 = 17 | ≥90% branch |
| Hooks | Vitest | 7 | 100% |
| Integration-seam stubs | Vitest | 1 per seam × 8 = 8 | 100% (Zod-valid shape + latency window) |
| Shell state store | Vitest | 4 | ≥90% |
| Surface render smoke | Vitest + RTL + jest-axe | 7 + 3 overlays + onboarding = 11 | Each: renders, a11y clean, primary click |

### 6.2 End-to-end

Playwright-for-extensions, Chromium + Firefox:

1. Install extension → new-tab mounts with Morning Brief visible.
2. Click each nav item → route changes, surface renders.
3. ⌘K opens CmdK, Esc closes.
4. Open Tweaks, toggle to dark, verify `data-theme="dark"`.
5. Click a blocker rule tile → BlockOverlay mounts, "Proceed anyway" dismisses.
6. Click "Start focus" → FocusRunning overlay mounts, "End early" dismisses.
7. Click "View onboarding" pill → Onboarding wizard mounts, complete → dismiss.

### 6.3 Visual regression

Playwright screenshots committed to `tests/visreg/__screenshots__/`, diffed on every CI run. One screenshot per surface × `{light, dark}` = 14 baselines. Uses a frozen clock (`Date.now()` stubbed to `2026-04-20T07:42:00-04:00`) so time-dependent rendering is deterministic.

### 6.4 Coverage target

Phase 0 aggregate: ≥85% line, ≥75% branch (per PRD §16.1 overall target).

## 7. CI

`.github/workflows/ci.yml`:

| Job | Steps | Notes |
|---|---|---|
| `lint` | `turbo lint` | ESLint + Prettier check |
| `typecheck` | `turbo typecheck` | `tsc --noEmit` per workspace |
| `test` | `turbo test` | Vitest; uploads coverage artifact |
| `build` | `turbo build` | WXT build × {chrome, firefox, safari} |
| `e2e` | `playwright test` | Chromium + Firefox; uploads report |
| `visreg` | `playwright test --project=visreg` | Diffs against committed baselines |

All jobs run on Ubuntu with Node 22. Turborepo remote cache is optional; local cache is enabled.

## 8. Deliverables — living reference docs

These three docs are created in this sprint and updated (not rewritten) in every subsequent phase.

### 8.1 `docs/design-system.md`

One page per primitive: usage, props, accessibility notes, variants with code sample. Tokens reference with color swatches. Accent-swap recipe. Density recipe. Motion primitives. Generated partly from JSDoc on each primitive; hand-written for token tables.

### 8.2 `docs/architecture.md`

- Package boundaries and what each workspace owns.
- Integration-seam contract table (the 8 stubs + how to swap in a real impl).
- Recipe: "How to add a new surface."
- Recipe: "How to add a new UI primitive."
- Recipe (stub for Phase 2): "How to add a new LLM task."

### 8.3 `AGENTS.md` (repo root, ≤200 lines)

Per PRD §4.3: build/test/lint commands, the four architectural invariants (§1 of PRD), pointers to the two docs above, and the "never do" list.

## 9. Definition of Done

- [ ] `pnpm install && pnpm build` succeeds on a fresh clone. WXT produces unpacked extensions for Chrome, Firefox, and Safari targets.
- [ ] Extension loads in Chrome and Firefox; new-tab shows the Morning Brief with mock data.
- [ ] All eight surfaces (newtab, notes, focus, goals, inbox, blocker, settings, onboarding) render faithfully versus the prototype — confirmed by visual regression baselines.
- [ ] Both fullscreen overlays (FocusRunning, BlockOverlay) mount and dismiss.
- [ ] Theme toggle works, accent swap works, density toggle works; all three persist across reload.
- [ ] ⌘K opens CmdK; Esc closes every overlay.
- [ ] `packages/ui` exports all primitives listed in §4.3, plus icons, hooks, and layout primitives. Each primitive has a test + passes axe.
- [ ] All eight integration-seam stubs implemented, typed, and tested.
- [ ] CI green across lint, typecheck, test, build, e2e, visreg.
- [ ] Coverage ≥85% line overall.
- [ ] `docs/design-system.md`, `docs/architecture.md`, `AGENTS.md` written, reviewed, and committed.
- [ ] Every stubbed package exports an empty barrel so imports resolve; each carries a `README.md` pointing at the sprint that will fill it in.

## 10. Future-sprint runways

Seams this sprint establishes so the next phases are plug-in work only:

| Future sprint | Drops into seam(s) |
|---|---|
| Phase 1 — Foundation | `validateLlmKey` (real HTTP), Zod schemas (currently TypeScript-only types), `packages/core/crypto`, SQLite via `packages/db`, offscreen runtime scaffold in `entrypoints/offscreen/` |
| Phase 2 — Daily Agent + Semantic Notes | `generateMorningBrief`, `semanticSearch`, `detectAutoLinks` |
| Phase 3 — Personalization + Blocker | `negotiateBlock`; personalization surfaces already rendered, need data-flow backing |
| Phase 4 — Gmail + Goals | `extractGmailActions`, `draftReply`, `decomposeGoal`, OAuth PKCE in `packages/integrations/` |
| Phase 5 — Multimodal | Voice / image-gen / OCR surfaces already have disabled flags in Settings; enabling them in Phase 5 adds seams + UI additions only, no rework |

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| WXT + React 19 + Tailwind v4 compatibility issues | Smoke-test the stack in first task; fall back to Tailwind v3 if v4 blocks. (Unlikely — both are GA in 2026.) |
| Safari build path in WXT still rough | Scaffold Safari target but allow E2E to skip Safari; revisit in Phase 5. |
| Visual regression flakiness on CI | Freeze clock, freeze fonts (self-host), pin viewport, use `toHaveScreenshot` with `maxDiffPixelRatio: 0.01` |
| `oklch()` + CSS custom properties + Tailwind v4 interaction | Verified in prototype already. Token test prevents drift. |
| Pixel-perfect port drifting over time | Visual regression baselines committed and compared every PR. Drift requires an explicit baseline-update commit. |

## 12. References

- [docs/prd.md](../../prd.md) — §4 (stack), §17 (phases), §4.3 (AGENTS.md)
- [design/project/Compass.html](../../../design/project/Compass.html) — source of truth for visual design
- [design/project/src/](../../../design/project/src/) — prototype components being ported
- [design/README.md](../../../design/README.md) — handoff guidance
