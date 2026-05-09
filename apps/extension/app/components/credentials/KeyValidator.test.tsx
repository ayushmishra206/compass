import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';
import { KeyValidator } from './KeyValidator';

vi.mock('@compass/runtime', () => ({
  rpc: vi.fn(async () => ({ valid: true })),
}));
import { rpc } from '@compass/runtime';

describe('KeyValidator', () => {
  beforeEach(() => {
    vi.mocked(rpc).mockClear();
  });

  it('renders the provider chooser when given multiple providers', () => {
    render(
      <KeyValidator providers={['openrouter', 'openai', 'anthropic']} onValidated={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'openrouter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'openai' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'anthropic' })).toBeInTheDocument();
  });

  it('collapses chooser to a label when lockProvider', () => {
    render(
      <KeyValidator
        providers={['openrouter']}
        initialProvider="openrouter"
        lockProvider
        onValidated={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: 'openai' })).not.toBeInTheDocument();
    expect(screen.getByText('openrouter')).toBeInTheDocument();
  });

  it('calls onValidated with provider + key on successful validate', async () => {
    const onValidated = vi.fn(async () => undefined);
    render(<KeyValidator providers={['openrouter']} onValidated={onValidated} />);
    fireEvent.change(screen.getByPlaceholderText(/sk-/i), {
      target: { value: 'sk-or-test-1234567890' },
    });
    fireEvent.click(screen.getByRole('button', { name: /validate/i }));
    await waitFor(() =>
      expect(onValidated).toHaveBeenCalledWith('openrouter', 'sk-or-test-1234567890'),
    );
  });

  it('surfaces validate failure inline', async () => {
    vi.mocked(rpc).mockResolvedValueOnce({ valid: false, error: 'Invalid key' });
    render(<KeyValidator providers={['openrouter']} onValidated={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/sk-/i), { target: { value: 'sk-bad' } });
    fireEvent.click(screen.getByRole('button', { name: /validate/i }));
    await waitFor(() => expect(screen.getByText('Invalid key')).toBeInTheDocument());
  });

  it('disables submit while validating', async () => {
    let resolveRpc: (v: unknown) => void;
    vi.mocked(rpc).mockReturnValueOnce(new Promise((r) => (resolveRpc = r)));
    render(<KeyValidator providers={['openrouter']} onValidated={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/sk-/i), {
      target: { value: 'sk-or-1234567890' },
    });
    fireEvent.click(screen.getByRole('button', { name: /validate/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /validating/i })).toBeDisabled());
    resolveRpc!({ valid: true });
  });

  it('axe: zero violations', async () => {
    const { container } = render(<KeyValidator providers={['openrouter']} onValidated={vi.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
