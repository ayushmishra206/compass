import { describe, expect, it, vi, beforeEach } from 'vitest';
import { validateLlmKey } from './validateLlmKey.js';
import * as runtime from '@compass/runtime';

vi.mock('@compass/runtime', () => ({
  rpc: vi.fn(),
}));

describe('validateLlmKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls rpc with provider and apiKey', async () => {
    const mockRpc = vi.mocked(runtime.rpc);
    mockRpc.mockResolvedValue({ valid: true });

    await validateLlmKey('openrouter', 'test-key-123');

    expect(mockRpc).toHaveBeenCalledWith('llm.validateKey', {
      provider: 'openrouter',
      apiKey: 'test-key-123',
    });
  });

  it('returns valid result from rpc', async () => {
    const mockRpc = vi.mocked(runtime.rpc);
    mockRpc.mockResolvedValue({ valid: true });

    const r = await validateLlmKey('openrouter', 'test-key');
    expect(r.valid).toBe(true);
  });

  it('returns invalid result with error from rpc', async () => {
    const mockRpc = vi.mocked(runtime.rpc);
    mockRpc.mockResolvedValue({ valid: false, error: '401 Unauthorized' });

    const r = await validateLlmKey('openrouter', 'invalid-key');
    expect(r).toEqual({ valid: false, error: '401 Unauthorized' });
  });

  it('propagates rpc errors', async () => {
    const mockRpc = vi.mocked(runtime.rpc);
    const testError = new Error('Network error');
    mockRpc.mockRejectedValue(testError);

    await expect(validateLlmKey('openrouter', 'test-key')).rejects.toThrow('Network error');
  });

  it('forwards openai provider via rpc', async () => {
    const mockRpc = vi.mocked(runtime.rpc);
    mockRpc.mockResolvedValue({ valid: true });

    await validateLlmKey('openai', 'sk-openai-test');

    expect(mockRpc).toHaveBeenCalledWith('llm.validateKey', {
      provider: 'openai',
      apiKey: 'sk-openai-test',
    });
  });

  it('forwards anthropic provider via rpc', async () => {
    const mockRpc = vi.mocked(runtime.rpc);
    mockRpc.mockResolvedValue({ valid: true });

    await validateLlmKey('anthropic', 'sk-ant-test');

    expect(mockRpc).toHaveBeenCalledWith('llm.validateKey', {
      provider: 'anthropic',
      apiKey: 'sk-ant-test',
    });
  });
});
