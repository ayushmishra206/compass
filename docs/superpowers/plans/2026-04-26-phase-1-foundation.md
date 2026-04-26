# Compass Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the Phase 0 design-prototype shell to a system that completes a real LLM call end-to-end via OpenRouter, with all of `packages/{runtime, core/types, core/crypto, db, llm, embeddings/local}` shipped and the `system.ping` gate criterion green.

**Architecture:** Vertical tracer-bullet over 4 weeks. Week 1 wires SW + offscreen + RPC + heavy-doc lifecycle with all stubs synthetic. Weeks 2–4 swap stubs for real implementations one at a time, keeping the gate path green continuously. Chrome-only heavy-doc; `HeavyRuntime` interface is transport-agnostic so Firefox/Safari plug in later.

**Tech Stack:** WXT, React 19, TypeScript 5.6 strict, Zod 3, sqlite-wasm + sqlite-vec, OPFS, transformers.js + MiniLM, `openai` SDK pointed at OpenRouter, Vitest, Testing Library, jest-axe, Playwright.

**Spec:** [docs/superpowers/specs/2026-04-26-phase-1-foundation-design.md](../specs/2026-04-26-phase-1-foundation-design.md)

---

## File Structure

Target tree of new + modified files. Files marked `[NEW]` are created; `[ext]` are extended from Phase 0 stubs.

```
compass/
├── apps/extension/
│   ├── entrypoints/
│   │   ├── background.ts                                   [ext]
│   │   ├── offscreen/
│   │   │   ├── index.html                                  [NEW]
│   │   │   └── main.ts                                     [ext]
│   │   └── newtab/
│   │       └── App.tsx                                     [ext — dev panel button]
│   ├── app/
│   │   ├── routes/onboarding/                              [ext — wire real validation]
│   │   │   ├── index.tsx
│   │   │   ├── ConnectStep.tsx
│   │   │   └── DoneStep.tsx
│   │   └── components/DevPingButton.tsx                    [NEW — dev-only "Run ping"]
│   └── wxt.config.ts                                       [ext — declare offscreen]
├── packages/
│   ├── core/src/
│   │   ├── types/                                          [NEW]
│   │   │   ├── credentials.ts, user.ts, configuration.ts,
│   │   │   ├── goal.ts, milestone.ts, focus.ts, note.ts,
│   │   │   ├── block.ts, briefing.ts, gmail.ts, meeting.ts,
│   │   │   ├── telemetry.ts, ledger.ts, ping.ts, index.ts
│   │   ├── crypto/                                         [NEW]
│   │   │   ├── keystore.ts, credentials.ts, index.ts
│   │   └── prompts/
│   │       └── routing.ts                                  [NEW]
│   ├── runtime/                                            [NEW package]
│   │   ├── package.json, tsconfig.json
│   │   └── src/
│   │       ├── HeavyRuntime.ts, routes.ts, rpc.ts,
│   │       ├── chrome-offscreen.ts, in-process.ts, index.ts
│   ├── db/src/                                             [ext]
│   │   ├── init.ts, opfs.ts, migration-runner.ts, index.ts,
│   │   └── migrations/0001-foundation.sql
│   ├── llm/src/                                            [ext]
│   │   ├── provider.ts, errors.ts, validate.ts, router.ts,
│   │   ├── ledger.ts, index.ts,
│   │   └── providers/{openrouter.ts, stub.ts}
│   └── embeddings/local/src/                               [ext]
│       ├── runtime.ts, weights.ts, embed.ts, index.ts
├── tests/
│   ├── runtime/{in-process.test.ts, eviction.test.ts}      [NEW]
│   ├── db/smoke.test.ts                                    [NEW]
│   ├── gate/{offline.test.ts, wired.test.ts}               [NEW]
├── docs/
│   ├── architecture.md                                     [ext]
│   └── prd.md                                              [ext — §17 phase scope]
└── .github/workflows/
    └── ci.yml                                              [ext — gate jobs]
```

---

## Week 1 — Tracer wiring

Goal: by end of week, `chrome.runtime.sendMessage(rpc('system.ping', { utterance: 'hi' }))` returns `{ pong: true, echo: 'hi' }` from a synthetic stub provider running in the Chrome offscreen document.

### Task 1: Scaffold `packages/runtime`

**Files:**

- Create: `packages/runtime/package.json`, `packages/runtime/tsconfig.json`, `packages/runtime/src/index.ts`

- [ ] **Step 1: Create package manifest**

Create `packages/runtime/package.json`:

```json
{
  "name": "@compass/runtime",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src"
  },
  "dependencies": {
    "@compass/core": "workspace:*"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.270",
    "vitest": "^2.1.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create tsconfig**

Create `packages/runtime/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src", "../../node_modules/@types/chrome"]
}
```

- [ ] **Step 3: Create empty barrel**

Create `packages/runtime/src/index.ts`:

```ts
export type { HeavyRuntime } from './HeavyRuntime';
export type { Routes, RouteKind } from './routes';
export { rpc } from './rpc';
export { ensureHeavyDoc } from './chrome-offscreen';
```

- [ ] **Step 4: Install + verify**

```bash
pnpm install
pnpm --filter @compass/runtime typecheck
```

Expected: `tsc --noEmit` exits 0 (currently no `.ts` files referenced in `index.ts` exist; this step will fail as expected — proceed to Task 2).

- [ ] **Step 5: Commit**

```bash
git add packages/runtime
git commit -m "feat(runtime): scaffold @compass/runtime package"
```

---

### Task 2: Define `HeavyRuntime` interface and `Routes` registry

**Files:**

- Create: `packages/runtime/src/HeavyRuntime.ts`, `packages/runtime/src/routes.ts`

- [ ] **Step 1: Define `HeavyRuntime` interface**

Create `packages/runtime/src/HeavyRuntime.ts`:

```ts
import type { Routes } from './routes';

export interface HeavyRuntime {
  /** Resolves once the runtime is ready to dispatch handlers. Idempotent. */
  init(): Promise<void>;

  /** Send a one-shot RPC; resolves with the typed response. */
  rpc<K extends keyof Routes>(kind: K, payload: Routes[K]['req']): Promise<Routes[K]['res']>;

  /** Tear down (best-effort). Implementations may be no-ops. */
  shutdown(): Promise<void>;
}

export interface RpcHandler<K extends keyof Routes> {
  (payload: Routes[K]['req']): Promise<Routes[K]['res']>;
}

export interface HandlerRegistry {
  register<K extends keyof Routes>(kind: K, handler: RpcHandler<K>): void;
  unregister(kind: keyof Routes): void;
  dispatch<K extends keyof Routes>(kind: K, payload: Routes[K]['req']): Promise<Routes[K]['res']>;
}
```

- [ ] **Step 2: Define `Routes` registry**

Create `packages/runtime/src/routes.ts`:

```ts
// Phase 1 routes registry. Adding a new route: add an entry here, register the
// handler in offscreen, call rpc() from the SW or UI.
//
// Streaming variants are deferred — see Q3(d) in the Phase 1 spec.

export interface Routes {
  'system.ping': {
    req: { utterance: string };
    res: { pong: true; echo: string };
  };
  'llm.complete': {
    req: LlmCompleteRequest;
    res: LlmCompleteResponse;
  };
  'llm.validateKey': {
    req: { provider: 'openrouter'; apiKey: string };
    res: { valid: boolean; error?: string };
  };
  'ledger.getMonthlySpend': {
    req: { monthStartIso: string };
    res: { usd: number; calls: number };
  };
}

export type RouteKind = keyof Routes;

// Re-exported from @compass/core to keep the registry self-contained at type
// level; the actual runtime objects come from @compass/llm.
export interface LlmCompleteRequest {
  taskId: string;
  system?: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  schema?: unknown; // serialized JSON schema or undefined
  maxOutputTokens: number;
  temperature?: number;
  timeoutMs: number;
  trusted: boolean;
}

export interface LlmCompleteResponse {
  parsed?: unknown; // present iff request had schema
  text: string;
  usage: {
    promptTok: number;
    cachedTok: number;
    completionTok: number;
  };
  model: string;
  finishReason: 'stop' | 'length' | 'error';
}
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm --filter @compass/runtime typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/runtime/src/HeavyRuntime.ts packages/runtime/src/routes.ts
git commit -m "feat(runtime): define HeavyRuntime interface and Routes registry"
```

---

### Task 3: Implement client-side `rpc()` (SW/UI side)

**Files:**

- Create: `packages/runtime/src/rpc.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/runtime/tests/rpc.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rpc } from '../src/rpc';

