# Compass — web prototype

The clickable UI for Compass, implemented from the design handoff in [../design/](../design/).

Built as a single-page React app that runs in-browser via Babel Standalone — **no build step** required. This is the prototype stage; the production extension will port these surfaces to the WXT + React 19 + TypeScript stack described in [../docs/prd.md](../docs/prd.md) §4.

## Run it

Anything that serves the directory over HTTP works. The `text/babel` scripts can't be loaded from `file://`.

```bash
cd web
npm start
# or:
python3 -m http.server 8765
```

Open http://localhost:8765.

## What's implemented

All seven surfaces from the PRD, wired through a local router:

- **New Tab** — morning brief card, timeline, inbox actions, goals, notes, blocker previews
- **Notes** — list/detail, auto-links, forgotten-context callout, ⌘K semantic search modal
- **Focus** — daily-focus input, duration picker, weekly history, full-screen running overlay
- **Goals** — decomposition view with milestones, stats, re-decompose modal
- **Inbox Actions** — extracted-action detail, streaming draft-reply modal
- **Site Blocker** — rules table, rationalization stats, soft-block negotiation overlay
- **Settings** — providers, AI budget, privacy, feature flags
- **Onboarding** — three-step BYOK / OpenRouter flow (reachable via the bottom-left pill)

Tweaks panel (bottom-right) toggles theme, accent color, and density.

## Layout

```
web/
├── index.html          # shell, CSS tokens, font + CDN script tags
└── src/
    ├── app.jsx         # router
    ├── shell.jsx       # sidebar, topbar, tweaks panel
    ├── icons.jsx       # feather-style icon set
    ├── data.jsx        # MOCK data
    ├── newtab.jsx      # primary hero surface
    ├── notes.jsx, focus.jsx, goals.jsx, inbox.jsx, blocker.jsx,
    │   settings.jsx, onboarding.jsx
```

Scripts load in the order declared in `index.html`; each file attaches its exports to `window` so the later files can consume them.
