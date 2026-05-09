import { useState, type CSSProperties } from 'react';
import { MOCK } from '../mocks/index.js';

const listRowStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: '12px 0',
  borderBottom: '1px solid var(--color-hair)',
  cursor: 'pointer',
};
const monoStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-ink-3)',
};

export function NotesDrawer() {
  const [sel, setSel] = useState<string | null>(null);

  if (sel) {
    const n = MOCK.notes.find((x) => x.id === sel);
    if (!n) return null;
    return (
      <>
        <button
          style={{
            marginBottom: 16,
            padding: '6px 12px',
            fontSize: 11,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 999,
            color: 'var(--color-ink)',
          }}
          onClick={() => setSel(null)}
        >
          ← All notes
        </button>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 28,
            margin: '0 0 6px',
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
          }}
        >
          {n.title}
        </h2>
        <div style={{ ...monoStyle, marginBottom: 18 }}>
          {n.tags.join(' · ')} · {n.updated}
        </div>
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 14.5,
            lineHeight: 1.65,
            color: 'var(--color-ink-2)',
          }}
        >
          {n.excerpt}
        </p>
        {n.related.length > 0 && (
          <>
            <div style={{ ...monoStyle, marginTop: 24, marginBottom: 10 }}>
              Related · cosine sim
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {n.related.map((r) => {
                const target = MOCK.notes.find((x) => x.id === r.id);
                if (!target) return null;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSel(r.id)}
                    style={{
                      textAlign: 'left',
                      padding: '12px 14px',
                      border: '1px solid var(--color-hair)',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.03)',
                      color: 'var(--color-ink)',
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{target.title}</span>
                      <span style={monoStyle}>{r.sim.toFixed(2)}</span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--color-ink-3)',
                        fontStyle: 'italic',
                      }}
                    >
                      &ldquo;{r.reason}&rdquo;
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <div>
      {MOCK.notes.map((n) => (
        <div key={n.id} style={listRowStyle} onClick={() => setSel(n.id)}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 13.5, fontWeight: 500, flex: 1 }}>{n.title}</span>
            <span style={{ ...monoStyle, color: 'var(--color-ink-4)' }}>{n.updated}</span>
          </div>
          <div
            style={{
              color: 'var(--color-ink-3)',
              fontSize: 12,
              lineHeight: 1.5,
              maxHeight: '3em',
              overflow: 'hidden',
            }}
          >
            {n.excerpt}
          </div>
          {n.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
              {n.tags.map((t) => (
                <span
                  key={t}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    padding: '2px 6px',
                    borderRadius: 3,
                    background: 'rgba(255,255,255,0.06)',
                    color: 'var(--color-ink-3)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.10em',
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
