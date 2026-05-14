import { Text } from '@compass/ui';

export function WatchoutsSection({ items }: { items: string[] | undefined }) {
  if (!items || items.length === 0) return null;
  return (
    <>
      <Text variant="mono" style={{ marginBottom: 10 }}>
        Watchouts
      </Text>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
        {items.map((w, i) => (
          <li
            key={i}
            style={{ display: 'flex', gap: 14, padding: '6px 0', alignItems: 'flex-start' }}
          >
            <Text variant="mono" tone="dim" style={{ flex: '0 0 18px', paddingTop: 3 }}>
              {String(i + 1).padStart(2, '0')}
            </Text>
            <Text
              variant="serif-body"
              tone="secondary"
              style={{ flex: 1, fontSize: 13, lineHeight: 1.55 }}
            >
              {w}
            </Text>
          </li>
        ))}
      </ul>
    </>
  );
}
