// Vite emits .wasm assets when imported with the ?url suffix. Wildcard form so
// any package transitively typechecking openOpfsDatabase (e.g. @compass/integrations
// via @compass/db) sees this declaration. Ambient declarations like this require
// script-mode (no top-level import/export), hence the dedicated .d.ts file.
declare module '*?url' {
  const url: string;
  export default url;
}

// Vite's worker import suffix. Returns a constructor that instantiates the
// bundled worker; the bare `new URL(...)` form is NOT transformed when the
// module lives in a workspace package, and emits the raw .ts path.
declare module '*?worker' {
  const WorkerConstructor: new () => Worker;
  export default WorkerConstructor;
}
