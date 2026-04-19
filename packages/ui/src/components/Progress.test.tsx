import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { Progress } from './Progress.js';

describe('Progress', () => {
  it('sets aria-valuenow correctly', () => {
    render(<Progress value={0.42} label="brief" />);
    const el = screen.getByRole('progressbar');
    expect(el).toHaveAttribute('aria-valuenow', '42');
  });

  it('clamps values above 1', () => {
    render(<Progress value={1.5} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('clamps values below 0', () => {
    render(<Progress value={-0.3} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('is a11y clean', async () => {
    const { container } = render(<Progress value={0.5} label="p" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
