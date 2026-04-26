import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { AppShell, Sidebar, Topbar, Surface, Grid12 } from './index.js';

describe('AppShell', () => {
  it('renders sidebar + main slot', () => {
    render(
      <AppShell sidebar={<nav data-testid="side">n</nav>}>
        <div data-testid="main">m</div>
      </AppShell>,
    );
    expect(screen.getByTestId('side')).toBeInTheDocument();
    expect(screen.getByTestId('main')).toBeInTheDocument();
  });

  it('applies density to data attribute', () => {
    const { container } = render(
      <AppShell sidebar={<div />} density="compact">
        x
      </AppShell>,
    );
    expect(container.firstChild).toHaveAttribute('data-density', 'compact');
  });
});

describe('Sidebar', () => {
  it('renders brand, nav, footer slots', () => {
    render(
      <Sidebar
        brand={<span data-testid="b">b</span>}
        nav={<span data-testid="n">n</span>}
        footer={<span data-testid="f">f</span>}
      />,
    );
    expect(screen.getByTestId('b')).toBeInTheDocument();
    expect(screen.getByTestId('n')).toBeInTheDocument();
    expect(screen.getByTestId('f')).toBeInTheDocument();
  });

  it('is a11y clean', async () => {
    const { container } = render(
      <Sidebar brand={<span>Compass</span>} nav={<button>Home</button>} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Topbar', () => {
  it('renders breadcrumb', () => {
    render(<Topbar breadcrumb="Morning" />);
    expect(screen.getByText('Morning')).toBeInTheDocument();
  });
});

describe('Surface + Grid12', () => {
  it('renders', () => {
    const { container } = render(
      <Surface>
        <Grid12>
          <div className="col-span-6">a</div>
        </Grid12>
      </Surface>,
    );
    expect(container.textContent).toContain('a');
  });
});
