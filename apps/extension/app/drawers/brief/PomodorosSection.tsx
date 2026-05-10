import type { CSSProperties } from 'react';

interface Pomodoro {
  startLocal: string;
  endLocal: string;
  theme: string;
  taskId?: string;
}

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-ink-3)',
  marginBottom: 10,
};
const rowStyle: CSSProperties = {
  display: 'flex',
  padding: '10px 0',
  gap: 14,
  fontSize: 13,
  alignItems: 'center',
};
const emptyStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--color-ink-3)',
  fontStyle: 'italic',
  marginBottom: 24,
};

export function PomodorosSection({ items }: { items: Pomodoro[] | undefined }) {
  if (!items || items.length === 0) {
    return (
      <>
        <div style={labelStyle}>Pomodoros</div>
        <p style={emptyStyle}>
          Suggested focus blocks land with Calendar in Phase 4. For now, start a Pomodoro from Focus
          drawer to track time.
        </p>
      </>
    );
  }
  return (
    <>
      <div style={labelStyle}>Pomodoros</div>
      <div style={{ marginBottom: 24 }}>
        {items.map((p, i) => (
          <div key={i} style={rowStyle}>
            <span>
              {p.startLocal} – {p.endLocal}
            </span>
            <span>{p.theme}</span>
          </div>
        ))}
      </div>
    </>
  );
}
