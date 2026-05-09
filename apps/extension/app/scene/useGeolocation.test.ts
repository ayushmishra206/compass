import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGeolocation } from './useGeolocation.js';

describe('useGeolocation', () => {
  let getCurrentPosition: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getCurrentPosition = vi.fn();
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });
  });

  it('returns null until enabled is true', () => {
    const { result } = renderHook(() => useGeolocation({ enabled: false }));
    expect(result.current.coords).toBe(null);
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('rounds coords to 3 decimals when permission granted', async () => {
    getCurrentPosition.mockImplementation((ok: PositionCallback) =>
      ok({
        coords: {
          latitude: 40.7128123,
          longitude: -74.0060456,
        } as GeolocationCoordinates,
      } as GeolocationPosition),
    );
    const { result } = renderHook(() => useGeolocation({ enabled: true }));
    await waitFor(() => expect(result.current.coords).not.toBe(null));
    expect(result.current.coords).toEqual({ lat: 40.713, lon: -74.006 });
  });

  it('reports permission error without crashing', async () => {
    getCurrentPosition.mockImplementation((_ok: PositionCallback, err: PositionErrorCallback) =>
      err({ code: 1, message: 'denied' } as GeolocationPositionError),
    );
    const { result } = renderHook(() => useGeolocation({ enabled: true }));
    await waitFor(() => expect(result.current.error).toBe('denied'));
    expect(result.current.coords).toBe(null);
  });
});
