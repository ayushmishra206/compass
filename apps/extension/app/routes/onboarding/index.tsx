import { useState } from 'react';
import {
  BrandMark,
  Button,
  Card,
  IconArrow,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconLink,
  IconSpark,
  Input,
  Spinner,
} from '@compass/ui';
import { stubs } from '@compass/agents';

export function Onboarding({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<'openai' | 'anthropic' | 'openrouter' | null>(null);
  const [key, setKey] = useState('');
  const [show, setShow] = useState(false);
  const [validating, setValidating] = useState(false);
  const [valid, setValid] = useState(false);

  return (
    <div className="fixed inset-0 z-[65] bg-[var(--bg)] flex">
      <aside className="w-[360px] px-10 py-12 bg-[var(--panel-2)] border-r border-[var(--hair)] flex flex-col">
        <div className="flex items-center gap-2.5 mb-10">
          <BrandMark />
          <div className="font-serif text-[19px] font-medium tracking-[-0.01em]">Compass</div>
        </div>
        <ol className="list-none p-0 m-0 flex flex-col gap-[18px]">
          {['Welcome', 'Connect a model', "You're set"].map((t, i) => (
            <li
              key={i}
              className="flex gap-3"
              style={{ color: i === step ? 'var(--ink)' : 'var(--ink-4)' }}
            >
              <div
                className="w-[22px] h-[22px] rounded-full border grid place-items-center font-mono text-[11px]"
                style={{
                  background: i < step ? 'var(--accent)' : 'transparent',
                  color: i < step ? '#fff' : 'inherit',
                  borderColor: i < step ? 'var(--accent)' : 'currentColor',
                }}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span className="font-serif text-[16px]">{t}</span>
            </li>
          ))}
        </ol>
        <div className="mt-auto font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] leading-[1.6]">
          your keys stay on this device · no content telemetry · local-first by default
        </div>
      </aside>

      <main className="flex-1 px-20 py-16 overflow-auto">
        {step === 0 && (
          <div className="max-w-[620px]">
            <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] mb-2">
              Welcome to Compass AI
            </div>
            <h1 className="font-serif text-[48px] font-normal tracking-[-0.02em] leading-[1.05] mt-0 mb-5">
              A calm new tab
              <br />
              that quietly learns your day.
            </h1>
            <p className="font-serif text-[19px] italic text-[var(--ink-3)] max-w-[560px] mt-0 mb-8 leading-[1.5]">
              Morning brief. Semantic notes. Goal decomposition. Nothing auto-sends, auto-shares, or
              auto-anything. You bring the model, Compass brings the restraint.
            </p>
            <Card padded className="mb-[18px]">
              <div className="flex gap-6">
                <Check label="Local-first SQLite with vector search" />
                <Check label="Offscreen LLM calls, your key" />
              </div>
              <div className="flex gap-6 mt-2.5">
                <Check label="Content never touches our server" />
                <Check label="Budget cap default $2/mo" />
              </div>
            </Card>
            <div className="flex gap-2.5">
              <Button
                variant="accent"
                onClick={() => setStep(1)}
                trailing={<IconArrow size={13} />}
                className="!px-5 !py-2.5"
              >
                Connect a model
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Skip — use Compass without AI
              </Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="max-w-[700px]">
            <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] mb-2">
              Step 2 of 3
            </div>
            <h1 className="font-serif text-[36px] font-medium tracking-[-0.02em] mt-0 mb-2.5">
              Bring your own model.
            </h1>
            <p className="font-serif text-[16px] italic text-[var(--ink-3)] max-w-[520px] mt-0 mb-7">
              Pick one. You can add the others later. Any of them keeps your data off our servers.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {(
                [
                  {
                    id: 'openai',
                    name: 'OpenAI',
                    sub: 'Platform key (sk-proj-…)',
                    tag: 'recommended',
                    bill: 'Your OpenAI org',
                  },
                  {
                    id: 'anthropic',
                    name: 'Anthropic',
                    sub: 'Console key (sk-ant-…)',
                    tag: null,
                    bill: 'Your Anthropic org',
                  },
                  {
                    id: 'openrouter',
                    name: 'OpenRouter',
                    sub: 'One-click OAuth sign-in',
                    tag: 'easiest',
                    bill: 'Your OpenRouter balance',
                  },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPicked(p.id)}
                  className="text-left p-[18px] rounded-[14px] transition-all"
                  style={{
                    border: '1px solid',
                    borderColor: picked === p.id ? 'var(--accent)' : 'var(--hair)',
                    background: picked === p.id ? 'var(--accent-wash)' : 'var(--panel)',
                    boxShadow: picked === p.id ? 'var(--sh-2)' : 'var(--sh-1)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="font-serif text-[17px] font-medium">{p.name}</span>
                    {p.tag && (
                      <span className="font-mono text-[10px] uppercase tracking-[0.02em] px-1.5 py-0.5 rounded-full bg-[var(--accent-wash)] text-[var(--accent-ink)]">
                        {p.tag}
                      </span>
                    )}
                  </div>
                  <div className="text-[12.5px] text-[var(--ink-3)] mb-3">{p.sub}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)]">
                    billed to · {p.bill}
                  </div>
                </button>
              ))}
            </div>

            {picked === 'openai' && (
              <Card padded>
                <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] mb-2">
                  Paste your OpenAI key
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    value={key}
                    onChange={(e) => {
                      setKey(e.target.value);
                      setValid(false);
                    }}
                    type={show ? 'text' : 'password'}
                    placeholder="sk-proj-…"
                    aria-label="OpenAI key"
                    mono
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label="Toggle key visibility"
                    className="w-8 h-8 grid place-items-center rounded-lg"
                  >
                    {show ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                  </button>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!key.length || validating}
                    onClick={async () => {
                      setValidating(true);
                      const result = await stubs.validateLlmKey('openai', key);
                      setValidating(false);
                      if (result.valid) {
                        setValid(true);
                        setTimeout(() => setStep(2), 500);
                      }
                    }}
                  >
                    {validating ? <Spinner /> : valid ? 'Valid ✓' : 'Validate'}
                  </Button>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] mt-3 leading-[1.6]">
                  validation calls GET /v1/models once · stored in chrome.storage.local · passphrase
                  encryption available (advanced)
                </div>
              </Card>
            )}

            {picked === 'openrouter' && (
              <Card padded>
                <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] mb-3">
                  You&apos;ll be redirected to openrouter.ai to authorize Compass.
                </div>
                <Button
                  variant="accent"
                  leading={<IconLink size={13} />}
                  onClick={() => setTimeout(() => setStep(2), 1200)}
                >
                  Continue to OpenRouter
                </Button>
              </Card>
            )}

            {picked === 'anthropic' && (
              <Card padded>
                <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] mb-2">
                  Paste your Anthropic key
                </div>
                <Input placeholder="sk-ant-…" aria-label="Anthropic key" mono />
                <Button size="sm" variant="primary" className="mt-2.5" onClick={() => setStep(2)}>
                  Validate
                </Button>
              </Card>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="max-w-[620px] pt-10">
            <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--accent-ink)] mb-2">
              You&apos;re set.
            </div>
            <h1 className="font-serif text-[44px] font-normal tracking-[-0.02em] leading-[1.1] mt-0 mb-5">
              Compass will draft your first brief tomorrow at 7:30 am.
            </h1>
            <p className="font-serif text-[17px] italic text-[var(--ink-3)] max-w-[540px] mt-0 mb-7">
              You can generate one now, or let it arrive in the morning. Everything else — Notes,
              Focus, Blocker — already works.
            </p>
            <div className="flex gap-2.5">
              <Button variant="accent" leading={<IconSpark size={13} />} onClick={onClose}>
                Generate my first brief
              </Button>
              <Button onClick={onClose}>Open Compass</Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Check({ label }: { label: string }) {
  return (
    <div className="flex gap-2 text-[13.5px] text-[var(--ink-2)] items-center">
      <span className="text-[var(--accent-ink)]">
        <IconCheck size={14} />
      </span>
      {label}
    </div>
  );
}
