/**
 * Soundscapes, synthesised rather than streamed.
 *
 * Shipping loopable audio would add megabytes to the bundle for four sounds,
 * and any loop short enough to ship is short enough to notice repeating.
 * These are generated with the Web Audio API: noise shaped by filters and slow
 * LFOs, so nothing repeats and the bundle cost is zero.
 */

export interface SoundscapeDef {
  id: string;
  name: string;
  description: string;
}

export const SOUNDSCAPES: SoundscapeDef[] = [
  { id: 'rain', name: 'Rain on leaves', description: 'Filtered noise, slow swell' },
  { id: 'pink', name: 'Deep pink noise', description: 'Even, wide, no character' },
  { id: 'brown', name: 'Distant surf', description: 'Low rumble, long waves' },
  { id: 'cafe', name: 'Room tone', description: 'Muffled band, gentle motion' },
];

const NOISE_SECONDS = 4;

/** Pink-ish noise via the Voss-McCartney-style running-sum approximation. */
function fillPink(data: Float32Array): void {
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
}

function fillBrown(data: Float32Array): void {
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
}

export interface SoundscapeHandle {
  stop(): void;
  setVolume(v: number): void;
}

interface AudioCtor {
  new (): AudioContext;
}

/**
 * Starts a soundscape. Returns a handle; the caller owns stopping it.
 *
 * `ctxFactory` is injectable so this is testable without a real audio device —
 * jsdom has no Web Audio implementation.
 */
export function startSoundscape(
  id: string,
  opts: { volume?: number; ctxFactory?: () => AudioContext } = {},
): SoundscapeHandle | null {
  const factory =
    opts.ctxFactory ??
    (() => {
      const Ctor = (globalThis as unknown as { AudioContext?: AudioCtor }).AudioContext;
      if (!Ctor) throw new Error('Web Audio unavailable');
      return new Ctor();
    });

  let ctx: AudioContext;
  try {
    ctx = factory();
  } catch {
    // No audio device, or a browser without Web Audio. Silence is an
    // acceptable degradation; it must never break starting a pomodoro.
    return null;
  }

  const buffer = ctx.createBuffer(1, ctx.sampleRate * NOISE_SECONDS, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  if (id === 'brown' || id === 'cafe') fillBrown(data);
  else fillPink(data);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = id === 'rain' ? 2400 : id === 'cafe' ? 700 : id === 'brown' ? 400 : 8000;
  filter.Q.value = 0.7;

  const gain = ctx.createGain();
  gain.gain.value = opts.volume ?? 0.35;

  // A slow LFO on the filter keeps the texture from reading as a static hiss.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = id === 'brown' ? 0.05 : 0.12;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = filter.frequency.value * 0.25;
  lfo.connect(lfoGain).connect(filter.frequency);

  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start();
  lfo.start();

  return {
    stop() {
      try {
        source.stop();
        lfo.stop();
        void ctx.close();
      } catch {
        // Already stopped — nothing to unwind.
      }
    },
    setVolume(v: number) {
      gain.gain.value = Math.max(0, Math.min(1, v));
    },
  };
}
