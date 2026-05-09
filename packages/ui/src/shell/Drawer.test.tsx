import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Drawer } from './Drawer.js';

describe('Drawer', () => {
  it('renders title, meta, and body when open', () => {
    const { getByText } = render(
      <Drawer open kind="brief" title="Morning brief" meta="claude · 4.2s" onClose={() => {}}>
        <p>body content</p>
      </Drawer>,
    );
    expect(getByText('Morning brief')).toBeTruthy();
    expect(getByText('claude · 4.2s')).toBeTruthy();
    expect(getByText('body content')).toBeTruthy();
  });

  it('hides the close button + scrim-noop when dismissLocked is true', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Drawer open kind="onboarding" title="Welcome" onClose={onClose} dismissLocked>
        <p>step</p>
      </Drawer>,
    );
    const close = container.querySelector('[data-testid="drawer-close"]');
    expect(close).toBeFalsy();

    const scrim = container.querySelector('[data-testid="drawer-scrim"]') as HTMLElement;
    fireEvent.click(scrim);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when scrim clicked (unlocked)', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Drawer open kind="brief" title="Brief" onClose={onClose}>
        <p />
      </Drawer>,
    );
    const scrim = container.querySelector('[data-testid="drawer-scrim"]') as HTMLElement;
    fireEvent.click(scrim);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render the panel when open is false', () => {
    const { container } = render(
      <Drawer open={false} kind={null} title="" onClose={() => {}}>
        <p>body</p>
      </Drawer>,
    );
    expect(container.querySelector('.drawer.on')).toBeFalsy();
  });
});
