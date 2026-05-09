/**
 * Compass Stage scenes — types
 *
 * The manifest is hosted at assets.compassdash.com/scenes/manifest.v1.json
 * and is fetched on app mount with a 7-day stale-while-revalidate TTL.
 * Each scene's image bytes are hotlinked from images.unsplash.com per
 * Unsplash's API terms (hotlinking permitted, rehosting not).
 */

export type Mood = 'dawn' | 'fog' | 'ocean' | 'alpine' | 'desert';
export type WxAffinity = 'clear' | 'cloudy' | 'rain' | 'snow' | 'fog' | 'storm';

export interface Scene {
  /** Unsplash photo ID; doubles as cache key */
  id: string;
  /** images.unsplash.com hotlink URL */
  url: string;
  /** Photographer display name for attribution */
  photographer: string;
  /** Photographer's Unsplash profile URL */
  attribution: string;
  /** Time-of-day mood band */
  mood: Mood;
  /** Weather affinities (1..N) — picker narrows the mood pool by these */
  weather: readonly WxAffinity[];
  /** SHA-256 of the image bytes; cache key for OPFS */
  sha256: string;
  /** Optional blurhash for placeholder render */
  blurhash?: string;
}

export interface SceneManifest {
  version: 1;
  generatedAt: string; // ISO timestamp
  scenes: readonly Scene[];
}

export interface WeatherCache {
  lat: number; // rounded to 3 decimals (~10 km)
  lon: number;
  code: number; // WMO weather code 0..99
  tempC: number;
  affinity: WxAffinity;
  fetchedAt: number; // ms since epoch
}
