# Compass — Agents Guide

Read this before touching the Compass codebase. For full architectural detail see [docs/architecture.md](docs/architecture.md); for the design system see [docs/design-system.md](docs/design-system.md); for product requirements see [docs/prd.md](docs/prd.md).

---

## Commands

```bash
pnpm install        # install workspace deps (pnpm 9.15.0+, Node 22+)
pnpm dev            # WXT dev server (primary: Chrome; use dev:firefox for Firefox)
pnpm build          # production builds for Chrome MV3 + Firefox MV2
pnpm test           # vitest across all workspaces
pnpm typecheck      # tsc --noEmit per workspace
pnpm lint           # eslint + prettier check
pnpm format         # prettier --write
```

Single-package variants: `pnpm --filter @compass/ui test`, `pnpm --filter @compass/extension build`, etc.

---

## Architectural invariants

Four non-negotiable rules from [PRD §1](docs/prd.md#1-executive-summary-and-scope). Violating any of these is a PR-reject offense.

1. **LLM calls never transit the Compass backend.** Keys and OAuth tokens live only on the client. The backend is for license/sync/metadata only.
2. **No content telemetry.** Note text, email bodies, calendar descriptions, Focus URLs never leave the device except (a) to the user's chosen LLM provider under their own credentials, or (b) encrypted-at-rest optional cloud sync.
3. **Local-first.** Features degrade gracefully without network and without an LLM key.
4. **Separation of extraction and action.** An LLM call that reads untrusted content (email body, web page, image OCR) may never hold tools that change state.

---

## Never do

- Commit content (note bodies, email bodies, user text) to telemetry, analytics, or any server call.
- Proxy LLM requests through a Compass backend.
- Sync raw API keys or OAuth tokens to `chrome.storage.sync`. Use `chrome.storage.local` + passphrase encryption.
- Use `eval()` or `new Function(...)` — any dynamic code execution is forbidden.
- Call browser extension APIs (`chrome.*`, `browser.*`) from the offscreen document. The offscreen document is for heavy work (ML, DB, LLM fetch) only.
- Auto-send emails, auto-create tasks from untrusted content without a preview gate, or wire `drafts.send` / `messages.send` anywhere in the codebase.
- Skip the pre-commit hook (`--no-verify`). If it fails, fix the underlying issue.

---

## Testing expectations

- Every new UI primitive: `.test.tsx` covering render, variants, keyboard/a11y, and `jest-axe` with zero violations.
- Every new surface: render test asserting key headings + a sampled `jest-axe` pass.
- Every new integration seam: typed mock returning canonical fixture shape + a latency envelope test.
- Every new hook: behavior + cleanup test.
- Aggregate coverage target: ≥85% line, ≥75% branch (per PRD §16.1).

---

## Reference docs

- **[docs/prd.md](docs/prd.md)** — product requirements; 7 pillars, 5 phases, architectural invariants. Canonical.
- **[docs/design-system.md](docs/design-system.md)** — tokens, primitives, icons, hooks, layout recipes. Update when you add to `packages/ui`.
- **[docs/architecture.md](docs/architecture.md)** — package boundaries, integration seams, routing/state/shortcuts, recipes for adding surfaces/primitives/seams.
- **[docs/superpowers/specs/](docs/superpowers/specs/)** — sprint design specs.
- **[docs/superpowers/plans/](docs/superpowers/plans/)** — sprint implementation plans.
- **[design/](design/)** — source-of-truth visual prototype (do not modify).

---

## Monorepo layout (high level)

```
apps/extension/           # WXT + React 19 + wouter
packages/ui/              # Design system
packages/core/            # Entity types + mock fixtures
packages/agents/          # Seam stubs (Phase 0) → real logic (Phase 2+)
packages/{llm,db,embeddings,integrations}/   # Phase 1+ stubs
```

---

## Getting help

If a change feels like it might violate an invariant, read [docs/prd.md §1 + §15](docs/prd.md#1-executive-summary-and-scope) before proceeding. If still unsure, open a draft PR and flag the question in the description — it's far cheaper to check early than to unwind later.
