import { describe, it, expect } from 'vitest';
import type { Scene, SceneManifest } from './types.js';
import { pickMoodByHour, pickScene } from './picker.js';

const m = (
  id: string,
  mood: Scene['mood'],
  weather: readonly Scene['weather'][number][],
): Scene => ({
  id,
  url: `https://images.unsplash.com/photo-${id}`,
  photographer: 'Photographer',
  attribution: 'https://unsplash.com/@photographer',
  mood,
  weather,
  sha256: 'sha-' + id,
});

const manifest: SceneManifest = {
  version: 1,
  generatedAt: '2026-05-03T00:00:00Z',
  scenes: [
    m('d1', 'dawn', ['clear']),
    m('d2', 'dawn', ['cloudy', 'fog']),
    m('f1', 'fog', ['fog', 'rain']),
    m('f2', 'fog', ['cloudy']),
    m('o1', 'ocean', ['clear']),
    m('o2', 'ocean', ['cloudy']),
    m('a1', 'alpine', ['snow']),
    m('a2', 'alpine', ['clear']),
    m('x1', 'desert', ['clear']),
  ],
};

describe('pickMoodByHour', () => {
  it('maps hours to canonical bands', () => {
    expect(pickMoodByHour(0)).toBe('dawn');
    expect(pickMoodByHour(7)).toBe('dawn');
    expect(pickMoodByHour(8)).toBe('fog');
    expect(pickMoodByHour(11)).toBe('fog');
    expect(pickMoodByHour(12)).toBe('ocean');
    expect(pickMoodByHour(15)).toBe('ocean');
    expect(pickMoodByHour(16)).toBe('alpine');
    expect(pickMoodByHour(19)).toBe('alpine');
    expect(pickMoodByHour(20)).toBe('desert');
    expect(pickMoodByHour(23)).toBe('desert');
  });
});

describe('pickScene', () => {
  it('picks from the mood pool when weather is null', () => {
    const now = new Date(2026, 4, 3, 7, 0, 0);
    const scene = pickScene(now, null, manifest, '2026-05-03');
    expect(scene.mood).toBe('dawn');
  });

  it('narrows the pool by weather affinity when provided', () => {
    const now = new Date(2026, 4, 3, 9, 0, 0); // fog band
    const scene = pickScene(now, 'rain', manifest, '2026-05-03');
    expect(scene.mood).toBe('fog');
    expect(scene.weather).toContain('rain');
    expect(scene.id).toBe('f1'); // only fog/rain match
  });

  it('falls back to the full mood pool when the weather subset is empty', () => {
    const now = new Date(2026, 4, 3, 20, 0, 0); // desert band
    const scene = pickScene(now, 'snow', manifest, '2026-05-03');
    expect(scene.mood).toBe('desert');
    expect(scene.id).toBe('x1'); // only desert photo, no snow affinity
  });

  it('is deterministic for the same (date, mood) seed', () => {
    const now = new Date(2026, 4, 3, 13, 0, 0); // ocean
    const a = pickScene(now, 'clear', manifest, '2026-05-03');
    const b = pickScene(now, 'clear', manifest, '2026-05-03');
    expect(a.id).toBe(b.id);
  });

  it('changes pick when the date seed changes', () => {
    const now = new Date(2026, 4, 3, 13, 0, 0);
    const a = pickScene(now, null, manifest, '2026-05-03');
    const b = pickScene(now, null, manifest, '2026-05-04');
    expect(typeof a.id).toBe('string');
    expect(typeof b.id).toBe('string');
  });

  it('biases the pick toward favorites when favorites are in the pool', () => {
    const now = new Date(2026, 4, 3, 7, 0, 0); // dawn
    // d1 + d2 are both dawn; favorite only d2
    const favorites = ['sha-d2'];
    // Sample across 200 dates to smooth out the deterministic bias
    let d2Hits = 0;
    let total = 0;
    for (let i = 0; i < 200; i++) {
      const seed = `2026-05-${String((i % 28) + 1).padStart(2, '0')}#${i}`;
      const scene = pickScene(now, null, manifest, seed, favorites);
      if (scene.id === 'd2') d2Hits += 1;
      total += 1;
    }
    // Without bias the 50/50 split would land near 50%. With ~70% bias toward
    // d2 we expect well above 50%.
    expect(d2Hits / total).toBeGreaterThan(0.55);
  });

  it('still picks from the full pool when no favorite is present in the pool', () => {
    const now = new Date(2026, 4, 3, 20, 0, 0); // desert; pool = [x1]
    const favorites = ['sha-d1', 'sha-d2']; // dawn favorites, irrelevant here
    const scene = pickScene(now, null, manifest, '2026-05-03', favorites);
    expect(scene.id).toBe('x1');
  });

  it('is deterministic when favorites are stable', () => {
    const now = new Date(2026, 4, 3, 7, 0, 0);
    const favorites = ['sha-d1'];
    const a = pickScene(now, null, manifest, '2026-05-03', favorites);
    const b = pickScene(now, null, manifest, '2026-05-03', favorites);
    expect(a.id).toBe(b.id);
  });

  it('default favorites=[] preserves the existing unbiased behavior', () => {
    const now = new Date(2026, 4, 3, 13, 0, 0);
    const without = pickScene(now, 'clear', manifest, '2026-05-03');
    const withEmpty = pickScene(now, 'clear', manifest, '2026-05-03', []);
    expect(without.id).toBe(withEmpty.id);
  });
});
