import { create } from 'zustand';
import type { Project } from '@/types';
import * as api from '@/api/project';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  fetchProject: (id: number) => Promise<void>;
  createProject: (data: Partial<Project>) => Promise<Project>;
  updateProject: (id: number, data: Partial<Project>) => Promise<void>;
  removeProject: (id: number) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const projects = await api.getProjects();
      set({ projects, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchProject: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const project = await api.getProject(id);
      set({ currentProject: project, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createProject: async (data: Partial<Project>) => {
    const project = await api.createProject(data);
    set({ projects: [...get().projects, project] });
    return project;
  },

  updateProject: async (id: number, data: Partial<Project>) => {
    const updated = await api.updateProject(id, data);
    set({
      projects: get().projects.map(p => p.project_id === id ? updated : p),
      currentProject: get().currentProject?.project_id === id ? updated : get().currentProject,
    });
  },

  removeProject: async (id: number) => {
    await api.deleteProject(id);
    set({ projects: get().projects.filter(p => p.project_id !== id) });
  },
}));
