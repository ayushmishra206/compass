import { useEffect, useState, useCallback } from 'react';
import { rpc } from '@compass/runtime';
import { useNotesStore } from '../state/notesStore';

interface NoteSummary {
  id: string;
  title: string;
  excerpt: string;
  updatedAt: string;
  tags: string[];
}

interface NoteFull {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  body: string;
  tags: string[];
  autolinkEnabled: boolean;
}

interface AutoLink {
  targetNoteId: string;
  targetTitle: string;
  similarity: number;
  rationale: string | null;
}

export function useNotes() {
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [selected, setSelected] = useState<{ note: NoteFull; autoLinks: AutoLink[] } | null>(null);
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId);
  const markSaved = useNotesStore((s) => s.markSaved);
  const markForgottenSeen = useNotesStore((s) => s.markForgottenSeen);

  const refresh = useCallback(async () => {
    const r = (await rpc('notes.list', { limit: 100 })) as { notes: NoteSummary[] };
    setNotes(r.notes);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selectedNoteId) {
      setSelected(null);
      return;
    }
    void rpc('notes.get', { id: selectedNoteId }).then((r) => setSelected(r as typeof selected));
  }, [selectedNoteId]);

  const create = useCallback(
    async (input: { title: string; body: string; tags: string[] }) => {
      const r = (await rpc('notes.create', input)) as { id: string };
      await refresh();
      return r.id;
    },
    [refresh],
  );

  const save = useCallback(
    async (
      id: string,
      patch: { title?: string; body?: string; tags?: string[]; autolinkEnabled?: boolean },
    ) => {
      const r = (await rpc('notes.update', { id, ...patch })) as {
        ok: true;
        forgotten?: { noteId: string; sim: number; title: string };
      };
      markSaved();
      await refresh();
      // Refresh selected note view so Related pills reflect latest
      if (selectedNoteId === id) {
        const got = (await rpc('notes.get', { id })) as { note: NoteFull; autoLinks: AutoLink[] };
        setSelected(got);
      }
      if (r.forgotten) markForgottenSeen();
      return r;
    },
    [refresh, markSaved, markForgottenSeen, selectedNoteId],
  );

  const remove = useCallback(
    async (id: string) => {
      await rpc('notes.delete', { id });
      await refresh();
    },
    [refresh],
  );

  const search = useCallback(async (query: string) => {
    const r = (await rpc('notes.search', { query, limit: 20 })) as {
      hits: Array<{ noteId: string; title: string; excerpt: string; score: number }>;
    };
    return r.hits;
  }, []);

  const fetchRationale = useCallback(async (srcId: string, targetId: string) => {
    const r = (await rpc('notes.autolink.rationale', { srcId, targetId })) as
      | { rationale: string }
      | { rationale: null; reason: 'locked' | 'error' };
    return r;
  }, []);

  const dismissLink = useCallback(async (srcId: string, targetId: string) => {
    await rpc('notes.autolink.dismiss', { srcId, targetId });
  }, []);

  return { notes, selected, refresh, create, save, remove, search, fetchRationale, dismissLink };
}
