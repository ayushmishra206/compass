/**
 * Block-pattern normalisation.
 *
 * Users type "reddit.com", "https://reddit.com/r/all", "www.reddit.com" or
 * " Reddit.com/ " and mean the same thing. Everything is reduced to a bare
 * registrable hostname so the same site cannot be added twice under three
 * spellings, and so the stored value never carries a path or query that would
 * leak browsing detail into the database.
 */

export function normalizeBlockPattern(raw: string): string | null {
  let value = raw.trim().toLowerCase();
  if (!value) return null;

  // Strip a scheme if present, then anything from the first slash, ? or #.
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  value = value.split(/[/?#]/)[0] ?? '';
  // Drop credentials and port.
  value = value.split('@').pop() ?? '';
  value = value.split(':')[0] ?? '';
  // "www." is never meaningfully distinct from the bare host for blocking.
  value = value.replace(/^www\./, '');

  if (!value) return null;
  // Require at least one dot and only host-legal characters. This rejects
  // "reddit", "*", and anything that would silently become a broken DNR rule.
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(value)) return null;
  if (value.length > 253) return null;

  return value;
}

/** Whether a hostname is covered by a pattern, including its subdomains. */
export function matchesPattern(hostname: string, pattern: string): boolean {
  const h = hostname
    .trim()
    .toLowerCase()
    .replace(/^www\./, '');
  return h === pattern || h.endsWith(`.${pattern}`);
}
