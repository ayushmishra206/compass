import { useEffect, useRef, useState } from 'react';
import { rpc } from '@compass/runtime';
import { MOCK } from '../mocks/index.js';

const DURATION_MIN = 25;
const DURATION_SEC = DURATION_MIN * 60;

export function FocusDrawer() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [theme, setTheme] = useState('');
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(DURATION_SEC);
  // Ref mirror of activeId so async callbacks don't close over stale state
  const activeIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // Countdown tick
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [running]);

  // Auto-complete when countdown reaches zero
  useEffect(() => {
    if (!running || seconds > 0) return;
    // Countdown ended naturally
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
    await rpc('pomodoro.start', { id, durationMin: DURATION_MIN, theme: theme || undefined });
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
    if (id) {
      await rpc('pomodoro.abandon', { id });
    }
  };

  const isActive = activeId !== null;

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--accent-soft)',
          marginBottom: 14,
        }}
      >
        ● {DURATION_MIN}-min Pomodoro{theme ? ` · ${theme}` : ''}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 120,
          lineHeight: 1,
          fontWeight: 300,
          letterSpacing: '-0.04em',
          fontVariantNumeric: 'tabular-nums',
          margin: '4px 0 24px',
        }}
      >
        {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
      </div>

      {!isActive && (
        <input
          type="text"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="What are you working on?"
          aria-label="Pomodoro theme"
          style={{
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
          }}
        />
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {!isActive ? (
          <button
            onClick={startPomo}
            style={{
              padding: '8px 14px',
              fontSize: 12,
              borderRadius: 999,
              background: 'var(--accent)',
              color: '#1a0e02',
              border: 0,
            }}
          >
            ▶ Start
          </button>
        ) : (
          <>
            <button
              onClick={() => setRunning((r) => !r)}
              style={{
                padding: '8px 14px',
                fontSize: 12,
                borderRadius: 999,
                background: 'var(--accent)',
                color: '#1a0e02',
                border: 0,
              }}
            >
              {running ? '❚❚ Pause' : '▶ Resume'}
            </button>
            <button
              onClick={onAbandon}
              style={{
                padding: '8px 14px',
                fontSize: 12,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--color-ink)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              Stop
            </button>
          </>
        )}
      </div>
      <p
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 14,
          fontStyle: 'italic',
          color: 'var(--color-ink-3)',
          textAlign: 'center',
          maxWidth: 380,
          margin: '0 0 28px',
          lineHeight: 1.6,
        }}
      >
        &ldquo;{MOCK.brief.quotedGoal}&rdquo;
      </p>

      <div style={{ width: '100%' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--color-ink-3)',
            marginBottom: 10,
          }}
        >
          Soundscape
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {MOCK.soundscapes.map((s) => (
            <button
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid var(--color-hair)',
                textAlign: 'left',
                background: s.loved ? 'rgba(255,255,255,0.04)' : 'transparent',
                color: 'var(--color-ink)',
              }}
            >
              <span style={{ flex: 1, fontSize: 12 }}>{s.name}</span>
              {s.loved && <span style={{ color: 'var(--accent-soft)' }}>♥</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: '100%', marginTop: 24 }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--color-ink-3)',
            marginBottom: 10,
          }}
        >
          Active blocks
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {MOCK.blockRules.map((r) => (
            <div
              key={r.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 12,
                padding: '7px 10px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 6,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  padding: '2px 6px',
                  borderRadius: 3,
                  background: r.mode === 'hard' ? 'rgba(220,80,60,0.18)' : 'var(--accent-wash)',
                  color: r.mode === 'hard' ? 'oklch(0.82 0.13 30)' : 'var(--accent-soft)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.10em',
                }}
              >
                {r.mode}
              </span>
              <span
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--color-ink-2)',
                }}
              >
                {r.pattern}
              </span>
              {r.source === 'adaptive' && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: 'var(--color-ink-4)',
                  }}
                >
                  adaptive
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
