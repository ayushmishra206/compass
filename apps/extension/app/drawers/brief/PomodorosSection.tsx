import { Row, Text } from '@compass/ui';

interface Pomodoro {
  startLocal: string;
  endLocal: string;
  theme: string;
  taskId?: string;
}

export function PomodorosSection({ items }: { items: Pomodoro[] | undefined }) {
  if (!items || items.length === 0) {
    return (
      <>
        <Text variant="mono" style={{ marginBottom: 10 }}>
          Pomodoros
        </Text>
        <Text variant="body" tone="muted" italic style={{ fontSize: 12, marginBottom: 24 }}>
          Suggested focus blocks land with Calendar in Phase 4. For now, start a Pomodoro from Focus
          drawer to track time.
        </Text>
      </>
    );
  }
  return (
    <>
      <Text variant="mono" style={{ marginBottom: 10 }}>
        Pomodoros
      </Text>
      <div style={{ marginBottom: 24 }}>
        {items.map((p, i) => (
          <Row key={i} gap={3} align="center" style={{ padding: '10px 0' }}>
            <Text variant="mono" tone="secondary" style={{ width: 90 }}>
              {p.startLocal}–{p.endLocal}
            </Text>
            <Text variant="body" as="span" style={{ flex: 1, fontSize: 13 }}>
              {p.theme}
            </Text>
          </Row>
        ))}
      </div>
    </>
  );
}
