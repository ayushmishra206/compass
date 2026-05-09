import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ThemeProvider } from './ThemeProvider.js';

describe('ThemeProvider', () => {
  it('writes the accent OKLCH triple to <html> custom properties', () => {
    render(
      <ThemeProvider accent="rose">
        <span>child</span>
      </ThemeProvider>,
    );
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--accent-h')).toBe('18');
    expect(root.style.getPropertyValue('--accent-c')).toBe('0.13');
    expect(root.style.getPropertyValue('--accent-l')).toBe('0.66');
  });

  it('updates the triple when the accent prop changes', () => {
    const { rerender } = render(
      <ThemeProvider accent="amber">
        <span />
      </ThemeProvider>,
    );
    rerender(
      <ThemeProvider accent="mint">
        <span />
      </ThemeProvider>,
    );
    expect(document.documentElement.style.getPropertyValue('--accent-h')).toBe('160');
  });

  it('renders children unchanged', () => {
    const { getByText } = render(
      <ThemeProvider accent="sky">
        <span>hello</span>
      </ThemeProvider>,
    );
    expect(getByText('hello')).toBeTruthy();
  });
});
