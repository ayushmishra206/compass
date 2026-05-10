import { useState, type CSSProperties } from 'react';
import { useNotes } from '../hooks/useNotes';
import { useNotesStore } from '../state/notesStore';
import { NoteEditor } from './notes/NoteEditor';

const listRowStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: '12px 0',
  borderBottom: '1px solid var(--color-hair)',
  cursor: 'pointer',
};
const monoStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-ink-3)',
};

export function NotesDrawer() {
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId);
  const select = useNotesStore((s) => s.select);
  const { notes, create } = useNotes();
  const [searchQ, setSearchQ] = useState('');

  if (selectedNoteId) {
    return <NoteEditor />;
  }

  const filtered = searchQ
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(searchQ.toLowerCase()) ||
          n.excerpt.toLowerCase().includes(searchQ.toLowerCase()),
      )
    : notes;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Search notes…"
          aria-label="Search notes"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 10px',
            fontSize: 13,
            fontFamily: 'var(--font-serif)',
            borderRadius: 6,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--color-ink)',
            boxSizing: 'border-box',
          }}
        />
        <button
          aria-label="New note"
          onClick={async () => {
            const id = await create({ title: 'Untitled', body: '', tags: [] });
            select(id);
          }}
          style={{
            padding: '6px 12px',
            fontSize: 11,
            background: 'var(--accent)',
            color: '#1a0e02',
            border: 0,
            borderRadius: 999,
          }}
        >
          + New
        </button>
      </div>
      {filtered.length === 0 && (
        <div style={{ ...monoStyle, padding: '12px 0' }}>
          {searchQ ? 'No matches.' : 'No notes yet. Start writing.'}
        </div>
      )}
      {filtered.map((n) => (
        <div key={n.id} style={listRowStyle} onClick={() => select(n.id)}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 13.5, fontWeight: 500, flex: 1 }}>{n.title}</span>
            <span style={{ ...monoStyle, color: 'var(--color-ink-4)' }}>
              {n.updatedAt.slice(0, 10)}
            </span>
          </div>
          <div
            style={{
              color: 'var(--color-ink-3)',
              fontSize: 12,
              lineHeight: 1.5,
              maxHeight: '3em',
              overflow: 'hidden',
            }}
          >
            {n.excerpt}
          </div>
          {n.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
              {n.tags.map((t) => (
                <span key={t} style={monoStyle}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
