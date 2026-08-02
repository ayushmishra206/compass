import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { BlockedPage } from './BlockedPage';

describe('BlockedPage — soft block', () => {
  it('names the blocked host', () => {
    render(<BlockedPage host="reddit.com" mode="soft" />);
    expect(screen.getByText(/reddit\.com is blocked/i)).toBeInTheDocument();
  });

  it('offers both going back and going through', () => {
    render(<BlockedPage host="reddit.com" mode="soft" />);
    expect(screen.getByRole('button', { name: /back to work/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /let me through/i })).toBeInTheDocument();
  });

  it('asks for a reason before letting the user through', async () => {
    render(<BlockedPage host="reddit.com" mode="soft" />);
    await userEvent.click(screen.getByRole('button', { name: /let me through/i }));
    expect(screen.getByLabelText(/reason for bypassing/i)).toBeInTheDocument();
  });

  it('will not bypass on an empty reason', async () => {
    render(<BlockedPage host="reddit.com" mode="soft" />);
    await userEvent.click(screen.getByRole('button', { name: /let me through/i }));
    expect(screen.getByRole('button', { name: /go anyway/i })).toBeDisabled();
  });

  it('passes the reason to the caller', async () => {
    const onBypass = vi.fn();
    render(<BlockedPage host="reddit.com" mode="soft" onBypass={onBypass} />);
    await userEvent.click(screen.getByRole('button', { name: /let me through/i }));
    await userEvent.type(screen.getByLabelText(/reason for bypassing/i), 'checking a link');
    await userEvent.click(screen.getByRole('button', { name: /go anyway/i }));
    expect(onBypass).toHaveBeenCalledWith('checking a link');
  });

  it('lets the user back out after opening the reason box', async () => {
    const onBack = vi.fn();
    render(<BlockedPage host="reddit.com" mode="soft" onBack={onBack} />);
    await userEvent.click(screen.getByRole('button', { name: /let me through/i }));
    await userEvent.click(screen.getByRole('button', { name: /never mind/i }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('BlockedPage — hard block', () => {
  it('offers no way through', () => {
    render(<BlockedPage host="reddit.com" mode="hard" />);
    expect(screen.queryByRole('button', { name: /let me through/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to work/i })).toBeInTheDocument();
  });

  it('explains that it stays shut', () => {
    render(<BlockedPage host="reddit.com" mode="hard" />);
    expect(screen.getByText(/stays shut until your focus session ends/i)).toBeInTheDocument();
  });
});

describe('BlockedPage — a11y', () => {
  it('has no axe violations', async () => {
    const { container } = render(<BlockedPage host="reddit.com" mode="soft" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
