import { MOCK } from '../mocks/index.js';

const START_H = 8;
const END_H = 19;
const HOUR_PX = 38;

function toY(hhmm: string): number {
  const parts = hhmm.split(':').map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return (h - START_H + m / 60) * HOUR_PX;
}

function nowHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function TodayDrawer() {
  const H = END_H - START_H;
  const now = new Date();
  return (
    <div style={{ position: 'relative', paddingLeft: 60, height: H * HOUR_PX + 16 }}>
      {Array.from({ length: H + 1 }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 60,
            right: 0,
            top: i * HOUR_PX,
            borderTop: i === 0 ? 'none' : '1px dashed var(--color-hair)',
            height: 1,
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: -50,
              top: -7,
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--color-ink-4)',
            }}
          >
            {((START_H + i + 11) % 12) + 1} {START_H + i < 12 ? 'am' : 'pm'}
          </span>
        </div>
      ))}
      <div
        style={{
          position: 'absolute',
          left: 60,
          right: 0,
          top: toY(nowHHMM(now)),
          borderTop: '1.5px solid var(--accent-soft)',
          zIndex: 2,
        }}
      >
        <span
          style={{
            position: 'absolute',
            right: 8,
            top: -14,
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--accent-soft)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          now
        </span>
      </div>
      {MOCK.events.map((ev) => {
        const top = toY(ev.start);
        const height = toY(ev.end) - top;
        const isFocus = 'focus' in ev && ev.focus;
        return (
          <div
            key={ev.id}
            style={{
              position: 'absolute',
              left: 0,
              right: 8,
              top,
              height,
              padding: '5px 10px',
              borderRadius: 6,
              background: isFocus ? 'var(--accent-wash)' : 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              fontSize: 11.5,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                flex: '0 0 auto',
                fontSize: 9,
                color: 'var(--color-ink-3)',
              }}
            >
              {ev.start}
            </span>
            <span
              style={{
                flex: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {ev.summary}
            </span>
            {'prep' in ev && ev.prep && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  padding: '2px 6px',
                  borderRadius: 3,
                  background: 'var(--accent-wash)',
                  color: 'var(--accent-soft)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.10em',
                }}
              >
                prep
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
