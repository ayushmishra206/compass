# Compass — Phase 1.6: Shell Pivot to "Momentum"

**Status:** Draft for review
**Date:** 2026-05-03
**Phase:** 1.6 (Shell Pivot) — new phase between Phase 1.5 (Foundation Continuation) and Phase 2 (Daily Agent)
**Scope:** Full re-conception of the new-tab UI from a sidebar-routed multi-page app to a single-screen image-led shell with right-side drawers, dark-only "translucent liquid glass" visual language, and a curated Unsplash-backed Stage that reacts to time-of-day + weather. Wholesale replacement of the current design system (tokens, fonts, accents, primitives), wholesale rewrite of the PRD around the 8 visible surfaces of the new shell.

This is a **shell-only pivot**. The Stage pipeline, scenes, weather, ⌘K nav, Onboarding BYOK validation, and Profile drawer scaffolding are real. All six nav-drawer bodies render mock data; real data wiring is per-pillar work in later phases.

---

## 1. Purpose

The new-tab shell shipped in Phase 0 ([2026-04-19 spec](2026-04-19-phase-0-scaffold-and-design-system-design.md)) and elaborated through Phase 1 was a sidebar-routed multi-page app: `AppShell + CompassSidebar + CompassTopbar` with eight wouter routes (newtab, notes, focus, goals, inbox, blocker, settings, onboarding) over a "warm paper" design system (Newsreader/Instrument Sans/JetBrains Mono, terracotta/ink/sage/ocean/plum accents, light+dark + spacious+compact density). It works, it's tested, it ships.

A new product direction was authored in [`docs/Compass.design-update.html`](../../Compass.design-update.html) — a single-screen image-led shell branded as **"Compass · Momentum."** It collapses the eight routes into six right-side drawers (`Brief / Today / Goals / Notes / Inbox / Focus`) plus a 7th `Profile` drawer accessed via the topbar avatar plus an `Onboarding` modal-locked variant for first-run BYOK setup. The Stage backdrop is full-bleed photography that rotates with time-of-day and weather, with a translucent-glass surface treatment over a warm-dark `#0e0c0a` base. Typography flips to Fraunces serif + Geist sans + Geist Mono. The accent palette flips to amber/rose/mint/violet/sky.

This spec captures the decisions made during the 2026-05-03 design-pivot interview (8 questions, all locked) and defines the work to land the new shell on a `phase-1.6-shell` branch after the `phase-1.5-providers` branch merges.

This is greenfield product work. Compass has no users yet; the PRD's existing framing of "~3M users, $39 Plus, 'we don't sell your data' positioning" is aspirational marketing copy and gets honest pre-launch reframing in this pivot.

---

## 2. Decision summary

Eight locked decisions from the design-pivot interview:

| #   | Decision                               | Choice                                                                                                                                                                 |
| --- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Depth of pivot                         | **(C) Full re-conception** — PRD reorganized around the 8 visible surfaces of the new shell, not the 7 backend pillars                                                 |
| Q2  | Demoted pillars (Adaptive, Multimodal) | **(A) Cross-cutting capability chapters** — each gets its own chapter that defines signals + surface assignments                                                       |
| Q3  | Phase positioning                      | **(a) Finish providers → new `phase-1.6-shell` branch → wholesale cleanup**, no transitional dual-shell flag                                                           |
| Q4  | Settings home                          | **Profile drawer = 7th drawer kind**, opened by topbar avatar click. Tweaks panel collapses into Profile                                                               |
| Q5  | Onboarding home                        | **(a) First-run auto-opens Profile drawer in dismiss-locked Onboarding state**; Stage backdrop dimmed underneath                                                       |
| Q6  | Theme + density modes                  | **Drop light mode entirely; drop density entirely; replace accent palette wholesale** (terracotta/ink/sage/ocean/plum → amber/rose/mint/violet/sky)                    |
| Q7  | Backdrop assets                        | **Compass-curated manifest at Compass CDN, photos hotlinked from Unsplash CDN, OPFS-cached**. 5 mood pools, weather-aware, daily-seeded picker, Open-Meteo for weather |
| Q8  | Real vs mocked in shell pivot          | **(a) Shell-only** — Stage/Topbar/Hero/Ticker/Drawer chrome/⌘K nav real; six nav-drawer bodies mock; Profile + Onboarding scaffolded with real BYOK validation         |

Three secondary confirmations also locked:

- Soundscapes label-only mock in v1 (no audio playback; deferred)
- ⌘K ask returns canned mocked response in v1 (real RAG lands with Phase 2 Semantic Notes)
- Streak / quoted goal / back-to-backs become real in their pillar phases (streak gets a new `personalization.streakDays` field in the data model; quoted goal pulls from `goals.find(g => g.horizon === 'quarter').why`; back-to-backs computed from calendar events with no buffer)

---

## 3. Surface architecture

### 3.1 Shell topology

```
┌────────────────────────────────────────────────────────────────────┐
│  STAGE (position:fixed inset:0; full-bleed scene image)           │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Topbar (56px)                                               │ │
│  │  Brand · Scene label · Nav pills · ⌘K · Spark · Avatar      │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │                                                              │ │
│  │  Hero (1fr — image space + glass card)                      │ │
│  │  ┌─────────────────────────┐  ┌──────────────────────────┐  │ │
│  │  │ Greeting (Fraunces 7vw) │  │ "Top of mind · 90 min"   │  │ │
│  │  │ Scene mood + brief TLDR │  │ glass card               │  │ │
│  │  └─────────────────────────┘  └──────────────────────────┘  │ │
│  │                                                              │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │  Ticker (80px)                                               │ │
│  │  Vitals · "Quoted goal" · Warning pills                      │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────────────────┐                               │
│  │ Drawer (right-side, slide-in)   │ ← right-anchored, glass-2     │
│  │ 420–640px width                  │   over Stage + Shell           │
│  │ Brief / Today / Goals / Notes / │                               │
│  │ Inbox / Focus / Profile body    │                               │
│  └─────────────────────────────────┘                               │
│                                                                    │
│  ┌────────────────┐                                                │
│  │ ⌘K modal       │ ← centered scrim, glass-3                     │
│  └────────────────┘                                                │
└────────────────────────────────────────────────────────────────────┘
```

