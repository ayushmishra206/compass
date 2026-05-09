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
  animation: 'compass-ken 24s ease-in-out infinite alternate',
  transition: 'opacity 1200ms ease',
};

const veilStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:
    'radial-gradient(120% 80% at 30% 0%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 50%, rgba(8,6,4,0.85) 100%), linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)',
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
