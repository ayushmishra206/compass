export const OPFS_WEIGHTS_PATH = '/compass/embeddings/minilm-l6-v2.int8';
export const MINILM_WEIGHTS_URL =
  'https://github.com/compass/embeddings-weights/releases/download/v1/minilm-l6-v2.int8';
// TODO(release): replace placeholder with the SHA-256 of the published
// weights binary; pin via the release-publishing checklist.
export const MINILM_WEIGHTS_SHA256 = 'PLACEHOLDER_SHA_FILL_IN_WHEN_PUBLISHING_RELEASE';

export class WeightsUnavailableError extends Error {
  constructor(cause: unknown) {
    super('Embeddings weights unavailable');
    this.name = 'WeightsUnavailableError';
    this.cause = cause;
  }
}

export class WeightsCorruptedError extends Error {
  constructor() {
    super('Embeddings weights failed SHA-256 verification');
    this.name = 'WeightsCorruptedError';
  }
}

export async function ensureWeightsDownloaded(): Promise<void> {
  const dir = await navigator.storage.getDirectory();
  const compassDir = await dir.getDirectoryHandle('compass', { create: true });
  const embedDir = await compassDir.getDirectoryHandle('embeddings', { create: true });
  try {
    const existing = await embedDir.getFileHandle('minilm-l6-v2.int8');
    const file = await existing.getFile();
    if (file.size > 0) return;
  } catch {
    // not downloaded yet
  }

  let bytes: ArrayBuffer;
  try {
    const resp = await fetch(MINILM_WEIGHTS_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    bytes = await resp.arrayBuffer();
  } catch (err) {
    throw new WeightsUnavailableError(err);
  }

  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const sha = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  if (sha !== MINILM_WEIGHTS_SHA256) {
    throw new WeightsCorruptedError();
  }

  const handle = await embedDir.getFileHandle('minilm-l6-v2.int8', { create: true });
  const writable = await handle.createWritable();
  await writable.write(bytes);
  await writable.close();
}
