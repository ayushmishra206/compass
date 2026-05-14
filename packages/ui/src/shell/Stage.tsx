import type { CSSProperties } from 'react';

export interface StageProps {
  /** Blob URL or absolute URL of the current scene image. null = solid bg only. */
  imageUrl: string | null;
}

const grainBg =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.5'/></svg>";

const stageStyle: CSSProperties = { position: 'fixed', inset: 0, zIndex: 0 };

const imgStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  transform: 'scale(1.05)',
  // 24s symmetric keyframe (zoom in for first half, zoom out for second).
  // Drop `alternate` because the keyframe itself loops back to its start,
  // so plain `infinite` produces a seamless zoom-in/zoom-out cycle.
  animation: 'compass-ken 24s ease-in-out infinite',
  transition: 'opacity 1200ms ease',
};

const veilStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  // Layered scrim that guarantees readable contrast for the topbar (top ~80px),
  // hero/ticker (bottom ~30%), and brief card (right side) regardless of which
  // Unsplash photo lands behind. Without these explicit dark bands the design
  // depended on the photo itself being uniformly dark; bright shots like
  // open-water "ocean" scenes left small UI text sub-2:1 against the photo.
  background: [
    // Top scrim for the topbar
    'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.45) 6%, rgba(0,0,0,0) 14%)',
    // Bottom scrim for hero text + ticker
    'linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.65) 12%, rgba(0,0,0,0.3) 32%, rgba(0,0,0,0) 50%)',
    // Right-side scrim under the brief card area
    'linear-gradient(270deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 28%, rgba(0,0,0,0) 50%)',
    // Soft ambient darkening across the full image so mid-tones don't clash
    'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.18) 100%)',
  ].join(', '),
};

const grainStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  opacity: 0.06,
  mixBlendMode: 'overlay',
  backgroundImage: `url("${grainBg}")`,
};

export function Stage({ imageUrl }: StageProps) {
  return (
    <div style={stageStyle}>
      {imageUrl !== null && (
        <div
          className="stage-img"
          key={imageUrl}
          style={{ ...imgStyle, backgroundImage: `url("${imageUrl}")` }}
        />
      )}
      <div className="stage-veil" style={veilStyle} />
      <div className="stage-grain" style={grainStyle} />
    </div>
  );
}
