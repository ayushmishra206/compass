import { Pill, Row, Stack, Text } from '@compass/ui';
import { MOCK } from '../mocks/index.js';

export function GoalsDrawer() {
  return (
    <Stack gap={5}>
      {MOCK.goals.map((g) => (
        <div key={g.id}>
          <Row gap={3} align="baseline" style={{ marginBottom: 6 }}>
            <Text variant="mono" tone="accent">
              {g.horizon} · {g.weeksRemaining}w
            </Text>
            <Text variant="mono" tone="dim" style={{ marginLeft: 'auto' }}>
              {Math.round(g.progress * 100)}%
            </Text>
          </Row>
          <Text
            variant="title"
            as="h3"
            style={{ fontSize: 22, lineHeight: 1.2, margin: '0 0 10px' }}
          >
            {g.title}
          </Text>
          {g.why && (
            <Text
              variant="serif-body"
              italic
              style={{ fontSize: 13.5, lineHeight: 1.55, margin: '0 0 12px' }}
            >
              &ldquo;{g.why}&rdquo;
            </Text>
          )}
          <div
            style={{
              background: 'var(--color-hair)',
              borderRadius: 2,
              overflow: 'hidden',
              height: 3,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'var(--accent)',
                borderRadius: 2,
                width: `${g.progress * 100}%`,
              }}
            />
          </div>
          {g.milestones.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                border: '1px solid var(--color-hair)',
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              {g.milestones.slice(0, 5).map((m) => {
                const current = 'current' in m && m.current === true;
                return (
                  <Row
                    key={m.week}
                    gap={3}
                    align="center"
                    style={{
                      padding: '9px 12px',
                      background: current ? 'var(--accent-wash)' : 'rgba(255,255,255,0.03)',
                      borderBottom: '1px solid var(--color-hair)',
                    }}
                  >
                    <Text variant="mono" tone="dim" style={{ flex: '0 0 50px' }}>
                      WK {m.week}
                    </Text>
                    <Text
                      variant="body"
                      as="span"
                      tone={m.done && !current ? 'dim' : 'secondary'}
                      style={{
                        flex: 1,
                        fontSize: 12.5,
                        textDecoration: m.done && !current ? 'line-through' : 'none',
                      }}
                    >
                      {m.title}
                    </Text>
                    {m.done && !current && (
                      <Text variant="body" as="span" tone="accent">
                        ✓
                      </Text>
                    )}
                    {current && <Pill tone="accent">now</Pill>}
                  </Row>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </Stack>
  );
}
