import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe } from 'jest-axe';
import { PassphraseSetForm } from './PassphraseSetForm';

describe('PassphraseSetForm', () => {
  it('disables submit until passphrase is ≥12 chars and matches confirm', () => {
    render(<PassphraseSetForm onSet={vi.fn()} />);
    const submit = screen.getByRole('button', { name: /encrypt with this passphrase/i });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/^passphrase$/i), { target: { value: 'short' } });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/^passphrase$/i), { target: { value: 'a'.repeat(12) } });
    expect(submit).toBeDisabled(); // confirm still empty

    fireEvent.change(screen.getByLabelText(/confirm passphrase/i), {
      target: { value: 'a'.repeat(12) },
    });
    expect(submit).toBeEnabled();
  });

  it('shows strength meter dot reflecting passphrase length', () => {
    render(<PassphraseSetForm onSet={vi.fn()} />);
    const passphrase = screen.getByLabelText(/^passphrase$/i);

    fireEvent.change(passphrase, { target: { value: 'short' } });
    expect(screen.getByTestId('strength-dot')).toHaveAttribute('data-strength', 'weak');

    fireEvent.change(passphrase, { target: { value: 'a'.repeat(12) } });
    expect(screen.getByTestId('strength-dot')).toHaveAttribute('data-strength', 'medium');

    fireEvent.change(passphrase, { target: { value: 'a'.repeat(20) } });
    expect(screen.getByTestId('strength-dot')).toHaveAttribute('data-strength', 'strong');
  });

  it('calls onSet with passphrase on submit', async () => {
    const onSet = vi.fn(async () => undefined);
    render(<PassphraseSetForm onSet={onSet} />);
    fireEvent.change(screen.getByLabelText(/^passphrase$/i), {
      target: { value: 'a-strong-passphrase-1' },
    });
    fireEvent.change(screen.getByLabelText(/confirm passphrase/i), {
      target: { value: 'a-strong-passphrase-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /encrypt with this passphrase/i }));
    await waitFor(() => expect(onSet).toHaveBeenCalledWith('a-strong-passphrase-1'));
  });

  it('axe: zero violations', async () => {
    const { container } = render(<PassphraseSetForm onSet={vi.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
