import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GlassCard } from './GlassCard.js';

describe('GlassCard', () => {
  it('renders children', () => {
    const { getByText } = render(<GlassCard>hello</GlassCard>);
    expect(getByText('hello')).toBeTruthy();
  });

  it('applies the requested glass tier', () => {
    const { container } = render(<GlassCard tier={1}>x</GlassCard>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.backdropFilter).toContain('glass');
    expect(el.style.background).toContain('glass');
  });

  it('forwards className', () => {
    const { container } = render(<GlassCard className="my-card">x</GlassCard>);
    expect((container.firstElementChild as HTMLElement).className).toContain('my-card');
  });
});
