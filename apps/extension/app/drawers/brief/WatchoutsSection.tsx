import type { CSSProperties } from 'react';

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-ink-3)',
  marginBottom: 10,
};
const itemStyle: CSSProperties = {
  fontSize: 13,
  color: 'var(--color-ink-2)',
  padding: '6px 0',
};

export function WatchoutsSection({ items }: { items: string[] | undefined }) {
  if (!items || items.length === 0) return null;
  return (
    <>
      <div style={labelStyle}>Watchouts</div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
        {items.map((w, i) => (
          <li key={i} style={itemStyle}>
            • {w}
          </li>
        ))}
      </ul>
    </>
  );
}
