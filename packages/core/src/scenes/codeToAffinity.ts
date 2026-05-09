import type { WxAffinity } from './types.js';

/**
 * WMO weather code (0..99) → Compass weather affinity for scene picker.
 * See https://open-meteo.com/en/docs for the canonical code table.
 */
export function codeToAffinity(code: number): WxAffinity {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2 || code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (
    code === 51 ||
    code === 53 ||
    code === 55 ||
    code === 56 ||
    code === 57 ||
    code === 61 ||
    code === 63 ||
    code === 65 ||
    code === 66 ||
    code === 67 ||
    code === 80 ||
    code === 81 ||
    code === 82
  ) {
    return 'rain';
  }
  if (code === 71 || code === 73 || code === 75 || code === 77 || code === 85 || code === 86) {
    return 'snow';
  }
  if (code === 95 || code === 96 || code === 99) return 'storm';
  return 'cloudy';
}
