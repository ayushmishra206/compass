import { useMemo, useState } from 'react';
import { NOTES } from '@compass/core/fixtures';

// Phase-0 fixtures extend Note with mock-only display fields (`excerpt`,
// `updated`, `related`) that aren't in the canonical Phase 1 Note schema.
// Surface code uses this extended shape until Phase 2 rewires real data.
type Note = (typeof NOTES)[number];
import {
  Badge,
  IconButton,
  IconCheck,
  IconClock,
  IconClose,
  IconLink,
  IconSearch,
  Kbd,
  Modal,
  Prose,
  Tag,
} from '@compass/ui';
import { useShell as useShellStore } from '@app/state/shell.js';

export function Notes() {
  const [selId, setSelId] = useState('n1');
  const [q, setQ] = useState('');
  const shell = useShellStore();
  void shell;
  const sel = NOTES.find((n) => n.id === selId);
  const filtered = useMemo(() => {
    if (!q) return NOTES;
    return NOTES.filter((n) =>
      (n.title + ' ' + n.excerpt + ' ' + n.tags.join(' ')).toLowerCase().includes(q.toLowerCase()),
    );
  }, [q]);

  return (
    <>
      <div className="grid grid-cols-[320px_1fr]">
        <div className="border-r border-[var(--hair)] min-h-[calc(100vh-58px)]">
          <div className="px-[18px] py-4 border-b border-[var(--hair)]">
            <div className="flex items-center gap-2 px-2.5 py-1.5 border border-[var(--hair)] rounded-lg bg-[var(--panel)]">
              <IconSearch size={14} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="/search semantic…"
                className="border-0 outline-0 flex-1 bg-transparent text-[13px]"
                aria-label="Search notes"
              />
              {q ? (
                <button onClick={() => setQ('')} type="button" aria-label="Clear search">
                  <IconClose size={12} />
                </button>
              ) : (
                <Kbd>⌘K</Kbd>
              )}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.02em] mt-2.5 text-[var(--ink-4)]">
              {filtered.length} notes · 384-dim local embedding
            </div>
          </div>
          <div>
            {filtered.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setSelId(n.id)}
                className="w-full text-left px-[18px] py-3 border-b border-[var(--hair)]"
                style={{
                  background: selId === n.id ? 'var(--accent-wash)' : 'transparent',
                }}
              >
                <div className="flex items-baseline gap-2">
                  <div className="text-[13.5px] font-medium flex-1">{n.title}</div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)]">
                    {n.updated}
                  </span>
                </div>
                <div className="text-[12px] text-[var(--ink-3)] mt-1 leading-[1.45] max-h-[2.8em] overflow-hidden">
                  {n.excerpt}
                </div>
                <div className="flex gap-1 mt-1.5">
                  {n.tags.map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="px-10 pt-7 pb-20 max-w-[760px]">
          {sel && <NoteDetail note={sel} onNavigate={setSelId} />}
        </div>
      </div>

      {shell.overlay === 'cmdK' && (
        <CmdK
          onClose={() => shell.closeOverlay()}
          onPick={(id) => {
            setSelId(id);
            shell.closeOverlay();
          }}
        />
      )}
    </>
  );
}

