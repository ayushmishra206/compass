import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { rpc } from '@compass/runtime';
import { useShell } from '../state/shell.js';
import type { DrawerKind } from '../state/shell.js';
import { useNotesStore } from '../state/notesStore';

const NAV_ITEMS: { label: string; kind: DrawerKind }[] = [
  { label: 'Open brief', kind: 'brief' },
  { label: "Open today's plan", kind: 'today' },
  { label: 'Open goals', kind: 'goals' },
  { label: 'Open notes', kind: 'notes' },
  { label: 'Open inbox', kind: 'inbox' },
  { label: 'Begin 90-min focus', kind: 'focus' },
];

const ASK_RE = /[?]|^(what|why|how|when|did|should|is|are)\b/i;

const scrimStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 60,
  background: 'rgba(0,0,0,0.6)',
  backdropFilter: 'blur(12px)',
  display: 'grid',
  placeItems: 'center',
};
const modalStyle: CSSProperties = {
  background: 'var(--glass-tint-3)',
  backdropFilter: 'var(--glass-3)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 20,
  boxShadow: 'var(--shadow-3)',
  width: 'min(620px, 92vw)',
  overflow: 'hidden',
};
const inputRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '16px 18px',
  borderBottom: '1px solid var(--color-hair)',
};
const inputStyle: CSSProperties = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  fontSize: 14,
  color: 'var(--color-ink)',
};
const kbdStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  padding: '1px 5px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 3,
  color: 'var(--color-ink-3)',
};
const navItemStyle: CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '11px 18px',
  textAlign: 'left',
  fontSize: 13,
  color: 'var(--color-ink-2)',
};
const askPromptStyle: CSSProperties = {
  width: '100%',
  padding: '16px 18px',
  textAlign: 'left',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  fontSize: 13,
  color: 'var(--color-ink)',
};
const answerStyle: CSSProperties = {
  padding: 18,
  fontFamily: 'var(--font-serif)',
  fontSize: 14.5,
  lineHeight: 1.6,
  color: 'var(--color-ink)',
};

type Citation = { id: string; noteId: string; title: string };

export function CmdK() {
  const open = useShell((s) => s.cmdkOpen);
  const close = useShell((s) => s.closeCmdk);
  const navClick = useShell((s) => s.navClick);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [reason, setReason] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQ('');
      setAnswer(null);
      setCitations([]);
      setReason(null);
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  const isAsk = q.length > 5 && ASK_RE.test(q);
  const filtered = NAV_ITEMS.filter((i) => !q || i.label.toLowerCase().includes(q.toLowerCase()));

  const onAsk = async () => {
    setBusy(true);
    setAnswer(null);
    setCitations([]);
    setReason(null);
    try {
      const r = (await rpc('notes.askGrounded', { query: q })) as
        | { answer: string; citations: Citation[]; reason: null }
        | { answer: null; citations: []; reason: 'no-notes' | 'locked' | 'error' };
      setAnswer(r.answer);
      setCitations(r.citations);
      setReason(r.reason);
    } catch {
      setAnswer(null);
      setCitations([]);
      setReason('error');
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (isAsk && !answer && !busy) {
        void onAsk();
      } else if (!isAsk && filtered[0]) {
        navClick(filtered[0].kind);
        close();
      }
    }
  };

  return (
    <div style={scrimStyle} onClick={close} role="dialog" aria-modal="true">
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={inputRowStyle}>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search, navigate, or ask…"
            style={inputStyle}
            aria-label="Command palette input"
          />
          <span style={kbdStyle}>esc</span>
        </div>
        <div style={{ maxHeight: 380, overflow: 'auto', padding: '6px 0' }}>
          {!isAsk &&
            filtered.map((it) => (
              <button
                key={it.kind}
                style={navItemStyle}
                onClick={() => {
                  navClick(it.kind);
                  close();
                }}
              >
                <span style={{ flex: 1 }}>{it.label}</span>
              </button>
            ))}
          {isAsk && !answer && !busy && (
            <button style={askPromptStyle} onClick={onAsk}>
              <span style={{ flex: 1 }}>
                Ask Compass: <em>&quot;{q}&quot;</em>
              </span>
              <span style={kbdStyle}>⏎</span>
            </button>
          )}
          {busy && (
            <div style={{ padding: '24px 18px', color: 'var(--color-ink-3)', fontSize: 12 }}>
              Searching your notes & emails…
            </div>
          )}
          {answer && (
            <div style={answerStyle}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--accent-soft)',
                  marginBottom: 10,
                }}
              >
                Answer · grounded in {citations.length} {citations.length === 1 ? 'note' : 'notes'}
              </div>
              <p style={{ margin: '0 0 12px' }}>{answer}</p>
              {citations.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {citations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        useNotesStore.getState().select(c.noteId);
                        navClick('notes');
                        close();
                      }}
                      style={{
                        ...kbdStyle,
                        cursor: 'pointer',
                        background: 'rgba(255,255,255,0.10)',
                      }}
                    >
                      {c.id}: {c.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {!busy && answer === null && reason === 'no-notes' && (
            <div style={{ padding: '24px 18px', color: 'var(--color-ink-3)', fontSize: 12 }}>
              Write some notes first.
            </div>
          )}
          {!busy && answer === null && reason === 'locked' && (
            <div style={{ padding: '24px 18px', color: 'var(--color-ink-3)', fontSize: 12 }}>
              Unlock to ask.
            </div>
          )}
          {!busy && answer === null && reason === 'error' && (
            <div style={{ padding: '24px 18px', color: 'var(--color-ink-3)', fontSize: 12 }}>
              Something went wrong. Try again.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
