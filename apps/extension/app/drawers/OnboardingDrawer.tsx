import { useState, type CSSProperties } from 'react';
import { Row, Stack, Text } from '@compass/ui';
import { setActiveCredentials, enableEncryption } from '@compass/core';
import type { ProviderId } from '@compass/core';
import { useShell } from '../state/shell.js';
import { KeyValidator } from '../components/credentials/KeyValidator';
import { PassphraseSetForm } from '../components/credentials/PassphraseSetForm';

type Step = 1 | 2 | 3;

const btnAccent: CSSProperties = {
  padding: '10px 18px',
  borderRadius: 999,
  background: 'var(--accent)',
  color: '#1a0e02',
  border: 0,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};
const btnGhost: CSSProperties = {
  padding: '10px 18px',
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
    <Stack gap={4}>
      <Text variant="mono" tone="accent">
        Step {step} of 3
      </Text>

      {step === 1 && (
        <>
          <Text variant="title" as="h2" style={{ fontSize: 28, lineHeight: 1.15 }}>
            Welcome to Compass
          </Text>
          <Text variant="serif-body" style={{ fontSize: 14, lineHeight: 1.6 }}>
            A new-tab page that helps you start each day with intention. Brief, focus, notes, inbox
            — proactive without being noisy. Local-first; your data stays on this device.
          </Text>
          <Text variant="serif-body" style={{ fontSize: 14, lineHeight: 1.6 }}>
            To begin, connect a model. You bring your own key — Compass never proxies your requests.
          </Text>
          <Row gap={2}>
            <button style={btnAccent} onClick={() => setStep(2)}>
              Connect a model
            </button>
          </Row>
        </>
      )}

      {step === 2 && (
        <>
          <Text variant="title" as="h2" style={{ fontSize: 28, lineHeight: 1.15 }}>
            Connect a model
          </Text>
          <Text variant="serif-body" style={{ fontSize: 14, lineHeight: 1.6 }}>
            Choose a provider and paste your API key. Compass calls the provider directly from your
            browser — keys never transit our servers.
          </Text>
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
          <Text variant="title" as="h2" style={{ fontSize: 28, lineHeight: 1.15 }}>
            Optional: encryption
          </Text>
          <Text variant="serif-body" style={{ fontSize: 14, lineHeight: 1.6 }}>
            You can lock your stored API keys with a passphrase so they&rsquo;re encrypted at rest.
            This step is optional — you can enable it later from Profile → Encryption.
          </Text>
          {!showEncryptForm ? (
            <Row gap={2}>
              <button style={btnAccent} onClick={() => setShowEncryptForm(true)}>
                Encrypt with passphrase
              </button>
              <button style={btnGhost} onClick={byokSetupComplete}>
                Skip for now
              </button>
            </Row>
          ) : (
            <PassphraseSetForm
              onSet={handleEncrypt}
              onCancel={() => setShowEncryptForm(false)}
              submitLabel="Encrypt and finish"
            />
          )}
        </>
      )}
    </Stack>
  );
}
