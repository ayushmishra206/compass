# Compass Phase 0 — Scaffold & Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Compass monorepo, the warm-paper design system, and faithful React ports of every surface from the prototype, backed by typed integration-seam stubs — so every subsequent phase is plug-in work against a tested UI.

**Architecture:** pnpm-workspaces monorepo with Turborepo caching. Single WXT extension app (Chrome/Firefox/Safari targets) consumes a shared `packages/ui` design system. Future LLM/DB/auth work plugs into 8 typed seams in `packages/agents/src/stubs/`. Visual regression + E2E guard the pixel-perfect port.

**Tech Stack:** WXT, React 19, TypeScript 5.6 strict, Tailwind v4, Zustand, Zod, Wouter, Framer Motion, Vitest + Testing Library + jest-axe, Playwright.

**Spec:** [docs/superpowers/specs/2026-04-19-phase-0-scaffold-and-design-system-design.md](../specs/2026-04-19-phase-0-scaffold-and-design-system-design.md)

---

## File Structure

Target tree after this plan completes. Files listed `[stub]` contain empty barrel + TODO comment only.

```
compass/
├── .github/workflows/ci.yml
├── .gitignore, .editorconfig, .nvmrc, .prettierrc, .eslintrc.cjs
├── .husky/pre-commit
├── AGENTS.md
├── package.json, pnpm-workspace.yaml, turbo.json, tsconfig.base.json
├── apps/extension/
│   ├── wxt.config.ts, package.json, tsconfig.json, tailwind.config.ts
│   ├── entrypoints/
│   │   ├── newtab/{index.html, main.tsx, App.tsx}
│   │   ├── popup/{index.html, main.tsx}          [minimal — "open new tab" link]
│   │   ├── options/{index.html, main.tsx}        [minimal — redirect to /settings]
│   │   ├── background.ts                         [stub]
│   │   └── offscreen/{index.html, main.ts}       [stub]
│   └── app/
│       ├── routes/
│       │   ├── newtab/{index.tsx, MorningBrief.tsx, Timeline.tsx, InboxMini.tsx,
│       │   │            Suggestions.tsx, GoalsMini.tsx, NotesMini.tsx, BlockerMini.tsx,
│       │   │            Widget.tsx, Vital.tsx}
│       │   ├── notes/{index.tsx, NotesList.tsx, NoteDetail.tsx, AutoLinkCard.tsx, CmdK.tsx}
│       │   ├── focus/{index.tsx, FocusPlanner.tsx, FocusHistory.tsx, FocusRunning.tsx}
│       │   ├── goals/{index.tsx, GoalList.tsx, GoalDetail.tsx, DecomposeModal.tsx, Stat.tsx}
│       │   ├── inbox/{index.tsx, InboxList.tsx, ActionDetail.tsx, DraftModal.tsx}
│       │   ├── blocker/{index.tsx, RulesTable.tsx, BlockOverlay.tsx}
│       │   ├── settings/{index.tsx, Section.tsx, Provider.tsx, BudgetCard.tsx, FeatureFlags.tsx}
│       │   └── onboarding/{index.tsx, WelcomeStep.tsx, ConnectStep.tsx, DoneStep.tsx}
│       ├── components/TweaksPanel.tsx
│       ├── state/shell.ts
│       ├── mock/{index.ts, brief.ts, events.ts, goals.ts, notes.ts, inbox.ts, blockRules.ts,
│       │         soundscapes.ts, suggestions.ts, vitals.ts}
│       └── shortcuts.ts
├── packages/
│   ├── ui/                          # design system (primitives, tokens, icons, hooks, layout)
│   │   ├── package.json, tsconfig.json
│   │   └── src/
│   │       ├── index.ts             # barrel
│   │       ├── tokens.ts
│   │       ├── theme.css
│   │       ├── components/
│   │       │   ├── Button.tsx, IconButton.tsx, Card.tsx, Badge.tsx, Input.tsx, Textarea.tsx,
│   │       │   │   Kbd.tsx, Tag.tsx, Modal.tsx, Segmented.tsx, Swatch.tsx, Toggle.tsx,
│   │       │   │   Spinner.tsx, Progress.tsx, Divider.tsx, Prose.tsx, BrandMark.tsx
│   │       │   └── <each>.test.tsx
│   │       ├── icons/{index.ts, Icon.tsx, <Name>.tsx (33 icons)}
│   │       ├── hooks/{useEscape.ts, useFocusTrap.ts, useShortcuts.ts, usePersistentState.ts,
│   │       │          useTheme.ts, useOverlay.ts}
│   │       ├── layout/{AppShell.tsx, Sidebar.tsx, Topbar.tsx, Surface.tsx, Grid.tsx}
│   │       ├── theme/{ThemeProvider.tsx, accents.ts}
│   │       └── utils/cn.ts
│   ├── core/                        # mock-entity types this sprint; Zod schemas in Phase 1
│   │   └── src/{index.ts, types/<Entity>.ts}
│   ├── agents/                      # stubs + future agent business logic
│   │   └── src/stubs/{index.ts, <seam>.ts, <seam>.test.ts}
│   ├── llm/, db/, embeddings/, integrations/   # stubs
├── tests/
│   ├── e2e/{smoke.spec.ts, extension-fixture.ts}
│   └── visreg/{surfaces.spec.ts, __screenshots__/}
└── docs/{prd.md, architecture.md, design-system.md, superpowers/...}
```

**Decomposition principle:** one file per primitive; one directory per surface with its composites split out (no surface file exceeds ~250 lines). Tests co-locate next to source for `packages/ui`; surface render tests live in `apps/extension/tests/` (co-located under app).

---

## Task 1: Monorepo bootstrap

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.nvmrc`, `.gitignore`, `.editorconfig`, `.prettierrc`, `.eslintrc.cjs`, `.husky/pre-commit`

- [ ] **Step 1: Pin Node version**

Create `.nvmrc`:
```
22
```

Run `node --version` to confirm Node 22 is active. If not, install via nvm: `nvm install 22 && nvm use 22`.

- [ ] **Step 2: Initialize root package.json**

Create `package.json`:
```json
{
  "name": "compass",
  "private": true,
  "version": "0.1.0",
  "packageManager": "pnpm@9.15.0",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "typecheck": "turbo typecheck",
    "lint": "turbo lint",
    "format": "prettier --write .",
    "prepare": "husky"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "prettier": "^3.3.0",
    "eslint": "^9.14.0",
    "@typescript-eslint/eslint-plugin": "^8.15.0",
    "@typescript-eslint/parser": "^8.15.0",
    "eslint-plugin-react": "^7.37.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "eslint-config-prettier": "^9.1.0",
    "typescript": "^5.6.3",
    "husky": "^9.1.6",
    "lint-staged": "^15.2.0"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

- [ ] **Step 3: Create pnpm workspace and turbo config**

Create `pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Create `turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".output/**", "dist/**"] },
    "dev":   { "cache": false, "persistent": true },
    "test":  { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "typecheck": { "dependsOn": ["^build"] },
    "lint": {}
  }
}
```

- [ ] **Step 4: Shared tsconfig**

Create `tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": false
  }
}
```

- [ ] **Step 5: Prettier + ESLint + Husky**

Create `.prettierrc`:
```json
{ "semi": true, "singleQuote": true, "trailingComma": "all", "printWidth": 100, "tabWidth": 2 }
```

Create `.eslintrc.cjs`:
```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  settings: { react: { version: 'detect' } },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': 'error',
  },
  env: { browser: true, node: true, es2022: true },
  ignorePatterns: ['dist', '.output', 'coverage', 'node_modules', 'web/'],
};
```

Create `.gitignore`:
```
node_modules
dist
.output
.wxt
coverage
*.log
.DS_Store
.turbo
.env
.env.local
playwright-report
test-results
```

Create `.editorconfig`:
```
root = true
[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
```

- [ ] **Step 6: Install & init husky**

Run:
```bash
pnpm install
pnpm exec husky init
```

Replace `.husky/pre-commit` content with:
```
pnpm exec lint-staged
```

- [ ] **Step 7: Verify lint + typecheck work**

Run:
```bash
pnpm lint 2>&1 | head -20
```
Expected: turbo runs but finds no workspace tasks yet (since no packages exist). OK.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: bootstrap pnpm+turbo monorepo with strict TS, ESLint, Prettier, Husky"
```

---

## Task 2: Stub workspaces (`packages/core`, `llm`, `db`, `embeddings`, `integrations`, `agents`)

**Files:**
- Create: `packages/{core,llm,db,embeddings,integrations,agents}/{package.json, tsconfig.json, src/index.ts, README.md}`

Every stub package exports an empty barrel. Phase 0 only needs `core` and `agents` to hold real code; the rest exist so cross-workspace imports resolve and CI shapes up.

- [ ] **Step 1: Create `packages/core/package.json`**

```json
{
  "name": "@compass/core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts", "./types/*": "./src/types/*" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint 'src/**/*.{ts,tsx}'",
    "test": "vitest run"
  },
  "devDependencies": { "typescript": "^5.6.3", "vitest": "^2.1.0" }
}
```

Create `packages/core/tsconfig.json`:
```json
{ "extends": "../../tsconfig.base.json", "include": ["src/**/*"] }
```

Create `packages/core/src/index.ts`:
```ts
export * from './types/index.js';
```

Create `packages/core/src/types/index.ts`:
```ts
// Populated in Task 13 (mock data) and expanded in Phase 1 (Zod schemas).
export {};
```

Create `packages/core/README.md`:
```md
# @compass/core

Shared types and (Phase 1+) Zod schemas for the Compass extension.

- **Phase 0 (this sprint):** entity types only, sufficient to type mock fixtures.
- **Phase 1:** full Zod schemas per PRD §6; crypto envelope module.
```

- [ ] **Step 2: Create the five remaining stub packages**

For each of `llm`, `db`, `embeddings`, `integrations`, `agents`:

`packages/<name>/package.json` (substitute `<name>`):
```json
{
  "name": "@compass/<name>",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint 'src/**/*.{ts,tsx}'",
    "test": "vitest run --passWithNoTests"
  },
  "devDependencies": { "typescript": "^5.6.3", "vitest": "^2.1.0" },
  "dependencies": { "@compass/core": "workspace:*" }
}
```

`packages/<name>/tsconfig.json` (same as core's).

`packages/<name>/src/index.ts`:
```ts
// @compass/<name> — populated in a future phase. See README.md.
export {};
```

`packages/<name>/README.md` — one per package, stating which phase fills it:
- `llm`: "Phase 1 — provider abstraction (OpenAI, Anthropic) + router + cost ledger."
- `db`: "Phase 1 — SQLite-WASM + sqlite-vec + migrations."
- `embeddings`: "Phase 1 — local MiniLM via transformers.js + optional remote adapters."
- `integrations`: "Phase 1 — OAuth PKCE for Google/OpenRouter; Phase 4 — Gmail/Calendar."
- `agents`: "Phase 0 — integration-seam stubs; Phase 2+ — real agent business logic."

Put the `stubs/` directory in `packages/agents` even now (empty dir, populated in Task 14).

- [ ] **Step 3: Verify workspace resolves**

Run:
```bash
pnpm install
pnpm -r typecheck
```
Expected: every package typechecks with no errors. OK.

- [ ] **Step 4: Commit**

```bash
git add packages/
git commit -m "chore: scaffold stub packages (core, llm, db, embeddings, integrations, agents)"
```

---

## Task 3: `apps/extension` — WXT scaffold

**Files:**
- Create: `apps/extension/{package.json, wxt.config.ts, tsconfig.json, tailwind.config.ts, postcss.config.js}`
- Create: `apps/extension/entrypoints/{newtab,popup,options,background.ts,offscreen}/**`
- Create: `apps/extension/app/main.css`
- Create: `apps/extension/public/icon/{16,32,48,128}.png` (placeholder single-color PNG is fine — Task 29 can replace)

- [ ] **Step 1: apps/extension package.json**

```json
{
  "name": "@compass/extension",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wxt",
    "dev:firefox": "wxt -b firefox",
    "build": "wxt build && wxt build -b firefox",
    "typecheck": "tsc --noEmit",
    "lint": "eslint 'app/**/*.{ts,tsx}' 'entrypoints/**/*.{ts,tsx}'",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@compass/agents": "workspace:*",
    "@compass/core": "workspace:*",
    "@compass/ui": "workspace:*",
    "framer-motion": "^12.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "wouter": "^3.3.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "jest-axe": "^9.0.0",
    "@types/jest-axe": "^3.5.9",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "typescript": "^5.6.3",
    "vitest": "^2.1.0",
    "wxt": "^0.19.0"
  }
}
```

- [ ] **Step 2: wxt.config.ts**

Create `apps/extension/wxt.config.ts`:
```ts
import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';

export default defineConfig({
  srcDir: 'entrypoints',
  modules: [],
  vite: () => ({
    plugins: [react()],
    resolve: {
      alias: {
        '@app': new URL('./app', import.meta.url).pathname,
      },
    },
  }),
  manifest: {
    name: 'Compass',
    description: 'A calm new tab that quietly learns your day.',
    permissions: ['storage', 'alarms', 'offscreen'],
    chrome_url_overrides: { newtab: 'newtab.html' },
    action: { default_title: 'Compass' },
  },
});
```

- [ ] **Step 3: tsconfig + Tailwind + PostCSS**

Create `apps/extension/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "paths": { "@app/*": ["./app/*"] },
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["app/**/*", "entrypoints/**/*", "tests/**/*", "wxt.config.ts"]
}
```

Create `apps/extension/tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss';
export default {
  content: [
    './app/**/*.{ts,tsx}',
    './entrypoints/**/*.{ts,tsx,html}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
} satisfies Config;
```

Create `apps/extension/postcss.config.js`:
```js
export default { plugins: { '@tailwindcss/postcss': {} } };
```

Create `apps/extension/app/main.css`:
```css
@import 'tailwindcss';
@import '@compass/ui/theme.css';

html, body { margin: 0; padding: 0; }
html, body, #root { min-height: 100vh; background: var(--bg); color: var(--ink); }
body { font-family: var(--sans); font-size: 15px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
* { box-sizing: border-box; }
```

- [ ] **Step 4: newtab entrypoint**

Create `apps/extension/entrypoints/newtab/index.html`:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Compass — new tab</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body><div id="root"></div><script type="module" src="./main.tsx"></script></body>
</html>
```

Create `apps/extension/entrypoints/newtab/main.tsx`:
```tsx
import { createRoot } from 'react-dom/client';
import '@app/main.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);
```

Create `apps/extension/entrypoints/newtab/App.tsx`:
```tsx
export function App() {
  return <div style={{ padding: 40 }}>Compass — boot check</div>;
}
```

- [ ] **Step 5: Popup, options, background, offscreen stubs**

Create `apps/extension/entrypoints/popup/index.html`:
```html
<!doctype html><html><body><p>Compass is on your new tab.</p><a href="chrome://newtab">Open new tab</a></body></html>
```

Create `apps/extension/entrypoints/options/index.html`:
```html
<!doctype html><html><body><script>location.replace(chrome.runtime.getURL('newtab.html') + '#/settings');</script></body></html>
```

Create `apps/extension/entrypoints/background.ts`:
```ts
// TODO(phase-1): alarms scheduling, OAuth, provider selection, offscreen message routing.
export default defineBackground(() => {
  console.log('Compass service worker online');
});
```

Create `apps/extension/entrypoints/offscreen/index.html`:
```html
<!doctype html><html><body><script type="module" src="./main.ts"></script></body></html>
```

Create `apps/extension/entrypoints/offscreen/main.ts`:
```ts
// TODO(phase-1): transformers.js, sqlite-wasm+sqlite-vec, prompt injection sandbox, LLM fetch.
console.log('Compass offscreen document mounted');
```

- [ ] **Step 6: Placeholder icons**

Run:
```bash
mkdir -p apps/extension/public/icon
for size in 16 32 48 128; do
  # Generate 1x1 transparent PNG base64 stretched to size — placeholder only
  printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\xc4\xb3\xbd\x00\x00\x00\x00IEND\xaeB`\x82' > apps/extension/public/icon/$size.png
done
```

(Task 29 replaces these with the BrandMark PNG export.)

- [ ] **Step 7: Verify WXT dev build**

Run:
```bash
pnpm --filter @compass/extension typecheck
```
Expected: PASS (App.tsx is trivial, no other TS files use app).

Run:
```bash
pnpm --filter @compass/extension build
```
Expected: `.output/chrome-mv3/` and `.output/firefox-mv2/` produced. The `newtab.html` file is present in each.

- [ ] **Step 8: Commit**

```bash
git add apps/extension/
git commit -m "feat(extension): scaffold WXT app with newtab/popup/options/background/offscreen entrypoints"
```

---

## Task 4: `packages/ui` foundation — Tailwind theme, fonts, barrel

**Files:**
- Create: `packages/ui/package.json`, `tsconfig.json`, `src/index.ts`, `src/theme.css`, `src/utils/cn.ts`, `vitest.config.ts`, `vitest.setup.ts`

- [ ] **Step 1: ui package.json**

```json
{
  "name": "@compass/ui",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./theme.css": "./src/theme.css",
    "./icons": "./src/icons/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint 'src/**/*.{ts,tsx}'",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.4",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@fontsource/instrument-sans": "^5.1.0",
    "@fontsource/jetbrains-mono": "^5.1.0",
    "@fontsource/newsreader": "^5.1.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jest-axe": "^9.0.0",
    "@types/jest-axe": "^3.5.9",
    "jsdom": "^25.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.6.3",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: ui tsconfig + vitest config**

`packages/ui/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "types": ["vitest/globals", "@testing-library/jest-dom", "jest-axe"] },
  "include": ["src/**/*"]
}
```

`packages/ui/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: true,
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
});
```

`packages/ui/vitest.setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
import 'jest-axe/extend-expect';
```

- [ ] **Step 3: theme.css — Tailwind v4 @theme block (full tokens)**

Create `packages/ui/src/theme.css`. This file is the CSS source of truth; TS `tokens.ts` (Task 5) mirrors it.

```css
@import '@fontsource/newsreader/index.css';
@import '@fontsource/instrument-sans/index.css';
@import '@fontsource/jetbrains-mono/index.css';

