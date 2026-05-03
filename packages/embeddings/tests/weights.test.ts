import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ensureWeightsDownloaded,
  WeightsCorruptedError,
  WeightsUnavailableError,
} from '../src/weights';

// Mock OPFS surface that ensureWeightsDownloaded calls
const fileHandleMock = {
  getFile: vi.fn(),
  createWritable: vi.fn(),
};
const embedDirMock = {
  getFileHandle: vi.fn(),
};
const compassDirMock = {
  getDirectoryHandle: vi.fn().mockResolvedValue(embedDirMock),
};
const dirMock = {
  getDirectoryHandle: vi.fn().mockResolvedValue(compassDirMock),
};

beforeEach(() => {
  fileHandleMock.getFile.mockReset();
  fileHandleMock.createWritable.mockReset();
  embedDirMock.getFileHandle.mockReset();
  compassDirMock.getDirectoryHandle.mockClear();
  dirMock.getDirectoryHandle.mockClear();
  vi.stubGlobal('navigator', {
    storage: { getDirectory: vi.fn().mockResolvedValue(dirMock) },
  });
  vi.stubGlobal('fetch', vi.fn());
});

describe('weights download', () => {
  it('skips download when an OPFS file already exists with size > 0', async () => {
    embedDirMock.getFileHandle.mockResolvedValue(fileHandleMock);
    fileHandleMock.getFile.mockResolvedValue({ size: 12345 });
    await ensureWeightsDownloaded();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('throws WeightsUnavailableError on network failure', async () => {
    // No existing file
    embedDirMock.getFileHandle.mockRejectedValueOnce(new Error('not found')); // first call fails
    embedDirMock.getFileHandle.mockResolvedValueOnce(fileHandleMock); // second call (writable) succeeds
    vi.mocked(fetch).mockRejectedValue(new Error('network down'));
    await expect(ensureWeightsDownloaded()).rejects.toBeInstanceOf(WeightsUnavailableError);
  });

  it('throws WeightsCorruptedError when SHA mismatches', async () => {
    embedDirMock.getFileHandle.mockRejectedValueOnce(new Error('not found'));
    embedDirMock.getFileHandle.mockResolvedValueOnce(fileHandleMock);
    const writable = { write: vi.fn(), close: vi.fn() };
    fileHandleMock.createWritable.mockResolvedValue(writable);
    vi.mocked(fetch).mockResolvedValue(
      new Response(new Uint8Array([0, 0, 0, 0]), { status: 200 }) as Response,
    );
    await expect(ensureWeightsDownloaded()).rejects.toBeInstanceOf(WeightsCorruptedError);
  });
});
