import { useEffect, useState, type CSSProperties } from 'react';
import { Text } from '@compass/ui';
import { rpc } from '@compass/runtime';
import { getUserProfile, setUserProfile } from '@compass/core';

const sectionWrap: CSSProperties = {
  padding: '12px 0',
  borderBottom: '1px solid var(--color-hair)',
};

const btnGhost: CSSProperties = {
  padding: '7px 12px',
  fontSize: 12,
  borderRadius: 999,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'inherit',
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  borderRadius: 6,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'var(--color-ink)',
  boxSizing: 'border-box',
};

type Status = { connected: boolean; email?: string };

export function CalendarSection() {
  const [status, setStatus] = useState<Status | null>(null);
  const [clientId, setClientId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const profile = await getUserProfile();
      setClientId(profile.calendarClientId ?? '');
      try {
        setStatus(await rpc('calendar.status', {}));
      } catch {
        setStatus({ connected: false });
      }
    })();
  }, []);

  const connect = async () => {
    setBusy(true);
    setMessage(null);
    try {
      // Persist first: the offscreen document needs the id to refresh tokens
      // later, and a successful connect with no stored id is unrecoverable
      // without re-consenting.
      await setUserProfile({ calendarClientId: clientId.trim() });
      const res = await rpc('calendar.connect', { clientId: clientId.trim() });
      if (res.ok) {
        setStatus({ connected: true, email: res.email });
        setMessage('Connected. Syncing your calendar…');
        await rpc('calendar.sync', {});
        setMessage('Connected.');
      } else {
        setMessage(res.error);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await rpc('calendar.disconnect', {});
      setStatus({ connected: false });
      setMessage(null);
    } finally {
      setBusy(false);
    }
  };

  if (!status) return <div style={sectionWrap} />;

  return (
    <section style={sectionWrap}>
      <Text variant="mono" as="div" style={{ marginBottom: 8 }}>
        Calendar
      </Text>

      {status.connected ? (
        <>
          <Text variant="body" tone="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            Connected{status.email ? ` as ${status.email}` : ''} — read-only.
          </Text>
          <button type="button" style={btnGhost} onClick={disconnect} disabled={busy}>
            Disconnect
          </button>
        </>
      ) : (
        <>
          <Text variant="body" tone="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            Paste the OAuth client ID from your Google Cloud project. Compass requests read-only
            calendar access and nothing else.
          </Text>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="xxxxx.apps.googleusercontent.com"
            aria-label="Google OAuth client ID"
            style={inputStyle}
          />
          <button
            type="button"
            style={{ ...btnGhost, marginTop: 8 }}
            onClick={connect}
            disabled={busy || !clientId.trim()}
          >
            {busy ? 'Connecting…' : 'Connect Google Calendar'}
          </button>
        </>
      )}

      {message && (
        <Text variant="body" tone="dim" style={{ fontSize: 11, marginTop: 8 }}>
          {message}
        </Text>
      )}
    </section>
  );
}
