import { Text } from '@compass/ui';

export function RecoverySection({
  note,
}: {
  note: { note: string; suggestBreak: boolean } | null | undefined;
}) {
  if (!note || !note.note) {
    return (
      <>
        <Text variant="mono" style={{ marginBottom: 10 }}>
          Recovery
        </Text>
        <Text variant="body" tone="muted" italic style={{ fontSize: 12, marginBottom: 24 }}>
          Connect Fitbit/Whoop to surface recovery and sleep insights.
        </Text>
      </>
    );
  }
  return (
    <>
      <Text variant="mono" style={{ marginBottom: 10 }}>
        Recovery
      </Text>
      <Text variant="serif-body" style={{ fontSize: 13, marginBottom: 24 }}>
        {note.note}
        {note.suggestBreak && ' (a short break would help)'}
      </Text>
    </>
  );
}
