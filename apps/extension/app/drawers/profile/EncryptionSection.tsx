import type { CSSProperties } from 'react';

const sectionLabelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-ink-3)',
  marginBottom: 10,
};
const sectionWrap: CSSProperties = {
  marginBottom: 26,
  paddingBottom: 18,
  borderBottom: '1px solid var(--color-hair)',
};

export function EncryptionSection() {
  return (
    <div style={sectionWrap}>
      <div style={sectionLabelStyle}>Encryption</div>
      <div style={{ fontSize: 12, color: 'var(--color-ink-3)', fontStyle: 'italic' }}>
        Wired in Task 17.
      </div>
    </div>
  );
}