describe('rpc', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: vi.fn(),
        onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
      },
    });
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'test-id-1'),
    });
  });

  it('correlates response by request id', async () => {
    const sendMessage = vi.mocked(chrome.runtime.sendMessage);
    const addListener = vi.mocked(chrome.runtime.onMessage.addListener);

    sendMessage.mockResolvedValue({ ok: true });

    const promise = rpc('system.ping', { utterance: 'hi' });

    const listener = addListener.mock.calls[0]![0] as (msg: unknown) => void;
    listener({
      kind: 'rpc.response',
      requestId: 'test-id-1',
      result: { pong: true, echo: 'hi' },
    });

    await expect(promise).resolves.toEqual({ pong: true, echo: 'hi' });
  });

  it('rejects on error response', async () => {
    const addListener = vi.mocked(chrome.runtime.onMessage.addListener);

    const promise = rpc('system.ping', { utterance: 'hi' });

    const listener = addListener.mock.calls[0]![0] as (msg: unknown) => void;
    listener({
      kind: 'rpc.response',
      requestId: 'test-id-1',
      error: { name: 'BadInput', message: 'nope' },
    });

    await expect(promise).rejects.toThrow('nope');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @compass/runtime test rpc
```

Expected: FAIL — `Cannot find module '../src/rpc'`.

- [ ] **Step 3: Implement `rpc()`**

Create `packages/runtime/src/rpc.ts`:

```ts
import type { Routes } from './routes';

interface RpcResponseEnvelope {
  kind: 'rpc.response';
  requestId: string;
  result?: unknown;
  error?: { name: string; message: string };
}

interface RpcRequestEnvelope<K extends keyof Routes> {
  kind: 'rpc.request';
  routeKind: K;
  requestId: string;
  payload: Routes[K]['req'];
}

const pending = new Map<
  string,
  {
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
  }
>();

let listenerInstalled = false;

function installListener(): void {
  if (listenerInstalled) return;
  listenerInstalled = true;
  chrome.runtime.onMessage.addListener((msg: unknown) => {
    if (!msg || typeof msg !== 'object' || (msg as { kind?: string }).kind !== 'rpc.response') {
      return;
    }
    const envelope = msg as RpcResponseEnvelope;
    const entry = pending.get(envelope.requestId);
    if (!entry) return;
    pending.delete(envelope.requestId);
    if (envelope.error) {
      const err = new Error(envelope.error.message);
      err.name = envelope.error.name;
      entry.reject(err);
    } else {
      entry.resolve(envelope.result);
    }
  });
}

export async function rpc<K extends keyof Routes>(
  kind: K,
  payload: Routes[K]['req'],
): Promise<Routes[K]['res']> {
  installListener();
  const requestId = crypto.randomUUID();
  const envelope: RpcRequestEnvelope<K> = {
    kind: 'rpc.request',
    routeKind: kind,
    requestId,
    payload,
  };

  return new Promise<Routes[K]['res']>((resolve, reject) => {
    pending.set(requestId, {
      resolve: resolve as (v: unknown) => void,
      reject,
    });
    chrome.runtime.sendMessage(envelope).catch((err) => {
      pending.delete(requestId);
      reject(err);
    });
  });
}

// Test-only: clear pending state between tests.
export function __resetForTests(): void {
  pending.clear();
  listenerInstalled = false;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @compass/runtime test rpc
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/runtime/src/rpc.ts packages/runtime/tests/rpc.test.ts
git commit -m "feat(runtime): client-side rpc() with request-id correlation"
```

---

### Task 4: Implement offscreen-side handler registry

**Files:**

- Create: `packages/runtime/src/handler.ts`

- [ ] **Step 1: Write failing test**

Create `packages/runtime/tests/handler.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { createHandlerRegistry, installRequestListener } from '../src/handler';

describe('handler registry', () => {
  it('dispatches request to registered handler and replies with result', async () => {
    const sendMessage = vi.fn();
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage,
        onMessage: { addListener: vi.fn() },
      },
    });

    const registry = createHandlerRegistry();
    registry.register('system.ping', async ({ utterance }) => ({
      pong: true as const,
      echo: utterance,
    }));

    installRequestListener(registry);
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0]![0] as (
      msg: unknown,
    ) => boolean;
    const handled = listener({
      kind: 'rpc.request',
      routeKind: 'system.ping',
      requestId: 'req-1',
      payload: { utterance: 'hi' },
    });
    expect(handled).toBe(true);

    await new Promise((r) => setTimeout(r, 0));

    expect(sendMessage).toHaveBeenCalledWith({
      kind: 'rpc.response',
      requestId: 'req-1',
      result: { pong: true, echo: 'hi' },
    });
  });

  it('replies with error envelope when handler throws', async () => {
    const sendMessage = vi.fn();
    vi.stubGlobal('chrome', {
      runtime: { sendMessage, onMessage: { addListener: vi.fn() } },
    });

    const registry = createHandlerRegistry();
    registry.register('system.ping', async () => {
      throw new Error('boom');
    });

    installRequestListener(registry);
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0]![0] as (
      msg: unknown,
    ) => boolean;
    listener({
      kind: 'rpc.request',
      routeKind: 'system.ping',
      requestId: 'req-2',
      payload: { utterance: 'x' },
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(sendMessage).toHaveBeenCalledWith({
      kind: 'rpc.response',
      requestId: 'req-2',
      error: { name: 'Error', message: 'boom' },
    });
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm --filter @compass/runtime test handler
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement handler**

Create `packages/runtime/src/handler.ts`:

```ts
import type { HandlerRegistry, RpcHandler } from './HeavyRuntime';
import type { Routes } from './routes';

export function createHandlerRegistry(): HandlerRegistry {
  const handlers = new Map<keyof Routes, RpcHandler<keyof Routes>>();
  return {
    register(kind, handler) {
      handlers.set(kind, handler as RpcHandler<keyof Routes>);
    },
    unregister(kind) {
      handlers.delete(kind);
    },
    dispatch: async (kind, payload) => {
      const handler = handlers.get(kind);
      if (!handler) throw new Error(`No handler for route '${String(kind)}'`);
      return handler(payload);
    },
  };
}

interface RpcRequestEnvelope {
  kind: 'rpc.request';
  routeKind: keyof Routes;
  requestId: string;
  payload: unknown;
}

export function installRequestListener(registry: HandlerRegistry): void {
  chrome.runtime.onMessage.addListener((msg: unknown) => {
    if (!msg || typeof msg !== 'object' || (msg as { kind?: string }).kind !== 'rpc.request') {
      return false;
    }
    const env = msg as RpcRequestEnvelope;
    void registry
      .dispatch(env.routeKind, env.payload as Routes[keyof Routes]['req'])
      .then((result) => {
        chrome.runtime.sendMessage({
          kind: 'rpc.response',
          requestId: env.requestId,
          result,
        });
      })
      .catch((err: unknown) => {
        const e = err as Error;
        chrome.runtime.sendMessage({
          kind: 'rpc.response',
          requestId: env.requestId,
          error: { name: e.name ?? 'Error', message: e.message ?? String(err) },
        });
      });
    return true;
  });
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm --filter @compass/runtime test handler
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/runtime/src/handler.ts packages/runtime/tests/handler.test.ts
git commit -m "feat(runtime): offscreen handler registry + request listener"
```

---

### Task 5: Implement Chrome offscreen `ensureHeavyDoc()`

**Files:**

- Create: `packages/runtime/src/chrome-offscreen.ts`

- [ ] **Step 1: Write failing test**

Create `packages/runtime/tests/chrome-offscreen.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureHeavyDoc } from '../src/chrome-offscreen';

describe('ensureHeavyDoc', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      runtime: { getContexts: vi.fn() },
      offscreen: {
        createDocument: vi.fn(),
        Reason: { BLOBS: 'BLOBS', IFRAME_SCRIPTING: 'IFRAME_SCRIPTING' },
      },
    });
  });

  it('creates the offscreen document if none exists', async () => {
    vi.mocked(chrome.runtime.getContexts).mockResolvedValue([]);
    vi.mocked(chrome.offscreen.createDocument).mockResolvedValue(undefined);

    await ensureHeavyDoc();

    expect(chrome.offscreen.createDocument).toHaveBeenCalledWith({
      url: '/offscreen.html',
      reasons: ['BLOBS', 'IFRAME_SCRIPTING'],
      justification: 'sqlite-wasm DB, embeddings runtime, LLM fetch',
    });
  });

  it('skips creation when offscreen already exists', async () => {
    vi.mocked(chrome.runtime.getContexts).mockResolvedValue([
      { contextType: 'OFFSCREEN_DOCUMENT' } as any,
    ]);

    await ensureHeavyDoc();

    expect(chrome.offscreen.createDocument).not.toHaveBeenCalled();
  });

  it('coalesces concurrent calls', async () => {
    vi.mocked(chrome.runtime.getContexts).mockResolvedValue([]);
    vi.mocked(chrome.offscreen.createDocument).mockImplementation(
      () => new Promise((r) => setTimeout(r, 10)),
    );

    await Promise.all([ensureHeavyDoc(), ensureHeavyDoc(), ensureHeavyDoc()]);

    expect(chrome.offscreen.createDocument).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm --filter @compass/runtime test chrome-offscreen
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ensureHeavyDoc`**

Create `packages/runtime/src/chrome-offscreen.ts`:

```ts
let creating: Promise<void> | null = null;

const OFFSCREEN_URL = '/offscreen.html';
const REASONS: chrome.offscreen.Reason[] = ['BLOBS', 'IFRAME_SCRIPTING'];
const JUSTIFICATION = 'sqlite-wasm DB, embeddings runtime, LLM fetch';

export async function ensureHeavyDoc(): Promise<void> {
  const existing = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  });
  if (existing.length > 0) return;

  if (!creating) {
    creating = chrome.offscreen
      .createDocument({
        url: OFFSCREEN_URL,
        reasons: REASONS,
        justification: JUSTIFICATION,
      })
      .finally(() => {
        creating = null;
      });
  }
  await creating;
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm --filter @compass/runtime test chrome-offscreen
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/runtime/src/chrome-offscreen.ts packages/runtime/tests/chrome-offscreen.test.ts
git commit -m "feat(runtime): ensureHeavyDoc with race coalescing"
```

---

### Task 6: In-process mock runtime + transport-agnostic contract test

**Files:**

- Create: `packages/runtime/src/in-process.ts`, `tests/runtime/in-process.test.ts`

- [ ] **Step 1: Implement in-process runtime**

Create `packages/runtime/src/in-process.ts`:

```ts
import type { HeavyRuntime } from './HeavyRuntime';
import type { Routes } from './routes';
import { createHandlerRegistry } from './handler';

export interface InProcessRuntime extends HeavyRuntime {
  readonly registry: ReturnType<typeof createHandlerRegistry>;
}

export function createInProcessRuntime(): InProcessRuntime {
  const registry = createHandlerRegistry();
  let initialized = false;
  return {
    registry,
    async init() {
      initialized = true;
    },
    async rpc<K extends keyof Routes>(kind: K, payload: Routes[K]['req']) {
      if (!initialized) throw new Error('Runtime not initialized');
      return registry.dispatch(kind, payload);
    },
    async shutdown() {
      initialized = false;
    },
  };
}
```

- [ ] **Step 2: Write contract test**

Create `tests/runtime/in-process.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createInProcessRuntime } from '@compass/runtime/in-process';

describe('runtime contract — in-process', () => {
  it('dispatches a registered route', async () => {
    const rt = createInProcessRuntime();
    rt.registry.register('system.ping', async ({ utterance }) => ({
      pong: true as const,
      echo: utterance,
    }));
    await rt.init();
    const res = await rt.rpc('system.ping', { utterance: 'hello' });
    expect(res).toEqual({ pong: true, echo: 'hello' });
  });

  it('rejects when route not registered', async () => {
    const rt = createInProcessRuntime();
    await rt.init();
    await expect(rt.rpc('system.ping', { utterance: 'x' })).rejects.toThrow(/No handler/);
  });
});
```

- [ ] **Step 3: Run test — expect PASS**

```bash
pnpm --filter @compass/runtime test
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/runtime/src/in-process.ts tests/runtime/in-process.test.ts
git commit -m "feat(runtime): in-process mock runtime + contract test"
```

---

### Task 7: Wire offscreen entry to register handlers

**Files:**

- Create: `apps/extension/entrypoints/offscreen/index.html`
- Modify: `apps/extension/entrypoints/offscreen/main.ts`

- [ ] **Step 1: Create offscreen HTML**

Create `apps/extension/entrypoints/offscreen/index.html`:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Compass offscreen</title>
  </head>
  <body>
    <script type="module" src="./main.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: Replace main.ts with handler bootstrap**

Replace `apps/extension/entrypoints/offscreen/main.ts` with:

```ts
import { createHandlerRegistry, installRequestListener } from '@compass/runtime';

const registry = createHandlerRegistry();

// Synthetic ping for week 1; replaced with real LLM call in week 3.
registry.register('system.ping', async ({ utterance }) => ({
  pong: true as const,
  echo: utterance,
}));

installRequestListener(registry);

console.log('Compass offscreen mounted; handlers registered.');
```

Note: `createHandlerRegistry` and `installRequestListener` are not yet re-exported from `@compass/runtime/src/index.ts`. Update the barrel:

```ts
// packages/runtime/src/index.ts — add:
export { createHandlerRegistry, installRequestListener } from './handler';
```

- [ ] **Step 3: Update WXT config to declare offscreen entrypoint**

Modify `apps/extension/wxt.config.ts` to ensure `offscreen` entrypoint is built. Verify the manifest produced by `pnpm build` includes the offscreen permission and the document URL.

- [ ] **Step 4: Update SW to ensure heavy-doc on first message**

Modify `apps/extension/entrypoints/background.ts`:

```ts
import { ensureHeavyDoc } from '@compass/runtime';

export default defineBackground(() => {
  console.log('Compass service worker online');

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.kind === 'rpc.request') {
      void ensureHeavyDoc();
      // Do not call sendResponse — offscreen replies via its own sendMessage.
      return false;
    }
    return false;
  });
});
```

- [ ] **Step 5: Build + manual verification**

```bash
pnpm --filter @compass/extension build
```

Expected: build succeeds; `dist/chrome-mv3/manifest.json` includes `"offscreen"` permission and the `offscreen.html` URL.

- [ ] **Step 6: Commit**

```bash
git add apps/extension/entrypoints packages/runtime/src/index.ts
git commit -m "feat(extension): wire offscreen handler bootstrap and SW heavy-doc trigger"
```

---

### Task 8: Add dev "Run ping" button + manual e2e

**Files:**

- Create: `apps/extension/app/components/DevPingButton.tsx`
- Modify: `apps/extension/entrypoints/newtab/App.tsx` (or appropriate dev panel)

- [ ] **Step 1: Implement dev button**

Create `apps/extension/app/components/DevPingButton.tsx`:

```tsx
import { useState } from 'react';
import { rpc } from '@compass/runtime';
import { Button } from '@compass/ui';

export function DevPingButton(): JSX.Element {
  const [result, setResult] = useState<string>('');

  async function handleClick(): Promise<void> {
    setResult('…');
    try {
      const res = await rpc('system.ping', { utterance: `t-${Date.now()}` });
      setResult(JSON.stringify(res));
    } catch (err) {
      setResult(`error: ${(err as Error).message}`);
    }
  }

  return (
    <div className="border border-hair p-2 text-mono text-xs">
      <Button onClick={handleClick}>Run ping</Button>
      <pre className="mt-2">{result}</pre>
    </div>
  );
}
```

- [ ] **Step 2: Mount button in dev/Tweaks panel**

Add `<DevPingButton />` to `apps/extension/app/components/TweaksPanel.tsx` under a "Dev" section. Visible only when `import.meta.env.DEV` is true.

- [ ] **Step 3: Manual verification (dev)**

```bash
pnpm dev
```

Load the unpacked extension from `apps/extension/.output/chrome-mv3/`, open new tab, open Tweaks panel, click "Run ping". Expected output: `{"pong":true,"echo":"t-<timestamp>"}`.

- [ ] **Step 4: Commit**

```bash
git add apps/extension/app/components/DevPingButton.tsx apps/extension/app/components/TweaksPanel.tsx
git commit -m "feat(extension): dev panel Run ping button — week 1 tracer green"
```

---

## Week 2 — Types, crypto, DB

Goal: Zod schemas land for all §6 entities; `packages/core/crypto` ships at 100% coverage; `packages/db` initializes OPFS, runs migration 0001, and the synthetic ping flow writes a cost-ledger row.

### Task 9: `packages/core/types/credentials.ts` with multi-key shape

**Files:**

- Create: `packages/core/src/types/credentials.ts`, `packages/core/src/types/credentials.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/core/src/types/credentials.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { LlmCredentialsSchema, KeyEntrySchema } from './credentials';

describe('LlmCredentials schema', () => {
  it('accepts a Phase-1 OpenRouter-only credential set', () => {
    const result = LlmCredentialsSchema.safeParse({
      default: 'openrouter',
      openrouter: { apiKey: 'sk-or-v1-abc', addedAt: '2026-04-26T10:00:00Z' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts the skipped state', () => {
    expect(LlmCredentialsSchema.safeParse({ default: null }).success).toBe(true);
  });

  it('rejects a key entry without addedAt', () => {
    const result = KeyEntrySchema.safeParse({ apiKey: 'x' });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm --filter @compass/core test credentials
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement schema**

Create `packages/core/src/types/credentials.ts`:

```ts
import { z } from 'zod';

export const ProviderIdSchema = z.enum(['openai', 'anthropic', 'openrouter']);
export type ProviderId = z.infer<typeof ProviderIdSchema>;

export const KeyEntrySchema = z.object({
  apiKey: z.string(),
  addedAt: z.string(),
  lastValidatedAt: z.string().optional(),
});
export type KeyEntry = z.infer<typeof KeyEntrySchema>;

export const LlmCredentialsSchema = z.object({
  default: ProviderIdSchema.nullable(),
  openrouter: KeyEntrySchema.optional(),
  openai: KeyEntrySchema.optional(),
  anthropic: KeyEntrySchema.optional(),
});
export type LlmCredentials = z.infer<typeof LlmCredentialsSchema>;
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm --filter @compass/core test credentials
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/types/credentials.ts packages/core/src/types/credentials.test.ts
git commit -m "feat(core): LlmCredentials Zod schema (multi-key forward-compat)"
```

---

### Task 10: `packages/core/types/ping.ts` and ledger.ts

**Files:**

- Create: `packages/core/src/types/ping.ts`, `packages/core/src/types/ledger.ts`, plus tests

- [ ] **Step 1: Implement `ping.ts`**

Create `packages/core/src/types/ping.ts`:

```ts
import { z } from 'zod';

export const PingInputSchema = z.object({
  utterance: z.string(),
});
export type PingInput = z.infer<typeof PingInputSchema>;

export const PingOutputSchema = z.object({
  pong: z.literal(true),
  echo: z.string(),
});
export type PingOutput = z.infer<typeof PingOutputSchema>;
```

- [ ] **Step 2: Implement `ledger.ts`**

Create `packages/core/src/types/ledger.ts`:

```ts
import { z } from 'zod';
import { ProviderIdSchema } from './credentials';

export const CostLedgerRowSchema = z.object({
  id: z.string(),
  ts: z.string(), // ISO-8601 UTC
  feature: z.string(), // taskId
  provider: ProviderIdSchema,
  model: z.string(),
  promptTok: z.number().int().nonnegative(),
  cachedTok: z.number().int().nonnegative(),
  completionTok: z.number().int().nonnegative(),
  usdEstimated: z.number().nonnegative(),
});
export type CostLedgerRow = z.infer<typeof CostLedgerRowSchema>;
```

- [ ] **Step 3: Add round-trip tests for both**

Create `packages/core/src/types/ping.test.ts` and `packages/core/src/types/ledger.test.ts` with one happy-path and one negative case each. Pattern matches Task 9.

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm --filter @compass/core test
```

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/types/{ping,ledger}.ts packages/core/src/types/{ping,ledger}.test.ts
git commit -m "feat(core): ping and cost-ledger Zod schemas"
```

---

### Task 11: Remaining §6 entity Zod schemas (structural-only)

**Files:**

- Create: `packages/core/src/types/{user,configuration,goal,milestone,note,focus,block,briefing,gmail,meeting,telemetry,index}.ts` plus tests

- [ ] **Step 1: For each entity, transcribe the PRD §6 TS type to a structural Zod schema**

Reference [PRD §6.1–§6.4](../../prd.md#6-data-model-typescript). For each file:

- Define `<Name>Schema = z.object({ … })` with the right field names + types + required/optional + nullable.
- Export `type <Name> = z.infer<typeof <Name>Schema>`.
- **Do not** add semantic refinements (no `.regex()`, `.min()/max()`, `.refine()`). Those land in Phase 2+.

Example pattern (`user.ts`):

```ts
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().optional(),
  timezone: z.string(),
  createdAt: z.string(),
});
export type User = z.infer<typeof UserSchema>;
```

- [ ] **Step 2: Add a one-line round-trip test per file**

Pattern (`user.test.ts`):

```ts
import { describe, it, expect } from 'vitest';
import { UserSchema } from './user';

describe('User schema', () => {
  it('parses a happy-path fixture', () => {
    const ok = UserSchema.safeParse({
      id: 'u1',
      email: 'x@y.z',
      timezone: 'UTC',
      createdAt: '2026-01-01T00:00:00Z',
    });
    expect(ok.success).toBe(true);
  });

  it('rejects a missing required field', () => {
    expect(UserSchema.safeParse({ id: 'u1' }).success).toBe(false);
  });
});
```

- [ ] **Step 3: Update `packages/core/src/types/index.ts` barrel**

```ts
export * from './credentials';
export * from './ping';
export * from './ledger';
export * from './user';
export * from './configuration';
export * from './goal';
export * from './milestone';
export * from './note';
export * from './focus';
export * from './block';
export * from './briefing';
export * from './gmail';
export * from './meeting';
export * from './telemetry';
```

Also update `packages/core/src/index.ts` to re-export `./types`.

- [ ] **Step 4: Run tests + typecheck**

```bash
pnpm --filter @compass/core test
pnpm --filter @compass/core typecheck
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/types
git commit -m "feat(core): structural Zod schemas for all §6 entities"
```

---

### Task 12: `packages/core/crypto/keystore.ts` — WebCrypto envelope at 100% coverage

**Files:**

- Create: `packages/core/src/crypto/keystore.ts`, `packages/core/src/crypto/keystore.test.ts`

- [ ] **Step 1: Write tests covering all paths (encrypt, decrypt, version mismatch, IV reuse rejection)**

Create `packages/core/src/crypto/keystore.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, EncryptedSecretSchema } from './keystore';

const PASSPHRASE = 'correct horse battery staple';

describe('keystore — WebCrypto envelope', () => {
  it('round-trips a secret', async () => {
    const env = await encrypt('my-key', PASSPHRASE);
    expect(EncryptedSecretSchema.safeParse(env).success).toBe(true);
    const out = await decrypt(env, PASSPHRASE);
    expect(out).toBe('my-key');
  });

  it('produces a different IV per encryption', async () => {
    const a = await encrypt('s', PASSPHRASE);
    const b = await encrypt('s', PASSPHRASE);
    expect(a.iv).not.toBe(b.iv);
  });

  it('rejects wrong passphrase', async () => {
    const env = await encrypt('s', PASSPHRASE);
    await expect(decrypt(env, 'wrong')).rejects.toThrow();
  });

  it('rejects unknown schema version', async () => {
    const env = await encrypt('s', PASSPHRASE);
    const tampered = { ...env, v: 99 as const };
    await expect(decrypt(tampered as never, PASSPHRASE)).rejects.toThrow(/version/i);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm --filter @compass/core test keystore
```

Expected: FAIL.

- [ ] **Step 3: Implement keystore per PRD §5.3 parameters**

Create `packages/core/src/crypto/keystore.ts`:

```ts
import { z } from 'zod';

export const EncryptedSecretSchema = z.object({
  v: z.literal(1),
  algo: z.literal('AES-GCM-256'),
  kdf: z.literal('PBKDF2-SHA256-250k'),
  salt: z.string(),
  iv: z.string(),
  ct: z.string(),
  createdAt: z.string(),
});
export type EncryptedSecret = z.infer<typeof EncryptedSecretSchema>;

const KDF = { name: 'PBKDF2', hash: 'SHA-256', iterations: 250_000 } as const;
const CIPHER = { name: 'AES-GCM', length: 256 } as const;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function b64encode(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s);
}

function b64decode(s: string): Uint8Array {
  const raw = atob(s);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { ...KDF, salt },
    baseKey,
    { name: CIPHER.name, length: CIPHER.length },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encrypt(plaintext: string, passphrase: string): Promise<EncryptedSecret> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt);
  const ct = await crypto.subtle.encrypt(
    { name: CIPHER.name, iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return {
    v: 1,
    algo: 'AES-GCM-256',
    kdf: 'PBKDF2-SHA256-250k',
    salt: b64encode(salt),
    iv: b64encode(iv),
    ct: b64encode(ct),
    createdAt: new Date().toISOString(),
  };
}

export async function decrypt(env: EncryptedSecret, passphrase: string): Promise<string> {
  if (env.v !== 1) throw new Error(`Unsupported envelope version: ${env.v}`);
  const salt = b64decode(env.salt);
  const iv = b64decode(env.iv);
  const ct = b64decode(env.ct);
  const key = await deriveKey(passphrase, salt);
  const pt = await crypto.subtle.decrypt({ name: CIPHER.name, iv }, key, ct);
  return new TextDecoder().decode(pt);
}
```

- [ ] **Step 4: Run test + verify coverage = 100%**

```bash
pnpm --filter @compass/core test keystore -- --coverage
```

Expected: all PASS; line + branch coverage = 100% for `keystore.ts`.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/crypto
git commit -m "feat(core): WebCrypto envelope at 100% coverage (PRD §5.3)"
```

---

### Task 13: `packages/core/crypto/credentials.ts` — `getActiveCredentials()` + lint rule

**Files:**

- Create: `packages/core/src/crypto/credentials.ts` + test
- Modify: `eslint.config.js` (or equivalent root config)

- [ ] **Step 1: Implement `getActiveCredentials()` and `setActiveCredentials()`**

Create `packages/core/src/crypto/credentials.ts`:

```ts
import { LlmCredentialsSchema, type LlmCredentials } from '../types/credentials';

const STORAGE_KEY = 'llm.creds.v1';

export async function getActiveCredentials(): Promise<LlmCredentials> {
  const raw = await chrome.storage.local.get(STORAGE_KEY);
  const parsed = LlmCredentialsSchema.safeParse(raw[STORAGE_KEY]);
  if (parsed.success) return parsed.data;
  return { default: null };
}

export async function setActiveCredentials(creds: LlmCredentials): Promise<void> {
  const validated = LlmCredentialsSchema.parse(creds);
  await chrome.storage.local.set({ [STORAGE_KEY]: validated });
}

export async function clearActiveCredentials(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}
```

- [ ] **Step 2: Add ESLint rule banning direct credential reads**

Add to root `eslint.config.js`:

```js
{
  files: ['**/*.ts', '**/*.tsx'],
  ignores: ['packages/core/src/crypto/credentials.ts', '**/*.test.ts'],
  rules: {
    'no-restricted-syntax': ['error', {
      selector: "CallExpression[callee.object.property.name='local'][arguments.0.value=/llm\\.creds/]",
      message: 'Use getActiveCredentials() from @compass/core/crypto instead of direct chrome.storage.local access.',
    }],
  },
}
```

- [ ] **Step 3: Add credentials test**

Create `packages/core/src/crypto/credentials.test.ts` with: stubbed `chrome.storage.local`, round-trip set→get, and "rejects malformed stored data" cases.

- [ ] **Step 4: Run lint + tests**

```bash
pnpm lint
pnpm --filter @compass/core test credentials
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/crypto/credentials.ts packages/core/src/crypto/credentials.test.ts eslint.config.js
git commit -m "feat(core): getActiveCredentials() single read site + lint rule"
```

---

### Task 14: `packages/db` — sqlite-wasm + sqlite-vec + OPFS init

**Files:**

- Modify: `packages/db/package.json` (add deps)
- Create: `packages/db/src/{init.ts,opfs.ts,index.ts}`

- [ ] **Step 1: Add deps**

Update `packages/db/package.json` dependencies:

```json
"dependencies": {
  "@sqlite.org/sqlite-wasm": "^3.46.0-build3",
  "sqlite-vec": "^0.1.6",
  "@compass/core": "workspace:*"
}
```

```bash
pnpm install
```

- [ ] **Step 2: Implement OPFS-backed sqlite init**

Create `packages/db/src/opfs.ts`:

```ts
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { load as loadVec } from 'sqlite-vec';

export type Db = Database;

let dbInstance: Db | null = null;

export async function openOpfsDatabase(): Promise<Db> {
  if (dbInstance) return dbInstance;
  const sqlite3 = await sqlite3InitModule({
    print: () => {},
    printErr: (...args) => console.error('[sqlite]', ...args),
  });
  if (!('opfs' in sqlite3)) {
    throw new Error('sqlite-wasm OPFS not available; check COOP/COEP and SAB support');
  }
  const db: Db = new sqlite3.oo1.OpfsDb('compass.sqlite3');
  loadVec(db);
  dbInstance = db;
  return db;
}

export function __resetForTests(): void {
  dbInstance = null;
}
```

- [ ] **Step 3: Implement async background init**

Create `packages/db/src/init.ts`:

```ts
import { openOpfsDatabase, type Db } from './opfs';
import { runMigrations } from './migration-runner';

let dbPromise: Promise<Db> | null = null;

export function startDb(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = openOpfsDatabase().then(async (db) => {
      await runMigrations(db);
      return db;
    });
  }
  return dbPromise;
}

export async function getDb(): Promise<Db> {
  if (!dbPromise) {
    throw new Error('startDb() must be called during heavy-doc mount');
  }
  return dbPromise;
}

export function __resetDbForTests(): void {
  dbPromise = null;
}
```

- [ ] **Step 4: Implement barrel**

Create `packages/db/src/index.ts`:

```ts
export { startDb, getDb } from './init';
export type { Db } from './opfs';
```

- [ ] **Step 5: Typecheck**

```bash
pnpm --filter @compass/db typecheck
```

Expected: PASS (note: `migration-runner` doesn't exist yet — Task 15 covers it; comment-out the import temporarily and add a TODO if needed).

- [ ] **Step 6: Commit**

```bash
git add packages/db
git commit -m "feat(db): sqlite-wasm + sqlite-vec OPFS init scaffolding"
```

---

### Task 15: Migration 0001 + idempotent migration runner

**Files:**

- Create: `packages/db/src/migrations/0001-foundation.sql`
- Create: `packages/db/src/migration-runner.ts`
- Create: `packages/db/tests/migration-runner.test.ts`

- [ ] **Step 1: Write migration**

Create `packages/db/src/migrations/0001-foundation.sql`:

```sql
CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO meta(key, value) VALUES ('schema_version', '1');

CREATE TABLE llm_cost_ledger (
  id              TEXT PRIMARY KEY,
  ts              TEXT NOT NULL,
  feature         TEXT NOT NULL,
  provider        TEXT NOT NULL,
  model           TEXT NOT NULL,
  prompt_tok      INTEGER NOT NULL,
  cached_tok      INTEGER NOT NULL,
  completion_tok  INTEGER NOT NULL,
  usd_estimated   REAL NOT NULL
);
CREATE INDEX idx_ledger_ts ON llm_cost_ledger(ts);
```

- [ ] **Step 2: Write failing test**

Create `packages/db/tests/migration-runner.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { runMigrations, getSchemaVersion } from '../src/migration-runner';

let db: any;

beforeEach(async () => {
  const sqlite3 = await sqlite3InitModule();
  db = new sqlite3.oo1.DB(':memory:');
});

describe('migration-runner', () => {
  it('applies migration 0001 on a fresh DB', async () => {
    await runMigrations(db);
    expect(getSchemaVersion(db)).toBe(1);
    const tables = db.exec({
      sql: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      returnValue: 'resultRows',
    });
    expect(tables.flat()).toContain('llm_cost_ledger');
    expect(tables.flat()).toContain('meta');
  });

  it('is idempotent — running twice does not re-apply', async () => {
    await runMigrations(db);
    await runMigrations(db);
    expect(getSchemaVersion(db)).toBe(1);
  });
});
```

- [ ] **Step 3: Run test — expect FAIL**

```bash
pnpm --filter @compass/db test
```

Expected: FAIL.

- [ ] **Step 4: Implement runner**

Create `packages/db/src/migration-runner.ts`:

```ts
import migration0001 from './migrations/0001-foundation.sql?raw';
import type { Db } from './opfs';

interface Migration {
  version: number;
  name: string;
  sql: string;
}

const MIGRATIONS: Migration[] = [{ version: 1, name: 'foundation', sql: migration0001 }];

export function getSchemaVersion(db: Db): number {
  try {
    const rows = db.exec({
      sql: "SELECT value FROM meta WHERE key='schema_version'",
      returnValue: 'resultRows',
    }) as Array<[string]>;
    return rows[0] ? parseInt(rows[0][0], 10) : 0;
  } catch {
    // meta table doesn't exist yet
    return 0;
  }
}

export async function runMigrations(db: Db): Promise<void> {
  const current = getSchemaVersion(db);
  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    db.exec('BEGIN');
    try {
      db.exec(m.sql);
      // 0001 already inserts schema_version='1'. For 0002+, the migration
      // SQL must update meta.schema_version itself.
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}
```

- [ ] **Step 5: Run test — expect PASS**

```bash
pnpm --filter @compass/db test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/migration-runner.ts packages/db/src/migrations packages/db/tests/migration-runner.test.ts
git commit -m "feat(db): migration runner + 0001-foundation (meta + llm_cost_ledger)"
```

---

### Task 16: sqlite-vec smoke test

**Files:**

- Create: `tests/db/smoke.test.ts`

- [ ] **Step 1: Write test**

Create `tests/db/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { load as loadVec } from 'sqlite-vec';

describe('sqlite-vec smoke', () => {
  it('loads and reports vec_version()', async () => {
    const sqlite3 = await sqlite3InitModule();
    const db = new sqlite3.oo1.DB(':memory:');
    loadVec(db);
    const rows = db.exec({
      sql: 'SELECT vec_version()',
      returnValue: 'resultRows',
    }) as Array<[string]>;
    expect(rows[0]?.[0]).toMatch(/^v?\d+\./);
  });
});
```

- [ ] **Step 2: Run test — expect PASS**

```bash
pnpm vitest run tests/db/smoke.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/db/smoke.test.ts
git commit -m "test(db): sqlite-vec load smoke test"
```

---

### Task 17: Wire `startDb()` into offscreen mount + ledger writes from synthetic provider

**Files:**

- Modify: `apps/extension/entrypoints/offscreen/main.ts`
- Create: `packages/llm/src/ledger.ts` + tests

- [ ] **Step 1: Implement ledger writes**

Create `packages/llm/src/ledger.ts`:

```ts
import { getDb } from '@compass/db';
import { CostLedgerRowSchema, type CostLedgerRow } from '@compass/core';

export async function recordCall(row: Omit<CostLedgerRow, 'id'>): Promise<void> {
  const validated = CostLedgerRowSchema.parse({ ...row, id: crypto.randomUUID() });
  const db = await getDb();
  db.exec({
    sql: `INSERT INTO llm_cost_ledger
          (id, ts, feature, provider, model, prompt_tok, cached_tok, completion_tok, usd_estimated)
          VALUES ($id, $ts, $feature, $provider, $model, $prompt_tok, $cached_tok, $completion_tok, $usd_estimated)`,
    bind: {
      $id: validated.id,
      $ts: validated.ts,
      $feature: validated.feature,
      $provider: validated.provider,
      $model: validated.model,
      $prompt_tok: validated.promptTok,
      $cached_tok: validated.cachedTok,
      $completion_tok: validated.completionTok,
      $usd_estimated: validated.usdEstimated,
    },
  });
}

export async function getMonthlySpend(opts: {
  monthStartIso: string;
}): Promise<{ usd: number; calls: number }> {
  const db = await getDb();
  const rows = db.exec({
    sql: `SELECT COALESCE(SUM(usd_estimated), 0) AS usd, COUNT(*) AS calls
          FROM llm_cost_ledger
          WHERE ts >= $start`,
    bind: { $start: opts.monthStartIso },
    returnValue: 'resultRows',
  }) as Array<[number, number]>;
  return { usd: rows[0]?.[0] ?? 0, calls: rows[0]?.[1] ?? 0 };
}
```

- [ ] **Step 2: Write ledger tests**

Create `packages/llm/tests/ledger.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { recordCall, getMonthlySpend } from '../src/ledger';
import { runMigrations } from '@compass/db/migration-runner';

beforeEach(async () => {
  // wire an in-memory DB into the @compass/db getDb() — see test setup helper
});

describe('cost ledger', () => {
  it('records a call and getMonthlySpend sums', async () => {
    await recordCall({
      ts: '2026-04-26T10:00:00Z',
      feature: 'system.ping',
      provider: 'openrouter',
      model: 'anthropic/claude-haiku-4-5',
      promptTok: 50,
      cachedTok: 0,
      completionTok: 20,
      usdEstimated: 0.0001,
    });
    const sum = await getMonthlySpend({ monthStartIso: '2026-04-01T00:00:00Z' });
    expect(sum.usd).toBeCloseTo(0.0001);
    expect(sum.calls).toBe(1);
  });

  it('excludes calls before the month start', async () => {
    await recordCall({
      ts: '2026-03-31T23:59:00Z',
      feature: 'system.ping',
      provider: 'openrouter',
      model: 'm',
      promptTok: 0,
      cachedTok: 0,
      completionTok: 0,
      usdEstimated: 0.5,
    });
    const sum = await getMonthlySpend({ monthStartIso: '2026-04-01T00:00:00Z' });
    expect(sum.usd).toBe(0);
  });
});
```

(Test setup helper: a `tests/setup.ts` that initializes an in-memory DB and patches `@compass/db`'s `getDb()` to return it.)

- [ ] **Step 3: Wire `startDb()` into offscreen + record-call from synthetic provider**

Modify `apps/extension/entrypoints/offscreen/main.ts`:

```ts
import { createHandlerRegistry, installRequestListener } from '@compass/runtime';
import { startDb } from '@compass/db';
import { recordCall } from '@compass/llm/ledger';

void startDb();

const registry = createHandlerRegistry();

registry.register('system.ping', async ({ utterance }) => {
  await recordCall({
    ts: new Date().toISOString(),
    feature: 'system.ping',
    provider: 'openrouter',
    model: 'synthetic-stub',
    promptTok: 0,
    cachedTok: 0,
    completionTok: 0,
    usdEstimated: 0,
  });
  return { pong: true as const, echo: utterance };
});

installRequestListener(registry);
```

- [ ] **Step 4: Manual verification**

Reload extension; click "Run ping" twice in the Tweaks panel. Verify in DevTools (offscreen frame) that `INSERT` succeeded twice; query `llm_cost_ledger` returns 2 rows.

- [ ] **Step 5: Commit**

```bash
git add packages/llm/src/ledger.ts packages/llm/tests/ledger.test.ts apps/extension/entrypoints/offscreen/main.ts
git commit -m "feat(llm): cost ledger writes + offscreen DB init wiring"
```

---

## Week 3 — Real LLM via OpenRouter

Goal: end-of-week, `gate:wired` runs a real `system.ping` against OpenRouter and the ledger gains a row with non-zero token counts.

### Task 18: Error taxonomy

**Files:**

- Create: `packages/llm/src/errors.ts` + tests

- [ ] **Step 1: Implement error classes**

Create `packages/llm/src/errors.ts`:

```ts
import type { ProviderId } from '@compass/core';

export class LlmKeyMissing extends Error {
  constructor() {
    super('No LLM key configured');
    this.name = 'LlmKeyMissing';
  }
}

export class LlmKeyInvalid extends Error {
  constructor(
    public readonly provider: ProviderId,
    message?: string,
  ) {
    super(message ?? `Invalid key for ${provider}`);
    this.name = 'LlmKeyInvalid';
  }
}

export class LlmRateLimited extends Error {
  constructor(public readonly retryAfterMs?: number) {
    super('Rate limited');
    this.name = 'LlmRateLimited';
  }
}

export class LlmUnavailable extends Error {
  constructor(
    public readonly httpStatus?: number,
    message?: string,
  ) {
    super(message ?? 'LLM unavailable');
    this.name = 'LlmUnavailable';
  }
}

export class LlmSchemaError extends Error {
  constructor(
    public readonly zodIssues: unknown,
    public readonly lastResponse: unknown,
  ) {
    super('Schema validation failed after retries');
    this.name = 'LlmSchemaError';
  }
}

export class LlmTimeout extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Timed out after ${timeoutMs}ms`);
    this.name = 'LlmTimeout';
  }
}
```

- [ ] **Step 2: Test instanceof + name + name preservation across throw/catch**

Create `packages/llm/tests/errors.test.ts` with one test per class asserting `name`, `message`, and `instanceof Error`.

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter @compass/llm test errors
git add packages/llm/src/errors.ts packages/llm/tests/errors.test.ts
git commit -m "feat(llm): error taxonomy"
```

---

### Task 19: `LlmProvider` interface + OpenRouter implementation

**Files:**

- Create: `packages/llm/src/provider.ts`, `packages/llm/src/providers/openrouter.ts`
- Add dep: `openai` (used as the OpenAI-compatible client pointed at OpenRouter)

- [ ] **Step 1: Add openai SDK dependency**

```bash
pnpm --filter @compass/llm add openai@^4
```

- [ ] **Step 2: Define `LlmProvider` per PRD §7.1**

Create `packages/llm/src/provider.ts`:

```ts
import type { z } from 'zod';
import type { ProviderId } from '@compass/core';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmRequest {
  taskId: string;
  system?: string;
  messages: LlmMessage[];
  schema?: z.ZodTypeAny;
  maxOutputTokens: number;
  temperature?: number;
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
  cacheable?: boolean;
  timeoutMs: number;
  trusted: boolean;
}

export interface LlmResponse {
  parsed?: unknown;
  text: string;
  usage: { promptTok: number; cachedTok: number; completionTok: number };
  model: string;
  finishReason: 'stop' | 'length' | 'error';
}

export interface LlmStreamEvent {
  type: 'delta' | 'done' | 'usage';
  data: unknown;
}

export interface LlmProvider {
  readonly id: ProviderId;
  complete(req: LlmRequest): Promise<LlmResponse>;
  stream(req: LlmRequest): AsyncIterable<LlmStreamEvent>;
  validateKey(apiKey: string): Promise<{ valid: boolean; error?: string }>;
}
```

- [ ] **Step 3: Implement OpenRouter via openai SDK**

Create `packages/llm/src/providers/openrouter.ts`:

```ts
import OpenAI from 'openai';
import type { z } from 'zod';
import type { LlmProvider, LlmRequest, LlmResponse, LlmStreamEvent } from '../provider';
import { LlmKeyInvalid, LlmRateLimited, LlmUnavailable, LlmTimeout } from '../errors';

export interface OpenRouterOpts {
  apiKey: string;
  baseURL?: string; // defaults to openrouter.ai/api/v1
  appUrl?: string; // optional X-Title / HTTP-Referer
}

export function createOpenRouterProvider(opts: OpenRouterOpts): LlmProvider {
  const client = new OpenAI({
    apiKey: opts.apiKey,
    baseURL: opts.baseURL ?? 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': opts.appUrl ?? 'https://compassdash.com',
      'X-Title': 'Compass',
    },
    dangerouslyAllowBrowser: true,
  });

  async function complete(req: LlmRequest, model: string): Promise<LlmResponse> {
    const messages = [
      ...(req.system ? [{ role: 'system' as const, content: req.system }] : []),
      ...req.messages,
    ];

    const response_format = req.schema
      ? {
          type: 'json_schema' as const,
          json_schema: {
            name: req.taskId.replace(/\./g, '_'),
            strict: true,
            schema: zodToJsonSchema(req.schema),
          },
        }
      : undefined;

    try {
      const resp = await client.chat.completions.create(
        {
          model,
          messages,
          max_tokens: req.maxOutputTokens,
          temperature: req.temperature,
          response_format,
        },
        { timeout: req.timeoutMs },
      );

      const choice = resp.choices[0];
      const text = choice?.message?.content ?? '';
      const parsed = req.schema ? safeJsonParse(text) : undefined;

      return {
        parsed,
        text,
        usage: {
          promptTok: resp.usage?.prompt_tokens ?? 0,
          cachedTok: resp.usage?.prompt_tokens_details?.cached_tokens ?? 0,
          completionTok: resp.usage?.completion_tokens ?? 0,
        },
        model: resp.model ?? model,
        finishReason: (choice?.finish_reason as LlmResponse['finishReason']) ?? 'stop',
      };
    } catch (err) {
      throw mapHttpError(err);
    }
  }

  return {
    id: 'openrouter',
    async complete(req) {
      // Router decides the model; provider receives it via taskId routing.
      // For Phase 1, callers pass the model in a special field — we'll wire
      // this up properly once the router exists (Task 21). Until then,
      // default to claude-haiku-4-5 for system.ping.
      const model =
        (req as LlmRequest & { _model?: string })._model ?? 'anthropic/claude-haiku-4-5';
      return complete(req, model);
    },
    async *stream() {
      throw new Error('Streaming RPC deferred until Phase 3');
      yield undefined as never;
    },
    async validateKey(apiKey) {
      try {
        const probe = new OpenAI({
          apiKey,
          baseURL: opts.baseURL ?? 'https://openrouter.ai/api/v1',
          dangerouslyAllowBrowser: true,
        });
        await probe.models.list();
        return { valid: true };
      } catch (err) {
        const mapped = mapHttpError(err);
        if (mapped instanceof LlmKeyInvalid) return { valid: false, error: 'Invalid API key' };
        return { valid: false, error: mapped.message };
      }
    },
  };
}

function mapHttpError(err: unknown): Error {
  const e = err as { status?: number; message?: string; code?: string };
  if (e.code === 'ETIMEDOUT' || /timeout/i.test(e.message ?? '')) {
    return new LlmTimeout(0);
  }
  if (e.status === 401 || e.status === 403) {
    return new LlmKeyInvalid('openrouter', e.message);
  }
  if (e.status === 429) {
    return new LlmRateLimited();
  }
  if (e.status && e.status >= 500) {
    return new LlmUnavailable(e.status, e.message);
  }
  return new LlmUnavailable(e.status, e.message);
}

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

// Lightweight zod-to-json-schema. For Phase 1's structural-only schemas,
// this naïve walker is sufficient. Full coverage lands when Phase 2 prompts
// arrive with deeper schemas.
function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  // Use the `zod-to-json-schema` package for this. Add as dep.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { zodToJsonSchema: convert } = require('zod-to-json-schema') as {
    zodToJsonSchema: (s: z.ZodTypeAny) => Record<string, unknown>;
  };
  return convert(schema);
}
```

- [ ] **Step 4: Add `zod-to-json-schema` dep**

```bash
pnpm --filter @compass/llm add zod-to-json-schema@^3
```

- [ ] **Step 5: Add fixture-based tests**

Create `packages/llm/tests/openrouter.test.ts` with mocked `fetch` returning canned OpenRouter responses for: happy path with structured output, 401, 429, 500, malformed JSON.

- [ ] **Step 6: Run + commit**

```bash
pnpm --filter @compass/llm test openrouter
git add packages/llm/src/provider.ts packages/llm/src/providers/openrouter.ts packages/llm/tests/openrouter.test.ts packages/llm/package.json
git commit -m "feat(llm): LlmProvider interface + OpenRouter implementation"
```

---

### Task 20: `callWithSchema()` retry wrapper

**Files:**

- Create: `packages/llm/src/validate.ts` + tests

- [ ] **Step 1: Write failing test**

Create `packages/llm/tests/validate.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { callWithSchema } from '../src/validate';
import { LlmSchemaError } from '../src/errors';

const schema = z.object({ pong: z.literal(true), echo: z.string() });

describe('callWithSchema', () => {
  it('returns parsed on first success', async () => {
    const provider = {
      complete: vi.fn().mockResolvedValue({
        parsed: { pong: true, echo: 'hi' },
        text: '',
        usage: { promptTok: 0, cachedTok: 0, completionTok: 0 },
        model: 'm',
        finishReason: 'stop',
      }),
    } as any;
    const out = await callWithSchema(
      provider,
      {
        taskId: 'system.ping',
        messages: [],
        maxOutputTokens: 50,
        timeoutMs: 1000,
        trusted: true,
        schema,
      },
      schema,
    );
    expect(out).toEqual({ pong: true, echo: 'hi' });
    expect(provider.complete).toHaveBeenCalledTimes(1);
  });

  it('retries up to 3 times on schema fail then throws LlmSchemaError', async () => {
    const provider = {
      complete: vi.fn().mockResolvedValue({
        parsed: { pong: false },
        text: '{"pong":false}',
        usage: { promptTok: 0, cachedTok: 0, completionTok: 0 },
        model: 'm',
        finishReason: 'stop',
      }),
    } as any;
    await expect(
      callWithSchema(
        provider,
        {
          taskId: 'system.ping',
          messages: [],
          maxOutputTokens: 50,
          timeoutMs: 1000,
          trusted: true,
          schema,
        },
        schema,
      ),
    ).rejects.toBeInstanceOf(LlmSchemaError);
    expect(provider.complete).toHaveBeenCalledTimes(3);
  });
});
```

- [ ] **Step 2: Implement**

Create `packages/llm/src/validate.ts`:

```ts
import type { z } from 'zod';
import type { LlmProvider, LlmRequest } from './provider';
import { LlmSchemaError } from './errors';

export async function callWithSchema<T>(
  provider: LlmProvider,
  req: LlmRequest,
  schema: z.ZodSchema<T>,
): Promise<T> {
  const messages = [...req.messages];
  let lastResponse: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const resp = await provider.complete({ ...req, messages, schema });
    lastResponse = resp;
    const parse = schema.safeParse(resp.parsed);
    if (parse.success) return parse.data;
    if (attempt < 2) {
      messages.push({
        role: 'user',
        content: `Your previous response failed validation: ${parse.error.message}. Return JSON matching the schema exactly.`,
      });
    } else {
      throw new LlmSchemaError(parse.error.issues, lastResponse);
    }
  }
  throw new Error('unreachable');
}
```

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter @compass/llm test validate
git add packages/llm/src/validate.ts packages/llm/tests/validate.test.ts
git commit -m "feat(llm): callWithSchema retry wrapper (PRD §7.4)"
```

---

### Task 21: Routing config + task router

**Files:**

- Create: `packages/core/src/prompts/routing.ts`, `packages/llm/src/router.ts` + tests

- [ ] **Step 1: Define routing config**

Create `packages/core/src/prompts/routing.ts`:

```ts
import type { ProviderId } from '../types/credentials';

export interface RouteConfig {
  taskId: string;
  models: Partial<Record<ProviderId, string>>;
  reasoningEffort: 'none' | 'low' | 'medium' | 'high';
  maxOutputTokens: number;
  cacheable: boolean;
  temperature?: number;
}

export const ROUTING: ReadonlyArray<RouteConfig> = [
  {
    taskId: 'system.ping',
    models: { openrouter: 'anthropic/claude-haiku-4-5' },
    reasoningEffort: 'none',
    maxOutputTokens: 50,
    cacheable: false,
  },
  // Phase 2+ adds rows here as features ship.
];

export function findRoute(taskId: string): RouteConfig | undefined {
  return ROUTING.find((r) => r.taskId === taskId);
}
```

Update `packages/core/src/index.ts`:

```ts
export * from './types';
export * from './crypto';
export { ROUTING, findRoute, type RouteConfig } from './prompts/routing';
```

- [ ] **Step 2: Implement router**

Create `packages/llm/src/router.ts`:

```ts
import { findRoute, type ProviderId } from '@compass/core';
import { getActiveCredentials } from '@compass/core';
import { createOpenRouterProvider } from './providers/openrouter';
import type { LlmProvider, LlmRequest, LlmResponse } from './provider';
import { LlmKeyMissing, LlmUnavailable } from './errors';
import { recordCall } from './ledger';

export async function executeTask<T = unknown>(
  taskId: string,
  payload: { system?: string; messages: LlmRequest['messages']; schema?: LlmRequest['schema'] },
  opts: { trusted: boolean; timeoutMs?: number } = { trusted: true },
): Promise<LlmResponse> {
  const route = findRoute(taskId);
  if (!route) throw new Error(`Unknown taskId: ${taskId}`);

  const creds = await getActiveCredentials();
  const providerId: ProviderId = creds.default ?? 'openrouter';
  const provider = await getProviderInstance(providerId, creds);
  const model = route.models[providerId];
  if (!model)
    throw new LlmUnavailable(undefined, `No model configured for ${providerId} on ${taskId}`);

  const req: LlmRequest = {
    taskId,
    system: payload.system,
    messages: payload.messages,
    schema: payload.schema,
    maxOutputTokens: route.maxOutputTokens,
    temperature: route.temperature,
    reasoningEffort: route.reasoningEffort,
    cacheable: route.cacheable,
    timeoutMs: opts.timeoutMs ?? 30_000,
    trusted: opts.trusted,
    // Phase-1 hack: thread the model through to OpenRouter via internal key
    ...({ _model: model } as Record<string, string>),
  };

  const resp = await provider.complete(req);
  await recordCall({
    ts: new Date().toISOString(),
    feature: taskId,
    provider: providerId,
    model: resp.model,
    promptTok: resp.usage.promptTok,
    cachedTok: resp.usage.cachedTok,
    completionTok: resp.usage.completionTok,
    usdEstimated: estimateUsd(providerId, model, resp.usage),
  });
  return resp;
}

async function getProviderInstance(
  id: ProviderId,
  creds: Awaited<ReturnType<typeof getActiveCredentials>>,
): Promise<LlmProvider> {
  if (id !== 'openrouter') {
    throw new LlmUnavailable(undefined, `Provider ${id} not implemented in Phase 1`);
  }
  const entry = creds.openrouter;
  if (!entry) throw new LlmKeyMissing();
  return createOpenRouterProvider({ apiKey: entry.apiKey });
}

// Cost estimation. Phase 1 uses a tiny static table; Phase 2+ refines.
function estimateUsd(
  _provider: ProviderId,
  model: string,
  usage: { promptTok: number; completionTok: number; cachedTok: number },
): number {
  // Default: $0/M. Specific models override.
  const PRICING: Record<string, { in: number; out: number }> = {
    'anthropic/claude-haiku-4-5': { in: 1.0 / 1_000_000, out: 5.0 / 1_000_000 },
  };
  const p = PRICING[model] ?? { in: 0, out: 0 };
  return usage.promptTok * p.in + usage.completionTok * p.out;
}
```

- [ ] **Step 3: Add router tests**

Create `packages/llm/tests/router.test.ts` with stubbed credentials and a mocked OpenRouter provider verifying: route lookup, key-missing → `LlmKeyMissing`, happy path writes ledger row.

- [ ] **Step 4: Run + commit**

```bash
pnpm --filter @compass/llm test router
git add packages/core/src/prompts packages/llm/src/router.ts packages/llm/tests/router.test.ts
git commit -m "feat(llm): task router + cost estimation (Phase 1: system.ping only)"
```

---

### Task 22: Wire real `system.ping` into offscreen handler

**Files:**

- Modify: `apps/extension/entrypoints/offscreen/main.ts`

- [ ] **Step 1: Replace synthetic ping with real call**

Modify `apps/extension/entrypoints/offscreen/main.ts`:

```ts
import { createHandlerRegistry, installRequestListener } from '@compass/runtime';
import { startDb } from '@compass/db';
import { executeTask } from '@compass/llm/router';
import { PingOutputSchema } from '@compass/core';
import { callWithSchema } from '@compass/llm/validate';
import { createOpenRouterProvider } from '@compass/llm/providers/openrouter';
import { getActiveCredentials } from '@compass/core';

void startDb();

const registry = createHandlerRegistry();

registry.register('system.ping', async ({ utterance }) => {
  const creds = await getActiveCredentials();
  if (!creds.openrouter) {
    // Fall back to synthetic when no key configured (dev/offline mode).
    return { pong: true as const, echo: utterance };
  }
  const provider = createOpenRouterProvider({ apiKey: creds.openrouter.apiKey });
  const out = await callWithSchema(
    provider,
    {
      taskId: 'system.ping',
      system:
        'You are a connectivity diagnostic. Respond ONLY with the literal JSON object {"pong": true, "echo": "<the user\'s utterance>"}.',
      messages: [{ role: 'user', content: `<utterance>${utterance}</utterance>` }],
      maxOutputTokens: 50,
      timeoutMs: 15_000,
      trusted: true,
      schema: PingOutputSchema,
    },
    PingOutputSchema,
  );
  return out;
});

registry.register('llm.validateKey', async ({ apiKey }) => {
  const provider = createOpenRouterProvider({ apiKey });
  return provider.validateKey(apiKey);
});

installRequestListener(registry);
```

- [ ] **Step 2: Manual verification**

Run `pnpm dev`, configure an OpenRouter key via onboarding (Task 23 wires this), click "Run ping", confirm `{ pong: true, echo: '<your input>' }` returns from a real network call.

- [ ] **Step 3: Commit**

```bash
git add apps/extension/entrypoints/offscreen/main.ts
git commit -m "feat(extension): wire real system.ping handler in offscreen"
```

---

### Task 23: Wire onboarding to real `validateLlmKey` + tailored errors

**Files:**

- Modify: `apps/extension/app/routes/onboarding/{ConnectStep.tsx,DoneStep.tsx,index.tsx}`
- Modify: `packages/agents/src/stubs/validateLlmKey.ts` (replace stub with seam call)

- [ ] **Step 1: Replace `validateLlmKey` stub with real seam**

Modify `packages/agents/src/stubs/validateLlmKey.ts`:

```ts
import { rpc } from '@compass/runtime';

export async function validateLlmKey(
  provider: 'openrouter',
  apiKey: string,
): Promise<{ valid: boolean; error?: string }> {
  return rpc('llm.validateKey', { provider, apiKey });
}
```

The function signature stays the same per the architecture seam contract.

- [ ] **Step 2: Wire onboarding ConnectStep**

Modify `apps/extension/app/routes/onboarding/ConnectStep.tsx` (Phase 0 has the UI; replace its mock-validation call):

```tsx
async function handleValidate(): Promise<void> {
  setStatus('validating');
  setError(null);
  try {
    const result = await validateLlmKey('openrouter', key);
    if (!result.valid) {
      setStatus('invalid');
      setError(humanizeValidationError(result.error));
      return;
    }
    await setActiveCredentials({
      default: 'openrouter',
      openrouter: {
        apiKey: key,
        addedAt: new Date().toISOString(),
        lastValidatedAt: new Date().toISOString(),
      },
    });
    setStatus('valid');
  } catch (err) {
    setStatus('error');
    setError(humanizeException(err));
  }
}

function humanizeValidationError(raw: string | undefined): string {
  if (!raw) return 'OpenRouter rejected the key. Double-check it begins with sk-or-v1-…';
  if (/401|invalid/i.test(raw))
    return 'OpenRouter says this key is invalid. Try generating a new one at openrouter.ai/keys.';
  if (/429|rate/i.test(raw))
    return 'OpenRouter is rate-limiting validation requests. Try again in 60 seconds.';
  if (/network|fetch/i.test(raw))
    return 'Could not reach OpenRouter. Check your network connection.';
  return `OpenRouter validation failed: ${raw}`;
}

function humanizeException(err: unknown): string {
  const e = err as Error;
  if (e.name === 'LlmTimeout') return 'OpenRouter took too long to respond. Try again.';
  if (e.name === 'LlmUnavailable')
    return 'OpenRouter appears to be down. Try again in a few minutes.';
  return e.message;
}
```

- [ ] **Step 3: Disable OpenAI/Anthropic options in WelcomeStep**

In `apps/extension/app/routes/onboarding/WelcomeStep.tsx`, render OpenAI and Anthropic provider tiles in a disabled state with a subtle "Coming in v0.2" badge. Pass `disabled` prop through the existing primitive.

- [ ] **Step 4: Add skip path on every step**

Each onboarding step renders a `<Button variant="ghost">Skip — add a key later</Button>` that calls `useShell().closeOverlay('onboarding')` without writing credentials. Verifies PRD invariant 3.

- [ ] **Step 5: Onboarding tests**

Create `apps/extension/app/routes/onboarding/index.test.tsx` covering: render, skip path, validation happy, validation invalid (mocked seam returns `{ valid: false, error: '401' }`), validation error (mocked seam throws). Plus a `jest-axe` pass.

- [ ] **Step 6: Run + commit**

```bash
pnpm --filter @compass/extension test onboarding
git add packages/agents/src/stubs/validateLlmKey.ts apps/extension/app/routes/onboarding
git commit -m "feat(onboarding): real validateLlmKey via RPC + tailored error UX"
```

---

## Week 4 — Embeddings + gate

Goal: end-of-week, `packages/embeddings/local` ships with first-use weight download, both `gate:offline` and `gate:wired` are green in CI, and the PRD/architecture docs are updated.

### Task 24: `packages/embeddings/local/runtime.ts`

**Files:**

- Modify: `packages/embeddings/local/package.json` (add deps)
- Create: `packages/embeddings/local/src/{runtime.ts,index.ts}`

- [ ] **Step 1: Add deps**

```bash
pnpm --filter @compass/embeddings add @huggingface/transformers@^3
```

- [ ] **Step 2: Implement runtime wrapper**

Create `packages/embeddings/local/src/runtime.ts`:

```ts
import { pipeline, env, type FeatureExtractionPipeline } from '@huggingface/transformers';
import { ensureWeightsDownloaded, OPFS_WEIGHTS_PATH } from './weights';

let pipe: FeatureExtractionPipeline | null = null;

export async function ensureRuntimeReady(): Promise<void> {
  if (pipe) return;
  await ensureWeightsDownloaded();
  // Configure transformers.js to load weights from OPFS rather than HF CDN.
  env.allowLocalModels = true;
  env.allowRemoteModels = false;
  env.localModelPath = OPFS_WEIGHTS_PATH;
  pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    quantized: true,
  });
}

export async function embed(text: string): Promise<Float32Array> {
  await ensureRuntimeReady();
  if (!pipe) throw new Error('runtime not ready');
  const out = await pipe(text, { pooling: 'mean', normalize: true });
  return out.data as Float32Array;
}

export function __resetForTests(): void {
  pipe = null;
}
```

- [ ] **Step 3: Barrel**

Create `packages/embeddings/local/src/index.ts`:

```ts
export { embed, ensureRuntimeReady } from './runtime';
```

- [ ] **Step 4: Commit**

```bash
git add packages/embeddings/local
git commit -m "feat(embeddings): transformers.js + MiniLM runtime wrapper"
```

---

### Task 25: SHA-verified weight download to OPFS

**Files:**

- Create: `packages/embeddings/local/src/weights.ts` + tests

- [ ] **Step 1: Write failing test**

Create `packages/embeddings/local/tests/weights.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureWeightsDownloaded, MINILM_WEIGHTS_SHA256 } from '../src/weights';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  // Mock OPFS via navigator.storage.getDirectory()
});

