import { useState, type CSSProperties } from 'react';
import { useShell } from '../../state/shell';
import { PassphraseSetForm } from '../../components/credentials/PassphraseSetForm';
import { PassphraseConfirmForm } from '../../components/credentials/PassphraseConfirmForm';
import { enableEncryption, disableEncryption } from '@compass/core';

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
const btnGhost: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--color-ink)',
  border: '1px solid rgba(255,255,255,0.08)',
  fontSize: 12,
  cursor: 'pointer',
};

export function EncryptionSection() {
  const encryptionEnabled = useShell((s) => s.encryptionEnabled);
  const locked = useShell((s) => s.locked);
  const lock = useShell((s) => s.lock);
  const setEncryptionState = useShell((s) => s.setEncryptionState);
  const [expanded, setExpanded] = useState<'enable' | 'disable' | null>(null);

  const handleEnable = async (passphrase: string) => {
    await enableEncryption(passphrase);
    setEncryptionState(true, false);
    setExpanded(null);
  };

  const handleDisable = async (passphrase: string) => {
    await disableEncryption(passphrase);
    setEncryptionState(false, false);
    setExpanded(null);
  };

  if (!encryptionEnabled) {
    return (
      <div style={sectionWrap}>
        <div style={sectionLabelStyle}>Encryption</div>
        <div style={{ fontSize: 12, color: 'var(--color-ink-3)', marginBottom: 10 }}>
          Off — keys are stored unencrypted in this browser.
        </div>
        {expanded !== 'enable' ? (
          <button type="button" style={btnGhost} onClick={() => setExpanded('enable')}>
            Enable encryption
          </button>
        ) : (
          <PassphraseSetForm onSet={handleEnable} onCancel={() => setExpanded(null)} />
        )}
      </div>
    );
  }

  return (
    <div style={sectionWrap}>
      <div style={sectionLabelStyle}>Encryption</div>
      <div style={{ fontSize: 12, color: 'var(--color-ink-3)', marginBottom: 10 }}>
        On — keys are encrypted at rest with your passphrase.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {!locked && (
          <button type="button" style={btnGhost} onClick={() => void lock()}>
            Lock now
          </button>
        )}
        {expanded !== 'disable' && (
          <button type="button" style={btnGhost} onClick={() => setExpanded('disable')}>
            Disable encryption
          </button>
        )}
      </div>
      {expanded === 'disable' && (
        <div style={{ marginTop: 10 }}>
          <PassphraseConfirmForm
            onConfirm={handleDisable}
            onCancel={() => setExpanded(null)}
            submitLabel="Disable encryption"
          />
        </div>
      )}
    </div>
  );
}
