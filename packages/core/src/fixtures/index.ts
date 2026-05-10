import type {
  Brief,
  BlockRule,
  CalendarEvent,
  Goal,
  InboxAction,
  Note,
  Soundscape,
  Suggestion,
  UserProfile,
  Vitals,
} from '../types/index.js';

export const USER: UserProfile & { name: string } = {
  id: 'u1',
  createdAt: '2025-01-01T00:00:00Z',
  timezone: 'America/New_York',
  locale: 'en-US',
  workHours: { start: '09:00', end: '17:00' },
  briefingHour: 8,
  reflectionHour: 18,
  autoLinkEnabled: true,
  name: 'Casey',
};

export const BRIEF: Brief = {
  generatedAt: '2026-04-20T07:10:00',
  oneLineMood: 'Rested, but the afternoon stacks up.',
  tldr: "You've got a reasonable morning to move Compass AI forward — the 2–4 pm block is where the writing will actually happen. Three back-to-backs after lunch means your heads-down window is right now.",
  topPriority: {
    title: 'Ship PRD v1.0 to the reviewer group',
    why: 'Linked to Q2 goal; reviewer deadline is Tuesday. One 90-minute pass finishes it.',
    suggestedFocusMinutes: 90,
  },
  pomodoros: [
    { startLocal: '09:00', endLocal: '10:30', theme: 'PRD final pass', taskId: 't1' },
    { startLocal: '10:45', endLocal: '11:30', theme: 'Inbox triage + drafts', taskId: 't2' },
    { startLocal: '14:00', endLocal: '15:00', theme: 'Design review prep', taskId: 't3' },
  ],
  watchouts: [
    '3 back-to-backs after lunch — no buffer between 1 pm and 4 pm.',
    'Overdue: "Reply to Mira re: pricing" (2 days).',
    'Recovery is mid — go light on a fourth Pomodoro.',
  ],
  recovery: {
    note: 'Sleep 82 · Recovery 71 · RHR 58. Solid, not your best. A short walk at noon will pay off.',
    suggestBreak: true,
  },
  quotedGoal: 'Launch the AI upgrade to Plus users with ≥60% brief open rate.',
};

export const EVENTS: CalendarEvent[] = [
  { id: 'e1', start: '09:00', end: '09:15', summary: 'Standup', attendees: 5, focus: false },
  { id: 'e2', start: '12:30', end: '13:00', summary: 'Lunch walk', attendees: 1, focus: true },
  {
    id: 'e3',
    start: '13:00',
    end: '13:45',
    summary: 'Design review — Compass AI',
    attendees: 6,
    focus: false,
    prep: true,
  },
  { id: 'e4', start: '14:00', end: '14:30', summary: '1:1 with Mira', attendees: 2, focus: false },
  {
    id: 'e5',
    start: '15:00',
    end: '16:00',
    summary: 'Eng sync — auth rollout',
    attendees: 8,
    focus: false,
    prep: true,
  },
];

export const VITALS: Vitals = {
  sleep: 82,
  recovery: 71,
  rhr: 58,
  weather: { tempC: 14, summary: 'Mild, light drizzle' },
};

export const GOALS: Array<
  Goal & {
    progress: number;
    weeksRemaining: number;
    milestones: Array<{ week: number; title: string; done: boolean; current: boolean }>;
    dailyTemplates: string[];
  }
> = [
  {
    id: 'g1',
    createdAt: '2026-01-01T00:00:00Z',
    title: 'Launch Compass AI upgrade to Plus users',
    horizon: 'quarter',
    startDate: '2026-01-01',
    endDate: '2026-03-31',
    why: 'It is the hinge feature for Plus retention. If the morning brief works, everything else lands.',
    status: 'active',
    progress: 0.65,
    weeksRemaining: 8,
    milestones: [
      { week: 1, title: 'API scaffolding', done: true, current: false },
      { week: 2, title: 'LLM integration', done: true, current: false },
      { week: 3, title: 'Brief UX + personalization', done: false, current: true },
      { week: 4, title: 'QA + beta rollout', done: false, current: false },
    ],
    dailyTemplates: [
      'Review brief quality metrics in the dashboard',
      "Polish edge cases from yesterday's Q&A",
      'Prepare rollout comms for beta group',
    ],
  },
  {
    id: 'g2',
    createdAt: '2026-01-01T00:00:00Z',
    title: 'Run a 10k under 48 minutes',
    horizon: 'quarter',
    startDate: '2026-01-01',
    endDate: '2026-03-31',
    why: 'Recovery has been drifting; a concrete target fixes the training cadence.',
    status: 'active',
    progress: 0.4,
    weeksRemaining: 10,
    milestones: [
      { week: 1, title: 'Tempo runs establish baseline', done: true, current: false },
      { week: 3, title: 'VO2 max intervals', done: true, current: false },
      { week: 5, title: 'Sustained pace practice', done: false, current: true },
      { week: 8, title: 'Taper & race', done: false, current: false },
    ],
    dailyTemplates: [
      'Morning: 5 min easy, 10 min at goal pace, 5 min easy',
      'Strength work 3x per week (glutes, core)',
      'Recovery day light cross-training',
    ],
  },
  {
    id: 'g3',
    createdAt: '2026-01-01T00:00:00Z',
    title: 'Read 12 books this year (3/12)',
    horizon: 'year',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'active',
    progress: 0.25,
    weeksRemaining: 35,
    milestones: [],
    dailyTemplates: ['30 min morning reading before standup', 'One book per month on average'],
  },
];

