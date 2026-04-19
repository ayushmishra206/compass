import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { IconCompass, IconSearch, ICONS } from './index.js';

describe('icons', () => {
  it('renders IconCompass with default 16px size', () => {
    const { container } = render(<IconCompass />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
  });

  it('accepts custom size + className', () => {
    const { container } = render(<IconSearch size={24} className="text-accent" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveClass('text-accent');
  });

  it('ICONS map exposes all 41 icons', () => {
    expect(Object.keys(ICONS)).toHaveLength(41);
  });

  it('icon renders are a11y-clean when marked decorative', async () => {
    const { container } = render(<IconCompass aria-hidden="true" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
