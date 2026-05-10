import type { CSSProperties } from 'react';

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-ink-3)',
  marginBottom: 10,
};
const quoteStyle: CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontStyle: 'italic',
  fontSize: 14,
  color: 'var(--color-ink-2)',
  borderLeft: '2px solid var(--accent-soft)',
  paddingLeft: 12,
  marginBottom: 24,
};
const emptyStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--color-ink-3)',
  fontStyle: 'italic',
  marginBottom: 24,
};

export function QuotedGoalSection({ goal }: { goal: string | null | undefined }) {
  if (!goal) {
    return (
      <>
        <div style={labelStyle}>Goal</div>
        <p style={emptyStyle}>Set goals to anchor your day. Coming with the Goals drawer.</p>
      </>
    );
  }
  return (
    <>
      <div style={labelStyle}>Goal</div>
      <p style={quoteStyle}>&ldquo;{goal}&rdquo;</p>
    </>
  );
}
