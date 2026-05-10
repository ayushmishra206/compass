import type { CSSProperties } from 'react';

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
  padding: '40px 20px',
  fontSize: 13,
  color: 'var(--color-ink-3)',
  textAlign: 'center',
};
const btnStyle: CSSProperties = {
  background: 'var(--accent-wash)',
  border: '1px solid var(--accent-soft)',
  color: 'var(--color-ink)',
  borderRadius: 6,
  padding: '6px 12px',
  fontSize: 12,
  cursor: 'pointer',
};

export function ErrorEmpty({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={wrapStyle}>
      <p>Couldn&apos;t generate your brief.</p>
      <p style={{ fontSize: 11, opacity: 0.7 }}>{message}</p>
      <button type="button" style={btnStyle} onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
