import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Pill, Row, Stack, Text } from '@compass/ui';
import { rpc } from '@compass/runtime';
import { SOUNDSCAPES, startSoundscape, type SoundscapeHandle } from '../lib/soundscapes.js';
import { useBlockRules } from '../hooks/useBlockRules.js';

const DURATION_MIN = 25;
const DURATION_SEC = DURATION_MIN * 60;

const btnAccent: CSSProperties = {
  padding: '8px 14px',
  fontSize: 12,
  borderRadius: 999,
  background: 'var(--accent)',
  color: '#1a0e02',
  border: 0,
};
const btnGhost: CSSProperties = {
  padding: '8px 14px',
  fontSize: 12,
  borderRadius: 999,
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--color-ink)',
  border: '1px solid rgba(255,255,255,0.08)',
};

const themeInputStyle: CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 12,
  fontFamily: 'var(--font-serif)',
  borderRadius: 6,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'var(--color-ink)',
  marginBottom: 12,
  boxSizing: 'border-box',
};

const soundscapeBtnStyle = (active: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '9px 12px',
  borderRadius: 8,
  border: active ? '1px solid var(--accent)' : '1px solid var(--color-hair)',
  textAlign: 'left',
  background: active ? 'var(--accent-wash)' : 'transparent',
  color: 'var(--color-ink)',
});

const smallInput: CSSProperties = {
  flex: 1,
  padding: '7px 9px',
  fontSize: 12,
  borderRadius: 6,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'var(--color-ink)',
  boxSizing: 'border-box',
};