describe('weight download', () => {
  it('downloads, verifies SHA, and writes to OPFS on first call', async () => {
    const goodBytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    // Pre-compute MINILM_WEIGHTS_SHA256 such that goodBytes hashes to it for the test
    vi.mocked(fetch).mockResolvedValue(new Response(goodBytes, { status: 200 }));
    await ensureWeightsDownloaded();
    // Assert OPFS write
  });

  it('throws WeightsCorrupted when SHA mismatches', async () => {
    const badBytes = new Uint8Array([0, 0, 0, 0]);
    vi.mocked(fetch).mockResolvedValue(new Response(badBytes, { status: 200 }));
    await expect(ensureWeightsDownloaded()).rejects.toThrow(/SHA/);
  });
});
```

- [ ] **Step 2: Implement weights.ts**

Create `packages/embeddings/local/src/weights.ts`:

```ts
export const OPFS_WEIGHTS_PATH = '/compass/embeddings/minilm-l6-v2.int8';
export const MINILM_WEIGHTS_URL =
  'https://github.com/compass/embeddings-weights/releases/download/v1/minilm-l6-v2.int8';
export const MINILM_WEIGHTS_SHA256 = 'PLACEHOLDER_SHA_FILL_IN_WHEN_PUBLISHING_RELEASE';

