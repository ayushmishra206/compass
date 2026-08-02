import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards against the token-naming bifurcation that shipped undefined colours:
 * components referenced `var(--ink)` / `var(--panel)` / `var(--sh-1)` while
 * theme.css only ever defined `--color-ink` / `--color-panel` / `--shadow-1`.
 * Every component rendered those slots with no value at all.
 */

// jsdom rewrites import.meta.url to a non-file scheme, so resolve from the
// package root that vitest is invoked in instead.
const srcDir = join(process.cwd(), 'src');

function readAllSources(dirs: string[]): Array<{ file: string; text: string }> {
  const out: Array<{ file: string; text: string }> = [];
  for (const dir of dirs) {
    for (const entry of readdirSync(join(srcDir, dir))) {
      if (!entry.endsWith('.tsx') && !entry.endsWith('.ts')) continue;
      if (entry.includes('.test.')) continue;
      out.push({ file: `${dir}/${entry}`, text: readFileSync(join(srcDir, dir, entry), 'utf8') });
    }
  }
  return out;
}

function definedTokens(): Set<string> {
  const css = readFileSync(join(srcDir, 'theme.css'), 'utf8');
  const names = css.match(/^\s*(--[a-z0-9-]+)\s*:/gm) ?? [];
  return new Set(names.map((n) => n.replace(/[\s:]/g, '')));
}

describe('theme tokens', () => {
  const defined = definedTokens();
  const sources = readAllSources(['components', 'primitives']);

  it('finds sources to scan', () => {
    expect(sources.length).toBeGreaterThan(10);
    expect(defined.size).toBeGreaterThan(20);
  });

  it.each(sources)('$file references only tokens defined in theme.css', ({ text }) => {
    const used = [...text.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1] as string);
    const undefinedTokens = [...new Set(used)].filter((t) => !defined.has(t));
    expect(undefinedTokens).toEqual([]);
  });

  it('has no short-form aliases left anywhere in the package', () => {
    const legacy = /var\(--(ink|bg|hair|panel|sh-\d)(-\d)?\)/;
    const offenders = sources.filter((s) => legacy.test(s.text)).map((s) => s.file);
    expect(offenders).toEqual([]);
  });
});
