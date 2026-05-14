import type { CSSProperties } from 'react';
import { useState } from 'react';
import { Pill, Row, Stack, Surface, Text } from '@compass/ui';
import { MOCK } from '../mocks/index.js';

const listBtnStyle: CSSProperties = {
  textAlign: 'left',
  padding: '12px 14px',
  borderRadius: 8,
  background: 'transparent',
  marginBottom: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  color: 'var(--color-ink)',
};

const listBtnSelectedStyle: CSSProperties = {
  ...listBtnStyle,
  background: 'rgba(255,255,255,0.06)',
};

const btnAccent: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  fontSize: 12,
  fontWeight: 500,
  borderRadius: 999,
  background: 'var(--accent)',
  color: '#1a0e02',
  border: 0,
  cursor: 'pointer',
};
const btnGhost: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  fontSize: 12,
  fontWeight: 500,
  borderRadius: 999,
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--color-ink)',
  border: '1px solid rgba(255,255,255,0.08)',
  cursor: 'pointer',
};

const priorityTone: Record<string, 'red' | 'blue' | 'default'> = {
  p1: 'red',
  p2: 'red',
  p3: 'blue',
  p4: 'default',
};

export function InboxDrawer() {
  const firstWithAction = MOCK.inboxActions.find((a) => a.actions.length > 0)?.id ?? '';
  const [sel, setSel] = useState<string>(firstWithAction);
  const it = MOCK.inboxActions.find((a) => a.id === sel);

  return (
    <>
      <Stack gap={1} style={{ marginBottom: 20 }}>
        {MOCK.inboxActions.map((a) => (
          <button
            key={a.id}
            onClick={() => setSel(a.id)}
            style={sel === a.id ? listBtnSelectedStyle : listBtnStyle}
          >
            <Row gap={2} align="center">
              <Pill tone={priorityTone[a.priority] ?? 'default'}>{a.priority.toUpperCase()}</Pill>
              <Text
                variant="body"
                as="span"
                style={{
                  fontSize: 12.5,
                  fontWeight: 500,
                  flex: 1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {a.from}
              </Text>
              <Text variant="mono" tone="dim" as="span">
                {a.received}
              </Text>
            </Row>
            <Text
              variant="body"
              as="span"
              tone="secondary"
              style={{
                fontSize: 12,
                paddingLeft: 30,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {a.subject}
            </Text>
          </button>
        ))}
      </Stack>
      {it && (
        <div style={{ borderTop: '1px solid var(--color-hair)', marginTop: 12, paddingTop: 22 }}>
          <Text variant="title">{it.subject}</Text>
          <Text variant="body" tone="muted" style={{ margin: '6px 0 18px', fontSize: 12 }}>
            {it.from} · {it.email}
          </Text>
          <Text variant="serif-body" style={{ fontSize: 13.5, lineHeight: 1.65, marginBottom: 22 }}>
            {it.snippet}
          </Text>
          {it.actions.length > 0 && (
            <Surface
              tier={1}
              radius="md"
              padding="md"
              style={{
                background: 'var(--accent-wash)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <Text variant="mono" tone="accent" style={{ fontSize: 10, letterSpacing: '0.14em' }}>
                Suggested · {Math.round(it.actions[0].confidence * 100)}% confident
              </Text>
              <Text
                variant="heading"
                style={{ fontSize: 16, lineHeight: 1.3, margin: '10px 0 16px' }}
              >
                {it.actions[0].title}
              </Text>
              <Row gap={3}>
                <button style={btnAccent}>✓ Accept</button>
                {it.hasDraft && <button style={btnGhost}>Open draft</button>}
                <button style={btnGhost}>Snooze</button>
              </Row>
            </Surface>
          )}
        </div>
      )}
    </>
  );
}
