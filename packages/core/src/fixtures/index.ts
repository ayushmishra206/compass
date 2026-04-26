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

export const USER: UserProfile = {
  id: 'u1',
  name: 'Ayush',
  email: 'ayush@compassdash.com',
  timezone: 'America/New_York',
  plus: true,
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

export const GOALS: Goal[] = [
  {
    id: 'g1',
    title: 'Launch Compass AI upgrade to Plus users',
    horizon: 'quarter',
    weeksRemaining: 6,
    progress: 0.62,
    why: 'It is the hinge feature for Plus retention. If the morning brief works, everything else lands.',
    milestones: [
      { week: 1, title: 'Provider abstraction + BYOK storage', done: true },
      { week: 2, title: 'Offscreen runtime + SQLite-vec wired', done: true },
      { week: 3, title: 'Daily Agent MVP behind flag', done: true },
      { week: 4, title: 'Semantic Notes auto-linking', done: true, current: true },
      { week: 5, title: 'Adaptive personalization signals', done: false },
      { week: 6, title: 'Smarter blocker negotiation', done: false },
      { week: 7, title: 'Gmail + Meeting AI in staging', done: false },
      { week: 8, title: 'Closed beta — 200 users', done: false },
    ],
    dailyTemplates: [
      'One 90-min PRD / spec block',
      'One 45-min review / unblock block',
      'Tue + Thu: demo rehearsal',
    ],
  },
  {
    id: 'g2',
    title: 'Run a 10k under 48 minutes',
    horizon: 'quarter',
    weeksRemaining: 9,
    progress: 0.28,
    why: 'Recovery has been drifting; a concrete target fixes the training cadence.',
    milestones: [
      { week: 1, title: 'Three 5k runs to set a baseline', done: true },
      { week: 2, title: 'Add one tempo run mid-week', done: true, current: true },
      { week: 3, title: 'First 8k at steady pace', done: false },
    ],
    dailyTemplates: ['20 min easy on Tue/Thu', 'Long run Sat'],
  },
  {
    id: 'g3',
    title: 'Read 12 books this year (3/12)',
    horizon: 'year',
    weeksRemaining: 35,
    progress: 0.25,
    why: '',
    milestones: [],
    dailyTemplates: [],
  },
];

export const NOTES: Note[] = [
  {
    id: 'n1',
    title: 'Compass AI — architecture decisions',
    excerpt:
      'Offscreen doc owns heavy work. Service worker stays thin. OPFS-backed SQLite with sqlite-vec for semantic search…',
    tags: ['compass', 'architecture'],
    updated: '2h ago',
    related: [
      { id: 'n2', reason: 'Both discuss the offscreen runtime and SQLite-vec choice.', sim: 0.88 },
      {
        id: 'n3',
        reason: 'This one covers the embedding model trade-off you revisit here.',
        sim: 0.81,
      },
      {
        id: 'n4',
        reason: 'Earlier sketch of the same PRD outline — 5 months old.',
        sim: 0.83,
        stale: true,
      },
    ],
  },
  {
    id: 'n2',
    title: 'Offscreen runtime notes',
    excerpt:
      'Decision rule: anything needing DOM, WebGPU, OPFS sync handles, or > 25s work goes offscreen…',
    tags: ['compass'],
    updated: 'yesterday',
    related: [],
  },
  {
    id: 'n3',
    title: 'Embedding model trade-offs',
    excerpt:
      'all-MiniLM-L6-v2 quantized int8 runs in ~380ms on M1. text-embedding-3-small better recall but adds a net dep…',
    tags: ['ml', 'compass'],
    updated: '3 days ago',
    related: [],
  },
  {
    id: 'n4',
    title: 'PRD outline — Nov 2025',
    excerpt: 'Proactive daily agent, semantic notes, smart blocker. Goal decomposition as stretch…',
    tags: ['compass', 'archive'],
    updated: '5 months ago',
    related: [],
  },
  {
    id: 'n5',
    title: 'Pricing meeting — 04/14',
    excerpt:
      'Mira: Plus at $39 is under-priced relative to Arc + Raycast. Consider $49 with a 30-day trial…',
    tags: ['pricing'],
    updated: 'last week',
    related: [],
  },
  {
    id: 'n6',
    title: 'Running form cues',
    excerpt: 'Cadence 178. Forefoot, light ankle. Exhale on the off-foot…',
    tags: ['running'],
    updated: '2 weeks ago',
    related: [],
  },
  {
    id: 'n7',
    title: 'Vision board — Q2',
    excerpt: 'Ship AI upgrade. Sub-48 10k. Finish Seeing Like a State. One trip, offline…',
    tags: ['goals'],
    updated: '3 weeks ago',
    related: [],
  },
  {
    id: 'n8',
    title: 'Auth — reality check on sign-in-with-ChatGPT',
    excerpt:
      'Not publicly shippable as of Apr 2026. Waitlist since May 2025. OpenRouter OAuth is the nearest analog…',
    tags: ['compass', 'auth'],
    updated: 'a month ago',
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

export const BLOCK_RULES: BlockRule[] = [
  {
    id: 'b1',
    pattern: 'reddit.com',
    mode: 'soft',
    source: 'adaptive',
    strikes: 4,
    note: 'Triggered 8× during focus last week',
  },
  {
    id: 'b2',
    pattern: 'twitter.com, x.com',
    mode: 'soft',
    source: 'user',
    strikes: 2,
    note: 'Workdays 9am–5pm',
  },
  {
    id: 'b3',
    pattern: 'news.ycombinator.com',
    mode: 'hard',
    source: 'user',
    strikes: 0,
    note: 'Always',
  },
  {
    id: 'b4',
    pattern: 'youtube.com/shorts/*',
    mode: 'soft',
    source: 'adaptive',
    strikes: 1,
    note: 'Precedes abandoned Pomodoros',
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
