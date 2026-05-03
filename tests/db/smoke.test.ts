import { describe, it } from 'vitest';

// Phase 1 smoke test for sqlite-vec linkage in our production stack
// (`@sqlite.org/sqlite-wasm` running inside the Chrome offscreen document).
//
// We deliberately skip this in Node-side vitest because sqlite-wasm's Node
// build does not expose `loadExtension()`, and switching to a different
// SQLite distribution (e.g., better-sqlite3) would test the wrong stack.
// The real verification lives in the manual browser smoke during the Phase 1
// gate ceremony (Task 32) — load the unpacked extension, open the offscreen
// devtools, and confirm `SELECT vec_version()` returns a non-empty version.
//
// When sqlite-wasm gains a Node-friendly extension-loading path (or we
// switch to `sqlite-vec-wasm-demo` at consumption-time), upgrade this from
// `todo` to a runnable test.
describe('sqlite-vec smoke', () => {
  it.todo('loads and reports vec_version() in our production sqlite-wasm stack');
});
