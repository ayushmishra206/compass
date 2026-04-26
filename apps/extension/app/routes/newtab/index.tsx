import { useState, type ReactNode } from 'react';
import {
  BRIEF,
  BLOCK_RULES,
  EVENTS,
  GOALS,
  INBOX_ACTIONS,
  NOTES,
  SUGGESTIONS,
  USER,
  VITALS,
} from '@compass/core/fixtures';
import {
  Badge,
  Button,
  Card,
  IconButton,
  IconCalendar,
  IconChevron,
  IconDown,
  IconDrop,
  IconFocus,
  IconHeart,
  IconPlay,
  IconSleep,
  IconSpark,
  IconThumbDown,
  IconThumbUp,
  IconUp,
  Surface,
  Grid12,
} from '@compass/ui';
import type { InboxAction, Note, Suggestion } from '@compass/core';
import { useShell } from '@app/state/shell.js';

export function NewTab() {
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const { openOverlay } = useShell();

  return (
    <Surface>
      <div className="flex items-baseline gap-4 mb-2.5">
        <div className="font-mono text-[11.5px] uppercase tracking-[0.02em] text-[var(--ink-3)]">
          Sunday · 07:42 am · 14°C · light drizzle
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="ghost" leading={<IconCalendar size={14} />}>
            Calendar
          </Button>
          <Button size="sm" variant="ghost" leading={<IconFocus size={14} />}>
            Start focus
          </Button>
        </div>
      </div>

      <h1 className="font-serif text-[44px] font-normal leading-[1.1] tracking-[-0.02em] mt-0 mb-1">
        Good morning, {USER.name.split(' ')[0]}.
      </h1>
      <p className="font-serif text-[22px] font-light text-[var(--ink-3)] italic mt-0 mb-7">
        {BRIEF.oneLineMood}
      </p>

      <Card className="overflow-hidden mb-7">
        <div className="flex items-center gap-2.5 px-[22px] py-3.5 border-b border-[var(--hair)]">
          <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--accent-ink)]">
            Morning brief
          </span>
          <span className="font-mono text-[10px] text-[var(--ink-4)]">
            · generated 7:10 am · 4.2s · claude-haiku-4-5
          </span>
          <div className="ml-auto flex gap-1">
            <IconButton
              aria-label="Useful"
              onClick={() => setRating('up')}
              style={rating === 'up' ? { color: 'var(--accent-ink)' } : undefined}
            >
              <IconThumbUp size={14} />
            </IconButton>
            <IconButton
              aria-label="Not useful"
              onClick={() => setRating('down')}
              style={rating === 'down' ? { color: 'var(--accent-ink)' } : undefined}
            >
              <IconThumbDown size={14} />
            </IconButton>
            <IconButton
              aria-label={collapsed ? 'Expand brief' : 'Collapse brief'}
              onClick={() => setCollapsed((c) => !c)}
            >
              {collapsed ? <IconDown size={14} /> : <IconUp size={14} />}
            </IconButton>
          </div>
        </div>

        {!collapsed && (
          <div className="px-[22px] pt-[22px] pb-[18px]">
            <p className="font-serif text-[18px] leading-[1.55] text-[var(--ink-2)] mt-0 mb-[22px] max-w-[720px]">
              {BRIEF.tldr}
            </p>

            <div className="grid grid-cols-2 gap-[22px] mb-5">
              <div className="px-5 py-[18px] bg-[var(--accent-wash)] rounded-[14px]">
                <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--accent-ink)] mb-2">
                  Top priority · 90 min
                </div>
                <div className="font-serif text-[22px] leading-[1.2] tracking-[-0.01em] mb-1.5">
                  {BRIEF.topPriority.title}
                </div>
                <div className="text-[13px] text-[var(--ink-2)] mb-3.5">
                  {BRIEF.topPriority.why}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="accent" leading={<IconPlay size={12} />}>
                    Start 90 min
                  </Button>
                  <Button size="sm">Adjust</Button>
                </div>
              </div>

              <div className="px-5 py-[18px] border border-[var(--hair)] rounded-[14px]">
                <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-3)] mb-2">
                  Today&apos;s shape · 3 pomodoros
                </div>
                <div className="flex flex-col gap-2">
                  {BRIEF.pomodoros.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 py-2"
                      style={{
                        borderBottom:
                          i < BRIEF.pomodoros.length - 1 ? '1px solid var(--hair)' : 'none',
                      }}
                    >
                      <div className="font-mono text-[11.5px] text-[var(--ink-3)] uppercase tracking-[0.02em] w-20">
                        {p.startLocal}–{p.endLocal}
                      </div>
                      <div className="flex-1 text-[13.5px]">{p.theme}</div>
                      <Button size="xs" variant="ghost" aria-label="Start pomodoro">
                        <IconPlay size={10} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[1.4fr_1fr] gap-[22px]">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-3)] mb-2.5">
                  Watchouts
                </div>
                <div className="flex flex-col gap-1.5">
                  {BRIEF.watchouts.map((w, i) => (
                    <div
                      key={i}
                      className="flex gap-2.5 text-[13.5px] text-[var(--ink-2)] leading-[1.5]"
                    >
                      <span className="text-[var(--ink-4)] font-mono text-[10px] mt-1">
                        0{i + 1}
                      </span>
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-3)] mb-2.5">
                  Recovery
                </div>
                <div className="flex gap-4 mb-2.5">
                  <Vital
                    icon={<IconSleep size={14} />}
                    label="Sleep"
                    value={String(VITALS.sleep)}
                    sub="good"
                  />
                  <Vital
                    icon={<IconHeart size={14} />}
                    label="Recovery"
                    value={String(VITALS.recovery)}
                    sub="mid"
                  />
                  <Vital icon={<IconDrop size={14} />} label="RHR" value={String(VITALS.rhr)} />
                </div>
                <div className="text-[13px] text-[var(--ink-2)] leading-[1.5]">
                  {BRIEF.recovery.note}
                </div>
              </div>
            </div>

            {BRIEF.quotedGoal && (
              <div className="mt-6 pt-[18px] border-t border-[var(--hair)] flex gap-3 items-start">
                <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-3)] w-20 mt-0.5">
                  From goal
                </div>
                <div className="font-serif text-[16px] italic text-[var(--ink-2)] flex-1">
                  &ldquo;{BRIEF.quotedGoal}&rdquo;
                </div>
                <Button size="xs" variant="ghost" trailing={<IconChevron size={12} />}>
                  Open
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      <Grid12>
        <section className="col-span-7">
          <Widget title="Today" subtitle="5 events · 2 need prep">
            <Timeline />
          </Widget>
        </section>

        <section className="col-span-5 flex flex-col gap-[22px]">
          <Widget title="Inbox actions" subtitle="3 P1/P2 · scanned 6 min ago">
            <InboxMini />
          </Widget>
          <Widget title="From Compass" subtitle="Patterns it noticed this week">
            <Suggestions suggestions={SUGGESTIONS} />
          </Widget>
        </section>

        <section className="col-span-7">
          <Widget title="Active goals" subtitle="2 in flight · 1 ambient">
            <GoalsMini />
          </Widget>
        </section>

        <section className="col-span-5">
          <Widget title="Notes" subtitle="Semantic autolinks on">
            <NotesMini />
          </Widget>
        </section>

        <section className="col-span-12">
          <Widget
            title="Focus blocker"
            subtitle={`${BLOCK_RULES.length} rules · 2 adaptive · next window 2:00 pm`}
          >
            <div className="flex gap-2.5 flex-wrap">
              {BLOCK_RULES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => openOverlay('blockOverlay', r)}
                  className="bg-[var(--panel)] border border-[var(--hair)] rounded-[14px] shadow-[var(--sh-1)] px-3.5 py-2.5 text-left flex gap-2.5 items-center flex-1 min-w-[220px]"
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-current"
                    style={{
                      color: r.mode === 'hard' ? 'var(--accent-ink)' : 'var(--ink-4)',
                    }}
                  />
                  <div className="flex-1">
                    <div className="text-[13px] font-medium">{r.pattern}</div>
                    <div className="text-[11px] text-[var(--ink-4)]">
                      {r.mode} · {r.source} · {r.note}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-[var(--ink-4)] flex items-center gap-1">
                    preview <IconChevron size={11} />
                  </span>
                </button>
              ))}
            </div>
          </Widget>
        </section>
      </Grid12>

      <div className="text-center mt-10 text-[var(--ink-4)] font-mono text-[10px] tracking-[0.1em]">
        local-first · your keys · no content telemetry
      </div>
    </Surface>
  );
}

