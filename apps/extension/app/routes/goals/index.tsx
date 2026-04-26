import { useEffect, useState } from 'react';
import { GOALS } from '@compass/core/fixtures';
import type { Goal } from '@compass/core';
import {
  Button,
  Card,
  IconCheck,
  IconPlus,
  IconSpark,
  Modal,
  ModalBody,
  ModalHeader,
  Spinner,
} from '@compass/ui';
import { useShell } from '@app/state/shell.js';

export function Goals() {
  const [selId, setSelId] = useState('g1');
  const shell = useShell();
  const sel = GOALS.find((g) => g.id === selId);

  if (!sel) return null;

  return (
    <div className="grid grid-cols-[280px_1fr] gap-8 px-8 pt-7 pb-16 max-w-[1200px] mx-auto">
      <aside>
        <div className="flex items-center justify-between mb-3.5">
          <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-3)]">
            Active goals
          </div>
          <Button size="xs" variant="ghost" leading={<IconPlus size={12} />}>
            New
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {GOALS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelId(g.id)}
              className="text-left p-3.5 rounded-[12px] border border-[var(--hair)]"
              style={{
                background: selId === g.id ? 'var(--accent-wash)' : 'var(--panel)',
              }}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] mb-1">
                {g.horizon} · {g.weeksRemaining}w left
              </div>
              <div className="text-[13.5px] font-medium leading-[1.3] mb-2">{g.title}</div>
              <div className="h-[3px] bg-[var(--hair)] rounded-sm">
                <div
                  className="h-full bg-[var(--accent)] rounded-sm"
                  style={{ width: `${g.progress * 100}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main>
        <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] mb-2">
          {sel.horizon} goal · {sel.weeksRemaining} weeks remaining
        </div>
        <h1 className="font-serif text-[36px] font-medium tracking-[-0.02em] mt-0 mb-2.5 leading-[1.15]">
          {sel.title}
        </h1>
        {sel.why && (
          <p className="font-serif text-[17px] italic text-[var(--ink-3)] max-w-[680px] mt-0 mb-7">
            &ldquo;{sel.why}&rdquo;
          </p>
        )}

        <div className="grid grid-cols-4 gap-3.5 mb-7">
          <Stat label="Progress" value={`${Math.round(sel.progress * 100)}%`} />
          <Stat
            label="Milestones done"
            value={`${sel.milestones.filter((m) => m.done).length}/${sel.milestones.length || '—'}`}
          />
          <Stat label="Focus time · 14d" value="14h 20m" />
          <Stat label="Drift" value="on track" accent />
        </div>

        <Card padded className="mb-6">
          <div className="flex items-baseline gap-2.5 mb-4">
            <div className="font-serif text-[20px] font-medium">Decomposition</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)]">
              generated Apr 2 · claude-opus-4-7
            </div>
            <Button
              size="xs"
              variant="ghost"
              className="ml-auto"
              leading={<IconSpark size={12} />}
              onClick={() => shell.openOverlay('decompose', sel)}
            >
              Re-decompose
            </Button>
          </div>
          {sel.milestones.length ? (
            <div className="grid grid-cols-4 gap-2.5">
              {sel.milestones.map((m, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-[10px] border border-[var(--hair)]"
                  style={{
                    background: m.current
                      ? 'var(--accent-wash)'
                      : m.done
                        ? 'var(--panel-2)'
                        : 'var(--panel)',
                    opacity: m.done && !m.current ? 0.75 : 1,
                  }}
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] mb-1">
                    Week {m.week} {m.current && '· now'} {m.done && '· done'}
                  </div>
                  <div className="text-[13px] leading-[1.4]">{m.title}</div>
                  {m.done && (
                    <div className="mt-2 text-[var(--accent-ink)]">
                      <IconCheck size={12} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-5 text-[var(--ink-4)] italic">
              No decomposition yet. Let Compass draft weekly milestones from your why-it-matters
              note.
            </div>
          )}
        </Card>

        {sel.dailyTemplates.length > 0 && (
          <Card padded>
            <div className="font-serif text-[18px] font-medium mb-1.5">Daily shape it suggests</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] mb-3.5">
              Woven into your Daily Focus and Pomodoro suggestions
            </div>
            <ol className="pl-4 m-0 flex flex-col gap-1.5 text-[14px] text-[var(--ink-2)]">
              {sel.dailyTemplates.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ol>
          </Card>
        )}
      </main>

      {shell.overlay === 'decompose' && <DecomposeModal goal={sel} onClose={shell.closeOverlay} />}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="p-3.5 border border-[var(--hair)] rounded-[12px] bg-[var(--panel)]">
      <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] mb-1.5">
        {label}
      </div>
      <div
        className="font-serif text-[24px] font-medium tracking-[-0.01em]"
        style={{ color: accent ? 'var(--accent-ink)' : 'var(--ink)' }}
      >
        {value}
      </div>
    </div>
  );
}

function DecomposeModal({ goal: _goal, onClose }: { goal: Goal; onClose: () => void }) {
  const [phase, setPhase] = useState<'thinking' | 'result'>('thinking');
  useEffect(() => {
    const t = setTimeout(() => setPhase('result'), 1800);
    return () => clearTimeout(t);
  }, []);
  return (
    <Modal open onClose={onClose} wide aria-label="Re-decompose goal">
      <ModalHeader
        title="Re-decompose goal"
        onClose={onClose}
        meta="goal.decompose · claude-opus-4-7 · est ~$0.08"
      />
      <ModalBody>
        {phase === 'thinking' ? (
          <div className="flex flex-col gap-2.5 py-7 px-2.5">
            <div className="flex gap-2.5 items-center">
              <Spinner />{' '}
              <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-3)]">
                reading goal + why + 14d focus history
              </span>
            </div>
            <div className="flex gap-2.5 items-center opacity-50">
              <Spinner />{' '}
              <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-3)]">
                drafting weekly milestones
              </span>
            </div>
            <div className="flex gap-2.5 items-center opacity-30">
              <Spinner />{' '}
              <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-3)]">
                shaping daily templates
              </span>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-[14px] text-[var(--ink-2)] mt-0 mb-4">
              Keeping your week 4 milestone (done). Tightening weeks 5–8; the adaptive blocker can
              run alongside the Gmail beta without a hard dependency.
            </p>
            <div className="flex flex-col gap-1.5">
              {[
                'Adaptive personalization signals live behind flag',
                'Smarter blocker negotiation GA for Plus',
                'Gmail + Meeting AI in staging with 20 internal testers',
                'Closed beta invite — 200 users, 14-day window',
              ].map((t, i) => (
                <div
                  key={i}
                  className="p-2.5 border border-[var(--hair)] rounded-lg flex gap-2.5 items-center"
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)]">
                    wk {5 + i}
                  </span>
                  <span className="text-[13px]">{t}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <Button size="sm" onClick={onClose}>
                Keep existing
              </Button>
              <Button size="sm" variant="accent" onClick={onClose}>
                Replace decomposition
              </Button>
            </div>
          </div>
        )}
      </ModalBody>
    </Modal>
  );
}
