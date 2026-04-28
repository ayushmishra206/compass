import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@compass/core': path.resolve(__dirname, './packages/core/src'),
      '@compass/runtime': path.resolve(__dirname, './packages/runtime/src'),
      '@compass/runtime/in-process': path.resolve(
        __dirname,
        './packages/runtime/src/in-process.ts',
      ),
      '@compass/runtime/rpc': path.resolve(__dirname, './packages/runtime/src/rpc.ts'),
      '@compass/llm': path.resolve(__dirname, './packages/llm/src'),
      '@compass/db': path.resolve(__dirname, './packages/db/src'),
      '@compass/embeddings': path.resolve(__dirname, './packages/embeddings/src'),
      '@compass/agents': path.resolve(__dirname, './packages/agents/src'),
      '@compass/integrations': path.resolve(__dirname, './packages/integrations/src'),
    },
  },
  test: {
    globals: true,
    // Default include covers per-package tests (`packages/*/src/**/*.test.ts`,
    // `packages/*/tests/**/*.test.ts`, `apps/*/app/**/*.test.tsx`) plus the
    // repo-root `tests/` directory used for cross-package contract + gate
    // harnesses. Each package's `pnpm test` invokes vitest from that
    // package's cwd, so vitest's default include discovers tests within that
    // package; this root config inherits the default and only adds the
    // workspace-resolution aliases above.
  },
});
