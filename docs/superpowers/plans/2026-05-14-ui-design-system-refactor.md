# UI design-system refactor — handoff plan

**Status:** proposed
**Author:** ayush + claude (handoff from #11)
**Date:** 2026-05-14
**Estimate:** 8–16 focused hours, plus migration time per surface

## Why

PR #11 surfaced the cost of not having shared FE primitives. We hit the same class of bug three times in one branch:

- Topbar nav and Hero copy went unreadable over bright Unsplash photos because every component re-implemented its own `color` choice (`--color-ink` vs `--color-ink-2` vs `--color-ink-3` vs *unset*) and its own scrim/shadow strategy (or none).
- The brief-card `<h2>` had no explicit `color` and inherited a stray accent color from somewhere upstream.
- The `prefers-reduced-motion` rule used `animation-duration: 0.001ms` globally, which made any `infinite alternate` keyframe strobe — a per-component fix would not have caught this; it needs a system-level rule.

Each fix was correct in isolation. None of them prevent the *next* drawer or component from making the same mistake. The codebase has no `Text`/`Button`/`Card` primitives that would force the right answer by default.

Tailwind v4 is configured (`@theme` block in `packages/ui/src/theme.css`, `@import 'tailwindcss'` in `apps/extension/app/main.css`) but components use raw inline `CSSProperties` literals instead of utility classes that consume the tokens. So we have token definitions without token consumption.

## Goals

1. **Single source of truth** for typography, color, spacing, radius, shadow, motion. Tokens live in CSS vars (already there); components consume them only via Tailwind utility classes or named primitives — never by re-typing the var name in an inline style.
2. **A small, mandatory set of primitives** (`Text`, `Button`, `Card`, `Pill`, `Surface`, `OverlayText`, `Stack`/`Row`) that every shell component uses. New components should not be writing `<div style={{ ... }}>` for anything covered by a primitive.
3. **Contrast safety by construction.** Any text rendered over the Stage photo goes through `<OverlayText>`, which encapsulates the scrim+shadow recipe and exposes a `tone` prop (`primary`/`secondary`/`muted`). Drift from the recipe becomes impossible.
4. **Automated a11y guardrails** so contrast / labelling / focus regressions fail CI instead of getting caught by eyeballing screenshots.

## Non-goals

- A visual redesign. The reference design in `docs/superpowers/specs/2026-05-03-shell-pivot-design/` stays canonical; this plan only changes how it's built.
- A CSS-in-JS migration to Emotion / styled-components. Tailwind v4 + CSS vars is enough; adding another runtime is overkill.
- Removing `GlassCard`. It's the right shape, just under-used. Generalize it into the `Surface` primitive.

## Proposed primitive set (in `packages/ui/src/primitives/`)

| Primitive | Purpose | Variants / props |
|-----------|---------|------------------|
| `<Text>` | Every text node | `variant`: `display` / `title` / `body` / `label` / `mono`; `tone`: `primary` / `secondary` / `muted` / `accent`; `as`: `'h1'..'h6' \| 'p' \| 'span'` |
| `<OverlayText>` | Text rendered over the Stage photo | Wraps `<Text>` and applies the canonical `text-shadow` recipe; same variant/tone API |
| `<Button>` | All clickable actions | `variant`: `primary` / `ghost` / `icon`; `size`: `sm` / `md`; consistent focus ring |
| `<Pill>` | Nav pills, filter chips | `selected`, `tone`; replaces the duplicated `pillStyle` in Topbar/Ticker |
| `<Card>` | Solid surfaces with no glass | `radius`, `padding` props that consume tokens |
| `<Surface>` | Glass surfaces | Generalizes `GlassCard`: `tier` 1/2/3; consumes `--glass-tint-N` / `--glass-N` |
| `<Stack>` / `<Row>` | Layout primitives | `gap` token, `align`, `justify`; replaces ad-hoc flex inline styles |
| `<Icon>` | Icon wrapper | Consistent stroke width, size tokens, `aria-label` requirement |

## Token consolidation

Today's `packages/ui/src/theme.css` already declares the right tokens. Tighten the rules:

- **Color tokens:** keep the `--color-ink` / `--color-ink-2` / `--color-ink-3` / `--color-ink-4` ladder, but document the rule in primitives: `primary` → `--color-ink`, `secondary` → `--color-ink-2`, `muted` → `--color-ink-3`, `tertiary metadata` → `--color-ink-4`. **No component sets `color` directly.**
- **Spacing scale:** add a 4-step scale (4 / 8 / 14 / 20 / 28 / 40) as `--space-1..6`. `Stack`/`Row` only accept these; no arbitrary `gap: 17px`.
- **Radius scale:** `--radius-sm/md/lg/pill` already exist; primitives expose them as named props.
- **Shadow recipes:** `--shadow-overlay-text`, `--shadow-card`. The scrim composition we landed in `Stage.tsx` becomes `--scrim-top`, `--scrim-bottom`, `--scrim-right` so other surfaces can compose it.
- **Motion tokens:** reuse `--motion-fast/mid/slow/scenefade`. Confirm reduced-motion strategy remains `animation-iteration-count: 1`.

## Migration phases

**Phase A — primitives land, no migration yet (1 day)**
- Add the primitive components to `packages/ui/src/primitives/`.
- Add unit tests + a11y tests (`@testing-library/jest-dom` + `jest-axe`).
- Add a Storybook-equivalent or a `dev/primitives.html` page that renders every primitive in every variant against the canonical Unsplash photos for visual review.
- No app code changes yet.

**Phase B — migrate the shell (1–2 days)**
- `Topbar`, `Hero`, `Ticker` → primitives. These three are the highest-leverage surfaces.
- Delete the per-file `textShadow` / `pillStyle` / inline `CSSProperties` literals as you go.
- Visual diff against the design reference at each surface; no regressions.

**Phase C — migrate drawers (2–3 days)**
- `BriefDrawer`, `TodayDrawer`, `GoalsDrawer`, `NotesDrawer`, `InboxDrawer`, `FocusDrawer`, `ProfileDrawer`, `OnboardingDrawer` → primitives.
- Drawers also re-implement the same patterns (mono labels, glass cards, accent buttons). Highest dedupe leverage.

**Phase D — guardrails (½ day)**
- `eslint-plugin-jsx-a11y` enforced in CI.
- `eslint-plugin-tailwindcss` ensures consistent class ordering and no arbitrary values where tokens exist.
- Jest-axe contrast checks on the rendered Topbar / Hero / Ticker / drawers in unit tests.
- Playwright visual-regression baseline of the new tab against 3 representative photos (bright/medium/dark) + the onboarding state.
- A custom ESLint rule (or `no-restricted-syntax`) banning new `style={{ color: ... }}` in non-primitive components.

## Tooling

- `eslint-plugin-jsx-a11y` (a11y), `eslint-plugin-tailwindcss` (utility hygiene), `jest-axe` (already installed in `packages/ui` devDependencies — under-used).
- `@axe-core/playwright` for full-page e2e contrast scans.
- Optional: `vite-plugin-iso-extension` or similar to type-check Tailwind class strings against the `@theme` token list.

## Acceptance criteria

- Zero `style={{ color: ... }}` in `apps/extension/app/components/` and `apps/extension/app/drawers/` outside primitives.
- Every shell text node passes WCAG AA (4.5:1 for body, 3:1 for ≥18px) over each of the 5 mood scenes — verified by axe in Playwright tests.
- `Stage.tsx`'s scrim composition lives in CSS vars, not inline.
- Reduced-motion behavior stays calm (no strobing) — verified by a unit test that toggles `prefers-reduced-motion` and snapshots computed `animation-iteration-count`.
- New primitives have `@compass/ui` exports + JSDoc + tests; introducing a new shell component without using primitives fails lint.

## Open questions for brainstorming

- Adopt Tailwind utility classes in JSX, or keep tokens in `theme.css` and have primitives apply them via classnames internally? Hybrid likely best — primitives use Tailwind under the hood, app code only consumes primitives.
- Do drawers ship as their own primitive (`<Drawer>`), or compose `<Surface tier={3}>` + `<Stack>`? Drawer has lifecycle (open/close, focus trap, escape handling) that warrants its own primitive.
- Theme accent (`--accent-h/c/l`) is currently per-user via `useShell.accent`. Confirm `<Text tone="accent">` reads from it dynamically.
- Where to hold the visual-review page (`dev/primitives.html` static, or a route under the extension's options page).

## What this plan does NOT cover (explicitly)

- The DB-in-worker refactor for `sqlite-wasm` (separate, see PR #11 description).
- The `assets.compassdash.com` domain registration + Pages CNAME flip (separate; manifest currently served from `ayushmishra206.github.io/compass-assets`).
- Any new features. This is structural debt repayment only.
