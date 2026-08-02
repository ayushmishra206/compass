/**
 * Hero greeting copy.
 *
 * The shell previously opened with the same fixed line every time
 * ("Move with momentum"), which reads as a product slogan rather than
 * something addressed to the person looking at it. These build the line from
 * what Compass actually knows: the hour, the user's name if they gave one, and
 * whether the working day has started.
 *
 * Pure and tested rather than inlined, because copy that changes by time of
 * day is exactly the kind of thing that breaks silently at 5am.
 */

export type DayPart = 'earlyMorning' | 'morning' | 'afternoon' | 'evening' | 'night';

export function dayPart(hour: number): DayPart {
  if (hour < 5) return 'night';
  if (hour < 8) return 'earlyMorning';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 22) return 'evening';
  return 'night';
}

const LEAD: Record<DayPart, string> = {
  earlyMorning: 'Early start',
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
  night: 'Still up',
};

/**
 * The greeting's lead and the word Compass emphasises.
 *
 * Split so the caller can render the emphasis in accent ink without parsing
 * a sentence back apart.
 */
export interface Greeting {
  lead: string;
  emphasis: string;
  trailing: string;
}

export function buildGreeting(now: Date, name?: string | null): Greeting {
  const part = dayPart(now.getHours());
  const trimmed = name?.trim();

  if (trimmed) {
    return { lead: `${LEAD[part]}, `, emphasis: trimmed, trailing: '.' };
  }

  // No name: emphasise the time of day instead of a generic slogan.
  const withoutName: Record<DayPart, Greeting> = {
    earlyMorning: { lead: 'An ', emphasis: 'early', trailing: ' start.' },
    morning: { lead: 'Good ', emphasis: 'morning', trailing: '.' },
    afternoon: { lead: 'Good ', emphasis: 'afternoon', trailing: '.' },
    evening: { lead: 'Good ', emphasis: 'evening', trailing: '.' },
    night: { lead: 'Still ', emphasis: 'up', trailing: '.' },
  };
  return withoutName[part];
}

/**
 * Sub-line under the greeting.
 *
 * Prefers the brief's own one-line mood — it was written about today — and
 * falls back to scene flavour only when there is no brief yet.
 */
export function buildSubline(opts: {
  briefMood?: string | null;
  briefTldr?: string | null;
  sceneMood: string;
  fallbackBySceneMood: Record<string, string>;
}): string {
  const parts = [opts.briefMood?.trim(), opts.briefTldr?.trim()].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return opts.fallbackBySceneMood[opts.sceneMood] ?? '';
}

/** "90 min" / "1h 30m" style label for a focus suggestion. */
export function focusLabel(minutes: number | null | undefined): string {
  const m = minutes && minutes > 0 ? Math.round(minutes) : 25;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h} hr` : `${h}h ${rem}m`;
}
