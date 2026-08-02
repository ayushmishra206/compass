import { Text } from '@compass/ui';

export function BriefTLDR({ text, mood }: { text: string; mood?: string }) {
  return (
    <>
      {mood && (
        <Text variant="mono" tone="accent" style={{ marginBottom: 6 }}>
          {mood}
        </Text>
      )}
      <Text variant="serif-body" style={{ fontSize: 17, lineHeight: 1.55, margin: '0 0 22px' }}>
        {text}
      </Text>
    </>
  );
}
