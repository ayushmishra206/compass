import { useState, type CSSProperties } from 'react';
import { rpc } from '@compass/runtime';
import type { ProviderId } from '@compass/core';

interface Props {
  providers: ProviderId[];
  initialProvider?: ProviderId;
  lockProvider?: boolean;
  onValidated: (provider: ProviderId, apiKey: string) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

const inputStyle: CSSProperties = {
  padding: '10px 14px',
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  borderRadius: 8,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: 'var(--color-ink)',
  outline: 'none',
};
const btnAccent: CSSProperties = {
  padding: '10px 16px',
  borderRadius: 999,
  background: 'var(--accent)',
  color: '#1a0e02',
  border: 0,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};
const btnGhost: CSSProperties = {
  padding: '10px 16px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--color-ink)',
  border: '1px solid rgba(255,255,255,0.08)',
  fontSize: 13,
  cursor: 'pointer',
};

export function KeyValidator({
  providers,
  initialProvider,
  lockProvider,
  onValidated,
  onCancel,
  submitLabel = 'Validate & continue',
}: Props) {
  const [provider, setProvider] = useState<ProviderId>(initialProvider ?? providers[0]!);
  const [apiKey, setApiKey] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setValidating(true);
    setError(null);
    try {
      const res = await rpc('llm.validateKey', { provider, apiKey });
      if (!res.valid) {
        setError(res.error ?? 'Invalid key');
        return;
      }
      await onValidated(provider, apiKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {lockProvider ? (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-ink-3)' }}>
          {provider}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {providers.map((p) => (
            <button
              key={p}
              type="button"
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
                cursor: 'pointer',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="sk-…"
        aria-label="API key"
        style={inputStyle}
      />
      {error && <div style={{ color: 'oklch(0.82 0.13 30)', fontSize: 12 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        {onCancel && (
          <button type="button" style={btnGhost} onClick={onCancel} disabled={validating}>
            Cancel
          </button>
        )}
        <button
          type="button"
          style={btnAccent}
          onClick={submit}
          disabled={validating || apiKey.trim().length === 0}
        >
          {validating ? 'Validating…' : submitLabel}
        </button>
      </div>
    </div>
  );
}
