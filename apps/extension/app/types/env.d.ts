/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  /** Overrides the scene manifest host at build time. */
  readonly VITE_SCENE_MANIFEST_URL?: string;
}
