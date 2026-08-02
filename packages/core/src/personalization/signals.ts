/**
 * Adaptive Personalization statistics, PRD §15.2.
 *
 * Deliberately pure functions over completed-session records: no LLM, no
 * network, no storage. Everything here must be explainable to the user in one
 * sentence, because these numbers drive nudges and a nudge you cannot justify
 * is just noise.
 */

export interface SessionRecord {
  /** ISO-8601 start instant. */
  startedAt: string;
  durationMin: number;
  completed: boolean;
  interruptCount: number;
  soundscapeId?: string | null;
}

export interface FocusSignals {
  /** Local hour 0–23 with the most completed focus time, or null if unknown. */
  peakFocusHour: number | null;
  /** Consecutive days ending today with at least one completed session. */
  streakDays: number;
  /** YYYY-MM-DD of the most recent day with a completed session. */
  streakLastDate: string | null;
  totalFocusMin: number;
  completedSessions: number;
}

/** Minimum completed sessions before a peak hour is worth claiming. */
const PEAK_HOUR_MIN_SESSIONS = 5;

function localDate(iso: string, timezone: string): string {
  // 'sv-SE' yields YYYY-MM-DD.
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone: timezone });
}

function localHour(iso: string, timezone: string): number {
  return Number(
    new Date(iso).toLocaleString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      hour12: false,
    }),
  );
}

function addDays(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/**
 * Peak focus hour, weighted by minutes rather than session count so one long
 * block outweighs three interrupted ones.
 *
 * Returns null below PEAK_HOUR_MIN_SESSIONS — with two sessions the "peak" is
 * whenever the user happened to sit down, and presenting that as a discovered
 * pattern would be a lie.
 */
export function peakFocusHour(sessions: SessionRecord[], timezone: string): number | null {
  const completed = sessions.filter((s) => s.completed);
  if (completed.length < PEAK_HOUR_MIN_SESSIONS) return null;

  const byHour = new Map<number, number>();
  for (const s of completed) {
    const h = localHour(s.startedAt, timezone);
    if (!Number.isFinite(h)) continue;
    byHour.set(h, (byHour.get(h) ?? 0) + s.durationMin);
  }
  if (byHour.size === 0) return null;

  let best: number | null = null;
  let bestMin = -1;
  // Iterate ascending so ties resolve to the earlier hour deterministically.
  for (const hour of [...byHour.keys()].sort((a, b) => a - b)) {
    const min = byHour.get(hour)!;
    if (min > bestMin) {
      bestMin = min;
      best = hour;
    }
  }
  return best;
}

/**
 * Consecutive days with at least one completed session, counting back from
 * today. Today not yet having a session does not break the streak — it is
 * still in progress — but yesterday's absence does.
 */
export function focusStreak(
  sessions: SessionRecord[],
  timezone: string,
  now: Date,
): { streakDays: number; streakLastDate: string | null } {
  const days = new Set(
    sessions.filter((s) => s.completed).map((s) => localDate(s.startedAt, timezone)),
  );
  if (days.size === 0) return { streakDays: 0, streakLastDate: null };

  const today = now.toLocaleDateString('sv-SE', { timeZone: timezone });
  // Start at today if it has a session, else yesterday — an unfinished today
  // should not zero a streak the user has not actually broken.
  let cursor = days.has(today) ? today : addDays(today, -1);
  if (!days.has(cursor)) return { streakDays: 0, streakLastDate: null };

  const streakLastDate = cursor;
  let streakDays = 0;
  while (days.has(cursor)) {
    streakDays++;
    cursor = addDays(cursor, -1);
  }
  return { streakDays, streakLastDate };
}

/**
 * Mean completed-session length per soundscape. Only completed sessions count:
 * an abandoned session says nothing good about what was playing.
 */
export function soundscapeCorrelations(sessions: SessionRecord[]): Record<string, number> {
  const totals = new Map<string, { min: number; n: number }>();
  for (const s of sessions) {
    if (!s.completed || !s.soundscapeId) continue;
    const cur = totals.get(s.soundscapeId) ?? { min: 0, n: 0 };
    cur.min += s.durationMin;
    cur.n += 1;
    totals.set(s.soundscapeId, cur);
  }
  const out: Record<string, number> = {};
  for (const [id, { min, n }] of totals) out[id] = min / n;
  return out;
}

/**
 * Exponentially-weighted moving average of daily interruptions per session,
 * a coarse proxy for the fragmentation that precedes burnout.
 *
 * Higher is worse. Returns 0 for no data rather than null so callers can
 * threshold without a special case.
 *
 * alpha is 0.5, not the more conventional 0.2–0.3. The series is seeded with
 * the first observation (standard, to avoid biasing toward zero), which means
 * the seed keeps (1-alpha)^(n-1) of the weight. Over the short histories this
 * actually runs on — a user with a week of data — a low alpha leaves the
 * OLDEST day outweighing the newest, which is backwards for a signal whose
 * entire purpose is to notice that things got worse lately.
 */
export function burnoutEwma(sessions: SessionRecord[], timezone: string, alpha = 0.5): number {
  const byDay = new Map<string, { interrupts: number; n: number }>();
  for (const s of sessions) {
    const day = localDate(s.startedAt, timezone);
    const cur = byDay.get(day) ?? { interrupts: 0, n: 0 };
    cur.interrupts += s.interruptCount;
    cur.n += 1;
    byDay.set(day, cur);
  }
  const days = [...byDay.keys()].sort();
  if (days.length === 0) return 0;

  let ewma = 0;
  let seeded = false;
  for (const day of days) {
    const { interrupts, n } = byDay.get(day)!;
    const rate = n === 0 ? 0 : interrupts / n;
    ewma = seeded ? alpha * rate + (1 - alpha) * ewma : rate;
    seeded = true;
  }
  return Number(ewma.toFixed(3));
}

export function computeFocusSignals(
  sessions: SessionRecord[],
  timezone: string,
  now: Date,
): FocusSignals {
  const completed = sessions.filter((s) => s.completed);
  const { streakDays, streakLastDate } = focusStreak(sessions, timezone, now);
  return {
    peakFocusHour: peakFocusHour(sessions, timezone),
    streakDays,
    streakLastDate,
    totalFocusMin: completed.reduce((sum, s) => sum + s.durationMin, 0),
    completedSessions: completed.length,
  };
}
