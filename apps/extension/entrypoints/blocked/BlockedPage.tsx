import { useState } from 'react';
import { Stack, Text } from '@compass/ui';

/**
 * Shown when a focus block rule intercepts a navigation.
 *
 * A hard block simply refuses. A soft block asks one question and lets the
 * user through if they still want to go — the point of a soft rule is to make
 * the choice conscious, not to win an argument with the person who set it.
 */

export interface BlockedPageProps {
  host: string;
  mode: 'hard' | 'soft';
  onBypass?: (reason: string) => void;
  onBack?: () => void;
}

const wrap = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
} as const;

const card = {
  maxWidth: 460,
  width: '100%',
  padding: 32,
  borderRadius: 16,
  background: 'var(--color-panel)',
  border: '1px solid var(--color-hair)',
} as const;

const btnGhost = {
  padding: '8px 14px',
  fontSize: 12,
  borderRadius: 999,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'inherit',
} as const;

const btnAccent = {
  ...btnGhost,
  background: 'var(--accent)',
  color: '#1a0e02',
  border: 0,
} as const;

const inputStyle = {
  width: '100%',
  padding: '9px 11px',
  fontSize: 13,
  borderRadius: 8,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'var(--color-ink)',
  boxSizing: 'border-box',
} as const;

export function BlockedPage({ host, mode, onBypass, onBack }: BlockedPageProps) {
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState('');

  return (
    <div style={wrap}>
      <div style={card}>
        <Stack gap={3}>
          <Text variant="mono" tone="accent">
            FOCUS BLOCK
          </Text>
          <Text variant="title" as="h1" style={{ fontSize: 26 }}>
            {host} is blocked right now.
          </Text>

          {mode === 'hard' ? (
            <Text variant="serif-body" style={{ fontSize: 14, lineHeight: 1.6 }}>
              You set this as a hard block. It stays shut until your focus session ends.
            </Text>
          ) : (
            <Text variant="serif-body" style={{ fontSize: 14, lineHeight: 1.6 }}>
              You asked Compass to stop you here during focus. You can still go through — it just
              won&rsquo;t be by accident.
            </Text>
          )}

          {mode === 'soft' && !asking && (
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="button" style={btnAccent} onClick={() => onBack?.()}>
                Back to work
              </button>
              <button type="button" style={btnGhost} onClick={() => setAsking(true)}>
                Let me through
              </button>
            </div>
          )}

          {mode === 'soft' && asking && (
            <Stack gap={2} style={{ marginTop: 4 }}>
              <Text variant="body" tone="muted" style={{ fontSize: 12.5 }}>
                What are you going there for?
              </Text>
              <input
                style={inputStyle}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="One line is enough"
                aria-label="Reason for bypassing the block"
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  style={btnGhost}
                  disabled={!reason.trim()}
                  onClick={() => onBypass?.(reason.trim())}
                >
                  Go anyway
                </button>
                <button type="button" style={btnAccent} onClick={() => onBack?.()}>
                  Never mind
                </button>
              </div>
            </Stack>
          )}

          {mode === 'hard' && (
            <div style={{ marginTop: 4 }}>
              <button type="button" style={btnAccent} onClick={() => onBack?.()}>
                Back to work
              </button>
            </div>
          )}
        </Stack>
      </div>
    </div>
  );
}
