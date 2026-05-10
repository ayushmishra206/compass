import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe } from 'jest-axe';
import { PassphraseConfirmForm } from './PassphraseConfirmForm';

describe('PassphraseConfirmForm', () => {
  it('calls onConfirm with passphrase on submit', async () => {
    const onConfirm = vi.fn(async () => undefined);
    render(<PassphraseConfirmForm onConfirm={onConfirm} submitLabel="Unlock" />);
    fireEvent.change(screen.getByLabelText(/passphrase/i), {
      target: { value: 'a-passphrase-12c' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('a-passphrase-12c'));
  });

  it('surfaces inline error when onConfirm rejects', async () => {
    const onConfirm = vi.fn(async () => {
      throw new Error('decrypt failed');
    });
    render(<PassphraseConfirmForm onConfirm={onConfirm} submitLabel="Unlock" />);
    fireEvent.change(screen.getByLabelText(/passphrase/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    await waitFor(() => expect(screen.getByText(/wrong passphrase/i)).toBeInTheDocument());
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    render(<PassphraseConfirmForm onConfirm={vi.fn()} onCancel={onCancel} submitLabel="Unlock" />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('axe: zero violations', async () => {
    const { container } = render(
      <PassphraseConfirmForm onConfirm={vi.fn()} submitLabel="Unlock" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
