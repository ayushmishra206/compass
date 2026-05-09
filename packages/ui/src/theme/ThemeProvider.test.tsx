import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ThemeProvider } from './ThemeProvider.js';

describe('ThemeProvider', () => {
  it('writes data-theme on mount', () => {
    render(
      <ThemeProvider theme="dark" accent="rose" density="spacious">
        <div>child</div>
      </ThemeProvider>,
    );
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('writes accent CSS vars', () => {
    render(
      <ThemeProvider theme="dark" accent="mint" density="compact">
        <div>child</div>
      </ThemeProvider>,
    );
    expect(document.documentElement.style.getPropertyValue('--accent-h')).toBe('160');
  });

  it('writes data-density', () => {
    render(
      <ThemeProvider theme="dark" accent="amber" density="compact">
        <div>child</div>
      </ThemeProvider>,
    );
    expect(document.documentElement.dataset['density']).toBe('compact');
  });
});