export const NOTES: Array<
  Note & {
    excerpt?: string;
    updated?: string;
    related: Array<{ id: string; stale: boolean; sim: number; reason: string }>;
  }
> = [
  {
    id: 'n1',
    title: 'Compass AI — architecture decisions',
    body: 'Offscreen doc owns heavy work. Service worker stays thin. OPFS-backed SQLite with sqlite-vec for semantic search…',
    createdAt: '2026-04-24T00:00:00Z',
    updatedAt: '2026-04-26T00:00:00Z',
    manualLinks: [],
    autoLinks: [
      { targetNoteId: 'n2', similarity: 0.88, detectedAt: '2026-04-26T00:00:00Z', surfaced: true },
      { targetNoteId: 'n3', similarity: 0.81, detectedAt: '2026-04-26T00:00:00Z', surfaced: true },
      { targetNoteId: 'n4', similarity: 0.83, detectedAt: '2026-04-26T00:00:00Z', surfaced: false },
    ],
    tags: ['compass', 'architecture'],
    embeddingModel: 'all-MiniLM-L6-v2',
    excerpt:
      'Decision rule: anything needing DOM, WebGPU, OPFS sync handles, or more than ~25 seconds of work goes in the offscreen document.',
    updated: 'Apr 26',
    related: [{ id: 'n4', stale: true, sim: 0.83, reason: 'shared concept: offscreen' }],
  },
  {
    id: 'n2',
    title: 'Offscreen runtime notes',
    body: 'Decision rule: anything needing DOM, WebGPU, OPFS sync handles, or > 25s work goes offscreen…',
    createdAt: '2026-04-25T00:00:00Z',
    updatedAt: '2026-04-25T00:00:00Z',
    manualLinks: [],
    autoLinks: [],
    tags: ['compass'],
    embeddingModel: 'all-MiniLM-L6-v2',
    excerpt: 'Service worker stays thin. Offscreen doc handles heavy work.',
    updated: 'Apr 25',
    related: [],
  },
  {
    id: 'n3',
    title: 'Embedding model trade-offs',
    body: 'all-MiniLM-L6-v2 quantized int8 runs in ~380ms on M1. text-embedding-3-small better recall but adds a net dep…',
    createdAt: '2026-04-23T00:00:00Z',
    updatedAt: '2026-04-23T00:00:00Z',
    manualLinks: [],
    autoLinks: [],
    tags: ['ml', 'compass'],
    embeddingModel: 'all-MiniLM-L6-v2',
    excerpt: 'Comparing embedding models for local semantic search.',
    updated: 'Apr 23',
    related: [],
  },
  {
    id: 'n4',
    title: 'PRD outline — Nov 2025',
    body: 'Proactive daily agent, semantic notes, smart blocker. Goal decomposition as stretch…',
    createdAt: '2025-11-26T00:00:00Z',
    updatedAt: '2025-11-26T00:00:00Z',
    manualLinks: [],
    autoLinks: [],
    tags: ['compass', 'archive'],
    embeddingModel: 'all-MiniLM-L6-v2',
    excerpt: 'Early feature brainstorm for Compass AI platform.',
    updated: 'Nov 25',
    related: [],
  },
  {
    id: 'n5',
    title: 'Pricing meeting — 04/14',
    body: 'Mira: Plus at $39 is under-priced relative to Arc + Raycast. Consider $49 with a 30-day trial…',
    createdAt: '2026-04-14T00:00:00Z',
    updatedAt: '2026-04-19T00:00:00Z',
    manualLinks: [],
    autoLinks: [],
    tags: ['pricing'],
    embeddingModel: 'all-MiniLM-L6-v2',
    excerpt: 'Board meeting notes on pricing strategy for Q2.',
    updated: 'Apr 19',
    related: [],
  },
  {
    id: 'n6',
    title: 'Running form cues',
    body: 'Cadence 178. Forefoot, light ankle. Exhale on the off-foot…',
    createdAt: '2026-04-12T00:00:00Z',
    updatedAt: '2026-04-12T00:00:00Z',
    manualLinks: [],
    autoLinks: [],
    tags: ['running'],
    embeddingModel: 'all-MiniLM-L6-v2',
    excerpt: 'Personal notes on running mechanics and cadence.',
    updated: 'Apr 12',
    related: [],
  },
  {
    id: 'n7',
    title: 'Vision board — Q2',
    body: 'Ship AI upgrade. Sub-48 10k. Finish Seeing Like a State. One trip, offline…',
    createdAt: '2026-04-05T00:00:00Z',
    updatedAt: '2026-04-05T00:00:00Z',
    manualLinks: [],
    autoLinks: [],
    tags: ['goals'],
    embeddingModel: 'all-MiniLM-L6-v2',
    excerpt: 'Q2 goals and vision statement.',
    updated: 'Apr 5',
    related: [],
  },
  {
    id: 'n8',
    title: 'Auth — reality check on sign-in-with-ChatGPT',
    body: 'Not publicly shippable as of Apr 2026. Waitlist since May 2025. OpenRouter OAuth is the nearest analog…',
    createdAt: '2026-03-26T00:00:00Z',
    updatedAt: '2026-03-26T00:00:00Z',
    manualLinks: [],
    autoLinks: [],
    tags: ['compass', 'auth'],
    embeddingModel: 'all-MiniLM-L6-v2',
    excerpt: 'Investigation into ChatGPT login and OpenRouter alternatives.',
    updated: 'Mar 26',
    related: [],
  },
];

