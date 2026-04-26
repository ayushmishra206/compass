import { ACCENTS, type AccentName } from '../tokens.js';

/**
 * Apply an accent swatch by writing its `{h, c, l}` triple to CSS custom
 * properties on `el` (default: `<html>`). Cheap — callers can invoke on every
 * accent change.
 */
export function applyAccent(name: AccentName, el: HTMLElement = document.documentElement): void {
  const { h, c, l } = ACCENTS[name];
  el.style.setProperty('--accent-h', String(h));
  el.style.setProperty('--accent-c', String(c));
  el.style.setProperty('--accent-l', String(l));
}

export { ACCENTS, type AccentName };
