export * from './credentials';
export * from './ping';
export * from './ledger';
export * from './user';
export * from './configuration';
export * from './goal';
export * from './milestone';
export * from './note';
export * from './focus';
export * from './block';
export * from './briefing';
export * from './gmail';
export * from './meeting';
export * from './telemetry';

/**
 * Phase 0 mock fixture types — kept for backward compatibility with fixtures.
 * Phase 1 Zod schemas are the source of truth; these TypeScript-only definitions
 * are legacy and will be sunset when fixtures migrate to Zod-inferred types.
 */

export interface TopPriority {
  title: string;
  why: string;
  suggestedFocusMinutes: number;
}

export interface Pomodoro {
  startLocal: string;
  endLocal: string;
  theme: string;
  taskId?: string;
}

export interface Recovery {
  note: string;
  suggestBreak: boolean;
}

export interface Brief {
  generatedAt: string;
  oneLineMood: string;
  tldr: string;
  topPriority: TopPriority;
  pomodoros: Pomodoro[];
  watchouts: string[];
  recovery: Recovery;
  quotedGoal: string | null;
}

export interface CalendarEvent {
  id: string;
  start: string;
  end: string;
  summary: string;
  attendees: number;
  focus: boolean;
  prep?: boolean;
}

export interface Vitals {
  sleep: number | null;
  recovery: number | null;
  rhr: number | null;
  weather: { tempC: number; summary: string } | null;
}

export interface Soundscape {
  id: string;
  name: string;
  loved: boolean;
}

export interface Suggestion {
  id: string;
  kind: 'peak_shift' | 'burnout_warn' | 'soundscape_swap' | 'break_prompt';
  body: string;
  action: string;
}

export type InboxPriority = 'p1' | 'p2' | 'p3' | 'p4';

export interface ExtractedActionLegacy {
  title: string;
  owner: 'me' | 'other' | 'ambiguous';
  due: string;
  type: 'reply' | 'task' | 'meeting' | 'fyi';
  confidence: number;
}

export interface InboxAction {
  id: string;
  from: string;
  email: string;
  subject: string;
  priority: InboxPriority;
  received: string;
  actions: ExtractedActionLegacy[];
  snippet: string;
  hasDraft: boolean;
}
