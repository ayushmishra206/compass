import { useId, useState, type CSSProperties } from 'react';

interface Props {
  onConfirm: (passphrase: string) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
  errorLabelOnInvalid?: string;
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

export function PassphraseConfirmForm({
  onConfirm,
  onCancel,
  submitLabel,
  errorLabelOnInvalid = 'Wrong passphrase',
}: Props) {
  const passId = useId();
  const [passphrase, setPassphrase] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(passphrase);
    } catch {
      setError(errorLabelOnInvalid);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label htmlFor={passId} style={{ fontSize: 11, color: 'var(--color-ink-3)' }}>
        Passphrase
      </label>
      <input
        id={passId}
        type="password"
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
        autoFocus
        style={inputStyle}
      />
      {error && <div style={{ color: 'oklch(0.82 0.13 30)', fontSize: 12 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        {onCancel && (
          <button type="button" style={btnGhost} onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        )}
        <button
          type="button"
          style={btnAccent}
          onClick={submit}
          disabled={submitting || passphrase.length === 0}
        >
          {submitting ? 'Working…' : submitLabel}
        </button>
      </div>
    </div>
  );
}
