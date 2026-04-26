/**
 * Entity types for Phase 0 mock fixtures. Phase 1 replaces these with Zod
 * schemas per PRD §6, with TS types derived via `z.infer<>`.
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  timezone: string;
  plus: boolean;
}

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

export interface Milestone {
  week: number;
  title: string;
  done: boolean;
  current?: boolean;
  targetDate?: string;
  definitionOfDone?: string;
}

export interface Goal {
  id: string;
  title: string;
  horizon: 'quarter' | 'year' | 'custom';
  weeksRemaining: number;
  progress: number;
  why: string;
  milestones: Milestone[];
  dailyTemplates: string[];
  status?: 'active' | 'paused' | 'achieved' | 'abandoned';
}

export interface GoalDecomposition {
  generatedAt: string;
  milestones: Milestone[];
  dailyTemplates: string[];
  risks: string[];
  firstWeekFocus: string;
}

export interface AutoLink {
  id: string;
  reason: string;
  sim: number;
  stale?: boolean;
}

export interface Note {
  id: string;
  title: string;
  excerpt: string;
  body?: string;
  tags: string[];
  updated: string;
  related: AutoLink[];
}

export type InboxPriority = 'p1' | 'p2' | 'p3' | 'p4';

export interface ExtractedAction {
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
  actions: ExtractedAction[];
  snippet: string;
  hasDraft: boolean;
}

export interface BlockRule {
  id: string;
  pattern: string;
  mode: 'soft' | 'hard';
  source: 'user' | 'adaptive';
  strikes: number;
  note: string;
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

export type NegotiationOffer =
  | 'grant_5min'
  | 'suggest_break'
  | 'redirect_to_focus'
  | 'just_acknowledge';

export interface NegotiationTurn {
  role: 'user' | 'assistant';
  text: string;
  offer?: NegotiationOffer;
}