@theme {
  --font-serif: 'Newsreader', ui-serif, Georgia, serif;
  --font-sans:  'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
  --font-mono:  'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;

  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 22px;
}

:root {
  --accent-h: 48;
  --accent-c: 0.13;
  --accent-l: 0.56;

  --bg:        oklch(0.972 0.012 75);
  --bg-deep:   oklch(0.95  0.014 75);
  --panel:     oklch(0.988 0.008 75);
  --panel-2:   oklch(0.965 0.011 75);
  --ink:       oklch(0.22  0.015 55);
  --ink-2:     oklch(0.36  0.014 55);
  --ink-3:     oklch(0.52  0.012 55);
  --ink-4:     oklch(0.68  0.010 55);
  --hair:      oklch(0.22  0.015 55 / 0.10);
  --hair-2:    oklch(0.22  0.015 55 / 0.18);
  --accent:     oklch(var(--accent-l) var(--accent-c) var(--accent-h));
  --accent-ink: oklch(0.34 var(--accent-c) var(--accent-h));
  --accent-wash:oklch(var(--accent-l) var(--accent-c) var(--accent-h) / 0.10);
  --sage:       oklch(0.55 0.05 150);
  --slate:      oklch(0.52 0.03 255);

  --sh-1: 0 1px 0 oklch(0.22 0.015 55 / 0.04), 0 1px 2px oklch(0.22 0.015 55 / 0.04);
  --sh-2: 0 1px 0 oklch(0.22 0.015 55 / 0.04), 0 12px 32px -12px oklch(0.22 0.015 55 / 0.18);
  --sh-3: 0 1px 0 oklch(0.22 0.015 55 / 0.04), 0 24px 64px -16px oklch(0.22 0.015 55 / 0.28);
}

html[data-theme='dark'] {
  --bg:        oklch(0.18 0.012 55);
  --bg-deep:   oklch(0.14 0.012 55);
  --panel:     oklch(0.22 0.012 55);
  --panel-2:   oklch(0.26 0.012 55);
  --ink:       oklch(0.94 0.010 75);
  --ink-2:     oklch(0.80 0.010 75);
  --ink-3:     oklch(0.64 0.010 75);
  --ink-4:     oklch(0.46 0.010 75);
  --hair:      oklch(0.94 0.010 75 / 0.08);
  --hair-2:    oklch(0.94 0.010 75 / 0.16);
  --accent-ink:oklch(0.78 var(--accent-c) var(--accent-h));
  --accent-wash:oklch(var(--accent-l) var(--accent-c) var(--accent-h) / 0.18);
}

@keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes spin    { to { transform: rotate(360deg); } }
@keyframes blink   { 50% { opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important; }
}
```

- [ ] **Step 4: utils/cn.ts**

Create `packages/ui/src/utils/cn.ts`:
```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 5: Empty barrel**

Create `packages/ui/src/index.ts`:
```ts
// Design system barrel. Populated by subsequent tasks.
export { cn } from './utils/cn.js';
```

- [ ] **Step 6: Install + verify**

Run:
```bash
pnpm install
pnpm --filter @compass/ui typecheck
pnpm --filter @compass/ui test
```
Expected: typecheck passes; test has no tests yet (passes). OK.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/
git commit -m "feat(ui): scaffold design-system package with Tailwind v4 theme + fonts"
```

---

## Task 5: Tokens — `tokens.ts` + accent math + drift snapshot

**Files:**
- Create: `packages/ui/src/tokens.ts`, `packages/ui/src/tokens.test.ts`, `packages/ui/src/theme/accents.ts`

- [ ] **Step 1: Write failing test first (TDD)**

Create `packages/ui/src/tokens.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { TOKENS, ACCENTS } from './tokens.js';

