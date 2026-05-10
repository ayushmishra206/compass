import { useEffect, useState } from 'react';
import { useNotes } from '../../hooks/useNotes';
import { useNotesStore } from '../../state/notesStore';
import { MarkdownEditor } from '../../components/MarkdownEditor';
import { RelatedPill } from './RelatedPill';
import { ForgottenCallout } from './ForgottenCallout';

export function NoteEditor() {
  const { selected, save, fetchRationale, dismissLink } = useNotes();
  const select = useNotesStore((s) => s.select);
  const clearSelection = useNotesStore((s) => s.clearSelection);
  const setDirty = useNotesStore((s) => s.setDirty);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [forgotten, setForgotten] = useState<{
    noteId: string;
    title: string;
    daysAgo: number;
  } | null>(null);

  useEffect(() => {
    if (!selected) return;
    setTitle(selected.note.title);
    setBody(selected.note.body);
  }, [selected?.note.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!selected) return null;

  const onTitleChange = async (next: string) => {
    setTitle(next);
    setDirty(true);
    await save(selected.note.id, { title: next });
  };

  const onBodyChange = async (next: string) => {
    setBody(next);
    setDirty(true);
    const r = await save(selected.note.id, { body: next });
    if (r.forgotten) {
      const days = 45; // server-side check uses 45-day floor; UI shows the floor as a rough hint
      setForgotten({ noteId: r.forgotten.noteId, title: r.forgotten.title, daysAgo: days });
    }
  };

  const onToggleAutolink = async () => {
    await save(selected.note.id, { autolinkEnabled: !selected.note.autolinkEnabled });
  };

  return (
    <>
      <button
        onClick={clearSelection}
        style={{
          marginBottom: 16,
          padding: '6px 12px',
          fontSize: 11,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 999,
          color: 'var(--color-ink)',
        }}
      >
        ← All notes
      </button>
      {forgotten && (
        <ForgottenCallout
          noteId={forgotten.noteId}
          title={forgotten.title}
          daysAgo={forgotten.daysAgo}
          onOpen={(id) => select(id)}
        />
      )}
      <input
        aria-label="Note title"
        value={title}
        onChange={(e) => void onTitleChange(e.target.value)}
        style={{
          width: '100%',
          fontFamily: 'var(--font-serif)',
          fontSize: 28,
          background: 'transparent',
          border: 0,
          color: 'var(--color-ink)',
          marginBottom: 8,
          padding: 0,
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.12em',
            color: 'var(--color-ink-3)',
          }}
        >
          {selected.note.tags.join(' · ') || 'no tags'} · {selected.note.updatedAt.slice(0, 10)}
        </span>
        <label style={{ fontSize: 11, color: 'var(--color-ink-3)' }}>
          <input
            type="checkbox"
            checked={selected.note.autolinkEnabled}
            onChange={() => void onToggleAutolink()}
            style={{ marginRight: 6 }}
          />
          Auto-link
        </label>
      </div>
      <MarkdownEditor value={body} onChange={(n) => void onBodyChange(n)} debounceMs={5000} />
      {selected.autoLinks.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-ink-3)',
              marginBottom: 8,
            }}
          >
            Related
          </div>
          {selected.autoLinks.map((l) => (
            <RelatedPill
              key={l.targetNoteId}
              srcId={selected.note.id}
              targetId={l.targetNoteId}
              targetTitle={l.targetTitle}
              initialRationale={l.rationale}
              onFetchRationale={fetchRationale}
              onDismiss={dismissLink}
            />
          ))}
        </div>
      )}
    </>
  );
}
