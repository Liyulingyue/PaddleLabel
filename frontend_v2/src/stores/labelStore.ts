import { create } from 'zustand';
import type { Label } from '@/types';
import * as api from '@/api/project';

interface LabelState {
  labels: Label[];
  selectedLabel: Label | null;
  loading: boolean;
  fetchLabels: (projectId: number) => Promise<void>;
  createLabel: (projectId: number, label: Partial<Label>) => Promise<void>;
  updateLabel: (projectId: number, labelId: number, label: Partial<Label>) => Promise<void>;
  removeLabel: (projectId: number, labelId: number) => Promise<void>;
  selectLabel: (label: Label | null) => void;
}

export const useLabelStore = create<LabelState>((set, get) => ({
  labels: [],
  selectedLabel: null,
  loading: false,

  fetchLabels: async (projectId: number) => {
    set({ loading: true });
    try {
      const labels = await api.getProjectLabels(projectId);
      set({ labels, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createLabel: async (projectId: number, label: Partial<Label>) => {
    const newLabel = await api.createProjectLabel(projectId, label);
    set({ labels: [...get().labels, newLabel] });
  },

  updateLabel: async (projectId: number, labelId: number, label: Partial<Label>) => {
    const updated = await api.updateProjectLabel(projectId, labelId, label);
    set({ labels: get().labels.map(l => (l.label_id || l.id) === labelId ? updated : l) });
  },

  removeLabel: async (projectId: number, labelId: number) => {
    await api.deleteProjectLabel(projectId, labelId);
    set({ labels: get().labels.filter(l => (l.label_id || l.id) !== labelId) });
  },

  selectLabel: (label: Label | null) => set({ selectedLabel: label }),
}));