function NoteDetail({ note, onNavigate }: { note: Note; onNavigate: (id: string) => void }) {
  const hasStale = note.related.some((r) => r.stale);
  return (
    <>
      <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] mb-2">
        Note · updated {note.updated} · MiniLM-L6-v2
      </div>
      <h1 className="font-serif text-[34px] font-medium tracking-[-0.02em] leading-[1.15] mt-0 mb-[18px]">
        {note.title}
      </h1>

      {hasStale && (
        <div className="px-3.5 py-2.5 bg-[var(--accent-wash)] rounded-[10px] mb-[22px] flex items-center gap-2.5 text-[13px]">
          <IconClock size={14} />
          <span>
            You wrote about this <b>5 months ago</b> —{' '}
            <span className="text-[var(--accent-ink)] underline-offset-2 underline decoration-dashed cursor-pointer">
              revisit PRD outline
            </span>
            .
          </span>
          <IconButton aria-label="Dismiss callout" className="ml-auto">
            <IconClose size={12} />
          </IconButton>
        </div>
      )}

      <Prose>
        <p>
          Our decision rule is simple:{' '}
          <strong>
            anything needing DOM, WebGPU, OPFS sync handles, or more than ~25 seconds of work goes
            in the offscreen document.
          </strong>{' '}
          The service worker stays a thin event router.
        </p>
        <p>
          On the data side, a single <strong>SQLite-WASM + sqlite-vec</strong> database lives in
          OPFS. Notes get an FTS5 table and a vec0 virtual table with 384-dim float embeddings.
          Hybrid retrieval is reciprocal-rank fusion over both.
        </p>
        <p>
          The point of this architecture is not performance, it&apos;s that{' '}
          <strong>
            the user&apos;s content never leaves their machine unless they invoke a model themselves
            with their own key
          </strong>
          . Everything else is ceremony around that commitment.
        </p>
      </Prose>

      <div className="mt-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)] mb-2.5">
          Related — auto-detected
        </div>
        <div className="flex flex-col gap-2.5">
          {note.related
            .filter((r) => !r.stale)
            .map((r) => {
              const target = NOTES.find((n) => n.id === r.id);
              return (
                <div
                  key={r.id}
                  className="flex gap-3 items-start p-3.5 border border-[var(--hair)] rounded-[12px] bg-[var(--panel)]"
                >
                  <IconLink size={14} />
                  <div className="flex-1">
                    <button onClick={() => onNavigate(r.id)} type="button" className="text-left">
                      <div className="text-[14px] font-medium">{target?.title}</div>
                    </button>
                    <div className="text-[12.5px] text-[var(--ink-3)] mt-0.5">
                      <span className="font-mono text-[10px] text-[var(--ink-4)]">
                        {(r.sim * 100).toFixed(0)}% ·{' '}
                      </span>
                      {r.reason}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <IconButton aria-label="Accept link">
                      <IconCheck size={13} />
                    </IconButton>
                    <IconButton aria-label="Reject link">
                      <IconClose size={13} />
                    </IconButton>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </>
  );
}

function CmdK({ onClose, onPick }: { onClose: () => void; onPick: (id: string) => void }) {
  const [q, setQ] = useState('when did we discuss pricing with Mira');
  const rewrites =
    q.length > 5
      ? [
          'pricing conversation with Mira',
          'Plus subscription price discussion',
          'pricing memo board review',
        ]
      : [];
  const results = NOTES.filter((n) =>
    (n.title + ' ' + n.excerpt + ' ' + n.tags.join(' '))
      .toLowerCase()
      .split(' ')
      .some((w) =>
        q
          .toLowerCase()
          .split(' ')
          .some((qw) => qw.length > 3 && w.includes(qw)),
      ),
  );

  return (
    <Modal open onClose={onClose} wide aria-label="Semantic search">
      <div className="px-[18px] py-3.5 border-b border-[var(--hair)] flex items-center gap-2.5">
        <IconSearch size={16} />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask a question or search…"
          className="flex-1 border-0 outline-0 bg-transparent text-[16px] text-[var(--ink)]"
          aria-label="Query"
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)]">
          hybrid · FTS + vec
        </span>
        <IconButton aria-label="Close search" onClick={onClose}>
          <IconClose size={14} />
        </IconButton>
      </div>
      {rewrites.length > 0 && (
        <div className="px-[18px] py-2.5 border-b border-[var(--hair)] flex gap-2 flex-wrap items-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)]">
            also searched
          </span>
          {rewrites.map((r, i) => (
            <Badge key={i}>{r}</Badge>
          ))}
        </div>
      )}
      <div className="max-h-[60vh] overflow-y-auto">
        {results.map((n, i) => (
          <button
            key={n.id}
            type="button"
            onClick={() => onPick(n.id)}
            className="w-full text-left px-[18px] py-3.5 border-b border-[var(--hair)] flex gap-3.5"
          >
            <div className="flex-1">
              <div className="flex items-baseline gap-2.5">
                <span className="text-[14px] font-medium">{n.title}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.02em] text-[var(--ink-4)]">
                  {n.updated}
                </span>
              </div>
              <div className="text-[12.5px] text-[var(--ink-3)] mt-1">{n.excerpt}</div>
            </div>
            <div className="font-mono text-[10px] text-[var(--accent-ink)] self-start">
              0.{82 - i * 3}
            </div>
          </button>
        ))}
      </div>
      <div className="px-[18px] py-2.5 border-t border-[var(--hair)] flex gap-4 text-[var(--ink-4)] font-mono text-[10px] uppercase tracking-[0.02em]">
        <span>↵ open</span>
        <span>↑↓ move</span>
        <span>⌘↵ ask AI across all notes</span>
      </div>
    </Modal>
  );
}
