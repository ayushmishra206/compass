import { pipeline, env, type FeatureExtractionPipeline } from '@huggingface/transformers';
import { ensureWeightsDownloaded, OPFS_WEIGHTS_PATH } from './weights';

let pipe: FeatureExtractionPipeline | null = null;

export async function ensureRuntimeReady(): Promise<void> {
  if (pipe) return;
  await ensureWeightsDownloaded();
  // Configure transformers.js to load weights from OPFS rather than HF CDN.
  env.allowLocalModels = true;
  env.allowRemoteModels = false;
  env.localModelPath = OPFS_WEIGHTS_PATH;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = await (pipeline as any)('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    quantized: true,
  });
  pipe = p as FeatureExtractionPipeline;
}

export async function embed(text: string): Promise<Float32Array> {
  await ensureRuntimeReady();
  if (!pipe) throw new Error('runtime not ready');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out = await pipe(text, { pooling: 'mean', normalize: true } as any);
  return out.data as Float32Array;
}

const EMBED_DIM = 384;

export async function embedBatch(texts: string[]): Promise<Float32Array[]> {
  await ensureRuntimeReady();
  if (!pipe) throw new Error('runtime not ready');
  if (texts.length === 0) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out = await pipe(texts, { pooling: 'mean', normalize: true } as any);
  // transformers.js batched feature-extraction returns a single tensor with
  // shape [batchSize, dim]; .data is a Float32Array of length batchSize*dim.
  const data = out.data as Float32Array;
  if (data.length !== texts.length * EMBED_DIM) {
    throw new Error(`embedBatch: expected ${texts.length * EMBED_DIM} floats, got ${data.length}`);
  }
  const result: Float32Array[] = [];
  for (let i = 0; i < texts.length; i++) {
    result.push(data.slice(i * EMBED_DIM, (i + 1) * EMBED_DIM));
  }
  return result;
}

export function __resetForTests(): void {
  pipe = null;
}

// Test-only: install a fake pipeline. Used by runtime.test.ts to avoid
// downloading model weights in CI.
export function __setPipeForTests(fake: unknown): void {
  pipe = fake as FeatureExtractionPipeline;
}
