import type { CSSProperties } from 'react';

interface EodOutput {
  wins?: string[];
  dropped?: string[];
  patterns?: string[];
  tomorrowOneThing?: string;
  journalPrompt?: string;
}

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
  padding: '4px 0',
};
const proseStyle: CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: 14,
  lineHeight: 1.55,
  color: 'var(--color-ink-2)',
  marginBottom: 18,
};

export function EodReflectionView({ output }: { output: EodOutput }) {
  return (
    <>
      {output.wins && output.wins.length > 0 && (
        <>
          <div style={labelStyle}>Wins</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 18px' }}>
            {output.wins.map((w, i) => (
              <li key={i} style={itemStyle}>
                • {w}
              </li>
            ))}
          </ul>
        </>
      )}
      {output.dropped && output.dropped.length > 0 && (
        <>
          <div style={labelStyle}>Dropped</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 18px' }}>
            {output.dropped.map((d, i) => (
              <li key={i} style={itemStyle}>
                • {d}
              </li>
            ))}
          </ul>
        </>
      )}
      {output.patterns && output.patterns.length > 0 && (
        <>
          <div style={labelStyle}>Patterns</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 18px' }}>
            {output.patterns.map((p, i) => (
              <li key={i} style={itemStyle}>
                • {p}
              </li>
            ))}
          </ul>
        </>
      )}
      {output.tomorrowOneThing && (
        <>
          <div style={labelStyle}>Tomorrow&apos;s one thing</div>
          <p style={proseStyle}>{output.tomorrowOneThing}</p>
        </>
      )}
      {output.journalPrompt && (
        <>
          <div style={labelStyle}>Reflect</div>
          <p style={proseStyle}>{output.journalPrompt}</p>
        </>
      )}
    </>
  );
}
