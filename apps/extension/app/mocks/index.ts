/**
 * MOCK fixture — Phase 1.6 shell-only pivot.
 *
 * Every drawer body, the Hero "Top of mind" card, and the Ticker render
 * against this object. Each pillar phase replaces its slice with a real
 * RPC call. Sourced verbatim from
 * docs/superpowers/specs/2026-05-03-shell-pivot-design/mock-data.ts.
 */

export const MOCK = {
  user: {
    name: 'Ayush',
    email: 'ayush@compassdash.com',
    tz: 'America/New_York',
    plus: true,
  },
  brief: {
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
  },
  events: [
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
    {
      id: 'e4',
      start: '14:00',
      end: '14:30',
      summary: '1:1 with Mira',
      attendees: 2,
      focus: false,
    },
    {
      id: 'e5',
      start: '15:00',
      end: '16:00',
      summary: 'Eng sync — auth rollout',
      attendees: 8,
      focus: false,
      prep: true,
    },
  ],
  vitals: {
    sleep: 82,
    recovery: 71,
    rhr: 58,
    weather: { tempC: 14, summary: 'Mild, light drizzle' },
  },
  goals: [
    {
      id: 'g1',
      title: 'Launch Compass AI upgrade to Plus users',
      horizon: 'quarter' as const,
      weeksRemaining: 6,
      progress: 0.62,
      why: 'It is the hinge feature for Plus retention. If the morning brief works, everything else lands.',
      milestones: [
        { week: 1, title: 'Provider abstraction + BYOK storage', done: true },
        { week: 2, title: 'Offscreen runtime + SQLite-vec wired', done: true },
        { week: 3, title: 'Daily Agent MVP behind flag', done: true },
        { week: 4, title: 'Semantic Notes auto-linking', done: true, current: true },
        { week: 5, title: 'Adaptive personalization signals', done: false },
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
      horizon: 'quarter' as const,
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
  ],
  notes: [
    {
      id: 'n1',
      title: 'Compass AI — architecture decisions',
      excerpt:
        'Offscreen doc owns heavy work. Service worker stays thin. OPFS-backed SQLite with sqlite-vec for semantic search…',
      tags: ['compass', 'architecture'],
      updated: '2h ago',
      related: [
        {
          id: 'n2',
          reason: 'Both discuss the offscreen runtime and SQLite-vec choice.',
          sim: 0.88,
        },
        {
          id: 'n3',
          reason: 'This one covers the embedding model trade-off you revisit here.',
          sim: 0.81,
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
      excerpt: 'all-MiniLM-L6-v2 quantized int8 runs in ~380ms on M1.',
      tags: ['ml', 'compass'],
      updated: '3 days ago',
      related: [],
    },
  ],
  inboxActions: [
    {
      id: 'a1',
      from: 'Mira Chen',
      email: 'mira@compassdash.com',
      subject: 'Re: Plus pricing — where did we land?',
      priority: 'p1' as const,
      received: '7:02 am',
      actions: [
        {
          title: 'Send the pricing memo with the three scenarios',
          owner: 'me' as const,
          due: 'today',
          type: 'reply' as const,
          confidence: 0.91,
        },
      ],
      snippet:
        "Hey — I'm presenting to the board Thursday and still don't have the three scenarios written up.",
      hasDraft: true,
    },
    {
      id: 'a2',
      from: 'CASA Security Review',
      email: 'security@casa.example',
      subject: 'Gmail scope review — response needed',
      priority: 'p1' as const,
      received: '6:41 am',
      actions: [
        {
          title: 'Respond to security questionnaire (12 items)',
          owner: 'me' as const,
          due: 'Apr 24',
          type: 'task' as const,
          confidence: 0.88,
        },
      ],
      snippet: 'Your Tier-2 assessment is in queue.',
      hasDraft: false,
    },
  ],
  blockRules: [
    {
      id: 'b1',
      pattern: 'reddit.com',
      mode: 'soft' as const,
      source: 'adaptive' as const,
      strikes: 4,
      note: 'Triggered 8× during focus last week',
    },
    {
      id: 'b2',
      pattern: 'twitter.com, x.com',
      mode: 'soft' as const,
      source: 'user' as const,
      strikes: 2,
      note: 'Workdays 9am–5pm',
    },
    {
      id: 'b3',
      pattern: 'news.ycombinator.com',
      mode: 'hard' as const,
      source: 'user' as const,
      strikes: 0,
      note: 'Always',
    },
  ],
  soundscapes: [
    { id: 's1', name: 'Rain on leaves', loved: true },
    { id: 's2', name: 'Coffee shop, low', loved: false },
    { id: 's3', name: 'Deep pink noise', loved: false },
    { id: 's4', name: 'Thunder, far', loved: false },
  ],
} as const;

export type Mock = typeof MOCK;
