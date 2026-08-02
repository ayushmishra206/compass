import { useState, type CSSProperties } from 'react';
import { Pill, Row, Text } from '@compass/ui';
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

const newBtnStyle: CSSProperties = {
  padding: '6px 12px',
  fontSize: 11,
  background: 'var(--accent)',
  color: '#1a0e02',
  border: 0,
  borderRadius: 999,
  cursor: 'pointer',
};

const searchInputStyle: CSSProperties = {
  flex: 1,
  padding: '8px 10px',
  fontSize: 13,
  fontFamily: 'var(--font-serif)',
  borderRadius: 6,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'var(--color-ink)',
  boxSizing: 'border-box',
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
      <Row gap={2} style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Search notes…"
          aria-label="Search notes"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          style={searchInputStyle}
        />
        <button
          aria-label="New note"
          onClick={async () => {
            const id = await create({ title: 'Untitled', body: '', tags: [] });
            select(id);
          }}
          style={newBtnStyle}
        >
          + New
        </button>
      </Row>
      {filtered.length === 0 && (
        <Text variant="mono" style={{ padding: '12px 0' }}>
          {searchQ ? 'No matches.' : 'No notes yet. Start writing.'}
        </Text>
      )}
      {filtered.map((n) => (
        <div key={n.id} style={listRowStyle} onClick={() => select(n.id)}>
          <Row gap={2} align="baseline">
            <Text variant="body" as="span" style={{ fontSize: 13.5, fontWeight: 500, flex: 1 }}>
              {n.title}
            </Text>
            <Text variant="mono" tone="dim" as="span">
              {n.updatedAt.slice(0, 10)}
            </Text>
          </Row>
          <Text
            variant="body"
            tone="muted"
            as="span"
            style={{ fontSize: 12, lineHeight: 1.5, maxHeight: '3em', overflow: 'hidden' }}
          >
            {n.excerpt}
          </Text>
          {n.tags.length > 0 && (
            <Row gap={1} style={{ marginTop: 4, flexWrap: 'wrap' }}>
              {n.tags.map((t) => (
                <Pill key={t}>{t}</Pill>
              ))}
            </Row>
          )}
        </div>
      ))}
    </div>
  );
}
