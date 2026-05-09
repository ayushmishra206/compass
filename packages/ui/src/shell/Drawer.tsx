import type { CSSProperties, ReactNode } from 'react';

export interface DrawerProps {
  open: boolean;
  /** kind is exposed for keying body cross-fade transitions */
  kind: string | null;
  title: string;
  meta?: string;
  onClose: () => void;
  /** When true, scrim click is a no-op and the close button is hidden. */
  dismissLocked?: boolean;
  children: ReactNode;
}

const scrimStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 30,
  background: 'rgba(0,0,0,0.4)',
  backdropFilter: 'blur(4px)',
  opacity: 0,
  pointerEvents: 'none',
  transition: 'opacity 240ms ease',
};

const scrimOpenStyle: CSSProperties = {
  opacity: 1,
  pointerEvents: 'auto',
};

const drawerStyle: CSSProperties = {
  position: 'fixed',
  top: 14,
  right: 14,
  bottom: 14,
  zIndex: 35,
  width: 'clamp(420px, 48vw, 640px)',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--glass-tint-2)',
  backdropFilter: 'var(--glass-2)',
  WebkitBackdropFilter: 'var(--glass-2)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 'var(--radius-lg)',
  transform: 'translateX(110%)',
  transition: 'transform 360ms cubic-bezier(.2,.8,.2,1)',
  overflow: 'hidden',
  boxShadow: 'var(--shadow-3)',
};

const drawerOpenStyle: CSSProperties = {
  transform: 'translateX(0)',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '18px 22px',
  borderBottom: '1px solid var(--color-hair)',
  flexShrink: 0,
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: 22,
  margin: 0,
  letterSpacing: '-0.02em',
};

const metaStyle: CSSProperties = {
  marginLeft: 'auto',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-ink-3)',
};

const bodyStyle: CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '18px 22px',
};

const closeBtnStyle: CSSProperties = {
  width: 28,
  height: 28,
  display: 'grid',
  placeItems: 'center',
  borderRadius: '50%',
  color: 'var(--color-ink-2)',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
};

export function Drawer({
  open,
  kind,
  title,
  meta,
  onClose,
  dismissLocked = false,
  children,
}: DrawerProps) {
  return (
    <>
      <div
        data-testid="drawer-scrim"
        className={open ? 'drawer-overlay on' : 'drawer-overlay'}
        style={open ? { ...scrimStyle, ...scrimOpenStyle } : scrimStyle}
        onClick={() => {
          if (!dismissLocked) onClose();
        }}
      />
      <aside
        className={open ? 'drawer on' : 'drawer'}
        style={open ? { ...drawerStyle, ...drawerOpenStyle } : drawerStyle}
        data-kind={kind ?? ''}
      >
        <div style={headerStyle}>
          <h2 style={titleStyle}>{title}</h2>
          {meta && <span style={metaStyle}>{meta}</span>}
          {!dismissLocked && (
            <button
              data-testid="drawer-close"
              aria-label="Close drawer"
              onClick={onClose}
              style={closeBtnStyle}
            >
              ×
            </button>
          )}
        </div>
        <div style={bodyStyle}>{children}</div>
      </aside>
    </>
  );
}
