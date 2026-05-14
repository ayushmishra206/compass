import type { CSSProperties } from 'react';
import { OverlayText, Row, Stack } from '@compass/ui';
import { useShell } from '../state/shell.js';
import { useScene } from '../scene/useScene.js';

// Sits above the ticker (which is the 80px bottom grid row in App.tsx) with
// breathing room. `bottom: 20` put the card directly under the
// Sleep/Recovery/RHR vitals and the layers z-fought; lifting to 96 (= 80px
// ticker + 16px gap) keeps the bottom-left aesthetic without overlapping
// the persistent vitals row.
const containerStyle: CSSProperties = {
  position: 'fixed',
  left: 20,
  bottom: 96,
  zIndex: 6,
  minWidth: 220,
  maxWidth: 280,
  padding: '12px 14px',
  borderRadius: 12,
  background: 'rgba(20, 18, 16, 0.55)',
  backdropFilter: 'blur(20px) saturate(140%)',
  WebkitBackdropFilter: 'blur(20px) saturate(140%)',
  border: '1px solid rgba(255,255,255,0.08)',
  animationDelay: '320ms',
};

const iconBtnStyle: CSSProperties = {
  width: 24,
  height: 24,
  display: 'grid',
  placeItems: 'center',
  borderRadius: 999,
  background: 'transparent',
  color: 'var(--color-ink-2)',
  border: 0,
  cursor: 'pointer',
  fontSize: 12,
};

const favoritedStyle: CSSProperties = {
  ...iconBtnStyle,
  color: 'var(--accent-soft)',
};

// Unsplash attribution requires the photographer name + a linkback to the
// photo's Unsplash page (or the photographer's profile), per their API terms.
// We render both as overlay text on the photo backdrop.
export function PhotoAttribution() {
  const scene = useScene();
  const skipScene = useShell((s) => s.skipScene);
  const toggleFavorite = useShell((s) => s.toggleFavoriteScene);
  const favorites = useShell((s) => s.favoriteScenes);

  if (!scene.sha256 || !scene.photographer) return null;

  const isFavorited = favorites.includes(scene.sha256);

  return (
    <Stack gap={1} className="compass-slideup" style={containerStyle}>
      <Row gap={2} align="center" justify="between">
        <OverlayText variant="mono" tone="accent">
          {scene.label}
        </OverlayText>
        <Row gap={1} align="center">
          <button
            type="button"
            style={isFavorited ? favoritedStyle : iconBtnStyle}
            onClick={() => toggleFavorite(scene.sha256!)}
            aria-label={isFavorited ? 'Unfavorite this photo' : 'Favorite this photo'}
            aria-pressed={isFavorited}
            title={isFavorited ? 'Unfavorite' : 'Favorite'}
          >
            {isFavorited ? '♥' : '♡'}
          </button>
          <button
            type="button"
            style={iconBtnStyle}
            onClick={() => skipScene()}
            aria-label="Skip to a different photo"
            title="Skip"
          >
            ↻
          </button>
        </Row>
      </Row>
      <OverlayText variant="serif-body" style={{ fontSize: 13, lineHeight: 1.4 }}>
        Photo by{' '}
        <a
          href={scene.attribution || 'https://unsplash.com'}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit', textDecoration: 'underline' }}
        >
          {scene.photographer}
        </a>{' '}
        on{' '}
        <a
          href="https://unsplash.com/?utm_source=compass&utm_medium=referral"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit', textDecoration: 'underline' }}
        >
          Unsplash
        </a>
      </OverlayText>
    </Stack>
  );
}
