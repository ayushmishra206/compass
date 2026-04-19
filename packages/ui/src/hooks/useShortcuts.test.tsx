import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useShortcuts } from './useShortcuts.js';

function Host({ shortcuts }: { shortcuts: Parameters<typeof useShortcuts>[0] }) {
  useShortcuts(shortcuts);
  return <div />;
}

describe('useShortcuts', () => {
  it('triggers ⌘+K', () => {
    const cb = vi.fn();
    render(<Host shortcuts={[{ keys: ['⌘', 'k'], handler: cb }]} />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('triggers single Escape', () => {
    const cb = vi.fn();
    render(<Host shortcuts={[{ keys: ['escape'], handler: cb }]} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(cb).toHaveBeenCalled();
  });

  it('triggers ? b chord', () => {
    const cb = vi.fn();
    render(<Host shortcuts={[{ keys: ['?', 'b'], handler: cb }]} />);
    act(() => {
      fireEvent.keyDown(document, { key: '?' });
      fireEvent.keyDown(document, { key: 'b' });
    });
    expect(cb).toHaveBeenCalled();
  });

  it('does not trigger ⌘+K without modifier', () => {
    const cb = vi.fn();
    render(<Host shortcuts={[{ keys: ['⌘', 'k'], handler: cb }]} />);
    fireEvent.keyDown(document, { key: 'k' });
    expect(cb).not.toHaveBeenCalled();
  });

  it('respects active=false', () => {
    const cb = vi.fn();
    const { rerender } = render(<Host shortcuts={[{ keys: ['⌘', 'k'], handler: cb }]} />);
    rerender(<Host shortcuts={[]} />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(cb).not.toHaveBeenCalled();
  });
});
