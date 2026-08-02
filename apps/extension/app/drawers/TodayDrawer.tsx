import { Pill, Stack, Text } from '@compass/ui';
import { useCalendar } from '../hooks/useCalendar.js';

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

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <Stack gap={2} style={{ padding: '32px 8px', textAlign: 'center' }}>
      <Text variant="heading">{title}</Text>
      <Text variant="body" tone="muted" style={{ maxWidth: 320, margin: '0 auto' }}>
        {body}
      </Text>
    </Stack>
  );
}

export function TodayDrawer() {
  const H = END_H - START_H;
  const now = new Date();
  const { state } = useCalendar();

  if (state.kind === 'loading') {
    return <Empty title="Loading your day…" body="Reading today's calendar." />;
  }
  if (state.kind === 'not-connected') {
    return (
      <Empty
        title="No calendar connected"
        body="Connect Google Calendar in Profile to see your day here and to ground the morning brief in real meetings."
      />
    );
  }
  if (state.kind === 'error') {
    return <Empty title="Couldn't load your day" body={state.message} />;
  }

  const timed = state.events.filter((e) => !e.allDay);
  const allDay = state.events.filter((e) => e.allDay);

  if (state.events.length === 0) {
    return (
      <Empty
        title="Nothing scheduled"
        body="Your calendar is clear today. A good day for deep work."
      />
    );
  }

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
          <Text
            variant="mono"
            tone="dim"
            as="span"
            style={{
              position: 'absolute',
              left: -50,
              top: -7,
              fontSize: 9,
              letterSpacing: '0.08em',
            }}
          >
            {((START_H + i + 11) % 12) + 1} {START_H + i < 12 ? 'am' : 'pm'}
          </Text>
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
        <Text
          variant="mono"
          tone="accent"
          as="span"
          style={{ position: 'absolute', right: 8, top: -14, fontSize: 9 }}
        >
          now
        </Text>
      </div>
      {timed.map((ev) => {
        const top = toY(ev.start);
        // Sub-30-minute events would otherwise render as an unreadable sliver.
        const height = Math.max(toY(ev.end) - top, 18);
        const isFocus = ev.isFocusBlock;
        return (
          // Event bars start at left: 60 to align with the hour-line gutter so
          // the mono hour labels (positioned at left: -50 from each line) stay
          // readable instead of being overprinted by the event background.
          <div
            key={ev.id}
            style={{
              position: 'absolute',
              left: 60,
              right: 8,
              top,
              height,
              padding: '5px 10px',
              borderRadius: 6,
              background: isFocus ? 'var(--accent-wash)' : 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              overflow: 'hidden',
            }}
          >
            <Text variant="mono" tone="muted" as="span" style={{ flex: '0 0 auto', fontSize: 9 }}>
              {ev.start}
            </Text>
            <Text
              variant="body"
              as="span"
              style={{
                flex: 1,
                fontSize: 11.5,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {ev.summary}
            </Text>
            {ev.hasConference && <Pill tone="accent">meet</Pill>}
          </div>
        );
      })}
      {allDay.length > 0 && (
        <Stack gap={1} style={{ position: 'absolute', left: 60, right: 8, top: -4 }}>
          {allDay.map((ev) => (
            <Text key={ev.id} variant="mono" tone="muted" as="div" style={{ fontSize: 9 }}>
              all day · {ev.summary}
            </Text>
          ))}
        </Stack>
      )}
    </div>
  );
}
