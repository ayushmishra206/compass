import { useState, type CSSProperties } from 'react';
import { Pill, Row, Stack, Text } from '@compass/ui';
import type { StoredMessage } from '@compass/db';
import { PRIORITY_LABEL, useInbox } from '../hooks/useInbox.js';

const btnGhost: CSSProperties = {
  padding: '7px 12px',
  fontSize: 12,
  borderRadius: 999,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'inherit',
};

const cardStyle: CSSProperties = {
  padding: '12px 14px',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid var(--color-hair)',
};

function priorityTone(p: string | null): 'red' | 'accent' | 'default' {
  if (p === 'p1') return 'red';
  if (p === 'p2') return 'accent';
  return 'default';
}

function MessageCard({ m }: { m: StoredMessage }) {
  return (
    <div style={cardStyle}>
      <Row gap={2} align="center" style={{ marginBottom: 6 }}>
        {m.priority && <Pill tone={priorityTone(m.priority)}>{PRIORITY_LABEL[m.priority]}</Pill>}
        <Text variant="body" as="span" tone="muted" style={{ fontSize: 11, marginLeft: 'auto' }}>
          {m.fromName ?? m.fromEmail ?? 'Unknown sender'}
        </Text>
      </Row>

      <Text variant="body" style={{ fontSize: 13, marginBottom: 4 }}>
        {m.subject ?? '(no subject)'}
      </Text>

      {m.snippet && (
        <Text variant="body" tone="muted" style={{ fontSize: 11.5, marginBottom: 8 }}>
          {m.snippet}
        </Text>
      )}

      {m.injectionFlags.length > 0 && (
        <Row gap={2} align="center" style={{ marginBottom: 8 }}>
          <Pill tone="red">suspicious</Pill>
          <Text variant="body" as="span" tone="dim" style={{ fontSize: 10.5 }}>
            This message tried to give Compass instructions. Nothing was acted on.
          </Text>
        </Row>
      )}

      {m.actions.length > 0 && (
        <Stack gap={1}>
          {m.actions.map((a, i) => (
            <Row key={i} gap={2} align="center">
              <Text variant="mono" tone="dim" as="span" style={{ fontSize: 9, flex: '0 0 46px' }}>
                {a.owner === 'me' ? 'YOU' : a.owner === 'other' ? 'THEM' : '—'}
              </Text>
              <Text variant="body" as="span" tone="secondary" style={{ flex: 1, fontSize: 12 }}>
                {a.title}
              </Text>
              {a.dueDate && (
                <Text variant="mono" tone="dim" as="span" style={{ fontSize: 9 }}>
                  {a.dueDate}
                </Text>
              )}
            </Row>
          ))}
        </Stack>
      )}
    </div>
  );
}

export function InboxDrawer() {
  const { state, syncing, sync, wipe } = useInbox();
  const [error, setError] = useState<string | null>(null);

  if (state.kind === 'loading') {
    return (
      <Text variant="body" tone="muted">
        Loading inbox…
      </Text>
    );
  }

  if (state.kind === 'not-connected') {
    return (
      <Stack gap={2} style={{ padding: '24px 0' }}>
        <Text variant="heading">Gmail not connected</Text>
        <Text variant="body" tone="muted" style={{ maxWidth: 360 }}>
          Connect Gmail in Profile to see what you have actually committed to. Compass reads your
          mail read-only, extracts commitments on this device, and has no ability to send anything.
        </Text>
      </Stack>
    );
  }

  if (state.kind === 'error') {
    return (
      <Stack gap={2}>
        <Text variant="heading">Couldn&rsquo;t load the inbox</Text>
        <Text variant="body" tone="muted">
          {state.message}
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap={3}>
      <Row gap={2} align="center">
        <button
          type="button"
          style={btnGhost}
          disabled={syncing}
          onClick={() => {
            setError(null);
            void sync().then(setError);
          }}
        >
          {syncing ? 'Scanning…' : 'Scan inbox'}
        </button>
        <button type="button" style={btnGhost} onClick={() => void wipe()}>
          Clear local copy
        </button>
      </Row>

      {error && (
        <Text variant="body" tone="dim" style={{ fontSize: 11 }}>
          {error}
        </Text>
      )}

      {state.messages.length === 0 ? (
        <Text variant="body" tone="muted" style={{ fontSize: 12 }}>
          Nothing indexed yet. Scan to pull the last week of primary inbox mail.
        </Text>
      ) : (
        <Stack gap={2}>
          {state.messages.map((m) => (
            <MessageCard key={m.messageId} m={m} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
