import { BRIEFING_HOUR, REFLECTION_HOUR } from './defaults';

export interface DesiredAlarm {
  name: string;
  when: number;
}

function nextOccurrenceAtHour(hour: number): number {
  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(hour, 0, 0, 0);
  if (candidate.getTime() <= now.getTime()) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate.getTime();
}

export function computeDesired(): DesiredAlarm[] {
  return [
    { name: 'morning-brief', when: nextOccurrenceAtHour(BRIEFING_HOUR) },
    { name: 'eod-reflection', when: nextOccurrenceAtHour(REFLECTION_HOUR) },
  ];
}