export const INBOX_ACTIONS: InboxAction[] = [
  {
    id: 'a1',
    from: 'Mira Chen',
    email: 'mira@compassdash.com',
    subject: 'Re: Plus pricing — where did we land?',
    priority: 'p1',
    received: '7:02 am',
    actions: [
      {
        title: 'Send the pricing memo with the three scenarios',
        owner: 'me',
        due: 'today',
        type: 'reply',
        confidence: 0.91,
      },
    ],
    snippet:
      "Hey — I'm presenting to the board Thursday and still don't have the three scenarios written up. The 9am slot is the last chance to review together…",
    hasDraft: true,
  },
  {
    id: 'a2',
    from: 'CASA Security Review',
    email: 'security@casa.example',
    subject: 'Gmail scope review — response needed',
    priority: 'p1',
    received: '6:41 am',
    actions: [
      {
        title: 'Respond to security questionnaire (12 items)',
        owner: 'me',
        due: 'Apr 24',
        type: 'task',
        confidence: 0.88,
      },
    ],
    snippet:
      'Your Tier-2 assessment is in queue. Please complete the attached questionnaire by EOD Friday so we can proceed with the scope review…',
    hasDraft: false,
  },
  {
    id: 'a3',
    from: 'Jordan Kim',
    email: 'jordan@supplier.example',
    subject: 'Figma library — new icons uploaded',
    priority: 'p3',
    received: 'yesterday',
    actions: [
      {
        title: 'Review 14 new icons, approve/reject',
        owner: 'me',
        due: 'no deadline',
        type: 'task',
        confidence: 0.72,
      },
    ],
    snippet:
      'Just pushed the new sprint of icons to the shared library. Let me know if anything needs a second pass…',
    hasDraft: false,
  },
  {
    id: 'a4',
    from: 'Stripe',
    email: 'billing@stripe.com',
    subject: 'Your April invoice is available',
    priority: 'p4',
    received: 'yesterday',
    actions: [],
    snippet: '',
    hasDraft: false,
  },
];

export const BLOCK_RULES: Array<BlockRule & { note?: string }> = [
  {
    id: 'b1',
    pattern: 'reddit.com',
    mode: 'soft',
    source: 'adaptive',
    createdAt: '2026-04-20T00:00:00Z',
    strikes: 4,
  },
  {
    id: 'b2',
    pattern: 'twitter.com, x.com',
    mode: 'soft',
    source: 'user',
    createdAt: '2026-04-15T00:00:00Z',
    strikes: 2,
  },
  {
    id: 'b3',
    pattern: 'news.ycombinator.com',
    mode: 'hard',
    source: 'user',
    createdAt: '2026-04-10T00:00:00Z',
    strikes: 0,
  },
  {
    id: 'b4',
    pattern: 'youtube.com/shorts/*',
    mode: 'soft',
    source: 'adaptive',
    createdAt: '2026-04-22T00:00:00Z',
    strikes: 1,
  },
];

export const SOUNDSCAPES: Soundscape[] = [
  { id: 's1', name: 'Rain on leaves', loved: true },
  { id: 's2', name: 'Coffee shop, low', loved: false },
  { id: 's3', name: 'Deep pink noise', loved: false },
  { id: 's4', name: 'Thunder, far', loved: false },
];

export const SUGGESTIONS: Suggestion[] = [
  {
    id: 'p1',
    kind: 'peak_shift',
    body: "Your peak focus has drifted 40 min later this week. Nudge tomorrow's first Pomodoro to 9:45?",
    action: 'schedule_focus',
  },
  {
    id: 'p2',
    kind: 'burnout_warn',
    body: 'Interrupt count is up 32% over 14 days; sleep score is trending down. Consider a lighter Wednesday.',
    action: 'pause_goals',
  },
];

/** Format a Date into `h:mm am/pm` (mirrors the prototype helper). */
export function fmtTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${m} ${h < 12 ? 'am' : 'pm'}`;
}
