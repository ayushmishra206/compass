import { create } from 'zustand';

interface NotesState {
  selectedNoteId: string | null;
  dirty: boolean;
  lastSavedAt: string | null;
  forgottenSeenThisSession: boolean;
  select(id: string): void;
  clearSelection(): void;
  setDirty(dirty: boolean): void;
  markSaved(): void;
  markForgottenSeen(): void;
}

export const useNotesStore = create<NotesState>((set) => ({
  selectedNoteId: null,
  dirty: false,
  lastSavedAt: null,
  forgottenSeenThisSession: false,
  select: (id) => set({ selectedNoteId: id }),
  clearSelection: () => set({ selectedNoteId: null, dirty: false }),
  setDirty: (dirty) => set({ dirty }),
  markSaved: () => set({ dirty: false, lastSavedAt: new Date().toISOString() }),
  markForgottenSeen: () => set({ forgottenSeenThisSession: true }),
}));
