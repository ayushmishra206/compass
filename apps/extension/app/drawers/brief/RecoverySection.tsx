import type { CSSProperties } from 'react';

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-ink-3)',
  marginBottom: 10,
};
const noteStyle: CSSProperties = {
  fontSize: 13,
  color: 'var(--color-ink-2)',
  marginBottom: 24,
};
const emptyStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--color-ink-3)',
  fontStyle: 'italic',
  marginBottom: 24,
};

export function RecoverySection({
  note,
}: {
  note: { note: string; suggestBreak: boolean } | null | undefined;
}) {
  if (!note || !note.note) {
    return (
      <>
        <div style={labelStyle}>Recovery</div>
        <p style={emptyStyle}>Connect Fitbit/Whoop to surface recovery and sleep insights.</p>
      </>
    );
  }
  return (
    <>
      <div style={labelStyle}>Recovery</div>
      <p style={noteStyle}>
        {note.note}
        {note.suggestBreak && ' (a short break would help)'}
      </p>
    </>
  );
}