export class WeightsUnavailableError extends Error {
  constructor(cause: unknown) {
    super('Embeddings weights unavailable');
    this.name = 'WeightsUnavailableError';
    this.cause = cause;
  }
}

export class WeightsCorruptedError extends Error {
  constructor() {
    super('Embeddings weights failed SHA-256 verification');
    this.name = 'WeightsCorruptedError';
  }
}

export async function ensureWeightsDownloaded(): Promise<void> {
  const dir = await navigator.storage.getDirectory();
  const compassDir = await dir.getDirectoryHandle('compass', { create: true });
  const embedDir = await compassDir.getDirectoryHandle('embeddings', { create: true });
  try {
    const existing = await embedDir.getFileHandle('minilm-l6-v2.int8');
    const file = await existing.getFile();
    if (file.size > 0) return;
  } catch {
    // not downloaded yet
  }

  let bytes: ArrayBuffer;
  try {
    const resp = await fetch(MINILM_WEIGHTS_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    bytes = await resp.arrayBuffer();
  } catch (err) {
    throw new WeightsUnavailableError(err);
  }

  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const sha = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  if (sha !== MINILM_WEIGHTS_SHA256) {
    throw new WeightsCorruptedError();
  }

  const handle = await embedDir.getFileHandle('minilm-l6-v2.int8', { create: true });
  const writable = await handle.createWritable();
  await writable.write(bytes);
  await writable.close();
}
```

- [ ] **Step 3: Run tests + commit**

The placeholder SHA must be replaced before release. Add a TODO comment + tracking issue.

```bash
pnpm --filter @compass/embeddings test weights
git add packages/embeddings/local/src/weights.ts packages/embeddings/local/tests/weights.test.ts
git commit -m "feat(embeddings): SHA-verified weight download to OPFS"
```

---

### Task 26: `gate:offline` test harness

**Files:**

- Create: `tests/gate/offline.test.ts`

- [ ] **Step 1: Write the harness**

Create `tests/gate/offline.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createInProcessRuntime } from '@compass/runtime/in-process';
import { PingOutputSchema } from '@compass/core';