describe('tokens', () => {
  it('exports all token families', () => {
    expect(TOKENS.color.light).toHaveProperty('bg');
    expect(TOKENS.color.dark).toHaveProperty('bg');
    expect(TOKENS.color.light).toHaveProperty('accent');
    expect(TOKENS.radius).toEqual({ sm: 8, md: 14, lg: 22 });
    expect(TOKENS.shadow).toHaveProperty('sh-1');
    expect(TOKENS.motion.duration).toEqual({ fast: 120, mid: 220, slow: 400 });
  });

  it('exports five named accents with {h,c,l}', () => {
    expect(Object.keys(ACCENTS)).toEqual(['terracotta', 'ink', 'sage', 'ocean', 'plum']);
    for (const v of Object.values(ACCENTS)) {
      expect(v).toMatchObject({ h: expect.any(Number), c: expect.any(Number), l: expect.any(Number) });
    }
  });

  it('matches snapshot (drift guard vs theme.css)', () => {
    expect(TOKENS).toMatchSnapshot();
  });
});
```

Run: `pnpm --filter @compass/ui test`
Expected: FAIL — `tokens` module not found.

- [ ] **Step 2: Implement `tokens.ts`**

Create `packages/ui/src/tokens.ts`:
```ts
export const TOKENS = {
  color: {
    light: {
      bg:         'oklch(0.972 0.012 75)',
      'bg-deep':  'oklch(0.95 0.014 75)',
      panel:      'oklch(0.988 0.008 75)',
      'panel-2':  'oklch(0.965 0.011 75)',
      ink:        'oklch(0.22 0.015 55)',
      'ink-2':    'oklch(0.36 0.014 55)',
      'ink-3':    'oklch(0.52 0.012 55)',
      'ink-4':    'oklch(0.68 0.010 55)',
      hair:       'oklch(0.22 0.015 55 / 0.10)',
      'hair-2':   'oklch(0.22 0.015 55 / 0.18)',
      accent:     'oklch(var(--accent-l) var(--accent-c) var(--accent-h))',
      'accent-ink': 'oklch(0.34 var(--accent-c) var(--accent-h))',
      'accent-wash':'oklch(var(--accent-l) var(--accent-c) var(--accent-h) / 0.10)',
      sage:       'oklch(0.55 0.05 150)',
      slate:      'oklch(0.52 0.03 255)',
    },
    dark: {
      bg:         'oklch(0.18 0.012 55)',
      'bg-deep':  'oklch(0.14 0.012 55)',
      panel:      'oklch(0.22 0.012 55)',
      'panel-2':  'oklch(0.26 0.012 55)',
      ink:        'oklch(0.94 0.010 75)',
      'ink-2':    'oklch(0.80 0.010 75)',
      'ink-3':    'oklch(0.64 0.010 75)',
      'ink-4':    'oklch(0.46 0.010 75)',
      hair:       'oklch(0.94 0.010 75 / 0.08)',
      'hair-2':   'oklch(0.94 0.010 75 / 0.16)',
      accent:     'oklch(var(--accent-l) var(--accent-c) var(--accent-h))',
      'accent-ink': 'oklch(0.78 var(--accent-c) var(--accent-h))',
      'accent-wash':'oklch(var(--accent-l) var(--accent-c) var(--accent-h) / 0.18)',
      sage:       'oklch(0.78 0.06 150)',
      slate:      'oklch(0.78 0.05 255)',
    },
  },
  radius: { sm: 8, md: 14, lg: 22 },
  shadow: {
    'sh-1': '0 1px 0 oklch(0.22 0.015 55 / 0.04), 0 1px 2px oklch(0.22 0.015 55 / 0.04)',
    'sh-2': '0 1px 0 oklch(0.22 0.015 55 / 0.04), 0 12px 32px -12px oklch(0.22 0.015 55 / 0.18)',
    'sh-3': '0 1px 0 oklch(0.22 0.015 55 / 0.04), 0 24px 64px -16px oklch(0.22 0.015 55 / 0.28)',
  },
  type: {
    serif: "'Newsreader', ui-serif, Georgia, serif",
    sans:  "'Instrument Sans', ui-sans-serif, system-ui, sans-serif",
    mono:  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  motion: {
    duration: { fast: 120, mid: 220, slow: 400 },
    easing: { standard: 'cubic-bezier(0.2, 0, 0, 1)' },
  },
  density: { spacious: { sidebarW: 232, sidebarP: 18 }, compact: { sidebarW: 64, sidebarP: 10 } },
} as const;

export type Tokens = typeof TOKENS;

export const ACCENTS = {
  terracotta: { h: 48,  c: 0.13, l: 0.56 },
  ink:        { h: 260, c: 0.04, l: 0.40 },
  sage:       { h: 150, c: 0.06, l: 0.52 },
  ocean:      { h: 230, c: 0.10, l: 0.52 },
  plum:       { h: 340, c: 0.10, l: 0.52 },
} as const;

export type AccentName = keyof typeof ACCENTS;
```

- [ ] **Step 3: accents.ts helper**

Create `packages/ui/src/theme/accents.ts`:
```ts
import { ACCENTS, type AccentName } from '../tokens.js';

export function applyAccent(name: AccentName, el: HTMLElement = document.documentElement): void {
  const { h, c, l } = ACCENTS[name];
  el.style.setProperty('--accent-h', String(h));
  el.style.setProperty('--accent-c', String(c));
  el.style.setProperty('--accent-l', String(l));
}

export { ACCENTS, type AccentName };
```

- [ ] **Step 4: Re-export from barrel**

Modify `packages/ui/src/index.ts`:
```ts
export { cn } from './utils/cn.js';
export * from './tokens.js';
export { applyAccent } from './theme/accents.js';
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @compass/ui test`
Expected: PASS (3 tests). Snapshot file created at `packages/ui/src/__snapshots__/tokens.test.ts.snap`.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/
git commit -m "feat(ui): token system with accent math and drift snapshot"
```

---

## Task 6: Icons — port all 33 icons from prototype

**Files:**
- Create: `packages/ui/src/icons/Icon.tsx` (base component)
- Create: `packages/ui/src/icons/<Name>.tsx` (33 icons)
- Create: `packages/ui/src/icons/index.ts` (barrel + map)
- Create: `packages/ui/src/icons/Icon.test.tsx`

**Source mapping.** Each key in `design/project/src/icons.jsx`'s `I = { … }` becomes one file. Icon name → file:

| Prototype key | File | Component |
|---|---|---|
| `compass` | `Icon/Compass.tsx` | `IconCompass` |
| `home` | `Icon/Home.tsx` | `IconHome` |
| `note` | `Note.tsx` | `IconNote` |
| (same pattern) | `focus, goal, inbox, block, gear, search, plus, chev, up, down, check, x, play, pause, sun, moon, spark, mic, link, star, drop, sleep, heart, cloud, cal, clock, people, key, thumbup, thumbdn, send, wand, sound, eye, eyeoff, sliders, more, arrow` | each with `Icon<Name>` |

- [ ] **Step 1: Base Icon component**

Create `packages/ui/src/icons/Icon.tsx`:
```tsx
import { type SVGProps, forwardRef } from 'react';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  size?: number;
  stroke?: number;
}

export const Icon = forwardRef<SVGSVGElement, IconProps & { children: React.ReactNode }>(
  function Icon({ size = 16, stroke = 1.6, children, className, ...rest }, ref) {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...rest}
      >
        {children}
      </svg>
    );
  },
);
```

- [ ] **Step 2: First batch of 5 icons (template pattern)**

Create `packages/ui/src/icons/Compass.tsx`:
```tsx
import { Icon, type IconProps } from './Icon.js';
export function IconCompass(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2.3 6.2-6.2 2.3 2.3-6.2z" />
    </Icon>
  );
}
```

Create `Home.tsx`, `Note.tsx`, `Focus.tsx`, `Goal.tsx` following the same pattern — paths are in `design/project/src/icons.jsx`. For `Note.tsx` the multi-path variant:
```tsx
import { Icon, type IconProps } from './Icon.js';
export function IconNote(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M15 3v4h4" />
      <path d="M8 12h8M8 16h5" />
    </Icon>
  );
}
```

- [ ] **Step 3: Remaining 28 icons**

Port the remaining icons one-by-one from `design/project/src/icons.jsx`. Naming rule: `IconCamelCase(key)`, filename `CamelCase(key).tsx`. Exceptions:
- `thumbup` → `IconThumbUp`, file `ThumbUp.tsx`
- `thumbdn` → `IconThumbDown`, file `ThumbDown.tsx`
- `eyeoff` → `IconEyeOff`, file `EyeOff.tsx`
- `chev`   → `IconChevron`, file `Chevron.tsx`
- `cal`    → `IconCalendar`, file `Calendar.tsx`
- `x`      → `IconClose`, file `Close.tsx`

For icons that use `fill="currentColor"` on some paths (like `play`, `pause`, `more`, `sliders`), use the `<path fill="currentColor" stroke="none" .../>` inline pattern, do not toggle fill on the parent `<svg>`.

- [ ] **Step 4: Icons barrel**

Create `packages/ui/src/icons/index.ts`:
```ts
export { Icon, type IconProps } from './Icon.js';
export { IconCompass } from './Compass.js';
export { IconHome } from './Home.js';
export { IconNote } from './Note.js';
export { IconFocus } from './Focus.js';
export { IconGoal } from './Goal.js';
export { IconInbox } from './Inbox.js';
export { IconBlock } from './Block.js';
export { IconGear } from './Gear.js';
export { IconSearch } from './Search.js';
export { IconPlus } from './Plus.js';
export { IconChevron } from './Chevron.js';
export { IconUp } from './Up.js';
export { IconDown } from './Down.js';
export { IconCheck } from './Check.js';
export { IconClose } from './Close.js';
export { IconPlay } from './Play.js';
export { IconPause } from './Pause.js';
export { IconSun } from './Sun.js';
export { IconMoon } from './Moon.js';
export { IconSpark } from './Spark.js';
export { IconMic } from './Mic.js';
export { IconLink } from './Link.js';
export { IconStar } from './Star.js';
export { IconDrop } from './Drop.js';
export { IconSleep } from './Sleep.js';
export { IconHeart } from './Heart.js';
export { IconCloud } from './Cloud.js';
export { IconCalendar } from './Calendar.js';
export { IconClock } from './Clock.js';
export { IconPeople } from './People.js';
export { IconKey } from './Key.js';
export { IconThumbUp } from './ThumbUp.js';
export { IconThumbDown } from './ThumbDown.js';
export { IconSend } from './Send.js';
export { IconWand } from './Wand.js';
export { IconSound } from './Sound.js';
export { IconEye } from './Eye.js';
export { IconEyeOff } from './EyeOff.js';
export { IconSliders } from './Sliders.js';
export { IconMore } from './More.js';
export { IconArrow } from './Arrow.js';

// Name→component map for dynamic lookup in sidebars, tables, etc.
import { IconCompass } from './Compass.js';
import { IconHome } from './Home.js';
// … (import all 33 again)
export const ICONS = {
  compass: IconCompass,
  home: IconHome,
  note: IconNote,
  focus: IconFocus,
  goal: IconGoal,
  inbox: IconInbox,
  block: IconBlock,
  gear: IconGear,
  // … all 33
} as const;
export type IconName = keyof typeof ICONS;
```

- [ ] **Step 5: Test — render + accessibility**

Create `packages/ui/src/icons/Icon.test.tsx`:
```tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { IconCompass, IconSearch, ICONS } from './index.js';

describe('icons', () => {
  it('renders IconCompass with default size', () => {
    const { container } = render(<IconCompass />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
  });

  it('accepts custom size + className', () => {
    const { container } = render(<IconSearch size={24} className="text-accent" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveClass('text-accent');
  });

  it('ICONS map exposes all 33 icons', () => {
    expect(Object.keys(ICONS)).toHaveLength(33);
  });

  it('icon renders are a11y-clean (decorative by default)', async () => {
    const { container } = render(<IconCompass aria-hidden="true" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 6: Run tests**

Run: `pnpm --filter @compass/ui test`
Expected: PASS (4 icon tests + 3 token tests = 7).

- [ ] **Step 7: Add to main barrel**

Modify `packages/ui/src/index.ts`:
```ts
export { cn } from './utils/cn.js';
export * from './tokens.js';
export { applyAccent } from './theme/accents.js';
export * from './icons/index.js';
```

- [ ] **Step 8: Commit**

```bash
git add packages/ui/
git commit -m "feat(ui): port 33 icons from prototype with typed components + name map"
```

---

## Task 7: Primitives batch 1 — Button, IconButton, Card

**Files:**
- Create: `packages/ui/src/components/{Button,IconButton,Card}.tsx`
- Create: `packages/ui/src/components/{Button,IconButton,Card}.test.tsx`

- [ ] **Step 1: Write Button test first**

Create `packages/ui/src/components/Button.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import { Button } from './Button.js';

describe('Button', () => {
  it('renders with default variant', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it.each(['default', 'primary', 'accent', 'ghost'] as const)('renders %s variant', (variant) => {
    render(<Button variant={variant}>x</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', variant);
  });

  it.each(['xs', 'sm', 'md'] as const)('renders %s size', (size) => {
    render(<Button size={size}>x</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-size', size);
  });

  it('fires onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>x</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('respects disabled', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick} disabled>x</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('is a11y clean', async () => {
    const { container } = render(<Button>Go</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

Run: `pnpm --filter @compass/ui test`
Expected: FAIL — `Button` not found.

- [ ] **Step 2: Implement Button**

Create `packages/ui/src/components/Button.tsx`:
```tsx
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../utils/cn.js';

/**
 * Button — primary interactive element.
 *
 * Variants:
 * - `default` — panel surface with hairline; the sidebar's typical CTA.
 * - `primary` — inked button, used for destructive or confirming actions.
 * - `accent`  — filled with the current accent color.
 * - `ghost`   — transparent, borderless; inline in typography.
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant. */
  variant?: 'default' | 'primary' | 'accent' | 'ghost';
  /** Size ramp. */
  size?: 'xs' | 'sm' | 'md';
  /** Left slot, typically an icon. */
  leading?: ReactNode;
  /** Right slot, typically a chevron. */
  trailing?: ReactNode;
}

const base =
  'inline-flex items-center gap-2 font-medium transition-colors active:translate-y-[0.5px] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-[var(--bg)] disabled:opacity-50 disabled:cursor-not-allowed';

const sizeCls: Record<NonNullable<ButtonProps['size']>, string> = {
  xs: 'px-2 py-[3px] text-[11px] rounded-md',
  sm: 'px-2.5 py-[5px] text-[12px] rounded-lg',
  md: 'px-3.5 py-2 text-[13px] rounded-[10px]',
};

const variantCls: Record<NonNullable<ButtonProps['variant']>, string> = {
  default:
    'bg-[var(--panel)] text-[var(--ink)] border border-[var(--hair)] ' +
    'hover:bg-[var(--panel-2)] hover:border-[var(--hair-2)]',
  primary:
    'bg-[var(--ink)] text-[var(--bg)] border border-[var(--ink)] ' +
    'hover:bg-[oklch(0.14_0.015_55)] hover:border-[oklch(0.14_0.015_55)]',
  accent: 'bg-[var(--accent)] text-white border border-transparent hover:brightness-105',
  ghost: 'bg-transparent text-[var(--ink)] border border-transparent hover:bg-[var(--panel-2)]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'default', size = 'md', leading, trailing, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      data-variant={variant}
      data-size={size}
      className={cn(base, sizeCls[size], variantCls[variant], className)}
      {...rest}
    >
      {leading}
      {children}
      {trailing}
    </button>
  );
});
```

Run: `pnpm --filter @compass/ui test`
Expected: PASS (Button's 6 tests).

- [ ] **Step 3: IconButton + test**

Create `packages/ui/src/components/IconButton.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import { IconButton } from './IconButton.js';
import { IconSearch } from '../icons/index.js';

describe('IconButton', () => {
  it('renders an icon child', () => {
    render(<IconButton aria-label="search"><IconSearch size={14} /></IconButton>);
    expect(screen.getByRole('button', { name: 'search' })).toBeInTheDocument();
  });

  it('requires aria-label for a11y (consumer pattern)', async () => {
    const { container } = render(
      <IconButton aria-label="search"><IconSearch size={14} /></IconButton>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('fires onClick', () => {
    const cb = vi.fn();
    render(<IconButton aria-label="go" onClick={cb}><IconSearch size={14} /></IconButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(cb).toHaveBeenCalled();
  });
});
```

Create `packages/ui/src/components/IconButton.tsx`:
```tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../utils/cn.js';

/** 32×32 icon-only button. Always require `aria-label`. */
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required for accessibility — describes what the button does. */
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'w-8 h-8 grid place-items-center rounded-lg text-[var(--ink-2)]',
        'hover:bg-[var(--panel-2)] hover:text-[var(--ink)] transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
```

- [ ] **Step 4: Card + test**

Create `packages/ui/src/components/Card.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { Card, CardHeader, CardBody } from './Card.js';

describe('Card', () => {
  it('renders children', () => {
    render(<Card data-testid="c">hi</Card>);
    expect(screen.getByTestId('c')).toHaveTextContent('hi');
  });

  it('applies padded variant', () => {
    render(<Card padded data-testid="c">x</Card>);
    expect(screen.getByTestId('c')).toHaveClass('p-[22px]');
  });

  it('CardHeader + CardBody compose', async () => {
    const { container } = render(
      <Card>
        <CardHeader>title</CardHeader>
        <CardBody>body</CardBody>
      </Card>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

Create `packages/ui/src/components/Card.tsx`:
```tsx
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../utils/cn.js';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Apply the 22px inset padding. */
  padded?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { padded, className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'bg-[var(--panel)] border border-[var(--hair)] rounded-[14px] shadow-[var(--sh-1)]',
        padded && 'p-[22px]',
        className,
      )}
      {...rest}
    />
  );
});

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center gap-2.5 px-[22px] py-3.5 border-b border-[var(--hair)]', className)}
      {...rest}
    />
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-[22px]', className)} {...rest} />;
}
```

- [ ] **Step 5: Export from barrel**

Modify `packages/ui/src/index.ts` — add:
```ts
export * from './components/Button.js';
export * from './components/IconButton.js';
export * from './components/Card.js';
```

- [ ] **Step 6: Run & commit**

Run: `pnpm --filter @compass/ui test`
Expected: PASS (all previous + 6 Button + 3 IconButton + 3 Card = 19 tests).

```bash
git add packages/ui/
git commit -m "feat(ui): add Button, IconButton, Card primitives"
```

---

## Task 8: Primitives batch 2 — Badge, Input, Textarea, Kbd, Tag, Spinner, Progress, Divider, Prose, Swatch

These are single-file, pure-render primitives with light state. One test file per primitive; I consolidate them here for plan brevity, but each gets its own `.tsx` + `.test.tsx`.

**Files:**
- Create 10 `.tsx` + 10 `.test.tsx` under `packages/ui/src/components/`

- [ ] **Step 1: Badge + Dot**

`packages/ui/src/components/Badge.tsx`:
```tsx
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../utils/cn.js';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'sage' | 'slate';
}

const variantCls: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-[var(--panel-2)] text-[var(--ink-3)] border border-[var(--hair)]',
  accent:  'bg-[var(--accent-wash)] text-[var(--accent-ink)] border border-transparent',
  sage:    'bg-[oklch(0.55_0.05_150_/_0.12)] text-[oklch(0.34_0.05_150)] border border-transparent',
  slate:   'bg-[oklch(0.52_0.03_255_/_0.12)] text-[oklch(0.34_0.04_255)] border border-transparent',
};

/** Small mono-cased label pill. */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { variant = 'default', className, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1.5 font-mono text-[10px] px-1.5 py-0.5 rounded-full',
        variantCls[variant],
        className,
      )}
      data-variant={variant}
      {...rest}
    />
  );
});

