import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useShell } from '../../state/shell';
import { PassphraseConfirmForm } from '../../components/credentials/PassphraseConfirmForm';
import { KeyValidator } from '../../components/credentials/KeyValidator';
import {
  getActiveCredentials,
  setActiveCredentials,
  clearActiveCredentials,
  type LlmCredentials,
  type ProviderId,
} from '@compass/core';
import { rpc } from '@compass/runtime';
import { relativeTime } from '../../lib/relativeTime';

const ALL_PROVIDERS: ProviderId[] = ['openrouter', 'openai', 'anthropic'];

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
const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 0',
  fontSize: 12,
  color: 'var(--color-ink-2)',
};
const monoStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
};
const badgeStyle: CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  padding: '2px 6px',
  borderRadius: 4,
  background: 'var(--accent-wash)',
  color: 'var(--accent-soft)',
};
const dotsBtn: CSSProperties = {
  marginLeft: 'auto',
  background: 'none',
  border: 0,
  color: 'var(--color-ink-3)',
  fontSize: 18,
  cursor: 'pointer',
  padding: '0 4px',
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
const btnAccent: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 999,
  background: 'var(--accent)',
  color: '#1a0e02',
  border: 0,
  fontSize: 12,
  cursor: 'pointer',
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

function maskKey(k: string): string {
  const m = /^([A-Za-z0-9]+)/.exec(k);
  const prefix = m ? m[1] : '';
  const tail = k.slice(-4);
  return `${prefix}-…${tail}`;
}

type Action = 'menu' | 'rotate' | 'remove' | 'add' | null;
type RowAction = { provider: ProviderId; kind: Action };

function getRows(
  creds: LlmCredentials,
): { provider: ProviderId; entry: NonNullable<LlmCredentials['openrouter']> }[] {
  return ALL_PROVIDERS.flatMap((p) => {
    const entry = creds[p];
    return entry ? [{ provider: p, entry }] : [];
  });
}

export function ConnectedProvidersSection() {
  const encryptionEnabled = useShell((s) => s.encryptionEnabled);
  const locked = useShell((s) => s.locked);
  const unlock = useShell((s) => s.unlock);
  const unlockHint = useShell((s) => s.unlockHint);
  const clearUnlockHint = useShell((s) => s.clearUnlockHint);
  const passphraseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (encryptionEnabled && locked && unlockHint) {
      passphraseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = passphraseRef.current?.querySelector(
        'input[type="password"]',
      ) as HTMLInputElement | null;
      input?.focus();
      clearUnlockHint();
    }
  }, [encryptionEnabled, locked, unlockHint, clearUnlockHint]);

  const [creds, setCreds] = useState<LlmCredentials | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [active, setActive] = useState<RowAction | null>(null);
  const [validatingProvider, setValidatingProvider] = useState<ProviderId | null>(null);

  useEffect(() => {
    if (encryptionEnabled && locked) return;
    void getActiveCredentials().then(setCreds);
  }, [encryptionEnabled, locked]);

  if (encryptionEnabled && locked) {
    return (
      <div style={sectionWrap}>
        <div style={sectionLabelStyle}>Connected providers</div>
        {!showForgot ? (
          <>
            <div style={{ fontSize: 12, color: 'var(--color-ink-3)', marginBottom: 10 }}>
              🔒 Locked. Enter your passphrase to manage providers.
            </div>
            <div ref={passphraseRef}>
              <PassphraseConfirmForm onConfirm={(p) => unlock(p)} submitLabel="Unlock" />
            </div>
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

  if (!creds) return <div style={sectionWrap} />;

  const rows = getRows(creds);
  const availableProviders = ALL_PROVIDERS.filter((p) => !creds[p]);

  const refresh = async () => {
    setCreds(await getActiveCredentials());
  };

  const handleValidate = async (provider: ProviderId, apiKey: string) => {
    setValidatingProvider(provider);
    try {
      const res = await rpc('llm.validateKey', { provider, apiKey });
      if (!res.valid) return;
      const entry = creds[provider]!;
      const next: LlmCredentials = {
        ...creds,
        [provider]: { ...entry, lastValidatedAt: new Date().toISOString() },
      };
      await setActiveCredentials(next);
      await refresh();
    } finally {
      setValidatingProvider(null);
      setActive(null);
    }
  };

  const handleSetDefault = async (provider: ProviderId) => {
    await setActiveCredentials({ ...creds, default: provider });
    await refresh();
    setActive(null);
  };

  const handleRotate = async (provider: ProviderId, newKey: string) => {
    const existing = creds[provider]!;
    const next: LlmCredentials = {
      ...creds,
      [provider]: {
        apiKey: newKey,
        addedAt: existing.addedAt,
        lastValidatedAt: new Date().toISOString(),
      },
    };
    await setActiveCredentials(next);
    await refresh();
    setActive(null);
  };

  const handleAddAnother = async (provider: ProviderId, apiKey: string) => {
    const now = new Date().toISOString();
    const next: LlmCredentials = {
      ...creds,
      [provider]: { apiKey, addedAt: now, lastValidatedAt: now },
    };
    await setActiveCredentials(next);
    await refresh();
    setActive(null);
  };

  return (
    <div style={sectionWrap}>
      <div style={sectionLabelStyle}>Connected providers</div>
      {rows.map(({ provider, entry }) => {
        const isDefault = creds.default === provider;
        const isActiveRow = active?.provider === provider;
        return (
          <div key={provider}>
            <div style={rowStyle}>
              <div style={{ minWidth: 90 }}>{provider}</div>
              <div style={monoStyle}>{maskKey(entry.apiKey)}</div>
              {isDefault && <span style={badgeStyle}>default</span>}
              <div style={{ fontSize: 11, color: 'var(--color-ink-3)', marginLeft: 'auto' }}>
                {validatingProvider === provider
                  ? 'validating…'
                  : entry.lastValidatedAt
                    ? relativeTime(entry.lastValidatedAt)
                    : 'never validated'}
              </div>
              <button
                type="button"
                aria-label={`Row actions for ${provider}`}
                onClick={() =>
                  setActive(
                    isActiveRow && active?.kind === 'menu' ? null : { provider, kind: 'menu' },
                  )
                }
                style={dotsBtn}
              >
                ⋯
              </button>
            </div>
            {isActiveRow && active?.kind === 'menu' && (
              <div style={{ display: 'flex', gap: 8, padding: '4px 0 8px 90px' }}>
                <button
                  type="button"
                  style={btnGhost}
                  onClick={() => void handleValidate(provider, entry.apiKey)}
                >
                  Validate now
                </button>
                {!isDefault && (
                  <button
                    type="button"
                    style={btnGhost}
                    onClick={() => void handleSetDefault(provider)}
                  >
                    Set as default
                  </button>
                )}
                <button
                  type="button"
                  style={btnGhost}
                  onClick={() => setActive({ provider, kind: 'rotate' })}
                >
                  Rotate
                </button>
                <button
                  type="button"
                  style={btnGhost}
                  onClick={() => setActive({ provider, kind: 'remove' })}
                >
                  Remove
                </button>
              </div>
            )}
            {isActiveRow && active?.kind === 'rotate' && (
              <div style={{ padding: '4px 0 8px 90px' }}>
                <KeyValidator
                  providers={[provider]}
                  initialProvider={provider}
                  lockProvider
                  onValidated={handleRotate}
                  onCancel={() => setActive(null)}
                  submitLabel="Rotate"
                />
              </div>
            )}
            {isActiveRow && active?.kind === 'remove' && (
              <RemoveConfirm
                provider={provider}
                creds={creds}
                onCancel={() => setActive(null)}
                onConfirmed={async (newDefault) => {
                  const next: LlmCredentials = { ...creds, default: newDefault };
                  delete (next as Record<string, unknown>)[provider];
                  await setActiveCredentials(next);
                  if (!newDefault && !next.openrouter && !next.openai && !next.anthropic) {
                    await chrome.storage.local.remove('profile.byokConfigured');
                    useShell.setState({ onboardingLocked: true });
                  }
                  await refresh();
                  setActive(null);
                }}
              />
            )}
          </div>
        );
      })}

      <div style={{ marginTop: 12 }}>
        {active?.kind !== 'add' ? (
          availableProviders.length > 0 && (
            <button
              type="button"
              style={btnGhost}
              onClick={() => setActive({ provider: availableProviders[0]!, kind: 'add' })}
            >
              + Add another provider
            </button>
          )
        ) : (
          <KeyValidator
            providers={availableProviders}
            onValidated={handleAddAnother}
            onCancel={() => setActive(null)}
            submitLabel="Add provider"
          />
        )}
      </div>
    </div>
  );
}

function RemoveConfirm({
  provider,
  creds,
  onCancel,
  onConfirmed,
}: {
  provider: ProviderId;
  creds: LlmCredentials;
  onCancel: () => void;
  onConfirmed: (newDefault: ProviderId | null) => Promise<void>;
}) {
  const isDefault = creds.default === provider;
  const remaining = ALL_PROVIDERS.filter((p) => p !== provider && creds[p]);
  const [pickedDefault, setPickedDefault] = useState<ProviderId | null>(
    isDefault ? (remaining[0] ?? null) : creds.default,
  );

  if (isDefault && remaining.length > 0) {
    return (
      <div style={{ padding: '4px 0 8px 90px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 12, color: 'var(--color-ink-2)' }}>
          Remove {provider} — pick new default:
        </div>
        {remaining.map((p) => (
          <label key={p} style={{ fontSize: 12 }}>
            <input
              type="radio"
              name="newDefault"
              checked={pickedDefault === p}
              onChange={() => setPickedDefault(p)}
            />{' '}
            {p}
          </label>
        ))}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={btnGhost} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" style={btnAccent} onClick={() => void onConfirmed(pickedDefault)}>
            Remove and set new default
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '4px 0 8px 90px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 12, color: 'var(--color-ink-2)' }}>
        {remaining.length === 0
          ? 'This will leave you with no providers. You will see onboarding on next reload.'
          : `Remove ${provider}?`}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" style={btnGhost} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" style={btnAccent} onClick={() => void onConfirmed(pickedDefault)}>
          Remove
        </button>
      </div>
    </div>
  );
}

function ForgotPassphrasePrompt({ onCancel }: { onCancel: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  const handleErase = async () => {
    setSubmitting(true);
    await clearActiveCredentials();
    await chrome.storage.session.remove('llm.creds.v1.kek');
    await chrome.storage.local.remove('profile.byokConfigured');
    useShell.setState({
      encryptionEnabled: false,
      locked: false,
      unlockHint: false,
      drawer: { open: false, kind: null },
      onboardingLocked: true,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 12, color: 'var(--color-ink-2)' }}>
        This will permanently erase your saved API keys from this browser. You will see the
        onboarding screen and need to re-paste your keys. There is no recovery — this device cannot
        decrypt the keys without your passphrase.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" style={btnGhost} onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button
          type="button"
          style={btnAccent}
          onClick={() => void handleErase()}
          disabled={submitting}
        >
          {submitting ? 'Erasing…' : 'Erase keys and start over'}
        </button>
      </div>
    </div>
  );
}
