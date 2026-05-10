import type { CSSProperties } from 'react';

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  padding: '40px 20px',
  fontSize: 14,
  color: 'var(--color-ink-3)',
  textAlign: 'center',
};

export function TooEarlyEmpty({ readyAt }: { readyAt: string }) {
  const hour = new Date(readyAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return (
    <div style={wrapStyle}>
      <p>Your morning brief will be ready at {hour}.</p>
    </div>
  );
}
