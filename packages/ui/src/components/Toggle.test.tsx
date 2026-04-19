import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import { Toggle } from './Toggle.js';

describe('Toggle', () => {
  it('reflects on state', () => {
    render(<Toggle aria-label="x" on onChange={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('fires onChange with inverted value', () => {
    const cb = vi.fn();
    render(<Toggle aria-label="x" on={false} onChange={cb} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(cb).toHaveBeenCalledWith(true);
  });

  it('disabled blocks onChange', () => {
    const cb = vi.fn();
    render(<Toggle aria-label="x" on={false} onChange={cb} disabled />);
    fireEvent.click(screen.getByRole('switch'));
    expect(cb).not.toHaveBeenCalled();
  });

  it('is a11y clean', async () => {
    const { container } = render(<Toggle aria-label="notifications" on onChange={() => {}} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