function Widget({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Card padded className="h-full">
      <div className="flex items-baseline mb-3.5 gap-2.5">
        <div className="font-serif text-[18px] font-medium tracking-[-0.01em]">{title}</div>
        {subtitle && (
          <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)]">
            {subtitle}
          </div>
        )}
      </div>
      {children}
    </Card>
  );
}

function Vital({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-[var(--ink-3)]">{icon}</div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className="font-serif text-[22px] leading-none">{value}</span>
          {sub && (
            <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)]">
              {sub}
            </span>
          )}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)]">
          {label}
        </div>
      </div>
    </div>
  );
}

function Timeline() {
  const startH = 8;
  const endH = 18;
  const H = endH - startH;
  const toTop = (hhmm: string) => {
    const parts = hhmm.split(':');
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    return ((h - startH + m / 60) / H) * 100;
  };
  const nowTop = Math.max(0, toTop('07:42'));
  const hours = Array.from({ length: H + 1 }, (_, i) => startH + i);

  return (
    <div className="relative h-[360px] pl-14">
      {hours.map((h, i) => (
        <div
          key={i}
          className="absolute left-0 right-0"
          style={{
            top: `${(i / H) * 100}%`,
            borderTop: i === 0 ? 'none' : '1px dashed var(--hair)',
          }}
        >
          <span className="font-mono text-[10px] text-[var(--ink-4)] absolute left-0 -top-[7px]">
            {((h + 11) % 12) + 1}
            {h < 12 ? 'am' : 'pm'}
          </span>
        </div>
      ))}
      <div
        className="absolute left-[50px] right-0 border-t-[1.5px] border-[var(--accent)]"
        style={{ top: `${nowTop}%` }}
      >
        <div className="absolute -left-1.5 -top-[5px] w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
      </div>
      {EVENTS.map((ev) => {
        const top = toTop(ev.start);
        const height = toTop(ev.end) - top;
        return (
          <div
            key={ev.id}
            className="absolute left-0 right-2.5 p-2 rounded-[10px] border border-[var(--hair)] flex items-start gap-2"
            style={{
              top: `${top}%`,
              height: `${height}%`,
              background: ev.focus ? 'var(--accent-wash)' : 'var(--panel-2)',
            }}
          >
            <div className="font-mono text-[10px] text-[var(--ink-4)] w-20 flex-shrink-0">
              {ev.start}–{ev.end}
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-medium">{ev.summary}</div>
              <div className="text-[11px] text-[var(--ink-4)]">
                {ev.attendees} {ev.attendees === 1 ? 'person' : 'attendees'}
                {ev.prep && <span className="text-[var(--accent-ink)]"> · prep ready</span>}
              </div>
            </div>
            {ev.prep && (
              <Button size="xs" leading={<IconSpark size={10} />}>
                Brief
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InboxMini() {
  const items = INBOX_ACTIONS.filter((a) => a.actions.length).slice(0, 3);
  const priColor: Record<InboxAction['priority'], string> = {
    p1: 'var(--accent-ink)',
    p2: 'var(--accent-ink)',
    p3: 'var(--ink-3)',
    p4: 'var(--ink-4)',
  };
  return (
    <div className="flex flex-col">
      {items.map((it, i) => (
        <button
          key={it.id}
          type="button"
          className="text-left py-2.5 flex gap-2.5 items-start"
          style={{ borderTop: i === 0 ? 'none' : '1px solid var(--hair)' }}
        >
          <div className="flex-shrink-0 w-7 pt-1">
            <span
              className="font-mono text-[10px] font-medium uppercase"
              style={{ color: priColor[it.priority] }}
            >
              {it.priority.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium overflow-hidden text-ellipsis whitespace-nowrap">
              {it.subject}
            </div>
            <div className="text-[12px] text-[var(--ink-3)] mt-0.5">{it.actions[0]!.title}</div>
            <div className="text-[11px] text-[var(--ink-4)] mt-[3px]">
              {it.from} · due {it.actions[0]!.due}
            </div>
          </div>
          {it.hasDraft && <Badge variant="accent">draft ready</Badge>}
        </button>
      ))}
    </div>
  );
}

function Suggestions({ suggestions }: { suggestions: Suggestion[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {suggestions.map((s) => (
        <div
          key={s.id}
          className="p-3.5 border border-[var(--hair)] rounded-[12px] bg-[var(--panel-2)]"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--accent-ink)] mb-1.5">
            {s.kind.replace('_', ' ')}
          </div>
          <div className="text-[13.5px] text-[var(--ink-2)] leading-[1.5] mb-2.5">{s.body}</div>
          <div className="flex gap-1.5">
            <Button size="xs" variant="accent">
              Apply
            </Button>
            <Button size="xs" variant="ghost">
              Not now
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function GoalsMini() {
  return (
    <div className="flex flex-col gap-3.5">
      {GOALS.slice(0, 2).map((g) => (
        <button key={g.id} type="button" className="text-left">
          <div className="flex items-baseline gap-2.5 mb-1.5">
            <div className="font-serif text-[16px] font-medium flex-1">{g.title}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)]">
              {Math.round(g.progress * 100)}% · {g.weeksRemaining}w left
            </div>
          </div>
          <div className="h-1 bg-[var(--hair)] rounded-sm overflow-hidden">
            <div className="h-full bg-[var(--accent)]" style={{ width: `${g.progress * 100}%` }} />
          </div>
          {(() => {
            const current = g.milestones.find((m) => m.current);
            return current ? (
              <div className="text-[12px] text-[var(--ink-3)] mt-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)]">
                  this week ·{' '}
                </span>
                {current.title}
              </div>
            ) : null;
          })()}
        </button>
      ))}
    </div>
  );
}

function NotesMini() {
  return (
    <div className="flex flex-col gap-2.5">
      {NOTES.slice(0, 3).map((n: Note) => (
        <button
          key={n.id}
          type="button"
          className="text-left py-2.5"
          style={{ borderBottom: '1px solid var(--hair)' }}
        >
          <div className="flex items-baseline gap-2.5">
            <div className="text-[13.5px] font-medium flex-1">{n.title}</div>
            <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)]">
              {n.updated}
            </span>
          </div>
          <div className="text-[12px] text-[var(--ink-3)] mt-[3px] leading-[1.5] max-h-[2.8em] overflow-hidden">
            {n.excerpt}
          </div>
        </button>
      ))}
    </div>
  );
}
