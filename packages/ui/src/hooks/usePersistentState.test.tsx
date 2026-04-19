import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePersistentState } from './usePersistentState.js';

function Host({ k, init }: { k: string; init: string }) {
  const [v, setV] = usePersistentState(k, init);
  return <button onClick={() => setV('next')}>{v}</button>;
}

describe('usePersistentState', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('returns initial when nothing stored', () => {
    render(<Host k="x" init="first" />);
    expect(screen.getByRole('button')).toHaveTextContent('first');
  });

  it('persists updates to localStorage', () => {
    render(<Host k="x" init="first" />);
    act(() => {
      screen.getByRole('button').click();
    });
    expect(JSON.parse(localStorage.getItem('x')!)).toBe('next');
  });

  it('rehydrates stored value on fresh mount', () => {
    localStorage.setItem('y', JSON.stringify('remembered'));
    render(<Host k="y" init="ignored" />);
    expect(screen.getByRole('button')).toHaveTextContent('remembered');
  });
});
