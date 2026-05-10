import { describe, it, expect } from 'vitest';
import { useNotesStore } from './notesStore';

describe('notesStore', () => {
  it('select(id) sets selectedNoteId; clearSelection clears it', () => {
    useNotesStore.getState().select('n1');
    expect(useNotesStore.getState().selectedNoteId).toBe('n1');
    useNotesStore.getState().clearSelection();
    expect(useNotesStore.getState().selectedNoteId).toBeNull();
  });

  it('setDirty marks dirty; markSaved clears dirty and stamps lastSavedAt', () => {
    useNotesStore.getState().setDirty(true);
    expect(useNotesStore.getState().dirty).toBe(true);
    useNotesStore.getState().markSaved();
    expect(useNotesStore.getState().dirty).toBe(false);
    expect(useNotesStore.getState().lastSavedAt).not.toBeNull();
  });

  it('markForgottenSeen sticks for the rest of the session', () => {
    useNotesStore.setState({ forgottenSeenThisSession: false });
    useNotesStore.getState().markForgottenSeen();
    expect(useNotesStore.getState().forgottenSeenThisSession).toBe(true);
  });
});
