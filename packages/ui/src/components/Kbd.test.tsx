import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { Kbd } from './Kbd.js';

describe('Kbd', () => {
  it('renders children', () => {
    render(<Kbd>⌘</Kbd>);
    expect(screen.getByText('⌘')).toBeInTheDocument();
  });

  it('uses mono font', () => {
    render(<Kbd>K</Kbd>);
    expect(screen.getByText('K')).toHaveClass('font-mono');
  });

  it('is a11y clean', async () => {
    const { container } = render(<Kbd>K</Kbd>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
