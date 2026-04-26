# Compass Design System

Living reference for the warm-paper design system in [packages/ui](../packages/ui). Update this doc whenever you add a token, primitive, hook, or layout helper.

**Source of truth:** `packages/ui/src/tokens.ts` (TS constants) and `packages/ui/src/theme.css` (Tailwind v4 `@theme` block). A snapshot test in `tokens.test.ts` fails on drift.

---

## Tokens

### Color (oklch)

All colors use oklch for perceptually-uniform tones. Accent is driven by three CSS custom properties (`--accent-h`, `--accent-c`, `--accent-l`) that the `ThemeProvider` swaps at runtime.

| Token                   | Light                            | Dark                   | Usage                     |
| ----------------------- | -------------------------------- | ---------------------- | ------------------------- |
| `--bg`                  | `oklch(0.972 0.012 75)` ivory    | `oklch(0.18 0.012 55)` | Page background           |
| `--bg-deep`             | `oklch(0.95 0.014 75)`           | `oklch(0.14 0.012 55)` | Sunken surfaces           |
| `--panel`               | `oklch(0.988 0.008 75)`          | `oklch(0.22 0.012 55)` | Card / sidebar            |
| `--panel-2`             | `oklch(0.965 0.011 75)`          | `oklch(0.26 0.012 55)` | Input field / subtle fill |
| `--ink` / `--ink-2/3/4` | dark sepia → lighter             | warm ivory → dimmer    | Typography ramp           |
| `--hair` / `--hair-2`   | 10% / 18% ink                    | 8% / 16% ivory         | 1px rules + borders       |
| `--accent`              | `oklch(l c h)` of current swatch | same                   | Primary action color      |
| `--accent-ink`          | darker accent                    | lighter accent         | Accent text tone          |
| `--accent-wash`         | 10% accent                       | 18% accent             | Accent-tinted surfaces    |
| `--sage`                | `oklch(0.55 0.05 150)`           | `oklch(0.78 0.06 150)` | Secondary hue (calm)      |
| `--slate`               | `oklch(0.52 0.03 255)`           | `oklch(0.78 0.05 255)` | Secondary hue (cool)      |

### Accent swatches

Applied via `applyAccent(name)` which writes `--accent-h/c/l`. Available:

| Name       | h   | c    | l    |
| ---------- | --- | ---- | ---- |
| terracotta | 48  | 0.13 | 0.56 |
| ink        | 260 | 0.04 | 0.40 |
| sage       | 150 | 0.06 | 0.52 |
| ocean      | 230 | 0.10 | 0.52 |
| plum       | 340 | 0.10 | 0.52 |

### Radius, shadow, type, motion, density

- **Radius:** `sm 8`, `md 14`, `lg 22` — applied as `rounded-[14px]` etc in Tailwind.
- **Shadow:** `sh-1`, `sh-2`, `sh-3` — progressive elevation via `shadow-[var(--sh-N)]`.
- **Type:** `--font-serif` Newsreader, `--font-sans` Instrument Sans, `--font-mono` JetBrains Mono. Self-hosted via `@fontsource`.
- **Motion:** fast 120ms, mid 220ms, slow 400ms; canonical keyframes `fadeIn`, `slideUp`, `spin`, `blink`. All suppressed under `prefers-reduced-motion`.
- **Density:** `spacious` (sidebar 232px) vs `compact` (sidebar 64px).

---

## Theme provider

```tsx
import { ThemeProvider } from '@compass/ui';

<ThemeProvider theme="light" accent="terracotta" density="spacious">
  {children}
</ThemeProvider>;
```

Writes `data-theme` and `data-density` on `<html>` and sets the three accent CSS vars. State is owned by the caller — this provider is purely presentational. The extension uses a Zustand store (`apps/extension/app/state/shell.ts`) that persists `{theme, accent, density}` to `localStorage`.

---

## Primitives

Each primitive lives in `packages/ui/src/components/<Name>.tsx` and has a colocated test file. All primitives forward `className`, accept standard DOM props, and pass axe-core with zero violations.