let runtime: ReturnType<typeof createInProcessRuntime>;

beforeAll(async () => {
  runtime = createInProcessRuntime();
  runtime.registry.register('system.ping', async ({ utterance }) => ({
    pong: true as const,
    echo: utterance,
  }));
  await runtime.init();
});

describe('gate:offline', () => {
  it('synthetic ping returns Zod-valid structured output', async () => {
    const out = await runtime.rpc('system.ping', { utterance: 'gate-test' });
    const parsed = PingOutputSchema.safeParse(out);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.echo).toBe('gate-test');
    }
  });
});
```

- [ ] **Step 2: Add test script**

Update `apps/extension/package.json`:

```json
"scripts": {
  "test:gate:offline": "vitest run --config tests/gate/offline.config.ts"
}
```

Or, more simply, run `vitest run tests/gate/offline.test.ts` from the root.

- [ ] **Step 3: Run + commit**

```bash
pnpm vitest run tests/gate/offline.test.ts
git add tests/gate/offline.test.ts
git commit -m "test(gate): offline harness — synthetic ping"
```

---

### Task 27: `gate:wired` test harness (real OpenRouter)

**Files:**

- Create: `tests/gate/wired.test.ts`

- [ ] **Step 1: Write the harness**

Create `tests/gate/wired.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createOpenRouterProvider } from '@compass/llm/providers/openrouter';
import { callWithSchema } from '@compass/llm/validate';
import { PingOutputSchema } from '@compass/core';

