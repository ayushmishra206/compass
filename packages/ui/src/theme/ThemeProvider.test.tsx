import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from './ThemeProvider.js';

describe('ThemeProvider', () => {
  it('writes data-theme on mount', () => {
    render(
      <ThemeProvider theme="dark" accent="ocean" density="spacious">
        <div>child</div>
      </ThemeProvider>,
    );
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('writes accent CSS vars', () => {
    render(
      <ThemeProvider theme="light" accent="plum" density="compact">
        <div>child</div>
      </ThemeProvider>,
    );
    expect(document.documentElement.style.getPropertyValue('--accent-h')).toBe('340');
  });

  it('writes data-density', () => {
    render(
      <ThemeProvider theme="light" accent="terracotta" density="compact">
        <div>child</div>
      </ThemeProvider>,
    );
    expect(document.documentElement.dataset['density']).toBe('compact');
  });
});