The Shell is a 56px / 1fr / 80px CSS grid (`Topbar / Hero / Ticker`) inside a 100vh container layered on top of the Stage. No sidebar. No multi-page routing (`wouter` is dropped). One drawer open at a time.

### 3.2 Surface inventory

Eight surfaces total, all defined in PRD chapters §8–§14:

| #   | Surface                                      | Trigger                                           | Real in shell pivot                                                                              | Real source-of-truth landing        |
| --- | -------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------- |
| 1   | Brief drawer                                 | Topbar `Brief` pill / ⌘K `brief`                  | Mock body                                                                                        | Phase 2 Daily Agent                 |
| 2   | Today drawer                                 | Topbar `Today` pill / ⌘K `day`                    | Mock body                                                                                        | Phase 4 Calendar OAuth + Meeting AI |
| 3   | Goals drawer                                 | Topbar `Goals` pill / ⌘K `goals`                  | Mock body                                                                                        | Phase 4 Goal Decomposition          |
| 4   | Notes drawer                                 | Topbar `Notes` pill / ⌘K `notes`                  | Mock body (CRUD-stub if existing)                                                                | Phase 2 Semantic Notes              |
| 5   | Inbox drawer                                 | Topbar `Inbox` pill / ⌘K `inbox`                  | Mock body                                                                                        | Phase 4 Gmail integration           |
| 6   | Focus drawer                                 | Topbar `Focus` pill / ⌘K `focus`                  | Timer real; soundscapes label-mock; blocks mock                                                  | Phase 3 Smarter Site Blocker        |
| 7   | Profile drawer                               | Topbar avatar click                               | Scaffolded with real BYOK validation; encryption + recovery flows stubbed for Phase 1.5 settings | Phase 1.5 settings workstream       |
| 8   | Onboarding modal (variant of Profile drawer) | Auto-open on first run, dismiss-locked until BYOK | Real BYOK validation via existing `llm.validateKey` RPC; encryption-opt-in step stubbed          | Phase 1.5 settings workstream       |

Plus one out-of-shell surface deferred to its pillar phase:

| 9 | Block-page overlay | Content-script-injected when user navigates to a blocked site | Deferred (no v1 blocker) | Phase 3 Smarter Site Blocker |

### 3.3 Drawer chrome (uniform across 7 kinds)

- **Position:** `position:fixed; top:14px; right:14px; bottom:14px;` — floats with breathing room from the viewport edges.
- **Width:** `clamp(420px, 48vw, 640px)`
- **Surface:** `--glass-2` (medium translucent dark glass — see §4.2)
- **Border:** `1px solid rgba(255,255,255,0.10)`, `border-radius: 20px`
- **Shadow:** `0 30px 80px -20px rgba(0,0,0,0.7)`
- **Motion:** slide-in from `translateX(110%)` to `translateX(0)`, 360ms `cubic-bezier(.2,.8,.2,1)`
- **Scrim:** `rgba(0,0,0,0.4)` over Stage + Shell with `backdrop-filter: blur(4px)`, opacity transition 240ms
- **Header:** `<h2>` title + meta line (`mono` style — e.g., `claude-haiku · 4.2s`, `5 events`, `8 notes`) + close icon button
- **Body:** `flex:1; overflow-y:auto; padding: 18px 22px`

Drawer kind swap _while open_ cross-fades the body 180ms; drawer chrome doesn't re-animate.

### 3.4 Onboarding as a drawer variant

The Onboarding modal is the same `Drawer` component with `kind='onboarding'`. Differences from regular drawer behavior:

- Auto-opens on app mount when `chrome.storage.local.profile.byokConfigured` is missing or false.
- Scrim click is a **no-op** (cannot dismiss).
- Esc is a **no-op** (cannot dismiss).
- The close icon button is **hidden** until BYOK setup completes.
- Stage backdrop continues ken-burns underneath; Shell (Topbar/Hero/Ticker) stays rendered but with `--ink-2`/`--ink-3` opacity drop on text (visually dimmed, not interactive).
- Body has 3 steps: welcome → provider choice (OpenAI / Anthropic / OpenRouter, real `llm.validateKey` round-trip) → optional encryption opt-in (stub button in Phase 1.6; Phase 1.5 settings fills in the real passphrase flow per locked decisions S69–S75).
- On successful validateKey: `byokConfigured = true`, drawer becomes dismissable. Avatar click thereafter opens `kind='profile'`.

---

## 4. Visual language

### 4.1 Tokens (full replacement of current design system)

| Token group       | Current                                                                      | New                                                                         |
| ----------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Theme modes       | `light` + `dark`                                                             | **dark only**                                                               |
| Density modes     | `spacious` + `compact`                                                       | **none** (no sidebar to size)                                               |
| Color space       | OKLCH                                                                        | OKLCH (kept)                                                                |
| Background        | warm paper ivory `oklch(0.972 0.012 75)` light / `oklch(0.18 0.012 55)` dark | **`#0e0c0a` warm-dark** as `--bg`, full-bleed Stage image as visual ground  |
| Ink ramp          | dark sepia → lighter (light) / warm ivory → dimmer (dark)                    | **warm ivory only** (`#f4ede2` and rgba dimmer steps at 0.78 / 0.55 / 0.34) |
| Accent palette    | terracotta / ink / sage / ocean / plum                                       | **amber / rose / mint / violet / sky**                                      |
| Surface treatment | flat fills + hairlines                                                       | **translucent glass** (3-tier) + hairlines + grain                          |
| Serif             | Newsreader (`@fontsource/newsreader`)                                        | **Fraunces**                                                                |
| Sans              | Instrument Sans                                                              | **Geist**                                                                   |
| Mono              | JetBrains Mono                                                               | **Geist Mono**                                                              |

