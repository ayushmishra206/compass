# Compass Design System — Phase 1.6 "Momentum"

Living reference for the dark-only translucent-glass design system in [packages/ui](../packages/ui). Update this doc whenever you add a token, primitive, hook, or shell helper.

**Source of truth:** `packages/ui/src/tokens.ts` (TS constants) and `packages/ui/src/theme.css` (Tailwind v4 `@theme` block). Snapshot tests in `tokens.test.ts` fail on drift.

---

## Tokens

### Color (oklch)

All colors use OKLCH. The Stage backdrop sits behind every surface, so ink and glass tints are tuned for the warm-dark `#0e0c0a` ground.

| Token                               | Value                            | Usage                                         |
| ----------------------------------- | -------------------------------- | --------------------------------------------- |
| `--color-bg`                        | `#0e0c0a`                        | Solid base (visible only when no scene image) |
| `--color-ink`                       | `#f4ede2`                        | Primary text                                  |
| `--color-ink-2/3/4`                 | warm ivory at 0.78 / 0.55 / 0.34 | Type ramp                                     |
| `--color-hair` / `--color-hair-2`   | 0.12 / 0.22 ivory                | Hairlines                                     |
| `--color-panel` / `--color-panel-2` | warm-dark glass tints            | Subtle fills                                  |
| `--accent-h/c/l`                    | OKLCH triple per accent          | Accent CSS                                    |
| `--accent`                          | `oklch(l c h)`                   | Primary action                                |
| `--accent-soft`                     | `oklch(0.85 c h)`                | Accent-toned text                             |
| `--accent-wash`                     | `accent / 0.16`                  | Accent-tinted surfaces                        |

### Glass (three tiers)

| Token       | Filter                      | Tint                  | Use                           |
| ----------- | --------------------------- | --------------------- | ----------------------------- |
| `--glass-1` | `blur(20px) saturate(140%)` | `rgba(12,10,8,0.55)`  | Hero card, ticker pills       |
| `--glass-2` | `blur(28px) saturate(150%)` | `rgba(18,16,14,0.86)` | Drawers                       |
| `--glass-3` | `blur(32px)`                | `rgba(20,18,16,0.92)` | ⌘K modal, Onboarding scaffold |

### Accents

Applied via `applyAccent(name)`. Available:

| Name            | h   | c    | l    |
| --------------- | --- | ---- | ---- |
| amber (default) | 28  | 0.14 | 0.65 |
| rose            | 18  | 0.13 | 0.66 |
| mint            | 160 | 0.10 | 0.70 |
| violet          | 285 | 0.12 | 0.68 |
| sky             | 230 | 0.10 | 0.70 |

### Radius, shadow, type, motion

- **Radius:** `sm 8px`, `md 14px`, `lg 20px`, `pill 999px`.
- **Shadow:** `--shadow-1/2/3` — progressive elevation; `--shadow-3` is the drawer/modal cast.
- **Type:** `--font-serif` Fraunces, `--font-sans` Geist, `--font-mono` Geist Mono. Self-hosted via `@fontsource`.
- **Motion:** `fast 120ms`, `mid 240ms`, `slow 360ms`, `scenefade 1200ms`. Respects `prefers-reduced-motion`.

---

## Theme provider

```tsx
import { ThemeProvider } from '@compass/ui';

<ThemeProvider accent="amber">{children}</ThemeProvider>;
```

Single-prop API. Owns no theme/density state. The shell is dark-only, single-density. The extension persists `accent` via the Zustand `useShell` store; `pinnedScene` and `weatherEnabled` live there too.

---

## Primitives