export function FocusDrawer() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [theme, setTheme] = useState('');
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(DURATION_SEC);
  const [soundscapeId, setSoundscapeId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const soundRef = useRef<SoundscapeHandle | null>(null);

  const isActive = activeId !== null;
  const { rules, add, toggle, remove } = useBlockRules(isActive);

  const [newPattern, setNewPattern] = useState('');
  const [ruleError, setRuleError] = useState<string | null>(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [running]);

  // Audio follows the timer, not the selection: picking a soundscape while
  // idle should preview nothing, and pausing should not leave sound running.
  useEffect(() => {
    if (running && soundscapeId && !soundRef.current) {
      soundRef.current = startSoundscape(soundscapeId);
    }
    if ((!running || !soundscapeId) && soundRef.current) {
      soundRef.current.stop();
      soundRef.current = null;
    }
  }, [running, soundscapeId]);

  useEffect(() => () => soundRef.current?.stop(), []);

  useEffect(() => {
    if (!running || seconds > 0) return;
    const id = activeIdRef.current;
    setRunning(false);
    setActiveId(null);
    activeIdRef.current = null;
    setSeconds(DURATION_SEC);
    if (id) {
      rpc('pomodoro.complete', { id }).catch(() => {
        /* fire-and-forget */
      });
    }
  }, [running, seconds]);

  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;

  const startPomo = async () => {
    const id = crypto.randomUUID();
    await rpc('pomodoro.start', {
      id,
      durationMin: DURATION_MIN,
      theme: theme || undefined,
      soundscapeId,
    });
    activeIdRef.current = id;
    setActiveId(id);
    setSeconds(DURATION_SEC);
    setRunning(true);
  };

  const onAbandon = async () => {
    const id = activeIdRef.current;
    setRunning(false);
    setActiveId(null);
    activeIdRef.current = null;
    setSeconds(DURATION_SEC);
    if (id) await rpc('pomodoro.abandon', { id });
  };

  const onAddRule = async () => {
    const err = await add(newPattern, 'soft', true);
    setRuleError(err);
    if (!err) setNewPattern('');
  };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}
    >
      <Text variant="mono" tone="accent" style={{ marginBottom: 14, letterSpacing: '0.14em' }}>
        ● {DURATION_MIN}-min Pomodoro{theme ? ` · ${theme}` : ''}
      </Text>
      <Text
        variant="display"
        as="span"
        style={{
          fontSize: 120,
          lineHeight: 1,
          fontStyle: 'normal',
          fontWeight: 300,
          letterSpacing: '-0.04em',
          fontVariantNumeric: 'tabular-nums',
          margin: '4px 0 24px',
        }}
      >
        {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
      </Text>

      {!isActive && (
        <input
          type="text"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="What are you working on?"
          aria-label="Pomodoro theme"
          style={themeInputStyle}
        />
      )}

      <Row gap={2} style={{ marginBottom: 32 }}>
        {!isActive ? (
          <button onClick={startPomo} style={btnAccent}>
            ▶ Start
          </button>
        ) : (
          <>
            <button onClick={() => setRunning((r) => !r)} style={btnAccent}>
              {running ? '❚❚ Pause' : '▶ Resume'}
            </button>
            <button onClick={onAbandon} style={btnGhost}>
              Stop
            </button>
          </>
        )}
      </Row>

      <Stack gap={3} style={{ width: '100%' }}>
        <Text variant="mono">Soundscape</Text>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {SOUNDSCAPES.map((s) => {
            const active = soundscapeId === s.id;
            return (
              <button
                key={s.id}
                aria-pressed={active}
                style={soundscapeBtnStyle(active)}
                onClick={() => setSoundscapeId(active ? null : s.id)}
              >
                <Stack gap={1} style={{ flex: 1 }}>
                  <Text variant="body" as="span" style={{ fontSize: 12 }}>
                    {s.name}
                  </Text>
                  <Text variant="body" as="span" tone="dim" style={{ fontSize: 10.5 }}>
                    {s.description}
                  </Text>
                </Stack>
                {active && (
                  <Text variant="body" as="span" tone="accent">
                    ♪
                  </Text>
                )}
              </button>
            );
          })}
        </div>
        {soundscapeId && !running && (
          <Text variant="body" tone="dim" style={{ fontSize: 11 }}>
            Starts with your next session.
          </Text>
        )}
      </Stack>

      <Stack gap={3} style={{ width: '100%', marginTop: 24 }}>
        <Text variant="mono">Blocked during focus</Text>

        <Row gap={2} align="center">
          <input
            style={smallInput}
            value={newPattern}
            onChange={(e) => setNewPattern(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void onAddRule();
            }}
            placeholder="reddit.com"
            aria-label="Site to block during focus"
          />
          <button style={btnGhost} onClick={() => void onAddRule()} disabled={!newPattern.trim()}>
            Block
          </button>
        </Row>
        {ruleError && (
          <Text variant="body" tone="dim" style={{ fontSize: 11 }}>
            {ruleError}
          </Text>
        )}

        {rules.length === 0 ? (
          <Text variant="body" tone="muted" style={{ fontSize: 12 }}>
            Nothing blocked yet. Add a site and it will be unreachable while a session runs.
          </Text>
        ) : (
          <Stack gap={2}>
            {rules.map((r) => (
              <Row
                key={r.id}
                gap={3}
                align="center"
                style={{
                  padding: '7px 10px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 6,
                }}
              >
                <Pill tone={r.mode === 'hard' ? 'red' : 'accent'}>{r.mode}</Pill>
                <Text
                  variant="body"
                  as="span"
                  tone={r.enabled ? 'secondary' : 'dim'}
                  style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 11 }}
                >
                  {r.pattern}
                </Text>
                {r.strikes > 0 && (
                  <Text variant="mono" tone="dim" as="span" style={{ fontSize: 9 }}>
                    {r.strikes}× through
                  </Text>
                )}
                <button
                  style={{ ...btnGhost, padding: '4px 9px', fontSize: 11 }}
                  aria-label={`${r.enabled ? 'Disable' : 'Enable'} block for ${r.pattern}`}
                  onClick={() => void toggle(r.id, !r.enabled)}
                >
                  {r.enabled ? 'On' : 'Off'}
                </button>
                <button
                  style={{ ...btnGhost, padding: '4px 9px', fontSize: 11 }}
                  aria-label={`Remove block for ${r.pattern}`}
                  onClick={() => void remove(r.id)}
                >
                  ✕
                </button>
              </Row>
            ))}
          </Stack>
        )}
      </Stack>
    </div>
  );
}
