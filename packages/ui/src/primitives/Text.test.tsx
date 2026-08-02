import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { Text } from './Text.js';

describe('Text', () => {
  it.each(['display', 'title', 'heading', 'serif-body', 'body', 'mono'] as const)(
    'renders %s variant with data-variant attribute',
    (variant) => {
      render(<Text variant={variant}>hello</Text>);
      const el = screen.getByText('hello');
      expect(el).toHaveAttribute('data-variant', variant);
    },
  );

  it.each(['primary', 'secondary', 'muted', 'dim', 'accent'] as const)(
    'applies %s tone',
    (tone) => {
      render(
        <Text variant="body" tone={tone}>
          hi
        </Text>,
      );
      expect(screen.getByText('hi')).toHaveAttribute('data-tone', tone);
    },
  );

  it('renders the default tag for each variant', () => {
    const { container, rerender } = render(<Text variant="display">d</Text>);
    expect(container.querySelector('h1')).not.toBeNull();
    rerender(<Text variant="title">t</Text>);
    expect(container.querySelector('h2')).not.toBeNull();
    rerender(<Text variant="serif-body">s</Text>);
    expect(container.querySelector('p')).not.toBeNull();
    rerender(<Text variant="mono">m</Text>);
    expect(container.querySelector('span')).not.toBeNull();
  });

  it('honours the as prop', () => {
    render(
      <Text variant="title" as="h3">
        custom
      </Text>,
    );
    expect(screen.getByText('custom').tagName.toLowerCase()).toBe('h3');
  });

  it('merges inline style overrides', () => {
    render(
      <Text variant="body" style={{ marginTop: 12 }}>
        spaced
      </Text>,
    );
    expect(screen.getByText('spaced')).toHaveStyle({ marginTop: '12px' });
  });

  it('is a11y clean', async () => {
    const { container } = render(
      <>
        <Text variant="display">Hello</Text>
        <Text variant="serif-body">body copy</Text>
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('display type sizing', () => {
  it('is bounded by viewport height, not width alone', () => {
    render(<Text variant="display">Good evening.</Text>);
    const el = screen.getByText('Good evening.');
    // A wide-but-short window previously produced type taller than the grid
    // row containing it, which overlapped the pinned photo-attribution card.
    expect(el.style.fontSize).toContain('vh');
    expect(el.style.fontSize).toContain('min(');
  });

  it('keeps a floor small enough for a very short window', () => {
    render(<Text variant="display">x</Text>);
    expect(screen.getByText('x').style.fontSize).toMatch(/clamp\(3[0-9]px/);
  });
});
