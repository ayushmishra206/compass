import { MOCK } from '../mocks/index.js';

export function GoalsDrawer() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {MOCK.goals.map((g) => (
        <div key={g.id}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--accent-soft)',
              }}
            >
              {g.horizon} · {g.weeksRemaining}w
            </span>
            <span
              style={{
                marginLeft: 'auto',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--color-ink-4)',
              }}
            >
              {Math.round(g.progress * 100)}%
            </span>
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              lineHeight: 1.2,
              margin: '0 0 10px',
              letterSpacing: '-0.02em',
            }}
          >
            {g.title}
          </h3>
          {g.why && (
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 13.5,
                lineHeight: 1.55,
                color: 'var(--color-ink-2)',
                fontStyle: 'italic',
                margin: '0 0 12px',
              }}
            >
              &ldquo;{g.why}&rdquo;
            </p>
          )}
          <div
            style={{
              background: 'var(--color-hair)',
              borderRadius: 2,
              overflow: 'hidden',
              height: 3,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'var(--accent)',
                borderRadius: 2,
                width: `${g.progress * 100}%`,
              }}
            />
          </div>
          {g.milestones.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                border: '1px solid var(--color-hair)',
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              {g.milestones.slice(0, 5).map((m) => {
                const current = 'current' in m && m.current === true;
                return (
                  <div
                    key={m.week}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '9px 12px',
                      background: current ? 'var(--accent-wash)' : 'rgba(255,255,255,0.03)',
                      borderBottom: '1px solid var(--color-hair)',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        color: 'var(--color-ink-4)',
                        flex: '0 0 50px',
                      }}
                    >
                      WK {m.week}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 12.5,
                        color: m.done && !current ? 'var(--color-ink-4)' : 'var(--color-ink-2)',
                        textDecoration: m.done && !current ? 'line-through' : 'none',
                      }}
                    >
                      {m.title}
                    </span>
                    {m.done && !current && <span style={{ color: 'var(--accent-soft)' }}>✓</span>}
                    {current && (
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 9,
                          padding: '2px 6px',
                          borderRadius: 3,
                          background: 'var(--accent-wash)',
                          color: 'var(--accent-soft)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.10em',
                        }}
                      >
                        now
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
