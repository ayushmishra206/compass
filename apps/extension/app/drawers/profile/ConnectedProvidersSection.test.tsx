import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ConnectedProvidersSection } from './ConnectedProvidersSection';
import { useShell } from '../../state/shell';

import type * as CompassCore from '@compass/core';
vi.mock('@compass/core', async (importOriginal) => {
  const actual = await importOriginal<typeof CompassCore>();
  return {
    ...actual,
    getActiveCredentials: vi.fn(async () => ({ default: null })),
    isEncryptionEnabled: vi.fn(async () => false),
    isLocked: vi.fn(async () => false),
    unlockCredentials: vi.fn(async () => undefined),
  };
});
import { unlockCredentials } from '@compass/core';

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