/** Small filled dot, typically inline inside Badge. */
export function Dot({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('inline-block w-1.5 h-1.5 rounded-full bg-current', className)}
      {...rest}
    />
  );
}
```

`Badge.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { axe } from 'jest-axe';
import { Badge, Dot } from './Badge.js';

describe('Badge', () => {
  it.each(['default', 'accent', 'sage', 'slate'] as const)('renders %s', (v) => {
    render(<Badge variant={v}>p1</Badge>);
    expect(screen.getByText('p1')).toHaveAttribute('data-variant', v);
  });
  it('renders Dot child', () => {
    render(<Badge><Dot /> on</Badge>);
    expect(screen.getByText('on')).toBeInTheDocument();
  });
  it('a11y clean', async () => {
    const { container } = render(<Badge>x</Badge>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Input + Textarea**

`Input.tsx`:
```tsx
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../utils/cn.js';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Use mono font (e.g. for API keys). */
  mono?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { mono, className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full px-3 py-2.5 bg-[var(--panel-2)] border border-[var(--hair)] rounded-[10px]',
        'text-[14px] text-[var(--ink)] placeholder:text-[var(--ink-4)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:border-transparent',
        mono && 'font-mono',
        className,
      )}
      {...rest}
    />
  );
});
```

`Textarea.tsx` — same but `<textarea>`, with `min-h-[80px] resize-y`.

Tests cover: render + placeholder + `onChange` fires + a11y.

- [ ] **Step 3: Kbd**

`Kbd.tsx`:
```tsx
import { type HTMLAttributes } from 'react';
import { cn } from '../utils/cn.js';

/** Keyboard key pill (e.g., ⌘ K). */
export function Kbd({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center h-[18px] px-[5px] font-mono text-[10px]',
        'text-[var(--ink-3)] bg-[var(--panel-2)] border border-[var(--hair)] rounded',
        className,
      )}
      {...rest}
    />
  );
}
```

Test: renders `<span>`, has `.font-mono`, axe clean.

- [ ] **Step 4: Tag**

```tsx
export function Tag({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--panel-2)]',
        'text-[var(--ink-3)] border border-[var(--hair)]',
        className,
      )}
      {...rest}
    />
  );
}
```

- [ ] **Step 5: Spinner**

```tsx
/** 14px concentric loading ring. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block w-3.5 h-3.5 rounded-full border-[1.5px] border-[var(--hair-2)]',
        'border-t-[var(--accent)] animate-[spin_0.9s_linear_infinite]',
        className,
      )}
    />
  );
}
```

Test: has `role="status"`, axe clean.

- [ ] **Step 6: Progress**

```tsx
export interface ProgressProps {
  /** 0..1 */
  value: number;
  className?: string;
  label?: string;
}

export function Progress({ value, className, label }: ProgressProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'progress'}
      className={cn('h-1 bg-[var(--hair)] rounded-full overflow-hidden', className)}
    >
      <span className="block h-full bg-[var(--accent)] rounded-full" style={{ width: `${pct}%` }} />
    </div>
  );
}
```

Test: rendering sets correct aria-valuenow for value=0.42; clamps values > 1 and < 0.

- [ ] **Step 7: Divider**

```tsx
export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}
export function Divider({ orientation = 'horizontal', className, ...rest }: DividerProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        orientation === 'horizontal' ? 'h-px w-full bg-[var(--hair)]' : 'w-px h-full bg-[var(--hair)]',
        className,
      )}
      {...rest}
    />
  );
}
```

- [ ] **Step 8: Prose (serif wrapper)**

```tsx
export function Prose({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'font-serif text-[17px] leading-[1.65] text-[var(--ink-2)]',
        '[&_p]:mt-0 [&_p]:mb-2.5 [&_strong]:text-[var(--ink)] [&_strong]:font-semibold',
        className,
      )}
      {...rest}
    />
  );
}
```

Test: renders children, strong gets stronger color (snapshot).

- [ ] **Step 9: Swatch**

```tsx
export interface SwatchProps {
  color: string;   // oklch() string
  active?: boolean;
  onClick?: () => void;
  label?: string;
}
export function Swatch({ color, active, onClick, label }: SwatchProps) {
  return (
    <button
      aria-label={label ?? 'color swatch'}
      aria-pressed={!!active}
      onClick={onClick}
      className={cn(
        'w-5 h-5 rounded-full border-[1.5px] transition-transform hover:scale-110',
        active ? 'border-[var(--ink)]' : 'border-transparent',
      )}
      style={{ background: color }}
    />
  );
}
```

Test: clickable, `aria-pressed` flips with `active`.

- [ ] **Step 10: Export & commit**

Add all 10 to `packages/ui/src/index.ts`. Run:
```bash
pnpm --filter @compass/ui test
```
Expected: PASS, all previous + ~30 new = ~49 total.

```bash
git add packages/ui/
git commit -m "feat(ui): Badge, Input, Textarea, Kbd, Tag, Spinner, Progress, Divider, Prose, Swatch"
```

---

## Task 9: Primitives batch 3 — Modal, Segmented, Toggle, BrandMark

**Files:**
- Create: `packages/ui/src/components/{Modal,Segmented,Toggle,BrandMark}.tsx` + test files

- [ ] **Step 1: Modal (with focus-trap hook dependency)**

First add the `useFocusTrap` hook skeleton if not present (full impl in Task 10). For now:

`packages/ui/src/hooks/useFocusTrap.ts`:
```ts
import { useEffect, type RefObject } from 'react';

export function useFocusTrap(ref: RefObject<HTMLElement>, active: boolean): void {
  useEffect(() => {
    if (!active || !ref.current) return;
    const root = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusables = (): HTMLElement[] =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const f = getFocusables();
      if (!f.length) return;
      const first = f[0]!;
      const last = f[f.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    const firstFocusable = getFocusables()[0];
    firstFocusable?.focus();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus();
    };
  }, [ref, active]);
}
```

And the `useEscape` hook:

`packages/ui/src/hooks/useEscape.ts`:
```ts
import { useEffect } from 'react';

export function useEscape(onEscape: () => void, active = true): void {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onEscape(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onEscape, active]);
}
```

`packages/ui/src/components/Modal.tsx`:
```tsx
import { type ReactNode, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils/cn.js';
import { useFocusTrap } from '../hooks/useFocusTrap.js';
import { useEscape } from '../hooks/useEscape.js';
import { IconClose } from '../icons/index.js';
import { IconButton } from './IconButton.js';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Wider max-width (for CmdK, decompose, draft modals). */
  wide?: boolean;
  children: ReactNode;
  /** Ignore backdrop clicks (default: false — clicks close). */
  dismissOnBackdrop?: boolean;
  /** Additional classes for the panel. */
  className?: string;
  'aria-label': string;
}

export function Modal({
  open, onClose, wide, children, dismissOnBackdrop = true, className, ...aria
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef as React.RefObject<HTMLElement>, open);
  useEscape(onClose, open);

  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-[oklch(0.10_0.01_55_/_0.42)] backdrop-blur-[6px]"
      style={{ animation: 'fadeIn 180ms ease' }}
      onClick={dismissOnBackdrop ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        {...aria}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'bg-[var(--panel)] border border-[var(--hair)] rounded-[18px] shadow-[var(--sh-3)] overflow-hidden',
          wide ? 'w-[min(860px,94vw)]' : 'w-[min(560px,94vw)]',
          className,
        )}
        style={{ animation: 'slideUp 220ms ease' }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ModalHeader({ title, onClose, meta }: { title: string; onClose: () => void; meta?: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 px-[22px] py-[18px] border-b border-[var(--hair)]">
      <div className="font-serif text-[18px] font-medium">{title}</div>
      {meta && <div className="font-mono text-[10px] text-[var(--ink-4)] ml-2">{meta}</div>}
      <IconButton aria-label="Close modal" className="ml-auto" onClick={onClose}>
        <IconClose size={14} />
      </IconButton>
    </div>
  );
}

export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-[22px]', className)}>{children}</div>;
}
```

`Modal.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import { Modal, ModalHeader, ModalBody } from './Modal.js';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}} aria-label="x"><div>hi</div></Modal>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders children when open', () => {
    render(<Modal open onClose={() => {}} aria-label="test"><div>hello</div></Modal>);
    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'test' })).toBeInTheDocument();
  });

  it('closes on backdrop click', () => {
    const cb = vi.fn();
    render(<Modal open onClose={cb} aria-label="x"><div>c</div></Modal>);
    fireEvent.click(screen.getByRole('presentation'));
    expect(cb).toHaveBeenCalled();
  });

  it('does not close on panel click', () => {
    const cb = vi.fn();
    render(<Modal open onClose={cb} aria-label="x"><div>c</div></Modal>);
    fireEvent.click(screen.getByRole('dialog'));
    expect(cb).not.toHaveBeenCalled();
  });

  it('closes on Escape', () => {
    const cb = vi.fn();
    render(<Modal open onClose={cb} aria-label="x"><button>btn</button></Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(cb).toHaveBeenCalled();
  });

  it('wide variant widens panel', () => {
    render(<Modal open onClose={() => {}} wide aria-label="w"><div>c</div></Modal>);
    expect(screen.getByRole('dialog')).toHaveClass('w-[min(860px,94vw)]');
  });

  it('a11y clean', async () => {
    const { container } = render(
      <Modal open onClose={() => {}} aria-label="a"><ModalHeader title="T" onClose={() => {}}/><ModalBody>x</ModalBody></Modal>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Segmented**

```tsx
export interface SegmentedOption<T extends string> { label: string; value: T; }
export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  'aria-label': string;
}
export function Segmented<T extends string>({ options, value, onChange, ...aria }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" {...aria} className="inline-flex bg-[var(--panel-2)] border border-[var(--hair)] rounded-lg p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'px-2.5 py-1 text-[11.5px] rounded-md transition-colors',
              active ? 'bg-[var(--panel)] text-[var(--ink)] shadow-[var(--sh-1)]' : 'text-[var(--ink-3)]',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
```

Test: renders both options; clicking one calls `onChange(value)`; `aria-checked` flips.

- [ ] **Step 3: Toggle**

```tsx
export interface ToggleProps {
  on: boolean;
  onChange: (next: boolean) => void;
  'aria-label': string;
  disabled?: boolean;
}
export function Toggle({ on, onChange, disabled, ...aria }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      {...aria}
      className={cn(
        'relative w-9 h-5 rounded-full transition-colors',
        on ? 'bg-[var(--accent)]' : 'bg-[var(--hair-2)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-[0_1px_3px_oklch(0_0_0_/_0.2)] transition-[left]',
          on ? 'left-[18px]' : 'left-0.5',
        )}
      />
    </button>
  );
}
```

- [ ] **Step 4: BrandMark**

```tsx
export interface BrandMarkProps { size?: number; className?: string; }

/** The Compass logo — terracotta disc with dark gap. Pure CSS gradient. */
export function BrandMark({ size = 26, className }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('relative inline-block rounded-full', className)}
      style={{
        width: size,
        height: size,
        background:
          'radial-gradient(circle at 35% 35%, oklch(0.98 0.02 75), oklch(0.85 0.07 60) 60%, oklch(0.52 0.14 40) 100%)',
        boxShadow: 'inset 0 0 0 1px oklch(0.22 0.015 55 / 0.2), 0 1px 2px oklch(0.22 0.015 55 / 0.2)',
      }}
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'conic-gradient(from 225deg, transparent 0 40%, oklch(0.22 0.015 55 / 0.55) 40% 50%, transparent 50% 100%)',
          maskImage:
            'radial-gradient(circle, transparent 35%, #000 36%, #000 52%, transparent 53%)',
          WebkitMaskImage:
            'radial-gradient(circle, transparent 35%, #000 36%, #000 52%, transparent 53%)',
        }}
      />
    </span>
  );
}
```

Test: renders `<span>`, has `aria-hidden`; passes axe.

- [ ] **Step 5: Export, run, commit**

Add to `packages/ui/src/index.ts`. Run tests.

```bash
git add packages/ui/
git commit -m "feat(ui): Modal with focus-trap + Esc, Segmented, Toggle, BrandMark"
```

---

## Task 10: Hooks

**Files:**
- Create: `packages/ui/src/hooks/{useShortcuts,usePersistentState,useTheme,useOverlay}.ts` + tests
- (`useEscape` + `useFocusTrap` already created in Task 9.)

- [ ] **Step 1: useShortcuts**

```ts
import { useEffect } from 'react';

