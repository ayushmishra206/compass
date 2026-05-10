import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('@compass/runtime', () => ({
  rpc: vi.fn(),
}));

import { rpc } from '@compass/runtime';
import { useNotes } from './useNotes';
import { useNotesStore } from '../state/notesStore';

describe('useNotes', () => {
  beforeEach(() => {
    (rpc as unknown as ReturnType<typeof vi.fn>).mockReset();
    useNotesStore.setState({
      selectedNoteId: null,
      dirty: false,
      lastSavedAt: null,
      forgottenSeenThisSession: false,
    });
  });

  it('list() loads notes from rpc on mount', async () => {
    (rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      notes: [{ id: 'n1', title: 'A', excerpt: 'a', updatedAt: 't', tags: [] }],
    });
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toHaveLength(1));
    expect(result.current.notes[0]!.id).toBe('n1');
  });

  it('save(id, patch) calls notes.update and refreshes the list', async () => {
    (rpc as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ notes: [] }) // initial list
      .mockResolvedValueOnce({ ok: true }) // update
      .mockResolvedValueOnce({ notes: [] }); // refresh
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toHaveLength(0));
    await act(async () => {
      await result.current.save('n1', { title: 'NEW' });
    });
    expect(rpc).toHaveBeenCalledWith('notes.update', { id: 'n1', title: 'NEW' });
  });
});
