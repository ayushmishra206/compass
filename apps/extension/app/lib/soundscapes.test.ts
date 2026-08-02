import { describe, expect, it, vi } from 'vitest';
import { SOUNDSCAPES, startSoundscape } from './soundscapes';

/** Minimal Web Audio stand-in — jsdom ships none. */
function fakeCtx() {
  const started: string[] = [];
  // Distinct nodes per call: the output gain and the LFO depth gain are
  // different objects, and sharing one made the LFO clobber the volume.
  const gains: Array<{ gain: { value: number }; connect: (n: unknown) => unknown }> = [];
  const makeGain = () => {
    const g = { gain: { value: 0 }, connect: (n: unknown) => n };
    gains.push(g);
    return g;
  };
  const ctx = {
    sampleRate: 44100,
    destination: {},
    createBuffer: (_c: number, len: number) => ({ getChannelData: () => new Float32Array(len) }),
    createBufferSource: () => ({
      buffer: null,
      loop: false,
      connect: (n: unknown) => n,
      start: () => started.push('source'),
      stop: () => started.push('source-stop'),
    }),
    createBiquadFilter: () => ({
      type: '',
      frequency: { value: 0 },
      Q: { value: 0 },
      connect: (n: unknown) => n,
    }),
    createGain: makeGain,
    createOscillator: () => ({
      frequency: { value: 0 },
      connect: (n: unknown) => n,
      start: () => started.push('lfo'),
      stop: () => started.push('lfo-stop'),
    }),
    close: vi.fn(async () => {}),
  };
  // The output gain is created before the LFO depth gain.
  return { ctx: ctx as unknown as AudioContext, started, gains, outGain: () => gains[0]! };
}

describe('SOUNDSCAPES', () => {
  it('every entry has a stable id and a name', () => {
    for (const s of SOUNDSCAPES) {
      expect(s.id).toMatch(/^[a-z]+$/);
      expect(s.name.length).toBeGreaterThan(0);
    }
  });

  it('ids are unique — they key soundscape correlations', () => {
    expect(new Set(SOUNDSCAPES.map((s) => s.id)).size).toBe(SOUNDSCAPES.length);
  });
});

describe('startSoundscape', () => {
  it('starts the source and the modulating oscillator', () => {
    const f = fakeCtx();
    const handle = startSoundscape('rain', { ctxFactory: () => f.ctx });
    expect(handle).not.toBeNull();
    expect(f.started).toContain('source');
    expect(f.started).toContain('lfo');
  });

  it('applies the requested volume', () => {
    const f = fakeCtx();
    startSoundscape('rain', { volume: 0.8, ctxFactory: () => f.ctx });
    expect(f.outGain().gain.value).toBe(0.8);
  });

  it('clamps volume changes to 0..1', () => {
    const f = fakeCtx();
    const h = startSoundscape('rain', { ctxFactory: () => f.ctx })!;
    h.setVolume(5);
    expect(f.outGain().gain.value).toBe(1);
    h.setVolume(-2);
    expect(f.outGain().gain.value).toBe(0);
  });

  it('stops cleanly', () => {
    const f = fakeCtx();
    const h = startSoundscape('rain', { ctxFactory: () => f.ctx })!;
    h.stop();
    expect(f.started).toContain('source-stop');
  });

  it('is safe to stop twice', () => {
    const f = fakeCtx();
    const h = startSoundscape('rain', { ctxFactory: () => f.ctx })!;
    h.stop();
    expect(() => h.stop()).not.toThrow();
  });

  it('degrades to silence when Web Audio is unavailable, rather than throwing', () => {
    const handle = startSoundscape('rain', {
      ctxFactory: () => {
        throw new Error('no audio device');
      },
    });
    // Starting a pomodoro must never fail because a sound could not play.
    expect(handle).toBeNull();
  });

  it('handles every declared soundscape id', () => {
    for (const s of SOUNDSCAPES) {
      const f = fakeCtx();
      expect(startSoundscape(s.id, { ctxFactory: () => f.ctx })).not.toBeNull();
    }
  });
});
