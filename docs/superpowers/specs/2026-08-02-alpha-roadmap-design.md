# Compass — Solo Alpha Roadmap (design)

**Date:** 2026-08-02
**Status:** approved, in execution
**Supersedes for sequencing:** PRD §21 phase order (not its content or DoDs)

---

## 1. Why this document exists

The PRD's phase plan (§21) is written for a **public launch**: it front-loads
Gmail because Google's CASA review is a long pole, and it treats each surface as
equally important. That is the right plan for shipping to strangers.

It is the wrong plan for the goal we actually have now, which is: **one person
(the author) daily-driving Compass as their new-tab page.** For a solo alpha,
CASA is irrelevant — Google's OAuth "testing" mode serves up to 100 users
without review — so the long pole disappears and sequencing should instead
follow _what makes the product feel real when you open a tab_.

This document re-sequences the remaining work against that goal. It changes
**order and scope**, not the PRD's architecture, data model, or Definitions of
Done — those remain canonical.

---

## 2. Where the project actually stands (2026-08-02)

Verified by reading the tree and running the suite, not from prior claims.

| Area                     | State                                |
| ------------------------ | ------------------------------------ |
| Tests                    | 570 passing across 9 workspaces      |
| Lint / typecheck / build | Green as of `12b13e7`                |
| `master`                 | 20 commits behind the working branch |
| Open PRs                 | #13–#19, all stacked, none merged    |

**Real surfaces:** Brief (LLM morning + EOD, cost ledger, alarms), Notes
(MiniLM embeddings, hybrid FTS5+cosine search, auto-linking), Profile /
Onboarding (BYOK, passphrase encryption, key validation), Stage (manifest,
weather, OPFS photo cache, favourites bias).

**Mock surfaces:** Today, Goals, Inbox — all three render from
[`app/mocks/index.ts`](../../../apps/extension/app/mocks/index.ts). Focus is
half real: the timer persists to sqlite, but soundscapes and block rules are
labels.

### 2.1 The finding that sets the order

[`brief.morning.ts`](../../../packages/agents/src/brief.morning.ts) builds its
snapshot with `events: []`, `overdueTasks: []`, `activeGoals: []`. The Brief —
the product's centrepiece, and the one surface described as fully real — is an
LLM writing about an empty day. It has real plumbing and no real input.

Everything downstream inherits that emptiness: the Hero card renders the
Brief's TLDR, and the Ticker renders its watchouts and a mock streak.

**Therefore: the ordering principle is "fill the Brief's inputs, one source at
a time."** Each phase below makes one `[]` in that snapshot real, which
simultaneously de-mocks a drawer _and_ improves the Brief. That is a
significantly better return per phase than the PRD's surface-by-surface order.

---

## 3. Phases

Each phase is independently shippable, ends green, and ends with a PR.

### Phase A — Foundation reset ✅ complete

Unblocks everything else; nothing here is user-visible.

- Finish the Phase D ink-ladder migration; lint clean workspace-wide.
- Fix the token-naming bifurcation: 16 of 18 `@compass/ui` components
  referenced `--ink` / `--panel` / `--hair` / `--sh-1`, which
  [`theme.css`](../../../packages/ui/src/theme.css) never defined. Every
  component was painting colour and shadow slots with dead values.
- Add `theme-tokens.test.ts` so the two naming schemes cannot drift again.
- Collapse the 7-PR stack into one reviewable PR; bring `master` current.

**Gate:** lint + typecheck + tests + build green; `master` has the design
system work. ✅

### Phase B — The Real Day (Google Calendar) ✅ complete

The highest-value phase. Kills the largest mock and fills `events` in the
Brief snapshot.

- `packages/integrations/src/oauth/pkce.ts` per PRD §7.4 — this code does not
  exist yet despite being fully specified.
- `packages/integrations/src/gcal/` — client, typed event mapper, incremental
  sync via `syncToken`.
- Scope: **`calendar.readonly` only.** No Gmail scope in this phase, which
  keeps the consent screen out of restricted-scope territory entirely.
- DB migration: `calendar_events`, `calendar_attendees` (+ the
  `idx_attendees_email` index) per PRD §5.7.
- Refresh tokens through the existing `EncryptedSecret` envelope; access
  tokens in `chrome.storage.session` only.
