import { getBriefingHour, getReflectionHour } from './defaults';

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

export async function computeDesired(): Promise<DesiredAlarm[]> {
  const [briefingHour, reflectionHour] = await Promise.all([
    getBriefingHour(),
    getReflectionHour(),
  ]);
  return [
    { name: 'morning-brief', when: nextOccurrenceAtHour(briefingHour) },
    { name: 'eod-reflection', when: nextOccurrenceAtHour(reflectionHour) },
  ];
}

export interface AlarmsApi {
  getAll(): Promise<Array<{ name: string; scheduledTime: number }>>;
  create(name: string, info: { when: number }): Promise<void>;
  clear(name: string): Promise<boolean>;
}

const RESCHEDULE_TOLERANCE_MS = 60_000;

function defaultApi(): AlarmsApi {
  return chrome.alarms as unknown as AlarmsApi;
}

export async function ensureAlarms(api: AlarmsApi = defaultApi()): Promise<void> {
  const existing = await api.getAll();
  const desired = await computeDesired();

  for (const d of desired) {
    const e = existing.find((a) => a.name === d.name);
    if (!e) {
      await api.create(d.name, { when: d.when });
    } else if (Math.abs(e.scheduledTime - d.when) > RESCHEDULE_TOLERANCE_MS) {
      await api.clear(d.name);
      await api.create(d.name, { when: d.when });
    }
  }

  for (const e of existing) {
    if (!desired.find((d) => d.name === e.name)) {
      await api.clear(e.name);
    }
  }
}