### 4.2 Glass treatment

Three glass tiers as CSS custom properties:

```css
:root {
  --glass-1: blur(20px) saturate(140%); /* hero card, ticker pills */
  --glass-2: blur(28px) saturate(150%); /* drawers */
  --glass-3: blur(32px); /* ⌘K modal, Onboarding */

  --glass-tint-1: rgba(12, 10, 8, 0.55);
  --glass-tint-2: rgba(18, 16, 14, 0.86);
  --glass-tint-3: rgba(20, 18, 16, 0.92);
}
```

Glass surfaces always pair `backdrop-filter` with a tint (for browsers without backdrop-filter the tint alone is the fallback) and a `1px solid rgba(255,255,255,0.08-0.12)` hairline border.

### 4.3 Accent palette (new)

```ts
export const ACCENTS = {
  amber: { h: 28, c: 0.14, l: 0.65 },
  rose: { h: 18, c: 0.13, l: 0.66 },
  mint: { h: 160, c: 0.1, l: 0.7 },
  violet: { h: 285, c: 0.12, l: 0.68 },
  sky: { h: 230, c: 0.1, l: 0.7 },
} as const;
```

Default accent is **amber** (matches the mock's default `--accent-h: 28`). User can change in Profile drawer; accent is per-device, persisted in `chrome.storage.local`.

`--accent` is `oklch(var(--accent-l) var(--accent-c) var(--accent-h))`. `--accent-soft` is `oklch(0.85 var(--accent-c) var(--accent-h))`. `--accent-wash` is `oklch(var(--accent-l) var(--accent-c) var(--accent-h) / 0.16)`.

### 4.4 Typography

- **Serif (Fraunces):** greeting (`clamp(48px, 7.2vw, 108px)` italic 300, letter-spacing `-0.04em`), drawer headers (22–28px), prose passages.
- **Sans (Geist):** body text, button labels, list rows. Default 13px / 1.5.
- **Mono (Geist Mono):** badges, kbd shortcuts, vital labels, time stamps. 9–10px / 0.12em letter-spacing / uppercase.

Self-hosted via `@fontsource/fraunces`, `@fontsource/geist-sans`, `@fontsource/geist-mono`. Old font packages dropped from `package.json`.

### 4.5 Primitive impact

| Primitive                                                                                                                                              | Outcome                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Button`, `IconButton`, `Badge`, `Spinner`, `Progress`, `Toggle`, `Modal`, `Kbd`, `Tag`, `Input`, `Textarea`, `Divider`, `Card`, `BrandMark`, `Swatch` | **Restyled** — keep API, drop light-mode rules, drop density rules, repaint tokens                                                               |
| `Segmented`                                                                                                                                            | Restyle for glass surface; minor change                                                                                                          |
| `Prose`                                                                                                                                                | **Verify usage**, delete if no remaining consumer (the Notes drawer body uses serif-prose styling inline; standalone primitive may be redundant) |
| `AppShell`, `Sidebar`, `Topbar` (layout primitives), `Surface`, `Grid12`                                                                               | **Deleted**                                                                                                                                      |

| New primitive | Lives at                                   | Purpose                                                     |
| ------------- | ------------------------------------------ | ----------------------------------------------------------- |
| `Stage`       | `packages/ui/src/shell/Stage.tsx`          | Full-bleed scene image + veil + grain layers                |
| `Drawer`      | `packages/ui/src/shell/Drawer.tsx`         | Generic drawer chrome; consumer passes body                 |
| `GlassCard`   | `packages/ui/src/components/GlassCard.tsx` | Reusable glass surface (used by hero card, future contexts) |

Single-purpose `Topbar`, `Hero`, `Ticker`, `CmdK` components live in `apps/extension/app/components/` since they consume mock data and shell-state directly (not generic enough for `packages/ui`).

`ThemeProvider` API simplifies: `theme` and `density` props removed. Only `accent` and `scene` (the user's optional override) remain. ThemeProvider writes `--accent-h/c/l` and the Stage scene image to CSS custom properties.

---

## 5. Stage pipeline

### 5.1 Manifest

Compass-curated JSON published at `https://assets.compassdash.com/scenes/manifest.v1.json`. Schema:

```ts
type Mood = 'dawn' | 'fog' | 'ocean' | 'alpine' | 'desert';
type WxAffinity = 'clear' | 'cloudy' | 'rain' | 'snow' | 'fog' | 'storm';

interface SceneManifest {
  version: 1;
  generatedAt: string; // ISO timestamp
  scenes: Array<{
    id: string; // Unsplash photo ID, doubles as cache key
    url: string; // images.unsplash.com hotlink
    photographer: string; // attribution display name
    attribution: string; // Unsplash photographer profile URL
    mood: Mood;
    weather: WxAffinity[]; // affinities (1-N)
    blurhash?: string; // optional, for placeholder render
    sha256: string; // for OPFS cache integrity (image bytes)
  }>;
}
```

**Curation target at v1:** 5 mood pools × ~10 photos each = ~50 photos. Each photo balanced across weather affinities (every mood pool covers every weather affinity at least once where the imagery permits).

**TTL:** 7 days stale-while-revalidate. App mount checks cache age; if stale, `scenes.getManifest` RPC fetches fresh and overwrites cache. Manifest is small (~30 KB); fetch is cheap.

### 5.2 Photo download + OPFS cache

OPFS layout (under offscreen runtime's `compass.opfs/`):

```
scenes/
├── manifest.json           ← cached SceneManifest
├── weather.json            ← cached weather + ETA
└── photos/
    ├── <sha256>.jpg
    ├── <sha256>.jpg
    └── …                  ← LRU evicted when total > 50 MB
```

`scenes.fetchPhoto(url, sha256)` RPC runs in offscreen (needs OPFS sync-access-handles for atomic write). Idempotent on cache hit. Returns blob URL. Photo is immutable — keyed by `sha256`, never overwritten in place. Cleanup pass on every manifest refresh: any cached photo whose `sha256` is no longer in the manifest gets evicted.

### 5.3 Weather

`weather.getCurrent(lat, lon)` RPC runs in SW (lightweight HTTP, no OPFS work). Calls `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=weather_code,temperature_2m`. Response is the WMO weather code (0–99) plus temp. Weather code maps to `WxAffinity`:

```ts
function codeToAffinity(code: number): WxAffinity {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2 || code === 3) return 'cloudy';
  if ([45, 48].includes(code)) return 'fog';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'storm';
  return 'cloudy';
}
```

**TTL:** 90 minutes. Cached with timestamp; refresh on `visibilitychange → visible` if stale.

**Location source:**

1. `navigator.geolocation` — prompted on first weather opt-in. Coords rounded to ~10 km (3 decimal places) before storage to limit telemetry surface.
2. IP fallback — Open-Meteo accepts no-coords-passed; returns no result, picker degrades to time-only.
3. Manual override — text input in Profile drawer ("Set my location"). Geocoding via Open-Meteo's `/v1/geocoding`.

Weather is OFF by default. User opts in via Profile drawer toggle or during Onboarding step 3 (deferred to Phase 1.5 settings — Phase 1.6 ships the toggle visibly but with stub behavior).

### 5.4 Picker

Pure function in `packages/core/src/scenes/picker.ts`:

```ts
function pickMoodByHour(h: number): Mood {
  if (h < 8) return 'dawn';
  if (h < 12) return 'fog';
  if (h < 16) return 'ocean';
  if (h < 20) return 'alpine';
  return 'desert';
}

function pickScene(
  now: Date,
  weather: WxAffinity | null,
  manifest: SceneManifest,
  dateSeed: string, // YYYY-MM-DD in user's tz
): Scene {
  const mood = pickMoodByHour(now.getHours());
  const moodPool = manifest.scenes.filter((s) => s.mood === mood);
  const subset = weather ? moodPool.filter((s) => s.weather.includes(weather)) : moodPool;
  const pool = subset.length > 0 ? subset : moodPool;
  return pool[hashSeed(dateSeed + mood) % pool.length];
}
```

`hashSeed` is a deterministic string-to-integer hash (e.g., FNV-1a). The seed `dateSeed + mood` makes the picked photo stable for `(day, mood-band)` — every new tab on the same day in the same mood band lands on the same scene. When the hour band shifts (e.g., 11:59 → 12:00), the mood changes (`fog` → `ocean`), the hash key changes, and a new scene picks for the rest of that band. When weather changes (e.g., `clear` → `rain`), the subset changes, picker may pick a different scene from the same mood pool.

### 5.5 Reactive refresh

The shell installs three timers on mount:

- 15-min `setInterval` for picker re-eval (catches hour-band shifts).
- 90-min `setInterval` for weather refresh (calls `weather.getCurrent` if stale).
- App mount + `visibilitychange → visible` triggers manifest staleness check (refresh if older than 7 days).

Photo swap on the Stage is a 1200ms opacity cross-fade (driven by CSS transition on `.stage .img { transition: opacity 1200ms; }`).

### 5.6 First-frame strategy

- **Cold mount with no cache:** Stage shows `--bg` warm-dark + grain only; scene label in topbar shows `—`. Manifest fetch + first-photo fetch kick in async; on completion, photo cross-fades in over the solid background.
- **Cold mount with cache:** picker runs against last cached `(time, weather)`, OPFS lookup returns cached blob URL synchronously, Stage paints with photo on first frame.
- **Online with stale weather:** picker runs against last cached weather, paints synchronously; weather refresh kicks in async; on response, picker re-evals and may swap photo.

No loading splash. No spinner over the Stage.

---

## 6. State machines

### 6.1 Shell state (Zustand slice)

```ts
type DrawerKind =
  | 'brief'
  | 'today'
  | 'goals'
  | 'notes'
  | 'inbox'
  | 'focus'
  | 'profile'
  | 'onboarding';

interface ShellState {
  drawer: { open: boolean; kind: DrawerKind | null };
  cmdkOpen: boolean;
  onboardingLocked: boolean; // dismiss-lock for Onboarding modal
  scene: { sceneKey: string; lastChange: number };
  accent: AccentName;
  weatherEnabled: boolean; // user opt-in to weather-aware Stage

  navClick(kind: DrawerKind): void;
  avatarClick(): void;
  scrimClick(): void;
  esc(): void;
  cmdkHotkey(): void;
  byokSetupComplete(): void;
  cycleScene(): void; // manual scene rotate via topbar spark icon
}
```

Transitions:

| Event                 | Effect                                                                       |
| --------------------- | ---------------------------------------------------------------------------- |
| `navClick(kind)`      | `drawer = { open: true, kind }`                                              |
| `avatarClick()`       | `drawer = { open: true, kind: onboardingLocked ? 'onboarding' : 'profile' }` |
| `scrimClick()`        | if `onboardingLocked`: no-op; else `drawer.open = false`                     |
| `esc()`               | if `onboardingLocked`: no-op; else `drawer.open = false; cmdkOpen = false`   |
| `cmdkHotkey()` (⌘K)   | `cmdkOpen = !cmdkOpen`                                                       |
| `byokSetupComplete()` | `onboardingLocked = false`                                                   |
| `cycleScene()`        | next `sceneKey` in `SCENE_KEYS`, persisted to `chrome.storage.local`         |

Drawer kind is preserved on close so reopen returns to the same surface. Cross-fade (180ms opacity swap) when kind changes while drawer is open.

### 6.2 ⌘K state (local component state)

```ts
interface CmdKState {
  q: string;
  busy: boolean;
  answer: string | null;
}
```

Mode inferred from `q`:

- **Nav mode** (default): `q` matches against the 6+1 surface labels case-insensitively. Pressing Enter on a match calls `shell.navClick(kind)` and closes the palette.
- **Ask mode**: triggered when `q.length > 5 && (q.endsWith('?') || /^(what|why|how|when|did|should|is|are)\b/i.test(q))`. Submit (Enter) sets `busy=true`, awaits 1.2s, populates `answer` with a canned response that includes 3 mocked citation badges (`n1`, `n2`, `n8`). Real RAG lands with Phase 2 Semantic Notes via `notes.askGrounded` RPC.

### 6.3 Onboarding gate

App root reads `chrome.storage.local.get('profile.byokConfigured')` on mount.

- If missing or `false` → `onboardingLocked = true; drawer = { open: true, kind: 'onboarding' }`.
- BYOK setup step calls existing `llm.validateKey` RPC; on success, writes `profile.byokConfigured = true` and calls `byokSetupComplete()`.
- After dismissal: `onboardingLocked` stays false for the lifetime of the install. Avatar click thereafter opens `kind='profile'`.

Encryption opt-in step in Onboarding (Phase 1.5 settings work) does NOT gate dismissal — it's optional and skippable.

---

## 7. RPC routes

Three new routes added to `packages/runtime/src/routes.ts`:

| Route                | Runs in   | Request                           | Response                                                              |
| -------------------- | --------- | --------------------------------- | --------------------------------------------------------------------- |
| `scenes.getManifest` | SW        | `{ etag?: string }`               | `{ manifest: SceneManifest, fetchedAt: number }`                      |
| `scenes.fetchPhoto`  | offscreen | `{ url: string, sha256: string }` | `{ blobUrl: string }` (cached or fresh)                               |
| `weather.getCurrent` | SW        | `{ lat: number, lon: number }`    | `{ code: number, tempC: number, summary: string, fetchedAt: number }` |

Existing routes used unchanged:

- `system.ping` — debugging probe
- `llm.validateKey` — Onboarding step 2 BYOK validation

Routes added in later phases (referenced here for forward planning):

- Phase 2: `briefings.getCurrent`, `notes.search`, `notes.askGrounded`, `notes.upsert` (Notes drawer real wiring)
- Phase 3: `blocker.getRules`, `personalization.getSuggestions`
- Phase 4: `gmail.scanInbox`, `goals.list`, `meetings.getPrep`

---

## 8. Data model additions

Three additions to PRD §6 data model schemas:

### 8.1 Scene

```ts
interface SceneState {
  manifestVersion: number; // last successfully cached manifest version
  manifestFetchedAt: number; // ms since epoch
  currentSceneId: string | null; // current photo ID (or null on first-mount empty Stage)
  pinnedSceneKey: Mood | null; // user override via Profile drawer; null = auto-pick
}
```

Stored in `chrome.storage.local['scene.state.v1']`. Picker reads `pinnedSceneKey` first; if null, falls through to time-of-day auto-pick. Profile drawer's "Mood" preference writes this.

### 8.2 Weather

```ts
interface WeatherCache {
  lat: number; // rounded to 3 decimals (~10km)
  lon: number; // rounded to 3 decimals
  code: number; // WMO weather code
  tempC: number;
  affinity: WxAffinity; // derived from code
  fetchedAt: number; // ms since epoch
}
```

Stored in `chrome.storage.local['weather.cache.v1']`. Profile drawer "Weather-aware scenes" toggle controls whether this is fetched at all; default OFF.

### 8.3 Streak (Phase 2 placeholder, declared here for forward compat)

```ts
interface PersonalizationState {
  // …existing fields from PRD §6.1 / §6.2
  streakDays: number; // consecutive days where any pomodoro completed
  streakLastDate: string; // YYYY-MM-DD in user tz
}
```

Declared in PRD §5 (data model) so later phases can populate without a schema migration. **Phase 1.6 does not populate or read this field** — the Ticker renders `MOCK.vitals` for streak/sleep/recovery/RHR. Phase 2 Daily Agent computes `streakDays` nightly and Phase 1.6's Ticker swap-to-real becomes a one-line read change at that point.

---

## 9. Privacy + cross-cutting guardrails

PRD §19 (was §15) cross-cutting guardrails picks up new bullets:

- **Open-Meteo (`api.open-meteo.com`)** is an approved third-party endpoint reachable from the SW for weather lookup. Coordinates are rounded to ~10 km before transmission. No account/auth. Request sent only when `weatherEnabled=true` (user-opted-in).
- **Compass assets CDN (`assets.compassdash.com`)** is an approved endpoint for the scene manifest. No user data transmitted. Cache-control headers honored.
- **Unsplash CDN (`images.unsplash.com`)** is an approved endpoint for photo hotlinking. Per Unsplash's API terms, direct hotlinking is permitted; rehosting is not. Each photo download includes the photo's referrer policy honoring the Unsplash hotlink contract.
- **Attribution display.** The current scene's photographer name + attribution URL is rendered in the topbar scene-label area (matching the mock's `Photo · Lukasz Szmigiel` pattern). The Profile drawer "Mood" preferences screen optionally surfaces a richer attribution panel.
- **Weather opt-in disclosure.** Profile drawer copy: _"Weather-aware scenes use Open-Meteo with your approximate coordinates. No account required. Disable to use time-only scene rotation."_
- **No content telemetry.** Existing PRD §1 invariant 2 unchanged. Stage fetches do not include any user-identifying parameters.

---

## 10. PRD restructure

Full rewrite of `docs/prd.md` from a 7-pillar spine to an 8-surface spine plus 4 cross-cutting capability chapters. New chapter map:

```
SYSTEM
§1   Executive summary and scope                  [REWRITE for greenfield — no "3M users / $39 Plus"]
§2   Goals, non-goals, success metrics            [rewrite — pre-launch aspirational]
§3   Architecture overview                        [update — new RPC routes, scenes/weather flows]
§4   Tech stack and repository layout             [update — Fraunces/Geist fonts, scene pipeline]
§5   Data model (TypeScript)                      [update — add Scene, Weather, streak]
§6   LLM provider abstraction and prompt contracts [largely unchanged]
§7   Auth and key management                      [unchanged conceptually; renumbers]

SURFACE CHAPTERS (user-facing)
§8   Surface: Brief drawer
§9   Surface: Today drawer (calendar + meeting prep)
§10  Surface: Goals drawer
§11  Surface: Notes drawer
§12  Surface: Inbox drawer (Gmail)
§13  Surface: Focus drawer (Pomodoros + soundscapes + site blocker integration; Block-page overlay sub-section)
§14  Surface: Profile drawer + Onboarding modal

CROSS-CUTTING CAPABILITY CHAPTERS
§15  Capability: Adaptive Personalization
§16  Capability: Multimodal
§17  Capability: Stage + Scenes pipeline
§18  Capability: ⌘K command palette

CLOSING
§19  Cross-cutting guardrails
§20  Test plan
§21  Implementation phases and acceptance gates
§22  Out of scope
§23  Glossary
```

**Migration map (old chapter → new chapter):**

| Old                              | New                                       |
| -------------------------------- | ----------------------------------------- |
| §1 (3M users / $39 Plus framing) | §1 (greenfield rewrite)                   |
| §5 Auth                          | §7 (mostly unchanged) + §14 (UI surface)  |
| §8 Daily Agent                   | §8 Brief drawer (surface-first)           |
| §9 Adaptive Personalization      | §15 (cross-cutting capability)            |
| §10 Semantic Notes               | §11 Notes drawer + §18 ⌘K                 |
| §11 Smarter Site Blocker         | §13 Focus drawer (folded)                 |
| §12 Gmail + Meeting AI           | §12 Inbox + §9 Today (meeting prep moves) |
| §13 Goal Decomposition           | §10 Goals drawer                          |
| §14 Multimodal                   | §16 (cross-cutting capability)            |
| §15 Cross-cutting guardrails     | §19                                       |
| §16 Test plan                    | §20                                       |
| §17 Phases                       | §21 (rewritten for new phase plan)        |
| §18 Out of scope                 | §22                                       |
| §19 Glossary                     | §23                                       |

`docs/design-system.md` gets a **full rewrite** (not a diff) reflecting the new tokens, primitives, fonts, glass treatment, removed light/density modes.

`docs/architecture.md` gets a **patch** — new RPC routes, new third-party endpoints, scene pipeline diagram added under §3.1, no other changes.

All three doc rewrites land in the same `phase-1.6-shell` branch as code commits.

---

## 11. Phase plan

```
Phase 1.5 providers   [in flight on phase-1.5-providers]
                      Tasks 6-13 finish → merge to master → branch closed

Phase 1.5 alarms      [parallel branch from master — pure SW, no shell dep]
                      Branch: phase-1.5-alarms
                      Per the 19 alarms decisions locked in past sessions
                      Spec doc lands when this workstream starts

Phase 1.6 shell pivot [THIS WORK — branch from master after providers merges]
                      Branch: phase-1.6-shell
                      Six workstreams (see §12). PRD + design-system + architecture
                      doc rewrites committed alongside.

Phase 1.5 settings    [after shell pivot merges]
                      Branch: phase-1.5-settings from master
                      Fills Profile drawer body + Onboarding step 3 with real
                      BYOK CRUD, encryption opt-in, passphrase, recovery
                      Per the 19 settings decisions locked in past sessions

Phase 2+              [unchanged sequence — fills mocked drawer bodies per pillar]
                      Daily Agent fills Brief + Hero "Top of mind" + Ticker
                      Semantic Notes fills Notes + ⌘K ask
                      etc.
```

The 19 alarms + 19 settings decisions from prior interview sessions are _referenced by session ID_ in this spec; full codification happens in their respective plan docs when those branches start.

---

## 12. Workstreams (Phase 1.6 shell pivot)

Six workstreams executable on the same branch with broadly independent scope:

### 12.1 Workstream A — Tokens, theme, fonts

- Rewrite `packages/ui/src/tokens.ts` against new color/glass/font tokens.
- Rewrite `packages/ui/src/theme.css` — drop `[data-theme="light"]` rules, drop `data-density` rules, add new accent definitions, add `--glass-1/2/3` utilities, add scene image CSS for Stage component.
- Rewrite `packages/ui/src/theme/accents.ts` with the 5 new accents (amber/rose/mint/violet/sky).
- Simplify `ThemeProvider.tsx` API: drop `theme` prop, drop `density` prop. Keep `accent` prop.
- Drop dependencies: `wouter`, `@fontsource/newsreader`, `@fontsource/instrument-sans`, `@fontsource/jetbrains-mono`.
- Add dependencies: `@fontsource/fraunces`, `@fontsource/geist-sans`, `@fontsource/geist-mono`.
- Rebuild `tokens.test.ts` snapshot.

### 12.2 Workstream B — Shell components

- New `packages/ui/src/shell/Stage.tsx` (full-bleed image + veil + grain).
- New `packages/ui/src/shell/Drawer.tsx` (generic drawer chrome; consumer passes body).
- New `packages/ui/src/components/GlassCard.tsx`.
- New `apps/extension/app/components/{Topbar,Hero,Ticker,CmdK}.tsx`.
- Wire `apps/extension/entrypoints/newtab/App.tsx` to the new shell layout (delete wouter routing).
- New `apps/extension/app/state/shell.ts` — Zustand store per §6.1.

### 12.3 Workstream C — Drawer bodies

Six mock-data drawer bodies + Profile + Onboarding scaffolding:

- `apps/extension/app/drawers/BriefDrawer.tsx` — TLDR, pomodoros, watchouts, recovery (mocks per `MOCK.brief`).
- `apps/extension/app/drawers/TodayDrawer.tsx` — calendar timeline + meeting-prep panel, all mock (Calendar OAuth lands Phase 4).
- `apps/extension/app/drawers/GoalsDrawer.tsx` — goal list with milestones (mocks per `MOCK.goals`).
- `apps/extension/app/drawers/NotesDrawer.tsx` — notes list + selected-note view with Related panel (mocks per `MOCK.notes`).
- `apps/extension/app/drawers/InboxDrawer.tsx` — action list with priority + suggested action (mocks per `MOCK.inboxActions`).
- `apps/extension/app/drawers/FocusDrawer.tsx` — Pomodoro timer (real countdown), soundscape labels (mock, no audio), block rules list (mock).
- `apps/extension/app/drawers/ProfileDrawer.tsx` — accent picker (real), scene picker (real), weather toggle (real), BYOK list (stubbed for Phase 1.5 settings), encryption opt-in (stubbed), telemetry toggle (real).
- `apps/extension/app/drawers/OnboardingDrawer.tsx` — 3 steps with real BYOK validation; encryption step is a stub button.

Single `MOCK` import from `apps/extension/app/mocks/index.ts` (matches the mock HTML's MOCK object) so the swap-to-real wiring in later phases is a one-line change per drawer.

### 12.4 Workstream D — Scenes pipeline

- `packages/core/src/scenes/picker.ts` — `pickMoodByHour`, `pickScene`, `hashSeed` (FNV-1a or similar), `codeToAffinity` mapping.
- `packages/core/src/scenes/types.ts` — `SceneManifest`, `Mood`, `WxAffinity`, `WeatherCache`.
- `packages/core/src/scenes/picker.test.ts` — unit tests for picker (deterministic seed, mood-band transitions, weather-affinity narrowing, fallback when subset empty).
- New `scenes.getManifest` route handler in `apps/extension/entrypoints/background.ts`.
- New `scenes.fetchPhoto` route handler in `apps/extension/entrypoints/offscreen/main.ts`.
- New `weather.getCurrent` route handler in `apps/extension/entrypoints/background.ts`.
- New OPFS helper in offscreen for photo cache write/read with LRU eviction.
- Geolocation lookup in new-tab UI context (`useGeolocation` hook).
- `apps/extension/app/scene/useScene.ts` — orchestration hook that reads cache, runs picker, kicks fetches, returns current scene.

### 12.5 Workstream E — Cleanup + docs

**Files deleted:**

- `apps/extension/app/routes/` (entire directory — all 8 routes + tests)
- `apps/extension/app/components/CompassSidebar.tsx` + test
- `apps/extension/app/components/CompassTopbar.tsx`
- `apps/extension/app/components/TweaksPanel.tsx` (collapses into `ProfileDrawer`)
- `apps/extension/app/components/DevPingButton.tsx` (verify usage; if still used for offscreen RPC sanity-check, retain in `OnboardingDrawer` debug-only step; otherwise delete)
- `packages/ui/src/layout/AppShell.tsx` + test
- `packages/ui/src/layout/Sidebar.tsx`
- `packages/ui/src/layout/Topbar.tsx` (the layout primitive — single-purpose Topbar component lives in apps/)
- `packages/ui/src/layout/Surface.tsx`
- `packages/ui/src/layout/Grid.tsx`
- `packages/ui/src/components/Prose.tsx` (verify no consumer; delete if dead)
- All `data-theme="light"` rules in `theme.css`
- All `data-density` rules

**Doc rewrites:**

- `docs/prd.md` — full rewrite per §10 chapter map
- `docs/design-system.md` — full rewrite
- `docs/architecture.md` — patch (new RPC routes, endpoints, scene pipeline)

### 12.6 Workstream F — Tests

- Unit: picker (Workstream D), shell state machine reducers, hash function determinism.
- Component: each new shell component (Stage, Drawer, Topbar, Hero, Ticker, CmdK, GlassCard) with Vitest + Testing Library.
- E2E (Playwright): drawer open/close (each kind), drawer kind swap while open, ⌘K open/close + nav match + ask flow + esc, Onboarding dismiss-lock until BYOK valid, scene cycle via topbar spark icon, accent change persists.
- A11y: axe-core on each new component test (zero violations baseline kept).
- Visual regression deferred — manual screenshot review during PR is acceptable for v1.

---

## 13. Definition of Done

Phase 1.6 ships when **all** of the following are green:

1. `apps/extension/app/routes/` directory removed; `apps/extension/app/components/Compass{Sidebar,Topbar,TweaksPanel}.tsx` removed; `packages/ui/src/layout/{AppShell,Sidebar,Topbar,Surface,Grid}.tsx` removed; `wouter` removed from `package.json`.
2. New-tab loads on cold install with no network: solid `--bg` warm-dark Stage + grain + Shell + Onboarding drawer auto-opened, dismiss-locked. Onboarding step 1 (welcome) renders correctly without manifest/weather/photo cache.
3. New-tab loads on cold install with network: manifest fetched, photo downloaded to OPFS, photo cross-fades onto Stage within 2.5s of mount.
4. All 6 nav drawers open/close via topbar nav pills; each renders mock data correctly with serif headers, mono badges, glass surface.
5. Profile drawer opens via avatar click; accent picker round-trips (selection persists across reload); scene picker round-trips; weather toggle defaults OFF; toggle ON prompts geolocation, fetches weather, swaps photo within 5s.
6. Onboarding drawer auto-opens on fresh install; scrim/Esc are no-ops until BYOK valid; `llm.validateKey` real round-trip with all 3 providers (OpenRouter, OpenAI, Anthropic — depending on which keys are pasted); on success, drawer becomes dismissable, `byokConfigured` persists across reload.
7. ⌘K hotkey opens palette; nav match navigates to correct drawer; ask mode shows spinner + canned response with citation badges.
8. Every existing primitive that survives (`Button`, `Modal`, `Badge`, etc.) renders correctly on the new dark glass surfaces; no light-mode style leakage.
9. `pnpm typecheck` clean across all 9 packages.
10. `pnpm test` green across all packages — including new picker unit tests, new shell component tests, new e2e tests.
11. `pnpm build` produces a chrome-mv3 bundle; install size is reasonable (target: < 1.5 MB pre-OPFS scene downloads).
12. `docs/prd.md` rewritten per chapter map in §10. `docs/design-system.md` rewritten. `docs/architecture.md` patched.
13. Manual cross-browser smoke: Chrome (full), Firefox (Stage + drawers + ⌘K render correctly; weather opt-in works; OPFS cache works; Onboarding gate works), Safari macOS (same — Safari has no `chrome.offscreen` so the photo fetch falls back to background-tab pattern per existing PRD §3.2 strategy).

Phase 1.6 explicitly does **not** ship:

- Real Brief / Today / Goals / Notes / Inbox / Focus drawer bodies (those are pillar phases).
- Real ⌘K ask grounding (Phase 2 Semantic Notes).
- Real Profile encryption opt-in flow (Phase 1.5 settings).
- Real soundscape audio playback (deferred).
- Real Block-page overlay (Phase 3).

---

## 14. Out of scope

- **Soundscapes audio.** Focus drawer renders the 4 soundscape labels but no `<audio>` playback. Audio asset pipeline + per-user prefs + worker is a v2 conversation.
- **Block-page overlay restyle.** Phase 3 owns blocker; the overlay restyle to match new glass language happens then.
- **Light mode.** Dark-only ships v1; if a future user-research insight prompts light mode, it's its own design exercise (the photographic backdrops alone require different art direction for light).
- **Density modes.** No sidebar to size; dropping the concept entirely. If a future tablet/mobile shell wants compact, it's a separate adaptive design.
- **User-uploaded scenes.** v1 manifest is universal/Compass-curated. Per-user scene libraries are v2+.
- **Scene library growth tooling.** Manifest is hand-edited JSON for v1. A curation tool is v2+.
- **Visual regression testing.** Manual screenshot review during PR is the v1 baseline.
- **Service-worker scene refresh on alarm.** Scenes refresh client-side on tab open. A background pre-fetch could land later if first-paint perceptibly suffers.

---

## 15. Open questions / future work

- **Attribution UX detail.** Topbar shows photographer name + scene label. Should it also link to the photographer's Unsplash profile (Unsplash API terms encourage but don't require this)? If yes, where — hover affordance, click-through? Settled in implementation.
- **Manifest CDN host.** Spec assumes `assets.compassdash.com`. Concrete subdomain + DNS + CloudFront/Cloudflare config is an infra task, not a code task; tracked separately.
- **OPFS photo cache size cap.** 50 MB target. Can be tuned based on real-world manifest growth + per-user scene rotation patterns.
- **`DevPingButton` retention.** Currently used as the offscreen RPC sanity-check button in dev builds. After shell pivot, it could live as a debug-only step inside `OnboardingDrawer` to preserve the round-trip check, or be deleted. Decided during Workstream E.
- **Greenfield PRD framing.** §1 rewrite needs to land somewhere honest between "pre-launch personal project" and "production-ready privacy-first browser extension." Tone TBD during PRD §1 rewrite.

---

## 16. References

- New design source: [`docs/Compass.design-update.html`](../../Compass.design-update.html) (extracted JSX in this session at `/tmp/compass-bundle-{4,5,6}.txt`)
- Phase 1.5 foundation spec: [2026-05-03-phase-1.5-foundation-design.md](2026-05-03-phase-1.5-foundation-design.md)
- Phase 1 foundation spec: [2026-04-26-phase-1-foundation-design.md](2026-04-26-phase-1-foundation-design.md)
- Phase 0 scaffold spec: [2026-04-19-phase-0-scaffold-and-design-system-design.md](2026-04-19-phase-0-scaffold-and-design-system-design.md)
- Existing PRD: [`docs/prd.md`](../../prd.md)
- Existing design system: [`docs/design-system.md`](../../design-system.md)
- Existing architecture: [`docs/architecture.md`](../../architecture.md)
- Open-Meteo docs: https://open-meteo.com/en/docs (no API key required, public free tier)
- Unsplash API terms (hotlinking permitted): https://unsplash.com/api-terms
