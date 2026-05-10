import { create } from 'zustand';
import type { StoredBriefing } from '@compass/db';

export type BriefState =
  | { kind: 'loading' }
  | { kind: 'have-brief'; brief: StoredBriefing }
  | { kind: 'locked-no-brief' }
  | { kind: 'too-early'; readyAt: string }
  | { kind: 'error'; message: string };

interface BriefStore {
  morning: BriefState;
  eod: BriefState;
  setMorning: (s: BriefState) => void;
  setEod: (s: BriefState) => void;
  reset: () => void;
}

export const useBriefStore = create<BriefStore>((set) => ({
  morning: { kind: 'loading' },
  eod: { kind: 'loading' },
  setMorning: (s) => set({ morning: s }),
  setEod: (s) => set({ eod: s }),
  reset: () => set({ morning: { kind: 'loading' }, eod: { kind: 'loading' } }),
}));
