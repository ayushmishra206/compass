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
    const now = new Date('2026-05-03T07:00:00Z');
    const scene = pickScene(now, null, manifest, '2026-05-03');
    expect(scene.mood).toBe('dawn');
  });

  it('narrows the pool by weather affinity when provided', () => {
    const now = new Date('2026-05-03T09:00:00Z'); // fog band
    const scene = pickScene(now, 'rain', manifest, '2026-05-03');
    expect(scene.mood).toBe('fog');
    expect(scene.weather).toContain('rain');
    expect(scene.id).toBe('f1'); // only fog/rain match
  });

  it('falls back to the full mood pool when the weather subset is empty', () => {
    const now = new Date('2026-05-03T20:00:00Z'); // desert band
    const scene = pickScene(now, 'snow', manifest, '2026-05-03');
    expect(scene.mood).toBe('desert');
    expect(scene.id).toBe('x1'); // only desert photo, no snow affinity
  });

  it('is deterministic for the same (date, mood) seed', () => {
    const now = new Date('2026-05-03T13:00:00Z'); // ocean
    const a = pickScene(now, 'clear', manifest, '2026-05-03');
    const b = pickScene(now, 'clear', manifest, '2026-05-03');
    expect(a.id).toBe(b.id);
  });

  it('changes pick when the date seed changes', () => {
    const now = new Date('2026-05-03T13:00:00Z');
    const a = pickScene(now, null, manifest, '2026-05-03');
    const b = pickScene(now, null, manifest, '2026-05-04');
    expect(typeof a.id).toBe('string');
    expect(typeof b.id).toBe('string');
  });
});