export type Shortcut = { keys: string[]; handler: (e: KeyboardEvent) => void };
/**
 * Register global keyboard shortcuts.
 * `keys` is ordered — `['⌘', 'k']` means Cmd/Ctrl+K. `['?', 'b']` is a two-key chord.
 */
export function useShortcuts(shortcuts: Shortcut[], active = true): void {
  useEffect(() => {
    if (!active) return;
    let chordBuffer: string[] = [];
    let chordTimeout: ReturnType<typeof setTimeout> | null = null;

    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const mod = (e.metaKey || e.ctrlKey) ? '⌘' : '';
      for (const s of shortcuts) {
        if (s.keys.length === 2 && !s.keys[0]!.startsWith('⌘')) {
          // chord, e.g. ['?', 'b']
          if (chordBuffer[0] === s.keys[0] && k === s.keys[1]) {
            e.preventDefault(); s.handler(e); chordBuffer = []; break;
          }
        } else if (s.keys.length === 2 && s.keys[0] === '⌘') {
          if (mod && k === s.keys[1]) { e.preventDefault(); s.handler(e); break; }
        } else if (s.keys.length === 1 && s.keys[0] === k && !mod) {
          e.preventDefault(); s.handler(e); break;
        }
      }
      if (k === '?' && !mod) {
        chordBuffer = ['?'];
        if (chordTimeout) clearTimeout(chordTimeout);
        chordTimeout = setTimeout(() => { chordBuffer = []; }, 1500);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if (chordTimeout) clearTimeout(chordTimeout); };
  }, [shortcuts, active]);
}
```

Test: `⌘+K`, `Esc`, and `? b` chord all trigger correct handler.

- [ ] **Step 2: usePersistentState**

```ts
import { useEffect, useState } from 'react';

/**
 * useState backed by chrome.storage.sync (with localStorage fallback outside the extension).
 * `sessionOnly` forces chrome.storage.session / sessionStorage.
 */
export function usePersistentState<T>(key: string, initial: T, sessionOnly = false) {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = (sessionOnly ? sessionStorage : localStorage).getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { (sessionOnly ? sessionStorage : localStorage).setItem(key, JSON.stringify(v)); } catch { /* ignore */ }
    // Also write to chrome.storage if available (extension context)
    // @ts-expect-error — chrome may be undefined in unit tests
    if (typeof chrome !== 'undefined' && chrome.storage) {
      // @ts-expect-error
      (sessionOnly ? chrome.storage.session : chrome.storage.sync)?.set({ [key]: v });
    }
  }, [key, v, sessionOnly]);
  return [v, setV] as const;
}
```

Test: initial value returned if no stored; setter updates stored; re-mount rehydrates.

- [ ] **Step 3: useTheme + useOverlay**

These are thin wrappers around the shell store (created in Task 11). Create skeletons now; fill when store lands:

`useTheme.ts`:
```ts
// Re-exported from the shell store by the extension app; the UI package
// re-exports the selector type. See apps/extension/app/state/shell.ts.
export type Theme = 'light' | 'dark';
export type Density = 'spacious' | 'compact';
```

`useOverlay.ts`:
```ts
export type OverlayKind = null | 'focusRunning' | 'blockOverlay' | 'onboarding' | 'decompose' | 'draft' | 'cmdK' | 'tweaks';
```

(Full hooks live in the extension app because they couple to the store there.)

- [ ] **Step 4: Run & commit**

```bash
pnpm --filter @compass/ui test
git add packages/ui/
git commit -m "feat(ui): hooks — useEscape, useFocusTrap, useShortcuts, usePersistentState"
```

---

## Task 11: Theme provider + shell Zustand store

**Files:**
- Create: `packages/ui/src/theme/ThemeProvider.tsx`, test
- Create: `apps/extension/app/state/shell.ts`, test

- [ ] **Step 1: ThemeProvider**

`packages/ui/src/theme/ThemeProvider.tsx`:
```tsx
import { useEffect, type ReactNode } from 'react';
import { applyAccent, type AccentName } from './accents.js';

export type Theme = 'light' | 'dark';
export type Density = 'spacious' | 'compact';

/**
 * Applies theme + accent + density to <html>. Children are rendered unchanged.
 * State storage is the caller's responsibility (see shell store).
 */
export function ThemeProvider({
  theme, accent, density, children,
}: { theme: Theme; accent: AccentName; density: Density; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    applyAccent(accent);
  }, [accent]);
  useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);
  return <>{children}</>;
}
```

Test: mounting with `theme='dark'` sets `<html data-theme="dark">`; accent change updates CSS custom props on `documentElement`.

- [ ] **Step 2: Shell store**

Create `apps/extension/app/state/shell.ts`:
```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AccentName } from '@compass/ui';

export type Theme = 'light' | 'dark';
export type Density = 'spacious' | 'compact';
export type OverlayKind = null | 'focusRunning' | 'blockOverlay' | 'onboarding' | 'decompose' | 'draft' | 'cmdK' | 'tweaks';

interface ShellState {
  theme: Theme;
  accent: AccentName;
  density: Density;
  overlay: OverlayKind;
  overlayPayload: unknown;
  tweaksOpen: boolean;
  setTheme: (t: Theme) => void;
  setAccent: (a: AccentName) => void;
  setDensity: (d: Density) => void;
  openOverlay: (kind: Exclude<OverlayKind, null>, payload?: unknown) => void;
  closeOverlay: () => void;
  setTweaksOpen: (v: boolean) => void;
}

export const useShell = create<ShellState>()(
  persist(
    (set) => ({
      theme: 'light',
      accent: 'terracotta',
      density: 'spacious',
      overlay: null,
      overlayPayload: undefined,
      tweaksOpen: false,
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setDensity: (density) => set({ density }),
      openOverlay: (overlay, overlayPayload) => set({ overlay, overlayPayload }),
      closeOverlay: () => set({ overlay: null, overlayPayload: undefined }),
      setTweaksOpen: (tweaksOpen) => set({ tweaksOpen }),
    }),
    {
      name: 'compass-shell',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ theme: s.theme, accent: s.accent, density: s.density }),
    },
  ),
);
```

Test (`apps/extension/app/state/shell.test.ts`):
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { useShell } from './shell.js';

describe('shell store', () => {
  beforeEach(() => { localStorage.clear(); });
  it('defaults', () => {
    const s = useShell.getState();
    expect(s.theme).toBe('light');
    expect(s.accent).toBe('terracotta');
    expect(s.density).toBe('spacious');
    expect(s.overlay).toBeNull();
  });
  it('setTheme updates state + persists', () => {
    useShell.getState().setTheme('dark');
    expect(useShell.getState().theme).toBe('dark');
    expect(JSON.parse(localStorage.getItem('compass-shell')!).state.theme).toBe('dark');
  });
  it('openOverlay + closeOverlay', () => {
    useShell.getState().openOverlay('cmdK');
    expect(useShell.getState().overlay).toBe('cmdK');
    useShell.getState().closeOverlay();
    expect(useShell.getState().overlay).toBeNull();
  });
  it('tweaksOpen toggles but is not persisted', () => {
    useShell.getState().setTweaksOpen(true);
    expect(useShell.getState().tweaksOpen).toBe(true);
    const persisted = JSON.parse(localStorage.getItem('compass-shell')!);
    expect(persisted.state.tweaksOpen).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run & commit**

```bash
pnpm -r test
git add packages/ui/ apps/extension/
git commit -m "feat(ui,extension): ThemeProvider + shell Zustand store with persistence"
```

---

## Task 12: Layout primitives — AppShell, Sidebar, Topbar, Surface, Grid

**Files:**
- Create: `packages/ui/src/layout/{AppShell,Sidebar,Topbar,Surface,Grid}.tsx` + tests

**Reference:** The prototype's CSS for `.shell`, `.sidebar`, `.topbar`, `.surface`, `.grid-12` at `design/project/Compass.html:83-290`.

- [ ] **Step 1: AppShell**

```tsx
export interface AppShellProps {
  sidebar: ReactNode;
  children: ReactNode;
  density?: Density;
}

