import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { BrandMark } from './BrandMark.js';

describe('BrandMark', () => {
  it('renders at default size', () => {
    const { container } = render(<BrandMark />);
    const span = container.querySelector('span');
    expect(span).toHaveAttribute('aria-hidden', 'true');
  });

  it('accepts custom size', () => {
    const { container } = render(<BrandMark size={40} />);
    const span = container.querySelector('span') as HTMLSpanElement;
    expect(span.style.width).toBe('40px');
  });

  it('is a11y clean (decorative)', async () => {
    const { container } = render(<BrandMark />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
