import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import { Button } from './Button.js';

describe('Button', () => {
  it('renders with default variant', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it.each(['default', 'primary', 'accent', 'ghost'] as const)('renders %s variant', (variant) => {
    render(<Button variant={variant}>x</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', variant);
  });

  it.each(['xs', 'sm', 'md'] as const)('renders %s size', (size) => {
    render(<Button size={size}>x</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-size', size);
  });

  it('fires onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>x</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('respects disabled', () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        x
      </Button>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders leading + trailing slots', () => {
    render(
      <Button leading={<span data-testid="l">l</span>} trailing={<span data-testid="t">t</span>}>
        mid
      </Button>,
    );
    expect(screen.getByTestId('l')).toBeInTheDocument();
    expect(screen.getByTestId('t')).toBeInTheDocument();
  });

  it('is a11y clean', async () => {
    const { container } = render(<Button>Go</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
