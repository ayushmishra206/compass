import { MOCK } from '../mocks/index.js';

export function BriefDrawer() {
  const b = MOCK.brief;
  return (
    <>
      <p
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 17,
          lineHeight: 1.55,
          color: 'var(--color-ink-2)',
          margin: '0 0 22px',
        }}
      >
        {b.tldr}
      </p>

      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--color-ink-3)',
          marginBottom: 10,
        }}
      >
        Pomodoros
      </div>
      <div style={{ marginBottom: 24 }}>
        {b.pomodoros.map((p, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              padding: '10px 0',
              gap: 14,
              fontSize: 13,
              alignItems: 'center',
              borderBottom: i < b.pomodoros.length - 1 ? '1px solid var(--color-hair)' : 'none',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                width: 90,
                color: 'var(--color-ink-2)',
              }}
            >
              {p.startLocal}–{p.endLocal}
            </span>
            <span style={{ flex: 1 }}>{p.theme}</span>
            <button
              style={{
                padding: '4px 10px',
                fontSize: 10,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 999,
                color: 'var(--color-ink)',
              }}
            >
              ▶ Start
            </button>
          </div>
        ))}
      </div>

      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--color-ink-3)',
          marginBottom: 10,
        }}
      >
        Watchouts
      </div>
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {b.watchouts.map((w, i) => (
          <li
            key={i}
            style={{
              fontSize: 13,
              color: 'var(--color-ink-2)',
              display: 'flex',
              gap: 12,
              lineHeight: 1.55,
              fontFamily: 'var(--font-serif)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                flex: '0 0 18px',
                color: 'var(--color-ink-4)',
                paddingTop: 3,
              }}
            >
              0{i + 1}
            </span>
            <span>{w}</span>
          </li>
        ))}
      </ul>

      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--color-ink-3)',
          marginTop: 30,
          marginBottom: 10,
        }}
      >
        Recovery note
      </div>
      <p
        style={{
          fontSize: 13,
          lineHeight: 1.6,
          color: 'var(--color-ink-2)',
          margin: 0,
          fontFamily: 'var(--font-serif)',
        }}
      >
        {b.recovery.note}
      </p>
    </>
  );
}