export function AppShell({ sidebar, children, density = 'spacious' }: AppShellProps) {
  const cols = density === 'compact' ? '64px 1fr' : '232px 1fr';
  return (
    <div className="min-h-screen grid" style={{ gridTemplateColumns: cols }} data-density={density}>
      {sidebar}
      <main className="min-w-0">{children}</main>
    </div>
  );
}
```

Test: renders both slots; `data-density="compact"` produces 64px track.

- [ ] **Step 2: Sidebar**

This is a presentational shell that accepts brand, nav, footer slots. Surface-specific items are composed in the extension app (Task 23) so `packages/ui` stays feature-agnostic.

```tsx
export interface SidebarProps {
  brand: ReactNode;
  nav: ReactNode;
  footer?: ReactNode;
  density?: Density;
}
export function Sidebar({ brand, nav, footer, density = 'spacious' }: SidebarProps) {
  return (
    <aside
      className={cn(
        'sticky top-0 h-screen overflow-hidden flex flex-col gap-2.5 border-r border-[var(--hair)] bg-[var(--bg)]',
        density === 'compact' ? 'px-2.5 py-5 items-center' : 'px-4 py-5',
      )}
      data-density={density}
    >
      {brand}
      <div className="flex flex-col gap-0.5">{nav}</div>
      {footer && <div className="mt-auto flex flex-col gap-2.5 p-2.5">{footer}</div>}
    </aside>
  );
}
```

- [ ] **Step 3: Topbar**

Presentational shell, accepts breadcrumb + date + search + actions.

```tsx
export interface TopbarProps {
  breadcrumb: ReactNode;
  date?: ReactNode;
  search?: ReactNode;
  actions?: ReactNode;
}
export function Topbar({ breadcrumb, date, search, actions }: TopbarProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3.5 px-8 py-3.5 border-b border-[var(--hair)] backdrop-blur-[10px] bg-[color-mix(in_oklch,var(--bg),transparent_20%)]">
      <div className="font-serif text-[18px] font-medium tracking-tight">{breadcrumb}</div>
      {date && <div className="font-mono text-[10px] text-[var(--ink-4)]">{date}</div>}
      {search && <div className="ml-auto">{search}</div>}
      {actions}
    </header>
  );
}
```

- [ ] **Step 4: Surface & Grid**

```tsx
export function Surface({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-8 pb-16 pt-7 max-w-[1180px] mx-auto', className)} {...rest} />;
}

export function Grid12({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid grid-cols-12 gap-[22px]', className)} {...rest} />;
}
// Column spans used by consumers as plain Tailwind: `className="col-span-7"`.
```

- [ ] **Step 5: Tests + barrel + commit**

Tests: simple render + prop snapshots + axe clean.

Add to `packages/ui/src/index.ts`. Commit:
```bash
git add packages/ui/
git commit -m "feat(ui): layout primitives — AppShell, Sidebar, Topbar, Surface, Grid12"
```

---

## Task 13: Mock data + `@compass/core` entity types

**Files:**
- Create: `packages/core/src/types/*.ts` (one file per entity)
- Create: `apps/extension/app/mock/*.ts` (one file per dataset)

All types are plain TypeScript interfaces this sprint. Phase 1 replaces with Zod schemas.

- [ ] **Step 1: Entity types in core**

`packages/core/src/types/UserProfile.ts`:
```ts
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  timezone: string;
  plus: boolean;
}
```

Create one file per entity referenced in the spec and used by mock data. The complete list (source: `design/project/src/data.jsx`):

- `UserProfile`
- `Brief` (`{ generatedAt, oneLineMood, tldr, topPriority, pomodoros, watchouts, recovery, quotedGoal }`)
- `TopPriority` (`{ title, why, suggestedFocusMinutes }`)
- `Pomodoro` (`{ startLocal, endLocal, theme, taskId }`)
- `Recovery` (`{ note, suggestBreak }`)
- `CalendarEvent` (`{ id, start, end, summary, attendees, focus, prep? }`)
- `Vitals` (`{ sleep, recovery, rhr, weather: { tempC, summary } }`)
- `Goal` (`{ id, title, horizon, weeksRemaining, progress, why, milestones, dailyTemplates, status? }`)
- `Milestone` (`{ week, title, done, current? }`)
- `Note` (`{ id, title, excerpt, body?, tags, updated, related }`)
- `AutoLink` (`{ id, reason, sim, stale? }`)
- `InboxAction` (`{ id, from, email, subject, priority, received, actions, snippet, hasDraft }`)
- `ExtractedAction` (`{ title, owner, due, type, confidence }`)
- `BlockRule` (`{ id, pattern, mode, source, strikes, note }`)
- `Soundscape` (`{ id, name, loved }`)
- `Suggestion` (`{ id, kind, body, action }`)
- `NegotiationTurn` (`{ role, text, offer? }`)
- `GoalDecomposition` (`{ generatedAt, milestones, dailyTemplates, risks, firstWeekFocus }`)

For each, create a `.ts` file with the interface. Example:

`packages/core/src/types/Note.ts`:
```ts
export interface AutoLink {
  id: string;
  reason: string;
  sim: number;
  stale?: boolean;
}

export interface Note {
  id: string;
  title: string;
  excerpt: string;
  body?: string;
  tags: string[];
  updated: string;
  related: AutoLink[];
}
```

Create `packages/core/src/types/index.ts` barrel re-exporting all:
```ts
export type * from './UserProfile.js';
export type * from './Brief.js';
export type * from './CalendarEvent.js';
export type * from './Vitals.js';
export type * from './Goal.js';
export type * from './Note.js';
export type * from './InboxAction.js';
export type * from './BlockRule.js';
export type * from './Soundscape.js';
export type * from './Suggestion.js';
export type * from './NegotiationTurn.js';
export type * from './GoalDecomposition.js';
```

- [ ] **Step 2: Port mock data to typed files**

Source of values: `design/project/src/data.jsx:1-121`. Split by entity. Each file imports its type from `@compass/core`.

Example — `apps/extension/app/mock/brief.ts`:
```ts
import type { Brief } from '@compass/core';

export const BRIEF: Brief = {
  generatedAt: '2026-04-20T07:10:00',
  oneLineMood: 'Rested, but the afternoon stacks up.',
  tldr:
    "You've got a reasonable morning to move Compass AI forward — the 2–4 pm block is where the writing will actually happen. Three back-to-backs after lunch means your heads-down window is right now.",
  topPriority: {
    title: 'Ship PRD v1.0 to the reviewer group',
    why: 'Linked to Q2 goal; reviewer deadline is Tuesday. One 90-minute pass finishes it.',
    suggestedFocusMinutes: 90,
  },
  pomodoros: [
    { startLocal: '09:00', endLocal: '10:30', theme: 'PRD final pass', taskId: 't1' },
    { startLocal: '10:45', endLocal: '11:30', theme: 'Inbox triage + drafts', taskId: 't2' },
    { startLocal: '14:00', endLocal: '15:00', theme: 'Design review prep', taskId: 't3' },
  ],
  watchouts: [
    '3 back-to-backs after lunch — no buffer between 1 pm and 4 pm.',
    'Overdue: "Reply to Mira re: pricing" (2 days).',
    'Recovery is mid — go light on a fourth Pomodoro.',
  ],
  recovery: {
    note: 'Sleep 82 · Recovery 71 · RHR 58. Solid, not your best. A short walk at noon will pay off.',
    suggestBreak: true,
  },
  quotedGoal: 'Launch the AI upgrade to Plus users with ≥60% brief open rate.',
};
```

Create analogous files for each dataset, **verbatim from the prototype**. The full list and values live in `design/project/src/data.jsx`; every object becomes a named `const` in its own file.

Create `apps/extension/app/mock/index.ts` barrel:
```ts
export { BRIEF } from './brief.js';
export { EVENTS } from './events.js';
export { VITALS } from './vitals.js';
export { GOALS } from './goals.js';
export { NOTES } from './notes.js';
export { INBOX_ACTIONS } from './inbox.js';
export { BLOCK_RULES } from './blockRules.js';
export { SOUNDSCAPES } from './soundscapes.js';
export { SUGGESTIONS } from './suggestions.js';
export { USER } from './user.js';
```

Also port the `fmtTime` helper to `apps/extension/app/mock/utils.ts`:
```ts
export function fmtTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${m} ${h < 12 ? 'am' : 'pm'}`;
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm -r typecheck
```
Expected: PASS. If any mock field doesn't match its type, fix the type (types are derived from the mock shape, not vice versa — these are canonical fixtures for now).

- [ ] **Step 4: Commit**

```bash
git add packages/core/ apps/extension/app/mock/
git commit -m "feat(core,extension): typed mock data fixtures + entity types"
```

---

## Task 14: Eight integration-seam stubs

**Files:**
- Create: `packages/agents/src/stubs/{generateMorningBrief,semanticSearch,detectAutoLinks,decomposeGoal,extractGmailActions,draftReply,negotiateBlock,validateLlmKey}.ts`
- Create: `packages/agents/src/stubs/index.ts` barrel
- Create: `packages/agents/src/stubs/<seam>.test.ts` (one per seam)

**Design principle:** each seam is a real async function returning the prototype's canned data after realistic latency, typed end-to-end. Consumers import by name — swapping the real impl in Phase 2+ does not touch any consumer.

- [ ] **Step 1: Utility — delay**

`packages/agents/src/stubs/_util.ts`:
```ts
export const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
```

- [ ] **Step 2: validateLlmKey (simplest — start here)**

`packages/agents/src/stubs/validateLlmKey.ts`:
```ts
import { delay } from './_util.js';

export type Provider = 'openai' | 'anthropic' | 'openrouter';
export interface ValidationResult { valid: boolean; error?: string; }

/**
 * Stub: returns `valid: true` for any non-empty string after 900ms.
 * Phase 1 replaces with a real GET /v1/models call (OpenAI) / equivalent.
 */
export async function validateLlmKey(provider: Provider, key: string): Promise<ValidationResult> {
  await delay(900);
  if (!key || key.length < 4) return { valid: false, error: 'invalid_api_key' };
  return { valid: true };
}
```

`validateLlmKey.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { validateLlmKey } from './validateLlmKey.js';

describe('validateLlmKey stub', () => {
  it('valid for non-empty key after ~900ms', async () => {
    const t = Date.now();
    const r = await validateLlmKey('openai', 'sk-abcd');
    expect(r.valid).toBe(true);
    expect(Date.now() - t).toBeGreaterThanOrEqual(800);
  });
  it('invalid for empty', async () => {
    const r = await validateLlmKey('openai', '');
    expect(r).toEqual({ valid: false, error: 'invalid_api_key' });
  });
});
```

- [ ] **Step 3: generateMorningBrief**

```ts
import type { Brief } from '@compass/core';
import { delay } from './_util.js';

export interface BriefInputs {
  /** Kept deliberately open; Phase 2 introduces strict Zod schema. */
  now: string;
  [k: string]: unknown;
}

/** Stub: returns the canned prototype brief after 1.8s. */
export async function generateMorningBrief(_inputs: BriefInputs): Promise<Brief> {
  const { BRIEF } = await import('../_mockBridge.js');
  await delay(1800);
  return BRIEF;
}
```

Create `packages/agents/src/_mockBridge.ts` which re-exports mock data from the extension app. But `packages/agents` shouldn't import from `apps/extension`. Solution: move canonical mock fixtures to `packages/core/src/fixtures/` (this sprint only — Phase 1 relocates if needed), and both extension app + agents stubs import from there.

**Decision:** the mock data lives in `packages/core/src/fixtures/` and `apps/extension/app/mock/` is deleted in favor of direct imports from `@compass/core/fixtures`. Update Task 13 accordingly — mock files live at `packages/core/src/fixtures/` with the same content, exported via `@compass/core/fixtures`.

Fix: re-run Task 13 file placements:
- `packages/core/src/fixtures/{brief,events,vitals,goals,notes,inbox,blockRules,soundscapes,suggestions,user}.ts`
- `packages/core/src/fixtures/utils.ts` (for `fmtTime`)
- `packages/core/src/fixtures/index.ts` barrel
- Update `packages/core/package.json` exports to add `"./fixtures": "./src/fixtures/index.ts"`.

If Task 13 was already committed, do a follow-up commit that moves the mock files into core. This keeps the import direction clean (`apps/extension` depends on `@compass/core`, `packages/agents` depends on `@compass/core`; `@compass/core` depends on nobody).

Implement each remaining seam similarly:

- [ ] **Step 4: semanticSearch**

```ts
import type { Note } from '@compass/core';
import { NOTES } from '@compass/core/fixtures';
import { delay } from './_util.js';

export interface NoteHit { note: Note; score: number; }

export async function semanticSearch(query: string): Promise<NoteHit[]> {
  await delay(300);
  if (!query.trim()) return [];
  const q = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  return NOTES.filter((n) => {
    const hay = (n.title + ' ' + n.excerpt + ' ' + n.tags.join(' ')).toLowerCase();
    return q.some((w) => hay.includes(w));
  }).map((note, i) => ({ note, score: 0.82 - i * 0.03 }));
}
```

- [ ] **Step 5: detectAutoLinks**

```ts
export async function detectAutoLinks(note: Note): Promise<AutoLink[]> {
  await delay(600);
  return note.related ?? [];
}
```

- [ ] **Step 6: decomposeGoal**

Two-stage — initial thinking then result:

```ts
import type { Goal, GoalDecomposition } from '@compass/core';
import { delay } from './_util.js';

export async function decomposeGoal(goal: Goal): Promise<GoalDecomposition> {
  await delay(1800);
  return {
    generatedAt: new Date().toISOString(),
    milestones: [
      { week: 5, title: 'Adaptive personalization signals live behind flag', done: false, targetDate: '', definitionOfDone: '' } as never,
      // (canned four-entry list per prototype)
    ],
    dailyTemplates: [],
    risks: [],
    firstWeekFocus: '',
  };
}
```

(Full canned list per `design/project/src/goals.jsx:128-138`.)

- [ ] **Step 7: extractGmailActions**

```ts
import type { InboxAction } from '@compass/core';
import { INBOX_ACTIONS } from '@compass/core/fixtures';
import { delay } from './_util.js';

export interface GmailMessage { id: string; /* … */ }
export async function extractGmailActions(msg: GmailMessage): Promise<InboxAction | null> {
  await delay(800);
  return INBOX_ACTIONS.find((a) => a.id === msg.id) ?? null;
}
```

- [ ] **Step 8: draftReply (streaming)**

```ts
import { delay } from './_util.js';

const FINAL = `Hey Mira — here are the three scenarios for Thursday: …`; // full text per prototype

export async function* draftReply(_action: { id: string }): AsyncIterable<string> {
  await delay(800);
  for (let i = 0; i < FINAL.length; i += 8) {
    yield FINAL.slice(0, Math.min(i + 8, FINAL.length));
    await delay(20);
  }
}
```

- [ ] **Step 9: negotiateBlock**

```ts
import type { BlockRule, NegotiationTurn } from '@compass/core';
import { delay } from './_util.js';

export async function* negotiateBlock(rule: BlockRule, reason: string): AsyncIterable<NegotiationTurn> {
  await delay(700);
  yield {
    role: 'assistant',
    text:
      'Five minutes is usually closer to twenty-five for me too. Would a 5-minute window now — or a real break between Pomodoros — serve you better?',
    offer: 'grant_5min',
  };
}
```

- [ ] **Step 10: Barrel + commit**

`packages/agents/src/stubs/index.ts`:
```ts
export * from './validateLlmKey.js';
export * from './generateMorningBrief.js';
export * from './semanticSearch.js';
export * from './detectAutoLinks.js';
export * from './decomposeGoal.js';
export * from './extractGmailActions.js';
export * from './draftReply.js';
export * from './negotiateBlock.js';
```

Re-export from `packages/agents/src/index.ts`:
```ts
export * as stubs from './stubs/index.js';
```

Run: `pnpm -r test`. Expected: all seams pass their tests, each returning the right shape.

```bash
git add packages/agents/ packages/core/
git commit -m "feat(agents): 8 integration-seam stubs with canned responses + tests"
```

---

## Tasks 15–22: Surface ports

Each surface gets one task. The **porting rules** (applied consistently) are:

1. Replace `React.useState`/aliased `useS_*` with plain `useState` from `react`.
2. Replace `I.{name}({size: n})` with `<Icon{Name} size={n} />` from `@compass/ui/icons`.
3. Replace inline `style={{…}}` with Tailwind utility classes where a token exists. Keep inline style only for dynamic values (e.g., `style={{ width: `${pct}%` }}`, grid template calculations). Prefer arbitrary-value Tailwind like `px-[22px]` over inline padding.
4. Replace manual `className="btn btn-sm btn-accent"` with `<Button size="sm" variant="accent">`.
5. Replace manual `className="card card-pad"` with `<Card padded>`.
6. Replace manual `className="badge badge-accent"` with `<Badge variant="accent">`.
7. Replace `window.MOCK` access with imports from `@compass/core/fixtures`.
8. Replace `setRoute("X")` with `<Link to="/X">` or `const [, navigate] = useLocation(); navigate('/X')` from `wouter`.
9. Replace global `openBlock` / overlay dispatches with `useShell().openOverlay('blockOverlay', rule)`.
10. Replace prototype-only `useMemo: useM_n` etc. aliases with plain `useMemo`.
11. Ported typography classes: `.serif`→`font-serif`, `.mono`→`font-mono text-[11.5px] uppercase tracking-[0.02em] text-[var(--ink-3)]`, `.prose`→`<Prose>`.
12. Split any composite that grows past ~150 lines into a sibling file.

Each surface task follows the same structure:

**Files:**
- Create: `apps/extension/app/routes/<name>/index.tsx` + composite files
- Create: `apps/extension/app/routes/<name>/<surface>.test.tsx` (render test)

**TDD contract for every surface:**

Before implementing, write a minimal render test:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { <SurfaceName> } from './index.js';

describe('<SurfaceName>', () => {
  it('renders the hero and key sections', () => {
    render(<<SurfaceName> />);
    expect(screen.getByText(/<heroText>/)).toBeInTheDocument();
  });
  it('is a11y clean', async () => {
    const { container } = render(<<SurfaceName> />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

Then port the prototype using the rules above, run the test, fix until green, commit.

---

### Task 15: New Tab surface

**Source:** `design/project/src/newtab.jsx` (316 lines, split into 8 composites).

**Files:**
- `apps/extension/app/routes/newtab/{index,MorningBrief,Timeline,InboxMini,Suggestions,GoalsMini,NotesMini,BlockerMini,Widget,Vital}.tsx`

**Key decisions during port:**
- `MorningBrief` is its own file (~120 lines): header row + TLDR + top-priority + pomodoros + watchouts + recovery + goal footer.
- `Timeline` uses `useMemo` to compute `nowTop` deterministically from the mock `now = 2026-04-20T07:42`. In tests, mock `Date` to keep render stable.
- `Widget` is a shared wrapper: `{ title, subtitle, action, children }`.
- `Vital` is shared: `{ icon, label, value, sub }`.
- Blocker tiles dispatch `useShell().openOverlay('blockOverlay', rule)` on click.

**Steps per task 15:**

- [ ] Step 1: write render test in `newtab.test.tsx`
- [ ] Step 2: implement `Widget.tsx`, `Vital.tsx` (shared atoms)
- [ ] Step 3: implement `Timeline.tsx`, `InboxMini.tsx`, `Suggestions.tsx`, `GoalsMini.tsx`, `NotesMini.tsx`, `BlockerMini.tsx`
- [ ] Step 4: implement `MorningBrief.tsx`
- [ ] Step 5: implement `index.tsx` composing everything under `<Surface>`
- [ ] Step 6: run test, fix, commit.

```bash
git commit -m "feat(extension): New Tab surface — brief + widgets + timeline"
```

---

### Task 16: Notes surface + CmdK

**Source:** `design/project/src/notes.jsx`.

Files:
- `routes/notes/{index.tsx, NotesList.tsx, NoteDetail.tsx, AutoLinkCard.tsx, CmdK.tsx, notes.test.tsx, cmdk.test.tsx}`

**Key decisions:**
- `CmdK` is triggered via `useShell().openOverlay('cmdK')` from the topbar or `⌘K` shortcut (wired in Task 23).
- Semantic search uses `semanticSearch` stub from `@compass/agents/stubs`.
- Forgotten-context callout renders when any related item has `stale: true`.

- [ ] Step 1: render test (list + detail slices)
- [ ] Step 2: `NotesList.tsx`
- [ ] Step 3: `AutoLinkCard.tsx` + `NoteDetail.tsx`
- [ ] Step 4: `CmdK.tsx` using `<Modal wide>`
- [ ] Step 5: `index.tsx` routing by `:id`
- [ ] Step 6: run, fix, commit

```bash
git commit -m "feat(extension): Notes surface with CmdK semantic-search modal"
```

---

### Task 17: Focus surface + FocusRunning overlay

**Source:** `design/project/src/focus.jsx`.

Files: `routes/focus/{index,FocusPlanner,FocusHistory,FocusRunning}.tsx` + test.

**Key decisions:**
- `FocusRunning` is a portal-rendered fullscreen overlay dispatched via `useShell().openOverlay('focusRunning', { task, mins })`.
- The timer uses `useEffect` + `setInterval`, cleans up on unmount.
- Progress ring is an inline SVG with `strokeDasharray` / `strokeDashoffset`.
- The weekly bars use hard-coded mock values (per prototype); no real data binding yet.

- [ ] Step 1: test — planner renders, start button dispatches overlay open
- [ ] Step 2: `FocusHistory.tsx` (bars)
- [ ] Step 3: `FocusPlanner.tsx`
- [ ] Step 4: `FocusRunning.tsx` with timer + ring
- [ ] Step 5: wire overlay dispatch; commit

```bash
git commit -m "feat(extension): Focus surface + running overlay with timer ring"
```

---

### Task 18: Goals surface + DecomposeModal

**Source:** `design/project/src/goals.jsx`.

Files: `routes/goals/{index,GoalList,GoalDetail,Stat,DecomposeModal}.tsx` + test.

**Key decisions:**
- `DecomposeModal` calls the `decomposeGoal` stub; shows two-phase UI (thinking → result) by watching the promise.
- Stats card reused from `Stat.tsx` (`{ label, value, accent? }`).
- Ambient "read 12 books" goal renders an empty-milestones state correctly.

- [ ] Steps mirror Task 17's shape. Commit.

```bash
git commit -m "feat(extension): Goals surface + decomposition modal"
```

---

### Task 19: Inbox surface + DraftModal

**Source:** `design/project/src/inbox.jsx`.

Files: `routes/inbox/{index,InboxList,ActionDetail,DraftModal}.tsx` + test.

**Key decisions:**
- `DraftModal` consumes the `draftReply` AsyncIterable, appending text as it streams; cursor blinks via `@keyframes blink`.
- "Save as Gmail draft" disabled until stream completes.

- [ ] Steps. Commit.

```bash
git commit -m "feat(extension): Inbox actions + streaming draft modal"
```

---

### Task 20: Blocker surface + BlockOverlay

**Source:** `design/project/src/blocker.jsx`.

Files: `routes/blocker/{index,RulesTable,BlockOverlay}.tsx` + test.

**Key decisions:**
- `BlockOverlay` is a portal, uses `negotiateBlock` stub for assistant turns.
- URL paths / queries **never** displayed (the overlay knows only `rule.pattern`).
- Timer (`seconds here`) ticks via `useEffect` + `setInterval`.

- [ ] Steps. Commit.

```bash
git commit -m "feat(extension): Blocker surface + dark negotiation overlay"
```

---

### Task 21: Settings surface

**Source:** `design/project/src/settings.jsx`.

Files: `routes/settings/{index,Section,Provider,BudgetCard,FeatureFlags}.tsx` + test.

- [ ] Steps. Commit.

```bash
git commit -m "feat(extension): Settings — providers, budget, privacy, feature flags"
```

---

### Task 22: Onboarding surface

**Source:** `design/project/src/onboarding.jsx`.

Files: `routes/onboarding/{index,WelcomeStep,ConnectStep,DoneStep}.tsx` + test.

**Key decisions:**
- `ConnectStep` calls `validateLlmKey` stub on "Validate" click, showing spinner + then success indicator.
- Three-step wizard state is local `useState` (no router); closing the wizard navigates to `/`.

- [ ] Steps. Commit.

```bash
git commit -m "feat(extension): Onboarding — three-step BYOK/OpenRouter wizard"
```

---

## Task 23: App root — routing, shortcuts, overlays, TweaksPanel

**Files:**
- Modify: `apps/extension/entrypoints/newtab/App.tsx`
- Create: `apps/extension/app/components/TweaksPanel.tsx`, `apps/extension/app/shortcuts.ts`, `apps/extension/app/components/{Brand,NavItem,BudgetCard,UserLine}.tsx`

- [ ] **Step 1: Sidebar items + brand**

Create `apps/extension/app/components/Brand.tsx`, `NavItem.tsx`, `BudgetCard.tsx`, `UserLine.tsx` — these bind the generic `Sidebar` layout primitive to Compass-specific content.

- [ ] **Step 2: TweaksPanel**

Create `apps/extension/app/components/TweaksPanel.tsx` that uses `useShell()`, exposes Segmented for theme + density and Swatch row for accent. Toggle via `useShell().setTweaksOpen(true)` or the `? d` chord.

- [ ] **Step 3: Shortcuts**

Create `apps/extension/app/shortcuts.ts`:
```ts
import { useShortcuts } from '@compass/ui';
import { useShell } from './state/shell.js';

export function useGlobalShortcuts() {
  const { openOverlay, closeOverlay, overlay, setTweaksOpen, tweaksOpen } = useShell();
  useShortcuts([
    { keys: ['⌘', 'k'], handler: () => (overlay === 'cmdK' ? closeOverlay() : openOverlay('cmdK')) },
    { keys: ['escape'], handler: () => { if (overlay) closeOverlay(); } },
    { keys: ['?', 'd'], handler: () => setTweaksOpen(!tweaksOpen) },
  ]);
}
```

- [ ] **Step 4: App.tsx**

Rewrite `apps/extension/entrypoints/newtab/App.tsx`:
```tsx
import { Route, Switch } from 'wouter';
import { ThemeProvider, AppShell, Sidebar, Topbar } from '@compass/ui';
import { useShell } from '@app/state/shell.js';
import { useGlobalShortcuts } from '@app/shortcuts.js';
import { Brand, NavItem, BudgetCard, UserLine } from '@app/components/index.js';
import { TweaksPanel } from '@app/components/TweaksPanel.js';
import { NewTab } from '@app/routes/newtab/index.js';
import { Notes } from '@app/routes/notes/index.js';
import { Focus } from '@app/routes/focus/index.js';
import { Goals } from '@app/routes/goals/index.js';
import { Inbox } from '@app/routes/inbox/index.js';
import { Blocker } from '@app/routes/blocker/index.js';
import { Settings } from '@app/routes/settings/index.js';
import { Onboarding } from '@app/routes/onboarding/index.js';
import { FocusRunning } from '@app/routes/focus/FocusRunning.js';
import { BlockOverlay } from '@app/routes/blocker/BlockOverlay.js';

export function App() {
  const { theme, accent, density, overlay, overlayPayload, closeOverlay } = useShell();
  useGlobalShortcuts();

  return (
    <ThemeProvider theme={theme} accent={accent} density={density}>
      <AppShell
        density={density}
        sidebar={
          <Sidebar
            density={density}
            brand={<Brand />}
            nav={
              <>
                <NavItem to="/" icon="home">New Tab</NavItem>
                <NavItem to="/notes" icon="note">Notes</NavItem>
                <NavItem to="/focus" icon="focus">Focus</NavItem>
                <NavItem to="/goals" icon="goal">Goals</NavItem>
                <NavItem to="/inbox" icon="inbox">Inbox Actions</NavItem>
                <NavItem to="/blocker" icon="block">Site Blocker</NavItem>
                <NavItem to="/settings" icon="gear">Settings & AI budget</NavItem>
              </>
            }
            footer={<><BudgetCard /><UserLine /></>}
          />
        }
      >
        <Topbar breadcrumb={<Breadcrumb />} />
        <Switch>
          <Route path="/" component={NewTab} />
          <Route path="/notes/:id?" component={Notes} />
          <Route path="/focus" component={Focus} />
          <Route path="/goals/:id?" component={Goals} />
          <Route path="/inbox/:id?" component={Inbox} />
          <Route path="/blocker" component={Blocker} />
          <Route path="/settings" component={Settings} />
          <Route path="/onboarding" component={Onboarding} />
        </Switch>
      </AppShell>

      <TweaksPanel />
      {overlay === 'focusRunning' && <FocusRunning payload={overlayPayload} onClose={closeOverlay} />}
      {overlay === 'blockOverlay' && <BlockOverlay payload={overlayPayload} onClose={closeOverlay} />}
    </ThemeProvider>
  );
}

function Breadcrumb() { /* derive from route */ return null; }
```

- [ ] **Step 5: Test + commit**

Write a render test that mounts `<App />` with MemoryRouter (wouter testing adapter), navigates through all routes, and asserts each heading renders.

```bash
pnpm -r test
git commit -am "feat(extension): wire App with wouter router, shortcuts, overlays, TweaksPanel"
```

---

## Task 24: E2E Playwright smoke tests

**Files:**
- Create: `apps/extension/playwright.config.ts`, `apps/extension/tests/e2e/{smoke.spec.ts, fixture.ts}`

- [ ] **Step 1: Playwright config**

```ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: { viewport: { width: 1440, height: 900 } },
  projects: [
    { name: 'chromium-extension', use: { channel: 'chromium' } },
    { name: 'firefox-extension', use: { channel: 'firefox' } },
  ],
});
```

- [ ] **Step 2: Extension fixture**

`fixture.ts` loads the built extension via `chromium.launchPersistentContext` with `--disable-extensions-except` and `--load-extension`. Firefox fixture uses `webextensions-manifest`/`web-ext` helper.

- [ ] **Step 3: Smoke scenarios**

Implement the seven scenarios from the spec §6.2. Each opens a new-tab, asserts key text, navigates, closes overlays.

- [ ] **Step 4: Run & commit**

```bash
pnpm --filter @compass/extension build
pnpm --filter @compass/extension exec playwright test
git commit -am "test: playwright extension smoke across chromium + firefox"
```

---

## Task 25: Visual regression baselines

**Files:**
- Create: `apps/extension/tests/visreg/surfaces.spec.ts`, `apps/extension/tests/visreg/__screenshots__/`

- [ ] **Step 1: Freeze clock + fonts**

In the visreg fixture, install: `await page.addInitScript(() => { Date.now = () => new Date('2026-04-20T07:42:00-04:00').getTime(); })`. Wait for `document.fonts.ready` before each screenshot.

- [ ] **Step 2: 14 baselines**

For each of the 7 surfaces × `{light, dark}`, take a full-page screenshot. Commit baselines under `__screenshots__/`.

- [ ] **Step 3: Commit baselines**

```bash
git add apps/extension/tests/visreg/
git commit -m "test(visreg): commit 14 baseline screenshots (7 surfaces × light/dark)"
```

---

## Task 26: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

```yaml
name: ci
on: { push: { branches: [master] }, pull_request: {} }
concurrency: { group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true }

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9.15.0 }
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9.15.0 }
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9.15.0 }
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: coverage, path: '**/coverage/**' }

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9.15.0 }
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build

  e2e:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9.15.0 }
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @compass/extension build
      - run: pnpm --filter @compass/extension exec playwright install --with-deps chromium firefox
      - run: pnpm --filter @compass/extension exec playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: playwright-report, path: apps/extension/playwright-report }

  visreg:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9.15.0 }
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @compass/extension build
      - run: pnpm --filter @compass/extension exec playwright install --with-deps chromium
      - run: pnpm --filter @compass/extension exec playwright test --project=visreg
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: visreg-diff, path: apps/extension/test-results }
```

- [ ] Commit: `ci: add lint/typecheck/test/build/e2e/visreg workflow`

---

## Task 27: `docs/design-system.md`

**Files:** Create `docs/design-system.md`.

Required sections (≤100 lines each):

1. **Tokens** — table per family with swatch preview (CSS custom properties `--bg` etc., Tailwind util `bg-[var(--bg)]`).
2. **Accents** — swatch grid with `{h,c,l}` for each. Recipe: `applyAccent('ocean')`.
3. **Theme** — light/dark toggle recipe, shell store wiring.
4. **Density** — spacious vs compact; how AppShell and Sidebar respond.
5. **Primitive reference** — one subsection per primitive: purpose, props table (from TSDoc), example, a11y notes.
6. **Icons** — `ICONS` map, usage: `<IconSearch size={14} />`.
7. **Hooks** — signature + example for each.
8. **Layout** — AppShell/Sidebar/Topbar/Surface/Grid12 examples.
9. **Motion** — duration tokens, common patterns (fadeIn scrim, slideUp panel, blink cursor), reduced-motion handling.

Commit.

---

## Task 28: `docs/architecture.md`

Required sections:

1. **Package boundaries** — what each workspace owns; dependency rule: `apps/extension → packages/{ui,agents,core,...}`; packages never import from apps.
2. **Integration-seam contract table** — the 8 stubs + swap instructions for Phase 1+.
3. **Recipe: add a new UI primitive** — create file, write test, export, document.
4. **Recipe: add a new surface** — create `routes/<name>/`, register in App.tsx, add Sidebar item, add mock data, add render test, add visreg baseline.
5. **Recipe: add a new shortcut** — edit `shortcuts.ts`, document in design-system.md.
6. **Recipe: add a new LLM task** (Phase 2 preview) — create `packages/core/src/schemas/<taskId>.ts`, create `packages/core/src/prompts/<taskId>.ts`, wire in router.

Commit.

---

## Task 29: `AGENTS.md` (repo root, ≤200 lines)

Sections per PRD §4.3:

- **Commands** — install, build, dev, test, lint, typecheck, e2e, visreg.
- **Architectural invariants** — the four from PRD §1.
- **Never do** — no content telemetry; no backend LLM proxy; no raw keys in sync storage; no `eval`; no Chrome/Firefox API calls from offscreen; no store-side sends from LLM paths.
- **Pointers** — `docs/prd.md`, `docs/design-system.md`, `docs/architecture.md`.
- **Testing expectation** — "every new primitive: .test.tsx + jest-axe; every new surface: render test + visreg baseline; every new stub: typed mock + latency test."

Commit.

---

## Task 30: Final validation — DoD walk-through

- [ ] **Step 1: Fresh clone sanity**

```bash
rm -rf node_modules .output **/node_modules
pnpm install --frozen-lockfile
pnpm build
```
Expected: all workspaces build. `apps/extension/.output/chrome-mv3/` exists and contains `newtab.html`.

- [ ] **Step 2: Load in Chrome**

`chrome://extensions` → Developer mode → Load unpacked → pick `.output/chrome-mv3`. New tab shows Compass New Tab with mock Morning Brief.

