import type { CSSProperties } from 'react';
import { OverlayText, Row, Stack } from '@compass/ui';
import { useShell } from '../state/shell.js';
import { useScene } from '../scene/useScene.js';

/**
 * Photo credit, rendered in the flow of the ticker row rather than pinned over
 * the stage.
 *
 * It used to be `position: fixed; bottom: 96`. The shell grid is
 * `56px 1fr 80px` and the hero row is `align-items: end`, so hero content sits
 * at the *bottom* of its row — precisely where a card floating 96px up lives.
 * They overlapped structurally, at every window height; a viewport-height media
 * query only hid the symptom on small windows.
 *
 * In-flow means the layout engine keeps them apart instead of us guessing
 * offsets. Unsplash's API terms require the credit stay visible, so hiding it
 * behind a hover affordance was not an option.
 */
const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minWidth: 0,
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
        <OverlayText variant="mono" tone="accent" style={{ fontSize: 9 }}>
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
      <OverlayText variant="serif-body" style={{ fontSize: 11.5, lineHeight: 1.35 }}>
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
