/**
 * FNV-1a 32-bit hash. Deterministic, dependency-free, fits in a uint32.
 *
 * Used by the scene picker to seed (date, mood-band) → scene selection so
 * every new tab on the same day in the same mood band lands on the same
 * scene.
 */
export function hashSeed(input: string): number {
  let h = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    // Multiply by FNV prime and constrain to 32 bits.
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}