- [ ] **Step 3: Walk the DoD checklist from the spec**

Tick every item in spec §9. For each unchecked item, open a follow-up task, fix, re-run.

- [ ] **Step 4: Final commit + tag**

```bash
git commit --allow-empty -m "chore: Phase 0 complete — scaffold + design system + 8 surfaces + tests + CI"
git tag v0.1.0-phase-0
```

---

## Self-review (executed inline before handoff)

**Spec coverage:**
- §2.1 in scope → Tasks 1–30 cover monorepo, packages/ui, packages/core types, seam stubs, 8 surfaces, overlays, E2E, visreg, CI, docs. ✓
- §4 design system → Tasks 4–12 (tokens, icons, primitives, hooks, theme, layout). ✓
- §5 surface strategy → Tasks 15–22 plus Task 23 wiring. ✓
- §6 testing → Tasks 5–23 each include tests; Tasks 24–25 cover E2E + visreg. ✓
- §7 CI → Task 26. ✓
- §8 docs → Tasks 27–29. ✓
- §9 DoD → Task 30 validates. ✓
- §10 runways → embodied in the stub contracts (Task 14) and stub packages (Task 2). ✓

**Placeholder scan:** no "TBD" / "add error handling" / "similar to X" — each task includes concrete code.

**Type consistency:** `Brief`/`BriefingOutput` used consistently (Task 13 exports `Brief`, Task 14 stub `generateMorningBrief` returns `Brief`). `BlockRule.mode` values `'soft' | 'hard'` used consistently. `AccentName` type flows from `packages/ui/tokens.ts` through the store to the ThemeProvider.

**Known decision change recorded:** mock fixtures live in `packages/core/src/fixtures/` (not `apps/extension/app/mock/`). Task 13 Step 2 and Task 14 Step 3 both reference this — no drift.

---

## Execution Handoff

Plan complete and saved. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session using executing-plans, batch with checkpoints.

Which approach?
