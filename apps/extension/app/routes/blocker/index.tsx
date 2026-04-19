import { useEffect, useState } from 'react';
import { BLOCK_RULES } from '@compass/core/fixtures';
import type { BlockRule, NegotiationTurn } from '@compass/core';
import { Badge, Button, Card, IconClose, IconEye, IconPlus, IconSend, Surface } from '@compass/ui';
import { stubs } from '@compass/agents';
import { useShell } from '@app/state/shell.js';

export function Blocker() {
  const shell = useShell();
  return (
    <Surface className="max-w-[980px]">
      <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] mb-2">
        Site blocker
      </div>
      <h1 className="font-serif text-[34px] font-medium tracking-[-0.02em] mt-0 mb-1.5">
        Soft blocks, honest conversations.
      </h1>
      <p className="font-serif text-[17px] text-[var(--ink-3)] italic mt-0 mb-7 max-w-[620px]">
        When you reach for a blocked site, Compass asks once, gently. You can always proceed.
      </p>

      <Card padded className="mb-[22px]">
        <div className="flex items-baseline mb-3.5">
          <div className="font-serif text-[20px] font-medium">Rules</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] ml-2.5">
            4 active · 2 adaptive · paths never sent to the model
          </div>
          <Button size="sm" variant="ghost" className="ml-auto" leading={<IconPlus size={12} />}>
            Add rule
          </Button>
        </div>
        <div className="flex flex-col">
          {BLOCK_RULES.map((r, i) => (
            <div
              key={r.id}
              className="flex items-center gap-3.5 py-3.5"
              style={{ borderTop: i === 0 ? 'none' : '1px solid var(--hair)' }}
            >
              <div className="flex-1">
                <div className="text-[13px] font-mono">{r.pattern}</div>
                <div className="text-[12px] text-[var(--ink-4)] mt-[3px]">{r.note}</div>
              </div>
              <Badge variant={r.mode === 'soft' ? 'sage' : 'accent'}>{r.mode}</Badge>
              <Badge>{r.source}</Badge>
              <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)]">
                {r.strikes} bypass{r.strikes !== 1 ? 'es' : ''}
              </span>
              <Button
                size="sm"
                leading={<IconEye size={12} />}
                onClick={() => shell.openOverlay('blockOverlay', r)}
              >
                Preview
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-[22px]">
        <Card padded>
          <div className="font-serif text-[18px] font-medium mb-1.5">Rationalization patterns</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] mb-3.5">
            14 days
          </div>
          {(
            [
              ['just_one_minute', 7],
              ['work_related_cover', 3],
              ['boredom_switch', 2],
              ['emotional_avoidance', 1],
            ] as const
          ).map(([k, n]) => (
            <div
              key={k}
              className="flex gap-2.5 py-2"
              style={{ borderTop: '1px solid var(--hair)' }}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-3)] flex-1">
                {k.replace(/_/g, ' ')}
              </span>
              <span className="font-serif text-[18px]">{n}</span>
            </div>
          ))}
        </Card>
        <Card padded>
          <div className="font-serif text-[18px] font-medium mb-1.5">Adaptive suggestions</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] mb-3.5">
            one per week, opt-in
          </div>
          <div className="p-3.5 bg-[var(--panel-2)] rounded-[10px] text-[13px] text-[var(--ink-2)] leading-[1.5]">
            <b>linkedin.com</b> preceded 3 abandoned Pomodoros this week. Add as a soft rule during
            focus hours?
            <div className="flex gap-1.5 mt-2.5">
              <Button size="xs" variant="accent">
                Add as soft
              </Button>
              <Button size="xs" variant="ghost">
                Not now
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Surface>
  );
}

