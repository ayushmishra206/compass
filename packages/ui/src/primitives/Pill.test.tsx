import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import { Pill } from './Pill.js';

describe('Pill', () => {
  it('renders as a span by default', () => {
    render(<Pill>NOW</Pill>);
    expect(screen.getByText('NOW').tagName.toLowerCase()).toBe('span');
  });

  it('renders as a button when onClick is provided', () => {
    render(<Pill onClick={() => undefined}>click</Pill>);
    expect(screen.getByRole('button', { name: 'click' })).toBeInTheDocument();
  });

  it.each(['default', 'accent', 'red', 'blue', 'warn'] as const)(
    'tags data-tone for %s',
    (tone) => {
      render(<Pill tone={tone}>x</Pill>);
      expect(screen.getByText('x')).toHaveAttribute('data-tone', tone);
    },
  );

  it.each(['sm', 'md'] as const)('tags data-size for %s', (size) => {
    render(<Pill size={size}>x</Pill>);
    expect(screen.getByText('x')).toHaveAttribute('data-size', size);
  });

  it('marks selected state', () => {
    render(<Pill selected>x</Pill>);
    expect(screen.getByText('x')).toHaveAttribute('data-selected', 'true');
  });

  it('fires onClick when used as a button', () => {
    const onClick = vi.fn();
    render(<Pill onClick={onClick}>x</Pill>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders leading + trailing slots', () => {
    render(
      <Pill leading={<i data-testid="l">l</i>} trailing={<i data-testid="t">t</i>}>
        mid
      </Pill>,
    );
    expect(screen.getByTestId('l')).toBeInTheDocument();
    expect(screen.getByTestId('t')).toBeInTheDocument();
  });

  it('is a11y clean', async () => {
    const { container } = render(<Pill>label</Pill>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