| Primitive                                | Purpose                 | Key props                                                                                       |
| ---------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------- |
| **Button**                               | Interactive CTA         | `variant: default \| primary \| accent \| ghost`, `size: xs \| sm \| md`, `leading`, `trailing` |
| **IconButton**                           | 32×32 icon-only button  | requires `aria-label`                                                                           |
| **Card** (+ `CardHeader`, `CardBody`)    | Panel surface           | `padded` applies 22px inset                                                                     |
| **Badge** (+ `Dot`)                      | Mono-cased pill label   | `variant: default \| accent \| sage \| slate`                                                   |
| **Input**                                | Bordered text input     | `mono` for keys                                                                                 |
| **Textarea**                             | Bordered multi-line     | `mono`                                                                                          |
| **Kbd**                                  | Keyboard key pill       | children only                                                                                   |
| **Tag**                                  | Mono 10px tag           | children only                                                                                   |
| **Spinner**                              | 14px concentric ring    | —                                                                                               |
| **Progress**                             | 0..1 bar                | `value`, `label`                                                                                |
| **Divider**                              | Hairline rule           | `orientation: horizontal \| vertical`                                                           |
| **Prose**                                | Serif long-form wrapper | children (markdown-rendered)                                                                    |
| **Swatch**                               | Color disc button       | `color`, `active`, `label`                                                                      |
| **Modal** (+ `ModalHeader`, `ModalBody`) | Portal dialog           | `open`, `onClose`, `wide`, focus trap + Esc                                                     |
| **Segmented**                            | Radio-group pill row    | `options`, `value`, `onChange`                                                                  |
| **Toggle**                               | Animated switch         | `on`, `onChange`, `aria-label`                                                                  |
| **BrandMark**                            | Compass logo            | `size`                                                                                          |

### Example

```tsx
import { Button, Card, Badge, IconSpark } from '@compass/ui';

<Card padded>
  <Badge variant="accent">morning brief</Badge>
  <Button variant="accent" leading={<IconSpark size={14} />}>
    Generate
  </Button>
</Card>;
```

---

## Icons

41 icons ported from the prototype. All consume `IconProps` ({ size = 16, stroke = 1.6 }) and use `currentColor`.

```tsx
import { IconSearch, IconPlay, ICONS, type IconName } from '@compass/ui';

<IconSearch size={14} />;
{
  /* Or dynamic lookup: */
}
const Cmp = ICONS[name as IconName];
```

Icons are decorative by default — wrap in an element with a label (or add `aria-label` on the SVG itself) when they carry meaning.

---

## Hooks

| Hook                                             | Signature                                           | Behavior                                              |
| ------------------------------------------------ | --------------------------------------------------- | ----------------------------------------------------- |
| `useEscape(cb, active?)`                         | `(() => void, boolean?) => void`                    | Fires `cb` on Escape when `active` (default `true`)   |
| `useFocusTrap(ref, active)`                      | `(RefObject<HTMLElement \| null>, boolean) => void` | Traps Tab within `ref`; returns focus on deactivation |
| `useShortcuts(list, active?)`                    | `(Shortcut[], boolean?) => void`                    | Supports `⌘+k` and chord `?+d` forms                  |
| `usePersistentState(key, initial, sessionOnly?)` | `<T>(string, T, boolean?) => [T, Setter]`           | localStorage + chrome.storage mirror                  |

---

## Layout primitives

| Primitive    | Purpose                                                   |
| ------------ | --------------------------------------------------------- |
| **AppShell** | `sidebar \| main` 2-col grid; density-aware column widths |
| **Sidebar**  | Slot-based sidebar shell (brand, nav, footer)             |
| **Topbar**   | Breadcrumb + date + search + actions sticky header        |
| **Surface**  | 28/32/64-padded, max-w 1180px content container           |
| **Grid12**   | 12-col gap-22 grid                                        |

---

## Motion recipes

- **Modal open/close:** `fadeIn 180ms ease` scrim, `slideUp 220ms ease` panel.
- **Timer pulse:** none — the deliberate stillness is the feature.
- **Streaming cursor:** `blink 1s steps(1) infinite` on a 7×15px accent-colored inline block.
- **Accent swap:** no animation; tokens update synchronously.

Respect `prefers-reduced-motion` — all keyframes are suppressed under it via `theme.css`.

---

## Accessibility baseline

- Every interactive primitive has a visible `focus-visible` ring (2px accent + offset).
- `Modal` traps focus + returns on close + dismisses on Esc + backdrop click.
- Icons are decorative by default (`aria-hidden`); consumers add labels when meaningful.
- All primitives pass axe-core with zero violations in their test files.
- Shortcuts respect chord buffer reset (1.5s) so users aren't accidentally triggering actions.

---

## Adding a new primitive

1. Create `packages/ui/src/components/<Name>.tsx` and `<Name>.test.tsx`.
2. Forward `className` with `cn(...)` from `@app/utils/cn`.
3. Export via `packages/ui/src/index.ts`.
4. Add a row to this doc's "Primitives" table.
5. Test: render, every variant, any keyboard behavior, axe-core.

See [architecture.md](./architecture.md) for the full recipe including surface ports and integration seams.
