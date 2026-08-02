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
