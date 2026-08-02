import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { Ink } from './Ink.js';

describe('Ink', () => {
  it('renders children inside a span by default', () => {
    render(<Ink tone="accent">momentum</Ink>);
    const el = screen.getByText('momentum');
    expect(el.tagName).toBe('SPAN');
  });

  it('maps each tone to its ink-ladder token', () => {
    const cases: Array<[Parameters<typeof Ink>[0]['tone'], string]> = [
      ['primary', 'var(--color-ink)'],
      ['secondary', 'var(--color-ink-2)'],
      ['muted', 'var(--color-ink-3)'],
      ['dim', 'var(--color-ink-4)'],
      ['accent', 'var(--accent-soft)'],
    ];
    for (const [tone, token] of cases) {
      const { unmount } = render(<Ink tone={tone}>{tone}</Ink>);
      expect(screen.getByText(String(tone))).toHaveStyle({ color: token });
      unmount();
    }
  });

  it('inherits typography rather than imposing a variant', () => {
    render(<Ink tone="accent">inline</Ink>);
    const el = screen.getByText('inline');
    expect(el.style.fontSize).toBe('');
    expect(el.style.fontFamily).toBe('');
  });

  it('renders as an alternate inline tag when asked', () => {
    render(
      <Ink tone="accent" as="em">
        emphasis
      </Ink>,
    );
    expect(screen.getByText('emphasis').tagName).toBe('EM');
  });

  it('normalises font-style on em so emphasis is colour, not slant', () => {
    render(
      <Ink tone="accent" as="em">
        upright
      </Ink>,
    );
    expect(screen.getByText('upright')).toHaveStyle({ fontStyle: 'normal' });
  });

  it('keeps the slant when italic is explicitly requested', () => {
    render(
      <Ink tone="accent" as="em" italic>
        slanted
      </Ink>,
    );
    expect(screen.getByText('slanted')).toHaveStyle({ fontStyle: 'italic' });
  });

  it('merges caller styles over the defaults', () => {
    render(
      <Ink tone="accent" style={{ fontWeight: 400 }}>
        weighted
      </Ink>,
    );
    expect(screen.getByText('weighted')).toHaveStyle({ fontWeight: '400' });
  });

  it('exposes the tone for styling hooks and tests', () => {
    render(<Ink tone="muted">tagged</Ink>);
    expect(screen.getByText('tagged')).toHaveAttribute('data-tone', 'muted');
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <p>
        Move with <Ink tone="accent">momentum</Ink>.
      </p>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
