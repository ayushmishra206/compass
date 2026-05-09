import { useState, type CSSProperties } from 'react';
import { rpc } from '@compass/runtime';
import { useShell } from '../state/shell.js';

type Step = 1 | 2 | 3;
type Provider = 'openrouter' | 'openai' | 'anthropic';

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: 28,
  margin: '0 0 8px',
  letterSpacing: '-0.02em',
  lineHeight: 1.15,
};
const monoStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--accent-soft)',
};
const proseStyle: CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: 14,
  lineHeight: 1.6,
  color: 'var(--color-ink-2)',
};
const btnAccent: CSSProperties = {
  padding: '10px 16px',
  borderRadius: 999,
  background: 'var(--accent)',
  color: '#1a0e02',
  border: 0,
  fontSize: 13,
  fontWeight: 500,
};
const btnGhost: CSSProperties = {
  padding: '10px 16px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--color-ink)',
  border: '1px solid rgba(255,255,255,0.08)',
  fontSize: 13,
};

export function OnboardingDrawer() {
  const byokSetupComplete = useShell((s) => s.byokSetupComplete);
  const [step, setStep] = useState<Step>(1);
  const [provider, setProvider] = useState<Provider>('openrouter');
  const [apiKey, setApiKey] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndAdvance = async () => {
    setValidating(true);
    setError(null);
    try {
      const res = await rpc('llm.validateKey', { provider, apiKey });
      if (!res.valid) {
        setError(res.error ?? 'Invalid key');
        return;
      }
      // TODO: Phase 1.5 settings workstream stores the validated key in the
      // credentials envelope. For Phase 1.6 we mark BYOK as configured.
      await chrome.storage.local.set({ 'profile.byokConfigured': true });
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={monoStyle}>Step {step} of 3</div>

      {step === 1 && (
        <>
          <h2 style={titleStyle}>Welcome to Compass</h2>
          <p style={proseStyle}>
            A new-tab page that helps you start each day with intention. Brief, focus, notes, inbox
            — proactive without being noisy. Local-first; your data stays on this device.
          </p>
          <p style={proseStyle}>
            To begin, connect a model. You bring your own key — Compass never proxies your requests.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnAccent} onClick={() => setStep(2)}>
              Connect a model
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h2 style={titleStyle}>Connect a model</h2>
          <p style={proseStyle}>
            Choose a provider and paste your API key. Compass calls the provider directly from your
            browser — keys never transit our servers.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['openai', 'anthropic', 'openrouter'] as Provider[]).map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                style={{
                  padding: '8px 14px',
                  fontSize: 12,
                  borderRadius: 999,
                  background: provider === p ? 'var(--accent-wash)' : 'rgba(255,255,255,0.05)',
                  color: 'var(--color-ink)',
                  border:
                    provider === p
                      ? '1px solid var(--accent-soft)'
                      : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-…"
            style={{
              padding: '10px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'var(--color-ink)',
              outline: 'none',
            }}
          />
          {error && <div style={{ color: 'oklch(0.82 0.13 30)', fontSize: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnGhost} onClick={() => setStep(1)} disabled={validating}>
              Back
            </button>
            <button
              style={btnAccent}
              onClick={validateAndAdvance}
              disabled={validating || apiKey.length < 10}
            >
              {validating ? 'Validating…' : 'Validate & continue'}
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h2 style={titleStyle}>Optional: encryption</h2>
          <p style={proseStyle}>
            You can lock your stored API keys with a passphrase so they&rsquo;re encrypted at rest.
            This step is optional and can be enabled later from Profile.
          </p>
          <p style={{ ...proseStyle, fontSize: 12.5, fontStyle: 'italic' }}>
            Passphrase setup ships with Phase 1.5 settings &mdash; for now this step is a stub. You
            can finish without enabling encryption.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnAccent} onClick={byokSetupComplete}>
              Finish setup
            </button>
          </div>
        </>
      )}
    </div>
  );
}
