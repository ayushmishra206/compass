import { useEffect, useState } from 'react';

export interface GeolocationResult {
  coords: { lat: number; lon: number } | null;
  error: string | null;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Wraps navigator.geolocation. Only fires when `enabled` flips true.
 * Coords are rounded to ~10 km (3 decimals) before exposure to limit
 * the location surface area we ever hold in memory.
 */
export function useGeolocation({ enabled }: { enabled: boolean }): GeolocationResult {
  const [coords, setCoords] = useState<GeolocationResult['coords']>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!navigator.geolocation) {
      setError('geolocation unavailable');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: round3(pos.coords.latitude),
          lon: round3(pos.coords.longitude),
        });
        setError(null);
      },
      (err) => {
        setError(err.message || 'denied');
        setCoords(null);
      },
      { enableHighAccuracy: false, maximumAge: 24 * 60 * 60 * 1000 },
    );
  }, [enabled]);

  return { coords, error };
}
