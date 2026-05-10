import type { CSSProperties } from 'react';

const tldrStyle: CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: 17,
  lineHeight: 1.55,
  color: 'var(--color-ink-2)',
  margin: '0 0 22px',
};
const moodStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--accent-soft)',
  marginBottom: 6,
};

export function BriefTLDR({ text, mood }: { text: string; mood?: string }) {
  return (
    <>
      {mood && <div style={moodStyle}>{mood}</div>}
      <p style={tldrStyle}>{text}</p>
    </>
  );
}
