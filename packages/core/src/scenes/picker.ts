import { hashSeed } from './hash.js';
import type { Mood, Scene, SceneManifest, WxAffinity } from './types.js';

/**
 * Maps a 0..23 hour to one of five mood bands.
 * Boundaries are inclusive at the start: [0..7]=dawn, [8..11]=fog,
 * [12..15]=ocean, [16..19]=alpine, [20..23]=desert.
 */
export function pickMoodByHour(h: number): Mood {
  if (h < 8) return 'dawn';
  if (h < 12) return 'fog';
  if (h < 16) return 'ocean';
  if (h < 20) return 'alpine';
  return 'desert';
}

/**
 * Picks a scene deterministically for a given (date, mood-band) seed.
 *
 * - mood = pickMoodByHour(now.getHours())
 * - filter manifest by mood
 * - if weather provided, narrow to scenes whose weather affinity includes it
 * - if narrowed subset is empty, fall back to full mood pool
 * - if `favorites` is non-empty AND at least one favorite is in the pool,
 *   bias ~70% of seeds toward favorites-in-pool; the remaining ~30% still
 *   draws from the full pool so the picker keeps surfacing photos the user
 *   has not yet hearted
 * - otherwise pick via hashSeed(dateSeed + mood) % pool.length
 *
 * Same (date, mood, weather, favorites) inputs ALWAYS produce the same scene.
 *
 * Throws if the manifest has no scenes for the picked mood — the manifest
 * is malformed and should be fixed at the source.
 */
export function pickScene(
  now: Date,
  weather: WxAffinity | null,
  manifest: SceneManifest,
  dateSeed: string,
  favorites: readonly string[] = [],
): Scene {
  const mood = pickMoodByHour(now.getHours());
  const moodPool = manifest.scenes.filter((s) => s.mood === mood);
  if (moodPool.length === 0) {
    throw new Error(`scene manifest has no scenes for mood "${mood}"`);
  }
  const subset = weather ? moodPool.filter((s) => s.weather.includes(weather)) : moodPool;
  const pool = subset.length > 0 ? subset : moodPool;
  const seed = hashSeed(dateSeed + mood);

  if (favorites.length > 0) {
    const favoriteSet = new Set(favorites);
    const favoritesInPool = pool.filter((s) => favoriteSet.has(s.sha256));
    if (favoritesInPool.length > 0 && seed % 10 < 7) {
      const favoritePick = favoritesInPool[seed % favoritesInPool.length];
      if (favoritePick) return favoritePick;
    }
  }

  const scene = pool[seed % pool.length];
  if (!scene) {
    throw new Error(`scene picker logic broken: pool is empty after safety check`);
  }
  return scene;
}