| Primitive       | Purpose              | Notes                                                                    |
| --------------- | -------------------- | ------------------------------------------------------------------------ |
| **Button**      | CTA                  | `variant: default \| primary \| accent \| ghost`, `size: xs \| sm \| md` |
| **IconButton**  | 28×28 icon-only      | requires `aria-label`                                                    |
| **Card** + body | Flat surface         | `padded` 22px inset                                                      |
| **GlassCard**   | Translucent surface  | `tier: 1 \| 2 \| 3`                                                      |
| **Badge** + Dot | Mono pill label      | `variant: default \| accent \| sage \| slate`                            |
| **Input**       | Bordered text input  | `mono` for keys                                                          |
| **Textarea**    | Bordered multi-line  | `mono`                                                                   |
| **Kbd**         | Keyboard pill        | children only                                                            |
| **Tag**         | Mono 10px tag        | children only                                                            |
| **Spinner**     | concentric ring      | —                                                                        |
| **Progress**    | 0..1 bar             | `value`, `label`                                                         |
| **Divider**     | Hairline rule        | `orientation`                                                            |
| **Modal**       | Portal dialog        | focus trap + Esc                                                         |
| **Segmented**   | Radio-group pill row | `options`, `value`                                                       |
| **Toggle**      | Animated switch      | `on`, `aria-label`                                                       |
| **Swatch**      | Color disc           | `color`, `active`, `label`                                               |
| **BrandMark**   | Compass logo         | `size`                                                                   |

Removed primitives: `AppShell`, `Sidebar`, `Topbar` (layout), `Surface`, `Grid12`, `Prose` (no longer used).

---

## Shell

| Component                                         | Lives in                           | Purpose                                                       |
| ------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------- |
| `Stage`                                           | `packages/ui/src/shell/Stage.tsx`  | Full-bleed scene + veil + grain                               |
| `Drawer`                                          | `packages/ui/src/shell/Drawer.tsx` | Right-side glass slide-in chrome (used by all 8 drawer kinds) |
| Single-purpose `Topbar`, `Hero`, `Ticker`, `CmdK` | `apps/extension/app/components/`   | Consume mock data + shell state directly                      |

---

## Hooks

| Hook                                             | Signature | Behavior                             |
| ------------------------------------------------ | --------- | ------------------------------------ |
| `useEscape(cb, active?)`                         | unchanged | Esc handler                          |
| `useFocusTrap(ref, active)`                      | unchanged | Tab trap                             |
| `useShortcuts(list, active?)`                    | unchanged | `⌘+k` and chord `?+d`                |
| `usePersistentState(key, initial, sessionOnly?)` | unchanged | localStorage + chrome.storage mirror |

---

## Motion recipes

- **Drawer open/close:** scrim `fadeIn 240ms`, panel `slideX 360ms cubic-bezier(.2,.8,.2,1)`.
- **Drawer body cross-fade:** `opacity 180ms` when kind swaps while open.
- **CmdK open/close:** scrim `fadeIn 200ms`, modal pop in 180ms.
- **Stage scene swap:** image opacity `1200ms ease`. Scene is keyed by URL so React re-mounts on swap.
- **Ken Burns:** `compass-ken 24s ease-in-out infinite alternate` on the scene image.

Respect `prefers-reduced-motion` — all keyframes are suppressed via `theme.css`.

---

## Accessibility baseline

- Every interactive primitive has a visible `:focus-visible` ring (2px accent + offset).
- Drawer + Modal: focus-trap, Esc dismiss (Esc is a no-op only when `dismissLocked`), backdrop-click dismiss (no-op when locked).
- Icons are `aria-hidden` by default; add `aria-label` on the button when meaningful.
- All primitives pass axe-core with zero violations in their test files.

---

## Adding a new primitive

1. Create `packages/ui/src/components/<Name>.tsx` and `<Name>.test.tsx`.
2. Forward `className` with `cn(...)` from `@app/utils/cn`.
3. Export via `packages/ui/src/index.ts`.
4. Add a row to this doc's "Primitives" table.
5. Test: render, every variant, axe-core.

See [architecture.md](./architecture.md) for the full recipe including Stage pipeline + RPC seams.