const SKIP = !process.env.OPENROUTER_TEST_KEY;

(SKIP ? describe.skip : describe)('gate:wired — real OpenRouter', () => {
  let provider: ReturnType<typeof createOpenRouterProvider>;

  beforeAll(() => {
    provider = createOpenRouterProvider({ apiKey: process.env.OPENROUTER_TEST_KEY! });
  });

  it('real ping returns Zod-valid structured output', async () => {
    const out = await callWithSchema(
      provider,
      {
        taskId: 'system.ping',
        system:
          'You are a connectivity diagnostic. Respond ONLY with the literal JSON object {"pong": true, "echo": "<the user\'s utterance>"}.',
        messages: [{ role: 'user', content: '<utterance>gate-wired-test</utterance>' }],
        maxOutputTokens: 50,
        timeoutMs: 15_000,
        trusted: true,
        schema: PingOutputSchema,
      },
      PingOutputSchema,
    );
    expect(out.pong).toBe(true);
    expect(out.echo).toContain('gate-wired-test');
  }, 30_000);
});
```

- [ ] **Step 2: Commit**

```bash
git add tests/gate/wired.test.ts
git commit -m "test(gate): wired harness — real OpenRouter ping"
```

---

### Task 28: CI updates — `gate:offline` on every PR, `gate:wired` nightly

**Files:**

- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add `gate:offline` job**

Add to `.github/workflows/ci.yml`:

```yaml
gate-offline:
  name: gate:offline
  runs-on: ubuntu-latest
  needs: build
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
      with: { version: 9 }
    - uses: actions/setup-node@v4
      with: { node-version: 22, cache: pnpm }
    - run: pnpm install --frozen-lockfile
    - run: pnpm vitest run tests/gate/offline.test.ts
