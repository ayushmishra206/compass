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
 * - pick one via hashSeed(dateSeed + mood) % pool.length
 *
 * Same (date, mood, weather) inputs ALWAYS produce the same scene.
 *
 * Throws if the manifest has no scenes for the picked mood — the manifest
 * is malformed and should be fixed at the source.
 */
export function pickScene(
  now: Date,
  weather: WxAffinity | null,
  manifest: SceneManifest,
  dateSeed: string,
): Scene {
  const mood = pickMoodByHour(now.getHours());
  const moodPool = manifest.scenes.filter((s) => s.mood === mood);
  if (moodPool.length === 0) {
    throw new Error(`scene manifest has no scenes for mood "${mood}"`);
  }
  const subset = weather ? moodPool.filter((s) => s.weather.includes(weather)) : moodPool;
  const pool = subset.length > 0 ? subset : moodPool;
  const seed = hashSeed(dateSeed + mood);
  const scene = pool[seed % pool.length];
  if (!scene) {
    throw new Error(`scene picker logic broken: pool is empty after safety check`);
  }
  return scene;
}
