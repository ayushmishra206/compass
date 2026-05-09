import { useState, type CSSProperties } from 'react';
import { useShell } from '../../state/shell';
import { PassphraseConfirmForm } from '../../components/credentials/PassphraseConfirmForm';

const sectionLabelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-ink-3)',
  marginBottom: 10,
};
const sectionWrap: CSSProperties = {
  marginBottom: 26,
  paddingBottom: 18,
  borderBottom: '1px solid var(--color-hair)',
};
const linkStyle: CSSProperties = {
  background: 'none',
  border: 0,
  padding: 0,
  color: 'var(--accent-soft)',
  fontSize: 12,
  textDecoration: 'underline',
  cursor: 'pointer',
  marginTop: 8,
};

export function ConnectedProvidersSection() {
  const encryptionEnabled = useShell((s) => s.encryptionEnabled);
  const locked = useShell((s) => s.locked);
  const unlock = useShell((s) => s.unlock);

  const [showForgot, setShowForgot] = useState(false);

  if (encryptionEnabled && locked) {
    return (
      <div style={sectionWrap}>
        <div style={sectionLabelStyle}>Connected providers</div>
        {!showForgot ? (
          <>
            <div style={{ fontSize: 12, color: 'var(--color-ink-3)', marginBottom: 10 }}>
              🔒 Locked. Enter your passphrase to manage providers.
            </div>
            <PassphraseConfirmForm onConfirm={(p) => unlock(p)} submitLabel="Unlock" />
            <button type="button" style={linkStyle} onClick={() => setShowForgot(true)}>
              Forgot passphrase?
            </button>
          </>
        ) : (
          <ForgotPassphrasePrompt onCancel={() => setShowForgot(false)} />
        )}
      </div>
    );
  }

  // Unlocked branch — wired in Task 16.
  return (
    <div style={sectionWrap}>
      <div style={sectionLabelStyle}>Connected providers</div>
      <div style={{ fontSize: 12, color: 'var(--color-ink-3)', fontStyle: 'italic' }}>
        Unlocked branch wired in Task 16.
      </div>
    </div>
  );
}

function ForgotPassphrasePrompt({ onCancel }: { onCancel: () => void }) {
  // Implemented in Task 19.
  return (
    <div style={{ fontSize: 12, color: 'var(--color-ink-3)' }}>
      Wired in Task 19.{' '}
      <button type="button" style={linkStyle} onClick={onCancel}>
        Back
      </button>
    </div>
  );
}
