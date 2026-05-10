import { useState, type CSSProperties } from 'react';
import { setActiveCredentials, enableEncryption } from '@compass/core';
import type { ProviderId } from '@compass/core';
import { useShell } from '../state/shell.js';
import { KeyValidator } from '../components/credentials/KeyValidator';
import { PassphraseSetForm } from '../components/credentials/PassphraseSetForm';

type Step = 1 | 2 | 3;

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

export function OnboardingDrawer() {
  const byokSetupComplete = useShell((s) => s.byokSetupComplete);
  const setEncryptionState = useShell((s) => s.setEncryptionState);
  const [step, setStep] = useState<Step>(1);
  const [showEncryptForm, setShowEncryptForm] = useState(false);

  const handleValidated = async (provider: ProviderId, apiKey: string) => {
    await setActiveCredentials({
      default: provider,
      [provider]: {
        apiKey,
        addedAt: new Date().toISOString(),
        lastValidatedAt: new Date().toISOString(),
      },
    });
    await chrome.storage.local.set({ 'profile.byokConfigured': true });
    setStep(3);
  };

  const handleEncrypt = async (passphrase: string) => {
    await enableEncryption(passphrase);
    setEncryptionState(true, false);
    byokSetupComplete();
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
          <KeyValidator
            providers={['openrouter', 'openai', 'anthropic']}
            onValidated={handleValidated}
            onCancel={() => setStep(1)}
            submitLabel="Validate & continue"
          />
        </>
      )}

      {step === 3 && (
        <>
          <h2 style={titleStyle}>Optional: encryption</h2>
          <p style={proseStyle}>
            You can lock your stored API keys with a passphrase so they&rsquo;re encrypted at rest.
            This step is optional — you can enable it later from Profile → Encryption.
          </p>
          {!showEncryptForm ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnAccent} onClick={() => setShowEncryptForm(true)}>
                Encrypt with passphrase
              </button>
              <button style={btnGhost} onClick={byokSetupComplete}>
                Skip for now
              </button>
            </div>
          ) : (
            <PassphraseSetForm
              onSet={handleEncrypt}
              onCancel={() => setShowEncryptForm(false)}
              submitLabel="Encrypt and finish"
            />
          )}
        </>
      )}
    </div>
  );
}
