import { useState, type ReactNode } from 'react';
import { Badge, Button, Card, IconKey, Prose, Surface, Toggle } from '@compass/ui';

export function Settings() {
  return (
    <Surface className="max-w-[880px]">
      <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] mb-2">
        Settings
      </div>
      <h1 className="font-serif text-[34px] font-medium tracking-[-0.02em] mt-0 mb-7">
        AI providers & budget
      </h1>

      <Section
        title="Connected providers"
        sub="Keys stay on this device. Compass never proxies LLM calls."
      >
        <Provider
          name="OpenAI Platform"
          sub="sk-proj-…••••4kWa · validated 2 days ago"
          status="active"
          budget="$0.68 this month"
          primary
        />
        <Provider name="Anthropic Console" sub="Not connected" status="off" />
        <Provider name="OpenRouter (OAuth)" sub="Recommended for one-click sign-in" status="off" />
      </Section>

      <Section title="Monthly AI budget" sub="Soft cap; Compass downgrades models when you hit it.">
        <Card padded>
          <div className="flex items-baseline gap-2.5 mb-2">
            <span className="font-serif text-[28px] font-medium">$0.84</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)]">
              of $2.00 · 42% · 11 days left
            </span>
          </div>
          <div className="h-1.5 bg-[var(--hair)] rounded-[3px] overflow-hidden">
            <div className="w-[42%] h-full bg-[var(--accent)]" />
          </div>
          <div className="grid grid-cols-4 gap-2.5 mt-[18px]">
            <Stat lbl="Briefs" n="18" s="$0.07" />
            <Stat lbl="Gmail extracts" n="142" s="$0.31" />
            <Stat lbl="Meeting prep" n="9" s="$0.22" />
            <Stat lbl="Goal decompose" n="2" s="$0.16" />
          </div>
          <div className="flex gap-2 mt-3.5">
            <Button size="sm">Adjust cap</Button>
            <Button size="sm" variant="ghost">
              Download ledger (CSV)
            </Button>
          </div>
        </Card>
      </Section>

      <Section title="Privacy" sub="Provable in a signed transparency report.">
        <Card padded>
          <Prose className="text-[14px]">
            <p>
              • Note text, email bodies, and calendar descriptions <b>never leave your device</b>{' '}
              except to the LLM you chose.
            </p>
            <p>
              • Gmail bodies are <b>not stored</b> beyond a 500-char snippet.
            </p>
            <p>
              • Block-rule URLs send <b>hostname only</b> to the model — never paths or queries.
            </p>
            <p>
              • Telemetry is <b>counters only</b> — no free-form text ever leaves.
            </p>
          </Prose>
        </Card>
      </Section>

      <Section
        title="Feature flags"
        sub="Everything is opt-in. Turn it off and the classic Compass is untouched."
      >
        <Card>
          {(
            [
              ['Daily Agent', true],
              ['EOD reflection', true],
              ['Adaptive personalization', true],
              ['Semantic Notes', true],
              ['Smarter blocker', true],
              ['Gmail AI', true],
              ['Meeting prep', true],
              ['Goal decomposition', true],
              ['Voice input', false],
              ['Vision board image gen', false],
              ['Image-to-tasks OCR', false],
            ] as const
          ).map(([k, on], i) => (
            <FlagRow key={k} label={k} initial={on} first={i === 0} />
          ))}
        </Card>
      </Section>
    </Surface>
  );
}

function Section({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <section className="mb-9">
      <div className="mb-3.5">
        <div className="font-serif text-[20px] font-medium">{title}</div>
        <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] mt-1">
          {sub}
        </div>
      </div>
      {children}
    </section>
  );
}

function Provider({
  name,
  sub,
  status,
  budget,
  primary,
}: {
  name: string;
  sub: string;
  status: 'active' | 'off';
  budget?: string;
  primary?: boolean;
}) {
  const color = status === 'active' ? 'var(--accent-ink)' : 'var(--ink-4)';
  return (
    <Card padded className="mb-2.5 flex items-center gap-3.5">
      <div
        className="w-9 h-9 rounded-lg grid place-items-center bg-[var(--panel-2)]"
        style={{ color }}
      >
        <IconKey size={16} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-medium">{name}</span>
          {primary && <Badge variant="accent">default</Badge>}
          <Badge style={{ color } as React.CSSProperties}>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />{' '}
            {status === 'active' ? 'active' : 'not connected'}
          </Badge>
        </div>
        <div className="text-[12px] text-[var(--ink-4)] mt-[3px]">
          {sub}
          {budget && (
            <span>
              {' '}
              · <span className="text-[var(--ink-3)]">{budget}</span>
            </span>
          )}
        </div>
      </div>
      <Button size="sm">{status === 'active' ? 'Manage' : 'Connect'}</Button>
    </Card>
  );
}

function Stat({ lbl, n, s }: { lbl: string; n: string; s: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)]">
        {lbl}
      </div>
      <div className="font-serif text-[20px] font-medium">{n}</div>
      <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-3)]">
        {s}
      </div>
    </div>
  );
}

function FlagRow({ label, initial, first }: { label: string; initial: boolean; first: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <div
      className="flex items-center px-[18px] py-3"
      style={{ borderTop: first ? 'none' : '1px solid var(--hair)' }}
    >
      <div className="flex-1 text-[13.5px]">{label}</div>
      <Toggle aria-label={`Toggle ${label}`} on={on} onChange={setOn} />
    </div>
  );
}
