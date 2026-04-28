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
    include: ['tests/**/*.test.ts'],
  },
});
