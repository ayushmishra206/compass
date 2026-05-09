import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const EXT_ROOT = path.resolve(here, '../../..');
const REPO_ROOT = path.resolve(EXT_ROOT, '../..');
const OUTPUT = path.join(EXT_ROOT, '.output/chrome-mv3');
const MANIFEST = path.join(OUTPUT, 'manifest.json');

const PACKAGES_DIR = path.resolve(REPO_ROOT, 'packages');

function workspacePackageSrcRoots(): string[] {
  // Watch every workspace package's src/ directory rather than enumerating —
  // the extension bundles them transitively and any miss produces a stale
  // build that silently passes the e2e suite.
  if (!fs.existsSync(PACKAGES_DIR)) return [];
  return fs
    .readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(PACKAGES_DIR, entry.name, 'src'))
    .filter((p) => fs.existsSync(p));
}

const SOURCE_ROOTS = [
  path.join(EXT_ROOT, 'entrypoints'),
  path.join(EXT_ROOT, 'app'),
  path.join(EXT_ROOT, 'wxt.config.ts'),
  ...workspacePackageSrcRoots(),
];

function newestMtime(target: string): number {
  let max = 0;
  const stat = fs.statSync(target);
  if (stat.isFile()) return stat.mtimeMs;
  for (const entry of fs.readdirSync(target, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile()) continue;
    const parent = (entry as fs.Dirent & { parentPath?: string }).parentPath ?? target;
    const full = path.join(parent, entry.name);
    try {
      const m = fs.statSync(full).mtimeMs;
      if (m > max) max = m;
    } catch {
      /* ignore vanished files */
    }
  }
  return max;
}

function buildIsStale(): boolean {
  if (!fs.existsSync(MANIFEST)) return true;
  const builtAt = fs.statSync(MANIFEST).mtimeMs;
  for (const root of SOURCE_ROOTS) {
    if (!fs.existsSync(root)) continue;
    if (newestMtime(root) > builtAt) return true;
  }
  return false;
}

export default async function globalSetup(): Promise<void> {
  if (!buildIsStale()) {
    console.log(`[e2e] using existing build at ${path.relative(REPO_ROOT, OUTPUT)}`);
    return;
  }
  console.log('[e2e] build is missing or stale, running pnpm build…');
  execSync('pnpm --filter @compass/extension build', {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  if (!fs.existsSync(MANIFEST)) {
    throw new Error(`build completed but manifest not found at ${MANIFEST}`);
  }
}
