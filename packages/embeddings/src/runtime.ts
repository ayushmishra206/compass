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

export function __resetForTests(): void {
  pipe = null;
}
