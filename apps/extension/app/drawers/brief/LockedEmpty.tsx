import type { CSSProperties } from 'react';

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
  padding: '40px 20px',
  fontSize: 14,
  color: 'var(--color-ink-2)',
  textAlign: 'center',
};

export function LockedEmpty() {
  return (
    <div style={wrapStyle}>
      <span aria-hidden="true" style={{ fontSize: 24 }}>
        🔒
      </span>
      <p>Your daily brief is waiting. Unlock to generate.</p>
    </div>
  );
}
