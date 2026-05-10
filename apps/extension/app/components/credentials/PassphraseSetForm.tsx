import { useId, useState, type CSSProperties } from 'react';
import { MIN_PASSPHRASE_LENGTH, passphraseStrength } from '@compass/core';

interface Props {
  onSet: (passphrase: string) => Promise<void>;
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
const STRENGTH_COLORS: Record<'weak' | 'medium' | 'strong', string> = {
  weak: 'oklch(0.82 0.13 30)',
  medium: 'oklch(0.82 0.13 80)',
  strong: 'oklch(0.82 0.13 150)',
};

export function PassphraseSetForm({
  onSet,
  onCancel,
  submitLabel = 'Encrypt with this passphrase',
}: Props) {
  const passId = useId();
  const confirmId = useId();
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = passphraseStrength(passphrase);
  const valid = passphrase.length >= MIN_PASSPHRASE_LENGTH && passphrase === confirm;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onSet(passphrase);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set passphrase');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label htmlFor={passId} style={{ fontSize: 11, color: 'var(--color-ink-3)' }}>
        Passphrase
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={passId}
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          aria-describedby={`${passId}-hint`}
          style={inputStyle}
        />
        <span
          data-testid="strength-dot"
          data-strength={strength}
          role="img"
          aria-label={`Strength: ${strength}`}
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: STRENGTH_COLORS[strength],
          }}
        />
      </div>
      <div id={`${passId}-hint`} style={{ fontSize: 11, color: 'var(--color-ink-3)' }}>
        12+ characters. A short sentence works well — e.g., &ldquo;correct horse battery
        staple&rdquo;.
      </div>

      <label
        htmlFor={confirmId}
        style={{ fontSize: 11, color: 'var(--color-ink-3)', marginTop: 6 }}
      >
        Confirm passphrase
      </label>
      <input
        id={confirmId}
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        style={inputStyle}
      />

      {error && <div style={{ color: 'oklch(0.82 0.13 30)', fontSize: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        {onCancel && (
          <button type="button" style={btnGhost} onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        )}
        <button type="button" style={btnAccent} onClick={submit} disabled={!valid || submitting}>
          {submitting ? 'Encrypting…' : submitLabel}
        </button>
      </div>
    </div>
  );
}
