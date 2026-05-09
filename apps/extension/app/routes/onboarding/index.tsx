import { useState } from 'react';
import {
  BrandMark,
  Button,
  Card,
  IconArrow,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconSpark,
  Input,
  Spinner,
} from '@compass/ui';
import { stubs } from '@compass/agents';
import { setActiveCredentials } from '@compass/core';

/**
 * Maps raw validation error messages to user-friendly text.
 */
function humanizeValidationError(
  raw: string,
  provider: 'openrouter' | 'openai' | 'anthropic',
): string {
  const name =
    provider === 'openrouter' ? 'OpenRouter' : provider === 'openai' ? 'OpenAI' : 'Anthropic';
  const helpUrl =
    provider === 'openrouter'
      ? 'openrouter.ai/keys'
      : provider === 'openai'
        ? 'platform.openai.com/api-keys'
        : 'console.anthropic.com/settings/keys';
  if (raw.includes('401') || raw.includes('invalid')) {
    return `${name} says this key is invalid. Try generating a new one at ${helpUrl}.`;
  }
  if (raw.includes('429') || raw.includes('rate')) {
    return `${name} is rate-limiting validation requests. Try again in 60 seconds.`;
  }
  if (raw.includes('network') || raw.includes('fetch')) {
    return `Could not reach ${name}. Check your network connection.`;
  }
  return `${name} validation failed: ${raw}`;
}

/**
 * Maps thrown errors to user-friendly messages.
 */
function humanizeException(err: unknown, provider: 'openrouter' | 'openai' | 'anthropic'): string {
  const name =
    provider === 'openrouter' ? 'OpenRouter' : provider === 'openai' ? 'OpenAI' : 'Anthropic';
  if (err instanceof Error) {
    if (err.name === 'LlmTimeout') {
      return `${name} took too long to respond. Try again.`;
    }
    if (err.name === 'LlmUnavailable') {
      return `${name} appears to be down. Try again in a few minutes.`;
    }
    return err.message;
  }
  return 'An unexpected error occurred. Please try again.';
}

export function Onboarding({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [provider, setProvider] = useState<'openrouter' | 'openai' | 'anthropic'>('openrouter');
  const [key, setKey] = useState('');
  const [show, setShow] = useState(false);
  const [validating, setValidating] = useState(false);
  const [valid, setValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
                onClick={() => {
                  setStep(1);
                  setErrorMessage(null);
                }}
                trailing={<IconArrow size={13} />}
                className="!px-5 !py-2.5"
              >
                Connect a model
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Skip — add a key later
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
              Choose a provider. OpenRouter is the easiest one-key path; OpenAI and Anthropic
              connect direct.
            </p>

            <div className="flex gap-2 mb-6" role="radiogroup" aria-label="LLM provider">
              {(
                [
                  ['openrouter', 'OpenRouter', 'sk-or-…'],
                  ['openai', 'OpenAI', 'sk-…'],
                  ['anthropic', 'Anthropic', 'sk-ant-…'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  role="radio"
                  aria-checked={provider === id}
                  onClick={() => {
                    setProvider(id);
                    setKey('');
                    setValid(false);
                    setErrorMessage(null);
                  }}
                  className="px-4 py-2 rounded-lg border text-[13px]"
                  style={{
                    background: provider === id ? 'var(--accent)' : 'transparent',
                    color: provider === id ? '#fff' : 'var(--ink-3)',
                    borderColor: provider === id ? 'var(--accent)' : 'var(--hair)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <Card padded className="mb-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] mb-3">
                Paste your{' '}
                {provider === 'openrouter'
                  ? 'OpenRouter'
                  : provider === 'openai'
                    ? 'OpenAI'
                    : 'Anthropic'}{' '}
                API key
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value);
                    setValid(false);
                    setErrorMessage(null);
                  }}
                  type={show ? 'text' : 'password'}
                  placeholder={
                    provider === 'openrouter'
                      ? 'sk-or-…'
                      : provider === 'openai'
                        ? 'sk-…'
                        : 'sk-ant-…'
                  }
                  aria-label={`${provider} API key`}
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
                    setErrorMessage(null);
                    try {
                      const result = await stubs.validateLlmKey(provider, key);
                      setValidating(false);
                      if (result.valid) {
                        setValid(true);
                        const now = new Date().toISOString();
                        await setActiveCredentials({
                          default: provider,
                          [provider]: {
                            apiKey: key,
                            addedAt: now,
                            lastValidatedAt: now,
                          },
                        });
                        setTimeout(() => setStep(2), 500);
                      } else {
                        setErrorMessage(
                          humanizeValidationError(result.error || 'Unknown error', provider),
                        );
                      }
                    } catch (err) {
                      setValidating(false);
                      setErrorMessage(humanizeException(err, provider));
                    }
                  }}
                >
                  {validating ? <Spinner /> : valid ? 'Valid ✓' : 'Validate'}
                </Button>
              </div>
              {errorMessage && (
                <div className="font-serif text-[14px] text-[var(--warning-ink)] mt-3 p-2 bg-[var(--warning-wash)] rounded-lg">
                  {errorMessage}
                </div>
              )}
              <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] mt-3 leading-[1.6]">
                {provider === 'openrouter' && 'Get your key at openrouter.ai/keys'}
                {provider === 'openai' && 'Get your key at platform.openai.com/api-keys'}
                {provider === 'anthropic' && 'Get your key at console.anthropic.com/settings/keys'}
                {' · stored in chrome.storage.local · validation tests connectivity'}
              </div>
            </Card>

            <div className="flex gap-2.5">
              <Button
                variant="ghost"
                onClick={() => {
                  setKey('');
                  setValid(false);
                  setErrorMessage(null);
                  setStep(0);
                }}
              >
                Back
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Skip — add a key later
              </Button>
            </div>
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
