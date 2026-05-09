import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EncryptionSection } from './EncryptionSection';
import { useShell } from '../../state/shell';

import type * as CompassCore from '@compass/core';
vi.mock('@compass/core', async (importOriginal) => {
  const actual = await importOriginal<typeof CompassCore>();
  return {
    ...actual,
    enableEncryption: vi.fn(async () => undefined),
    disableEncryption: vi.fn(async () => undefined),
  };
});
import { enableEncryption, disableEncryption } from '@compass/core';

describe('EncryptionSection — Off state', () => {
  beforeEach(() => {
    useShell.setState({ encryptionEnabled: false, locked: false });
    vi.mocked(enableEncryption).mockReset().mockResolvedValue(undefined);
  });

  it('renders Off label and Enable button', () => {
    render(<EncryptionSection />);
    expect(screen.getByText(/off/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enable encryption/i })).toBeInTheDocument();
  });

  it('expands PassphraseSetForm on Enable click and persists on submit', async () => {
    render(<EncryptionSection />);
    fireEvent.click(screen.getByRole('button', { name: /enable encryption/i }));
    fireEvent.change(screen.getByLabelText(/^passphrase$/i), {
      target: { value: 'a-passphrase-12c' },
    });
    fireEvent.change(screen.getByLabelText(/confirm passphrase/i), {
      target: { value: 'a-passphrase-12c' },
    });
    fireEvent.click(screen.getByRole('button', { name: /encrypt with this passphrase/i }));
    await waitFor(() => expect(enableEncryption).toHaveBeenCalledWith('a-passphrase-12c'));
    await waitFor(() => expect(useShell.getState().encryptionEnabled).toBe(true));
    await waitFor(() => expect(useShell.getState().locked).toBe(false));
  });
});

describe('EncryptionSection — On state', () => {
  beforeEach(() => {
    useShell.setState({ encryptionEnabled: true, locked: false });
    vi.mocked(disableEncryption).mockReset().mockResolvedValue(undefined);
  });

  it('renders On label, Lock now (when unlocked), and Disable button', () => {
    render(<EncryptionSection />);
    expect(screen.getByText(/on/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /lock now/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /disable encryption/i })).toBeInTheDocument();
  });

  it('hides Lock now when already locked', () => {
    useShell.setState({ locked: true });
    render(<EncryptionSection />);
    expect(screen.queryByRole('button', { name: /lock now/i })).not.toBeInTheDocument();
  });

  it('expands PassphraseConfirmForm on Disable click and persists on submit', async () => {
    render(<EncryptionSection />);
    fireEvent.click(screen.getByRole('button', { name: /disable encryption/i }));
    fireEvent.change(screen.getByLabelText(/passphrase/i), { target: { value: 'right-pass-12c' } });
    fireEvent.click(screen.getByRole('button', { name: 'Disable encryption' }));
    await waitFor(() => expect(disableEncryption).toHaveBeenCalledWith('right-pass-12c'));
    await waitFor(() => expect(useShell.getState().encryptionEnabled).toBe(false));
  });

  it('surfaces inline error on wrong passphrase during disable', async () => {
    vi.mocked(disableEncryption).mockRejectedValueOnce(new Error('decrypt failed'));
    render(<EncryptionSection />);
    fireEvent.click(screen.getByRole('button', { name: /disable encryption/i }));
    fireEvent.change(screen.getByLabelText(/passphrase/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Disable encryption' }));
    await waitFor(() => expect(screen.getByText(/wrong passphrase/i)).toBeInTheDocument());
  });
});
