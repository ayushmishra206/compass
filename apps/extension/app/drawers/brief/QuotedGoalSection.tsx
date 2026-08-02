import { Text } from '@compass/ui';

export function QuotedGoalSection({ goal }: { goal: string | null | undefined }) {
  if (!goal) {
    return (
      <>
        <Text variant="mono" style={{ marginBottom: 10 }}>
          Goal
        </Text>
        <Text variant="body" tone="muted" italic style={{ fontSize: 12, marginBottom: 24 }}>
          Set goals to anchor your day. Coming with the Goals drawer.
        </Text>
      </>
    );
  }
  return (
    <>
      <Text variant="mono" style={{ marginBottom: 10 }}>
        Goal
      </Text>
      <Text
        variant="serif-body"
        italic
        style={{
          fontSize: 14,
          borderLeft: '2px solid var(--accent-soft)',
          paddingLeft: 12,
          marginBottom: 24,
        }}
      >
        &ldquo;{goal}&rdquo;
      </Text>
    </>
  );
}