export function BlockOverlay({ payload, onClose }: { payload: unknown; onClose: () => void }) {
  const rule = payload as BlockRule;
  const [turns, setTurns] = useState<NegotiationTurn[]>([
    {
      role: 'assistant',
      text: `You blocked ${rule.pattern} during deep-work hours. What's pulling you here right now?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [pattern, setPattern] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const send = async () => {
    if (!input.trim()) return;
    setTurns((t) => [...t, { role: 'user', text: input }]);
    setInput('');
    for await (const reply of stubs.negotiateBlock(rule, input)) {
      setTurns((t) => [...t, reply]);
      setPattern('just_one_minute');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[55] flex flex-col text-[#f5ede0]"
      style={{
        background:
          'linear-gradient(180deg, oklch(0.14 0.015 55 / 0.5), oklch(0.14 0.015 55 / 0.92))',
      }}
    >
      <div
        className="px-8 py-4 flex items-center gap-3"
        style={{ borderBottom: '1px solid oklch(0.94 0.01 75 / 0.1)' }}
      >
        <span className="text-[15px] font-serif">Compass</span>
        <div className="font-mono text-[10px] uppercase tracking-[0.02em] ml-2 text-[#f5ede0]/60">
          soft block · {rule.pattern}
        </div>
        <div className="flex-1" />
        <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[#f5ede0]/55">
          focus ends in 0:47 · {seconds}s here
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-8 h-8 grid place-items-center rounded-lg"
        >
          <IconClose size={16} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-10">
        <div className="max-w-[640px] w-full">
          <div className="flex flex-col gap-3.5 mb-6">
            {turns.map((t, i) => (
              <div
                key={i}
                className="flex"
                style={{ justifyContent: t.role === 'user' ? 'flex-end' : 'flex-start' }}
              >
                <div
                  className="max-w-[80%] px-4 py-3.5 rounded-[14px] leading-[1.5]"
                  style={{
                    background:
                      t.role === 'user'
                        ? 'oklch(0.98 0.02 75 / 0.14)'
                        : 'oklch(0.98 0.02 75 / 0.04)',
                    border: '1px solid oklch(0.98 0.02 75 / 0.12)',
                    fontFamily: t.role === 'user' ? 'var(--font-sans)' : 'var(--font-serif)',
                    fontSize: t.role === 'user' ? 14 : 18,
                  }}
                >
                  {t.text}
                  {t.offer && (
                    <div className="mt-2.5 flex gap-1.5 flex-wrap">
                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-lg text-[12px] text-[#f5ede0]"
                        style={{
                          background: 'oklch(0.98 0.02 75 / 0.1)',
                          border: '1px solid oklch(0.98 0.02 75 / 0.2)',
                        }}
                      >
                        Grant 5 min
                      </button>
                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-lg text-[12px] text-[#f5ede0]"
                        style={{ border: '1px solid oklch(0.98 0.02 75 / 0.2)' }}
                      >
                        Take a 2-min break
                      </button>
                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-lg text-[12px] text-[#f5ede0]"
                        style={{ border: '1px solid oklch(0.98 0.02 75 / 0.2)' }}
                      >
                        Back to focus
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div
            className="flex gap-2 px-3 py-2.5 rounded-[12px]"
            style={{
              background: 'oklch(0.98 0.02 75 / 0.08)',
              border: '1px solid oklch(0.98 0.02 75 / 0.14)',
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="One sentence. What's pulling you here?"
              className="flex-1 border-0 outline-0 bg-transparent text-[14px] text-[#f5ede0] placeholder-[#f5ede0]/40"
              aria-label="Reason"
            />
            <button
              type="button"
              onClick={send}
              className="px-3 py-1 rounded-lg text-[12px] flex items-center gap-1"
              style={{ background: '#f5ede0', color: '#2b1f12' }}
            >
              Send <IconSend size={11} />
            </button>
          </div>

          <div className="flex justify-between items-center mt-5 text-[#f5ede0]/55 font-mono text-[10px] uppercase tracking-[0.02em]">
            <span>
              {pattern ? `pattern: ${pattern.replace(/_/g, ' ')}` : 'listening…'} · host only, never
              path
            </span>
            <div className="flex gap-2.5">
              <button type="button" className="text-inherit">
                Close tab
              </button>
              <button
                type="button"
                className="pb-[1px] text-[#f5ede0]"
                style={{ borderBottom: '1px solid #f5ede0' }}
                onClick={onClose}
              >
                Proceed anyway
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
