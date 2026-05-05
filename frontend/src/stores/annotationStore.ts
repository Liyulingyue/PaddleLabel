import { create } from 'zustand';
import { getDataAnnotations, addDataAnnotation, deleteDataAnnotation } from '@/api/data';
import { updateAnnotation as updateAnnotationApi } from '@/api/annotation';
import type { Annotation, Data } from '@/types';

let _frontendId = 1;
const nextFrontendId = () => _frontendId++;

interface AnnotationState {
  annotations: Annotation[];
  currentData: Data | null;
  loading: boolean;
  history: Annotation[][];
  historyIndex: number;
  fetchAnnotations: (dataId: number) => Promise<void>;
  addAnnotation: (annotation: Omit<Annotation, 'annotation_id'>) => void;
  updateAnnotation: (frontendId: number, updates: Partial<Annotation>) => void;
  removeAnnotation: (frontendId: number) => void;
  deleteAnnotation: (dataId: number, annotationId: number) => Promise<void>;
  setCurrentData: (data: Data | null) => void;
  clearAnnotations: () => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  saveAnnotation: (dataId: number, annotation: Annotation) => Promise<Annotation>;
  saveAll: (dataId: number) => Promise<void>;
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  annotations: [],
  currentData: null,
  loading: false,
  history: [],
  historyIndex: -1,

  fetchAnnotations: async (dataId: number) => {
    set({ loading: true });
    try {
      const annotations = await getDataAnnotations(dataId);
      annotations.forEach((a: Annotation, i: number) => {
        if (!a.frontend_id) (a as any).frontend_id = i + 1;
      });
      set({ annotations, loading: false, history: [annotations], historyIndex: 0 });
    } catch {
      set({ annotations: [], loading: false });
    }
  },

  addAnnotation: (annotation: Omit<Annotation, 'annotation_id'>) => {
    const newAnnotation: Annotation = {
      ...annotation,
      frontend_id: nextFrontendId(),
    };
    set({ annotations: [...get().annotations, newAnnotation] });
  },

  updateAnnotation: (frontendId: number, updates: Partial<Annotation>) => {
    set({
      annotations: get().annotations.map(a =>
        a.frontend_id === frontendId ? { ...a, ...updates } : a
      ),
    });
  },

  removeAnnotation: (frontendId: number) => {
    set({ annotations: get().annotations.filter(a => a.frontend_id !== frontendId) });
  },

  deleteAnnotation: async (dataId: number, annotationId: number) => {
    await deleteDataAnnotation(dataId, annotationId);
    set({ annotations: get().annotations.filter(a => a.annotation_id !== annotationId) });
  },

  setCurrentData: (data: Data | null) => set({ currentData: data }),

  clearAnnotations: () => set({ annotations: [] }),

  pushHistory: () => {
    const { history, historyIndex, annotations } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...annotations]);
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    set({ annotations: [...history[newIndex]], historyIndex: newIndex });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    set({ annotations: [...history[newIndex]], historyIndex: newIndex });
  },

  saveAnnotation: async (dataId: number, annotation: Annotation) => {
    if (annotation.annotation_id) {
      await updateAnnotationApi(annotation.annotation_id, annotation);
      return annotation;
    } else {
      const saved = await addDataAnnotation(dataId, annotation);
      set({
        annotations: get().annotations.map(a =>
          a.frontend_id === annotation.frontend_id ? saved : a
        ),
      });
      return saved;
    }
  },

  saveAll: async (dataId: number) => {
    const { annotations } = get();
    for (const annotation of annotations) {
      if (!annotation.annotation_id) {
        await addDataAnnotation(dataId, annotation);
      }
    }
  },
}));
