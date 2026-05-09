import { useState } from 'react';
import { MOCK } from '../mocks/index.js';

export function InboxDrawer() {
  const firstWithAction = MOCK.inboxActions.find((a) => a.actions.length > 0)?.id ?? '';
  const [sel, setSel] = useState<string>(firstWithAction);
  const it = MOCK.inboxActions.find((a) => a.id === sel);

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 20 }}>
        {MOCK.inboxActions.map((a) => (
          <button
            key={a.id}
            onClick={() => setSel(a.id)}
            style={{
              textAlign: 'left',
              padding: '10px 12px',
              borderRadius: 8,
              background: sel === a.id ? 'rgba(255,255,255,0.06)' : 'transparent',
              marginBottom: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              color: 'var(--color-ink)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  padding: '2px 6px',
                  borderRadius: 3,
                  background: 'rgba(220,80,60,0.18)',
                  color: 'oklch(0.82 0.13 30)',
                  border: '1px solid rgba(220,80,60,0.25)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.10em',
                }}
              >
                {a.priority.toUpperCase()}
              </span>
              <span
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
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--color-ink-4)',
                }}
              >
                {a.received}
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--color-ink-2)',
                paddingLeft: 30,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {a.subject}
            </div>
          </button>
        ))}
      </div>
      {it && (
        <div style={{ borderTop: '1px solid var(--color-hair)', paddingTop: 18 }}>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              margin: '0 0 4px',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            {it.subject}
          </h2>
          <div style={{ marginBottom: 14, fontSize: 12, color: 'var(--color-ink-3)' }}>
            {it.from} · {it.email}
          </div>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 13.5,
              lineHeight: 1.65,
              color: 'var(--color-ink-2)',
              margin: '0 0 18px',
            }}
          >
            {it.snippet}
          </p>
          {it.actions.length > 0 && (
            <div
              style={{
                padding: '14px 16px',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12,
                background: 'var(--accent-wash)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--accent-soft)',
                  marginBottom: 8,
                }}
              >
                Suggested · {Math.round(it.actions[0].confidence * 100)}% confident
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 16,
                  lineHeight: 1.3,
                  marginBottom: 12,
                }}
              >
                {it.actions[0].title}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  style={{
                    padding: '6px 12px',
                    fontSize: 11,
                    borderRadius: 999,
                    background: 'var(--accent)',
                    color: '#1a0e02',
                    border: 0,
                  }}
                >
                  ✓ Accept
                </button>
                {it.hasDraft && (
                  <button
                    style={{
                      padding: '6px 12px',
                      fontSize: 11,
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--color-ink)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    Open draft
                  </button>
                )}
                <button
                  style={{
                    padding: '6px 12px',
                    fontSize: 11,
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.06)',
                    color: 'var(--color-ink)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  Snooze
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
