import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import { Segmented } from './Segmented.js';

describe('Segmented', () => {
  it('renders options and marks active', () => {
    render(
      <Segmented
        aria-label="theme"
        options={[
          { label: 'Light', value: 'light' as const },
          { label: 'Dark', value: 'dark' as const },
        ]}
        value="dark"
        onChange={() => {}}
      />,
    );
    const dark = screen.getByRole('radio', { name: 'Dark' });
    expect(dark).toHaveAttribute('aria-checked', 'true');
  });

  it('fires onChange with clicked value', () => {
    const cb = vi.fn();
    render(
      <Segmented
        aria-label="theme"
        options={[
          { label: 'Light', value: 'light' as const },
          { label: 'Dark', value: 'dark' as const },
        ]}
        value="light"
        onChange={cb}
      />,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(cb).toHaveBeenCalledWith('dark');
  });

  it('is a11y clean', async () => {
    const { container } = render(
      <Segmented
        aria-label="density"
        options={[
          { label: 'Spacious', value: 'spacious' as const },
          { label: 'Compact', value: 'compact' as const },
        ]}
        value="spacious"
        onChange={() => {}}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
