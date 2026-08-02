import { useEffect, useState } from 'react';
import { rpc } from '@compass/runtime';

export interface FocusSignals {
  peakFocusHour: number | null;
  streakDays: number;
  streakLastDate: string | null;
  totalFocusMin: number;
  completedSessions: number;
  burnoutEwma: number;
}

const EMPTY: FocusSignals = {
  peakFocusHour: null,
  streakDays: 0,
  streakLastDate: null,
  totalFocusMin: 0,
  completedSessions: 0,
  burnoutEwma: 0,
};

/** "9 am", "2 pm" — the form the Ticker shows. */
export function formatHour(hour: number | null): string | null {
  if (hour === null) return null;
  const suffix = hour < 12 ? 'am' : 'pm';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${suffix}`;
}

export function formatFocusTime(totalMin: number): string {
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function useFocusSignals(): FocusSignals {
  const [signals, setSignals] = useState<FocusSignals>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    void rpc('personalization.signals', {})
      .then((s) => {
        if (!cancelled) setSignals(s);
      })
      // No signals is a normal early state, not an error worth surfacing.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return signals;
}
