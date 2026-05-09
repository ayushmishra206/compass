import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ConnectedProvidersSection } from './ConnectedProvidersSection';
import { useShell } from '../../state/shell';

import type * as CompassCore from '@compass/core';
vi.mock('@compass/core', async (importOriginal) => {
  const actual = await importOriginal<typeof CompassCore>();
  return {
    ...actual,
    getActiveCredentials: vi.fn(async () => ({ default: null })),
    setActiveCredentials: vi.fn(async () => undefined),
    isEncryptionEnabled: vi.fn(async () => false),
    isLocked: vi.fn(async () => false),
    unlockCredentials: vi.fn(async () => undefined),
  };
});
import { unlockCredentials, getActiveCredentials, setActiveCredentials } from '@compass/core';

describe('ConnectedProvidersSection — locked branch', () => {
  beforeEach(() => {
    useShell.setState({
      encryptionEnabled: true,
      locked: true,
      unlockHint: false,
    });
    vi.mocked(unlockCredentials).mockReset().mockResolvedValue(undefined);
  });

  it('renders the unlock form when locked', () => {
    render(<ConnectedProvidersSection />);
    expect(screen.getByRole('button', { name: /unlock/i })).toBeInTheDocument();
    expect(screen.queryByText(/add another provider/i)).not.toBeInTheDocument();
  });

  it('renders forgot-passphrase link below unlock', () => {
    render(<ConnectedProvidersSection />);
    expect(screen.getByRole('button', { name: /forgot passphrase/i })).toBeInTheDocument();
  });

  it('calls unlockCredentials on submit and updates locked=false', async () => {
    render(<ConnectedProvidersSection />);
    fireEvent.change(screen.getByLabelText(/passphrase/i), { target: { value: 'good-pass-12c' } });
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }));
    await waitFor(() => expect(unlockCredentials).toHaveBeenCalledWith('good-pass-12c'));
    await waitFor(() => expect(useShell.getState().locked).toBe(false));
  });

  it('shows inline error on wrong passphrase', async () => {
    vi.mocked(unlockCredentials).mockRejectedValueOnce(new Error('decrypt failed'));
    render(<ConnectedProvidersSection />);
    fireEvent.change(screen.getByLabelText(/passphrase/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }));
    await waitFor(() => expect(screen.getByText(/wrong passphrase/i)).toBeInTheDocument());
  });
});

import { rpc } from '@compass/runtime';

vi.mock('@compass/runtime', () => ({
  rpc: vi.fn(async () => ({ valid: true })),
}));

const mockCreds = {
  default: 'openrouter' as const,
  openrouter: {
    apiKey: 'sk-or-1234567890ABCD',
    addedAt: '2026-05-08T10:00:00Z',
    lastValidatedAt: '2026-05-09T11:55:00Z',
  },
  openai: {
    apiKey: 'sk-oa-9876543210ZYXW',
    addedAt: '2026-05-07T10:00:00Z',
    lastValidatedAt: '2026-05-08T12:00:00Z',
  },
};

describe('ConnectedProvidersSection — unlocked branch', () => {
  beforeEach(() => {
    useShell.setState({ encryptionEnabled: false, locked: false, unlockHint: false });
    vi.mocked(getActiveCredentials).mockReset().mockResolvedValue(mockCreds);
    vi.mocked(setActiveCredentials).mockReset().mockResolvedValue(undefined);
    vi.mocked(rpc).mockReset().mockResolvedValue({ valid: true });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-09T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('renders one row per populated provider with masked keys', async () => {
    render(<ConnectedProvidersSection />);
    await waitFor(() => expect(screen.getByText(/openrouter/i)).toBeInTheDocument());
    expect(screen.getByText('sk-…ABCD')).toBeInTheDocument();
    expect(screen.getByText('sk-…ZYXW')).toBeInTheDocument();
  });

  it('shows default badge on the default row only', async () => {
    render(<ConnectedProvidersSection />);
    await waitFor(() => expect(screen.getAllByText(/default/i).length).toBe(1));
  });

  it('renders Add another provider button when unlocked', async () => {
    render(<ConnectedProvidersSection />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /add another provider/i })).toBeInTheDocument(),
    );
  });

  it('Validate now action calls rpc and updates lastValidatedAt', async () => {
    render(<ConnectedProvidersSection />);
    await waitFor(() => expect(screen.getByText(/openrouter/i)).toBeInTheDocument());
    fireEvent.click(screen.getAllByLabelText(/row actions/i)[0]!);
    fireEvent.click(screen.getByRole('button', { name: /validate now/i }));
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith('llm.validateKey', {
        provider: 'openrouter',
        apiKey: 'sk-or-1234567890ABCD',
      }),
    );
    await waitFor(() => expect(setActiveCredentials).toHaveBeenCalled());
  });

  it('Set as default writes default change', async () => {
    render(<ConnectedProvidersSection />);
    await waitFor(() => expect(screen.getByText(/openai/i)).toBeInTheDocument());
    fireEvent.click(screen.getAllByLabelText(/row actions/i)[1]!); // openai row
    fireEvent.click(screen.getByRole('button', { name: /set as default/i }));
    await waitFor(() =>
      expect(setActiveCredentials).toHaveBeenCalledWith(
        expect.objectContaining({ default: 'openai' }),
      ),
    );
  });

  it('Add another provider expands KeyValidator with available providers', async () => {
    render(<ConnectedProvidersSection />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /add another provider/i })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: /add another provider/i }));
    // anthropic is the only un-added provider
    expect(screen.getByRole('button', { name: 'anthropic' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'openrouter' })).not.toBeInTheDocument();
  });
});
