import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { Surface } from './Surface.js';

describe('Surface', () => {
  it.each([1, 2, 3] as const)('renders tier %i with data-tier attribute', (tier) => {
    const { container } = render(<Surface tier={tier}>hi</Surface>);
    expect(container.querySelector('[data-tier]')).toHaveAttribute('data-tier', String(tier));
  });

  it('applies radius and padding tokens', () => {
    const { container } = render(
      <Surface radius="md" padding="lg">
        x
      </Surface>,
    );
    const el = container.querySelector('[data-tier]') as HTMLElement;
    expect(el.style.borderRadius).toBe('var(--radius-md)');
    expect(el.style.padding).toBe('var(--space-5)');
  });

  it('honours style overrides without dropping tier tokens', () => {
    const { container } = render(<Surface style={{ marginTop: 10 }}>x</Surface>);
    const el = container.querySelector('[data-tier]') as HTMLElement;
    expect(el.style.marginTop).toBe('10px');
    expect(el.style.background).toContain('var(--glass-tint-1)');
  });

  it('renders children', () => {
    const { getByText } = render(
      <Surface>
        <span>inner</span>
      </Surface>,
    );
    expect(getByText('inner')).toBeInTheDocument();
  });

  it('is a11y clean', async () => {
    const { container } = render(<Surface>content</Surface>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