- Today drawer reads real events; meeting-prep countdown becomes real.
- `brief.morning` snapshot gets real `events`.

**Gate:** PRD §9.6 DoD; a revoked token degrades to a dismissible banner, never
a crash; Brief visibly reflects today's actual calendar. ✅ (code complete and
green against mocks; first live fetch needs the one-time OAuth client setup in
[setup-google-calendar.md](../../setup-google-calendar.md))

### Phase C — Real Goals (no OAuth)

Fully local, so it can proceed even if Google review or quota bites.

- `goals` + `milestones` tables; repository in `packages/db`.
- `goal.decompose` agent (PRD §10.3) — the one task routed to the high tier.
- Goals drawer: real create / edit / decompose / archive.
- Fills `activeGoals` in the Brief snapshot; makes the Ticker's quoted-goal
  pill real.
- **Deferred:** drift detection (§10.4) — it needs weeks of history to say
  anything true, so it is dead weight on day one.

**Gate:** PRD §10.7 DoD minus drift; a decomposition round-trips and survives
reload.

### Phase D — Real Focus (PRD Phase 3)

Makes the half-real surface whole, and turns the Ticker's mock vitals real.

- Bundled soundscape audio with real playback.
- Block rules via `declarativeNetRequest` + block-page content script.
- Soft-block negotiation overlay (`blocker.negotiate`), with the red-team round
  the PRD requires before any negotiation prompt ships.
- Adaptive Personalization signals (§15.2) — peak focus hour, streaks —
  computed from the pomodoro history that Phase 2 already persists.
- Populates `PersonalizationState.streakDays`, which §5.5 explicitly left for
  "Phase 2+" and nothing has written since.

**Gate:** PRD §13.11 + §15.5 DoD.

### Phase E — Real Inbox (Gmail)

Last, deliberately. It is the heaviest surface, carries the only
untrusted-input attack surface in the product, and is the one phase whose
value does not compound into the other surfaces.

- `gmail.modify` OAuth (added as an incremental scope, so Phase B's consent
  screen is not disturbed).
- Local message index per §5.7; snippets capped at 500 chars, no full bodies
  beyond 30 days.
- `gmail.extract` → typed actions; `gmail.priority`; draft reply behind a
  non-optional preview gate.
- Prompt-injection hardening per §12.6 and §19.4, with the red-team suite
  green. The extraction call holds no state-changing tools — invariant 5.

**Gate:** PRD §12.8 DoD; red-team 100%; no `messages.send` / `drafts.send`
anywhere in the tree.

### Phase F — Make it mine (polish)

- **Hero personalisation** — greeting, mood line and TLDR are currently
  generic; drive them from `UserProfile` and the real Brief.
- Move the scene manifest off the interim GitHub Pages host.
- a11y audit (axe clean on all 8 drawers), cross-browser smoke, packaging and
  install notes for daily driving.

**Gate:** PRD §16.6-equivalent for the surfaces in scope; axe clean.

---

## 4. What is explicitly not in this plan

Not because they are bad, but because they do not serve one person daily
driving the product:

- CASA submission and Chrome Web Store listing — needed only to distribute.
- Multimodal (PRD Phase 5): voice, OCR, vision board.
- Safari and visionOS parity.
- Telemetry counters — there is no one to count.
- Fitbit / Strava — the Brief accepts `fitbit: null` and always has.

---

## 5. Risks

| Risk                                                                 | Mitigation                                                                                               |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Google OAuth client setup is manual and easy to get wrong            | Phase B ships a written setup checklist alongside the code; the redirect URI is derived, never hardcoded |
| A dormant repo (May → Aug) may have stale deps or a broken toolchain | Verified green before any new work: tests, typecheck, lint, build all pass on Node 24                    |
| LLM spend while dogfooding                                           | The §6.5 cost ledger and $2/month soft cap already exist and already write rows                          |
| Phases B/C/E each add a DB migration                                 | Migrations are additive-only and `DROP COLUMN` is banned (§5.7); each phase adds its own numbered file   |

---

## 6. Sequencing note

Phases B, C, D are independent of each other and each independently useful.
If any one stalls on an external dependency, the next can start — only Phase E
benefits from coming last. Phase A is a hard prerequisite for all of them
because it is what makes `master` a sane base to branch from.