```

- [ ] **Step 2: Add nightly `gate:wired`**

Create `.github/workflows/gate-wired.yml`:

```yaml
name: gate-wired
on:
  schedule:
    - cron: '0 6 * * *' # daily 06:00 UTC
  workflow_dispatch:
jobs:
  wired:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm vitest run tests/gate/wired.test.ts
        env:
          OPENROUTER_TEST_KEY: ${{ secrets.OPENROUTER_TEST_KEY }}
```

- [ ] **Step 3: Configure repo secret**

Add `OPENROUTER_TEST_KEY` to GitHub repo secrets (settings → secrets → actions). Use a key with a low usage cap (PRD §7.5 budget concern; a $0.50 limit is fine for nightly pings).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows
git commit -m "ci: gate:offline on PR + gate:wired nightly"
```

---

### Task 29: Eviction-safety test

**Files:**

- Create: `tests/runtime/eviction.test.ts`

- [ ] **Step 1: Write test**

Create `tests/runtime/eviction.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { rpc, __resetForTests } from '@compass/runtime/rpc';

describe('rpc eviction safety', () => {
  it('correlates response by id even when multiple in flight', async () => {
    __resetForTests();
    const sendMessage = vi.fn().mockResolvedValue({ ok: true });
    const listeners: Array<(msg: unknown) => void> = [];
    let nextId = 0;
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage,
        onMessage: { addListener: (fn: (msg: unknown) => void) => listeners.push(fn) },
      },
    });
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => `id-${++nextId}`),
    });

    const a = rpc('system.ping', { utterance: 'a' });
    const b = rpc('system.ping', { utterance: 'b' });

    // Reply out of order
    listeners[0]!({ kind: 'rpc.response', requestId: 'id-2', result: { pong: true, echo: 'b' } });
    listeners[0]!({ kind: 'rpc.response', requestId: 'id-1', result: { pong: true, echo: 'a' } });

    expect(await a).toEqual({ pong: true, echo: 'a' });
    expect(await b).toEqual({ pong: true, echo: 'b' });
  });
});
```

