import '@testing-library/jest-dom/vitest';
import 'jest-axe/extend-expect';

// Minimal chrome API stub for unit tests running in jsdom (no real extension context).
if (typeof globalThis.chrome === 'undefined') {
  globalThis.chrome = {
    storage: {
      local: {
        get: async () => ({}),
        set: async () => undefined,
        remove: async () => undefined,
      },
      session: {
        get: async () => ({}),
        set: async () => undefined,
        remove: async () => undefined,
      },
    },
  } as unknown as typeof chrome;
}
