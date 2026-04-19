import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { Badge, Dot } from './Badge.js';

describe('Badge', () => {
  it.each(['default', 'accent', 'sage', 'slate'] as const)('renders %s variant', (v) => {
    render(<Badge variant={v}>p1</Badge>);
    expect(screen.getByText('p1')).toHaveAttribute('data-variant', v);
  });

  it('renders Dot child inline', () => {
    render(
      <Badge>
        <Dot /> on
      </Badge>,
    );
    expect(screen.getByText(/on/)).toBeInTheDocument();
  });

  it('is a11y clean', async () => {
    const { container } = render(<Badge>x</Badge>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