- [ ] **Step 2: Commit**

```bash
pnpm vitest run tests/runtime/eviction.test.ts
git add tests/runtime/eviction.test.ts
git commit -m "test(runtime): RPC request-id correlation under out-of-order replies"
```

---

### Task 30: Update `docs/architecture.md`

**Files:**

- Modify: `docs/architecture.md`

- [ ] **Step 1: Add new sections**

Add to `docs/architecture.md`:

- **Heavy-doc + RPC** section: documents `HeavyRuntime`, the `Routes` registry, `ensureHeavyDoc()`, the request-id correlation pattern, eviction-safety assumptions.
- **Migrations policy** section: numbered `NNNN-<name>.sql` files, `meta.schema_version` invariant, additive-only rule.
- **Credential read pattern** section: `getActiveCredentials()` is the only call site; lint rule references; future encrypted-storage migration is a one-function edit.
- Update the **Integration seams** table: `validateLlmKey` "Real impl sprint" column changes from "Phase 1" to "Phase 1 (OpenRouter only); Phase 1.5 adds OpenAI + Anthropic direct."

- [ ] **Step 2: Commit**

```bash
git add docs/architecture.md
git commit -m "docs(architecture): heavy-doc, RPC, migrations, credential read pattern"
```

---

### Task 31: Update PRD §17 to reflect Phase 1 / Phase 1.5 scope shift

**Files:**

- Modify: `docs/prd.md`

- [ ] **Step 1: Update §17 Phase 1**

Replace:

```
- `packages/llm/provider` + OpenAI + Anthropic implementations; task router; cost ledger.
```

With:

```
- `packages/llm/provider` + OpenRouter implementation (BYOK); task router; cost ledger.
- (OpenAI direct + Anthropic direct moved to Phase 1.5; PKCE OAuth onboarding for OpenRouter remains in Phase 4 alongside Gmail OAuth.)
```

- [ ] **Step 2: Update §17 Phase 1.5**

Add after the current Phase 1.5 bullets:

```
- `packages/llm/providers/openai` direct + `packages/llm/providers/anthropic` direct, populating the multi-key shape shipped in Phase 1.
- Settings affordance to add a second/third provider key.
- Encrypted-storage opt-in wiring (crypto package shipped + tested in Phase 1; this sprint surfaces it in onboarding).
```

- [ ] **Step 3: Commit**

```bash
git add docs/prd.md
git commit -m "docs(prd): Phase 1 → OpenRouter; Phase 1.5 picks up direct providers + encryption wiring"
```

---

### Task 32: Final gate ceremony

- [ ] **Step 1: Local ceremony**

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm vitest run tests/gate/offline.test.ts
OPENROUTER_TEST_KEY=<your-low-budget-key> pnpm vitest run tests/gate/wired.test.ts
```

All commands pass.

- [ ] **Step 2: Push branch + verify PR CI**

`gate:offline` green on the PR. Open the PR; the nightly cron will run `gate:wired` overnight.

- [ ] **Step 3: Verify gate criteria**

| Gate criterion                                       | Verified by                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------- |
| Any `LlmProvider` method callable from offscreen E2E | `gate:wired` passes; `tests/gate/wired.test.ts` succeeds                  |
| Crypto unit tests at 100% line + branch              | `pnpm --filter @compass/core test crypto -- --coverage` reports 100%      |
| Sample `ping` task returns structured output         | Both gate tests assert `PingOutputSchema.safeParse(out).success === true` |

- [ ] **Step 4: Tag**

```bash
git tag phase-1-foundation
git push origin phase-1-foundation
```

---

## Self-review notes

**Spec coverage:** every Phase-1 deliverable from the spec maps to one or more tasks above. Cross-reference:

- Runtime + RPC → Tasks 1–7, 29
- Synthetic ping → Tasks 7–8
- Zod schemas → Tasks 9–11
- Crypto → Tasks 12–13
- DB → Tasks 14–17
- LLM (errors, provider, validate, router) → Tasks 18–22
- Embeddings → Tasks 24–25
- Onboarding → Task 23
- Gate harnesses → Tasks 26–28
- Doc + PRD updates → Tasks 30–31, 32

**Type consistency:** `LlmRequest` shape used in Task 19 (provider), Task 20 (validate wrapper), Task 21 (router) all reference the same fields. `LlmResponse.usage` uses `promptTok / cachedTok / completionTok` consistently across provider, ledger, and router. `ProviderId` from `@compass/core` is the single source of truth.

**Open placeholder:** `MINILM_WEIGHTS_SHA256` is intentionally a placeholder in Task 25 — it must be filled in when the weights release is published. Tracked in TODO.
