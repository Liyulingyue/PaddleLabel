import { create } from 'zustand';
import type { Annotation } from '@/types';

interface HistoryState {
  past: Annotation[][];
  future: Annotation[][];
  pushState: (annotations: Annotation[]) => void;
  undo: () => Annotation[] | null;
  redo: () => Annotation[] | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],

  pushState: (annotations: Annotation[]) => {
    const { past } = get();
    set({ past: [...past, annotations], future: [] });
  },

  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return null;
    const newPast = [...past];
    const prevState = newPast.pop()!;
    const current = past[past.length - 1];
    set({ past: newPast, future: current ? [current, ...future] : future });
    return prevState;
  },

  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return null;
    const newFuture = [...future];
    const nextState = newFuture.shift()!;
    set({ past: [...past, nextState], future: newFuture });
    return nextState;
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
  clear: () => set({ past: [], future: [] }),
}));
