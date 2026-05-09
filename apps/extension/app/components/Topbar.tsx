import type { CSSProperties } from 'react';
import { useShell } from '../state/shell.js';
import { useScene } from '../scene/useScene.js';

const TABS = [
  { id: 'brief', label: 'Brief' },
  { id: 'today', label: 'Today' },
  { id: 'goals', label: 'Goals' },
  { id: 'notes', label: 'Notes' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'focus', label: 'Focus' },
] as const;

const barStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '14px 28px',
  zIndex: 10,
};

const brandStyle: CSSProperties = { display: 'flex', alignItems: 'baseline', gap: 10 };
const markStyle: CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: '50%',
  background:
    'conic-gradient(from 200deg, var(--accent-soft), oklch(0.5 0.13 25), var(--accent-soft))',
  position: 'relative',
};
const nameStyle: CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: 18,
  fontStyle: 'italic',
  letterSpacing: '-0.01em',
};
const monoStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-ink-3)',
};
const navStyle: CSSProperties = { display: 'flex', gap: 2, marginLeft: 20 };
const pillStyle: CSSProperties = {
  padding: '6px 12px',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--color-ink-3)',
  borderRadius: 999,
  transition: 'color 120ms',
};
const rightStyle: CSSProperties = {
  marginLeft: 'auto',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};
const cmdkBtnStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  height: 32,
  padding: '0 12px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.08)',
  width: 240,
  color: 'var(--color-ink-3)',
  fontSize: 12,
};
const kbdStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  padding: '1px 5px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 3,
};
const avatarStyle: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, var(--accent-soft), oklch(0.5 0.13 25))',
  display: 'grid',
  placeItems: 'center',
  color: '#1a0e02',
  fontSize: 10,
  fontWeight: 600,
  cursor: 'pointer',
};

export function Topbar({ initials = 'AY' }: { initials?: string }) {
  const navClick = useShell((s) => s.navClick);
  const cmdkHotkey = useShell((s) => s.cmdkHotkey);
  const avatarClick = useShell((s) => s.avatarClick);
  const scene = useScene();

  return (
    <header style={barStyle}>
      <div style={brandStyle}>
        <div style={markStyle} aria-hidden />
        <div style={nameStyle}>Compass</div>
        <div style={{ ...monoStyle, marginLeft: 14 }}>{scene.label}</div>
      </div>
      <nav style={navStyle}>
        {TABS.map((t) => (
          <button key={t.id} style={pillStyle} onClick={() => navClick(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <div style={rightStyle}>
        {useShell((s) => s.encryptionEnabled && s.locked) && (
          <button
            type="button"
            aria-label="Credentials locked. Click to unlock."
            onClick={() => useShell.getState().requestUnlock()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 999,
              border: '1px solid var(--accent-soft)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--color-ink-2)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            <span aria-hidden="true">🔒</span> Locked
          </button>
        )}
        <button style={cmdkBtnStyle} onClick={cmdkHotkey} aria-label="Open command palette">
          <span style={{ flex: 1, textAlign: 'left' }}>Ask Compass…</span>
          <span style={kbdStyle}>⌘K</span>
        </button>
        <button style={avatarStyle} onClick={avatarClick} aria-label="Profile">
          {initials}
        </button>
      </div>
    </header>
  );
}
