import type { CSSProperties } from 'react';
import { OverlayText, Pill } from '@compass/ui';
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
// Brand wordmark uses italic serif at 18px; keeps its bespoke shape but
// inherits OverlayText's canonical text-shadow recipe.
const brandNameStyle: CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: 18,
  fontStyle: 'italic',
  letterSpacing: '-0.01em',
};

// Nav buttons are bare mono-uppercase text labels with a subtle hover,
// not chip-shaped pills. The canonical mock uses unstyled <button> tags
// inheriting topbar font; we keep mono uppercase for compactness but drop
// the background + border so the row reads as a series of labels rather
// than a row of chunky chips.
const navStyle: CSSProperties = { display: 'flex', gap: 6, marginLeft: 20 };
const navBtnStyle: CSSProperties = {
  padding: '6px 8px',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--color-ink-2)',
  textShadow: 'var(--shadow-overlay-text)',
  background: 'transparent',
  border: 0,
  borderRadius: 4,
  cursor: 'pointer',
  transition: 'color 120ms, background 120ms',
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
  const encryptionEnabled = useShell((s) => s.encryptionEnabled);
  const locked = useShell((s) => s.locked);
  const scene = useScene();

  return (
    <header style={barStyle} className="compass-slideup">
      <div style={brandStyle}>
        <div style={markStyle} aria-hidden />
        <OverlayText as="span" style={brandNameStyle}>
          Compass
        </OverlayText>
        <OverlayText
          variant="mono"
          tone="secondary"
          style={{ marginLeft: 14, fontSize: 11, letterSpacing: '0.14em' }}
        >
          {scene.label}
        </OverlayText>
      </div>
      <nav style={navStyle}>
        {TABS.map((t) => (
          <button key={t.id} style={navBtnStyle} onClick={() => navClick(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <div style={rightStyle}>
        {encryptionEnabled && locked && (
          <Pill
            tone="accent"
            size="md"
            aria-label="Credentials locked. Click to unlock."
            onClick={() => useShell.getState().requestUnlock()}
            leading={<span aria-hidden="true">🔒</span>}
          >
            Locked
          </Pill>
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
