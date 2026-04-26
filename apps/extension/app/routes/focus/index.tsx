import { useEffect, useState } from 'react';
import { SOUNDSCAPES, fmtTime } from '@compass/core/fixtures';
import {
  Badge,
  Button,
  Card,
  IconBlock,
  IconPause,
  IconPlay,
  IconSound,
  IconSpark,
  Surface,
} from '@compass/ui';
import { useShell } from '@app/state/shell.js';

const DURATIONS = [25, 45, 60, 90, 120] as const;

export function Focus() {
  const [task, setTask] = useState('PRD final pass');
  const [mins, setMins] = useState<number>(90);
  const { openOverlay } = useShell();

  return (
    <Surface className="max-w-[880px]">
      <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] mb-2.5">
        Focus
      </div>
      <h1 className="font-serif text-[38px] font-normal tracking-[-0.02em] mt-0 mb-1">
        What are you moving today?
      </h1>
      <p className="font-serif text-[18px] text-[var(--ink-3)] italic mt-0 mb-7">
        One thing, 90 minutes, no tabs.
      </p>

      <Card padded className="!p-7">
        <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] mb-2.5">
          Daily focus
        </div>
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          aria-label="Daily focus"
          className="w-full border-0 outline-0 bg-transparent font-serif text-[28px] tracking-[-0.01em] text-[var(--ink)] pb-3.5 border-b border-[var(--hair)]"
        />
        <div className="flex gap-2 mt-3.5 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] self-center mr-1.5">
            linked to
          </span>
          <Badge variant="accent">Compass AI upgrade</Badge>
          <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] self-center ml-3 mr-1.5">
            soundscape
          </span>
          {SOUNDSCAPES.map((s, i) => (
            <Badge key={s.id} variant={i === 0 ? 'accent' : 'default'}>
              <IconSound size={10} /> {s.name}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-6 mt-7 flex-wrap">
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)]">
              Duration
            </span>
            <div className="flex gap-1.5">
              {DURATIONS.map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant={mins === m ? 'primary' : 'default'}
                  onClick={() => setMins(m)}
                >
                  {m}m
                </Button>
              ))}
            </div>
          </div>
          <div className="flex-1" />
          <Button
            variant="accent"
            className="!px-6 !py-3 !text-sm"
            leading={<IconPlay size={14} />}
            onClick={() => openOverlay('focusRunning', { task, mins })}
          >
            Start focus · {mins} min
          </Button>
        </div>
      </Card>

      <div className="mt-8">
        <div className="flex items-baseline gap-2.5 mb-3.5">
          <div className="font-serif text-[20px] font-medium">This week</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)]">
            6h 40m · 9 pomodoros · peak 10 am
          </div>
        </div>
        <Card padded>
          <div className="flex items-end gap-2.5 h-[160px]">
            {[
              { d: 'Mon', completed: 90, abandoned: 0 },
              { d: 'Tue', completed: 75, abandoned: 25 },
              { d: 'Wed', completed: 120, abandoned: 0 },
              { d: 'Thu', completed: 45, abandoned: 30 },
              { d: 'Fri', completed: 105, abandoned: 15 },
              { d: 'Sat', completed: 0, abandoned: 0 },
              { d: 'Sun', completed: 0, abandoned: 0 },
            ].map((day, i) => {
              const max = 150;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full h-[120px] flex flex-col-reverse gap-0.5">
                    <div
                      className="bg-[var(--accent)] rounded-sm"
                      style={{ height: `${(day.completed / max) * 100}%` }}
                    />
                    {day.abandoned > 0 && (
                      <div
                        className="bg-[var(--hair-2)] rounded-sm"
                        style={{ height: `${(day.abandoned / max) * 100}%` }}
                      />
                    )}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)]">
                    {day.d}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 p-3.5 bg-[var(--panel-2)] rounded-[10px] text-[13px] text-[var(--ink-2)] flex gap-2.5">
            <IconSpark size={14} />
            <span>
              <b>Compass noticed:</b> Thursday afternoon Pomodoros finish 42% of the time when a
              calendar meeting sits within 30 minutes. Consider blocking 1–3 pm on Thursdays.
            </span>
          </div>
        </Card>
      </div>
    </Surface>
  );
}

export function FocusRunning({ payload, onClose }: { payload: unknown; onClose: () => void }) {
  const { task, mins } = (payload ?? { task: '', mins: 25 }) as { task: string; mins: number };
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const total = mins * 60;
  const remaining = Math.max(0, total - elapsed);
  const mm = Math.floor(remaining / 60)
    .toString()
    .padStart(2, '0');
  const ss = (remaining % 60).toString().padStart(2, '0');
  const pct = total > 0 ? elapsed / total : 0;
  const r = 128;
  const c = 2 * Math.PI * r;

  return (
    <div className="fixed inset-0 z-40 bg-[var(--bg)] flex flex-col">
      <div className="px-8 py-4 flex items-center border-b border-[var(--hair)]">
        <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)]">
          focus · round 1 of 1
        </div>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={onClose}>
          End early
        </Button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-10">
        <div className="font-serif text-[18px] italic text-[var(--ink-3)]">You&apos;re moving</div>
        <div className="font-serif text-[52px] font-normal tracking-[-0.02em] max-w-[760px] text-center leading-[1.15]">
          {task}
        </div>

        <div className="relative w-[280px] h-[280px] my-4">
          <svg width="280" height="280" viewBox="0 0 280 280">
            <circle cx="140" cy="140" r={r} fill="none" stroke="var(--hair)" strokeWidth="2" />
            <circle
              cx="140"
              cy="140"
              r={r}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3"
              strokeDasharray={`${c}`}
              strokeDashoffset={`${c * (1 - pct)}`}
              strokeLinecap="round"
              transform="rotate(-90 140 140)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-serif text-[72px] font-light tracking-[-0.03em]">
              {mm}:{ss}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)]">
              remaining
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" leading={<IconPause size={12} />}>
            Pause
          </Button>
          <Button size="sm" leading={<IconSound size={12} />}>
            Rain on leaves
          </Button>
          <Button size="sm" leading={<IconBlock size={12} />}>
            Blocking 6 sites
          </Button>
        </div>

        <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] mt-5 text-center max-w-[520px] leading-[1.5]">
          The brief suggested two more Pomodoros after this. Inbox, notifications, and social sites
          are muted until {fmtTime(new Date(Date.now() + remaining * 1000))}.
        </div>
      </div>
    </div>
  );
}
