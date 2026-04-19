import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import { Swatch } from './Swatch.js';

describe('Swatch', () => {
  it('renders with label + pressed state reflects active', () => {
    render(<Swatch color="oklch(0.5 0.1 48)" label="terracotta" />);
    const btn = screen.getByRole('button', { name: 'terracotta' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('aria-pressed flips with active', () => {
    render(<Swatch color="oklch(0.5 0.1 48)" active label="t" />);
    expect(screen.getByRole('button', { name: 't' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('fires onClick', () => {
    const cb = vi.fn();
    render(<Swatch color="oklch(0.5 0.1 48)" label="t" onClick={cb} />);
    fireEvent.click(screen.getByRole('button'));
    expect(cb).toHaveBeenCalled();
  });

  it('is a11y clean', async () => {
    const { container } = render(<Swatch color="oklch(0.5 0.1 48)" label="t" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
